/**
 * Dimension Conversion Utilities
 * Standard DPI values:
 * Screen: 96 DPI
 * Print: 300 DPI
 * 1 inch = 25.4 mm
 * 1 mm in Twips (Word format) = 56.7 twips (1 inch = 1440 twips, 1440 / 25.4 = 56.6929)
 */

export const MM_TO_INCH = 1 / 25.4;
export const SCREEN_DPI = 96;
export const PRINT_DPI = 300;
export const TWIPS_PER_MM = 56.6929133858;

/**
 * Convert millimeters to screen pixels (at 96 DPI)
 */
export function mmToPx(mm: number, dpi: number = SCREEN_DPI): number {
  return (mm / 25.4) * dpi;
}

/**
 * Convert screen pixels to millimeters (at 96 DPI)
 */
export function pxToMm(px: number, dpi: number = SCREEN_DPI): number {
  return (px / dpi) * 25.4;
}

/**
 * Convert millimeters to Twips (for Word .docx tables and margins)
 */
export function mmToTwips(mm: number): number {
  return Math.round(mm * TWIPS_PER_MM);
}

/**
 * Convert millimeters to Points (1 pt = 1/72 inch) for PDF
 */
export function mmToPt(mm: number): number {
  return (mm / 25.4) * 72;
}

/**
 * Standard Page Dimensions in Millimeters
 */
export const STANDARD_PAGE_SIZES: Record<string, { widthMm: number; heightMm: number; label: string }> = {
  A4: { widthMm: 210, heightMm: 297, label: 'A4 (210 × 297 مم)' },
  A3: { widthMm: 297, heightMm: 420, label: 'A3 (297 × 420 مم)' },
  A5: { widthMm: 148, heightMm: 210, label: 'A5 (148 × 210 مم)' },
  Letter: { widthMm: 215.9, heightMm: 279.4, label: 'Letter (216 × 279 مم)' },
  Roll_58mm: { widthMm: 58, heightMm: 1000, label: 'رول حراري 58 مم' },
  Roll_80mm: { widthMm: 80, heightMm: 1000, label: 'رول حراري 80 مم' },
  Roll_100mm: { widthMm: 100, heightMm: 1000, label: 'رول حراري 100 مم' },
};
