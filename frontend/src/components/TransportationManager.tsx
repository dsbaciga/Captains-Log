import { useMemo, useState, useEffect } from "react";
import type {
  Transportation,
  TransportationType,
  CreateTransportationInput,
  UpdateTransportationInput,
} from "../types/transportation";
import type { Location } from "../types/location";
import transportationService from "../services/transportation.service";
import JournalEntriesButton from "./JournalEntriesButton";
import FormModal from "./FormModal";
import { formatDateTimeInTimezone, convertISOToDateTimeLocal, convertDateTimeLocalToISO } from "../utils/timezone";
import { useFormFields } from "../hooks/useFormFields";
import { useManagerCRUD } from "../hooks/useManagerCRUD";
import { useConfirmDialog } from "../hooks/useConfirmDialog";
import EmptyState from "./EmptyState";
import TimezoneSelect from "./TimezoneSelect";
import CostCurrencyFields from "./CostCurrencyFields";
import BookingFields from "./BookingFields";
import FlightRouteMap from "./FlightRouteMap";
import TransportationStats from "./TransportationStats";
import LocationQuickAdd from "./LocationQuickAdd";
import { getLastUsedCurrency, saveLastUsedCurrency } from "../utils/currencyStorage";

interface TransportationManagerProps {
  tripId: number;
  locations: Location[];
  tripTimezone?: string | null;
  tripStartDate?: string | null;
  onUpdate?: () => void;
}

interface TransportationFormFields {
  type: TransportationType;
  fromLocationId: number | undefined;
  toLocationId: number | undefined;
  fromLocationName: string;
  toLocationName: string;
  departureTime: string;
  arrivalTime: string;
  startTimezone: string;
  endTimezone: string;
  carrier: string;
  vehicleNumber: string;
  confirmationNumber: string;
  cost: string;
  currency: string;
  notes: string;
}

const initialFormState: TransportationFormFields = {
  type: "flight",
  fromLocationId: undefined,
  toLocationId: undefined,
  fromLocationName: "",
  toLocationName: "",
  departureTime: "",
  arrivalTime: "",
  startTimezone: "",
  endTimezone: "",
  carrier: "",
  vehicleNumber: "",
  confirmationNumber: "",
  cost: "",
  currency: "USD",
  notes: "",
};

type FilterTab = "all" | "upcoming" | "historical";

