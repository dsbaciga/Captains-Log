import { useState, useEffect, useMemo } from "react";
import type { Lodging, LodgingType } from "../types/lodging";
import type { Location } from "../types/location";
import lodgingService from "../services/lodging.service";
import toast from "react-hot-toast";
import AssociatedAlbums from "./AssociatedAlbums";
import JournalEntriesButton from "./JournalEntriesButton";
import LocationQuickAdd from "./LocationQuickAdd";
import { formatDateTimeInTimezone } from "../utils/timezone";
import { useFormFields } from "../hooks/useFormFields";
import { useManagerCRUD } from "../hooks/useManagerCRUD";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import EmptyState from "./EmptyState";
import TimezoneSelect from "./TimezoneSelect";
import CostCurrencyFields from "./CostCurrencyFields";
import BookingFields from "./BookingFields";
import { ListItemSkeleton } from "./SkeletonLoader";

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
  const manager = useManagerCRUD<Lodging>(lodgingServiceAdapter, tripId, {
    itemName: "lodging",
    onUpdate,
  });

  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const [showLocationQuickAdd, setShowLocationQuickAdd] = useState(false);
  const [localLocations, setLocalLocations] = useState<Location[]>(locations);

  const { values, handleChange, reset } =
    useFormFields<LodgingFormFields>(getInitialFormState);

  // Sync localLocations with locations prop
  useEffect(() => {
    setLocalLocations(locations);
  }, [locations]);

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
    manager.setEditingId(null);
  };

  const handleEdit = (lodging: Lodging) => {
    handleChange("type", lodging.type);
    handleChange("name", lodging.name);
    handleChange("locationId", lodging.locationId || undefined);
    handleChange("address", lodging.address || "");
    handleChange(
      "checkInDate",
      lodging.checkInDate
        ? new Date(lodging.checkInDate).toISOString().slice(0, 16)
        : ""
    );
    handleChange(
      "checkOutDate",
      lodging.checkOutDate
        ? new Date(lodging.checkOutDate).toISOString().slice(0, 16)
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

    if (manager.editingId) {
      // For updates, send null to clear empty fields
      const updateData = {
        type: values.type,
        name: values.name,
        locationId: values.locationId || null,
        address: values.address || null,
        checkInDate: values.checkInDate,
        checkOutDate: values.checkOutDate,
        timezone: values.timezone || null,
        confirmationNumber: values.confirmationNumber || null,
        bookingUrl: values.bookingUrl || null,
        cost: values.cost ? parseFloat(values.cost) : null,
        currency: values.currency || null,
        notes: values.notes || null,
      };
      const success = await manager.handleUpdate(manager.editingId, updateData);
      if (success) {
        toast.success("Lodging updated");
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
        checkInDate: values.checkInDate,
        checkOutDate: values.checkOutDate,
        timezone: values.timezone || undefined,
        confirmationNumber: values.confirmationNumber || undefined,
        bookingUrl: values.bookingUrl || undefined,
        cost: values.cost ? parseFloat(values.cost) : undefined,
        currency: values.currency || undefined,
        notes: values.notes || undefined,
      };
      const success = await manager.handleCreate(createData);
      if (success) {
        toast.success("Lodging added");
        resetForm();
        manager.closeForm();
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

  return (
    <div className="space-y-6">
      <ConfirmDialogComponent />
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Lodging
        </h2>
        <button
          onClick={() => {
            resetForm();
            manager.toggleForm();
          }}
          className="btn btn-primary"
        >
          {manager.showForm ? "Cancel" : "+ Add Lodging"}
        </button>
      </div>

      {manager.showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {manager.editingId ? "Edit Lodging" : "Add Lodging"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Type Selection */}
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

              {/* Name */}
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

            {/* Location Selection with Quick Add */}
            <div>
              <label
                htmlFor="lodging-location"
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
                    + New Location
                  </button>
                </div>
              )}
            </div>

            {/* Address */}
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

            {/* Check-in and Check-out */}
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

            {/* Timezone Component */}
            <TimezoneSelect
              value={values.timezone}
              onChange={(value) => handleChange("timezone", value)}
              label="Timezone"
              helpText="Select the timezone for check-in/check-out times"
            />

            {/* Booking Fields Component */}
            <BookingFields
              confirmationNumber={values.confirmationNumber}
              bookingUrl={values.bookingUrl}
              onConfirmationNumberChange={(value) =>
                handleChange("confirmationNumber", value)
              }
              onBookingUrlChange={(value) => handleChange("bookingUrl", value)}
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

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={() => {
                  resetForm();
                  manager.closeForm();
                }}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                {manager.editingId ? "Update" : "Add"} Lodging
              </button>
            </div>
          </form>
        </div>
      )}

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
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-2xl">
                      {getTypeIcon(lodging.type)}
                    </span>
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {lodging.name}
                    </h3>
                    <span className="text-sm text-gray-500 dark:text-gray-400 capitalize">
                      ({lodging.type.replace("_", " ")})
                    </span>
                  </div>

                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    {/* Location */}
                    {lodging.location && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Location:</span>
                        <span>{lodging.location.name}</span>
                      </div>
                    )}

                    {/* Address */}
                    {lodging.address && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Address:</span>
                        <span>{lodging.address}</span>
                      </div>
                    )}

                    {/* Check-in */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Check-in:</span>
                      <span>
                        {formatDateTime(lodging.checkInDate, lodging.timezone)}
                      </span>
                    </div>

                    {/* Check-out */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Check-out:</span>
                      <span>
                        {formatDateTime(lodging.checkOutDate, lodging.timezone)}
                      </span>
                    </div>

                    {/* Confirmation Number */}
                    {lodging.confirmationNumber && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Confirmation:</span>
                        <span>{lodging.confirmationNumber}</span>
                      </div>
                    )}

                    {/* Booking URL */}
                    {lodging.bookingUrl && (
                      <div className="flex items-center gap-2">
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
                      <div className="flex items-center gap-2">
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
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                          {lodging.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 ml-4">
                  <AssociatedAlbums
                    albums={lodging.photoAlbums}
                    tripId={tripId}
                  />
                  <JournalEntriesButton
                    journalEntries={lodging.journalAssignments}
                    tripId={tripId}
                  />
                  <button
                    onClick={() => handleEdit(lodging)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(lodging.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
