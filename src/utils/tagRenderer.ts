import { TagTemplate, TagElement, ProductItem, FieldMapping } from '../types';
import { mmToPx, PRINT_DPI, SCREEN_DPI } from './dimensions';
import { generateBarcodeDataUrl } from './barcodeGenerator';
import { downloadFile } from './fileDownloader';

const OPTIONAL_DYNAMIC_FIELDS = new Set(['old_price', 'discount_percentage']);
const OLD_PRICE_COLUMN_KEYWORDS = ['سابق', 'قبل', 'قديم', 'old', 'before', 'was', 'prev', 'original'];

function isValidMappedColumnForField(field: string, fileColumn: string): boolean {
  const normalized = String(fileColumn || '').trim().toLowerCase();
  if (!normalized) return false;
  const isOldCol = OLD_PRICE_COLUMN_KEYWORDS.some((kw) => normalized.includes(kw));
  if (field === 'old_price') return isOldCol;
  if (field === 'price') return !isOldCol;
  return true;
}

function isZeroOrEmptyOptionalValue(raw: string): boolean {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '-') return true;
  return /^-?\d+(\.\d+)?%?$/.test(trimmed) && parseFloat(trimmed) <= 0;
}

/**
 * Checks whether a tag element represents the optional "price before discount" field.
 */
export function isOldPriceElement(element: TagElement): boolean {
  return Boolean(element.isDynamic && element.fieldName === 'old_price');
}

/**
 * Returns a template copy with updated optional old-price visibility.
 */
export function withOldPriceVisibility(template: TagTemplate, showOldPrice: boolean): TagTemplate {
  return template.showOldPrice === showOldPrice ? template : { ...template, showOldPrice };
}

/**
 * Determines whether a tag element should be rendered/printed given template settings and active item.
 */
export function shouldRenderTagElement(
  element: TagElement,
  template: TagTemplate,
  item?: ProductItem,
  mappings?: FieldMapping[]
): boolean {
  if (element.hidden) return false;
  if (template.showOldPrice === false && isOldPriceElement(element)) {
    return false;
  }
  if (item && element.isDynamic && element.fieldName && OPTIONAL_DYNAMIC_FIELDS.has(element.fieldName)) {
    if (!resolveElementText(element, item, mappings)) {
      return false;
    }
  }
  return true;
}

/**
 * Computes updated product fields (price, old_price, discount_percentage, quantity, name)
 * while synchronizing mapped columns and common Arabic alias keys.
 */
export function buildUpdatedProductPrices(
  product: ProductItem,
  updates: {
    price?: string;
    oldPrice?: string;
    printQuantity?: number;
    productName?: string;
  },
  mappings?: FieldMapping[]
): ProductItem {
  const updated: ProductItem = { ...product };

  const syncAliasKeys = (field: string, value: string, aliases: string[]) => {
    updated[field] = value;
    for (const key of aliases) {
      if (key in updated) {
        updated[key] = value;
      }
    }
    const mappedCol = mappings?.find((m) => m.templateField === field)?.fileColumn;
    if (mappedCol && isValidMappedColumnForField(field, mappedCol) && mappedCol in updated) {
      updated[mappedCol] = value;
    }
  };

  if (updates.productName !== undefined) {
    syncAliasKeys('product_name', updates.productName, ['اسم المنتج', 'اسم الصنف', 'المنتج', 'name']);
  }
  if (updates.price !== undefined) {
    syncAliasKeys('price', updates.price, ['السعر', 'سعر البيع']);
    updated['السعر'] = updates.price;
  }
  if (updates.oldPrice !== undefined) {
    syncAliasKeys('old_price', updates.oldPrice, ['السعر السابق', 'السعر قبل الخصم']);
    updated['السعر السابق'] = updates.oldPrice;
  }
  if (updates.printQuantity !== undefined) {
    updated.print_quantity = updates.printQuantity;
    updated.quantity = updates.printQuantity;
  }

  if (updates.price !== undefined || updates.oldPrice !== undefined) {
    const currentP = parseFloat(String(updated.price ?? updated['السعر'] ?? 0));
    const oldP = parseFloat(String(updated.old_price ?? updated['السعر السابق'] ?? 0));
    const calculatedDiscount =
      oldP > 0 && currentP > 0 && oldP > currentP ? `${Math.round(((oldP - currentP) / oldP) * 100)}%` : '';
    syncAliasKeys('discount_percentage', calculatedDiscount, ['نسبة الخصم', 'discount']);
  }

  return updated;
}

/**
 * Replaces dynamic variables in element text with actual product item values
 */
