import { useState, useEffect } from 'react';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import { createDefaultGridConfig } from '@primitives/grid-engine/measurement.ts';

/**
 * Hook that provides the current grid configuration and triggers re-measurement
 * when the font or size changes.
 *
 * Stub: returns the default grid config. Real implementation will measure
 * cell dimensions from a DOM element and respond to font loading events.
 */
export function useGridMeasurement(): GridConfig {
  const [config] = useState<GridConfig>(() => createDefaultGridConfig());

  useEffect(() => {
    // Real implementation: re-measure on font load, window resize, etc.
  }, []);

  return config;
}
