import { Prisma } from '@prisma/client';
import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CreateChecklist, UpdateChecklist, UpdateChecklistItem, ChecklistWithItems, ChecklistType } from '../types/checklist.types';
import { DEFAULT_AIRPORTS, DEFAULT_COUNTRIES, DEFAULT_CITIES, DEFAULT_US_STATES } from '../data/checklist-defaults';

// Type for checklist item metadata shapes
interface AirportMetadata {
  code: string;
  city: string;
  country: string;
}

interface StateMetadata {
  code: string;
  name: string;
}

// Type for checklist item creation data
interface ChecklistItemCreateData {
  name: string;
  description?: string | null;
  isDefault: boolean;
  sortOrder: number;
  metadata: Record<string, unknown>;
}

// Template configuration for default checklists
interface ChecklistTemplate<T> {
  name: string;
  description: string;
  sortOrder: number;
  data: T[];
  itemMapper: (item: T, index: number) => ChecklistItemCreateData;
}

// Default checklist templates configuration
const DEFAULT_CHECKLIST_TEMPLATES: Record<ChecklistType, ChecklistTemplate<unknown>> = {
  airports: {
    name: 'Airports',
    description: "Track airports you've visited around the world",
    sortOrder: 0,
    data: DEFAULT_AIRPORTS,
    itemMapper: (airport: unknown, index: number) => {
      const a = airport as { name: string; code: string; city: string; country: string };
      return {
        name: `${a.name} (${a.code})`,
        description: `${a.city}, ${a.country}`,
        isDefault: true,
        sortOrder: index,
        metadata: { code: a.code, city: a.city, country: a.country },
      };
    },
  },
  countries: {
    name: 'Countries',
    description: "Track countries you've visited",
    sortOrder: 1,
    data: DEFAULT_COUNTRIES,
    itemMapper: (country: unknown, index: number) => {
      const c = country as string;
      return {
        name: c,
        isDefault: true,
        sortOrder: index,
        metadata: { country: c },
      };
    },
  },
  cities: {
    name: 'Cities',
    description: "Track major cities you've visited",
    sortOrder: 2,
    data: DEFAULT_CITIES,
    itemMapper: (city: unknown, index: number) => {
      const c = city as { name: string; country: string; state?: string };
      return {
        name: c.name,
        description: c.state ? `${c.state}, ${c.country}` : c.country,
        isDefault: true,
        sortOrder: index,
        metadata: { city: c.name, country: c.country, state: c.state },
      };
    },
  },
  us_states: {
    name: 'US States',
    description: "Track US states and territories you've visited",
    sortOrder: 3,
    data: DEFAULT_US_STATES,
    itemMapper: (state: unknown, index: number) => {
      const s = state as { code: string; name: string };
      return {
        name: s.name,
        description: s.code,
        isDefault: true,
        sortOrder: index,
        metadata: { code: s.code, name: s.name },
      };
    },
  },
};

/**
 * Create a single default checklist by type
 */
async function createDefaultChecklistByType(userId: number, type: ChecklistType): Promise<void> {
  const template = DEFAULT_CHECKLIST_TEMPLATES[type];

  await prisma.checklist.create({
    data: {
      userId,
      name: template.name,
      description: template.description,
      type,
      isDefault: true,
      sortOrder: template.sortOrder,
      items: {
        create: template.data.map((item, index) => template.itemMapper(item, index)),
      },
    },
  });
}

// Helper to safely get metadata values from JSON field
function getMetadataValue<T>(metadata: Prisma.JsonValue, key: keyof T): unknown {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return (metadata as Record<string, unknown>)[key as string];
  }
  return undefined;
}

// Interface for checklist stats
interface ChecklistStats {
  total: number;
  checked: number;
  percentage: number;
}

// Helper to add stats to a checklist
function addChecklistStats<T extends { items: Array<{ isChecked: boolean }> }>(
  checklist: T
): T & { stats: ChecklistStats } {
  const total = checklist.items.length;
  const checked = checklist.items.filter(item => item.isChecked).length;
  return {
    ...checklist,
    stats: {
      total,
      checked,
      percentage: total > 0 ? Math.round((checked / total) * 100) : 0,
    },
  };
}

