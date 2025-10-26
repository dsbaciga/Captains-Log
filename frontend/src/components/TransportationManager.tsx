import { useMemo, useState } from "react";
import type {
  Transportation,
  TransportationType,
} from "../types/transportation";
import type { Location } from "../types/location";
import transportationService from "../services/transportation.service";
import toast from "react-hot-toast";
import JournalEntriesButton from "./JournalEntriesButton";
import { formatDateTimeInTimezone } from "../utils/timezone";
import { useFormFields } from "../hooks/useFormFields";
import { useManagerCRUD } from "../hooks/useManagerCRUD";
import EmptyState from "./EmptyState";
import TimezoneSelect from "./TimezoneSelect";
import CostCurrencyFields from "./CostCurrencyFields";
import BookingFields from "./BookingFields";
import FlightRouteMap from "./FlightRouteMap";
import TransportationStats from "./TransportationStats";

interface TransportationManagerProps {
  tripId: number;
  locations: Location[];
  tripTimezone?: string | null;
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
  onUpdate,
}: TransportationManagerProps) {
  const [activeTab, setActiveTab] = useState<FilterTab>("all");

  // Service adapter for useManagerCRUD hook (memoized to prevent infinite loops)
  const transportationServiceAdapter = useMemo(() => ({
    getByTrip: transportationService.getTransportationByTrip,
    create: transportationService.createTransportation,
    update: transportationService.updateTransportation,
    delete: transportationService.deleteTransportation,
  }), []);

  // Initialize CRUD hook
  const manager = useManagerCRUD<Transportation>(transportationServiceAdapter, tripId, {
    itemName: "transportation",
    onUpdate,
  });

  const { values, handleChange, reset } =
    useFormFields<TransportationFormFields>(initialFormState);

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
  };

  const handleEdit = (transportation: Transportation) => {
    handleChange("type", transportation.type);
    handleChange("fromLocationId", transportation.fromLocationId || undefined);
    handleChange("toLocationId", transportation.toLocationId || undefined);
    handleChange("fromLocationName", transportation.fromLocationName || "");
    handleChange("toLocationName", transportation.toLocationName || "");
    handleChange(
      "departureTime",
      transportation.departureTime
        ? new Date(transportation.departureTime).toISOString().slice(0, 16)
        : ""
    );
    handleChange(
      "arrivalTime",
      transportation.arrivalTime
        ? new Date(transportation.arrivalTime).toISOString().slice(0, 16)
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

    if (manager.editingId) {
      // For updates, send null to clear empty fields
      const updateData = {
        tripId,
        type: values.type,
        fromLocationId: values.fromLocationId,
        toLocationId: values.toLocationId,
        fromLocationName: values.fromLocationName || null,
        toLocationName: values.toLocationName || null,
        departureTime: values.departureTime || null,
        arrivalTime: values.arrivalTime || null,
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
        toast.success("Transportation updated");
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
        departureTime: values.departureTime || undefined,
        arrivalTime: values.arrivalTime || undefined,
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
        toast.success("Transportation added");
        resetForm();
        manager.closeForm();
      }
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this transportation?")) return;
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Transportation
        </h2>
        <button
          onClick={() => {
            resetForm();
            manager.toggleForm();
          }}
          className="btn btn-primary"
        >
          {manager.showForm ? "Cancel" : "+ Add Transportation"}
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

      {manager.showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {manager.editingId ? "Edit Transportation" : "Add Transportation"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="transportation-from-location"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  From Location
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
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="transportation-from-custom"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Or Custom From Location
                </label>
                <input
                  type="text"
                  id="transportation-from-custom"
                  value={values.fromLocationName}
                  onChange={(e) =>
                    handleChange("fromLocationName", e.target.value)
                  }
                  className="input"
                  placeholder="e.g., JFK Airport"
                />
              </div>
            </div>

            {/* To Location */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="transportation-to-location"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  To Location
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
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor="transportation-to-custom"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Or Custom To Location
                </label>
                <input
                  type="text"
                  id="transportation-to-custom"
                  value={values.toLocationName}
                  onChange={(e) =>
                    handleChange("toLocationName", e.target.value)
                  }
                  className="input"
                  placeholder="e.g., LAX Airport"
                />
              </div>
            </div>

            {/* Departure Time and Timezone */}
            <div className="grid grid-cols-2 gap-4">
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
            <div className="grid grid-cols-2 gap-4">
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
                {manager.editingId ? "Update" : "Add"} Transportation
              </button>
            </div>
          </form>
        </div>
      )}

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
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
            >
              {/* Route Map - Show for flights with route data */}
              {transportation.type === "flight" && transportation.route && (
                <div className="mb-4">
                  <FlightRouteMap route={transportation.route} height="250px" />
                </div>
              )}

              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
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
                    {getStatusBadge(transportation)}
                  </div>

                  <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                    {/* Route */}
                    <div className="flex items-center gap-2">
                      <span className="font-medium">Route:</span>
                      <span>
                        {transportation.fromLocation?.name ||
                          transportation.fromLocationName ||
                          "Unknown"}{" "}
                        →{" "}
                        {transportation.toLocation?.name ||
                          transportation.toLocationName ||
                          "Unknown"}
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
                <div className="flex items-center gap-2 ml-4">
                  <JournalEntriesButton
                    journalEntries={transportation.journalAssignments}
                    tripId={tripId}
                  />
                  <button
                    onClick={() => handleEdit(transportation)}
                    className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(transportation.id)}
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
