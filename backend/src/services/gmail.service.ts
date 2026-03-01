import { google, gmail_v1 } from 'googleapis';
import { OAuth2Client } from 'google-auth-library';
import config from '../config';
import logger from '../config/logger';

interface GmailMessage {
  messageId: string;
  threadId: string;
  subject: string;
  fromAddress: string;
  forwardedBy: string | null;
  bodyText: string;
  receivedAt: Date | null;
}

const EMAIL_REGEX = /[\w.-]+@[\w.-]+\.\w+/;
const MAX_BODY_LENGTH = 50_000;

class GmailService {
  private oauth2Client: OAuth2Client | null = null;
  private gmailClient: gmail_v1.Gmail | null = null;

  /**
   * Check whether Gmail credentials are configured
   */
  isConfigured(): boolean {
    const { clientId, clientSecret, refreshToken } = config.emailImport.gmail;
    return !!(clientId && clientSecret && refreshToken);
  }

  /**
   * Create and return a cached OAuth2 client and Gmail API instance.
   * Reuses the same instances across calls.
   */
  getClient(): { auth: OAuth2Client; gmail: gmail_v1.Gmail } {
    if (this.oauth2Client && this.gmailClient) {
      return { auth: this.oauth2Client, gmail: this.gmailClient };
    }

    const { clientId, clientSecret, refreshToken } = config.emailImport.gmail;

    if (!clientId || !clientSecret || !refreshToken) {
      throw new Error(
        'Gmail credentials are not configured. Set GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, and GMAIL_REFRESH_TOKEN.'
      );
    }

    this.oauth2Client = new google.auth.OAuth2(clientId, clientSecret);
    this.oauth2Client.setCredentials({ refresh_token: refreshToken });

    this.gmailClient = google.gmail({ version: 'v1', auth: this.oauth2Client });

    return { auth: this.oauth2Client, gmail: this.gmailClient };
  }

  /**
   * Fetch unread emails from the configured Gmail inbox.
   * Returns parsed GmailMessage objects.
   */
  async fetchUnreadEmails(maxResults: number): Promise<GmailMessage[]> {
    const { gmail } = this.getClient();

    // List unread message IDs
    const listResponse = await gmail.users.messages.list({
      userId: 'me',
      q: 'is:unread',
      maxResults,
    });

    const messageRefs = listResponse.data.messages;
    if (!messageRefs || messageRefs.length === 0) {
      return [];
    }

    logger.info(`[Gmail] Found ${messageRefs.length} unread email(s)`);

    // Fetch full message content for each
    const messages: GmailMessage[] = [];

    for (const ref of messageRefs) {
      if (!ref.id) continue;

      try {
        const msgResponse = await gmail.users.messages.get({
          userId: 'me',
          id: ref.id,
          format: 'full',
        });

        const msg = msgResponse.data;
        const headers = msg.payload?.headers || [];

        const getHeader = (name: string): string => {
          const header = headers.find(
            (h) => h.name?.toLowerCase() === name.toLowerCase()
          );
          return header?.value || '';
        };

        const subject = getHeader('Subject');
        const fromAddress = getHeader('From');
        const bodyText = this.extractBodyText(msg.payload);
        const forwardedBy = this.extractForwardedBy(headers, bodyText);

        // internalDate is milliseconds since epoch
        const internalDate = msg.internalDate
          ? new Date(parseInt(msg.internalDate, 10))
          : null;

        messages.push({
          messageId: msg.id || ref.id,
          threadId: msg.threadId || '',
          subject,
          fromAddress,
          forwardedBy,
          bodyText,
          receivedAt: internalDate,
        });
      } catch (error) {
        logger.error(`[Gmail] Failed to fetch message ${ref.id}`, { error });
      }
    }

    return messages;
  }

  /**
   * Mark a message as read by removing the UNREAD label.
   */
  async markAsRead(messageId: string): Promise<void> {
    const { gmail } = this.getClient();

    await gmail.users.messages.modify({
      userId: 'me',
      id: messageId,
      requestBody: {
        removeLabelIds: ['UNREAD'],
      },
    });
  }

  /**
   * Extract the plain-text body from a Gmail message payload.
   * Handles multipart/alternative structures, decodes base64url data,
   * strips HTML tags, and skips non-text MIME parts (images, attachments).
   * Truncates output to MAX_BODY_LENGTH characters.
   */
  extractBodyText(payload: gmail_v1.Schema$MessagePart | undefined): string {
    if (!payload) return '';

    const textParts: string[] = [];
    this.collectTextParts(payload, textParts);

    const combined = textParts.join('\n').trim();
    if (combined.length > MAX_BODY_LENGTH) {
      return combined.substring(0, MAX_BODY_LENGTH);
    }
    return combined;
  }

