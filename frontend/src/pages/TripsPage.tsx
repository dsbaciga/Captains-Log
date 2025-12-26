import { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import tripService from '../services/trip.service';
import tagService from '../services/tag.service';
import type { Trip } from '../types/trip';
import type { TripTag } from '../types/tag';
import { TripStatus } from '../types/trip';
import toast from 'react-hot-toast';
import { getAssetBaseUrl } from '../lib/config';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

type SortOption = 'startDate-desc' | 'startDate-asc' | 'title-asc' | 'title-desc' | 'status';

export default function TripsPage() {
  const [trips, setTrips] = useState<Trip[]>([]);
  const [allTags, setAllTags] = useState<TripTag[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDateFrom, setStartDateFrom] = useState('');
  const [startDateTo, setStartDateTo] = useState('');
  const [selectedTags, setSelectedTags] = useState<number[]>([]);
  const [sortOption, setSortOption] = useState<SortOption>('startDate-desc');
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [coverPhotoUrls, setCoverPhotoUrls] = useState<{ [key: number]: string }>({});
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  useEffect(() => {
    loadTrips();
    loadTags();
  }, [statusFilter]);

  const loadTags = async () => {
    try {
      const tags = await tagService.getAllTags();
      setAllTags(tags);
    } catch {
      console.error('Failed to load tags');
    }
  };

  // Load cover photos with authentication for Immich photos
  useEffect(() => {
    const loadCoverPhotos = async () => {
      const token = localStorage.getItem('accessToken');
      if (!token) return;

      const urls: { [key: number]: string } = {};

      const baseUrl = getAssetBaseUrl();

      for (const trip of trips) {
        if (!trip.coverPhoto) continue;

        const photo = trip.coverPhoto;

        // Local photo - use direct URL
        if (photo.source === 'local' && photo.thumbnailPath) {
          urls[trip.id] = `${baseUrl}${photo.thumbnailPath}`;
        }
        // Immich photo - fetch with auth
        else if (photo.source === 'immich' && photo.thumbnailPath) {
          try {
            const response = await fetch(`${baseUrl}${photo.thumbnailPath}`, {
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
    } catch {
      toast.error('Failed to load trips');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: 'Delete Trip',
      message: 'Are you sure you want to delete this trip? This will remove all associated locations, photos, transportation, lodging, activities, and journal entries.',
      confirmLabel: 'Delete Trip',
      variant: 'danger',
    });

    if (!confirmed) return;

    try {
      await tripService.deleteTrip(id);
      toast.success('Trip deleted successfully');
      loadTrips();
    } catch {
      toast.error('Failed to delete trip');
    }
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

  // Filter and sort trips
  const filteredTrips = useMemo(() => {
    let result = [...trips];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(trip =>
        trip.title.toLowerCase().includes(query) ||
        (trip.description && trip.description.toLowerCase().includes(query))
      );
    }

    // Date range filter
    if (startDateFrom) {
      result = result.filter(trip => {
        if (!trip.startDate) return false;
        const tripDate = trip.startDate.split('T')[0];
        return tripDate >= startDateFrom;
      });
    }
    if (startDateTo) {
      result = result.filter(trip => {
        if (!trip.startDate) return false;
        const tripDate = trip.startDate.split('T')[0];
        return tripDate <= startDateTo;
      });
    }

    // Tag filter
    if (selectedTags.length > 0) {
      result = result.filter(trip => {
        if (!trip.tagAssignments || trip.tagAssignments.length === 0) return false;
        const tripTagIds = trip.tagAssignments.map(ta => ta.tag.id);
        return selectedTags.some(tagId => tripTagIds.includes(tagId));
      });
    }

    // Sort
    result.sort((a, b) => {
      switch (sortOption) {
        case 'startDate-desc':
          if (!a.startDate && !b.startDate) return 0;
          if (!a.startDate) return 1;
          if (!b.startDate) return -1;
          return b.startDate.localeCompare(a.startDate);
        case 'startDate-asc':
          if (!a.startDate && !b.startDate) return 0;
          if (!a.startDate) return 1;
          if (!b.startDate) return -1;
          return a.startDate.localeCompare(b.startDate);
        case 'title-asc':
          return a.title.localeCompare(b.title);
        case 'title-desc':
          return b.title.localeCompare(a.title);
        case 'status':
          return a.status.localeCompare(b.status);
        default:
          return 0;
      }
    });

    return result;
  }, [trips, searchQuery, startDateFrom, startDateTo, selectedTags, sortOption]);

  const toggleTagFilter = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStartDateFrom('');
    setStartDateTo('');
    setSelectedTags([]);
    setStatusFilter('');
    setSortOption('startDate-desc');
  };

  const hasActiveFilters = searchQuery || startDateFrom || startDateTo || selectedTags.length > 0;

  return (
    <div className="bg-cream dark:bg-navy-900 min-h-screen">
      <ConfirmDialogComponent />
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-3xl font-bold text-charcoal dark:text-warm-gray font-display">My Trips</h2>
          <Link to="/trips/new" className="btn btn-primary">
            + New Trip
          </Link>
        </div>

        {/* Filter Bar */}
        <div className="bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm p-4 rounded-xl border-2 border-primary-500/10 dark:border-sky/10 mb-6 space-y-4">
          {/* Search and Sort Row */}
          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative flex-1">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate/50 dark:text-warm-gray/50"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="Search trips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-parchment dark:bg-navy-700 text-charcoal dark:text-warm-gray placeholder-slate/50 dark:placeholder-warm-gray/50 border-2 border-transparent focus:border-primary-500 dark:focus:border-sky focus:outline-none transition-colors"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              aria-label="Sort trips by"
              className="px-4 py-2.5 rounded-lg bg-parchment dark:bg-navy-700 text-charcoal dark:text-warm-gray border-2 border-transparent focus:border-primary-500 dark:focus:border-sky focus:outline-none transition-colors cursor-pointer"
            >
              <option value="startDate-desc">Newest First</option>
              <option value="startDate-asc">Oldest First</option>
              <option value="title-asc">Title A-Z</option>
              <option value="title-desc">Title Z-A</option>
              <option value="status">By Status</option>
            </select>

            {/* Advanced Filters Toggle */}
            <button
              type="button"
              onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
              className={`px-4 py-2.5 rounded-lg font-medium flex items-center gap-2 transition-all ${
                showAdvancedFilters || hasActiveFilters
                  ? 'bg-primary-600 dark:bg-sky text-white dark:text-navy-900'
                  : 'bg-parchment dark:bg-navy-700 text-slate dark:text-warm-gray hover:bg-primary-50 dark:hover:bg-navy-600'
              }`}
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
              Filters
              {hasActiveFilters && (
                <span className="w-2 h-2 rounded-full bg-accent-400 dark:bg-gold" />
              )}
            </button>
          </div>

          {/* Status Filter Pills */}
          <div className="flex gap-2 flex-wrap">
            <button
              type="button"
              onClick={() => setStatusFilter('')}
              className={`px-4 py-2 rounded-lg font-medium transition-all ${
                statusFilter === ''
                  ? 'bg-primary-600 dark:bg-sky text-white dark:text-navy-900'
                  : 'bg-parchment dark:bg-navy-700 text-slate dark:text-warm-gray hover:bg-primary-50 dark:hover:bg-navy-600'
              }`}
            >
              All
            </button>
            {Object.values(TripStatus).map((status) => (
              <button
                type="button"
                key={status}
                onClick={() => setStatusFilter(status)}
                className={`px-4 py-2 rounded-lg font-medium transition-all ${
                  statusFilter === status
                    ? 'bg-primary-600 dark:bg-sky text-white dark:text-navy-900'
                    : 'bg-parchment dark:bg-navy-700 text-slate dark:text-warm-gray hover:bg-primary-50 dark:hover:bg-navy-600'
                }`}
              >
                {status}
              </button>
            ))}
          </div>

          {/* Advanced Filters Panel */}
          {showAdvancedFilters && (
            <div className="pt-4 border-t-2 border-primary-500/10 dark:border-sky/10 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {/* Date Range */}
                <div>
                  <label htmlFor="startDateFrom" className="block text-sm font-medium text-slate dark:text-warm-gray mb-1.5">
                    Start Date From
                  </label>
                  <input
                    type="date"
                    id="startDateFrom"
                    value={startDateFrom}
                    onChange={(e) => setStartDateFrom(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-parchment dark:bg-navy-700 text-charcoal dark:text-warm-gray border-2 border-transparent focus:border-primary-500 dark:focus:border-sky focus:outline-none transition-colors"
                  />
                </div>
                <div>
                  <label htmlFor="startDateTo" className="block text-sm font-medium text-slate dark:text-warm-gray mb-1.5">
                    Start Date To
                  </label>
                  <input
                    type="date"
                    id="startDateTo"
                    value={startDateTo}
                    onChange={(e) => setStartDateTo(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-parchment dark:bg-navy-700 text-charcoal dark:text-warm-gray border-2 border-transparent focus:border-primary-500 dark:focus:border-sky focus:outline-none transition-colors"
                  />
                </div>
              </div>

              {/* Tag Filters */}
              {allTags.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-slate dark:text-warm-gray mb-2">
                    Filter by Tags
                  </label>
                  <div className="flex flex-wrap gap-2">
                    {allTags.map((tag) => (
                      <button
                        type="button"
                        key={tag.id}
                        onClick={() => toggleTagFilter(tag.id)}
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${
                          selectedTags.includes(tag.id)
                            ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-sky'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        style={{
                          backgroundColor: tag.color,
                          color: tag.textColor,
                        }}
                      >
                        {tag.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Clear Filters */}
              {hasActiveFilters && (
                <button
                  type="button"
                  onClick={clearFilters}
                  className="text-sm text-primary-600 dark:text-sky hover:text-primary-700 dark:hover:text-sky/80 font-medium flex items-center gap-1"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mb-4 text-sm text-slate dark:text-warm-gray/70">
            Showing {filteredTrips.length} of {trips.length} trips
            {hasActiveFilters && ' (filtered)'}
          </div>
        )}

        {/* Trips Grid */}
        {loading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-sky mx-auto"></div>
            <p className="mt-4 text-slate dark:text-warm-gray">Loading trips...</p>
          </div>
        ) : filteredTrips.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-2xl border-2 border-primary-500/10 dark:border-sky/10">
            <div className="text-6xl mb-4">✈️</div>
            <p className="text-charcoal dark:text-warm-gray text-lg font-medium mb-2">
              {trips.length === 0 ? 'No trips found' : 'No trips match your filters'}
            </p>
            <p className="text-slate dark:text-warm-gray/70 text-sm mb-4">
              {trips.length === 0 ? 'Start planning your next adventure' : 'Try adjusting your search or filters'}
            </p>
            {trips.length === 0 ? (
              <Link to="/trips/new" className="btn btn-primary inline-block">
                Create your first trip
              </Link>
            ) : (
              <button
                type="button"
                onClick={clearFilters}
                className="btn btn-secondary"
              >
                Clear all filters
              </button>
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredTrips.map((trip) => {
              const coverPhotoUrl = coverPhotoUrls[trip.id];

              return (
                <div
                  key={trip.id}
                  className="rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden relative h-[400px] border-2 border-primary-500/10 dark:border-sky/10"
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
                    <div className="absolute inset-0 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm"></div>
                  )}

                  {/* Content Overlay */}
                  <div className="relative h-full flex flex-col p-6">
                    {/* Header with title and status */}
                    <div className="flex justify-between items-start mb-3">
                      <h3 className={`text-xl font-semibold font-display flex-1 ${coverPhotoUrl ? 'text-white drop-shadow-lg' : 'text-charcoal dark:text-warm-gray'}`}>
                        {trip.title}
                      </h3>
                      <span
                        className={`px-2 py-1 text-xs font-medium rounded-lg ${getStatusColor(trip.status)}`}
                      >
                        {trip.status}
                      </span>
                    </div>

                    {/* Description */}
                    {trip.description && (
                      <p className={`mb-4 line-clamp-2 ${coverPhotoUrl ? 'text-white/90 drop-shadow-md' : 'text-slate dark:text-warm-gray/80'}`}>
                        {trip.description}
                      </p>
                    )}

                    {/* Tags */}
                    {trip.tagAssignments && trip.tagAssignments.length > 0 && (
                      <div className="flex flex-wrap gap-2 mb-4">
                        {trip.tagAssignments.map(({ tag }) => (
                          <span
                            key={tag.id}
                            className="px-2 py-1 rounded-full text-xs font-medium"
                            style={{
                              backgroundColor: tag.color,
                              color: tag.textColor,
                            }}
                          >
                            {tag.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Spacer to push dates and buttons to bottom */}
                    <div className="flex-1"></div>

                    {/* Dates */}
                    <div className={`text-sm space-y-1 mb-4 ${coverPhotoUrl ? 'text-white/90' : 'text-slate dark:text-warm-gray/70'}`}>
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
                        className="btn btn-danger px-4"
                        aria-label={`Delete ${trip.title}`}
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
