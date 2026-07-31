/**
 * Date/Time Defaults Utility Tests
 *
 * Test cases:
 * - DTD-001: shiftDateTimeParts adds hours within the same day
 * - DTD-002: shiftDateTimeParts rolls forward across midnight
 * - DTD-003: shiftDateTimeParts rolls backward across midnight
 * - DTD-004: shiftDateTimeParts crosses a month and year boundary
 * - DTD-005: shiftDateTimeParts holds the wall clock across a DST transition
 * - DTD-006: shiftDateTimeParts returns null for an incomplete pair
 * - DTD-007: shiftDateTimeParts tolerates an HH:mm:ss time value
 * - DTD-008: splitDateTimeLocal splits a datetime-local value
 * - DTD-009: joinDateTimeLocal requires both halves
 * - DTD-010: isDateTimeEmpty only reports a fully blank pair
 */

import { describe, it, expect } from "vitest";
import {
  shiftDateTimeParts,
  splitDateTimeLocal,
  joinDateTimeLocal,
  isDateTimeEmpty,
} from "../dateTimeDefaults";

describe("dateTimeDefaults", () => {
  describe("shiftDateTimeParts", () => {
    it("DTD-001: adds hours within the same day", () => {
      expect(shiftDateTimeParts({ date: "2026-07-31", time: "14:30" }, 1)).toEqual({
        date: "2026-07-31",
        time: "15:30",
      });
    });

    it("DTD-002: rolls forward across midnight", () => {
      expect(shiftDateTimeParts({ date: "2026-07-31", time: "23:30" }, 1)).toEqual({
        date: "2026-08-01",
        time: "00:30",
      });
    });

    it("DTD-003: rolls backward across midnight", () => {
      expect(shiftDateTimeParts({ date: "2026-08-01", time: "00:30" }, -1)).toEqual({
        date: "2026-07-31",
        time: "23:30",
      });
    });

    it("DTD-004: crosses a month and year boundary", () => {
      expect(shiftDateTimeParts({ date: "2026-12-31", time: "23:00" }, 1)).toEqual({
        date: "2027-01-01",
        time: "00:00",
      });
      expect(shiftDateTimeParts({ date: "2027-01-01", time: "00:00" }, -1)).toEqual({
        date: "2026-12-31",
        time: "23:00",
      });
    });

    it("DTD-005: holds the wall clock across a DST transition", () => {
      // 2:00 AM on US spring-forward Sunday does not exist in local time. Doing this
      // math with a local Date would jump two hours; these are wall-clock strings the
      // user typed, so an hour must stay an hour.
      expect(shiftDateTimeParts({ date: "2026-03-08", time: "01:30" }, 1)).toEqual({
        date: "2026-03-08",
        time: "02:30",
      });
    });

    it("DTD-006: returns null for an incomplete pair", () => {
      expect(shiftDateTimeParts({ date: "2026-07-31", time: "" }, 1)).toBeNull();
      expect(shiftDateTimeParts({ date: "", time: "14:00" }, 1)).toBeNull();
      expect(shiftDateTimeParts({ date: "not-a-date", time: "14:00" }, 1)).toBeNull();
    });

    it("DTD-007: tolerates an HH:mm:ss time value", () => {
      expect(shiftDateTimeParts({ date: "2026-07-31", time: "14:30:45" }, 1)).toEqual({
        date: "2026-07-31",
        time: "15:30",
      });
    });
  });

  describe("splitDateTimeLocal / joinDateTimeLocal", () => {
    it("DTD-008: splits a datetime-local value", () => {
      expect(splitDateTimeLocal("2026-07-31T14:00")).toEqual({
        date: "2026-07-31",
        time: "14:00",
      });
      expect(splitDateTimeLocal("2026-07-31T14:00:30")).toEqual({
        date: "2026-07-31",
        time: "14:00",
      });
      expect(splitDateTimeLocal("")).toEqual({ date: "", time: "" });
    });

    it("DTD-009: requires both halves", () => {
      expect(joinDateTimeLocal({ date: "2026-07-31", time: "14:00" })).toBe(
        "2026-07-31T14:00"
      );
      expect(joinDateTimeLocal({ date: "2026-07-31", time: "" })).toBe("");
      expect(joinDateTimeLocal({ date: "", time: "14:00" })).toBe("");
    });
  });

  describe("isDateTimeEmpty", () => {
    it("DTD-010: only reports a fully blank pair", () => {
      expect(isDateTimeEmpty({ date: "", time: "" })).toBe(true);
      expect(isDateTimeEmpty({ date: "2026-07-31", time: "" })).toBe(false);
      expect(isDateTimeEmpty({ date: "", time: "14:00" })).toBe(false);
    });
  });
});
