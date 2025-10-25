import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import tripService from '../services/trip.service';
import { TripStatus, PrivacyLevel } from '../types/trip';
import type { Trip, TripStatusType, PrivacyLevelType } from '../types/trip';
import toast from 'react-hot-toast';

export default function TripFormPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = !!id;

  const [loading, setLoading] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [timezone, setTimezone] = useState('');
  const [status, setStatus] = useState<TripStatusType>(TripStatus.PLANNING);
  const [privacyLevel, setPrivacyLevel] = useState<PrivacyLevelType>(PrivacyLevel.PRIVATE);
  const [addToPlacesVisited, setAddToPlacesVisited] = useState(true);

  useEffect(() => {
    if (isEdit && id) {
      loadTrip(parseInt(id));
    }
  }, [id, isEdit]);

  const loadTrip = async (tripId: number) => {
    try {
      setLoading(true);
      const trip = await tripService.getTripById(tripId);

      // Extract just the date part (YYYY-MM-DD) from datetime strings
      const extractDate = (dateStr: string | null) => {
        if (!dateStr) return '';
        return dateStr.split('T')[0]; // Get just YYYY-MM-DD part
      };

      setTitle(trip.title);
      setDescription(trip.description || '');
      setStartDate(extractDate(trip.startDate));
      setEndDate(extractDate(trip.endDate));
      setTimezone(trip.timezone || '');
      setStatus(trip.status);
      setPrivacyLevel(trip.privacyLevel);
      setAddToPlacesVisited(trip.addToPlacesVisited);
    } catch (error) {
      toast.error('Failed to load trip');
      navigate('/trips');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      toast.error('Title is required');
      return;
    }

    try {
      setLoading(true);

      // Convert dates preserving the selected date regardless of timezone
      const formatDate = (dateStr: string) => {
        if (!dateStr) return undefined;
        // Just send the date as-is (YYYY-MM-DD)
        // Backend should handle this as a date-only value
        return dateStr;
      };

      const data = {
        title,
        description: description || undefined,
        startDate: formatDate(startDate),
        endDate: formatDate(endDate),
        timezone: timezone || undefined,
        status,
        privacyLevel,
        addToPlacesVisited,
      };

      if (isEdit && id) {
        await tripService.updateTrip(parseInt(id), data);
        toast.success('Trip updated successfully');
      } else {
        await tripService.createTrip(data);
        toast.success('Trip created successfully');
      }

      navigate('/trips');
    } catch (error: any) {
      toast.error(error.response?.data?.message || 'Failed to save trip');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-gray-50 dark:bg-gray-900 min-h-screen">
      <main className="max-w-3xl mx-auto px-4 py-8">
        <button
          onClick={() => navigate('/trips')}
          className="text-blue-600 dark:text-blue-400 hover:underline mb-6 inline-block"
        >
          ← Back to Trips
        </button>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 border border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold mb-6 text-gray-900 dark:text-gray-100">
            {isEdit ? 'Edit Trip' : 'New Trip'}
          </h2>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="title" className="label">
                Title *
              </label>
              <input
                type="text"
                id="title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="input"
                placeholder="My Amazing Trip"
                required
              />
            </div>

            <div>
              <label htmlFor="description" className="label">
                Description
              </label>
              <textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="input"
                rows={4}
                placeholder="Tell us about your trip..."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label htmlFor="startDate" className="label">
                  Start Date
                </label>
                <input
                  type="date"
                  id="startDate"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label htmlFor="endDate" className="label">
                  End Date
                </label>
                <input
                  type="date"
                  id="endDate"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label htmlFor="timezone" className="label">
                Timezone
              </label>
              <select
                id="timezone"
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                className="input"
              >
                <option value="">Use my default timezone</option>
                <option value="UTC">UTC (Coordinated Universal Time)</option>
                <option value="America/New_York">Eastern Time (US & Canada)</option>
                <option value="America/Chicago">Central Time (US & Canada)</option>
                <option value="America/Denver">Mountain Time (US & Canada)</option>
                <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                <option value="America/Anchorage">Alaska</option>
                <option value="Pacific/Honolulu">Hawaii</option>
                <option value="Europe/London">London</option>
                <option value="Europe/Paris">Paris</option>
                <option value="Europe/Berlin">Berlin</option>
                <option value="Asia/Tokyo">Tokyo</option>
                <option value="Asia/Shanghai">Shanghai</option>
                <option value="Asia/Dubai">Dubai</option>
                <option value="Australia/Sydney">Sydney</option>
                <option value="Pacific/Auckland">Auckland</option>
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                If not specified, your default timezone from settings will be used
              </p>
            </div>

            <div>
              <label htmlFor="status" className="label">
                Status
              </label>
              <select
                id="status"
                value={status}
                onChange={(e) => setStatus(e.target.value as any)}
                className="input"
              >
                {Object.values(TripStatus).map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label htmlFor="privacyLevel" className="label">
                Privacy
              </label>
              <select
                id="privacyLevel"
                value={privacyLevel}
                onChange={(e) => setPrivacyLevel(e.target.value as any)}
                className="input"
              >
                {Object.values(PrivacyLevel).map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center">
              <input
                type="checkbox"
                id="addToPlacesVisited"
                checked={addToPlacesVisited}
                onChange={(e) => setAddToPlacesVisited(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="addToPlacesVisited" className="text-sm text-gray-700 dark:text-gray-300">
                Add to Places I've Visited map
              </label>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="submit"
                className="flex-1 btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Saving...' : isEdit ? 'Update Trip' : 'Create Trip'}
              </button>
              <button
                type="button"
                onClick={() => navigate('/trips')}
                className="flex-1 btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
