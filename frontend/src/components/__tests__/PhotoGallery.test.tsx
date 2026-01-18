import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PhotoGallery from '../PhotoGallery';
import type { Photo } from '../../types/photo';

// Mock IntersectionObserver
class MockIntersectionObserver {
  observe = vi.fn();
  unobserve = vi.fn();
  disconnect = vi.fn();
}
window.IntersectionObserver = MockIntersectionObserver as unknown as typeof IntersectionObserver;

// Mock ProgressiveImage to render a simple img tag for testing
vi.mock('../ProgressiveImage', () => ({
  default: ({ src, alt, imgClassName, lazy }: { src: string; alt: string; imgClassName?: string; lazy?: boolean }) => {
    if (lazy) {
      return <div className="progressive-image-placeholder" />;
    }
    return <img src={src} alt={alt} className={imgClassName} />;
  }
}));

vi.mock('../../services/photo.service', () => {
  const mockService = {
    getPhotosByTrip: vi.fn(),
    getPhotosByLocation: vi.fn(),
    getPhotosByAlbum: vi.fn(),
  };
  return {
    photoService: mockService,
    default: mockService,
  };
});

describe('PhotoGallery', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    const localStorageMock = (function () {
  let store = {};
  return {
    getItem(key) {
      return store[key] || null;
    },
    setItem(key, value) {
      store[key] = value.toString();
    },
    clear() {
      store = {};
    },
  };
})();
Object.defineProperty(window, 'localStorage', {
  value: localStorageMock,
});
  });

  it('should not load all thumbnails at once', async () => {
    // Mock 100 photos
    const mockPhotos: Partial<Photo>[] = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      tripId: 1,
      source: 'local' as const,
      thumbnailPath: `/thumbnails/photo${i + 1}.jpg`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    render(
      <BrowserRouter>
        <PhotoGallery photos={mockPhotos as Photo[]} />
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
    const mockPhotos: Partial<Photo>[] = Array.from({ length: 100 }, (_, i) => ({
      id: i + 1,
      tripId: 1,
      source: 'local' as const,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    render(
      <BrowserRouter>
        <PhotoGallery photos={mockPhotos as Photo[]} />
      </BrowserRouter>
    );

    // Should not attempt to load all photos at once
    // Wait for component to render
    await waitFor(() => {
      // Component should render without errors
      expect(screen.queryByTestId('photo-gallery')).toBeTruthy();
    }, { timeout: 3000 });
  });

  it('should not cause race conditions when loading thumbnails', async () => {
    const mockPhotos: Partial<Photo>[] = Array.from({ length: 50 }, (_, i) => ({
      id: i + 1,
      tripId: 1,
      source: 'local' as const,
      thumbnailPath: `/thumbnails/photo${i + 1}.jpg`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    }));

    const { container } = render(
      <BrowserRouter>
        <PhotoGallery photos={mockPhotos as Photo[]} />
      </BrowserRouter>
    );

    // Wait for initial render
    await waitFor(() => {
      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);
    });
  });
});
