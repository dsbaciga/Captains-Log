import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient, keepPreviousData } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import emailImportService from '../services/emailImport.service';
import tripService from '../services/trip.service';
import type { PendingEntity, EmailImport } from '../services/emailImport.service';
import PendingEntityCard from '../components/email-import/PendingEntityCard';
import PendingEntityEditModal from '../components/email-import/PendingEntityEditModal';
import TabGroup from '../components/TabGroup';
import type { TabGroupItem } from '../components/TabGroup';
import EmptyState from '../components/EmptyState';
import LoadingSpinner from '../components/LoadingSpinner';
import Pagination from '../components/Pagination';
import { useConfirmDialog } from '../hooks/useConfirmDialog';
import toast from 'react-hot-toast';

// --- Constants ---

const STATUS_BADGE_CLASSES: Record<EmailImport['status'], string> = {
  PARSED: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  PARSE_FAILED: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  NO_USER: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
  NO_ENTITIES: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
  FETCHED: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  PARSING: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
};

const STATUS_LABELS: Record<EmailImport['status'], string> = {
  PARSED: 'Parsed',
  PARSE_FAILED: 'Parse Failed',
  NO_USER: 'No User',
  NO_ENTITIES: 'No Entities',
  FETCHED: 'Fetched',
  PARSING: 'Parsing',
};

const HISTORY_PAGE_SIZE = 20;

// --- Helper: format a date for the history table/cards ---

function formatReceivedDate(dateStr: string | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return dateStr;
  }
}

// --- Helper: generate page numbers for Pagination component ---

function buildPageNumbers(currentPage: number, totalPages: number): (number | 'ellipsis')[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }
  const pages: (number | 'ellipsis')[] = [1];
  if (currentPage > 3) pages.push('ellipsis');
  const start = Math.max(2, currentPage - 1);
  const end = Math.min(totalPages - 1, currentPage + 1);
  for (let i = start; i <= end; i++) {
    if (!pages.includes(i)) pages.push(i);
  }
  if (currentPage < totalPages - 2) pages.push('ellipsis');
  if (totalPages > 1 && !pages.includes(totalPages)) pages.push(totalPages);
  return pages;
}

// --- Tab icon SVGs (inline, small) ---

const PendingIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const HistoryIcon = () => (
  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" aria-hidden="true">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
  </svg>
);

// ============================================================
// Component
// ============================================================

