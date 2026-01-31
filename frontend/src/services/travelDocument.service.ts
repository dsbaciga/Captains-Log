import axios from '../lib/axios';
import type {
  TravelDocument,
  CreateTravelDocumentInput,
  UpdateTravelDocumentInput,
  DocumentAlert,
  DocumentValidityCheck,
} from '../types/travelDocument';

export const travelDocumentService = {
  /**
   * Get all travel documents for the authenticated user
   */
  async getAll(): Promise<TravelDocument[]> {
    const response = await axios.get('/travel-documents');
    return response.data.data;
  },

  /**
   * Get a single travel document by ID
   */
  async getById(documentId: number): Promise<TravelDocument> {
    const response = await axios.get(`/travel-documents/${documentId}`);
    return response.data.data;
  },

  /**
   * Create a new travel document
   */
  async create(data: CreateTravelDocumentInput): Promise<TravelDocument> {
    const response = await axios.post('/travel-documents', data);
    return response.data.data;
  },

  /**
   * Update a travel document
   */
  async update(documentId: number, data: UpdateTravelDocumentInput): Promise<TravelDocument> {
    const response = await axios.put(`/travel-documents/${documentId}`, data);
    return response.data.data;
  },

  /**
   * Delete a travel document
   */
  async delete(documentId: number): Promise<void> {
    await axios.delete(`/travel-documents/${documentId}`);
  },

  /**
   * Get documents requiring attention (expiring within alert window)
   */
  async getAlerts(): Promise<DocumentAlert[]> {
    const response = await axios.get('/travel-documents/alerts');
    return response.data.data;
  },

  /**
   * Check document validity for a specific trip
   */
  async checkForTrip(tripId: number): Promise<DocumentValidityCheck> {
    const response = await axios.get(`/travel-documents/trip/${tripId}/check`);
    return response.data.data;
  },

  /**
   * Get user's primary passport
   */
  async getPrimaryPassport(): Promise<TravelDocument | null> {
    const response = await axios.get('/travel-documents/primary-passport');
    return response.data.data;
  },
};

export default travelDocumentService;
