declare module 'tz-lookup' {
  /**
   * Returns the IANA timezone identifier (e.g. "Europe/Paris") for the given
   * coordinates. Throws a RangeError for invalid coordinates.
   */
  export default function tzlookup(lat: number, lng: number): string;
}
