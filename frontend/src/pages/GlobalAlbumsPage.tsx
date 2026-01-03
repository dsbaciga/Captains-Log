import { useState, useEffect, useMemo, useId, useCallback } from "react";
import { Link, useNavigate } from "react-router-dom";
import photoService from "../services/photo.service";
import tripService from "../services/trip.service";
import type { AlbumWithTrip } from "../types/photo";
import type { Trip } from "../types/trip";
import toast from "react-hot-toast";
import { getAssetBaseUrl, getFullAssetUrl } from "../lib/config";
import { usePagination } from "../hooks/usePagination";
import tagService from "../services/tag.service";
import type { TripTag } from "../types/tag";

type SortOption =
  | "tripDate-desc"
  | "tripDate-asc"
  | "name-asc"
  | "name-desc"
  | "photos-desc"
  | "photos-asc";

// Cache cover URLs to avoid refetching across navigations
const coverUrlCache = new Map<number, string>();

export default function GlobalAlbumsPage() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [sortOption, setSortOption] = useState<SortOption>("tripDate-asc");
  const [totalPhotos, setTotalPhotos] = useState(0);
  const [tripCount, setTripCount] = useState(0);
  const [totalAlbums, setTotalAlbums] = useState(0);
  const [coverPhotoUrls, setCoverPhotoUrls] = useState<{
    [key: number]: string;
  }>({});
  const [collapsedTrips, setCollapsedTrips] = useState<Set<number>>(new Set());
  const [loadingCovers, setLoadingCovers] = useState(true);
  const tripSectionIdPrefix = useId();
  const [allTags, setAllTags] = useState<TripTag[]>([]);
  const [selectedTagIds, setSelectedTagIds] = useState<number[]>([]);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [albumName, setAlbumName] = useState("");
  const [albumDescription, setAlbumDescription] = useState("");
  const [selectedTripId, setSelectedTripId] = useState<number | null>(null);
  const [availableTrips, setAvailableTrips] = useState<Trip[]>([]);

  const loadAlbumsPage = useCallback(
    async (skip: number, take: number) => {
      const response = await photoService.getAllAlbums({
        skip,
        take,
        tagIds: selectedTagIds,
      });

      setTotalPhotos(response.totalPhotos);
      setTripCount(response.tripCount);
      setTotalAlbums(response.totalAlbums);

      return {
        items: response.albums,
        total: response.totalAlbums,
        hasMore: response.hasMore,
      };
    },
    [selectedTagIds]
  );

  const albumPagination = usePagination<AlbumWithTrip>(loadAlbumsPage, {
    pageSize: 30,
    enabled: true,
    onError: () => toast.error("Failed to load albums"),
  });

  const albums = albumPagination.items;

  // Load tags and trips for filters
  useEffect(() => {
    const loadTags = async () => {
      try {
        const tags = await tagService.getAllTags();
        setAllTags(tags);
      } catch (err) {
        console.error("Failed to load tags", err);
      }
    };
    const loadTrips = async () => {
      try {
        const response = await tripService.getTrips({ limit: 1000 });
        setAvailableTrips(response.trips);
      } catch (err) {
        console.error("Failed to load trips", err);
      }
    };
    loadTags();
    loadTrips();
  }, []);

  // Reload albums when tag filter changes
  useEffect(() => {
    albumPagination.clear();
    albumPagination.loadInitial();
    setCoverPhotoUrls({});
    setCollapsedTrips(new Set());
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTagIds]);

  // Load cover photos with authentication for Immich photos
  useEffect(() => {
    let cancelled = false;
    const loadCoverPhotos = async () => {
      const token = localStorage.getItem("accessToken");

      setLoadingCovers(true);
      const urls: { [key: number]: string } = {};
      const baseUrl = getAssetBaseUrl();

      await Promise.all(
        albums.map(async (album) => {
          if (!album.coverPhoto) return;

          // Use cached value if available
          if (coverUrlCache.has(album.id)) {
            urls[album.id] = coverUrlCache.get(album.id)!;
            return;
          }

          const photo = album.coverPhoto;

          // Local photo - use direct URL
          if (photo.source === "local" && photo.thumbnailPath) {
            const url = getFullAssetUrl(photo.thumbnailPath) || "";
            coverUrlCache.set(album.id, url);
            urls[album.id] = url;
          }
          // Immich photo - fetch with auth
          else if (photo.source === "immich" && photo.thumbnailPath) {
            if (!token) {
              return;
            }
            try {
              const fullUrl = getFullAssetUrl(photo.thumbnailPath);
              if (!fullUrl) return;

              const response = await fetch(fullUrl, {
                headers: { Authorization: `Bearer ${token}` },
              });

              if (response.ok) {
                const blob = await response.blob();
                const blobUrl = URL.createObjectURL(blob);
                coverUrlCache.set(album.id, blobUrl);
                urls[album.id] = blobUrl;
              }
            } catch (error) {
              console.error(
                `Failed to load cover photo for album ${album.id}:`,
                error
              );
            }
          }
        })
      );

      if (!cancelled) {
        setCoverPhotoUrls((prev) => ({ ...prev, ...urls }));
        setLoadingCovers(false);
      }
    };

    if (albums.length > 0) {
      loadCoverPhotos();
    } else {
      setLoadingCovers(false);
    }

    return () => {
      cancelled = true;
    };
  }, [albums]);

  const formatDate = (date: string | Date | null) => {
    if (!date) return "";
    const dateStr = typeof date === 'string' ? date.split("T")[0] : date.toISOString().split("T")[0];
    const [year, month, day] = dateStr.split("-").map(Number);
    const dateObj = new Date(year, month - 1, day);
    return dateObj.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const formatDateRange = (
    startDate: string | null,
    endDate: string | null
  ) => {
    if (!startDate && !endDate) return "No dates set";
    if (!startDate) return `Until ${formatDate(endDate)}`;
    if (!endDate) return `From ${formatDate(startDate)}`;
    return `${formatDate(startDate)} - ${formatDate(endDate)}`;
  };

  const toggleTag = (tagId: number) => {
    setSelectedTagIds((prev) =>
      prev.includes(tagId)
        ? prev.filter((id) => id !== tagId)
        : [...prev, tagId]
    );
  };

  const isInitialLoading = albumPagination.loading && albums.length === 0;

  // Filter and sort albums
  const filteredAlbums = useMemo(() => {
    let result = [...albums];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (album) =>
          album.name.toLowerCase().includes(query) ||
          (album.description &&
            album.description.toLowerCase().includes(query)) ||
          album.trip.title.toLowerCase().includes(query)
      );
    }

    // Tag filter (client-side safety, server already filters)
    if (selectedTagIds.length > 0) {
      result = result.filter((album) => {
        const tags = album.trip.tagAssignments?.map((t) => t.tag.id) || [];
        return selectedTagIds.every((id) => tags.includes(id));
      });
    }

    // Sort
    result.sort((a, b) => {
      try {
        switch (sortOption) {
          case "tripDate-desc":
            if (!a.trip.startDate && !b.trip.startDate) return 0;
            if (!a.trip.startDate) return 1;
            if (!b.trip.startDate) return -1;
            return String(b.trip.startDate).localeCompare(String(a.trip.startDate));
          case "tripDate-asc":
            if (!a.trip.startDate && !b.trip.startDate) return 0;
            if (!a.trip.startDate) return 1;
            if (!b.trip.startDate) return -1;
            return String(a.trip.startDate).localeCompare(String(b.trip.startDate));
          case "name-asc":
            return (a.name || '').localeCompare(b.name || '');
          case "name-desc":
            return (b.name || '').localeCompare(a.name || '');
          case "photos-desc":
            return (
              (b._count?.photoAssignments || 0) -
              (a._count?.photoAssignments || 0)
            );
          case "photos-asc":
            return (
              (a._count?.photoAssignments || 0) -
              (b._count?.photoAssignments || 0)
            );
          default:
            return 0;
        }
      } catch (error) {
        console.error('Error sorting albums:', error);
        return 0;
      }
    });

    return result;
  }, [albums, searchQuery, sortOption, selectedTagIds]);

  // Group albums by trip
  const albumsByTrip = useMemo(() => {
    const groups: Map<
      number,
      { trip: AlbumWithTrip["trip"]; albums: AlbumWithTrip[] }
    > = new Map();

    for (const album of filteredAlbums) {
      const tripId = album.trip.id;
      if (!groups.has(tripId)) {
        groups.set(tripId, { trip: album.trip, albums: [] });
      }
      groups.get(tripId)!.albums.push(album);
    }

    // Convert to array and sort trip groups
    // For name/photo sorts, still group by trip but sort trips by date
    // For date sorts, respect the asc/desc direction
    return Array.from(groups.values()).sort((a, b) => {
      try {
        if (!a.trip.startDate && !b.trip.startDate) return 0;
        if (!a.trip.startDate) return 1;
        if (!b.trip.startDate) return -1;

        // Only reverse for explicit date ascending sort
        const isDateAscending = sortOption === "tripDate-asc";
        return isDateAscending
          ? String(a.trip.startDate).localeCompare(String(b.trip.startDate))
          : String(b.trip.startDate).localeCompare(String(a.trip.startDate));
      } catch (error) {
        console.error('Error sorting trip groups:', error);
        return 0;
      }
    });
  }, [filteredAlbums, sortOption]);

  const toggleTripCollapse = (tripId: number) => {
    setCollapsedTrips((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(tripId)) {
        newSet.delete(tripId);
      } else {
        newSet.add(tripId);
      }
      return newSet;
    });
  };

  const handleAlbumClick = (album: AlbumWithTrip) => {
    navigate(`/trips/${album.trip.id}/albums/${album.id}`);
  };

  const handleCreateAlbum = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTripId || !albumName.trim()) {
      toast.error("Please select a trip and enter an album name");
      return;
    }

    try {
      const newAlbum = await photoService.createAlbum({
        tripId: selectedTripId,
        name: albumName,
        description: albumDescription || undefined,
      });

      toast.success("Album created successfully!");
      setAlbumName("");
      setAlbumDescription("");
      setSelectedTripId(null);
      setShowCreateForm(false);

      // Refresh albums list
      albumPagination.clear();
      albumPagination.loadInitial();

      // Navigate to the new album
      navigate(`/trips/${selectedTripId}/albums/${newAlbum.id}`);
    } catch (err) {
      console.error("Failed to create album:", err);
      toast.error("Failed to create album");
    }
  };

  return (
    <div className="bg-cream dark:bg-navy-900 min-h-screen">
      <main className="max-w-7xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between gap-3 mb-2">
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-primary-500 to-primary-600 dark:from-sky dark:to-primary-500 flex items-center justify-center shadow-lg">
                <svg
                  className="w-6 h-6 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold text-charcoal dark:text-warm-gray font-display">
                  Photo Albums
                </h1>
                {!isInitialLoading && (
                  <p className="text-slate dark:text-warm-gray/70">
                    {totalAlbums} album{totalAlbums !== 1 ? "s" : ""} •{" "}
                    {totalPhotos.toLocaleString()} photo
                    {totalPhotos !== 1 ? "s" : ""} • {tripCount} trip
                    {tripCount !== 1 ? "s" : ""}
                  </p>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="btn btn-primary whitespace-nowrap"
            >
              {showCreateForm ? "Cancel" : "+ Create Album"}
            </button>
          </div>
        </div>

        {/* Create Album Form */}
        {showCreateForm && (
          <div className="bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-xl border-2 border-primary-500/10 dark:border-sky/10 p-6 mb-6">
            <h2 className="text-xl font-semibold text-charcoal dark:text-warm-gray mb-4">
              Create New Album
            </h2>
            <form onSubmit={handleCreateAlbum} className="space-y-4">
              <div>
                <label
                  htmlFor="trip-select"
                  className="block text-sm font-medium text-charcoal dark:text-warm-gray mb-1"
                >
                  Select Trip *
                </label>
                <select
                  id="trip-select"
                  value={selectedTripId || ""}
                  onChange={(e) =>
                    setSelectedTripId(
                      e.target.value ? parseInt(e.target.value) : null
                    )
                  }
                  className="w-full px-4 py-2.5 rounded-lg bg-parchment dark:bg-navy-700 text-charcoal dark:text-warm-gray border-2 border-transparent focus:border-primary-500 dark:focus:border-sky focus:outline-none transition-colors"
                  required
                >
                  <option value="">Choose a trip...</option>
                  {availableTrips.map((trip) => (
                    <option key={trip.id} value={trip.id}>
                      {trip.title}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-warm-gray mb-1">
                  Album Name *
                </label>
                <input
                  type="text"
                  value={albumName}
                  onChange={(e) => setAlbumName(e.target.value)}
                  className="w-full px-4 py-2.5 rounded-lg bg-parchment dark:bg-navy-700 text-charcoal dark:text-warm-gray placeholder-slate/50 dark:placeholder-warm-gray/50 border-2 border-transparent focus:border-primary-500 dark:focus:border-sky focus:outline-none transition-colors"
                  placeholder="Summer Adventures"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-charcoal dark:text-warm-gray mb-1">
                  Description
                </label>
                <textarea
                  value={albumDescription}
                  onChange={(e) => setAlbumDescription(e.target.value)}
                  rows={3}
                  className="w-full px-4 py-2.5 rounded-lg bg-parchment dark:bg-navy-700 text-charcoal dark:text-warm-gray placeholder-slate/50 dark:placeholder-warm-gray/50 border-2 border-transparent focus:border-primary-500 dark:focus:border-sky focus:outline-none transition-colors resize-none"
                  placeholder="A collection of our best summer moments..."
                />
              </div>

              <div className="flex gap-3">
                <button type="submit" className="btn btn-primary">
                  Create Album
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowCreateForm(false);
                    setAlbumName("");
                    setAlbumDescription("");
                    setSelectedTripId(null);
                  }}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Search and Sort Bar */}
        <div className="bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm p-4 rounded-xl border-2 border-primary-500/10 dark:border-sky/10 mb-6">
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
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                />
              </svg>
              <input
                type="text"
                placeholder="Search albums or trips..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 rounded-lg bg-parchment dark:bg-navy-700 text-charcoal dark:text-warm-gray placeholder-slate/50 dark:placeholder-warm-gray/50 border-2 border-transparent focus:border-primary-500 dark:focus:border-sky focus:outline-none transition-colors"
              />
            </div>

            {/* Sort Dropdown */}
            <select
              value={sortOption}
              onChange={(e) => setSortOption(e.target.value as SortOption)}
              aria-label="Sort albums by"
              className="px-4 py-2.5 rounded-lg bg-parchment dark:bg-navy-700 text-charcoal dark:text-warm-gray border-2 border-transparent focus:border-primary-500 dark:focus:border-sky focus:outline-none transition-colors cursor-pointer"
            >
              <option value="tripDate-desc">Newest Trips First</option>
              <option value="tripDate-asc">Oldest Trips First</option>
              <option value="name-asc">Album Name A-Z</option>
              <option value="name-desc">Album Name Z-A</option>
              <option value="photos-desc">Most Photos</option>
              <option value="photos-asc">Fewest Photos</option>
            </select>
          </div>

          {/* Tag Filter */}
          {allTags.length > 0 && (
            <div className="mt-2 flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag.id}
                  type="button"
                  onClick={() => toggleTag(tag.id)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all border ${
                    selectedTagIds.includes(tag.id)
                      ? "ring-2 ring-offset-2 ring-primary-500 dark:ring-sky border-transparent"
                      : "border-transparent opacity-80 hover:opacity-100"
                  }`}
                  style={{
                    backgroundColor: tag.color,
                    color: tag.textColor,
                  }}
                >
                  {tag.name}
                </button>
              ))}
              {selectedTagIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTagIds([])}
                  className="px-3 py-1.5 rounded-full text-sm font-medium bg-parchment dark:bg-navy-700 text-slate dark:text-warm-gray hover:bg-primary-50 dark:hover:bg-navy-600 transition-colors border border-primary-500/20 dark:border-sky/20"
                >
                  Clear tags
                </button>
              )}
            </div>
          )}
        </div>

        {/* Results Count */}
        {!isInitialLoading && searchQuery && (
          <div className="mb-4 text-sm text-slate dark:text-warm-gray/70">
            Found {filteredAlbums.length} album
            {filteredAlbums.length !== 1 ? "s" : ""} matching "{searchQuery}"
          </div>
        )}

        {/* Content */}
        {isInitialLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600 dark:border-sky mx-auto"></div>
            <p className="mt-4 text-slate dark:text-warm-gray">
              Loading albums...
            </p>
          </div>
        ) : totalAlbums === 0 ? (
          <div className="text-center py-16 px-6 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-2xl border-2 border-primary-500/10 dark:border-sky/10">
            <div className="text-6xl mb-4">📷</div>
            <h3 className="text-xl font-semibold text-charcoal dark:text-warm-gray mb-2">
              No albums yet
            </h3>
            <p className="text-slate dark:text-warm-gray/70 mb-6 max-w-md mx-auto">
              Create albums within your trips to organize your photos. Albums
              help you group photos by location, activity, or theme.
            </p>
            <div className="flex gap-3 justify-center flex-wrap">
              <Link to="/trips" className="btn btn-primary">
                Go to Trips
              </Link>
              <Link to="/trips/new" className="btn btn-secondary">
                Create Trip
              </Link>
            </div>
          </div>
        ) : filteredAlbums.length === 0 ? (
          <div className="text-center py-12 px-6 bg-white/80 dark:bg-navy-800/80 backdrop-blur-sm rounded-2xl border-2 border-primary-500/10 dark:border-sky/10">
            <div className="text-5xl mb-4">🔍</div>
            <p className="text-charcoal dark:text-warm-gray text-lg font-medium mb-2">
              No albums match your search
            </p>
            <p className="text-slate dark:text-warm-gray/70 text-sm mb-4">
              Try a different search term
            </p>
            <div className="flex gap-2 justify-center flex-wrap">
              <button
                type="button"
                onClick={() => setSearchQuery("")}
                className="btn btn-secondary"
              >
                Clear search
              </button>
              {selectedTagIds.length > 0 && (
                <button
                  type="button"
                  onClick={() => setSelectedTagIds([])}
                  className="btn btn-secondary"
                >
                  Clear tags
                </button>
              )}
              <Link to="/trips" className="btn btn-primary">
                Go to Trips
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-8">
            {albumsByTrip.map(({ trip, albums: tripAlbums }) => {
              const isCollapsed = collapsedTrips.has(trip.id);
              const tripPhotoCount = tripAlbums.reduce(
                (sum, a) => sum + (a._count?.photoAssignments || 0),
                0
              );

              return (
                <div
                  key={trip.id}
                  className="bg-white/60 dark:bg-navy-800/60 backdrop-blur-sm rounded-2xl border-2 border-primary-500/10 dark:border-sky/10 overflow-hidden"
                >
                  {/* Trip Header */}
                  <button
                    type="button"
                    onClick={() => toggleTripCollapse(trip.id)}
                    {...{ "aria-expanded": !isCollapsed }}
                    aria-controls={`${tripSectionIdPrefix}-${trip.id}`}
                    className="w-full px-6 py-4 flex items-center justify-between hover:bg-primary-50/50 dark:hover:bg-navy-700/50 transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-primary-500 dark:focus-visible:ring-sky focus-visible:ring-inset"
                  >
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-primary-400 to-primary-600 dark:from-sky/80 dark:to-primary-500 flex items-center justify-center shadow-md">
                        <span className="text-white text-lg">✈️</span>
                      </div>
                      <div className="text-left">
                        <h2 className="text-xl font-semibold text-charcoal dark:text-warm-gray font-display">
                          {trip.title}
                        </h2>
                        <p className="text-sm text-slate dark:text-warm-gray/70">
                          {formatDateRange(trip.startDate, trip.endDate)} •{" "}
                          {tripAlbums.length} album
                          {tripAlbums.length !== 1 ? "s" : ""} •{" "}
                          {tripPhotoCount} photo
                          {tripPhotoCount !== 1 ? "s" : ""}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Link
                        to={`/trips/${trip.id}`}
                        onClick={(e) => e.stopPropagation()}
                        className="text-sm text-primary-600 dark:text-sky hover:text-primary-700 dark:hover:text-sky/80 font-medium"
                      >
                        View Trip
                      </Link>
                      <svg
                        className={`w-5 h-5 text-slate dark:text-warm-gray/70 transition-transform duration-200 ${
                          isCollapsed ? "" : "rotate-180"
                        }`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 9l-7 7-7-7"
                        />
                      </svg>
                    </div>
                  </button>

                  {/* Albums Grid */}
                  {!isCollapsed && (
                    <div
                      id={`${tripSectionIdPrefix}-${trip.id}`}
                      className="px-6 pb-6"
                    >
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                        {tripAlbums.map((album) => {
                          const coverUrl = coverPhotoUrls[album.id];
                          const photoCount =
                            album._count?.photoAssignments || 0;

                          return (
                            <button
                              key={album.id}
                              type="button"
                              onClick={() => handleAlbumClick(album)}
                              className="group text-left focus:outline-none"
                            >
                              {/* Album Cover */}
                              <div className="aspect-square rounded-xl overflow-hidden bg-parchment dark:bg-navy-700 shadow-md group-hover:shadow-xl group-focus-visible:shadow-xl group-focus-visible:ring-2 group-focus-visible:ring-primary-500 dark:group-focus-visible:ring-sky transition-all duration-300 group-hover:scale-[1.02] group-focus-visible:scale-[1.02] relative">
                                {coverUrl ? (
                                  <img
                                    src={coverUrl}
                                    alt={album.name}
                                    className="w-full h-full object-cover"
                                  />
                                ) : loadingCovers && album.coverPhoto ? (
                                  <div className="w-full h-full flex items-center justify-center bg-parchment dark:bg-navy-700">
                                    <div className="w-8 h-8 border-2 border-primary-200 dark:border-sky/30 border-t-primary-500 dark:border-t-sky rounded-full animate-spin" />
                                  </div>
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center text-slate/30 dark:text-warm-gray/30">
                                    <svg
                                      className="w-12 h-12"
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                      aria-hidden="true"
                                    >
                                      <path
                                        strokeLinecap="round"
                                        strokeLinejoin="round"
                                        strokeWidth={1.5}
                                        d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"
                                      />
                                    </svg>
                                  </div>
                                )}

                                {/* Hover Overlay */}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

                                {/* Photo Count Badge */}
                                <div className="absolute bottom-2 right-2 px-2 py-1 bg-black/60 backdrop-blur-sm rounded-md text-white text-xs font-medium">
                                  {photoCount} photo
                                  {photoCount !== 1 ? "s" : ""}
                                </div>
                              </div>

                              {/* Album Info */}
                              <div className="mt-2 px-1 h-12">
                                <h3 className="font-medium text-charcoal dark:text-warm-gray truncate group-hover:text-primary-600 dark:group-hover:text-sky group-focus-visible:text-primary-600 dark:group-focus-visible:text-sky transition-colors">
                                  {album.name}
                                </h3>
                                <p className="text-sm text-slate dark:text-warm-gray/70 line-clamp-1 h-5">
                                  {album.description || "\u00A0"}
                                </p>
                              </div>
                              <span className="sr-only">
                                {album.name}, {photoCount} photo
                                {photoCount !== 1 ? "s" : ""}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}

            {albumPagination.hasMore && (
              <div className="text-center mt-6">
                <button
                  type="button"
                  onClick={albumPagination.loadMore}
                  disabled={albumPagination.loadingMore}
                  className="px-6 py-3 bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
                >
                  {albumPagination.loadingMore
                    ? "Loading..."
                    : "Load More Albums"}
                </button>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
