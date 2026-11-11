import React, { useState, useEffect } from 'react';
import { X, Smartphone, QrCode, Copy, Check, Sparkles, Globe, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';

interface MobileConnectModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const MobileConnectModal: React.FC<MobileConnectModalProps> = ({ isOpen, onClose }) => {
  const [qrDataUrl, setQrDataUrl] = useState<string>('');
  const [copied, setCopied] = useState<boolean>(false);

  // Direct Zero-Password HTTPS URL (Pinggy Tunnel)
  const mobileDirectUrl = 'https://esqjs-2a02-9b0-42-b5-3c81-a970-e62c-cc1f.free.pinggy.net';

  useEffect(() => {
    if (isOpen) {
      QRCode.toDataURL(mobileDirectUrl, {
        width: 280,
        margin: 1.5,
        color: {
          dark: '#0f172a',
          light: '#ffffff',
        },
      })
        .then((url) => setQrDataUrl(url))
        .catch((err) => console.error(err));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(mobileDirectUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl w-full max-w-md p-6 shadow-2xl overflow-hidden text-center relative space-y-4">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute left-4 top-4 p-2 rounded-xl text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header Icon */}
        <div className="w-14 h-14 rounded-3xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center mx-auto shadow-inner">
          <Smartphone className="w-7 h-7" />
        </div>

        <div>
          <h3 className="text-lg font-black text-slate-900 dark:text-white flex items-center justify-center gap-1.5">
            <span>افتح التطبيق مباشرة على جوالك</span>
            <Sparkles className="w-4 h-4 text-amber-500" />
          </h3>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            بدون كلمات سر وبدون تعقيد - يفتح فوراً وتعمل معه الكاميرا
          </p>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 inline-block shadow-sm">
          {qrDataUrl ? (
            <img
              src={qrDataUrl}
              alt="Mobile Connect QR Code"
              className="w-52 h-52 object-contain rounded-xl border border-white shadow-md mx-auto"
            />
          ) : (
            <div className="w-52 h-52 flex items-center justify-center text-xs text-slate-400">
              جاري تجهيز رمز QR...
            </div>
          )}
        </div>

        {/* Direct Link + Copy Button */}
        <div className="p-3 bg-slate-100 dark:bg-slate-800/60 rounded-2xl border border-slate-200 dark:border-slate-700 flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 overflow-hidden text-left dir-ltr">
            <span className="text-xs font-mono font-bold text-slate-800 dark:text-slate-200 select-all truncate">
              {mobileDirectUrl}
            </span>
          </div>
          <button
            onClick={handleCopy}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 flex-shrink-0 ${
              copied
                ? 'bg-emerald-600 text-white'
                : 'bg-white dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 border border-slate-200 dark:border-slate-600'
            }`}
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'تم النسخ' : 'نسخ الرابط'}</span>
          </button>
        </div>

        {/* Helpful Tip */}
        <div className="p-3 bg-emerald-50 dark:bg-emerald-950/30 border border-emerald-200 dark:border-emerald-900/50 rounded-xl text-right">
          <p className="text-xs text-emerald-900 dark:text-emerald-300 font-medium leading-relaxed">
            ✅ <strong>رابط فوري مباشر:</strong> بمجرد مسح رمز QR أو فتح الرابط سيفتح التطبيق مباشرة على جوالك بدون أي خطوات إضافية!
          </p>
        </div>
      </div>
    </div>
  );
};