  /**
   * Recursively collect text content from message parts.
   * Prefers text/plain over text/html. Skips images and attachments.
   */
  private collectTextParts(
    part: gmail_v1.Schema$MessagePart,
    result: string[]
  ): void {
    const mimeType = part.mimeType || '';

    // Skip non-text MIME types (images, attachments, etc.)
    if (
      mimeType.startsWith('image/') ||
      mimeType.startsWith('audio/') ||
      mimeType.startsWith('video/') ||
      mimeType.startsWith('application/')
    ) {
      return;
    }

    // If this part has body data, decode it
    if (part.body?.data) {
      const decoded = this.decodeBase64Url(part.body.data);

      if (mimeType === 'text/plain') {
        result.push(decoded);
        return;
      }

      if (mimeType === 'text/html') {
        result.push(this.stripHtmlTags(decoded));
        return;
      }
    }

    // For multipart types, recurse into child parts.
    // For multipart/alternative, prefer text/plain if available.
    if (part.parts && part.parts.length > 0) {
      if (mimeType === 'multipart/alternative') {
        // Look for text/plain first
        const plainPart = part.parts.find((p) => p.mimeType === 'text/plain');
        if (plainPart) {
          this.collectTextParts(plainPart, result);
          return;
        }
        // Fall back to text/html
        const htmlPart = part.parts.find((p) => p.mimeType === 'text/html');
        if (htmlPart) {
          this.collectTextParts(htmlPart, result);
          return;
        }
      }

      // For other multipart types (mixed, related, etc.), recurse into all parts
      for (const childPart of part.parts) {
        this.collectTextParts(childPart, result);
      }
    }
  }

  /**
   * Extract the email address of the person who forwarded the message.
   * Uses a priority-based approach:
   *   1. X-Forwarded-To / X-Original-From headers
   *   2. Reply-To header
   *   3. Gmail forwarded message body pattern
   *   4. Outlook forwarded message body pattern
   *   5. Fallback: From header
   */
  extractForwardedBy(
    headers: gmail_v1.Schema$MessagePartHeader[],
    bodyText: string
  ): string | null {
    const getHeader = (name: string): string => {
      const header = headers.find(
        (h) => h.name?.toLowerCase() === name.toLowerCase()
      );
      return header?.value || '';
    };

    // 1. Check X-Forwarded-To or X-Original-From headers
    const xForwardedTo = getHeader('X-Forwarded-To');
    if (xForwardedTo) {
      const email = this.extractEmail(xForwardedTo);
      if (email) return email;
    }

    const xOriginalFrom = getHeader('X-Original-From');
    if (xOriginalFrom) {
      const email = this.extractEmail(xOriginalFrom);
      if (email) return email;
    }

    // 2. Reply-To header
    const replyTo = getHeader('Reply-To');
    if (replyTo) {
      const email = this.extractEmail(replyTo);
      if (email) return email;
    }

    // 3. Gmail forwarded message pattern in body
    //    ---------- Forwarded message ----------
    //    From: Some Name <user@example.com>
    const gmailForwardPattern =
      /---------- Forwarded message ----------\s*\n\s*From:\s*(.+)/i;
    const gmailMatch = bodyText.match(gmailForwardPattern);
    if (gmailMatch) {
      const email = this.extractEmail(gmailMatch[1]);
      if (email) return email;
    }

    // 4. Outlook forwarded message pattern in body
    //    From: Some Name <user@example.com>
    //    Sent: ...
    //    To: ...
    //    Subject: ...
    const outlookForwardPattern =
      /From:\s*(.+)\s*\n\s*Sent:\s*.+\s*\n\s*To:\s*.+\s*\n\s*Subject:\s*/i;
    const outlookMatch = bodyText.match(outlookForwardPattern);
    if (outlookMatch) {
      const email = this.extractEmail(outlookMatch[1]);
      if (email) return email;
    }

    // 5. Fallback: From header
    const from = getHeader('From');
    if (from) {
      const email = this.extractEmail(from);
      if (email) return email;
    }

    return null;
  }

  /**
   * Extract the first email address from a string using a simple regex.
   */
  private extractEmail(text: string): string | null {
    const match = text.match(EMAIL_REGEX);
    return match ? match[0] : null;
  }

  /**
   * Decode a base64url-encoded string (as used by the Gmail API).
   */
  private decodeBase64Url(data: string): string {
    // Replace base64url characters with standard base64
    const base64 = data.replace(/-/g, '+').replace(/_/g, '/');
    return Buffer.from(base64, 'base64').toString('utf-8');
  }

  /**
   * Strip HTML tags from a string, producing plain text.
   * Also normalizes whitespace and decodes common HTML entities.
   */
  private stripHtmlTags(html: string): string {
    return html
      // Replace <br>, <br/>, <br /> with newlines
      .replace(/<br\s*\/?>/gi, '\n')
      // Replace block-level closing tags with newlines
      .replace(/<\/(p|div|h[1-6]|li|tr|blockquote)>/gi, '\n')
      // Remove all remaining HTML tags
      .replace(/<[^>]*>/g, '')
      // Decode common HTML entities
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&nbsp;/g, ' ')
      // Collapse multiple blank lines into one
      .replace(/\n{3,}/g, '\n\n')
      .trim();
  }
}

export default new GmailService();
