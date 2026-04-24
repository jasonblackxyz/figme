const INVALID_FILENAME_CHARS = /[<>:"/\\|?*\u0000-\u001f]/g;
const TRAILING_DOTS = /\.+$/g;

export function formatExportDate(date: Date = new Date()): string {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = String(date.getFullYear());
  return `${day}-${month}-${year}`;
}

export function sanitizeFilenameSegment(value: string, fallback = 'untitled'): string {
  const sanitized = value
    .trim()
    .replace(INVALID_FILENAME_CHARS, '-')
    .replace(/\s+/g, ' ')
    .replace(TRAILING_DOTS, '')
    .trim();

  return sanitized || fallback;
}

export function buildPageExportBaseName(
  designName: string,
  pageName: string,
  date: Date = new Date(),
): string {
  const safeDesignName = sanitizeFilenameSegment(designName, 'untitled');
  const safePageName = sanitizeFilenameSegment(pageName, 'page');
  return `${safeDesignName}_${safePageName}_${formatExportDate(date)}`;
}

export function buildZipExportName(designName: string, date: Date = new Date()): string {
  const safeDesignName = sanitizeFilenameSegment(designName, 'untitled');
  return `${safeDesignName}_export_${formatExportDate(date)}.zip`;
}
