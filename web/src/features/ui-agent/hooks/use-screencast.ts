/**
 * Screencast Hook
 *
 * Processes base64 frame data and returns a displayable image src.
 * Uses requestAnimationFrame to throttle rendering for smooth display.
 */

import { useCallback, useEffect, useRef, useState } from "react";

export function useScreencast(frameData: string | undefined): string | null {
  const [displaySrc, setDisplaySrc] = useState<string | null>(null);
  const rafRef = useRef<number | null>(null);
  const latestFrameRef = useRef<string | undefined>(frameData);

  latestFrameRef.current = frameData;

  const renderFrame = useCallback(() => {
    const data = latestFrameRef.current;
    if (data) {
      setDisplaySrc(`data:image/jpeg;base64,${data}`);
    } else {
      setDisplaySrc(null);
    }
    rafRef.current = null;
  }, []);

  useEffect(() => {
    if (frameData === undefined) {
      setDisplaySrc(null);
      return;
    }

    if (rafRef.current === null) {
      rafRef.current = requestAnimationFrame(renderFrame);
    }

    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [frameData, renderFrame]);

  return displaySrc;
}
