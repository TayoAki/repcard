import { useEffect, useRef, useState } from "react";

/**
 * Workout clock + rest countdown.
 *
 * Elapsed time is computed from wall-clock deltas (accumulated + now-resumedAt),
 * never by incrementing a counter, so interval jitter and app backgrounding
 * cannot corrupt the recorded duration. Pause state is mirrored in a ref so
 * imperative callers (navigation guards) always read the current value.
 */
export function useSessionTimer() {
  const [startedAt] = useState(() => Date.now());
  const [elapsed, setElapsed] = useState(0);
  const [restLeft, setRestLeft] = useState(0);
  const [paused, setPaused] = useState(false);

  const bankedRef = useRef(0); // seconds accumulated across pauses
  const resumedAtRef = useRef(Date.now());
  const pausedRef = useRef(false);
  const restEndsAtRef = useRef<number | null>(null);

  useEffect(() => {
    if (!paused) resumedAtRef.current = Date.now();

    const tick = setInterval(() => {
      if (!pausedRef.current) {
        setElapsed(bankedRef.current + (Date.now() - resumedAtRef.current) / 1000);
      }
      if (restEndsAtRef.current !== null) {
        const left = (restEndsAtRef.current - Date.now()) / 1000;
        setRestLeft(Math.max(0, left));
        if (left <= 0) restEndsAtRef.current = null;
      }
    }, 500);

    return () => clearInterval(tick);
  }, [paused]);

  const pause = () => {
    if (pausedRef.current) return;
    bankedRef.current += (Date.now() - resumedAtRef.current) / 1000;
    pausedRef.current = true;
    setPaused(true);
  };

  const resume = () => {
    if (!pausedRef.current) return;
    resumedAtRef.current = Date.now();
    pausedRef.current = false;
    setPaused(false);
  };

  const startRest = (seconds: number) => {
    if (seconds <= 0) return;
    restEndsAtRef.current = Date.now() + seconds * 1000;
    setRestLeft(seconds);
  };

  const skipRest = () => {
    restEndsAtRef.current = null;
    setRestLeft(0);
  };

  return {
    startedAt,
    elapsed,
    paused,
    restLeft,
    pause,
    resume,
    toggle: () => (pausedRef.current ? resume() : pause()),
    startRest,
    skipRest,
  };
}
