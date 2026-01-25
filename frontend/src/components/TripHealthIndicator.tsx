import { useState, useEffect } from 'react';
import tripService from '../services/trip.service';
import type { ValidationQuickStatus } from '../types/trip';

interface TripHealthIndicatorProps {
  tripId: number;
  onClick?: () => void;
  className?: string;
}

/**
 * A compact, passive health status indicator for trip headers/cards.
 * Shows a small badge indicating the trip's health status.
 * Clicking opens the full TripHealthCheck panel.
 */
export default function TripHealthIndicator({ tripId, onClick, className = '' }: TripHealthIndicatorProps) {
  const [status, setStatus] = useState<ValidationQuickStatus | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const fetchStatus = async () => {
      try {
        const result = await tripService.getValidationStatus(tripId);
        if (mounted) {
          setStatus(result);
        }
      } catch (error) {
        console.error('Failed to fetch validation status:', error);
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    fetchStatus();

    return () => {
      mounted = false;
    };
  }, [tripId]);

  if (loading) {
    return (
      <div className={`inline-flex items-center ${className}`}>
        <div className="animate-pulse w-16 h-5 bg-gray-200 dark:bg-navy-600 rounded-full" />
      </div>
    );
  }

  if (!status) {
    return null;
  }

  const isOkay = status.status === 'okay';

  const baseClasses = 'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium transition-all';
  const interactiveClasses = onClick ? 'cursor-pointer hover:ring-2 hover:ring-offset-1 dark:hover:ring-offset-navy-800' : '';

  if (isOkay) {
    return (
      <button
        onClick={onClick}
        disabled={!onClick}
        className={`${baseClasses} ${interactiveClasses} bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 hover:ring-green-300 dark:hover:ring-green-600 ${className}`}
        title="Trip health is okay"
      >
        <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>
        <span>Okay</span>
      </button>
    );
  }

  return (
    <button
      onClick={onClick}
      disabled={!onClick}
      className={`${baseClasses} ${interactiveClasses} bg-amber-100 dark:bg-amber-900/30 text-amber-700 dark:text-amber-400 hover:ring-amber-300 dark:hover:ring-amber-600 ${className}`}
      title={`${status.activeIssues} issue${status.activeIssues !== 1 ? 's' : ''} found`}
    >
      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
        <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
      </svg>
      <span>{status.activeIssues} Issue{status.activeIssues !== 1 ? 's' : ''}</span>
    </button>
  );
}
