/**
 * Wall-clock helpers for the split `date` + `time` pairs the schedule forms use.
 *
 * Nothing here converts between timezones — that is `utils/timezone.ts`'s job and it
 * happens on submit. These functions only rearrange the `YYYY-MM-DD` / `HH:mm` strings
 * that `<input type="date">` and `<input type="time">` produce, so a form can offer a
 * sensible default for the half of a range the user has not filled in yet.
 *
 * Arithmetic runs through `Date.UTC` rather than a local `new Date(y, m, d, …)`: a
 * local-time Date crossing a DST boundary in the browser's zone would silently move the
 * wall clock, turning "one hour later" into two hours or zero.
 */

export interface DateTimeParts {
  /** `YYYY-MM-DD`, or `""` when unset. */
  date: string;
  /** `HH:mm`, or `""` when unset. */
  time: string;
}

const DATE_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;
/** Tolerates the `HH:mm:ss` some browsers emit when seconds are non-zero. */
const TIME_PATTERN = /^(\d{2}):(\d{2})/;

const pad = (value: number, length = 2): string => String(value).padStart(length, "0");

/**
 * True when neither half of the pair has a value.
 *
 * @example
 * isDateTimeEmpty({ date: "", time: "" });            // true
 * isDateTimeEmpty({ date: "2026-07-31", time: "" });  // false — half-filled, not empty
 */
export function isDateTimeEmpty(parts: DateTimeParts): boolean {
  return !parts.date && !parts.time;
}

/**
 * Move a date/time pair by a number of hours, rolling the calendar date over as needed.
 *
 * @param parts Pair to shift. Both halves must be present and parseable.
 * @param hours Hours to add; negative values move backwards.
 * @returns The shifted pair, or `null` if `parts` is not a complete date + time.
 *
 * @example
 * shiftDateTimeParts({ date: "2026-07-31", time: "23:30" }, 1);
 * // { date: "2026-08-01", time: "00:30" }
 * shiftDateTimeParts({ date: "2026-07-31", time: "00:30" }, -1);
 * // { date: "2026-07-30", time: "23:30" }
 */
export function shiftDateTimeParts(
  parts: DateTimeParts,
  hours: number
): DateTimeParts | null {
  const dateMatch = DATE_PATTERN.exec(parts.date);
  const timeMatch = TIME_PATTERN.exec(parts.time);
  if (!dateMatch || !timeMatch) return null;

  const shifted = new Date(
    Date.UTC(
      Number(dateMatch[1]),
      Number(dateMatch[2]) - 1,
      Number(dateMatch[3]),
      Number(timeMatch[1]),
      Number(timeMatch[2])
    ) +
      hours * 60 * 60 * 1000
  );
  if (Number.isNaN(shifted.getTime())) return null;

  return {
    date: `${pad(shifted.getUTCFullYear(), 4)}-${pad(shifted.getUTCMonth() + 1)}-${pad(shifted.getUTCDate())}`,
    time: `${pad(shifted.getUTCHours())}:${pad(shifted.getUTCMinutes())}`,
  };
}

/**
 * Split a `datetime-local` input value into its two halves.
 *
 * @example
 * splitDateTimeLocal("2026-07-31T14:00"); // { date: "2026-07-31", time: "14:00" }
 * splitDateTimeLocal("");                 // { date: "", time: "" }
 */
export function splitDateTimeLocal(value: string): DateTimeParts {
  if (!value) return { date: "", time: "" };
  const [date, time = ""] = value.split("T");
  return { date, time: time.slice(0, 5) };
}

/**
 * Join a pair back into a `datetime-local` value. Returns `""` unless both halves are
 * present, since a half-filled pair is not a value that input can display.
 *
 * @example
 * joinDateTimeLocal({ date: "2026-07-31", time: "14:00" }); // "2026-07-31T14:00"
 * joinDateTimeLocal({ date: "2026-07-31", time: "" });      // ""
 */
export function joinDateTimeLocal(parts: DateTimeParts): string {
  return parts.date && parts.time ? `${parts.date}T${parts.time}` : "";
}
