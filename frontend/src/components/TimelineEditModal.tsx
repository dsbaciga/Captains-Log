import { useState, useEffect } from "react";
import type { Activity } from "../types/activity";
import type {
  Transportation,
  TransportationType,
} from "../types/transportation";
import type { Lodging, LodgingType } from "../types/lodging";
import type { JournalEntry } from "../types/journalEntry";
import type { Location } from "../types/location";
import type { ActivityCategory } from "../types/user";
import activityService from "../services/activity.service";
import transportationService from "../services/transportation.service";
import lodgingService from "../services/lodging.service";
import journalEntryService from "../services/journalEntry.service";
import userService from "../services/user.service";
import toast from "react-hot-toast";
import {
  convertISOToDateTimeLocal,
  convertDateTimeLocalToISO,
} from "../utils/timezone";
import FormModal from "./FormModal";
import TimezoneSelect from "./TimezoneSelect";
import CostCurrencyFields from "./CostCurrencyFields";
import BookingFields from "./BookingFields";
import LocationQuickAdd from "./LocationQuickAdd";

type TimelineItemType = "activity" | "transportation" | "lodging" | "journal";

interface TimelineEditModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: () => void;
  itemType: TimelineItemType;
  itemData: Activity | Transportation | Lodging | JournalEntry;
  tripId: number;
  locations: Location[];
  tripTimezone?: string | null;
  activities?: Activity[];
  lodgings?: Lodging[];
  transportations?: Transportation[];
}

