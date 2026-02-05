import { useState, useEffect, useMemo, useCallback } from "react";
import type { Lodging, LodgingType, CreateLodgingInput, UpdateLodgingInput } from "../types/lodging";
import type { Location } from "../types/location";
import lodgingService from "../services/lodging.service";
import entityLinkService from "../services/entityLink.service";
import toast from "react-hot-toast";
import LinkButton from "./LinkButton";
import LinkedEntitiesDisplay from "./LinkedEntitiesDisplay";
import LocationQuickAdd from "./LocationQuickAdd";
import FormModal from "./FormModal";
import FormSection, { CollapsibleSection } from "./FormSection";
import DraftIndicator from "./DraftIndicator";
import DraftRestorePrompt from "./DraftRestorePrompt";
import { formatDateTimeInTimezone, convertISOToDateTimeLocal, convertDateTimeLocalToISO } from "../utils/timezone";
import { useFormFields } from "../hooks/useFormFields";
import { useFormReset } from "../hooks/useFormReset";
import { useManagerCRUD } from "../hooks/useManagerCRUD";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useTripLinkSummary } from "../hooks/useTripLinkSummary";
import { useEditFromUrlParam } from "../hooks/useEditFromUrlParam";
import { useAutoSaveDraft } from "../hooks/useAutoSaveDraft";
import { useBulkSelection } from "../hooks/useBulkSelection";
import EmptyState, { EmptyIllustrations } from "./EmptyState";
import TimezoneSelect from "./TimezoneSelect";
import CostCurrencyFields from "./CostCurrencyFields";
import BookingFields from "./BookingFields";
import { ListItemSkeleton } from "./SkeletonLoader";
import BulkActionBar from "./BulkActionBar";
import BulkEditModal from "./BulkEditModal";
import { getLastUsedCurrency, saveLastUsedCurrency } from "../utils/currencyStorage";

// Note: Location association is handled via EntityLink system, not direct FK

/**
 * LodgingManager handles CRUD operations for trip accommodations.
 * Supports hotels, hostels, vacation rentals, camping, resorts, and other lodging types.
 *
 * Features:
 * - Multiple lodging types with icons
 * - Check-in/check-out datetime with timezone support
 * - Sequential chaining (auto-fills next check-in from previous check-out)
 * - Confirmation number and booking URL storage
 * - Cost and currency tracking
 * - Location linking via EntityLink system
 * - Sorting by check-in date or type
 * - Quick-add location creation
 *
 * @param props - Component props
 * @param props.tripId - The ID of the trip
 * @param props.locations - Array of trip locations for lodging location selection
 * @param props.tripTimezone - Default timezone for the trip
 * @param props.tripStartDate - Trip start date for default form values (15:00 check-in, 11:00 check-out)
 * @param props.onUpdate - Callback triggered after CRUD operations to refresh parent data
 *
 * @example
 * ```tsx
 * <LodgingManager
 *   tripId={123}
 *   locations={tripLocations}
 *   tripTimezone="Europe/Paris"
 *   tripStartDate="2024-06-01"
 *   onUpdate={() => refetchTrip()}
 * />
 * ```
 */
interface LodgingManagerProps {
  tripId: number;
  locations: Location[];
  tripTimezone?: string | null;
  tripStartDate?: string | null;
  onUpdate?: () => void;
}

// Note: Location association is handled via EntityLink system, not direct FK
interface LodgingFormFields {
  type: LodgingType;
  name: string;
  locationId: number | undefined; // Used for EntityLink, not direct FK
  address: string;
  checkInDate: string;
  checkOutDate: string;
  timezone: string;
  confirmationNumber: string;
  bookingUrl: string;
  cost: string;
  currency: string;
  notes: string;
}

const initialFormState: LodgingFormFields = {
  type: "hotel",
  name: "",
  locationId: undefined, // Used for EntityLink, not direct FK
  address: "",
  checkInDate: "",
  checkOutDate: "",
  timezone: "",
  confirmationNumber: "",
  bookingUrl: "",
  cost: "",
  currency: "USD",
  notes: "",
};

