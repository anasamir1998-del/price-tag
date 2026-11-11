export type ElementType = 
  | 'text' 
  | 'price' 
  | 'barcode' 
  | 'qrcode' 
  | 'image' 
  | 'shape' 
  | 'badge' 
  | 'line';

export type BarcodeType = 'code128' | 'ean13' | 'ean8' | 'upca' | 'code39' | 'qrcode';

export type ShapeType = 'rectangle' | 'circle' | 'line' | 'star' | 'tag_badge';

export interface TagElement {
  id: string;
  type: ElementType;
  name: string;
  // Position & Dimensions (in mm)
  left: number;
  top: number;
  width: number;
  height: number;
  rotation?: number;
  zIndex: number;
  locked?: boolean;
  hidden?: boolean;

  // Dynamic Variable Binding
  isDynamic?: boolean;
  fieldName?: string; // e.g. "product_name", "price", "old_price", "barcode", "unit", "discount_percentage"
  prefix?: string;
  suffix?: string;
  fallbackValue?: string;

  // Text / Typography
  text?: string;
  fontFamily?: string;
  fontSize?: number; // in pt / px
  fontWeight?: 'normal' | '500' | 'bold' | '800' | '900';
  fontStyle?: 'normal' | 'italic';
  textAlign?: 'left' | 'center' | 'right';
  textColor?: string;
  lineHeight?: number;
  textDecoration?: 'none' | 'line-through' | 'underline';
  letterSpacing?: number;
  smallDecimals?: boolean; // When true, decimals (halalas) are rendered noticeably smaller

  // Colors & Borders
  fillColor?: string;
  borderColor?: string;
  borderWidth?: number;
  borderRadius?: number;
  borderStyle?: 'solid' | 'dashed' | 'dotted';
  opacity?: number;
  shadow?: {
    color: string;
    blur: number;
    offsetX: number;
    offsetY: number;
  };

  // Barcode / QR Specific
  barcodeType?: BarcodeType;
  includeBarcodeText?: boolean;
  barcodeColor?: string;
  barcodeBgColor?: string;
  qrErrorLevel?: 'L' | 'M' | 'Q' | 'H';

  // Shape Specific
  shapeType?: ShapeType;

  // Image Specific
  imageUrl?: string;
  imageFit?: 'contain' | 'cover' | 'fill';

  // Badge Specific
  badgeStyle?: 'sale' | 'discount' | 'new' | 'organic' | 'featured' | 'custom';
  badgeBgColor?: string;
  badgeTextColor?: string;
}

export type CategoryType = 
  | 'all'
  | 'supermarket' 
  | 'bakery' 
  | 'fruits_veg' 
  | 'meat_fish' 
  | 'electronics' 
  | 'apparel' 
  | 'pharmacy' 
  | 'perfumes' 
  | 'promo' 
  | 'thermal' 
  | 'general';

export interface CategoryInfo {
  id: CategoryType;
  nameAr: string;
  nameEn: string;
  icon: string;
  badgeBg: string;
  badgeText: string;
  borderColor: string;
  description: string;
}

export interface TagTemplate {
  id: string;
  name: string;
  category: CategoryType | string;
  description?: string;
  widthMm: number;
  heightMm: number;
  orientation: 'landscape' | 'portrait';
  backgroundColor: string;
  backgroundImage?: string;
  watermarkOpacity?: number;
  watermarkScale?: number;
  borderWidth?: number;
  borderColor?: string;
  borderRadius?: number;
  isLocked?: boolean;
  showOldPrice?: boolean;
  elements: TagElement[];
}

export interface PageMargin {
  top: number;
  bottom: number;
  left: number;
  right: number;
}

export type PageSize = 'A4' | 'A3' | 'A5' | 'Letter' | 'Roll_58mm' | 'Roll_80mm' | 'Roll_100mm' | 'Custom';

export interface PageConfig {
  pageSize: PageSize;
  orientation: 'portrait' | 'landscape';
  widthMm: number;
  heightMm: number;
  margins: PageMargin;
}

export interface GridConfig {
  tagWidthMm: number;
  tagHeightMm: number;
  gapXMm: number;
  gapYMm: number;
  cropMarks: boolean;
  cropMarkColor: string;
  cropMarkLengthMm: number;
  centerGridOnPage: boolean;
}

export interface CalculatedGrid {
  columns: number;
  rows: number;
  tagsPerPage: number;
  gridWidthMm: number;
  gridHeightMm: number;
  offsetX: number;
  offsetY: number;
  pageWidthMm: number;
  pageHeightMm: number;
}

export interface ProductItem {
  id: string;
  category?: string;
  category_id?: CategoryType;
  quantity?: number;
  print_quantity?: number;
  [key: string]: any;
}

export interface FieldMapping {
  templateField: string; // e.g. "product_name"
  fileColumn: string; // e.g. "اسم الصنف"
}

export interface PresetSize {
  name: string;
  category: string;
  widthMm: number;
  heightMm: number;
  description: string;
}