export default function TimelineEditModal({
  isOpen,
  onClose,
  onSave,
  itemType,
  itemData,
  tripId,
  locations,
  tripTimezone,
  activities = [],
  lodgings = [],
  transportations = [],
}: TimelineEditModalProps) {
  const [saving, setSaving] = useState(false);
  const [activityCategories, setActivityCategories] = useState<
    ActivityCategory[]
  >([]);
  const [showLocationQuickAdd, setShowLocationQuickAdd] = useState(false);
  const [localLocations, setLocalLocations] = useState<Location[]>(locations);

  // Activity form state
  const [activityForm, setActivityForm] = useState({
    name: "",
    description: "",
    category: "",
    locationId: undefined as number | undefined,
    parentId: undefined as number | undefined,
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
  });

  // Transportation form state
  const [transportationForm, setTransportationForm] = useState({
    type: "flight" as TransportationType,
    fromLocationId: undefined as number | undefined,
    toLocationId: undefined as number | undefined,
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
  });

  // Lodging form state
  const [lodgingForm, setLodgingForm] = useState({
    type: "hotel" as LodgingType,
    name: "",
    locationId: undefined as number | undefined,
    address: "",
    checkInDate: "",
    checkOutDate: "",
    timezone: "",
    confirmationNumber: "",
    bookingUrl: "",
    cost: "",
    currency: "USD",
    notes: "",
  });

  // Journal form state
  const [journalForm, setJournalForm] = useState({
    title: "",
    content: "",
    locationIds: [] as number[],
    activityIds: [] as number[],
    lodgingIds: [] as number[],
    transportationIds: [] as number[],
    entryDate: "",
  });

  // Load user categories for activities
  useEffect(() => {
    if (itemType === "activity") {
      loadUserCategories();
    }
  }, [itemType]);

  // Sync local locations with prop
  useEffect(() => {
    setLocalLocations(locations);
  }, [locations]);

  // Initialize form based on item type and data
  useEffect(() => {
    if (!isOpen || !itemData) return;

    switch (itemType) {
      case "activity":
        initActivityForm(itemData as Activity);
        break;
      case "transportation":
        initTransportationForm(itemData as Transportation);
        break;
      case "lodging":
        initLodgingForm(itemData as Lodging);
        break;
      case "journal":
        initJournalForm(itemData as JournalEntry);
        break;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, itemType, itemData]);

  const loadUserCategories = async () => {
    try {
      const user = await userService.getMe();
      setActivityCategories(user.activityCategories || []);
    } catch {
      console.error("Failed to load activity categories");
    }
  };

  const initActivityForm = (activity: Activity) => {
    const effectiveTz = activity.timezone || tripTimezone || "UTC";

    let startDate = "";
    let startTime = "";
    let endDate = "";
    let endTime = "";

    if (activity.allDay) {
      if (activity.startTime) {
        const startDateTime = convertISOToDateTimeLocal(
          activity.startTime,
          effectiveTz
        );
        startDate = startDateTime.slice(0, 10);
      }
      if (activity.endTime) {
        const endDateTime = convertISOToDateTimeLocal(
          activity.endTime,
          effectiveTz
        );
        endDate = endDateTime.slice(0, 10);
      }
    } else {
      if (activity.startTime) {
        const startDateTime = convertISOToDateTimeLocal(
          activity.startTime,
          effectiveTz
        );
        startDate = startDateTime.slice(0, 10);
        startTime = startDateTime.slice(11);
      }
      if (activity.endTime) {
        const endDateTime = convertISOToDateTimeLocal(
          activity.endTime,
          effectiveTz
        );
        endDate = endDateTime.slice(0, 10);
        endTime = endDateTime.slice(11);
      }
    }

    setActivityForm({
      name: activity.name,
      description: activity.description || "",
      category: activity.category || "",
      locationId: activity.locationId || undefined,
      parentId: activity.parentId || undefined,
      allDay: activity.allDay,
      startDate,
      startTime,
      endDate,
      endTime,
      timezone: activity.timezone || "",
      cost: activity.cost?.toString() || "",
      currency: activity.currency || "USD",
      bookingUrl: activity.bookingUrl || "",
      bookingReference: activity.bookingReference || "",
      notes: activity.notes || "",
    });
  };

  const initTransportationForm = (transportation: Transportation) => {
    const effectiveStartTz =
      transportation.startTimezone || tripTimezone || "UTC";
    const effectiveEndTz = transportation.endTimezone || tripTimezone || "UTC";

    setTransportationForm({
      type: transportation.type,
      fromLocationId: transportation.fromLocationId || undefined,
      toLocationId: transportation.toLocationId || undefined,
      fromLocationName: transportation.fromLocationName || "",
      toLocationName: transportation.toLocationName || "",
      departureTime: transportation.departureTime
        ? convertISOToDateTimeLocal(
            transportation.departureTime,
            effectiveStartTz
          )
        : "",
      arrivalTime: transportation.arrivalTime
        ? convertISOToDateTimeLocal(transportation.arrivalTime, effectiveEndTz)
        : "",
      startTimezone: transportation.startTimezone || "",
      endTimezone: transportation.endTimezone || "",
      carrier: transportation.carrier || "",
      vehicleNumber: transportation.vehicleNumber || "",
      confirmationNumber: transportation.confirmationNumber || "",
      cost: transportation.cost?.toString() || "",
      currency: transportation.currency || "USD",
      notes: transportation.notes || "",
    });
  };

  const initLodgingForm = (lodging: Lodging) => {
    const effectiveTz = lodging.timezone || tripTimezone || "UTC";

    setLodgingForm({
      type: lodging.type,
      name: lodging.name,
      locationId: lodging.locationId || undefined,
      address: lodging.address || "",
      checkInDate: lodging.checkInDate
        ? convertISOToDateTimeLocal(lodging.checkInDate, effectiveTz)
        : "",
      checkOutDate: lodging.checkOutDate
        ? convertISOToDateTimeLocal(lodging.checkOutDate, effectiveTz)
        : "",
      timezone: lodging.timezone || "",
      confirmationNumber: lodging.confirmationNumber || "",
      bookingUrl: lodging.bookingUrl || "",
      cost: lodging.cost?.toString() || "",
      currency: lodging.currency || "USD",
      notes: lodging.notes || "",
    });
  };

  const initJournalForm = (entry: JournalEntry) => {
    setJournalForm({
      title: entry.title || "",
      content: entry.content,
      locationIds: entry.locationAssignments?.map((la) => la.location.id) || [],
      activityIds: entry.activityAssignments?.map((aa) => aa.activity.id) || [],
      lodgingIds: entry.lodgingAssignments?.map((la) => la.lodging.id) || [],
      transportationIds:
        entry.transportationAssignments?.map((ta) => ta.transportation.id) ||
        [],
      entryDate: entry.date
        ? new Date(entry.date).toISOString().slice(0, 16)
        : "",
    });
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

    if (itemType === "activity") {
      setActivityForm((prev) => ({ ...prev, locationId }));
    } else if (itemType === "lodging") {
      setLodgingForm((prev) => ({ ...prev, locationId }));
    }
    setShowLocationQuickAdd(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    try {
      switch (itemType) {
        case "activity":
          await submitActivity();
          break;
        case "transportation":
          await submitTransportation();
          break;
        case "lodging":
          await submitLodging();
          break;
        case "journal":
          await submitJournal();
          break;
      }
      toast.success(`${getItemTypeLabel()} updated successfully`);
      onSave();
      onClose();
    } catch (error) {
      console.error("Failed to update:", error);
      toast.error(`Failed to update ${getItemTypeLabel().toLowerCase()}`);
    } finally {
      setSaving(false);
    }
  };

  const submitActivity = async () => {
    if (!activityForm.name.trim()) {
      throw new Error("Name is required");
    }

    const effectiveTz = activityForm.timezone || tripTimezone || "UTC";
    let startTimeISO: string | null = null;
    let endTimeISO: string | null = null;

    if (activityForm.allDay) {
      if (activityForm.startDate) {
        const dateTimeLocal = `${activityForm.startDate}T00:00`;
        startTimeISO = convertDateTimeLocalToISO(dateTimeLocal, effectiveTz);
      }
      if (activityForm.endDate) {
        const dateTimeLocal = `${activityForm.endDate}T23:59`;
        endTimeISO = convertDateTimeLocalToISO(dateTimeLocal, effectiveTz);
      }
    } else {
      if (activityForm.startDate && activityForm.startTime) {
        const dateTimeLocal = `${activityForm.startDate}T${activityForm.startTime}`;
        startTimeISO = convertDateTimeLocalToISO(dateTimeLocal, effectiveTz);
      }
      if (activityForm.endDate && activityForm.endTime) {
        const dateTimeLocal = `${activityForm.endDate}T${activityForm.endTime}`;
        endTimeISO = convertDateTimeLocalToISO(dateTimeLocal, effectiveTz);
      }
    }

    const updateData = {
      name: activityForm.name,
      description: activityForm.description || null,
      category: activityForm.category || null,
      locationId: activityForm.locationId || null,
      parentId: activityForm.parentId || null,
      allDay: activityForm.allDay,
      startTime: startTimeISO,
      endTime: endTimeISO,
      timezone: activityForm.timezone || null,
      cost: activityForm.cost ? parseFloat(activityForm.cost) : null,
      currency: activityForm.currency || null,
      bookingUrl: activityForm.bookingUrl || null,
      bookingReference: activityForm.bookingReference || null,
      notes: activityForm.notes || null,
    };

    await activityService.updateActivity(itemData.id, updateData);
  };

  const submitTransportation = async () => {
    const effectiveStartTz =
      transportationForm.startTimezone || tripTimezone || "UTC";
    const effectiveEndTz =
      transportationForm.endTimezone || tripTimezone || "UTC";

    const departureTimeISO = transportationForm.departureTime
      ? convertDateTimeLocalToISO(
          transportationForm.departureTime,
          effectiveStartTz
        )
      : null;
    const arrivalTimeISO = transportationForm.arrivalTime
      ? convertDateTimeLocalToISO(
          transportationForm.arrivalTime,
          effectiveEndTz
        )
      : null;

    const updateData = {
      type: transportationForm.type,
      fromLocationId: transportationForm.fromLocationId || null,
      toLocationId: transportationForm.toLocationId || null,
      fromLocationName: transportationForm.fromLocationName || null,
      toLocationName: transportationForm.toLocationName || null,
      departureTime: departureTimeISO,
      arrivalTime: arrivalTimeISO,
      startTimezone: transportationForm.startTimezone || null,
      endTimezone: transportationForm.endTimezone || null,
      carrier: transportationForm.carrier || null,
      vehicleNumber: transportationForm.vehicleNumber || null,
      confirmationNumber: transportationForm.confirmationNumber || null,
      cost: transportationForm.cost
        ? parseFloat(transportationForm.cost)
        : null,
      currency: transportationForm.currency || null,
      notes: transportationForm.notes || null,
    };

    await transportationService.updateTransportation(itemData.id, updateData);
  };

  const submitLodging = async () => {
    if (!lodgingForm.name.trim()) {
      throw new Error("Name is required");
    }
    if (!lodgingForm.checkInDate) {
      throw new Error("Check-in date is required");
    }
    if (!lodgingForm.checkOutDate) {
      throw new Error("Check-out date is required");
    }

    const effectiveTz = lodgingForm.timezone || tripTimezone || "UTC";
    const checkInDateISO = convertDateTimeLocalToISO(
      lodgingForm.checkInDate,
      effectiveTz
    );
    const checkOutDateISO = convertDateTimeLocalToISO(
      lodgingForm.checkOutDate,
      effectiveTz
    );

    const updateData = {
      type: lodgingForm.type,
      name: lodgingForm.name,
      locationId: lodgingForm.locationId || null,
      address: lodgingForm.address || null,
      checkInDate: checkInDateISO,
      checkOutDate: checkOutDateISO,
      timezone: lodgingForm.timezone || null,
      confirmationNumber: lodgingForm.confirmationNumber || null,
      bookingUrl: lodgingForm.bookingUrl || null,
      cost: lodgingForm.cost ? parseFloat(lodgingForm.cost) : null,
      currency: lodgingForm.currency || null,
      notes: lodgingForm.notes || null,
    };

    await lodgingService.updateLodging(itemData.id, updateData);
  };

  const submitJournal = async () => {
    if (!journalForm.title.trim() || !journalForm.content.trim()) {
      throw new Error("Title and content are required");
    }

    const updateData = {
      title: journalForm.title,
      content: journalForm.content,
      locationIds: journalForm.locationIds,
      activityIds: journalForm.activityIds,
      lodgingIds: journalForm.lodgingIds,
      transportationIds: journalForm.transportationIds,
      entryDate: journalForm.entryDate || null,
    };

    await journalEntryService.updateJournalEntry(itemData.id, updateData);
  };

  const getItemTypeLabel = () => {
    switch (itemType) {
      case "activity":
        return "Activity";
      case "transportation":
        return "Transportation";
      case "lodging":
        return "Lodging";
      case "journal":
        return "Journal Entry";
    }
  };

  const getItemTypeIcon = () => {
    switch (itemType) {
      case "activity":
        return "🎯";
      case "transportation":
        return "🚀";
      case "lodging":
        return "🏨";
      case "journal":
        return "📔";
    }
  };

  const renderActivityForm = () => (
    <>
      {/* Name and Category */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={activityForm.name}
            onChange={(e) =>
              setActivityForm((prev) => ({ ...prev, name: e.target.value }))
            }
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
            value={activityForm.category}
            onChange={(e) =>
              setActivityForm((prev) => ({ ...prev, category: e.target.value }))
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
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Description
        </label>
        <textarea
          value={activityForm.description}
          onChange={(e) =>
            setActivityForm((prev) => ({
              ...prev,
              description: e.target.value,
            }))
          }
          className="input"
          rows={2}
          placeholder="Activity description"
        />
      </div>

      {/* Location */}
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
              value={activityForm.locationId || ""}
              onChange={(e) =>
                setActivityForm((prev) => ({
                  ...prev,
                  locationId: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                }))
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
      </div>

      {/* All Day Toggle */}
      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="allDay"
          checked={activityForm.allDay}
          onChange={(e) =>
            setActivityForm((prev) => ({ ...prev, allDay: e.target.checked }))
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
      {activityForm.allDay ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="activity-start-date-allday"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Start Date
            </label>
            <input
              id="activity-start-date-allday"
              type="date"
              value={activityForm.startDate}
              onChange={(e) =>
                setActivityForm((prev) => ({
                  ...prev,
                  startDate: e.target.value,
                }))
              }
              className="input"
            />
          </div>
          <div>
            <label
              htmlFor="activity-end-date-allday"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              End Date
            </label>
            <input
              id="activity-end-date-allday"
              type="date"
              value={activityForm.endDate}
              onChange={(e) =>
                setActivityForm((prev) => ({
                  ...prev,
                  endDate: e.target.value,
                }))
              }
              className="input"
            />
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              Start Time
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                aria-label="Start date"
                value={activityForm.startDate}
                onChange={(e) =>
                  setActivityForm((prev) => ({
                    ...prev,
                    startDate: e.target.value,
                  }))
                }
                className="input flex-1"
              />
              <input
                type="time"
                aria-label="Start time"
                value={activityForm.startTime}
                onChange={(e) =>
                  setActivityForm((prev) => ({
                    ...prev,
                    startTime: e.target.value,
                  }))
                }
                className="input flex-1"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
              End Time
            </label>
            <div className="flex gap-2">
              <input
                type="date"
                aria-label="End date"
                value={activityForm.endDate}
                onChange={(e) =>
                  setActivityForm((prev) => ({
                    ...prev,
                    endDate: e.target.value,
                  }))
                }
                className="input flex-1"
              />
              <input
                type="time"
                aria-label="End time"
                value={activityForm.endTime}
                onChange={(e) =>
                  setActivityForm((prev) => ({
                    ...prev,
                    endTime: e.target.value,
                  }))
                }
                className="input flex-1"
              />
            </div>
          </div>
        </div>
      )}

      {/* Timezone */}
      <TimezoneSelect
        value={activityForm.timezone}
        onChange={(value) =>
          setActivityForm((prev) => ({ ...prev, timezone: value }))
        }
        label="Timezone"
      />

      {/* Booking Fields */}
      <BookingFields
        confirmationNumber={activityForm.bookingReference}
        bookingUrl={activityForm.bookingUrl}
        onConfirmationNumberChange={(value) =>
          setActivityForm((prev) => ({ ...prev, bookingReference: value }))
        }
        onBookingUrlChange={(value) =>
          setActivityForm((prev) => ({ ...prev, bookingUrl: value }))
        }
        confirmationLabel="Booking Reference"
      />

      {/* Cost */}
      <CostCurrencyFields
        cost={activityForm.cost}
        currency={activityForm.currency}
        onCostChange={(value) =>
          setActivityForm((prev) => ({ ...prev, cost: value }))
        }
        onCurrencyChange={(value) =>
          setActivityForm((prev) => ({ ...prev, currency: value }))
        }
      />

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          value={activityForm.notes}
          onChange={(e) =>
            setActivityForm((prev) => ({ ...prev, notes: e.target.value }))
          }
          className="input"
          rows={3}
          placeholder="Additional notes..."
        />
      </div>
    </>
  );

  const renderTransportationForm = () => (
    <>
      {/* Type */}
      <div>
        <label
          htmlFor="transportation-type"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Type *
        </label>
        <select
          id="transportation-type"
          value={transportationForm.type}
          onChange={(e) =>
            setTransportationForm((prev) => ({
              ...prev,
              type: e.target.value as TransportationType,
            }))
          }
          className="input"
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

      {/* From/To Locations */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="transportation-from-location"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            From Location
          </label>
          <select
            id="transportation-from-location"
            value={transportationForm.fromLocationId || ""}
            onChange={(e) =>
              setTransportationForm((prev) => ({
                ...prev,
                fromLocationId: e.target.value
                  ? parseInt(e.target.value)
                  : undefined,
              }))
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
          <input
            type="text"
            value={transportationForm.fromLocationName}
            onChange={(e) =>
              setTransportationForm((prev) => ({
                ...prev,
                fromLocationName: e.target.value,
              }))
            }
            className="input mt-2"
            placeholder="Or enter name (e.g., JFK Airport)"
          />
        </div>
        <div>
          <label
            htmlFor="transportation-to-location"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            To Location
          </label>
          <select
            id="transportation-to-location"
            value={transportationForm.toLocationId || ""}
            onChange={(e) =>
              setTransportationForm((prev) => ({
                ...prev,
                toLocationId: e.target.value
                  ? parseInt(e.target.value)
                  : undefined,
              }))
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
          <input
            type="text"
            value={transportationForm.toLocationName}
            onChange={(e) =>
              setTransportationForm((prev) => ({
                ...prev,
                toLocationName: e.target.value,
              }))
            }
            className="input mt-2"
            placeholder="Or enter name (e.g., LAX Airport)"
          />
        </div>
      </div>

      {/* Departure/Arrival Times */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="transportation-departure-time"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Departure Time
          </label>
          <input
            id="transportation-departure-time"
            type="datetime-local"
            value={transportationForm.departureTime}
            onChange={(e) =>
              setTransportationForm((prev) => ({
                ...prev,
                departureTime: e.target.value,
              }))
            }
            className="input"
          />
          <TimezoneSelect
            value={transportationForm.startTimezone}
            onChange={(value) =>
              setTransportationForm((prev) => ({
                ...prev,
                startTimezone: value,
              }))
            }
            label="Departure Timezone"
          />
        </div>
        <div>
          <label
            htmlFor="transportation-arrival-time"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Arrival Time
          </label>
          <input
            id="transportation-arrival-time"
            type="datetime-local"
            value={transportationForm.arrivalTime}
            onChange={(e) =>
              setTransportationForm((prev) => ({
                ...prev,
                arrivalTime: e.target.value,
              }))
            }
            className="input"
          />
          <TimezoneSelect
            value={transportationForm.endTimezone}
            onChange={(value) =>
              setTransportationForm((prev) => ({ ...prev, endTimezone: value }))
            }
            label="Arrival Timezone"
          />
        </div>
      </div>

      {/* Carrier and Vehicle Number */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Carrier
          </label>
          <input
            type="text"
            value={transportationForm.carrier}
            onChange={(e) =>
              setTransportationForm((prev) => ({
                ...prev,
                carrier: e.target.value,
              }))
            }
            className="input"
            placeholder="e.g., United Airlines"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Vehicle/Flight Number
          </label>
          <input
            type="text"
            value={transportationForm.vehicleNumber}
            onChange={(e) =>
              setTransportationForm((prev) => ({
                ...prev,
                vehicleNumber: e.target.value,
              }))
            }
            className="input"
            placeholder="e.g., UA123"
          />
        </div>
      </div>

      {/* Booking Fields */}
      <BookingFields
        confirmationNumber={transportationForm.confirmationNumber}
        bookingUrl=""
        onConfirmationNumberChange={(value) =>
          setTransportationForm((prev) => ({
            ...prev,
            confirmationNumber: value,
          }))
        }
        onBookingUrlChange={() => {}}
        confirmationLabel="Confirmation Number"
        hideBookingUrl={true}
      />

      {/* Cost */}
      <CostCurrencyFields
        cost={transportationForm.cost}
        currency={transportationForm.currency}
        onCostChange={(value) =>
          setTransportationForm((prev) => ({ ...prev, cost: value }))
        }
        onCurrencyChange={(value) =>
          setTransportationForm((prev) => ({ ...prev, currency: value }))
        }
      />

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          value={transportationForm.notes}
          onChange={(e) =>
            setTransportationForm((prev) => ({
              ...prev,
              notes: e.target.value,
            }))
          }
          className="input"
          rows={3}
          placeholder="Additional notes..."
        />
      </div>
    </>
  );

  const renderLodgingForm = () => (
    <>
      {/* Type and Name */}
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
            value={lodgingForm.type}
            onChange={(e) =>
              setLodgingForm((prev) => ({
                ...prev,
                type: e.target.value as LodgingType,
              }))
            }
            className="input"
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
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
            Name *
          </label>
          <input
            type="text"
            value={lodgingForm.name}
            onChange={(e) =>
              setLodgingForm((prev) => ({ ...prev, name: e.target.value }))
            }
            className="input"
            required
            placeholder="Hotel name"
          />
        </div>
      </div>

      {/* Location */}
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
              value={lodgingForm.locationId || ""}
              onChange={(e) =>
                setLodgingForm((prev) => ({
                  ...prev,
                  locationId: e.target.value
                    ? parseInt(e.target.value)
                    : undefined,
                }))
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
      </div>

      {/* Address */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Address
        </label>
        <input
          type="text"
          value={lodgingForm.address}
          onChange={(e) =>
            setLodgingForm((prev) => ({ ...prev, address: e.target.value }))
          }
          className="input"
          placeholder="Street address"
        />
      </div>

      {/* Check-in/Check-out */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label
            htmlFor="lodging-checkin"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Check-in *
          </label>
          <input
            id="lodging-checkin"
            type="datetime-local"
            value={lodgingForm.checkInDate}
            onChange={(e) =>
              setLodgingForm((prev) => ({
                ...prev,
                checkInDate: e.target.value,
              }))
            }
            className="input"
            required
          />
        </div>
        <div>
          <label
            htmlFor="lodging-checkout"
            className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Check-out *
          </label>
          <input
            id="lodging-checkout"
            type="datetime-local"
            value={lodgingForm.checkOutDate}
            onChange={(e) =>
              setLodgingForm((prev) => ({
                ...prev,
                checkOutDate: e.target.value,
              }))
            }
            className="input"
            required
          />
        </div>
      </div>

      {/* Timezone */}
      <TimezoneSelect
        value={lodgingForm.timezone}
        onChange={(value) =>
          setLodgingForm((prev) => ({ ...prev, timezone: value }))
        }
        label="Timezone"
      />

      {/* Booking Fields */}
      <BookingFields
        confirmationNumber={lodgingForm.confirmationNumber}
        bookingUrl={lodgingForm.bookingUrl}
        onConfirmationNumberChange={(value) =>
          setLodgingForm((prev) => ({ ...prev, confirmationNumber: value }))
        }
        onBookingUrlChange={(value) =>
          setLodgingForm((prev) => ({ ...prev, bookingUrl: value }))
        }
        confirmationLabel="Confirmation Number"
      />

      {/* Cost */}
      <CostCurrencyFields
        cost={lodgingForm.cost}
        currency={lodgingForm.currency}
        onCostChange={(value) =>
          setLodgingForm((prev) => ({ ...prev, cost: value }))
        }
        onCurrencyChange={(value) =>
          setLodgingForm((prev) => ({ ...prev, currency: value }))
        }
      />

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Notes
        </label>
        <textarea
          value={lodgingForm.notes}
          onChange={(e) =>
            setLodgingForm((prev) => ({ ...prev, notes: e.target.value }))
          }
          className="input"
          rows={3}
          placeholder="Additional notes..."
        />
      </div>
    </>
  );

  const renderJournalForm = () => (
    <>
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={journalForm.title}
          onChange={(e) =>
            setJournalForm((prev) => ({ ...prev, title: e.target.value }))
          }
          className="input"
          placeholder="Day 1 in Paris"
          required
        />
      </div>

      {/* Entry Date */}
      <div>
        <label
          htmlFor="journal-entry-date"
          className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
        >
          Entry Date
        </label>
        <input
          id="journal-entry-date"
          type="datetime-local"
          value={journalForm.entryDate}
          onChange={(e) =>
            setJournalForm((prev) => ({ ...prev, entryDate: e.target.value }))
          }
          className="input"
        />
      </div>

      {/* Content */}
      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Content *
        </label>
        <textarea
          value={journalForm.content}
          onChange={(e) =>
            setJournalForm((prev) => ({ ...prev, content: e.target.value }))
          }
          rows={8}
          className="input font-mono text-sm"
          placeholder="Write your journal entry here..."
          required
        />
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {journalForm.content.length} characters
        </p>
      </div>

      {/* Associated Entities */}
      <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
        <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
          Link to Trip Items (optional)
        </h4>
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-4">
          Hold Ctrl (Windows) or Cmd (Mac) to select multiple items
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Locations */}
          {localLocations.length > 0 && (
            <div>
              <label
                htmlFor="journal-locations"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Locations
              </label>
              <select
                id="journal-locations"
                multiple
                value={journalForm.locationIds.map(String)}
                onChange={(e) => {
                  const selectedIds = Array.from(e.target.selectedOptions).map(
                    (opt) => parseInt(opt.value)
                  );
                  setJournalForm((prev) => ({
                    ...prev,
                    locationIds: selectedIds,
                  }));
                }}
                className="input h-24"
              >
                {localLocations.map((loc) => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Activities */}
          {activities.length > 0 && (
            <div>
              <label
                htmlFor="journal-activities"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Activities
              </label>
              <select
                id="journal-activities"
                multiple
                value={journalForm.activityIds.map(String)}
                onChange={(e) => {
                  const selectedIds = Array.from(e.target.selectedOptions).map(
                    (opt) => parseInt(opt.value)
                  );
                  setJournalForm((prev) => ({
                    ...prev,
                    activityIds: selectedIds,
                  }));
                }}
                className="input h-24"
              >
                {activities.map((activity) => (
                  <option key={activity.id} value={activity.id}>
                    {activity.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Lodgings */}
          {lodgings.length > 0 && (
            <div>
              <label
                htmlFor="journal-lodgings"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Lodgings
              </label>
              <select
                id="journal-lodgings"
                multiple
                value={journalForm.lodgingIds.map(String)}
                onChange={(e) => {
                  const selectedIds = Array.from(e.target.selectedOptions).map(
                    (opt) => parseInt(opt.value)
                  );
                  setJournalForm((prev) => ({
                    ...prev,
                    lodgingIds: selectedIds,
                  }));
                }}
                className="input h-24"
              >
                {lodgings.map((lodging) => (
                  <option key={lodging.id} value={lodging.id}>
                    {lodging.name}
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Transportations */}
          {transportations.length > 0 && (
            <div>
              <label
                htmlFor="journal-transportations"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Transportation
              </label>
              <select
                id="journal-transportations"
                multiple
                value={journalForm.transportationIds.map(String)}
                onChange={(e) => {
                  const selectedIds = Array.from(e.target.selectedOptions).map(
                    (opt) => parseInt(opt.value)
                  );
                  setJournalForm((prev) => ({
                    ...prev,
                    transportationIds: selectedIds,
                  }));
                }}
                className="input h-24"
              >
                {transportations.map((trans) => (
                  <option key={trans.id} value={trans.id}>
                    {trans.type}:{" "}
                    {trans.fromLocation?.name ||
                      trans.fromLocationName ||
                      "Unknown"}{" "}
                    →{" "}
                    {trans.toLocation?.name ||
                      trans.toLocationName ||
                      "Unknown"}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>
      </div>
    </>
  );

  const renderForm = () => {
    switch (itemType) {
      case "activity":
        return renderActivityForm();
      case "transportation":
        return renderTransportationForm();
      case "lodging":
        return renderLodgingForm();
      case "journal":
        return renderJournalForm();
    }
  };

  return (
    <FormModal
      isOpen={isOpen}
      onClose={onClose}
      title={`Edit ${getItemTypeLabel()}`}
      icon={getItemTypeIcon()}
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className="btn btn-secondary"
            disabled={saving}
          >
            Cancel
          </button>
          <button
            type="submit"
            form="timeline-edit-form"
            className="btn btn-primary"
            disabled={saving}
          >
            {saving ? "Saving..." : "Save Changes"}
          </button>
        </>
      }
    >
      <form
        id="timeline-edit-form"
        onSubmit={handleSubmit}
        className="space-y-4"
      >
        {renderForm()}
      </form>
    </FormModal>
  );
}
