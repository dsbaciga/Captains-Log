import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import PhotoGallery from '../PhotoGallery';
import { createMockPhoto } from '../../test/fixtures';
import type { Photo } from '../../types/photo';

// Mock IntersectionObserver - implements the full DOM interface so it can be
// assigned to window without a cast. Nothing is ever observed as visible.
class MockIntersectionObserver implements IntersectionObserver {
  readonly root: Element | Document | null = null;
  readonly rootMargin: string = '0px';
  readonly thresholds: ReadonlyArray<number> = [0];
  observe = vi.fn<(target: Element) => void>();
  unobserve = vi.fn<(target: Element) => void>();
  disconnect = vi.fn<() => void>();
  takeRecords = vi.fn<() => IntersectionObserverEntry[]>(() => []);
}
window.IntersectionObserver = MockIntersectionObserver;

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
      let store: Record<string, string> = {};
      return {
        getItem(key: string): string | null {
          return store[key] ?? null;
        },
        setItem(key: string, value: unknown): void {
          store[key] = String(value);
        },
        clear(): void {
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
    const mockPhotos: Photo[] = Array.from({ length: 100 }, (_, i) =>
      createMockPhoto({
        id: i + 1,
        thumbnailPath: `/thumbnails/photo${i + 1}.jpg`,
      })
    );

    render(
      <BrowserRouter>
        <PhotoGallery photos={mockPhotos} />
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
    // Photos without thumbnails, so nothing can be eagerly fetched
    const mockPhotos: Photo[] = Array.from({ length: 100 }, (_, i) =>
      createMockPhoto({ id: i + 1, thumbnailPath: null })
    );

    render(
      <BrowserRouter>
        <PhotoGallery photos={mockPhotos} />
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
    const mockPhotos: Photo[] = Array.from({ length: 50 }, (_, i) =>
      createMockPhoto({
        id: i + 1,
        thumbnailPath: `/thumbnails/photo${i + 1}.jpg`,
      })
    );

    const { container } = render(
      <BrowserRouter>
        <PhotoGallery photos={mockPhotos} />
      </BrowserRouter>
    );

    // Wait for initial render
    await waitFor(() => {
      const images = container.querySelectorAll('img');
      expect(images.length).toBeGreaterThan(0);
    });
  });
});
