import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import emailImportService from '../../services/emailImport.service';
import toast from 'react-hot-toast';

export default function EmailImportSettings() {
  const queryClient = useQueryClient();
  const [forwardingEmail, setForwardingEmail] = useState('');
  const hasLoadedEmail = useRef(false);

  // Status query
  const { data: status, isLoading: statusLoading } = useQuery({
    queryKey: ['emailImport', 'status'],
    queryFn: () => emailImportService.getStatus(),
  });

  // Forwarding email query
  const { data: emailData, isLoading: emailLoading } = useQuery({
    queryKey: ['emailImport', 'forwardingEmail'],
    queryFn: () => emailImportService.getForwardingEmailSettings(),
  });

  // Sync forwarding email from query data on initial load
  useEffect(() => {
    if (emailData && !hasLoadedEmail.current) {
      setForwardingEmail(emailData.forwardingEmail || '');
      hasLoadedEmail.current = true;
    }
  }, [emailData]);

  // Save forwarding email mutation
  const saveEmailMutation = useMutation({
    mutationFn: (email: string) =>
      emailImportService.updateForwardingEmail(email || null),
    onSuccess: () => {
      toast.success('Forwarding email updated');
      queryClient.invalidateQueries({ queryKey: ['emailImport', 'forwardingEmail'] });
    },
    onError: () => {
      toast.error('Failed to update forwarding email');
    },
  });

  const handleSaveForwardingEmail = (e: React.FormEvent) => {
    e.preventDefault();
    saveEmailMutation.mutate(forwardingEmail.trim());
  };

  const isConfigured = status?.gmailConfigured && status?.llmConfigured;
  const isLoading = statusLoading || emailLoading;

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-lg shadow p-6">
        <p className="text-slate dark:text-warm-gray">Loading email import settings...</p>
      </div>
    );
  }

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
                Email import is active and ready to process emails.
              </p>
            </>
          ) : (
            <>
              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800 dark:bg-yellow-800 dark:text-yellow-100">
                Not Configured
              </span>
              <p className="text-sm text-yellow-800 dark:text-yellow-200 font-body">
                Server-side Gmail and/or LLM configuration is required.
              </p>
            </>
          )}
        </div>
      </div>

      {/* Inbox email address */}
      {status?.inboxEmail && (
        <div className="mb-6">
          <label className="block text-sm font-medium text-charcoal dark:text-warm-gray mb-1 font-body">
            Forward emails to
          </label>
          <div className="flex items-center gap-2">
            <code className="flex-1 px-4 py-2 bg-parchment dark:bg-navy-700 border border-primary-100 dark:border-gold/20 rounded-lg text-sm text-charcoal dark:text-white font-mono select-all">
              {status.inboxEmail}
            </code>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(status.inboxEmail);
                toast.success('Email address copied');
              }}
              className="px-3 py-2 text-sm border border-primary-100 dark:border-gold/20 rounded-lg hover:bg-parchment dark:hover:bg-navy-700 text-charcoal dark:text-warm-gray transition-colors whitespace-nowrap font-body"
            >
              Copy
            </button>
          </div>
        </div>
      )}

      {/* Forwarding email */}
      <form onSubmit={handleSaveForwardingEmail} className="mb-6">
        <label className="block text-sm font-medium text-charcoal dark:text-warm-gray mb-1 font-body">
          Your forwarding email (for matching)
        </label>
        <p className="text-xs text-slate dark:text-warm-gray/70 mb-2 font-body">
          Enter the email address you forward from so the system can match incoming emails to your account.
        </p>
        <div className="flex gap-2">
          <input
            type="email"
            value={forwardingEmail}
            onChange={(e) => setForwardingEmail(e.target.value)}
            placeholder="your-email@example.com"
            className="flex-1 px-4 py-2 border border-primary-100 dark:border-gold/20 rounded-lg bg-white dark:bg-navy-700 text-charcoal dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-gold focus:border-transparent text-sm font-body"
          />
          <button
            type="submit"
            disabled={saveEmailMutation.isPending}
            className="px-4 py-2 bg-primary-500 hover:bg-primary-600 disabled:bg-primary-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed whitespace-nowrap text-sm font-body"
          >
            {saveEmailMutation.isPending ? 'Saving...' : 'Save'}
          </button>
        </div>
      </form>

      {/* Manage imports link */}
      <Link
        to="/email-imports"
        className="inline-flex items-center gap-2 px-4 py-2 bg-parchment dark:bg-navy-700 hover:bg-warm-gray dark:hover:bg-navy-600 text-charcoal dark:text-warm-gray rounded-lg transition-colors text-sm font-medium font-body"
      >
        Manage imports
        <span aria-hidden="true">&rarr;</span>
      </Link>
    </div>
  );
}
