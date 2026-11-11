import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  X,
  Printer,
  FileDown,
  FileType,
  Settings,
  ChevronLeft,
  ChevronRight,
  Eye,
  CheckCircle2,
  AlertCircle,
  Scissors,
  Layers,
  Sparkles,
  Maximize2,
  Copy,
  Hash,
  Search,
  CheckSquare,
  Square,
  RefreshCw,
  Plus,
  Minus,
} from 'lucide-react';
import {
  TagTemplate,
  ProductItem,
  FieldMapping,
  PageConfig,
  GridConfig,
  PageSize,
  CalculatedGrid,
} from '../../types';
import { calculateGrid, calculatePageCount } from '../../utils/gridCalculator';
import { STANDARD_PAGE_SIZES, mmToPx } from '../../utils/dimensions';
import { exportToPdf } from '../../utils/pdfExporter';
import { exportToDocx } from '../../utils/docxExporter';
import { renderTagToCanvas, withOldPriceVisibility } from '../../utils/tagRenderer';
import { downloadFile } from '../../utils/fileDownloader';

interface PrintPreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: TagTemplate;
  onUpdateTemplate?: (template: TagTemplate) => void;
  products: ProductItem[];
  mappings: FieldMapping[];
}

export const PrintPreviewModal: React.FC<PrintPreviewModalProps> = ({
  isOpen,
  onClose,
  template,
  onUpdateTemplate,
  products,
  mappings,
}) => {
  // Active Sidebar Tab: 'quantities' | 'layout'
  const [activeTab, setActiveTab] = useState<'quantities' | 'layout'>('quantities');
  const [includeOldPrice, setIncludeOldPrice] = useState<boolean>(template.showOldPrice !== false);

  useEffect(() => {
    setIncludeOldPrice(template.showOldPrice !== false);
  }, [isOpen, template.showOldPrice]);

  const renderTemplate = useMemo(
    () => withOldPriceVisibility(template, includeOldPrice),
    [template, includeOldPrice]
  );

  const handleToggleOldPrice = (checked: boolean) => {
    setIncludeOldPrice(checked);
    onUpdateTemplate?.(withOldPriceVisibility(template, checked));
  };

  // Quantity Control Settings
  const [quantityMode, setQuantityMode] = useState<'custom' | 'uniform'>('custom');
  const [globalCopies, setGlobalCopies] = useState<number>(1);
  const [itemQuantities, setItemQuantities] = useState<Record<string, number>>({});
  const [defaultOverrideQty, setDefaultOverrideQty] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [bulkSetVal, setBulkSetVal] = useState<number>(1);
  const [sidebarPage, setSidebarPage] = useState<number>(1);
  const SIDEBAR_PAGE_SIZE = 50;

  const getProductQty = (prod: ProductItem): number => {
    if (itemQuantities[prod.id] !== undefined) return itemQuantities[prod.id];
    if (defaultOverrideQty !== null) return defaultOverrideQty;
    const rawQty = prod.print_quantity !== undefined ? prod.print_quantity : prod.quantity;
    const parsed = parseInt(String(rawQty), 10);
    return isNaN(parsed) || parsed < 0 ? 1 : parsed;
  };

  // Page Settings
  const [pageConfig, setPageConfig] = useState<PageConfig>({
    pageSize: 'A4',
    orientation: 'portrait',
    widthMm: 210,
    heightMm: 297,
    margins: { top: 10, bottom: 10, left: 10, right: 10 },
  });

  // Grid & Spacing Settings
  const [gridConfig, setGridConfig] = useState<GridConfig>({
    tagWidthMm: template.widthMm,
    tagHeightMm: template.heightMm,
    gapXMm: 2,
    gapYMm: 2,
    cropMarks: true,
    cropMarkColor: '#94a3b8',
    cropMarkLengthMm: 3,
    centerGridOnPage: true,
  });

  // Current preview page index
  const [currentPageIndex, setCurrentPageIndex] = useState<number>(0);

  // Rendered Tag Canvases cache for sheet preview
  const [renderedTags, setRenderedTags] = useState<string[]>([]);
  const [loadingPreview, setLoadingPreview] = useState<boolean>(true);

  // Export Progress State
  const [exporting, setExporting] = useState<boolean>(false);
  const [exportType, setExportType] = useState<'pdf' | 'docx' | 'print' | null>(null);
  const [progress, setProgress] = useState<{ current: number; total: number }>({ current: 0, total: 0 });

  // Synchronize grid tag width/height when template dimensions change
  useEffect(() => {
    setGridConfig((prev) => ({
      ...prev,
      tagWidthMm: template.widthMm,
      tagHeightMm: template.heightMm,
    }));
  }, [template.widthMm, template.heightMm]);

  // Expanded list of items according to chosen quantities
  const expandedProducts = useMemo<ProductItem[]>(() => {
    const list: ProductItem[] = [];

    if (!products || products.length === 0) {
      // Single template printing mode (e.g. no products imported)
      const count = Math.max(1, globalCopies);
      for (let i = 0; i < count; i++) {
        list.push({ id: `single_${i}`, product_name: template.name || 'بطاقة سعر' });
      }
      return list;
    }

    products.forEach((prod) => {
      let count = 1;
      if (quantityMode === 'uniform') {
        count = Math.max(0, globalCopies);
      } else {
        count = Math.max(0, getProductQty(prod));
      }

      for (let i = 0; i < count; i++) {
        list.push(prod);
      }
    });

    return list;
  }, [products, itemQuantities, defaultOverrideQty, quantityMode, globalCopies, template.name]);

  // Filtered products for UI search in quantity manager
  const filteredProducts = useMemo(() => {
    if (!searchQuery.trim()) return products;
    const q = searchQuery.toLowerCase().trim();
    return products.filter((p) => {
      const name = String(p.product_name || p['اسم المنتج'] || '').toLowerCase();
      const code = String(p.barcode || p['الباركود'] || '').toLowerCase();
      const category = String(p.category || p['القسم'] || '').toLowerCase();
      return name.includes(q) || code.includes(q) || category.includes(q);
    });
  }, [products, searchQuery]);

  const totalSidebarPages = Math.max(1, Math.ceil(filteredProducts.length / SIDEBAR_PAGE_SIZE));
  const safeSidebarPage = Math.min(sidebarPage, totalSidebarPages);
  const paginatedSidebarProducts = useMemo(() => {
    const start = (safeSidebarPage - 1) * SIDEBAR_PAGE_SIZE;
    return filteredProducts.slice(start, start + SIDEBAR_PAGE_SIZE);
  }, [filteredProducts, safeSidebarPage]);

  // Quantity Management Helpers
  const handleUpdateItemQty = (id: string, qty: number) => {
    const validQty = Math.max(0, Math.min(9999, isNaN(qty) ? 0 : qty));
    setItemQuantities((prev) => ({ ...prev, [id]: validQty }));
  };

  const handleSetAllQuantities = (qty: number) => {
    const validQty = Math.max(0, Math.min(9999, qty));
    setDefaultOverrideQty(validQty);
    setItemQuantities({});
  };

  const handleSelectAll = () => {
    setDefaultOverrideQty(null);
    setItemQuantities({});
  };

  const handleDeselectAll = () => {
    setDefaultOverrideQty(0);
    setItemQuantities({});
  };

  // Grid and Pagination
  const calculatedGrid = calculateGrid(pageConfig, gridConfig);
  const totalItems = Math.max(1, expandedProducts.length);
  const totalPages = Math.max(1, calculatePageCount(totalItems, calculatedGrid.tagsPerPage));

  // Reset page index if out of bounds
  useEffect(() => {
    if (currentPageIndex >= totalPages) {
      setCurrentPageIndex(Math.max(0, totalPages - 1));
    }
  }, [totalPages, currentPageIndex]);

  // Handle Page Size Preset Change
  const handlePageSizeChange = (size: PageSize) => {
    if (STANDARD_PAGE_SIZES[size]) {
      const { widthMm, heightMm } = STANDARD_PAGE_SIZES[size];
      setPageConfig((prev) => ({
        ...prev,
        pageSize: size,
        widthMm,
        heightMm,
      }));
    }
  };

  // Pre-render preview tags for current page
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const generatePreviewImages = async () => {
      setLoadingPreview(true);
      const images: string[] = [];

      const startIndex = currentPageIndex * calculatedGrid.tagsPerPage;
      const endIndex = Math.min(totalItems, startIndex + calculatedGrid.tagsPerPage);

      for (let i = startIndex; i < endIndex; i++) {
        const item = expandedProducts[i] || products[0] || { id: 'default' };
        const canvas = await renderTagToCanvas(renderTemplate, item, mappings, 150); // Fast 150 DPI for UI preview
        images.push(canvas.toDataURL('image/png'));
      }

      if (isMounted) {
        setRenderedTags(images);
        setLoadingPreview(false);
      }
    };

    generatePreviewImages();
    return () => {
      isMounted = false;
    };
  }, [isOpen, currentPageIndex, pageConfig, gridConfig, renderTemplate, expandedProducts, mappings, calculatedGrid.tagsPerPage, totalItems]);

  if (!isOpen) return null;

  // Handle PDF Export
  const handleExportPdf = async () => {
    if (expandedProducts.length === 0) {
      alert('الرجاء تحديد كمية ملصق واحد على الأقل للطباعة');
      return;
    }

    setExporting(true);
    setExportType('pdf');
    setProgress({ current: 0, total: totalItems });

    try {
      const blob = await exportToPdf(
        renderTemplate,
        expandedProducts,
        mappings,
        pageConfig,
        gridConfig,
        (current, total) => setProgress({ current, total })
      );
      const safeName = (template.name || 'PriceTags').replace(/[/\\?%*:|"<>]/g, '_');
      downloadFile(blob, `${safeName}_${expandedProducts.length}Tags_PrintReady.pdf`, 'application/pdf');
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تصدير ملف PDF');
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  // Handle Word (.docx) Export
  const handleExportDocx = async () => {
    if (expandedProducts.length === 0) {
      alert('الرجاء تحديد كمية ملصق واحد على الأقل للطباعة');
      return;
    }

    setExporting(true);
    setExportType('docx');
    setProgress({ current: 0, total: totalItems });

    try {
      const blob = await exportToDocx(
        renderTemplate,
        expandedProducts,
        mappings,
        pageConfig,
        gridConfig,
        (current, total) => setProgress({ current, total })
      );
      const safeName = (template.name || 'PriceTags').replace(/[/\\?%*:|"<>]/g, '_');
      downloadFile(
        blob,
        `${safeName}_${expandedProducts.length}Tags.docx`,
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      );
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تصدير مستند Word');
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  // Handle Direct Browser Print via High-Res 300 DPI Print Engine
  const handleBrowserPrint = async () => {
    if (expandedProducts.length === 0) {
      alert('الرجاء تحديد كمية ملصق واحد على الأقل للطباعة');
      return;
    }

    setExporting(true);
    setExportType('print');
    setProgress({ current: 0, total: totalItems });

    try {
      // Generate exact 300 DPI print-ready PDF blob
      const blob = await exportToPdf(
        renderTemplate,
        expandedProducts,
        mappings,
        pageConfig,
        gridConfig,
        (current, total) => setProgress({ current, total })
      );

      const blobUrl = URL.createObjectURL(blob);

      // Create hidden iframe to trigger print dialog directly with the PDF content
      const iframe = document.createElement('iframe');
      iframe.style.position = 'fixed';
      iframe.style.right = '0';
      iframe.style.bottom = '0';
      iframe.style.width = '0';
      iframe.style.height = '0';
      iframe.style.border = 'none';
      iframe.style.visibility = 'hidden';
      iframe.src = blobUrl;

      document.body.appendChild(iframe);

      iframe.onload = () => {
        try {
          iframe.contentWindow?.focus();
          iframe.contentWindow?.print();
        } catch (e) {
          // Fallback: open print window if iframe print is restricted by browser
          const printWindow = window.open(blobUrl, '_blank');
          if (printWindow) {
            printWindow.focus();
            printWindow.print();
          }
        } finally {
          setTimeout(() => {
            try {
              document.body.removeChild(iframe);
              URL.revokeObjectURL(blobUrl);
            } catch (err) {}
          }, 60000);
        }
      };
    } catch (err) {
      console.error(err);
      alert('حدث خطأ أثناء تجهيز ورقة الطباعة');
    } finally {
      setExporting(false);
      setExportType(null);
    }
  };

  const isPortrait = pageConfig.orientation === 'portrait';
  const sheetWidthMm = isPortrait ? pageConfig.widthMm : pageConfig.heightMm;
  const sheetHeightMm = isPortrait ? pageConfig.heightMm : pageConfig.widthMm;

  // Active distinct products count
  const activeProductsCount = useMemo(
    () => products.filter((p) => getProductQty(p) > 0).length,
    [products, itemQuantities, defaultOverrideQty]
  );

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/75 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-6xl h-[94vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-3.5 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/70">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Printer className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-slate-900 dark:text-white">معاينة التوزيع وإعدادات الطباعة والكميات</h2>
                <span className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 font-bold border border-emerald-200 dark:border-emerald-500/30">
                  {expandedProducts.length} ملصق إجمالي
                </span>
              </div>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                التحكم في عدد نسخ كل استيكر وحساب توزيع الشبكة الدقيق على الورق
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

        {/* Content Body: Sidebar Settings + Interactive Sheet Preview */}
        <div className="flex-1 flex flex-col lg:flex-row overflow-hidden">
          {/* Settings Sidebar */}
          <div className="w-full lg:w-96 border-l border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/50 flex flex-col overflow-hidden">
            {/* Sidebar Tabs */}
            <div className="flex items-center border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-1.5 gap-1 select-none">
              <button
                onClick={() => setActiveTab('quantities')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'quantities'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-900'
                }`}
              >
                <Hash className="w-3.5 h-3.5" />
                <span>الكميات والأصناف ({expandedProducts.length})</span>
              </button>
              <button
                onClick={() => setActiveTab('layout')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-bold transition-all ${
                  activeTab === 'layout'
                    ? 'bg-brand-600 text-white shadow-md shadow-brand-600/30'
                    : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-900'
                }`}
              >
                <Settings className="w-3.5 h-3.5" />
                <span>إعدادات الورقة والتوزيع</span>
              </button>
            </div>

            {/* Optional Old Price Print Toggle */}
            <div className="px-4 py-2.5 border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/70 flex items-center justify-between gap-2">
              <label className="flex items-center gap-2 text-xs font-bold text-slate-700 dark:text-slate-200 cursor-pointer select-none flex-1">
                <input
                  type="checkbox"
                  checked={includeOldPrice}
                  onChange={(e) => handleToggleOldPrice(e.target.checked)}
                  className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-brand-600 focus:ring-0"
                />
                <span>طباعة السعر قبل الخصم</span>
              </label>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  includeOldPrice
                    ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300'
                    : 'bg-slate-200 dark:bg-slate-800 text-slate-500 dark:text-slate-400'
                }`}
              >
                {includeOldPrice ? 'مفعّل' : 'مخفي'}
              </span>
            </div>

            {/* Tab 1: Quantities & Sticker Counts */}
            {activeTab === 'quantities' && (
              <div className="flex-1 flex flex-col p-4 overflow-hidden space-y-4">
                {/* Summary Banner */}
                <div className="p-3.5 rounded-xl bg-gradient-to-br from-emerald-50 dark:from-emerald-950/40 to-slate-100 dark:to-slate-900/60 border border-emerald-200 dark:border-emerald-800/40 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="text-emerald-800 dark:text-emerald-300 font-bold flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
                      إجمالي أمر الطباعة
                    </span>
                    <span className="text-xs px-2 py-0.5 rounded bg-emerald-100 dark:bg-emerald-500/20 text-emerald-800 dark:text-emerald-300 font-mono font-bold">
                      {expandedProducts.length} ملصق
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-emerald-200 dark:border-emerald-800/30 text-xs">
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">الأصناف المختارة:</span>
                      <span className="font-bold text-slate-900 dark:text-white text-sm">
                        {activeProductsCount} <span className="text-slate-400 dark:text-slate-500 font-normal text-xs">من {products.length}</span>
                      </span>
                    </div>
                    <div>
                      <span className="text-slate-500 dark:text-slate-400 block text-[11px]">عدد الصفحات:</span>
                      <span className="font-bold text-emerald-600 dark:text-emerald-400 text-sm">{totalPages} صفحة</span>
                    </div>
                  </div>
                </div>

                {/* Mode Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">طريقة تحديد عدد النسخ</label>
                  <div className="grid grid-cols-2 gap-2 bg-slate-100 dark:bg-slate-900 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
                    <button
                      onClick={() => setQuantityMode('custom')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        quantityMode === 'custom'
                          ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-300 shadow-sm border border-slate-200 dark:border-slate-700'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      تخصيص لكل صنف
                    </button>
                    <button
                      onClick={() => setQuantityMode('uniform')}
                      className={`py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                        quantityMode === 'uniform'
                          ? 'bg-white dark:bg-slate-800 text-brand-600 dark:text-brand-300 shadow-sm border border-slate-200 dark:border-slate-700'
                          : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      كمية موحدة للكل
                    </button>
                  </div>
                </div>

                {/* Mode: Uniform Copies Multiplier */}
                {quantityMode === 'uniform' && (
                  <div className="p-4 rounded-xl bg-white dark:bg-slate-900/80 border border-slate-200 dark:border-slate-800 space-y-3 shadow-sm">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-bold text-slate-800 dark:text-slate-200">
                        عدد النسخ لكل ملصق / منتج:
                      </label>
                      <span className="text-xs text-brand-600 dark:text-brand-400 font-mono font-bold">
                        × {globalCopies}
                      </span>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setGlobalCopies((prev) => Math.max(1, prev - 1))}
                        className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-white font-bold text-base transition-colors"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        min="1"
                        max="999"
                        value={globalCopies}
                        onChange={(e) => setGlobalCopies(Math.max(1, parseInt(e.target.value, 10) || 1))}
                        className="flex-1 bg-slate-50 dark:bg-slate-950 border border-slate-300 dark:border-slate-700 rounded-xl py-2 text-center text-slate-900 dark:text-white font-bold text-sm focus:border-brand-500 focus:outline-none"
                      />
                      <button
                        onClick={() => setGlobalCopies((prev) => Math.min(999, prev + 1))}
                        className="w-9 h-9 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-800 dark:text-white font-bold text-base transition-colors"
                      >
                        +
                      </button>
                    </div>

                    <div className="flex items-center justify-between gap-1 pt-1">
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">خيارات سريعة:</span>
                      <div className="flex items-center gap-1">
                        {[1, 2, 5, 10, 20].map((num) => (
                          <button
                            key={num}
                            onClick={() => setGlobalCopies(num)}
                            className={`px-2 py-1 rounded text-xs font-mono font-bold border transition-colors ${
                              globalCopies === num
                                ? 'bg-brand-600 border-brand-500 text-white'
                                : 'bg-slate-100 dark:bg-slate-950 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-800'
                            }`}
                          >
                            {num}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Mode: Custom Quantity Per Product */}
                {quantityMode === 'custom' && (
                  <div className="flex-1 flex flex-col min-h-0 space-y-2.5">
                    {/* Toolbar: Search + Bulk actions */}
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                        <input
                          type="text"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="بحث عن منتج بالاسم أو الباركود..."
                          className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-800 rounded-xl pr-8 pl-3 py-1.5 text-xs text-slate-900 dark:text-white placeholder-slate-400 focus:border-brand-500 focus:outline-none"
                        />
                      </div>
                    </div>

                    {/* Quick Selection Buttons */}
                    <div className="flex items-center justify-between text-xs text-slate-500 dark:text-slate-400 px-0.5">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSelectAll}
                          className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors flex items-center gap-1"
                        >
                          <CheckSquare className="w-3 h-3 text-emerald-500 dark:text-emerald-400" />
                          <span>تحديد الكل</span>
                        </button>
                        <span className="text-slate-300 dark:text-slate-700">|</span>
                        <button
                          onClick={handleDeselectAll}
                          className="hover:text-rose-600 dark:hover:text-rose-400 transition-colors flex items-center gap-1"
                        >
                          <Square className="w-3 h-3 text-rose-500 dark:text-rose-400" />
                          <span>تصفير</span>
                        </button>
                      </div>

                      <div className="flex items-center gap-1">
                        <span>تعيين للكل:</span>
                        {[1, 2, 5].map((n) => (
                          <button
                            key={n}
                            onClick={() => handleSetAllQuantities(n)}
                            className="px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-900 hover:bg-slate-200 dark:hover:bg-slate-800 text-[11px] font-mono text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-800"
                          >
                            {n}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Scrollable Product List */}
                    <div className="flex-1 overflow-y-auto space-y-2 pr-0.5">
                      {filteredProducts.length === 0 ? (
                        <div className="py-8 text-center text-slate-400 dark:text-slate-500 text-xs">
                          لا توجد منتجات مطابقة لنتيجة البحث
                        </div>
                      ) : (
                        paginatedSidebarProducts.map((p) => {
                          const name = p.product_name || p['اسم المنتج'] || 'منتج';
                          const price = p.price || p['السعر'] || '';
                          const barcode = p.barcode || p['الباركود'] || '';
                          const currentQty = getProductQty(p);

                          const isSelected = currentQty > 0;

                          return (
                            <div
                              key={p.id}
                              className={`p-2.5 rounded-xl border transition-all flex items-center justify-between gap-2 ${
                                isSelected
                                  ? 'bg-white dark:bg-slate-900/90 border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 shadow-sm'
                                  : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-900/60 opacity-60'
                              }`}
                            >
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-emerald-500 dark:bg-emerald-400' : 'bg-slate-300 dark:bg-slate-600'}`} />
                                  <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 truncate">
                                    {name}
                                  </h4>
                                </div>
                                <div className="flex items-center gap-2 mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">
                                  {price && <span className="text-emerald-600 dark:text-emerald-400 font-bold">{price} ر.س</span>}
                                  {barcode && <span className="font-mono text-slate-400 dark:text-slate-500 truncate max-w-[120px]">{barcode}</span>}
                                </div>
                              </div>

                              {/* Interactive Counter */}
                              <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                  onClick={() => handleUpdateItemQty(p.id, currentQty - 1)}
                                  className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="0"
                                  max="999"
                                  value={currentQty}
                                  onChange={(e) => handleUpdateItemQty(p.id, parseInt(e.target.value, 10))}
                                  className={`w-11 bg-slate-50 dark:bg-slate-950 border rounded-lg text-center font-bold text-xs py-1 focus:outline-none ${
                                    isSelected
                                      ? 'border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
                                      : 'border-slate-300 dark:border-slate-800 text-slate-400 dark:text-slate-500'
                                  }`}
                                />
                                <button
                                  onClick={() => handleUpdateItemQty(p.id, currentQty + 1)}
                                  className="w-6 h-6 rounded-lg bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 flex items-center justify-center text-slate-700 dark:text-slate-300 font-bold text-xs transition-colors"
                                >
                                  +
                                </button>
                              </div>
                            </div>
                          );
                        })
                      )}
                    </div>

                    {totalSidebarPages > 1 && (
                      <div className="flex items-center justify-between pt-2 border-t border-slate-200 dark:border-slate-800 text-[11px] text-slate-500 dark:text-slate-400">
                        <button
                          onClick={() => setSidebarPage((p) => Math.max(1, p - 1))}
                          disabled={safeSidebarPage <= 1}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold disabled:opacity-40"
                        >
                          السابق
                        </button>
                        <span className="font-mono font-bold text-slate-700 dark:text-slate-300">
                          صفحة {safeSidebarPage} / {totalSidebarPages}
                        </span>
                        <button
                          onClick={() => setSidebarPage((p) => Math.min(totalSidebarPages, p + 1))}
                          disabled={safeSidebarPage >= totalSidebarPages}
                          className="px-2.5 py-1 rounded-lg bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 font-bold disabled:opacity-40"
                        >
                          التالي
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Tab 2: Layout & Paper Settings */}
            {activeTab === 'layout' && (
              <div className="flex-1 p-4 overflow-y-auto space-y-5 select-none">
                {/* Target Paper Selection */}
                <div className="space-y-2.5">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">قياس ورقة الطباعة</label>
                  <select
                    value={pageConfig.pageSize}
                    onChange={(e) => handlePageSizeChange(e.target.value as PageSize)}
                    className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl px-3 py-2 text-xs text-slate-900 dark:text-white focus:border-brand-500 focus:outline-none"
                  >
                    <option value="A4">A4 (210 × 297 مم) - الأكثر استخداماً</option>
                    <option value="A3">A3 (297 × 420 مم) - ورق عريض</option>
                    <option value="A5">A5 (148 × 210 مم)</option>
                    <option value="Letter">Letter (216 × 279 مم)</option>
                    <option value="Roll_58mm">رول حراري 58 مم (Thermal Roll)</option>
                    <option value="Roll_80mm">رول حراري 80 مم (Thermal Roll)</option>
                    <option value="Roll_100mm">رول حراري 100 مم (Thermal Roll)</option>
                  </select>

                  <div className="flex items-center gap-2 pt-1">
                    <button
                      onClick={() => setPageConfig((prev) => ({ ...prev, orientation: 'portrait' }))}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        pageConfig.orientation === 'portrait'
                          ? 'bg-brand-600 border-brand-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      رأسي (Portrait)
                    </button>
                    <button
                      onClick={() => setPageConfig((prev) => ({ ...prev, orientation: 'landscape' }))}
                      className={`flex-1 py-1.5 text-xs font-semibold rounded-lg border transition-colors ${
                        pageConfig.orientation === 'landscape'
                          ? 'bg-brand-600 border-brand-500 text-white'
                          : 'bg-slate-100 dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                      }`}
                    >
                      أفقي (Landscape)
                    </button>
                  </div>
                </div>

                {/* Margins */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">هوامش الصفحة (بالمليمتر)</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">أعلى (Top):</span>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={pageConfig.margins.top}
                        onChange={(e) =>
                          setPageConfig({
                            ...pageConfig,
                            margins: { ...pageConfig.margins, top: Number(e.target.value) || 0 },
                          })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">أسفل (Bottom):</span>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={pageConfig.margins.bottom}
                        onChange={(e) =>
                          setPageConfig({
                            ...pageConfig,
                            margins: { ...pageConfig.margins, bottom: Number(e.target.value) || 0 },
                          })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">يمين (Right):</span>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={pageConfig.margins.right}
                        onChange={(e) =>
                          setPageConfig({
                            ...pageConfig,
                            margins: { ...pageConfig.margins, right: Number(e.target.value) || 0 },
                          })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">يسار (Left):</span>
                      <input
                        type="number"
                        min="0"
                        max="50"
                        value={pageConfig.margins.left}
                        onChange={(e) =>
                          setPageConfig({
                            ...pageConfig,
                            margins: { ...pageConfig.margins, left: Number(e.target.value) || 0 },
                          })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Gaps & Spacing between cards */}
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block">المسافات الفاصلة بين البطاقات (مم)</label>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">فاصل أفقي (Gap X):</span>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        value={gridConfig.gapXMm}
                        onChange={(e) =>
                          setGridConfig({ ...gridConfig, gapXMm: Number(e.target.value) || 0 })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 dark:text-slate-400 block mb-0.5">فاصل رأسي (Gap Y):</span>
                      <input
                        type="number"
                        min="0"
                        max="30"
                        step="0.5"
                        value={gridConfig.gapYMm}
                        onChange={(e) =>
                          setGridConfig({ ...gridConfig, gapYMm: Number(e.target.value) || 0 })
                        }
                        className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-900 dark:text-white"
                      />
                    </div>
                  </div>
                </div>

                {/* Crop Marks & Center Toggles */}
                <div className="space-y-2 pt-2 border-t border-slate-200 dark:border-slate-800">
                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gridConfig.cropMarks}
                      onChange={(e) => setGridConfig({ ...gridConfig, cropMarks: e.target.checked })}
                      className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-brand-600 focus:ring-0"
                    />
                    <Scissors className="w-3.5 h-3.5 text-slate-500 dark:text-slate-400" />
                    <span>إضافة علامات القص والطي (Crop Marks)</span>
                  </label>

                  <label className="flex items-center gap-2 text-xs text-slate-700 dark:text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={gridConfig.centerGridOnPage}
                      onChange={(e) => setGridConfig({ ...gridConfig, centerGridOnPage: e.target.checked })}
                      className="rounded border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 text-brand-600 focus:ring-0"
                    />
                    <span>توسيط البطاقات تلقائياً في الصفحة</span>
                  </label>
                </div>
              </div>
            )}
          </div>

          {/* Interactive Sheet Preview Area */}
          <div className="flex-1 bg-slate-100 dark:bg-slate-950 flex flex-col items-center justify-between p-6 overflow-auto transition-colors">
            {/* Page Navigator & Stats Header */}
            <div className="flex items-center justify-between w-full max-w-lg mb-4">
              <div className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                <span>توزيع الصفحة:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {calculatedGrid.columns} × {calculatedGrid.rows} ({calculatedGrid.tagsPerPage} بطاقة/صفحة)
                </span>
              </div>

              <div className="flex items-center gap-3 bg-white/90 dark:bg-slate-900/90 backdrop-blur px-4 py-1.5 rounded-xl border border-slate-200 dark:border-slate-800 shadow-sm">
                <button
                  onClick={() => setCurrentPageIndex((prev) => Math.max(0, prev - 1))}
                  disabled={currentPageIndex === 0}
                  className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200 font-mono">
                  صفحة {currentPageIndex + 1} من {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPageIndex((prev) => Math.min(totalPages - 1, prev + 1))}
                  disabled={currentPageIndex >= totalPages - 1}
                  className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white disabled:opacity-30 transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* The Sheet (Paper) Render */}
            <div className="flex-1 flex items-center justify-center w-full min-h-[400px]">
              {loadingPreview ? (
                <div className="flex flex-col items-center gap-3 text-slate-500 dark:text-slate-400">
                  <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs font-medium">جاري معالجة وتوزيع الملصقات...</span>
                </div>
              ) : (
                <div
                  style={{
                    width: '380px',
                    aspectRatio: `${sheetWidthMm} / ${sheetHeightMm}`,
                    backgroundColor: '#ffffff',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.3)',
                    position: 'relative',
                  }}
                  className="rounded border border-slate-300 dark:border-slate-700 overflow-hidden"
                >
                  {/* Grid Tags Placement */}
                  {Array.from({ length: calculatedGrid.rows }).map((_, rIdx) =>
                    Array.from({ length: calculatedGrid.columns }).map((_, cIdx) => {
                      const tagIdxInPage = rIdx * calculatedGrid.columns + cIdx;
                      const globalIdx = currentPageIndex * calculatedGrid.tagsPerPage + tagIdxInPage;
                      if (globalIdx >= totalItems) return null;

                      const tagImg = renderedTags[tagIdxInPage];

                      const leftPercent =
                        ((calculatedGrid.offsetX + cIdx * (gridConfig.tagWidthMm + gridConfig.gapXMm)) /
                          sheetWidthMm) *
                        100;
                      const topPercent =
                        ((calculatedGrid.offsetY + rIdx * (gridConfig.tagHeightMm + gridConfig.gapYMm)) /
                          sheetHeightMm) *
                        100;
                      const widthPercent = (gridConfig.tagWidthMm / sheetWidthMm) * 100;
                      const heightPercent = (gridConfig.tagHeightMm / sheetHeightMm) * 100;

                      return (
                        <div
                          key={`tag_${rIdx}_${cIdx}`}
                          style={{
                            position: 'absolute',
                            left: `${leftPercent}%`,
                            top: `${topPercent}%`,
                            width: `${widthPercent}%`,
                            height: `${heightPercent}%`,
                          }}
                          className="relative"
                        >
                          {tagImg && (
                            <img
                              src={tagImg}
                              alt="Tag"
                              className="w-full h-full object-contain pointer-events-none"
                            />
                          )}

                          {/* Preview Crop Marks */}
                          {gridConfig.cropMarks && (
                            <div className="absolute inset-0 border border-slate-300/50 pointer-events-none" />
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              )}
            </div>

            {/* Print Scale Advice */}
            <p className="text-[11px] text-slate-500 text-center mt-3">
              💡 نصيحة الطباعة: تأكد من ضبط مقاس الصفحة في إعدادات الطابعة على <span className="text-slate-800 dark:text-slate-300 font-bold">100% (Actual Size)</span> لضمان دقة الأبعاد بالمليمتر.
            </p>
          </div>
        </div>

        {/* Modal Footer: Action Buttons (PDF, Word, Direct Print) */}
        <div className="px-6 py-4 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/80 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            {exporting && (
              <div className="flex items-center gap-2 text-xs font-semibold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-3 py-1.5 rounded-lg border border-brand-200 dark:border-brand-800/50">
                <div className="w-4 h-4 border-2 border-brand-600 dark:border-brand-400 border-t-transparent rounded-full animate-spin" />
                <span>
                  جاري التصدير بدقة 300 DPI ({progress.current} / {progress.total})...
                </span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-3">
            {/* Word .docx Export */}
            <button
              onClick={handleExportDocx}
              disabled={exporting || expandedProducts.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-50 dark:bg-blue-950/60 hover:bg-blue-100 dark:hover:bg-blue-900/70 border border-blue-200 dark:border-blue-700/60 text-blue-700 dark:text-blue-300 text-xs font-bold transition-all disabled:opacity-50"
            >
              <FileType className="w-4 h-4 text-blue-500 dark:text-blue-400" />
              <span>تصدير Word (.docx)</span>
            </button>

            {/* Direct Browser Print */}
            <button
              onClick={handleBrowserPrint}
              disabled={exporting || expandedProducts.length === 0}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 border border-slate-300 dark:border-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition-all disabled:opacity-50"
            >
              <Printer className="w-4 h-4 text-slate-600 dark:text-slate-300" />
              <span>طباعة مباشرة ({expandedProducts.length} ملصق)</span>
            </button>

            {/* High-Res PDF Export */}
            <button
              onClick={handleExportPdf}
              disabled={exporting || expandedProducts.length === 0}
              className="flex items-center gap-2 px-6 py-2.5 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-brand-600/30 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50"
            >
              <FileDown className="w-4 h-4" />
              <span>تحميل PDF عالي الدقة ({expandedProducts.length} ملصق - 300 DPI)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
