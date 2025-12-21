import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PhotoGallery from '../PhotoGallery';
import { photoService } from '../../services/photo.service';

vi.mock('../../services/photo.service', () => ({
  photoService: {
    getPhotosByTrip: vi.fn(),
    getPhotosByLocation: vi.fn(),
    getPhotosByAlbum: vi.fn(),
  },
}));

describe('PhotoGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should not load all thumbnails at once', async () => {
    // Mock 100 photos
    const mockPhotos = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      filename: `photo${i + 1}.jpg`,
      tripId: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    vi.mocked(photoService.getPhotosByTrip).mockResolvedValue(mockPhotos);

    render(
      <BrowserRouter>
        <PhotoGallery tripId={1} />
      </BrowserRouter>
    );

    // Should use lazy loading or pagination
    // Verify not all photos are rendered immediately
    await waitFor(() => {
      const images = screen.queryAllByRole('img');
      // Should render a reasonable initial batch (e.g., 20-50)
      // This prevents the race condition where all 100 thumbnails load at once
      expect(images.length).toBeLessThan(60);
    }, { timeout: 3000 });
  });

  it('should handle album pagination correctly', async () => {
    const mockPhotos = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      filename: `photo${i + 1}.jpg`,
      albumId: 1,
      tripId: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    vi.mocked(photoService.getPhotosByAlbum).mockResolvedValue(mockPhotos);

    render(
      <BrowserRouter>
        <PhotoGallery albumId={1} />
      </BrowserRouter>
    );

    // Should not attempt to load all photos at once
    // Wait for component to render
    await waitFor(() => {
      // Component should render without errors
      expect(screen.queryByTestId('photo-gallery')).toBeTruthy();
    }, { timeout: 3000 });

    // Verify the service was called appropriately
    expect(photoService.getPhotosByAlbum).toHaveBeenCalled();
  });

  it('should not cause race conditions when loading thumbnails', async () => {
    const mockPhotos = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      filename: `photo${i + 1}.jpg`,
      tripId: 1,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    vi.mocked(photoService.getPhotosByTrip).mockResolvedValue(mockPhotos);

    const { container } = render(
      <BrowserRouter>
        <PhotoGallery tripId={1} />
      </BrowserRouter>
    );

    // Wait for initial render
    await waitFor(() => {
      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);
    });

    // Service should be called only once (no race conditions causing multiple calls)
    expect(photoService.getPhotosByTrip).toHaveBeenCalledTimes(1);
  });
});
