import { buildPageExportBaseName, buildZipExportName, formatExportDate, sanitizeFilenameSegment } from './exportNaming.ts';

describe('exportNaming', () => {
  it('formats export dates as dd-mm-yyyy', () => {
    expect(formatExportDate(new Date('2026-04-22T15:30:00Z'))).toBe('22-04-2026');
  });

  it('sanitizes filename segments without stripping normal spaces', () => {
    expect(sanitizeFilenameSegment('  Circuit/System  ')).toBe('Circuit-System');
    expect(sanitizeFilenameSegment('   ')).toBe('untitled');
  });

  it('builds page and zip names with the expected prefix order', () => {
    const date = new Date('2026-04-22T15:30:00Z');

    expect(buildPageExportBaseName('Circuit', 'Page One', date)).toBe('Circuit_Page One_22-04-2026');
    expect(buildZipExportName('Circuit', date)).toBe('Circuit_export_22-04-2026.zip');
  });
});
