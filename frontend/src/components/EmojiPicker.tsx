import { useState, useRef, useEffect } from "react";
import EmojiPickerReact from "emoji-picker-react";

interface EmojiPickerProps {
  value: string;
  onChange: (emoji: string) => void;
  className?: string;
}

export default function EmojiPicker({ value, onChange, className = "" }: EmojiPickerProps) {
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        setShowPicker(false);
      }
    }

    if (showPicker) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [showPicker]);

  const handleEmojiClick = (emojiData: { emoji: string }) => {
    onChange(emojiData.emoji);
    setShowPicker(false);
  };

  return (
    <div className="relative" ref={pickerRef}>
      <button
        type="button"
        onClick={() => setShowPicker(!showPicker)}
        className={`text-2xl hover:scale-110 transition-transform ${className}`}
      >
        {value || "😀"}
      </button>
      {showPicker && (
        <div className="absolute z-50 mt-2">
          <EmojiPickerReact
            onEmojiClick={handleEmojiClick}
            searchDisabled={false}
            skinTonesDisabled
            width={300}
            height={400}
          />
        </div>
      )}
    </div>
  );
}
