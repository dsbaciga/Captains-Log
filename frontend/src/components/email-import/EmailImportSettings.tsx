import { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import emailImportService from '../../services/emailImport.service';
import type { EmailImportConfig } from '../../services/emailImport.service';
import toast from 'react-hot-toast';

export default function EmailImportSettings() {
  const [config, setConfig] = useState<EmailImportConfig | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [isTestingGmail, setIsTestingGmail] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // General
  const [enabled, setEnabled] = useState(false);
  const [pollInterval, setPollInterval] = useState(5);

  // Gmail
  const [gmailClientId, setGmailClientId] = useState('');
  const [gmailClientSecret, setGmailClientSecret] = useState('');
  const [gmailRefreshToken, setGmailRefreshToken] = useState('');
  const [gmailInboxEmail, setGmailInboxEmail] = useState('');

  // LLM
  const [llmBaseUrl, setLlmBaseUrl] = useState('');
  const [llmApiKey, setLlmApiKey] = useState('');
  const [llmModel, setLlmModel] = useState('');

  // Forwarding email (per-user setting)
  const [forwardingEmail, setForwardingEmail] = useState('');
  const hasLoadedEmail = useRef(false);
  const [isSavingEmail, setIsSavingEmail] = useState(false);

  // Collapsible sections
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    general: true,
    gmail: false,
    llm: false,
    forwarding: true,
  });

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({ ...prev, [section]: !prev[section] }));
  };

  const loadConfig = useCallback(async () => {
    try {
      const [data, emailData] = await Promise.all([
        emailImportService.getEmailImportConfig(),
        emailImportService.getForwardingEmailSettings(),
      ]);
      setConfig(data);
      setEnabled(data.emailImportEnabled);
      setPollInterval(data.emailImportPollInterval);
      setGmailClientId(data.gmailClientId || '');
      setGmailInboxEmail(data.gmailInboxEmail || '');
      setLlmBaseUrl(data.llmBaseUrl || '');
      setLlmModel(data.llmModel || '');
      if (!hasLoadedEmail.current) {
        setForwardingEmail(emailData.forwardingEmail || '');
        hasLoadedEmail.current = true;
      }
    } catch (error) {
      console.error('Failed to load email import config:', error);
      toast.error('Failed to load email import settings');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadConfig();
  }, [loadConfig]);

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const data: Record<string, unknown> = {
        emailImportEnabled: enabled,
        emailImportPollInterval: pollInterval,
        gmailInboxEmail: gmailInboxEmail || null,
        llmBaseUrl: llmBaseUrl || null,
        llmModel: llmModel || null,
      };
      // Only send credentials if the user entered new values
      if (gmailClientId) data.gmailClientId = gmailClientId;
      if (gmailClientSecret) data.gmailClientSecret = gmailClientSecret;
      if (gmailRefreshToken) data.gmailRefreshToken = gmailRefreshToken;
      if (llmApiKey) data.llmApiKey = llmApiKey;

      await emailImportService.updateEmailImportConfig(data);
      setMessage({ type: 'success', text: 'Email import settings saved' });
      setGmailClientSecret('');
      setGmailRefreshToken('');
      setLlmApiKey('');
      await loadConfig();
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setMessage({ type: 'error', text: error.response?.data?.message || 'Failed to save settings' });
    } finally {
      setIsSaving(false);
    }
  };

  const handleTestLlm = async () => {
    setIsTesting(true);
    setMessage(null);
    try {
      const result = await emailImportService.testLlmConnection();
      setMessage({ type: 'success', text: result.message });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setMessage({ type: 'error', text: error.response?.data?.message || 'LLM connection test failed' });
    } finally {
      setIsTesting(false);
    }
  };

  const handleTestGmail = async () => {
    setIsTestingGmail(true);
    setMessage(null);
    try {
      const result = await emailImportService.testGmailConnection();
      setMessage({ type: 'success', text: result.message });
    } catch (err: unknown) {
      const error = err as { response?: { data?: { message?: string } } };
      setMessage({ type: 'error', text: error.response?.data?.message || 'Gmail connection test failed' });
    } finally {
      setIsTestingGmail(false);
    }
  };

  const handleSaveForwardingEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingEmail(true);
    try {
      await emailImportService.updateForwardingEmail(forwardingEmail.trim() || null);
      toast.success('Forwarding email updated');
    } catch {
      toast.error('Failed to update forwarding email');
    } finally {
      setIsSavingEmail(false);
    }
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-lg shadow p-6">
        <p className="text-slate dark:text-warm-gray">Loading email import settings...</p>
      </div>
    );
  }

  const isConfigured = config && config.gmailClientSecretSet && config.gmailRefreshTokenSet && config.llmApiKeySet;

  const inputCls = 'w-full px-4 py-2 border border-primary-100 dark:border-gold/20 rounded-lg bg-white dark:bg-navy-700 text-charcoal dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-gold focus:border-transparent text-sm font-body';
  const labelCls = 'block text-sm font-medium text-charcoal dark:text-warm-gray mb-1 font-body';

  return (
    <div className="bg-white dark:bg-navy-800 rounded-lg shadow p-6">
      <div className="flex items-center gap-3 mb-4">
        <span className="text-2xl" aria-hidden="true">{'\u2709'}</span>
        <h2 className="text-2xl font-bold text-charcoal dark:text-white font-display">Email Import</h2>
      </div>

      <p className="text-slate dark:text-warm-gray mb-6 font-body">
        Forward travel confirmation emails to automatically extract and import trip details like flights, hotels, and activities.
      </p>

      {/* Status indicator */}
      <div className={`mb-6 p-4 rounded-lg border ${
        isConfigured
          ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
          : 'bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-700'
      }`}>
        <div className="flex items-center gap-2">
          {isConfigured ? (
            <>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                Configured
              </span>
              <p className="text-sm text-green-800 dark:text-green-200 font-body">
                Email import is configured{enabled ? ' and enabled' : ' but disabled'}.
              </p>
            </>
          ) : (
            <>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                Not Configured
              </span>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-body">
                Gmail and LLM credentials are required below.
              </p>
            </>
          )}
        </div>
      </div>

      {message && (
        <div className={`mb-4 p-4 rounded-lg border ${
          message.type === 'success'
            ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
            : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-700'
        }`}>
          <p className={message.type === 'success'
            ? 'text-green-800 dark:text-green-200 text-sm font-body'
            : 'text-red-800 dark:text-red-200 text-sm font-body'
          }>
            {message.text}
          </p>
        </div>
      )}

      <div className="space-y-4">
        {/* ===== GENERAL SECTION ===== */}
        <SectionHeader title="General" expanded={expandedSections.general} onToggle={() => toggleSection('general')} />
        {expandedSections.general && (
          <div className="space-y-4 pl-4 border-l-2 border-primary-100 dark:border-gold/20">
            <div className="flex items-center justify-between">
              <div>
                <label className={labelCls}>Enable Email Import</label>
                <p className="text-xs text-slate dark:text-warm-gray/70 font-body">
                  When enabled, the system polls for new emails on the configured interval.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEnabled(!enabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  enabled ? 'bg-primary-500' : 'bg-gray-300 dark:bg-navy-600'
                }`}
                role="switch"
                aria-checked={enabled}
              >
                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  enabled ? 'translate-x-6' : 'translate-x-1'
                }`} />
              </button>
            </div>

            <div>
              <label htmlFor="pollInterval" className={labelCls}>
                Poll Interval (minutes)
              </label>
              <input
                id="pollInterval"
                type="number"
                min={1}
                max={60}
                value={pollInterval}
                onChange={(e) => setPollInterval(Math.max(1, Math.min(60, parseInt(e.target.value, 10) || 5)))}
                className={inputCls + ' max-w-[120px]'}
              />
            </div>
          </div>
        )}

        {/* ===== GMAIL CREDENTIALS SECTION ===== */}
        <SectionHeader title="Gmail Credentials" expanded={expandedSections.gmail} onToggle={() => toggleSection('gmail')} />
        {expandedSections.gmail && (
          <div className="space-y-4 pl-4 border-l-2 border-primary-100 dark:border-gold/20">
            <div className="p-3 bg-parchment dark:bg-navy-700 rounded-lg">
              <p className="text-xs text-slate dark:text-warm-gray/70 font-body mb-2">
                <strong>Setup:</strong> Create a Google Cloud project, enable the Gmail API, create OAuth 2.0 credentials,
                and use the <a href="https://developers.google.com/oauthplayground" target="_blank" rel="noopener noreferrer"
                className="text-primary-600 dark:text-gold underline">OAuth Playground</a> to generate a refresh token with
                the <code className="text-xs">https://www.googleapis.com/auth/gmail.modify</code> scope.
              </p>
            </div>

            <div>
              <label htmlFor="gmailClientId" className={labelCls}>Client ID</label>
              <input
                id="gmailClientId"
                type="text"
                value={gmailClientId}
                onChange={(e) => setGmailClientId(e.target.value)}
                placeholder="123456789.apps.googleusercontent.com"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="gmailClientSecret" className={labelCls}>Client Secret</label>
              <input
                id="gmailClientSecret"
                type="password"
                value={gmailClientSecret}
                onChange={(e) => setGmailClientSecret(e.target.value)}
                placeholder={config?.gmailClientSecretSet ? 'Enter new secret to update' : 'Enter client secret'}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="gmailRefreshToken" className={labelCls}>Refresh Token</label>
              <input
                id="gmailRefreshToken"
                type="password"
                value={gmailRefreshToken}
                onChange={(e) => setGmailRefreshToken(e.target.value)}
                placeholder={config?.gmailRefreshTokenSet ? 'Enter new token to update' : 'Enter refresh token'}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="gmailInboxEmail" className={labelCls}>Inbox Email Address</label>
              <input
                id="gmailInboxEmail"
                type="email"
                value={gmailInboxEmail}
                onChange={(e) => setGmailInboxEmail(e.target.value)}
                placeholder="travel-inbox@gmail.com"
                className={inputCls}
              />
              <p className="mt-1 text-xs text-slate dark:text-warm-gray/70 font-body">
                The shared Gmail inbox where users forward their confirmation emails.
              </p>
            </div>

            <button
              type="button"
              onClick={handleTestGmail}
              disabled={isTestingGmail || isSaving}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed text-sm font-body"
            >
              {isTestingGmail ? 'Testing...' : 'Test Gmail Connection'}
            </button>
          </div>
        )}

        {/* ===== LLM CONFIGURATION SECTION ===== */}
        <SectionHeader title="LLM Configuration" expanded={expandedSections.llm} onToggle={() => toggleSection('llm')} />
        {expandedSections.llm && (
          <div className="space-y-4 pl-4 border-l-2 border-primary-100 dark:border-gold/20">
            <div className="p-3 bg-parchment dark:bg-navy-700 rounded-lg">
              <p className="text-xs text-slate dark:text-warm-gray/70 font-body">
                Any OpenAI-compatible API works (OpenAI, OpenRouter, Ollama, LM Studio, etc.).
                The LLM parses email content into structured travel entities.
              </p>
            </div>

            <div>
              <label htmlFor="llmBaseUrl" className={labelCls}>API Base URL</label>
              <input
                id="llmBaseUrl"
                type="url"
                value={llmBaseUrl}
                onChange={(e) => setLlmBaseUrl(e.target.value)}
                placeholder="https://api.openai.com/v1"
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="llmApiKey" className={labelCls}>API Key</label>
              <input
                id="llmApiKey"
                type="password"
                value={llmApiKey}
                onChange={(e) => setLlmApiKey(e.target.value)}
                placeholder={config?.llmApiKeySet ? 'Enter new key to update' : 'Enter API key'}
                className={inputCls}
              />
            </div>

            <div>
              <label htmlFor="llmModel" className={labelCls}>Model</label>
              <input
                id="llmModel"
                type="text"
                value={llmModel}
                onChange={(e) => setLlmModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className={inputCls}
              />
            </div>

            <button
              type="button"
              onClick={handleTestLlm}
              disabled={isTesting || isSaving}
              className="px-4 py-2 bg-gray-600 hover:bg-gray-700 disabled:bg-gray-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed text-sm font-body"
            >
              {isTesting ? 'Testing...' : 'Test LLM Connection'}
            </button>
          </div>
        )}

        {/* Save button for all config sections */}
        <div className="pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-6 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed text-sm font-body font-medium"
          >
            {isSaving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>

        {/* ===== FORWARDING EMAIL SECTION (per-user) ===== */}
        <div className="border-t border-primary-100 dark:border-gold/20 pt-4 mt-4">
          <SectionHeader title="Your Forwarding Email" expanded={expandedSections.forwarding} onToggle={() => toggleSection('forwarding')} />
          {expandedSections.forwarding && (
            <div className="space-y-3 pl-4 border-l-2 border-primary-100 dark:border-gold/20">
              {/* Show inbox email to forward to */}
              {gmailInboxEmail && (
                <div>
                  <label className={labelCls}>Forward emails to</label>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 px-4 py-2 bg-parchment dark:bg-navy-700 border border-primary-100 dark:border-gold/20 rounded-lg text-sm text-charcoal dark:text-white font-mono select-all">
                      {gmailInboxEmail}
                    </code>
                    <button
                      type="button"
                      onClick={() => {
                        navigator.clipboard.writeText(gmailInboxEmail);
                        toast.success('Email address copied');
                      }}
                      className="px-3 py-2 text-sm border border-primary-100 dark:border-gold/20 rounded-lg hover:bg-parchment dark:hover:bg-navy-700 text-charcoal dark:text-warm-gray transition-colors whitespace-nowrap font-body"
                    >
                      Copy
                    </button>
                  </div>
                </div>
              )}

              <form onSubmit={handleSaveForwardingEmail}>
                <label htmlFor="forwardingEmail" className={labelCls}>
                  Your forwarding email (for matching)
                </label>
                <p className="text-xs text-slate dark:text-warm-gray/70 mb-2 font-body">
                  Enter the email address you forward from so the system can match incoming emails to your account.
                </p>
                <div className="flex gap-2">
                  <input
                    id="forwardingEmail"
                    type="email"
                    value={forwardingEmail}
                    onChange={(e) => setForwardingEmail(e.target.value)}
                    placeholder="your-email@example.com"
                    className={inputCls + ' flex-1'}
                  />
                  <button
                    type="submit"
                    disabled={isSavingEmail}
                    className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed whitespace-nowrap text-sm font-body"
                  >
                    {isSavingEmail ? 'Saving...' : 'Save'}
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>

      {/* Manage imports link */}
      <div className="mt-6">
        <Link
          to="/email-imports"
          className="inline-flex items-center gap-2 px-4 py-2 bg-parchment dark:bg-navy-700 hover:bg-warm-gray dark:hover:bg-navy-600 text-charcoal dark:text-warm-gray rounded-lg transition-colors text-sm font-medium font-body"
        >
          Manage imports
          <span aria-hidden="true">&rarr;</span>
        </Link>
      </div>
    </div>
  );
}

function SectionHeader({ title, expanded, onToggle }: { title: string; expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      onClick={onToggle}
      className="flex items-center gap-2 w-full text-left py-2"
    >
      <span className={`text-sm transition-transform ${expanded ? 'rotate-90' : ''}`}>&#9654;</span>
      <h3 className="text-lg font-semibold text-charcoal dark:text-white font-display">{title}</h3>
    </button>
  );
}
