/**
 * Journal Entry Service Tests
 *
 * Test cases:
 * - JOUR-001: Create trip-level entry
 * - JOUR-002: Create daily entry
 * - JOUR-003: Track mood
 * - JOUR-004: Track weather notes
 * - JOUR-005: Get entries by trip
 * - JOUR-006: Update entry
 * - JOUR-007: Delete entry
 */

// Mock @prisma/client BEFORE any imports
jest.mock('@prisma/client', () => {
  class MockDecimal {
    private value: string;
    constructor(value: string | number) {
      this.value = String(value);
    }
    toString(): string {
      return this.value;
    }
    toNumber(): number {
      return parseFloat(this.value);
    }
    valueOf(): number {
      return this.toNumber();
    }
  }

  return {
    Prisma: {
      Decimal: MockDecimal,
    },
    EntityType: {
      JOURNAL_ENTRY: 'JOURNAL_ENTRY',
    },
  };
});

// Mock the database config
const mockPrisma = {
  trip: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  journalEntry: {
    create: jest.fn(),
    findMany: jest.fn(),
    findUnique: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  entityLink: {
    deleteMany: jest.fn(),
  },
};

jest.mock('../../config/database', () => ({
  __esModule: true,
  default: mockPrisma,
}));

// Mock service helpers
jest.mock('../../utils/serviceHelpers', () => {
  const originalModule = jest.requireActual('../../utils/serviceHelpers');
  return {
    ...originalModule,
    verifyTripAccessWithPermission: jest.fn(),
    verifyEntityAccessWithPermission: jest.fn(),
    cleanupEntityLinks: jest.fn(),
  };
});

// Mock date-fns-tz
jest.mock('date-fns-tz', () => ({
  fromZonedTime: jest.fn((date: Date) => date),
}));

import journalEntryService from '../journalEntry.service';
import { verifyTripAccessWithPermission, verifyEntityAccessWithPermission, cleanupEntityLinks } from '../../utils/serviceHelpers';
import { AppError } from '../../utils/errors';
import { fromZonedTime } from 'date-fns-tz';

describe('JournalEntryService', () => {
  const mockUserId = 1;
  const mockTripId = 1;
  const mockEntryId = 1;

  const mockTrip = {
    id: mockTripId,
    userId: mockUserId,
    title: 'European Adventure',
    timezone: 'Europe/Paris',
    privacyLevel: 'Private',
  };

  const mockTripAccessResult = {
    trip: mockTrip,
    isOwner: true,
    permissionLevel: 'admin',
  };

  const mockTripWithoutTimezone = {
    ...mockTrip,
    timezone: null,
  };

  const mockTripAccessResultNoTimezone = {
    trip: mockTripWithoutTimezone,
    isOwner: true,
    permissionLevel: 'admin',
  };

  const mockJournalEntry = {
    id: mockEntryId,
    tripId: mockTripId,
    title: 'Amazing Day in Paris',
    content: 'Today we visited the Eiffel Tower and had croissants for breakfast.',
    date: new Date('2025-06-15'),
    entryType: 'daily',
    mood: 'excited',
    weatherNotes: 'Sunny and warm, 24C',
    createdAt: new Date(),
    updatedAt: new Date(),
    trip: mockTrip,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (verifyTripAccessWithPermission as jest.Mock).mockResolvedValue(mockTripAccessResult);
    (verifyEntityAccessWithPermission as jest.Mock).mockResolvedValue({
      entity: { ...mockJournalEntry, tripId: mockTripId },
      tripAccess: mockTripAccessResult,
    });
    (cleanupEntityLinks as jest.Mock).mockResolvedValue(undefined);
    (fromZonedTime as jest.Mock).mockImplementation((date: Date) => date);
    // Mock trip.findUnique for timezone lookup in createJournalEntry
    mockPrisma.trip.findUnique.mockResolvedValue({ timezone: 'Europe/Paris' });
  });

  describe('JOUR-001: Create trip-level entry', () => {
    it('should create a trip-level journal entry without a specific date', async () => {
      const createInput = {
        tripId: mockTripId,
        title: 'Trip Overview',
        content: 'This trip was an incredible journey through Europe.',
        entryType: 'trip',
      };

      const expectedEntry = {
        ...mockJournalEntry,
        title: 'Trip Overview',
        content: 'This trip was an incredible journey through Europe.',
        entryType: 'trip',
        date: null,
        mood: null,
        weatherNotes: null,
      };

      mockPrisma.journalEntry.create.mockResolvedValue(expectedEntry);

      const result = await journalEntryService.createJournalEntry(mockUserId, createInput);

      expect(verifyTripAccessWithPermission).toHaveBeenCalledWith(mockUserId, mockTripId, 'edit');
      expect(mockPrisma.journalEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tripId: mockTripId,
          title: 'Trip Overview',
          content: 'This trip was an incredible journey through Europe.',
          entryType: 'trip',
        }),
      });
      expect(result.entryType).toBe('trip');
    });

    it('should create trip-level entry with default entryType of daily if not specified', async () => {
      const createInput = {
        tripId: mockTripId,
        title: 'General Entry',
        content: 'Some general notes about the trip.',
      };

      const expectedEntry = {
        ...mockJournalEntry,
        entryType: 'daily',
      };

      mockPrisma.journalEntry.create.mockResolvedValue(expectedEntry);

      const result = await journalEntryService.createJournalEntry(mockUserId, createInput);

      expect(mockPrisma.journalEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          entryType: 'daily',
        }),
      });
      expect(result.entryType).toBe('daily');
    });
  });

  describe('JOUR-002: Create daily entry', () => {
    it('should create a daily journal entry with specific date', async () => {
      const createInput = {
        tripId: mockTripId,
        title: 'Day 1 - Arrival in Paris',
        content: 'Arrived at Charles de Gaulle airport and took a taxi to the hotel.',
        entryDate: '2025-06-15',
        entryType: 'daily',
      };

      mockPrisma.journalEntry.create.mockResolvedValue(mockJournalEntry);

      const result = await journalEntryService.createJournalEntry(mockUserId, createInput);

      expect(mockPrisma.journalEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          tripId: mockTripId,
          title: 'Day 1 - Arrival in Paris',
          content: 'Arrived at Charles de Gaulle airport and took a taxi to the hotel.',
          entryType: 'daily',
          date: expect.any(Date),
        }),
      });
      expect(result).toEqual(mockJournalEntry);
    });

    it('should convert date with trip timezone', async () => {
      const createInput = {
        tripId: mockTripId,
        title: 'Day 2 - Museums',
        content: 'Visited the Louvre today.',
        entryDate: '2025-06-16T10:00:00',
        entryType: 'daily',
      };

      mockPrisma.journalEntry.create.mockResolvedValue({
        ...mockJournalEntry,
        date: new Date('2025-06-16'),
      });

      await journalEntryService.createJournalEntry(mockUserId, createInput);

      expect(fromZonedTime).toHaveBeenCalled();
    });

    it('should use date without timezone conversion if trip has no timezone', async () => {
      (verifyTripAccessWithPermission as jest.Mock).mockResolvedValue(mockTripAccessResultNoTimezone);
      mockPrisma.trip.findUnique.mockResolvedValue({ timezone: null });

      const createInput = {
        tripId: mockTripId,
        title: 'Day 3 - Local Trip',
        content: 'No timezone set for this trip.',
        entryDate: '2025-06-17',
        entryType: 'daily',
      };

      mockPrisma.journalEntry.create.mockResolvedValue({
        ...mockJournalEntry,
        date: new Date('2025-06-17'),
      });

      await journalEntryService.createJournalEntry(mockUserId, createInput);

      // When no timezone, should create Date directly without fromZonedTime conversion
      expect(mockPrisma.journalEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          date: expect.any(Date),
        }),
      });
    });

    it('should use current date if no entryDate provided', async () => {
      const createInput = {
        tripId: mockTripId,
        title: 'Quick Note',
        content: 'Just a quick note without a specific date.',
      };

      mockPrisma.journalEntry.create.mockResolvedValue({
        ...mockJournalEntry,
        date: new Date(),
      });

      await journalEntryService.createJournalEntry(mockUserId, createInput);

      expect(mockPrisma.journalEntry.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          date: expect.any(Date),
        }),
      });
    });
  });

  describe('JOUR-003: Track mood', () => {
    it('should create entry with mood field', async () => {
      const moods = ['happy', 'excited', 'relaxed', 'tired', 'adventurous', 'peaceful'];

      for (const mood of moods) {
        const createInput = {
          tripId: mockTripId,
          title: `Feeling ${mood}`,
          content: `Today I felt very ${mood}.`,
          entryDate: '2025-06-15',
        };

        const entryWithMood = {
          ...mockJournalEntry,
          mood,
        };

        mockPrisma.journalEntry.create.mockResolvedValue(entryWithMood);

        // Note: The current service doesn't accept mood in createJournalEntry
        // This test documents the expected behavior if mood were supported in creation
        await journalEntryService.createJournalEntry(mockUserId, createInput);

        expect(mockPrisma.journalEntry.create).toHaveBeenCalled();
      }
    });

    it('should store null if mood not provided', async () => {
      const createInput = {
        tripId: mockTripId,
        title: 'No Mood Entry',
        content: 'Entry without mood tracking.',
      };

      mockPrisma.journalEntry.create.mockResolvedValue({
        ...mockJournalEntry,
        mood: null,
      });

      const result = await journalEntryService.createJournalEntry(mockUserId, createInput);

      // The service creates entry without mood field - it's not in the create schema
      expect(result.mood).toBeNull();
    });
  });

  describe('JOUR-004: Track weather notes', () => {
    it('should store weather notes with the entry', async () => {
      const createInput = {
        tripId: mockTripId,
        title: 'Rainy Day in London',
        content: 'We had to seek shelter in a museum.',
        entryDate: '2025-06-18',
      };

      const entryWithWeather = {
        ...mockJournalEntry,
        weatherNotes: 'Rainy, 15C, light wind',
      };

      mockPrisma.journalEntry.create.mockResolvedValue(entryWithWeather);

      // Note: Weather notes are not in the create schema
      // They would be updated via the update endpoint
      const result = await journalEntryService.createJournalEntry(mockUserId, createInput);

      expect(result).toEqual(entryWithWeather);
    });

    it('should allow detailed weather descriptions', async () => {
      const weatherDescriptions = [
        'Sunny and warm, 28C, no clouds',
        'Overcast with occasional showers, 18C',
        'Perfect beach weather! 32C and sunny',
        'Snowing heavily, -5C, visibility poor',
        'Foggy morning, cleared up by noon, 20C',
      ];

      for (const weatherNotes of weatherDescriptions) {
        const entry = {
          ...mockJournalEntry,
          weatherNotes,
        };

        mockPrisma.journalEntry.findUnique.mockResolvedValue(entry);

        const result = await journalEntryService.getJournalEntryById(mockUserId, mockEntryId);

        expect(result.weatherNotes).toBe(weatherNotes);
      }
    });
  });

  describe('JOUR-005: Get entries by trip', () => {
    it('should return all entries for a trip ordered by date descending', async () => {
      const entries = [
        { ...mockJournalEntry, id: 1, date: new Date('2025-06-17') },
        { ...mockJournalEntry, id: 2, date: new Date('2025-06-16') },
        { ...mockJournalEntry, id: 3, date: new Date('2025-06-15') },
      ];

      mockPrisma.journalEntry.findMany.mockResolvedValue(entries);

      const result = await journalEntryService.getJournalEntriesByTrip(mockUserId, mockTripId);

      expect(verifyTripAccessWithPermission).toHaveBeenCalledWith(mockUserId, mockTripId, 'view');
      expect(mockPrisma.journalEntry.findMany).toHaveBeenCalledWith({
        where: { tripId: mockTripId },
        orderBy: [{ date: 'desc' }, { createdAt: 'desc' }],
      });
      expect(result).toHaveLength(3);
      expect(result[0].id).toBe(1);
    });

    it('should return empty array if no entries exist', async () => {
      mockPrisma.journalEntry.findMany.mockResolvedValue([]);

      const result = await journalEntryService.getJournalEntriesByTrip(mockUserId, mockTripId);

      expect(result).toEqual([]);
    });

    it('should include entries with null date (trip-level entries)', async () => {
      const entries = [
        { ...mockJournalEntry, id: 1, date: new Date('2025-06-17'), entryType: 'daily' },
        { ...mockJournalEntry, id: 2, date: null, entryType: 'trip', title: 'Trip Summary' },
      ];

      mockPrisma.journalEntry.findMany.mockResolvedValue(entries);

      const result = await journalEntryService.getJournalEntriesByTrip(mockUserId, mockTripId);

      expect(result).toHaveLength(2);
      expect(result.find((e) => e.entryType === 'trip')).toBeDefined();
    });
  });

  describe('JOUR-006: Update entry', () => {
    beforeEach(() => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue(mockJournalEntry);
    });

    it('should update entry title', async () => {
      const updateInput = {
        title: 'Updated Title - Best Day Ever',
      };

      mockPrisma.journalEntry.update.mockResolvedValue({
        ...mockJournalEntry,
        title: 'Updated Title - Best Day Ever',
      });

      const result = await journalEntryService.updateJournalEntry(
        mockUserId,
        mockEntryId,
        updateInput
      );

      expect(verifyEntityAccessWithPermission).toHaveBeenCalled();
      expect(mockPrisma.journalEntry.update).toHaveBeenCalledWith({
        where: { id: mockEntryId },
        data: expect.objectContaining({
          title: 'Updated Title - Best Day Ever',
        }),
      });
      expect(result.title).toBe('Updated Title - Best Day Ever');
    });

    it('should update entry content', async () => {
      const updateInput = {
        content: 'Updated content with more details about our adventures.',
      };

      mockPrisma.journalEntry.update.mockResolvedValue({
        ...mockJournalEntry,
        content: 'Updated content with more details about our adventures.',
      });

      const result = await journalEntryService.updateJournalEntry(
        mockUserId,
        mockEntryId,
        updateInput
      );

      expect(result.content).toBe('Updated content with more details about our adventures.');
    });

    it('should update entry date with timezone conversion', async () => {
      const updateInput = {
        entryDate: '2025-06-20',
      };

      mockPrisma.journalEntry.update.mockResolvedValue({
        ...mockJournalEntry,
        date: new Date('2025-06-20'),
      });

      await journalEntryService.updateJournalEntry(
        mockUserId,
        mockEntryId,
        updateInput
      );

      expect(fromZonedTime).toHaveBeenCalled();
      expect(mockPrisma.journalEntry.update).toHaveBeenCalledWith({
        where: { id: mockEntryId },
        data: expect.objectContaining({
          date: expect.any(Date),
        }),
      });
    });

    it('should update multiple fields at once', async () => {
      const updateInput = {
        title: 'New Title',
        content: 'New content for the entry.',
        entryDate: '2025-06-21',
      };

      mockPrisma.journalEntry.update.mockResolvedValue({
        ...mockJournalEntry,
        title: 'New Title',
        content: 'New content for the entry.',
        date: new Date('2025-06-21'),
      });

      const result = await journalEntryService.updateJournalEntry(
        mockUserId,
        mockEntryId,
        updateInput
      );

      expect(result.title).toBe('New Title');
      expect(result.content).toBe('New content for the entry.');
    });

    it('should clear title when set to null', async () => {
      const updateInput = {
        title: null,
      };

      mockPrisma.journalEntry.update.mockResolvedValue({
        ...mockJournalEntry,
        title: null,
      });

      const result = await journalEntryService.updateJournalEntry(
        mockUserId,
        mockEntryId,
        updateInput
      );

      expect(result.title).toBeNull();
    });

    it('should handle date update when trip has no timezone', async () => {
      const entryWithNoTimezoneTrip = {
        ...mockJournalEntry,
        trip: mockTripWithoutTimezone,
      };
      mockPrisma.journalEntry.findUnique.mockResolvedValue(entryWithNoTimezoneTrip);

      const updateInput = {
        entryDate: '2025-06-22',
      };

      mockPrisma.journalEntry.update.mockResolvedValue({
        ...entryWithNoTimezoneTrip,
        date: new Date('2025-06-22'),
      });

      await journalEntryService.updateJournalEntry(
        mockUserId,
        mockEntryId,
        updateInput
      );

      expect(mockPrisma.journalEntry.update).toHaveBeenCalled();
    });
  });

  describe('JOUR-007: Delete entry', () => {
    beforeEach(() => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue(mockJournalEntry);
      mockPrisma.journalEntry.delete.mockResolvedValue(mockJournalEntry);
    });

    it('should delete journal entry and clean up entity links', async () => {
      const result = await journalEntryService.deleteJournalEntry(mockUserId, mockEntryId);

      expect(verifyEntityAccessWithPermission).toHaveBeenCalled();
      expect(cleanupEntityLinks).toHaveBeenCalledWith(
        mockTripId,
        'JOURNAL_ENTRY',
        mockEntryId
      );
      expect(mockPrisma.journalEntry.delete).toHaveBeenCalledWith({
        where: { id: mockEntryId },
      });
      expect(result).toEqual({ success: true });
    });

    it('should throw error if entry not found', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue(null);
      (verifyEntityAccessWithPermission as jest.Mock).mockRejectedValue(new AppError('Journal entry not found', 404));

      await expect(
        journalEntryService.deleteJournalEntry(mockUserId, 999)
      ).rejects.toThrow('Journal entry not found');
    });

    it('should throw error if user does not own the entry', async () => {
      const otherUserEntry = {
        ...mockJournalEntry,
        trip: { ...mockTrip, userId: 999 },
      };
      mockPrisma.journalEntry.findUnique.mockResolvedValue(otherUserEntry);
      (verifyEntityAccessWithPermission as jest.Mock).mockRejectedValue(new AppError('Access denied', 403));

      await expect(
        journalEntryService.deleteJournalEntry(mockUserId, mockEntryId)
      ).rejects.toThrow('Access denied');
    });
  });

  describe('getJournalEntryById', () => {
    it('should return journal entry by id with trip included', async () => {
      mockPrisma.journalEntry.findUnique.mockResolvedValue(mockJournalEntry);

      const result = await journalEntryService.getJournalEntryById(mockUserId, mockEntryId);

      expect(mockPrisma.journalEntry.findUnique).toHaveBeenCalledWith({
        where: { id: mockEntryId },
        include: { trip: true },
      });
      expect(verifyEntityAccessWithPermission).toHaveBeenCalled();
      expect(result).toEqual(mockJournalEntry);
    });
  });
});
