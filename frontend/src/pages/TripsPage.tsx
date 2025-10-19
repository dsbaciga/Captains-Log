import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import tripService from '../services/trip.service';
import type { Trip } from '../types/trip';
import { TripStatus } from '../types/trip';
import toast from 'react-hot-toast';
import { useAuthStore } from '../store/authStore';

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [coverPhotoUrls, setCoverPhotoUrls] = useState<{ [key: number]: string }>({});
  const navigate = useNavigate();
  const { logout } = useAuthStore();

  useEffect(() => {
    loadTrips();
  }, [statusFilter]);

  // Load cover photos with authentication for Immich photos
  useEffect(() => {
    const loadCoverPhotos = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const urls: { [key: number]: string } = {};

      for (const trip of trips) {
        if (!trip.coverPhoto) continue;

        const photo = trip.coverPhoto;

        // Local photo - use direct URL
        if (photo.source === 'local' && photo.thumbnailPath) {
          urls[trip.id] = `http://localhost:5000${photo.thumbnailPath}`;
        }
        // Immich photo - fetch with auth
        else if (photo.source === 'immich' && photo.thumbnailPath) {
          try {
            const response = await fetch(`http://localhost:5000${photo.thumbnailPath}`, {
              headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
              const blob = await response.blob();
              urls[trip.id] = URL.createObjectURL(blob);
            }
          } catch (error) {
            console.error(`Failed to load cover photo for trip ${trip.id}:`, error);
          }
        }
      }

      setCoverPhotoUrls(urls);
    };

    if (trips.length > 0) {
      loadCoverPhotos();
    }

    // Cleanup blob URLs
    return () => {
      Object.values(coverPhotoUrls).forEach(url => {
        if (url.startsWith('blob:')) {
          URL.revokeObjectURL(url);
        }
      });
    };
  }, [trips]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const params = statusFilter ? { status: statusFilter } : {};
      const response = await tripService.getTrips(params);
      setTrips(response.trips);
    } catch (error) {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this trip?')) return;

    try {
      await tripService.deleteTrip(id);
      toast.success('Trip deleted successfully');
      loadTrips();
    } catch (error) {
      toast.error('Failed to delete trip');
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case TripStatus.DREAM:
        return 'bg-purple-100 text-purple-800';
      case TripStatus.PLANNING:
        return 'bg-yellow-100 text-yellow-800';
      case TripStatus.PLANNED:
        return 'bg-blue-100 text-blue-800';
      case TripStatus.IN_PROGRESS:
        return 'bg-green-100 text-green-800';
      case TripStatus.COMPLETED:
        return 'bg-gray-100 text-gray-800';
      case TripStatus.CANCELLED:
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const formatDate = (date: string | null) => {
    if (!date) return 'Not set';
    // Parse date string directly to avoid timezone shifts
    // Date strings from backend are in YYYY-MM-DD format
    const dateStr = date.split('T')[0]; // Get just the date part
    const [year, month, day] = dateStr.split('-').map(Number);
    const dateObj = new Date(year, month - 1, day); // month is 0-indexed
    return dateObj.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-gray-900 dark:text-white">My Trips</h2>
          <Link to="/trips/new" className="btn btn-primary">
            + New Trip
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow mb-6">
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => setStatusFilter('')}
              className={`px-4 py-2 rounded-md ${
                statusFilter === ''
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
              }`}
            >
              All
            </button>
            {Object.values(TripStatus).map((status) => (
              <button
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-md ${
                  statusFilter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        {/* Trips Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
            <p className="mt-4 text-gray-600 dark:text-gray-400">Loading trips...</p>
          </div>
        ) : trips.length === 0 ? (
          <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
            <p className="text-gray-600 dark:text-gray-400 text-lg mb-4">No trips found</p>
            <Link to="/trips/new" className="btn btn-primary inline-block">
              Create your first trip
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {trips.map((trip) => {
              const coverPhotoUrl = coverPhotoUrls[trip.id];

              return (
                <div
                  key={trip.id}
                  className="rounded-lg shadow hover:shadow-lg transition-shadow overflow-hidden relative h-[400px]"
                >
                  {/* Background Image */}
                  {coverPhotoUrl ? (
                    <div
                      className="absolute inset-0 bg-cover bg-center"
                      style={{ backgroundImage: `url(${coverPhotoUrl})` }}
                    >
                      <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/50 to-black/80"></div>
                    </div>
                  ) : (
                    <div className="absolute inset-0 bg-white dark:bg-gray-800"></div>
                  )}

                  {/* Content Overlay */}
                  <div className="relative h-full flex flex-col p-6">
                    {/* Header with title and status */}
                    <div className="flex justify-between items-start mb-3">
                      <h3 className={`text-xl font-semibold flex-1 ${coverPhotoUrl ? 'text-white drop-shadow-lg' : 'text-gray-900 dark:text-white'}`}>
                        {trip.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(trip.status)}`}
                      >
                        {trip.status}
                      </span>
                    </div>

                    {/* Description */}
                    {trip.description && (
                      <p className={`mb-4 line-clamp-2 ${coverPhotoUrl ? 'text-white/90 drop-shadow-md' : 'text-gray-600 dark:text-gray-300'}`}>
                        {trip.description}
                      </p>
                    )}

                    {/* Spacer to push dates and buttons to bottom */}
                    <div className="flex-1"></div>

                    {/* Dates */}
                    <div className={`text-sm space-y-1 mb-4 ${coverPhotoUrl ? 'text-white/90' : 'text-gray-500 dark:text-gray-400'}`}>
                      <div>
                        <span className="font-medium">Start:</span>{' '}
                        {formatDate(trip.startDate)}
                      </div>
                      <div>
                        <span className="font-medium">End:</span>{' '}
                        {formatDate(trip.endDate)}
                      </div>
                    </div>

                    {/* Action Buttons */}
                    <div className="flex gap-2">
                      <Link
                        to={`/trips/${trip.id}`}
                        className="flex-1 btn btn-primary text-center"
                      >
                        View
                      </Link>
                      <Link
                        to={`/trips/${trip.id}/edit`}
                        className="flex-1 btn btn-secondary text-center"
                      >
                        Edit
                      </Link>
                      <button
                        onClick={() => handleDelete(trip.id)}
                        className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 font-medium transition-colors"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>
    </div>
  );
}
