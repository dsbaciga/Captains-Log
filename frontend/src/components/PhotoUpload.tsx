import { useState, useEffect } from "react";
import type { Location } from "../types/location";
import type { ImmichAsset, ImmichAlbum } from "../types/immich";
import photoService from "../services/photo.service";
import immichService from "../services/immich.service";
import ImmichBrowser from "./ImmichBrowser";
import DragDropUpload, { useDragDropOverlay } from "./DragDropUpload";
import { PhotoSourcePicker } from "./CameraCapture";
import toast from "react-hot-toast";

interface PhotoUploadProps {
  tripId: number;
  locations: Location[];
  onPhotoUploaded: () => void;
  tripStartDate?: string;
  tripEndDate?: string;
  existingImmichAssetIds?: Set<string>;
}

export default function PhotoUpload({
  tripId,
  locations,
  onPhotoUploaded,
  tripStartDate,
  tripEndDate,
  existingImmichAssetIds,
}: PhotoUploadProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [caption, setCaption] = useState("");
  const [locationId, setLocationId] = useState<number | undefined>();
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [showImmichBrowser, setShowImmichBrowser] = useState(false);
  const [immichConfigured, setImmichConfigured] = useState(false);
  const { isDraggingFiles, setupListeners } = useDragDropOverlay();

  useEffect(() => {
    checkImmichSettings();
  }, []);

  useEffect(() => {
    // Setup global drag-and-drop overlay
    const cleanup = setupListeners();
    return cleanup;
  }, []);

  const checkImmichSettings = async () => {
    try {
      const settings = await immichService.getSettings();
      setImmichConfigured(settings.immichConfigured);
    } catch (err) {
      console.error("Failed to check Immich settings:", err);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      setSelectedFiles(Array.from(e.target.files));
    }
  };

  const handleFilesDropped = (files: File[]) => {
    setSelectedFiles((prev) => [...prev, ...files]);
  };

  const handleImmichSelect = async (assets: ImmichAsset[]) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const takenAt = asset.exifInfo?.dateTimeOriginal || asset.fileCreatedAt;

        await photoService.linkImmichPhoto({
          tripId,
          locationId,
          immichAssetId: asset.id,
          caption: assets.length === 1 ? caption || undefined : undefined,
          takenAt: takenAt ?? undefined,
          latitude: asset.exifInfo?.latitude ?? undefined,
          longitude: asset.exifInfo?.longitude ?? undefined,
        });
        setUploadProgress(((i + 1) / assets.length) * 100);
      }

      setCaption("");
      setLocationId(undefined);
      setUploadProgress(0);
      setShowImmichBrowser(false);
      onPhotoUploaded();
    } catch (err) {
      console.error("Failed to link Immich photos:", err);
      alert("Failed to link Immich photos");
    } finally {
      setIsUploading(false);
    }
  };

  const handleImportAlbum = async (
    album: ImmichAlbum,
    assets: ImmichAsset[]
  ) => {
    setIsUploading(true);
    setUploadProgress(0);

    try {
      toast.loading(
        `Importing album "${album.albumName}" with ${assets.length} photos...`
      );

      // Step 1: Create the album in the trip
      const newAlbum = await photoService.createAlbum({
        tripId,
        name: album.albumName,
        description: album.description || `Imported from Immich`,
      });

      // Step 2: Link all photos from Immich
      const linkedPhotoIds: number[] = [];
      for (let i = 0; i < assets.length; i++) {
        const asset = assets[i];
        const takenAt = asset.exifInfo?.dateTimeOriginal || asset.fileCreatedAt;

        const photo = await photoService.linkImmichPhoto({
          tripId,
          locationId: undefined,
          immichAssetId: asset.id,
          caption: undefined,
          takenAt: takenAt ?? undefined,
          latitude: asset.exifInfo?.latitude ?? undefined,
          longitude: asset.exifInfo?.longitude ?? undefined,
        });

        linkedPhotoIds.push(photo.id);
        setUploadProgress(((i + 1) / assets.length) * 100);
      }

      // Step 3: Add all photos to the album
      await photoService.addPhotosToAlbum(newAlbum.id, {
        photoIds: linkedPhotoIds,
      });

      setUploadProgress(0);
      setShowImmichBrowser(false);
      toast.dismiss();
      toast.success(
        `Successfully imported album "${album.albumName}" with ${assets.length} photos!`
      );
      onPhotoUploaded();
    } catch (err) {
      console.error("Failed to import album:", err);
      toast.dismiss();
      toast.error("Failed to import album");
    } finally {
      setIsUploading(false);
    }
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);
    setUploadProgress(0);

    try {
      for (let i = 0; i < selectedFiles.length; i++) {
        const file = selectedFiles[i];
        await photoService.uploadPhoto(file, {
          tripId,
          locationId,
          caption: selectedFiles.length === 1 ? caption : undefined,
        });
        setUploadProgress(((i + 1) / selectedFiles.length) * 100);
      }

      // Reset form
      setSelectedFiles([]);
      setCaption("");
      setLocationId(undefined);
      setUploadProgress(0);
      onPhotoUploaded();
    } catch {
      alert("Failed to upload photos");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <>
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
            Add Photos
          </h3>
          {immichConfigured && (
            <button
              onClick={() => setShowImmichBrowser(true)}
              disabled={isUploading}
              className="px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-purple-400 text-white rounded-lg transition-colors text-sm disabled:cursor-not-allowed"
            >
              Browse Immich
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Mobile Photo Source Picker - Shows on small screens */}
          <div className="md:hidden">
            <PhotoSourcePicker
              onFilesSelected={handleFilesDropped}
              multiple={true}
              disabled={isUploading}
            />
          </div>

          {/* Desktop Drag and Drop Upload - Shows on medium+ screens */}
          <div className="hidden md:block">
            <DragDropUpload
              onFilesSelected={handleFilesDropped}
              accept="image/*"
              multiple
              disabled={isUploading}
              text="Drag and drop photos here"
              subtext="or click to browse from your computer"
            />
          </div>

          {selectedFiles.length > 0 && (
            <div className="text-center">
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                {selectedFiles.length} file(s) ready to upload
              </p>
            </div>
          )}

          {/* Preview */}
          {selectedFiles.length > 0 && (
            <div className="grid grid-cols-4 gap-2">
              {selectedFiles.map((file, index) => (
                <div key={index} className="relative aspect-square">
                  <img
                    src={URL.createObjectURL(file)}
                    alt={`Preview ${index + 1}`}
                    className="w-full h-full object-cover rounded"
                  />
                  <button
                    onClick={() =>
                      setSelectedFiles(
                        selectedFiles.filter((_, i) => i !== index)
                      )
                    }
                    type="button"
                    aria-label={`Remove photo ${index + 1}`}
                    className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-8 h-8 min-w-[44px] min-h-[44px] flex items-center justify-center text-sm hover:bg-red-600 shadow-md"
                    disabled={isUploading}
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Caption (only for single upload) */}
          {selectedFiles.length === 1 && (
            <div>
              <label
                htmlFor="photo-upload-caption"
                className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
              >
                Caption
              </label>
              <textarea
                id="photo-upload-caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                rows={2}
                className="input"
                placeholder="Add a caption..."
                disabled={isUploading}
              />
            </div>
          )}

          {/* Location */}
          <div>
            <label
              htmlFor="photo-upload-location"
              className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Location (Optional)
            </label>
            <select
              id="photo-upload-location"
              value={locationId || ""}
              onChange={(e) =>
                setLocationId(
                  e.target.value ? parseInt(e.target.value) : undefined
                )
              }
              className="input"
              disabled={isUploading}
            >
              <option value="">No specific location</option>
              {locations.map((location) => (
                <option key={location.id} value={location.id}>
                  {location.name}
                </option>
              ))}
            </select>
          </div>

          {/* Upload Progress */}
          {isUploading && (
            <div>
              <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all"
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p className="text-sm text-gray-600 dark:text-gray-400 mt-1 text-center">
                Uploading... {Math.round(uploadProgress)}%
              </p>
            </div>
          )}

          {/* Upload Button */}
          <button
            onClick={handleUpload}
            disabled={selectedFiles.length === 0 || isUploading}
            className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 dark:disabled:bg-gray-600 text-white font-medium rounded-lg transition-colors disabled:cursor-not-allowed"
          >
            {isUploading
              ? "Uploading..."
              : selectedFiles.length > 0
              ? `Upload ${selectedFiles.length} Photo${
                  selectedFiles.length !== 1 ? "s" : ""
                }`
              : "Select Photos to Upload"}
          </button>
        </div>
      </div>

      {showImmichBrowser && (
        <ImmichBrowser
          onSelect={handleImmichSelect}
          onImportAlbum={handleImportAlbum}
          onClose={() => setShowImmichBrowser(false)}
          tripStartDate={tripStartDate}
          tripEndDate={tripEndDate}
          excludeAssetIds={existingImmichAssetIds}
        />
      )}

      {/* Global drag-and-drop overlay */}
      {isDraggingFiles && (
        <DragDropUpload
          onFilesSelected={handleFilesDropped}
          accept="image/*"
          multiple
          overlay
        />
      )}
    </>
  );
}
