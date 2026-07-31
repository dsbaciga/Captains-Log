/**
 * useTimeRangeDefaults Hook Tests
 *
 * Test cases:
 * - TRD-001: Setting the start fills an empty end one hour later
 * - TRD-002: Setting the end fills an empty start one hour earlier
 * - TRD-003: A user-entered end is never overwritten by a later start edit
 * - TRD-004: A user-entered start is never overwritten by a later end edit
 * - TRD-005: An auto-filled end re-computes when the start changes again
 * - TRD-006: A date without a time mirrors onto an empty partner but is not offset
 * - TRD-007: A date without a time leaves a non-empty partner alone
 * - TRD-008: setAutoFilled marks seeded defaults as replaceable
 * - TRD-009: setAutoFilled protects values loaded from a saved record
 * - TRD-010: Clearing a side derives nothing
 */

import { describe, it, expect } from "vitest";
import { renderHook } from "@testing-library/react";
import { useTimeRangeDefaults } from "../useTimeRangeDefaults";

const EMPTY = { date: "", time: "" };

describe("useTimeRangeDefaults", () => {
  it("TRD-001: setting the start fills an empty end one hour later", () => {
    const { result } = renderHook(() => useTimeRangeDefaults());

    expect(
      result.current.deriveEnd({ date: "2026-07-31", time: "14:00" }, EMPTY)
    ).toEqual({ date: "2026-07-31", time: "15:00" });
  });

  it("TRD-002: setting the end fills an empty start one hour earlier", () => {
    const { result } = renderHook(() => useTimeRangeDefaults());

    expect(
      result.current.deriveStart({ date: "2026-07-31", time: "14:00" }, EMPTY)
    ).toEqual({ date: "2026-07-31", time: "13:00" });
  });

  it("TRD-003: a user-entered end is never overwritten by a later start edit", () => {
    const { result } = renderHook(() => useTimeRangeDefaults());

    // User types the end first, which fills the start...
    result.current.deriveStart({ date: "2026-07-31", time: "18:00" }, EMPTY);
    // ...then edits the start. Their 18:00 end must survive.
    expect(
      result.current.deriveEnd({ date: "2026-07-31", time: "09:00" }, {
        date: "2026-07-31",
        time: "18:00",
      })
    ).toBeNull();
  });

  it("TRD-004: a user-entered start is never overwritten by a later end edit", () => {
    const { result } = renderHook(() => useTimeRangeDefaults());

    result.current.deriveEnd({ date: "2026-07-31", time: "09:00" }, EMPTY);
    expect(
      result.current.deriveStart({ date: "2026-07-31", time: "18:00" }, {
        date: "2026-07-31",
        time: "09:00",
      })
    ).toBeNull();
  });

  it("TRD-005: an auto-filled end re-computes when the start changes again", () => {
    const { result } = renderHook(() => useTimeRangeDefaults());

    const firstEnd = result.current.deriveEnd(
      { date: "2026-07-31", time: "14:00" },
      EMPTY
    );
    expect(firstEnd).toEqual({ date: "2026-07-31", time: "15:00" });

    // The 15:00 above was a suggestion, not a choice - it should follow the start.
    expect(
      result.current.deriveEnd({ date: "2026-07-31", time: "16:00" }, firstEnd!)
    ).toEqual({ date: "2026-07-31", time: "17:00" });
  });

  it("TRD-006: a date without a time mirrors onto an empty partner but is not offset", () => {
    const { result } = renderHook(() => useTimeRangeDefaults());

    expect(
      result.current.deriveEnd({ date: "2026-07-31", time: "" }, EMPTY)
    ).toEqual({ date: "2026-07-31", time: "" });
  });

  it("TRD-007: a date without a time leaves a non-empty partner alone", () => {
    const { result } = renderHook(() => useTimeRangeDefaults());

    // Picking an end date while the start already has one usually means a multi-day
    // range, so the start date must not be dragged along.
    expect(
      result.current.deriveStart({ date: "2026-08-03", time: "" }, {
        date: "2026-07-31",
        time: "",
      })
    ).toBeNull();
  });

  it("TRD-008: setAutoFilled marks seeded defaults as replaceable", () => {
    const { result } = renderHook(() => useTimeRangeDefaults());

    // Both fields pre-seeded from the trip start date, which the user did not choose.
    result.current.setAutoFilled({ start: true, end: true });

    expect(
      result.current.deriveEnd({ date: "2026-07-31", time: "14:00" }, {
        date: "2026-07-31",
        time: "09:00",
      })
    ).toEqual({ date: "2026-07-31", time: "15:00" });
  });

  it("TRD-009: setAutoFilled protects values loaded from a saved record", () => {
    const { result } = renderHook(() => useTimeRangeDefaults());

    result.current.setAutoFilled({ start: false, end: false });

    expect(
      result.current.deriveEnd({ date: "2026-07-31", time: "14:00" }, {
        date: "2026-07-31",
        time: "20:00",
      })
    ).toBeNull();
  });

  it("TRD-010: clearing a side derives nothing", () => {
    const { result } = renderHook(() => useTimeRangeDefaults());

    expect(result.current.deriveEnd(EMPTY, EMPTY)).toBeNull();
    expect(result.current.deriveStart({ date: "", time: "14:00" }, EMPTY)).toBeNull();
  });
});
