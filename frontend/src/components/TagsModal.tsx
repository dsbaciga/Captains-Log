import { useState, useEffect, useCallback } from "react";
import toast from "react-hot-toast";
import tagService from "../services/tag.service";
import type { TripTag } from "../types/tag";

interface TagsModalProps {
  tripId: number;
  onClose: () => void;
  onTagsUpdated: () => void;
}

export default function TagsModal({
  tripId,
  onClose,
  onTagsUpdated,
}: TagsModalProps) {
  const [tripTags, setTripTags] = useState<TripTag[]>([]);
  const [allTags, setAllTags] = useState<TripTag[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [newTagName, setNewTagName] = useState("");
  const [newTagColor, setNewTagColor] = useState("#3B82F6");
  const [newTagTextColor, setNewTagTextColor] = useState("#FFFFFF");
  const [loading, setLoading] = useState(true);

  const loadTags = useCallback(async () => {
    try {
      setLoading(true);
      const [tripTagsData, allTagsData] = await Promise.all([
        tagService.getTagsByTrip(tripId),
        tagService.getAllTags(),
      ]);
      setTripTags(tripTagsData);
      setAllTags(allTagsData);
    } catch {
      toast.error("Failed to load tags");
    } finally {
      setLoading(false);
    }
  }, [tripId]);

  useEffect(() => {
    loadTags();
  }, [loadTags]);

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTagName.trim()) return;

    try {
      const newTag = await tagService.createTag({
        name: newTagName.trim(),
        color: newTagColor,
        textColor: newTagTextColor,
      });

      // Automatically add the new tag to the current trip
      await tagService.assignTagToTrip(tripId, newTag.id);

      setNewTagName("");
      setNewTagColor("#3B82F6");
      setNewTagTextColor("#FFFFFF");
      await loadTags();
      onTagsUpdated();
      toast.success("Tag created and added to trip");
    } catch {
      toast.error("Failed to create tag");
    }
  };

  const handleAddTag = async (tagId: number) => {
    try {
      await tagService.assignTagToTrip(tripId, tagId);
      await loadTags();
      onTagsUpdated();
      toast.success("Tag added to trip");
    } catch {
      toast.error("Failed to add tag");
    }
  };

  const handleRemoveTag = async (tagId: number) => {
    try {
      await tagService.removeTagFromTrip(tripId, tagId);
      await loadTags();
      onTagsUpdated();
      toast.success("Tag removed from trip");
    } catch {
      toast.error("Failed to remove tag");
    }
  };

  const filteredAvailableTags = allTags.filter(
    (tag) =>
      !tripTags.some((t) => t.id === tag.id) &&
      tag.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Manage Tags
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

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading ? (
            <div className="text-center py-8">
              <p className="text-gray-500 dark:text-gray-400">
                Loading tags...
              </p>
            </div>
          ) : (
            <>
              {/* Current Trip Tags */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Current Tags
                </h3>
                {tripTags.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    No tags added to this trip yet.
                  </p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {tripTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center gap-2 px-3 py-1 rounded-full text-sm font-medium"
                        style={{
                          backgroundColor: tag.color || "#3B82F6",
                          color: tag.textColor || "#FFFFFF",
                        }}
                      >
                        <span>{tag.name}</span>
                        <button
                          onClick={() => handleRemoveTag(tag.id)}
                          type="button"
                          aria-label={`Remove tag ${tag.name}`}
                          className="hover:bg-white hover:bg-opacity-20 rounded-full p-0.5"
                        >
                          <svg
                            className="w-4 h-4"
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
                    ))}
                  </div>
                )}
              </div>

              {/* Create New Tag */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Create New Tag
                </h3>
                <form onSubmit={handleCreateTag} className="space-y-3">
                  <label htmlFor="tag-name-input" className="sr-only">
                    Tag name
                  </label>
                  <input
                    type="text"
                    id="tag-name-input"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    placeholder="Tag name"
                    className="input w-full"
                  />
                  <div className="flex gap-4">
                    <div className="flex-1">
                      <label
                        htmlFor="tag-background-color"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Background Color
                      </label>
                      <input
                        type="color"
                        id="tag-background-color"
                        value={newTagColor}
                        onChange={(e) => setNewTagColor(e.target.value)}
                        className="h-10 w-full rounded border border-gray-300 dark:border-gray-600"
                      />
                    </div>
                    <div className="flex-1">
                      <label
                        htmlFor="tag-text-color"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        Text Color
                      </label>
                      <input
                        type="color"
                        id="tag-text-color"
                        value={newTagTextColor}
                        onChange={(e) => setNewTagTextColor(e.target.value)}
                        className="h-10 w-full rounded border border-gray-300 dark:border-gray-600"
                      />
                    </div>
                  </div>
                  <button type="submit" className="btn btn-primary w-full">
                    Create and Add to Trip
                  </button>
                </form>
              </div>

              {/* Search and Add Existing Tags */}
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-3">
                  Add Existing Tags
                </h3>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search tags..."
                  className="input mb-3"
                />
                {filteredAvailableTags.length === 0 ? (
                  <p className="text-gray-500 dark:text-gray-400 text-sm">
                    {searchQuery
                      ? "No tags found matching your search."
                      : "All tags are already added to this trip."}
                  </p>
                ) : (
                  <div className="space-y-2">
                    {filteredAvailableTags.map((tag) => (
                      <div
                        key={tag.id}
                        className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded-lg"
                      >
                        <div className="flex items-center gap-3">
                          <div
                            className="w-6 h-6 rounded-full"
                            style={{ backgroundColor: tag.color || "#3B82F6" }}
                          />
                          <span className="text-gray-900 dark:text-white font-medium">
                            {tag.name}
                          </span>
                        </div>
                        <button
                          onClick={() => handleAddTag(tag.id)}
                          type="button"
                          aria-label={`Add tag ${tag.name}`}
                          className="btn btn-primary text-sm"
                        >
                          Add to Trip
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end p-6 border-t border-gray-200 dark:border-gray-700">
          <button onClick={onClose} className="btn btn-primary">
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
