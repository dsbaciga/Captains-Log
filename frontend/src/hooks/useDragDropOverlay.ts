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
    window.addEventListener("dragenter", handleWindowDragEnter);
    window.addEventListener("dragleave", handleWindowDragLeave);
    window.addEventListener("drop", handleWindowDrop);
    window.addEventListener("dragover", (e) => e.preventDefault()); // Prevent default to allow drop

    return () => {
      window.removeEventListener("dragenter", handleWindowDragEnter);
      window.removeEventListener("dragleave", handleWindowDragLeave);
      window.removeEventListener("drop", handleWindowDrop);
      window.removeEventListener("dragover", (e) => e.preventDefault());
    };
  };

  return { isDraggingFiles, setupListeners };
}