// Type for checklist with items from Prisma query
interface ChecklistFromPrisma {
  id: number;
  userId: number;
  tripId: number | null;
  name: string;
  description: string | null;
  type: string;
  isDefault: boolean;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
  items: Array<{
    id: number;
    checklistId: number;
    name: string;
    description: string | null;
    isChecked: boolean;
    isDefault: boolean;
    sortOrder: number;
    metadata: Prisma.JsonValue;
    checkedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }>;
}

// Type for trips used in auto-populating checklist items from trip data
interface TripForAutoPopulate {
  id: number;
  locations: Array<{
    id: number;
    name: string;
    address: string | null;
  }>;
  transportation: Array<{
    id: number;
    type: string;
    startLocationText: string | null;
    endLocationText: string | null;
  }>;
}

class ChecklistService {
  /**
   * Get all checklists for a user
   */
  async getChecklistsByUserId(userId: number): Promise<ChecklistWithItems[]> {
    const checklists = await prisma.checklist.findMany({
      where: { userId },
      include: {
        items: {
          orderBy: [
            { isChecked: 'asc' }, // Unchecked first
            { sortOrder: 'asc' },
            { name: 'asc' },
          ],
        },
      },
      orderBy: [
        { isDefault: 'desc' }, // Default lists first
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    }) as ChecklistFromPrisma[];

    // Add stats to each checklist
    return checklists.map(addChecklistStats);
  }

  /**
   * Get all checklists for a specific trip
   */
  async getChecklistsByTripId(tripId: number, userId: number): Promise<ChecklistWithItems[]> {
    const checklists = await prisma.checklist.findMany({
      where: {
        userId,
        tripId
      },
      include: {
        items: {
          orderBy: [
            { isChecked: 'asc' }, // Unchecked first
            { sortOrder: 'asc' },
            { name: 'asc' },
          ],
        },
      },
      orderBy: [
        { sortOrder: 'asc' },
        { name: 'asc' },
      ],
    }) as ChecklistFromPrisma[];

    // Add stats to each checklist
    return checklists.map(addChecklistStats);
  }

  /**
   * Get a single checklist by ID
   */
  async getChecklistById(checklistId: number, userId: number): Promise<ChecklistWithItems> {
    const checklist = await prisma.checklist.findFirst({
      where: { id: checklistId, userId },
      include: {
        items: {
          orderBy: [
            { isChecked: 'asc' },
            { sortOrder: 'asc' },
            { name: 'asc' },
          ],
        },
      },
    }) as ChecklistFromPrisma | null;

    if (!checklist) {
      throw new AppError('Checklist not found', 404);
    }

    return addChecklistStats(checklist);
  }

  /**
   * Create a new checklist
   */
  async createChecklist(userId: number, data: CreateChecklist): Promise<ChecklistWithItems> {
    const { items, tripId, ...checklistData } = data;

    const createData = {
      name: checklistData.name,
      description: checklistData.description,
      type: checklistData.type,
      isDefault: checklistData.isDefault,
      sortOrder: checklistData.sortOrder,
      user: {
        connect: { id: userId },
      },
      ...(tripId !== null && tripId !== undefined ? { tripId } : {}),
      items: items
        ? {
            create: items.map((item, index) => ({
              name: item.name,
              description: item.description ?? null,
              isDefault: item.isDefault ?? false,
              sortOrder: item.sortOrder ?? index,
              metadata: item.metadata ?? null,
            })),
          }
        : undefined,
    };

    const checklist = await prisma.checklist.create({
      data: createData,
      include: {
        items: {
          orderBy: [
            { isChecked: 'asc' },
            { sortOrder: 'asc' },
            { name: 'asc' },
          ],
        },
      },
    });

    return this.getChecklistById(checklist.id, userId);
  }

  /**
   * Update a checklist
   */
  async updateChecklist(checklistId: number, userId: number, data: UpdateChecklist): Promise<ChecklistWithItems> {
    // Verify ownership
    const existing = await prisma.checklist.findFirst({
      where: { id: checklistId, userId },
    });

    if (!existing) {
      throw new AppError('Checklist not found', 404);
    }

    await prisma.checklist.update({
      where: { id: checklistId },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        type: data.type ?? undefined,
        tripId: data.tripId ?? undefined,
        sortOrder: data.sortOrder ?? undefined,
        updatedAt: new Date(),
      },
    });

    return this.getChecklistById(checklistId, userId);
  }

