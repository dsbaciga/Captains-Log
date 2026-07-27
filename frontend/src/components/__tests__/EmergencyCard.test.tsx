/**
 * EmergencyCard Component Tests (feature #111)
 *
 * Test IDs:
 * - EMG-CARD-001: Renders only the emergency numbers the dataset actually knows
 * - EMG-CARD-002: Never renders "none" for an absent number
 * - EMG-CARD-003: Explains an unresolved country instead of showing blank numbers
 * - EMG-CARD-004: Derives the country from the trip's location addresses
 * - EMG-CARD-005: A stored countryCode overrides the derived one
 * - EMG-CARD-006: Shows insurance, embassy and companion medical details
 * - EMG-CARD-007: Says medical details were withheld rather than implying none
 * - EMG-CARD-008: Renders from the offline cache and says how stale it is
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import EmergencyCard from "../EmergencyCard";
import emergencyInfoService from "../../services/emergencyInfo.service";
import type { EmergencyCardData, TripEmergencyInfo } from "../../types/emergencyInfo";

vi.mock("../../services/emergencyInfo.service", () => {
  const mockService = {
    getEmergencyCard: vi.fn(),
    getCachedEmergencyCard: vi.fn(),
    updateEmergencyInfo: vi.fn(),
    deleteEmergencyInfo: vi.fn(),
  };
  return { emergencyInfoService: mockService, default: mockService };
});

vi.mock("../../services/companion.service", () => ({
  default: { updateCompanion: vi.fn() },
}));

vi.mock("react-hot-toast", () => ({
  default: { success: vi.fn(), error: vi.fn() },
  toast: { success: vi.fn(), error: vi.fn() },
  Toaster: () => null,
}));

function makeInfo(overrides: Partial<TripEmergencyInfo> = {}): TripEmergencyInfo {
  return {
    id: 1,
    tripId: 1,
    insuranceProvider: null,
    insurancePolicyNumber: null,
    insuranceAssistancePhone: null,
    embassyName: null,
    embassyPhone: null,
    embassyAddress: null,
    notes: null,
    createdAt: "2026-01-01T00:00:00.000Z",
    updatedAt: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

function makeCard(overrides: Partial<EmergencyCardData> = {}): EmergencyCardData {
  return {
    tripId: 1,
    tripTitle: "Test Trip",
    countryCode: null,
    info: null,
    locationAddresses: [],
    companions: [],
    includesMedicalDetails: true,
    ...overrides,
  };
}

describe("EmergencyCard", () => {
  const tripId = 1;
  let queryClient: QueryClient;

  const renderCard = () =>
    render(
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <EmergencyCard tripId={tripId} />
        </BrowserRouter>
      </QueryClientProvider>
    );

  beforeEach(() => {
    vi.clearAllMocks();
    queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
    });
  });

  afterEach(() => {
    queryClient.clear();
  });

  // ==========================================================================
  // EMG-CARD-001 / EMG-CARD-002: the missing-number rule
  // ==========================================================================
  describe("EMG-CARD-001: Only known numbers are rendered", () => {
    it("should render every number the dataset knows for the country", async () => {
      // France knows all four.
      vi.mocked(emergencyInfoService.getEmergencyCard).mockResolvedValue({
        card: makeCard({ countryCode: "FR" }),
        cachedAt: null,
      });

      renderCard();

      await waitFor(() => expect(screen.getByText("17")).toBeInTheDocument());
      expect(screen.getByText("All emergencies")).toBeInTheDocument();
      expect(screen.getByText("Ambulance")).toBeInTheDocument();
      expect(screen.getByText("Police")).toBeInTheDocument();
      expect(screen.getByText("Fire")).toBeInTheDocument();
    });

    it("EMG-CARD-002: should omit a number the dataset does not know, never show 'none'", async () => {
      // Belgium's entry is { universal: "112", police: "101" } — no ambulance or
      // fire number. Those must be absent from the DOM entirely: in the dataset a
      // missing field means "not confidently known", and printing "Ambulance:
      // none" on an emergency card would be actively dangerous.
      vi.mocked(emergencyInfoService.getEmergencyCard).mockResolvedValue({
        card: makeCard({ countryCode: "BE" }),
        cachedAt: null,
      });

      renderCard();

      await waitFor(() => expect(screen.getByText("112")).toBeInTheDocument());
      expect(screen.getByText("Police")).toBeInTheDocument();
      expect(screen.queryByText("Ambulance")).not.toBeInTheDocument();
      expect(screen.queryByText("Fire")).not.toBeInTheDocument();
      expect(screen.queryByText(/none/i)).not.toBeInTheDocument();
      expect(screen.queryByText(/^n\/a$/i)).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // EMG-CARD-003
  // ==========================================================================
  describe("EMG-CARD-003: Unresolved country", () => {
    it("should explain the country is unknown instead of showing empty numbers", async () => {
      vi.mocked(emergencyInfoService.getEmergencyCard).mockResolvedValue({
        card: makeCard({ locationAddresses: ["A nameless valley"] }),
        cachedAt: null,
      });

      renderCard();

      await waitFor(() =>
        expect(
          screen.getByText(/could not work out the destination country/i)
        ).toBeInTheDocument()
      );
      expect(screen.queryByText("All emergencies")).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // EMG-CARD-004 / EMG-CARD-005: country resolution
  // ==========================================================================
  describe("EMG-CARD-004: Country derived from addresses", () => {
    it("should use the first address that resolves when no override is stored", async () => {
      vi.mocked(emergencyInfoService.getEmergencyCard).mockResolvedValue({
        card: makeCard({
          locationAddresses: ["Shibuya City, Tokyo, Japan"],
        }),
        cachedAt: null,
      });

      renderCard();

      // Japan: police 110, ambulance/fire 119. No universal number is recorded.
      await waitFor(() => expect(screen.getByText("110")).toBeInTheDocument());
      expect(screen.getByText(/Numbers and contacts for Japan/i)).toBeInTheDocument();
      expect(screen.queryByText("All emergencies")).not.toBeInTheDocument();
    });
  });

  describe("EMG-CARD-005: Stored override wins", () => {
    it("should prefer countryCode over the trip's addresses", async () => {
      vi.mocked(emergencyInfoService.getEmergencyCard).mockResolvedValue({
        card: makeCard({
          countryCode: "AU",
          locationAddresses: ["Shibuya City, Tokyo, Japan"],
        }),
        cachedAt: null,
      });

      renderCard();

      await waitFor(() =>
        expect(screen.getByText(/Numbers and contacts for Australia/i)).toBeInTheDocument()
      );
      expect(screen.getAllByText("000").length).toBeGreaterThan(0);
    });
  });

  // ==========================================================================
  // EMG-CARD-006
  // ==========================================================================
  describe("EMG-CARD-006: Stored details", () => {
    it("should show insurance, embassy and companion medical details", async () => {
      vi.mocked(emergencyInfoService.getEmergencyCard).mockResolvedValue({
        card: makeCard({
          countryCode: "PT",
          info: makeInfo({
            insuranceProvider: "Acme Travel",
            insurancePolicyNumber: "AC-12345",
            insuranceAssistancePhone: "+1 800 555 0100",
            embassyName: "US Embassy Lisbon",
            embassyPhone: "+351 21 727 3300",
          }),
          companions: [
            {
              id: 5,
              name: "Ana",
              relationship: "Partner",
              phone: "+351 900 000 000",
              medicalNotes: "Asthma - carries a blue inhaler",
              allergies: ["penicillin"],
              dietaryPreferences: [],
            },
          ],
        }),
        cachedAt: null,
      });

      renderCard();

      await waitFor(() => expect(screen.getByText("AC-12345")).toBeInTheDocument());
      expect(screen.getByText("Acme Travel")).toBeInTheDocument();
      expect(screen.getByText("US Embassy Lisbon")).toBeInTheDocument();
      expect(screen.getByText("Ana")).toBeInTheDocument();
      expect(screen.getByText(/Allergies: penicillin/)).toBeInTheDocument();
      expect(screen.getByText(/Asthma/)).toBeInTheDocument();

      // The assistance line is dialable from the phone the card is read on.
      const assistance = screen.getByRole("link", { name: "+1 800 555 0100" });
      expect(assistance).toHaveAttribute("href", "tel:+18005550100");
    });
  });

  // ==========================================================================
  // EMG-CARD-007
  // ==========================================================================
  describe("EMG-CARD-007: Withheld medical details", () => {
    it("should say details were withheld rather than imply there are none", async () => {
      vi.mocked(emergencyInfoService.getEmergencyCard).mockResolvedValue({
        card: makeCard({
          countryCode: "PT",
          includesMedicalDetails: false,
          companions: [
            {
              id: 5,
              name: "Ana",
              relationship: null,
              phone: null,
              medicalNotes: null,
              allergies: [],
              dietaryPreferences: [],
            },
          ],
        }),
        cachedAt: null,
      });

      renderCard();

      await waitFor(() => expect(screen.getByText("Ana")).toBeInTheDocument());
      expect(
        screen.getByText(/visible to the trip owner only/i)
      ).toBeInTheDocument();
      // And no edit affordance, since a non-owner cannot write them.
      expect(screen.queryByRole("button", { name: "Medical" })).not.toBeInTheDocument();
    });
  });

  // ==========================================================================
  // EMG-CARD-008
  // ==========================================================================
  describe("EMG-CARD-008: Offline cache", () => {
    it("should render a cached card and state its age", async () => {
      const twoHoursAgo = Date.now() - 2 * 60 * 60 * 1000;
      vi.mocked(emergencyInfoService.getEmergencyCard).mockResolvedValue({
        card: makeCard({ countryCode: "PT" }),
        cachedAt: twoHoursAgo,
      });

      renderCard();

      await waitFor(() =>
        expect(screen.getByText(/saved offline 2 hours ago/i)).toBeInTheDocument()
      );
      // The numbers still render — they come from the bundle, not the network.
      expect(screen.getByText("112")).toBeInTheDocument();
    });

    it("should show a recoverable empty state when there is no cache either", async () => {
      vi.mocked(emergencyInfoService.getEmergencyCard).mockRejectedValue(
        new Error("Network Error")
      );

      renderCard();

      await waitFor(() =>
        expect(screen.getByText("Emergency card unavailable")).toBeInTheDocument()
      );
      expect(screen.getByText(/nothing is saved offline yet/i)).toBeInTheDocument();
    });
  });
});
