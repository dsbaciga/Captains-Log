import { useState, useEffect, useMemo } from 'react';
import type { EntityType } from '../types/entityLink';
import type { Location } from '../types/location';
import type { Activity } from '../types/activity';
import type { Lodging } from '../types/lodging';
import type { Transportation } from '../types/transportation';
import type { Photo } from '../types/photo';
import type { JournalEntry } from '../types/journal';
import locationService from '../services/location.service';
import activityService from '../services/activity.service';
import lodgingService from '../services/lodging.service';
import transportationService from '../services/transportation.service';
import photoService from '../services/photo.service';
import journalEntryService from '../services/journalEntry.service';
import toast from 'react-hot-toast';

export type EntityItem = {
  id: number;
  name: string;
  subtitle?: string;
};

/**
 * Hook for fetching entities of a specific type for a trip
 * Centralizes the entity fetching logic used by picker modals
 */
export function useEntityFetcher(tripId: number, entityType: EntityType | null) {
  const [entities, setEntities] = useState<EntityItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!entityType) {
      setEntities([]);
      return;
    }

    const fetchEntities = async () => {
      setLoading(true);
      setError(null);
      try {
        let items: EntityItem[] = [];

        switch (entityType) {
          case 'PHOTO': {
            const result = await photoService.getPhotosByTrip(tripId);
            const photos = result.photos;
            items = photos.map((photo: Photo) => ({
              id: photo.id,
              name: photo.caption || photo.originalName || `Photo ${photo.id}`,
              subtitle: photo.dateTaken || undefined,
            }));
            break;
          }

          case 'LOCATION': {
            const locations = await locationService.getLocationsByTrip(tripId);
            items = locations.map((loc: Location) => ({
              id: loc.id,
              name: loc.name,
              subtitle: loc.address || undefined,
            }));
            break;
          }

          case 'ACTIVITY': {
            const activities = await activityService.getActivitiesByTrip(tripId);
            items = activities.map((act: Activity) => ({
              id: act.id,
              name: act.name,
              subtitle: act.category || undefined,
            }));
            break;
          }

          case 'LODGING': {
            const lodgings = await lodgingService.getLodgingByTrip(tripId);
            items = lodgings.map((lod: Lodging) => ({
              id: lod.id,
              name: lod.name,
              subtitle: lod.type,
            }));
            break;
          }

          case 'TRANSPORTATION': {
            const transports = await transportationService.getTransportationByTrip(tripId);
            items = transports.map((trans: Transportation) => ({
              id: trans.id,
              name: `${trans.type}${trans.company ? ` - ${trans.company}` : ''}`,
              subtitle: trans.startLocationText || trans.startLocation?.name || undefined,
            }));
            break;
          }

          case 'JOURNAL_ENTRY': {
            const entries = await journalEntryService.getJournalEntriesByTrip(tripId);
            items = entries.map((entry: JournalEntry) => ({
              id: entry.id,
              name: entry.title || `${entry.entryType} Entry`,
              subtitle: entry.date || undefined,
            }));
            break;
          }
        }

        setEntities(items);
      } catch (err) {
        console.error('Failed to fetch entities:', err);
        setError(err instanceof Error ? err : new Error('Failed to load items'));
        toast.error('Failed to load items');
      } finally {
        setLoading(false);
      }
    };

    fetchEntities();
  }, [entityType, tripId]);

  return { entities, loading, error };
}

/**
 * Hook for filtering entities by search query
 */
export function useEntityFilter(entities: EntityItem[], searchQuery: string) {
  return useMemo(() => {
    if (!searchQuery.trim()) return entities;
    const query = searchQuery.toLowerCase();
    return entities.filter(
      (entity) =>
        entity.name.toLowerCase().includes(query) ||
        entity.subtitle?.toLowerCase().includes(query)
    );
  }, [entities, searchQuery]);
}

export default useEntityFetcher;
