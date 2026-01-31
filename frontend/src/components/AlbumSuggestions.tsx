import { useState, useEffect, useCallback } from 'react';
import photoService, { type AlbumSuggestion } from '../services/photo.service';
import toast from 'react-hot-toast';

interface AlbumSuggestionsProps {
  tripId: number;
  onAlbumCreated: () => void;
}

// Generate a unique key for a suggestion (for dismissal tracking)
function getSuggestionKey(suggestion: AlbumSuggestion): string {
  return `${suggestion.type}-${suggestion.name}-${suggestion.photoIds.length}`;
}

// Get dismissed suggestions from localStorage for a trip
function getDismissedSuggestions(tripId: number): Set<string> {
  try {
    const key = `dismissed-album-suggestions-${tripId}`;
    const stored = localStorage.getItem(key);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// Save dismissed suggestion to localStorage
function saveDismissedSuggestion(tripId: number, suggestionKey: string): void {
  try {
    const key = `dismissed-album-suggestions-${tripId}`;
    const dismissed = getDismissedSuggestions(tripId);
    dismissed.add(suggestionKey);
    localStorage.setItem(key, JSON.stringify([...dismissed]));
  } catch (error) {
    console.error('Failed to save dismissed suggestion:', error);
  }
}

// Dismiss all suggestions for a trip
function dismissAllSuggestions(tripId: number, suggestions: AlbumSuggestion[]): void {
  try {
    const key = `dismissed-album-suggestions-${tripId}`;
    const dismissed = getDismissedSuggestions(tripId);
    suggestions.forEach(s => dismissed.add(getSuggestionKey(s)));
    localStorage.setItem(key, JSON.stringify([...dismissed]));
  } catch (error) {
    console.error('Failed to dismiss all suggestions:', error);
  }
}

export default function AlbumSuggestions({
  tripId,
  onAlbumCreated,
}: AlbumSuggestionsProps) {
  const [suggestions, setSuggestions] = useState<AlbumSuggestion[]>([]);
  const [loading, setLoading] = useState(true);
  const [accepting, setAccepting] = useState<string | null>(null);

  const loadSuggestions = useCallback(async () => {
    try {
      setLoading(true);
      const data = await photoService.getAlbumSuggestions(tripId);
      // Filter out previously dismissed suggestions
      const dismissed = getDismissedSuggestions(tripId);
      const filteredData = data.filter(s => !dismissed.has(getSuggestionKey(s)));
      setSuggestions(filteredData);
    } catch (error) {
      console.error('Failed to load album suggestions:', error);
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadSuggestions();
  }, [loadSuggestions]);

  const handleAccept = async (suggestion: AlbumSuggestion) => {
    const key = `${suggestion.type}-${suggestion.name}`;
    setAccepting(key);
    try {
      await photoService.acceptAlbumSuggestion(tripId, {
        name: suggestion.name,
        photoIds: suggestion.photoIds,
      });
      toast.success(`Album "${suggestion.name}" created!`);
      // Remove this suggestion from the list
      setSuggestions(prev => prev.filter(s =>
        !(s.type === suggestion.type && s.name === suggestion.name)
      ));
      onAlbumCreated();
    } catch (error) {
      toast.error('Failed to create album');
      console.error(error);
    } finally {
      setAccepting(null);
    }
  };

  const handleDismiss = (suggestion: AlbumSuggestion) => {
    // Persist dismissal to localStorage
    saveDismissedSuggestion(tripId, getSuggestionKey(suggestion));
    // Remove from local state
    setSuggestions(prev => prev.filter(s =>
      !(s.type === suggestion.type && s.name === suggestion.name)
    ));
  };

  const handleDismissAll = () => {
    // Persist all dismissals to localStorage
    dismissAllSuggestions(tripId, suggestions);
    // Clear local state
    setSuggestions([]);
  };

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
        <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        Analyzing photos for album suggestions...
      </div>
    );
  }

  if (suggestions.length === 0) {
    return null;
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <svg className="w-5 h-5 text-blue-600 dark:text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
          <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100">
            Smart Album Suggestions
          </h3>
        </div>
        <button
          type="button"
          onClick={handleDismissAll}
          className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300"
          title="Dismiss all suggestions"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="space-y-2">
        {suggestions.map((suggestion) => {
          const key = `${suggestion.type}-${suggestion.name}`;
          const isAccepting = accepting === key;

          return (
            <div
              key={key}
              className="flex items-center justify-between gap-3 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  {suggestion.type === 'date' ? (
                    <svg className="w-4 h-4 text-orange-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  ) : (
                    <svg className="w-4 h-4 text-green-500 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  )}
                  <span className="font-medium text-gray-900 dark:text-white truncate">
                    {suggestion.name}
                  </span>
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                  {suggestion.photoIds.length} photos
                  <span className="mx-1">·</span>
                  {Math.round(suggestion.confidence * 100)}% match
                </p>
              </div>

              <div className="flex items-center gap-2 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => handleDismiss(suggestion)}
                  disabled={isAccepting}
                  className="px-2 py-1 text-xs text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded"
                >
                  Dismiss
                </button>
                <button
                  type="button"
                  onClick={() => handleAccept(suggestion)}
                  disabled={isAccepting}
                  className="px-3 py-1 text-xs font-medium bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-1"
                >
                  {isAccepting ? (
                    <>
                      <div className="w-3 h-3 border-2 border-white border-t-transparent rounded-full animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Album'
                  )}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
