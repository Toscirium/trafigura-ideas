import { useRef } from 'react';

const MAX_POINTS = 40;

/** Keeps a capped ring buffer of the most recent values for a numeric series, keyed by id. */
export function useSeries(key: string, value: number, maxPoints = MAX_POINTS): number[] {
  const buffers = useRef<Map<string, number[]>>(new Map());

  let series = buffers.current.get(key);
  if (!series) {
    series = [];
    buffers.current.set(key, series);
  }

  if (series[series.length - 1] !== value) {
    series.push(value);
    if (series.length > maxPoints) series.shift();
  }

  return series;
}
