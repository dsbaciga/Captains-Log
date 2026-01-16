import { useState, useEffect } from "react";
import type { Activity } from "../types/activity";
import type { Transportation } from "../types/transportation";
import type { Lodging } from "../types/lodging";
import type { Location } from "../types/location";
import type { ActivityCategory } from "../types/user";
import activityService from "../services/activity.service";
import transportationService from "../services/transportation.service";
import lodgingService from "../services/lodging.service";
import userService from "../services/user.service";
import toast from "react-hot-toast";
import AssociatedAlbums from "./AssociatedAlbums";
import { useFormFields } from "../hooks/useFormFields";
import EmptyState from "./EmptyState";
import TimezoneSelect from "./TimezoneSelect";
import CostCurrencyFields from "./CostCurrencyFields";
import BookingFields from "./BookingFields";

interface UnscheduledItemsProps {
  tripId: number;
  locations: Location[];
  tripTimezone?: string | null;
  onUpdate?: () => void;
}

type EntityType = "activity" | "transportation" | "lodging";

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

interface TransportationFormFields {
  type: string;
  fromLocationId: number | undefined;
  toLocationId: number | undefined;
  fromLocationName: string;
  toLocationName: string;
  departureDate: string;
  departureTime: string;
  arrivalDate: string;
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

interface LodgingFormFields {
  type: string;
  name: string;
  locationId: number | undefined;
  address: string;
  checkInDate: string;
  checkOutDate: string;
  timezone: string;
  confirmationNumber: string;
  cost: string;
  currency: string;
  bookingUrl: string;
  notes: string;
}

const initialActivityFormState: ActivityFormFields = {
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

const initialTransportationFormState: TransportationFormFields = {
  type: "flight",
  fromLocationId: undefined,
  toLocationId: undefined,
  fromLocationName: "",
  toLocationName: "",
  departureDate: "",
  departureTime: "",
  arrivalDate: "",
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

const initialLodgingFormState: LodgingFormFields = {
  type: "hotel",
  name: "",
  locationId: undefined,
  address: "",
  checkInDate: "",
  checkOutDate: "",
  timezone: "",
  confirmationNumber: "",
  cost: "",
  currency: "USD",
  bookingUrl: "",
  notes: "",
};

export default function UnscheduledItems({
  tripId,
  locations,
  onUpdate,
}: UnscheduledItemsProps) {
  const [activities, setActivities] = useState<Activity[]>([]);
  const [transportation, setTransportation] = useState<Transportation[]>([]);
  const [lodging, setLodging] = useState<Lodging[]>([]);
  const [activityCategories, setActivityCategories] = useState<
    ActivityCategory[]
  >([]);
  const [activeSection, setActiveSection] = useState<EntityType>("activity");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingType, setEditingType] = useState<EntityType | null>(null);

  const activityForm = useFormFields<ActivityFormFields>(
    initialActivityFormState
  );
  const transportationForm = useFormFields<TransportationFormFields>(
    initialTransportationFormState
  );
  const lodgingForm = useFormFields<LodgingFormFields>(
    initialLodgingFormState
  );

  useEffect(() => {
    loadAllData();
    loadUserCategories();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tripId]);

  const loadUserCategories = async () => {
    try {
      const user = await userService.getMe();
      setActivityCategories(user.activityCategories || []);
    } catch {
      console.error("Failed to load activity categories");
    }
  };

  const loadAllData = async () => {
    try {
      const [activitiesData, transportationData, lodgingData] =
        await Promise.all([
          activityService.getActivitiesByTrip(tripId),
          transportationService.getTransportationByTrip(tripId),
          lodgingService.getLodgingByTrip(tripId),
        ]);

      // Filter for unscheduled activities (no start time and not all day)
      const unscheduled = activitiesData.filter(
        (a) => !a.startTime && !a.allDay
      );
      setActivities(unscheduled);

      // Filter for unscheduled transportation (no departure time)
      const unscheduledTransport = transportationData.filter(
        (t) => !t.departureTime
      );
      setTransportation(unscheduledTransport);

      // Filter for unscheduled lodging (no check-in date)
      const unscheduledLodging = lodgingData.filter((l) => !l.checkInDate);
      setLodging(unscheduledLodging);
    } catch {
      toast.error("Failed to load data");
    }
  };

  const resetForm = () => {
    activityForm.reset();
    transportationForm.reset();
    lodgingForm.reset();
    setEditingId(null);
    setEditingType(null);
  };

  const handleEditActivity = (activity: Activity) => {
    setEditingId(activity.id);
    setEditingType("activity");
    setActiveSection("activity");
    activityForm.handleChange("name", activity.name);
    activityForm.handleChange("description", activity.description || "");
    activityForm.handleChange("category", activity.category || "");
    activityForm.handleChange("locationId", activity.locationId || undefined);
    activityForm.handleChange("parentId", activity.parentId || undefined);
    activityForm.handleChange("allDay", activity.allDay);
    activityForm.handleChange("timezone", activity.timezone || "");
    activityForm.handleChange("cost", activity.cost?.toString() || "");
    activityForm.handleChange("currency", activity.currency || "USD");
    activityForm.handleChange("bookingUrl", activity.bookingUrl || "");
    activityForm.handleChange(
      "bookingReference",
      activity.bookingReference || ""
    );
    activityForm.handleChange("notes", activity.notes || "");

    // Handle date/time fields based on allDay flag
    if (activity.allDay) {
      activityForm.handleChange(
        "startDate",
        activity.startTime
          ? new Date(activity.startTime).toISOString().slice(0, 10)
          : ""
      );
      activityForm.handleChange(
        "endDate",
        activity.endTime
          ? new Date(activity.endTime).toISOString().slice(0, 10)
          : ""
      );
      activityForm.handleChange("startTime", "");
      activityForm.handleChange("endTime", "");
    } else {
      const startDateTime = activity.startTime
        ? new Date(activity.startTime).toISOString().slice(0, 16)
        : "";
      const endDateTime = activity.endTime
        ? new Date(activity.endTime).toISOString().slice(0, 16)
        : "";

      activityForm.handleChange("startDate", startDateTime.slice(0, 10));
      activityForm.handleChange("startTime", startDateTime.slice(11));
      activityForm.handleChange("endDate", endDateTime.slice(0, 10));
      activityForm.handleChange("endTime", endDateTime.slice(11));
    }

    // Scroll to top to show the edit form
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditTransportation = (transport: Transportation) => {
    setEditingId(transport.id);
    setEditingType("transportation");
    setActiveSection("transportation");
    transportationForm.handleChange("type", transport.type);
    transportationForm.handleChange(
      "fromLocationId",
      transport.fromLocationId || undefined
    );
    transportationForm.handleChange(
      "toLocationId",
      transport.toLocationId || undefined
    );
    transportationForm.handleChange(
      "fromLocationName",
      transport.fromLocationName || ""
    );
    transportationForm.handleChange(
      "toLocationName",
      transport.toLocationName || ""
    );
    transportationForm.handleChange(
      "startTimezone",
      transport.startTimezone || ""
    );
    transportationForm.handleChange(
      "endTimezone",
      transport.endTimezone || ""
    );
    transportationForm.handleChange("carrier", transport.carrier || "");
    transportationForm.handleChange(
      "vehicleNumber",
      transport.vehicleNumber || ""
    );
    transportationForm.handleChange(
      "confirmationNumber",
      transport.confirmationNumber || ""
    );
    transportationForm.handleChange("cost", transport.cost?.toString() || "");
    transportationForm.handleChange("currency", transport.currency || "USD");
    transportationForm.handleChange("notes", transport.notes || "");

    // Handle date/time fields
    if (transport.departureTime) {
      const dt = new Date(transport.departureTime);
      transportationForm.handleChange(
        "departureDate",
        dt.toISOString().slice(0, 10)
      );
      transportationForm.handleChange(
        "departureTime",
        dt.toISOString().slice(11, 16)
      );
    }
    if (transport.arrivalTime) {
      const dt = new Date(transport.arrivalTime);
      transportationForm.handleChange(
        "arrivalDate",
        dt.toISOString().slice(0, 10)
      );
      transportationForm.handleChange(
        "arrivalTime",
        dt.toISOString().slice(11, 16)
      );
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleEditLodging = (lodgingItem: Lodging) => {
    setEditingId(lodgingItem.id);
    setEditingType("lodging");
    setActiveSection("lodging");
    lodgingForm.handleChange("type", lodgingItem.type);
    lodgingForm.handleChange("name", lodgingItem.name);
    lodgingForm.handleChange(
      "locationId",
      lodgingItem.locationId || undefined
    );
    lodgingForm.handleChange("address", lodgingItem.address || "");
    lodgingForm.handleChange("timezone", lodgingItem.timezone || "");
    lodgingForm.handleChange(
      "confirmationNumber",
      lodgingItem.confirmationNumber || ""
    );
    lodgingForm.handleChange("cost", lodgingItem.cost?.toString() || "");
    lodgingForm.handleChange("currency", lodgingItem.currency || "USD");
    lodgingForm.handleChange("bookingUrl", lodgingItem.bookingUrl || "");
    lodgingForm.handleChange("notes", lodgingItem.notes || "");

    if (lodgingItem.checkInDate) {
      lodgingForm.handleChange(
        "checkInDate",
        new Date(lodgingItem.checkInDate).toISOString().slice(0, 10)
      );
    }
    if (lodgingItem.checkOutDate) {
      lodgingForm.handleChange(
        "checkOutDate",
        new Date(lodgingItem.checkOutDate).toISOString().slice(0, 10)
      );
    }

    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleSubmitActivity = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!activityForm.values.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!editingId) return;

    try {
      // Combine date and time fields into ISO strings
      let startTimeISO: string | null = null;
      let endTimeISO: string | null = null;

      if (activityForm.values.allDay) {
        if (activityForm.values.startDate) {
          startTimeISO = `${activityForm.values.startDate}T00:00:00`;
        }
        if (activityForm.values.endDate) {
          endTimeISO = `${activityForm.values.endDate}T23:59:59`;
        }
      } else {
        if (
          activityForm.values.startDate &&
          activityForm.values.startTime
        ) {
          startTimeISO = `${activityForm.values.startDate}T${activityForm.values.startTime}:00`;
        }
        if (activityForm.values.endDate && activityForm.values.endTime) {
          endTimeISO = `${activityForm.values.endDate}T${activityForm.values.endTime}:00`;
        }
      }

      const updateData = {
        name: activityForm.values.name,
        description: activityForm.values.description || null,
        category: activityForm.values.category || null,
        locationId: activityForm.values.locationId || null,
        parentId: activityForm.values.parentId || null,
        allDay: activityForm.values.allDay,
        startTime: startTimeISO,
        endTime: endTimeISO,
        timezone: activityForm.values.timezone || null,
        cost: activityForm.values.cost
          ? parseFloat(activityForm.values.cost)
          : null,
        currency: activityForm.values.currency || null,
        bookingUrl: activityForm.values.bookingUrl || null,
        bookingReference: activityForm.values.bookingReference || null,
        notes: activityForm.values.notes || null,
      };

      await activityService.updateActivity(editingId, updateData);
      toast.success("Activity updated");

      resetForm();
      loadAllData();
      onUpdate?.();
    } catch {
      toast.error("Failed to save activity");
    }
  };

  const handleSubmitTransportation = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!editingId) return;

    try {
      let departureTimeISO: string | null = null;
      let arrivalTimeISO: string | null = null;

      if (
        transportationForm.values.departureDate &&
        transportationForm.values.departureTime
      ) {
        departureTimeISO = `${transportationForm.values.departureDate}T${transportationForm.values.departureTime}:00`;
      }
      if (
        transportationForm.values.arrivalDate &&
        transportationForm.values.arrivalTime
      ) {
        arrivalTimeISO = `${transportationForm.values.arrivalDate}T${transportationForm.values.arrivalTime}:00`;
      }

      const updateData = {
        type: transportationForm.values.type as any,
        fromLocationId: transportationForm.values.fromLocationId || null,
        toLocationId: transportationForm.values.toLocationId || null,
        fromLocationName: transportationForm.values.fromLocationName || null,
        toLocationName: transportationForm.values.toLocationName || null,
        departureTime: departureTimeISO,
        arrivalTime: arrivalTimeISO,
        startTimezone: transportationForm.values.startTimezone || null,
        endTimezone: transportationForm.values.endTimezone || null,
        carrier: transportationForm.values.carrier || null,
        vehicleNumber: transportationForm.values.vehicleNumber || null,
        confirmationNumber:
          transportationForm.values.confirmationNumber || null,
        cost: transportationForm.values.cost
          ? parseFloat(transportationForm.values.cost)
          : null,
        currency: transportationForm.values.currency || null,
        notes: transportationForm.values.notes || null,
      };

      await transportationService.updateTransportation(editingId, updateData);
      toast.success("Transportation updated");

      resetForm();
      loadAllData();
      onUpdate?.();
    } catch {
      toast.error("Failed to save transportation");
    }
  };

  const handleSubmitLodging = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!lodgingForm.values.name.trim()) {
      toast.error("Name is required");
      return;
    }
    if (!editingId) return;

    try {
      const updateData = {
        type: lodgingForm.values.type as any,
        name: lodgingForm.values.name,
        locationId: lodgingForm.values.locationId || null,
        address: lodgingForm.values.address || null,
        checkInDate: lodgingForm.values.checkInDate || null,
        checkOutDate: lodgingForm.values.checkOutDate || null,
        timezone: lodgingForm.values.timezone || null,
        confirmationNumber: lodgingForm.values.confirmationNumber || null,
        cost: lodgingForm.values.cost
          ? parseFloat(lodgingForm.values.cost)
          : null,
        currency: lodgingForm.values.currency || null,
        bookingUrl: lodgingForm.values.bookingUrl || null,
        notes: lodgingForm.values.notes || null,
      };

      await lodgingService.updateLodging(editingId, updateData);
      toast.success("Lodging updated");

      resetForm();
      loadAllData();
      onUpdate?.();
    } catch {
      toast.error("Failed to save lodging");
    }
  };

