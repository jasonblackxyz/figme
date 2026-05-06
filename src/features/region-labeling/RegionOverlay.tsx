import { useMemo, useState } from 'react';
import type { CSSProperties } from 'react';
import type { GridConfig } from '@primitives/grid-engine/types.ts';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import type { RuntimeComponentKind, SemanticRegion } from '@primitives/document-model/types.ts';
import { regionColorForKind } from './regionColors.ts';
import styles from './RegionOverlay.module.css';

interface RegionOverlayProps {
  gridConfig: GridConfig;
  panX: number;
  panY: number;
}

interface CellPos { row: number; col: number }

function parseCellKey(key: string): CellPos | null {
  const [rowStr, colStr] = key.split(',');
  if (rowStr === undefined || colStr === undefined) return null;
  const row = Number(rowStr);
  const col = Number(colStr);
  if (Number.isNaN(row) || Number.isNaN(col)) return null;
  return { row, col };
}

export function RegionOverlay({ gridConfig, panX, panY }: RegionOverlayProps) {
  const doc = useDocumentStore((s) => s.document);
  const overlayVisible = useUiStore((s) => s.regionOverlayVisible);
  const selectionMode = useUiStore((s) => s.canvasSelectionMode);
  const selectedRegionId = useUiStore((s) => s.selectedRegionId);
  const setSelectedRegion = useUiStore((s) => s.setSelectedRegion);
  const setSelectedLayers = useUiStore((s) => s.setSelectedLayers);
  const draftCells = useUiStore((s) => s.regionDraftCells);
  const draftTargetId = useUiStore((s) => s.regionDraftTargetId);
  const activeTool = useToolStore((s) => s.activeTool);
  const paintMode = useUiStore((s) => s.regionPaintMode);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const activePage = doc.pages.find((p) => p.id === doc.activePageId);

  const regions = useMemo<SemanticRegion[]>(() => {
    if (!activePage?.regions) return [];
    const order = activePage.regionOrder ?? Object.keys(activePage.regions);
    const list: SemanticRegion[] = [];
    for (const id of order) {
      const region = activePage.regions[id];
      if (region) list.push(region);
    }
    // Render lower-z first so higher-z draws on top
    list.sort((a, b) => (a.z ?? 0) - (b.z ?? 0));
    return list;
  }, [activePage]);

  if (!activePage) return null;

  const isPaintTool = activeTool === 'region-paint';
  const isRegionsClickable = isPaintTool || selectionMode === 'regions';
  const showRegions = overlayVisible || isPaintTool;

  // Hide the region currently being repainted so the draft preview is the source of truth.
  const visibleRegions = draftTargetId
    ? regions.filter((r) => r.id !== draftTargetId)
    : regions;

  const draftPositions: CellPos[] = [];
  for (const key of draftCells) {
    const cell = parseCellKey(key);
    if (cell) draftPositions.push(cell);
  }

  const cw = gridConfig.cellWidth;
  const ch = gridConfig.cellHeight;

  return (
    <div className={styles.layer} aria-hidden={!showRegions}>
      {showRegions && visibleRegions.map((region) => {
        const color = regionColorForKind(region.componentKind as RuntimeComponentKind);
        const style: CSSProperties = {
          left: region.shape.rect.col * cw + panX,
          top: region.shape.rect.row * ch + panY,
          width: region.shape.rect.width * cw,
          height: region.shape.rect.height * ch,
          ['--region-color' as string]: color,
          ['--region-fill' as string]: `${color}1f`,
          ['--region-fill-strong' as string]: `${color}33`,
        };
        const isSelected = selectedRegionId === region.id;
        const labelText = region.semanticId
          ? `${region.semanticId} · ${region.componentKind}`
          : region.componentKind;
        return (
          <button
            key={region.id}
            type="button"
            className={`${styles.region} ${isSelected ? styles.regionSelected : ''}`}
            data-region-id={region.id}
            data-component-kind={region.componentKind}
            data-semantic-id={region.semanticId ?? ''}
            data-role={region.role ?? ''}
            data-z={region.z ?? 0}
            disabled={!isRegionsClickable}
            style={{ ...style, pointerEvents: isRegionsClickable ? 'auto' : 'none' }}
            onClick={(event) => {
              event.stopPropagation();
              if (!isRegionsClickable) return;
              setSelectedRegion(region.id);
              setSelectedLayers([]);
            }}
            onMouseEnter={() => setHoveredId(region.id)}
            onMouseLeave={() => setHoveredId((cur) => (cur === region.id ? null : cur))}
            aria-label={`Region ${labelText}`}
          >
            <span className={styles.label}>{labelText}</span>
            {hoveredId === region.id && (
              <span className={styles.tooltip}>
                {region.componentKind}
                {region.role ? ` • ${region.role}` : ''}
                {' • '}
                {region.shape.rect.width}×{region.shape.rect.height}
              </span>
            )}
            {region.shape.exclude?.map((cell, idx) => (
              <span
                key={`exclude-${idx}`}
                className={styles.regionExclude}
                style={{
                  left: (cell.col - region.shape.rect.col) * cw,
                  top: (cell.row - region.shape.rect.row) * ch,
                  width: cw,
                  height: ch,
                }}
                aria-hidden="true"
              />
            ))}
          </button>
        );
      })}

      {isPaintTool && draftPositions.length > 0 && (
        <DraftPreview
          cells={draftPositions}
          panX={panX}
          panY={panY}
          gridConfig={gridConfig}
          paintMode={paintMode}
          targetIsExisting={draftTargetId != null}
        />
      )}
    </div>
  );
}

interface DraftPreviewProps {
  cells: CellPos[];
  panX: number;
  panY: number;
  gridConfig: GridConfig;
  paintMode: 'add' | 'erase';
  targetIsExisting: boolean;
}

function DraftPreview({ cells, panX, panY, gridConfig, paintMode, targetIsExisting }: DraftPreviewProps) {
  const cw = gridConfig.cellWidth;
  const ch = gridConfig.cellHeight;
  let minRow = Infinity;
  let minCol = Infinity;
  for (const cell of cells) {
    if (cell.row < minRow) minRow = cell.row;
    if (cell.col < minCol) minCol = cell.col;
  }
  const left = minCol * cw + panX;
  const top = minRow * ch + panY;

  return (
    <>
      {cells.map((cell) => (
        <div
          key={`draft-${cell.row}-${cell.col}`}
          className={styles.draftCell}
          style={{
            left: cell.col * cw + panX,
            top: cell.row * ch + panY,
            width: cw,
            height: ch,
          }}
          data-region-draft-cell="true"
        />
      ))}
      <div
        className={styles.draftHint}
        style={{ left, top }}
        data-component="region-draft-hint"
      >
        {targetIsExisting ? 'Editing region' : 'New region'} · {cells.length} cells ·
        Mode: {paintMode} · Enter to label · Esc to cancel
      </div>
    </>
  );
}

