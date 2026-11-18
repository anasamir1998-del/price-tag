import * as XLSX from 'xlsx';
import { ProductItem, FieldMapping } from '../types';
import { downloadFile } from './fileDownloader';

/**
 * Parse an uploaded Excel or CSV file into column names and rows
 */
export async function parseExcelFile(file: File): Promise<{
  columns: string[];
  rows: ProductItem[];
  sheetNames: string[];
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = e.target?.result;
        const workbook = XLSX.read(data, { type: 'binary', cellDates: true });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];

        const jsonData: any[] = XLSX.utils.sheet_to_json(worksheet, { defval: '' });

        if (jsonData.length === 0) {
          resolve({ columns: [], rows: [], sheetNames: workbook.SheetNames });
          return;
        }

        const columns = Object.keys(jsonData[0]);
        const rows: ProductItem[] = jsonData.map((row, index) => ({
          id: `item_${index + 1}`,
          ...row,
        }));

        resolve({
          columns,
          rows,
          sheetNames: workbook.SheetNames,
        });
      } catch (err) {
        reject(err);
      }
    };

    reader.onerror = (err) => reject(err);
    reader.readAsBinaryString(file);
  });
}

const OLD_PRICE_COLUMN_KEYWORDS = ['سابق', 'قبل', 'قديم', 'old', 'before', 'was', 'prev', 'original'];

function isOldPriceColumnName(col: string): boolean {
  const normalized = col.trim().toLowerCase();
  return OLD_PRICE_COLUMN_KEYWORDS.some((kw) => normalized.includes(kw));
}

/**
 * Automatically suggest field mappings based on column name heuristics
 */
export function autoSuggestMappings(
  templateFields: string[],
  fileColumns: string[]
): FieldMapping[] {
  const mappingsByField = new Map<string, string>();
  const usedColumns = new Set<string>();

  const aliases: Record<string, string[]> = {
    product_name: ['اسم المنتج', 'اسم الصنف', 'الصنف', 'المنتج', 'product', 'name', 'product_name', 'item_name', 'title'],
    price: ['السعر', 'سعر البيع', 'السعر الحالي', 'price', 'sale_price', 'current_price', 'amount', 'unit_price'],
    old_price: ['السعر السابق', 'السعر قبل الخصم', 'السعر القديم', 'old_price', 'original_price', 'before_price', 'was_price'],
    barcode: ['الباركود', 'رقم الباركود', 'كود الصنف', 'barcode', 'barcode_val', 'upc', 'ean', 'sku', 'code', 'item_code'],
    unit: ['الوحدة', 'وحدة القياس', 'الوزن', 'unit', 'uom', 'weight', 'size', 'حجم'],
    print_quantity: ['عدد الملصقات', 'عدد النسخ', 'الكمية', 'العدد', 'quantity', 'qty', 'copies', 'count', 'print_qty', 'print_quantity'],
    currency: ['العملة', 'currency', 'curr'],
    discount_percentage: ['نسبة الخصم', 'الخصم', 'discount', 'discount_percent', 'promo'],
    category: ['القسم', 'الفئة', 'المجموعة', 'category', 'group', 'dept'],
    origin: ['بلد المنشأ', 'المنشأ', 'الصنع', 'origin', 'made_in', 'country'],
    description: ['الوصف', 'تفاصيل', 'المواصفات', 'description', 'desc', 'details'],
  };

  const isColumnAllowedForField = (tField: string, col: string): boolean => {
    if (tField === 'price') return !isOldPriceColumnName(col);
    if (tField === 'old_price') return isOldPriceColumnName(col);
    return true;
  };

  // Pass 1: Exact Match
  templateFields.forEach((tField) => {
    const possibleMatches = aliases[tField] || [tField];

    for (const col of fileColumns) {
      if (usedColumns.has(col) || !isColumnAllowedForField(tField, col)) continue;
      const normalizedCol = col.trim().toLowerCase();
      if (possibleMatches.some((alias) => normalizedCol === alias.toLowerCase())) {
        mappingsByField.set(tField, col);
        usedColumns.add(col);
        break;
      }
    }
  });

  // Pass 2: Contained Alias Match (column contains alias)
  templateFields.forEach((tField) => {
    if (mappingsByField.has(tField)) return;
    const possibleMatches = aliases[tField] || [tField];

    for (const col of fileColumns) {
      if (usedColumns.has(col) || !isColumnAllowedForField(tField, col)) continue;
      const normalizedCol = col.trim().toLowerCase();
      if (possibleMatches.some((alias) => normalizedCol.includes(alias.toLowerCase()))) {
        mappingsByField.set(tField, col);
        usedColumns.add(col);
        break;
      }
    }
  });

  const mappings: FieldMapping[] = [];
  templateFields.forEach((tField) => {
    const matchedColumn = mappingsByField.get(tField);
    if (matchedColumn) {
      mappings.push({
        templateField: tField,
        fileColumn: matchedColumn,
      });
    }
  });

  return mappings;
}

