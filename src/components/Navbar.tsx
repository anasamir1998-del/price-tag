import React, { useRef } from 'react';
import {
  LayoutTemplate,
  FileSpreadsheet,
  Printer,
  Download,
  Upload,
  Undo2,
  Redo2,
  Sparkles,
  Maximize2,
  Save,
  FileDown,
  Tag,
  Package,
  DollarSign,
  Sun,
  Moon,
  Smartphone,
} from 'lucide-react';
import { TagTemplate, ProductItem } from '../types';
import { downloadSampleExcel } from '../utils/excelParser';
import { downloadFile } from '../utils/fileDownloader';
import {
  readAndCompressImageFile,
  createTemplateFromUploadedImage,
  loadCustomTemplatesFromStorage,
  saveCustomTemplatesToStorage,
} from '../utils/storage';

interface NavbarProps {
  template: TagTemplate;
  onUpdateTemplate: (template: TagTemplate) => void;
  products: ProductItem[];
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onOpenTemplates: () => void;
  onOpenBulkImport: () => void;
  onOpenPrintPreview: () => void;
  onOpenPresetSizes: () => void;
  onOpenProductManager: () => void;
  onOpenQuickPriceEditor?: (productIndex?: number) => void;
  onOpenMobileConnect?: () => void;
  theme: 'dark' | 'light';
  onToggleTheme: () => void;
  viewMode: 'dashboard' | 'editor';
  onViewModeChange: (mode: 'dashboard' | 'editor') => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  template,
  onUpdateTemplate,
  products,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onOpenTemplates,
  onOpenBulkImport,
  onOpenPrintPreview,
  onOpenPresetSizes,
  onOpenProductManager,
  onOpenQuickPriceEditor,
  onOpenMobileConnect,
  theme,
  onToggleTheme,
  viewMode,
  onViewModeChange,
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Export template as JSON file
  const handleExportJson = () => {
    const jsonStr = JSON.stringify(template, null, 2);
    const safeName = (template.name || 'template').replace(/[/\\?%*:|"<>]/g, '_');
    downloadFile(jsonStr, `${safeName}.json`, 'application/json;charset=utf-8');
  };

  // Import template from JSON or Image file
  const handleImportJson = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    // 1. JSON Template File
    if (file.name.toLowerCase().endsWith('.json') || file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const parsed = JSON.parse(event.target?.result as string);
          if (parsed.widthMm && parsed.heightMm && Array.isArray(parsed.elements)) {
            const imported: TagTemplate = {
              ...parsed,
              id: parsed.id || `imported_${Date.now()}`,
              name: parsed.name || file.name.replace(/\.json$/i, ''),
            };
            const existing = loadCustomTemplatesFromStorage();
            saveCustomTemplatesToStorage([imported, ...existing.filter((t) => t.id !== imported.id)]);
            onUpdateTemplate(imported);
          } else {
            alert('ملف JSON غير متوافق مع بنية قوالب بطاقات الأسعار');
          }
        } catch (err) {
          alert('حدث خطأ أثناء قراءة ملف JSON');
        }
      };
      reader.readAsText(file);
      return;
    }

