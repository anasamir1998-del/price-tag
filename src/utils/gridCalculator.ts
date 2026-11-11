import { PageConfig, GridConfig, CalculatedGrid } from '../types';

/**
 * Calculates optimal grid layout for tags on a target page
 */
export function calculateGrid(page: PageConfig, grid: GridConfig): CalculatedGrid {
  const isPortrait = page.orientation === 'portrait';
  const pageWidth = isPortrait ? page.widthMm : page.heightMm;
  const pageHeight = isPortrait ? page.heightMm : page.widthMm;

  const availableWidth = pageWidth - (page.margins.left + page.margins.right);
  const availableHeight = pageHeight - (page.margins.top + page.margins.bottom);

  // If thermal continuous roll, 1 tag per row or column
  if (page.pageSize.startsWith('Roll_')) {
    const cols = Math.max(1, Math.floor((availableWidth + grid.gapXMm) / (grid.tagWidthMm + grid.gapXMm)));
    return {
      columns: cols,
      rows: 1,
      tagsPerPage: cols,
      gridWidthMm: cols * grid.tagWidthMm + (cols - 1) * grid.gapXMm,
      gridHeightMm: grid.tagHeightMm,
      offsetX: page.margins.left,
      offsetY: page.margins.top,
      pageWidthMm: pageWidth,
      pageHeightMm: grid.tagHeightMm + page.margins.top + page.margins.bottom,
    };
  }

  // Standard paper grid math (A4, A3, Letter)
  const columns = Math.max(
    1,
    Math.floor((availableWidth + grid.gapXMm) / (grid.tagWidthMm + grid.gapXMm))
  );
  const rows = Math.max(
    1,
    Math.floor((availableHeight + grid.gapYMm) / (grid.tagHeightMm + grid.gapYMm))
  );

  const tagsPerPage = columns * rows;
  const gridWidthMm = columns * grid.tagWidthMm + (columns - 1) * grid.gapXMm;
  const gridHeightMm = rows * grid.tagHeightMm + (rows - 1) * grid.gapYMm;

  // Center grid on page if configured, else use left/top margins
  let offsetX = page.margins.left;
  let offsetY = page.margins.top;

  if (grid.centerGridOnPage) {
    offsetX = Math.max(0, (pageWidth - gridWidthMm) / 2);
    offsetY = Math.max(0, (pageHeight - gridHeightMm) / 2);
  }

  return {
    columns,
    rows,
    tagsPerPage,
    gridWidthMm,
    gridHeightMm,
    offsetX,
    offsetY,
    pageWidthMm: pageWidth,
    pageHeightMm: pageHeight,
  };
}

/**
 * Calculates page count for a list of items given tagsPerPage
 */
export function calculatePageCount(totalItems: number, tagsPerPage: number): number {
  if (tagsPerPage <= 0) return 1;
  return Math.max(1, Math.ceil(totalItems / tagsPerPage));
}