export function resolveElementText(
  element: TagElement,
  item?: ProductItem,
  mappings?: FieldMapping[]
): string {
  if (!element.isDynamic && element.text !== undefined) {
    return element.text;
  }

  if (!item) {
    return element.fallbackValue || element.text || '';
  }

  const fieldName = element.fieldName || '';
  let val = '';

  if (fieldName === 'old_price') {
    if (item.old_price !== undefined && item.old_price !== null) {
      val = String(item.old_price);
    } else {
      const mapping = mappings?.find((m) => m.templateField === 'old_price');
      if (
        mapping &&
        isValidMappedColumnForField('old_price', mapping.fileColumn) &&
        item[mapping.fileColumn] !== undefined &&
        item[mapping.fileColumn] !== null
      ) {
        val = String(item[mapping.fileColumn]);
      } else if (item['السعر السابق'] !== undefined && item['السعر السابق'] !== null) {
        val = String(item['السعر السابق']);
      } else if (item['السعر قبل الخصم'] !== undefined && item['السعر قبل الخصم'] !== null) {
        val = String(item['السعر قبل الخصم']);
      }
    }
  } else if (fieldName === 'price') {
    if (item.price !== undefined && item.price !== null && String(item.price) !== '') {
      val = String(item.price);
    } else {
      const mapping = mappings?.find((m) => m.templateField === 'price');
      if (
        mapping &&
        isValidMappedColumnForField('price', mapping.fileColumn) &&
        item[mapping.fileColumn] !== undefined &&
        item[mapping.fileColumn] !== null
      ) {
        val = String(item[mapping.fileColumn]);
      } else if (item['السعر'] !== undefined && item['السعر'] !== null) {
        val = String(item['السعر']);
      } else if (item['سعر البيع'] !== undefined && item['سعر البيع'] !== null) {
        val = String(item['سعر البيع']);
      }
    }
  } else {
    // Look up mapped column name first
    if (mappings && mappings.length > 0) {
      const mapping = mappings.find((m) => m.templateField === fieldName);
      if (
        mapping &&
        isValidMappedColumnForField(fieldName, mapping.fileColumn) &&
        item[mapping.fileColumn] !== undefined &&
        item[mapping.fileColumn] !== null
      ) {
        val = String(item[mapping.fileColumn]);
      }
    }

    // Fallback to direct key matching
    if (!val && item[fieldName] !== undefined && item[fieldName] !== null) {
      val = String(item[fieldName]);
    }

    // Fallback to common Arabic keys if not found
    if (!val) {
      if (fieldName === 'product_name' && (item['اسم المنتج'] || item['اسم الصنف'] || item['المنتج'] || item['name'])) {
        val = String(item['اسم المنتج'] || item['اسم الصنف'] || item['المنتج'] || item['name']);
      } else if (fieldName === 'barcode' && (item['الباركود'] || item['كود'] || item['barcode'])) {
        val = String(item['الباركود'] || item['كود'] || item['barcode']);
      } else if (fieldName === 'unit' && (item['الوحدة'] || item['unit'])) {
        val = String(item['الوحدة'] || item['unit']);
      } else if (fieldName === 'category' && (item['القسم'] || item['التصنيف'] || item['category'] || item['category_id'])) {
        val = String(item['القسم'] || item['التصنيف'] || item['category'] || item['category_id']);
      } else if (fieldName === 'origin' && (item['بلد المنشأ'] || item['المنشأ'] || item['origin'])) {
        val = String(item['بلد المنشأ'] || item['المنشأ'] || item['origin']);
      } else if (fieldName === 'discount_percentage' && (item['نسبة الخصم'] || item['discount'])) {
        val = String(item['نسبة الخصم'] || item['discount']);
      } else if (fieldName === 'description' && (item['المواصفات'] || item['الوصف'] || item['description'])) {
        val = String(item['المواصفات'] || item['الوصف'] || item['description']);
      }
    }
  }

  if (OPTIONAL_DYNAMIC_FIELDS.has(fieldName)) {
    if (isZeroOrEmptyOptionalValue(val)) {
      return '';
    }
  } else if (!val) {
    val = element.fallbackValue || element.text || '';
  }

  const prefix = element.prefix || '';
  const suffix = element.suffix || '';
  return `${prefix}${val}${suffix}`;
}

/**
 * Parses a price string into integer part, decimal part, prefix and suffix.
 * Handles formats like: "12.50", "ر.س 12.50", "12.50 ريال", etc.
 */