export default function LodgingManager({
  tripId,
  locations,
  tripTimezone,
  tripStartDate,
  onUpdate,
}: LodgingManagerProps) {
  // Compute initial form state with trip start date as default
  const getInitialFormState = useMemo((): LodgingFormFields => {
    // Format as datetime-local (YYYY-MM-DDTHH:mm)
    const defaultCheckIn = tripStartDate
      ? `${tripStartDate.slice(0, 10)}T15:00`
      : "";
    const defaultCheckOut = tripStartDate
      ? `${tripStartDate.slice(0, 10)}T11:00`
      : "";
    return {
      ...initialFormState,
      checkInDate: defaultCheckIn,
      checkOutDate: defaultCheckOut,
      currency: getLastUsedCurrency(), // Remember last-used currency
    };
  }, [tripStartDate]);

  // Service adapter for useManagerCRUD hook (memoized to prevent infinite loops)
  const lodgingServiceAdapter = useMemo(() => ({
    getByTrip: lodgingService.getLodgingByTrip,
    create: lodgingService.createLodging,
    update: lodgingService.updateLodging,
    delete: lodgingService.deleteLodging,
  }), []);

  // Initialize CRUD hook
  const manager = useManagerCRUD<Lodging, CreateLodgingInput, UpdateLodgingInput>(lodgingServiceAdapter, tripId, {
    itemName: "lodging",
    onUpdate,
  });

  const { confirm, ConfirmDialogComponent } = useConfirmDialog();
  const { getLinkSummary, invalidate: invalidateLinkSummary } = useTripLinkSummary(tripId);

  const [showLocationQuickAdd, setShowLocationQuickAdd] = useState(false);
  const [localLocations, setLocalLocations] = useState<Location[]>(locations);
  const [keepFormOpenAfterSave, setKeepFormOpenAfterSave] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  // Track original location ID when editing to detect changes (for entity linking)
  const [originalLocationId, setOriginalLocationId] = useState<number | null>(null);
  const [sortBy, setSortBy] = useState<"date" | "type">("date");
  const [showDraftPrompt, setShowDraftPrompt] = useState(false);

  // Bulk selection state
  const bulkSelection = useBulkSelection<Lodging>();
  const [showBulkEditModal, setShowBulkEditModal] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [isBulkEditing, setIsBulkEditing] = useState(false);

  const { values, handleChange, reset, setAllFields } =
    useFormFields<LodgingFormFields>(getInitialFormState);

  // Auto-save draft for form data
  const draftKey = manager.editingId ? manager.editingId : tripId;
  const draft = useAutoSaveDraft(values, {
    entityType: 'lodging',
    id: draftKey,
    isEditMode: !!manager.editingId,
    tripId,
    defaultValues: getInitialFormState,
  });

  // Check for existing draft when form opens in create mode
  // Use initialDraftExists to only show prompt for drafts from previous sessions
  useEffect(() => {
    if (manager.showForm && !manager.editingId && draft.initialDraftExists) {
      setShowDraftPrompt(true);
    }
  }, [manager.showForm, manager.editingId, draft.initialDraftExists]);

  // Handle draft restore
  const handleRestoreDraft = useCallback(() => {
    const restoredData = draft.restoreDraft();
    if (restoredData) {
      setAllFields(restoredData);
      // Show more options if draft has data in optional fields
      if (restoredData.locationId || restoredData.address || restoredData.confirmationNumber ||
          restoredData.bookingUrl || restoredData.cost || restoredData.notes) {
        setShowMoreOptions(true);
      }
    }
    setShowDraftPrompt(false);
  }, [draft, setAllFields]);

  // Handle draft discard
  const handleDiscardDraft = useCallback(() => {
    draft.clearDraft();
    setShowDraftPrompt(false);
  }, [draft]);

  // Create wrappers for useFormReset hook
  const setShowForm = useCallback((show: boolean) => {
    if (show) {
      if (!manager.showForm) manager.toggleForm();
    } else {
      manager.closeForm();
    }
  }, [manager]);

  // Use useFormReset for consistent form state management
  const { resetForm: baseResetForm, openCreateForm: baseOpenCreateForm } = useFormReset({
    initialState: getInitialFormState,
    setFormData: setAllFields,
    setEditingId: manager.setEditingId,
    setShowForm,
  });

  // Sync localLocations with locations prop
  useEffect(() => {
    setLocalLocations(locations);
  }, [locations]);

  // handleEdit must be defined before handleEditFromUrl since it's used as a dependency
  const handleEdit = useCallback(async (lodging: Lodging) => {
    setShowMoreOptions(true); // Always show all options when editing
    handleChange("type", lodging.type);
    handleChange("name", lodging.name);
    handleChange("address", lodging.address || "");

    // Fetch linked location via entity linking system
    try {
      const links = await entityLinkService.getLinksFrom(tripId, 'LODGING', lodging.id, 'LOCATION');
      if (links.length > 0 && links[0].targetId) {
        handleChange("locationId", links[0].targetId);
        setOriginalLocationId(links[0].targetId);
      } else {
        handleChange("locationId", undefined);
        setOriginalLocationId(null);
      }
    } catch {
      // If fetching links fails, just proceed without location
      handleChange("locationId", undefined);
      setOriginalLocationId(null);
    }

    // Convert stored UTC times to local times in the specified timezone
    const effectiveTz = lodging.timezone || tripTimezone || 'UTC';

    handleChange(
      "checkInDate",
      lodging.checkInDate
        ? convertISOToDateTimeLocal(lodging.checkInDate, effectiveTz)
        : ""
    );
    handleChange(
      "checkOutDate",
      lodging.checkOutDate
        ? convertISOToDateTimeLocal(lodging.checkOutDate, effectiveTz)
        : ""
    );
    handleChange("timezone", lodging.timezone || "");
    handleChange("confirmationNumber", lodging.confirmationNumber || "");
    handleChange("bookingUrl", lodging.bookingUrl || "");
    handleChange("cost", lodging.cost?.toString() || "");
    handleChange("currency", lodging.currency || "USD");
    handleChange("notes", lodging.notes || "");
    manager.openEditForm(lodging.id);
  }, [tripId, handleChange, tripTimezone, manager]);

  // Stable callback for URL-based edit navigation
  const handleEditFromUrl = useCallback((lodging: Lodging) => {
    handleEdit(lodging);
  }, [handleEdit]);

  // Handle URL-based edit navigation (e.g., from EntityDetailModal)
  useEditFromUrlParam(manager.items, handleEditFromUrl, {
    loading: manager.loading,
  });

  // Auto-fill: Sequential Lodging Chaining - next check-in = previous check-out
  useEffect(() => {
    // Only when creating (not editing) and form just opened
    if (!manager.editingId && manager.showForm && values.checkInDate === getInitialFormState.checkInDate) {
      // Find the most recent lodging (by check-out time)
      const sortedLodgings = [...manager.items]
        .filter(l => l.checkOutDate)
        .sort((a, b) => new Date(b.checkOutDate!).getTime() - new Date(a.checkOutDate!).getTime());

      if (sortedLodgings.length > 0) {
        const lastLodging = sortedLodgings[0];
        const effectiveTz = lastLodging.timezone || tripTimezone || 'UTC';

        // Convert the last lodging's check-out time to datetime-local format
        const checkOutDateTime = convertISOToDateTimeLocal(lastLodging.checkOutDate!, effectiveTz);

        // Use check-out as new check-in
        handleChange('checkInDate', checkOutDateTime);

        // Set check-out to next day at 11:00 AM
        const checkOutDate = new Date(checkOutDateTime);
        checkOutDate.setDate(checkOutDate.getDate() + 1);
        const nextDayCheckOut = `${checkOutDate.toISOString().slice(0, 10)}T11:00`;
        handleChange('checkOutDate', nextDayCheckOut);

        // Inherit timezone if set
        if (lastLodging.timezone && !values.timezone) {
          handleChange('timezone', lastLodging.timezone);
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [manager.showForm, manager.editingId]);

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

  // Extended reset that also clears additional local state
  const resetForm = useCallback(() => {
    baseResetForm();
    setKeepFormOpenAfterSave(false);
    setShowMoreOptions(false);
    setOriginalLocationId(null);
    setShowDraftPrompt(false);
    draft.clearDraft();
  }, [baseResetForm, draft]);

  // Open create form with clean state
  const openCreateForm = useCallback(() => {
    baseOpenCreateForm();
    setKeepFormOpenAfterSave(false);
    setShowMoreOptions(false);
    setOriginalLocationId(null);
  }, [baseOpenCreateForm]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!values.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!values.checkInDate) {
      toast.error("Check-in date is required");
      return;
    }
    if (!values.checkOutDate) {
      toast.error("Check-out date is required");
      return;
    }

    // Convert datetime-local values to ISO strings using the specified timezone
    const effectiveTz = values.timezone || tripTimezone || 'UTC';
    const checkInDateISO = convertDateTimeLocalToISO(values.checkInDate, effectiveTz);
    const checkOutDateISO = convertDateTimeLocalToISO(values.checkOutDate, effectiveTz);

    if (manager.editingId) {
      // For updates, send null to clear empty fields (without locationId - using entity links)
      const updateData = {
        type: values.type,
        name: values.name,
        address: values.address || null,
        checkInDate: checkInDateISO,
        checkOutDate: checkOutDateISO,
        timezone: values.timezone || null,
        confirmationNumber: values.confirmationNumber || null,
        bookingUrl: values.bookingUrl || null,
        cost: values.cost ? parseFloat(values.cost) : null,
        currency: values.currency || null,
        notes: values.notes || null,
      };
      const success = await manager.handleUpdate(manager.editingId, updateData);
      if (success) {
        // Handle location link changes via entity linking
        const newLocationId = values.locationId || null;
        const locationChanged = newLocationId !== originalLocationId;

        if (locationChanged) {
          try {
            // Remove old link if there was one
            if (originalLocationId) {
              await entityLinkService.deleteLink(tripId, {
                sourceType: 'LODGING',
                sourceId: manager.editingId,
                targetType: 'LOCATION',
                targetId: originalLocationId,
              });
            }
            // Create new link if there's a new location
            if (newLocationId) {
              await entityLinkService.createLink(tripId, {
                sourceType: 'LODGING',
                sourceId: manager.editingId,
                targetType: 'LOCATION',
                targetId: newLocationId,
              });
            }
            invalidateLinkSummary();
          } catch (error) {
            console.error('Failed to update location link:', error);
            toast.error('Lodging saved but failed to update location link');
          }
        }

        resetForm();
        manager.closeForm();
      }
    } else {
      // For creates, use undefined to omit optional fields (without locationId - using entity links)
      const createData = {
        tripId,
        type: values.type,
        name: values.name,
        address: values.address || undefined,
        checkInDate: checkInDateISO,
        checkOutDate: checkOutDateISO,
        timezone: values.timezone || undefined,
        confirmationNumber: values.confirmationNumber || undefined,
        bookingUrl: values.bookingUrl || undefined,
        cost: values.cost ? parseFloat(values.cost) : undefined,
        currency: values.currency || undefined,
        notes: values.notes || undefined,
      };

      try {
        // Call service directly to get the created lodging ID for linking
        const createdLodging = await lodgingService.createLodging(createData);
        toast.success('Lodging added successfully');

        // Create location link if a location was selected
        if (values.locationId) {
          try {
            await entityLinkService.createLink(tripId, {
              sourceType: 'LODGING',
              sourceId: createdLodging.id,
              targetType: 'LOCATION',
              targetId: values.locationId,
            });
            invalidateLinkSummary();
          } catch (linkError) {
            console.error('Failed to create location link:', linkError);
            toast.error('Lodging created but failed to link location');
          }
        }

        // Reload items and trigger parent update
        await manager.loadItems();
        onUpdate?.();

        // Save currency for next time
        if (values.currency) {
          saveLastUsedCurrency(values.currency);
        }

        if (keepFormOpenAfterSave) {
          // Reset form but keep modal open for quick successive entries
          reset();
          setKeepFormOpenAfterSave(false);
          setOriginalLocationId(null);
          // Focus first input for quick data entry
          setTimeout(() => {
            const firstInput = document.querySelector<HTMLInputElement>('#lodging-name');
            firstInput?.focus();
          }, 50);
        } else {
          // Standard flow: reset and close
          resetForm();
          manager.closeForm();
        }
      } catch (error) {
        console.error('Failed to create lodging:', error);
        toast.error('Failed to add lodging');
      }
    }
  };

  const handleDelete = async (id: number) => {
    const confirmed = await confirm({
      title: "Delete Lodging",
      message: "Delete this lodging? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    await manager.handleDelete(id);
  };

  // Bulk delete handler
  const handleBulkDelete = async () => {
    const selectedIds = bulkSelection.getSelectedIds();
    if (selectedIds.length === 0) return;

    const confirmed = await confirm({
      title: "Delete Lodging",
      message: `Delete ${selectedIds.length} selected lodging items? This action cannot be undone.`,
      confirmLabel: "Delete All",
      variant: "danger",
    });
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      await lodgingService.bulkDeleteLodging(tripId, selectedIds);
      toast.success(`Deleted ${selectedIds.length} lodging items`);
      bulkSelection.exitSelectionMode();
      await manager.loadItems();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to bulk delete lodging:", error);
      toast.error("Failed to delete some lodging items");
    } finally {
      setIsBulkDeleting(false);
    }
  };

  // Bulk edit handler
  const handleBulkEdit = async (updates: Record<string, unknown>) => {
    const selectedIds = bulkSelection.getSelectedIds();
    if (selectedIds.length === 0) return;

    setIsBulkEditing(true);
    try {
      await lodgingService.bulkUpdateLodging(tripId, selectedIds, updates as { type?: string; notes?: string });
      toast.success(`Updated ${selectedIds.length} lodging items`);
      setShowBulkEditModal(false);
      bulkSelection.exitSelectionMode();
      await manager.loadItems();
      onUpdate?.();
    } catch (error) {
      console.error("Failed to bulk update lodging:", error);
      toast.error("Failed to update some lodging items");
    } finally {
      setIsBulkEditing(false);
    }
  };

  // Build bulk edit field options
  const bulkEditFields = useMemo(() => [
    {
      key: "type",
      label: "Type",
      type: "select" as const,
      options: [
        { value: "hotel", label: "Hotel" },
        { value: "hostel", label: "Hostel" },
        { value: "vacation_rental", label: "Vacation Rental" },
        { value: "camping", label: "Camping" },
        { value: "resort", label: "Resort" },
        { value: "other", label: "Other" },
      ],
    },
    {
      key: "notes",
      label: "Notes",
      type: "textarea" as const,
      placeholder: "Add notes to all selected lodging...",
    },
  ], []);

  // Sort lodging based on sortBy
  const sortedLodging = useMemo(() => {
    if (sortBy === "type") {
      return [...manager.items].sort((a, b) => {
        if (a.type === b.type) {
          // Secondary sort by check-in date
          const dateA = a.checkInDate ? new Date(a.checkInDate).getTime() : 0;
          const dateB = b.checkInDate ? new Date(b.checkInDate).getTime() : 0;
          return dateA - dateB;
        }
        return a.type.localeCompare(b.type);
      });
    }
    // Default: sort by check-in date
    return [...manager.items].sort((a, b) => {
      const dateA = a.checkInDate ? new Date(a.checkInDate).getTime() : 0;
      const dateB = b.checkInDate ? new Date(b.checkInDate).getTime() : 0;
      return dateA - dateB;
    });
  }, [manager.items, sortBy]);

  const getTypeIcon = (type: LodgingType) => {
    switch (type) {
      case "hotel":
        return "🏨";
      case "hostel":
        return "🏠";
      case "vacation_rental":
        return "🏡";
      case "camping":
        return "⛺";
      case "resort":
        return "🏖️";
      default:
        return "🛏️";
    }
  };

  const formatDateTime = (
    dateTime: string | null,
    timezone?: string | null
  ) => {
    return formatDateTimeInTimezone(dateTime, timezone, tripTimezone, {
      includeTimezone: true,
      format: "medium",
    });
  };

  // resetForm already closes the form via useFormReset
  const handleCloseForm = resetForm;

  return (
    <div className="space-y-6">
      <ConfirmDialogComponent />
      <div className="flex flex-col-reverse items-start gap-3 sm:flex-row sm:justify-between sm:items-center">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Lodging
        </h2>
        <div className="flex items-center gap-2">
          {manager.items.length > 0 && !bulkSelection.selectionMode && (
            <button
              onClick={bulkSelection.enterSelectionMode}
              className="btn btn-secondary text-sm whitespace-nowrap"
            >
              Select
            </button>
          )}
          {!bulkSelection.selectionMode && (
            <button
              onClick={openCreateForm}
              className="btn btn-primary text-sm sm:text-base whitespace-nowrap"
            >
              <span className="sm:hidden">+ Add</span>
              <span className="hidden sm:inline">+ Add Lodging</span>
            </button>
          )}
        </div>
      </div>

      {/* Form Modal */}
      <FormModal
        isOpen={manager.showForm}
        onClose={handleCloseForm}
        title={manager.editingId ? "Edit Lodging" : "Add Lodging"}
        icon="🏨"
        formId="lodging-form"
        footer={
          <div className="flex items-center justify-between w-full gap-4">
            <DraftIndicator
              isSaving={draft.isSaving}
              lastSavedAt={draft.lastSavedAt}
              show={draft.hasDraft && !manager.editingId}
            />
            <div className="flex gap-2">
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
                    (document.getElementById('lodging-form') as HTMLFormElement)?.requestSubmit();
                  }}
                  className="btn btn-secondary text-sm whitespace-nowrap hidden sm:block"
                >
                  Save & Add Another
                </button>
              )}
              <button
                type="submit"
                form="lodging-form"
                className="btn btn-primary"
              >
                {manager.editingId ? "Update" : "Add"} Lodging
              </button>
            </div>
          </div>
        }
      >
        {/* Draft Restore Prompt */}
        <DraftRestorePrompt
          isOpen={showDraftPrompt && !manager.editingId}
          savedAt={draft.lastSavedAt}
          onRestore={handleRestoreDraft}
          onDiscard={handleDiscardDraft}
          entityType="lodging"
        />

        <form id="lodging-form" onSubmit={handleSubmit} className="space-y-6">
          {/* SECTION 1: Basic Info (Type & Name) */}
          <FormSection title="Basic Info" icon="🏨">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="lodging-type"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Type *
                </label>
                <select
                  id="lodging-type"
                  value={values.type}
                  onChange={(e) =>
                    handleChange("type", e.target.value as LodgingType)
                  }
                  className="input"
                  required
                >
                  <option value="hotel">🏨 Hotel</option>
                  <option value="hostel">🏠 Hostel</option>
                  <option value="vacation_rental">🏡 Vacation Rental</option>
                  <option value="camping">⛺ Camping</option>
                  <option value="resort">🏖️ Resort</option>
                  <option value="other">🛏️ Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="lodging-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Name *
                </label>
                <input
                  type="text"
                  id="lodging-name"
                  value={values.name}
                  onChange={(e) => handleChange("name", e.target.value)}
                  className="input"
                  required
                  placeholder="e.g., Marriott Hotel"
                />
              </div>
            </div>
          </FormSection>

          {/* SECTION 2: Stay Dates */}
          <FormSection title="Stay Dates" icon="📅">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="lodging-check-in"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Check-in *
                </label>
                <input
                  type="datetime-local"
                  id="lodging-check-in"
                  value={values.checkInDate}
                  onChange={(e) => handleChange("checkInDate", e.target.value)}
                  className="input"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="lodging-check-out"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Check-out *
                </label>
                <input
                  type="datetime-local"
                  id="lodging-check-out"
                  value={values.checkOutDate}
                  onChange={(e) => handleChange("checkOutDate", e.target.value)}
                  className="input"
                  required
                />
              </div>
            </div>

            <TimezoneSelect
              value={values.timezone}
              onChange={(value) => handleChange("timezone", value)}
              label="Timezone"
              helpText="Select the timezone for check-in/check-out times"
            />
          </FormSection>

          {/* COLLAPSIBLE: More Options (Location, Address, Booking, Cost, Notes) */}
          <CollapsibleSection
            title="More Options"
            icon="⚙️"
            isExpanded={showMoreOptions}
            onToggle={() => setShowMoreOptions(!showMoreOptions)}
            badge="location, booking, cost"
          >
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
                    id="lodging-location"
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

              <div>
                <label
                  htmlFor="lodging-address"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Address
                </label>
                <input
                  type="text"
                  id="lodging-address"
                  value={values.address}
                  onChange={(e) => handleChange("address", e.target.value)}
                  className="input"
                  placeholder="123 Main St, City, Country"
                />
              </div>
            </FormSection>

            {/* Booking Section */}
            <FormSection title="Booking Details" icon="🎫">
              <BookingFields
                confirmationNumber={values.confirmationNumber}
                bookingUrl={values.bookingUrl}
                onConfirmationNumberChange={(value) =>
                  handleChange("confirmationNumber", value)
                }
                onBookingUrlChange={(value) => handleChange("bookingUrl", value)}
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
                htmlFor="lodging-notes"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Notes
              </label>
              <textarea
                id="lodging-notes"
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

      {/* Sort Control */}
      {manager.items.length > 0 && (
        <div className="flex items-center gap-2">
          <label htmlFor="lodging-sort" className="text-sm text-gray-600 dark:text-gray-400">
            Sort by:
          </label>
          <select
            id="lodging-sort"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as "date" | "type")}
            className="input py-1 px-2 text-sm w-auto"
          >
            <option value="date">Check-in Date</option>
            <option value="type">Type</option>
          </select>
        </div>
      )}

      {/* Lodging List */}
      <div className="space-y-4">
        {manager.loading ? (
          <ListItemSkeleton count={3} />
        ) : manager.items.length === 0 ? (
          <EmptyState
            icon={<EmptyIllustrations.NoLodging />}
            message="Where Will You Stay?"
            subMessage="From boutique hotels and cozy Airbnbs to camping under the stars - add your accommodations to keep all your booking details in one place."
            actionLabel="Add Your First Stay"
            onAction={openCreateForm}
          />
        ) : (
          sortedLodging.map((lodging, index) => {
            const isSelected = bulkSelection.isSelected(lodging.id);
            return (
            <div
              key={lodging.id}
              data-entity-id={`lodging-${lodging.id}`}
              onClick={bulkSelection.selectionMode ? (e) => {
                e.stopPropagation();
                bulkSelection.toggleItemSelection(lodging.id, index, e.shiftKey, sortedLodging);
              } : undefined}
              className={`bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-3 sm:p-6 hover:shadow-md transition-shadow ${bulkSelection.selectionMode ? "cursor-pointer" : ""} ${isSelected ? "ring-2 ring-primary-500 dark:ring-primary-400" : ""}`}
            >
              {/* Header with title and type */}
              <div className="flex items-start gap-2 mb-3 flex-wrap">
                {/* Selection checkbox */}
                {bulkSelection.selectionMode && (
                  <div className="flex items-center justify-center w-6 h-6 mr-1">
                    <input
                      type="checkbox"
                      checked={isSelected}
                      onChange={(e) => {
                        e.stopPropagation();
                        bulkSelection.toggleItemSelection(lodging.id, index, e.shiftKey, sortedLodging);
                      }}
                      className="w-5 h-5 rounded border-primary-200 dark:border-gold/30 text-primary-600 dark:text-gold focus:ring-primary-500 dark:focus:ring-gold/50"
                    />
                  </div>
                )}
                <span className="text-xl sm:text-2xl">
                  {getTypeIcon(lodging.type)}
                </span>
                <div className="flex-1 min-w-0">
                  <h3 className="text-base sm:text-lg font-semibold text-gray-900 dark:text-white break-words">
                    {lodging.name}
                  </h3>
                  <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                    ({lodging.type.replace("_", " ")})
                  </span>
                </div>
              </div>

              {/* Details grid - more compact on mobile */}
              {/* Note: Location is shown via LinkedEntitiesDisplay below */}
              <div className="space-y-1.5 sm:space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {/* Address */}
                {lodging.address && (
                  <div className="flex flex-wrap gap-x-2">
                    <span className="font-medium flex-shrink-0">Address:</span>
                    <span className="line-clamp-2 sm:line-clamp-none">{lodging.address}</span>
                  </div>
                )}

                {/* Check-in */}
                <div className="flex flex-wrap gap-x-2">
                  <span className="font-medium">Check-in:</span>
                  <span>
                    {formatDateTime(lodging.checkInDate, lodging.timezone)}
                  </span>
                </div>

                {/* Check-out */}
                <div className="flex flex-wrap gap-x-2">
                  <span className="font-medium">Check-out:</span>
                  <span>
                    {formatDateTime(lodging.checkOutDate, lodging.timezone)}
                  </span>
                </div>

                {/* Confirmation Number */}
                {lodging.confirmationNumber && (
                  <div className="flex flex-wrap gap-x-2">
                    <span className="font-medium">Confirmation:</span>
                    <span>{lodging.confirmationNumber}</span>
                  </div>
                )}

                {/* Booking URL */}
                {lodging.bookingUrl && (
                  <div className="flex flex-wrap gap-x-2">
                    <span className="font-medium">Booking:</span>
                    <a
                      href={lodging.bookingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:underline dark:text-blue-400"
                    >
                      View Booking
                    </a>
                  </div>
                )}

                {/* Cost */}
                {lodging.cost && (
                  <div className="flex flex-wrap gap-x-2">
                    <span className="font-medium">Cost:</span>
                    <span>
                      {lodging.currency} {lodging.cost}
                    </span>
                  </div>
                )}

                {/* Notes */}
                {lodging.notes && (
                  <div className="mt-2">
                    <span className="font-medium">Notes:</span>
                    <p className="text-gray-600 dark:text-gray-400 mt-1 line-clamp-2 sm:line-clamp-none">
                      {lodging.notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Linked Entities */}
              <LinkedEntitiesDisplay
                tripId={tripId}
                entityType="LODGING"
                entityId={lodging.id}
                compact
              />

              {/* Actions - always at bottom on mobile */}
              <div className="flex items-center gap-2 mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <LinkButton
                  tripId={tripId}
                  entityType="LODGING"
                  entityId={lodging.id}
                  linkSummary={getLinkSummary('LODGING', lodging.id)}
                  onUpdate={invalidateLinkSummary}
                  size="sm"
                />
                <div className="flex-1" />
                <button
                  onClick={() => handleEdit(lodging)}
                  className="px-2.5 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 whitespace-nowrap"
                  aria-label={`Edit lodging ${lodging.name}`}
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(lodging.id)}
                  className="px-2.5 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 whitespace-nowrap"
                  aria-label={`Delete lodging ${lodging.name}`}
                >
                  Delete
                </button>
              </div>
            </div>
          );})
        )}
      </div>

      {/* Bulk Action Bar */}
      {bulkSelection.selectionMode && (
        <BulkActionBar
          entityType="lodging"
          selectedCount={bulkSelection.selectedCount}
          totalCount={manager.items.length}
          onSelectAll={() => bulkSelection.selectAll(manager.items)}
          onDeselectAll={bulkSelection.deselectAll}
          onExitSelectionMode={bulkSelection.exitSelectionMode}
          onBulkDelete={handleBulkDelete}
          onBulkEdit={() => setShowBulkEditModal(true)}
          isDeleting={isBulkDeleting}
          isEditing={isBulkEditing}
        />
      )}

      {/* Bulk Edit Modal */}
      <BulkEditModal
        isOpen={showBulkEditModal}
        onClose={() => setShowBulkEditModal(false)}
        entityType="lodging"
        selectedCount={bulkSelection.selectedCount}
        fields={bulkEditFields}
        onSubmit={handleBulkEdit}
        isSubmitting={isBulkEditing}
      />
    </div>
  );
}
