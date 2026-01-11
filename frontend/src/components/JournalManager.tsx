import { useState, useEffect, useId, useMemo, useCallback } from "react";
import type { JournalEntry, CreateJournalEntryInput, UpdateJournalEntryInput } from "../types/journalEntry";
import type { Location } from "../types/location";
import type { Activity } from "../types/activity";
import type { Lodging } from "../types/lodging";
import type { Transportation } from "../types/transportation";
import journalEntryService from "../services/journalEntry.service";
import activityService from "../services/activity.service";
import lodgingService from "../services/lodging.service";
import transportationService from "../services/transportation.service";
import toast from "react-hot-toast";
import EmptyState from "./EmptyState";
import FormModal from "./FormModal";
import ChipSelector from "./ChipSelector";
import { useFormFields } from "../hooks/useFormFields";
import { useManagerCRUD } from "../hooks/useManagerCRUD";
import { useConfirmDialog } from "../hooks/useConfirmDialog";

interface JournalManagerProps {
  tripId: number;
  locations: Location[];
  tripStartDate?: string | null;
  onUpdate?: () => void;
}

export default function JournalManager({
  tripId,
  locations,
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

  const [activities, setActivities] = useState<Activity[]>([]);
  const [lodgings, setLodgings] = useState<Lodging[]>([]);
  const [transportations, setTransportations] = useState<Transportation[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);
  const [keepFormOpenAfterSave, setKeepFormOpenAfterSave] = useState(false);

  // Use the new useFormFields hook to manage all form state
  // Memoize initial form values to include trip start date as default
  const initialFormValues = useMemo(() => ({
    title: "",
    content: "",
    locationIds: [] as number[],
    activityIds: [] as number[],
    lodgingIds: [] as number[],
    transportationIds: [] as number[],
    entryDate: defaultEntryDate,
  }), [defaultEntryDate]);

  const { values: formValues, setField, resetFields, setAllFields } = useFormFields(initialFormValues);

  // Generate IDs for accessibility
  const titleFieldId = useId();
  const entryDateFieldId = useId();
  const contentFieldId = useId();

  const loadTripEntities = useCallback(async () => {
    try {
      const [activitiesData, lodgingsData, transportationsData] = await Promise.all([
        activityService.getActivitiesByTrip(tripId),
        lodgingService.getLodgingByTrip(tripId),
        transportationService.getTransportationByTrip(tripId),
      ]);
      setActivities(activitiesData);
      setLodgings(lodgingsData);
      setTransportations(transportationsData);
    } catch (error) {
      console.error("Failed to load trip entities", error);
    }
  }, [tripId]);

  useEffect(() => {
    loadTripEntities();
  }, [loadTripEntities]);

  const resetForm = () => {
    resetFields();
    manager.setEditingId(null);
    setKeepFormOpenAfterSave(false);
  };

  const handleEdit = (entry: JournalEntry) => {
    setAllFields({
      title: entry.title || "",
      content: entry.content,
      locationIds: entry.locationAssignments?.map(la => la.location.id) || [],
      activityIds: entry.activityAssignments?.map(aa => aa.activity.id) || [],
      lodgingIds: entry.lodgingAssignments?.map(la => la.lodging.id) || [],
      transportationIds: entry.transportationAssignments?.map(ta => ta.transportation.id) || [],
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
        locationIds: formValues.locationIds,
        activityIds: formValues.activityIds,
        lodgingIds: formValues.lodgingIds,
        transportationIds: formValues.transportationIds,
        entryDate: formValues.entryDate || null,
      };
      const success = await manager.handleUpdate(manager.editingId, updateData);
      if (success) {
        resetForm();
        manager.closeForm();
      }
    } else {
      // For creates
      const createData = {
        tripId,
        title: formValues.title,
        content: formValues.content,
        locationIds: formValues.locationIds.length > 0 ? formValues.locationIds : undefined,
        activityIds: formValues.activityIds.length > 0 ? formValues.activityIds : undefined,
        lodgingIds: formValues.lodgingIds.length > 0 ? formValues.lodgingIds : undefined,
        transportationIds: formValues.transportationIds.length > 0 ? formValues.transportationIds : undefined,
        entryDate: formValues.entryDate || undefined,
      };
      const success = await manager.handleCreate(createData);
      if (success) {
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
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white min-w-0 flex-1 truncate">
          Journal
        </h2>
        <button
          onClick={() => {
            resetForm();
            manager.toggleForm();
          }}
          className="btn btn-primary whitespace-nowrap flex-shrink-0"
        >
          + New Entry
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
                  document.getElementById('journal-form')?.requestSubmit();
                }}
                className="btn btn-secondary"
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

            {/* Associated Entities Section */}
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4 space-y-4">
              <div>
                <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  Link to Trip Items (optional)
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                  Click chips to select/deselect items
                </p>
              </div>

              <ChipSelector
                items={locations}
                selectedIds={formValues.locationIds}
                onChange={(ids) => setField('locationIds', ids)}
                getId={(loc) => loc.id}
                getLabel={(loc) => loc.name}
                label="📍 Locations"
                emptyMessage="No locations created yet"
                searchPlaceholder="Search locations..."
              />

              <ChipSelector
                items={activities}
                selectedIds={formValues.activityIds}
                onChange={(ids) => setField('activityIds', ids)}
                getId={(activity) => activity.id}
                getLabel={(activity) => activity.name}
                label="🎯 Activities"
                emptyMessage="No activities created yet"
                searchPlaceholder="Search activities..."
              />

              <ChipSelector
                items={lodgings}
                selectedIds={formValues.lodgingIds}
                onChange={(ids) => setField('lodgingIds', ids)}
                getId={(lodging) => lodging.id}
                getLabel={(lodging) => lodging.name}
                label="🏨 Lodging"
                emptyMessage="No lodging created yet"
                searchPlaceholder="Search lodging..."
              />

              <ChipSelector
                items={transportations}
                selectedIds={formValues.transportationIds}
                onChange={(ids) => setField('transportationIds', ids)}
                getId={(transport) => transport.id}
                getLabel={(transport) => {
                  const fromName = transport.fromLocation?.name || transport.fromLocationName || 'Start';
                  const toName = transport.toLocation?.name || transport.toLocationName || 'End';
                  return `${transport.type}: ${fromName} → ${toName}`;
                }}
                label="🚗 Transportation"
                emptyMessage="No transportation created yet"
                searchPlaceholder="Search transportation..."
              />
            </div>
          </form>
        </FormModal>

      {manager.items.length === 0 ? (
        <EmptyState
          icon="📔"
          message="No journal entries yet"
          subMessage="Start documenting your adventure by creating your first entry!"
        />
      ) : (
        <div className="space-y-4">
          {manager.items.map((entry) => {
            const isExpanded = expandedId === entry.id;
            const hasLinkedItems =
              (entry.locationAssignments?.length || 0) > 0 ||
              (entry.activityAssignments?.length || 0) > 0 ||
              (entry.lodgingAssignments?.length || 0) > 0 ||
              (entry.transportationAssignments?.length || 0) > 0;

            return (
              <div
                key={entry.id}
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
                    <div className="flex gap-2 flex-shrink-0 self-start">
                      <button
                        onClick={() => handleEdit(entry)}
                        className="btn btn-secondary text-xs sm:text-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(entry.id)}
                        className="btn btn-danger text-xs sm:text-sm"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  {/* Linked Items */}
                  {hasLinkedItems && (
                    <div className="mb-4 flex flex-wrap gap-2">
                      {entry.locationAssignments?.map((la) => (
                        <span
                          key={`loc-${la.location.id}`}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300"
                        >
                          📍 {la.location.name}
                        </span>
                      ))}
                      {entry.activityAssignments?.map((aa) => (
                        <span
                          key={`act-${aa.activity.id}`}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300"
                        >
                          🎯 {aa.activity.name}
                        </span>
                      ))}
                      {entry.lodgingAssignments?.map((la) => (
                        <span
                          key={`lodg-${la.lodging.id}`}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300"
                        >
                          🏨 {la.lodging.name}
                        </span>
                      ))}
                      {entry.transportationAssignments?.map((ta) => (
                        <span
                          key={`trans-${ta.transportation.id}`}
                          className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-300"
                        >
                          🚗 {ta.transportation.type}
                        </span>
                      ))}
                    </div>
                  )}

                  <div className="prose prose-sm max-w-none">
                    <p className="text-gray-700 dark:text-gray-300 whitespace-pre-wrap">
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
