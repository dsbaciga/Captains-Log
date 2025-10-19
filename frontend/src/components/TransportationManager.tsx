import { useState, useEffect, useId } from "react";
import type {
  Transportation,
  TransportationType,
} from "../types/transportation";
import type { Location } from "../types/location";
import transportationService from "../services/transportation.service";
import toast from "react-hot-toast";

interface TransportationManagerProps {
  tripId: number;
  locations: Location[];
}

export default function TransportationManager({
  tripId,
  locations,
}: TransportationManagerProps) {
  const [transportations, setTransportations] = useState<Transportation[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const typeFieldId = useId();
  const fromLocationSelectId = useId();
  const toLocationSelectId = useId();
  const carrierFieldId = useId();
  const fromCustomFieldId = useId();
  const toCustomFieldId = useId();
  const departureFieldId = useId();
  const arrivalFieldId = useId();
  const startTimezoneFieldId = useId();
  const endTimezoneFieldId = useId();
  const vehicleNumberFieldId = useId();
  const confirmationFieldId = useId();
  const costFieldId = useId();
  const currencyFieldId = useId();
  const notesFieldId = useId();

  // Form state
  const [type, setType] = useState<TransportationType>("flight");
  const [fromLocationId, setFromLocationId] = useState<number | undefined>();
  const [toLocationId, setToLocationId] = useState<number | undefined>();
  const [fromLocationName, setFromLocationName] = useState("");
  const [toLocationName, setToLocationName] = useState("");
  const [departureTime, setDepartureTime] = useState("");
  const [arrivalTime, setArrivalTime] = useState("");
  const [startTimezone, setStartTimezone] = useState("");
  const [endTimezone, setEndTimezone] = useState("");
  const [carrier, setCarrier] = useState("");
  const [vehicleNumber, setVehicleNumber] = useState("");
  const [confirmationNumber, setConfirmationNumber] = useState("");
  const [cost, setCost] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadTransportations();
  }, [tripId]);

  const loadTransportations = async () => {
    try {
      const data = await transportationService.getTransportationByTrip(tripId);
      setTransportations(data);
    } catch (error) {
      toast.error("Failed to load transportation");
    }
  };

  const resetForm = () => {
    setType("flight");
    setFromLocationId(undefined);
    setToLocationId(undefined);
    setFromLocationName("");
    setToLocationName("");
    setDepartureTime("");
    setArrivalTime("");
    setStartTimezone("");
    setEndTimezone("");
    setCarrier("");
    setVehicleNumber("");
    setConfirmationNumber("");
    setCost("");
    setCurrency("USD");
    setNotes("");
    setEditingId(null);
  };

  const handleEdit = (transportation: Transportation) => {
    setEditingId(transportation.id);
    setType(transportation.type);
    setFromLocationId(transportation.fromLocationId || undefined);
    setToLocationId(transportation.toLocationId || undefined);
    setFromLocationName(transportation.fromLocationName || "");
    setToLocationName(transportation.toLocationName || "");
    setDepartureTime(
      transportation.departureTime
        ? new Date(transportation.departureTime).toISOString().slice(0, 16)
        : ""
    );
    setArrivalTime(
      transportation.arrivalTime
        ? new Date(transportation.arrivalTime).toISOString().slice(0, 16)
        : ""
    );
    setStartTimezone(transportation.startTimezone || "");
    setEndTimezone(transportation.endTimezone || "");
    setCarrier(transportation.carrier || "");
    setVehicleNumber(transportation.vehicleNumber || "");
    setConfirmationNumber(transportation.confirmationNumber || "");
    setCost(transportation.cost?.toString() || "");
    setCurrency(transportation.currency || "USD");
    setNotes(transportation.notes || "");
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const data = {
        tripId,
        type,
        fromLocationId,
        toLocationId,
        fromLocationName: fromLocationName || undefined,
        toLocationName: toLocationName || undefined,
        departureTime: departureTime || undefined,
        arrivalTime: arrivalTime || undefined,
        startTimezone: startTimezone || undefined,
        endTimezone: endTimezone || undefined,
        carrier: carrier || undefined,
        vehicleNumber: vehicleNumber || undefined,
        confirmationNumber: confirmationNumber || undefined,
        cost: cost ? parseFloat(cost) : undefined,
        currency: currency || undefined,
        notes: notes || undefined,
      };

      if (editingId) {
        await transportationService.updateTransportation(editingId, data);
        toast.success("Transportation updated");
      } else {
        await transportationService.createTransportation(data);
        toast.success("Transportation added");
      }

      resetForm();
      setShowForm(false);
      loadTransportations();
    } catch (error) {
      toast.error("Failed to save transportation");
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm("Delete this transportation?")) return;

    try {
      await transportationService.deleteTransportation(id);
      toast.success("Transportation deleted");
      loadTransportations();
    } catch (error) {
      toast.error("Failed to delete transportation");
    }
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

  const formatDateTime = (dateTime: string | null) => {
    if (!dateTime) return "Not set";
    return new Date(dateTime).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    });
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
            setShowForm(!showForm);
          }}
          className="btn btn-primary"
        >
          {showForm ? "Cancel" : "+ Add Transportation"}
        </button>
      </div>

      {showForm && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">
            {editingId ? "Edit Transportation" : "Add Transportation"}
          </h3>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={typeFieldId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Type *
                </label>
                <select
                  id={typeFieldId}
                  value={type}
                  onChange={(e) =>
                    setType(e.target.value as TransportationType)
                  }
                  className="input"
                  required
                >
                  <option value="flight">Flight</option>
                  <option value="train">Train</option>
                  <option value="bus">Bus</option>
                  <option value="car">Car</option>
                  <option value="ferry">Ferry</option>
                  <option value="bicycle">Bicycle</option>
                  <option value="walk">Walk</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor={carrierFieldId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Carrier / Operator
                </label>
                <input
                  type="text"
                  id={carrierFieldId}
                  value={carrier}
                  onChange={(e) => setCarrier(e.target.value)}
                  className="input"
                  placeholder="United Airlines, Amtrak, etc."
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={fromLocationSelectId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  From (Location)
                </label>
                <select
                  id={fromLocationSelectId}
                  value={fromLocationId || ""}
                  onChange={(e) =>
                    setFromLocationId(
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="input"
                >
                  <option value="">Select location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={fromCustomFieldId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  From (Custom)
                </label>
                <input
                  type="text"
                  id={fromCustomFieldId}
                  value={fromLocationName}
                  onChange={(e) => setFromLocationName(e.target.value)}
                  className="input"
                  placeholder="JFK Airport"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={toLocationSelectId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  To (Location)
                </label>
                <select
                  id={toLocationSelectId}
                  value={toLocationId || ""}
                  onChange={(e) =>
                    setToLocationId(
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="input"
                >
                  <option value="">Select location</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label
                  htmlFor={toCustomFieldId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  To (Custom)
                </label>
                <input
                  type="text"
                  id={toCustomFieldId}
                  value={toLocationName}
                  onChange={(e) => setToLocationName(e.target.value)}
                  className="input"
                  placeholder="LAX Airport"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={departureFieldId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Departure Time
                </label>
                <input
                  type="datetime-local"
                  id={departureFieldId}
                  value={departureTime}
                  onChange={(e) => setDepartureTime(e.target.value)}
                  className="input"
                />
              </div>

              <div>
                <label
                  htmlFor={arrivalFieldId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Arrival Time
                </label>
                <input
                  type="datetime-local"
                  id={arrivalFieldId}
                  value={arrivalTime}
                  onChange={(e) => setArrivalTime(e.target.value)}
                  className="input"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={startTimezoneFieldId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Departure Timezone
                </label>
                <select
                  id={startTimezoneFieldId}
                  value={startTimezone}
                  onChange={(e) => setStartTimezone(e.target.value)}
                  className="input"
                >
                  <option value="">Use trip timezone</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">Eastern Time (US & Canada)</option>
                  <option value="America/Chicago">Central Time (US & Canada)</option>
                  <option value="America/Denver">Mountain Time (US & Canada)</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                  <option value="America/Anchorage">Alaska</option>
                  <option value="Pacific/Honolulu">Hawaii</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Europe/Berlin">Berlin</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Asia/Shanghai">Shanghai</option>
                  <option value="Asia/Dubai">Dubai</option>
                  <option value="Australia/Sydney">Sydney</option>
                  <option value="Pacific/Auckland">Auckland</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor={endTimezoneFieldId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Arrival Timezone
                </label>
                <select
                  id={endTimezoneFieldId}
                  value={endTimezone}
                  onChange={(e) => setEndTimezone(e.target.value)}
                  className="input"
                >
                  <option value="">Use trip timezone</option>
                  <option value="UTC">UTC (Coordinated Universal Time)</option>
                  <option value="America/New_York">Eastern Time (US & Canada)</option>
                  <option value="America/Chicago">Central Time (US & Canada)</option>
                  <option value="America/Denver">Mountain Time (US & Canada)</option>
                  <option value="America/Los_Angeles">Pacific Time (US & Canada)</option>
                  <option value="America/Anchorage">Alaska</option>
                  <option value="Pacific/Honolulu">Hawaii</option>
                  <option value="Europe/London">London</option>
                  <option value="Europe/Paris">Paris</option>
                  <option value="Europe/Berlin">Berlin</option>
                  <option value="Asia/Tokyo">Tokyo</option>
                  <option value="Asia/Shanghai">Shanghai</option>
                  <option value="Asia/Dubai">Dubai</option>
                  <option value="Australia/Sydney">Sydney</option>
                  <option value="Pacific/Auckland">Auckland</option>
                </select>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  If not specified, the trip's timezone will be used
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={vehicleNumberFieldId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Vehicle / Flight Number
                </label>
                <input
                  type="text"
                  id={vehicleNumberFieldId}
                  value={vehicleNumber}
                  onChange={(e) => setVehicleNumber(e.target.value)}
                  className="input"
                  placeholder="UA123"
                />
              </div>

              <div>
                <label
                  htmlFor={confirmationFieldId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Confirmation Number
                </label>
                <input
                  type="text"
                  id={confirmationFieldId}
                  value={confirmationNumber}
                  onChange={(e) => setConfirmationNumber(e.target.value)}
                  className="input"
                  placeholder="ABC123"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor={costFieldId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Cost
                </label>
                <input
                  type="number"
                  step="0.01"
                  id={costFieldId}
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  className="input"
                  placeholder="0.00"
                />
              </div>

              <div>
                <label
                  htmlFor={currencyFieldId}
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Currency
                </label>
                <input
                  type="text"
                  id={currencyFieldId}
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="input"
                  maxLength={3}
                  placeholder="USD"
                />
              </div>
            </div>

            <div>
              <label
                htmlFor={notesFieldId}
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Notes
              </label>
              <textarea
                id={notesFieldId}
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                className="input"
                placeholder="Additional notes..."
              />
            </div>

            <button type="submit" className="btn btn-primary">
              {editingId ? "Update" : "Add"} Transportation
            </button>
          </form>
        </div>
      )}

      {transportations.length === 0 ? (
        <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-lg shadow">
          <p className="text-gray-500 dark:text-gray-400">
            No transportation added yet. Click "Add Transportation" to get
            started!
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {transportations.map((transport) => (
            <div
              key={transport.id}
              className="bg-white dark:bg-gray-800 rounded-lg shadow p-6 hover:shadow-lg transition-shadow"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-start space-x-4 flex-1">
                  <div className="text-4xl">{getTypeIcon(transport.type)}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="text-lg font-semibold capitalize">
                        {transport.type}
                      </h3>
                      {transport.carrier && (
                        <span className="text-sm text-gray-600 dark:text-gray-400">
                          • {transport.carrier}
                        </span>
                      )}
                      {transport.vehicleNumber && (
                        <span className="text-sm font-mono bg-gray-100 px-2 py-1 rounded">
                          {transport.vehicleNumber}
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-3">
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                          From
                        </div>
                        <div className="font-medium">
                          {transport.fromLocation?.name ||
                            transport.fromLocationName ||
                            "Not specified"}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDateTime(transport.departureTime)}
                        </div>
                        {transport.startTimezone && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            🌍 {transport.startTimezone}
                          </div>
                        )}
                      </div>
                      <div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 uppercase">
                          To
                        </div>
                        <div className="font-medium">
                          {transport.toLocation?.name ||
                            transport.toLocationName ||
                            "Not specified"}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {formatDateTime(transport.arrivalTime)}
                        </div>
                        {transport.endTimezone && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            🌍 {transport.endTimezone}
                          </div>
                        )}
                      </div>
                    </div>

                    {(transport.confirmationNumber ||
                      transport.cost !== null) && (
                      <div className="flex gap-4 text-sm text-gray-600 dark:text-gray-400">
                        {transport.confirmationNumber && (
                          <span>
                            Confirmation: {transport.confirmationNumber}
                          </span>
                        )}
                        {transport.cost !== null && (
                          <span>
                            Cost: {transport.currency}{" "}
                            {transport.cost.toFixed(2)}
                          </span>
                        )}
                      </div>
                    )}

                    {transport.notes && (
                      <p className="text-sm text-gray-700 mt-2">
                        {transport.notes}
                      </p>
                    )}
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => handleEdit(transport)}
                    className="btn-secondary"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(transport.id)}
                    className="btn-danger"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
