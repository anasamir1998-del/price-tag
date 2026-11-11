import React, { useState } from 'react';
import {
  Type,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Bold,
  Italic,
  Strikethrough,
  Underline,
  Sparkles,
  Barcode,
  Layers,
  Lock,
  Unlock,
  Trash2,
  ArrowUp,
  ArrowDown,
  Copy,
  Sliders,
  ChevronDown,
  ChevronUp,
  Palette,
  Maximize2,
  MoveHorizontal,
  MoveVertical,
  RotateCw,
  Eye,
  EyeOff,
  Tag,
  Square,
  QrCode,
  Image as ImageIcon,
  Save,
  Check,
  Percent,
  DollarSign,
  Package,
} from 'lucide-react';
import { TagTemplate, TagElement, BarcodeType, CategoryType, ProductItem, FieldMapping } from '../../types';
import { CATEGORIES_LIST } from '../../data/categories';
import { readAndCompressImageFile } from '../../utils/storage';
import { buildUpdatedProductPrices, withOldPriceVisibility } from '../../utils/tagRenderer';

interface PropertiesPanelProps {
  template: TagTemplate;
  onUpdateTemplate: (template: TagTemplate) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  onOpenPresetSizes?: () => void;
  currentProduct?: ProductItem;
  mappings?: FieldMapping[];
  onUpdateProduct?: (updatedProduct: ProductItem) => void;
  onOpenSaveTemplateModal?: () => void;
}

const QUICK_COLORS = [
  '#000000', '#ffffff', '#dc2626', '#16a34a', '#2563eb',
  '#d97706', '#9333ea', '#475569', '#cbd5e1', '#f1f5f9',
];

