import { useState, useRef } from "react";

/**
 * Hook to detect drag events globally and show overlay
 */
export function useDragDropOverlay() {
  const [isDraggingFiles, setIsDraggingFiles] = useState(false);
  const dragCounterRef = useRef(0);

  const handleWindowDragEnter = (e: globalThis.DragEvent) => {
    // Only show overlay if dragging files (not text or other data)
    if (e.dataTransfer?.types.includes("Files")) {
      dragCounterRef.current++;
      setIsDraggingFiles(true);
    }
  };

  const handleWindowDragLeave = () => {
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDraggingFiles(false);
    }
  };

  const handleWindowDrop = () => {
    dragCounterRef.current = 0;
    setIsDraggingFiles(false);
  };

  // Setup global drag listeners
  const setupListeners = () => {
    // Hoist the dragover handler to a stable reference so the same function
    // is passed to add and remove. The previous code used two separate
    // anonymous arrows, which removeEventListener cannot match — that meant
    // every mount of a consumer (e.g. PhotoUpload) leaked one listener.
    const handleWindowDragOver = (e: globalThis.DragEvent) => {
      // Prevent default to allow drop.
      e.preventDefault();
    };

    window.addEventListener("dragenter", handleWindowDragEnter);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("drop", handleWindowDrop);
    window.addEventListener("dragover", handleWindowDragOver);

    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("drop", handleWindowDrop);
      window.removeEventListener("dragover", handleWindowDragOver);
    };
  };

  return { isDraggingFiles, setupListeners };
}