  /**
   * Delete a checklist
   */
  async deleteChecklist(checklistId: number, userId: number): Promise<void> {
    const existing = await prisma.checklist.findFirst({
      where: { id: checklistId, userId },
    });

    if (!existing) {
      throw new AppError('Checklist not found', 404);
    }

    await prisma.checklist.delete({
      where: { id: checklistId },
    });
  }

  /**
   * Add an item to a checklist
   */
  async addChecklistItem(
    checklistId: number,
    userId: number,
    itemData: { name: string; description?: string | null; metadata?: Record<string, unknown> }
  ) {
    // Verify checklist ownership
    const checklist = await prisma.checklist.findFirst({
      where: { id: checklistId, userId },
    });

    if (!checklist) {
      throw new AppError('Checklist not found', 404);
    }

    // Get max sort order
    const maxItem = await prisma.checklistItem.findFirst({
      where: { checklistId },
      orderBy: { sortOrder: 'desc' },
    });

    const item = await prisma.checklistItem.create({
      data: {
        checklistId,
        name: itemData.name,
        description: itemData.description,
        metadata: itemData.metadata,
        sortOrder: (maxItem?.sortOrder ?? -1) + 1,
      },
    });

    return item;
  }

  /**
   * Update a checklist item
   */
  async updateChecklistItem(
    itemId: number,
    userId: number,
    data: UpdateChecklistItem
  ) {
    // Verify item exists and user owns the parent checklist
    const item = await prisma.checklistItem.findFirst({
      where: {
        id: itemId,
        checklist: { userId },
      },
    });

    if (!item) {
      throw new AppError('Checklist item not found', 404);
    }

    const updatedItem = await prisma.checklistItem.update({
      where: { id: itemId },
      data: {
        name: data.name ?? undefined,
        description: data.description ?? undefined,
        sortOrder: data.sortOrder ?? undefined,
        isChecked: data.isChecked ?? undefined,
        metadata: data.metadata ?? undefined,
        checkedAt: data.isChecked !== undefined
          ? data.isChecked
            ? new Date()
            : null
          : undefined,
        updatedAt: new Date(),
      },
    });

    return updatedItem;
  }

  /**
   * Delete a checklist item
   */
  async deleteChecklistItem(itemId: number, userId: number): Promise<void> {
    const item = await prisma.checklistItem.findFirst({
      where: {
        id: itemId,
        checklist: { userId },
      },
    });

    if (!item) {
      throw new AppError('Checklist item not found', 404);
    }

    await prisma.checklistItem.delete({
      where: { id: itemId },
    });
  }

  /**
   * Initialize default checklists for a user
   */
  async initializeDefaultChecklists(userId: number): Promise<void> {
    // Check if user already has default checklists
    const existingDefaults = await prisma.checklist.count({
      where: { userId, isDefault: true },
    });

    if (existingDefaults > 0) {
      return; // Already initialized
    }

    // Create all default checklists using templates
    const checklistTypes: ChecklistType[] = ['airports', 'countries', 'cities', 'us_states'];
    for (const type of checklistTypes) {
      await createDefaultChecklistByType(userId, type);
    }
  }