    // 2. Image Template File (PNG, JPG, WEBP, SVG)
    if (file.type.startsWith('image/') || /\.(png|jpe?g|webp|svg)$/i.test(file.name)) {
      try {
        const { dataUrl, width, height } = await readAndCompressImageFile(file, 1200);
        const ratio = width / (height || 1);
        const widthMm = ratio > 1.15 ? 210 : 148;
        const heightMm = ratio > 1.15 ? 148 : 210;
        const cleanName = file.name.replace(/\.[^/.]+$/, '');
        const newTemplate = createTemplateFromUploadedImage({
          imageUrl: dataUrl,
          name: cleanName ? `قالب: ${cleanName}` : 'قالب مرفوع من جهازي',
          widthMm,
          heightMm,
          category: 'عروض وتخفيضات',
          includeDynamicFields: true,
        });
        const existing = loadCustomTemplatesFromStorage();
        saveCustomTemplatesToStorage([newTemplate, ...existing]);
        onUpdateTemplate(newTemplate);
      } catch (err) {
        alert('تعذر قراءة ملف صورة القالب');
      }
    }
  };

  return (
    <header className="h-16 border-b border-slate-200 dark:border-slate-800 bg-white/90 dark:bg-slate-900/90 backdrop-blur-md px-4 flex items-center justify-between sticky top-0 z-40 transition-colors">
      {/* Brand & Template Title */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2.5">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-indigo-500 flex items-center justify-center shadow-lg shadow-brand-500/20">
            <Tag className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-bold text-base tracking-tight text-slate-900 dark:text-white">PriceTag<span className="text-brand-500 dark:text-brand-400">Pro</span></span>
              <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-brand-500/15 text-brand-600 dark:text-brand-300 font-semibold border border-brand-500/30">
                PRO v1.0
              </span>
            </div>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 hidden sm:block">صانع ومصمم بطاقات الأسعار والرفوف</p>
          </div>
        </div>

        {/* View Mode Switcher: Dashboard vs Designer */}
        <div className="flex items-center bg-slate-100 dark:bg-slate-950 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => onViewModeChange('dashboard')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'dashboard'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Package className="w-4 h-4" />
            <span>لوحة التحكم</span>
          </button>

          <button
            onClick={() => onViewModeChange('editor')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'editor'
                ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm border border-slate-200 dark:border-slate-700'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Tag className="w-4 h-4" />
            <span>مصمم الاستيكرات</span>
          </button>
        </div>

        <div className="h-6 w-px bg-slate-200 dark:bg-slate-800 hidden md:block" />

        {/* Template Name & Size Badge */}
        <div className="hidden lg:flex items-center gap-2">
          <input
            type="text"
            value={template.name}
            onChange={(e) => onUpdateTemplate({ ...template, name: e.target.value })}
            className="bg-slate-100 dark:bg-slate-950/60 border border-slate-300 dark:border-slate-700/60 rounded-lg px-3 py-1 text-xs text-slate-800 dark:text-slate-200 font-medium focus:border-brand-500 focus:outline-none w-48 transition-colors"
            placeholder="اسم القالب..."
          />
          <button
            onClick={onOpenPresetSizes}
            className="flex items-center gap-1 text-xs bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 px-2.5 py-1 rounded-lg border border-slate-300 dark:border-slate-700 transition-colors"
            title="تغيير مقاس البطاقة"
          >
            <Maximize2 className="w-3.5 h-3.5 text-brand-500 dark:text-brand-400" />
            <span>{template.widthMm} × {template.heightMm} مم</span>
          </button>
        </div>
      </div>

      {/* Center Actions: Undo / Redo & Templates */}
      <div className="flex items-center gap-1.5">
        {viewMode === 'editor' && (
          <>
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="تراجع (Ctrl+Z)"
            >
              <Undo2 className="w-4 h-4" />
            </button>
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:hover:bg-transparent transition-colors"
              title="إعادة (Ctrl+Y)"
            >
              <Redo2 className="w-4 h-4" />
            </button>

            <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />
          </>
        )}

        {/* Templates Library */}
        <button
          onClick={onOpenTemplates}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-slate-700 transition-all hover:border-slate-300 dark:hover:border-slate-600"
        >
          <LayoutTemplate className="w-4 h-4 text-amber-500 dark:text-amber-400" />
          <span className="hidden sm:inline">القوالب الجاهزة</span>
        </button>

        {/* Quick Price Editor */}
        {onOpenQuickPriceEditor && (
          <button
            onClick={() => onOpenQuickPriceEditor()}
            className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30 transition-all shadow-sm"
            title="تعديل السعر قبل وبعد لجميع الأصناف في مكان مخصص سريع"
          >
            <DollarSign className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            <span>تعديل الأسعار</span>
          </button>
        )}

        {/* Product Manager */}
        <button
          onClick={onOpenProductManager}
          className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/70 text-blue-600 dark:text-blue-300 border border-blue-200 dark:border-blue-800/60 transition-all"
          title="عرض وتعديل قائمة الأصناف أو إضافة أصناف جديدة"
        >
          <Package className="w-4 h-4 text-blue-500 dark:text-blue-400" />
          <span>الأصناف ({products.length})</span>
        </button>

        {/* Excel Bulk Import */}
        <button
          onClick={onOpenBulkImport}
          className="relative flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 transition-all"
        >
          <FileSpreadsheet className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <span>استيراد إكسل</span>
        </button>

        {/* Sample Excel Helper */}
        <button
          onClick={downloadSampleExcel}
          className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors hidden xl:flex items-center gap-1 text-xs"
          title="تحميل نموذج إكسل جاهز للتجربة"
        >
          <FileDown className="w-4 h-4" />
          <span>نموذج تجريبي</span>
        </button>
      </div>

      {/* Right Actions: Theme Switcher, Mobile Connect, JSON save/load & Print Preview */}
      <div className="flex items-center gap-2">
        {/* Mobile Connect Button */}
        {onOpenMobileConnect && (
          <button
            onClick={onOpenMobileConnect}
            className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/70 text-indigo-700 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800/60 transition-all shadow-sm"
            title="فتح التطبيق على الجوال بواسطة مسح رمز QR"
          >
            <Smartphone className="w-4 h-4 text-indigo-500 dark:text-indigo-400" />
            <span className="hidden sm:inline">📱 فتح على الجوال</span>
          </button>
        )}

        {/* Theme Toggle (Light / Dark Mode) */}
        <button
          onClick={onToggleTheme}
          className="flex items-center gap-1.5 p-2 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200 transition-all shadow-sm"
          title={theme === 'dark' ? 'التبديل إلى الوضع الفاتح (White Mode)' : 'التبديل إلى الوضع الليلي (Dark Mode)'}
        >
          {theme === 'dark' ? (
            <>
              <Sun className="w-4 h-4 text-amber-400 animate-spin-slow" />
              <span className="text-xs font-bold hidden md:inline">الوضع الفاتح</span>
            </>
          ) : (
            <>
              <Moon className="w-4 h-4 text-indigo-500" />
              <span className="text-xs font-bold hidden md:inline">الوضع الليلي</span>
            </>
          )}
        </button>

        {/* Save/Export & Upload Template */}
        <div className="hidden sm:flex items-center gap-1.5">
          <button
            onClick={handleExportJson}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="تنزيل القالب الحالي كملف JSON"
          >
            <Download className="w-4 h-4" />
          </button>
          <button
            onClick={() => fileInputRef.current?.click()}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-50 dark:bg-brand-950/60 hover:bg-brand-100 dark:hover:bg-brand-900/70 text-brand-700 dark:text-brand-300 border border-brand-200 dark:border-brand-800/60 text-xs font-bold transition-all shadow-sm"
            title="رفع قالب من جهازك (صورة PNG/JPG/SVG أو ملف JSON)"
          >
            <Upload className="w-3.5 h-3.5 text-brand-600 dark:text-brand-400" />
            <span>رفع قالب</span>
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept=".json,image/png,image/jpeg,image/webp,image/svg+xml"
            onChange={handleImportJson}
            className="hidden"
          />
        </div>

        {/* Main Action: Print & Export Button */}
        <button
          onClick={onOpenPrintPreview}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs sm:text-sm font-bold shadow-lg shadow-brand-600/30 hover:shadow-brand-500/40 hover:scale-[1.02] active:scale-[0.98] transition-all"
        >
          <Printer className="w-4 h-4" />
          <span>معاينة وتصدير للطباعة</span>
        </button>
      </div>
    </header>
  );
};
