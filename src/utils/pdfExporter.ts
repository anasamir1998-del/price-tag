import { jsPDF } from 'jspdf';
import { TagTemplate, ProductItem, FieldMapping, PageConfig, GridConfig, CalculatedGrid } from '../types';
import { renderTagToCanvas } from './tagRenderer';
import { calculateGrid } from './gridCalculator';
import { PRINT_DPI } from './dimensions';

/**
 * Export products to high-resolution print-ready PDF
 */
export async function exportToPdf(
  template: TagTemplate,
  items: ProductItem[],
  mappings: FieldMapping[],
  pageConfig: PageConfig,
  gridConfig: GridConfig,
  onProgress?: (progress: number, total: number) => void
): Promise<Blob> {
  const isPortrait = pageConfig.orientation === 'portrait';
  const pageWidthMm = isPortrait ? pageConfig.widthMm : pageConfig.heightMm;
  const pageHeightMm = isPortrait ? pageConfig.heightMm : pageConfig.widthMm;

  const grid = calculateGrid(pageConfig, gridConfig);
  const totalItems = Math.max(1, items.length);
  const totalPages = Math.max(1, Math.ceil(totalItems / grid.tagsPerPage));

  const doc = new jsPDF({
    orientation: isPortrait ? 'portrait' : 'landscape',
    unit: 'mm',
    format: [pageWidthMm, pageHeightMm],
    compress: true,
  });

  let currentItemIndex = 0;

  for (let pageIdx = 0; pageIdx < totalPages; pageIdx++) {
    if (pageIdx > 0) {
      doc.addPage([pageWidthMm, pageHeightMm], isPortrait ? 'portrait' : 'landscape');
    }

    // Loop through grid rows and columns
    for (let r = 0; r < grid.rows; r++) {
      for (let c = 0; c < grid.columns; c++) {
        if (currentItemIndex >= totalItems) break;

        const item = items[currentItemIndex];
        const posX = grid.offsetX + c * (gridConfig.tagWidthMm + gridConfig.gapXMm);
        const posY = grid.offsetY + r * (gridConfig.tagHeightMm + gridConfig.gapYMm);

        // Render tag canvas at 300 DPI
        const tagCanvas = await renderTagToCanvas(template, item, mappings, PRINT_DPI);
        const tagImgData = tagCanvas.toDataURL('image/png');

        // Add tag image into PDF page
        doc.addImage(
          tagImgData,
          'PNG',
          posX,
          posY,
          gridConfig.tagWidthMm,
          gridConfig.tagHeightMm,
          undefined,
          'FAST'
        );

        // Draw crop marks if enabled
        if (gridConfig.cropMarks) {
          drawCropMarks(doc, posX, posY, gridConfig.tagWidthMm, gridConfig.tagHeightMm, gridConfig);
        }

        currentItemIndex++;
        if (onProgress) {
          onProgress(currentItemIndex, totalItems);
        }
      }
      if (currentItemIndex >= totalItems) break;
    }
  }

  return doc.output('blob');
}

/**
 * Draw professional subtle crop marks at the corners of each tag
 */
function drawCropMarks(
  doc: jsPDF,
  x: number,
  y: number,
  w: number,
  h: number,
  gridConfig: GridConfig
) {
  const markLen = gridConfig.cropMarkLengthMm || 3;
  const gap = 1; // distance from tag edge

  doc.setDrawColor(gridConfig.cropMarkColor || '#94a3b8');
  doc.setLineWidth(0.15);

  // Top-Left Corner
  doc.line(x - gap - markLen, y, x - gap, y); // Horizontal left
  doc.line(x, y - gap - markLen, x, y - gap); // Vertical top

  // Top-Right Corner
  doc.line(x + w + gap, y, x + w + gap + markLen, y); // Horizontal right
  doc.line(x + w, y - gap - markLen, x + w, y - gap); // Vertical top

  // Bottom-Left Corner
  doc.line(x - gap - markLen, y + h, x - gap, y + h); // Horizontal left
  doc.line(x, y + h + gap, x, y + h + gap + markLen); // Vertical bottom

  // Bottom-Right Corner
  doc.line(x + w + gap, y + h, x + w + gap + markLen, y + h); // Horizontal right
  doc.line(x + w, y + h + gap, x + w, y + h + gap + markLen); // Vertical bottom
}
