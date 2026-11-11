import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { TagTemplate, TagElement, ProductItem, FieldMapping } from './types';
import { PRESET_TEMPLATES } from './data/presetTemplates';
import { DEFAULT_SAMPLE_PRODUCTS } from './data/sampleProducts';
import { autoSuggestMappings } from './utils/excelParser';
import {
  loadTemplateFromStorage,
  saveTemplateToStorage,
  loadProductsFromStorage,
  saveProductsToStorage,
  loadMappingsFromStorage,
  saveMappingsToStorage,
  safeGetItem,
  safeSetItem,
  idbGet,
} from './utils/storage';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Editor/Sidebar';
import { Canvas } from './components/Editor/Canvas';
import { PropertiesPanel } from './components/Editor/PropertiesPanel';
import { BulkImportWizardModal } from './components/BulkImport/BulkImportWizardModal';
import { PrintPreviewModal } from './components/PrintPreview/PrintPreviewModal';
import { TemplatesModal } from './components/TemplatesModal';
import { PresetSizesModal } from './components/PresetSizesModal';
import { ProductManagerModal } from './components/ProductManagerModal';
import { QuickPriceEditorModal } from './components/QuickPriceEditorModal';
import { MobileConnectModal } from './components/MobileConnectModal';
import { DashboardView } from './components/Dashboard/DashboardView';

