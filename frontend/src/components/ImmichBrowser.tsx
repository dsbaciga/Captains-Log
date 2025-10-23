import { useState, useEffect, useMemo } from "react";
import immichService from "../services/immich.service";
import type { ImmichAsset, ImmichAlbum } from "../types/immich";
import { getAssetBaseUrl } from "../lib/config";

interface ImmichBrowserProps {
  onSelect: (assets: ImmichAsset[]) => void;
  onImportAlbum?: (album: ImmichAlbum, assets: ImmichAsset[]) => void;
  onClose: () => void;
  tripStartDate?: string;
  tripEndDate?: string;
}

interface ThumbnailCache {
  [assetId: string]: string; // Maps asset ID to blob URL
}

export default function ImmichBrowser({
  onSelect,
  onImportAlbum,
  onClose,
  tripStartDate,
  tripEndDate,
}: ImmichBrowserProps) {
  const [assets, setAssets] = useState<ImmichAsset[]>([]);
  const [albums, setAlbums] = useState<ImmichAlbum[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [view, setView] = useState<"assets" | "albums">("assets");
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [albumSearchTerm, setAlbumSearchTerm] = useState("");
  const [filterByTripDates, setFilterByTripDates] = useState(true);
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(
    new Set()
  );
  const [thumbnailCache, setThumbnailCache] = useState<ThumbnailCache>({});

  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalAssets, setTotalAssets] = useState(0);
  const ITEMS_PER_PAGE = 50;

  // Filter albums based on search term
  const filteredAlbums = useMemo(() => {
    if (!albumSearchTerm.trim()) {
      return albums;
    }
    return albums.filter((album) =>
      album.albumName.toLowerCase().includes(albumSearchTerm.toLowerCase())
    );
  }, [albums, albumSearchTerm]);

  useEffect(() => {
    setCurrentPage(1); // Reset to page 1 when changing filters
    loadData();
  }, [view, selectedAlbum, filterByTripDates]);

  useEffect(() => {
    loadData(); // Load data when page changes
  }, [currentPage]);

  // Load thumbnails with authentication
  useEffect(() => {
    const loadThumbnails = async () => {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        console.error("[ImmichBrowser] No access token found");
        return;
      }

      const baseUrl = getAssetBaseUrl();

      for (const asset of assets) {
        // Skip if already cached
        if (thumbnailCache[asset.id]) {
          continue;
        }

        try {
          const response = await fetch(`${baseUrl}${asset.thumbnailUrl}`, {
            headers: {
              Authorization: `Bearer ${token}`,
            },
          });

          if (!response.ok) {
            console.error(
              `[ImmichBrowser] Failed to fetch thumbnail ${asset.id}:`,
              response.status,
              response.statusText
            );
            continue;
          }

          const blob = await response.blob();
          const blobUrl = URL.createObjectURL(blob);

          setThumbnailCache((prev) => ({
            ...prev,
            [asset.id]: blobUrl,
          }));
        } catch (error) {
          console.error(
            `[ImmichBrowser] Error loading thumbnail ${asset.id}:`,
            error
          );
        }
      }
    };

    if (assets.length > 0) {
      loadThumbnails();
    }

    // Cleanup blob URLs when component unmounts
    return () => {
      Object.values(thumbnailCache).forEach((url) => URL.revokeObjectURL(url));
    };
  }, [assets]);

  const loadData = async () => {
    setIsLoading(true);
    try {
      const skip = (currentPage - 1) * ITEMS_PER_PAGE;
      const take = ITEMS_PER_PAGE;

      if (view === "albums") {
        console.log("[ImmichBrowser] Loading albums");
        const result = await immichService.getAlbums(false);
        setAlbums(result.albums || []);
        setTotalAssets(0); // Albums don't have pagination yet
      } else if (selectedAlbum) {
        console.log("[ImmichBrowser] Loading album:", selectedAlbum);
        const album = await immichService.getAlbumById(selectedAlbum);
        setAssets(album.assets || []);
        setTotalAssets(album.assets?.length || 0);
      } else if (filterByTripDates && tripStartDate && tripEndDate) {
        console.log(
          `[ImmichBrowser] Loading assets by date range (page ${currentPage}):`,
          tripStartDate,
          "to",
          tripEndDate
        );
        const result = await immichService.getAssetsByDateRange(
          tripStartDate,
          tripEndDate,
          { skip, take }
        );
        console.log(
          "[ImmichBrowser] Received assets:",
          result.assets?.length || 0,
          "of",
          result.total
        );
        if (result.assets && result.assets.length > 0) {
          console.log("[ImmichBrowser] First asset sample:", {
            id: result.assets[0].id,
            thumbnailUrl: result.assets[0].thumbnailUrl,
            type: result.assets[0].type,
          });
        }
        setAssets(result.assets || []);
        setTotalAssets(result.total || 0);
      } else {
        console.log(
          `[ImmichBrowser] Loading all assets (page ${currentPage}, no date filter)`
        );
        const result = await immichService.getAssets({ skip, take });
        setAssets(result.assets || []);
        setTotalAssets(result.total || 0);
      }
    } catch (error) {
      console.error("[ImmichBrowser] Failed to load Immich data:", error);
      alert(
        "Failed to load photos from Immich. Please check your Immich settings."
      );
    } finally {
      setIsLoading(false);
    }
  };

  const handleSearch = async () => {
    if (!searchTerm.trim()) {
      loadData();
      return;
    }

    setIsLoading(true);
    try {
      const result = await immichService.searchAssets({ searchTerm });
      setAssets(result.assets || []);
    } catch (error) {
      console.error("Failed to search:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectAsset = (asset: ImmichAsset) => {
    setSelectedAssetIds((prev) => {
      const newSet = new Set(prev);
      if (newSet.has(asset.id)) {
        newSet.delete(asset.id);
      } else {
        newSet.add(asset.id);
      }
      return newSet;
    });
  };

  const handleConfirmSelection = () => {
    const selectedAssets = assets.filter((a) => selectedAssetIds.has(a.id));
    if (selectedAssets.length > 0) {
      onSelect(selectedAssets);
    }
  };

  const handleSelectAllOnPage = () => {
    setSelectedAssetIds((prev) => {
      const newSet = new Set(prev);
      assets.forEach((asset) => newSet.add(asset.id));
      return newSet;
    });
  };

  const handleDeselectAllOnPage = () => {
    setSelectedAssetIds((prev) => {
      const newSet = new Set(prev);
      assets.forEach((asset) => newSet.delete(asset.id));
      return newSet;
    });
  };

  const allPageAssetsSelected =
    assets.length > 0 &&
    assets.every((asset) => selectedAssetIds.has(asset.id));

  const handleAlbumClick = (albumId: string) => {
    setSelectedAlbum(albumId);
    setView("assets");
  };

  const handleBackToAssets = () => {
    setSelectedAlbum(null);
    loadData();
  };

  const handleImportAlbumClick = async (album: ImmichAlbum) => {
    if (!onImportAlbum) return;

    setIsLoading(true);
    try {
      // Load all assets in the album
      const albumData = await immichService.getAlbumById(album.id);
      const albumAssets = albumData.assets || [];

      if (albumAssets.length === 0) {
        alert("This album has no photos to import");
        return;
      }

      onImportAlbum(album, albumAssets);
    } catch (error) {
      console.error("Failed to import album:", error);
      alert("Failed to import album. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-6xl h-5/6 flex flex-col">
        {/* Header */}
        <div className="p-6 border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              Browse Immich Photos
            </h2>
            <button
              onClick={onClose}
              type="button"
              aria-label="Close"
              className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
            >
              <svg
                className="w-6 h-6"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          </div>

          {/* View Tabs */}
          <div className="flex gap-2 mb-4">
            <button
              onClick={() => setView("assets")}
              type="button"
              className={`px-4 py-2 rounded-lg transition-colors ${
                view === "assets"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              All Photos
            </button>
            <button
              onClick={() => setView("albums")}
              type="button"
              className={`px-4 py-2 rounded-lg transition-colors ${
                view === "albums"
                  ? "bg-blue-600 text-white"
                  : "bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600"
              }`}
            >
              Albums
            </button>
            {selectedAlbum && (
              <button
                onClick={handleBackToAssets}
                type="button"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
              >
                ← Back to All Photos
              </button>
            )}
          </div>

          {/* Search and Filters */}
          {view === "assets" && (
            <div className="flex gap-2">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onKeyPress={(e) => e.key === "Enter" && handleSearch()}
                placeholder="Search photos..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <button
                onClick={handleSearch}
                type="button"
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
              >
                Search
              </button>
              {tripStartDate && tripEndDate && (
                <label className="flex items-center gap-2 px-4 py-2 bg-gray-200 dark:bg-gray-700 rounded-lg cursor-pointer">
                  <input
                    type="checkbox"
                    checked={filterByTripDates}
                    onChange={(e) => setFilterByTripDates(e.target.checked)}
                    className="rounded"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    {filterByTripDates ? "Trip dates only" : "Show all photos"}
                  </span>
                </label>
              )}
            </div>
          )}
          {view === "albums" && (
            <div className="flex gap-2">
              <input
                type="text"
                value={albumSearchTerm}
                onChange={(e) => setAlbumSearchTerm(e.target.value)}
                placeholder="Search albums..."
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
            </div>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {isLoading ? (
            <div className="flex justify-center items-center h-full">
              <p className="text-gray-600 dark:text-gray-400">Loading...</p>
            </div>
          ) : view === "albums" ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {filteredAlbums.map((album) => (
                <div
                  key={album.id}
                  className="p-4 bg-gray-100 dark:bg-gray-700 rounded-lg transition-colors flex flex-col"
                >
                  <div className="font-semibold text-gray-900 dark:text-white mb-1">
                    {album.albumName}
                  </div>
                  <div className="text-sm text-gray-600 dark:text-gray-400 mb-3 flex-grow">
                    {album.assetCount}{" "}
                    {album.assetCount === 1 ? "photo" : "photos"}
                  </div>
                  <div className="flex gap-2">
                    {onImportAlbum && (
                      <button
                        onClick={() => handleImportAlbumClick(album)}
                        type="button"
                        className="flex-1 px-2 py-1.5 bg-green-600 hover:bg-green-700 text-white text-xs rounded transition-colors"
                      >
                        Import
                      </button>
                    )}
                    <button
                      onClick={() => handleAlbumClick(album.id)}
                      type="button"
                      className="flex-1 px-2 py-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs rounded transition-colors"
                    >
                      Browse
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <>
              {/* Select All Button */}
              {assets.length > 0 && (
                <div className="mb-4">
                  <button
                    onClick={
                      allPageAssetsSelected
                        ? handleDeselectAllOnPage
                        : handleSelectAllOnPage
                    }
                    type="button"
                    className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors text-sm"
                  >
                    {allPageAssetsSelected
                      ? "Deselect All on Page"
                      : "Select All on Page"}
                  </button>
                </div>
              )}

              <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
                {assets.map((asset) => {
                  const blobUrl = thumbnailCache[asset.id];
                  return (
                    <button
                      key={asset.id}
                      onClick={() => handleSelectAsset(asset)}
                      type="button"
                      className={`relative aspect-square rounded-lg overflow-hidden border-4 transition-all ${
                        selectedAssetIds.has(asset.id)
                          ? "border-blue-600 shadow-lg scale-105"
                          : "border-transparent hover:border-gray-300 dark:hover:border-gray-600"
                      }`}
                    >
                      {blobUrl ? (
                        <img
                          src={blobUrl}
                          alt={asset.originalFileName}
                          className="w-full h-full object-cover"
                          onError={(e) =>
                            console.error(
                              `[ImmichBrowser] Image failed to load: ${asset.id}`,
                              e
                            )
                          }
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 dark:bg-gray-700">
                          <div className="text-gray-400">Loading...</div>
                        </div>
                      )}
                      {asset.type === "VIDEO" && (
                        <div className="absolute top-2 right-2 bg-black bg-opacity-75 text-white px-2 py-1 rounded text-xs">
                          VIDEO
                        </div>
                      )}
                      {selectedAssetIds.has(asset.id) && (
                        <div className="absolute inset-0 bg-blue-600 bg-opacity-25 flex items-center justify-center">
                          <svg
                            className="w-12 h-12 text-white"
                            fill="currentColor"
                            viewBox="0 0 20 20"
                          >
                            <path
                              fillRule="evenodd"
                              d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                              clipRule="evenodd"
                            />
                          </svg>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}

          {!isLoading && assets.length === 0 && view === "assets" && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No photos found
              </p>
            </div>
          )}

          {!isLoading && albums.length === 0 && view === "albums" && (
            <div className="text-center py-12">
              <p className="text-gray-600 dark:text-gray-400">
                No albums found
              </p>
            </div>
          )}

          {/* Pagination Controls */}
          {!isLoading && view === "assets" && totalAssets > ITEMS_PER_PAGE && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                type="button"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              <span className="text-sm text-gray-600 dark:text-gray-400">
                Page {currentPage} of {Math.ceil(totalAssets / ITEMS_PER_PAGE)}{" "}
                ({totalAssets} total photos)
              </span>
              <button
                onClick={() =>
                  setCurrentPage((p) =>
                    Math.min(Math.ceil(totalAssets / ITEMS_PER_PAGE), p + 1)
                  )
                }
                disabled={
                  currentPage >= Math.ceil(totalAssets / ITEMS_PER_PAGE)
                }
                type="button"
                className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            {selectedAssetIds.size > 0
              ? `${selectedAssetIds.size} ${
                  selectedAssetIds.size === 1 ? "photo" : "photos"
                } selected`
              : "Select photos to continue"}
          </p>
          <div className="flex gap-2">
            <button
              onClick={onClose}
              type="button"
              className="px-4 py-2 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={handleConfirmSelection}
              disabled={selectedAssetIds.size === 0}
              type="button"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-blue-400 text-white rounded-lg transition-colors disabled:cursor-not-allowed"
            >
              Link{" "}
              {selectedAssetIds.size > 0 ? `${selectedAssetIds.size} ` : ""}
              Photo{selectedAssetIds.size !== 1 ? "s" : ""}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
