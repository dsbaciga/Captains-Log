import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Activity, CreateActivityInput, UpdateActivityInput } from "../types/activity";
import type { Location } from "../types/location";
import type { ActivityCategory } from "../types/user";
import activityService from "../services/activity.service";
import userService from "../services/user.service";
import toast from "react-hot-toast";
import AssociatedAlbums from "./AssociatedAlbums";
import JournalEntriesButton from "./JournalEntriesButton";
import LinkButton from "./LinkButton";
import LinkedEntitiesDisplay from "./LinkedEntitiesDisplay";
import LocationQuickAdd from "./LocationQuickAdd";
import FormModal from "./FormModal";
import FormSection, { CollapsibleSection } from "./FormSection";
import {
  formatDateTimeInTimezone,
  formatDateInTimezone,
  convertISOToDateTimeLocal,
  convertDateTimeLocalToISO,
} from "../utils/timezone";
import { useFormFields } from "../hooks/useFormFields";
import { useManagerCRUD } from "../hooks/useManagerCRUD";
import { useTripLinkSummary } from "../hooks/useTripLinkSummary";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import EmptyState, { EmptyIllustrations } from "./EmptyState";
import TimezoneSelect from "./TimezoneSelect";
import CostCurrencyFields from "./CostCurrencyFields";
import BookingFields from "./BookingFields";
import { ListItemSkeleton } from "./SkeletonLoader";
import { getLastUsedCurrency, saveLastUsedCurrency } from "../utils/currencyStorage";

interface ActivityManagerProps {
  tripId: number;
  locations: Location[];
  tripTimezone?: string | null;
  tripStartDate?: string | null;
  onUpdate?: () => void;
}

interface ActivityFormFields {
  name: string;
  description: string;
  category: string;
  locationId: number | undefined;
  parentId: number | undefined;
  allDay: boolean;
  startDate: string;
  startTime: string;
  endDate: string;
  endTime: string;
  timezone: string;
  cost: string;
  currency: string;
  bookingUrl: string;
  bookingReference: string;
  notes: string;
}

const initialFormState: ActivityFormFields = {
  name: "",
  description: "",
  category: "",
  locationId: undefined,
  parentId: undefined,
  allDay: false,
  startDate: "",
  startTime: "",
  endDate: "",
  endTime: "",
  timezone: "",
  cost: "",
  currency: "USD",
  bookingUrl: "",
  bookingReference: "",
  notes: "",
};

