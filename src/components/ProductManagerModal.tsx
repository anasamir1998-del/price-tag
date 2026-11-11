import React, { useState, useMemo } from 'react';
import {
  X,
  Plus,
  Trash2,
  Edit2,
  FileSpreadsheet,
  RotateCcw,
  CheckCircle2,
  Package,
  Barcode,
  Sparkles,
  Save,
  Search,
} from 'lucide-react';
import { FieldMapping, ProductItem } from '../types';
import { DEFAULT_SAMPLE_PRODUCTS } from '../data/sampleProducts';
import { buildUpdatedProductPrices } from '../utils/tagRenderer';

interface ProductManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  mappings?: FieldMapping[];
  onUpdateProducts: (newProducts: ProductItem[]) => void;
  onOpenBulkImport: () => void;
}

export const ProductManagerModal: React.FC<ProductManagerModalProps> = ({
  isOpen,
  onClose,
  products,
  mappings,
  onUpdateProducts,
  onOpenBulkImport,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<ProductItem | null>(null);
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [currentPage, setCurrentPage] = useState<number>(1);
  const PAGE_SIZE = 50;

  // New/Edit Form State
  const [formData, setFormData] = useState<Partial<ProductItem>>({
    product_name: '',
    price: '',
    old_price: '',
    barcode: '',
    unit: 'حبة',
    print_quantity: 1,
    origin: '',
    category: '',
  });

  if (!isOpen) return null;

  const handleStartAdd = () => {
    setIsAddingNew(true);
    setEditingProduct(null);
    setFormData({
      product_name: '',
      price: '',
      old_price: '',
      barcode: `628${Math.floor(1000000000 + Math.random() * 9000000000)}`,
      unit: 'حبة',
      print_quantity: 1,
      origin: '',
      category: '',
    });
  };

  const handleStartEdit = (product: ProductItem) => {
    setEditingProduct(product);
    setIsAddingNew(false);
    setFormData({
      product_name: product.product_name || product['اسم المنتج'] || '',
      price: product.price || product['السعر'] || '',
      old_price: product.old_price || product['السعر السابق'] || '',
      barcode: product.barcode || product['الباركود'] || '',
      unit: product.unit || product['الوحدة'] || 'حبة',
      print_quantity: product.print_quantity || product.quantity || 1,
      origin: product.origin || product['بلد المنشأ'] || '',
      category: product.category || product['القسم'] || '',
    });
  };

  const handleSaveProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.product_name?.trim()) {
      alert('يرجى كتابة اسم المنتج');
      return;
    }

    if (isAddingNew) {
      const newProd: ProductItem = {
        id: `prod_${Date.now()}`,
        product_name: formData.product_name.trim(),
        price: formData.price || '0.00',
        old_price: formData.old_price || '',
        barcode: formData.barcode || '',
        unit: formData.unit || 'حبة',
        print_quantity: Math.max(1, Number(formData.print_quantity) || 1),
        quantity: Math.max(1, Number(formData.print_quantity) || 1),
        origin: formData.origin || '',
        category: formData.category || '',
      };
      onUpdateProducts([...products, newProd]);
      setIsAddingNew(false);
    } else if (editingProduct) {
      const updated = products.map((p) => {
        if (p.id !== editingProduct.id) return p;
        const patched = buildUpdatedProductPrices(
          p,
          {
            productName: formData.product_name?.trim() || '',
            price: formData.price || '',
            oldPrice: formData.old_price || '',
            printQuantity: Math.max(1, Number(formData.print_quantity) || 1),
          },
          mappings
        );
        return {
          ...patched,
          barcode: formData.barcode || '',
          unit: formData.unit || '',
          origin: formData.origin || '',
          category: formData.category || '',
        };
      });
      onUpdateProducts(updated);
      setEditingProduct(null);
    }
  };

  const handleDelete = (id: string) => {
    if (confirm('هل أنت متأكد من حذف هذا الصنف من القائمة؟')) {
      onUpdateProducts(products.filter((p) => p.id !== id));
    }
  };

  const handleClearAll = () => {
    if (confirm('هل أنت متأكد من مسح جميع الأصناف والبدء بقائمة فارغة؟')) {
      onUpdateProducts([]);
    }
  };

  const handleResetDemo = () => {
    if (confirm('هل تريد استعادة قائمة الأصناف التجريبية (8 منتجات)؟')) {
      onUpdateProducts(DEFAULT_SAMPLE_PRODUCTS);
    }
  };

  const filtered = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery
      .toLowerCase()
      .replace(/[أإآ]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[\u064B-\u065F\u0670]/g, '')
      .trim();

    return products.filter((p) => {
      const primary = `${p.product_name || ''} ${p['اسم المنتج'] || ''} ${p.barcode || ''} ${p['الباركود'] || ''} ${p.price || ''} ${p['السعر'] || ''} ${p.category || ''} ${p['القسم'] || ''}`
        .toLowerCase()
        .replace(/[أإآ]/g, 'ا')
        .replace(/ة/g, 'ه')
        .replace(/ى/g, 'ي')
        .replace(/[\u064B-\u065F\u0670]/g, '');
      if (primary.includes(q)) return true;

      return Object.entries(p).some(([key, val]) => {
        if (key === 'id') return false;
        const valStr = String(val || '')
          .toLowerCase()
          .replace(/[أإآ]/g, 'ا')
          .replace(/ة/g, 'ه')
          .replace(/ى/g, 'ي')
          .replace(/[\u064B-\u065F\u0670]/g, '')
          .trim();
        return valStr.includes(q);
      });
    });
  }, [products, searchQuery]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const paginatedFiltered = useMemo(() => {
    const start = (safePage - 1) * PAGE_SIZE;
    return filtered.slice(start, start + PAGE_SIZE);
  }, [filtered, safePage]);

  const totalQuantity = useMemo(
    () => products.reduce((sum, p) => sum + (Number(p.print_quantity || p.quantity) || 1), 0),
    [products]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-5xl h-[88vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-600 dark:text-blue-400">
              <Package className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">إدارة قائمة الأصناف والمنتجات</h2>
                <span className="text-xs px-2 py-0.5 rounded-full bg-blue-50 dark:bg-blue-500/20 text-blue-600 dark:text-blue-300 font-bold border border-blue-200 dark:border-blue-500/30">
                  {products.length} صنف ({totalQuantity} ملصق)
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                هذه هي الأصناف التي يتم توليد بطاقات الأسعار لها وطباعتها على الورق
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Toolbar */}
        <div className="px-6 py-3 bg-slate-50/50 dark:bg-slate-950/50 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="بحث في الأصناف بالاسم أو الباركود أو السعر..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-100 dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleStartAdd}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>إضافة صنف جديد</span>
            </button>

            <button
              onClick={() => {
                onClose();
                onOpenBulkImport();
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 hover:bg-emerald-100 dark:hover:bg-emerald-900/70 border border-emerald-200 dark:border-emerald-700/60 text-emerald-700 dark:text-emerald-300 text-xs font-bold transition-all"
            >
              <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <span>استيراد من إكسل</span>
            </button>

            {products.length > 0 ? (
              <button
                onClick={handleClearAll}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/50 text-rose-600 dark:text-rose-300 text-xs font-semibold transition-all"
                title="مسح كل الأصناف"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">تفريغ القائمة</span>
              </button>
            ) : (
              <button
                onClick={handleResetDemo}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold border border-slate-200 dark:border-slate-700 transition-all"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>استعادة البيانات التجريبية</span>
              </button>
            )}
          </div>
        </div>

        {/* Modal Body: Table or Edit Form */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* Add / Edit Form Modal/Drawer */}
          {(isAddingNew || editingProduct) && (
            <form
              onSubmit={handleSaveProduct}
              className="mb-6 p-4 rounded-2xl bg-slate-50 dark:bg-slate-950 border border-brand-500/30 space-y-4 shadow-xl animate-fadeIn"
            >
              <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800 pb-2">
                <h3 className="text-xs font-bold text-brand-600 dark:text-brand-300 flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                  <span>{isAddingNew ? 'إضافة صنف جديد' : `تعديل صنف: ${editingProduct?.product_name || ''}`}</span>
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingProduct(null);
                  }}
                  className="text-xs text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                >
                  إلغاء
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                <div className="sm:col-span-2">
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">اسم المنتج *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: زيت زيتون بكر ممتاز 1 لتر"
                    value={formData.product_name}
                    onChange={(e) => setFormData({ ...formData, product_name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">السعر الحالي (ر.س) *</label>
                  <input
                    type="text"
                    required
                    placeholder="مثال: 34.50"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold text-emerald-600 dark:text-emerald-400 focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">السعر السابق (اختياري)</label>
                  <input
                    type="text"
                    placeholder="مثال: 45.00"
                    value={formData.old_price}
                    onChange={(e) => setFormData({ ...formData, old_price: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">رقم الباركود</label>
                  <div className="flex gap-1">
                    <input
                      type="text"
                      placeholder="مثال: 6281001234567"
                      value={formData.barcode}
                      onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-mono focus:border-brand-500 focus:outline-none"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        setFormData({
                          ...formData,
                          barcode: `628${Math.floor(1000000000 + Math.random() * 9000000000)}`,
                        })
                      }
                      className="px-2 bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 rounded-lg border border-slate-300 dark:border-slate-700 text-[10px] text-slate-700 dark:text-slate-300 whitespace-nowrap"
                      title="توليد باركود عشوائي"
                    >
                      توليد
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">الوحدة / الحجم</label>
                  <input
                    type="text"
                    placeholder="مثال: حبة / كيس / كجم"
                    value={formData.unit}
                    onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">عدد الملصقات للطباعة</label>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={formData.print_quantity}
                    onChange={(e) => setFormData({ ...formData, print_quantity: Math.max(1, parseInt(e.target.value, 10) || 1) })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white font-bold text-center focus:border-brand-500 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">القسم / التصنيف</label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                  >
                    <option value="">-- اختر القسم --</option>
                    <option value="سوبرماركت ومواد غذائية">🛒 سوبرماركت ومواد غذائية</option>
                    <option value="مخبوزات وحلويات">🥐 مخبوزات وحلويات</option>
                    <option value="خضار وفواكه طازجة">🥦 خضار وفواكه طازجة</option>
                    <option value="لحوم ودواجن وأسماك">🥩 لحوم ودواجن وأسماك</option>
                    <option value="إلكترونيات وأجهزة ذكية">📱 إلكترونيات وأجهزة ذكية</option>
                    <option value="أزياء وملابس وأحذية">👕 أزياء وملابس وأحذية</option>
                    <option value="صيدلية وعناية صحية">💊 صيدلية وعناية صحية</option>
                    <option value="عطور وتجميل وعناية">🌸 عطور وتجميل وعناية</option>
                    <option value="عروض وتخفيضات موسمية">🏷️ عروض وتخفيضات موسمية</option>
                    <option value="ملصقات حرارية وطابعات باركود">🖨️ ملصقات حرارية وطابعات باركود</option>
                    <option value="عام / أقسام أخرى">📦 عام / أقسام أخرى</option>
                  </select>
                </div>

                <div>
                  <label className="block text-slate-600 dark:text-slate-400 mb-1 font-semibold">بلد المنشأ</label>
                  <input
                    type="text"
                    placeholder="مثال: السعودية"
                    value={formData.origin}
                    onChange={(e) => setFormData({ ...formData, origin: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-2 text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setIsAddingNew(false);
                    setEditingProduct(null);
                  }}
                  className="px-4 py-2 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-semibold"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
                >
                  <Save className="w-4 h-4" />
                  <span>حفظ الصنف</span>
                </button>
              </div>
            </form>
          )}

          {/* Products List Table */}
          {products.length === 0 ? (
            <div className="py-16 text-center space-y-4">
              <div className="w-16 h-16 rounded-2xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 mx-auto flex items-center justify-center text-slate-400">
                <Package className="w-8 h-8" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-900 dark:text-white">قائمة الأصناف فارغة حالياً</h3>
                <p className="text-xs text-slate-500 dark:text-slate-400 max-w-sm mx-auto mt-1">
                  يمكنك إضافة أصنافك الخاصة يدوياً واحداً تلو الآخر، أو استيراد مئات الأصناف دفعة واحدة من ملف Excel.
                </p>
              </div>
              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={handleStartAdd}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold"
                >
                  <Plus className="w-4 h-4" />
                  <span>إضافة أول صنف يدوياً</span>
                </button>
                <button
                  onClick={() => {
                    onClose();
                    onOpenBulkImport();
                  }}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold"
                >
                  <FileSpreadsheet className="w-4 h-4" />
                  <span>استيراد ملف Excel</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-x-auto shadow-sm">
              <table className="w-full text-right text-xs">
                <thead className="bg-slate-50 dark:bg-slate-950 text-slate-500 dark:text-slate-400 uppercase tracking-wider sticky top-0 border-b border-slate-200 dark:border-slate-800">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">اسم المنتج</th>
                    <th className="p-3">السعر الحالي</th>
                    <th className="p-3">السعر السابق</th>
                    <th className="p-3">الباركود</th>
                    <th className="p-3">الوحدة</th>
                    <th className="p-3 text-center">عدد الملصقات</th>
                    <th className="p-3">القسم / المنشأ</th>
                    <th className="p-3 text-center">إجراءات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 bg-white dark:bg-slate-900/40">
                  {paginatedFiltered.map((p, idx) => {
                    const rowNum = (safePage - 1) * PAGE_SIZE + idx + 1;
                    const name = p.product_name || p['اسم المنتج'] || '-';
                    const price = p.price || p['السعر'] || '-';
                    const oldPrice = p.old_price || p['السعر السابق'] || '';
                    const barcode = p.barcode || p['الباركود'] || '-';
                    const unit = p.unit || p['الوحدة'] || '-';
                    const qty = p.print_quantity || p.quantity || 1;
                    const cat = p.category || p['القسم'] || p.origin || p['بلد المنشأ'] || '-';

                    return (
                      <tr key={p.id || rowNum} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                        <td className="p-3 text-slate-400 font-mono">{rowNum}</td>
                        <td className="p-3 font-semibold text-slate-900 dark:text-white max-w-xs">{name}</td>
                        <td className="p-3 text-emerald-600 dark:text-emerald-400 font-bold">{price} ر.س</td>
                        <td className="p-3 text-slate-400 line-through">{oldPrice ? `${oldPrice} ر.س` : '-'}</td>
                        <td className="p-3 font-mono text-slate-600 dark:text-slate-300">{barcode}</td>
                        <td className="p-3 text-slate-600 dark:text-slate-300">{unit}</td>
                        <td className="p-3 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-mono font-bold text-xs">
                            {qty}
                          </span>
                        </td>
                        <td className="p-3 text-slate-500 dark:text-slate-400">{cat}</td>
                        <td className="p-3">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => handleStartEdit(p)}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="تعديل الصنف"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(p.id)}
                              className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-400 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg transition-colors"
                              title="حذف من القائمة"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/70 flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-slate-500 dark:text-slate-400">
            عرض {paginatedFiltered.length} من {filtered.length} صنف
          </span>
          {totalPages > 1 && (
            <div className="flex items-center gap-2 text-xs">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={safePage <= 1}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40"
              >
                السابق
              </button>
              <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                صفحة {safePage} / {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={safePage >= totalPages}
                className="px-3 py-1 rounded-lg bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 font-bold disabled:opacity-40"
              >
                التالي
              </button>
            </div>
          )}
          <button
            onClick={onClose}
            className="flex items-center gap-1.5 px-6 py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all"
          >
            <CheckCircle2 className="w-4 h-4" />
            <span>حفظ وإغلاق</span>
          </button>
        </div>
      </div>
    </div>
  );
};
