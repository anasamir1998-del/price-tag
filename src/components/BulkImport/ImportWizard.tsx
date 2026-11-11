import React, { useState, useRef } from 'react';
import {
  X,
  Upload,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Sparkles,
  Download,
  Trash2,
  Edit2,
  Table as TableIcon,
} from 'lucide-react';
import { ProductItem, FieldMapping, TagTemplate } from '../../types';
import { parseExcelFile, autoSuggestMappings, downloadSampleExcel } from '../../utils/excelParser';
import { DEFAULT_SAMPLE_PRODUCTS } from '../../data/sampleProducts';

interface ImportWizardProps {
  isOpen: boolean;
  onClose: () => void;
  template: TagTemplate;
  products: ProductItem[];
  mappings: FieldMapping[];
  onApplyProducts: (newProducts: ProductItem[], newMappings: FieldMapping[]) => void;
}

export const ImportWizard: React.FC<ImportWizardProps> = ({
  isOpen,
  onClose,
  template,
  products,
  mappings,
  onApplyProducts,
}) => {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [fileColumns, setFileColumns] = useState<string[]>([]);
  const [tempProducts, setTempProducts] = useState<ProductItem[]>(products);
  const [currentMappings, setCurrentMappings] = useState<FieldMapping[]>(mappings);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const PAGE_SIZE = 50;

  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  // Extract all unique dynamic fields used in this template
  const templateDynamicFields = Array.from(
    new Set(
      template.elements
        .filter((el) => el.isDynamic && el.fieldName)
        .map((el) => el.fieldName!)
    )
  );

  // If no dynamic fields are defined in template, supply the basic ones
  const targetFields = templateDynamicFields.length > 0
    ? templateDynamicFields
    : ['product_name', 'price', 'old_price', 'barcode', 'unit', 'discount_percentage'];

  const fieldLabels: Record<string, string> = {
    product_name: 'اسم المنتج (product_name)',
    price: 'السعر الحالي (price)',
    old_price: 'السعر السابق (old_price)',
    barcode: 'الباركود (barcode)',
    unit: 'الوحدة / الحجم (unit)',
    print_quantity: 'عدد النسخ / الكمية (print_quantity)',
    discount_percentage: 'نسبة الخصم (discount_percentage)',
    origin: 'بلد المنشأ (origin)',
    category: 'القسم (category)',
    description: 'المواصفات والوصف (description)',
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    setLoading(true);
    setErrorMessage(null);

    try {
      const parsed = await parseExcelFile(uploadedFile);
      setFile(uploadedFile);
      setFileColumns(parsed.columns);
      setTempProducts(parsed.rows);

      // Auto suggest mapping
      const suggested = autoSuggestMappings([...targetFields, 'print_quantity'], parsed.columns);
      setCurrentMappings(suggested);

      setStep(2);
    } catch (err: any) {
      setErrorMessage('فشل في قراءة الملف. تأكد من أن الملف بصيغة Excel أو CSV صالحة.');
    } finally {
      setLoading(false);
    }
  };

  const handleUseDemoData = () => {
    setFile(null);
    setFileColumns(['اسم المنتج', 'السعر', 'السعر السابق', 'الباركود', 'الوحدة', 'عدد الملصقات', 'بلد المنشأ', 'نسبة الخصم', 'القسم', 'المواصفات']);
    setTempProducts(DEFAULT_SAMPLE_PRODUCTS);

    const suggested = autoSuggestMappings([...targetFields, 'print_quantity'], [
      'اسم المنتج',
      'السعر',
      'السعر السابق',
      'الباركود',
      'الوحدة',
      'عدد الملصقات',
      'بلد المنشأ',
      'نسبة الخصم',
      'القسم',
      'المواصفات',
    ]);
    setCurrentMappings(suggested);
    setStep(2);
  };

  const handleUpdateMapping = (templateField: string, fileColumn: string) => {
    setCurrentMappings((prev) => {
      const filtered = prev.filter((m) => m.templateField !== templateField);
      if (fileColumn) {
        return [...filtered, { templateField, fileColumn }];
      }
      return filtered;
    });
  };

  const handleQuantityChange = (id: string, qty: number) => {
    const validQty = Math.max(1, Math.min(9999, qty || 1));
    setTempProducts((prev) =>
      prev.map((p) => (p.id === id ? { ...p, print_quantity: validQty, quantity: validQty } : p))
    );
  };

  const handleSetAllQuantities = (qty: number) => {
    const validQty = Math.max(1, Math.min(9999, qty || 1));
    setTempProducts((prev) =>
      prev.map((p) => ({ ...p, print_quantity: validQty, quantity: validQty }))
    );
  };

  const totalStickersCount = tempProducts.reduce((sum, p) => {
    const qMap = currentMappings.find((m) => m.templateField === 'print_quantity')?.fileColumn;
    const rawVal = qMap ? p[qMap] : (p.print_quantity || p.quantity || 1);
    const parsed = parseInt(String(rawVal), 10);
    return sum + (isNaN(parsed) || parsed < 1 ? 1 : parsed);
  }, 0);

  const totalPreviewPages = Math.max(1, Math.ceil(tempProducts.length / PAGE_SIZE));
  const safePreviewPage = Math.min(previewPage, totalPreviewPages);
  const paginatedTempProducts = tempProducts.slice(
    (safePreviewPage - 1) * PAGE_SIZE,
    safePreviewPage * PAGE_SIZE
  );

  const handleFinish = () => {
    const getCol = (field: string) => currentMappings.find((m) => m.templateField === field)?.fileColumn;
    const nameCol = getCol('product_name');
    const priceCol = getCol('price');
    const oldPriceCol = getCol('old_price');
    const barcodeCol = getCol('barcode');
    const unitCol = getCol('unit');
    const catCol = getCol('category');
    const originCol = getCol('origin');
    const descCol = getCol('description');
    const discountCol = getCol('discount_percentage');
    const qMap = getCol('print_quantity');

    // Ensure all products have their resolved print_quantity and normalized fields for fast access
    const resolvedProducts = tempProducts.map((p) => {
      const rawVal = qMap ? p[qMap] : (p.print_quantity || p.quantity || 1);
      const parsed = parseInt(String(rawVal), 10);
      const finalQty = isNaN(parsed) || parsed < 1 ? 1 : parsed;
      return {
        ...p,
        product_name: (nameCol ? p[nameCol] : undefined) ?? p.product_name ?? p['اسم المنتج'] ?? p['اسم الصنف'] ?? '',
        price: (priceCol ? p[priceCol] : undefined) ?? p.price ?? p['السعر'] ?? '',
        old_price: (oldPriceCol ? p[oldPriceCol] : undefined) ?? p.old_price ?? p['السعر السابق'] ?? '',
        barcode: (barcodeCol ? p[barcodeCol] : undefined) ?? p.barcode ?? p['الباركود'] ?? '',
        unit: (unitCol ? p[unitCol] : undefined) ?? p.unit ?? p['الوحدة'] ?? '',
        category: (catCol ? p[catCol] : undefined) ?? p.category ?? p['القسم'] ?? '',
        origin: (originCol ? p[originCol] : undefined) ?? p.origin ?? p['بلد المنشأ'] ?? '',
        description: (descCol ? p[descCol] : undefined) ?? p.description ?? p['المواصفات'] ?? '',
        discount_percentage: (discountCol ? p[discountCol] : undefined) ?? p.discount_percentage ?? p['نسبة الخصم'] ?? '',
        print_quantity: finalQty,
        quantity: finalQty,
      };
    });

    onApplyProducts(resolvedProducts, currentMappings);
    onClose();
  };

  const handleDeleteRow = (id: string) => {
    setTempProducts((prev) => prev.filter((p) => p.id !== id));
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">معالج استيراد بيانات المنتجات والكميات (Excel / CSV)</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">توليد مئات بطاقات الأسعار مع التحكم في عدد الملصقات لكل صنف</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Steps Progress Bar */}
        <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-950/30 border-b border-slate-200 dark:border-slate-800 flex items-center justify-center gap-8">
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 1 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 1 ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
              1
            </span>
            <span>رفع الملف</span>
          </div>
          <div className="w-12 h-px bg-slate-300 dark:bg-slate-800" />
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 2 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 2 ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
              2
            </span>
            <span>ربط الحقول والكميات</span>
          </div>
          <div className="w-12 h-px bg-slate-300 dark:bg-slate-800" />
          <div className={`flex items-center gap-2 text-xs font-bold ${step >= 3 ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs ${step >= 3 ? 'bg-emerald-600 dark:bg-emerald-500 text-white dark:text-slate-950 font-bold' : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'}`}>
              3
            </span>
            <span>معاينة وتعديل الكميات</span>
          </div>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* STEP 1: Upload File */}
          {step === 1 && (
            <div className="space-y-6">
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-slate-300 dark:border-slate-700 hover:border-emerald-500 bg-slate-50 dark:bg-slate-950/50 hover:bg-emerald-50 dark:hover:bg-emerald-950/10 rounded-2xl p-10 flex flex-col items-center justify-center text-center cursor-pointer transition-all group"
              >
                <div className="w-16 h-16 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 mb-4 group-hover:scale-110 transition-transform">
                  <Upload className="w-8 h-8" />
                </div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">انقر لاختيار ملف Excel أو CSV أو اسحبه هنا</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-md">
                  يدعم صيغ <span className="text-emerald-600 dark:text-emerald-400 font-mono">.xlsx</span> و <span className="text-emerald-600 dark:text-emerald-400 font-mono">.xls</span> و <span className="text-emerald-600 dark:text-emerald-400 font-mono">.csv</span>
                </p>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".xlsx, .xls, .csv"
                  onChange={handleFileUpload}
                  className="hidden"
                />
              </div>

              {errorMessage && (
                <div className="p-3.5 rounded-xl bg-rose-50 dark:bg-rose-950/50 border border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <div className="flex items-center justify-between pt-4 border-t border-slate-200 dark:border-slate-800">
                <button
                  onClick={downloadSampleExcel}
                  className="flex items-center gap-2 text-xs font-semibold text-emerald-700 dark:text-emerald-400 hover:text-emerald-800 dark:hover:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/40 hover:bg-emerald-100 dark:hover:bg-emerald-900/50 px-4 py-2 rounded-xl border border-emerald-200 dark:border-emerald-800/50 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  <span>تحميل نموذج إكسل مع عمود الكميات (.xlsx)</span>
                </button>

                <button
                  onClick={handleUseDemoData}
                  className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 px-4 py-2 rounded-xl border border-slate-300 dark:border-slate-700 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>استخدام البيانات التجريبية (8 منتجات)</span>
                </button>
              </div>
            </div>
          )}

          {/* STEP 2: Field Mapping Wizard */}
          {step === 2 && (
            <div className="space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white">مطابقة أعمدة الملف بمتغيرات القالب والكمية</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">حدد العمود المقابل لكل متغير، بما في ذلك عمود عدد النسخ والملصقات</p>
                </div>
                <div className="text-xs px-3 py-1 bg-slate-100 dark:bg-slate-800 rounded-lg text-slate-700 dark:text-slate-300">
                  عدد الصفوف في الملف: <span className="font-bold text-emerald-600 dark:text-emerald-400">{tempProducts.length}</span>
                </div>
              </div>

              <div className="space-y-3 bg-slate-50 dark:bg-slate-950/60 p-4 rounded-xl border border-slate-200 dark:border-slate-800">
                {Array.from(new Set([...targetFields, 'print_quantity'])).map((tField) => {
                  const currentMapping = currentMappings.find((m) => m.templateField === tField);
                  const selectedCol = currentMapping ? currentMapping.fileColumn : '';

                  const isQty = tField === 'print_quantity';

                  return (
                    <div
                      key={tField}
                      className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg border ${
                        isQty
                          ? 'bg-emerald-50 dark:bg-emerald-950/20 border-emerald-300 dark:border-emerald-800/60'
                          : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800/80 shadow-sm'
                      }`}
                    >
                      <div className="flex items-center gap-2">
                        <span className={`w-2 h-2 rounded-full ${isQty ? 'bg-emerald-500' : 'bg-brand-500'}`} />
                        <span className={`text-xs font-bold ${isQty ? 'text-emerald-800 dark:text-emerald-300' : 'text-slate-800 dark:text-slate-200'}`}>
                          {fieldLabels[tField] || tField}
                        </span>
                        {isQty && (
                          <span className="text-[10px] bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-400 px-1.5 py-0.5 rounded font-mono font-bold">
                            اختياري (الافتراضي 1)
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-slate-500 hidden sm:inline">يقابله عمود:</span>
                        <select
                          value={selectedCol}
                          onChange={(e) => handleUpdateMapping(tField, e.target.value)}
                          className="bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none min-w-[200px]"
                        >
                          <option value="">-- {isQty ? 'نسخة واحدة لكل صنف (1)' : 'غير مربوط'} --</option>
                          {fileColumns.map((col) => (
                            <option key={col} value={col}>
                              {col}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* STEP 3: Live Table Preview & Quantity Editor */}
          {step === 3 && (
            <div className="space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 bg-slate-50 dark:bg-slate-950/60 p-3.5 rounded-xl border border-slate-200 dark:border-slate-800">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 dark:text-white flex items-center gap-2">
                    <span>قائمة المنتجات والكميات المراد طباعتها</span>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                      {totalStickersCount} ملصق إجمالي
                    </span>
                  </h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400">يمكنك تعديل عدد الاستيكرات لكل منتج مباشرة من الجدول</p>
                </div>

                {/* Bulk Quantity Set */}
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-slate-500 dark:text-slate-400">تعيين كمية للكل:</span>
                  <div className="flex items-center gap-1">
                    {[1, 2, 5, 10].map((num) => (
                      <button
                        key={num}
                        onClick={() => handleSetAllQuantities(num)}
                        className="px-2 py-1 rounded bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-mono font-bold border border-slate-300 dark:border-slate-700 hover:border-emerald-500 transition-colors"
                      >
                        {num}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto max-h-[350px]">
                <table className="w-full text-right text-xs">
                  <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-200 dark:border-slate-800">
                    <tr>
                      <th className="p-3">#</th>
                      <th className="p-3">اسم المنتج</th>
                      <th className="p-3">السعر</th>
                      <th className="p-3">الباركود</th>
                      <th className="p-3 text-center">عدد الملصقات (الكمية)</th>
                      <th className="p-3">الوحدة</th>
                      <th className="p-3">إجراءات</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-900/40">
                    {paginatedTempProducts.map((p, idx) => {
                      const rowNum = (safePreviewPage - 1) * PAGE_SIZE + idx + 1;
                      const nameMap = currentMappings.find((m) => m.templateField === 'product_name')?.fileColumn;
                      const priceMap = currentMappings.find((m) => m.templateField === 'price')?.fileColumn;
                      const barcodeMap = currentMappings.find((m) => m.templateField === 'barcode')?.fileColumn;
                      const unitMap = currentMappings.find((m) => m.templateField === 'unit')?.fileColumn;
                      const qMap = currentMappings.find((m) => m.templateField === 'print_quantity')?.fileColumn;

                      const rawQty = qMap ? p[qMap] : (p.print_quantity || p.quantity || 1);
                      const currentQty = parseInt(String(rawQty), 10) || 1;

                      return (
                        <tr key={p.id || rowNum} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                          <td className="p-3 text-slate-400 font-mono">{rowNum}</td>
                          <td className="p-3 font-semibold text-slate-900 dark:text-white">
                            {nameMap ? p[nameMap] || p['product_name'] || '-' : p['product_name'] || '-'}
                          </td>
                          <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">
                            {priceMap ? p[priceMap] || p['price'] || '-' : p['price'] || '-'}
                          </td>
                          <td className="p-3 font-mono text-slate-600 dark:text-slate-300">
                            {barcodeMap ? p[barcodeMap] || p['barcode'] || '-' : p['barcode'] || '-'}
                          </td>
                          <td className="p-3">
                            <div className="flex items-center justify-center gap-1">
                              <button
                                onClick={() => handleQuantityChange(p.id, currentQty - 1)}
                                className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs"
                              >
                                -
                              </button>
                              <input
                                type="number"
                                min="1"
                                max="9999"
                                value={currentQty}
                                onChange={(e) => handleQuantityChange(p.id, parseInt(e.target.value, 10))}
                                className="w-14 bg-slate-50 dark:bg-slate-950 border border-emerald-500/50 rounded text-center text-emerald-700 dark:text-emerald-300 font-bold text-xs py-1 focus:outline-none focus:border-emerald-500"
                              />
                              <button
                                onClick={() => handleQuantityChange(p.id, currentQty + 1)}
                                className="w-6 h-6 rounded bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs"
                              >
                                +
                              </button>
                            </div>
                          </td>
                          <td className="p-3 text-slate-600 dark:text-slate-300">
                            {unitMap ? p[unitMap] || p['unit'] || '-' : p['unit'] || '-'}
                          </td>
                          <td className="p-3">
                            <button
                              onClick={() => handleDeleteRow(p.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                              title="حذف من القائمة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPreviewPages > 1 && (
                <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-1">
                  <span>
                    عرض {paginatedTempProducts.length} من أصل {tempProducts.length} صنف
                  </span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                      disabled={safePreviewPage <= 1}
                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold disabled:opacity-40"
                    >
                      السابق
                    </button>
                    <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                      صفحة {safePreviewPage} / {totalPreviewPages}
                    </span>
                    <button
                      onClick={() => setPreviewPage((p) => Math.min(totalPreviewPages, p + 1))}
                      disabled={safePreviewPage >= totalPreviewPages}
                      className="px-3 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-300 dark:border-slate-700 font-bold disabled:opacity-40"
                    >
                      التالي
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Footer Controls */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((prev) => (prev - 1) as any)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition-colors"
            >
              <ArrowRight className="w-4 h-4" />
              <span>السابق</span>
            </button>
          ) : (
            <div />
          )}

          {step < 3 ? (
            <button
              onClick={() => setStep((prev) => (prev + 1) as any)}
              disabled={tempProducts.length === 0}
              className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white text-xs font-bold shadow-lg shadow-emerald-600/20 transition-all"
            >
              <span>التالي</span>
              <ArrowLeft className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={handleFinish}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white text-xs font-bold shadow-lg shadow-emerald-600/30 transition-all hover:scale-[1.02]"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>تطبيق وتوليد {totalStickersCount} ملصق ({tempProducts.length} صنف)</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
