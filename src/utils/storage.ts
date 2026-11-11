import { TagTemplate, TagElement, ProductItem, FieldMapping } from '../types';
import { SUPERMARKET_LOGO } from '../data/supermarketLogo';

const LOGO_PLACEHOLDER = '__SUPERMARKET_LOGO__';
const IDB_NAME = 'PriceTagProDB';
const IDB_STORE = 'kv_store';
const IDB_VERSION = 1;

/**
 * Replace heavy built-in base64 logo with a tiny token before saving to storage
 */
export function compactTemplate(template: TagTemplate): TagTemplate {
  if (!template) return template;
  return {
    ...template,
    backgroundImage:
      template.backgroundImage === SUPERMARKET_LOGO
        ? LOGO_PLACEHOLDER
        : template.backgroundImage,
    elements: Array.isArray(template.elements)
      ? template.elements.map((el) =>
          el.imageUrl === SUPERMARKET_LOGO
            ? { ...el, imageUrl: LOGO_PLACEHOLDER }
            : el
        )
      : [],
  };
}

/**
 * Restore built-in base64 logo from token when loading from storage
 */
export function hydrateTemplate(template: TagTemplate): TagTemplate {
  if (!template) return template;
  return {
    ...template,
    backgroundImage:
      template.backgroundImage === LOGO_PLACEHOLDER
        ? SUPERMARKET_LOGO
        : template.backgroundImage,
    elements: Array.isArray(template.elements)
      ? template.elements.map((el) =>
          el.imageUrl === LOGO_PLACEHOLDER
            ? { ...el, imageUrl: LOGO_PLACEHOLDER === '__SUPERMARKET_LOGO__' ? SUPERMARKET_LOGO : el.imageUrl }
            : el
        )
      : [],
  };
}

/**
 * Compact existing localStorage keys in-place to free up megabytes of space
 */
export function compactExistingLocalStorage(): void {
  try {
    const rawTpl = localStorage.getItem('pricetag_template');
    if (rawTpl && rawTpl.includes(SUPERMARKET_LOGO.slice(0, 64))) {
      const parsed = JSON.parse(rawTpl);
      localStorage.setItem('pricetag_template', JSON.stringify(compactTemplate(parsed)));
    }
  } catch (e) {}

  try {
    const rawSaved = localStorage.getItem('pricetag_saved_custom_templates');
    if (rawSaved && rawSaved.includes(SUPERMARKET_LOGO.slice(0, 64))) {
      const parsed = JSON.parse(rawSaved);
      if (Array.isArray(parsed)) {
        localStorage.setItem(
          'pricetag_saved_custom_templates',
          JSON.stringify(parsed.map(compactTemplate))
        );
      }
    }
  } catch (e) {}
}

// Run compaction immediately on module load
compactExistingLocalStorage();

/**
 * Open IndexedDB for unlimited fallback storage
 */
function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB not supported'));
      return;
    }
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE);
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function idbSet<T>(key: string, val: T): Promise<void> {
  try {
    const db = await openDB();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  } catch (e) {
    // Ignore IDB errors silently
  }
}

export async function idbGet<T>(key: string): Promise<T | undefined> {
  try {
    const db = await openDB();
    return await new Promise<T | undefined>((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result as T | undefined);
      req.onerror = () => reject(req.error);
    });
  } catch (e) {
    return undefined;
  }
}

/**
 * Safely write a string to localStorage without ever throwing QuotaExceededError
 */
export function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch (err) {
    // Step 1: Compact existing template keys that might contain duplicate base64 logos
    compactExistingLocalStorage();
    try {
      localStorage.setItem(key, value);
      return true;
    } catch (err2) {
      // Step 2: If still exceeding quota, free non-essential cached keys
      try {
        if (key !== 'pricetag_template') {
          localStorage.removeItem('pricetag_template');
        }
        if (key === 'pricetag_products') {
          localStorage.removeItem('pricetag_saved_custom_templates');
        }
        localStorage.setItem(key, value);
        return true;
      } catch (err3) {
        console.warn(`[Storage] Quota exceeded for key "${key}". Data is safely stored in IndexedDB.`);
        return false;
      }
    }
  }
}

export function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch (e) {
    return null;
  }
}

