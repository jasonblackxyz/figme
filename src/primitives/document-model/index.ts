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
  groupLayers,
  ungroupLayers,
  bringForward,
  sendBackward,
  bringToFront,
  sendToBack,
  moveLayerToGroup,
} from './operations.ts'
export {
  flattenLayerOrder,
  isEffectivelyLocked,
  isEffectivelyHidden,
  getDepth,
} from './hierarchy.ts'
export {
  getPageCanvasSizeInfo,
  applyPageCanvasSizeToGridConfig,
  getVisiblePageContentBounds,
} from './canvasSize.ts'
export {
  DEFAULT_PAGE_BACKGROUND_COLOR,
  getResolvedPageBackgroundColor,
} from './pageBackground.ts'
export { serializeDocument, deserializeDocument } from './serialization.ts'
export type { ColorOverrideMap } from './colorOverrides.ts'
export { computeColorOverrides } from './colorOverrides.ts'
