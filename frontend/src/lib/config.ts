/**
 * Get the base URL for API requests and asset serving
 * In TrueNAS/production, uses relative URLs that nginx will proxy
 * In development, uses VITE_API_URL or localhost
 */
export function getApiBaseUrl(): string {
  // In production builds, VITE_API_URL will be '/api' (relative)
  // In development, it will be 'http://localhost:5000/api'
  return import.meta.env.VITE_API_URL || 'http://localhost:5000/api';
}

/**
 * Get the base URL for uploads and assets
 * Strips /api suffix if present and ensures no trailing slash
 */
export function getAssetBaseUrl(): string {
  const apiUrl = getApiBaseUrl();
  // Remove /api suffix since asset paths already include it
  // Also remove trailing slash if present
  return apiUrl.replace(/\/api\/?$/, '').replace(/\/$/, '');
}

/**
 * Get the full URL for an asset path
 * Ensures correct slash handling
 */
export function getFullAssetUrl(path: string | null | undefined): string | null {
  if (!path) return null;
  if (path.startsWith('blob:') || path.startsWith('data:') || path.startsWith('http')) {
    return path;
  }

  const baseUrl = getAssetBaseUrl();
  const cleanPath = path.startsWith('/') ? path : `/${path}`;
  
  return `${baseUrl}${cleanPath}`;
}

/**
 * Get the upload base URL for serving uploaded files
 */
export function getUploadUrl(): string {
  return import.meta.env.VITE_UPLOAD_URL || '/uploads';
}
