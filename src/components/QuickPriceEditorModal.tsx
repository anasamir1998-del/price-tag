import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  X,
  DollarSign,
  Search,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Printer,
  Check,
  Percent,
  Barcode,
  Tag,
  Save,
  Layers,
  ArrowRight,
  ArrowLeft,
  Package,
  Camera,
  Flashlight,
  SwitchCamera,
  AlertCircle,
  Eye,
  Edit3,
  Image as ImageIcon,
  HelpCircle,
} from 'lucide-react';
import { Html5Qrcode } from 'html5-qrcode';
import { ProductItem, TagTemplate, FieldMapping } from '../types';
import { getCategoryById } from '../data/categories';
import {
  buildUpdatedProductPrices,
  resolveElementText,
  shouldRenderTagElement,
  withOldPriceVisibility,
} from '../utils/tagRenderer';
import { generateBarcodeDataUrl } from '../utils/barcodeGenerator';
import { mmToPx, SCREEN_DPI } from '../utils/dimensions';

interface QuickPriceEditorModalProps {
  isOpen: boolean;
  onClose: () => void;
  products: ProductItem[];
  template: TagTemplate;
  onUpdateTemplate?: (template: TagTemplate) => void;
  mappings: FieldMapping[];
  initialProductIndex?: number;
  onUpdateProduct: (updatedProduct: ProductItem, index: number) => void;
  onOpenPrintPreview?: () => void;
}

