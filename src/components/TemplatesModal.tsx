import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  LayoutTemplate,
  Sparkles,
  Check,
  Search,
  Tag,
  Save,
  Trash2,
  Bookmark,
  Upload,
  Lock,
  Image as ImageIcon,
  FileJson,
} from 'lucide-react';
import { TagTemplate } from '../types';
import { PRESET_TEMPLATES } from '../data/presetTemplates';
import {
  loadCustomTemplatesFromStorage,
  saveCustomTemplatesToStorage,
  idbGet,
  hydrateTemplate,
  readAndCompressImageFile,
  createTemplateFromUploadedImage,
} from '../utils/storage';

interface TemplatesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectTemplate: (template: TagTemplate) => void;
  currentTemplateId: string;
  activeTemplate?: TagTemplate;
}

const UPLOAD_SIZE_PRESETS = [
  { label: 'نصف A4 رأسي (148×210 مم)', w: 148, h: 210 },
  { label: 'نصف A4 أفقي (210×148 مم)', w: 210, h: 148 },
  { label: 'A4 كامل رأسي (210×297 مم)', w: 210, h: 297 },
  { label: 'A4 كامل أفقي (297×210 مم)', w: 297, h: 210 },
  { label: 'ملصق رف قياسي (60×40 مم)', w: 60, h: 40 },
  { label: 'ملصق متوسط (80×50 مم)', w: 80, h: 50 },
  { label: 'ملصق عروض (100×70 مم)', w: 100, h: 70 },
];

