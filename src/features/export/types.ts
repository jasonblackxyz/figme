export type ExportFormat = 'png' | 'html' | 'figmii' | 'gridspec' | 'markdown';

export interface ExportBundleOptions {
  designName: string;
  selectedPageIds: string[];
  formats: ExportFormat[];
  includeBuffer: boolean;
  date?: Date;
}
