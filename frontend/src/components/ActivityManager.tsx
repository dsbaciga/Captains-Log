import { useState, useEffect, useMemo, useCallback } from "react";
import type { Activity, CreateActivityInput, UpdateActivityInput } from "../types/activity";
import type { Location } from "../types/location";
import type { ActivityCategory } from "../types/user";
import activityService from "../services/activity.service";
import entityLinkService from "../services/entityLink.service";
import userService from "../services/user.service";
import toast from "react-hot-toast";
import LinkButton from "./LinkButton";
import LinkedEntitiesDisplay from "./LinkedEntitiesDisplay";
import FormModal from "./FormModal";
import ActivityForm, { ActivityFormData } from "./forms/ActivityForm";
import {
  formatDateTimeInTimezone,
  formatDateInTimezone,
} from "../utils/timezone";
import { useManagerCRUD } from "../hooks/useManagerCRUD";
import { useFormReset } from "../hooks/useFormReset";
import { useTripLinkSummary } from "../hooks/useTripLinkSummary";
import { useEditFromUrlParam } from "../hooks/useEditFromUrlParam";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import EmptyState, { EmptyIllustrations } from "./EmptyState";
import { ListItemSkeleton } from "./SkeletonLoader";

interface ActivityManagerProps {
  tripId: number;
  locations: Location[];
  tripTimezone?: string | null;
  tripStartDate?: string | null;
  onUpdate?: () => void;
}