export const TemplatesModal: React.FC<TemplatesModalProps> = ({
  isOpen,
  onClose,
  onSelectTemplate,
  currentTemplateId,
  activeTemplate,
}) => {
  const [activeTab, setActiveTab] = useState<'presets' | 'saved'>('presets');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [savedTemplates, setSavedTemplates] = useState<TagTemplate[]>(() =>
    loadCustomTemplatesFromStorage()
  );

  const [saveName, setSaveName] = useState<string>('');
  const [isSavingCurrent, setIsSavingCurrent] = useState<boolean>(false);

  // Upload Template State (Image or JSON)
  const fileUploadRef = useRef<HTMLInputElement>(null);
  const [pendingUploadImage, setPendingUploadImage] = useState<string | null>(null);
  const [uploadTplName, setUploadTplName] = useState<string>('');
  const [uploadWidthMm, setUploadWidthMm] = useState<number>(148);
  const [uploadHeightMm, setUploadHeightMm] = useState<number>(210);
  const [uploadIncludeFields, setUploadIncludeFields] = useState<boolean>(true);

  useEffect(() => {
    if (isOpen) {
      idbGet<TagTemplate[]>('pricetag_saved_custom_templates').then((idbList) => {
        if (Array.isArray(idbList) && idbList.length > savedTemplates.length) {
          setSavedTemplates(idbList.map(hydrateTemplate));
        }
      });
    }
  }, [isOpen]);

  useEffect(() => {
    if (activeTemplate) {
      setSaveName(activeTemplate.name || 'ملصق مخصص جديد');
    }
  }, [activeTemplate]);

  if (!isOpen) return null;

  const categories = [
    { id: 'all', label: 'الكل' },
    { id: 'supermarket', label: 'سوبرماركت ورفوف' },
    { id: 'promo', label: 'عروض وتخفيضات' },
    { id: 'apparel', label: 'ملابس وأزياء' },
    { id: 'electronics', label: 'إلكترونيات' },
    { id: 'pharmacy', label: 'صيدلية وعناية' },
    { id: 'thermal', label: 'رول حراري' },
  ];

  const filteredPresetTemplates = PRESET_TEMPLATES.filter((tpl) => {
    const matchesCat = selectedCategory === 'all' || tpl.category === selectedCategory;
    const matchesSearch =
      !searchQuery ||
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.description && tpl.description.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCat && matchesSearch;
  });

  const filteredSavedTemplates = savedTemplates.filter((tpl) => {
    return (
      !searchQuery ||
      tpl.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (tpl.description && tpl.description.toLowerCase().includes(searchQuery.toLowerCase()))
    );
  });

  const handleSaveActiveTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeTemplate) return;

    const trimmedName = saveName.trim() || activeTemplate.name || 'ملصق مخصص';
    const newSaved: TagTemplate = {
      ...activeTemplate,
      id: `custom_${Date.now()}`,
      name: trimmedName,
      isLocked: true, // Default to locked structure for quick price editing!
    };

    const updated = [newSaved, ...savedTemplates.filter((t) => t.id !== newSaved.id)];
    setSavedTemplates(updated);
    saveCustomTemplatesToStorage(updated);
    setIsSavingCurrent(false);
    setActiveTab('saved');
  };

  const handleDeleteSavedTemplate = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('هل أنت متأكد من حذف هذا القالب المحفوظ؟')) {
      const updated = savedTemplates.filter((t) => t.id !== id);
      setSavedTemplates(updated);
      saveCustomTemplatesToStorage(updated);
    }
  };

  // Handle uploading either a JSON template file or an Image design file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';

    const cleanBaseName = file.name.replace(/\.[^/.]+$/, '') || 'قالب مرفوع';

    // Case 1: JSON Template File
    if (file.name.toLowerCase().endsWith('.json') || file.type === 'application/json') {
      const reader = new FileReader();
      reader.onload = (ev) => {
        try {
          const parsed = JSON.parse(ev.target?.result as string);
          if (parsed && parsed.widthMm && parsed.heightMm && Array.isArray(parsed.elements)) {
            const importedTpl: TagTemplate = hydrateTemplate({
              ...parsed,
              id: `custom_json_${Date.now()}`,
              name: parsed.name || cleanBaseName,
            });
            const updated = [importedTpl, ...savedTemplates];
            setSavedTemplates(updated);
            saveCustomTemplatesToStorage(updated);
            onSelectTemplate(importedTpl);
            onClose();
          } else {
            alert('ملف JSON غير متوافق مع بنية قوالب بطاقات الأسعار');
          }
        } catch (err) {
          alert('حدث خطأ أثناء قراءة ملف القالب JSON');
        }
      };
      reader.readAsText(file);
      return;
    }

    // Case 2: Image File (PNG, JPG, WEBP, SVG) uploaded as a Template Design
    try {
      const { dataUrl, width, height } = await readAndCompressImageFile(file, 1400);
      setPendingUploadImage(dataUrl);
      setUploadTplName(cleanBaseName);
      setIsSavingCurrent(false);

      // Auto-select portrait vs landscape Half-A4 based on uploaded image aspect ratio
      if (height > width * 1.1) {
        setUploadWidthMm(148);
        setUploadHeightMm(210);
      } else {
        setUploadWidthMm(210);
        setUploadHeightMm(148);
      }
    } catch (err) {
      alert('تعذر قراءة ملف الصورة المرفوع');
    }
  };

  const handleConfirmUploadedImageTemplate = (e: React.FormEvent) => {
    e.preventDefault();
    if (!pendingUploadImage) return;

    const newTpl = createTemplateFromUploadedImage({
      imageUrl: pendingUploadImage,
      name: uploadTplName || 'قالب مرفوع جديد',
      widthMm: Math.max(15, Number(uploadWidthMm) || 148),
      heightMm: Math.max(15, Number(uploadHeightMm) || 210),
      includeDynamicFields: uploadIncludeFields,
    });

    const updated = [newTpl, ...savedTemplates];
    setSavedTemplates(updated);
    saveCustomTemplatesToStorage(updated);
    setPendingUploadImage(null);
    onSelectTemplate(newTpl);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Hidden File Input for Template Upload */}
        <input
          ref={fileUploadRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,.json,application/json"
          onChange={handleFileUpload}
          className="hidden"
        />

        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex flex-wrap items-center justify-between gap-3 bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-500 dark:text-amber-400">
              <LayoutTemplate className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">مكتبة القوالب والملصقات المحفوظة</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                اختر قالباً جاهزاً، أو ارفع تصميم قالبك الخاص (صورة PNG/JPG أو ملف JSON)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Upload Template Button */}
            <button
              type="button"
              onClick={() => fileUploadRef.current?.click()}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold transition-all shadow-md shadow-brand-600/25"
            >
              <Upload className="w-3.5 h-3.5" />
              <span>رفع قالب من جهازك</span>
            </button>

            {activeTemplate && !isSavingCurrent && !pendingUploadImage && (
              <button
                type="button"
                onClick={() => setIsSavingCurrent(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 hover:bg-emerald-100 dark:hover:bg-emerald-900/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60 text-xs font-bold transition-all shadow-sm"
              >
                <Save className="w-3.5 h-3.5" />
                <span>حفظ الملصق الحالي كقالب</span>
              </button>
            )}
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Uploaded Image Template Configuration Banner */}
        {pendingUploadImage && (
          <form
            onSubmit={handleConfirmUploadedImageTemplate}
            className="p-5 bg-gradient-to-br from-brand-50 via-indigo-50/50 to-white dark:from-slate-950 dark:via-slate-900 dark:to-slate-900 border-b border-brand-200 dark:border-brand-800/60 space-y-4 animate-fadeIn"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-brand-600 dark:text-brand-400" />
                <h3 className="text-sm font-black text-slate-900 dark:text-white">
                  إعداد القالب المرفوع قبل فتحه في المصمم
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setPendingUploadImage(null)}
                className="text-xs text-slate-500 hover:text-rose-500 font-bold"
              >
                إلغاء ✖
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
              {/* Preview of uploaded template image */}
              <div className="md:col-span-4 flex flex-col items-center justify-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl p-3 shadow-inner">
                <img
                  src={pendingUploadImage}
                  alt="Uploaded Template Preview"
                  className="max-h-36 object-contain rounded border border-slate-200 dark:border-slate-800"
                />
                <span className="text-[10px] text-slate-400 mt-1.5">معاينة تصميم القالب المرفوع</span>
              </div>

              {/* Template Settings */}
              <div className="md:col-span-8 space-y-3 text-xs">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      اسم القالب:
                    </label>
                    <input
                      type="text"
                      required
                      value={uploadTplName}
                      onChange={(e) => setUploadTplName(e.target.value)}
                      placeholder="مثال: قالب عروض المتجر الخاص"
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white font-bold focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-700 dark:text-slate-300 font-bold mb-1">
                      اختر مقاس القالب السريع:
                    </label>
                    <select
                      value={`${uploadWidthMm}x${uploadHeightMm}`}
                      onChange={(e) => {
                        const [w, h] = e.target.value.split('x').map(Number);
                        if (w && h) {
                          setUploadWidthMm(w);
                          setUploadHeightMm(h);
                        }
                      }}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1.5 text-slate-900 dark:text-white focus:outline-none focus:border-brand-500"
                    >
                      {UPLOAD_SIZE_PRESETS.map((p) => (
                        <option key={`${p.w}x${p.h}`} value={`${p.w}x${p.h}`}>
                          {p.label}
                        </option>
                      ))}
                      <option value="custom">مقاس مخصص...</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">
                      العرض (بالمليمتر):
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="420"
                      value={uploadWidthMm}
                      onChange={(e) => setUploadWidthMm(Number(e.target.value) || 60)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="block text-slate-500 dark:text-slate-400 text-[11px] mb-0.5">
                      الارتفاع (بالمليمتر):
                    </label>
                    <input
                      type="number"
                      min="15"
                      max="420"
                      value={uploadHeightMm}
                      onChange={(e) => setUploadHeightMm(Number(e.target.value) || 40)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-3 py-1 text-slate-900 dark:text-white font-mono font-bold"
                    />
                  </div>
                </div>

                <label className="flex items-center gap-2 pt-1 cursor-pointer text-slate-800 dark:text-slate-200 font-semibold">
                  <input
                    type="checkbox"
                    checked={uploadIncludeFields}
                    onChange={(e) => setUploadIncludeFields(e.target.checked)}
                    className="rounded border-slate-300 text-brand-600 focus:ring-brand-500"
                  />
                  <span>إضافة حقول البيانات تلقائياً فوق القالب (اسم المنتج، السعر الحالي، السعر السابق، الباركود)</span>
                </label>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setPendingUploadImage(null)}
                    className="px-4 py-1.5 rounded-xl bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 font-semibold"
                  >
                    إلغاء
                  </button>
                  <button
                    type="submit"
                    className="flex items-center gap-1.5 px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold shadow-lg shadow-emerald-600/30 transition-all"
                  >
                    <Check className="w-4 h-4" />
                    <span>اعتماد القالب وفتحه للتعديل والطباعة</span>
                  </button>
                </div>
              </div>
            </div>
          </form>
        )}

        {/* Save Template Prompt Banner if triggered */}
        {isSavingCurrent && !pendingUploadImage && (
          <form
            onSubmit={handleSaveActiveTemplate}
            className="p-4 bg-emerald-50 dark:bg-emerald-950/30 border-b border-emerald-200 dark:border-emerald-800/50 flex flex-wrap items-center justify-between gap-3 animate-fadeIn"
          >
            <div className="flex items-center gap-2 flex-1 min-w-[240px]">
              <Bookmark className="w-4 h-4 text-emerald-600 dark:text-emerald-400 flex-shrink-0" />
              <div className="flex-1">
                <span className="text-xs font-bold text-emerald-950 dark:text-emerald-200 block mb-0.5">
                  حفظ هذا الملصق إلى قوالبك الدائمة:
                </span>
                <input
                  type="text"
                  required
                  value={saveName}
                  onChange={(e) => setSaveName(e.target.value)}
                  placeholder="أدخل اسم القالب (مثال: ملصق عروض العيد 50×30)..."
                  className="w-full bg-white dark:bg-slate-900 border border-emerald-300 dark:border-emerald-700 rounded-lg px-3 py-1.5 text-xs text-slate-900 dark:text-white focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsSavingCurrent(false)}
                className="px-3 py-1.5 rounded-lg bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-semibold"
              >
                إلغاء
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30"
              >
                <Check className="w-3.5 h-3.5" />
                <span>حفظ وتثبيت القالب</span>
              </button>
            </div>
          </form>
        )}

        {/* Tab Switcher: Presets vs Saved */}
        <div className="px-6 py-2 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex items-center justify-between gap-4">
          <div className="flex items-center bg-slate-200/70 dark:bg-slate-950 p-1 rounded-xl border border-slate-300/50 dark:border-slate-800">
            <button
              onClick={() => setActiveTab('presets')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'presets'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <LayoutTemplate className="w-3.5 h-3.5" />
              <span>القوالب الجاهزة ({PRESET_TEMPLATES.length})</span>
            </button>

            <button
              onClick={() => setActiveTab('saved')}
              className={`flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'saved'
                  ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Bookmark className="w-3.5 h-3.5" />
              <span>قوالبي المحفوظة والمرفوعة ({savedTemplates.length})</span>
            </button>
          </div>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="بحث في القوالب..."
              className="bg-white dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-lg pr-9 pl-3 py-1 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-brand-500 focus:outline-none w-48"
            />
          </div>
        </div>

        {/* Filter Categories for Presets */}
        {activeTab === 'presets' && (
          <div className="px-6 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/30 dark:bg-slate-950/20 flex items-center gap-1.5 overflow-x-auto">
            {categories.map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                  selectedCategory === cat.id
                    ? 'bg-amber-500 text-slate-950 font-bold'
                    : 'bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        )}

        {/* Templates Grid */}
        <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Quick Upload Card always visible at the start of the grid */}
          <div
            onClick={() => fileUploadRef.current?.click()}
            className="group rounded-xl border-2 border-dashed border-brand-300 dark:border-brand-700/70 hover:border-brand-500 bg-brand-50/30 dark:bg-brand-950/20 hover:bg-brand-50/70 dark:hover:bg-brand-950/40 p-4 cursor-pointer transition-all hover:scale-[1.02] flex flex-col items-center justify-center text-center min-h-[210px]"
          >
            <div className="w-12 h-12 rounded-2xl bg-brand-500/15 border border-brand-500/30 flex items-center justify-center text-brand-600 dark:text-brand-400 mb-3 group-hover:scale-110 transition-transform">
              <Upload className="w-6 h-6" />
            </div>
            <h3 className="text-xs font-black text-slate-900 dark:text-white mb-1">
              رفع قالب جديد من جهازك
            </h3>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-[220px] leading-relaxed mb-3">
              ارفع صورة تصميم جاهز (<span className="font-mono text-brand-600 dark:text-brand-400">PNG, JPG, SVG</span>) أو ملف قالب (<span className="font-mono text-brand-600 dark:text-brand-400">.json</span>)
            </p>
            <div className="flex items-center gap-2 text-[10px] font-bold text-brand-600 dark:text-brand-400 bg-white dark:bg-slate-900 px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800 shadow-sm">
              <ImageIcon className="w-3.5 h-3.5" />
              <span>اختيار ملف القالب</span>
              <FileJson className="w-3.5 h-3.5" />
            </div>
          </div>

          {(activeTab === 'presets' ? filteredPresetTemplates : filteredSavedTemplates).map((tpl) => {
            const isSelected = tpl.id === currentTemplateId;
            const uploadedBgEl = tpl.elements.find((e) => e.id === 'el_template_bg' && e.type === 'image');
            const previewBgUrl = uploadedBgEl?.imageUrl || tpl.backgroundImage;

            return (
              <div
                key={tpl.id}
                onClick={() => {
                  onSelectTemplate(tpl);
                  onClose();
                }}
                className={`group relative rounded-xl border p-4 bg-slate-50 dark:bg-slate-950/40 hover:bg-slate-100 dark:hover:bg-slate-800/40 cursor-pointer transition-all hover:scale-[1.02] flex flex-col justify-between ${
                  isSelected
                    ? 'border-brand-500 ring-1 ring-brand-500'
                    : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Template Card Mockup */}
                  <div
                    style={{
                      aspectRatio: `${tpl.widthMm} / ${tpl.heightMm}`,
                      backgroundColor: tpl.backgroundColor || '#ffffff',
                      borderRadius: '4px',
                      backgroundImage: previewBgUrl ? `url(${previewBgUrl})` : undefined,
                      backgroundSize: uploadedBgEl ? 'cover' : 'contain',
                      backgroundPosition: 'center',
                      backgroundRepeat: 'no-repeat',
                    }}
                    className="w-full max-h-32 mb-3 rounded border border-slate-300 dark:border-slate-700 flex flex-col items-center justify-center p-2 text-center overflow-hidden shadow-sm relative"
                  >
                    <div className="bg-white/80 dark:bg-slate-900/80 backdrop-blur-[1px] px-2 py-1 rounded shadow-sm">
                      <div className="text-[9px] font-bold text-slate-800 dark:text-slate-100 truncate max-w-[140px]">
                        {tpl.elements.find((e) => e.type === 'text')?.text || tpl.name || 'بطاقة أسعار'}
                      </div>
                      <div className="text-[13px] font-black text-rose-600 my-0.5">29.95 ر.س</div>
                    </div>

                    {tpl.isLocked && (
                      <span
                        className="absolute top-1 left-1 p-0.5 rounded bg-amber-500 text-slate-950 text-[9px] font-bold"
                        title="قالب مقفل لتعديل الأسعار فقط"
                      >
                        <Lock className="w-2.5 h-2.5" />
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mb-1">
                    <h3 className="text-xs font-bold text-slate-900 dark:text-white group-hover:text-brand-500 dark:group-hover:text-brand-400 transition-colors">
                      {tpl.name}
                    </h3>
                  </div>

                  <p className="text-[11px] text-slate-500 dark:text-slate-400 line-clamp-2 mb-3">
                    {tpl.description || 'ملصق مخصص جاهز للطباعة وتعديل الأسعار'}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800/80 text-[11px] text-slate-400 dark:text-slate-500">
                  <span className="flex items-center gap-1 font-mono">
                    <Tag className="w-3 h-3 text-brand-500 dark:text-brand-400" />
                    {tpl.widthMm} × {tpl.heightMm} مم
                  </span>

                  <div className="flex items-center gap-2">
                    {activeTab === 'saved' && (
                      <button
                        onClick={(e) => handleDeleteSavedTemplate(tpl.id, e)}
                        className="p-1 rounded text-slate-400 hover:text-rose-500 transition-colors"
                        title="حذف هذا القالب من قوالبي"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <span className="text-xs font-semibold text-brand-600 dark:text-brand-400 group-hover:underline flex items-center gap-1">
                      <span>استخدام</span>
                      <Check className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