export const PropertiesPanel: React.FC<PropertiesPanelProps> = ({
  template,
  onUpdateTemplate,
  selectedElementId,
  onSelectElement,
  onOpenPresetSizes,
  currentProduct,
  mappings,
  onUpdateProduct,
  onOpenSaveTemplateModal,
}) => {
  const [activeTab, setActiveTab] = useState<'design' | 'layers'>('design');

  const selectedElement = template.elements.find((el) => el.id === selectedElementId);

  const updateElement = (updates: Partial<TagElement>) => {
    if (!selectedElementId) return;
    onUpdateTemplate({
      ...template,
      elements: template.elements.map((el) => (el.id === selectedElementId ? { ...el, ...updates } : el)),
    });
  };

  const deleteElement = () => {
    if (!selectedElementId) return;
    onUpdateTemplate({
      ...template,
      elements: template.elements.filter((el) => el.id !== selectedElementId),
    });
    onSelectElement(null);
  };

  const duplicateElement = () => {
    if (!selectedElement) return;
    const newEl: TagElement = {
      ...selectedElement,
      id: `el_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      name: `${selectedElement.name} (نسخة)`,
      left: Math.min(template.widthMm - selectedElement.width, selectedElement.left + 3),
      top: Math.min(template.heightMm - selectedElement.height, selectedElement.top + 3),
      zIndex: template.elements.length + 1,
    };
    onUpdateTemplate({
      ...template,
      elements: [...template.elements, newEl],
    });
    onSelectElement(newEl.id);
  };

  const moveZIndex = (direction: 'up' | 'down') => {
    if (!selectedElement) return;
    const currentZ = selectedElement.zIndex || 0;
    const newZ = direction === 'up' ? currentZ + 1 : Math.max(0, currentZ - 1);
    updateElement({ zIndex: newZ });
  };

  // Alignment helpers
  const alignCenterHorizontal = () => {
    if (!selectedElement) return;
    const newLeft = Math.max(0, Number(((template.widthMm - selectedElement.width) / 2).toFixed(1)));
    updateElement({ left: newLeft });
  };

  const alignCenterVertical = () => {
    if (!selectedElement) return;
    const newTop = Math.max(0, Number(((template.heightMm - selectedElement.height) / 2).toFixed(1)));
    updateElement({ top: newTop });
  };

  const alignLeftEdge = () => {
    if (!selectedElement) return;
    updateElement({ left: 2 });
  };

  const alignRightEdge = () => {
    if (!selectedElement) return;
    updateElement({ left: Math.max(0, template.widthMm - selectedElement.width - 2) });
  };

  // Quick Price Updates Helper
  const handlePriceChange = (field: 'price' | 'old_price' | 'print_quantity' | 'product_name', val: string | number) => {
    if (!currentProduct || !onUpdateProduct) return;

    const patch: {
      price?: string;
      oldPrice?: string;
      printQuantity?: number;
      productName?: string;
    } = {};

    if (field === 'price') patch.price = String(val);
    else if (field === 'old_price') patch.oldPrice = String(val);
    else if (field === 'print_quantity') patch.printQuantity = Number(val) || 1;
    else if (field === 'product_name') patch.productName = String(val);

    onUpdateProduct(buildUpdatedProductPrices(currentProduct, patch, mappings));
  };

  const applyDiscountPercent = (percent: number) => {
    if (!currentProduct || !onUpdateProduct) return;
    const oldP = parseFloat(String(currentProduct.old_price || currentProduct['السعر السابق'] || currentProduct.price || currentProduct['السعر'] || 0));
    if (oldP > 0) {
      const newP = (oldP * (1 - percent / 100)).toFixed(2);
      onUpdateProduct(
        buildUpdatedProductPrices(
          currentProduct,
          { oldPrice: oldP.toFixed(2), price: newP },
          mappings
        )
      );
    }
  };

  const showOldPrice = template.showOldPrice !== false;

  const renderOldPriceToggle = () => (
    <label className="flex items-center justify-between gap-2 p-2.5 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 cursor-pointer select-none">
      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
        طباعة السعر قبل الخصم (اختياري)
      </span>
      <span className="flex items-center gap-1.5">
        <span className={`text-[10px] font-bold ${showOldPrice ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
          {showOldPrice ? 'مفعّل' : 'مخفي'}
        </span>
        <input
          type="checkbox"
          checked={showOldPrice}
          onChange={(e) => onUpdateTemplate(withOldPriceVisibility(template, e.target.checked))}
          className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-brand-600 focus:ring-0 cursor-pointer"
        />
      </span>
    </label>
  );

  const fontFamilies = [
    { label: 'خط تجوال (Tajawal)', value: 'Tajawal, sans-serif' },
    { label: 'خط كايرو (Cairo)', value: 'Cairo, sans-serif' },
    { label: 'خط المراعي (Almarai)', value: 'Almarai, sans-serif' },
    { label: 'خط ريدكس (Readex Pro)', value: 'Readex Pro, sans-serif' },
    { label: 'خط أميري (Amiri)', value: 'Amiri, serif' },
    { label: 'خط إنتر (Inter)', value: 'Inter, sans-serif' },
    { label: 'خط أريال (Arial)', value: 'Arial, sans-serif' },
    { label: 'خط أحادي (Monospace)', value: 'monospace' },
  ];

  return (
    <aside className="w-80 border-r border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md flex flex-col h-[calc(100vh-4rem)] select-none transition-colors shadow-sm">
      {/* Top Banner: Quick Price-Only Mode Banner if locked */}
      {template.isLocked ? (
        <div className="p-3.5 bg-gradient-to-r from-amber-500/10 via-amber-500/5 to-transparent border-b border-amber-300 dark:border-amber-700/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-500 text-slate-950 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4" />
            </div>
            <div>
              <span className="text-xs font-bold text-slate-900 dark:text-white block">
                تعديل الأسعار فقط
              </span>
              <span className="text-[10px] text-amber-700 dark:text-amber-300">
                القالب محفوظ ومحمي من التعديل العشوائي
              </span>
            </div>
          </div>

          <button
            onClick={() => onUpdateTemplate({ ...template, isLocked: false })}
            className="p-1.5 rounded-lg border border-amber-300 dark:border-amber-700/60 text-amber-700 dark:text-amber-300 hover:bg-amber-100 dark:hover:bg-amber-900/40 text-[11px] font-bold transition-colors"
            title="فك القفل لتعديل كل عناصر التصميم"
          >
            فك القفل 🔓
          </button>
        </div>
      ) : (
        <div className="p-2.5 bg-slate-50 dark:bg-slate-950/60 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">
            وضع التصميم الكامل مفتوح
          </span>
          <button
            onClick={() => onUpdateTemplate({ ...template, isLocked: true })}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-700 dark:text-amber-300 text-[11px] font-bold hover:bg-amber-500/20 transition-all"
          >
            <Lock className="w-3 h-3" />
            <span>قفل لتعديل الأسعار فقط</span>
          </button>
        </div>
      )}

      {/* Header Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 p-1 bg-slate-100 dark:bg-slate-950/50">
        <button
          onClick={() => setActiveTab('design')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'design'
              ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>{template.isLocked ? 'الأسعار السريعة' : selectedElement ? 'خصائص العنصر' : 'إعدادات الاستيكر'}</span>
        </button>
        <button
          onClick={() => setActiveTab('layers')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
            activeTab === 'layers'
              ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>الطبقات ({template.elements.length})</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {activeTab === 'design' ? (
          template.isLocked ? (
            /* ========================================================================= */
            /* CASE 0: TEMPLATE IS LOCKED -> DEDICATED QUICK PRICE-ONLY ADJUSTER        */
            /* ========================================================================= */
            <div className="space-y-4 animate-fadeIn">
              {/* Product Price Editor Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-brand-50/70 to-indigo-50/70 dark:from-slate-950 dark:to-slate-900 border border-brand-200 dark:border-slate-800 space-y-3.5 shadow-sm">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-slate-900 dark:text-white flex items-center gap-1.5">
                    <DollarSign className="w-4 h-4 text-emerald-500" />
                    تعديل أسعار الصنف المعروض
                  </span>
                  {currentProduct?.discount_percentage && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-rose-500 text-white font-bold animate-pulse">
                      خصم {currentProduct.discount_percentage}
                    </span>
                  )}
                </div>

                {/* Product Name (Quick Read/Edit) */}
                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    اسم المنتج:
                  </label>
                  <input
                    type="text"
                    value={currentProduct?.product_name || currentProduct?.['اسم المنتج'] || ''}
                    onChange={(e) => handlePriceChange('product_name', e.target.value)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-bold focus:border-brand-500 focus:outline-none"
                  />
                </div>

                {/* Price Before (السعر قبل الخصم) & Price After (السعر بعد الخصم) */}
                <div className="grid grid-cols-2 gap-2.5 pt-1">
                  <div className={!showOldPrice ? 'opacity-50 transition-opacity' : ''}>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        🏷️ السعر قبل (السابق):
                      </label>
                      {(currentProduct?.old_price || currentProduct?.['السعر السابق']) && (
                        <button
                          type="button"
                          onClick={() => handlePriceChange('old_price', '')}
                          className="text-[10px] font-bold text-rose-500 hover:underline"
                          title="إزالة السعر قبل الخصم لهذا الصنف"
                        >
                          مسح
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      placeholder="اختياري"
                      value={currentProduct?.old_price || currentProduct?.['السعر السابق'] || ''}
                      onChange={(e) => handlePriceChange('old_price', e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-600 dark:text-slate-300 line-through font-mono font-bold focus:border-brand-500 focus:outline-none text-center"
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 block mb-1">
                      💵 السعر بعد (الحالي):
                    </label>
                    <input
                      type="text"
                      placeholder="مثال: 29.95"
                      value={currentProduct?.price || currentProduct?.['السعر'] || ''}
                      onChange={(e) => handlePriceChange('price', e.target.value)}
                      className="w-full bg-white dark:bg-slate-900 border-2 border-emerald-500 dark:border-emerald-600 rounded-lg px-2.5 py-2 text-base text-emerald-600 dark:text-emerald-400 font-mono font-black focus:outline-none text-center shadow-inner"
                    />
                  </div>
                </div>

                {renderOldPriceToggle()}

                {/* Quick Discount Percent Shortcuts */}
                <div>
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1.5 font-semibold">
                    خصم فوري سريع:
                  </span>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[10, 20, 30, 50].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => applyDiscountPercent(pct)}
                        className="py-1 rounded-lg bg-white dark:bg-slate-900 hover:bg-emerald-50 dark:hover:bg-emerald-950/60 border border-slate-300 dark:border-slate-700 hover:border-emerald-400 text-slate-700 dark:text-slate-300 text-xs font-bold font-mono transition-colors shadow-sm"
                      >
                        -{pct}%
                      </button>
                    ))}
                  </div>
                </div>

                {/* Print Quantity */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 dark:text-slate-300">
                      عدد الملصقات للطباعة:
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() =>
                          handlePriceChange(
                            'print_quantity',
                            Math.max(1, (currentProduct?.print_quantity || 1) - 1)
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={currentProduct?.print_quantity || currentProduct?.quantity || 1}
                        onChange={(e) =>
                          handlePriceChange(
                            'print_quantity',
                            Math.max(1, parseInt(e.target.value, 10) || 1)
                          )
                        }
                        className="w-12 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-1 text-center font-bold text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        onClick={() =>
                          handlePriceChange(
                            'print_quantity',
                            (currentProduct?.print_quantity || 1) + 1
                          )
                        }
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Template Permanent Save Action */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 block">
                  إدارة القالب المحفوظ
                </span>
                <p className="text-[11px] text-slate-500 dark:text-slate-400">
                  تم قفل مواضع ونصوص وتنسيق الاستيكر ليتم تعديل الأسعار فقط. يمكنك حفظه في قوالبك للرجوع إليه دائماً.
                </p>
                {onOpenSaveTemplateModal && (
                  <button
                    onClick={onOpenSaveTemplateModal}
                    className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>حفظ هذا الملصق في قوالبي الدائمة</span>
                  </button>
                )}
              </div>
            </div>
          ) : selectedElement ? (
            /* ========================================================================= */
            /* CASE 1: AN ELEMENT IS SELECTED -> UNIFIED PROPERTY INSPECTOR             */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Element Header: Name & Quick Actions */}
              <div className="p-3 bg-slate-50 dark:bg-slate-950/60 rounded-xl border border-slate-200 dark:border-slate-800 space-y-2.5">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-1 min-w-0">
                    <span className="w-2 h-2 rounded-full bg-brand-500 flex-shrink-0" />
                    <input
                      type="text"
                      value={selectedElement.name}
                      onChange={(e) => updateElement({ name: e.target.value })}
                      className="bg-transparent text-xs font-bold text-slate-900 dark:text-white focus:bg-white dark:focus:bg-slate-800 px-1.5 py-0.5 rounded border border-transparent focus:border-brand-500 w-full truncate"
                    />
                  </div>

                  {/* Actions (Lock, Duplicate, Delete) */}
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <button
                      onClick={() => updateElement({ locked: !selectedElement.locked })}
                      className={`p-1.5 rounded-lg border transition-colors ${
                        selectedElement.locked
                          ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-800 text-amber-600 dark:text-amber-400'
                          : 'border-slate-300 dark:border-slate-700 text-slate-500 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900'
                      }`}
                      title={selectedElement.locked ? 'إلغاء القفل' : 'قفل العنصر'}
                    >
                      {selectedElement.locked ? <Lock className="w-3.5 h-3.5" /> : <Unlock className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      onClick={duplicateElement}
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white bg-white dark:bg-slate-900 transition-colors"
                      title="تكرار العنصر"
                    >
                      <Copy className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={deleteElement}
                      className="p-1.5 rounded-lg border border-rose-200 dark:border-rose-900/60 text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/50 bg-white dark:bg-slate-900 transition-colors"
                      title="حذف العنصر"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Deselect element helper */}
                <button
                  onClick={() => onSelectElement(null)}
                  className="text-[11px] text-slate-400 hover:text-brand-600 dark:hover:text-brand-400 block text-left"
                >
                  ← العودة لإعدادات الاستيكر العامة
                </button>
              </div>

              {/* 1. Content & Dynamic Binding */}
              {(selectedElement.type === 'text' ||
                selectedElement.type === 'price' ||
                selectedElement.type === 'badge' ||
                selectedElement.type === 'barcode' ||
                selectedElement.type === 'qrcode') && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                      المحتوى والربط
                    </span>
                    <label className="flex items-center gap-1 text-[11px] text-slate-600 dark:text-slate-400 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={!!selectedElement.isDynamic}
                        onChange={(e) => updateElement({ isDynamic: e.target.checked })}
                        className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-brand-600"
                      />
                      <span>ربط ديناميكي</span>
                    </label>
                  </div>

                  {selectedElement.isDynamic ? (
                    <div className="space-y-2">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block">حقل البيانات المرتبط:</span>
                      <select
                        value={selectedElement.fieldName || ''}
                        onChange={(e) => updateElement({ fieldName: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                      >
                        <option value="product_name">اسم المنتج (Product Name)</option>
                        <option value="price">السعر الحالي (Price)</option>
                        <option value="old_price">السعر قبل الخصم (Old Price)</option>
                        <option value="category">القسم / التصنيف (Category)</option>
                        <option value="barcode">الباركود (Barcode)</option>
                        <option value="unit">الوحدة والوزن (Unit)</option>
                        <option value="discount_percentage">نسبة الخصم (Discount %)</option>
                        <option value="origin">بلد المنشأ (Origin)</option>
                        <option value="description">المواصفات والوصف (Description)</option>
                      </select>

                      <div className="grid grid-cols-2 gap-2 pt-1">
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">بادئة قبل النص:</span>
                          <input
                            type="text"
                            value={selectedElement.prefix || ''}
                            onChange={(e) => updateElement({ prefix: e.target.value })}
                            placeholder="مثال: ر.س"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">لاحقة بعد النص:</span>
                          <input
                            type="text"
                            value={selectedElement.suffix || ''}
                            onChange={(e) => updateElement({ suffix: e.target.value })}
                            placeholder="مثال: شامل الضريبة"
                            className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white"
                          />
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div>
                      <span className="text-[11px] text-slate-500 dark:text-slate-400 block mb-1">النص المكتوب:</span>
                      <textarea
                        rows={2}
                        value={selectedElement.text || selectedElement.fallbackValue || ''}
                        onChange={(e) => updateElement({ text: e.target.value, fallbackValue: e.target.value })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg p-2 text-xs text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none resize-none"
                      />
                    </div>
                  )}
                </div>
              )}

              {/* Specialized Barcode & QR Code Controls (Background Transparency & Colors) */}
              {(selectedElement.type === 'barcode' || selectedElement.type === 'qrcode') && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                      <Barcode className="w-3.5 h-3.5 text-brand-500" />
                      إعدادات الباركود والخلفية
                    </span>
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-brand-50 dark:bg-brand-950 text-brand-600 dark:text-brand-400 font-bold">
                      {selectedElement.barcodeType || 'code128'}
                    </span>
                  </div>

                  {/* Barcode Type Selector */}
                  <div className="space-y-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 block">نوع ترميز الباركود:</span>
                    <select
                      value={selectedElement.barcodeType || 'code128'}
                      onChange={(e) => updateElement({ barcodeType: e.target.value as any })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                    >
                      <option value="code128">Code-128 (شامل للأرقام والحروف)</option>
                      <option value="ean13">EAN-13 (سوبرماركت دولي 13 رقم)</option>
                      <option value="ean8">EAN-8 (منتجات صغيرة 8 أرقام)</option>
                      <option value="code39">Code-39 (صناعي)</option>
                      <option value="qrcode">QR Code (رمز استجابة سريعة)</option>
                    </select>
                  </div>

                  {/* Include Text Checkbox */}
                  {selectedElement.type === 'barcode' && selectedElement.barcodeType !== 'qrcode' && (
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={selectedElement.includeBarcodeText ?? true}
                        onChange={(e) => updateElement({ includeBarcodeText: e.target.checked })}
                        className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-brand-600"
                      />
                      <span>إظهار الأرقام تحت خطوط الباركود</span>
                    </label>
                  )}

                  {/* Barcode Background Controls */}
                  <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300">
                        خلفية الباركود:
                      </span>
                      <span className="text-[10px] font-mono text-slate-400">
                        {selectedElement.barcodeBgColor === 'transparent' || !selectedElement.barcodeBgColor
                          ? '💧 شفافة (مخفية)'
                          : selectedElement.barcodeBgColor}
                      </span>
                    </div>

                    {/* Quick Background Presets */}
                    <div className="grid grid-cols-2 gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          updateElement({
                            barcodeBgColor: 'transparent',
                            fillColor: undefined,
                          })
                        }
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                          selectedElement.barcodeBgColor === 'transparent' || !selectedElement.barcodeBgColor
                            ? 'bg-brand-600 text-white border-brand-500 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>💧 شفافة (غير ظاهرة)</span>
                      </button>

                      <button
                        type="button"
                        onClick={() =>
                          updateElement({
                            barcodeBgColor: '#ffffff',
                            fillColor: '#ffffff',
                          })
                        }
                        className={`py-1.5 px-2 rounded-lg text-xs font-bold border transition-all flex items-center justify-center gap-1 ${
                          selectedElement.barcodeBgColor === '#ffffff'
                            ? 'bg-brand-600 text-white border-brand-500 shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        <span>⚪ بيضاء</span>
                      </button>
                    </div>

                    {/* Custom Background Color Picker */}
                    <div className="flex items-center justify-between pt-1">
                      <span className="text-[10px] text-slate-400">أو اختيار لون مخصص:</span>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="color"
                          value={
                            selectedElement.barcodeBgColor && selectedElement.barcodeBgColor !== 'transparent'
                              ? selectedElement.barcodeBgColor
                              : '#ffffff'
                          }
                          onChange={(e) =>
                            updateElement({
                              barcodeBgColor: e.target.value,
                              fillColor: e.target.value,
                            })
                          }
                          className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer"
                        />
                        {selectedElement.barcodeBgColor && selectedElement.barcodeBgColor !== 'transparent' && (
                          <button
                            type="button"
                            onClick={() =>
                              updateElement({
                                barcodeBgColor: 'transparent',
                                fillColor: undefined,
                              })
                            }
                            className="text-[10px] text-rose-500 hover:underline font-bold"
                          >
                            تفريغ
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Barcode Lines Color */}
                  <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">لون خطوط الباركود:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={selectedElement.barcodeColor || selectedElement.textColor || '#000000'}
                        onChange={(e) =>
                          updateElement({
                            barcodeColor: e.target.value,
                            textColor: e.target.value,
                          })
                        }
                        className="w-6 h-6 rounded border border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                        {selectedElement.barcodeColor || selectedElement.textColor || '#000000'}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* 2. Typography & Colors */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-brand-500" />
                  الخط والمظهر والألوان
                </span>

                {/* Font Family & Size */}
                <div className="space-y-2">
                  <select
                    value={selectedElement.fontFamily || 'Tajawal, sans-serif'}
                    onChange={(e) => updateElement({ fontFamily: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                  >
                    {fontFamilies.map((f) => (
                      <option key={f.value} value={f.value}>
                        {f.label}
                      </option>
                    ))}
                  </select>

                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400 flex-shrink-0">الحجم (pt):</span>
                    <div className="flex items-center gap-1 flex-1">
                      <button
                        onClick={() => updateElement({ fontSize: Math.max(4, (selectedElement.fontSize || 10) - 1) })}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="4"
                        max="72"
                        value={selectedElement.fontSize || 10}
                        onChange={(e) => updateElement({ fontSize: Number(e.target.value) || 10 })}
                        className="flex-1 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg py-1 text-center font-bold text-xs text-slate-900 dark:text-white"
                      />
                      <button
                        onClick={() => updateElement({ fontSize: Math.min(72, (selectedElement.fontSize || 10) + 1) })}
                        className="w-7 h-7 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-xs"
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                {/* Text Formatting Toolbar (Bold, Italic, Strike, Alignments) */}
                <div className="flex items-center justify-between gap-1 pt-1 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateElement({ fontWeight: selectedElement.fontWeight === 'bold' || selectedElement.fontWeight === '900' ? 'normal' : 'bold' })}
                      className={`p-1.5 rounded-lg border text-xs transition-colors ${
                        selectedElement.fontWeight === 'bold' || selectedElement.fontWeight === '900'
                          ? 'bg-brand-600 text-white border-brand-500'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                      title="عريض (Bold)"
                    >
                      <Bold className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateElement({ fontStyle: selectedElement.fontStyle === 'italic' ? 'normal' : 'italic' })}
                      className={`p-1.5 rounded-lg border text-xs transition-colors ${
                        selectedElement.fontStyle === 'italic'
                          ? 'bg-brand-600 text-white border-brand-500'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                      title="مائل (Italic)"
                    >
                      <Italic className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateElement({ textDecoration: selectedElement.textDecoration === 'line-through' ? 'none' : 'line-through' })}
                      className={`p-1.5 rounded-lg border text-xs transition-colors ${
                        selectedElement.textDecoration === 'line-through'
                          ? 'bg-brand-600 text-white border-brand-500'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                      title="شطب خط بالسعر القديم (Strikethrough)"
                    >
                      <Strikethrough className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => updateElement({ textAlign: 'right' })}
                      className={`p-1.5 rounded-lg border text-xs ${
                        selectedElement.textAlign === 'right'
                          ? 'bg-brand-600 text-white border-brand-500'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                      title="محاذاة يمين"
                    >
                      <AlignRight className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateElement({ textAlign: 'center' })}
                      className={`p-1.5 rounded-lg border text-xs ${
                        selectedElement.textAlign === 'center' || !selectedElement.textAlign
                          ? 'bg-brand-600 text-white border-brand-500'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                      title="محاذاة وسط"
                    >
                      <AlignCenter className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => updateElement({ textAlign: 'left' })}
                      className={`p-1.5 rounded-lg border text-xs ${
                        selectedElement.textAlign === 'left'
                          ? 'bg-brand-600 text-white border-brand-500'
                          : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300'
                      }`}
                      title="محاذاة يسار"
                    >
                      <AlignLeft className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Colors: Text & Fill with Quick Palettes */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">لون النص / الأيقونة:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={selectedElement.textColor || '#000000'}
                        onChange={(e) => updateElement({ textColor: e.target.value })}
                        className="w-7 h-7 rounded border border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{selectedElement.textColor || '#000000'}</span>
                    </div>
                  </div>

                  {/* Quick Colors Dots */}
                  <div className="flex items-center justify-between gap-1">
                    {QUICK_COLORS.map((c) => (
                      <button
                        key={c}
                        onClick={() => updateElement({ textColor: c })}
                        style={{ backgroundColor: c }}
                        className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-125 transition-transform"
                        title={c}
                      />
                    ))}
                  </div>

                  {/* Fill & Background Color */}
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">لون تعبئة الخلفية:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={selectedElement.fillColor || '#ffffff'}
                        onChange={(e) => updateElement({ fillColor: e.target.value })}
                        className="w-7 h-7 rounded border border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer"
                      />
                      {selectedElement.fillColor && (
                        <button
                          onClick={() => updateElement({ fillColor: undefined })}
                          className="text-[10px] text-rose-500 hover:underline"
                        >
                          شفاف
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Opacity & Watermark Slider */}
                  <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-700 dark:text-slate-300 flex items-center gap-1">
                        💧 الشفافية (العلامة المائية):
                      </span>
                      <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                        {Math.round((selectedElement.opacity ?? 1) * 100)}%
                      </span>
                    </div>

                    <input
                      type="range"
                      min="0.05"
                      max="1"
                      step="0.05"
                      value={selectedElement.opacity ?? 1}
                      onChange={(e) => updateElement({ opacity: parseFloat(e.target.value) })}
                      className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                    />

                    {/* Quick Opacity Presets */}
                    <div className="flex items-center justify-between gap-1 pt-0.5">
                      {[
                        { label: '15% مائي', val: 0.15 },
                        { label: '30% باهت', val: 0.3 },
                        { label: '60% متوسط', val: 0.6 },
                        { label: '100% كامل', val: 1 },
                      ].map((op) => (
                        <button
                          key={op.label}
                          type="button"
                          onClick={() => updateElement({ opacity: op.val })}
                          className={`py-0.5 px-1.5 rounded text-[10px] border transition-colors ${
                            (selectedElement.opacity ?? 1) === op.val
                              ? 'bg-brand-600 text-white border-brand-500 font-bold'
                              : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                          }`}
                        >
                          {op.label}
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Border & Corners Customizer */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Square className="w-3.5 h-3.5 text-brand-500" />
                    إطار وحدود المربع (Border)
                  </span>
                  {selectedElement.borderWidth && selectedElement.borderWidth > 0 ? (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-bold border border-emerald-500/20">
                      مفعّل ({selectedElement.borderWidth} مم)
                    </span>
                  ) : (
                    <span className="text-[10px] text-slate-400">بدون إطار</span>
                  )}
                </div>

                {/* 1. Border Color */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">لون الإطار:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={selectedElement.borderColor || '#ef4444'}
                        onChange={(e) =>
                          updateElement({
                            borderColor: e.target.value,
                            borderWidth: selectedElement.borderWidth && selectedElement.borderWidth > 0 ? selectedElement.borderWidth : 1,
                          })
                        }
                        className="w-7 h-7 rounded border border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300">
                        {selectedElement.borderColor || '#ef4444'}
                      </span>
                    </div>
                  </div>

                  {/* Quick Color Dots for Border */}
                  <div className="flex items-center justify-between gap-1">
                    {[
                      '#ef4444', // Red
                      '#f43f5e', // Rose
                      '#f97316', // Orange
                      '#eab308', // Amber/Yellow
                      '#10b981', // Emerald
                      '#06b6d4', // Cyan
                      '#3b82f6', // Blue
                      '#8b5cf6', // Violet
                      '#000000', // Black
                      '#ffffff', // White
                      '#cbd5e1', // Light Slate
                    ].map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() =>
                          updateElement({
                            borderColor: c,
                            borderWidth: selectedElement.borderWidth && selectedElement.borderWidth > 0 ? selectedElement.borderWidth : 1,
                          })
                        }
                        style={{ backgroundColor: c }}
                        className="w-5 h-5 rounded-full border border-slate-300 dark:border-slate-600 hover:scale-125 transition-transform"
                        title={c}
                      />
                    ))}
                  </div>
                </div>

                {/* 2. Border Width (Thickness) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">سُمك الإطار (مم):</span>
                    <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                      {selectedElement.borderWidth || 0} مم
                    </span>
                  </div>

                  {/* Quick Thickness Buttons */}
                  <div className="grid grid-cols-5 gap-1">
                    {[
                      { label: 'بدون', val: 0 },
                      { label: '0.5 مم', val: 0.5 },
                      { label: '1 مم', val: 1 },
                      { label: '1.5 مم', val: 1.5 },
                      { label: '2.5 مم', val: 2.5 },
                    ].map((th) => (
                      <button
                        key={th.label}
                        type="button"
                        onClick={() => updateElement({ borderWidth: th.val })}
                        className={`py-1 rounded text-[10px] border transition-colors ${
                          (selectedElement.borderWidth || 0) === th.val
                            ? 'bg-brand-600 text-white border-brand-500 font-bold shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {th.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* 3. Border Radius (Corners) */}
                <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">انحناء الحواف (الزوايا):</span>
                    <span className="text-xs font-mono font-bold text-brand-600 dark:text-brand-400">
                      {selectedElement.borderRadius || 0} مم
                    </span>
                  </div>

                  {/* Quick Radius Buttons */}
                  <div className="grid grid-cols-4 gap-1">
                    {[
                      { label: 'حادة (0)', val: 0 },
                      { label: 'خفيف (2)', val: 2 },
                      { label: 'متوسط (5)', val: 5 },
                      { label: 'دائري (10)', val: 10 },
                    ].map((rd) => (
                      <button
                        key={rd.label}
                        type="button"
                        onClick={() => updateElement({ borderRadius: rd.val })}
                        className={`py-1 rounded text-[10px] border transition-colors ${
                          (selectedElement.borderRadius || 0) === rd.val
                            ? 'bg-brand-600 text-white border-brand-500 font-bold shadow-sm'
                            : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {rd.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* 3. Fast Alignment & Precise Dimensions */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Maximize2 className="w-3.5 h-3.5 text-brand-500" />
                  المحاذاة السريعة والأبعاد
                </span>

                {/* 1-Click Align Buttons */}
                <div className="grid grid-cols-4 gap-1.5">
                  <button
                    onClick={alignCenterHorizontal}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold flex flex-col items-center gap-1 shadow-sm"
                    title="توسيط أفقي"
                  >
                    <MoveHorizontal className="w-3.5 h-3.5 text-brand-500" />
                    <span>وسط أفقي</span>
                  </button>
                  <button
                    onClick={alignCenterVertical}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold flex flex-col items-center gap-1 shadow-sm"
                    title="توسيط رأسي"
                  >
                    <MoveVertical className="w-3.5 h-3.5 text-brand-500" />
                    <span>وسط رأسي</span>
                  </button>
                  <button
                    onClick={alignRightEdge}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold flex flex-col items-center gap-1 shadow-sm"
                    title="حافة اليمين"
                  >
                    <AlignRight className="w-3.5 h-3.5 text-slate-500" />
                    <span>أقصى يمين</span>
                  </button>
                  <button
                    onClick={alignLeftEdge}
                    className="p-2 rounded-lg bg-white dark:bg-slate-900 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 text-[10px] font-semibold flex flex-col items-center gap-1 shadow-sm"
                    title="حافة اليسار"
                  >
                    <AlignLeft className="w-3.5 h-3.5 text-slate-500" />
                    <span>أقصى يسار</span>
                  </button>
                </div>

                {/* X, Y, W, H Inputs */}
                <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">X (يسار):</span>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedElement.left}
                      onChange={(e) => updateElement({ left: Number(e.target.value) || 0 })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">Y (أعلى):</span>
                    <input
                      type="number"
                      step="0.5"
                      value={selectedElement.top}
                      onChange={(e) => updateElement({ top: Number(e.target.value) || 0 })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">العرض (W مم):</span>
                    <input
                      type="number"
                      step="0.5"
                      min="2"
                      value={selectedElement.width}
                      onChange={(e) => updateElement({ width: Math.max(2, Number(e.target.value) || 2) })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">الارتفاع (H مم):</span>
                    <input
                      type="number"
                      step="0.5"
                      min="2"
                      value={selectedElement.height}
                      onChange={(e) => updateElement({ height: Math.max(2, Number(e.target.value) || 2) })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white"
                    />
                  </div>
                </div>

                {/* Layer Stacking Order */}
                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800">
                  <span className="text-xs text-slate-500 dark:text-slate-400">ترتيب الطبقة:</span>
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => moveZIndex('down')}
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-xs bg-white dark:bg-slate-900"
                      title="للخلف"
                    >
                      <ArrowDown className="w-3.5 h-3.5" />
                      <span>للخلف</span>
                    </button>
                    <button
                      onClick={() => moveZIndex('up')}
                      className="p-1.5 rounded-lg border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 flex items-center gap-1 text-xs bg-white dark:bg-slate-900"
                      title="للأمام"
                    >
                      <ArrowUp className="w-3.5 h-3.5" />
                      <span>للأمام</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* 4. Special Type-Specific Controls (Barcode, QR, Image, Shapes) */}
              {selectedElement.type === 'barcode' && (
                <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-2.5">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Barcode className="w-3.5 h-3.5 text-sky-500" />
                    خيارات الباركود الخطي
                  </span>
                  <div className="space-y-2">
                    <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedElement.includeBarcodeText !== false}
                        onChange={(e) => updateElement({ includeBarcodeText: e.target.checked })}
                        className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-brand-600"
                      />
                      <span>إظهار الأرقام أسفل الباركود</span>
                    </label>
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* ========================================================================= */
            /* CASE 2: NO ELEMENT SELECTED -> UNIFIED TAG CANVAS & CATEGORY SETTINGS     */
            /* ========================================================================= */
            <div className="space-y-4">
              {/* Template Title & Category Card */}
              <div className="p-4 rounded-xl bg-gradient-to-br from-brand-50 to-indigo-50 dark:from-slate-950 dark:to-slate-900 border border-brand-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 text-xs font-bold text-brand-700 dark:text-brand-400">
                    <Tag className="w-4 h-4" />
                    <span>إعدادات بطاقة الاستيكر الشاملة</span>
                  </div>
                  {onOpenSaveTemplateModal && (
                    <button
                      onClick={onOpenSaveTemplateModal}
                      className="text-[11px] text-emerald-600 dark:text-emerald-400 hover:underline font-bold flex items-center gap-1"
                    >
                      <Save className="w-3 h-3" />
                      <span>حفظ كقالب</span>
                    </button>
                  )}
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    اسم القالب:
                  </label>
                  <input
                    type="text"
                    value={template.name}
                    onChange={(e) => onUpdateTemplate({ ...template, name: e.target.value })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white font-bold focus:border-brand-500 focus:outline-none"
                    placeholder="اسم القالب..."
                  />
                </div>

                <div>
                  <label className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block mb-1">
                    قسم وتصنيف الاستيكر:
                  </label>
                  <select
                    value={template.category}
                    onChange={(e) => onUpdateTemplate({ ...template, category: e.target.value as CategoryType })}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                  >
                    {CATEGORIES_LIST.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.icon} {c.nameAr}
                      </option>
                    ))}
                  </select>
                </div>

                {renderOldPriceToggle()}
              </div>

              {/* Tag Dimensions (Width & Height mm) */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Maximize2 className="w-3.5 h-3.5 text-brand-500" />
                    أبعاد الاستيكر (بالمليمتر)
                  </span>
                  {onOpenPresetSizes && (
                    <button
                      onClick={onOpenPresetSizes}
                      className="text-xs text-brand-600 dark:text-brand-400 hover:underline font-bold"
                    >
                      مقاسات جاهزة
                    </button>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">العرض (مم):</span>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={template.widthMm}
                      onChange={(e) => onUpdateTemplate({ ...template, widthMm: Number(e.target.value) || 20 })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">الارتفاع (مم):</span>
                    <input
                      type="number"
                      min="10"
                      max="300"
                      value={template.heightMm}
                      onChange={(e) => onUpdateTemplate({ ...template, heightMm: Number(e.target.value) || 20 })}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                </div>

                {/* Quick Size Badges */}
                <div className="pt-1">
                  <span className="text-[10px] text-slate-400 block mb-1">اختصارات مقاسات سريعة:</span>
                  <div className="grid grid-cols-3 gap-1.5">
                    {[
                      { label: '50 × 30 مم', w: 50, h: 30 },
                      { label: '80 × 50 مم', w: 80, h: 50 },
                      { label: '100 × 70 مم', w: 100, h: 70 },
                    ].map((s) => (
                      <button
                        key={s.label}
                        onClick={() => onUpdateTemplate({ ...template, widthMm: s.w, heightMm: s.h })}
                        className={`py-1 rounded text-[11px] font-mono border transition-all ${
                          template.widthMm === s.w && template.heightMm === s.h
                            ? 'bg-brand-600 text-white border-brand-500 font-bold'
                            : 'bg-white dark:bg-slate-900 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800'
                        }`}
                      >
                        {s.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Background Color & Outer Border */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                  <Palette className="w-3.5 h-3.5 text-brand-500" />
                  خلفية وحدود الاستيكر
                </span>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">لون الخلفية:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={template.backgroundColor || '#ffffff'}
                        onChange={(e) => onUpdateTemplate({ ...template, backgroundColor: e.target.value })}
                        className="w-7 h-7 rounded border border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{template.backgroundColor || '#ffffff'}</span>
                    </div>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">لون الإطار الخارجي:</span>
                    <div className="flex items-center gap-1.5">
                      <input
                        type="color"
                        value={template.borderColor || '#000000'}
                        onChange={(e) => onUpdateTemplate({ ...template, borderColor: e.target.value })}
                        className="w-7 h-7 rounded border border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer"
                      />
                      <span className="text-xs font-mono text-slate-700 dark:text-slate-300">{template.borderColor || '#000000'}</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 pt-1">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">سُمك الإطار (مم):</span>
                      <input
                        type="number"
                        min="0"
                        max="5"
                        step="0.5"
                        value={template.borderWidth || 0}
                        onChange={(e) => onUpdateTemplate({ ...template, borderWidth: Number(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">انحناء الحواف (مم):</span>
                      <input
                        type="number"
                        min="0"
                        max="20"
                        step="0.5"
                        value={template.borderRadius || 0}
                        onChange={(e) => onUpdateTemplate({ ...template, borderRadius: Number(e.target.value) || 0 })}
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Watermark Background Settings */}
              <div className="p-3.5 rounded-xl bg-slate-50 dark:bg-slate-950/50 border border-slate-200 dark:border-slate-800 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-sky-500" />
                    العلامة المائية وخلفية الاستيكر
                  </span>
                  {template.backgroundImage && (
                    <button
                      onClick={() => onUpdateTemplate({ ...template, backgroundImage: undefined })}
                      className="text-[10px] text-rose-500 hover:underline font-bold"
                    >
                      إزالة العلامة
                    </button>
                  )}
                </div>

                {template.backgroundImage ? (
                  <div className="space-y-2">
                    <div className="flex items-center gap-2 p-2 rounded-lg bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800">
                      <img
                        src={template.backgroundImage}
                        alt="Watermark"
                        className="w-10 h-10 object-contain rounded bg-slate-100 dark:bg-slate-800 border"
                      />
                      <div className="flex-1 min-w-0">
                        <span className="text-xs font-bold text-slate-900 dark:text-white block truncate">
                          شعار العلامة المائية مفعّل
                        </span>
                        <span className="text-[10px] text-slate-400">يظهر خلف الأسعار بشفافية</span>
                      </div>
                    </div>

                    {/* Watermark Size / Scale */}
                    <div className="space-y-1.5 pt-1 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700 dark:text-slate-300">حجم العلامة المائية:</span>
                        <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                          {Math.round((template.watermarkScale ?? 0.7) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.2"
                        max="1"
                        step="0.05"
                        value={template.watermarkScale ?? 0.7}
                        onChange={(e) => onUpdateTemplate({ ...template, watermarkScale: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                      />

                      {/* Quick Size Presets */}
                      <div className="grid grid-cols-4 gap-1 pt-0.5">
                        {[
                          { label: '35% صغير', val: 0.35 },
                          { label: '65% وسط', val: 0.65 },
                          { label: '85% كبير', val: 0.85 },
                          { label: '100% ملء', val: 1.0 },
                        ].map((sz) => (
                          <button
                            key={sz.label}
                            type="button"
                            onClick={() => onUpdateTemplate({ ...template, watermarkScale: sz.val })}
                            className={`py-0.5 px-1 rounded text-[10px] border transition-colors ${
                              (template.watermarkScale ?? 0.7) === sz.val
                                ? 'bg-brand-600 text-white border-brand-500 font-bold'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {sz.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Watermark Opacity / Clarity */}
                    <div className="space-y-1.5 pt-2 border-t border-slate-200 dark:border-slate-800">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="font-bold text-slate-700 dark:text-slate-300">درجة وضوح العلامة (الشفافية):</span>
                        <span className="font-mono font-bold text-brand-600 dark:text-brand-400">
                          {Math.round((template.watermarkOpacity ?? 0.15) * 100)}%
                        </span>
                      </div>
                      <input
                        type="range"
                        min="0.05"
                        max="0.8"
                        step="0.05"
                        value={template.watermarkOpacity ?? 0.15}
                        onChange={(e) => onUpdateTemplate({ ...template, watermarkOpacity: parseFloat(e.target.value) })}
                        className="w-full h-1.5 bg-slate-200 dark:bg-slate-700 rounded-lg appearance-none cursor-pointer accent-brand-600"
                      />

                      {/* Quick Opacity Presets */}
                      <div className="grid grid-cols-4 gap-1 pt-0.5">
                        {[
                          { label: '10% باهت', val: 0.1 },
                          { label: '20% مثالي', val: 0.2 },
                          { label: '40% واضح', val: 0.4 },
                          { label: '70% بارز', val: 0.7 },
                        ].map((op) => (
                          <button
                            key={op.label}
                            type="button"
                            onClick={() => onUpdateTemplate({ ...template, watermarkOpacity: op.val })}
                            className={`py-0.5 px-1 rounded text-[10px] border transition-colors ${
                              (template.watermarkOpacity ?? 0.15) === op.val
                                ? 'bg-brand-600 text-white border-brand-500 font-bold'
                                : 'bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800'
                            }`}
                          >
                            {op.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-dashed border-sky-300 dark:border-sky-700/60 hover:bg-sky-50 dark:hover:bg-sky-950/40 cursor-pointer text-center transition-all">
                      <Sparkles className="w-4 h-4 text-sky-500 mb-1" />
                      <span className="text-xs font-bold text-sky-700 dark:text-sky-300">رفع صورة كعلامة مائية باهتة</span>
                      <span className="text-[10px] text-slate-400">PNG, JPG, SVG</span>
                      <input
                        type="file"
                        accept="image/png, image/jpeg, image/svg+xml, image/webp"
                        onChange={async (e) => {
                          const file = e.target.files?.[0];
                          if (!file) return;
                          e.target.value = '';
                          try {
                            const { dataUrl: url } = await readAndCompressImageFile(file, 800);
                            if (url) {
                              onUpdateTemplate({
                                ...template,
                                backgroundImage: url,
                                watermarkOpacity: template.watermarkOpacity ?? 0.15,
                              });
                            }
                          } catch (err) {
                            console.error(err);
                          }
                        }}
                        className="hidden"
                      />
                    </label>
                  </div>
                )}
              </div>
            </div>
          )
        ) : (
          /* ========================================================================= */
          /* LAYERS TAB                                                                */
          /* ========================================================================= */
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-2">
              قائمة العناصر والطبقات
            </span>
            {template.elements.length === 0 ? (
              <div className="text-xs text-slate-400 text-center py-8">البطاقة فارغة حالياً</div>
            ) : (
              template.elements
                .slice()
                .reverse()
                .map((el) => (
                  <div
                    key={el.id}
                    onClick={() => {
                      onSelectElement(el.id);
                      setActiveTab('design');
                    }}
                    className={`flex items-center justify-between p-2.5 rounded-xl border transition-all cursor-pointer ${
                      el.id === selectedElementId
                        ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-950 dark:text-white font-bold shadow-sm'
                        : 'bg-white dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800'
                    }`}
                  >
                    <div className="flex items-center gap-2 overflow-hidden">
                      <span className="text-xs truncate">{el.name}</span>
                      {el.isDynamic && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-600 dark:text-brand-300 font-semibold">
                          ديناميكي
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          updateElement({ hidden: !el.hidden });
                        }}
                        className="p-1 text-slate-400 hover:text-slate-700 dark:hover:text-white"
                        title={el.hidden ? 'إظهار' : 'إخفاء'}
                      >
                        {el.hidden ? <EyeOff className="w-3.5 h-3.5 text-slate-400" /> : <Eye className="w-3.5 h-3.5 text-slate-500" />}
                      </button>
                    </div>
                  </div>
                ))
            )}
          </div>
        )}
      </div>
    </aside>
  );
};