export default function ActivityManager({
  tripId,
  locations,
  tripTimezone,
  tripStartDate,
  onUpdate,
}: ActivityManagerProps) {
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

  const [activityCategories, setActivityCategories] = useState<ActivityCategory[]>([]);
  const [localLocations, setLocalLocations] = useState<Location[]>(locations);
  const [keepFormOpenAfterSave, setKeepFormOpenAfterSave] = useState(false);
  const [editingActivity, setEditingActivity] = useState<Activity | null>(null);
  const [editingLocationId, setEditingLocationId] = useState<number | null>(null);
  const [originalLocationId, setOriginalLocationId] = useState<number | null>(null);
  const [formKey, setFormKey] = useState(0); // Key to force form reset
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Create wrappers for useFormReset hook
  // ActivityManager uses editingActivity instead of form fields, so we adapt the pattern
  const setShowForm = useCallback((show: boolean) => {
    if (show) {
      if (!manager.showForm) manager.toggleForm();
    } else {
      manager.closeForm();
    }
  }, [manager]);

  // Define a setter for the edit state that resets all editing-related state
  const setEditState = useCallback((state: { activity: Activity | null; locationId: number | null } | null) => {
    if (state === null) {
      setEditingActivity(null);
      setEditingLocationId(null);
      setOriginalLocationId(null);
      setFormKey((k) => k + 1); // Force form component to reset
    } else {
      setEditingActivity(state.activity);
      setEditingLocationId(state.locationId);
      setOriginalLocationId(state.locationId);
    }
  }, []);

  // Use useFormReset for consistent form state management
  const { resetForm: baseResetForm, openCreateForm: baseOpenCreateForm } = useFormReset({
    initialState: null as { activity: Activity | null; locationId: number | null } | null,
    setFormData: setEditState,
    setEditingId: manager.setEditingId,
    setShowForm,
  });

  useEffect(() => {
    loadUserCategories();
  }, [tripId]);

  // Sync localLocations with locations prop
  useEffect(() => {
    setLocalLocations(locations);
  }, [locations]);

  // handleEdit must be defined before handleEditFromUrl since it's used as a dependency
  const handleEdit = useCallback(async (activity: Activity) => {
    // Fetch linked location via entity linking system
    let locationId: number | null = null;
    try {
      const links = await entityLinkService.getLinksFrom(tripId, 'ACTIVITY', activity.id, 'LOCATION');
      if (links.length > 0 && links[0].targetId) {
        locationId = links[0].targetId;
      }
    } catch {
      // If fetching links fails, proceed without location
    }

    setEditingActivity(activity);
    setEditingLocationId(locationId);
    setOriginalLocationId(locationId);
    manager.openEditForm(activity.id);
  }, [tripId, manager]);

  // Stable callback for URL-based edit navigation
  const handleEditFromUrl = useCallback((activity: Activity) => {
    handleEdit(activity);
  }, [handleEdit]);

  // Handle URL-based edit navigation (e.g., from EntityDetailModal)
  useEditFromUrlParam(manager.items, handleEditFromUrl, {
    loading: manager.loading,
  });

  const loadUserCategories = async () => {
    try {
      const user = await userService.getMe();
      setActivityCategories(user.activityCategories || []);
    } catch {
      console.error("Failed to load activity categories");
    }
  };

  const handleLocationCreated = (locationId: number, locationName: string) => {
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
  };

  // Extended reset that also clears additional local state
  const resetForm = useCallback(() => {
    baseResetForm();
    setKeepFormOpenAfterSave(false);
  }, [baseResetForm]);

  // Open create form with clean state
  const openCreateForm = useCallback(() => {
    baseOpenCreateForm();
    setKeepFormOpenAfterSave(false);
  }, [baseOpenCreateForm]);

  const handleFormSubmit = async (data: ActivityFormData, newLocationId: number | null) => {
    setIsSubmitting(true);
    try {
    if (manager.editingId) {
      // Update existing activity
      const updateData: UpdateActivityInput = {
        name: data.name,
        description: data.description,
        category: data.category,
        parentId: data.parentId,
        allDay: data.allDay,
        startTime: data.startTime,
        endTime: data.endTime,
        timezone: data.timezone,
        cost: data.cost,
        currency: data.currency,
        bookingUrl: data.bookingUrl,
        bookingReference: data.bookingReference,
        notes: data.notes,
      };

      const success = await manager.handleUpdate(manager.editingId, updateData);
      if (success) {
        // Handle location link changes via entity linking
        const locationChanged = newLocationId !== originalLocationId;
        if (locationChanged) {
          try {
            if (originalLocationId) {
              await entityLinkService.deleteLink(tripId, {
                sourceType: 'ACTIVITY',
                sourceId: manager.editingId,
                targetType: 'LOCATION',
                targetId: originalLocationId,
              });
            }
            if (newLocationId) {
              await entityLinkService.createLink(tripId, {
                sourceType: 'ACTIVITY',
                sourceId: manager.editingId,
                targetType: 'LOCATION',
                targetId: newLocationId,
              });
            }
            invalidateLinkSummary();
          } catch (error) {
            console.error('Failed to update location link:', error);
            toast.error('Activity saved but failed to update location link');
          }
        }
        resetForm();
        manager.closeForm();
      }
    } else {
      // Create new activity
      const createData: CreateActivityInput = {
        tripId,
        name: data.name,
        description: data.description || undefined,
        category: data.category || undefined,
        parentId: data.parentId,
        allDay: data.allDay,
        startTime: data.startTime || undefined,
        endTime: data.endTime || undefined,
        timezone: data.timezone || undefined,
        cost: data.cost || undefined,
        currency: data.currency || undefined,
        bookingUrl: data.bookingUrl || undefined,
        bookingReference: data.bookingReference || undefined,
        notes: data.notes || undefined,
      };

      try {
        const createdActivity = await activityService.createActivity(createData);
        toast.success('Activity added successfully');

        // Create location link if a location was selected
        if (newLocationId) {
          try {
            await entityLinkService.createLink(tripId, {
              sourceType: 'ACTIVITY',
              sourceId: createdActivity.id,
              targetType: 'LOCATION',
              targetId: newLocationId,
            });
            invalidateLinkSummary();
          } catch (linkError) {
            console.error('Failed to create location link:', linkError);
            toast.error('Activity created but failed to link location');
          }
        }

        await manager.loadItems();
        onUpdate?.();

        if (keepFormOpenAfterSave) {
          resetForm();
          // Keep modal open for quick successive entries
        } else {
          resetForm();
          manager.closeForm();
        }
      } catch (error) {
        console.error('Failed to create activity:', error);
        toast.error('Failed to add activity');
      }
    }
    } finally {
      setIsSubmitting(false);
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
        data-entity-id={`activity-${activity.id}`}
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
          <div className="flex-1" />
          <button
            onClick={() => handleEdit(activity)}
            className="px-2.5 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 whitespace-nowrap"
            aria-label={`Edit activity ${activity.name}`}
          >
            Edit
          </button>
          <button
            onClick={() => handleDelete(activity.id)}
            className="px-2.5 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 whitespace-nowrap"
            aria-label={`Delete activity ${activity.name}`}
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

  // resetForm already closes the form via useFormReset
  const handleCloseForm = resetForm;

  // handleOpenForm uses the dedicated openCreateForm function
  const handleOpenForm = openCreateForm;

  return (
    <div className="space-y-6">
      <ConfirmDialogComponent />
      <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:justify-between sm:items-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Activities
        </h2>
        <button
          onClick={handleOpenForm}
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
              disabled={isSubmitting}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            {!manager.editingId && (
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => {
                  setKeepFormOpenAfterSave(true);
                  (document.getElementById('activity-form') as HTMLFormElement)?.requestSubmit();
                }}
                className="btn btn-secondary text-sm whitespace-nowrap"
              >
                <span className="hidden sm:inline">Save & Add Another</span>
                <span className="sm:hidden">+ Another</span>
              </button>
            )}
            <button
              type="submit"
              form="activity-form"
              disabled={isSubmitting}
              className="btn btn-primary disabled:opacity-50"
            >
              {isSubmitting ? "Saving..." : manager.editingId ? "Update Activity" : "Add Activity"}
            </button>
          </>
        }
      >
        <ActivityForm
          key={formKey}
          formId="activity-form"
          tripId={tripId}
          locations={localLocations}
          activityCategories={activityCategories}
          tripTimezone={tripTimezone}
          tripStartDate={tripStartDate}
          existingActivities={manager.items}
          editingActivity={editingActivity}
          editingLocationId={editingLocationId}
          onSubmit={handleFormSubmit}
          onLocationCreated={handleLocationCreated}
          defaultUnscheduled={false}
        />
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
            onAction={handleOpenForm}
          />
        ) : (
          topLevelActivities.map((activity) => renderActivity(activity))
        )}
      </div>
    </div>
  );
}
