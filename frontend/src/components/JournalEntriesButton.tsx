import { useState } from 'react';
import { Link } from 'react-router-dom';

interface JournalEntryInfo {
  id: number;
  title: string | null;
  content: string;
  date: string | null;
  entryType: string;
}

interface JournalEntriesButtonProps {
  journalEntries?: { journal: JournalEntryInfo }[];
  tripId: number;
}

export default function JournalEntriesButton({
  journalEntries,
  tripId,
}: JournalEntriesButtonProps) {
  const [showModal, setShowModal] = useState(false);

  if (!journalEntries || journalEntries.length === 0) {
    return null;
  }

  const formatDate = (dateString: string | null) => {
    if (!dateString) return 'Trip Journal';
    return new Date(dateString).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  };

  return (
    <>
      {/* Journal Icon Button */}
      <button
        onClick={() => setShowModal(true)}
        className="relative p-2 text-gray-600 dark:text-gray-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors"
        title={`${journalEntries.length} journal ${journalEntries.length === 1 ? 'entry' : 'entries'}`}
      >
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
          />
        </svg>
        {journalEntries.length > 0 && (
          <span className="absolute -top-1 -right-1 bg-blue-600 text-white text-xs rounded-full w-4 h-4 flex items-center justify-center">
            {journalEntries.length}
          </span>
        )}
      </button>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[80vh] overflow-hidden flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                Associated Journal Entries ({journalEntries.length})
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
              >
                <svg
                  className="w-6 h-6"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M6 18L18 6M6 6l12 12"
                  />
                </svg>
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-3">
                {journalEntries.map(({ journal }) => (
                  <Link
                    key={journal.id}
                    to={`/trips/${tripId}/journal`}
                    onClick={() => setShowModal(false)}
                    className="block p-4 bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        {journal.title && (
                          <div className="font-medium text-gray-900 dark:text-white mb-1">
                            {journal.title}
                          </div>
                        )}
                        <div className="text-sm text-gray-600 dark:text-gray-400 line-clamp-3">
                          {journal.content}
                        </div>
                      </div>
                      <div className="flex flex-col items-end gap-1">
                        <div className="text-xs text-gray-500 dark:text-gray-400 whitespace-nowrap">
                          {formatDate(journal.date)}
                        </div>
                        <span className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded">
                          {journal.entryType}
                        </span>
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Footer */}
            <div className="p-4 border-t border-gray-200 dark:border-gray-700">
              <Link
                to={`/trips/${tripId}/journal`}
                onClick={() => setShowModal(false)}
                className="btn btn-primary w-full"
              >
                View All Journal Entries
              </Link>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
