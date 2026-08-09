import axios from '../lib/axios';
import type {
  CustomItem,
  CustomItemType,
  CreateCustomItemInput,
  UpdateCustomItemInput,
  CreateCustomItemTypeInput,
  UpdateCustomItemTypeInput,
} from '../types/customItem';

export const customItemService = {
  // --- Items ---------------------------------------------------------------

  async createCustomItem(data: CreateCustomItemInput): Promise<CustomItem> {
    const response = await axios.post<CustomItem>('/custom-items', data);
    return response.data;
  },

  async getCustomItemsByTrip(tripId: number): Promise<CustomItem[]> {
    const response = await axios.get<CustomItem[]>(`/custom-items/trip/${tripId}`);
    return response.data;
  },

  async getCustomItemById(itemId: number): Promise<CustomItem> {
    const response = await axios.get<CustomItem>(`/custom-items/${itemId}`);
    return response.data;
  },

  async updateCustomItem(itemId: number, data: UpdateCustomItemInput): Promise<CustomItem> {
    const response = await axios.put<CustomItem>(`/custom-items/${itemId}`, data);
    return response.data;
  },

  async deleteCustomItem(itemId: number): Promise<void> {
    await axios.delete(`/custom-items/${itemId}`);
  },

  async bulkDeleteCustomItems(
    tripId: number,
    ids: number[]
  ): Promise<{ success: boolean; deletedCount: number }> {
    const response = await axios.delete<{ success: boolean; deletedCount: number }>(
      `/custom-items/trip/${tripId}/bulk`,
      { data: { ids } }
    );
    return response.data;
  },

  async bulkUpdateCustomItems(
    tripId: number,
    ids: number[],
    updates: { typeId?: number | null; notes?: string | null; timezone?: string | null }
  ): Promise<{ success: boolean; updatedCount: number }> {
    const response = await axios.patch<{ success: boolean; updatedCount: number }>(
      `/custom-items/trip/${tripId}/bulk`,
      { ids, updates }
    );
    return response.data;
  },

  // --- Type registry -------------------------------------------------------

  /**
   * Lists the user's types. The first call for a user with none seeds the
   * starter set server-side, so this never returns an empty list for a new user.
   */
  async getTypes(): Promise<CustomItemType[]> {
    const response = await axios.get<CustomItemType[]>('/custom-items/types');
    return response.data;
  },

  async createType(data: CreateCustomItemTypeInput): Promise<CustomItemType> {
    const response = await axios.post<CustomItemType>('/custom-items/types', data);
    return response.data;
  },

  async updateType(typeId: number, data: UpdateCustomItemTypeInput): Promise<CustomItemType> {
    const response = await axios.put<CustomItemType>(`/custom-items/types/${typeId}`, data);
    return response.data;
  },

  async deleteType(typeId: number): Promise<void> {
    await axios.delete(`/custom-items/types/${typeId}`);
  },
};

export default customItemService;
