import { useId } from 'react';
import { commonTimezones } from '../utils/timezone';

interface TimezoneSelectProps {
  value: string;
  onChange: (value: string) => void;
  label?: string;
  helpText?: string;
  id?: string;
}

/**
 * Reusable timezone select dropdown with common timezone options
 */
export default function TimezoneSelect({
  value,
  onChange,
  label = 'Timezone',
  helpText = 'If not specified, the trip\'s timezone will be used',
  id: providedId,
}: TimezoneSelectProps) {
  const generatedId = useId();
  const fieldId = providedId || generatedId;

  return (
    <div>
      <label
        htmlFor={fieldId}
        className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
      >
        {label}
      </label>
      <select
        id={fieldId}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="input"
      >
        {commonTimezones.map(({ value: tzValue, label: tzLabel }) => (
          <option key={tzValue} value={tzValue}>
            {tzLabel}
          </option>
        ))}
      </select>
      {helpText && (
        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
          {helpText}
        </p>
      )}
    </div>
  );
}
