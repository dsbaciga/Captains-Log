import { useState, useId, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import type { JournalEntry, CreateJournalEntryInput, UpdateJournalEntryInput } from "../types/journalEntry";
import journalEntryService from "../services/journalEntry.service";
import toast from "react-hot-toast";
import EmptyState, { EmptyIllustrations } from "./EmptyState";
import LinkButton from "./LinkButton";
import LinkedEntitiesDisplay from "./LinkedEntitiesDisplay";
import FormModal from "./FormModal";
import { useFormFields } from "../hooks/useFormFields";
import { useManagerCRUD } from "../hooks/useManagerCRUD";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useTripLinkSummary } from "../hooks/useTripLinkSummary";

interface JournalManagerProps {
  tripId: number;
  tripStartDate?: string | null;
  onUpdate?: () => void;
}

export default function JournalManager({
  tripId,
  tripStartDate,
  onUpdate,
}: JournalManagerProps) {
  // Compute default entry date from trip start date (set to noon)
  const defaultEntryDate = useMemo(() => {
    if (!tripStartDate) return "";
    // Extract just the date portion (YYYY-MM-DD) and append time of noon (12:00)
    const dateOnly = tripStartDate.slice(0, 10);
    return `${dateOnly}T12:00`;
  }, [tripStartDate]);

  // Service adapter for useManagerCRUD hook (memoized to prevent infinite loops)
  const journalServiceAdapter = useMemo(() => ({
    getByTrip: journalEntryService.getJournalEntriesByTrip,
    create: journalEntryService.createJournalEntry,
    update: journalEntryService.updateJournalEntry,
    delete: journalEntryService.deleteJournalEntry,
  }), []);

  // Initialize CRUD hook
  const manager = useManagerCRUD<JournalEntry, CreateJournalEntryInput, UpdateJournalEntryInput>(journalServiceAdapter, tripId, {
    itemName: "journal entry",
    onUpdate,
  });

  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  // Link summary hook for displaying link counts
  const { getLinkSummary, invalidate: invalidateLinkSummary } = useTripLinkSummary(tripId);

  const [searchParams, setSearchParams] = useSearchParams();
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [keepFormOpenAfterSave, setKeepFormOpenAfterSave] = useState(false);
  const [pendingEditId, setPendingEditId] = useState<number | null>(null);

  // Use the new useFormFields hook to manage all form state
  // Memoize initial form values to include trip start date as default
  const initialFormValues = useMemo(() => ({
    title: "",
    content: "",
    entryDate: defaultEntryDate,
  }), [defaultEntryDate]);

  const { values: formValues, setField, resetFields, setAllFields } = useFormFields(initialFormValues);

  // Generate IDs for accessibility
  const titleFieldId = useId();
  const entryDateFieldId = useId();
  const contentFieldId = useId();

  // Handle edit param from URL (for navigating from EntityDetailModal)
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId) {
      const itemId = parseInt(editId, 10);
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("edit");
      setSearchParams(newParams, { replace: true });
      setPendingEditId(itemId);
    }
  }, [searchParams, setSearchParams]);

  // Handle pending edit when items are loaded
  useEffect(() => {
    if (pendingEditId && manager.items.length > 0 && !manager.loading) {
      const item = manager.items.find((j) => j.id === pendingEditId);
      if (item) {
        setAllFields({
          title: item.title || "",
          content: item.content,
          entryDate: item.date
            ? new Date(item.date).toISOString().slice(0, 16)
            : "",
        });
        manager.openEditForm(item.id);
        setExpandedId(null);
      }
      setPendingEditId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEditId, manager.items, manager.loading, setAllFields]);

  const resetForm = () => {
    resetFields();
    manager.setEditingId(null);
    setKeepFormOpenAfterSave(false);
  };

  const handleEdit = (entry: JournalEntry) => {
    setAllFields({
      title: entry.title || "",
      content: entry.content,
      entryDate: entry.date
        ? new Date(entry.date).toISOString().slice(0, 16)
        : "",
    });
    manager.openEditForm(entry.id);
    setExpandedId(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formValues.title.trim() || !formValues.content.trim()) {
      toast.error("Title and content are required");
      return;
    }

    if (manager.editingId) {
      // For updates
      const updateData = {
        title: formValues.title,
        content: formValues.content,
        entryDate: formValues.entryDate || null,
      };
      const success = await manager.handleUpdate(manager.editingId, updateData);
      if (success) {
        invalidateLinkSummary(); // Refresh link counts
        resetForm();
        manager.closeForm();
      }
    } else {
      // For creates
      const createData = {
        tripId,
        title: formValues.title,
        content: formValues.content,
        entryDate: formValues.entryDate || undefined,
      };
      const success = await manager.handleCreate(createData);
      if (success) {
        invalidateLinkSummary(); // Refresh link counts
        if (keepFormOpenAfterSave) {
          // Reset form but keep modal open for quick successive entries
          resetFields();
          setKeepFormOpenAfterSave(false);
          // Focus first input for quick data entry
          setTimeout(() => {
            const firstInput = document.querySelector<HTMLInputElement>(`#${titleFieldId}`);
            firstInput?.focus();
          }, 50);
        } else {
          // Standard flow: reset and close
          resetForm();
          manager.closeForm();
        }
      }
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: "Delete Journal Entry",
      message: "Delete this journal entry? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    await manager.handleDelete(id);
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

  const handleCloseForm = () => {
    resetFields();
    manager.setEditingId(null);
    manager.closeForm();
  };

  return (
    <div className="space-y-6">
      <ConfirmDialogComponent />
      <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:justify-between sm:items-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Journal
        </h2>
        <button
          type="button"
          onClick={() => {
            resetForm();
            manager.toggleForm();
          }}
          className="btn btn-primary text-sm sm:text-base whitespace-nowrap"
        >
          <span className="sm:hidden">+ Add</span>
          <span className="hidden sm:inline">+ New Entry</span>
        </button>
      </div>

      {/* Form Modal */}
      <FormModal
        isOpen={manager.showForm}
        onClose={handleCloseForm}
        title={manager.editingId ? "Edit Entry" : "New Journal Entry"}
        icon="📔"
        formId="journal-form"
        footer={
          <>
            <button
              type="button"
              onClick={handleCloseForm}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            {!manager.editingId && (
              <button
                type="button"
                onClick={() => {
                  setKeepFormOpenAfterSave(true);
                  (document.getElementById('journal-form') as HTMLFormElement)?.requestSubmit();
                }}
                className="btn btn-secondary text-sm whitespace-nowrap hidden sm:block"
              >
                Save & Add Another
              </button>
            )}
            <button
              type="submit"
              form="journal-form"
              className="btn btn-primary"
            >
              {manager.editingId ? "Update" : "Create"} Entry
            </button>
          </>
        }
      >
        <form id="journal-form" onSubmit={handleSubmit} className="space-y-4">
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

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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

            {/* Link to other entities note */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-3">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  💡 <strong>Tip:</strong> After creating your journal entry, use the link button (🔗) to connect it to locations, activities, lodging, transportation, photos, or albums.
                </p>
              </div>
            </div>
          </form>
        </FormModal>

      {manager.items.length === 0 ? (
        <EmptyState
          icon={<EmptyIllustrations.NoJournalEntries />}
          message="Tell Your Story"
          subMessage="Every journey has a story worth telling. Write about your experiences, capture the emotions, and preserve the small moments that make travel unforgettable. Your future self will thank you."
          actionLabel="Write Your First Entry"
          onAction={() => {
            resetFields();
            manager.toggleForm();
          }}
        />
      ) : (
        <div className="space-y-4">
          {manager.items.map((entry) => {
            const isExpanded = expandedId === entry.id;

            return (
              <div
                key={entry.id}
                data-entity-id={`journal_entry-${entry.id}`}
                className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-3 mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                        {entry.title || "Untitled Entry"}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        {entry.date && <span>📅 {formatDate(entry.date)}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0 self-start">
                      <LinkButton
                        tripId={tripId}
                        entityType="JOURNAL_ENTRY"
                        entityId={entry.id}
                        linkSummary={getLinkSummary('JOURNAL_ENTRY', entry.id)}
                        onUpdate={invalidateLinkSummary}
                        size="sm"
                      />
                      <button
                        type="button"
                        onClick={() => handleEdit(entry)}
                        className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap text-sm sm:text-base"
                      >
                        Edit
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(entry.id)}
                        className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 whitespace-nowrap text-sm sm:text-base"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
                      {isExpanded
                        ? entry.content
                        : truncateContent(entry.content)}
                    </p>
                  </div>

                  {entry.content.length > 200 && (
                    <button
                      type="button"
                      onClick={() =>
                        setExpandedId(isExpanded ? null : entry.id)
                      }
                      className="mt-3 text-blue-600 dark:text-blue-400 hover:text-blue-800 text-sm font-medium"
                    >
                      {isExpanded ? "Show less" : "Read more →"}
                    </button>
                  )}

                  {/* Entity Links (from EntityLink system) */}
                  <LinkedEntitiesDisplay
                    tripId={tripId}
                    entityType="JOURNAL_ENTRY"
                    entityId={entry.id}
                    compact
                  />
                </div>

                <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-600 text-xs text-gray-500 dark:text-gray-400">
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
