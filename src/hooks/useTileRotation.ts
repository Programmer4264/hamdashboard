import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Hook for cycling through tile sources at a given interval.
 * Returns the current source index and a function to manually advance.
 */
export function useTileRotation(
  sourceCount: number,
  intervalMs: number,
  paused: boolean = false
): { currentIndex: number; advance: () => void; setIndex: (i: number) => void } {
  const [currentIndex, setCurrentIndex] = useState(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const advance = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % sourceCount);
  }, [sourceCount]);

  useEffect(() => {
    if (paused || sourceCount <= 1 || intervalMs <= 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    intervalRef.current = setInterval(advance, intervalMs);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [sourceCount, intervalMs, paused, advance]);

  return { currentIndex, advance, setIndex: setCurrentIndex };
}
