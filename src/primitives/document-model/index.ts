export type {
  Layer,
  LayerKind,
  BorderBoxProperties,
  TextBlockProperties,
  FigletTextProperties,
  ImageProperties,
  EdgePathProperties,
  ComponentInstanceProperties,
  CustomBorderChars,
  AutoLayoutConfig,
  LayerProperties,
  FigMePage,
  FigMeDocument,
  ComponentDef,
} from './types.ts'
export {
  addLayer,
  removeLayer,
  updateLayer,
  moveLayer,
  reorderLayers,
  addPage,
  removePage,
  setActivePage,
  createComponent,
  instantiateComponent,
  detachComponent,
  createEmptyDocument,
  createEmptyPage,
} from './operations.ts'
export { serializeDocument, deserializeDocument } from './serialization.ts'
export type { ColorOverrideMap } from './colorOverrides.ts'
export { computeColorOverrides } from './colorOverrides.ts'
