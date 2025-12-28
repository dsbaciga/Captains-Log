/**
 * UpcomingTripsWidget - Shows next upcoming trips with quick stats
 */

import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import type { Trip } from '../../types/trip';
import tripService from '../../services/trip.service';

export default function UpcomingTripsWidget() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadUpcomingTrips();
  }, []);

  const loadUpcomingTrips = async () => {
    try {
      const response = await tripService.getTrips();
      const upcoming = response.trips
        .filter((trip) =>
          trip.status === 'Planned' ||
          trip.status === 'Planning' ||
          trip.status === 'In Progress'
        )
        .sort((a, b) => {
          const dateA = a.startDate ? new Date(a.startDate).getTime() : 0;
          const dateB = b.startDate ? new Date(b.startDate).getTime() : 0;
          return dateA - dateB;
        })
        .slice(0, 3);
      setTrips(upcoming);
    } catch (error) {
      console.error('Failed to load upcoming trips:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'In Progress':
        return 'bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 border-green-200 dark:border-green-800';
      case 'Planned':
        return 'bg-blue-100 dark:bg-blue-900/20 text-blue-700 dark:text-blue-400 border-blue-200 dark:border-blue-800';
      case 'Planning':
        return 'bg-purple-100 dark:bg-purple-900/20 text-purple-700 dark:text-purple-400 border-purple-200 dark:border-purple-800';
      default:
        return 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-200 dark:border-gray-600';
    }
  };

  const formatDateRange = (trip: Trip) => {
    if (!trip.startDate) return 'Dates TBD';
    const start = new Date(trip.startDate);
    const end = trip.endDate ? new Date(trip.endDate) : null;

    const formatDate = (date: Date) =>
      date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

    if (end) {
      return `${formatDate(start)} - ${formatDate(end)}`;
    }
    return formatDate(start);
  };

  if (isLoading) {
    return (
      <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 shadow-lg border-2 border-primary-100 dark:border-sky/10">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-10 h-10 bg-gray-200 dark:bg-gray-700 rounded-lg animate-pulse" />
          <div className="flex-1">
            <div className="h-6 bg-gray-200 dark:bg-gray-700 rounded w-32 animate-pulse" />
          </div>
        </div>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 bg-gray-100 dark:bg-gray-700 rounded-xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-navy-800 rounded-2xl p-6 shadow-lg border-2 border-primary-100 dark:border-sky/10 hover:shadow-xl transition-shadow duration-300">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center">
            <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <h3 className="text-xl font-display font-bold text-gray-900 dark:text-white">
            Upcoming Trips
          </h3>
        </div>
        <Link
          to="/trips"
          className="text-sm text-primary-600 dark:text-sky hover:text-primary-700 dark:hover:text-sky/80 font-medium transition-colors"
        >
          View All →
        </Link>
      </div>

      {/* Trips List */}
      {trips.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-16 h-16 mx-auto mb-3 text-gray-300 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-gray-500 dark:text-gray-400 font-medium mb-2">No upcoming trips</p>
          <Link
            to="/trips/new"
            className="inline-block text-sm text-primary-600 dark:text-sky hover:text-primary-700 dark:hover:text-sky/80 font-medium"
          >
            Plan your next adventure
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              to={`/trips/${trip.id}`}
              className="block group"
            >
              <div className="p-4 rounded-xl bg-gray-50 dark:bg-navy-900/50 hover:bg-primary-50 dark:hover:bg-primary-900/20 border-2 border-transparent hover:border-primary-200 dark:hover:border-sky/30 transition-all duration-200">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900 dark:text-white group-hover:text-primary-600 dark:group-hover:text-sky transition-colors truncate">
                        {trip.name}
                      </h4>
                      <span className={`px-2 py-0.5 text-xs font-medium rounded-full border ${getStatusColor(trip.status)}`}>
                        {trip.status}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-gray-600 dark:text-gray-400">
                      <span className="flex items-center gap-1">
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                        {formatDateRange(trip)}
                      </span>
                      {trip.destination && (
                        <span className="flex items-center gap-1 truncate">
                          <svg className="w-4 h-4 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                          </svg>
                          {trip.destination}
                        </span>
                      )}
                    </div>
                  </div>
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-primary-500 dark:group-hover:text-sky transform group-hover:translate-x-1 transition-all flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
