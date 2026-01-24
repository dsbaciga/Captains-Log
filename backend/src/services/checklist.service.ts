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

// Helper to safely get metadata values from JSON field
function getMetadataValue<T>(metadata: Prisma.JsonValue, key: keyof T): unknown {
  if (metadata && typeof metadata === 'object' && !Array.isArray(metadata)) {
    return (metadata as Record<string, unknown>)[key as string];
  }
  return undefined;
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
    return checklists.map((checklist: ChecklistFromPrisma) => {
      const total = checklist.items.length;
      const checked = checklist.items.filter((item) => item.isChecked).length;
      return {
        ...checklist,
        stats: {
          total,
          checked,
          percentage: total > 0 ? Math.round((checked / total) * 100) : 0,
        },
      };
    });
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
    return checklists.map((checklist: ChecklistFromPrisma) => {
      const total = checklist.items.length;
      const checked = checklist.items.filter((item) => item.isChecked).length;
      return {
        ...checklist,
        stats: {
          total,
          checked,
          percentage: total > 0 ? Math.round((checked / total) * 100) : 0,
        },
      };
    });
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

    const total = checklist.items.length;
    const checked = checklist.items.filter((item) => item.isChecked).length;

    return {
      ...checklist,
      stats: {
        total,
        checked,
        percentage: total > 0 ? Math.round((checked / total) * 100) : 0,
      },
    };
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

    // Create Airports checklist
    await prisma.checklist.create({
      data: {
        userId,
        name: 'Airports',
        description: 'Track airports you\'ve visited around the world',
        type: 'airports',
        isDefault: true,
        sortOrder: 0,
        items: {
          create: DEFAULT_AIRPORTS.map((airport, index) => ({
            name: `${airport.name} (${airport.code})`,
            description: `${airport.city}, ${airport.country}`,
            isDefault: true,
            sortOrder: index,
            metadata: {
              code: airport.code,
              city: airport.city,
              country: airport.country,
            },
          })),
        },
      },
    });

    // Create Countries checklist
    await prisma.checklist.create({
      data: {
        userId,
        name: 'Countries',
        description: 'Track countries you\'ve visited',
        type: 'countries',
        isDefault: true,
        sortOrder: 1,
        items: {
          create: DEFAULT_COUNTRIES.map((country, index) => ({
            name: country,
            isDefault: true,
            sortOrder: index,
            metadata: {
              country,
            },
          })),
        },
      },
    });

    // Create Cities checklist
    await prisma.checklist.create({
      data: {
        userId,
        name: 'Cities',
        description: 'Track major cities you\'ve visited',
        type: 'cities',
        isDefault: true,
        sortOrder: 2,
        items: {
          create: DEFAULT_CITIES.map((city, index) => ({
            name: city.name,
            description: city.state
              ? `${city.state}, ${city.country}`
              : city.country,
            isDefault: true,
            sortOrder: index,
            metadata: {
              city: city.name,
              country: city.country,
              state: city.state,
            },
          })),
        },
      },
    });

    // Create US States checklist
    await prisma.checklist.create({
      data: {
        userId,
        name: 'US States',
        description: 'Track US states and territories you\'ve visited',
        type: 'us_states',
        isDefault: true,
        sortOrder: 3,
        items: {
          create: DEFAULT_US_STATES.map((state, index) => ({
            name: state.name,
            description: state.code,
            isDefault: true,
            sortOrder: index,
            metadata: {
              code: state.code,
              name: state.name,
            },
          })),
        },
      },
    });
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

      switch (type) {
        case 'airports':
          await prisma.checklist.create({
            data: {
              userId,
              name: 'Airports',
              description: 'Track airports you\'ve visited around the world',
              type: 'airports',
              isDefault: true,
              sortOrder: 0,
              items: {
                create: DEFAULT_AIRPORTS.map((airport, index) => ({
                  name: `${airport.name} (${airport.code})`,
                  description: `${airport.city}, ${airport.country}`,
                  isDefault: true,
                  sortOrder: index,
                  metadata: {
                    code: airport.code,
                    city: airport.city,
                    country: airport.country,
                  },
                })),
              },
            },
          });
          added++;
          break;

        case 'countries':
          await prisma.checklist.create({
            data: {
              userId,
              name: 'Countries',
              description: 'Track countries you\'ve visited',
              type: 'countries',
              isDefault: true,
              sortOrder: 1,
              items: {
                create: DEFAULT_COUNTRIES.map((country, index) => ({
                  name: country,
                  isDefault: true,
                  sortOrder: index,
                  metadata: {
                    country,
                  },
                })),
              },
            },
          });
          added++;
          break;

        case 'cities':
          await prisma.checklist.create({
            data: {
              userId,
              name: 'Cities',
              description: 'Track major cities you\'ve visited',
              type: 'cities',
              isDefault: true,
              sortOrder: 2,
              items: {
                create: DEFAULT_CITIES.map((city, index) => ({
                  name: city.name,
                  description: city.state
                    ? `${city.state}, ${city.country}`
                    : city.country,
                  isDefault: true,
                  sortOrder: index,
                  metadata: {
                    city: city.name,
                    country: city.country,
                    state: city.state,
                  },
                })),
              },
            },
          });
          added++;
          break;

        case 'us_states':
          await prisma.checklist.create({
            data: {
              userId,
              name: 'US States',
              description: 'Track US states and territories you\'ve visited',
              type: 'us_states',
              isDefault: true,
              sortOrder: 3,
              items: {
                create: DEFAULT_US_STATES.map((state, index) => ({
                  name: state.name,
                  description: state.code,
                  isDefault: true,
                  sortOrder: index,
                  metadata: {
                    code: state.code,
                    name: state.name,
                  },
                })),
              },
            },
          });
          added++;
          break;
      }
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
  async getDefaultChecklistsStatus(userId: number): Promise<Array<{ type: ChecklistType; name: string; description: string; exists: boolean }>> {
    const existing = await prisma.checklist.findMany({
      where: {
        userId,
        isDefault: true,
      },
      select: { type: true },
    }) as Array<{ type: string }>;

    const existingTypes = new Set(existing.map((c) => c.type));

    return [
      {
        type: 'airports' as ChecklistType,
        name: 'Airports',
        description: 'Track airports you\'ve visited around the world (100 major airports)',
        exists: existingTypes.has('airports'),
      },
      {
        type: 'countries' as ChecklistType,
        name: 'Countries',
        description: 'Track countries you\'ve visited (195 countries)',
        exists: existingTypes.has('countries'),
      },
      {
        type: 'cities' as ChecklistType,
        name: 'Cities',
        description: 'Track major cities you\'ve visited (country capitals + US state capitals)',
        exists: existingTypes.has('cities'),
      },
      {
        type: 'us_states' as ChecklistType,
        name: 'US States',
        description: 'Track US states and territories you\'ve visited (50 states + territories)',
        exists: existingTypes.has('us_states'),
      },
    ];
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

    // Restore missing Airports checklist
    if (!existingTypes.has('airports')) {
      await prisma.checklist.create({
        data: {
          userId,
          name: 'Airports',
          description: 'Track airports you\'ve visited around the world',
          type: 'airports',
          isDefault: true,
          sortOrder: 0,
          items: {
            create: DEFAULT_AIRPORTS.map((airport, index) => ({
              name: `${airport.name} (${airport.code})`,
              description: `${airport.city}, ${airport.country}`,
              isDefault: true,
              sortOrder: index,
              metadata: {
                code: airport.code,
                city: airport.city,
                country: airport.country,
              },
            })),
          },
        },
      });
      restored++;
    }

    // Restore missing Countries checklist
    if (!existingTypes.has('countries')) {
      await prisma.checklist.create({
        data: {
          userId,
          name: 'Countries',
          description: 'Track countries you\'ve visited',
          type: 'countries',
          isDefault: true,
          sortOrder: 1,
          items: {
            create: DEFAULT_COUNTRIES.map((country, index) => ({
              name: country,
              isDefault: true,
              sortOrder: index,
              metadata: {
                country,
              },
            })),
          },
        },
      });
      restored++;
    }

    // Restore missing Cities checklist
    if (!existingTypes.has('cities')) {
      await prisma.checklist.create({
        data: {
          userId,
          name: 'Cities',
          description: 'Track major cities you\'ve visited',
          type: 'cities',
          isDefault: true,
          sortOrder: 2,
          items: {
            create: DEFAULT_CITIES.map((city, index) => ({
              name: city.name,
              description: city.state
                ? `${city.state}, ${city.country}`
                : city.country,
              isDefault: true,
              sortOrder: index,
              metadata: {
                city: city.name,
                country: city.country,
                state: city.state,
              },
            })),
          },
        },
      });
      restored++;
    }

    // Restore missing US States checklist
    if (!existingTypes.has('us_states')) {
      await prisma.checklist.create({
        data: {
          userId,
          name: 'US States',
          description: 'Track US states and territories you\'ve visited',
          type: 'us_states',
          isDefault: true,
          sortOrder: 3,
          items: {
            create: DEFAULT_US_STATES.map((state, index) => ({
              name: state.name,
              description: state.code,
              isDefault: true,
              sortOrder: index,
              metadata: {
                code: state.code,
                name: state.name,
              },
            })),
          },
        },
      });
      restored++;
    }

    return { restored };
  }
}

export default new ChecklistService();