// Normalize Arabic text for smart instant search
function normalizeArabic(text: any): string {
  if (text === null || text === undefined) return '';
  return String(text)
    .toLowerCase()
    .replace(/[أإآ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/[\u064B-\u065F\u0670]/g, '')
    .trim();
}

export const QuickPriceEditorModal: React.FC<QuickPriceEditorModalProps> = ({
  isOpen,
  onClose,
  products,
  template,
  onUpdateTemplate,
  mappings,
  initialProductIndex = 0,
  onUpdateProduct,
  onOpenPrintPreview,
}) => {
  const [currentIndex, setCurrentIndex] = useState<number>(initialProductIndex);
  const [includeOldPrice, setIncludeOldPrice] = useState<boolean>(template.showOldPrice !== false);

  useEffect(() => {
    setIncludeOldPrice(template.showOldPrice !== false);
  }, [isOpen, template.showOldPrice]);

  const previewTemplate = useMemo(
    () => withOldPriceVisibility(template, includeOldPrice),
    [template, includeOldPrice]
  );

  const handleToggleOldPrice = (checked: boolean) => {
    setIncludeOldPrice(checked);
    onUpdateTemplate?.(withOldPriceVisibility(template, checked));
  };
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [barcodeImages, setBarcodeImages] = useState<Record<string, string>>({});
  const [isSavedRecently, setIsSavedRecently] = useState<boolean>(false);
  const [mobileTab, setMobileTab] = useState<'editor' | 'preview'>('editor');

  // Camera Scanner State
  const [isCameraScanning, setIsCameraScanning] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);
  const [availableCameras, setAvailableCameras] = useState<{ id: string; label: string }[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  const [isProcessingImage, setIsProcessingImage] = useState<boolean>(false);
  const html5QrCodeRef = useRef<Html5Qrcode | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const photoCaptureRef = useRef<HTMLInputElement | null>(null);

  // Form State
  const [currentPrice, setCurrentPrice] = useState<string>('');
  const [oldPrice, setOldPrice] = useState<string>('');
  const [printQuantity, setPrintQuantity] = useState<number>(1);
  const [discountBadge, setDiscountBadge] = useState<string>('');

  useEffect(() => {
    if (isOpen) {
      const idx = Math.max(0, Math.min(products.length - 1, initialProductIndex));
      setCurrentIndex(idx);
    }
  }, [isOpen, initialProductIndex, products.length]);

  const currentProduct = products[currentIndex] || products[0];

  // Sync form state when current product changes
  useEffect(() => {
    if (currentProduct) {
      const pPrice = currentProduct.price || currentProduct['السعر'] || '';
      const pOldPrice = currentProduct.old_price || currentProduct['السعر السابق'] || '';
      const pQty =
        currentProduct.print_quantity !== undefined
          ? currentProduct.print_quantity
          : currentProduct.quantity || 1;

      setCurrentPrice(String(pPrice));
      setOldPrice(String(pOldPrice));
      setPrintQuantity(Math.max(1, Number(pQty) || 1));

      // Calculate discount
      const curN = parseFloat(String(pPrice));
      const oldN = parseFloat(String(pOldPrice));
      if (oldN > 0 && curN > 0 && oldN > curN) {
        const pct = Math.round(((oldN - curN) / oldN) * 100);
        setDiscountBadge(`${pct}%`);
      } else {
        setDiscountBadge(currentProduct.discount_percentage || '');
      }
    }
  }, [currentIndex, currentProduct]);

  // Pre-generate Barcodes for the active preview card
  useEffect(() => {
    let isMounted = true;
    const generateCodes = async () => {
      if (!currentProduct) return;
      const imgs: Record<string, string> = {};
      for (const el of template.elements) {
        if (el.type === 'barcode' || el.type === 'qrcode') {
          const codeVal = resolveElementText(el, currentProduct, mappings) || '628100123456';
          try {
            const url = await generateBarcodeDataUrl(codeVal, el.barcodeType || 'code128', {
              includeText: el.includeBarcodeText ?? true,
              color: el.barcodeColor || '#000000',
              bgColor: el.barcodeBgColor || 'transparent',
            });
            imgs[el.id] = url;
          } catch (e) {}
        }
      }
      if (isMounted) {
        setBarcodeImages(imgs);
      }
    };
    generateCodes();
    return () => {
      isMounted = false;
    };
  }, [template.elements, currentProduct, mappings]);

  // Play pleasant beep & vibrate on barcode detection
  const playBeepSound = () => {
    try {
      const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
      if (AudioContextClass) {
        const ctx = new AudioContextClass();
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(1046.5, ctx.currentTime); // C6 bright beep
        gain.gain.setValueAtTime(0.2, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.18);
      }
    } catch (e) {}
    if (navigator.vibrate) {
      try {
        navigator.vibrate(120);
      } catch (e) {}
    }
  };

  // Start Camera Barcode Scanner
  const startScanner = async (cameraIdToUse?: string) => {
    setIsCameraScanning(true);
    setCameraError(null);

    try {
      // Allow DOM to mount the reader div
      await new Promise((resolve) => setTimeout(resolve, 200));

      const qrId = 'mobile-barcode-reader';
      const el = document.getElementById(qrId);
      if (!el) {
        throw new Error('عنصر الكاميرا غير جاهز');
      }

      // Stop previous instance if any
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            await html5QrCodeRef.current.stop();
          }
        } catch (e) {}
      }

      const scanner = new Html5Qrcode(qrId);
      html5QrCodeRef.current = scanner;

      // Enumerate available cameras
      let cams: { id: string; label: string }[] = [];
      try {
        cams = await Html5Qrcode.getCameras();
        setAvailableCameras(cams);
      } catch (camErr) {
        console.warn('Could not enumerate cameras:', camErr);
      }

      const config = {
        fps: 15,
        qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
          const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
          return {
            width: Math.floor(minEdge * 0.88),
            height: Math.floor(minEdge * 0.55),
          };
        },
        aspectRatio: 1.333,
      };

      // Determine best camera ID (rear camera preferred)
      let targetCameraId = cameraIdToUse || selectedCameraId;
      if (!targetCameraId && cams.length > 0) {
        const backCam = cams.find(
          (c) =>
            c.label.toLowerCase().includes('back') ||
            c.label.toLowerCase().includes('rear') ||
            c.label.toLowerCase().includes('خلفية') ||
            c.label.toLowerCase().includes('environment')
        ) || cams[cams.length - 1]; // On mobile, last device is usually the back camera
        targetCameraId = backCam.id;
        setSelectedCameraId(targetCameraId);
      }

      if (targetCameraId) {
        await scanner.start(
          targetCameraId,
          config,
          (decodedText) => handleBarcodeScanned(decodedText),
          () => {}
        );
      } else {
        await scanner.start(
          { facingMode: 'environment' },
          config,
          (decodedText) => handleBarcodeScanned(decodedText),
          () => {}
        );
      }
    } catch (err: any) {
      console.error('Camera Scanner Error:', err);
      const errMsg = String(err?.message || err || '');
      if (errMsg.includes('Permission') || errMsg.includes('NotAllowedError')) {
        setCameraError(
          '🔒 تم حظر إذن الكاميرا في المتصفح. يرجى الضغط على أيقونة القفل 🔒 بجانب الرابط وتفعيل إذن الكاميرا (Camera: Allow).'
        );
      } else if (errMsg.includes('NotFoundError') || errMsg.includes('DevicesNotFoundError')) {
        setCameraError('⚠️ لم يتم العثور على كاميرا متصلة بالجهاز.');
      } else {
        setCameraError(
          'تعذر فتح البث المباشر للكاميرا. يمكنك استخدام زر "📸 التقاط صورة فورية" بالأسفل لتصوير الباركود ومسحه بنجاح.'
        );
      }
    }
  };

  // Switch between cameras (front/back)
  const switchCamera = async () => {
    if (availableCameras.length < 2) return;
    const currentIdx = availableCameras.findIndex((c) => c.id === selectedCameraId);
    const nextIdx = (currentIdx + 1) % availableCameras.length;
    const nextCamId = availableCameras[nextIdx].id;
    setSelectedCameraId(nextCamId);
    await startScanner(nextCamId);
  };

  // Stop Camera Scanner
  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        if (html5QrCodeRef.current.isScanning) {
          await html5QrCodeRef.current.stop();
        }
        html5QrCodeRef.current.clear();
      } catch (e) {}
      html5QrCodeRef.current = null;
    }
    setIsCameraScanning(false);
    setCameraError(null);
  };

  // Handle image file scan (photo from phone camera or file upload)
  const handleImageFileScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingImage(true);
    setCameraError(null);

    try {
      // Ensure reader container exists or use dedicated hidden element
      const qrId = 'mobile-barcode-reader';
      let scanner = html5QrCodeRef.current;
      if (!scanner) {
        scanner = new Html5Qrcode(qrId);
        html5QrCodeRef.current = scanner;
      }

      const decodedText = await scanner.scanFile(file, true);
      handleBarcodeScanned(decodedText);
    } catch (err: any) {
      console.error('File scan error:', err);
      setCameraError('⚠️ لم يتم العثور على باركود مقروء في الصورة. يرجى التقاط صورة أقرب وأوضح لخطوط الباركود.');
    } finally {
      setIsProcessingImage(false);
      e.target.value = '';
    }
  };

  // Handle successful barcode scan
  const handleBarcodeScanned = (scannedCode: string) => {
    const cleanCode = scannedCode.trim();
    if (!cleanCode) return;

    // Search for matching product in the list
    const foundIndex = products.findIndex((p) => {
      const pBarcode = String(p.barcode || p['الباركود'] || '').trim();
      const pCode = String(p.id || '').trim();
      return (
        pBarcode === cleanCode ||
        pBarcode.replace(/\s+/g, '') === cleanCode.replace(/\s+/g, '') ||
        pCode === cleanCode ||
        Object.values(p).some((v) => String(v).trim() === cleanCode)
      );
    });

    playBeepSound();

    if (foundIndex >= 0) {
      setCurrentIndex(foundIndex);
      const prodName = products[foundIndex].product_name || products[foundIndex]['اسم المنتج'] || 'المنتج';
      setScanSuccessMessage(`✅ تم العثور على: ${prodName}`);
      setTimeout(() => setScanSuccessMessage(null), 3500);
      stopScanner();
    } else {
      setCameraError(`⚠️ الباركود (${cleanCode}) غير مسجل في قائمة الأصناف الحالية.`);
    }
  };

  // Clean up scanner on modal close or unmount
  useEffect(() => {
    return () => {
      if (html5QrCodeRef.current) {
        try {
          if (html5QrCodeRef.current.isScanning) {
            html5QrCodeRef.current.stop();
          }
        } catch (e) {}
      }
    };
  }, []);

  // Filtered search results for quick selection list (early-stopping at 8 matches for instant speed on huge lists)
  const searchResults = useMemo(() => {
    const q = normalizeArabic(searchQuery);
    if (!q) return [];
    const results: { p: ProductItem; idx: number }[] = [];
    for (let idx = 0; idx < products.length && results.length < 8; idx++) {
      const p = products[idx];
      const primary = `${p.product_name || ''} ${p['اسم المنتج'] || ''} ${p.barcode || ''} ${p['الباركود'] || ''} ${p.price || ''} ${p['السعر'] || ''}`;
      if (normalizeArabic(primary).includes(q)) {
        results.push({ p, idx });
        continue;
      }
      const matchedOther = Object.entries(p).some(([key, val]) => {
        if (key === 'id') return false;
        return normalizeArabic(val).includes(q);
      });
      if (matchedOther) {
        results.push({ p, idx });
      }
    }
    return results;
  }, [products, searchQuery]);

  if (!isOpen || !currentProduct) return null;

  // Handle Price Changes & Auto Discount Calc
  const handlePriceUpdate = (newPrice: string, newOldPrice: string, newQty: number) => {
    setCurrentPrice(newPrice);
    setOldPrice(newOldPrice);
    setPrintQuantity(newQty);

    const updated = buildUpdatedProductPrices(
      currentProduct,
      { price: newPrice, oldPrice: newOldPrice, printQuantity: newQty },
      mappings
    );
    setDiscountBadge(String(updated.discount_percentage || ''));

    onUpdateProduct(updated, currentIndex);
    setIsSavedRecently(true);
    setTimeout(() => setIsSavedRecently(false), 1500);
  };

  // Quick discount % buttons (-10%, -20%, -30%, -50%)
  const applyQuickDiscount = (pct: number) => {
    const base = parseFloat(oldPrice || currentPrice || '0');
    if (base > 0) {
      const newOld = base.toFixed(2);
      const newCur = (base * (1 - pct / 100)).toFixed(2);
      handlePriceUpdate(newCur, newOld, printQuantity);
    }
  };

  // Save and Move to Next Product
  const handleSaveAndNext = () => {
    if (currentIndex < products.length - 1) {
      setCurrentIndex(currentIndex + 1);
      setSearchQuery('');
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      setCurrentIndex(currentIndex - 1);
      setSearchQuery('');
    }
  };

  const catInfo = getCategoryById(currentProduct.category_id || currentProduct.category);
  const canvasWidthPx = mmToPx(template.widthMm, SCREEN_DPI);
  const canvasHeightPx = mmToPx(template.heightMm, SCREEN_DPI);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border-0 sm:border border-slate-200 dark:border-slate-800 rounded-none sm:rounded-3xl w-full max-w-5xl h-full sm:h-auto sm:max-h-[94vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        
        {/* Hidden inputs for native phone camera photo capture and file upload */}
        <input
          type="file"
          ref={photoCaptureRef}
          accept="image/*"
          capture="environment"
          onChange={handleImageFileScan}
          className="hidden"
        />
        <input
          type="file"
          ref={fileInputRef}
          accept="image/*"
          onChange={handleImageFileScan}
          className="hidden"
        />

        {/* Top Header */}
        <div className="px-4 sm:px-6 py-3 sm:py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/70 flex-shrink-0">
          <div className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-600 dark:text-emerald-400 font-bold flex-shrink-0">
              <DollarSign className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="min-w-0">
              <h2 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white flex items-center gap-1.5 truncate">
                <span>تعديل الأسعار السريع</span>
                <span className="text-[10px] sm:text-xs px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-bold hidden xs:inline">
                  🔒 الأسعار فقط
                </span>
              </h2>
              <p className="text-[10px] sm:text-xs text-slate-500 dark:text-slate-400 truncate">
                عدّل الأسعار فوراً أو امسح الباركود بالكاميرا 📷
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 flex-shrink-0">
            {onOpenPrintPreview && (
              <button
                onClick={() => {
                  stopScanner();
                  onClose();
                  onOpenPrintPreview();
                }}
                className="hidden sm:flex items-center gap-1.5 px-3.5 py-1.5 sm:py-2 rounded-xl bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold shadow-md shadow-brand-600/30 transition-all"
              >
                <Printer className="w-4 h-4" />
                <span>معاينة الطباعة</span>
              </button>
            )}
            <button
              onClick={() => {
                stopScanner();
                onClose();
              }}
              className="p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Mobile View Switcher (Tabs) */}
        <div className="flex sm:hidden border-b border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-950 p-1">
          <button
            onClick={() => setMobileTab('editor')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'editor'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Edit3 className="w-3.5 h-3.5" />
            <span>تعديل السعر</span>
          </button>
          <button
            onClick={() => setMobileTab('preview')}
            className={`flex-1 py-2 text-xs font-bold rounded-lg flex items-center justify-center gap-1.5 transition-all ${
              mobileTab === 'preview'
                ? 'bg-white dark:bg-slate-900 text-brand-600 dark:text-brand-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <Eye className="w-3.5 h-3.5" />
            <span>معاينة الاستيكر</span>
          </button>
        </div>

        {/* Success / Info Toasts */}
        {scanSuccessMessage && (
          <div className="px-4 py-2 bg-emerald-500 text-white text-xs font-bold flex items-center justify-between gap-2 shadow-md animate-fadeIn">
            <span>{scanSuccessMessage}</span>
            <button onClick={() => setScanSuccessMessage(null)} className="p-1 hover:bg-white/20 rounded">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Product Search & Camera Scanner Toolbar */}
        <div className="px-4 sm:px-6 py-2.5 sm:py-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-950/40 flex flex-wrap items-center justify-between gap-2 sm:gap-3 flex-shrink-0">
          
          {/* Instant Product Search & Camera Scan Buttons */}
          <div className="relative flex-1 min-w-[200px] flex items-center gap-1.5">
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="ابحث بالاسم، الباركود، أو القسم..."
                className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl pr-9 pl-3 py-2 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-brand-500 focus:outline-none shadow-sm"
              />

              {/* Search Autocomplete Suggestions Dropdown */}
              {searchResults.length > 0 && (
                <div className="absolute top-full right-0 left-0 mt-1.5 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-2xl shadow-xl z-50 max-h-60 overflow-y-auto divide-y divide-slate-100 dark:divide-slate-800">
                  {searchResults.map(({ p, idx }) => (
                    <button
                      key={p.id}
                      onClick={() => {
                        setCurrentIndex(idx);
                        setSearchQuery('');
                      }}
                      className={`w-full text-right p-3 hover:bg-brand-50 dark:hover:bg-brand-950/50 flex items-center justify-between transition-colors ${
                        idx === currentIndex ? 'bg-brand-50/80 dark:bg-brand-950/80' : ''
                      }`}
                    >
                      <div className="flex items-center gap-2 overflow-hidden">
                        <span className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {p.product_name || p['اسم المنتج'] || 'بدون اسم'}
                        </span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          ({p.barcode || p['الباركود'] || '-'})
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-emerald-600 font-mono">
                          {p.price || p['السعر']} ر.س
                        </span>
                        <span className="text-[10px] text-brand-600 font-bold">اختيار ←</span>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* 📷 Live Camera Scanner Trigger Button */}
            <button
              type="button"
              onClick={isCameraScanning ? stopScanner : () => startScanner()}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold transition-all shadow-sm flex-shrink-0 ${
                isCameraScanning
                  ? 'bg-rose-500 hover:bg-rose-600 text-white animate-pulse'
                  : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
              }`}
              title="مسح باركود المنتج بواسطة كاميرا الجوال / الكمبيوتر"
            >
              <Camera className="w-4 h-4" />
              <span className="hidden xs:inline">
                {isCameraScanning ? 'إغلاق الكاميرا' : 'مسح بالكاميرا'}
              </span>
            </button>

            {/* 📸 Snapshot Native Camera Button (Ultra-reliable on all mobile browsers) */}
            <button
              type="button"
              onClick={() => photoCaptureRef.current?.click()}
              disabled={isProcessingImage}
              className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 border border-slate-300 dark:border-slate-700 text-xs font-bold shadow-sm transition-colors flex-shrink-0"
              title="التقاط صورة سريعة للباركود بكاميرا الجوال"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-500" />
              <span className="hidden sm:inline">تصوير سريع</span>
            </button>
          </div>

          {/* Navigation Between Products (< >) */}
          <div className="flex items-center gap-1.5 sm:gap-2">
            <button
              onClick={handlePrevious}
              disabled={currentIndex === 0}
              className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm flex items-center gap-1 text-xs font-bold"
              title="الصنف السابق"
            >
              <ChevronRight className="w-4 h-4" />
              <span className="hidden sm:inline">السابق</span>
            </button>

            <span className="text-xs font-mono font-bold text-slate-700 dark:text-slate-300 px-2.5 sm:px-3 py-1.5 rounded-xl bg-slate-200/70 dark:bg-slate-800 border border-slate-300/60 dark:border-slate-700 min-w-[75px] sm:min-w-[90px] text-center">
              {currentIndex + 1} / {products.length}
            </span>

            <button
              onClick={handleSaveAndNext}
              disabled={currentIndex >= products.length - 1}
              className="p-1.5 sm:p-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-30 disabled:pointer-events-none transition-all shadow-sm flex items-center gap-1 text-xs font-bold"
              title="الصنف التالي"
            >
              <span className="hidden sm:inline">التالي</span>
              <ChevronLeft className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* 📷 Live Camera Scanner Viewport Overlay */}
        <div
          className={`${
            isCameraScanning ? 'flex' : 'hidden'
          } p-3 sm:p-4 bg-slate-950 border-b border-slate-800 flex-col items-center justify-center animate-fadeIn relative`}
        >
          <div className="flex items-center justify-between w-full max-w-md mb-2">
            <span className="text-xs font-bold text-white flex items-center gap-1.5">
              <Camera className="w-4 h-4 text-emerald-400 animate-pulse" />
              وجّه الكاميرا نحو باركود الصنف للمسح التلقائي
            </span>
            <div className="flex items-center gap-2">
              {availableCameras.length > 1 && (
                <button
                  onClick={switchCamera}
                  className="p-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                  title="تبديل الكاميرا (أمامية / خلفية)"
                >
                  <SwitchCamera className="w-3.5 h-3.5" />
                  <span className="text-[10px]">تبديل</span>
                </button>
              )}
              <button
                onClick={stopScanner}
                className="text-xs text-rose-400 hover:text-rose-300 font-bold px-2 py-1 bg-rose-950/60 rounded-lg"
              >
                إغلاق ✖
              </button>
            </div>
          </div>

          {/* Video Target Element for html5-qrcode */}
          <div className="relative w-full max-w-md rounded-2xl overflow-hidden border-2 border-emerald-500 shadow-2xl bg-black flex items-center justify-center min-h-[200px]">
            <div id="mobile-barcode-reader" className="w-full" />
          </div>

          {/* Fallback Action Buttons under Camera */}
          <div className="flex items-center gap-2 mt-3">
            <button
              onClick={() => photoCaptureRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 shadow-sm"
            >
              <Camera className="w-3.5 h-3.5" />
              <span>📸 التقاط صورة فورية</span>
            </button>

            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5"
            >
              <ImageIcon className="w-3.5 h-3.5 text-blue-400" />
              <span>اختيار صورة باركود</span>
            </button>
          </div>

          {cameraError && (
            <div className="mt-2.5 p-2.5 bg-rose-950/80 border border-rose-800 text-xs text-rose-300 font-bold rounded-xl max-w-md text-center flex items-center gap-2">
              <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
              <span>{cameraError}</span>
            </div>
          )}
        </div>

        {/* Processing Image Indicator */}
        {isProcessingImage && (
          <div className="px-4 py-2 bg-brand-600 text-white text-xs font-bold flex items-center justify-center gap-2 shadow-md">
            <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            <span>جاري قراءة وتحليل الباركود من الصورة...</span>
          </div>
        )}

        {/* Main Editor Body */}
        <div className="flex-1 overflow-y-auto p-3 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6">
          
          {/* Right Column: The Dedicated Price Modifier Card (7 Cols on Desktop) */}
          <div className={`lg:col-span-7 space-y-3 sm:space-y-4 ${mobileTab === 'preview' ? 'hidden sm:block' : 'block'}`}>
            
            {/* Product Meta Header */}
            <div className="p-3.5 sm:p-4 rounded-2xl bg-slate-50 dark:bg-slate-950/60 border border-slate-200 dark:border-slate-800 flex items-start justify-between gap-3 shadow-sm">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] sm:text-xs font-bold border ${catInfo.badgeBg}`}>
                    <span>{catInfo.icon}</span>
                    <span>{currentProduct.category || catInfo.nameAr}</span>
                  </span>
                  {currentProduct.unit && (
                    <span className="text-[11px] text-slate-400 bg-slate-200/60 dark:bg-slate-800 px-2 py-0.5 rounded-md font-medium">
                      {currentProduct.unit}
                    </span>
                  )}
                </div>
                <h3 className="text-sm sm:text-lg font-black text-slate-900 dark:text-white truncate">
                  {currentProduct.product_name || currentProduct['اسم المنتج'] || 'بدون اسم'}
                </h3>
                <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
                  <span className="flex items-center gap-1">
                    <Barcode className="w-3.5 h-3.5 text-slate-500" />
                    {currentProduct.barcode || currentProduct['الباركود'] || 'لا يوجد باركود'}
                  </span>
                  {currentProduct.origin && (
                    <span>• 🇸🇦 {currentProduct.origin}</span>
                  )}
                </div>
              </div>

              {isSavedRecently && (
                <span className="px-2.5 py-1 rounded-xl bg-emerald-500 text-white text-[11px] sm:text-xs font-bold flex items-center gap-1 animate-bounce flex-shrink-0">
                  <Check className="w-3.5 h-3.5" />
                  تم الحفظ
                </span>
              )}
            </div>

            {/* The Price Controls Box */}
            <div className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-emerald-50/50 via-teal-50/30 to-transparent dark:from-slate-950 dark:to-slate-900 border-2 border-emerald-500/40 dark:border-emerald-500/30 space-y-3.5 sm:space-y-4 shadow-sm">
              
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-slate-800 dark:text-slate-200 uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign className="w-4 h-4 text-emerald-500" />
                  إعدادات السعر والتخفيض
                </span>
                {discountBadge && (
                  <span className="px-2.5 py-0.5 sm:px-3 sm:py-1 rounded-full bg-rose-600 text-white text-xs font-black animate-pulse shadow-sm">
                    خصم {discountBadge}
                  </span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3 sm:gap-4">
                {/* 1. Price Before (السعر قبل الخصم) */}
                <div className={`space-y-1 ${!includeOldPrice ? 'opacity-50 transition-opacity' : ''}`}>
                  <div className="flex items-center justify-between gap-1">
                    <label className="text-[11px] sm:text-xs font-bold text-slate-500 dark:text-slate-400 flex items-center gap-1">
                      <span>🏷️ السعر قبل (السابق):</span>
                    </label>
                    {oldPrice.trim() !== '' && (
                      <button
                        type="button"
                        onClick={() => handlePriceUpdate(currentPrice, '', printQuantity)}
                        className="text-[10px] sm:text-[11px] font-bold text-rose-500 hover:underline"
                        title="إزالة السعر قبل الخصم لهذا الصنف"
                      >
                        مسح
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="اختياري"
                      value={oldPrice}
                      onChange={(e) => handlePriceUpdate(currentPrice, e.target.value, printQuantity)}
                      className="w-full bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl sm:rounded-2xl px-2.5 py-2.5 sm:py-3 text-sm sm:text-base text-slate-500 dark:text-slate-400 line-through font-mono font-bold text-center focus:border-brand-500 focus:outline-none shadow-sm"
                    />
                    <span className="text-[10px] sm:text-[11px] text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 font-bold pointer-events-none">
                      ر.س
                    </span>
                  </div>
                </div>

                {/* 2. Price After (السعر بعد الخصم) */}
                <div className="space-y-1">
                  <label className="text-[11px] sm:text-xs font-bold text-emerald-600 dark:text-emerald-400 block flex items-center gap-1">
                    <span>💵 السعر بعد (الحالي):</span>
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      inputMode="decimal"
                      placeholder="29.95"
                      required
                      value={currentPrice}
                      onChange={(e) => handlePriceUpdate(e.target.value, oldPrice, printQuantity)}
                      className="w-full bg-white dark:bg-slate-900 border-2 border-emerald-500 dark:border-emerald-600 rounded-xl sm:rounded-2xl px-2.5 py-2.5 sm:py-3 text-lg sm:text-xl text-emerald-600 dark:text-emerald-400 font-mono font-black text-center focus:outline-none shadow-md shadow-emerald-500/10"
                    />
                    <span className="text-[10px] sm:text-[11px] text-emerald-600 font-bold absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none">
                      ر.س
                    </span>
                  </div>
                </div>
              </div>

              {/* Quick Discount Shortcuts */}
              <div className="space-y-1.5 pt-1">
                <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 block">
                  تطبيق نسبة خصم سريعة:
                </span>
                <div className="grid grid-cols-5 gap-1 sm:gap-1.5">
                  {[10, 20, 25, 30, 50].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => applyQuickDiscount(pct)}
                      className="py-1.5 rounded-xl bg-white dark:bg-slate-900 hover:bg-emerald-500 hover:text-white border border-slate-200 dark:border-slate-700 hover:border-emerald-500 text-slate-700 dark:text-slate-300 text-xs font-mono font-bold transition-all shadow-sm"
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>
              </div>

              {/* Optional Old Price Print Toggle */}
              <label className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between gap-2 cursor-pointer select-none">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  طباعة السعر قبل الخصم على الملصق:
                </span>
                <span className="flex items-center gap-2">
                  <span className={`text-[11px] font-bold ${includeOldPrice ? 'text-emerald-600 dark:text-emerald-400' : 'text-slate-400'}`}>
                    {includeOldPrice ? 'مفعّل' : 'مخفي'}
                  </span>
                  <input
                    type="checkbox"
                    checked={includeOldPrice}
                    onChange={(e) => handleToggleOldPrice(e.target.checked)}
                    className="w-4 h-4 rounded border-slate-300 dark:border-slate-700 text-emerald-600 focus:ring-0 cursor-pointer"
                  />
                </span>
              </label>

              {/* Print Quantity Controls */}
              <div className="pt-2.5 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
                  عدد ملصقات الطباعة:
                </span>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handlePriceUpdate(currentPrice, oldPrice, Math.max(1, printQuantity - 1))}
                    className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    -
                  </button>
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={printQuantity}
                    onChange={(e) =>
                      handlePriceUpdate(currentPrice, oldPrice, Math.max(1, parseInt(e.target.value, 10) || 1))
                    }
                    className="w-14 bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 rounded-xl py-1 text-center font-bold text-sm text-slate-900 dark:text-white font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => handlePriceUpdate(currentPrice, oldPrice, printQuantity + 1)}
                    className="w-8 h-8 rounded-xl bg-white dark:bg-slate-900 border border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-300 font-bold text-sm hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                  >
                    +
                  </button>
                </div>
              </div>
            </div>

            {/* Quick Action Navigation Buttons */}
            <div className="flex items-center justify-between gap-2 sm:gap-3 pt-1">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="flex-1 sm:flex-initial px-3 sm:px-4 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold disabled:opacity-30 transition-all flex items-center justify-center gap-1"
              >
                <ArrowRight className="w-4 h-4" />
                <span>السابق</span>
              </button>

              <button
                type="button"
                onClick={handleSaveAndNext}
                disabled={currentIndex >= products.length - 1}
                className="flex-[2] sm:flex-initial px-4 sm:px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow-md shadow-emerald-600/30 disabled:opacity-30 transition-all flex items-center justify-center gap-1.5"
              >
                <span>حفظ والتالي</span>
                <ArrowLeft className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Left Column: Real-Time Live Sticker Preview (5 Cols on Desktop) */}
          <div className={`lg:col-span-5 flex flex-col items-center justify-center p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-slate-100 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 relative overflow-hidden ${mobileTab === 'editor' ? 'hidden sm:flex' : 'flex'}`}>
            <div className="text-center mb-3">
              <span className="text-xs font-bold text-slate-700 dark:text-slate-300 flex items-center justify-center gap-1">
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                معاينة مباشرة لشكل الاستيكر المطبوع
              </span>
              <span className="text-[10px] text-slate-400">
                القالب: {template.name} ({template.widthMm} × {template.heightMm} مم)
              </span>
            </div>

            {/* Sticker Visual Canvas Mockup */}
            <div className="relative p-2 bg-slate-200/50 dark:bg-slate-900/80 rounded-2xl border border-slate-300 dark:border-slate-800 shadow-inner flex items-center justify-center max-w-full overflow-hidden">
              <div
                style={{
                  width: `${canvasWidthPx}px`,
                  height: `${canvasHeightPx}px`,
                  backgroundColor: template.backgroundColor || '#ffffff',
                  borderRadius: `${template.borderRadius ? mmToPx(template.borderRadius, SCREEN_DPI) : 0}px`,
                  border: template.borderWidth
                    ? `${mmToPx(template.borderWidth, SCREEN_DPI)}px solid ${template.borderColor || '#000000'}`
                    : '1px solid #cbd5e1',
                  transform: 'scale(1.1)',
                  transformOrigin: 'center center',
                }}
                className="relative overflow-hidden shadow-xl"
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
                    }}
                  />
                )}

                {/* Elements on Canvas */}
                {previewTemplate.elements
                  .filter((el) => shouldRenderTagElement(el, previewTemplate, currentProduct, mappings))
                  .sort((a, b) => (a.zIndex || 0) - (b.zIndex || 0))
                  .map((el) => {
                    const leftPx = mmToPx(el.left, SCREEN_DPI);
                    const topPx = mmToPx(el.top, SCREEN_DPI);
                    const widthPx = mmToPx(el.width, SCREEN_DPI);
                    const heightPx = mmToPx(el.height, SCREEN_DPI);

                    return (
                      <div
                        key={el.id}
                        style={{
                          position: 'absolute',
                          left: `${leftPx}px`,
                          top: `${topPx}px`,
                          width: `${widthPx}px`,
                          height: `${heightPx}px`,
                          zIndex: el.zIndex || 1,
                          opacity: el.opacity ?? 1,
                          transform: el.rotation ? `rotate(${el.rotation}deg)` : undefined,
                        }}
                        className="select-none pointer-events-none"
                      >
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
                            {resolveElementText(el, currentProduct, mappings)}
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
                                }}
                              />
                            ) : (
                              <div className="text-[9px] text-slate-400 font-bold">🖼️ شعار</div>
                            )}
                          </div>
                        ) : null}
                      </div>
                    );
                  })}
              </div>
            </div>

            <div className="mt-3 text-center">
              <span className="text-[11px] text-slate-500 dark:text-slate-400 font-medium">
                🎯 ستتم طباعة <strong className="text-emerald-600 font-bold">{printQuantity}</strong> ملصق لهذا الصنف
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
