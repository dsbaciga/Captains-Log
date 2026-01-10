import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import tripService from '../services/trip.service';
import tagService from '../services/tag.service';
import type { Trip } from '../types/trip';
import type { TripTag } from '../types/tag';
import { TripStatus } from '../types/trip';
import toast from 'react-hot-toast';
import { getFullAssetUrl } from '../lib/config';
import { useConfirmDialog } from '../hooks/useConfirmDialog';

// Import shared utilities
import { formatDate } from '../utils/dateFormat';
import { getTripStatusColor } from '../utils/statusColors';

// Import reusable components
import EmptyState from '../components/EmptyState';
import { SkeletonGrid } from '../components/Skeleton';
import { SearchIcon, FilterIcon, CloseIcon } from '../components/icons';

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
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalTrips, setTotalTrips] = useState(0);
  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  // Use ref to track blob URLs for proper cleanup (avoids stale closure issues)
  const blobUrlsRef = useRef<string[]>([]);

  // Debounce search query to avoid API calls on every keystroke
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      loadTrips();
    }, searchQuery ? 300 : 0); // 300ms debounce for search, immediate for other changes

    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, currentPage, startDateFrom, startDateTo, selectedTags, sortOption, searchQuery]);

  // Load tags once on mount
  useEffect(() => {
    loadTags();
  }, []);

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
      const newBlobUrls: string[] = [];

      for (const trip of trips) {
        if (!trip.coverPhoto) continue;

        const photo = trip.coverPhoto;

        // Local photo - use direct URL
        if (photo.source === 'local' && photo.thumbnailPath) {
          urls[trip.id] = getFullAssetUrl(photo.thumbnailPath) || "";
        }
        // Immich photo - fetch with auth
        else if (photo.source === 'immich' && photo.thumbnailPath) {
          try {
            const fullUrl = getFullAssetUrl(photo.thumbnailPath);
            if (!fullUrl) continue;

            const response = await fetch(fullUrl, {
              headers: { 'Authorization': `Bearer ${token}` },
            });

            if (response.ok) {
              const blob = await response.blob();
              const blobUrl = URL.createObjectURL(blob);
              urls[trip.id] = blobUrl;
              newBlobUrls.push(blobUrl);
            }
          } catch (error) {
            console.error(`Failed to load cover photo for trip ${trip.id}:`, error);
          }
        }
      }

      // Store blob URLs in ref for cleanup
      blobUrlsRef.current = newBlobUrls;
      setCoverPhotoUrls(urls);
    };

    if (trips.length > 0) {
      loadCoverPhotos();
    }

    // Cleanup blob URLs using ref (avoids stale closure)
    return () => {
      blobUrlsRef.current.forEach(url => URL.revokeObjectURL(url));
      blobUrlsRef.current = [];
    };
  }, [trips]);

  const loadTrips = async () => {
    try {
      setLoading(true);
      const params: Record<string, string | number> = {
        page: currentPage,
        limit: 20,
      };

      // Add all filter parameters
      if (statusFilter) params.status = statusFilter;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      if (startDateFrom) params.startDateFrom = startDateFrom;
      if (startDateTo) params.startDateTo = startDateTo;
      if (selectedTags.length > 0) params.tags = selectedTags.join(',');
      if (sortOption) params.sort = sortOption;

      const response = await tripService.getTrips(params);
      setTrips(response.trips);
      setTotalPages(response.totalPages);
      setTotalTrips(response.total);
    } catch (error) {
      console.error('Error loading trips:', error);
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

  // All filtering and sorting is now handled by the backend
  // No client-side filtering needed - just use the trips directly
  const filteredTrips = trips;

  const toggleTagFilter = (tagId: number) => {
    setSelectedTags(prev =>
      prev.includes(tagId)
        ? prev.filter(id => id !== tagId)
        : [...prev, tagId]
    );
    setCurrentPage(1); // Reset to page 1 when tags change
  };

  const clearFilters = () => {
    setSearchQuery('');
    setStartDateFrom('');
    setStartDateTo('');
    setSelectedTags([]);
    setStatusFilter('');
    setSortOption('startDate-desc');
    setCurrentPage(1);
  };

  // Reset to page 1 when filters change
  const handleStatusFilterChange = (status: string) => {
    setStatusFilter(status);
    setCurrentPage(1);
  };

  // Helper to handle filter changes that should reset to page 1
  const handleSearchChange = (value: string) => {
    setSearchQuery(value);
    setCurrentPage(1);
  };

  const handleStartDateFromChange = (value: string) => {
    setStartDateFrom(value);
    setCurrentPage(1);
  };

  const handleStartDateToChange = (value: string) => {
    setStartDateTo(value);
    setCurrentPage(1);
  };

  const handleSortChange = (value: SortOption) => {
    setSortOption(value);
    setCurrentPage(1);
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
              <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate/50 dark:text-warm-gray/50" />
              <input
                type="text"
                placeholder="Search trips..."
                value={searchQuery}
                onChange={(e) => handleSearchChange(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-parchment dark:bg-navy-700 text-charcoal dark:text-warm-gray placeholder-slate/50 dark:placeholder-warm-gray/50 border-2 border-transparent focus:border-primary-500 dark:focus:border-sky focus:outline-none transition-colors"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortOption}
              onChange={(e) => handleSortChange(e.target.value as SortOption)}
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
              <FilterIcon className="w-5 h-5" />
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
              onClick={() => handleStatusFilterChange('')}
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
                onClick={() => handleStatusFilterChange(status)}
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
                    onChange={(e) => handleStartDateFromChange(e.target.value)}
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
                    onChange={(e) => handleStartDateToChange(e.target.value)}
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
                        className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all tag-colored ${
                          selectedTags.includes(tag.id)
                            ? 'ring-2 ring-offset-2 ring-primary-500 dark:ring-sky'
                            : 'opacity-70 hover:opacity-100'
                        }`}
                        // Dynamic tag colors require CSS variables - cannot be moved to static CSS
                        style={{
                          '--tag-bg-color': tag.color,
                          '--tag-text-color': tag.textColor,
                        } as React.CSSProperties & { '--tag-bg-color': string; '--tag-text-color': string }}
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
                  <CloseIcon className="w-4 h-4" />
                  Clear all filters
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        {!loading && (
          <div className="mb-4 text-sm text-slate dark:text-warm-gray/70">
            Showing {filteredTrips.length} of {totalTrips} trips
            {hasActiveFilters && ' (filtered)'}
            {totalPages > 1 && ` - Page ${currentPage} of ${totalPages}`}
          </div>
        )}

        {/* Trips Grid */}
        {loading ? (
          <SkeletonGrid count={6} columns={3} hasImage />
        ) : filteredTrips.length === 0 ? (
          <EmptyState
            icon="✈️"
            message={trips.length === 0 ? 'No trips found' : 'No trips match your filters'}
            subMessage={trips.length === 0 ? 'Start planning your next adventure' : 'Try adjusting your search or filters'}
            actionLabel={trips.length === 0 ? 'Create your first trip' : 'Clear all filters'}
            onAction={trips.length === 0 ? undefined : clearFilters}
            actionHref={trips.length === 0 ? '/trips/new' : undefined}
          />
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
                    // Dynamic background image requires CSS variable - cannot be moved to static CSS
                    <div
                      className="absolute inset-0 bg-cover bg-center cover-photo-bg"
                      style={{ '--cover-photo-url': `url(${coverPhotoUrl})` } as React.CSSProperties & { '--cover-photo-url': string }}
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
                        className={`px-2 py-1 text-xs font-medium rounded-lg ${getTripStatusColor(trip.status)}`}
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
                          // Dynamic tag colors require CSS variables - cannot be moved to static CSS
                          <span
                            key={tag.id}
                            className="px-2 py-1 rounded-full text-xs font-medium tag-colored"
                            style={{
                              '--tag-bg-color': tag.color,
                              '--tag-text-color': tag.textColor,
                            } as React.CSSProperties & { '--tag-bg-color': string; '--tag-text-color': string }}
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

        {/* Pagination Controls */}
        {!loading && totalPages > 1 && (
          <div className="mt-8 flex justify-center items-center gap-2">
            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-parchment dark:bg-navy-700 text-slate dark:text-warm-gray hover:bg-primary-50 dark:hover:bg-navy-600 disabled:hover:bg-parchment dark:disabled:hover:bg-navy-700"
            >
              Previous
            </button>

            <div className="flex gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => {
                // Show first page, last page, current page, and pages around current
                const showPage = page === 1 ||
                                page === totalPages ||
                                (page >= currentPage - 1 && page <= currentPage + 1);

                // Show ellipsis
                const showEllipsisBefore = page === currentPage - 2 && currentPage > 3;
                const showEllipsisAfter = page === currentPage + 2 && currentPage < totalPages - 2;

                if (!showPage && !showEllipsisBefore && !showEllipsisAfter) {
                  return null;
                }

                if (showEllipsisBefore || showEllipsisAfter) {
                  return (
                    <span key={`ellipsis-${page}`} className="px-2 py-2 text-slate dark:text-warm-gray">
                      ...
                    </span>
                  );
                }

                return (
                  <button
                    type="button"
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`px-4 py-2 rounded-lg font-medium transition-all ${
                      currentPage === page
                        ? 'bg-primary-600 dark:bg-sky text-white dark:text-navy-900'
                        : 'bg-parchment dark:bg-navy-700 text-slate dark:text-warm-gray hover:bg-primary-50 dark:hover:bg-navy-600'
                    }`}
                  >
                    {page}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className="px-4 py-2 rounded-lg font-medium transition-all disabled:opacity-50 disabled:cursor-not-allowed bg-parchment dark:bg-navy-700 text-slate dark:text-warm-gray hover:bg-primary-50 dark:hover:bg-navy-600 disabled:hover:bg-parchment dark:disabled:hover:bg-navy-700"
            >
              Next
            </button>
          </div>
        )}
      </main>
    </div>
  );
}
