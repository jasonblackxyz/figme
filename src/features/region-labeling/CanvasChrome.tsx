import { useMemo, useState } from 'react';
import { useDocumentStore } from '@stores/documentStore.ts';
import { useUiStore } from '@stores/uiStore.ts';
import { useToolStore } from '@stores/toolStore.ts';
import type { RuntimeComponentKind, RuntimeRole, SemanticRegion } from '@primitives/document-model/types.ts';
import { getEffectiveRegionRole } from './runtimeKindMetadata.ts';
import styles from './CanvasChrome.module.css';

export function CanvasChrome() {
  const [filtersOpen, setFiltersOpen] = useState(false);
  const interfaceMode = useUiStore((s) => s.interfaceMode);
  const selectionMode = useUiStore((s) => s.canvasSelectionMode);
  const setSelectionMode = useUiStore((s) => s.setCanvasSelectionMode);
  const overlayVisible = useUiStore((s) => s.regionOverlayVisible);
  const toggleOverlay = useUiStore((s) => s.toggleRegionOverlay);
  const filters = useUiStore((s) => s.regionOverlayFilters);
  const toggleKindFilter = useUiStore((s) => s.toggleRegionOverlayKindFilter);
  const toggleRoleFilter = useUiStore((s) => s.toggleRegionOverlayRoleFilter);
  const clearFilters = useUiStore((s) => s.clearRegionOverlayFilters);
  const activeTool = useToolStore((s) => s.activeTool);
  const doc = useDocumentStore((s) => s.document);
  const activePage = doc.pages.find((p) => p.id === doc.activePageId);
  const regions = useMemo<SemanticRegion[]>(() => {
    if (!activePage?.regions) return [];
    const order = activePage.regionOrder ?? Object.keys(activePage.regions);
    return order.flatMap((id) => {
      const region = activePage.regions?.[id];
      return region ? [region] : [];
    });
  }, [activePage]);

  const filterCounts = useMemo(() => {
    const kinds = new Map<RuntimeComponentKind, number>();
    const roles = new Map<RuntimeRole, number>();
    for (const region of regions) {
      kinds.set(region.componentKind, (kinds.get(region.componentKind) ?? 0) + 1);
      const role = getEffectiveRegionRole(region);
      roles.set(role, (roles.get(role) ?? 0) + 1);
    }
    return {
      kinds: Array.from(kinds.entries()).sort(([a], [b]) => a.localeCompare(b)),
      roles: Array.from(roles.entries()).sort(([a], [b]) => a.localeCompare(b)),
    };
  }, [regions]);

  const activeFilterCount = filters.componentKinds.length + filters.roles.length;
  const regionCount = regions.length;

  // Hide chrome in AI mode — agents work via API.
  if (interfaceMode !== 'human') return null;

  return (
    <div className={styles.chrome} data-component="canvas-chrome" role="toolbar" aria-label="Canvas selection mode">
      <span className={styles.label}>Select</span>
      <div className={styles.segmented} role="group" aria-label="Selection target">
        <button
          type="button"
          className={`${styles.segment} ${selectionMode === 'layers' ? styles.segmentActive : ''}`}
          aria-pressed={selectionMode === 'layers'}
          data-selection-mode="layers"
          onClick={() => setSelectionMode('layers')}
        >
          Layers
        </button>
        <button
          type="button"
          className={`${styles.segment} ${selectionMode === 'regions' ? styles.segmentActive : ''}`}
          aria-pressed={selectionMode === 'regions'}
          data-selection-mode="regions"
          onClick={() => setSelectionMode('regions')}
        >
          Regions
        </button>
      </div>

      <div className={styles.divider} aria-hidden="true" />

      <button
        type="button"
        className={`${styles.toggle} ${overlayVisible ? styles.toggleActive : ''}`}
        aria-pressed={overlayVisible}
        onClick={toggleOverlay}
        data-action="toggle-region-overlay"
      >
        Region overlay {overlayVisible ? 'on' : 'off'}
      </button>

      <div className={styles.filterWrap}>
        <button
          type="button"
          className={`${styles.toggle} ${activeFilterCount > 0 ? styles.toggleActive : ''}`}
          aria-expanded={filtersOpen}
          aria-controls="region-overlay-filter-popover"
          onClick={() => setFiltersOpen((open) => !open)}
          data-action="toggle-region-filter-popover"
        >
          Filters{activeFilterCount > 0 ? ` (${activeFilterCount})` : ''}
        </button>

        {filtersOpen && (
          <div
            id="region-overlay-filter-popover"
            className={styles.filterPopover}
            data-component="region-overlay-filters"
          >
            <div className={styles.filterHeader}>
              <span className={styles.filterTitle}>Overlay Filters</span>
              <button
                type="button"
                className={styles.clearButton}
                onClick={clearFilters}
                disabled={activeFilterCount === 0}
                data-action="clear-region-filters"
              >
                Clear
              </button>
            </div>

            <FilterGroup
              title="Kind"
              emptyLabel="No region kinds"
              entries={filterCounts.kinds}
              selected={filters.componentKinds}
              onToggle={toggleKindFilter}
              dataPrefix="kind"
            />
            <FilterGroup
              title="Role"
              emptyLabel="No region roles"
              entries={filterCounts.roles}
              selected={filters.roles}
              onToggle={toggleRoleFilter}
              dataPrefix="role"
            />
          </div>
        )}
      </div>

      <span className={styles.count} data-status="region-count">
        {regionCount} regions
        {activeTool === 'region-paint' && ' · paint mode'}
      </span>
    </div>
  );
}

interface FilterGroupProps<T extends string> {
  title: string;
  emptyLabel: string;
  entries: Array<[T, number]>;
  selected: readonly T[];
  onToggle: (value: T) => void;
  dataPrefix: string;
}

function FilterGroup<T extends string>({
  title,
  emptyLabel,
  entries,
  selected,
  onToggle,
  dataPrefix,
}: FilterGroupProps<T>) {
  const selectedSet = new Set(selected);

  return (
    <div className={styles.filterGroup}>
      <span className={styles.filterGroupTitle}>{title}</span>
      {entries.length === 0 ? (
        <span className={styles.emptyFilter}>{emptyLabel}</span>
      ) : (
        <div className={styles.filterOptions}>
          {entries.map(([value, count]) => (
            <button
              key={value}
              type="button"
              className={`${styles.filterOption} ${selectedSet.has(value) ? styles.filterOptionActive : ''}`}
              aria-pressed={selectedSet.has(value)}
              onClick={() => onToggle(value)}
              data-filter={`${dataPrefix}:${value}`}
            >
              <span className={styles.filterName}>{value}</span>
              <span className={styles.filterCount}>{count}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