  const totalCount = activities.length + transportation.length + lodging.length;

  const transportationTypeLabels: Record<string, string> = {
    flight: "Flight",
    train: "Train",
    bus: "Bus",
    car: "Car",
    ferry: "Ferry",
    bicycle: "Bicycle",
    walk: "Walk",
    other: "Other",
  };

  const lodgingTypeLabels: Record<string, string> = {
    hotel: "Hotel",
    hostel: "Hostel",
    airbnb: "Airbnb",
    vacation_rental: "Vacation Rental",
    camping: "Camping",
    resort: "Resort",
    motel: "Motel",
    bed_and_breakfast: "Bed & Breakfast",
    apartment: "Apartment",
    friends_family: "Friends/Family",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Unscheduled Items
        </h2>
      </div>

      <p className="text-sm text-gray-600 dark:text-gray-400">
        Items without scheduled dates/times. Add dates to move them to their
        respective tabs.
      </p>

      {/* Section Tabs */}
      <div className="flex gap-2 border-b border-gray-200 dark:border-gray-700">
        <button
          onClick={() => setActiveSection("activity")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeSection === "activity"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          Activities ({activities.length})
        </button>
        <button
          onClick={() => setActiveSection("transportation")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeSection === "transportation"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          Transportation ({transportation.length})
        </button>
        <button
          onClick={() => setActiveSection("lodging")}
          className={`px-4 py-2 font-medium transition-colors border-b-2 ${
            activeSection === "lodging"
              ? "border-blue-600 text-blue-600 dark:border-blue-400 dark:text-blue-400"
              : "border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200"
          }`}
        >
          Lodging ({lodging.length})
        </button>
      </div>

      {/* Edit Form - Activity */}
      {editingId && editingType === "activity" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Edit Activity</h3>
          <form onSubmit={handleSubmitActivity} className="space-y-4">
            {/* Name and Category */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="unscheduled-activity-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Name *
                </label>
                <input
                  type="text"
                  id="unscheduled-activity-name"
                  value={activityForm.values.name}
                  onChange={(e) =>
                    activityForm.handleChange("name", e.target.value)
                  }
                  className="input"
                  required
                />
              </div>

              <div>
                <label
                  htmlFor="unscheduled-activity-category"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Category
                </label>
                <select
                  id="unscheduled-activity-category"
                  value={activityForm.values.category}
                  onChange={(e) =>
                    activityForm.handleChange("category", e.target.value)
                  }
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
                htmlFor="unscheduled-activity-description"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Description
              </label>
              <textarea
                id="unscheduled-activity-description"
                value={activityForm.values.description}
                onChange={(e) =>
                  activityForm.handleChange("description", e.target.value)
                }
                className="input"
                rows={2}
                placeholder="Activity description"
              />
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="unscheduled-activity-location"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Location
              </label>
              <select
                id="unscheduled-activity-location"
                value={activityForm.values.locationId || ""}
                onChange={(e) =>
                  activityForm.handleChange(
                    "locationId",
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

            {/* All Day Toggle */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="allDay"
                checked={activityForm.values.allDay}
                onChange={(e) =>
                  activityForm.handleChange("allDay", e.target.checked)
                }
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
            {activityForm.values.allDay ? (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="unscheduled-activity-start-date"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Start Date
                  </label>
                  <input
                    type="date"
                    id="unscheduled-activity-start-date"
                    value={activityForm.values.startDate}
                    onChange={(e) =>
                      activityForm.handleChange("startDate", e.target.value)
                    }
                    className="input"
                  />
                </div>
                <div>
                  <label
                    htmlFor="unscheduled-activity-end-date"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    End Date
                  </label>
                  <input
                    type="date"
                    id="unscheduled-activity-end-date"
                    value={activityForm.values.endDate}
                    onChange={(e) =>
                      activityForm.handleChange("endDate", e.target.value)
                    }
                    className="input"
                  />
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="unscheduled-activity-start-date-time"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    Start Time
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      id="unscheduled-activity-start-date-time"
                      value={activityForm.values.startDate}
                      onChange={(e) =>
                        activityForm.handleChange("startDate", e.target.value)
                      }
                      className="input flex-1"
                    />
                    <input
                      type="time"
                      id="unscheduled-activity-start-time"
                      aria-label="Start time"
                      value={activityForm.values.startTime}
                      onChange={(e) =>
                        activityForm.handleChange("startTime", e.target.value)
                      }
                      className="input flex-1"
                    />
                  </div>
                </div>
                <div>
                  <label
                    htmlFor="unscheduled-activity-end-date-time"
                    className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                  >
                    End Time
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="date"
                      id="unscheduled-activity-end-date-time"
                      value={activityForm.values.endDate}
                      onChange={(e) =>
                        activityForm.handleChange("endDate", e.target.value)
                      }
                      className="input flex-1"
                    />
                    <input
                      type="time"
                      id="unscheduled-activity-end-time"
                      aria-label="End time"
                      value={activityForm.values.endTime}
                      onChange={(e) =>
                        activityForm.handleChange("endTime", e.target.value)
                      }
                      className="input flex-1"
                    />
                  </div>
                </div>
              </div>
            )}

            {/* Timezone Component */}
            <TimezoneSelect
              value={activityForm.values.timezone}
              onChange={(value) => activityForm.handleChange("timezone", value)}
              label="Timezone"
            />

            {/* Booking Fields Component */}
            <BookingFields
              confirmationNumber={activityForm.values.bookingReference}
              bookingUrl={activityForm.values.bookingUrl}
              onConfirmationNumberChange={(value) =>
                activityForm.handleChange("bookingReference", value)
              }
              onBookingUrlChange={(value) =>
                activityForm.handleChange("bookingUrl", value)
              }
              confirmationLabel="Booking Reference"
            />

            {/* Cost and Currency Component */}
            <CostCurrencyFields
              cost={activityForm.values.cost}
              currency={activityForm.values.currency}
              onCostChange={(value) => activityForm.handleChange("cost", value)}
              onCurrencyChange={(value) =>
                activityForm.handleChange("currency", value)
              }
            />

            {/* Notes */}
            <div>
              <label
                htmlFor="unscheduled-activity-notes"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Notes
              </label>
              <textarea
                id="unscheduled-activity-notes"
                value={activityForm.values.notes}
                onChange={(e) =>
                  activityForm.handleChange("notes", e.target.value)
                }
                className="input"
                rows={3}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Update Activity
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Form - Transportation */}
      {editingId && editingType === "transportation" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Edit Transportation</h3>
          <form onSubmit={handleSubmitTransportation} className="space-y-4">
            {/* Type */}
            <div>
              <label
                htmlFor="unscheduled-transport-type"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Type
              </label>
              <select
                id="unscheduled-transport-type"
                value={transportationForm.values.type}
                onChange={(e) =>
                  transportationForm.handleChange("type", e.target.value)
                }
                className="input"
              >
                {Object.entries(transportationTypeLabels).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </div>

            {/* From/To Locations */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="unscheduled-transport-from"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  From Location
                </label>
                <select
                  id="unscheduled-transport-from"
                  value={transportationForm.values.fromLocationId || ""}
                  onChange={(e) =>
                    transportationForm.handleChange(
                      "fromLocationId",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="input"
                >
                  <option value="">-- Select or enter below --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or enter location name"
                  aria-label="From location name"
                  value={transportationForm.values.fromLocationName}
                  onChange={(e) =>
                    transportationForm.handleChange(
                      "fromLocationName",
                      e.target.value
                    )
                  }
                  className="input mt-2"
                />
              </div>
              <div>
                <label
                  htmlFor="unscheduled-transport-to"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  To Location
                </label>
                <select
                  id="unscheduled-transport-to"
                  value={transportationForm.values.toLocationId || ""}
                  onChange={(e) =>
                    transportationForm.handleChange(
                      "toLocationId",
                      e.target.value ? parseInt(e.target.value) : undefined
                    )
                  }
                  className="input"
                >
                  <option value="">-- Select or enter below --</option>
                  {locations.map((loc) => (
                    <option key={loc.id} value={loc.id}>
                      {loc.name}
                    </option>
                  ))}
                </select>
                <input
                  type="text"
                  placeholder="Or enter location name"
                  aria-label="To location name"
                  value={transportationForm.values.toLocationName}
                  onChange={(e) =>
                    transportationForm.handleChange(
                      "toLocationName",
                      e.target.value
                    )
                  }
                  className="input mt-2"
                />
              </div>
            </div>

            {/* Departure/Arrival Times */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Departure Time
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    aria-label="Departure date"
                    value={transportationForm.values.departureDate}
                    onChange={(e) =>
                      transportationForm.handleChange(
                        "departureDate",
                        e.target.value
                      )
                    }
                    className="input flex-1"
                  />
                  <input
                    type="time"
                    aria-label="Departure time"
                    value={transportationForm.values.departureTime}
                    onChange={(e) =>
                      transportationForm.handleChange(
                        "departureTime",
                        e.target.value
                      )
                    }
                    className="input flex-1"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  Arrival Time
                </label>
                <div className="flex gap-2">
                  <input
                    type="date"
                    aria-label="Arrival date"
                    value={transportationForm.values.arrivalDate}
                    onChange={(e) =>
                      transportationForm.handleChange(
                        "arrivalDate",
                        e.target.value
                      )
                    }
                    className="input flex-1"
                  />
                  <input
                    type="time"
                    aria-label="Arrival time"
                    value={transportationForm.values.arrivalTime}
                    onChange={(e) =>
                      transportationForm.handleChange(
                        "arrivalTime",
                        e.target.value
                      )
                    }
                    className="input flex-1"
                  />
                </div>
              </div>
            </div>

            {/* Timezones */}
            <div className="grid grid-cols-2 gap-4">
              <TimezoneSelect
                value={transportationForm.values.startTimezone}
                onChange={(value) =>
                  transportationForm.handleChange("startTimezone", value)
                }
                label="Departure Timezone"
              />
              <TimezoneSelect
                value={transportationForm.values.endTimezone}
                onChange={(value) =>
                  transportationForm.handleChange("endTimezone", value)
                }
                label="Arrival Timezone"
              />
            </div>

            {/* Carrier and Vehicle Number */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="unscheduled-transport-carrier"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Carrier
                </label>
                <input
                  type="text"
                  id="unscheduled-transport-carrier"
                  value={transportationForm.values.carrier}
                  onChange={(e) =>
                    transportationForm.handleChange("carrier", e.target.value)
                  }
                  className="input"
                  placeholder="e.g., United Airlines"
                />
              </div>
              <div>
                <label
                  htmlFor="unscheduled-transport-vehicle"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Flight/Train/Bus Number
                </label>
                <input
                  type="text"
                  id="unscheduled-transport-vehicle"
                  value={transportationForm.values.vehicleNumber}
                  onChange={(e) =>
                    transportationForm.handleChange(
                      "vehicleNumber",
                      e.target.value
                    )
                  }
                  className="input"
                  placeholder="e.g., UA123"
                />
              </div>
            </div>

            {/* Confirmation Number */}
            <BookingFields
              confirmationNumber={transportationForm.values.confirmationNumber}
              bookingUrl=""
              onConfirmationNumberChange={(value) =>
                transportationForm.handleChange("confirmationNumber", value)
              }
              onBookingUrlChange={() => {}}
              confirmationLabel="Confirmation Number"
              hideBookingUrl={true}
            />

            {/* Cost and Currency */}
            <CostCurrencyFields
              cost={transportationForm.values.cost}
              currency={transportationForm.values.currency}
              onCostChange={(value) =>
                transportationForm.handleChange("cost", value)
              }
              onCurrencyChange={(value) =>
                transportationForm.handleChange("currency", value)
              }
            />

            {/* Notes */}
            <div>
              <label
                htmlFor="unscheduled-transport-notes"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Notes
              </label>
              <textarea
                id="unscheduled-transport-notes"
                value={transportationForm.values.notes}
                onChange={(e) =>
                  transportationForm.handleChange("notes", e.target.value)
                }
                className="input"
                rows={3}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Update Transportation
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Edit Form - Lodging */}
      {editingId && editingType === "lodging" && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold mb-4">Edit Lodging</h3>
          <form onSubmit={handleSubmitLodging} className="space-y-4">
            {/* Name and Type */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="unscheduled-lodging-name"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Name *
                </label>
                <input
                  type="text"
                  id="unscheduled-lodging-name"
                  value={lodgingForm.values.name}
                  onChange={(e) =>
                    lodgingForm.handleChange("name", e.target.value)
                  }
                  className="input"
                  required
                />
              </div>
              <div>
                <label
                  htmlFor="unscheduled-lodging-type"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Type
                </label>
                <select
                  id="unscheduled-lodging-type"
                  value={lodgingForm.values.type}
                  onChange={(e) =>
                    lodgingForm.handleChange("type", e.target.value)
                  }
                  className="input"
                >
                  {Object.entries(lodgingTypeLabels).map(([value, label]) => (
                    <option key={value} value={value}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Location */}
            <div>
              <label
                htmlFor="unscheduled-lodging-location"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Location
              </label>
              <select
                id="unscheduled-lodging-location"
                value={lodgingForm.values.locationId || ""}
                onChange={(e) =>
                  lodgingForm.handleChange(
                    "locationId",
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

            {/* Address */}
            <div>
              <label
                htmlFor="unscheduled-lodging-address"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Address
              </label>
              <input
                type="text"
                id="unscheduled-lodging-address"
                value={lodgingForm.values.address}
                onChange={(e) =>
                  lodgingForm.handleChange("address", e.target.value)
                }
                className="input"
              />
            </div>

            {/* Check-in/Check-out Dates */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label
                  htmlFor="unscheduled-lodging-checkin"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Check-in Date
                </label>
                <input
                  type="date"
                  id="unscheduled-lodging-checkin"
                  value={lodgingForm.values.checkInDate}
                  onChange={(e) =>
                    lodgingForm.handleChange("checkInDate", e.target.value)
                  }
                  className="input"
                />
              </div>
              <div>
                <label
                  htmlFor="unscheduled-lodging-checkout"
                  className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
                >
                  Check-out Date
                </label>
                <input
                  type="date"
                  id="unscheduled-lodging-checkout"
                  value={lodgingForm.values.checkOutDate}
                  onChange={(e) =>
                    lodgingForm.handleChange("checkOutDate", e.target.value)
                  }
                  className="input"
                />
              </div>
            </div>

            {/* Timezone */}
            <TimezoneSelect
              value={lodgingForm.values.timezone}
              onChange={(value) => lodgingForm.handleChange("timezone", value)}
              label="Timezone"
            />

            {/* Booking Fields */}
            <BookingFields
              confirmationNumber={lodgingForm.values.confirmationNumber}
              bookingUrl={lodgingForm.values.bookingUrl}
              onConfirmationNumberChange={(value) =>
                lodgingForm.handleChange("confirmationNumber", value)
              }
              onBookingUrlChange={(value) =>
                lodgingForm.handleChange("bookingUrl", value)
              }
              confirmationLabel="Confirmation Number"
            />

            {/* Cost and Currency */}
            <CostCurrencyFields
              cost={lodgingForm.values.cost}
              currency={lodgingForm.values.currency}
              onCostChange={(value) => lodgingForm.handleChange("cost", value)}
              onCurrencyChange={(value) =>
                lodgingForm.handleChange("currency", value)
              }
            />

            {/* Notes */}
            <div>
              <label
                htmlFor="unscheduled-lodging-notes"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Notes
              </label>
              <textarea
                id="unscheduled-lodging-notes"
                value={lodgingForm.values.notes}
                onChange={(e) =>
                  lodgingForm.handleChange("notes", e.target.value)
                }
                className="input"
                rows={3}
              />
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" className="btn btn-primary">
                Update Lodging
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Items List */}
      <div className="space-y-4">
        {totalCount === 0 ? (
          <EmptyState
            icon="📝"
            message="No unscheduled items"
            subMessage="Items without dates/times will appear here"
          />
        ) : (
          <>
            {/* Activities Section */}
            {activeSection === "activity" &&
              (activities.length === 0 ? (
                <EmptyState
                  icon="🎯"
                  message="No unscheduled activities"
                  subMessage="Activities without dates/times will appear here"
                />
              ) : (
                activities.map((activity) => (
                  <div
                    key={activity.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          {activity.category && (
                            <span className="text-xl">
                              {activityCategories.find(
                                (c) => c.name === activity.category
                              )?.emoji || "📍"}
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
                          {activity.location && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Location:</span>
                              <span>{activity.location.name}</span>
                            </div>
                          )}

                          {activity.bookingReference && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Reference:</span>
                              <span>{activity.bookingReference}</span>
                            </div>
                          )}

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

                          {activity.cost && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Cost:</span>
                              <span>
                                {activity.currency} {activity.cost}
                              </span>
                            </div>
                          )}

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

                      <div className="flex items-center gap-2 ml-4">
                        <AssociatedAlbums
                          albums={activity.photoAlbums}
                          tripId={tripId}
                        />
                        <button
                          onClick={() => handleEditActivity(activity)}
                          type="button"
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ))}

            {/* Transportation Section */}
            {activeSection === "transportation" &&
              (transportation.length === 0 ? (
                <EmptyState
                  icon="✈️"
                  message="No unscheduled transportation"
                  subMessage="Transportation without departure times will appear here"
                />
              ) : (
                transportation.map((transport) => (
                  <div
                    key={transport.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {transportationTypeLabels[transport.type] ||
                              transport.type}
                          </h3>
                          <span className="text-sm px-2 py-1 bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200 rounded">
                            {transport.type}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                          {(transport.fromLocationName ||
                            transport.fromLocation) && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">From:</span>
                              <span>
                                {transport.fromLocationName ||
                                  transport.fromLocation?.name}
                              </span>
                            </div>
                          )}

                          {(transport.toLocationName || transport.toLocation) && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">To:</span>
                              <span>
                                {transport.toLocationName ||
                                  transport.toLocation?.name}
                              </span>
                            </div>
                          )}

                          {transport.carrier && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Carrier:</span>
                              <span>{transport.carrier}</span>
                            </div>
                          )}

                          {transport.vehicleNumber && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Number:</span>
                              <span>{transport.vehicleNumber}</span>
                            </div>
                          )}

                          {transport.confirmationNumber && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Confirmation:</span>
                              <span>{transport.confirmationNumber}</span>
                            </div>
                          )}

                          {transport.cost && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Cost:</span>
                              <span>
                                {transport.currency} {transport.cost}
                              </span>
                            </div>
                          )}

                          {transport.notes && (
                            <div className="mt-2">
                              <span className="font-medium">Notes:</span>
                              <p className="text-gray-600 dark:text-gray-400 mt-1">
                                {transport.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <button
                          onClick={() => handleEditTransportation(transport)}
                          type="button"
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ))}

            {/* Lodging Section */}
            {activeSection === "lodging" &&
              (lodging.length === 0 ? (
                <EmptyState
                  icon="🏨"
                  message="No unscheduled lodging"
                  subMessage="Lodging without check-in dates will appear here"
                />
              ) : (
                lodging.map((lodgingItem) => (
                  <div
                    key={lodgingItem.id}
                    className="bg-white dark:bg-gray-800 rounded-lg shadow p-6"
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-2">
                          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                            {lodgingItem.name}
                          </h3>
                          <span className="text-sm px-2 py-1 bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200 rounded">
                            {lodgingTypeLabels[lodgingItem.type] ||
                              lodgingItem.type}
                          </span>
                        </div>

                        <div className="space-y-2 text-sm text-gray-700 dark:text-gray-300">
                          {lodgingItem.location && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Location:</span>
                              <span>{lodgingItem.location.name}</span>
                            </div>
                          )}

                          {lodgingItem.address && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Address:</span>
                              <span>{lodgingItem.address}</span>
                            </div>
                          )}

                          {lodgingItem.confirmationNumber && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Confirmation:</span>
                              <span>{lodgingItem.confirmationNumber}</span>
                            </div>
                          )}

                          {lodgingItem.bookingUrl && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Booking:</span>
                              <a
                                href={lodgingItem.bookingUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline dark:text-blue-400"
                              >
                                View Booking
                              </a>
                            </div>
                          )}

                          {lodgingItem.cost && (
                            <div className="flex items-center gap-2">
                              <span className="font-medium">Cost:</span>
                              <span>
                                {lodgingItem.currency} {lodgingItem.cost}
                              </span>
                            </div>
                          )}

                          {lodgingItem.notes && (
                            <div className="mt-2">
                              <span className="font-medium">Notes:</span>
                              <p className="text-gray-600 dark:text-gray-400 mt-1">
                                {lodgingItem.notes}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 ml-4">
                        <AssociatedAlbums
                          albums={lodgingItem.photoAlbums}
                          tripId={tripId}
                        />
                        <button
                          onClick={() => handleEditLodging(lodgingItem)}
                          type="button"
                          className="text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                        >
                          Edit
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              ))}
          </>
        )}
      </div>
    </div>
  );
}