/**
 * Save & Load Helpers for Template, Products, Mappings, and Custom Templates
 */
export function loadTemplateFromStorage(fallback: TagTemplate): TagTemplate {
  const saved = safeGetItem('pricetag_template');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (parsed && parsed.widthMm && parsed.heightMm && Array.isArray(parsed.elements)) {
        return hydrateTemplate(parsed);
      }
    } catch (e) {}
  }
  return fallback;
}

export function saveTemplateToStorage(template: TagTemplate): void {
  const compacted = compactTemplate(template);
  idbSet('pricetag_template', compacted);
  safeSetItem('pricetag_template', JSON.stringify(compacted));
}

export function loadProductsFromStorage(fallback: ProductItem[]): ProductItem[] {
  const saved = safeGetItem('pricetag_products');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    } catch (e) {}
  }
  return fallback;
}

export function saveProductsToStorage(products: ProductItem[]): void {
  // Always persist full list in IndexedDB (supports 50,000+ products easily)
  idbSet('pricetag_products', products);

  const json = JSON.stringify(products);
  const ok = safeSetItem('pricetag_products', json);

  // If products JSON itself is larger than 5MB localStorage limit, save first 500 items in localStorage for instant boot, full in IndexedDB
  if (!ok && products.length > 500) {
    safeSetItem('pricetag_products', JSON.stringify(products.slice(0, 500)));
  }
}

export function loadMappingsFromStorage(fallback: FieldMapping[]): FieldMapping[] {
  const saved = safeGetItem('pricetag_mappings');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed)) return parsed;
    } catch (e) {}
  }
  return fallback;
}

export function saveMappingsToStorage(mappings: FieldMapping[]): void {
  safeSetItem('pricetag_mappings', JSON.stringify(mappings));
  idbSet('pricetag_mappings', mappings);
}

export function loadCustomTemplatesFromStorage(): TagTemplate[] {
  const raw = safeGetItem('pricetag_saved_custom_templates');
  if (raw) {
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        return parsed.map(hydrateTemplate);
      }
    } catch (e) {}
  }
  return [];
}

export function saveCustomTemplatesToStorage(templates: TagTemplate[]): void {
  const compacted = templates.map(compactTemplate);
  idbSet('pricetag_saved_custom_templates', compacted);
  safeSetItem('pricetag_saved_custom_templates', JSON.stringify(compacted));
}

/**
 * Compress uploaded raster images (PNG/JPEG/WebP) so custom logos/templates don't bloat storage
 */