function parsePriceWithDecimals(text: string): {
  prefix: string;
  intPart: string;
  decPart: string;
  suffix: string;
} | null {
  // Remove extra whitespace
  const trimmed = text.trim();
  if (!trimmed) return null;

  // Match a number with decimals, possibly surrounded by prefix/suffix text
  const match = trimmed.match(/^(.*?)(\d[\d,]*)[.,](\d{1,2})(.*?)$/);
  if (!match) return null;

  const prefix = match[1].trim();
  const intPart = match[2].replace(/,/g, '');
  const decPart = match[3];
  const suffix = match[4].trim();

  return {
    prefix: prefix ? prefix + ' ' : '',
    intPart,
    decPart,
    suffix: suffix ? ' ' + suffix : '',
  };
}

/**
 * Render a complete price tag to an HTML5 Canvas at target DPI
 */
export async function renderTagToCanvas(
  template: TagTemplate,
  item?: ProductItem,
  mappings?: FieldMapping[],
  dpi: number = PRINT_DPI
): Promise<HTMLCanvasElement> {
  const canvas = document.createElement('canvas');
  const widthPx = Math.round(mmToPx(template.widthMm, dpi));
  const heightPx = Math.round(mmToPx(template.heightMm, dpi));

  canvas.width = widthPx;
  canvas.height = heightPx;

  const ctx = canvas.getContext('2d');
  if (!ctx) return canvas;

  // Smoothing
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // 1. Render Background
  ctx.save();
  if (template.borderRadius && template.borderRadius > 0) {
    const radiusPx = mmToPx(template.borderRadius, dpi);
    ctx.beginPath();
    ctx.roundRect(0, 0, widthPx, heightPx, radiusPx);
    ctx.clip();
  }

  ctx.fillStyle = template.backgroundColor || '#ffffff';
  ctx.fillRect(0, 0, widthPx, heightPx);

  // Background Watermark Image if present
  if (template.backgroundImage) {
    try {
      const bgImg = new Image();
      bgImg.src = template.backgroundImage;
      const scale = template.watermarkScale !== undefined ? template.watermarkScale : 0.7;
      if (bgImg.complete) {
        ctx.save();
        ctx.globalAlpha = template.watermarkOpacity !== undefined ? template.watermarkOpacity : 0.15;
        const imgRatio = bgImg.width / (bgImg.height || 1);
        let dw = widthPx * scale;
        let dh = dw / imgRatio;
        if (dh > heightPx * scale) {
          dh = heightPx * scale;
          dw = dh * imgRatio;
        }
        const dx = (widthPx - dw) / 2;
        const dy = (heightPx - dh) / 2;
        ctx.drawImage(bgImg, dx, dy, dw, dh);
        ctx.restore();
      } else {
        await new Promise<void>((resolve) => {
          bgImg.onload = () => {
            ctx.save();
            ctx.globalAlpha = template.watermarkOpacity !== undefined ? template.watermarkOpacity : 0.15;
            const imgRatio = bgImg.width / (bgImg.height || 1);
            let dw = widthPx * scale;
            let dh = dw / imgRatio;
            if (dh > heightPx * scale) {
              dh = heightPx * scale;
              dw = dh * imgRatio;
            }
            const dx = (widthPx - dw) / 2;
            const dy = (heightPx - dh) / 2;
            ctx.drawImage(bgImg, dx, dy, dw, dh);
            ctx.restore();
            resolve();
          };
          bgImg.onerror = () => resolve();
        });
      }
    } catch (e) {}
  }

  // Background Border if present
  if (template.borderWidth && template.borderWidth > 0) {
    const borderWidthPx = mmToPx(template.borderWidth, dpi);
    ctx.lineWidth = borderWidthPx;
    ctx.strokeStyle = template.borderColor || '#e2e8f0';
    ctx.strokeRect(borderWidthPx / 2, borderWidthPx / 2, widthPx - borderWidthPx, heightPx - borderWidthPx);
  }
  ctx.restore();

  // 2. Sort Elements by zIndex
  const sortedElements = [...template.elements]
    .filter((el) => shouldRenderTagElement(el, template, item, mappings))
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  // 3. Render Each Element
  for (const el of sortedElements) {
    ctx.save();

    const leftPx = mmToPx(el.left, dpi);
    const topPx = mmToPx(el.top, dpi);
    const widthElPx = mmToPx(el.width, dpi);
    const heightElPx = mmToPx(el.height, dpi);

    // Apply Opacity
    if (el.opacity !== undefined) {
      ctx.globalAlpha = el.opacity;
    }

    // Apply Rotation
    if (el.rotation) {
      ctx.translate(leftPx + widthElPx / 2, topPx + heightElPx / 2);
      ctx.rotate((el.rotation * Math.PI) / 180);
      ctx.translate(-(leftPx + widthElPx / 2), -(topPx + heightElPx / 2));
    }

    // Apply Shadow
    if (el.shadow) {
      ctx.shadowColor = el.shadow.color;
      ctx.shadowBlur = mmToPx(el.shadow.blur, dpi);
      ctx.shadowOffsetX = mmToPx(el.shadow.offsetX, dpi);
      ctx.shadowOffsetY = mmToPx(el.shadow.offsetY, dpi);
    }

    switch (el.type) {
      case 'shape':
      case 'badge': {
        const radiusPx = el.borderRadius ? mmToPx(el.borderRadius, dpi) : 0;
        ctx.fillStyle = el.fillColor || (el.type === 'badge' ? '#ef4444' : '#f1f5f9');
        ctx.beginPath();
        if (el.shapeType === 'circle') {
          ctx.ellipse(
            leftPx + widthElPx / 2,
            topPx + heightElPx / 2,
            widthElPx / 2,
            heightElPx / 2,
            0,
            0,
            2 * Math.PI
          );
        } else {
          ctx.roundRect(leftPx, topPx, widthElPx, heightElPx, radiusPx);
        }
        ctx.fill();

        if (el.borderWidth && el.borderWidth > 0) {
          ctx.lineWidth = mmToPx(el.borderWidth, dpi);
          ctx.strokeStyle = el.borderColor || '#000000';
          ctx.stroke();
        }

        // If badge with text
        if (el.type === 'badge' && el.text) {
          ctx.fillStyle = el.textColor || '#ffffff';
          const fontSizePx = mmToPx((el.fontSize || 10) * 0.35, dpi);
          ctx.font = `${el.fontWeight || 'bold'} ${fontSizePx}px ${el.fontFamily || 'Tajawal, sans-serif'}`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          ctx.direction = 'rtl';
          ctx.fillText(el.text, leftPx + widthElPx / 2, topPx + heightElPx / 2);
        }
        break;
      }

      case 'line': {
        ctx.lineWidth = el.borderWidth ? mmToPx(el.borderWidth, dpi) : mmToPx(0.5, dpi);
        ctx.strokeStyle = el.borderColor || el.fillColor || '#cbd5e1';
        ctx.beginPath();
        ctx.moveTo(leftPx, topPx + heightElPx / 2);
        ctx.lineTo(leftPx + widthElPx, topPx + heightElPx / 2);
        ctx.stroke();
        break;
      }

      case 'text':
      case 'price': {
        const textToDraw = resolveElementText(el, item, mappings);
        if (!textToDraw) break;

        // Container background if any
        if (el.fillColor && el.fillColor !== 'transparent') {
          ctx.fillStyle = el.fillColor;
          const radiusPx = el.borderRadius ? mmToPx(el.borderRadius, dpi) : 0;
          ctx.beginPath();
          ctx.roundRect(leftPx, topPx, widthElPx, heightElPx, radiusPx);
          ctx.fill();
        }

        if (el.borderWidth && el.borderWidth > 0) {
          ctx.lineWidth = mmToPx(el.borderWidth, dpi);
          ctx.strokeStyle = el.borderColor || '#000000';
          const radiusPx = el.borderRadius ? mmToPx(el.borderRadius, dpi) : 0;
          ctx.beginPath();
          ctx.roundRect(leftPx, topPx, widthElPx, heightElPx, radiusPx);
          ctx.stroke();
        }

        const fontSizePx = mmToPx((el.fontSize || 14) * 0.35, dpi);
        const weight = el.fontWeight || 'normal';
        const style = el.fontStyle || 'normal';
        const family = el.fontFamily || 'Tajawal, Cairo, sans-serif';

        ctx.font = `${style} ${weight} ${fontSizePx}px ${family}`;
        ctx.fillStyle = el.textColor || '#0f172a';
        ctx.textBaseline = 'middle';
        const posY = topPx + heightElPx / 2;

        const isPriceWithDecimals = (el.type === 'price' || el.smallDecimals) && el.smallDecimals !== false;
        const parsedPrice = isPriceWithDecimals ? parsePriceWithDecimals(textToDraw) : null;

        if (parsedPrice) {
          const mainFont = `${style} ${weight} ${fontSizePx}px ${family}`;
          const decFont = `${style} ${weight} ${fontSizePx * 0.48}px ${family}`;
          const subFont = `${style} ${weight} ${fontSizePx * 0.55}px ${family}`;

          ctx.font = mainFont;
          const intW = ctx.measureText(parsedPrice.intPart).width;

          ctx.font = decFont;
          const decW = ctx.measureText('.' + parsedPrice.decPart).width;

          ctx.font = subFont;
          const prefW = parsedPrice.prefix ? ctx.measureText(parsedPrice.prefix).width : 0;
          const suffW = parsedPrice.suffix ? ctx.measureText(parsedPrice.suffix).width : 0;

          const totalW = prefW + intW + decW + suffW;

          let startX = leftPx;
          if (el.textAlign === 'center') {
            startX = leftPx + (widthElPx - totalW) / 2;
          } else if (el.textAlign === 'left') {
            startX = leftPx;
          } else {
            startX = leftPx + widthElPx - totalW;
          }

          ctx.direction = 'ltr';
          ctx.textAlign = 'left';
          let curX = startX;

          if (parsedPrice.prefix) {
            ctx.font = subFont;
            ctx.fillText(parsedPrice.prefix, curX, posY);
            curX += prefW;
          }

          // Main Integer Part
          ctx.font = mainFont;
          ctx.fillText(parsedPrice.intPart, curX, posY);
          curX += intW;

          // Decimals (Halalas) - smaller font & shifted upwards
          ctx.font = decFont;
          const decY = posY - fontSizePx * 0.22;
          ctx.fillText('.' + parsedPrice.decPart, curX, decY);
          curX += decW;

          if (parsedPrice.suffix) {
            ctx.font = subFont;
            ctx.fillText(parsedPrice.suffix, curX, posY);
            curX += suffW;
          }

          // Strikethrough if old_price / line-through
          if (el.textDecoration === 'line-through') {
            ctx.lineWidth = Math.max(1.5, fontSizePx * 0.08);
            ctx.strokeStyle = el.textColor || '#ef4444';
            ctx.beginPath();
            ctx.moveTo(startX - 2, posY);
            ctx.lineTo(startX + totalW + 2, posY);
            ctx.stroke();
          }
        } else {
          // Auto text align & x position
          let posX = leftPx;
          if (el.textAlign === 'center') {
            ctx.textAlign = 'center';
            posX = leftPx + widthElPx / 2;
          } else if (el.textAlign === 'left') {
            ctx.textAlign = 'left';
            posX = leftPx;
          } else {
            ctx.textAlign = 'right';
            posX = leftPx + widthElPx;
          }

          ctx.direction = 'rtl';

          // Measure & wrap or fit text
          ctx.fillText(textToDraw, posX, posY, widthElPx);

          // Strikethrough if old_price / line-through
          if (el.textDecoration === 'line-through') {
            const metrics = ctx.measureText(textToDraw);
            const textW = Math.min(metrics.width, widthElPx);
            let startLineX = posX;
            if (el.textAlign === 'center') startLineX = posX - textW / 2;
            else if (el.textAlign === 'right') startLineX = posX - textW;

            ctx.lineWidth = Math.max(1.5, fontSizePx * 0.08);
            ctx.strokeStyle = el.textColor || '#ef4444';
            ctx.beginPath();
            ctx.moveTo(startLineX - 2, posY);
            ctx.lineTo(startLineX + textW + 2, posY);
            ctx.stroke();
          }
        }
        break;
      }

      case 'barcode':
      case 'qrcode': {
        const codeText = resolveElementText(el, item, mappings) || (el.barcodeType === 'qrcode' ? 'https://example.com' : '628100123456');
        try {
          const imgUrl = await generateBarcodeDataUrl(codeText, el.barcodeType || 'code128', {
            includeText: el.includeBarcodeText ?? true,
            color: el.barcodeColor || el.textColor || '#000000',
            bgColor: el.barcodeBgColor || el.fillColor || 'transparent',
            scale: 3,
          });

          if (imgUrl) {
            await new Promise<void>((res) => {
              const img = new Image();
              img.onload = () => {
                ctx.drawImage(img, leftPx, topPx, widthElPx, heightElPx);
                res();
              };
              img.onerror = () => res();
              img.src = imgUrl;
            });
          }
        } catch (e) {
          console.warn('Barcode render canvas error:', e);
        }
        break;
      }

      case 'image': {
        if (el.imageUrl) {
          await new Promise<void>((res) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.onload = () => {
              ctx.save();
              const radiusPx = el.borderRadius ? mmToPx(el.borderRadius, dpi) : 0;
              if (radiusPx > 0) {
                ctx.beginPath();
                ctx.roundRect(leftPx, topPx, widthElPx, heightElPx, radiusPx);
                ctx.clip();
              }

              if (el.fillColor && el.fillColor !== 'transparent') {
                ctx.fillStyle = el.fillColor;
                ctx.fillRect(leftPx, topPx, widthElPx, heightElPx);
              }

              ctx.drawImage(img, leftPx, topPx, widthElPx, heightElPx);

              if (el.borderWidth && el.borderWidth > 0) {
                ctx.lineWidth = mmToPx(el.borderWidth, dpi);
                ctx.strokeStyle = el.borderColor || '#000000';
                ctx.beginPath();
                if (radiusPx > 0) {
                  ctx.roundRect(leftPx, topPx, widthElPx, heightElPx, radiusPx);
                } else {
                  ctx.rect(leftPx, topPx, widthElPx, heightElPx);
                }
                ctx.stroke();
              }

              ctx.restore();
              res();
            };
            img.onerror = () => res();
            img.src = el.imageUrl!;
          });
        }
        break;
      }
    }

    ctx.restore();
  }

  return canvas;
}

