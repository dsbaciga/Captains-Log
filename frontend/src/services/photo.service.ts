import api from '../lib/axios';
import type {
  Photo,
  PhotoAlbum,
  AlbumWithPhotos,
  UploadPhotoInput,
  LinkImmichPhotoInput,
  UpdatePhotoInput,
  CreateAlbumInput,
  UpdateAlbumInput,
  AddPhotosToAlbumInput,
} from '../types/photo';

class PhotoService {
  async uploadPhoto(file: File, data: UploadPhotoInput): Promise<Photo> {
    const formData = new FormData();
    formData.append('photo', file);
    formData.append('tripId', data.tripId.toString());
    if (data.locationId) {
      formData.append('locationId', data.locationId.toString());
    }
    if (data.caption) {
      formData.append('caption', data.caption);
    }
    if (data.takenAt) {
      formData.append('takenAt', data.takenAt);
    }
    if (data.latitude !== undefined) {
      formData.append('latitude', data.latitude.toString());
    }
    if (data.longitude !== undefined) {
      formData.append('longitude', data.longitude.toString());
    }

    const response = await api.post('/photos/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }

  async linkImmichPhoto(data: LinkImmichPhotoInput): Promise<Photo> {
    const response = await api.post('/photos/immich', data);
    return response.data;
  }

  async getPhotosByTrip(
    tripId: number,
    options?: { skip?: number; take?: number }
  ): Promise<{ photos: Photo[]; total: number; hasMore: boolean }> {
    const response = await api.get(`/photos/trip/${tripId}`, {
      params: options,
    });
    return response.data;
  }

  async getUnsortedPhotosByTrip(
    tripId: number,
    options?: { skip?: number; take?: number }
  ): Promise<{ photos: Photo[]; total: number; hasMore: boolean }> {
    const response = await api.get(`/photos/trip/${tripId}/unsorted`, {
      params: options,
    });
    return response.data;
  }

  async getPhotosByLocation(locationId: number): Promise<Photo[]> {
    const response = await api.get(`/photos/location/${locationId}`);
    return response.data;
  }

  async getPhotoById(photoId: number): Promise<Photo> {
    const response = await api.get(`/photos/${photoId}`);
    return response.data;
  }

  async updatePhoto(photoId: number, data: UpdatePhotoInput): Promise<Photo> {
    const response = await api.put(`/photos/${photoId}`, data);
    return response.data;
  }

  async deletePhoto(photoId: number): Promise<void> {
    await api.delete(`/photos/${photoId}`);
  }

  // Album methods
  async createAlbum(data: CreateAlbumInput): Promise<PhotoAlbum> {
    const response = await api.post('/albums', data);
    return response.data;
  }

  async getAlbumsByTrip(tripId: number): Promise<{ albums: PhotoAlbum[], unsortedCount: number, totalCount: number }> {
    const response = await api.get(`/albums/trip/${tripId}`);
    return response.data;
  }

  async getAlbumById(
    albumId: number,
    options?: { skip?: number; take?: number }
  ): Promise<AlbumWithPhotos> {
    const response = await api.get(`/albums/${albumId}`, {
      params: options,
    });
    return response.data;
  }

  async updateAlbum(
    albumId: number,
    data: UpdateAlbumInput
  ): Promise<PhotoAlbum> {
    const response = await api.put(`/albums/${albumId}`, data);
    return response.data;
  }

  async deleteAlbum(albumId: number): Promise<void> {
    await api.delete(`/albums/${albumId}`);
  }

  async addPhotosToAlbum(
    albumId: number,
    data: AddPhotosToAlbumInput
  ): Promise<{ success: boolean; addedCount: number }> {
    const response = await api.post(`/albums/${albumId}/photos`, data);
    return response.data;
  }

  async removePhotoFromAlbum(
    albumId: number,
    photoId: number
  ): Promise<void> {
    await api.delete(`/albums/${albumId}/photos/${photoId}`);
  }
}

export default new PhotoService();
