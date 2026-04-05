import { useMemo } from 'react';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import styles from './Rulers.module.css';

interface RulersProps {
  gridConfig: GridConfig;
  panX: number;
  panY: number;
}

export function Rulers({ gridConfig, panX, panY }: RulersProps) {
  const horizontalTicks = useMemo(() => {
    const ticks: Array<{ col: number; px: number; showLabel: boolean }> = [];
    // Generate enough ticks to fill a reasonable viewport
    for (let col = 0; col < gridConfig.canvasCols; col += 10) {
      ticks.push({
        col,
        px: col * gridConfig.cellWidth + panX + 20, // offset for left ruler
        showLabel: col % 20 === 0,
      });
    }
    return ticks;
  }, [gridConfig, panX]);

  const verticalTicks = useMemo(() => {
    const ticks: Array<{ row: number; px: number; showLabel: boolean }> = [];
    for (let row = 0; row < gridConfig.canvasRows; row += 10) {
      ticks.push({
        row,
        px: row * gridConfig.cellHeight + panY + 20, // offset for top ruler
        showLabel: row % 20 === 0,
      });
    }
    return ticks;
  }, [gridConfig, panY]);

  return (
    <>
      <div className={styles.rulerCorner} />
      <div className={styles.rulerTop} data-testid="ruler-top">
        {horizontalTicks.map((tick) => (
          <span
            key={tick.col}
            className={styles.tick}
            style={{ left: tick.px }}
          >
            {tick.showLabel ? tick.col : '|'}
          </span>
        ))}
      </div>
      <div className={styles.rulerLeft} data-testid="ruler-left">
        {verticalTicks.map((tick) => (
          <span
            key={tick.row}
            className={styles.tick}
            style={{ top: tick.px }}
          >
            {tick.showLabel ? tick.row : '\u2013'}
          </span>
        ))}
      </div>
    </>
  );
}
