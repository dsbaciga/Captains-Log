import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import tripService from '../services/trip.service';
import locationService from '../services/location.service';
import photoService from '../services/photo.service';
import activityService from '../services/activity.service';
import transportationService from '../services/transportation.service';
import lodgingService from '../services/lodging.service';
import journalService from '../services/journalEntry.service';
import tagService from '../services/tag.service';
import companionService from '../services/companion.service';
import userService from '../services/user.service';
import type { Trip } from '../types/trip';
import type { Location } from '../types/location';
import type { Photo } from '../types/photo';
import type { TripTag } from '../types/tag';
import { TripStatus } from '../types/trip';
import toast from 'react-hot-toast';
import PhotoGallery from '../components/PhotoGallery';
import PhotoUpload from '../components/PhotoUpload';
import Timeline from '../components/Timeline';
import ActivityManager from '../components/ActivityManager';
import UnscheduledActivities from '../components/UnscheduledActivities';
import TransportationManager from '../components/TransportationManager';
import LodgingManager from '../components/LodgingManager';
import JournalManager from '../components/JournalManager';
import TagManager from '../components/TagManager';
import CompanionManager from '../components/CompanionManager';
import LocationSearchMap from '../components/LocationSearchMap';
import TripLocationsMap from '../components/TripLocationsMap';
import { getAssetBaseUrl } from '../lib/config';
import TagsModal from '../components/TagsModal';
import AlbumsSidebar from '../components/AlbumsSidebar';
import AlbumModal from '../components/AlbumModal';
import AssociatedAlbums from '../components/AssociatedAlbums';
import JournalEntriesButton from '../components/JournalEntriesButton';
import type { PhotoAlbum } from '../types/photo';
import { usePagination } from '../hooks/usePagination';