function escapeXml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function getSvgImageAspectRatio(fit?: 'contain' | 'cover' | 'fill'): string {
  if (fit === 'fill') return 'none';
  if (fit === 'cover') return 'xMidYMid slice';
  return 'xMidYMid meet';
}

/**
 * Render a complete price tag template as a scalable SVG string
 */
export async function renderTagToSvg(
  template: TagTemplate,
  item?: ProductItem,
  mappings?: FieldMapping[]
): Promise<string> {
  const widthPx = Math.round(mmToPx(template.widthMm, SCREEN_DPI));
  const heightPx = Math.round(mmToPx(template.heightMm, SCREEN_DPI));
  const cardRadiusPx = template.borderRadius ? mmToPx(template.borderRadius, SCREEN_DPI) : 0;

  const defsParts: string[] = [
    `<style type="text/css">
      @import url('https://fonts.googleapis.com/css2?family=Almarai:wght@400;700;800&amp;family=Amiri:wght@400;700&amp;family=Cairo:wght@400;600;700;800;900&amp;family=Inter:wght@400;600;700;800&amp;family=Readex+Pro:wght@400;600;700&amp;family=Tajawal:wght@400;500;700;800;900&amp;display=swap');
    </style>`,
  ];

  if (cardRadiusPx > 0) {
    defsParts.push(
      `<clipPath id="card-clip"><rect x="0" y="0" width="${widthPx}" height="${heightPx}" rx="${cardRadiusPx}" ry="${cardRadiusPx}" /></clipPath>`
    );
  }

  const bodyParts: string[] = [];

  // Card background
  bodyParts.push(
    `<rect x="0" y="0" width="${widthPx}" height="${heightPx}" rx="${cardRadiusPx}" ry="${cardRadiusPx}" fill="${escapeXml(template.backgroundColor || '#ffffff')}" />`
  );

  // Background watermark image if present
  if (template.backgroundImage) {
    const scale = template.watermarkScale !== undefined ? template.watermarkScale : 0.7;
    const wmOpacity = template.watermarkOpacity !== undefined ? template.watermarkOpacity : 0.15;
    const wmW = widthPx * scale;
    const wmH = heightPx * scale;
    const wmX = (widthPx - wmW) / 2;
    const wmY = (heightPx - wmH) / 2;
    const safeWmUrl = escapeXml(template.backgroundImage);
    bodyParts.push(
      `<image href="${safeWmUrl}" xlink:href="${safeWmUrl}" x="${wmX}" y="${wmY}" width="${wmW}" height="${wmH}" opacity="${wmOpacity}" preserveAspectRatio="xMidYMid meet" />`
    );
  }

  // Sort visible elements by zIndex
  const sortedElements = [...template.elements]
    .filter((el) => shouldRenderTagElement(el, template, item, mappings))
    .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0));

  for (let i = 0; i < sortedElements.length; i++) {
    const el = sortedElements[i];
    const leftPx = mmToPx(el.left, SCREEN_DPI);
    const topPx = mmToPx(el.top, SCREEN_DPI);
    const widthElPx = mmToPx(el.width, SCREEN_DPI);
    const heightElPx = mmToPx(el.height, SCREEN_DPI);
    const cx = leftPx + widthElPx / 2;
    const cy = topPx + heightElPx / 2;

    const gAttrs: string[] = [];
    if (el.opacity !== undefined && el.opacity !== 1) {
      gAttrs.push(`opacity="${el.opacity}"`);
    }
    if (el.rotation) {
      gAttrs.push(`transform="rotate(${el.rotation} ${cx} ${cy})"`);
    }

    const innerParts: string[] = [];

    switch (el.type) {
      case 'shape':
      case 'badge': {
        const radiusPx = el.borderRadius ? mmToPx(el.borderRadius, SCREEN_DPI) : 0;
        const fill = escapeXml(el.fillColor || (el.type === 'badge' ? '#ef4444' : '#f1f5f9'));
        const strokeAttr =
          el.borderWidth && el.borderWidth > 0
            ? ` stroke="${escapeXml(el.borderColor || '#000000')}" stroke-width="${mmToPx(el.borderWidth, SCREEN_DPI)}"`
            : '';

        if (el.shapeType === 'circle') {
          innerParts.push(
            `<ellipse cx="${cx}" cy="${cy}" rx="${widthElPx / 2}" ry="${heightElPx / 2}" fill="${fill}"${strokeAttr} />`
          );
        } else {
          innerParts.push(
            `<rect x="${leftPx}" y="${topPx}" width="${widthElPx}" height="${heightElPx}" rx="${radiusPx}" ry="${radiusPx}" fill="${fill}"${strokeAttr} />`
          );
        }

        if (el.type === 'badge' && el.text) {
          const fontSizePx = mmToPx((el.fontSize || 10) * 0.35, SCREEN_DPI);
          const fontFamily = escapeXml(el.fontFamily || 'Tajawal, sans-serif');
          const fontWeight = escapeXml(el.fontWeight || 'bold');
          const textColor = escapeXml(el.textColor || '#ffffff');
          innerParts.push(
            `<text x="${cx}" y="${cy}" fill="${textColor}" font-family="${fontFamily}" font-size="${fontSizePx}" font-weight="${fontWeight}" text-anchor="middle" dominant-baseline="central" direction="rtl">${escapeXml(el.text)}</text>`
          );
        }
        break;
      }

      case 'line': {
        const strokeWidth = el.borderWidth ? mmToPx(el.borderWidth, SCREEN_DPI) : mmToPx(0.5, SCREEN_DPI);
        const strokeColor = escapeXml(el.borderColor || el.fillColor || '#cbd5e1');
        innerParts.push(
          `<line x1="${leftPx}" y1="${cy}" x2="${leftPx + widthElPx}" y2="${cy}" stroke="${strokeColor}" stroke-width="${strokeWidth}" />`
        );
        break;
      }

      case 'text':
      case 'price': {
        const textToDraw = resolveElementText(el, item, mappings);
        const radiusPx = el.borderRadius ? mmToPx(el.borderRadius, SCREEN_DPI) : 0;

        if (el.fillColor && el.fillColor !== 'transparent') {
          innerParts.push(
            `<rect x="${leftPx}" y="${topPx}" width="${widthElPx}" height="${heightElPx}" rx="${radiusPx}" ry="${radiusPx}" fill="${escapeXml(el.fillColor)}" />`
          );
        }
        if (el.borderWidth && el.borderWidth > 0) {
          innerParts.push(
            `<rect x="${leftPx}" y="${topPx}" width="${widthElPx}" height="${heightElPx}" rx="${radiusPx}" ry="${radiusPx}" fill="none" stroke="${escapeXml(el.borderColor || '#000000')}" stroke-width="${mmToPx(el.borderWidth, SCREEN_DPI)}" />`
          );
        }

        if (textToDraw) {
          const fontSizePx = mmToPx((el.fontSize || 14) * 0.35, SCREEN_DPI);
          const fontFamily = escapeXml(el.fontFamily || 'Tajawal, Cairo, sans-serif');
          const fontWeight = escapeXml(el.fontWeight || 'normal');
          const fontStyle = escapeXml(el.fontStyle || 'normal');
          const textColor = escapeXml(el.textColor || '#0f172a');
          const textDecoration = el.textDecoration === 'line-through' ? ' text-decoration="line-through"' : '';

          let textX = leftPx + widthElPx - 2;
          let textAnchor = 'start';
          if (el.textAlign === 'center') {
            textX = cx;
            textAnchor = 'middle';
          } else if (el.textAlign === 'left') {
            textX = leftPx + 2;
            textAnchor = 'end';
          }

          innerParts.push(
            `<text x="${textX}" y="${cy}" fill="${textColor}" font-family="${fontFamily}" font-size="${fontSizePx}" font-weight="${fontWeight}" font-style="${fontStyle}" text-anchor="${textAnchor}" dominant-baseline="central" direction="rtl"${textDecoration}>${escapeXml(textToDraw)}</text>`
          );
        }
        break;
      }

      case 'barcode':
      case 'qrcode': {
        const codeText =
          resolveElementText(el, item, mappings) ||
          (el.barcodeType === 'qrcode' ? 'https://example.com' : '628100123456');
        const radiusPx = el.borderRadius ? mmToPx(el.borderRadius, SCREEN_DPI) : 0;
        const bgColor =
          el.barcodeBgColor && el.barcodeBgColor !== 'transparent'
            ? el.barcodeBgColor
            : el.fillColor && el.fillColor !== 'transparent'
            ? el.fillColor
            : '';

        if (bgColor) {
          innerParts.push(
            `<rect x="${leftPx}" y="${topPx}" width="${widthElPx}" height="${heightElPx}" rx="${radiusPx}" ry="${radiusPx}" fill="${escapeXml(bgColor)}" />`
          );
        }

        try {
          const imgUrl = await generateBarcodeDataUrl(codeText, el.barcodeType || 'code128', {
            includeText: el.includeBarcodeText ?? true,
            color: el.barcodeColor || el.textColor || '#000000',
            bgColor: el.barcodeBgColor || el.fillColor || 'transparent',
            scale: 3,
          });
          if (imgUrl) {
            const safeUrl = escapeXml(imgUrl);
            innerParts.push(
              `<image href="${safeUrl}" xlink:href="${safeUrl}" x="${leftPx}" y="${topPx}" width="${widthElPx}" height="${heightElPx}" preserveAspectRatio="xMidYMid meet" />`
            );
          }
        } catch (e) {
          console.warn('Barcode render svg error:', e);
        }

        if (el.borderWidth && el.borderWidth > 0) {
          innerParts.push(
            `<rect x="${leftPx}" y="${topPx}" width="${widthElPx}" height="${heightElPx}" rx="${radiusPx}" ry="${radiusPx}" fill="none" stroke="${escapeXml(el.borderColor || '#000000')}" stroke-width="${mmToPx(el.borderWidth, SCREEN_DPI)}" />`
          );
        }
        break;
      }

      case 'image': {
        if (el.imageUrl) {
          const radiusPx = el.borderRadius ? mmToPx(el.borderRadius, SCREEN_DPI) : 0;
          let clipAttr = '';
          if (radiusPx > 0) {
            const clipId = `img-clip-${i}`;
            defsParts.push(
              `<clipPath id="${clipId}"><rect x="${leftPx}" y="${topPx}" width="${widthElPx}" height="${heightElPx}" rx="${radiusPx}" ry="${radiusPx}" /></clipPath>`
            );
            clipAttr = ` clip-path="url(#${clipId})"`;
          }

          if (el.fillColor && el.fillColor !== 'transparent') {
            innerParts.push(
              `<rect x="${leftPx}" y="${topPx}" width="${widthElPx}" height="${heightElPx}" rx="${radiusPx}" ry="${radiusPx}" fill="${escapeXml(el.fillColor)}" />`
            );
          }

          const safeImgUrl = escapeXml(el.imageUrl);
          innerParts.push(
            `<image href="${safeImgUrl}" xlink:href="${safeImgUrl}" x="${leftPx}" y="${topPx}" width="${widthElPx}" height="${heightElPx}" preserveAspectRatio="${getSvgImageAspectRatio(el.imageFit)}"${clipAttr} />`
          );

          if (el.borderWidth && el.borderWidth > 0) {
            innerParts.push(
              `<rect x="${leftPx}" y="${topPx}" width="${widthElPx}" height="${heightElPx}" rx="${radiusPx}" ry="${radiusPx}" fill="none" stroke="${escapeXml(el.borderColor || '#000000')}" stroke-width="${mmToPx(el.borderWidth, SCREEN_DPI)}" />`
            );
          }
        }
        break;
      }
    }

    if (innerParts.length > 0) {
      const attrStr = gAttrs.length > 0 ? ` ${gAttrs.join(' ')}` : '';
      bodyParts.push(`<g${attrStr}>${innerParts.join('')}</g>`);
    }
  }

  // Outer card border rendered last so it stays crisp around edges
  const outerBorderPart =
    template.borderWidth && template.borderWidth > 0
      ? (() => {
          const bw = mmToPx(template.borderWidth, SCREEN_DPI);
          return `<rect x="${bw / 2}" y="${bw / 2}" width="${Math.max(0, widthPx - bw)}" height="${Math.max(0, heightPx - bw)}" rx="${cardRadiusPx}" ry="${cardRadiusPx}" fill="none" stroke="${escapeXml(template.borderColor || '#e2e8f0')}" stroke-width="${bw}" />`;
        })()
      : '';

  const clippedContent =
    cardRadiusPx > 0
      ? `<g clip-path="url(#card-clip)">\n    ${bodyParts.join('\n    ')}\n  </g>`
      : bodyParts.join('\n  ');

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${template.widthMm}mm" height="${template.heightMm}mm" viewBox="0 0 ${widthPx} ${heightPx}" dir="rtl">
  <defs>
    ${defsParts.join('\n    ')}
  </defs>
  ${clippedContent}
  ${outerBorderPart}
</svg>`;
}

/**
 * Generate and download the current price tag template as an .svg file
 */
export async function downloadTemplateSvg(
  template: TagTemplate,
  item?: ProductItem,
  mappings?: FieldMapping[]
): Promise<void> {
  const svgContent = await renderTagToSvg(template, item, mappings);
  const safeName = (template.name || 'template').replace(/[/\\?%*:|"<>]/g, '_');
  downloadFile(svgContent, `${safeName}.svg`, 'image/svg+xml;charset=utf-8');
}
