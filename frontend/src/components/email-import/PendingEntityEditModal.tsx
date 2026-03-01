import { useState, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import type { PendingEntity } from '../../services/emailImport.service';
import tripService from '../../services/trip.service';
import Modal from '../Modal';

interface PendingEntityEditModalProps {
  entity: PendingEntity;
  onSaveAndAccept: (id: number, data: { parsedData: Record<string, unknown>; matchedTripId: number | null }) => void;
  onSave: (id: number, data: { parsedData: Record<string, unknown>; matchedTripId: number | null }) => void;
  onClose: () => void;
  isSaving?: boolean;
}

const TRANSPORTATION_TYPES = ['flight', 'train', 'bus', 'car', 'ferry', 'bicycle', 'walk', 'other'];
const LODGING_TYPES = ['hotel', 'hostel', 'airbnb', 'vacation_rental', 'camping', 'resort', 'motel', 'bed_and_breakfast', 'apartment', 'friends_family', 'other'];

const ENTITY_TYPE_LABELS: Record<PendingEntity['entityType'], string> = {
  TRANSPORTATION: 'Transportation',
  LODGING: 'Lodging',
  ACTIVITY: 'Activity',
  LOCATION: 'Location',
};

function formatDisplayLabel(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ');
}

function formatTripDate(dateStr: string | null | undefined): string {
  if (!dateStr) return '';
  try {
    return new Date(dateStr).toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  } catch {
    return dateStr;
  }
}

export default function PendingEntityEditModal({ entity, onSaveAndAccept, onSave, onClose, isSaving }: PendingEntityEditModalProps) {
  const [parsedData, setParsedData] = useState<Record<string, unknown>>({ ...entity.parsedData });
  const [matchedTripId, setMatchedTripId] = useState<number | null>(entity.matchedTripId);
  const [validationErrors, setValidationErrors] = useState<Record<string, string>>({});

  // Fetch trips for the dropdown
  const { data: tripsData } = useQuery({
    queryKey: ['trips', 'all-for-select'],
    queryFn: () => tripService.getTrips({ limit: 500 }),
  });

  const trips = tripsData?.trips ?? [];

  // Reset form when entity changes
  useEffect(() => {
    setParsedData({ ...entity.parsedData });
    setMatchedTripId(entity.matchedTripId);
    setValidationErrors({});
  }, [entity]);

  const updateField = (key: string, value: string) => {
    setParsedData((prev) => ({ ...prev, [key]: value || undefined }));
    // Clear validation error when field is edited
    if (validationErrors[key]) {
      setValidationErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    switch (entity.entityType) {
      case 'TRANSPORTATION':
        if (!parsedData.type) errors.type = 'Type is required';
        break;
      case 'LODGING':
        if (!parsedData.name) errors.name = 'Name is required';
        if (!parsedData.type) errors.type = 'Type is required';
        break;
      case 'ACTIVITY':
        if (!parsedData.name) errors.name = 'Name is required';
        break;
      case 'LOCATION':
        if (!parsedData.name) errors.name = 'Name is required';
        break;
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveAndAccept = (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    onSaveAndAccept(entity.id, { parsedData, matchedTripId });
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave(entity.id, { parsedData, matchedTripId });
  };

  const inputClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent text-sm font-body';
  const inputErrorClass =
    'w-full px-3 py-2 border border-red-500 dark:border-red-400 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent text-sm font-body';
  const labelClass = 'block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 font-body';
  const selectClass =
    'w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-primary-500 dark:focus:ring-primary-400 focus:border-transparent text-sm font-body';
  const selectErrorClass =
    'w-full px-3 py-2 border border-red-500 dark:border-red-400 rounded-lg bg-white dark:bg-navy-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-red-500 dark:focus:ring-red-400 focus:border-transparent text-sm font-body';

  const renderFields = () => {
    switch (entity.entityType) {
      case 'TRANSPORTATION':
        return (
          <>
            <div>
              <label htmlFor="field-type" className={labelClass}>Type <span className="text-red-500">*</span></label>
              <select
                id="field-type"
                value={String(parsedData.type || '')}
                onChange={(e) => updateField('type', e.target.value)}
                className={validationErrors.type ? selectErrorClass : selectClass}
                required
              >
                <option value="">Select type</option>
                {TRANSPORTATION_TYPES.map((t) => (
                  <option key={t} value={t}>{formatDisplayLabel(t)}</option>
                ))}
              </select>
              {validationErrors.type && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{validationErrors.type}</p>}
            </div>
            <div>
              <label htmlFor="field-fromLocationName" className={labelClass}>From</label>
              <input
                id="field-fromLocationName"
                type="text"
                value={String(parsedData.fromLocationName || '')}
                onChange={(e) => updateField('fromLocationName', e.target.value)}
                className={inputClass}
                placeholder="Departure location"
              />
            </div>
            <div>
              <label htmlFor="field-toLocationName" className={labelClass}>To</label>
              <input
                id="field-toLocationName"
                type="text"
                value={String(parsedData.toLocationName || '')}
                onChange={(e) => updateField('toLocationName', e.target.value)}
                className={inputClass}
                placeholder="Arrival location"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="field-departureTime" className={labelClass}>Departure Time</label>
                <input
                  id="field-departureTime"
                  type="datetime-local"
                  value={toDatetimeLocal(parsedData.departureTime)}
                  onChange={(e) => updateField('departureTime', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="field-arrivalTime" className={labelClass}>Arrival Time</label>
                <input
                  id="field-arrivalTime"
                  type="datetime-local"
                  value={toDatetimeLocal(parsedData.arrivalTime)}
                  onChange={(e) => updateField('arrivalTime', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="field-carrier" className={labelClass}>Carrier</label>
              <input
                id="field-carrier"
                type="text"
                value={String(parsedData.carrier || '')}
                onChange={(e) => updateField('carrier', e.target.value)}
                className={inputClass}
                placeholder="Airline, train company, etc."
              />
            </div>
            <div>
              <label htmlFor="field-confirmationNumber" className={labelClass}>Confirmation Number</label>
              <input
                id="field-confirmationNumber"
                type="text"
                value={String(parsedData.confirmationNumber || '')}
                onChange={(e) => updateField('confirmationNumber', e.target.value)}
                className={inputClass}
                placeholder="Booking reference"
              />
            </div>
          </>
        );

      case 'LODGING':
        return (
          <>
            <div>
              <label htmlFor="field-type" className={labelClass}>Type <span className="text-red-500">*</span></label>
              <select
                id="field-type"
                value={String(parsedData.type || '')}
                onChange={(e) => updateField('type', e.target.value)}
                className={validationErrors.type ? selectErrorClass : selectClass}
                required
              >
                <option value="">Select type</option>
                {LODGING_TYPES.map((t) => (
                  <option key={t} value={t}>{formatDisplayLabel(t)}</option>
                ))}
              </select>
              {validationErrors.type && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{validationErrors.type}</p>}
            </div>
            <div>
              <label htmlFor="field-name" className={labelClass}>Name <span className="text-red-500">*</span></label>
              <input
                id="field-name"
                type="text"
                value={String(parsedData.name || '')}
                onChange={(e) => updateField('name', e.target.value)}
                className={validationErrors.name ? inputErrorClass : inputClass}
                placeholder="Hotel/property name"
                required
              />
              {validationErrors.name && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{validationErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="field-address" className={labelClass}>Address</label>
              <input
                id="field-address"
                type="text"
                value={String(parsedData.address || '')}
                onChange={(e) => updateField('address', e.target.value)}
                className={inputClass}
                placeholder="Address"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="field-checkInDate" className={labelClass}>Check-in Date</label>
                <input
                  id="field-checkInDate"
                  type="date"
                  value={toDateInput(parsedData.checkInDate)}
                  onChange={(e) => updateField('checkInDate', e.target.value)}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="field-checkOutDate" className={labelClass}>Check-out Date</label>
                <input
                  id="field-checkOutDate"
                  type="date"
                  value={toDateInput(parsedData.checkOutDate)}
                  onChange={(e) => updateField('checkOutDate', e.target.value)}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="field-confirmationNumber" className={labelClass}>Confirmation Number</label>
              <input
                id="field-confirmationNumber"
                type="text"
                value={String(parsedData.confirmationNumber || '')}
                onChange={(e) => updateField('confirmationNumber', e.target.value)}
                className={inputClass}
                placeholder="Booking reference"
              />
            </div>
          </>
        );

      case 'ACTIVITY':
        return (
          <>
            <div>
              <label htmlFor="field-name" className={labelClass}>Name <span className="text-red-500">*</span></label>
              <input
                id="field-name"
                type="text"
                value={String(parsedData.name || '')}
                onChange={(e) => updateField('name', e.target.value)}
                className={validationErrors.name ? inputErrorClass : inputClass}
                placeholder="Activity name"
                required
              />
              {validationErrors.name && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{validationErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="field-category" className={labelClass}>Category</label>
              <input
                id="field-category"
                type="text"
                value={String(parsedData.category || '')}
                onChange={(e) => updateField('category', e.target.value)}
                className={inputClass}
                placeholder="Category"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="field-startTime" className={labelClass}>Start Time</label>
                <input
                  id="field-startTime"
                  type="datetime-local"
                  value={toDatetimeLocal(parsedData.startTime)}
                  onChange={(e) => updateField('startTime', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className={inputClass}
                />
              </div>
              <div>
                <label htmlFor="field-endTime" className={labelClass}>End Time</label>
                <input
                  id="field-endTime"
                  type="datetime-local"
                  value={toDatetimeLocal(parsedData.endTime)}
                  onChange={(e) => updateField('endTime', e.target.value ? new Date(e.target.value).toISOString() : '')}
                  className={inputClass}
                />
              </div>
            </div>
            <div>
              <label htmlFor="field-bookingReference" className={labelClass}>Booking Reference</label>
              <input
                id="field-bookingReference"
                type="text"
                value={String(parsedData.bookingReference || '')}
                onChange={(e) => updateField('bookingReference', e.target.value)}
                className={inputClass}
                placeholder="Booking reference"
              />
            </div>
          </>
        );

      case 'LOCATION':
        return (
          <>
            <div>
              <label htmlFor="field-name" className={labelClass}>Name <span className="text-red-500">*</span></label>
              <input
                id="field-name"
                type="text"
                value={String(parsedData.name || '')}
                onChange={(e) => updateField('name', e.target.value)}
                className={validationErrors.name ? inputErrorClass : inputClass}
                placeholder="Location name"
                required
              />
              {validationErrors.name && <p className="mt-1 text-xs text-red-500 dark:text-red-400">{validationErrors.name}</p>}
            </div>
            <div>
              <label htmlFor="field-address" className={labelClass}>Address</label>
              <input
                id="field-address"
                type="text"
                value={String(parsedData.address || '')}
                onChange={(e) => updateField('address', e.target.value)}
                className={inputClass}
                placeholder="Address"
              />
            </div>
            <div>
              <label htmlFor="field-visitDatetime" className={labelClass}>Visit Date/Time</label>
              <input
                id="field-visitDatetime"
                type="datetime-local"
                value={toDatetimeLocal(parsedData.visitDatetime)}
                onChange={(e) => updateField('visitDatetime', e.target.value ? new Date(e.target.value).toISOString() : '')}
                className={inputClass}
              />
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`Edit ${ENTITY_TYPE_LABELS[entity.entityType]} Import`}
      maxWidth="2xl"
      focusFirstInput
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-navy-700 rounded-lg transition-colors text-sm font-body"
            disabled={isSaving}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-2 border border-primary-500 dark:border-gold/50 text-primary-600 dark:text-gold hover:bg-primary-50 dark:hover:bg-navy-700 rounded-lg transition-colors text-sm font-body disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save'}
          </button>
          <button
            type="submit"
            form="edit-entity-form"
            disabled={isSaving}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-700 text-white rounded-lg transition-colors text-sm font-body disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSaving ? 'Saving...' : 'Save & Accept'}
          </button>
        </div>
      }
    >
      <form id="edit-entity-form" onSubmit={handleSaveAndAccept} className="space-y-4">
        {/* Trip selector */}
        <div>
          <label htmlFor="field-tripId" className={labelClass}>Assign to Trip</label>
          <select
            id="field-tripId"
            value={matchedTripId ?? ''}
            onChange={(e) => setMatchedTripId(e.target.value ? Number(e.target.value) : null)}
            className={selectClass}
          >
            <option value="">-- Select a trip --</option>
            {trips.map((trip) => (
              <option key={trip.id} value={trip.id}>
                {trip.title}
                {trip.startDate && ` (${formatTripDate(trip.startDate)} - ${formatTripDate(trip.endDate)})`}
              </option>
            ))}
          </select>
        </div>

        {/* Dynamic fields */}
        {renderFields()}
      </form>
    </Modal>
  );
}

/**
 * Convert an ISO string or date-like value to a datetime-local input value (YYYY-MM-DDTHH:mm)
 */
function toDatetimeLocal(value: unknown): string {
  if (!value) return '';
  try {
    const d = new Date(String(value));
    if (isNaN(d.getTime())) return '';
    // Format as YYYY-MM-DDTHH:mm for datetime-local input
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const hours = String(d.getHours()).padStart(2, '0');
    const minutes = String(d.getMinutes()).padStart(2, '0');
    return `${year}-${month}-${day}T${hours}:${minutes}`;
  } catch {
    return '';
  }
}

/**
 * Convert an ISO string or date-like value to a date input value (YYYY-MM-DD)
 */
function toDateInput(value: unknown): string {
  if (!value) return '';
  try {
    const str = String(value);
    // If already in YYYY-MM-DD format, use directly
    if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;
    const d = new Date(str);
    if (isNaN(d.getTime())) return '';
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  } catch {
    return '';
  }
}
