import React from 'react';
import { X, Maximize2, Tag, Check } from 'lucide-react';
import { TagTemplate, PresetSize } from '../types';
import { PRESET_SIZES } from '../data/presetSizes';

interface PresetSizesModalProps {
  isOpen: boolean;
  onClose: () => void;
  template: TagTemplate;
  onSelectSize: (widthMm: number, heightMm: number) => void;
}

export const PresetSizesModal: React.FC<PresetSizesModalProps> = ({
  isOpen,
  onClose,
  template,
  onSelectSize,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
      <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl w-full max-w-2xl max-h-[85vh] flex flex-col shadow-2xl overflow-hidden transition-colors">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-600 dark:text-brand-400">
              <Maximize2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900 dark:text-white">اختر مقاس البطاقة القياسي</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">مقاسات دقيقة بالمليمتر متوافقة مع حاملات الرفوف والطابعات</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Sizes List */}
        <div className="flex-1 overflow-y-auto p-6 space-y-2.5">
          {PRESET_SIZES.map((size, idx) => {
            const isCurrent = template.widthMm === size.widthMm && template.heightMm === size.heightMm;

            return (
              <div
                key={idx}
                onClick={() => {
                  onSelectSize(size.widthMm, size.heightMm);
                  onClose();
                }}
                className={`flex items-center justify-between p-3.5 rounded-xl border transition-all cursor-pointer ${
                  isCurrent
                    ? 'bg-brand-50 dark:bg-brand-950/60 border-brand-500 text-brand-950 dark:text-white shadow-sm'
                    : 'bg-slate-50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800/40 hover:border-slate-300 dark:hover:border-slate-700'
                }`}
              >
                <div>
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-xs font-bold text-slate-900 dark:text-white">{size.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-400">
                      {size.category}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">{size.description}</p>
                </div>

                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-bold text-brand-600 dark:text-brand-400 bg-brand-50 dark:bg-brand-950/60 px-2.5 py-1 rounded-lg border border-brand-200 dark:border-brand-800/50">
                    {size.widthMm} × {size.heightMm} مم
                  </span>
                  {isCurrent && <Check className="w-4 h-4 text-brand-600 dark:text-brand-400" />}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
