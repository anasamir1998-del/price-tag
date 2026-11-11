import React, { useState, useMemo } from 'react';
import { ProductItem, TagTemplate, CategoryType } from '../../types';
import { CATEGORIES_LIST, getCategoryById } from '../../data/categories';
import {
  Layers,
  Printer,
  FileSpreadsheet,
  PlusCircle,
  Sparkles,
  Search,
  Hash,
  Palette,
  Package,
  TrendingUp,
  Sliders,
  Filter,
  CheckCircle2,
  Trash2,
  Edit,
  DollarSign,
  ArrowUpRight,
  RefreshCw,
  ShoppingBag,
  Upload,
} from 'lucide-react';

interface DashboardViewProps {
  products: ProductItem[];
  template: TagTemplate;
  onUpdateProducts: (products: ProductItem[]) => void;
  onOpenDesigner: () => void;
  onOpenPrintPreview: (filterCategory?: string) => void;
  onOpenBulkImport: () => void;
  onOpenProductManager: () => void;
  onOpenTemplates: () => void;
  onOpenQuickPriceEditor?: (productIndex?: number) => void;
  onSelectProductForEditor?: (index: number) => void;
}

// Normalize Arabic text and remove diacritics / letter variations for smart search
function normalizeText(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .replace(/[\s\-_]+/g, ' ')
    .trim();
}