/**
 * Generate and download a sample Excel file with rich Arabic/English data
 */
export function downloadSampleExcel(): void {
  const sampleData = [
    {
      'اسم المنتج': 'زيت زيتون بكر ممتاز 1 لتر',
      'السعر': '34.50',
      'السعر السابق': '45.00',
      'الباركود': '6281001234567',
      'الوحدة': 'حبة',
      'عدد الملصقات': 2,
      'بلد المنشأ': 'إسبانيا',
      'نسبة الخصم': '23%',
      'القسم': 'الزيوت والمواد الغذائية',
    },
    {
      'اسم المنتج': 'حليب طويل الأجل كامل الدسم 1 لتر',
      'السعر': '5.75',
      'السعر السابق': '7.00',
      'الباركود': '6281007654321',
      'الوحدة': 'حبة',
      'عدد الملصقات': 4,
      'بلد المنشأ': 'السعودية',
      'نسبة الخصم': '18%',
      'القسم': 'الألبان',
    },
    {
      'اسم المنتج': 'أرز بسمتي هندي درجة أولى 5 كجم',
      'السعر': '42.00',
      'السعر السابق': '55.00',
      'الباركود': '6281009876543',
      'الوحدة': 'كيس',
      'عدد الملصقات': 3,
      'بلد المنشأ': 'الهند',
      'نسبة الخصم': '24%',
      'القسم': 'الحبوب والأرز',
    },
    {
      'اسم المنتج': 'شاي أسود فاخر 100 كيس',
      'السعر': '16.95',
      'السعر السابق': '21.00',
      'الباركود': '6281005432109',
      'الوحدة': 'علبة',
      'عدد الملصقات': 1,
      'بلد المنشأ': 'سريلانكا',
      'نسبة الخصم': '19%',
      'القسم': 'المشروبات الساخنة',
    },
    {
      'اسم المنتج': 'مسحوق غسيل أوتوماتيك 3 كجم',
      'السعر': '29.90',
      'السعر السابق': '39.90',
      'الباركود': '6281003456789',
      'الوحدة': 'كيس',
      'عدد الملصقات': 2,
      'بلد المنشأ': 'مصر',
      'نسبة الخصم': '25%',
      'القسم': 'المنظفات والعناية المنزلية',
    },
    {
      'اسم المنتج': 'عصير برتقال طبيعي 1.5 لتر',
      'السعر': '9.50',
      'السعر السابق': '',
      'الباركود': '6281008765432',
      'الوحدة': 'قارورة',
      'عدد الملصقات': 2,
      'بلد المنشأ': 'السعودية',
      'نسبة الخصم': '',
      'القسم': 'العصائر والمشروبات',
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(sampleData);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'قائمة المنتجات');

  // Adjust column widths
  worksheet['!cols'] = [
    { wch: 35 }, // اسم المنتج
    { wch: 12 }, // السعر
    { wch: 14 }, // السعر السابق
    { wch: 18 }, // الباركود
    { wch: 10 }, // الوحدة
    { wch: 14 }, // عدد الملصقات
    { wch: 14 }, // بلد المنشأ
    { wch: 12 }, // نسبة الخصم
    { wch: 25 }, // القسم
  ];

  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  downloadFile(blob, 'sample_products_pricetags.xlsx');
}
