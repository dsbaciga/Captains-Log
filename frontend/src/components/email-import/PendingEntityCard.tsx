import { useState } from 'react';
import type { PendingEntity } from '../../services/emailImport.service';

interface Trip {
  id: number;
  title: string;
  startDate: string | null;
  endDate: string | null;
}

interface PendingEntityCardProps {
  entity: PendingEntity;
  onAccept: (id: number) => void;
  onReject: (id: number) => void;
  onEdit: (entity: PendingEntity) => void;
  isAccepting?: boolean;
  isRejecting?: boolean;
  trips?: Trip[];
  onTripChange?: (entityId: number, tripId: number | null) => void;
}

const ENTITY_TYPE_CONFIG: Record<
  PendingEntity['entityType'],
  { icon: string; label: string }
> = {
  TRANSPORTATION: { icon: '\u2708', label: 'Transportation' },
  LODGING: { icon: '\uD83C\uDFE8', label: 'Lodging' },
  ACTIVITY: { icon: '\uD83C\uDFAF', label: 'Activity' },
  LOCATION: { icon: '\uD83D\uDCCD', label: 'Location' },
};

function getConfidenceBadgeClass(confidence: number | null): string {
  if (confidence === null) return 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300';
  if (confidence >= 0.8) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300';
  if (confidence >= 0.5) return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300';
  return 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300';
}

