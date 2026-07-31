import { useCallback, useRef } from "react";
import {
  isDateTimeEmpty,
  shiftDateTimeParts,
  type DateTimeParts,
} from "../utils/dateTimeDefaults";

/** Which half of the range currently holds a value this hook wrote. */
export interface TimeRangeAutoFillState {
  start: boolean;
  end: boolean;
}

/**
 * Keeps the two ends of a start/end pair an hour apart without ever clobbering a value
 * the user typed.
 *
 * Filling in one end offers a default for the other — `end = start + offset`,
 * `start = end - offset` — but only while that other end is still empty or holds a value
 * this hook put there. The moment the user edits an end themselves it becomes theirs,
 * and later edits to its partner leave it alone. That is the whole point of tracking
 * auto-fill state rather than just checking for emptiness: a suggestion the user never
 * looked at should keep following the field it was derived from, while anything they
 * chose deliberately must survive.
 *
 * The caller owns its own form state, so `deriveEnd`/`deriveStart` return the value to
 * apply rather than applying it — `null` means "leave the partner field alone".
 *
 * @param offsetHours Gap to maintain between the two ends. Defaults to 1 hour.
 *
 * @example
 * const { deriveEnd, deriveStart, setAutoFilled } = useTimeRangeDefaults();
 *
 * const onStartChange = (next: DateTimeParts) => {
 *   const end = deriveEnd(next, { date: values.endDate, time: values.endTime });
 *   setValues((prev) => ({
 *     ...prev,
 *     startDate: next.date,
 *     startTime: next.time,
 *     ...(end ? { endDate: end.date, endTime: end.time } : {}),
 *   }));
 * };
 */
export function useTimeRangeDefaults(offsetHours = 1) {
  const autoFilled = useRef<TimeRangeAutoFillState>({ start: false, end: false });

  /**
   * Declare which ends currently hold a value this hook may overwrite.
   *
   * Pass `{ start: false, end: false }` after loading an existing record — those times
   * are the user's. Pass `{ start: true, end: true }` when the form seeds placeholder
   * defaults of its own (a trip start date, a 09:00 stub), since the user did not choose
   * those either and would not expect them to survive.
   */
  const setAutoFilled = useCallback((state: TimeRangeAutoFillState) => {
    autoFilled.current = state;
  }, []);

  const derive = useCallback(
    (
      next: DateTimeParts,
      current: DateTimeParts,
      editedEnd: "start" | "end",
      offset: number
    ): DateTimeParts | null => {
      const partner = editedEnd === "start" ? "end" : "start";

      // The end just edited now belongs to the user, whatever it held before.
      autoFilled.current[editedEnd] = false;

      const partnerIsEmpty = isDateTimeEmpty(current);
      if (!partnerIsEmpty && !autoFilled.current[partner]) return null;
      if (!next.date) return null;

      if (!next.time) {
        // Only half a value so far. Mirror the date onto a genuinely empty partner so
        // the range starts out on one day, but wait for the time before offsetting —
        // and never move a date the form seeded, since a user picking an end date first
        // is usually building a multi-day range.
        if (!partnerIsEmpty) return null;
        autoFilled.current[partner] = true;
        return { date: next.date, time: "" };
      }

      const shifted = shiftDateTimeParts(next, offset);
      if (!shifted) return null;
      autoFilled.current[partner] = true;
      return shifted;
    },
    []
  );

  /**
   * Call when the user edits the start. Returns the end value to apply, or `null` to
   * leave the end field untouched.
   */
  const deriveEnd = useCallback(
    (nextStart: DateTimeParts, currentEnd: DateTimeParts) =>
      derive(nextStart, currentEnd, "start", offsetHours),
    [derive, offsetHours]
  );

  /**
   * Call when the user edits the end. Returns the start value to apply, or `null` to
   * leave the start field untouched.
   */
  const deriveStart = useCallback(
    (nextEnd: DateTimeParts, currentStart: DateTimeParts) =>
      derive(nextEnd, currentStart, "end", -offsetHours),
    [derive, offsetHours]
  );

  return { deriveEnd, deriveStart, setAutoFilled };
}
