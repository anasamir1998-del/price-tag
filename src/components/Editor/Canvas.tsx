import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize,
  Move,
  Lock,
  Eye,
  Trash2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { TagTemplate, TagElement, ProductItem, FieldMapping } from '../../types';
import { mmToPx, pxToMm, SCREEN_DPI } from '../../utils/dimensions';
import { isOldPriceElement, resolveElementText, shouldRenderTagElement } from '../../utils/tagRenderer';
import { generateBarcodeDataUrl } from '../../utils/barcodeGenerator';

interface CanvasProps {
  template: TagTemplate;
  onUpdateTemplate: (template: TagTemplate, addToHistory?: boolean) => void;
  selectedElementId: string | null;
  onSelectElement: (id: string | null) => void;
  sampleProducts: ProductItem[];
  currentProductIndex: number;
  onSelectProductIndex: (index: number) => void;
  mappings: FieldMapping[];
}

export const Canvas: React.FC<CanvasProps> = ({
  template,
  onUpdateTemplate,
  selectedElementId,
  onSelectElement,
  sampleProducts,
  currentProductIndex,
  onSelectProductIndex,
  mappings,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  
  const getOptimalZoom = useCallback((width: number, height: number) => {
    const maxDim = Math.max(width, height);
    if (maxDim >= 250) return 0.7; // A4 size
    if (maxDim >= 140) return 1.2; // A5 / A6 size
    if (maxDim >= 90) return 1.8;  // Medium tags
    return 2.5;                    // Small shelf tags
  }, []);

  const [zoom, setZoom] = useState<number>(() => getOptimalZoom(template.widthMm, template.heightMm));

  useEffect(() => {
    setZoom(getOptimalZoom(template.widthMm, template.heightMm));
  }, [template.widthMm, template.heightMm, getOptimalZoom]);

  const [barcodeImages, setBarcodeImages] = useState<Record<string, string>>({});

  // Dragging & Resizing State
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartPos, setDragStartPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [elementStartPos, setElementStartPos] = useState<{ left: number; top: number; width: number; height: number }>({
    left: 0,
    top: 0,
    width: 0,
    height: 0,
  });
  const [resizeHandle, setResizeHandle] = useState<string | null>(null);

  // Snap Guides State
  const [activeGuides, setActiveGuides] = useState<{ x?: number; y?: number }>({});

  const currentItem = sampleProducts[currentProductIndex] || sampleProducts[0];

  // Compute a stable signature for barcode/QR elements only, so moving/editing text or price elements never regenerates barcodes
  const barcodeElementsKey = useMemo(
    () =>
      template.elements
        .filter((el) => el.type === 'barcode' || el.type === 'qrcode')
        .map(
          (el) =>
            `${el.id}:${el.type}:${el.barcodeType}:${el.includeBarcodeText}:${el.barcodeColor}:${el.barcodeBgColor}:${resolveElementText(el, currentItem, mappings)}`
        )
        .join('|'),
    [template.elements, currentItem, mappings]
  );

  // Pre-generate barcodes for all barcode/qrcode elements only when barcode data or settings change
  useEffect(() => {
    let isMounted = true;
    const generateAllCodes = async () => {
      const codeImgs: Record<string, string> = {};
      for (const el of template.elements) {
        if (el.type === 'barcode' || el.type === 'qrcode') {
          const codeVal = resolveElementText(el, currentItem, mappings) || '628100123456';
          try {
            const url = await generateBarcodeDataUrl(codeVal, el.barcodeType || 'code128', {
              includeText: el.includeBarcodeText ?? true,
              color: el.barcodeColor || '#000000',
              bgColor: el.barcodeBgColor || '#ffffff',
            });
            codeImgs[el.id] = url;
          } catch (e) {
            console.error(e);
          }
        }
      }
      if (isMounted) {
        setBarcodeImages(codeImgs);
      }
    };

    generateAllCodes();
    return () => {
      isMounted = false;
    };
  }, [barcodeElementsKey]);

  // Selected element helper
  const selectedElement = template.elements.find((el) => el.id === selectedElementId);

  // Keyboard navigation & deletion
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!selectedElement || selectedElement.locked) return;

      // Ignore if user is typing in an input
      if (['INPUT', 'TEXTAREA', 'SELECT'].includes((e.target as HTMLElement)?.tagName)) {
        return;
      }

      const step = e.shiftKey ? 2 : 0.5; // mm step

      if (e.key === 'Delete' || e.key === 'Backspace') {
        e.preventDefault();
        onUpdateTemplate({
          ...template,
          elements: template.elements.filter((el) => el.id !== selectedElementId),
        });
        onSelectElement(null);
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        updateElementPosition(selectedElement.id, { left: Math.max(0, selectedElement.left - step) });
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        updateElementPosition(selectedElement.id, {
          left: Math.min(template.widthMm - selectedElement.width, selectedElement.left + step),
        });
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        updateElementPosition(selectedElement.id, { top: Math.max(0, selectedElement.top - step) });
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        updateElementPosition(selectedElement.id, {
          top: Math.min(template.heightMm - selectedElement.height, selectedElement.top + step),
        });
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedElement, selectedElementId, template]);

  const updateElementPosition = (id: string, updates: Partial<TagElement>, addToHistory = true) => {
    onUpdateTemplate(
      {
        ...template,
        elements: template.elements.map((el) => (el.id === id ? { ...el, ...updates } : el)),
      },
      addToHistory
    );
  };

  // Start Dragging Element
  const handleMouseDownElement = (e: React.MouseEvent, el: TagElement) => {
    e.stopPropagation();
    onSelectElement(el.id);

    // If template is locked or element is locked/hidden, prevent accidental move
    if (template.isLocked || el.locked || el.hidden) return;

    setIsDragging(true);
    setResizeHandle(null);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setElementStartPos({ left: el.left, top: el.top, width: el.width, height: el.height });
  };

  // Start Resizing Handle
  const handleMouseDownResize = (e: React.MouseEvent, handle: string) => {
    e.stopPropagation();
    if (template.isLocked || !selectedElement || selectedElement.locked) return;

    setIsDragging(true);
    setResizeHandle(handle);
    setDragStartPos({ x: e.clientX, y: e.clientY });
    setElementStartPos({
      left: selectedElement.left,
      top: selectedElement.top,
      width: selectedElement.width,
      height: selectedElement.height,
    });
  };

  // Global Mouse Move for Drag / Resize
  const handleMouseMove = useCallback(
    (e: React.MouseEvent) => {
      if (!isDragging || !selectedElement || template.isLocked) return;

      const deltaXPx = (e.clientX - dragStartPos.x) / zoom;
      const deltaYPx = (e.clientY - dragStartPos.y) / zoom;

      const deltaXMm = pxToMm(deltaXPx, SCREEN_DPI);
      const deltaYMm = pxToMm(deltaYPx, SCREEN_DPI);

      if (resizeHandle) {
        // Resizing logic
        let newLeft = elementStartPos.left;
        let newTop = elementStartPos.top;
        let newWidth = elementStartPos.width;
        let newHeight = elementStartPos.height;

        if (resizeHandle.includes('e')) {
          newWidth = Math.max(3, elementStartPos.width + deltaXMm);
        }
        if (resizeHandle.includes('w')) {
          const maxLeftShift = elementStartPos.width - 3;
          const shift = Math.min(maxLeftShift, Math.max(-elementStartPos.left, deltaXMm));
          newLeft = elementStartPos.left + shift;
          newWidth = elementStartPos.width - shift;
        }
        if (resizeHandle.includes('s')) {
          newHeight = Math.max(3, elementStartPos.height + deltaYMm);
        }
        if (resizeHandle.includes('n')) {
          const maxTopShift = elementStartPos.height - 3;
          const shift = Math.min(maxTopShift, Math.max(-elementStartPos.top, deltaYMm));
          newTop = elementStartPos.top + shift;
          newHeight = elementStartPos.height - shift;
        }

        updateElementPosition(
          selectedElement.id,
          {
            left: Number(newLeft.toFixed(1)),
            top: Number(newTop.toFixed(1)),
            width: Number(newWidth.toFixed(1)),
            height: Number(newHeight.toFixed(1)),
          },
          false
        );
      } else {
        // Moving logic with smart snap
        let targetLeft = elementStartPos.left + deltaXMm;
        let targetTop = elementStartPos.top + deltaYMm;

        // Snap to center horizontally
        const centerX = template.widthMm / 2;
        const elCenterX = targetLeft + selectedElement.width / 2;
        const guides: { x?: number; y?: number } = {};

        if (Math.abs(elCenterX - centerX) < 1.5) {
          targetLeft = centerX - selectedElement.width / 2;
          guides.x = centerX;
        }

        // Snap to center vertically
        const centerY = template.heightMm / 2;
        const elCenterY = targetTop + selectedElement.height / 2;
        if (Math.abs(elCenterY - centerY) < 1.5) {
          targetTop = centerY - selectedElement.height / 2;
          guides.y = centerY;
        }

        setActiveGuides(guides);

        // Constrain to canvas boundaries
        targetLeft = Math.max(0, Math.min(template.widthMm - selectedElement.width, targetLeft));
        targetTop = Math.max(0, Math.min(template.heightMm - selectedElement.height, targetTop));

        updateElementPosition(
          selectedElement.id,
          {
            left: Number(targetLeft.toFixed(1)),
            top: Number(targetTop.toFixed(1)),
          },
          false
        );
      }
    },
    [isDragging, selectedElement, dragStartPos, zoom, resizeHandle, elementStartPos, template]
  );

  const handleMouseUp = () => {
    if (
      isDragging &&
      selectedElement &&
      (selectedElement.left !== elementStartPos.left ||
        selectedElement.top !== elementStartPos.top ||
        selectedElement.width !== elementStartPos.width ||
        selectedElement.height !== elementStartPos.height)
    ) {
      onUpdateTemplate(template, true);
    }
    setIsDragging(false);
    setResizeHandle(null);
    setActiveGuides({});
  };

  const canvasWidthPx = mmToPx(template.widthMm, SCREEN_DPI);
  const canvasHeightPx = mmToPx(template.heightMm, SCREEN_DPI);

  const toggleTemplateLock = () => {
    onUpdateTemplate({
      ...template,
      isLocked: !template.isLocked,
    });
  };

  return (
    <main
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseDown={() => onSelectElement(null)}
      className="flex-1 bg-slate-100 dark:bg-slate-950 bg-canvas-grid-light dark:bg-canvas-grid relative overflow-auto flex flex-col items-center justify-center p-8 select-none transition-colors"
    >
      {/* Top Floating Controls Bar: Zoom & Sample Data Switcher & Lock Toggle */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md px-4 py-2 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-xl text-slate-800 dark:text-slate-100">
        {/* Lock/Unlock Template Structure Button */}
        <button
          onClick={toggleTemplateLock}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-bold border transition-all ${
            template.isLocked
              ? 'bg-amber-50 dark:bg-amber-950/60 border-amber-300 dark:border-amber-700/80 text-amber-700 dark:text-amber-300 shadow-sm'
              : 'bg-slate-100 dark:bg-slate-800 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'
          }`}
          title={template.isLocked ? 'القالب مقفل (تعديل الأسعار فقط) - انقر لفك القفل' : 'انقر لقفل تصميم القالب وتعديل الأسعار فقط'}
        >
          {template.isLocked ? (
            <>
              <Lock className="w-3.5 h-3.5 text-amber-600 dark:text-amber-400" />
              <span>تعديل الأسعار فقط 🔒</span>
            </>
          ) : (
            <>
              <Sparkles className="w-3.5 h-3.5 text-brand-500" />
              <span>قفل التصميم</span>
            </>
          )}
        </button>

        <div className="h-5 w-px bg-slate-200 dark:border-slate-800" />

        {/* Sample Item Navigation */}
        <div className="flex items-center gap-1.5 border-l border-slate-200 dark:border-slate-800 pl-3">
          <span className="text-xs text-slate-500 dark:text-slate-400 font-medium flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
            عينة المعاينة:
          </span>
          <button
            onClick={() => onSelectProductIndex(Math.max(0, currentProductIndex - 1))}
            disabled={currentProductIndex === 0}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-brand-600 dark:text-brand-300 min-w-[50px] text-center font-mono">
            {currentProductIndex + 1} / {sampleProducts.length}
          </span>
          <button
            onClick={() => onSelectProductIndex(Math.min(sampleProducts.length - 1, currentProductIndex + 1))}
            disabled={currentProductIndex >= sampleProducts.length - 1}
            className="p-1 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {currentItem && (
            <span className="text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 px-1.5 py-0.5 rounded-md font-mono font-bold mr-1">
              {currentItem.print_quantity || currentItem.quantity || 1} ملصق
            </span>
          )}
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1">
          <button
            onClick={() => setZoom(Math.max(1, zoom - 0.25))}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="تصغير"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <button
            onClick={() => setZoom(Math.min(5, zoom + 0.25))}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            title="تكبير"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoom(getOptimalZoom(template.widthMm, template.heightMm))}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-xs font-medium"
            title="إعادة ضبط الحجم"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Canvas Workspace Board */}
      <div
        style={{
          transform: `scale(${zoom})`,
          transformOrigin: 'center center',
          transition: isDragging ? 'none' : 'transform 0.15s ease-out',
        }}
        className="relative my-auto"
      >
        {/* Alignment Center Guides */}
        {activeGuides.x !== undefined && (
          <div
            style={{ left: `${mmToPx(activeGuides.x, SCREEN_DPI)}px` }}
            className="absolute top-0 bottom-0 w-px bg-brand-500 z-50 pointer-events-none shadow-[0_0_8px_#3b82f6]"
          />
        )}
        {activeGuides.y !== undefined && (
          <div
            style={{ top: `${mmToPx(activeGuides.y, SCREEN_DPI)}px` }}
            className="absolute left-0 right-0 h-px bg-brand-500 z-50 pointer-events-none shadow-[0_0_8px_#3b82f6]"
          />
        )}

        {/* The Printable Tag Card Surface */}
        <div
          style={{
            width: `${canvasWidthPx}px`,
            height: `${canvasHeightPx}px`,
            backgroundColor: template.backgroundColor || '#ffffff',
            borderRadius: `${template.borderRadius ? mmToPx(template.borderRadius, SCREEN_DPI) : 0}px`,
            border: template.borderWidth
              ? `${mmToPx(template.borderWidth, SCREEN_DPI)}px solid ${template.borderColor || '#e2e8f0'}`
              : '1px dashed #475569',
          }}
          className="relative overflow-hidden shadow-2xl transition-all"
        >
          {/* Background Watermark Image if present */}
          {template.backgroundImage && (
            <div
              style={{
                position: 'absolute',
                left: `${(1 - (template.watermarkScale ?? 0.7)) * 50}%`,
                top: `${(1 - (template.watermarkScale ?? 0.7)) * 50}%`,
                width: `${(template.watermarkScale ?? 0.7) * 100}%`,
                height: `${(template.watermarkScale ?? 0.7) * 100}%`,
                backgroundImage: `url(${template.backgroundImage})`,
                backgroundPosition: 'center',
                backgroundRepeat: 'no-repeat',
                backgroundSize: 'contain',
                opacity: template.watermarkOpacity !== undefined ? template.watermarkOpacity : 0.15,
                pointerEvents: 'none',
                zIndex: 0,
                transition: 'all 0.15s ease-out',
              }}
            />
          )}

          {/* Elements on Canvas */}
          {template.elements
            .filter((el) => {
              if (el.hidden) return false;
              if (template.showOldPrice === false && isOldPriceElement(el)) return false;
              if (el.id === selectedElementId) return true;
              return shouldRenderTagElement(el, template, currentItem, mappings);
            })
            .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
            .map((el) => {
              const isSelected = el.id === selectedElementId;
              const leftPx = mmToPx(el.left, SCREEN_DPI);
              const topPx = mmToPx(el.top, SCREEN_DPI);
              const widthPx = mmToPx(el.width, SCREEN_DPI);
              const heightPx = mmToPx(el.height, SCREEN_DPI);

              return (
                <div
                  key={el.id}
                  onMouseDown={(e) => handleMouseDownElement(e, el)}
                  style={{
                    position: 'absolute',
                    left: `${leftPx}px`,
                    top: `${topPx}px`,
                    width: `${widthPx}px`,
                    height: `${heightPx}px`,
                    zIndex: el.zIndex || 1,
                    opacity: el.opacity ?? 1,
                    transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                    cursor: el.locked ? 'not-allowed' : 'move',
                  }}
                  className={`group select-none ${
                    isSelected ? 'ring-2 ring-brand-500 ring-offset-1 ring-offset-transparent' : 'hover:ring-1 hover:ring-brand-400/50'
                  }`}
                >
                  {/* Element Content Render */}
                  {el.type === 'text' || el.type === 'price' ? (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent:
                          el.textAlign === 'center'
                            ? 'center'
                            : el.textAlign === 'left'
                            ? 'flex-start'
                            : 'flex-end',
                        backgroundColor: el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : undefined,
                        border: el.borderWidth ? `${mmToPx(el.borderWidth, SCREEN_DPI)}px solid ${el.borderColor || '#000'}` : undefined,
                        borderRadius: el.borderRadius ? `${mmToPx(el.borderRadius, SCREEN_DPI)}px` : undefined,
                        fontFamily: el.fontFamily || 'Tajawal, sans-serif',
                        fontSize: `${(el.fontSize || 12) * 0.85}px`,
                        fontWeight: el.fontWeight || 'normal',
                        color: el.textColor || '#0f172a',
                        textDecoration: el.textDecoration || 'none',
                        lineHeight: 1.1,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        direction: 'rtl',
                        padding: '0 2px',
                      }}
                    >
                      {resolveElementText(el, currentItem, mappings)}
                    </div>
                  ) : el.type === 'badge' ? (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: el.fillColor || '#ef4444',
                        color: el.textColor || '#ffffff',
                        borderRadius: el.borderRadius ? `${mmToPx(el.borderRadius, SCREEN_DPI)}px` : '4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: `${(el.fontSize || 10) * 0.85}px`,
                        fontWeight: el.fontWeight || 'bold',
                        fontFamily: el.fontFamily || 'Tajawal, sans-serif',
                      }}
                    >
                      {el.text}
                    </div>
                  ) : el.type === 'shape' ? (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: el.fillColor || '#f1f5f9',
                        border: el.borderWidth ? `${mmToPx(el.borderWidth, SCREEN_DPI)}px solid ${el.borderColor || '#000'}` : undefined,
                        borderRadius:
                          el.shapeType === 'circle'
                            ? '9999px'
                            : el.borderRadius
                            ? `${mmToPx(el.borderRadius, SCREEN_DPI)}px`
                            : '0px',
                      }}
                    />
                  ) : el.type === 'line' ? (
                    <div
                      style={{
                        width: '100%',
                        height: `${mmToPx(el.borderWidth || 0.5, SCREEN_DPI)}px`,
                        backgroundColor: el.borderColor || '#cbd5e1',
                        margin: 'auto 0',
                      }}
                    />
                  ) : el.type === 'barcode' || el.type === 'qrcode' ? (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        backgroundColor: el.barcodeBgColor || (el.fillColor === 'transparent' ? 'transparent' : (el.fillColor || 'transparent')),
                        borderRadius: el.borderRadius ? `${mmToPx(el.borderRadius, SCREEN_DPI)}px` : undefined,
                        border: el.borderWidth ? `${mmToPx(el.borderWidth, SCREEN_DPI)}px solid ${el.borderColor || '#000'}` : undefined,
                      }}
                      className="flex items-center justify-center overflow-hidden"
                    >
                      {barcodeImages[el.id] ? (
                        <img
                          src={barcodeImages[el.id]}
                          alt="Barcode"
                          className="w-full h-full object-contain pointer-events-none"
                        />
                      ) : (
                        <div className="text-[8px] text-slate-400 font-mono">Barcode...</div>
                      )}
                    </div>
                  ) : el.type === 'image' ? (
                    <div
                      style={{
                        width: '100%',
                        height: '100%',
                        borderRadius: el.borderRadius ? `${mmToPx(el.borderRadius, SCREEN_DPI)}px` : undefined,
                        border: el.borderWidth ? `${mmToPx(el.borderWidth, SCREEN_DPI)}px solid ${el.borderColor || '#000'}` : undefined,
                        backgroundColor: el.fillColor && el.fillColor !== 'transparent' ? el.fillColor : undefined,
                        overflow: 'hidden',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }}
                    >
                      {el.imageUrl ? (
                        <img
                          src={el.imageUrl}
                          alt={el.name || 'شعار'}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: el.imageFit || 'contain',
                            pointerEvents: 'none',
                          }}
                        />
                      ) : (
                        <div className="text-[9px] text-slate-400 font-bold flex items-center gap-1">
                          <span>🖼️</span>
                          <span>شعار</span>
                        </div>
                      )}
                    </div>
                  ) : null}

                  {/* Resizing Handles (When Selected) */}
                  {isSelected && !el.locked && (
                    <>
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, 'nw')}
                        className="absolute -top-1 -left-1 w-2.5 h-2.5 bg-brand-500 border border-white rounded-full cursor-nwse-resize z-30"
                      />
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, 'ne')}
                        className="absolute -top-1 -right-1 w-2.5 h-2.5 bg-brand-500 border border-white rounded-full cursor-nesw-resize z-30"
                      />
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, 'sw')}
                        className="absolute -bottom-1 -left-1 w-2.5 h-2.5 bg-brand-500 border border-white rounded-full cursor-nesw-resize z-30"
                      />
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, 'se')}
                        className="absolute -bottom-1 -right-1 w-2.5 h-2.5 bg-brand-500 border border-white rounded-full cursor-nwse-resize z-30"
                      />
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, 'e')}
                        className="absolute top-1/2 -right-1 -translate-y-1/2 w-2 h-3 bg-brand-500 border border-white rounded cursor-ew-resize z-30"
                      />
                      <div
                        onMouseDown={(e) => handleMouseDownResize(e, 'w')}
                        className="absolute top-1/2 -left-1 -translate-y-1/2 w-2 h-3 bg-brand-500 border border-white rounded cursor-ew-resize z-30"
                      />
                    </>
                  )}
                </div>
              );
            })}
        </div>
      </div>
    </main>
  );
};
