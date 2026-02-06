import { AppError } from './errors';
import { URL } from 'url';
import dns from 'dns';
import { promisify } from 'util';
import net from 'net';

const dnsResolve4 = promisify(dns.resolve4);
const dnsResolve6 = promisify(dns.resolve6);

/**
 * Blocked hostname patterns for SSRF prevention.
 * Blocks localhost and common internal service names.
 */
const BLOCKED_HOSTNAMES = [
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'metadata.google',
  'kubernetes.default',
  'kubernetes.default.svc',
];

/**
 * Check if an IPv4 address is in a private/internal range.
 *
 * Blocked ranges:
 * - 127.0.0.0/8     (loopback)
 * - 10.0.0.0/8      (private)
 * - 172.16.0.0/12   (private)
 * - 192.168.0.0/16  (private)
 * - 169.254.0.0/16  (link-local)
 * - 0.0.0.0/8       (unspecified)
 */
function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(p => isNaN(p) || p < 0 || p > 255)) {
    return true; // Treat malformed IPs as blocked
  }

  const [a, b] = parts;

  // 127.0.0.0/8 - loopback
  if (a === 127) return true;
  // 10.0.0.0/8 - private
  if (a === 10) return true;
  // 172.16.0.0/12 - private
  if (a === 172 && b >= 16 && b <= 31) return true;
  // 192.168.0.0/16 - private
  if (a === 192 && b === 168) return true;
  // 169.254.0.0/16 - link-local
  if (a === 169 && b === 254) return true;
  // 0.0.0.0/8 - unspecified
  if (a === 0) return true;

  return false;
}

/**
 * Check if an IPv6 address is in a private/internal range.
 *
 * Blocked ranges:
 * - ::1           (loopback)
 * - ::            (unspecified)
 * - fc00::/7      (unique local addresses: fc00:: and fd00::)
 * - fe80::/10     (link-local)
 * - ::ffff:0:0/96 (IPv4-mapped, checked via mapped IPv4)
 */
function isPrivateIPv6(ip: string): boolean {
  const normalized = ip.toLowerCase();

  // Loopback
  if (normalized === '::1') return true;
  // Unspecified
  if (normalized === '::') return true;

  // IPv4-mapped IPv6 (e.g., ::ffff:192.168.1.1)
  const v4MappedMatch = normalized.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (v4MappedMatch) {
    return isPrivateIPv4(v4MappedMatch[1]);
  }

  // Expand the address to check prefix ranges
  const expanded = expandIPv6(normalized);
  if (!expanded) return true; // Treat unparseable as blocked

  const firstWord = parseInt(expanded.substring(0, 4), 16);

  // fc00::/7 - unique local (fc00:: through fdff::)
  if ((firstWord & 0xfe00) === 0xfc00) return true;
  // fe80::/10 - link-local
  if ((firstWord & 0xffc0) === 0xfe80) return true;

  return false;
}

/**
 * Expand an IPv6 address to its full 32-character hex representation.
 * Returns null if the address cannot be parsed.
 */
function expandIPv6(ip: string): string | null {
  try {
    // Use Node's net module to normalize
    if (!net.isIPv6(ip)) return null;

    // Split on :: to handle abbreviation
    const halves = ip.split('::');
    let groups: string[];

    if (halves.length === 2) {
      const left = halves[0] ? halves[0].split(':') : [];
      const right = halves[1] ? halves[1].split(':') : [];
      const missing = 8 - left.length - right.length;
      const middle = Array(missing).fill('0000');
      groups = [...left, ...middle, ...right];
    } else {
      groups = ip.split(':');
    }

    if (groups.length !== 8) return null;

    return groups.map(g => g.padStart(4, '0')).join('');
  } catch {
    return null;
  }
}

/**
 * Check if a hostname is an IP address literal (v4 or v6)
 * and whether it points to a private/internal range.
 */
