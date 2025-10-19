import { useState, useEffect, useId } from "react";
import tagService from "../services/tag.service";
import type { Tag } from "../types/tag";
import toast from "react-hot-toast";

interface TagManagerProps {
  tripId: number;
}

const DEFAULT_COLORS = [
  "#3B82F6", // blue
  "#10B981", // green
  "#F59E0B", // yellow
  "#EF4444", // red
  "#8B5CF6", // purple
  "#EC4899", // pink
  "#F97316", // orange
  "#06B6D4", // cyan
];

export default function TagManager({ tripId }: TagManagerProps) {
  const [tags, setTags] = useState<Tag[]>([]);
  const [tripTags, setTripTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [tagName, setTagName] = useState("");
  const [tagColor, setTagColor] = useState(DEFAULT_COLORS[0]);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const tagNameId = useId();
  const tagColorId = useId();

  useEffect(() => {
    loadTags();
  }, [tripId]);

  const loadTags = async () => {
    try {
      setLoading(true);
      const [allTags, linkedTags] = await Promise.all([
        tagService.getTagsByUser(),
        tagService.getTagsByTrip(tripId),
      ]);
      setTags(allTags);
      setTripTags(linkedTags);
    } catch (error) {
      toast.error("Failed to load tags");
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const newTag = await tagService.createTag({
        name: tagName,
        color: tagColor,
      });
      toast.success("Tag created");
      setTagName("");
      setTagColor(DEFAULT_COLORS[0]);
      setShowForm(false);
      await loadTags();
      // Automatically link the new tag to this trip
      await handleLinkTag(newTag.id);
    } catch (error) {
      toast.error("Failed to create tag");
    }
  };

  const handleUpdateTag = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTag) return;

    try {
      await tagService.updateTag(editingTag.id, {
        name: tagName,
        color: tagColor,
      });
      toast.success("Tag updated");
      setEditingTag(null);
      setTagName("");
      setTagColor(DEFAULT_COLORS[0]);
      loadTags();
    } catch (error) {
      toast.error("Failed to update tag");
    }
  };

  const handleDeleteTag = async (tagId: number) => {
    if (!confirm("Delete this tag? It will be removed from all trips.")) return;

    try {
      await tagService.deleteTag(tagId);
      toast.success("Tag deleted");
      loadTags();
    } catch (error) {
      toast.error("Failed to delete tag");
    }
  };

  const handleLinkTag = async (tagId: number) => {
    try {
      await tagService.linkTagToTrip(tripId, tagId);
      toast.success("Tag added to trip");
      loadTags();
    } catch (error: any) {
      if (error.response?.data?.message?.includes("already linked")) {
        toast.error("Tag already added to this trip");
      } else {
        toast.error("Failed to add tag");
      }
    }
  };

  const handleUnlinkTag = async (tagId: number) => {
    try {
      await tagService.unlinkTagFromTrip(tripId, tagId);
      toast.success("Tag removed from trip");
      loadTags();
    } catch (error) {
      toast.error("Failed to remove tag");
    }
  };

  const startEdit = (tag: Tag) => {
    setEditingTag(tag);
    setTagName(tag.name);
    setTagColor(tag.color || DEFAULT_COLORS[0]);
    setShowForm(true);
  };

  const cancelForm = () => {
    setShowForm(false);
    setEditingTag(null);
    setTagName("");
    setTagColor(DEFAULT_COLORS[0]);
  };

  if (loading) {
    return <div className="text-center py-4">Loading tags...</div>;
  }

  const availableTags = tags.filter(
    (tag) => !tripTags.find((tt) => tt.id === tag.id)
  );

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Tags
        </h2>
        <button
          onClick={() => setShowForm(!showForm)}
          className="btn btn-primary"
        >
          {showForm ? "Cancel" : "+ Create Tag"}
        </button>
      </div>

      {/* Create/Edit Tag Form */}
      {showForm && (
        <form
          onSubmit={editingTag ? handleUpdateTag : handleCreateTag}
          className="mb-6 p-4 bg-gray-50 dark:bg-gray-800 rounded-lg"
        >
          <div className="space-y-4">
            <div>
              <label htmlFor={tagNameId} className="label">
                Tag Name *
              </label>
              <input
                type="text"
                id={tagNameId}
                value={tagName}
                onChange={(e) => setTagName(e.target.value)}
                className="input"
                placeholder="Adventure, Beach, Food..."
                maxLength={50}
                required
              />
            </div>
            <div>
              <label htmlFor={tagColorId} className="label">
                Color
              </label>
              <div className="flex gap-2 flex-wrap">
                {DEFAULT_COLORS.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setTagColor(color)}
                    className={`w-10 h-10 rounded-full border-2 ${
                      tagColor === color ? "border-gray-900 dark:border-white" : "border-gray-300 dark:border-gray-600"
                    }`}
                    aria-label={`Select color ${color}`}
                    title={`Select color ${color}`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
              <input
                type="color"
                id={tagColorId}
                value={tagColor}
                onChange={(e) => setTagColor(e.target.value)}
                className="mt-2 h-10 w-32 cursor-pointer"
                aria-label="Custom color picker"
              />
            </div>
            <div className="flex gap-2">
              <button type="submit" className="btn btn-primary">
                {editingTag ? "Update Tag" : "Create Tag"}
              </button>
              <button
                type="button"
                onClick={cancelForm}
                className="btn btn-secondary"
              >
                Cancel
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Trip Tags */}
      <div className="mb-6">
        <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Tags on this trip</h3>
        {tripTags.length === 0 ? (
          <p className="text-gray-600 dark:text-gray-400 text-sm">
            No tags added yet
          </p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {tripTags.map((tag) => (
              <div
                key={tag.id}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-medium"
                style={{ backgroundColor: tag.color || "#6B7280" }}
              >
                <span>{tag.name}</span>
                <button
                  onClick={() => startEdit(tag)}
                  className="hover:opacity-75"
                  title="Edit tag"
                >
                  ✏️
                </button>
                <button
                  onClick={() => handleUnlinkTag(tag.id)}
                  className="hover:opacity-75"
                  title="Remove from trip"
                >
                  ✕
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Available Tags */}
      {availableTags.length > 0 && (
        <div>
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">Add existing tags</h3>
          <div className="flex flex-wrap gap-2">
            {availableTags.map((tag) => (
              <button
                key={tag.id}
                onClick={() => handleLinkTag(tag.id)}
                className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-white text-sm font-medium hover:opacity-80"
                style={{ backgroundColor: tag.color || "#6B7280" }}
              >
                <span>{tag.name}</span>
                <span>+</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* All User Tags */}
      {tags.length > 0 && (
        <div className="mt-6 pt-6 border-t border-gray-200 dark:border-gray-700">
          <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">All your tags</h3>
          <div className="space-y-2">
            {tags.map((tag) => (
              <div
                key={tag.id}
                className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800 rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full"
                    style={{ backgroundColor: tag.color || "#6B7280" }}
                  />
                  <span className="font-medium text-gray-900 dark:text-white">{tag.name}</span>
                  {tag._count && (
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      ({tag._count.trips}{" "}
                      {tag._count.trips === 1 ? "trip" : "trips"})
                    </span>
                  )}
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(tag)}
                    className="px-3 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteTag(tag.id)}
                    className="px-3 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