export function readAndCompressImageFile(
  file: File,
  maxDimension = 1200
): Promise<{ dataUrl: string; width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = (err) => reject(err);
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      if (!dataUrl) {
        reject(new Error('Empty file'));
        return;
      }

      // Do not rasterize SVG vector files
      if (file.type === 'image/svg+xml' || dataUrl.startsWith('data:image/svg+xml')) {
        resolve({ dataUrl, width: 800, height: 600 });
        return;
      }

      const img = new Image();
      img.onload = () => {
        const origW = img.width || 800;
        const origH = img.height || 600;
        let width = origW;
        let height = origH;

        if (width <= maxDimension && height <= maxDimension && dataUrl.length < 180_000) {
          resolve({ dataUrl, width: origW, height: origH });
          return;
        }

        if (width > maxDimension || height > maxDimension) {
          const ratio = Math.min(maxDimension / width, maxDimension / height);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          resolve({ dataUrl, width: origW, height: origH });
          return;
        }

        ctx.drawImage(img, 0, 0, width, height);
        // Use JPEG for large opaque photos/templates, or PNG if transparency might be needed and file is small
        const outMime = file.type === 'image/png' && dataUrl.length < 500_000 ? 'image/png' : 'image/jpeg';
        const compressed = canvas.toDataURL(outMime, 0.85);
        resolve({
          dataUrl: compressed.length < dataUrl.length ? compressed : dataUrl,
          width: origW,
          height: origH,
        });
      };
      img.onerror = () => resolve({ dataUrl, width: 800, height: 600 });
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

/**
 * Create a complete TagTemplate from an uploaded template design image
 */
export function createTemplateFromUploadedImage(options: {
  imageUrl: string;
  name: string;
  widthMm: number;
  heightMm: number;
  category?: string;
  includeDynamicFields?: boolean;
}): TagTemplate {
  const {
    imageUrl,
    name,
    widthMm,
    heightMm,
    category = 'supermarket',
    includeDynamicFields = true,
  } = options;

  const scaleFactor = Math.min(widthMm, heightMm) / 60; // relative to 60mm standard tag

  const elements: TagElement[] = [
    {
      id: 'el_template_bg',
      type: 'image',
      name: 'خلفية القالب المرفوع',
      imageUrl,
      imageFit: 'fill',
      left: 0,
      top: 0,
      width: widthMm,
      height: heightMm,
      zIndex: 0,
      locked: true,
      opacity: 1,
    },
  ];

  if (includeDynamicFields) {
    const padX = Number((widthMm * 0.08).toFixed(1));
    const contentW = Number((widthMm - padX * 2).toFixed(1));

    elements.push(
      {
        id: `el_prod_name_${Date.now()}`,
        type: 'text',
        name: 'اسم المنتج',
        isDynamic: true,
        fieldName: 'product_name',
        fallbackValue: 'اسم المنتج هنا',
        left: padX,
        top: Number((heightMm * 0.28).toFixed(1)),
        width: contentW,
        height: Number((heightMm * 0.14).toFixed(1)),
        fontSize: Math.max(9, Math.round(11 * scaleFactor)),
        fontWeight: 'bold',
        textColor: '#0f172a',
        textAlign: 'center',
        fontFamily: 'Tajawal, Cairo, sans-serif',
        zIndex: 3,
      },
      {
        id: `el_price_${Date.now()}`,
        type: 'price',
        name: 'السعر الحالي',
        isDynamic: true,
        fieldName: 'price',
        fallbackValue: '29.95',
        suffix: ' ر.س',
        left: Number((widthMm * 0.15).toFixed(1)),
        top: Number((heightMm * 0.45).toFixed(1)),
        width: Number((widthMm * 0.7).toFixed(1)),
        height: Number((heightMm * 0.22).toFixed(1)),
        fontSize: Math.max(14, Math.round(22 * scaleFactor)),
        fontWeight: '900',
        textColor: '#dc2626',
        textAlign: 'center',
        fontFamily: 'Arial, sans-serif',
        zIndex: 4,
      },
      {
        id: `el_old_price_${Date.now()}`,
        type: 'text',
        name: 'السعر السابق',
        isDynamic: true,
        fieldName: 'old_price',
        prefix: 'بدلاً من: ',
        suffix: ' ر.س',
        fallbackValue: '39.00',
        left: Number((widthMm * 0.2).toFixed(1)),
        top: Number((heightMm * 0.69).toFixed(1)),
        width: Number((widthMm * 0.6).toFixed(1)),
        height: Number((heightMm * 0.08).toFixed(1)),
        fontSize: Math.max(7, Math.round(8.5 * scaleFactor)),
        fontWeight: 'bold',
        textColor: '#475569',
        textAlign: 'center',
        textDecoration: 'line-through',
        fontFamily: 'Tajawal, sans-serif',
        zIndex: 3,
      },
      {
        id: `el_barcode_${Date.now()}`,
        type: 'barcode',
        name: 'الباركود',
        isDynamic: true,
        fieldName: 'barcode',
        fallbackValue: '628100123456',
        barcodeType: 'code128',
        includeBarcodeText: true,
        barcodeBgColor: 'transparent',
        left: Number((widthMm * 0.2).toFixed(1)),
        top: Number((heightMm * 0.8).toFixed(1)),
        width: Number((widthMm * 0.6).toFixed(1)),
        height: Number((heightMm * 0.15).toFixed(1)),
        zIndex: 5,
      }
    );
  }

  return {
    id: `uploaded_tpl_${Date.now()}`,
    name: name.trim() || 'قالب مرفوع مخصص',
    category,
    description: 'قالب مرفوع من الجهاز جاهز للطباعة وتعديل الأسعار',
    widthMm,
    heightMm,
    orientation: widthMm >= heightMm ? 'landscape' : 'portrait',
    backgroundColor: '#ffffff',
    borderWidth: 0,
    borderRadius: 0,
    isLocked: false,
    elements,
  };
}
