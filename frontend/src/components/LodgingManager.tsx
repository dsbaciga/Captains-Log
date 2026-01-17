import { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import type { Lodging, LodgingType, CreateLodgingInput, UpdateLodgingInput } from "../types/lodging";
import type { Location } from "../types/location";
import lodgingService from "../services/lodging.service";
import toast from "react-hot-toast";
import AssociatedAlbums from "./AssociatedAlbums";
import JournalEntriesButton from "./JournalEntriesButton";
import LinkButton from "./LinkButton";
import LinkedEntitiesDisplay from "./LinkedEntitiesDisplay";
import LocationQuickAdd from "./LocationQuickAdd";
import FormModal from "./FormModal";
import FormSection, { CollapsibleSection } from "./FormSection";
import { formatDateTimeInTimezone, convertISOToDateTimeLocal, convertDateTimeLocalToISO } from "../utils/timezone";
import { useFormFields } from "../hooks/useFormFields";
import { useManagerCRUD } from "../hooks/useManagerCRUD";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import { useTripLinkSummary } from "../hooks/useTripLinkSummary";
import EmptyState from "./EmptyState";
import TimezoneSelect from "./TimezoneSelect";
import CostCurrencyFields from "./CostCurrencyFields";
import BookingFields from "./BookingFields";
import { ListItemSkeleton } from "./SkeletonLoader";
import { getLastUsedCurrency, saveLastUsedCurrency } from "../utils/currencyStorage";

interface LodgingManagerProps {
  tripId: number;
  locations: Location[];
  tripTimezone?: string | null;
  tripStartDate?: string | null;
  onUpdate?: () => void;
}

interface LodgingFormFields {
  type: LodgingType;
  name: string;
  locationId: number | undefined;
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
  locationId: undefined,
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

  const [searchParams, setSearchParams] = useSearchParams();
  const [showLocationQuickAdd, setShowLocationQuickAdd] = useState(false);
  const [localLocations, setLocalLocations] = useState<Location[]>(locations);
  const [keepFormOpenAfterSave, setKeepFormOpenAfterSave] = useState(false);
  const [showMoreOptions, setShowMoreOptions] = useState(false);
  const [pendingEditId, setPendingEditId] = useState<number | null>(null);

  const { values, handleChange, reset } =
    useFormFields<LodgingFormFields>(getInitialFormState);

  // Sync localLocations with locations prop
  useEffect(() => {
    setLocalLocations(locations);
  }, [locations]);

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
      const item = manager.items.find((l) => l.id === pendingEditId);
      if (item) {
        setShowMoreOptions(true);
        handleChange("type", item.type);
        handleChange("name", item.name);
        handleChange("locationId", item.locationId || undefined);
        handleChange("address", item.address || "");

        const effectiveTz = item.timezone || tripTimezone || 'UTC';
        handleChange(
          "checkInDate",
          item.checkInDate
            ? convertISOToDateTimeLocal(item.checkInDate, effectiveTz)
            : ""
        );
        handleChange(
          "checkOutDate",
          item.checkOutDate
            ? convertISOToDateTimeLocal(item.checkOutDate, effectiveTz)
            : ""
        );
        handleChange("timezone", item.timezone || "");
        handleChange("confirmationNumber", item.confirmationNumber || "");
        handleChange("bookingUrl", item.bookingUrl || "");
        handleChange("cost", item.cost?.toString() || "");
        handleChange("currency", item.currency || "USD");
        handleChange("notes", item.notes || "");
        manager.openEditForm(item.id);
      }
      setPendingEditId(null);
    }
  }, [pendingEditId, manager.items, manager.loading, tripTimezone]);

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

  const resetForm = () => {
    reset();
    manager.setEditingId(null);
    setKeepFormOpenAfterSave(false);
    setShowMoreOptions(false);
  };

  const handleEdit = (lodging: Lodging) => {
    setShowMoreOptions(true); // Always show all options when editing
    handleChange("type", lodging.type);
    handleChange("name", lodging.name);
    handleChange("locationId", lodging.locationId || undefined);
    handleChange("address", lodging.address || "");

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
  };

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
      // For updates, send null to clear empty fields
      const updateData = {
        type: values.type,
        name: values.name,
        locationId: values.locationId || null,
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
        resetForm();
        manager.closeForm();
      }
    } else {
      // For creates, use undefined to omit optional fields
      const createData = {
        tripId,
        type: values.type,
        name: values.name,
        locationId: values.locationId,
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
      const success = await manager.handleCreate(createData);
      if (success) {
        // Save currency for next time
        if (values.currency) {
          saveLastUsedCurrency(values.currency);
        }

        if (keepFormOpenAfterSave) {
          // Reset form but keep modal open for quick successive entries
          reset();
          setKeepFormOpenAfterSave(false);
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

  const handleCloseForm = () => {
    resetForm();
    manager.closeForm();
  };

  return (
    <div className="space-y-6">
      <ConfirmDialogComponent />
      <div className="flex justify-between items-center gap-3">
        <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-white">
          Lodging
        </h2>
        <button
          onClick={() => {
            resetForm();
            manager.toggleForm();
          }}
          className="btn btn-primary text-sm sm:text-base whitespace-nowrap flex-shrink-0"
        >
          <span className="sm:hidden">+ Add</span>
          <span className="hidden sm:inline">+ Add Lodging</span>
        </button>
      </div>

      {/* Form Modal */}
      <FormModal
        isOpen={manager.showForm}
        onClose={handleCloseForm}
        title={manager.editingId ? "Edit Lodging" : "Add Lodging"}
        icon="🏨"
        formId="lodging-form"
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
                  (document.getElementById('lodging-form') as HTMLFormElement)?.requestSubmit();
                }}
                className="btn btn-secondary text-sm whitespace-nowrap"
              >
                <span className="hidden sm:inline">Save & Add Another</span>
                <span className="sm:hidden">Save & Add</span>
              </button>
            )}
            <button
              type="submit"
              form="lodging-form"
              className="btn btn-primary"
            >
              {manager.editingId ? "Update" : "Add"} Lodging
            </button>
          </>
        }
      >
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

      {/* Lodging List */}
      <div className="space-y-4">
        {manager.loading ? (
          <ListItemSkeleton count={3} />
        ) : manager.items.length === 0 ? (
          <EmptyState
            icon="🏨"
            message="No lodging added yet"
            subMessage="Add your hotels, hostels, vacation rentals, and other accommodations"
          />
        ) : (
          manager.items.map((lodging) => (
            <div
              key={lodging.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-3 sm:p-6 hover:shadow-md transition-shadow"
            >
              {/* Header with title and type */}
              <div className="flex items-start gap-2 mb-3 flex-wrap">
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
              <div className="space-y-1.5 sm:space-y-2 text-sm text-gray-700 dark:text-gray-300">
                {/* Location */}
                {lodging.location && (
                  <div className="flex flex-wrap gap-x-2">
                    <span className="font-medium">Location:</span>
                    <span>{lodging.location.name}</span>
                  </div>
                )}

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

              {/* Associated Albums - full width */}
              <div className="mt-3">
                <AssociatedAlbums
                  albums={lodging.photoAlbums}
                  tripId={tripId}
                />
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
                <JournalEntriesButton
                  journalEntries={lodging.journalAssignments}
                  tripId={tripId}
                />
                <div className="flex-1" />
                <button
                  onClick={() => handleEdit(lodging)}
                  className="px-2.5 py-1 text-sm bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300 rounded hover:bg-blue-200 dark:hover:bg-blue-800 whitespace-nowrap"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDelete(lodging.id)}
                  className="px-2.5 py-1 text-sm bg-red-100 dark:bg-red-900 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-800 whitespace-nowrap"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
