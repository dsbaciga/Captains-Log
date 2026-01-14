import { useState } from "react";
import type { PhotoAlbum } from "../types/photo";
import LinkButton from "./LinkButton";

interface AlbumModalProps {
  album?: PhotoAlbum; // If provided, we're editing; otherwise creating
  tripId: number;
  onSave: (data: {
    name: string;
    description: string;
  }) => Promise<void>;
  onClose: () => void;
  onUpdate?: () => void; // Callback to refresh data after linking
}

export default function AlbumModal({
  album,
  tripId,
  onSave,
  onClose,
  onUpdate,
}: AlbumModalProps) {
  const [name, setName] = useState(album?.name || "");
  const [description, setDescription] = useState(album?.description || "");
  const [saving, setSaving] = useState(false);

  const isEdit = !!album;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    try {
      setSaving(true);
      await onSave({
        name: name.trim(),
        description: description.trim() || "",
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

          {/* Entity Linking Section */}
          {isEdit ? (
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Links
              </label>
              <div className="flex items-center gap-2">
                <LinkButton
                  tripId={tripId}
                  entityType="PHOTO_ALBUM"
                  entityId={album.id}
                  onUpdate={onUpdate}
                  size="md"
                />
                <span className="text-sm text-gray-600 dark:text-gray-400">
                  Link this album to locations, activities, photos, and more
                </span>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
              <p className="text-sm text-blue-700 dark:text-blue-300">
                💡 After creating this album, you'll be able to link it to locations, activities, and other trip entities.
              </p>
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