export default function EmailImportsPage() {
  const queryClient = useQueryClient();
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // --- Local state ---
  const [activeTab, setActiveTab] = useState('pending');
  const [entityTypeFilter, setEntityTypeFilter] = useState('');
  const [tripFilter, setTripFilter] = useState('');
  const [historyPage, setHistoryPage] = useState(1);
  const [editingEntity, setEditingEntity] = useState<PendingEntity | null>(null);
  const [processingId, setProcessingId] = useState<number | null>(null);

  // --- Queries ---

  // Status
  const {
    data: status,
    isLoading: statusLoading,
    isError: statusError,
    refetch: refetchStatus,
  } = useQuery({
    queryKey: ['emailImport', 'status'],
    queryFn: () => emailImportService.getStatus(),
  });

  // Pending entities (with refetchInterval to match navbar badge)
  const {
    data: pendingEntities,
    isLoading: pendingLoading,
    isError: pendingError,
    refetch: refetchPending,
  } = useQuery({
    queryKey: ['emailImport', 'pending', entityTypeFilter, tripFilter],
    queryFn: () => {
      const filters: { entityType?: string; status: string; tripId?: number } = { status: 'PENDING' };
      if (entityTypeFilter) filters.entityType = entityTypeFilter;
      if (tripFilter) filters.tripId = Number(tripFilter);
      return emailImportService.getPendingEntities(filters);
    },
    enabled: activeTab === 'pending',
    refetchInterval: 60000,
  });

  // History (with keepPreviousData for smooth page transitions)
  const {
    data: historyData,
    isLoading: historyLoading,
    isError: historyError,
    refetch: refetchHistory,
  } = useQuery({
    queryKey: ['emailImport', 'history', historyPage],
    queryFn: () => emailImportService.getEmailImports(historyPage, HISTORY_PAGE_SIZE),
    enabled: activeTab === 'history',
    placeholderData: keepPreviousData,
  });

  // Trips list for the filter dropdown
  const { data: tripsData } = useQuery({
    queryKey: ['trips', 'all-for-select'],
    queryFn: () => tripService.getTrips({ limit: 500 }),
  });

  const tripsForFilter = tripsData?.trips ?? [];

  // --- Mutations ---

  const triggerMutation = useMutation({
    mutationFn: () => emailImportService.triggerPoll(),
    onSuccess: (data) => {
      toast.success(
        `Processed ${data.processed} email(s)${data.errors > 0 ? `, ${data.errors} error(s)` : ''}`
      );
      queryClient.invalidateQueries({ queryKey: ['emailImport'] });
    },
    onError: () => {
      toast.error('Failed to check for emails');
    },
  });

  const acceptMutation = useMutation({
    mutationFn: (id: number) => emailImportService.acceptPendingEntity(id),
    onSuccess: () => {
      toast.success('Entity accepted and created');
      setProcessingId(null);
      queryClient.invalidateQueries({ queryKey: ['emailImport'] });
    },
    onError: () => {
      toast.error('Failed to accept entity');
      setProcessingId(null);
    },
  });

  const rejectMutation = useMutation({
    mutationFn: (id: number) => emailImportService.rejectPendingEntity(id),
    onSuccess: () => {
      toast.success('Entity rejected');
      setProcessingId(null);
      queryClient.invalidateQueries({ queryKey: ['emailImport'] });
    },
    onError: () => {
      toast.error('Failed to reject entity');
      setProcessingId(null);
    },
  });

  // Update + accept mutation (Save & Accept)
  const updateAndAcceptMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { parsedData?: Record<string, unknown>; matchedTripId?: number | null };
    }) =>
      emailImportService
        .updatePendingEntity(id, data)
        .then(() =>
          emailImportService.acceptPendingEntity(id, {
            tripId: data.matchedTripId ?? undefined,
            data: data.parsedData,
          })
        ),
    onSuccess: () => {
      toast.success('Entity updated and accepted');
      setEditingEntity(null);
      queryClient.invalidateQueries({ queryKey: ['emailImport'] });
    },
    onError: () => {
      toast.error('Failed to save and accept entity');
    },
  });

  // Save-only mutation (update without accepting)
  const saveOnlyMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: number;
      data: { parsedData?: Record<string, unknown>; matchedTripId?: number | null };
    }) => emailImportService.updatePendingEntity(id, data),
    onSuccess: () => {
      toast.success('Entity saved');
      setEditingEntity(null);
      queryClient.invalidateQueries({ queryKey: ['emailImport'] });
    },
    onError: () => {
      toast.error('Failed to save entity');
    },
  });

  // --- Handlers ---

  const handleAccept = (id: number) => {
    setProcessingId(id);
    acceptMutation.mutate(id);
  };

  const handleReject = async (id: number) => {
    const confirmed = await confirm({
      title: 'Reject Entity',
      message: 'Are you sure you want to reject this entity? This action cannot be undone.',
      confirmLabel: 'Reject',
      variant: 'danger',
    });
    if (!confirmed) return;
    setProcessingId(id);
    rejectMutation.mutate(id);
  };

  const handleEditSaveAndAccept = (
    id: number,
    data: { parsedData: Record<string, unknown>; matchedTripId: number | null }
  ) => {
    updateAndAcceptMutation.mutate({ id, data });
  };

  const handleEditSaveOnly = (
    id: number,
    data: { parsedData: Record<string, unknown>; matchedTripId: number | null }
  ) => {
    saveOnlyMutation.mutate({ id, data });
  };

  const handleTripChange = (entityId: number, tripId: number | null) => {
    emailImportService
      .updatePendingEntity(entityId, { matchedTripId: tripId })
      .then(() => {
        queryClient.invalidateQueries({ queryKey: ['emailImport'] });
      })
      .catch(() => {
        toast.error('Failed to update trip assignment');
      });
  };

  // --- Derived values ---

  const isConfigured = status?.gmailConfigured && status?.llmConfigured;

  const pendingList = pendingEntities?.entities ?? [];
  const pendingCount = pendingEntities?.total ?? pendingList.length;

  const tabs: TabGroupItem[] = useMemo(
    () => [
      { id: 'pending', label: 'Pending Review', icon: <PendingIcon />, count: pendingCount },
      { id: 'history', label: 'Email History', icon: <HistoryIcon /> },
    ],
    [pendingCount]
  );

  const historyPageNumbers = useMemo(
    () => buildPageNumbers(historyPage, historyData?.totalPages ?? 1),
    [historyPage, historyData?.totalPages]
  );

  // ============================================================
  // Render
  // ============================================================

  return (
    <div className="min-h-screen bg-cream dark:bg-navy-900">
      <ConfirmDialogComponent />

      <main className="max-w-[1600px] mx-auto px-4 sm:px-6 py-8">
        {/* Back link */}
        <Link
          to="/dashboard"
          className="text-primary-600 dark:text-gold hover:underline mb-6 inline-block font-body"
        >
          &larr; Back to Dashboard
        </Link>

        {/* Page header */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
          <h1 className="text-3xl font-display font-bold text-charcoal dark:text-warm-gray">
            Email Imports
          </h1>
          <button
            type="button"
            onClick={() => triggerMutation.mutate()}
            disabled={triggerMutation.isPending || !isConfigured}
            className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
          >
            {triggerMutation.isPending ? 'Checking...' : 'Check for emails'}
          </button>
        </div>

        {/* Status error banner */}
        {statusError && (
          <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 mb-6">
            Failed to load email import status.{' '}
            <button onClick={() => refetchStatus()} className="underline font-medium">
              Retry
            </button>
          </div>
        )}

        {/* Status banner */}
        {!statusLoading && status && !statusError && (
          <div
            className={`mb-6 p-4 rounded-xl border ${
              isConfigured
                ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-700'
                : 'bg-primary-50 dark:bg-primary-900/20 border-primary-200 dark:border-primary-700'
            }`}
          >
            <div className="flex items-center gap-3">
              {isConfigured ? (
                <>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-800 dark:text-green-100">
                    Active
                  </span>
                  <p className="text-sm text-green-800 dark:text-green-200 font-body">
                    Email import is configured and active. Forward travel emails to:{' '}
                    <span className="font-mono font-semibold">{status.inboxEmail}</span>
                  </p>
                </>
              ) : (
                <p className="text-sm text-primary-800 dark:text-primary-200 font-body">
                  Email import is not fully configured. Forward travel emails to:{' '}
                  <span className="font-mono font-semibold">{status.inboxEmail}</span>
                  {!status.gmailConfigured && (
                    <span className="block mt-1">Gmail API is not configured on the server.</span>
                  )}
                  {!status.llmConfigured && (
                    <span className="block mt-1">
                      LLM (AI parser) is not configured on the server.
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>
        )}

        {/* Tabs */}
        <div className="mb-6">
          <TabGroup tabs={tabs} activeTab={activeTab} onTabChange={setActiveTab} />
        </div>

        {/* ===================== Pending Tab ===================== */}
        {activeTab === 'pending' && (
          <div>
            {/* Filters row */}
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <div>
                <label htmlFor="entity-type-filter" className="sr-only">
                  Filter by entity type
                </label>
                <select
                  id="entity-type-filter"
                  value={entityTypeFilter}
                  onChange={(e) => setEntityTypeFilter(e.target.value)}
                  className="input w-full sm:w-auto min-w-[160px]"
                >
                  <option value="">All types</option>
                  <option value="TRANSPORTATION">Transportation</option>
                  <option value="LODGING">Lodging</option>
                  <option value="ACTIVITY">Activity</option>
                  <option value="LOCATION">Location</option>
                </select>
              </div>

              <div>
                <label htmlFor="trip-filter" className="sr-only">
                  Filter by trip
                </label>
                <select
                  id="trip-filter"
                  value={tripFilter}
                  onChange={(e) => setTripFilter(e.target.value)}
                  className="input w-full sm:w-auto min-w-[200px]"
                >
                  <option value="">All trips</option>
                  {tripsForFilter.map((trip) => (
                    <option key={trip.id} value={String(trip.id)}>
                      {trip.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Error state */}
            {pendingError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 mb-4">
                Failed to load pending items.{' '}
                <button onClick={() => refetchPending()} className="underline font-medium">
                  Retry
                </button>
              </div>
            )}

            {/* Loading */}
            {pendingLoading && <LoadingSpinner.FullPage message="Loading pending items..." />}

            {/* Pending entity list */}
            {!pendingLoading && !pendingError && pendingList.length > 0 && (
              <div className="space-y-4">
                {pendingList.map((entity) => (
                  <PendingEntityCard
                    key={entity.id}
                    entity={entity}
                    onAccept={handleAccept}
                    onReject={handleReject}
                    onEdit={(e) => setEditingEntity(e)}
                    isAccepting={acceptMutation.isPending && processingId === entity.id}
                    isRejecting={rejectMutation.isPending && processingId === entity.id}
                    trips={tripsForFilter}
                    onTripChange={handleTripChange}
                  />
                ))}
              </div>
            )}

            {/* Empty state */}
            {!pendingLoading && !pendingError && pendingList.length === 0 && (
              <EmptyState
                icon="📬"
                message="No pending items"
                subMessage="Forward travel confirmation emails to get started."
              />
            )}
          </div>
        )}

        {/* ===================== History Tab ===================== */}
        {activeTab === 'history' && (
          <div>
            {/* Error state */}
            {historyError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-4 text-red-700 dark:text-red-400 mb-4">
                Failed to load email history.{' '}
                <button onClick={() => refetchHistory()} className="underline font-medium">
                  Retry
                </button>
              </div>
            )}

            {/* Loading */}
            {historyLoading && !historyData && (
              <LoadingSpinner.FullPage message="Loading email history..." />
            )}

            {/* History content */}
            {historyData && historyData.imports.length > 0 && (
              <>
                {/* Desktop table (hidden on mobile) */}
                <div className="hidden md:block card overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
                      <thead className="bg-parchment dark:bg-navy-900/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate dark:text-warm-gray/70 uppercase tracking-wider">
                            Subject
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate dark:text-warm-gray/70 uppercase tracking-wider">
                            From
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate dark:text-warm-gray/70 uppercase tracking-wider">
                            Status
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate dark:text-warm-gray/70 uppercase tracking-wider">
                            Entities
                          </th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-slate dark:text-warm-gray/70 uppercase tracking-wider">
                            Received
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {historyData.imports.map((email) => (
                          <tr
                            key={email.id}
                            className="hover:bg-parchment/50 dark:hover:bg-navy-700/50 transition-colors"
                          >
                            <td className="px-6 py-4 text-sm text-charcoal dark:text-cream-100 font-body max-w-xs truncate">
                              {email.subject || '(no subject)'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate dark:text-warm-gray font-body max-w-xs truncate">
                              {email.fromAddress || '-'}
                            </td>
                            <td className="px-6 py-4">
                              <span
                                className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_BADGE_CLASSES[email.status]}`}
                              >
                                {STATUS_LABELS[email.status]}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-sm text-slate dark:text-warm-gray font-body">
                              {email._count?.pendingEntities ?? '-'}
                            </td>
                            <td className="px-6 py-4 text-sm text-slate dark:text-warm-gray font-body whitespace-nowrap">
                              {formatReceivedDate(email.receivedAt)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Mobile card layout (shown only on small screens) */}
                <div className="md:hidden space-y-3">
                  {historyData.imports.map((email) => (
                    <div
                      key={email.id}
                      className="card p-4"
                    >
                      <div className="flex items-start justify-between gap-2 mb-2">
                        <p className="text-sm font-medium text-charcoal dark:text-cream-100 font-body truncate flex-1">
                          {email.subject || '(no subject)'}
                        </p>
                        <span
                          className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium flex-shrink-0 ${STATUS_BADGE_CLASSES[email.status]}`}
                        >
                          {STATUS_LABELS[email.status]}
                        </span>
                      </div>
                      <div className="text-xs text-slate dark:text-warm-gray font-body space-y-1">
                        {email.fromAddress && (
                          <p className="truncate">
                            <span className="font-medium">From:</span> {email.fromAddress}
                          </p>
                        )}
                        <div className="flex items-center justify-between">
                          <span>
                            <span className="font-medium">Entities:</span>{' '}
                            {email._count?.pendingEntities ?? '-'}
                          </span>
                          <span className="text-slate/70 dark:text-warm-gray/50">
                            {formatReceivedDate(email.receivedAt)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Pagination */}
                {historyData.totalPages > 1 && (
                  <div className="mt-6">
                    <Pagination
                      currentPage={historyPage}
                      totalPages={historyData.totalPages}
                      pageNumbers={historyPageNumbers}
                      onPageChange={setHistoryPage}
                      onPrevious={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      onNext={() =>
                        setHistoryPage((p) => Math.min(historyData.totalPages, p + 1))
                      }
                      hasPreviousPage={historyPage > 1}
                      hasNextPage={historyPage < historyData.totalPages}
                      rangeStart={(historyPage - 1) * HISTORY_PAGE_SIZE + 1}
                      rangeEnd={Math.min(historyPage * HISTORY_PAGE_SIZE, historyData.total)}
                      total={historyData.total}
                    />
                  </div>
                )}
              </>
            )}

            {/* Empty state */}
            {!historyLoading && historyData && historyData.imports.length === 0 && (
              <EmptyState
                icon="📧"
                message="No email imports yet"
                subMessage="Emails will appear here after they are processed."
              />
            )}
          </div>
        )}

        {/* Edit Modal */}
        {editingEntity && (
          <PendingEntityEditModal
            entity={editingEntity}
            onSaveAndAccept={handleEditSaveAndAccept}
            onSave={handleEditSaveOnly}
            onClose={() => setEditingEntity(null)}
            isSaving={updateAndAcceptMutation.isPending || saveOnlyMutation.isPending}
          />
        )}
      </main>
    </div>
  );
}
