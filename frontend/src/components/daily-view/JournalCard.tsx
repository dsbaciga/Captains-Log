import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import type { JournalEntry } from '../../types/journalEntry';
import type { Location } from '../../types/location';
import entityLinkService from '../../services/entityLink.service';
import locationService from '../../services/location.service';
import EmbeddedLocationCard from './EmbeddedLocationCard';
import { getTypeColors, getMoodEmoji } from './utils';

interface JournalCardProps {
  journal: JournalEntry;
  tripId: number;
  tripTimezone?: string;
}

export default function JournalCard({
  journal,
  tripId,
}: JournalCardProps) {
  const navigate = useNavigate();
  const colors = getTypeColors('journal');
  const [linkedLocations, setLinkedLocations] = useState<Location[]>([]);
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  // Load linked locations
  useEffect(() => {
    const loadLinkedLocations = async () => {
      setLoadingLinks(true);
      try {
        const links = await entityLinkService.getLinksFrom(
          tripId,
          'JOURNAL_ENTRY',
          journal.id,
          'LOCATION'
        );

        // Get location IDs from the links
        const locationIds = links
          .filter((link) => link.targetType === 'LOCATION')
          .map((link) => link.targetId);

        if (locationIds.length > 0) {
          // Fetch full location data for linked locations
          const allLocations = await locationService.getLocationsByTrip(tripId);
          const linkedLocs = allLocations.filter((loc) => locationIds.includes(loc.id));
          setLinkedLocations(linkedLocs);
        }
      } catch (error) {
        console.error('Error loading linked locations:', error);
      } finally {
        setLoadingLinks(false);
      }
    };

    loadLinkedLocations();
  }, [tripId, journal.id]);

  const handleEdit = () => {
    navigate(`/trips/${tripId}?tab=journal&edit=${journal.id}`);
  };

  // Format entry type display
  const entryTypeDisplay =
    journal.entryType.charAt(0).toUpperCase() +
    journal.entryType.slice(1).replace(/_/g, ' ');

  // Get mood emoji
  const moodEmoji = getMoodEmoji(journal.mood);

  // Check if content is long enough to need expand/collapse
  const isLongContent = journal.content && journal.content.length > 300;

  return (
    <div
      className={`bg-white dark:bg-gray-800 rounded-xl shadow-sm border ${colors.border} border-l-4 ${colors.accent} overflow-hidden hover:shadow-md transition-shadow`}
    >
      {/* Header */}
      <div className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3 flex-1 min-w-0">
            {/* Icon */}
            <div
              className={`w-12 h-12 rounded-xl ${colors.icon} flex items-center justify-center flex-shrink-0`}
            >
              <span className="text-2xl">📝</span>
            </div>

            {/* Main content */}
            <div className="flex-1 min-w-0">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {journal.title || 'Untitled Entry'}
              </h3>

              <div className="flex flex-wrap items-center gap-2 mt-1 text-sm text-gray-500 dark:text-gray-400">
                <span>{entryTypeDisplay}</span>

                {journal.mood && (
                  <>
                    <span className="text-gray-300 dark:text-gray-600">·</span>
                    <span className="inline-flex items-center gap-1">
                      {moodEmoji} {journal.mood}
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Actions */}
          <div className="flex flex-col items-end gap-2 flex-shrink-0">
            <button
              type="button"
              onClick={handleEdit}
              className="p-2 rounded-lg text-gray-400 hover:text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30 dark:hover:text-blue-400 transition-colors"
              title="Edit journal entry"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Weather notes */}
        {journal.weatherNotes && (
          <div className="mt-3 flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.001 4.001 0 003 15z"
              />
            </svg>
            <span>{journal.weatherNotes}</span>
          </div>
        )}

        {/* Content */}
        {journal.content && (
          <div className="mt-4">
            <div
              className={`prose prose-sm dark:prose-invert max-w-none text-gray-700 dark:text-gray-300 ${
                !isExpanded && isLongContent ? 'line-clamp-6' : ''
              }`}
              dangerouslySetInnerHTML={{
                __html: journal.content.replace(/\n/g, '<br />'),
              }}
            />

            {isLongContent && (
              <button
                type="button"
                onClick={() => setIsExpanded(!isExpanded)}
                className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
              >
                {isExpanded ? 'Show less' : 'Read more'}
              </button>
            )}
          </div>
        )}

        {/* Linked locations */}
        {loadingLinks ? (
          <div className="mt-3 text-sm text-gray-500 dark:text-gray-400">
            Loading linked locations...
          </div>
        ) : (
          linkedLocations.length > 0 && (
            <div className="mt-4">
              <div className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                Related Locations ({linkedLocations.length})
              </div>
              <div className="space-y-2">
                {linkedLocations.map((loc) => (
                  <EmbeddedLocationCard
                    key={loc.id}
                    location={loc}
                    tripId={tripId}
                  />
                ))}
              </div>
            </div>
          )
        )}
      </div>
    </div>
  );
}
