import { useEffect, useId, useMemo, useState } from 'react';
import {
  RUNTIME_TIER_1_COMPONENT_KINDS,
  RUNTIME_TIER_2_COMPONENT_KINDS,
  type RuntimeComponentKind,
} from '@primitives/document-model/types.ts';
import styles from './RuntimeComponentKindPicker.module.css';

interface KindGroup {
  label: string;
  description: string;
  kinds: readonly RuntimeComponentKind[];
}

const KIND_GROUPS: KindGroup[] = [
  {
    label: 'Tier 1',
    description: 'fully implemented',
    kinds: RUNTIME_TIER_1_COMPONENT_KINDS,
  },
  {
    label: 'Tier 2',
    description: 'reserved placeholder',
    kinds: RUNTIME_TIER_2_COMPONENT_KINDS,
  },
];

interface RuntimeComponentKindPickerProps {
  value: RuntimeComponentKind;
  onChange: (kind: RuntimeComponentKind) => void;
  id?: string;
  dataProperty?: string;
}

export function RuntimeComponentKindPicker({
  value,
  onChange,
  id,
  dataProperty = 'componentKind',
}: RuntimeComponentKindPickerProps) {
  const generatedId = useId();
  const inputId = id ?? `runtime-kind-picker-${generatedId}`;
  const listboxId = `${inputId}-listbox`;
  const [query, setQuery] = useState<string>(value);
  const [open, setOpen] = useState(false);
  const [activeValue, setActiveValue] = useState<RuntimeComponentKind>(value);

  useEffect(() => {
    setQuery(value);
    setActiveValue(value);
  }, [value]);

  const filteredGroups = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return KIND_GROUPS.map((group) => ({
      ...group,
      kinds: normalized
        ? group.kinds.filter((kind) => kind.includes(normalized))
        : group.kinds,
    })).filter((group) => group.kinds.length > 0);
  }, [query]);

  const flatKinds = useMemo(
    () => filteredGroups.flatMap((group) => group.kinds),
    [filteredGroups],
  );

  const commit = (kind: RuntimeComponentKind) => {
    onChange(kind);
    setQuery(kind);
    setActiveValue(kind);
    setOpen(false);
  };

  const moveActive = (direction: 1 | -1) => {
    if (flatKinds.length === 0) return;
    const currentIndex = flatKinds.indexOf(activeValue);
    const nextIndex = currentIndex === -1
      ? direction === 1 ? 0 : flatKinds.length - 1
      : (currentIndex + direction + flatKinds.length) % flatKinds.length;
    setActiveValue(flatKinds[nextIndex]!);
    setOpen(true);
  };

  return (
    <div className={styles.picker}>
      <input
        id={inputId}
        className={styles.input}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-controls={listboxId}
        aria-autocomplete="list"
        aria-activedescendant={open ? `${inputId}-option-${activeValue}` : undefined}
        value={query}
        onFocus={() => setOpen(true)}
        onChange={(event) => {
          setQuery(event.target.value);
          setOpen(true);
        }}
        onKeyDown={(event) => {
          if (event.key === 'ArrowDown') {
            event.preventDefault();
            moveActive(1);
          } else if (event.key === 'ArrowUp') {
            event.preventDefault();
            moveActive(-1);
          } else if (event.key === 'Enter') {
            event.preventDefault();
            if (flatKinds.length > 0) {
              commit(flatKinds.includes(activeValue) ? activeValue : flatKinds[0]!);
            }
          } else if (event.key === 'Escape') {
            setQuery(value);
            setActiveValue(value);
            setOpen(false);
          }
        }}
        onBlur={() => {
          window.setTimeout(() => {
            setQuery(value);
            setActiveValue(value);
            setOpen(false);
          }, 0);
        }}
        data-property={dataProperty}
      />

      {open && (
        <div
          id={listboxId}
          className={styles.listbox}
          role="listbox"
          aria-label="Component kind options"
          data-component="runtime-kind-options"
        >
          {filteredGroups.length === 0 ? (
            <div className={styles.empty}>No component kinds match.</div>
          ) : filteredGroups.map((group) => (
            <div key={group.label} className={styles.group}>
              <div className={styles.groupLabel}>
                {group.label}
                <span>{group.description}</span>
              </div>
              {group.kinds.map((kind) => (
                <button
                  key={kind}
                  id={`${inputId}-option-${kind}`}
                  type="button"
                  role="option"
                  aria-selected={kind === value}
                  className={`${styles.option} ${kind === value ? styles.optionSelected : ''} ${kind === activeValue ? styles.optionActive : ''}`}
                  onMouseEnter={() => setActiveValue(kind)}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => commit(kind)}
                  data-kind-option={kind}
                >
                  {kind}
                </button>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
