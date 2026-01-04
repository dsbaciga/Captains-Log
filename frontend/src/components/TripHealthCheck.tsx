import { useState } from 'react';
import tripService from '../services/trip.service';
import type { ValidationResult, ValidationIssue } from '../types/trip';
import toast from 'react-hot-toast';

interface TripHealthCheckProps {
  tripId: number;
}

export default function TripHealthCheck({ tripId }: TripHealthCheckProps) {
  const [validation, setValidation] = useState<ValidationResult | null>(null);
  const [loading, setLoading] = useState(false);

  const runHealthCheck = async () => {
    setLoading(true);
    try {
      const result = await tripService.validateTrip(tripId);
      setValidation(result);
    } catch (error) {
      console.error('Health check failed:', error);
      toast.error('Failed to run health check');
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return 'text-green-600 dark:text-green-400';
    if (score >= 70) return 'text-yellow-600 dark:text-yellow-400';
    if (score >= 50) return 'text-orange-600 dark:text-orange-400';
    return 'text-red-600 dark:text-red-400';
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return 'Excellent';
    if (score >= 70) return 'Good';
    if (score >= 50) return 'Needs Attention';
    return 'Critical Issues';
  };

  const getSeverityColor = (severity: ValidationIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-100 dark:bg-red-900/30 border-red-300 dark:border-red-700 text-red-800 dark:text-red-200';
      case 'warning':
        return 'bg-yellow-100 dark:bg-yellow-900/30 border-yellow-300 dark:border-yellow-700 text-yellow-800 dark:text-yellow-200';
      case 'info':
        return 'bg-blue-100 dark:bg-blue-900/30 border-blue-300 dark:border-blue-700 text-blue-800 dark:text-blue-200';
    }
  };

  const getSeverityIcon = (severity: ValidationIssue['severity']) => {
    switch (severity) {
      case 'critical':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
          </svg>
        );
      case 'warning':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      case 'info':
        return (
          <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
          </svg>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Trip Health Check</h3>
        <button
          onClick={runHealthCheck}
          disabled={loading}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? 'Checking...' : 'Run Check'}
        </button>
      </div>

      {validation && (
        <div className="space-y-4">
          {/* Health Score */}
          <div className="text-center py-6 border-b border-gray-200 dark:border-gray-700">
            <div className={`text-5xl font-bold ${getScoreColor(validation.score)} mb-2`}>
              {validation.score}
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-400">
              {getScoreLabel(validation.score)}
            </div>
          </div>

          {/* Issues List */}
          {validation.issues.length > 0 ? (
            <div className="space-y-3">
              <h4 className="font-medium text-gray-900 dark:text-white">Issues Found ({validation.issues.length})</h4>
              {validation.issues.map((issue, index) => (
                <div
                  key={index}
                  className={`p-4 rounded-lg border ${getSeverityColor(issue.severity)}`}
                >
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0">
                      {getSeverityIcon(issue.severity)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs uppercase font-semibold">{issue.severity}</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">•</span>
                        <span className="text-xs text-gray-500 dark:text-gray-400">{issue.type.replace(/_/g, ' ')}</span>
                      </div>
                      <p className="font-medium mb-1">{issue.message}</p>
                      {issue.suggestion && (
                        <p className="text-sm opacity-80 mt-2">
                          💡 {issue.suggestion}
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-green-600 dark:text-green-400">
              <svg className="w-16 h-16 mx-auto mb-3" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <p className="font-medium">No issues found!</p>
              <p className="text-sm opacity-80 mt-1">Your trip is well-planned.</p>
            </div>
          )}
        </div>
      )}

      {!validation && !loading && (
        <div className="text-center py-8 text-gray-500 dark:text-gray-400">
          <svg className="w-16 h-16 mx-auto mb-3 opacity-50" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          <p className="text-sm">Click "Run Check" to validate your trip</p>
        </div>
      )}
    </div>
  );
}
