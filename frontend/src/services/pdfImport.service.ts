import axios from '../lib/axios';
import type { PdfImport, PendingEntity } from '../types/pdfImport';

class PdfImportService {
  async uploadPdf(file: File, tripId?: number): Promise<PdfImport> {
    const formData = new FormData();
    formData.append('file', file);
    if (tripId !== undefined) {
      formData.append('tripId', String(tripId));
    }
    const response = await axios.post('/pdf-imports/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  }

  async getPdfImports(params?: { status?: string }): Promise<PdfImport[]> {
    const response = await axios.get('/pdf-imports', { params });
    return response.data;
  }

  async getPdfImportById(id: number): Promise<PdfImport> {
    const response = await axios.get(`/pdf-imports/${id}`);
    return response.data;
  }

  async getPendingEntities(params?: {
    pdfImportId?: number;
    status?: string;
    entityType?: string;
  }): Promise<PendingEntity[]> {
    const response = await axios.get('/pdf-imports/pending', { params });
    return response.data;
  }

  async getPendingCount(): Promise<{ count: number }> {
    const response = await axios.get('/pdf-imports/pending/count');
    return response.data;
  }

  async updatePendingEntity(
    id: number,
    data: { parsedData?: Record<string, unknown>; matchedTripId?: number | null }
  ): Promise<PendingEntity> {
    const response = await axios.put(`/pdf-imports/pending/${id}`, data);
    return response.data;
  }

  async acceptPendingEntity(
    id: number,
    tripId: number,
    overrides?: Record<string, unknown>
  ): Promise<{ createdEntityId: number; createdEntityType: string }> {
    const response = await axios.post(`/pdf-imports/pending/${id}/accept`, {
      tripId,
      overrides,
    });
    return response.data;
  }

  async rejectPendingEntity(id: number): Promise<void> {
    await axios.post(`/pdf-imports/pending/${id}/reject`);
  }

  async reparseImport(id: number): Promise<void> {
    await axios.post(`/pdf-imports/${id}/reparse`);
  }

  async deletePdfImport(id: number): Promise<void> {
    await axios.delete(`/pdf-imports/${id}`);
  }
}

export default new PdfImportService();
