import axios from '../lib/axios';
import type {
  Checklist,
  CreateChecklistDTO,
  UpdateChecklistDTO,
  AddChecklistItemDTO,
  UpdateChecklistItemDTO,
  ChecklistItem,
  DefaultChecklistStatus,
  SelectiveChecklistOperationDTO,
  ChecklistType,
} from '../types/checklist';

class ChecklistService {
  private baseUrl = '/checklists';

  /**
   * Get all checklists for the current user
   */
  async getChecklists(): Promise<Checklist[]> {
    const response = await axios.get(this.baseUrl);
    return response.data.data;
  }

  /**
   * Get a single checklist by ID
   */
  async getChecklistById(id: number): Promise<Checklist> {
    const response = await axios.get(`${this.baseUrl}/${id}`);
    return response.data.data;
  }

  /**
   * Create a new checklist
   */
  async createChecklist(data: CreateChecklistDTO): Promise<Checklist> {
    const response = await axios.post(this.baseUrl, data);
    return response.data.data;
  }

  /**
   * Update a checklist
   */
  async updateChecklist(id: number, data: UpdateChecklistDTO): Promise<Checklist> {
    const response = await axios.put(`${this.baseUrl}/${id}`, data);
    return response.data.data;
  }

  /**
   * Delete a checklist
   */
  async deleteChecklist(id: number): Promise<void> {
    await axios.delete(`${this.baseUrl}/${id}`);
  }

  /**
   * Add an item to a checklist
   */
  async addChecklistItem(checklistId: number, data: AddChecklistItemDTO): Promise<ChecklistItem> {
    const response = await axios.post(`${this.baseUrl}/${checklistId}/items`, data);
    return response.data.data;
  }

  /**
   * Update a checklist item
   */
  async updateChecklistItem(itemId: number, data: UpdateChecklistItemDTO): Promise<ChecklistItem> {
    const response = await axios.put(`${this.baseUrl}/items/${itemId}`, data);
    return response.data.data;
  }

  /**
   * Delete a checklist item
   */
  async deleteChecklistItem(itemId: number): Promise<void> {
    await axios.delete(`${this.baseUrl}/items/${itemId}`);
  }

  /**
   * Initialize default checklists (airports, countries, cities)
   */
  async initializeDefaults(): Promise<void> {
    await axios.post(`${this.baseUrl}/initialize`);
  }

  /**
   * Auto-check items based on trip data
   */
  async autoCheckFromTrips(): Promise<{ updated: number }> {
    const response = await axios.post(`${this.baseUrl}/auto-check`);
    return response.data.data;
  }

  /**
   * Remove all default checklists
   */
  async removeDefaults(): Promise<{ removed: number }> {
    const response = await axios.delete(`${this.baseUrl}/defaults`);
    return response.data.data;
  }

  /**
   * Restore missing default checklists
   */
  async restoreDefaults(): Promise<{ restored: number }> {
    const response = await axios.post(`${this.baseUrl}/defaults/restore`);
    return response.data.data;
  }

  /**
   * Get status of default checklists (which exist, which are available)
   */
  async getDefaultsStatus(): Promise<DefaultChecklistStatus[]> {
    const response = await axios.get(`${this.baseUrl}/defaults/status`);
    return response.data.data;
  }

  /**
   * Add specific default checklists
   */
  async addDefaults(types: ChecklistType[]): Promise<{ added: number }> {
    const response = await axios.post(`${this.baseUrl}/defaults/add`, { types });
    return response.data.data;
  }

  /**
   * Remove specific default checklists by type
   */
  async removeDefaultsByType(types: ChecklistType[]): Promise<{ removed: number }> {
    const response = await axios.post(`${this.baseUrl}/defaults/remove`, { types });
    return response.data.data;
  }
}

export default new ChecklistService();
