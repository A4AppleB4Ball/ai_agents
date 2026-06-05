"use client";

import { useState } from "react";
import { TestScreenshot } from "@/types/ui-testing";

const BASE64_REGEX = /^[A-Za-z0-9+/]*={0,2}$/;

function isValidBase64(str: string): boolean {
  if (!str || str.length < 4) return false;
  return str.length % 4 === 0 && BASE64_REGEX.test(str);
}

interface ScreenshotGalleryProps {
  screenshots: TestScreenshot[];
}

export function ScreenshotGallery({ screenshots }: ScreenshotGalleryProps) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (screenshots.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full px-6 text-center">
        <p className="text-sm" style={{ color: "var(--gray-text)" }}>
          No screenshots captured yet
        </p>
        <p className="text-xs mt-1" style={{ color: "var(--gray-text)", opacity: 0.7 }}>
          Screenshots will appear here as the agent executes test steps.
        </p>
      </div>
    );
  }

  const selected = selectedIndex !== null ? screenshots[selectedIndex] : null;

  return (
    <div className="h-full flex flex-col">
      {/* Lightbox */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-8"
          style={{ background: "rgba(0,0,0,0.8)" }}
          onClick={() => setSelectedIndex(null)}
        >
          <div className="max-w-[90vw] max-h-[90vh] relative" onClick={(e) => e.stopPropagation()}>
            {isValidBase64(selected.base64) ? (
              <img
                src={`data:image/png;base64,${selected.base64}`}
                alt={selected.description}
                className="max-w-full max-h-[85vh] rounded-lg object-contain"
              />
            ) : (
              <div className="w-64 h-48 rounded-lg flex items-center justify-center" style={{ background: "rgba(220,53,69,0.1)" }}>
                <p className="text-sm text-white/60">Invalid screenshot data</p>
              </div>
            )}
            <div className="mt-2 text-center">
              <p className="text-sm text-white">{selected.description}</p>
              <p className="text-xs text-white/60 mt-0.5">
                {selected.case_id} / Step {selected.step}
              </p>
            </div>
            <button
              onClick={() => setSelectedIndex(null)}
              className="absolute -top-2 -right-2 w-8 h-8 rounded-full flex items-center justify-center text-white/80 hover:text-white"
              style={{ background: "rgba(0,0,0,0.6)" }}
            >
              x
            </button>
          </div>
        </div>
      )}

      {/* Grid */}
      <div className="p-4 grid grid-cols-2 gap-3 overflow-y-auto">
        {screenshots.map((screenshot, idx) => (
          <div
            key={`${screenshot.case_id}-${screenshot.step}-${idx}`}
            className="cursor-pointer rounded-lg overflow-hidden transition-transform hover:scale-[1.02]"
            style={{ border: "1px solid rgba(131,0,81,0.1)" }}
            onClick={() => setSelectedIndex(idx)}
          >
            {isValidBase64(screenshot.base64) ? (
              <img
                src={`data:image/png;base64,${screenshot.base64}`}
                alt={screenshot.description}
                className="w-full h-32 object-cover object-top"
              />
            ) : (
              <div className="w-full h-32 flex items-center justify-center" style={{ background: "rgba(220,53,69,0.06)" }}>
                <p className="text-[10px]" style={{ color: "var(--gray-text)" }}>Invalid image</p>
              </div>
            )}
            <div className="p-2">
              <p className="text-[10px] truncate" style={{ color: "var(--foreground)" }}>
                {screenshot.description}
              </p>
              <p className="text-[10px] mt-0.5" style={{ color: "var(--gray-text)", fontFamily: "var(--font-mono)" }}>
                {screenshot.case_id} / step {screenshot.step}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