  /**
   * Auto-check items based on trip data
   */
  async autoCheckFromTrips(userId: number): Promise<{ updated: number }> {
    let updated = 0;

    // Get user's checklists
    const checklists = await prisma.checklist.findMany({
      where: { userId },
      include: { items: true },
    }) as ChecklistFromPrisma[];

    // Get user's trips with locations and transportation
    const trips = await prisma.trip.findMany({
      where: {
        userId,
        status: { in: ['Completed', 'In Progress'] }, // Only check off completed/in-progress trips
      },
      include: {
        locations: true,
        transportation: {
          where: { type: 'Flight' },
        },
      },
    }) as TripForAutoPopulate[];

    // Process Airports checklist
    const airportsChecklist = checklists.find((c) => c.type === 'airports');
    if (airportsChecklist) {
      const visitedAirportCodes = new Set<string>();

      trips.forEach((trip) => {
        trip.transportation.forEach((t) => {
          // Extract airport codes from location text (e.g., "LAX - Los Angeles" -> "LAX")
          if (t.startLocationText) {
            const match = t.startLocationText.match(/\(([A-Z]{3})\)/);
            if (match) visitedAirportCodes.add(match[1]);
          }
          if (t.endLocationText) {
            const match = t.endLocationText.match(/\(([A-Z]{3})\)/);
            if (match) visitedAirportCodes.add(match[1]);
          }
        });
      });

      // Check off visited airports
      for (const item of airportsChecklist.items) {
        if (!item.isChecked && item.metadata && typeof item.metadata === 'object' && 'code' in item.metadata) {
          const code = getMetadataValue<AirportMetadata>(item.metadata, 'code') as string;
          if (code && visitedAirportCodes.has(code)) {
            await prisma.checklistItem.update({
              where: { id: item.id },
              data: { isChecked: true, checkedAt: new Date() },
            });
            updated++;
          }
        }
      }
    }

    // Process Countries checklist
    const countriesChecklist = checklists.find((c) => c.type === 'countries');
    if (countriesChecklist) {
      const visitedCountries = new Set<string>();

      trips.forEach((trip) => {
        trip.locations.forEach((location) => {
          // Extract country from address (simple heuristic - last part after comma)
          if (location.address) {
            const parts = location.address.split(',').map((p) => p.trim());
            if (parts.length > 0) {
              const country = parts[parts.length - 1];
              visitedCountries.add(country);
            }
          }
        });
      });

      // Check off visited countries
      for (const item of countriesChecklist.items) {
        if (!item.isChecked) {
          const countryName = item.name;
          // Check if any visited country matches (case-insensitive, partial match)
          const isVisited = Array.from(visitedCountries).some(vc =>
            vc.toLowerCase().includes(countryName.toLowerCase()) ||
            countryName.toLowerCase().includes(vc.toLowerCase())
          );

          if (isVisited) {
            await prisma.checklistItem.update({
              where: { id: item.id },
              data: { isChecked: true, checkedAt: new Date() },
            });
            updated++;
          }
        }
      }
    }

    // Process Cities checklist
    const citiesChecklist = checklists.find((c) => c.type === 'cities');
    if (citiesChecklist) {
      const visitedCities = new Set<string>();

      trips.forEach((trip) => {
        trip.locations.forEach((location) => {
          // Extract city from address or location name
          if (location.address) {
            const parts = location.address.split(',').map((p) => p.trim());
            if (parts.length >= 2) {
              const city = parts[0]; // First part is usually the city
              visitedCities.add(city);
            }
          }
          // Also check location name
          visitedCities.add(location.name);
        });
      });

      // Check off visited cities
      for (const item of citiesChecklist.items) {
        if (!item.isChecked) {
          const cityName = item.name;
          // Check if any visited city matches (case-insensitive, partial match)
          const isVisited = Array.from(visitedCities).some(vc =>
            vc.toLowerCase().includes(cityName.toLowerCase()) ||
            cityName.toLowerCase().includes(vc.toLowerCase())
          );

          if (isVisited) {
            await prisma.checklistItem.update({
              where: { id: item.id },
              data: { isChecked: true, checkedAt: new Date() },
            });
            updated++;
          }
        }
      }
    }

    // Process US States checklist
    const usStatesChecklist = checklists.find((c) => c.type === 'us_states');
    if (usStatesChecklist) {
      const visitedStates = new Set<string>();

      trips.forEach((trip) => {
        trip.locations.forEach((location) => {
          // Extract state from address
          if (location.address) {
            const parts = location.address.split(',').map((p) => p.trim());
            // Look for state codes or names in address parts
            parts.forEach((part) => {
              // Check if it matches a state code (2 letters)
              if (/^[A-Z]{2}$/.test(part)) {
                visitedStates.add(part);
              }
              // Check if it matches a state name
              visitedStates.add(part);
            });
          }
        });
      });

      // Check off visited states
      for (const item of usStatesChecklist.items) {
        if (!item.isChecked && item.metadata && typeof item.metadata === 'object' && 'code' in item.metadata) {
          const code = getMetadataValue<StateMetadata>(item.metadata, 'code') as string | undefined;
          const name = getMetadataValue<StateMetadata>(item.metadata, 'name') as string | undefined;

          if (code && name) {
            // Check if state code or name is in visited states
            const isVisited = Array.from(visitedStates).some(vs =>
              vs === code ||
              vs.toLowerCase() === name.toLowerCase() ||
              vs.toLowerCase().includes(name.toLowerCase()) ||
              name.toLowerCase().includes(vs.toLowerCase())
            );

            if (isVisited) {
              await prisma.checklistItem.update({
                where: { id: item.id },
                data: { isChecked: true, checkedAt: new Date() },
              });
              updated++;
            }
          }
        }
      }
    }

    return { updated };
  }