export const App: React.FC = () => {
  // View Mode: 'dashboard' | 'editor'
  const [viewMode, setViewMode] = useState<'dashboard' | 'editor'>('editor');

  // Load initial template (loads saved template or Half A4 template immediately)
  const [template, setTemplate] = useState<TagTemplate>(() =>
    loadTemplateFromStorage(PRESET_TEMPLATES[0])
  );

  // Undo / Redo History Stack
  const [history, setHistory] = useState<TagTemplate[]>([template]);
  const [historyIndex, setHistoryIndex] = useState<number>(0);

  // Products and Mappings
  const [products, setProducts] = useState<ProductItem[]>(() =>
    loadProductsFromStorage(DEFAULT_SAMPLE_PRODUCTS)
  );

  const [mappings, setMappings] = useState<FieldMapping[]>(() =>
    loadMappingsFromStorage(
      autoSuggestMappings(
        ['product_name', 'price', 'old_price', 'barcode', 'unit', 'discount_percentage', 'origin', 'category', 'description'],
        ['اسم المنتج', 'السعر', 'السعر السابق', 'الباركود', 'الوحدة', 'بلد المنشأ', 'نسبة الخصم', 'القسم', 'المواصفات']
      )
    )
  );

  // Hydrate full products list from IndexedDB if a previous large import exceeded localStorage
  useEffect(() => {
    idbGet<ProductItem[]>('pricetag_products').then((idbProducts) => {
      if (Array.isArray(idbProducts) && idbProducts.length > products.length) {
        setProducts(idbProducts);
      }
    });
  }, []);

  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [sampleProductIndex, setSampleProductIndex] = useState<number>(0);

  // Modal Open States
  const [isTemplatesOpen, setIsTemplatesOpen] = useState<boolean>(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState<boolean>(false);
  const [isPrintPreviewOpen, setIsPrintPreviewOpen] = useState<boolean>(false);
  const [isPresetSizesOpen, setIsPresetSizesOpen] = useState<boolean>(false);
  const [isProductManagerOpen, setIsProductManagerOpen] = useState<boolean>(false);
  const [isQuickPriceOpen, setIsQuickPriceOpen] = useState<boolean>(false);
  const [isMobileConnectOpen, setIsMobileConnectOpen] = useState<boolean>(false);
  const [quickPriceProductIndex, setQuickPriceProductIndex] = useState<number>(0);
  const [printCategoryFilter, setPrintCategoryFilter] = useState<string | undefined>(undefined);

  // Theme State: 'dark' | 'light'
  const [theme, setTheme] = useState<'dark' | 'light'>(() => {
    const saved = safeGetItem('pricetag_theme');
    if (saved === 'light' || saved === 'dark') return saved;
    return 'dark';
  });

  useEffect(() => {
    safeSetItem('pricetag_theme', theme);
    if (theme === 'dark') {
      document.documentElement.classList.add('dark');
      document.documentElement.classList.remove('light');
    } else {
      document.documentElement.classList.remove('dark');
      document.documentElement.classList.add('light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'dark' ? 'light' : 'dark'));
  };

  // Save to storage safely with debounce so rapid UI interactions (dragging, price edits, large product lists) never block the main thread
  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveTemplateToStorage(template);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [template]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveProductsToStorage(products);
    }, 500);
    return () => window.clearTimeout(timer);
  }, [products]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      saveMappingsToStorage(mappings);
    }, 350);
    return () => window.clearTimeout(timer);
  }, [mappings]);

  // Update Template with history support
  const handleUpdateTemplate = useCallback(
    (newTemplate: TagTemplate, addToHistory = true) => {
      // Keep full-card uploaded template background element synced with template dimensions
      const hasTemplateBg = newTemplate.elements.some(
        (el) =>
          el.id === 'el_template_bg' &&
          (el.width !== newTemplate.widthMm || el.height !== newTemplate.heightMm)
      );
      const normalizedTemplate: TagTemplate = hasTemplateBg
        ? {
            ...newTemplate,
            elements: newTemplate.elements.map((el) =>
              el.id === 'el_template_bg'
                ? { ...el, left: 0, top: 0, width: newTemplate.widthMm, height: newTemplate.heightMm }
                : el
            ),
          }
        : newTemplate;

      setTemplate(normalizedTemplate);
      if (addToHistory) {
        setHistory((prev) => {
          const newHistory = prev.slice(0, historyIndex + 1);
          return [...newHistory, normalizedTemplate];
        });
        setHistoryIndex((prev) => prev + 1);
      }
    },
    [historyIndex]
  );

  // Undo Handler
  const handleUndo = useCallback(() => {
    if (historyIndex > 0) {
      const prevIndex = historyIndex - 1;
      setHistoryIndex(prevIndex);
      setTemplate(history[prevIndex]);
    }
  }, [historyIndex, history]);

  // Redo Handler
  const handleRedo = useCallback(() => {
    if (historyIndex < history.length - 1) {
      const nextIndex = historyIndex + 1;
      setHistoryIndex(nextIndex);
      setTemplate(history[nextIndex]);
    }
  }, [historyIndex, history]);

  // Add Element Handler
  const handleAddElement = (element: TagElement) => {
    const updated = {
      ...template,
      elements: [...template.elements, element],
    };
    handleUpdateTemplate(updated);
    setSelectedElementId(element.id);
  };

  // Keyboard Shortcuts (Ctrl+Z, Ctrl+Y, Ctrl+P)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey) {
        e.preventDefault();
        handleUndo();
      } else if (
        ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'y') ||
        ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key.toLowerCase() === 'z')
      ) {
        e.preventDefault();
        handleRedo();
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        e.preventDefault();
        setIsPrintPreviewOpen(true);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleUndo, handleRedo]);

  const handleOpenPrintPreview = (filterCategory?: string) => {
    setPrintCategoryFilter(filterCategory);
    setIsPrintPreviewOpen(true);
  };

  // Products to pass to print preview (only computed when print preview is open)
  const printProducts = useMemo(() => {
    if (!isPrintPreviewOpen) return [];
    if (!printCategoryFilter) return products;
    const catLower = printCategoryFilter.toLowerCase();
    return products.filter(
      (p) =>
        p.category_id === printCategoryFilter ||
        (p.category && String(p.category).toLowerCase().includes(catLower))
    );
  }, [isPrintPreviewOpen, printCategoryFilter, products]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-100 dark:bg-slate-950 text-slate-800 dark:text-slate-100 font-sans transition-colors">
      {/* Top Navigation Bar */}
      <Navbar
        template={template}
        onUpdateTemplate={handleUpdateTemplate}
        products={products}
        canUndo={historyIndex > 0}
        canRedo={historyIndex < history.length - 1}
        onUndo={handleUndo}
        onRedo={handleRedo}
        onOpenTemplates={() => setIsTemplatesOpen(true)}
        onOpenBulkImport={() => setIsBulkImportOpen(true)}
        onOpenPrintPreview={() => handleOpenPrintPreview()}
        onOpenPresetSizes={() => setIsPresetSizesOpen(true)}
        onOpenProductManager={() => setIsProductManagerOpen(true)}
        onOpenQuickPriceEditor={(idx = 0) => {
          setQuickPriceProductIndex(idx);
          setIsQuickPriceOpen(true);
        }}
        onOpenMobileConnect={() => setIsMobileConnectOpen(true)}
        theme={theme}
        onToggleTheme={toggleTheme}
        viewMode={viewMode}
        onViewModeChange={setViewMode}
      />

      {/* Main Content: Dashboard View OR Designer Studio */}
      {viewMode === 'dashboard' ? (
        <DashboardView
          products={products}
          template={template}
          onUpdateProducts={(newProducts) => {
            setProducts(newProducts);
            if (sampleProductIndex >= newProducts.length) {
              setSampleProductIndex(Math.max(0, newProducts.length - 1));
            }
          }}
          onOpenDesigner={() => setViewMode('editor')}
          onOpenPrintPreview={(cat) => handleOpenPrintPreview(cat)}
          onOpenBulkImport={() => setIsBulkImportOpen(true)}
          onOpenProductManager={() => setIsProductManagerOpen(true)}
          onOpenTemplates={() => setIsTemplatesOpen(true)}
          onOpenQuickPriceEditor={(idx = 0) => {
            setQuickPriceProductIndex(idx);
            setIsQuickPriceOpen(true);
          }}
          onSelectProductForEditor={(idx) => {
            setSampleProductIndex(idx);
            setViewMode('editor');
          }}
        />
      ) : (
        <div className="flex-1 flex overflow-hidden">
          {/* Left Elements / Canvas Settings Sidebar */}
          <Sidebar
            template={template}
            onUpdateTemplate={handleUpdateTemplate}
            onAddElement={handleAddElement}
            selectedElementId={selectedElementId}
            onOpenPresetSizes={() => setIsPresetSizesOpen(true)}
          />

          {/* Central Visual Workspace */}
          <Canvas
            template={template}
            onUpdateTemplate={handleUpdateTemplate}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            sampleProducts={products}
            currentProductIndex={sampleProductIndex}
            onSelectProductIndex={setSampleProductIndex}
            mappings={mappings}
          />

          {/* Right Properties & Layers Inspector */}
          <PropertiesPanel
            template={template}
            onUpdateTemplate={handleUpdateTemplate}
            selectedElementId={selectedElementId}
            onSelectElement={setSelectedElementId}
            onOpenPresetSizes={() => setIsPresetSizesOpen(true)}
            currentProduct={products[sampleProductIndex]}
            mappings={mappings}
            onUpdateProduct={(updated) => {
              setProducts((prev) => {
                const next = [...prev];
                next[sampleProductIndex] = updated;
                return next;
              });
            }}
            onOpenSaveTemplateModal={() => setIsTemplatesOpen(true)}
          />
        </div>
      )}

      {/* Modals (Conditionally mounted so closed modals consume zero CPU/memory) */}
      {isQuickPriceOpen && (
        <QuickPriceEditorModal
          isOpen={isQuickPriceOpen}
          onClose={() => setIsQuickPriceOpen(false)}
          products={products}
          template={template}
          onUpdateTemplate={handleUpdateTemplate}
          mappings={mappings}
          initialProductIndex={quickPriceProductIndex}
          onUpdateProduct={(updatedProduct, index) => {
            setProducts((prev) => {
              const next = [...prev];
              next[index] = updatedProduct;
              return next;
            });
          }}
          onOpenPrintPreview={() => handleOpenPrintPreview()}
        />
      )}

      {isTemplatesOpen && (
        <TemplatesModal
          isOpen={isTemplatesOpen}
          onClose={() => setIsTemplatesOpen(false)}
          onSelectTemplate={(tpl) => {
            handleUpdateTemplate(tpl);
            setSelectedElementId(null);
          }}
          currentTemplateId={template.id}
          activeTemplate={template}
        />
      )}

      {isBulkImportOpen && (
        <BulkImportWizardModal
          isOpen={isBulkImportOpen}
          onClose={() => setIsBulkImportOpen(false)}
          template={template}
          products={products}
          mappings={mappings}
          onApplyProducts={(newProducts, newMappings) => {
            setProducts(newProducts);
            setMappings(newMappings);
            setSampleProductIndex(0);
          }}
        />
      )}

      {isProductManagerOpen && (
        <ProductManagerModal
          isOpen={isProductManagerOpen}
          onClose={() => setIsProductManagerOpen(false)}
          products={products}
          mappings={mappings}
          onUpdateProducts={(newProducts) => {
            setProducts(newProducts);
            if (sampleProductIndex >= newProducts.length) {
              setSampleProductIndex(Math.max(0, newProducts.length - 1));
            }
          }}
          onOpenBulkImport={() => setIsBulkImportOpen(true)}
        />
      )}

      {isPrintPreviewOpen && (
        <PrintPreviewModal
          isOpen={isPrintPreviewOpen}
          onClose={() => {
            setIsPrintPreviewOpen(false);
            setPrintCategoryFilter(undefined);
          }}
          template={template}
          onUpdateTemplate={handleUpdateTemplate}
          products={printProducts}
          mappings={mappings}
        />
      )}

      {isPresetSizesOpen && (
        <PresetSizesModal
          isOpen={isPresetSizesOpen}
          onClose={() => setIsPresetSizesOpen(false)}
          template={template}
          onSelectSize={(w, h) => {
            handleUpdateTemplate({
              ...template,
              widthMm: w,
              heightMm: h,
            });
          }}
        />
      )}

      {isMobileConnectOpen && (
        <MobileConnectModal
          isOpen={isMobileConnectOpen}
          onClose={() => setIsMobileConnectOpen(false)}
        />
      )}
    </div>
  );
};

export default App;

