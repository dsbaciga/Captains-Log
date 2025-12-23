import { useState } from "react";
import type { PhotoAlbum } from "../types/photo";
import type { Location } from "../types/location";
import type { Activity } from "../types/activity";
import type { Lodging } from "../types/lodging";

interface AlbumModalProps {
  album?: PhotoAlbum; // If provided, we're editing; otherwise creating
  onSave: (data: {
    name: string;
    description: string;
    locationId?: number | null;
    activityId?: number | null;
    lodgingId?: number | null;
  }) => Promise<void>;
  onClose: () => void;
  locations?: Location[];
  activities?: Activity[];
  lodgings?: Lodging[];
}

export default function AlbumModal({
  album,
  onSave,
  onClose,
  locations = [],
  activities = [],
  lodgings = [],
}: AlbumModalProps) {
  const [name, setName] = useState(album?.name || "");
  const [description, setDescription] = useState(album?.description || "");
  const [locationId, setLocationId] = useState<number | null>(
    album?.locationId || null
  );
  const [activityId, setActivityId] = useState<number | null>(
    album?.activityId || null
  );
  const [lodgingId, setLodgingId] = useState<number | null>(
    album?.lodgingId || null
  );
  const [saving, setSaving] = useState(false);

  const isEdit = !!album;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      await onSave({
        name: name.trim(),
        description: description.trim(),
        locationId,
        activityId,
        lodgingId,
      });
      onClose();
    } catch (error) {
      console.error("Failed to save album:", error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-xl font-bold text-gray-900 dark:text-white">
            {isEdit ? "Edit Album" : "Create Album"}
          </h2>
          <button
            onClick={onClose}
            type="button"
            aria-label="Close"
            className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          <div>
            <label
              htmlFor="album-name"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Album Name *
            </label>
            <input
              type="text"
              id="album-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="input"
              placeholder="e.g., Beach Photos, Food Tour, Sunset Views"
              required
              autoFocus
            />
          </div>

          <div>
            <label
              htmlFor="album-description"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Description (Optional)
            </label>
            <textarea
              id="album-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="input"
              rows={3}
              placeholder="Add a description for this album..."
            />
          </div>

          {/* Location Association */}
          {locations.length > 0 && (
            <div>
              <label
                htmlFor="album-location"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Associated Location (Optional)
              </label>
              <select
                id="album-location"
                value={locationId || ""}
                onChange={(e) =>
                  setLocationId(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="input"
              >
                <option value="">None</option>
                {locations.map((location) => (
                  <option key={location.id} value={location.id}>
                    {location.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Activity Association */}
          {activities.length > 0 && (
            <div>
              <label
                htmlFor="album-activity"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Associated Activity (Optional)
              </label>
              <select
                id="album-activity"
                value={activityId || ""}
                onChange={(e) =>
                  setActivityId(
                    e.target.value ? parseInt(e.target.value) : null
                  )
                }
                className="input"
              >
                <option value="">None</option>
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lodging Association */}
          {lodgings.length > 0 && (
            <div>
              <label
                htmlFor="album-lodging"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Associated Lodging (Optional)
              </label>
              <select
                id="album-lodging"
                value={lodgingId || ""}
                onChange={(e) =>
                  setLodgingId(e.target.value ? parseInt(e.target.value) : null)
                }
                className="input"
              >
                <option value="">None</option>
                {lodgings.map((lodging) => (
                  <option key={lodging.id} value={lodging.id}>
                    {lodging.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving || !name.trim()}
            >
              {saving ? "Saving..." : isEdit ? "Save Changes" : "Create Album"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
