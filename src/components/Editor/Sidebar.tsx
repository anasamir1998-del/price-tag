import React, { useState, useRef } from 'react';
import {
  Type,
  DollarSign,
  Barcode as BarcodeIcon,
  QrCode,
  Square,
  Circle,
  Minus,
  Sparkles,
  Layers,
  Palette,
  Percent,
  Tag,
  Plus,
  Sliders,
  Maximize2,
  Image as ImageIcon,
  Upload,
  ShoppingBag,
  ShoppingCart,
  HeartPulse,
  Leaf,
  Star,
  Download,
} from 'lucide-react';
import { TagTemplate, TagElement, ElementType, BarcodeType, ShapeType } from '../../types';
import { readAndCompressImageFile } from '../../utils/storage';
import { downloadTemplateSvg } from '../../utils/tagRenderer';

interface SidebarProps {
  template: TagTemplate;
  onUpdateTemplate: (template: TagTemplate) => void;
  onAddElement: (element: TagElement) => void;
  selectedElementId: string | null;
  onOpenPresetSizes: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  template,
  onUpdateTemplate,
  onAddElement,
  selectedElementId,
  onOpenPresetSizes,
}) => {
  const [activeTab, setActiveTab] = useState<'elements' | 'canvas'>('elements');

  // Helper to generate unique element IDs
  const createId = (prefix: string) => `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`;

  // Quick element adders
  const addDynamicText = (fieldName: string, name: string, fallback: string, fontSize = 10, isBold = true) => {
    const el: TagElement = {
      id: createId(`el_${fieldName}`),
      type: 'text',
      name: name,
      isDynamic: true,
      fieldName: fieldName,
      fallbackValue: fallback,
      left: Math.max(2, template.widthMm / 2 - 20),
      top: Math.max(2, template.heightMm / 2 - 5),
      width: Math.min(40, template.widthMm - 4),
      height: 8,
      fontSize: fontSize,
      fontWeight: isBold ? 'bold' : 'normal',
      textColor: '#0f172a',
      textAlign: 'center',
      fontFamily: 'Tajawal, sans-serif',
      zIndex: template.elements.length + 1,
    };
    onAddElement(el);
  };

  const addPriceElement = () => {
    const el: TagElement = {
      id: createId('el_price'),
      type: 'price',
      name: 'السعر الحالي',
      isDynamic: true,
      fieldName: 'price',
      fallbackValue: '49.95',
      suffix: ' ر.س',
      left: Math.max(2, template.widthMm / 2 - 15),
      top: Math.max(2, template.heightMm / 2 - 6),
      width: 30,
      height: 12,
      fontSize: 16,
      fontWeight: '900',
      textColor: '#dc2626',
      textAlign: 'center',
      fontFamily: 'Arial, sans-serif',
      zIndex: template.elements.length + 1,
    };
    onAddElement(el);
  };

  const addOldPriceElement = () => {
    const el: TagElement = {
      id: createId('el_old_price'),
      type: 'text',
      name: 'السعر قبل الخصم',
      isDynamic: true,
      fieldName: 'old_price',
      prefix: 'بدلاً من: ',
      suffix: ' ر.س',
      fallbackValue: '65.00',
      left: Math.max(2, template.widthMm / 2 - 15),
      top: Math.max(2, template.heightMm / 2 - 4),
      width: 30,
      height: 6,
      fontSize: 7,
      textColor: '#64748b',
      textAlign: 'center',
      textDecoration: 'line-through',
      fontFamily: 'Tajawal, sans-serif',
      zIndex: template.elements.length + 1,
    };
    onAddElement(el);
  };

  const addBarcodeElement = (type: BarcodeType = 'code128') => {
    const el: TagElement = {
      id: createId('el_barcode'),
      type: 'barcode',
      name: 'الباركود',
      isDynamic: true,
      fieldName: 'barcode',
      fallbackValue: '628100123456',
      barcodeType: type,
      includeBarcodeText: true,
      left: Math.max(2, template.widthMm / 2 - 22),
      top: Math.max(2, template.heightMm - 12),
      width: Math.min(44, template.widthMm - 4),
      height: 10,
      zIndex: template.elements.length + 1,
    };
    onAddElement(el);
  };

  const addQrCodeElement = () => {
    const el: TagElement = {
      id: createId('el_qr'),
      type: 'qrcode',
      name: 'رمز QR',
      isDynamic: true,
      fieldName: 'barcode',
      fallbackValue: 'https://example.com',
      left: Math.max(2, template.widthMm / 2 - 8),
      top: Math.max(2, template.heightMm / 2 - 8),
      width: 16,
      height: 16,
      zIndex: template.elements.length + 1,
    };
    onAddElement(el);
  };

  const addShape = (shapeType: ShapeType) => {
    const el: TagElement = {
      id: createId(`el_${shapeType}`),
      type: 'shape',
      name: shapeType === 'circle' ? 'دائرة' : 'مستطيل',
      shapeType: shapeType,
      left: Math.max(2, template.widthMm / 2 - 15),
      top: Math.max(2, template.heightMm / 2 - 8),
      width: 30,
      height: 16,
      fillColor: '#f1f5f9',
      borderColor: '#cbd5e1',
      borderWidth: 0.5,
      borderRadius: shapeType === 'rectangle' ? 2 : 0,
      zIndex: 1,
    };
    onAddElement(el);
  };

  const addLine = () => {
    const el: TagElement = {
      id: createId('el_line'),
      type: 'line',
      name: 'خط فاصل',
      left: 2,
      top: template.heightMm / 2,
      width: template.widthMm - 4,
      height: 1,
      borderColor: '#cbd5e1',
      borderWidth: 0.5,
      zIndex: 2,
    };
    onAddElement(el);
  };

  const addBadge = (text: string, color = '#ef4444') => {
    const el: TagElement = {
      id: createId('el_badge'),
      type: 'badge',
      name: `شارة ${text}`,
      text: text,
      left: 2,
      top: 2,
      width: 18,
      height: 7,
      fillColor: color,
      textColor: '#ffffff',
      fontSize: 7,
      fontWeight: 'bold',
      borderRadius: 2,
      fontFamily: 'Tajawal, sans-serif',
      zIndex: template.elements.length + 1,
    };
    onAddElement(el);
  };

  const imageInputRef = useRef<HTMLInputElement>(null);
  const watermarkInputRef = useRef<HTMLInputElement>(null);
  const templateBgInputRef = useRef<HTMLInputElement>(null);

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const { dataUrl } = await readAndCompressImageFile(file, 800);
      if (dataUrl) {
        const el: TagElement = {
          id: createId('el_logo'),
          type: 'image',
          name: file.name.replace(/\.[^/.]+$/, '') || 'شعار المتجر',
          imageUrl: dataUrl,
          imageFit: 'contain',
          left: Math.max(2, template.widthMm / 2 - 10),
          top: 2,
          width: 20,
          height: 12,
          zIndex: template.elements.length + 1,
        };
        onAddElement(el);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleWatermarkUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const { dataUrl } = await readAndCompressImageFile(file, 800);
      if (dataUrl) {
        onUpdateTemplate({
          ...template,
          backgroundImage: dataUrl,
          watermarkOpacity: template.watermarkOpacity ?? 0.15,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleTemplateBgUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    try {
      const { dataUrl } = await readAndCompressImageFile(file, 1200);
      if (dataUrl) {
        const bgEl: TagElement = {
          id: 'el_template_bg',
          type: 'image',
          name: 'خلفية القالب المرفوع',
          imageUrl: dataUrl,
          imageFit: 'fill',
          left: 0,
          top: 0,
          width: template.widthMm,
          height: template.heightMm,
          opacity: 1,
          zIndex: 0,
          locked: true,
        };

        // Keep only dynamic elements and user logos/texts, replacing old background shapes/template bg
        const hasExistingBg = template.elements.some((el) => el.id === 'el_template_bg');
        const filteredElements = hasExistingBg
          ? template.elements.map((el) => (el.id === 'el_template_bg' ? bgEl : el))
          : [
              bgEl,
              ...template.elements
                .filter((el) => el.isDynamic || el.type === 'barcode' || el.type === 'qrcode')
                .map((el, idx) => ({ ...el, zIndex: idx + 2 })),
            ];

        onUpdateTemplate({
          ...template,
          name: file.name.replace(/\.[^/.]+$/, '') || template.name,
          borderWidth: 0,
          elements: filteredElements,
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const addTextWatermark = () => {
    const el: TagElement = {
      id: createId('el_watermark'),
      type: 'text',
      name: 'علامة مائية نصية',
      text: 'اسم المتجر',
      fontSize: 20,
      fontWeight: '900',
      textColor: '#64748b',
      opacity: 0.15,
      textAlign: 'center',
      left: 2,
      top: Math.max(2, (template.heightMm - 14) / 2),
      width: Math.max(10, template.widthMm - 4),
      height: 14,
      zIndex: 0,
    };
    onAddElement(el);
  };

  const addPresetLogoSvg = (name: string, svgContent: string) => {
    const dataUrl = `data:image/svg+xml;utf8,${encodeURIComponent(svgContent)}`;
    const el: TagElement = {
      id: createId('el_logo'),
      type: 'image',
      name: name,
      imageUrl: dataUrl,
      imageFit: 'contain',
      left: Math.max(2, template.widthMm / 2 - 8),
      top: 2,
      width: 16,
      height: 12,
      zIndex: template.elements.length + 1,
    };
    onAddElement(el);
  };

  return (
    <aside className="w-full lg:w-72 xl:w-80 border-l border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/90 backdrop-blur-md flex flex-col h-full select-none transition-colors">
      {/* Sidebar Tabs */}
      <div className="flex border-b border-slate-200 dark:border-slate-800 p-1 bg-slate-100 dark:bg-slate-950/40">
        <button
          onClick={() => setActiveTab('elements')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'elements'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <Plus className="w-3.5 h-3.5" />
          <span>إضافة عناصر</span>
        </button>
        <button
          onClick={() => setActiveTab('canvas')}
          className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
            activeTab === 'canvas'
              ? 'bg-brand-600 text-white shadow-sm'
              : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200/60 dark:hover:bg-slate-800/50'
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          <span>إعدادات البطاقة</span>
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-6">
        {activeTab === 'elements' ? (
          <>
            {/* Dynamic Product Fields */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                  حقول المنتجات الديناميكية
                </span>
                <span className="text-[10px] text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2 py-0.5 rounded border border-brand-200 dark:border-brand-800/50">
                  تتغير تلقائياً
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addDynamicText('product_name', 'اسم المنتج', 'اسم المنتج التجريبي', 10, true)}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-brand-500/50 text-right transition-all group shadow-sm"
                >
                  <Type className="w-4 h-4 text-brand-500 dark:text-brand-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">اسم المنتج</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{"{{product_name}}"}</span>
                </button>

                <button
                  onClick={addPriceElement}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-brand-500/50 text-right transition-all group shadow-sm"
                >
                  <DollarSign className="w-4 h-4 text-emerald-500 dark:text-emerald-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">السعر الحالي</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{"{{price}}"}</span>
                </button>

                <button
                  onClick={addOldPriceElement}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-brand-500/50 text-right transition-all group shadow-sm"
                >
                  <span className="text-xs text-rose-500 dark:text-rose-400 line-through font-bold mb-1.5">99.00</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">السعر السابق</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{"{{old_price}}"}</span>
                </button>

                <button
                  onClick={() => addDynamicText('discount_percentage', 'نسبة الخصم', '25%', 12, true)}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-brand-500/50 text-right transition-all group shadow-sm"
                >
                  <Percent className="w-4 h-4 text-amber-500 dark:text-amber-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">نسبة الخصم</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{"{{discount}}"}</span>
                </button>

                <button
                  onClick={() => addDynamicText('unit', 'الوحدة والوزن', 'حبة / كجم', 8, false)}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-brand-500/50 text-right transition-all group shadow-sm"
                >
                  <Tag className="w-4 h-4 text-sky-500 dark:text-sky-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">الوحدة / الوزن</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{"{{unit}}"}</span>
                </button>

                <button
                  onClick={() => addDynamicText('origin', 'بلد المنشأ', 'السعودية', 8, false)}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-brand-500/50 text-right transition-all group shadow-sm"
                >
                  <span className="text-xs font-bold text-indigo-500 dark:text-indigo-400 mb-1.5">🇸🇦</span>
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">بلد المنشأ</span>
                  <span className="text-[10px] text-slate-400 dark:text-slate-500">{"{{origin}}"}</span>
                </button>

                <button
                  onClick={() => addDynamicText('category', 'شارة القسم والتصنيف', 'سوبرماركت ومواد غذائية', 8, true)}
                  className="flex flex-col items-start p-2.5 rounded-xl bg-purple-50/60 dark:bg-purple-950/40 hover:bg-purple-100 dark:hover:bg-purple-900/50 border border-purple-200 dark:border-purple-800/60 hover:border-purple-500/50 text-right transition-all group shadow-sm"
                >
                  <Layers className="w-4 h-4 text-purple-600 dark:text-purple-400 mb-1.5 group-hover:scale-110 transition-transform" />
                  <span className="text-xs font-bold text-purple-900 dark:text-purple-200">شارة القسم</span>
                  <span className="text-[10px] text-purple-500 dark:text-purple-400">{"{{category}}"}</span>
                </button>
              </div>
            </div>

            {/* Barcodes & QR */}
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                <BarcodeIcon className="w-3.5 h-3.5 text-sky-500 dark:text-sky-400" />
                الباركود ورموز الاستجابة
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addBarcodeElement('code128')}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-brand-500/50 text-right transition-all group shadow-sm"
                >
                  <BarcodeIcon className="w-4 h-4 text-brand-500 dark:text-brand-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">باركود خطي</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">Code-128</div>
                  </div>
                </button>

                <button
                  onClick={() => addBarcodeElement('ean13')}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-brand-500/50 text-right transition-all group shadow-sm"
                >
                  <BarcodeIcon className="w-4 h-4 text-brand-500 dark:text-brand-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">باركود EAN-13</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">13 رقم للمنتجات</div>
                  </div>
                </button>

                <button
                  onClick={addQrCodeElement}
                  className="col-span-2 flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-brand-500/50 text-right transition-all group shadow-sm"
                >
                  <QrCode className="w-4 h-4 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <div className="text-xs font-bold text-slate-800 dark:text-slate-200">رمز استجابة سريعة (QR Code)</div>
                    <div className="text-[10px] text-slate-400 dark:text-slate-500">للروابط، الفاتورة الإلكترونية، أو تفاصيل المنتج</div>
                  </div>
                </button>
              </div>
            </div>

            {/* Logos & Images */}
            <div>
              <div className="flex items-center justify-between mb-2.5">
                <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
                  <ImageIcon className="w-3.5 h-3.5 text-pink-500 dark:text-pink-400" />
                  الشعارات والصور
                </span>
                <span className="text-[10px] text-pink-600 dark:text-pink-400 bg-pink-50 dark:bg-pink-950/60 px-2 py-0.5 rounded border border-pink-200 dark:border-pink-800/50">
                  شعار المتجر
                </span>
              </div>

              {/* Upload Custom Template or Logo Button */}
              <div className="space-y-2">
                <button
                  onClick={() => templateBgInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-brand-600/15 to-indigo-600/15 hover:from-brand-600/25 hover:to-indigo-600/25 border border-brand-400 dark:border-brand-700/60 hover:border-brand-500 text-brand-700 dark:text-brand-200 text-xs font-bold transition-all shadow-sm group"
                  title="رفع صورة تصميم كامل (من Canva أو Photoshop) ليصبح خلفية القالب بالكامل"
                >
                  <Upload className="w-4 h-4 text-brand-600 dark:text-brand-400 group-hover:scale-110 transition-transform" />
                  <span>رفع تصميم قالب كامل للبطاقة (PNG, JPG, SVG)</span>
                </button>
                <input
                  ref={templateBgInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml, image/webp"
                  onChange={handleTemplateBgUpload}
                  className="hidden"
                />

                <button
                  onClick={() => imageInputRef.current?.click()}
                  className="w-full flex items-center justify-center gap-2 p-3 rounded-xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 hover:from-pink-500/20 hover:to-purple-500/20 border border-pink-300 dark:border-pink-700/50 hover:border-pink-500 text-pink-700 dark:text-pink-200 text-xs font-bold transition-all shadow-sm group"
                >
                  <Upload className="w-4 h-4 text-pink-500 dark:text-pink-400 group-hover:scale-110 transition-transform" />
                  <span>رفع شعار من جهازك (PNG, JPG, SVG)</span>
                </button>
                <input
                  ref={imageInputRef}
                  type="file"
                  accept="image/png, image/jpeg, image/svg+xml, image/webp"
                  onChange={handleLogoUpload}
                  className="hidden"
                />

                {/* Preset Store Icon Badges */}
                <div className="pt-1">
                  <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-1.5">أو اختر أيقونة متجر جاهزة:</span>
                  <div className="grid grid-cols-4 gap-1.5">
                    <button
                      onClick={() =>
                        addPresetLogoSvg(
                          'سوبرماركت',
                          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="8" cy="21" r="1"/><circle cx="19" cy="21" r="1"/><path d="M2.05 2.05h2l2.66 12.42a2 2 0 0 0 2 1.58h9.78a2 2 0 0 0 1.95-1.57l1.65-7.43H5.12"/></svg>`
                        )
                      }
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center transition-all group shadow-sm"
                      title="سوبرماركت"
                    >
                      <ShoppingCart className="w-4 h-4 text-blue-500 dark:text-blue-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] text-slate-700 dark:text-slate-300 mt-1">سوبرماركت</span>
                    </button>

                    <button
                      onClick={() =>
                        addPresetLogoSvg(
                          'أزياء وموضة',
                          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#db2777" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2 3 6v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2V6l-3-4Z"/><path d="M3 6h18"/><path d="M16 10a4 4 0 0 1-8 0"/></svg>`
                        )
                      }
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center transition-all group shadow-sm"
                      title="أزياء"
                    >
                      <ShoppingBag className="w-4 h-4 text-pink-500 dark:text-pink-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] text-slate-700 dark:text-slate-300 mt-1">أزياء</span>
                    </button>

                    <button
                      onClick={() =>
                        addPresetLogoSvg(
                          'صيدلية وعناية',
                          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#059669" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/><path d="M12 5v14"/><path d="M5 12h14"/></svg>`
                        )
                      }
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center transition-all group shadow-sm"
                      title="صيدلية"
                    >
                      <HeartPulse className="w-4 h-4 text-emerald-500 dark:text-emerald-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] text-slate-700 dark:text-slate-300 mt-1">صيدلية</span>
                    </button>

                    <button
                      onClick={() =>
                        addPresetLogoSvg(
                          'عضوي وطبيعي',
                          `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M11 20A7 7 0 0 1 9.8 6.1C15.5 5 17 4.48 19 2c1 2 2 4.18 2 8 0 5.5-4.78 10-10 10Z"/><path d="M2 21c0-3 1.85-5.36 5.08-6C9.5 14.52 12 13 13 12"/></svg>`
                        )
                      }
                      className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-slate-700 flex flex-col items-center justify-center text-center transition-all group shadow-sm"
                      title="عضوي"
                    >
                      <Leaf className="w-4 h-4 text-green-500 dark:text-green-400 group-hover:scale-110 transition-transform" />
                      <span className="text-[9px] text-slate-700 dark:text-slate-300 mt-1">عضوي 100%</span>
                    </button>
                  </div>
                </div>

                {/* Watermark Tools */}
                <div className="pt-2 border-t border-slate-200 dark:border-slate-800 space-y-1.5">
                  <span className="text-[10px] font-bold text-sky-600 dark:text-sky-400 block mb-1">
                    💧 أدوات العلامة المائية (خلفية باهتة):
                  </span>
                  <div className="grid grid-cols-2 gap-1.5">
                    <button
                      onClick={() => watermarkInputRef.current?.click()}
                      className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800/60 text-sky-900 dark:text-sky-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                      title="رفع صورة أو شعار كعلامة مائية باهتة بخلفية الاستيكر"
                    >
                      <Upload className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>شعار مائي</span>
                    </button>
                    <input
                      ref={watermarkInputRef}
                      type="file"
                      accept="image/png, image/jpeg, image/svg+xml, image/webp"
                      onChange={handleWatermarkUpload}
                      className="hidden"
                    />

                    <button
                      onClick={addTextWatermark}
                      className="p-2 rounded-lg bg-sky-50 dark:bg-sky-950/40 hover:bg-sky-100 dark:hover:bg-sky-900/50 border border-sky-200 dark:border-sky-800/60 text-sky-900 dark:text-sky-200 text-[11px] font-bold flex items-center justify-center gap-1 transition-all"
                      title="إضافة نص مائي باهت (مثل اسم المتجر) خلف الأسعار"
                    >
                      <Type className="w-3.5 h-3.5 text-sky-600 dark:text-sky-400" />
                      <span>نص مائي</span>
                    </button>
                  </div>

                  {template.backgroundImage && (
                    <div className="flex items-center justify-between p-1.5 rounded-lg bg-sky-100/70 dark:bg-sky-950/80 border border-sky-300 dark:border-sky-800 text-[10px] text-sky-900 dark:text-sky-200">
                      <span>✓ توجد علامة مائية بالخلفية</span>
                      <button
                        onClick={() => onUpdateTemplate({ ...template, backgroundImage: undefined })}
                        className="text-rose-500 hover:underline font-bold"
                      >
                        إزالة
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Static Shapes & Badges */}
            <div>
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 uppercase tracking-wider block mb-2.5 flex items-center gap-1.5">
                <Square className="w-3.5 h-3.5 text-purple-500 dark:text-purple-400" />
                أشكال وشارات وزخارف
              </span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => addShape('rectangle')}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-brand-500/50 text-right transition-all shadow-sm"
                >
                  <Square className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">مستطيل / إطار</span>
                </button>

                <button
                  onClick={() => addShape('circle')}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-brand-500/50 text-right transition-all shadow-sm"
                >
                  <Circle className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">دائرة</span>
                </button>

                <button
                  onClick={addLine}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 border border-slate-200 dark:border-slate-700/60 hover:border-brand-500/50 text-right transition-all shadow-sm"
                >
                  <Minus className="w-4 h-4 text-slate-600 dark:text-slate-300" />
                  <span className="text-xs font-bold text-slate-800 dark:text-slate-200">خط فاصل</span>
                </button>

                <button
                  onClick={() => addBadge('عرض خاص', '#dc2626')}
                  className="flex items-center gap-2 p-2.5 rounded-xl bg-rose-50 dark:bg-rose-950/40 hover:bg-rose-100 dark:hover:bg-rose-900/50 border border-rose-200 dark:border-rose-800/50 text-right transition-all shadow-sm"
                >
                  <Tag className="w-4 h-4 text-rose-500 dark:text-rose-400" />
                  <span className="text-xs font-bold text-rose-700 dark:text-rose-200">شارة عرض خاص</span>
                </button>
              </div>
            </div>
          </>
        ) : (
          /* Canvas & Card Settings Tab */
          <div className="space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-700 dark:text-slate-300">أبعاد البطاقة (بالمليمتر)</label>
                <button
                  onClick={onOpenPresetSizes}
                  className="text-xs text-brand-600 dark:text-brand-400 hover:text-brand-700 dark:hover:text-brand-300 flex items-center gap-1"
                >
                  <Maximize2 className="w-3 h-3" />
                  <span>مقاسات جاهزة</span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">العرض (مم):</span>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={template.widthMm}
                    onChange={(e) => onUpdateTemplate({ ...template, widthMm: Number(e.target.value) || 10 })}
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">الارتفاع (مم):</span>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    value={template.heightMm}
                    onChange={(e) => onUpdateTemplate({ ...template, heightMm: Number(e.target.value) || 10 })}
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">لون خلفية البطاقة</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  value={template.backgroundColor}
                  onChange={(e) => onUpdateTemplate({ ...template, backgroundColor: e.target.value })}
                  className="w-9 h-9 rounded-lg border border-slate-300 dark:border-slate-700 bg-transparent cursor-pointer"
                />
                <input
                  type="text"
                  value={template.backgroundColor}
                  onChange={(e) => onUpdateTemplate({ ...template, backgroundColor: e.target.value })}
                  className="flex-1 bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white uppercase focus:border-brand-500 focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-slate-700 dark:text-slate-300 mb-2 block">إطار البطاقة الخارجي</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">سُمك الإطار (مم):</span>
                  <input
                    type="number"
                    min="0"
                    max="5"
                    step="0.1"
                    value={template.borderWidth || 0}
                    onChange={(e) => onUpdateTemplate({ ...template, borderWidth: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
                <div>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400 mb-1 block">انحناء الزوايا (مم):</span>
                  <input
                    type="number"
                    min="0"
                    max="20"
                    step="0.5"
                    value={template.borderRadius || 0}
                    onChange={(e) => onUpdateTemplate({ ...template, borderRadius: Number(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-950/80 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-200 dark:border-slate-800">
              <button
                type="button"
                onClick={() => downloadTemplateSvg(template)}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl bg-teal-50 dark:bg-teal-950/50 hover:bg-teal-100 dark:hover:bg-teal-900/60 text-teal-700 dark:text-teal-300 border border-teal-200 dark:border-teal-800/60 text-xs font-bold transition-all shadow-sm"
              >
                <Download className="w-4 h-4" />
                <span>تحميل القالب بصيغة SVG</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};
