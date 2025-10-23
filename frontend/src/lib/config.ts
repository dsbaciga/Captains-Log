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
 * Strips /api suffix if present
 */
export function getAssetBaseUrl(): string {
  const apiUrl = getApiBaseUrl();
  // Remove /api suffix since asset paths already include it
  return apiUrl.replace(/\/api$/, '');
}

/**
 * Get the upload base URL for serving uploaded files
 */
export function getUploadUrl(): string {
  return import.meta.env.VITE_UPLOAD_URL || '/uploads';
}