export default function ActivityManager({
  tripId,
  locations,
  tripTimezone,
  tripStartDate,
  onUpdate,
}: ActivityManagerProps) {
  // Compute initial form state with trip start date as default
  const getInitialFormState = useMemo((): ActivityFormFields => {
    const defaultDate = tripStartDate ? tripStartDate.slice(0, 10) : "";
    return {
      ...initialFormState,
      startDate: defaultDate,
      endDate: defaultDate,
      currency: getLastUsedCurrency(), // Remember last-used currency
    };
  }, [tripStartDate]);

  // Service adapter for useManagerCRUD hook (memoized to prevent infinite loops)
  const activityServiceAdapter = useMemo(() => ({
    getByTrip: activityService.getActivitiesByTrip,
    create: activityService.createActivity,
    update: activityService.updateActivity,
    delete: activityService.deleteActivity,
  }), []);

  // Initialize CRUD hook
  const manager = useManagerCRUD<Activity, CreateActivityInput, UpdateActivityInput>(activityServiceAdapter, tripId, {
    itemName: "activity",
    onUpdate,
  });

  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const { getLinkSummary, invalidate: invalidateLinkSummary } = useTripLinkSummary(tripId);

  const [searchParams, setSearchParams] = useSearchParams();
  const [activityCategories, setActivityCategories] = useState<
    ActivityCategory[]
  >([]);
  const [showLocationQuickAdd, setShowLocationQuickAdd] = useState(false);
  const [localLocations, setLocalLocations] = useState<Location[]>(locations);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [keepFormOpenAfterSave, setKeepFormOpenAfterSave] = useState(false);
  const [pendingEditId, setPendingEditId] = useState<number | null>(null);

  const { values, handleChange, reset } =
    useFormFields<ActivityFormFields>(getInitialFormState);

  useEffect(() => {
    loadUserCategories();
  }, [tripId]);

  // Sync localLocations with locations prop
  useEffect(() => {
    setLocalLocations(locations);
  }, [locations]);

  // Handle edit param from URL (for navigating from EntityDetailModal)
  useEffect(() => {
    const editId = searchParams.get("edit");
    if (editId) {
      const itemId = parseInt(editId, 10);
      // Clear the edit param from URL
      const newParams = new URLSearchParams(searchParams);
      newParams.delete("edit");
      setSearchParams(newParams, { replace: true });
      // Set pending edit ID to be handled when items are loaded
      setPendingEditId(itemId);
    }
  }, [searchParams, setSearchParams]);

  // Handle pending edit when items are loaded
  useEffect(() => {
    if (pendingEditId && manager.items.length > 0 && !manager.loading) {
      const item = manager.items.find((a) => a.id === pendingEditId);
      if (item) {
        // Copy handleEdit logic - we need to inline it since it's defined later
        setShowMoreOptions(true);
        handleChange("name", item.name);
        handleChange("description", item.description || "");
        handleChange("category", item.category || "");
        handleChange("locationId", item.locationId || undefined);
        handleChange("parentId", item.parentId || undefined);
        handleChange("allDay", item.allDay);
        handleChange("timezone", item.timezone || "");
        handleChange("cost", item.cost?.toString() || "");
        handleChange("currency", item.currency || "USD");
        handleChange("bookingUrl", item.bookingUrl || "");
        handleChange("bookingReference", item.bookingReference || "");
        handleChange("notes", item.notes || "");

        const effectiveTz = item.timezone || tripTimezone || 'UTC';
        if (item.allDay) {
          if (item.startTime) {
            const startDateTime = convertISOToDateTimeLocal(item.startTime, effectiveTz);
            handleChange("startDate", startDateTime.slice(0, 10));
          }
          if (item.endTime) {
            const endDateTime = convertISOToDateTimeLocal(item.endTime, effectiveTz);
            handleChange("endDate", endDateTime.slice(0, 10));
          }
          handleChange("startTime", "");
          handleChange("endTime", "");
        } else {
          if (item.startTime) {
            const startDateTime = convertISOToDateTimeLocal(item.startTime, effectiveTz);
            handleChange("startDate", startDateTime.slice(0, 10));
            handleChange("startTime", startDateTime.slice(11));
          }
          if (item.endTime) {
            const endDateTime = convertISOToDateTimeLocal(item.endTime, effectiveTz);
            handleChange("endDate", endDateTime.slice(0, 10));
            handleChange("endTime", endDateTime.slice(11));
          }
        }

        manager.openEditForm(item.id);
      }
      setPendingEditId(null);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pendingEditId, manager.items, manager.loading, tripTimezone, handleChange]);

  // Auto-fill: End Time = Start Time + 1 Hour
  useEffect(() => {
    // Only auto-fill when creating (not editing) and if not all-day
    if (!manager.editingId && !values.allDay && values.startDate && values.startTime) {
      // If end time is empty, calculate it as start + 1 hour
      if (!values.endTime || !values.endDate) {
        const [hours, minutes] = values.startTime.split(':').map(Number);
        const newHours = (hours + 1) % 24; // Add 1 hour, wrap at midnight
        const endTime = `${String(newHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

        // End date is same as start date (unless we wrapped past midnight)
        let endDate = values.startDate;
        if (newHours < hours) {
          // We wrapped past midnight, increment date
          const date = new Date(values.startDate);
          date.setDate(date.getDate() + 1);
          endDate = date.toISOString().slice(0, 10);
        }

        if (!values.endTime) handleChange('endTime', endTime);
        if (!values.endDate) handleChange('endDate', endDate);
      }
    }
  }, [values.startDate, values.startTime, values.allDay, manager.editingId]);

  // Auto-fill: Sequential Activity Chaining - use last activity's end time as start time
  useEffect(() => {
    // Only when creating (not editing) and form just opened
    if (!manager.editingId && manager.showForm && values.startDate === getInitialFormState.startDate) {
      // Find the most recent activity (by end time)
      const sortedActivities = [...manager.items]
        .filter(a => a.endTime)
        .sort((a, b) => new Date(b.endTime!).getTime() - new Date(a.endTime!).getTime());

      if (sortedActivities.length > 0) {
        const lastActivity = sortedActivities[0];
        const effectiveTz = lastActivity.timezone || tripTimezone || 'UTC';

        // Convert the last activity's end time to datetime-local format
        const endDateTime = convertISOToDateTimeLocal(lastActivity.endTime!, effectiveTz);
        const [date, time] = endDateTime.split('T');

        // Auto-fill start date and time
        handleChange('startDate', date);
        handleChange('startTime', time);

        // Also inherit timezone and location if they were set
        if (lastActivity.timezone && !values.timezone) {
          handleChange('timezone', lastActivity.timezone);
        }
        if (lastActivity.locationId && !values.locationId) {
          handleChange('locationId', lastActivity.locationId);
        }
      }
    }
  }, [manager.showForm, manager.editingId]);

  const loadUserCategories = async () => {
    try {
      const user = await userService.getMe();
      setActivityCategories(user.activityCategories || []);
    } catch {
      console.error("Failed to load activity categories");
    }
  };

  const handleLocationCreated = (locationId: number, locationName: string) => {
    // Add the new location to local state
    const newLocation: Location = {
      id: locationId,
      name: locationName,
      tripId,
      parentId: null,
      address: null,
      latitude: null,
      longitude: null,
      categoryId: null,
      visitDatetime: null,
      visitDurationMinutes: null,
      notes: null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    setLocalLocations([...localLocations, newLocation]);
    handleChange("locationId", locationId);
    setShowLocationQuickAdd(false);
  };

  const resetForm = () => {
    reset();
    manager.setEditingId(null);
    setShowMoreOptions(false);
    setKeepFormOpenAfterSave(false);
  };

  const handleEdit = (activity: Activity) => {
    setShowMoreOptions(true); // Always show all options when editing
    handleChange("name", activity.name);
    handleChange("description", activity.description || "");
    handleChange("category", activity.category || "");
    handleChange("locationId", activity.locationId || undefined);
    handleChange("parentId", activity.parentId || undefined);
    handleChange("allDay", activity.allDay);
    handleChange("timezone", activity.timezone || "");
    handleChange("cost", activity.cost?.toString() || "");
    handleChange("currency", activity.currency || "USD");
    handleChange("bookingUrl", activity.bookingUrl || "");
    handleChange("bookingReference", activity.bookingReference || "");
    handleChange("notes", activity.notes || "");

    // Determine effective timezone
    const effectiveTz = activity.timezone || tripTimezone || 'UTC';

    // Handle date/time fields based on allDay flag
    if (activity.allDay) {
      // For all-day events, populate just the date fields (convert to local time in timezone)
      if (activity.startTime) {
        const startDateTime = convertISOToDateTimeLocal(activity.startTime, effectiveTz);
        handleChange("startDate", startDateTime.slice(0, 10));
      } else {
        handleChange("startDate", "");
      }
      if (activity.endTime) {
        const endDateTime = convertISOToDateTimeLocal(activity.endTime, effectiveTz);
        handleChange("endDate", endDateTime.slice(0, 10));
      } else {
        handleChange("endDate", "");
      }
      handleChange("startTime", "");
      handleChange("endTime", "");
    } else {
      // For timed events, populate date-time fields (convert to local time in timezone)
      if (activity.startTime) {
        const startDateTime = convertISOToDateTimeLocal(activity.startTime, effectiveTz);
        handleChange("startDate", startDateTime.slice(0, 10));
        handleChange("startTime", startDateTime.slice(11));
      } else {
        handleChange("startDate", "");
        handleChange("startTime", "");
      }
      if (activity.endTime) {
        const endDateTime = convertISOToDateTimeLocal(activity.endTime, effectiveTz);
        handleChange("endDate", endDateTime.slice(0, 10));
        handleChange("endTime", endDateTime.slice(11));
      } else {
        handleChange("endDate", "");
        handleChange("endTime", "");
      }
    }

    manager.openEditForm(activity.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!values.name.trim()) {
      toast.error("Name is required");
      return;
    }

    // Determine effective timezone
    const effectiveTz = values.timezone || tripTimezone || 'UTC';

    // Combine date and time fields into ISO strings, converting from timezone to UTC
    let startTimeISO: string | null = null;
    let endTimeISO: string | null = null;

    if (values.allDay) {
      // For all-day events, use just the date (set time to 00:00 and 23:59:59 in the timezone)
      if (values.startDate) {
        const dateTimeLocal = `${values.startDate}T00:00`;
        startTimeISO = convertDateTimeLocalToISO(dateTimeLocal, effectiveTz);
      }
      if (values.endDate) {
        const dateTimeLocal = `${values.endDate}T23:59`;
        endTimeISO = convertDateTimeLocalToISO(dateTimeLocal, effectiveTz);
      }
    } else {
      // For timed events, combine date and time and convert to UTC
      // If only date is provided without time, default to noon (12:00) to ensure it appears on timeline
      if (values.startDate) {
        const startTime = values.startTime || "12:00";
        const dateTimeLocal = `${values.startDate}T${startTime}`;
        startTimeISO = convertDateTimeLocalToISO(dateTimeLocal, effectiveTz);
      }
      if (values.endDate) {
        const endTime = values.endTime || "12:00";
        const dateTimeLocal = `${values.endDate}T${endTime}`;
        endTimeISO = convertDateTimeLocalToISO(dateTimeLocal, effectiveTz);
      }
    }

    if (manager.editingId) {
      // For updates, send null to clear empty fields
      const updateData = {
        name: values.name,
        description: values.description || null,
        category: values.category || null,
        locationId: values.locationId || null,
        parentId: values.parentId || null,
        allDay: values.allDay,
        startTime: startTimeISO,
        endTime: endTimeISO,
        timezone: values.timezone || null,
        cost: values.cost ? parseFloat(values.cost) : null,
        currency: values.currency || null,
        bookingUrl: values.bookingUrl || null,
        bookingReference: values.bookingReference || null,
        notes: values.notes || null,
      };
      const success = await manager.handleUpdate(manager.editingId, updateData);
      if (success) {
        resetForm();
        manager.closeForm();
      }
    } else {
      // For creates, use undefined to omit optional fields
      const createData = {
        tripId,
        name: values.name,
        description: values.description || undefined,
        category: values.category || undefined,
        locationId: values.locationId,
        parentId: values.parentId,
        allDay: values.allDay,
        startTime: startTimeISO || undefined,
        endTime: endTimeISO || undefined,
        timezone: values.timezone || undefined,
        cost: values.cost ? parseFloat(values.cost) : undefined,
        currency: values.currency || undefined,
        bookingUrl: values.bookingUrl || undefined,
        bookingReference: values.bookingReference || undefined,
        notes: values.notes || undefined,
      };
      const success = await manager.handleCreate(createData);
      if (success) {
        // Save currency for next time
        if (values.currency) {
          saveLastUsedCurrency(values.currency);
        }

        if (keepFormOpenAfterSave) {
          // Reset form but keep modal open for quick successive entries
          reset();
          setShowMoreOptions(false);
          setKeepFormOpenAfterSave(false);
          // Focus first input for quick data entry
          setTimeout(() => {
            const firstInput = document.querySelector<HTMLInputElement>('#activity-name');
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

  // Filter top-level activities (no parent)
  const topLevelActivities = manager.items.filter((a) => !a.parentId);

  // Get children for a parent activity
  const getChildren = (parentId: number) => {
    return manager.items.filter((a) => a.parentId === parentId);
  };

  // Custom delete handler with special confirmation message
  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: "Delete Activity",
      message: "Delete this activity and all its sub-activities? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    await manager.handleDelete(id);
  };

  const formatDateTime = (
    dateTime: string | null,
    timezone?: string | null,
    isAllDay?: boolean
  ) => {
    if (isAllDay) {
      return formatDateInTimezone(dateTime, timezone, tripTimezone);
    }
    return formatDateTimeInTimezone(dateTime, timezone, tripTimezone, {
      includeTimezone: true,
      format: "medium",
    });
  };

  const renderActivity = (activity: Activity, isChild = false) => {
    const children = getChildren(activity.id);

    return (
      <div
        key={activity.id}
        className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-3 sm:p-6 hover:shadow-md transition-shadow ${
          isChild
            ? "ml-4 sm:ml-8 mt-3 border-l-4 border-blue-300 dark:border-blue-700"
            : ""
        }`}
      >
        {/* Header with icon, name, and category */}
        <div className="flex items-start gap-2 mb-3 flex-wrap">
          {activity.category && (
            <span className="text-xl sm:text-2xl">
              {activityCategories.find((c) => c.name === activity.category)
                ?.emoji || "📍"}
            </span>
          )}
          <div className="flex-1 min-w-0">
            <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words">
              {activity.name}
            </h3>
            {activity.category && (
              <span className="text-xs sm:text-sm px-2 py-0.5 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded inline-block mt-1">
                {activity.category}
              </span>
            )}
          </div>
        </div>

        {/* Description */}
        {activity.description && (
          <p className="text-gray-600 dark:text-gray-400 text-sm mb-3 line-clamp-2 sm:line-clamp-none">
            {activity.description}
          </p>
        )}

        {/* Details */}
        <div className="space-y-1.5 sm:space-y-2 text-sm text-gray-700 dark:text-gray-300">
          {/* Location */}
          {activity.location && (
            <div className="flex flex-wrap gap-x-2">
              <span className="font-medium">Location:</span>
              <span>{activity.location.name}</span>
              {activity.location.address && (
                <span className="text-gray-500 dark:text-gray-500 hidden sm:inline">
                  ({activity.location.address})
                </span>
              )}
            </div>
          )}

          {/* Time */}
          {activity.startTime && (
            <div className="flex flex-wrap gap-x-2">
              <span className="font-medium">
                {activity.allDay ? "Date:" : "Time:"}
              </span>
              <span>
                {formatDateTime(
                  activity.startTime,
                  activity.timezone,
                  activity.allDay
                )}
                {activity.endTime &&
                  ` - ${formatDateTime(
                    activity.endTime,
                    activity.timezone,
                    activity.allDay
                  )}`}
              </span>
            </div>
          )}

          {/* Booking Reference */}
          {activity.bookingReference && (
            <div className="flex flex-wrap gap-x-2">
              <span className="font-medium">Reference:</span>
              <span>{activity.bookingReference}</span>
            </div>
          )}

          {/* Booking URL */}
          {activity.bookingUrl && (
            <div className="flex flex-wrap gap-x-2">
              <span className="font-medium">Booking:</span>
              <a
                href={activity.bookingUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 hover:underline dark:text-blue-400"
              >
                View Booking
              </a>
            </div>
          )}

          {/* Cost */}
          {activity.cost && (
            <div className="flex flex-wrap gap-x-2">
              <span className="font-medium">Cost:</span>
              <span>
                {activity.currency} {activity.cost}
              </span>
            </div>
          )}

          {/* Notes */}
          {activity.notes && (
            <div className="mt-2">
              <span className="font-medium">Notes:</span>
              <p className="text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 sm:line-clamp-none">
                {activity.notes}
              </p>
            </div>
          )}
        </div>

        {/* Associated Albums */}
        <div className="mt-3">
          <AssociatedAlbums albums={activity.photoAlbums} tripId={tripId} />
        </div>

        {/* Linked Entities */}
        <LinkedEntitiesDisplay
          tripId={tripId}
          entityType="ACTIVITY"
          entityId={activity.id}
          compact
        />

        {/* Actions - bottom row */}
        <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
          <LinkButton
            tripId={tripId}
            entityType="ACTIVITY"
            entityId={activity.id}
            linkSummary={getLinkSummary('ACTIVITY', activity.id)}
            onUpdate={invalidateLinkSummary}
            size="sm"
          />
          <JournalEntriesButton
            journalEntries={activity.journalAssignments}
            tripId={tripId}
          />
          <div className="flex-1" />
          <button
            onClick={() => handleEdit(activity)}
            className="px-2.5 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 whitespace-nowrap"
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(activity.id)}
            className="px-2.5 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 whitespace-nowrap"
          >
            Delete
          </button>
        </div>

        {/* Render children */}
        {children.length > 0 && (
          <div className="mt-4 space-y-3">
            {children.map((child) => renderActivity(child, true))}
          </div>
        )}
      </div>
    );
  };

  const handleCloseForm = () => {
    resetForm();
    manager.closeForm();
  };

  return (
    <div className="space-y-6">
      <ConfirmDialogComponent />
      <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:justify-between sm:items-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Activities
        </h2>
        <button
          onClick={() => {
            resetForm();
            manager.toggleForm();
          }}
          className="btn btn-primary text-sm sm:text-base whitespace-nowrap"
        >
          <span className="sm:hidden">+ Add</span>
          <span className="hidden sm:inline">+ Add Activity</span>
        </button>
      </div>

      {/* Form Modal */}
      <FormModal
        isOpen={manager.showForm}
        onClose={handleCloseForm}
        title={manager.editingId ? "Edit Activity" : "Add Activity"}
        icon="🎯"
        formId="activity-form"
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
                  (document.getElementById('activity-form') as HTMLFormElement)?.requestSubmit();
                }}
                className="btn btn-secondary text-sm whitespace-nowrap"
              >
                <span className="hidden sm:inline">Save & Add Another</span>
                <span className="sm:hidden">Save & Add</span>
              </button>
            )}
            <button
              type="submit"
              form="activity-form"
              className="btn btn-primary"
            >
              {manager.editingId ? "Update" : "Add"} Activity
            </button>
          </>
        }
      >
        <form id="activity-form" onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: Basic Info (Name & Category) */}
          <FormSection title="Basic Info" icon="🎯">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="activity-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Name *
                </label>
                <input
                  type="text"
                  id="activity-name"
                  value={values.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="input"
                  required
                  placeholder="Activity name"
                />
              </div>

              <div>
                <label
                  htmlFor="activity-category"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Category
                </label>
                <select
                  id="activity-category"
                  value={values.category}
                  onChange={(e) => handleChange("category", e.target.value)}
                  className="input"
                >
                  <option value="">-- Select Category --</option>
                  {activityCategories.map((cat) => (
                    <option key={cat.name} value={cat.name}>
                      {cat.emoji} {cat.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </FormSection>

          {/* SECTION 2: Schedule */}
          <FormSection title="Schedule" icon="🕐">
            {/* All Day Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={values.allDay}
                onChange={(e) => handleChange("allDay", e.target.checked)}
                className="rounded"
              />
              <label
                htmlFor="allDay"
                className="text-sm font-medium text-gray-700 dark:text-gray-300"
              >
                All-day activity
              </label>
            </div>

            {/* Date/Time Fields */}
            {values.allDay ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="activity-start-date"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="activity-start-date"
                    value={values.startDate}
                    onChange={(e) => handleChange("startDate", e.target.value)}
                    className="input"
                  />
                </div>
                {showMoreOptions && (
                  <div>
                    <label
                      htmlFor="activity-end-date"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      End Date
                    </label>
                    <input
                      type="date"
                      id="activity-end-date"
                      value={values.endDate}
                      onChange={(e) => handleChange("endDate", e.target.value)}
                      className="input"
                    />
                  </div>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label
                      htmlFor="activity-start-date-time"
                      className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                    >
                      Start Time
                    </label>
                    <div className="flex gap-2">
                      <input
                        type="date"
                        id="activity-start-date-time"
                        value={values.startDate}
                        onChange={(e) =>
                          handleChange("startDate", e.target.value)
                        }
                        className="input flex-1"
                      />
                      <input
                        type="time"
                        id="activity-start-time"
                        aria-label="Start time"
                        value={values.startTime}
                        onChange={(e) =>
                          handleChange("startTime", e.target.value)
                        }
                        className="input flex-1"
                        placeholder="12:00"
                      />
                    </div>
                  </div>
                  {showMoreOptions && (
                    <div>
                      <label
                        htmlFor="activity-end-date-time"
                        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                      >
                        End Time
                      </label>
                      <div className="flex gap-2">
                        <input
                          type="date"
                          id="activity-end-date-time"
                          value={values.endDate}
                          onChange={(e) => handleChange("endDate", e.target.value)}
                          className="input flex-1"
                        />
                        <input
                          type="time"
                          id="activity-end-time"
                          aria-label="End time"
                          value={values.endTime}
                          onChange={(e) => handleChange("endTime", e.target.value)}
                          className="input flex-1"
                          placeholder="12:00"
                        />
                      </div>
                    </div>
                  )}
                </div>
                {!showMoreOptions && (
                  <p className="text-xs text-gray-500 dark:text-gray-400 -mt-2">
                    Time defaults to 12:00 PM if not specified
                  </p>
                )}
              </>
            )}
          </FormSection>

          {/* COLLAPSIBLE: More Options */}
          <CollapsibleSection
            title="More Options"
            icon="⚙️"
            isExpanded={showMoreOptions}
            onToggle={() => setShowMoreOptions(!showMoreOptions)}
            badge="description, location, cost"
          >
            {/* Description */}
            <div>
              <label
                htmlFor="activity-description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Description
              </label>
              <textarea
                id="activity-description"
                value={values.description}
                onChange={(e) => handleChange("description", e.target.value)}
                className="input"
                rows={2}
                placeholder="Activity description"
              />
            </div>

            {/* Location Section */}
            <FormSection title="Location" icon="📍">
              {showLocationQuickAdd ? (
                <LocationQuickAdd
                  tripId={tripId}
                  onLocationCreated={handleLocationCreated}
                  onCancel={() => setShowLocationQuickAdd(false)}
                />
              ) : (
                <div className="flex gap-2">
                  <select
                    id="activity-location"
                    value={values.locationId || ""}
                    onChange={(e) =>
                      handleChange(
                        "locationId",
                        e.target.value ? parseInt(e.target.value) : undefined
                      )
                    }
                    className="input flex-1"
                  >
                    <option value="">-- Select Location --</option>
                    {localLocations.map((loc) => (
                      <option key={loc.id} value={loc.id}>
                        {loc.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => setShowLocationQuickAdd(true)}
                    className="btn btn-secondary whitespace-nowrap"
                  >
                    + New
                  </button>
                </div>
              )}
            </FormSection>

            {/* Organization */}
            <FormSection title="Organization" icon="📂">
              <div>
                <label
                  htmlFor="activity-parent"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Parent Activity
                </label>
                <select
                  id="activity-parent"
                  value={values.parentId || ""}
                  onChange={(e) =>
                    handleChange(
                      "parentId",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="input"
                >
                  <option value="">-- No Parent (Top Level) --</option>
                  {topLevelActivities
                    .filter((a) => a.id !== manager.editingId)
                    .map((activity) => (
                      <option key={activity.id} value={activity.id}>
                        {activity.name}
                      </option>
                    ))}
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Group this activity under another activity
                </p>
              </div>

              <TimezoneSelect
                value={values.timezone}
                onChange={(value) => handleChange("timezone", value)}
                label="Timezone"
              />
            </FormSection>

            {/* Booking Section */}
            <FormSection title="Booking Details" icon="🎫">
              <BookingFields
                confirmationNumber={values.bookingReference}
                bookingUrl={values.bookingUrl}
                onConfirmationNumberChange={(value) =>
                  handleChange("bookingReference", value)
                }
                onBookingUrlChange={(value) => handleChange("bookingUrl", value)}
                confirmationLabel="Booking Reference"
              />
            </FormSection>

            {/* Cost Section */}
            <FormSection title="Cost" icon="💰">
              <CostCurrencyFields
                cost={values.cost}
                currency={values.currency}
                onCostChange={(value) => handleChange("cost", value)}
                onCurrencyChange={(value) => handleChange("currency", value)}
              />
            </FormSection>

            {/* Notes */}
            <div>
              <label
                htmlFor="activity-notes"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Notes
              </label>
              <textarea
                id="activity-notes"
                value={values.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                className="input"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>
          </CollapsibleSection>
        </form>
      </FormModal>

      {/* Activities List */}
      <div className="space-y-4">
        {manager.loading ? (
          <ListItemSkeleton count={3} />
        ) : topLevelActivities.length === 0 ? (
          <EmptyState
            icon={<EmptyIllustrations.NoActivities />}
            message="What Will You Discover?"
            subMessage="Plan your adventures - from guided tours and museum visits to local dining experiences and outdoor excursions. Every activity tells a story."
            actionLabel="Add Your First Activity"
            onAction={() => {
              resetForm();
              manager.toggleForm();
            }}
          />
        ) : (
          topLevelActivities.map((activity) => renderActivity(activity))
        )}
      </div>
    </div>
  );
}
