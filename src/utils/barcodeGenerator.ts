import bwipjs from 'bwip-js';
import QRCode from 'qrcode';
import { BarcodeType } from '../types';

/**
 * Generate a barcode or QR code as an image data URL (PNG)
 */
export async function generateBarcodeDataUrl(
  text: string,
  type: BarcodeType = 'code128',
  options: {
    width?: number;
    height?: number;
    includeText?: boolean;
    color?: string;
    bgColor?: string;
    scale?: number;
  } = {}
): Promise<string> {
  const safeText = String(text || '123456789012').trim();
  const includeText = options.includeText ?? true;
  const scale = options.scale || 3;

  if (type === 'qrcode') {
    try {
      const isTransparent = !options.bgColor || options.bgColor === 'transparent';
      return await QRCode.toDataURL(safeText, {
        errorCorrectionLevel: 'M',
        margin: 1,
        color: {
          dark: options.color || '#000000',
          light: isTransparent ? '#00000000' : (options.bgColor || '#ffffff'),
        },
        scale: scale * 4,
      });
    } catch (e) {
      console.warn('QR Code generation error, falling back:', e);
      return '';
    }
  }

  // Handle 1D barcodes via bwipjs
  try {
    const canvas = document.createElement('canvas');
    let bcid: string = 'code128';

    switch (type) {
      case 'ean13':
        bcid = 'ean13';
        break;
      case 'ean8':
        bcid = 'ean8';
        break;
      case 'upca':
        bcid = 'upca';
        break;
      case 'code39':
        bcid = 'code39';
        break;
      case 'code128':
      default:
        bcid = 'code128';
        break;
    }

    // Sanitize text for specific barcode requirements
    let validatedText = safeText;
    if (bcid === 'ean13') {
      // EAN-13 requires 12 or 13 digits
      const digitsOnly = safeText.replace(/\D/g, '');
      if (digitsOnly.length >= 12) {
        validatedText = digitsOnly.substring(0, 12);
      } else {
        validatedText = digitsOnly.padEnd(12, '0');
      }
    } else if (bcid === 'ean8') {
      const digitsOnly = safeText.replace(/\D/g, '');
      if (digitsOnly.length >= 7) {
        validatedText = digitsOnly.substring(0, 7);
      } else {
        validatedText = digitsOnly.padEnd(7, '0');
      }
    }

    const hexColor = (options.color || '#000000').replace('#', '');
    const bwipOptions: any = {
      bcid: bcid,
      text: validatedText,
      scale: scale,
      height: 12, // Bar height in millimeters
      includetext: includeText,
      textxalign: 'center',
      textsize: 10,
      barcolor: hexColor,
      textcolor: hexColor,
    };

    // If background color is specified and not transparent, set backgroundcolor
    if (options.bgColor && options.bgColor !== 'transparent') {
      bwipOptions.backgroundcolor = options.bgColor.replace('#', '');
    }

    bwipjs.toCanvas(canvas, bwipOptions);

    return canvas.toDataURL('image/png');
  } catch (err) {
    console.warn(`Barcode generation failed for ${type} with text "${safeText}". Falling back to code128.`, err);
    try {
      const hexColor = (options.color || '#000000').replace('#', '');
      const canvas = document.createElement('canvas');
      const fallbackOptions: any = {
        bcid: 'code128',
        text: safeText,
        scale: scale,
        height: 10,
        includetext: includeText,
        textxalign: 'center',
        barcolor: hexColor,
        textcolor: hexColor,
      };
      if (options.bgColor && options.bgColor !== 'transparent') {
        fallbackOptions.backgroundcolor = options.bgColor.replace('#', '');
      }
      bwipjs.toCanvas(canvas, fallbackOptions);
      return canvas.toDataURL('image/png');
    } catch {
      return '';
    }
  }
}
