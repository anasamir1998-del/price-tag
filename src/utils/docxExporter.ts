import {
  Document,
  Packer,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  ImageRun,
  WidthType,
  BorderStyle,
  PageOrientation,
  convertInchesToTwip,
  convertMillimetersToTwip,
} from 'docx';
import { TagTemplate, ProductItem, FieldMapping, PageConfig, GridConfig } from '../types';
import { renderTagToCanvas } from './tagRenderer';
import { calculateGrid } from './gridCalculator';
import { PRINT_DPI, mmToPx, mmToTwips } from './dimensions';

/**
 * Helper to convert canvas to Uint8Array buffer
 */
async function canvasToBuffer(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve) => {
    canvas.toBlob((blob) => {
      if (!blob) {
        resolve(new Uint8Array());
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const arrayBuffer = reader.result as ArrayBuffer;
        resolve(new Uint8Array(arrayBuffer));
      };
      reader.readAsArrayBuffer(blob);
    }, 'image/png');
  });
}

/**
 * Export products to formatted Word (.docx) document
 */
export async function exportToDocx(
  template: TagTemplate,
  items: ProductItem[],
  mappings: FieldMapping[],
  pageConfig: PageConfig,
  gridConfig: GridConfig,
  onProgress?: (progress: number, total: number) => void
): Promise<Blob> {
  const isPortrait = pageConfig.orientation === 'portrait';
  const grid = calculateGrid(pageConfig, gridConfig);
  const totalItems = Math.max(1, items.length);

  const cellWidthTwips = mmToTwips(gridConfig.tagWidthMm);
  const cellHeightTwips = mmToTwips(gridConfig.tagHeightMm);

  const marginTwips = {
    top: mmToTwips(pageConfig.margins.top),
    bottom: mmToTwips(pageConfig.margins.bottom),
    left: mmToTwips(pageConfig.margins.left),
    right: mmToTwips(pageConfig.margins.right),
  };

  const sections: any[] = [];
  let currentItemIndex = 0;

  const noBorder = {
    style: BorderStyle.NONE,
    size: 0,
    color: 'FFFFFF',
  };

  const tableBorders = {
    top: noBorder,
    bottom: noBorder,
    left: noBorder,
    right: noBorder,
    insideHorizontal: noBorder,
    insideVertical: noBorder,
  };

  // Build pages/tables
  while (currentItemIndex < totalItems) {
    const tableRows: TableRow[] = [];

    for (let r = 0; r < grid.rows; r++) {
      if (currentItemIndex >= totalItems && tableRows.length > 0) break;

      const cells: TableCell[] = [];

      for (let c = 0; c < grid.columns; c++) {
        if (currentItemIndex < totalItems) {
          const item = items[currentItemIndex];
          const canvas = await renderTagToCanvas(template, item, mappings, PRINT_DPI);
          const imageBuffer = await canvasToBuffer(canvas);

          cells.push(
            new TableCell({
              width: {
                size: cellWidthTwips,
                type: WidthType.DXA,
              },
              margins: {
                top: 0,
                bottom: 0,
                left: 0,
                right: 0,
              },
              borders: tableBorders,
              children: [
                new Paragraph({
                  children: [
                    new ImageRun({
                      data: imageBuffer,
                      type: 'png',
                      transformation: {
                        width: mmToPx(gridConfig.tagWidthMm, 96),
                        height: mmToPx(gridConfig.tagHeightMm, 96),
                      },
                    }),
                  ],
                }),
              ],
            })
          );

          currentItemIndex++;
          if (onProgress) {
            onProgress(currentItemIndex, totalItems);
          }
        } else {
          // Empty cell placeholder for grid alignment
          cells.push(
            new TableCell({
              width: {
                size: cellWidthTwips,
                type: WidthType.DXA,
              },
              borders: tableBorders,
              children: [new Paragraph({})],
            })
          );
        }
      }

      tableRows.push(
        new TableRow({
          height: {
            value: cellHeightTwips,
            rule: 'exact' as any,
          },
          children: cells,
        })
      );
    }

    const docTable = new Table({
      rows: tableRows,
      borders: tableBorders,
    });

    sections.push({
      properties: {
        page: {
          size: {
            orientation: isPortrait ? PageOrientation.PORTRAIT : PageOrientation.LANDSCAPE,
            width: mmToTwips(isPortrait ? pageConfig.widthMm : pageConfig.heightMm),
            height: mmToTwips(isPortrait ? pageConfig.heightMm : pageConfig.widthMm),
          },
          margin: marginTwips,
        },
      },
      children: [docTable],
    });
  }

  const doc = new Document({
    sections,
  });

  return await Packer.toBlob(doc);
}
