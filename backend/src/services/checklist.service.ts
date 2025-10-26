import prisma from '../config/database';
import { AppError } from '../middleware/errorHandler';
import { CreateChecklist, UpdateChecklist, UpdateChecklistItem, ChecklistWithItems } from '../types/checklist.types';
import { DEFAULT_AIRPORTS, DEFAULT_COUNTRIES, DEFAULT_CITIES } from '../data/checklist-defaults';

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
    });

    // Add stats to each checklist
    return checklists.map(checklist => {
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
    });

    if (!checklist) {
      throw new AppError('Checklist not found', 404);
    }

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

  /**
   * Create a new checklist
   */
  async createChecklist(userId: number, data: CreateChecklist): Promise<ChecklistWithItems> {
    const { items, ...checklistData } = data;

    const checklist = await prisma.checklist.create({
      data: {
        name: checklistData.name,
        description: checklistData.description,
        type: checklistData.type,
        isDefault: checklistData.isDefault,
        sortOrder: checklistData.sortOrder,
        user: {
          connect: { id: userId },
        },
        items: items
          ? {
              create: items.map((item, index) => ({
                name: item.name,
                description: item.description,
                isDefault: item.isDefault ?? false,
                sortOrder: item.sortOrder ?? index,
                metadata: item.metadata,
              })),
            }
          : undefined,
      },
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
        ...data,
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
    itemData: { name: string; description?: string | null; metadata?: any }
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
        ...data,
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
    });

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
    });

    // Process Airports checklist
    const airportsChecklist = checklists.find(c => c.type === 'airports');
    if (airportsChecklist) {
      const visitedAirportCodes = new Set<string>();

      trips.forEach(trip => {
        trip.transportation.forEach(t => {
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
          const code = (item.metadata as any).code;
          if (visitedAirportCodes.has(code)) {
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
    const countriesChecklist = checklists.find(c => c.type === 'countries');
    if (countriesChecklist) {
      const visitedCountries = new Set<string>();

      trips.forEach(trip => {
        trip.locations.forEach(location => {
          // Extract country from address (simple heuristic - last part after comma)
          if (location.address) {
            const parts = location.address.split(',').map(p => p.trim());
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
    const citiesChecklist = checklists.find(c => c.type === 'cities');
    if (citiesChecklist) {
      const visitedCities = new Set<string>();

      trips.forEach(trip => {
        trip.locations.forEach(location => {
          // Extract city from address or location name
          if (location.address) {
            const parts = location.address.split(',').map(p => p.trim());
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

    return { updated };
  }
}

export default new ChecklistService();
