/**
 * LocationDisplay - Displays location name with hierarchical city/country info
 *
 * Parses address to extract city/country and displays it as secondary text.
 * Pattern: "Location Name" (large) + "City, Country" (smaller, muted)
 */

interface LocationDisplayProps {
  name: string;
  address?: string | null;
  className?: string;
  showFullAddress?: boolean;
  compact?: boolean;
}

/**
 * Extract city and country from an address string
 * Assumes address format: "Street, City, State/Region, Country" or similar
 * Takes the last 2 parts as the secondary location info
 */
function extractSecondaryLocation(address: string): string | null {
  if (!address) return null;

  // Split by comma and trim each part
  const parts = address.split(',').map(p => p.trim()).filter(p => p.length > 0);

  if (parts.length === 0) return null;
  if (parts.length === 1) return parts[0];

  // Take the last 2 parts (usually city + country or state + country)
  const lastTwo = parts.slice(-2);
  return lastTwo.join(', ');
}

export default function LocationDisplay({
  name,
  address,
  className = '',
  showFullAddress = false,
  compact = false,
}: LocationDisplayProps) {
  const secondaryLocation = address ? extractSecondaryLocation(address) : null;

  // Check if the name already contains the secondary location info
  // (to avoid redundant display like "Paris, France" with "Paris, France" below it)
  const shouldShowSecondary = secondaryLocation &&
    !name.toLowerCase().includes(secondaryLocation.toLowerCase().split(',')[0]);

  if (compact) {
    return (
      <div className={`flex items-baseline gap-1.5 ${className}`}>
        <span className="font-semibold text-charcoal dark:text-warm-gray">
          {name}
        </span>
        {shouldShowSecondary && (
          <span className="text-sm text-slate dark:text-warm-gray/60">
            · {secondaryLocation}
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={className}>
      <h3 className="text-lg font-semibold text-charcoal dark:text-warm-gray break-words">
        {name}
      </h3>
      {shouldShowSecondary && (
        <p className="text-sm text-slate dark:text-warm-gray/60 mt-0.5">
          {secondaryLocation}
        </p>
      )}
      {showFullAddress && address && (
        <p className="text-sm text-slate/80 dark:text-warm-gray/50 mt-1 line-clamp-2">
          {address}
        </p>
      )}
    </div>
  );
}