function isPrivateIP(hostname: string): boolean {
  // Strip IPv6 brackets if present
  const cleanHost = hostname.replace(/^\[/, '').replace(/\]$/, '');

  if (net.isIPv4(cleanHost)) {
    return isPrivateIPv4(cleanHost);
  }

  if (net.isIPv6(cleanHost)) {
    return isPrivateIPv6(cleanHost);
  }

  return false;
}

/**
 * Validate a URL to prevent SSRF attacks.
 *
 * Checks:
 * 1. URL is well-formed (parseable by URL constructor)
 * 2. Only HTTP or HTTPS schemes are allowed
 * 3. Hostname is not a blocked internal name (localhost, metadata, etc.)
 * 4. Hostname IP literal is not in a private range
 * 5. DNS resolution of hostname does not resolve to a private IP
 *
 * @throws AppError with 400 status if validation fails
 */
export async function validateUrlNotInternal(url: string): Promise<void> {
  // Step 1: Parse the URL
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError('Invalid URL format', 400);
  }

  // Step 2: Only allow http and https
  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new AppError(
      'Only HTTP and HTTPS URLs are allowed',
      400
    );
  }

  // Step 3: Check for blocked hostnames
  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new AppError(
      'URLs pointing to localhost or internal services are not allowed',
      400
    );
  }

  // Also block any hostname ending with .local or .internal
  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new AppError(
      'URLs pointing to internal hostnames are not allowed',
      400
    );
  }

  // Step 4: If the hostname is an IP literal, check it directly
  if (isPrivateIP(hostname)) {
    throw new AppError(
      'URLs pointing to private or internal IP addresses are not allowed',
      400
    );
  }

  // Step 5: Resolve the hostname and check resolved IPs to prevent DNS rebinding
  if (!net.isIP(hostname.replace(/^\[/, '').replace(/\]$/, ''))) {
    try {
      const resolvedIPs: string[] = [];

      try {
        const ipv4s = await dnsResolve4(hostname);
        resolvedIPs.push(...ipv4s);
      } catch {
        // No IPv4 records, continue
      }

      try {
        const ipv6s = await dnsResolve6(hostname);
        resolvedIPs.push(...ipv6s);
      } catch {
        // No IPv6 records, continue
      }

      if (resolvedIPs.length === 0) {
        throw new AppError(
          'Could not resolve hostname. Please check the URL.',
          400
        );
      }

      for (const ip of resolvedIPs) {
        if (net.isIPv4(ip) && isPrivateIPv4(ip)) {
          throw new AppError(
            'URL hostname resolves to a private or internal IP address',
            400
          );
        }
        if (net.isIPv6(ip) && isPrivateIPv6(ip)) {
          throw new AppError(
            'URL hostname resolves to a private or internal IP address',
            400
          );
        }
      }
    } catch (err) {
      // Re-throw AppErrors
      if (err instanceof AppError) throw err;
      // DNS resolution failed entirely
      throw new AppError(
        'Could not resolve hostname. Please check the URL.',
        400
      );
    }
  }
}

/**
 * Synchronous URL validation that checks everything except DNS resolution.
 * Use this for fast pre-checks; the full async version is preferred.
 *
 * @throws AppError with 400 status if validation fails
 */
export function validateUrlNotInternalSync(url: string): void {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new AppError('Invalid URL format', 400);
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== 'http:' && protocol !== 'https:') {
    throw new AppError('Only HTTP and HTTPS URLs are allowed', 400);
  }

  const hostname = parsed.hostname.toLowerCase();
  if (BLOCKED_HOSTNAMES.includes(hostname)) {
    throw new AppError(
      'URLs pointing to localhost or internal services are not allowed',
      400
    );
  }

  if (hostname.endsWith('.local') || hostname.endsWith('.internal')) {
    throw new AppError(
      'URLs pointing to internal hostnames are not allowed',
      400
    );
  }

  if (isPrivateIP(hostname)) {
    throw new AppError(
      'URLs pointing to private or internal IP addresses are not allowed',
      400
    );
  }
}