export default function TripDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [trip, setTrip] = useState<Trip | null>(null);
  const [locations, setLocations] = useState<Location[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [lodgings, setLodgings] = useState<any[]>([]);
  const [userTimezone, setUserTimezone] = useState<string>('');
  const [activitiesCount, setActivitiesCount] = useState(0);
  const [unscheduledCount, setUnscheduledCount] = useState(0);
  const [transportationCount, setTransportationCount] = useState(0);
  const [lodgingCount, setLodgingCount] = useState(0);
  const [journalCount, setJournalCount] = useState(0);
  const [tags, setTags] = useState<TripTag[]>([]);
  const [tagsCount, setTagsCount] = useState(0);
  const [companionsCount, setCompanionsCount] = useState(0);
  const [loading, setLoading] = useState(true);
  // Album management state
  const [albums, setAlbums] = useState<PhotoAlbum[]>([]);
  const [selectedAlbumId, setSelectedAlbumId] = useState<number | null>(null);
  const [showAlbumModal, setShowAlbumModal] = useState(false);
  const [editingAlbum, setEditingAlbum] = useState<PhotoAlbum | null>(null);
  const [filteredPhotos, setFilteredPhotos] = useState<Photo[]>([]);
  const [unsortedPhotosCount, setUnsortedPhotosCount] = useState(0);
  const [showLocationForm, setShowLocationForm] = useState(false);
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [locationName, setLocationName] = useState('');
  const [locationAddress, setLocationAddress] = useState('');
  const [locationNotes, setLocationNotes] = useState('');
  const [locationLatitude, setLocationLatitude] = useState<number | undefined>();
  const [locationLongitude, setLocationLongitude] = useState<number | undefined>();
  const [activeTab, setActiveTab] = useState<'timeline' | 'locations' | 'photos' | 'activities' | 'unscheduled' | 'transportation' | 'lodging' | 'journal' | 'companions'>('timeline');
  const [coverPhotoUrl, setCoverPhotoUrl] = useState<string | null>(null);
  const [showTagsModal, setShowTagsModal] = useState(false);

  // Pagination hooks
  const photosPagination = usePagination<Photo>(
    async (skip, take) => {
      if (!trip) return { items: [], total: 0, hasMore: false };
      const result = await photoService.getPhotosByTrip(trip.id, { skip, take });
      return {
        items: result.photos,
        total: result.total || 0,
        hasMore: result.hasMore,
      };
    },
    { pageSize: 40, enabled: false }
  );

  const unsortedPagination = usePagination<Photo>(
    async (skip, take) => {
      if (!trip) return { items: [], total: 0, hasMore: false };
      const result = await photoService.getUnsortedPhotosByTrip(trip.id, { skip, take });
      return {
        items: result.photos,
        total: result.total || 0,
        hasMore: result.hasMore,
      };
    },
    { pageSize: 40, enabled: false }
  );

  const albumPhotosPagination = usePagination<Photo>(
    async (skip, take) => {
      if (!selectedAlbumId || selectedAlbumId <= 0) return { items: [], total: 0, hasMore: false };
      const result = await photoService.getAlbumById(selectedAlbumId, { skip, take });
      const albumPhotos = result.photos.map(p => p.photo);
      return {
        items: albumPhotos,
        total: result.total || 0,
        hasMore: result.hasMore || false,
      };
    },
    { pageSize: 40, enabled: false }
  );

  useEffect(() => {
    if (id) {
      loadTripData(parseInt(id));
    }
    loadUserTimezone();
  }, [id]);

  // Load photos when trip is set
  useEffect(() => {
    if (trip) {
      photosPagination.loadInitial();
    }
  }, [trip?.id]);

  // Update filtered photos based on selected album
  useEffect(() => {
    if (selectedAlbumId === null) {
      setFilteredPhotos(photosPagination.items);
    } else if (selectedAlbumId === -1) {
      setFilteredPhotos(unsortedPagination.items);
    } else {
      setFilteredPhotos(albumPhotosPagination.items);
    }
  }, [
    selectedAlbumId,
    photosPagination.items,
    unsortedPagination.items,
    albumPhotosPagination.items
  ]);

  // Load cover photo with authentication if needed
  useEffect(() => {
    const loadCoverPhoto = async () => {
      if (!trip?.coverPhoto) {
        setCoverPhotoUrl(null);
        return;
      }

      const photo = trip.coverPhoto;
      const baseUrl = getAssetBaseUrl();

      // If it's a local photo, use direct URL
      if (photo.source === 'local' && photo.localPath) {
        setCoverPhotoUrl(`${baseUrl}${photo.localPath}`);
        return;
      }

      // If it's an Immich photo, fetch with authentication
      if (photo.source === 'immich' && photo.thumbnailPath) {
        try {
          const token = localStorage.getItem('accessToken');
          if (!token) return;

          const response = await fetch(`${baseUrl}${photo.thumbnailPath}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            console.error('Failed to fetch cover photo:', response.status);
            return;
          }

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);
          setCoverPhotoUrl(blobUrl);
        } catch (error) {
          console.error('Error loading cover photo:', error);
        }
      }
    };

    loadCoverPhoto();

    // Cleanup blob URL when component unmounts or trip changes
    return () => {
      if (coverPhotoUrl && coverPhotoUrl.startsWith('blob:')) {
        URL.revokeObjectURL(coverPhotoUrl);
      }
    };
  }, [trip?.coverPhoto]);

  const loadUserTimezone = async () => {
    try {
      const user = await userService.getMe();
      setUserTimezone(user.timezone || '');
    } catch (error) {
      console.error('Failed to load user timezone');
    }
  };

  const loadTripData = async (tripId: number) => {
    try {
      setLoading(true);
      const [
        tripData,
        locationsData,
        activitiesData,
        transportationData,
        lodgingData,
        journalData,
        tagsData,
        companionsData,
        albumsData
      ] = await Promise.all([
        tripService.getTripById(tripId),
        locationService.getLocationsByTrip(tripId),
        activityService.getActivitiesByTrip(tripId),
        transportationService.getTransportationByTrip(tripId),
        lodgingService.getLodgingByTrip(tripId),
        journalService.getJournalEntriesByTrip(tripId),
        tagService.getTagsByTrip(tripId),
        companionService.getCompanionsByTrip(tripId),
        photoService.getAlbumsByTrip(tripId),
      ]);
      console.log('Trip data loaded:', tripData);
      console.log('Cover photo:', tripData.coverPhoto);
      setTrip(tripData);
      setLocations(locationsData);

      // Store activities and lodgings for album modal
      setActivities(activitiesData);
      setLodgings(lodgingData);

      // Separate scheduled and unscheduled activities
      const scheduledActivities = activitiesData.filter(a => a.startTime || a.allDay);
      const unscheduledActivities = activitiesData.filter(a => !a.startTime && !a.allDay);
      setActivitiesCount(scheduledActivities.length);
      setUnscheduledCount(unscheduledActivities.length);

      setTransportationCount(transportationData.length);
      setLodgingCount(lodgingData.length);
      setJournalCount(journalData.length);
      setTags(tagsData);
      setTagsCount(tagsData.length);
      setCompanionsCount(companionsData.length);
      setAlbums(albumsData.albums);
      setUnsortedPhotosCount(albumsData.unsortedCount);
    } catch (error) {
      toast.error('Failed to load trip');
      navigate('/trips');
    } finally {
      setLoading(false);
    }
  };

  const loadAlbums = async (tripId: number) => {
    try {
      const albumsData = await photoService.getAlbumsByTrip(tripId);
      setAlbums(albumsData.albums);
      setUnsortedPhotosCount(albumsData.unsortedCount);
    } catch (error) {
      console.error('Failed to load albums:', error);
    }
  };

  const handleSelectAlbum = async (albumId: number | null) => {
    setSelectedAlbumId(albumId);

    if (albumId === null) {
      // Show all photos - filteredPhotos will update via useEffect
    } else if (albumId === -1) {
      // Load unsorted photos from backend
      if (!trip) return;
      unsortedPagination.loadInitial();
    } else {
      // Load photos for selected album
      albumPhotosPagination.loadInitial();
    }
  };

  const handleCreateAlbum = () => {
    setEditingAlbum(null);
    setShowAlbumModal(true);
  };

  const handleEditAlbum = (album: PhotoAlbum) => {
    setEditingAlbum(album);
    setShowAlbumModal(true);
  };

  const handleSaveAlbum = async (data: {
    name: string;
    description: string;
    locationId?: number | null;
    activityId?: number | null;
    lodgingId?: number | null;
  }) => {
    try {
      if (editingAlbum) {
        // Update existing album
        await photoService.updateAlbum(editingAlbum.id, data);
        toast.success('Album updated');
      } else {
        // Create new album
        await photoService.createAlbum({
          tripId: trip!.id,
          ...data,
        });
        toast.success('Album created');
      }

      // Reload albums
      if (trip) {
        await loadAlbums(trip.id);
      }

      setShowAlbumModal(false);
      setEditingAlbum(null);
    } catch (error) {
      toast.error(editingAlbum ? 'Failed to update album' : 'Failed to create album');
      throw error; // Re-throw so modal knows save failed
    }
  };

  const handleDeleteAlbum = async (albumId: number) => {
    if (!confirm('Delete this album? Photos will not be deleted, only the album.')) {
      return;
    }

    try {
      await photoService.deleteAlbum(albumId);
      toast.success('Album deleted');

      // If we were viewing this album, switch to "All Photos"
      if (selectedAlbumId === albumId) {
        setSelectedAlbumId(null);
      }

      // Reload albums
      if (trip) {
        await loadAlbums(trip.id);
      }
    } catch (error) {
      toast.error('Failed to delete album');
    }
  };

  const resetLocationForm = () => {
    setLocationName('');
    setLocationAddress('');
    setLocationNotes('');
    setLocationLatitude(undefined);
    setLocationLongitude(undefined);
    setEditingLocationId(null);
    setShowLocationForm(false);
  };

  const handleAddLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trip) return;

    try {
      if (editingLocationId) {
        // Update existing location
        await locationService.updateLocation(editingLocationId, {
          name: locationName,
          address: locationAddress || null,
          latitude: locationLatitude,
          longitude: locationLongitude,
          notes: locationNotes || null,
        });
        toast.success('Location updated');
      } else {
        // Create new location
        await locationService.createLocation({
          tripId: trip.id,
          name: locationName,
          address: locationAddress || undefined,
          latitude: locationLatitude,
          longitude: locationLongitude,
          notes: locationNotes || undefined,
        });
        toast.success('Location added');
      }
      resetLocationForm();
      loadTripData(trip.id);
    } catch (error) {
      toast.error(editingLocationId ? 'Failed to update location' : 'Failed to add location');
    }
  };

  const handleEditLocation = (location: Location) => {
    setEditingLocationId(location.id);
    setLocationName(location.name);
    setLocationAddress(location.address || '');
    setLocationNotes(location.notes || '');
    setLocationLatitude(location.latitude || undefined);
    setLocationLongitude(location.longitude || undefined);
    setShowLocationForm(true);
  };

  const handleLocationSelect = (data: {
    name: string;
    address: string;
    latitude: number;
    longitude: number;
  }) => {
    setLocationName(data.name);
    setLocationAddress(data.address);
    setLocationLatitude(data.latitude);
    setLocationLongitude(data.longitude);
  };

  const handleDeleteLocation = async (locationId: number) => {
    if (!confirm('Delete this location?')) return;

    try {
      await locationService.deleteLocation(locationId);
      toast.success('Location deleted');
      if (trip) loadTripData(trip.id);
    } catch (error) {
      toast.error('Failed to delete location');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case TripStatus.DREAM: return 'bg-purple-100 text-purple-800';
      case TripStatus.PLANNING: return 'bg-yellow-100 text-yellow-800';
      case TripStatus.PLANNED: return 'bg-blue-100 text-blue-800';
      case TripStatus.IN_PROGRESS: return 'bg-green-100 text-green-800';
      case TripStatus.COMPLETED: return 'bg-gray-100 text-gray-800';
      case TripStatus.CANCELLED: return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
      month: 'long',
      day: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600 dark:text-gray-400">Loading trip...</p>
        </div>
      </div>
    );
  }

  if (!trip) {
    return <div className="text-gray-900 dark:text-white">Trip not found</div>;
  }

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-8">
        <Link to="/trips" className="text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block">
          ← Back to Trips
        </Link>
        {/* Trip Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden mb-6">
          {/* Cover Photo Background */}
          {coverPhotoUrl ? (
            <div
              className="relative h-64 bg-cover bg-center"
              style={{
                backgroundImage: `url(${coverPhotoUrl})`,
              }}
            >
              <div className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/50 to-black/70"></div>
              <div className="relative h-full p-6 flex flex-col justify-between text-white">
                <div className="flex justify-between items-start">
                  <div>
                    <h1 className="text-4xl font-bold drop-shadow-lg">{trip.title}</h1>
                    <span className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded ${getStatusColor(trip.status)}`}>
                      {trip.status}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => setShowTagsModal(true)}
                      className="btn btn-secondary flex items-center gap-2"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                      </svg>
                      Manage Tags ({tagsCount})
                    </button>
                    <Link to={`/trips/${trip.id}/edit`} className="btn btn-secondary">
                      Edit Trip
                    </Link>
                  </div>
                </div>

                <div>
                  {trip.description && (
                    <p className="text-white/90 mb-4 drop-shadow-md">{trip.description}</p>
                  )}

                  <div className="grid grid-cols-2 gap-4 text-sm mb-4">
                    <div>
                      <span className="font-medium text-white/80">Start Date:</span>
                      <p className="text-white drop-shadow-md">{formatDate(trip.startDate)}</p>
                    </div>
                    <div>
                      <span className="font-medium text-white/80">End Date:</span>
                      <p className="text-white drop-shadow-md">{formatDate(trip.endDate)}</p>
                    </div>
                  </div>

                  {/* Tags */}
                  {tags.length > 0 && (
                    <div className="flex flex-wrap gap-2">
                      {tags.map((tag) => (
                        <span
                          key={tag.id}
                          className="px-3 py-1 rounded-full text-sm font-medium shadow-md"
                          style={{
                            backgroundColor: tag.color || '#3B82F6',
                            color: tag.textColor || '#FFFFFF'
                          }}
                        >
                          {tag.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <div>
                  <h1 className="text-3xl font-bold text-gray-900 dark:text-white">{trip.title}</h1>
                  <span className={`inline-block mt-2 px-3 py-1 text-sm font-medium rounded ${getStatusColor(trip.status)}`}>
                    {trip.status}
                  </span>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setShowTagsModal(true)}
                    className="btn btn-secondary flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
                    </svg>
                    Manage Tags ({tagsCount})
                  </button>
                  <Link to={`/trips/${trip.id}/edit`} className="btn btn-secondary">
                    Edit Trip
                  </Link>
                </div>
              </div>

              {trip.description && (
                <p className="text-gray-700 dark:text-gray-300 mb-4">{trip.description}</p>
              )}

              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">Start Date:</span>
                  <p className="text-gray-900 dark:text-white">{formatDate(trip.startDate)}</p>
                </div>
                <div>
                  <span className="font-medium text-gray-600 dark:text-gray-400">End Date:</span>
                  <p className="text-gray-900 dark:text-white">{formatDate(trip.endDate)}</p>
                </div>
              </div>

              {/* Tags */}
              {tags.length > 0 && (
                <div className="mt-4">
                  <div className="flex flex-wrap gap-2">
                    {tags.map((tag) => (
                      <span
                        key={tag.id}
                        className="px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: tag.color || '#3B82F6',
                          color: tag.textColor || '#FFFFFF'
                        }}
                      >
                        {tag.name}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow mb-6">
          <div className="border-b border-gray-200 dark:border-gray-700">
            <nav className="flex -mb-px">
              <button
                onClick={() => setActiveTab('timeline')}
                className={`flex-1 py-4 px-2 text-sm font-medium border-b-2 flex flex-col items-center ${
                  activeTab === 'timeline'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span>Timeline</span>
              </button>
              <button
                onClick={() => setActiveTab('locations')}
                className={`flex-1 py-4 px-2 text-sm font-medium border-b-2 flex flex-col items-center ${
                  activeTab === 'locations'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span>Locations</span>
                <span className="text-xs mt-1">({locations.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('photos')}
                className={`flex-1 py-4 px-2 text-sm font-medium border-b-2 flex flex-col items-center ${
                  activeTab === 'photos'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span>Photos</span>
                <span className="text-xs mt-1">({photosPagination.total})</span>
              </button>
              <button
                onClick={() => setActiveTab('activities')}
                className={`flex-1 py-4 px-2 text-sm font-medium border-b-2 flex flex-col items-center ${
                  activeTab === 'activities'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span>Activities</span>
                <span className="text-xs mt-1">({activitiesCount})</span>
              </button>
              <button
                onClick={() => setActiveTab('unscheduled')}
                className={`flex-1 py-4 px-2 text-sm font-medium border-b-2 flex flex-col items-center ${
                  activeTab === 'unscheduled'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span>Unscheduled</span>
                <span className="text-xs mt-1">({unscheduledCount})</span>
              </button>
              <button
                onClick={() => setActiveTab('transportation')}
                className={`flex-1 py-4 px-2 text-sm font-medium border-b-2 flex flex-col items-center ${
                  activeTab === 'transportation'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span>Transportation</span>
                <span className="text-xs mt-1">({transportationCount})</span>
              </button>
              <button
                onClick={() => setActiveTab('lodging')}
                className={`flex-1 py-4 px-2 text-sm font-medium border-b-2 flex flex-col items-center ${
                  activeTab === 'lodging'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span>Lodging</span>
                <span className="text-xs mt-1">({lodgingCount})</span>
              </button>
              <button
                onClick={() => setActiveTab('journal')}
                className={`flex-1 py-4 px-2 text-sm font-medium border-b-2 flex flex-col items-center ${
                  activeTab === 'journal'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span>Journal</span>
                <span className="text-xs mt-1">({journalCount})</span>
              </button>
              <button
                onClick={() => setActiveTab('companions')}
                className={`flex-1 py-4 px-2 text-sm font-medium border-b-2 flex flex-col items-center ${
                  activeTab === 'companions'
                    ? 'border-blue-500 text-blue-600 dark:text-blue-400'
                    : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                }`}
              >
                <span>Companions</span>
                <span className="text-xs mt-1">({companionsCount})</span>
              </button>
            </nav>
          </div>
        </div>

        {/* Timeline Tab */}
        {activeTab === 'timeline' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Timeline</h2>
            <Timeline
              tripId={parseInt(id!)}
              tripTimezone={trip.timezone || undefined}
              userTimezone={userTimezone || undefined}
            />
          </div>
        )}

        {/* Locations Tab */}
        {activeTab === 'locations' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Locations</h2>
              <button
                onClick={() => {
                  if (showLocationForm) {
                    resetLocationForm();
                  } else {
                    setShowLocationForm(true);
                  }
                }}
                className="btn btn-primary"
              >
                {showLocationForm ? 'Cancel' : '+ Add Location'}
              </button>
            </div>

          {/* Add/Edit Location Form */}
          {showLocationForm && (
            <form onSubmit={handleAddLocation} className="mb-6 p-4 bg-gray-50 dark:bg-gray-700 rounded-lg">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                {editingLocationId ? 'Edit Location' : 'Add Location'}
              </h3>
              <div className="space-y-4">
                <div>
                  <label className="label">Search & Select Location</label>
                  <LocationSearchMap
                    onLocationSelect={handleLocationSelect}
                    initialPosition={
                      locationLatitude && locationLongitude
                        ? { lat: locationLatitude, lng: locationLongitude }
                        : undefined
                    }
                  />
                </div>

                <div>
                  <label className="label">Location Name *</label>
                  <input
                    type="text"
                    value={locationName}
                    onChange={(e) => setLocationName(e.target.value)}
                    className="input"
                    placeholder="Eiffel Tower"
                    required
                  />
                </div>
                <div>
                  <label className="label">Address</label>
                  <input
                    type="text"
                    value={locationAddress}
                    onChange={(e) => setLocationAddress(e.target.value)}
                    className="input"
                    placeholder="Paris, France"
                  />
                </div>
                <div>
                  <label className="label">Notes</label>
                  <textarea
                    value={locationNotes}
                    onChange={(e) => setLocationNotes(e.target.value)}
                    className="input"
                    rows={2}
                    placeholder="Additional notes..."
                  />
                </div>
                <button type="submit" className="btn btn-primary">
                  {editingLocationId ? 'Update Location' : 'Add Location'}
                </button>
              </div>
            </form>
          )}

          {/* Locations List */}
          {locations.length === 0 ? (
            <p className="text-gray-600 dark:text-gray-400 text-center py-8">
              No locations added yet. Click "Add Location" to get started!
            </p>
          ) : (
            <div className="space-y-4">
              {locations.map((location) => (
                <div key={location.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{location.name}</h3>
                      {location.address && (
                        <p className="text-gray-600 dark:text-gray-400 text-sm mt-1">{location.address}</p>
                      )}
                      {location.notes && (
                        <p className="text-gray-700 dark:text-gray-300 mt-2">{location.notes}</p>
                      )}
                      {location.category && (
                        <span className="inline-block mt-2 px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-300 rounded">
                          {location.category.name}
                        </span>
                      )}

                      <AssociatedAlbums
                        albums={location.photoAlbums}
                        tripId={trip.id}
                      />
                    </div>
                    <div className="flex gap-2 items-center">
                      <JournalEntriesButton
                        journalEntries={location.journalLocationAssignments}
                        tripId={trip.id}
                      />
                      <button
                        onClick={() => handleEditLocation(location)}
                        className="ml-4 px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteLocation(location.id)}
                        className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Locations Map */}
          {locations.length > 0 && (
            <div className="mt-8 pt-8 border-t border-gray-200 dark:border-gray-700">
              <TripLocationsMap locations={locations} />
            </div>
          )}
          </div>
        )}

        {/* Photos Tab */}
        {activeTab === 'photos' && (
          <div className="space-y-6">
            {/* Upload Interface - Full Width */}
            <PhotoUpload
              tripId={trip.id}
              locations={locations}
              onPhotoUploaded={async () => {
                await loadTripData(trip.id);
                // Refresh filtered photos if viewing an album
                if (selectedAlbumId !== null) {
                  handleSelectAlbum(selectedAlbumId);
                }
              }}
              tripStartDate={trip.startDate || undefined}
              tripEndDate={trip.endDate || undefined}
            />

            {/* Sidebar Layout */}
            <div className="flex gap-0 bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
              {/* Left: Albums Sidebar */}
              <AlbumsSidebar
                albums={albums}
                selectedAlbumId={selectedAlbumId}
                totalPhotos={photosPagination.total}
                unsortedPhotosCount={unsortedPhotosCount}
                onSelectAlbum={handleSelectAlbum}
                onCreateAlbum={handleCreateAlbum}
                onEditAlbum={handleEditAlbum}
                onDeleteAlbum={handleDeleteAlbum}
              />

              {/* Right: Photo Gallery */}
              <div className="flex-1 p-6">
                <div className="flex justify-between items-center mb-6">
                  <div className="flex items-center gap-3 min-w-0 flex-1">
                    <h2 className="text-2xl font-bold text-gray-900 dark:text-white whitespace-nowrap">
                      {selectedAlbumId === null
                        ? `All Photos (${photosPagination.total})`
                        : selectedAlbumId === -1
                        ? `Unsorted (${unsortedPagination.total})`
                        : `${albums.find(a => a.id === selectedAlbumId)?.name || 'Album'} (${albumPhotosPagination.total})`
                      }
                    </h2>
                    {selectedAlbumId !== null && selectedAlbumId !== -1 && albums.find(a => a.id === selectedAlbumId)?.description && (
                      <span
                        className="text-sm text-gray-600 dark:text-gray-400 truncate"
                        title={albums.find(a => a.id === selectedAlbumId)?.description || ''}
                      >
                        — {albums.find(a => a.id === selectedAlbumId)?.description}
                      </span>
                    )}
                  </div>
                  {trip.coverPhoto && selectedAlbumId === null && (
                    <button
                      onClick={async () => {
                        try {
                          await tripService.updateCoverPhoto(trip.id, null);
                          toast.success('Cover photo removed');
                          loadTripData(trip.id);
                        } catch (error) {
                          toast.error('Failed to remove cover photo');
                        }
                      }}
                      className="px-3 py-2 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                    >
                      Remove Cover Photo
                    </button>
                  )}
                </div>

                <PhotoGallery
                  photos={filteredPhotos}
                  albums={albums}
                  onPhotoDeleted={() => {
                    loadTripData(trip.id);
                    loadAlbums(trip.id);
                    // Refresh filtered photos if viewing an album
                    if (selectedAlbumId !== null) {
                      handleSelectAlbum(selectedAlbumId);
                    }
                  }}
                  onPhotoUpdated={() => {
                    loadTripData(trip.id);
                    // Refresh filtered photos if viewing an album
                    if (selectedAlbumId !== null) {
                      handleSelectAlbum(selectedAlbumId);
                    }
                  }}
                  onPhotosAddedToAlbum={() => {
                    loadAlbums(trip.id);
                    // Refresh filtered photos if viewing an album
                    if (selectedAlbumId !== null) {
                      handleSelectAlbum(selectedAlbumId);
                    }
                    toast.success('Photos added to album');
                  }}
                  onSetCoverPhoto={async (photoId: number) => {
                    try {
                      await tripService.updateCoverPhoto(trip.id, photoId);
                      toast.success('Cover photo updated');
                      loadTripData(trip.id);
                    } catch (error) {
                      toast.error('Failed to set cover photo');
                    }
                  }}
                  coverPhotoId={trip.coverPhotoId}
                />

                {photosPagination.hasMore && selectedAlbumId === null && (
                  <div className="text-center mt-6">
                    <button
                      onClick={photosPagination.loadMore}
                      disabled={photosPagination.loadingMore}
                      className="btn btn-primary"
                    >
                      {photosPagination.loadingMore ? 'Loading...' : `Load More Photos (${photosPagination.items.length}/${photosPagination.total})`}
                    </button>
                  </div>
                )}
                {unsortedPagination.hasMore && selectedAlbumId === -1 && (
                  <div className="text-center mt-6">
                    <button
                      onClick={unsortedPagination.loadMore}
                      disabled={unsortedPagination.loadingMore}
                      className="btn btn-primary"
                    >
                      {unsortedPagination.loadingMore ? 'Loading...' : `Load More Photos (${unsortedPagination.items.length}/${unsortedPagination.total})`}
                    </button>
                  </div>
                )}
                {albumPhotosPagination.hasMore && selectedAlbumId && selectedAlbumId > 0 && (
                  <div className="text-center mt-6">
                    <button
                      onClick={albumPhotosPagination.loadMore}
                      disabled={albumPhotosPagination.loadingMore}
                      className="btn btn-primary"
                    >
                      {albumPhotosPagination.loadingMore ? 'Loading...' : `Load More Photos (${albumPhotosPagination.items.length}/${albumPhotosPagination.total})`}
                    </button>
                  </div>
                )}
                {selectedAlbumId === -1 && filteredPhotos.length === 0 && (
                  <div className="text-center py-12 text-gray-500 dark:text-gray-400">
                    <p>All photos are sorted into albums!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Album Modal */}
            {showAlbumModal && (
              <AlbumModal
                album={editingAlbum || undefined}
                onSave={handleSaveAlbum}
                onClose={() => {
                  setShowAlbumModal(false);
                  setEditingAlbum(null);
                }}
                locations={locations}
                activities={activities}
                lodgings={lodgings}
              />
            )}
          </div>
        )}

        {/* Activities Tab */}
        {activeTab === 'activities' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <ActivityManager
              tripId={trip.id}
              locations={locations}
              tripTimezone={trip.timezone}
              onUpdate={() => loadTripData(trip.id)}
            />
          </div>
        )}

        {/* Unscheduled Tab */}
        {activeTab === 'unscheduled' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-6">Unscheduled Activities</h2>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Activities with dates but no specific times. These won't appear in the timeline until times are added.
            </p>
            <UnscheduledActivities
              tripId={trip.id}
              locations={locations}
              tripTimezone={trip.timezone}
              onActivityUpdated={() => loadTripData(trip.id)}
            />
          </div>
        )}

        {/* Transportation Tab */}
        {activeTab === 'transportation' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <TransportationManager
              tripId={trip.id}
              locations={locations}
              tripTimezone={trip.timezone}
              onUpdate={() => loadTripData(trip.id)}
            />
          </div>
        )}

        {/* Lodging Tab */}
        {activeTab === 'lodging' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <LodgingManager
              tripId={trip.id}
              locations={locations}
              tripTimezone={trip.timezone}
              onUpdate={() => loadTripData(trip.id)}
            />
          </div>
        )}

        {/* Journal Tab */}
        {activeTab === 'journal' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <JournalManager
              tripId={trip.id}
              locations={locations}
              onUpdate={() => loadTripData(trip.id)}
            />
          </div>
        )}

        {/* Companions Tab */}
        {activeTab === 'companions' && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
            <CompanionManager tripId={trip.id} />
          </div>
        )}
      </main>

      {/* Tags Modal */}
      {showTagsModal && (
        <TagsModal
          tripId={trip.id}
          onClose={() => setShowTagsModal(false)}
          onTagsUpdated={() => {
            if (trip) loadTripData(trip.id);
          }}
        />
      )}
    </div>
  );
}