  /**
   * Remove all default checklists for a user
   */
  async removeDefaultChecklists(userId: number): Promise<{ removed: number }> {
    const result = await prisma.checklist.deleteMany({
      where: {
        userId,
        isDefault: true,
      },
    });

    return { removed: result.count };
  }

  /**
   * Add specific default checklists
   */
  async addDefaultChecklists(userId: number, types: ChecklistType[]): Promise<{ added: number }> {
    let added = 0;

    // Check which types already exist
    const existing = await prisma.checklist.findMany({
      where: {
        userId,
        isDefault: true,
        type: { in: types },
      },
      select: { type: true },
    }) as Array<{ type: string }>;

    const existingTypes = new Set(existing.map((c) => c.type));

    for (const type of types) {
      if (existingTypes.has(type)) {
        continue; // Skip if already exists
      }

      await createDefaultChecklistByType(userId, type);
      added++;
    }

    return { added };
  }

  /**
   * Remove specific default checklists
   */
  async removeDefaultChecklistsByType(userId: number, types: ChecklistType[]): Promise<{ removed: number }> {
    const result = await prisma.checklist.deleteMany({
      where: {
        userId,
        isDefault: true,
        type: { in: types },
      },
    });

    return { removed: result.count };
  }

  /**
   * Get available default checklist types and their status
   */
  async getDefaultChecklistsStatus(userId: number): Promise<Array<{ type: ChecklistType; name: string; description: string; itemCount: number; exists: boolean }>> {
    const existing = await prisma.checklist.findMany({
      where: {
        userId,
        isDefault: true,
      },
      select: { type: true },
    }) as Array<{ type: string }>;

    const existingTypes = new Set(existing.map((c) => c.type));
    const checklistTypes: ChecklistType[] = ['airports', 'countries', 'cities', 'us_states'];

    return checklistTypes.map((type) => {
      const template = DEFAULT_CHECKLIST_TEMPLATES[type];
      return {
        type,
        name: template.name,
        description: `${template.description} (${template.data.length} items)`,
        itemCount: template.data.length,
        exists: existingTypes.has(type),
      };
    });
  }

  /**
   * Restore default checklists for a user
   * This will recreate any missing default checklists
   */
  async restoreDefaultChecklists(userId: number): Promise<{ restored: number }> {
    let restored = 0;

    // Check which default checklists are missing
    const existing = await prisma.checklist.findMany({
      where: {
        userId,
        isDefault: true,
      },
      select: { type: true },
    }) as Array<{ type: string }>;

    const existingTypes = new Set(existing.map((c) => c.type));

    // Restore any missing default checklists using templates
    const checklistTypes: ChecklistType[] = ['airports', 'countries', 'cities', 'us_states'];
    for (const type of checklistTypes) {
      if (!existingTypes.has(type)) {
        await createDefaultChecklistByType(userId, type);
        restored++;
      }
    }

    return { restored };
  }
}

export default new ChecklistService();