export const DashboardView: React.FC<DashboardViewProps> = ({
  products,
  template,
  onUpdateProducts,
  onOpenDesigner,
  onOpenPrintPreview,
  onOpenBulkImport,
  onOpenProductManager,
  onOpenTemplates,
  onOpenQuickPriceEditor,
  onSelectProductForEditor,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 50;

  // O(1) lookup map from product id -> original index in products array
  const productIndexMap = useMemo(() => {
    const map = new Map<string, number>();
    for (let i = 0; i < products.length; i++) {
      map.set(products[i].id, i);
    }
    return map;
  }, [products]);

  // Calculate Key Metrics
  const totalProducts = products.length;
  const totalStickersToPrint = useMemo(() => {
    let sum = 0;
    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      sum += p.print_quantity !== undefined ? p.print_quantity : (p.quantity || 1);
    }
    return sum;
  }, [products]);

  // Distinct Categories in current products
  const categoryStats = useMemo(() => {
    const map = new Map<string, { count: number; stickers: number }>();

    for (let i = 0; i < products.length; i++) {
      const p = products[i];
      const cat = p.category || p['القسم'] || p['التصنيف'] || 'عام / أقسام أخرى';
      const existing = map.get(cat) || { count: 0, stickers: 0 };
      existing.count += 1;
      existing.stickers += p.print_quantity !== undefined ? p.print_quantity : (p.quantity || 1);
      map.set(cat, existing);
    }

    return map;
  }, [products]);

  // Filtered Products (fast path when no filter + fast field lookup)
  const filteredProducts = useMemo(() => {
    const q = normalizeText(searchQuery);
    const catQ = selectedCategory === 'all' ? '' : normalizeText(selectedCategory);

    if (!q && !catQ) return products;

    return products.filter((p) => {
      if (catQ) {
        const matchesCat =
          (p.category_id && p.category_id === selectedCategory) ||
          (p.category && normalizeText(p.category).includes(catQ)) ||
          (p['القسم'] && normalizeText(p['القسم']).includes(catQ)) ||
          (p['التصنيف'] && normalizeText(p['التصنيف']).includes(catQ));
        if (!matchesCat) return false;
      }

      if (!q) return true;

      const primaryText = `${p.product_name || ''} ${p['اسم المنتج'] || ''} ${p['اسم الصنف'] || ''} ${p.barcode || ''} ${p['الباركود'] || ''} ${p.price || ''} ${p['السعر'] || ''} ${p.category || ''} ${p['القسم'] || ''}`;
      if (normalizeText(primaryText).includes(q)) return true;

      return Object.entries(p).some(([key, val]) => {
        if (key === 'id') return false;
        return normalizeText(val).includes(q);
      });
    });
  }, [products, searchQuery, selectedCategory]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedProducts = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, safePage]);

  // Handle single product quantity update
  const handleUpdateQty = (id: string, qty: number) => {
    const validQty = Math.max(0, Math.min(9999, isNaN(qty) ? 0 : qty));
    onUpdateProducts(
      products.map((p) => (p.id === id ? { ...p, print_quantity: validQty, quantity: validQty } : p))
    );
  };

  // Handle set all filtered quantities
  const handleSetFilteredQty = (qty: number) => {
    const validQty = Math.max(0, qty);
    const targetIds = new Set(filteredProducts.map((p) => p.id));
    onUpdateProducts(
      products.map((p) => (targetIds.has(p.id) ? { ...p, print_quantity: validQty, quantity: validQty } : p))
    );
  };

  // Handle Delete Product
  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الصنف؟')) {
      onUpdateProducts(products.filter((p) => p.id !== id));
    }
  };

  return (
    <div className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-6 transition-colors">
      {/* Top Banner / Welcome & Quick Actions */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 rounded-2xl shadow-sm">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-brand-500/10 text-brand-600 dark:text-brand-400 border border-brand-500/20 flex items-center gap-1">
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              مركز التحكم والطباعة الذكي
            </span>
            <span className="text-xs text-slate-400">•</span>
            <span className="text-xs text-slate-500 dark:text-slate-400">
              القالب: <strong className="text-slate-700 dark:text-slate-200">{template.name}</strong> ({template.widthMm} × {template.heightMm} مم)
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 dark:text-white">
            لوحة تحكم الملصقات والأقسام
          </h1>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 max-w-2xl">
            إدارة شاملة لجميع أصناف المتجر، تصنيف الاستيكرات حسب الأقسام، والتحكم الفوري في كميات الطباعة والتصدير.
          </p>
        </div>

        {/* Global Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={onOpenTemplates}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-amber-50 dark:bg-amber-950/50 hover:bg-amber-100 dark:hover:bg-amber-900/60 text-amber-700 dark:text-amber-300 font-bold text-xs border border-amber-200 dark:border-amber-800/60 transition-all shadow-sm"
          >
            <Upload className="w-4 h-4 text-amber-600 dark:text-amber-400" />
            <span>رفع / اختيار قالب</span>
          </button>

          <button
            onClick={onOpenDesigner}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 font-bold text-xs border border-slate-300 dark:border-slate-700 transition-all shadow-sm"
          >
            <Palette className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <span>مصمم الاستيكر</span>
          </button>

          <button
            onClick={onOpenBulkImport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 font-bold text-xs border border-emerald-200 dark:border-emerald-800/60 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>استيراد إكسل</span>
          </button>

          <button
            onClick={() => onOpenPrintPreview()}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-xs shadow-lg shadow-brand-600/25 transition-all hover:scale-[1.02] active:scale-[0.98]"
          >
            <Printer className="w-4 h-4" />
            <span>طباعة وتوزيع ({totalStickersToPrint} ملصق)</span>
          </button>
        </div>
      </div>

      {/* Metrics Row (4 Cards) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Total Products */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              إجمالي الأصناف
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-slate-900 dark:text-white font-mono">
                {totalProducts}
              </span>
              <span className="text-xs text-slate-400">صنف مسجل</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
            <Package className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 2: Total Stickers Batch */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              إجمالي أمر الطباعة
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-emerald-600 dark:text-emerald-400 font-mono">
                {totalStickersToPrint}
              </span>
              <span className="text-xs text-slate-400">استيكر / ملصق</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400">
            <Printer className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 3: Active Departments */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              الأقسام والتصنيفات
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-purple-600 dark:text-purple-400 font-mono">
                {categoryStats.size}
              </span>
              <span className="text-xs text-slate-400">قسم نشط</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-600 dark:text-purple-400">
            <Layers className="w-6 h-6" />
          </div>
        </div>

        {/* Metric 4: Active Template Size */}
        <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm flex items-center justify-between">
          <div>
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 block mb-1">
              مقاس الاستيكر الحالي
            </span>
            <div className="flex items-baseline gap-1.5">
              <span className="text-xl font-black text-slate-800 dark:text-slate-200 font-mono">
                {template.widthMm} × {template.heightMm}
              </span>
              <span className="text-xs text-slate-400">مم</span>
            </div>
          </div>
          <button
            onClick={onOpenTemplates}
            title="تغيير القالب"
            className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-600 dark:text-amber-400 hover:bg-amber-500/20 transition-colors"
          >
            <Sliders className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Categories Department Strip */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-5 rounded-2xl shadow-sm space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-brand-600 dark:text-brand-400" />
            <h3 className="text-sm font-bold text-slate-900 dark:text-white">
              أقسام وتصنيفات الاستيكرات
            </h3>
            <span className="text-xs text-slate-400">
              (انقر على أي قسم لفلترة المنتجات أو الطباعة المخصصة)
            </span>
          </div>

          {selectedCategory !== 'all' && (
            <button
              onClick={() => setSelectedCategory('all')}
              className="text-xs text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1 font-semibold"
            >
              <RefreshCw className="w-3 h-3" />
              <span>عرض جميع الأقسام</span>
            </button>
          )}
        </div>

        {/* Categories Chips */}
        <div className="flex flex-wrap gap-2 pt-1">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
              selectedCategory === 'all'
                ? 'bg-brand-600 text-white border-brand-500 shadow-sm shadow-brand-600/30'
                : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span>🏷️ الكل</span>
            <span className="px-1.5 py-0.5 rounded-full text-[10px] bg-black/15 font-mono">
              {totalProducts}
            </span>
          </button>

          {CATEGORIES_LIST.map((cat) => {
            const stat = categoryStats.get(cat.nameAr) || { count: 0, stickers: 0 };
            const isSelected = selectedCategory === cat.id || selectedCategory === cat.nameAr;

            return (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(isSelected ? 'all' : cat.id)}
                className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border transition-all ${
                  isSelected
                    ? 'bg-brand-600 text-white border-brand-500 shadow-sm shadow-brand-600/30'
                    : 'bg-slate-50 dark:bg-slate-800/80 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800'
                }`}
              >
                <span>{cat.icon} {cat.nameAr}</span>
                {stat.count > 0 && (
                  <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-black/20 text-white' : 'bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300'
                  }`}>
                    {stat.count} ({stat.stickers}م)
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Interactive Product Manager Table */}
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden flex flex-col">
        {/* Table Toolbar */}
        <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-50/50 dark:bg-slate-950/40">
          <div className="flex items-center gap-3 flex-1 max-w-md">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="بحث بالاسم، الباركود، أو القسم..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 focus:outline-none"
              />
            </div>

            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-200"
              >
                مسح
              </button>
            )}
          </div>

          {/* Quick Bulk Adjusters & Actions */}
          <div className="flex items-center gap-2 flex-wrap">
            {onOpenQuickPriceEditor && (
              <button
                onClick={() => onOpenQuickPriceEditor(0)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all shadow-sm"
                title="تعديل السعر قبل وبعد لجميع الأصناف في مكان مخصص سريع"
              >
                <DollarSign className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
                <span>تعديل الأسعار السريع</span>
              </button>
            )}

            <div className="flex items-center gap-1">
              <span className="text-[11px] text-slate-400 hidden xl:inline">
                كمية للظاهرين:
              </span>
              {[1, 2, 5, 10].map((n) => (
                <button
                  key={n}
                  onClick={() => handleSetFilteredQty(n)}
                  className="px-2 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold border border-slate-200 dark:border-slate-700"
                >
                  {n}
                </button>
              ))}
            </div>

            <button
              onClick={onOpenProductManager}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-50 dark:bg-brand-950/40 text-brand-700 dark:text-brand-300 hover:bg-brand-100 dark:hover:bg-brand-900/50 border border-brand-200 dark:border-brand-800/60 text-xs font-bold transition-colors"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              <span>إضافة صنف</span>
            </button>
          </div>
        </div>

        {/* Products Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-right text-xs">
            <thead className="bg-slate-50 dark:bg-slate-950/80 text-slate-500 dark:text-slate-400 uppercase tracking-wider border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="p-3.5">#</th>
                <th className="p-3.5">اسم المنتج</th>
                <th className="p-3.5">القسم والتصنيف</th>
                <th className="p-3.5">السعر (قبل وبعد)</th>
                <th className="p-3.5">الباركود</th>
                <th className="p-3.5 text-center">عدد الملصقات (الكمية)</th>
                <th className="p-3.5 text-center">معاينة بالمصمم</th>
                <th className="p-3.5">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-slate-400 dark:text-slate-500">
                    <ShoppingBag className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="font-semibold">لا توجد أصناف مطابقة للبحث أو القسم المحدد</p>
                  </td>
                </tr>
              ) : (
                paginatedProducts.map((p, idx) => {
                  const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                  const originalIndex = productIndexMap.get(p.id) ?? idx;
                  const catInfo = getCategoryById(p.category_id || p.category);
                  const currentQty = p.print_quantity !== undefined ? p.print_quantity : (p.quantity || 1);
                  const isSelectedForPrint = currentQty > 0;

                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors group"
                    >
                      <td className="p-3.5 text-slate-400 font-mono">{rowNum}</td>
                      
                      {/* Product Name */}
                      <td className="p-3.5">
                        <div className="font-bold text-slate-900 dark:text-white">
                          {p.product_name || p['اسم المنتج'] || 'بدون اسم'}
                        </div>
                        {p.description && (
                          <div className="text-[11px] text-slate-400 truncate max-w-xs">
                            {p.description}
                          </div>
                        )}
                      </td>

                      {/* Category Badge */}
                      <td className="p-3.5">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold border ${catInfo.badgeBg}`}>
                          <span>{catInfo.icon}</span>
                          <span>{p.category || catInfo.nameAr}</span>
                        </span>
                      </td>

                      {/* Price - Clickable to Open Quick Price Changer */}
                      <td className="p-3.5">
                        <button
                          type="button"
                          onClick={() => onOpenQuickPriceEditor && onOpenQuickPriceEditor(originalIndex >= 0 ? originalIndex : idx)}
                          className="text-right p-1 rounded-lg hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition-all group/price border border-transparent hover:border-emerald-500/30"
                          title="انقر لتعديل السعر قبل وبعد لهذا الصنف"
                        >
                          <div className="font-bold text-emerald-600 dark:text-emerald-400 font-mono text-sm flex items-center gap-1">
                            <span>{p.price || p['السعر'] || '0.00'}</span>
                            <span className="text-[10px] font-sans text-slate-400">ر.س</span>
                            <Edit className="w-3 h-3 text-emerald-500 opacity-0 group-hover/price:opacity-100 transition-opacity" />
                          </div>
                          {p.old_price && (
                            <div className="text-[10px] text-slate-400 line-through font-mono">
                              {p.old_price} ر.س
                            </div>
                          )}
                        </button>
                      </td>

                      {/* Barcode */}
                      <td className="p-3.5 font-mono text-slate-600 dark:text-slate-300">
                        {p.barcode || p['الباركود'] || '-'}
                      </td>

                      {/* Quantity Modifier */}
                      <td className="p-3.5">
                        <div className="flex items-center justify-center gap-1">
                          <button
                            onClick={() => handleUpdateQty(p.id, currentQty - 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                          >
                            -
                          </button>
                          <input
                            type="number"
                            min="0"
                            max="999"
                            value={currentQty}
                            onChange={(e) => handleUpdateQty(p.id, parseInt(e.target.value, 10))}
                            className={`w-14 bg-slate-50 dark:bg-slate-950 border rounded-lg text-center font-bold text-xs py-1 focus:outline-none ${
                              isSelectedForPrint
                                ? 'border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                                : 'border-slate-300 dark:border-slate-700 text-slate-400'
                            }`}
                          />
                          <button
                            onClick={() => handleUpdateQty(p.id, currentQty + 1)}
                            className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                          >
                            +
                          </button>
                        </div>
                      </td>

                      {/* Open In Designer */}
                      <td className="p-3.5 text-center">
                        <button
                          onClick={() => {
                            if (onSelectProductForEditor) {
                              onSelectProductForEditor(originalIndex >= 0 ? originalIndex : idx);
                            }
                            onOpenDesigner();
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-brand-600 hover:text-white dark:hover:bg-brand-600 text-slate-700 dark:text-slate-300 text-xs font-semibold transition-all border border-slate-200 dark:border-slate-700"
                        >
                          <Palette className="w-3.5 h-3.5" />
                          <span>معاينة</span>
                        </button>
                      </td>

                      {/* Actions */}
                      <td className="p-3.5">
                        <div className="flex items-center gap-1">
                          {onOpenQuickPriceEditor && (
                            <button
                              onClick={() => onOpenQuickPriceEditor(originalIndex >= 0 ? originalIndex : idx)}
                              className="p-1.5 rounded-lg text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-950/50 transition-colors"
                              title="تعديل السعر قبل وبعد"
                            >
                              <DollarSign className="w-4 h-4" />
                            </button>
                          )}
                          <button
                            onClick={() => handleDelete(p.id)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/40 transition-colors"
                            title="حذف الصنف"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer with Pagination */}
        <div className="p-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500 dark:text-slate-400">
          <div>
            عرض <strong className="text-slate-800 dark:text-slate-200">{paginatedProducts.length}</strong> من أصل{' '}
            <strong className="text-slate-800 dark:text-slate-200">{filteredProducts.length}</strong> صنف مطابق (الإجمالي:{' '}
            <strong className="text-slate-800 dark:text-slate-200">{totalProducts}</strong>)
          </div>

          {totalPages > 1 && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                السابق
              </button>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300 px-2">
                صفحة {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-3 py-1.5 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
              >
                التالي
              </button>
            </div>
          )}

          <div className="flex items-center gap-3">
            <button
              onClick={() => onOpenPrintPreview(selectedCategory !== 'all' ? selectedCategory : undefined)}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 transition-all"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>طباعة الأصناف المحددة</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