export default function TransportationManager({
  tripId,
  locations,
  tripTimezone,
  tripStartDate,
  onUpdate,
}: TransportationManagerProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Compute initial form state with trip start date as default
  const getInitialFormState = useMemo((): TransportationFormFields => {
    // Format as datetime-local (YYYY-MM-DDTHH:mm) - default to 09:00
    const defaultDateTime = tripStartDate
      ? `${tripStartDate.slice(0, 10)}T09:00`
      : "";
    return {
      ...initialFormState,
      departureTime: defaultDateTime,
      arrivalTime: defaultDateTime,
      currency: getLastUsedCurrency(), // Remember last-used currency
    };
  }, [tripStartDate]);

  // Service adapter for useManagerCRUD hook (memoized to prevent infinite loops)
  const transportationServiceAdapter = useMemo(() => ({
    getByTrip: transportationService.getTransportationByTrip,
    create: transportationService.createTransportation,
    update: transportationService.updateTransportation,
    delete: transportationService.deleteTransportation,
  }), []);

  // Initialize CRUD hook
  const manager = useManagerCRUD<Transportation, CreateTransportationInput, UpdateTransportationInput>(transportationServiceAdapter, tripId, {
    itemName: "transportation",
    onUpdate,
  });

  const { confirm, ConfirmDialogComponent } = useConfirmDialog();

  const { values, handleChange, reset } =
    useFormFields<TransportationFormFields>(getInitialFormState);

  const [showFromLocationQuickAdd, setShowFromLocationQuickAdd] = useState(false);
  const [showToLocationQuickAdd, setShowToLocationQuickAdd] = useState(false);
  const [localLocations, setLocalLocations] = useState<Location[]>(locations);
  const [keepFormOpenAfterSave, setKeepFormOpenAfterSave] = useState(false);

  // Smart timezone inference: auto-populate timezones when locations are selected
  useEffect(() => {
    if (values.fromLocationId && !values.startTimezone && tripTimezone) {
      handleChange("startTimezone", tripTimezone);
    }
  }, [values.fromLocationId, tripTimezone]);

  useEffect(() => {
    if (values.toLocationId && !values.endTimezone && tripTimezone) {
      handleChange("endTimezone", tripTimezone);
    }
  }, [values.toLocationId, tripTimezone]);

  // Sync localLocations with locations prop
  useEffect(() => {
    setLocalLocations(locations);
  }, [locations]);

  // Auto-fill: Transportation Connection Chaining - next from location = previous to location
  useEffect(() => {
    // Only when creating (not editing) and form just opened
    if (!manager.editingId && manager.showForm && values.departureTime === getInitialFormState.departureTime) {
      // Find the most recent transportation (by arrival time)
      const sortedTransportation = [...manager.items]
        .filter(t => t.arrivalTime)
        .sort((a, b) => new Date(b.arrivalTime!).getTime() - new Date(a.arrivalTime!).getTime());

      if (sortedTransportation.length > 0) {
        const lastTransport = sortedTransportation[0];

        // Auto-fill from location with previous to location
        if (lastTransport.toLocationId && !values.fromLocationId) {
          handleChange('fromLocationId', lastTransport.toLocationId);
        } else if (lastTransport.toLocationName && !values.fromLocationName) {
          handleChange('fromLocationName', lastTransport.toLocationName);
        }

        // Auto-fill departure time = arrival time + 2 hours (layover buffer)
        if (lastTransport.arrivalTime) {
          const effectiveTz = lastTransport.endTimezone || tripTimezone || 'UTC';
          const arrivalDateTime = convertISOToDateTimeLocal(lastTransport.arrivalTime, effectiveTz);

          // Add 2 hours for connection/layover
          const arrivalDate = new Date(arrivalDateTime);
          arrivalDate.setHours(arrivalDate.getHours() + 2);

          // Format as datetime-local
          const departureDateTime = arrivalDate.toISOString().slice(0, 16).replace('T', 'T');
          handleChange('departureTime', departureDateTime);

          // Inherit start timezone
          if (lastTransport.endTimezone && !values.startTimezone) {
            handleChange('startTimezone', lastTransport.endTimezone);
          }
        }
      }
    }
  }, [manager.showForm, manager.editingId]);

  // Filter transportation based on active tab
  const filteredItems = useMemo(() => {
    if (activeTab === "all") return manager.items;
    if (activeTab === "upcoming") {
      return manager.items.filter((t) => t.isUpcoming);
    }
    if (activeTab === "historical") {
      return manager.items.filter((t) => !t.isUpcoming);
    }
    return manager.items;
  }, [manager.items, activeTab]);

  // Calculate counts for tab badges
  const counts = useMemo(() => {
    const upcoming = manager.items.filter((t) => t.isUpcoming).length;
    const historical = manager.items.filter((t) => !t.isUpcoming).length;
    return { all: manager.items.length, upcoming, historical };
  }, [manager.items]);

  const resetForm = () => {
    reset();
    manager.setEditingId(null);
    setKeepFormOpenAfterSave(false);
  };

  const handleFromLocationCreated = (locationId: number, locationName: string) => {
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
    handleChange("fromLocationId", locationId);
    setShowFromLocationQuickAdd(false);
  };

  const handleToLocationCreated = (locationId: number, locationName: string) => {
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
    handleChange("toLocationId", locationId);
    setShowToLocationQuickAdd(false);
  };

  const handleEdit = (transportation: Transportation) => {
    handleChange("type", transportation.type);
    handleChange("fromLocationId", transportation.fromLocationId || undefined);
    handleChange("toLocationId", transportation.toLocationId || undefined);
    handleChange("fromLocationName", transportation.fromLocationName || "");
    handleChange("toLocationName", transportation.toLocationName || "");

    // Convert stored UTC times to local times in their respective timezones
    const effectiveStartTz = transportation.startTimezone || tripTimezone || 'UTC';
    const effectiveEndTz = transportation.endTimezone || tripTimezone || 'UTC';

    handleChange(
      "departureTime",
      transportation.departureTime
        ? convertISOToDateTimeLocal(transportation.departureTime, effectiveStartTz)
        : ""
    );
    handleChange(
      "arrivalTime",
      transportation.arrivalTime
        ? convertISOToDateTimeLocal(transportation.arrivalTime, effectiveEndTz)
        : ""
    );
    handleChange("startTimezone", transportation.startTimezone || "");
    handleChange("endTimezone", transportation.endTimezone || "");
    handleChange("carrier", transportation.carrier || "");
    handleChange("vehicleNumber", transportation.vehicleNumber || "");
    handleChange("confirmationNumber", transportation.confirmationNumber || "");
    handleChange("cost", transportation.cost?.toString() || "");
    handleChange("currency", transportation.currency || "USD");
    handleChange("notes", transportation.notes || "");
    manager.openEditForm(transportation.id);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Convert datetime-local values to ISO strings using the specified timezones
    const effectiveStartTz = values.startTimezone || tripTimezone || 'UTC';
    const effectiveEndTz = values.endTimezone || tripTimezone || 'UTC';

    const departureTimeISO = values.departureTime
      ? convertDateTimeLocalToISO(values.departureTime, effectiveStartTz)
      : null;
    const arrivalTimeISO = values.arrivalTime
      ? convertDateTimeLocalToISO(values.arrivalTime, effectiveEndTz)
      : null;

    if (manager.editingId) {
      // For updates, send null to clear empty fields
      const updateData = {
        type: values.type,
        fromLocationId: values.fromLocationId || null,
        toLocationId: values.toLocationId || null,
        fromLocationName: values.fromLocationName || null,
        toLocationName: values.toLocationName || null,
        departureTime: departureTimeISO,
        arrivalTime: arrivalTimeISO,
        startTimezone: values.startTimezone || null,
        endTimezone: values.endTimezone || null,
        carrier: values.carrier || null,
        vehicleNumber: values.vehicleNumber || null,
        confirmationNumber: values.confirmationNumber || null,
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
        fromLocationId: values.fromLocationId,
        toLocationId: values.toLocationId,
        fromLocationName: values.fromLocationName || undefined,
        toLocationName: values.toLocationName || undefined,
        departureTime: departureTimeISO || undefined,
        arrivalTime: arrivalTimeISO || undefined,
        startTimezone: values.startTimezone || undefined,
        endTimezone: values.endTimezone || undefined,
        carrier: values.carrier || undefined,
        vehicleNumber: values.vehicleNumber || undefined,
        confirmationNumber: values.confirmationNumber || undefined,
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
            const firstInput = document.querySelector<HTMLSelectElement>('#transportation-type');
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
      title: "Delete Transportation",
      message: "Delete this transportation? This action cannot be undone.",
      confirmLabel: "Delete",
      variant: "danger",
    });
    if (!confirmed) return;
    await manager.handleDelete(id);
  };

  const getTypeIcon = (type: TransportationType) => {
    switch (type) {
      case "flight":
        return "✈️";
      case "train":
        return "🚆";
      case "bus":
        return "🚌";
      case "car":
        return "🚗";
      case "ferry":
        return "⛴️";
      case "bicycle":
        return "🚴";
      case "walk":
        return "🚶";
      default:
        return "🚀";
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

  const formatDuration = (minutes: number): string => {
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    if (hours > 0 && mins > 0) {
      return `${hours}h ${mins}m`;
    } else if (hours > 0) {
      return `${hours}h`;
    } else {
      return `${mins}m`;
    }
  };

  const formatDistance = (kilometers: number | null | undefined): string => {
    if (kilometers == null || typeof kilometers !== 'number' || isNaN(kilometers)) {
      return 'Unknown distance';
    }
    const miles = kilometers * 0.621371;
    return `${kilometers.toFixed(1)} km (${miles.toFixed(1)} mi)`;
  };

  const getStatusBadge = (transportation: Transportation) => {
    if (transportation.isInProgress) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200">
          In Progress
        </span>
      );
    }
    if (transportation.isUpcoming) {
      return (
        <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
          Upcoming
        </span>
      );
    }
    return (
      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
        Completed
      </span>
    );
  };

  const handleCloseForm = () => {
    resetForm();
    manager.closeForm();
  };

  return (
    <div className="space-y-6">
      <ConfirmDialogComponent />
      <div className="flex flex-wrap justify-between items-center gap-4">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white min-w-0 flex-1 truncate">
          Transportation
        </h2>
        <button
          onClick={() => {
            resetForm();
            manager.toggleForm();
          }}
          className="btn btn-primary whitespace-nowrap flex-shrink-0"
        >
          + Add Transportation
        </button>
      </div>

      {/* Statistics */}
      {manager.items.length > 0 && (
        <TransportationStats transportation={manager.items} />
      )}

      {/* Filter Tabs */}
      {manager.items.length > 0 && (
        <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
          <button
            onClick={() => setActiveTab("all")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === "all"
                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            All {counts.all > 0 && `(${counts.all})`}
          </button>
          <button
            onClick={() => setActiveTab("upcoming")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === "upcoming"
                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Upcoming {counts.upcoming > 0 && `(${counts.upcoming})`}
          </button>
          <button
            onClick={() => setActiveTab("historical")}
            className={`px-4 py-2 font-medium text-sm transition-colors ${
              activeTab === "historical"
                ? "border-b-2 border-blue-600 text-blue-600 dark:text-blue-400"
                : "text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
            }`}
          >
            Historical {counts.historical > 0 && `(${counts.historical})`}
          </button>
        </div>
      )}

      {/* Form Modal */}
      <FormModal
        isOpen={manager.showForm}
        onClose={handleCloseForm}
        title={manager.editingId ? "Edit Transportation" : "Add Transportation"}
        icon="🚀"
        formId="transportation-form"
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
                  (document.getElementById('transportation-form') as HTMLFormElement)?.requestSubmit();
                }}
                className="btn btn-secondary"
              >
                Save & Add Another
              </button>
            )}
            <button
              type="submit"
              form="transportation-form"
              className="btn btn-primary"
            >
              {manager.editingId ? "Update" : "Add"} Transportation
            </button>
          </>
        }
      >
        <form id="transportation-form" onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Type Selection */}
            <div>
              <label
                htmlFor="transportation-type"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                  Type *
                </label>
                <select
                  id="transportation-type"
                  value={values.type}
                  onChange={(e) =>
                    handleChange("type", e.target.value as TransportationType)
                  }
                  className="input"
                  required
                >
                  <option value="flight">✈️ Flight</option>
                  <option value="train">🚆 Train</option>
                  <option value="bus">🚌 Bus</option>
                  <option value="car">🚗 Car</option>
                  <option value="ferry">⛴️ Ferry</option>
                  <option value="bicycle">🚴 Bicycle</option>
                  <option value="walk">🚶 Walk</option>
                  <option value="other">🚀 Other</option>
                </select>
              </div>

              {/* Carrier/Company */}
              <div>
                <label
                  htmlFor="transportation-carrier"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Carrier/Company
                </label>
                <input
                  type="text"
                  id="transportation-carrier"
                  value={values.carrier}
                  onChange={(e) => handleChange("carrier", e.target.value)}
                  className="input"
                  placeholder="e.g., United Airlines"
                />
              </div>
            </div>

            {/* From Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="transportation-from-location"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  From Location (e.g., Airport)
                </label>
                <select
                  id="transportation-from-location"
                  value={values.fromLocationId || ""}
                  onChange={(e) =>
                    handleChange(
                      "fromLocationId",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="input"
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
                  onClick={() => setShowFromLocationQuickAdd(!showFromLocationQuickAdd)}
                  className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showFromLocationQuickAdd ? "Cancel" : "🔍 Search for Airport/Location"}
                </button>
                {showFromLocationQuickAdd && (
                  <div className="mt-2">
                    <LocationQuickAdd
                      tripId={tripId}
                      onLocationCreated={handleFromLocationCreated}
                      onCancel={() => setShowFromLocationQuickAdd(false)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="transportation-from-custom"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Or Custom Text (not recommended)
                </label>
                <input
                  type="text"
                  id="transportation-from-custom"
                  value={values.fromLocationName}
                  onChange={(e) =>
                    handleChange("fromLocationName", e.target.value)
                  }
                  className="input"
                  placeholder="e.g., JFK Airport (no distance tracking)"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ⚠️ Custom text won't calculate distance. Use search instead.
                </p>
              </div>
            </div>

            {/* To Location */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="transportation-to-location"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  To Location (e.g., Airport)
                </label>
                <select
                  id="transportation-to-location"
                  value={values.toLocationId || ""}
                  onChange={(e) =>
                    handleChange(
                      "toLocationId",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="input"
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
                  onClick={() => setShowToLocationQuickAdd(!showToLocationQuickAdd)}
                  className="mt-2 text-sm text-blue-600 dark:text-blue-400 hover:underline"
                >
                  {showToLocationQuickAdd ? "Cancel" : "🔍 Search for Airport/Location"}
                </button>
                {showToLocationQuickAdd && (
                  <div className="mt-2">
                    <LocationQuickAdd
                      tripId={tripId}
                      onLocationCreated={handleToLocationCreated}
                      onCancel={() => setShowToLocationQuickAdd(false)}
                    />
                  </div>
                )}
              </div>

              <div>
                <label
                  htmlFor="transportation-to-custom"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Or Custom Text (not recommended)
                </label>
                <input
                  type="text"
                  id="transportation-to-custom"
                  value={values.toLocationName}
                  onChange={(e) =>
                    handleChange("toLocationName", e.target.value)
                  }
                  className="input"
                  placeholder="e.g., LAX Airport (no distance tracking)"
                />
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  ⚠️ Custom text won't calculate distance. Use search instead.
                </p>
              </div>
            </div>

            {/* Departure Time and Timezone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="transportation-departure-time"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Departure Time
                </label>
                <input
                  type="datetime-local"
                  id="transportation-departure-time"
                  value={values.departureTime}
                  onChange={(e) =>
                    handleChange("departureTime", e.target.value)
                  }
                  className="input"
                />
              </div>

              <TimezoneSelect
                value={values.startTimezone}
                onChange={(value) => handleChange("startTimezone", value)}
                label="Departure Timezone"
              />
            </div>

            {/* Arrival Time and Timezone */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="transportation-arrival-time"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Arrival Time
                </label>
                <input
                  type="datetime-local"
                  id="transportation-arrival-time"
                  value={values.arrivalTime}
                  onChange={(e) => handleChange("arrivalTime", e.target.value)}
                  className="input"
                />
              </div>

              <TimezoneSelect
                value={values.endTimezone}
                onChange={(value) => handleChange("endTimezone", value)}
                label="Arrival Timezone"
              />
            </div>

            {/* Vehicle Number */}
            <div>
              <label
                htmlFor="transportation-vehicle-number"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Flight/Train/Vehicle Number
              </label>
              <input
                type="text"
                id="transportation-vehicle-number"
                value={values.vehicleNumber}
                onChange={(e) => handleChange("vehicleNumber", e.target.value)}
                className="input"
                placeholder="e.g., UA 123"
              />
            </div>

            {/* Booking Fields Component */}
            <BookingFields
              confirmationNumber={values.confirmationNumber}
              bookingUrl=""
              onConfirmationNumberChange={(value) =>
                handleChange("confirmationNumber", value)
              }
              onBookingUrlChange={() => {}}
              confirmationLabel="Confirmation Number"
              hideBookingUrl={true}
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
                htmlFor="transportation-notes"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Notes
              </label>
              <textarea
                id="transportation-notes"
                value={values.notes}
                onChange={(e) => handleChange("notes", e.target.value)}
                className="input"
                rows={3}
                placeholder="Additional notes..."
              />
            </div>
          </form>
        </FormModal>

      {/* Transportation List */}
      <div className="space-y-4">
        {manager.items.length === 0 ? (
          <EmptyState
            icon="🚗"
            message="No transportation added yet"
            subMessage="Add your flights, trains, buses, and other transportation"
          />
        ) : filteredItems.length === 0 ? (
          <EmptyState
            icon="🔍"
            message={`No ${activeTab} transportation`}
            subMessage={`Try selecting a different filter`}
          />
        ) : (
          filteredItems.map((transportation) => (
            <div
              key={transportation.id}
              className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow p-6 hover:shadow-md transition-shadow"
            >
              {/* Route Map - Show for all transportation with route data */}
              {transportation.route && (
                <div className="mb-4">
                  <FlightRouteMap
                    route={transportation.route}
                    height="250px"
                    transportationType={transportation.type as "flight" | "train" | "bus" | "car" | "ferry" | "bicycle" | "walk" | "other"}
                  />
                </div>
              )}

              <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2 mb-2 flex-wrap">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-2xl">
                        {getTypeIcon(transportation.type)}
                      </span>
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-white capitalize">
                        {transportation.type}
                      </h3>
                      {transportation.carrier && (
                        <span className="text-gray-600 dark:text-gray-400">
                          - {transportation.carrier}
                        </span>
                      )}
                      {transportation.vehicleNumber && (
                        <span className="text-sm text-gray-500 dark:text-gray-500">
                          #{transportation.vehicleNumber}
                        </span>
                      )}
                    </div>
                    <div className="w-full sm:w-auto">
                      {getStatusBadge(transportation)}
                    </div>
                  </div>

                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    {/* Route */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Route:</span>
                      <span>
                        {transportation.fromLocation?.name ||
                          transportation.fromLocationName ||
                          (transportation.fromLocationId ? `Location #${transportation.fromLocationId} (deleted?)` : "Unknown")}{" "}
                        →{" "}
                        {transportation.toLocation?.name ||
                          transportation.toLocationName ||
                          (transportation.toLocationId ? `Location #${transportation.toLocationId} (deleted?)` : "Unknown")}
                      </span>
                    </div>

                    {/* Departure */}
                    {transportation.departureTime && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Departure:</span>
                        <span>
                          {formatDateTime(
                            transportation.departureTime,
                            transportation.startTimezone
                          )}
                        </span>
                      </div>
                    )}

                    {/* Arrival */}
                    {transportation.arrivalTime && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Arrival:</span>
                        <span>
                          {formatDateTime(
                            transportation.arrivalTime,
                            transportation.endTimezone
                          )}
                        </span>
                      </div>
                    )}

                    {/* Duration */}
                    {transportation.durationMinutes && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Duration:</span>
                        <span>{formatDuration(transportation.durationMinutes)}</span>
                      </div>
                    )}

                    {/* Distance */}
                    {transportation.calculatedDistance && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Distance:</span>
                        <span>{formatDistance(transportation.calculatedDistance)}</span>
                      </div>
                    )}

                    {/* Flight Tracking Info */}
                    {transportation.flightTracking && (
                      <>
                        {transportation.flightTracking.gate && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Gate:</span>
                            <span>{transportation.flightTracking.gate}</span>
                          </div>
                        )}
                        {transportation.flightTracking.terminal && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Terminal:</span>
                            <span>{transportation.flightTracking.terminal}</span>
                          </div>
                        )}
                        {transportation.flightTracking.baggageClaim && (
                          <div className="flex items-center gap-2">
                            <span className="font-medium">Baggage Claim:</span>
                            <span>{transportation.flightTracking.baggageClaim}</span>
                          </div>
                        )}
                      </>
                    )}

                    {/* Confirmation Number */}
                    {transportation.confirmationNumber && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Confirmation:</span>
                        <span>{transportation.confirmationNumber}</span>
                      </div>
                    )}

                    {/* Cost */}
                    {transportation.cost && (
                      <div className="flex items-center gap-2">
                        <span className="font-medium">Cost:</span>
                        <span>
                          {transportation.currency} {transportation.cost}
                        </span>
                      </div>
                    )}

                    {/* Notes */}
                    {transportation.notes && (
                      <div className="mt-2">
                        <span className="font-medium">Notes:</span>
                        <p className="text-gray-600 dark:text-gray-400 mt-1">
                          {transportation.notes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 flex-shrink-0 self-start">
                  <JournalEntriesButton
                    journalEntries={transportation.journalAssignments}
                    tripId={tripId}
                  />
                  <button
                    onClick={() => handleEdit(transportation)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 whitespace-nowrap text-sm sm:text-base"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(transportation.id)}
                    className="text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 whitespace-nowrap text-sm sm:text-base"
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