function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleString(undefined, {
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

function EntityDetails({ entity }: { entity: PendingEntity }) {
  const d = entity.parsedData as Record<string, unknown>;

  switch (entity.entityType) {
    case 'TRANSPORTATION':
      return (
        <div className="text-sm text-charcoal/70 dark:text-warm-gray font-body space-y-1">
          {d.type && <p><span className="font-medium text-charcoal dark:text-cream-100">Type:</span> {String(d.type)}</p>}
          {d.carrier && <p><span className="font-medium text-charcoal dark:text-cream-100">Carrier:</span> {String(d.carrier)}</p>}
          {(d.fromLocationName || d.toLocationName) && (
            <p>
              <span className="font-medium text-charcoal dark:text-cream-100">Route:</span>{' '}
              {String(d.fromLocationName || '?')} &rarr; {String(d.toLocationName || '?')}
            </p>
          )}
          {d.departureTime && (
            <p><span className="font-medium text-charcoal dark:text-cream-100">Departure:</span> {formatDateTime(String(d.departureTime))}</p>
          )}
        </div>
      );
    case 'LODGING':
      return (
        <div className="text-sm text-charcoal/70 dark:text-warm-gray font-body space-y-1">
          {d.type && <p><span className="font-medium text-charcoal dark:text-cream-100">Type:</span> {String(d.type)}</p>}
          {d.name && <p><span className="font-medium text-charcoal dark:text-cream-100">Name:</span> {String(d.name)}</p>}
          {(d.checkInDate || d.checkOutDate) && (
            <p>
              <span className="font-medium text-charcoal dark:text-cream-100">Dates:</span>{' '}
              {formatDate(d.checkInDate as string)} - {formatDate(d.checkOutDate as string)}
            </p>
          )}
        </div>
      );
    case 'ACTIVITY':
      return (
        <div className="text-sm text-charcoal/70 dark:text-warm-gray font-body space-y-1">
          {d.name && <p><span className="font-medium text-charcoal dark:text-cream-100">Name:</span> {String(d.name)}</p>}
          {d.startTime && (
            <p><span className="font-medium text-charcoal dark:text-cream-100">Start:</span> {formatDateTime(String(d.startTime))}</p>
          )}
        </div>
      );
    case 'LOCATION':
      return (
        <div className="text-sm text-charcoal/70 dark:text-warm-gray font-body space-y-1">
          {d.name && <p><span className="font-medium text-charcoal dark:text-cream-100">Name:</span> {String(d.name)}</p>}
          {d.address && <p><span className="font-medium text-charcoal dark:text-cream-100">Address:</span> {String(d.address)}</p>}
        </div>
      );
    default:
      return null;
  }
}

export default function PendingEntityCard({
  entity,
  onAccept,
  onReject,
  onEdit,
  isAccepting,
  isRejecting,
  trips,
  onTripChange,
}: PendingEntityCardProps) {
  const config = ENTITY_TYPE_CONFIG[entity.entityType];
  const warnings = (entity.parsedData as Record<string, unknown>)._warnings as string[] | undefined;
  const isBusy = isAccepting || isRejecting;
  const [showRawData, setShowRawData] = useState(false);

  return (
    <div className="bg-white dark:bg-navy-800 rounded-xl shadow-soft border border-primary-500/10 dark:border-gold/20 p-5">
      <div className="flex flex-col sm:flex-row sm:items-start gap-4">
        {/* Left: Entity info */}
        <div className="flex-1 min-w-0">
          {/* Header row */}
          <div className="flex flex-wrap items-center gap-2 mb-3">
            <span className="text-lg" aria-hidden="true">{config.icon}</span>
            <span className="text-sm font-medium text-charcoal dark:text-cream-100 font-display">
              {config.label}
            </span>

            {/* Confidence badge */}
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getConfidenceBadgeClass(entity.confidence)}`}>
              {entity.confidence !== null ? `${Math.round(entity.confidence * 100)}% confidence` : 'No confidence'}
            </span>

            {/* Email subject */}
            {entity.emailImport?.subject && (
              <span className="text-xs text-slate dark:text-gray-500 truncate max-w-[200px]" title={entity.emailImport.subject}>
                from: {entity.emailImport.subject}
              </span>
            )}
          </div>

          {/* Entity details */}
          <EntityDetails entity={entity} />

          {/* Trip match */}
          <div className="mt-3">
            {entity.matchedTrip ? (
              <p className="text-sm font-body">
                <span className="font-medium text-charcoal dark:text-cream-100">Trip:</span>{' '}
                <span className="text-primary-600 dark:text-gold">{entity.matchedTrip.title}</span>
                {entity.matchedTrip.startDate && (
                  <span className="text-slate dark:text-gray-500 ml-1 text-xs">
                    ({formatDate(entity.matchedTrip.startDate)} - {formatDate(entity.matchedTrip.endDate)})
                  </span>
                )}
              </p>
            ) : (
              <div className="flex flex-wrap items-center gap-2">
                <p className="text-sm text-amber-600 dark:text-amber-400 font-body font-medium">
                  No trip matched
                </p>
                {trips && trips.length > 0 && onTripChange && (
                  <select
                    value=""
                    onChange={(e) => {
                      const tripId = e.target.value ? Number(e.target.value) : null;
                      onTripChange(entity.id, tripId);
                    }}
                    className="text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-navy-700 text-charcoal dark:text-warm-gray font-body"
                  >
                    <option value="">Assign trip...</option>
                    {trips.map((trip) => (
                      <option key={trip.id} value={trip.id}>
                        {trip.title}
                        {trip.startDate && ` (${formatDate(trip.startDate)} - ${formatDate(trip.endDate)})`}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            )}
            {/* Show inline trip selector even when a trip is matched, for changing */}
            {entity.matchedTrip && trips && trips.length > 0 && onTripChange && (
              <select
                value={entity.matchedTripId ?? ''}
                onChange={(e) => {
                  const tripId = e.target.value ? Number(e.target.value) : null;
                  onTripChange(entity.id, tripId);
                }}
                className="mt-1 text-xs px-2 py-1 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-navy-700 text-charcoal dark:text-warm-gray font-body"
              >
                <option value="">Change trip...</option>
                {trips.map((trip) => (
                  <option key={trip.id} value={trip.id}>
                    {trip.title}
                    {trip.startDate && ` (${formatDate(trip.startDate)} - ${formatDate(trip.endDate)})`}
                  </option>
                ))}
              </select>
            )}
          </div>

          {/* Warnings */}
          {warnings && warnings.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-1">
              {warnings.map((warning, i) => (
                <span
                  key={i}
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300"
                >
                  {warning}
                </span>
              ))}
            </div>
          )}

          {/* Expandable raw data */}
          <div className="mt-3">
            <button
              type="button"
              onClick={() => setShowRawData(!showRawData)}
              className="text-sm text-primary-600 dark:text-gold hover:underline font-body"
            >
              {showRawData ? 'Hide all fields' : 'Show all fields'}
            </button>
            {showRawData && (
              <pre className="mt-2 p-3 bg-gray-50 dark:bg-navy-900 rounded-lg text-xs overflow-x-auto text-charcoal dark:text-warm-gray font-mono">
                {JSON.stringify(entity.parsedData, null, 2)}
              </pre>
            )}
          </div>
        </div>

        {/* Right: Action buttons */}
        <div className="flex sm:flex-col gap-2 flex-shrink-0">
          <button
            type="button"
            onClick={() => onAccept(entity.id)}
            disabled={!entity.matchedTripId || isBusy}
            className="px-4 py-2 bg-green-600 hover:bg-green-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white text-sm rounded-lg transition-colors disabled:cursor-not-allowed whitespace-nowrap font-body inline-flex items-center gap-2"
            title={!entity.matchedTripId ? 'A trip must be matched before accepting' : 'Accept and create entity'}
          >
            {isAccepting && (
              <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Accept
          </button>
          <button
            type="button"
            onClick={() => onEdit(entity)}
            disabled={isBusy}
            className="px-4 py-2 border border-primary-500 dark:border-gold/50 text-primary-600 dark:text-gold hover:bg-primary-50 dark:hover:bg-navy-700 text-sm rounded-lg transition-colors whitespace-nowrap font-body disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Edit
          </button>
          <button
            type="button"
            onClick={() => onReject(entity.id)}
            disabled={isBusy}
            className="px-4 py-2 border border-red-500 dark:border-red-400 text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 text-sm rounded-lg transition-colors whitespace-nowrap font-body inline-flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isRejecting && (
              <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
            )}
            Reject
          </button>
        </div>
      </div>
    </div>
  );
}
