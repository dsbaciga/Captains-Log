import { useState, useEffect } from "react";
import type { Activity } from "../types/activity";
import type { Location } from "../types/location";
import type { ActivityCategory } from "../types/user";
import activityService from "../services/activity.service";
import userService from "../services/user.service";
import toast from "react-hot-toast";
import AssociatedAlbums from "./AssociatedAlbums";
import JournalEntriesButton from "./JournalEntriesButton";
import LocationQuickAdd from "./LocationQuickAdd";
import {
  formatDateTimeInTimezone,
  formatDateInTimezone,
} from "../utils/timezone";
import { useFormFields } from "../hooks/useFormFields";
import EmptyState from "./EmptyState";
import TimezoneSelect from "./TimezoneSelect";
import CostCurrencyFields from "./CostCurrencyFields";
import BookingFields from "./BookingFields";

interface ActivityManagerProps {
  tripId: number;
  locations: Location[];
  tripTimezone?: string | null;
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
  onUpdate,
}: ActivityManagerProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [activityCategories, setActivityCategories] = useState<
    ActivityCategory[]
  >([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [showLocationQuickAdd, setShowLocationQuickAdd] = useState(false);
  const [localLocations, setLocalLocations] = useState<Location[]>(locations);

  const { values, handleChange, reset } =
    useFormFields<ActivityFormFields>(initialFormState);

  useEffect(() => {
    loadActivities();
    loadUserCategories();
  }, [tripId]);

  // Sync localLocations with locations prop
  useEffect(() => {
    setLocalLocations(locations);
  }, [locations]);

  const loadUserCategories = async () => {
    try {
      const user = await userService.getMe();
      setActivityCategories(user.activityCategories || []);
    } catch (_error) {
      console.error("Failed to load activity categories");
    }
  };

  const loadActivities = async () => {
    try {
      const data = await activityService.getActivitiesByTrip(tripId);
      setActivities(data);
    } catch (_error) {
      toast.error("Failed to load activities");
    }
  };

  const handleLocationCreated = (locationId: number, locationName: string) => {
    // Add the new location to local state
    const newLocation: Location = {
      id: locationId,
      name: locationName,
      tripId,
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
    setEditingId(null);
  };

  const handleEdit = (activity: Activity) => {
    setEditingId(activity.id);
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

    // Handle date/time fields based on allDay flag
    if (activity.allDay) {
      // For all-day events, populate just the date fields
      handleChange(
        "startDate",
        activity.startTime
          ? new Date(activity.startTime).toISOString().slice(0, 10)
          : ""
      );
      handleChange(
        "endDate",
        activity.endTime
          ? new Date(activity.endTime).toISOString().slice(0, 10)
          : ""
      );
      handleChange("startTime", "");
      handleChange("endTime", "");
    } else {
      // For timed events, populate date-time fields
      const startDateTime = activity.startTime
        ? new Date(activity.startTime).toISOString().slice(0, 16)
        : "";
      const endDateTime = activity.endTime
        ? new Date(activity.endTime).toISOString().slice(0, 16)
        : "";

      handleChange("startDate", startDateTime.slice(0, 10));
      handleChange("startTime", startDateTime.slice(11));
      handleChange("endDate", endDateTime.slice(0, 10));
      handleChange("endTime", endDateTime.slice(11));
    }

    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!values.name.trim()) {
      toast.error("Name is required");
      return;
    }

    try {
      // Combine date and time fields into ISO strings
      let startTimeISO: string | null = null;
      let endTimeISO: string | null = null;

      if (values.allDay) {
        // For all-day events, use just the date (set time to 00:00)
        if (values.startDate) {
          startTimeISO = `${values.startDate}T00:00:00`;
        }
        if (values.endDate) {
          endTimeISO = `${values.endDate}T23:59:59`;
        }
      } else {
        // For timed events, combine date and time
        if (values.startDate && values.startTime) {
          startTimeISO = `${values.startDate}T${values.startTime}:00`;
        }
        if (values.endDate && values.endTime) {
          endTimeISO = `${values.endDate}T${values.endTime}:00`;
        }
      }

      if (editingId) {
        // For updates, send null to clear empty fields
        const updateData = {
          tripId,
          name: values.name,
          description: values.description || null,
          category: values.category || null,
          locationId: values.locationId,
          parentId: values.parentId,
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
        await activityService.updateActivity(editingId, updateData);
        toast.success("Activity updated");
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
        await activityService.createActivity(createData);
        toast.success("Activity added");
      }

      resetForm();
      setShowForm(false);
      loadActivities();
      onUpdate?.(); // Notify parent to refresh counts
    } catch (_error) {
      toast.error("Failed to save activity");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this activity and all its sub-activities?")) return;

    try {
      await activityService.deleteActivity(id);
      toast.success("Activity deleted");
      loadActivities();
      onUpdate?.(); // Notify parent to refresh counts
    } catch (_error) {
      toast.error("Failed to delete activity");
    }
  };

  // Filter top-level activities (no parent)
  const topLevelActivities = activities.filter((a) => !a.parentId);

  // Get children for a parent activity
  const getChildren = (parentId: number) => {
    return activities.filter((a) => a.parentId === parentId);
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
        className={`bg-white dark:bg-gray-800 rounded-lg shadow p-6 ${
          isChild
            ? "ml-8 mt-3 border-l-4 border-blue-300 dark:border-blue-700"
            : ""
        }`}
      >
        <div className="flex justify-between items-start">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-2">
              {activity.category && (
                <span className="text-xl">
                  {activityCategories.find((c) => c.name === activity.category)
                    ?.emoji || "📍"}
                </span>
              )}
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {activity.name}
              </h3>
              {activity.category && (
                <span className="text-sm px-2 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 rounded">
                  {activity.category}
                </span>
              )}
            </div>

            {activity.description && (
              <p className="text-gray-600 dark:text-gray-400 mb-2">
                {activity.description}
              </p>
            )}

            <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
              {/* Location */}
              {activity.location && (
                <div className="flex items-center gap-2">
                  <span className="font-medium">Location:</span>
                  <span>{activity.location.name}</span>
                  {activity.location.address && (
                    <span className="text-gray-500 dark:text-gray-500">
                      ({activity.location.address})
                    </span>
                  )}
                </div>
              )}

              {/* Time */}
              {activity.startTime && (
                <div className="flex items-center gap-2">
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
                <div className="flex items-center gap-2">
                  <span className="font-medium">Reference:</span>
                  <span>{activity.bookingReference}</span>
                </div>
              )}

              {/* Booking URL */}
              {activity.bookingUrl && (
                <div className="flex items-center gap-2">
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
                <div className="flex items-center gap-2">
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
                  <p className="text-gray-600 dark:text-gray-400 mt-1">
                    {activity.notes}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2 ml-4">
            <AssociatedAlbums albums={activity.photoAlbums} tripId={tripId} />
            <JournalEntriesButton
              journalEntries={activity.journalAssignments}
              tripId={tripId}
            />
            <button
              onClick={() => handleEdit(activity)}
              className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
            >
              Edit
            </button>
            <button
              onClick={() => handleDelete(activity.id)}
              className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
            >
              Delete
            </button>
          </div>
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Activities
        </h2>
        <button
          onClick={() => {
            resetForm();
            setShowForm(!showForm);
          }}
          className="btn btn-primary"
        >
          {showForm ? "Cancel" : "+ Add Activity"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Activity" : "Add Activity"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Name and Category */}
            <div className="grid grid-cols-2 gap-4">
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

            {/* Location with Quick Add */}
            <div>
              <label
                htmlFor="activity-location"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Location
              </label>
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
                    + New Location
                  </button>
                </div>
              )}
            </div>

            {/* Parent Activity */}
            <div>
              <label
                htmlFor="activity-parent"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Parent Activity (Optional)
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
                  .filter((a) => a.id !== editingId)
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
              <div className="grid grid-cols-2 gap-4">
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
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
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
                    />
                  </div>
                </div>
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
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Timezone Component */}
            <TimezoneSelect
              value={values.timezone}
              onChange={(value) => handleChange("timezone", value)}
              label="Timezone"
            />

            {/* Booking Fields Component */}
            <BookingFields
              confirmationNumber={values.bookingReference}
              bookingUrl={values.bookingUrl}
              onConfirmationNumberChange={(value) =>
                handleChange("bookingReference", value)
              }
              onBookingUrlChange={(value) => handleChange("bookingUrl", value)}
              confirmationLabel="Booking Reference"
            />

            {/* Cost and Currency Component */}
            <CostCurrencyFields
              cost={values.cost}
              currency={values.currency}
              onCostChange={(value) => handleChange("cost", value)}
              onCurrencyChange={(value) => handleChange("currency", value)}
            />

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

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  setShowForm(false);
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {editingId ? "Update" : "Add"} Activity
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Activities List */}
      <div className="space-y-4">
        {topLevelActivities.length === 0 ? (
          <EmptyState
            icon="🎯"
            message="No activities added yet"
            subMessage="Add activities, tours, dining, and other things you plan to do"
          />
        ) : (
          topLevelActivities.map((activity) => renderActivity(activity))
        )}
      </div>
    </div>
  );
}
