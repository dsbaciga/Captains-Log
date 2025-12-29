import { useState, useEffect, useId, useMemo } from "react";
import type { JournalEntry } from "../types/journalEntry";
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
  // Compute default entry date from trip start date
  const defaultEntryDate = useMemo(() => {
    return tripStartDate ? tripStartDate.slice(0, 10) : "";
  }, [tripStartDate]);

  // Service adapter for useManagerCRUD hook (memoized to prevent infinite loops)
  const journalServiceAdapter = useMemo(() => ({
    getByTrip: journalEntryService.getJournalEntriesByTrip,
    create: journalEntryService.createJournalEntry,
    update: journalEntryService.updateJournalEntry,
    delete: journalEntryService.deleteJournalEntry,
  }), []);

  // Initialize CRUD hook
  const manager = useManagerCRUD<JournalEntry>(journalServiceAdapter, tripId, {
    itemName: "journal entry",
    onUpdate,
  });

  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const [activities, setActivities] = useState<Activity[]>([]);
  const [lodgings, setLodgings] = useState<Lodging[]>([]);
  const [transportations, setTransportations] = useState<Transportation[]>([]);
  const [expandedId, setExpandedId] = useState<number | null>(null);

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
  const locationsFieldId = useId();
  const entryDateFieldId = useId();
  const contentFieldId = useId();
  const activitiesFieldId = useId();
  const lodgingsFieldId = useId();
  const transportationsFieldId = useId();

  useEffect(() => {
    loadTripEntities();
  }, [tripId]);

  const loadTripEntities = async () => {
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
  };

  const resetForm = () => {
    resetFields();
    manager.setEditingId(null);
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

    // Scroll to top to show the edit form
    window.scrollTo({ top: 0, behavior: 'smooth' });
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
        resetForm();
        manager.closeForm();
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

  const handleMultiSelectChange = (
    fieldName: 'locationIds' | 'activityIds' | 'lodgingIds' | 'transportationIds',
    selectElement: HTMLSelectElement
  ) => {
    const selectedOptions = Array.from(selectElement.selectedOptions);
    const selectedIds = selectedOptions.map(option => parseInt(option.value));
    setField(fieldName, selectedIds);
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
          {manager.showForm ? "Cancel" : "+ New Entry"}
        </button>
      </div>

      {manager.showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {manager.editingId ? "Edit Entry" : "New Journal Entry"}
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
            <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Link to Trip Items (optional)
              </h4>
              <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
                Hold Ctrl (Windows) or Cmd (Mac) to select multiple items
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Locations */}
                {locations.length > 0 && (
                  <div>
                    <label
                      htmlFor={locationsFieldId}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Locations ({formValues.locationIds.length} selected)
                    </label>
                    <select
                      id={locationsFieldId}
                      multiple
                      value={formValues.locationIds.map(String)}
                      onChange={(e) => handleMultiSelectChange('locationIds', e.target)}
                      className="input h-24"
                      size={4}
                    >
                      {locations.map((loc) => (
                        <option key={loc.id} value={loc.id}>
                          {loc.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Activities */}
                {activities.length > 0 && (
                  <div>
                    <label
                      htmlFor={activitiesFieldId}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Activities ({formValues.activityIds.length} selected)
                    </label>
                    <select
                      id={activitiesFieldId}
                      multiple
                      value={formValues.activityIds.map(String)}
                      onChange={(e) => handleMultiSelectChange('activityIds', e.target)}
                      className="input h-24"
                      size={4}
                    >
                      {activities.map((activity) => (
                        <option key={activity.id} value={activity.id}>
                          {activity.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Lodging */}
                {lodgings.length > 0 && (
                  <div>
                    <label
                      htmlFor={lodgingsFieldId}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Lodging ({formValues.lodgingIds.length} selected)
                    </label>
                    <select
                      id={lodgingsFieldId}
                      multiple
                      value={formValues.lodgingIds.map(String)}
                      onChange={(e) => handleMultiSelectChange('lodgingIds', e.target)}
                      className="input h-24"
                      size={4}
                    >
                      {lodgings.map((lodging) => (
                        <option key={lodging.id} value={lodging.id}>
                          {lodging.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Transportation */}
                {transportations.length > 0 && (
                  <div>
                    <label
                      htmlFor={transportationsFieldId}
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Transportation ({formValues.transportationIds.length} selected)
                    </label>
                    <select
                      id={transportationsFieldId}
                      multiple
                      value={formValues.transportationIds.map(String)}
                      onChange={(e) => handleMultiSelectChange('transportationIds', e.target)}
                      className="input h-24"
                      size={4}
                    >
                      {transportations.map((transport) => (
                        <option key={transport.id} value={transport.id}>
                          {transport.type}: {transport.fromLocationName || 'Start'} → {transport.toLocationName || 'End'}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            <button type="submit" className="btn btn-primary">
              {manager.editingId ? "Update" : "Create"} Entry
            </button>
          </form>
        </div>
      )}

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
                className="bg-white dark:bg-gray-800 rounded-lg shadow hover:shadow-lg transition-shadow"
              >
                <div className="p-6">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex-1">
                      <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-1">
                        {entry.title || "Untitled Entry"}
                      </h3>
                      <div className="flex items-center gap-3 text-sm text-gray-600 dark:text-gray-400">
                        {entry.date && <span>📅 {formatDate(entry.date)}</span>}
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
