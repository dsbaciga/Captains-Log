import { useState, useEffect, useId } from "react";
import type { JournalEntry } from "../types/journalEntry";
import type { Location } from "../types/location";
import journalEntryService from "../services/journalEntry.service";
import toast from "react-hot-toast";
import EmptyState from "./EmptyState";
import { useFormFields } from "../hooks/useFormFields";

interface JournalManagerProps {
  tripId: number;
  locations: Location[];
  onUpdate?: () => void;
}

export default function JournalManager({
  tripId,
  locations,
  onUpdate,
}: JournalManagerProps) {
  const [entries, setEntries] = useState<JournalEntry[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [expandedId, setExpandedId] = useState<number | null>(null);

  // Use the new useFormFields hook to manage all form state
  const { values: formValues, setField, resetFields, setAllFields } = useFormFields({
    title: "",
    content: "",
    locationId: undefined as number | undefined,
    entryDate: "",
  });

  // Generate IDs for accessibility
  const titleFieldId = useId();
  const locationFieldId = useId();
  const entryDateFieldId = useId();
  const contentFieldId = useId();

  useEffect(() => {
    loadEntries();
  }, [tripId]);

  const loadEntries = async () => {
    try {
      const data = await journalEntryService.getJournalEntriesByTrip(tripId);
      setEntries(data);
    } catch (error) {
      toast.error("Failed to load journal entries");
    }
  };

  const resetForm = () => {
    resetFields();
    setEditingId(null);
  };

  const handleEdit = (entry: JournalEntry) => {
    setEditingId(entry.id);
    setAllFields({
      title: entry.title,
      content: entry.content,
      locationId: entry.locationId || undefined,
      entryDate: entry.entryDate
        ? new Date(entry.entryDate).toISOString().slice(0, 16)
        : "",
    });
    setShowForm(true);
    setExpandedId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formValues.title.trim() || !formValues.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    try {
      if (editingId) {
        // For updates, send null to clear empty fields
        const updateData = {
          tripId,
          title: formValues.title,
          content: formValues.content,
          locationId: formValues.locationId,
          entryDate: formValues.entryDate || null,
        };
        await journalEntryService.updateJournalEntry(editingId, updateData);
        toast.success("Journal entry updated");
      } else {
        // For creates, use undefined to omit optional fields
        const createData = {
          tripId,
          title: formValues.title,
          content: formValues.content,
          locationId: formValues.locationId,
          entryDate: formValues.entryDate || undefined,
        };
        await journalEntryService.createJournalEntry(createData);
        toast.success("Journal entry added");
      }

      resetForm();
      setShowForm(false);
      loadEntries();
      onUpdate?.();
    } catch (error) {
      toast.error("Failed to save journal entry");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this journal entry?")) return;

    try {
      await journalEntryService.deleteJournalEntry(id);
      toast.success("Journal entry deleted");
      loadEntries();
      onUpdate?.();
    } catch (error) {
      toast.error("Failed to delete journal entry");
    }
  };

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString("en-US", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const truncateContent = (text: string, maxLength: number = 200) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + "...";
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Journal
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="btn btn-primary"
        >
          {showForm ? "Cancel" : "+ New Entry"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Entry" : "New Journal Entry"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label
                htmlFor={titleFieldId}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Title *
              </label>
              <input
                type="text"
                id={titleFieldId}
                value={formValues.title}
                onChange={(e) => setField('title', e.target.value)}
                className="input"
                placeholder="Day 1 in Paris"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={locationFieldId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Location
                </label>
                <select
                  id={locationFieldId}
                  value={formValues.locationId || ""}
                  onChange={(e) =>
                    setField('locationId', e.target.value ? parseInt(e.target.value) : undefined)
                  }
                  className="input"
                >
                  <option value="">Select location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={entryDateFieldId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Entry Date
                </label>
                <input
                  type="datetime-local"
                  id={entryDateFieldId}
                  value={formValues.entryDate}
                  onChange={(e) => setField('entryDate', e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor={contentFieldId}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Content *
              </label>
              <textarea
                id={contentFieldId}
                value={formValues.content}
                onChange={(e) => setField('content', e.target.value)}
                rows={12}
                className="input font-mono text-sm"
                placeholder="Write your journal entry here...

You can use simple formatting:
- Line breaks for paragraphs
- Lists with - or *
- Emphasis with ALL CAPS

Tell your story!"
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                {formValues.content.length} characters
              </p>
            </div>

            <button type="submit" className="btn btn-primary">
              {editingId ? "Update" : "Create"} Entry
            </button>
          </form>
        </div>
      )}

      {entries.length === 0 ? (
        <EmptyState
          icon="📔"
          message="No journal entries yet"
          subMessage="Start documenting your adventure by creating your first entry!"
        />
      ) : (
        <div className="space-y-4">
          {entries.map((entry) => {
            const isExpanded = expandedId === entry.id;
            return (
              <div
                key={entry.id}
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 mb-1">
                        {entry.title}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        <span>📅 {formatDate(entry.entryDate)}</span>
                        {entry.location && (
                          <span>📍 {entry.location.name}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="btn btn-secondary text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="btn btn-danger text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 whitespace-pre-wrap">
                      {isExpanded
                        ? entry.content
                        : truncateContent(entry.content)}
                    </p>
                  </div>

                  {entry.content.length > 200 && (
                    <button
                      onClick={() =>
                        setExpandedId(isExpanded ? null : entry.id)
                      }
                      className="mt-3 text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium"
                    >
                      {isExpanded ? "Show less" : "Read more →"}
                    </button>
                  )}
                </div>

                <div className="px-6 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 dark:text-gray-400">
                  {entry.updatedAt !== entry.createdAt
                    ? `Last edited ${new Date(
                        entry.updatedAt
                      ).toLocaleDateString()}`
                    : `Created ${new Date(
                        entry.createdAt
                      ).toLocaleDateString()}`}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
