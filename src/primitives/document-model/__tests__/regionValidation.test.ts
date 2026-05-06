import { validateRegionAuthoring } from '@primitives/document-model/regionValidation.ts';
import type { SemanticRegion } from '@primitives/document-model/types.ts';

function makeRegion(overrides: Partial<SemanticRegion> = {}): SemanticRegion {
  return {
    id: 'r1',
    componentKind: 'frame',
    shape: { rect: { col: 0, row: 0, width: 4, height: 4 } },
    ...overrides,
  };
}

describe('validateRegionAuthoring', () => {
  it('flags text-input without value binding', () => {
    const diagnostics = validateRegionAuthoring(makeRegion({ componentKind: 'text-input' }));
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          severity: 'error',
          code: 'INPUT_WITHOUT_VALUE_BINDING',
        }),
      ]),
    );
  });

  it('passes when text-input has a value binding plus interaction', () => {
    const diagnostics = validateRegionAuthoring(
      makeRegion({
        componentKind: 'text-input',
        bindings: [{ slot: 'value', path: 'search.query' }],
        interactions: [{ id: 'submitQuery', action: { kind: 'submitQuery' } }],
      }),
    );
    expect(diagnostics.find((d) => d.code === 'INPUT_WITHOUT_VALUE_BINDING')).toBeUndefined();
  });

  it('warns about button without interaction', () => {
    const diagnostics = validateRegionAuthoring(makeRegion({ componentKind: 'button' }));
    expect(diagnostics).toEqual(
      expect.arrayContaining([expect.objectContaining({ code: 'BUTTON_WITHOUT_INTERACTION' })]),
    );
  });

  it('flags an empty shape', () => {
    const diagnostics = validateRegionAuthoring(
      makeRegion({ shape: { rect: { col: 0, row: 0, width: 0, height: 0 } } }),
    );
    expect(diagnostics).toEqual(expect.arrayContaining([expect.objectContaining({ code: 'EMPTY_SHAPE' })]));
  });

  it('warns when runtime region has no behavior', () => {
    const diagnostics = validateRegionAuthoring(makeRegion({ componentKind: 'frame' }));
    expect(diagnostics).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ code: 'RUNTIME_REGION_WITHOUT_BEHAVIOR' }),
      ]),
    );
  });

  it('does not warn when role is decoration', () => {
    const diagnostics = validateRegionAuthoring(
      makeRegion({ componentKind: 'frame', role: 'decoration' }),
    );
    expect(diagnostics.find((d) => d.code === 'RUNTIME_REGION_WITHOUT_BEHAVIOR')).toBeUndefined();
  });
});
