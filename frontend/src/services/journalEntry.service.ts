import api from '../lib/axios';
import type {
  JournalEntry,
  CreateJournalEntryInput,
  UpdateJournalEntryInput,
} from '../types/journalEntry';

class JournalEntryService {
  async createJournalEntry(data: CreateJournalEntryInput): Promise<JournalEntry> {
    const response = await api.post('/journal', data);
    return response.data.data;
  }

  async getJournalEntriesByTrip(tripId: number): Promise<JournalEntry[]> {
    const response = await api.get(`/journal/trip/${tripId}`);
    return response.data.data;
  }

  async getJournalEntryById(id: number): Promise<JournalEntry> {
    const response = await api.get(`/journal/${id}`);
    return response.data.data;
  }

  async updateJournalEntry(
    id: number,
    data: UpdateJournalEntryInput
  ): Promise<JournalEntry> {
    const response = await api.put(`/journal/${id}`, data);
    return response.data.data;
  }

  async deleteJournalEntry(id: number): Promise<void> {
    await api.delete(`/journal/${id}`);
  }
}

export default new JournalEntryService();
