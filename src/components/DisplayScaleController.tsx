import React, { useState, useRef, useEffect } from "react";
import {
  ZoomIn,
  ZoomOut,
  SlidersHorizontal,
  Maximize2,
  Minimize2,
  RotateCcw,
  Monitor,
  Check,
  X,
  Type,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

interface DisplayScaleControllerProps {
  scale: number;
  effectiveScale: number;
  onScaleChange: (newScale: number) => void;
  autoFit: boolean;
  onAutoFitChange: (enabled: boolean) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onResetScale: () => void;
}

const PRESET_SCALES = [
  { value: 85, label: "Rất gọn" },
  { value: 95, label: "Gọn" },
  { value: 100, label: "Chuẩn" },
  { value: 110, label: "Lớn vừa" },
  { value: 120, label: "Lớn" },
  { value: 135, label: "Rất lớn" },
];

export default function DisplayScaleController({
  scale,
  effectiveScale,
  onScaleChange,
  autoFit,
  onAutoFitChange,
  isFullscreen,
  onToggleFullscreen,
  onResetScale,
}: DisplayScaleControllerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    }
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, [isOpen]);

  const handleStepDown = () => {
    const next = Math.max(80, scale - 5);
    onScaleChange(next);
  };

  const handleStepUp = () => {
    const next = Math.min(145, scale + 5);
    onScaleChange(next);
  };

  return (
    <div ref={containerRef} className="relative inline-flex items-center gap-1.5">
      {/* Fullscreen Button */}
      <button
        type="button"
        onClick={onToggleFullscreen}
        className={`h-9 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 rounded-xl border transition-all cursor-pointer shadow-2xs shrink-0 ${
          isFullscreen
            ? "bg-emerald-600 text-white border-emerald-700 hover:bg-emerald-700 shadow-emerald-500/20"
            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50 hover:text-emerald-700"
        }`}
        title={isFullscreen ? "Thoát toàn màn hình (Esc hoặc F11)" : "Bật chế độ toàn màn hình (Full Screen F11)"}
      >
        {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
        <span className="hidden md:inline">
          {isFullscreen ? "Thu nhỏ" : "Toàn màn hình"}
        </span>
      </button>

      {/* Quick Stepper Group */}
      <div className="h-9 inline-flex items-center bg-white border border-slate-200 rounded-xl shadow-2xs overflow-hidden shrink-0">
        {/* Zoom Out Button */}
        <button
          type="button"
          onClick={handleStepDown}
          disabled={scale <= 80}
          className="h-full px-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer flex items-center justify-center"
          title="Thu nhỏ cỡ chữ & giao diện (-5%)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>

        {/* Current Scale Badge / Trigger Button */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className={`h-full px-2.5 text-xs font-mono font-bold flex items-center gap-1 hover:bg-emerald-50 hover:text-emerald-800 transition-colors cursor-pointer border-x border-slate-100 ${
            isOpen ? "bg-emerald-50 text-emerald-800" : "text-slate-800"
          }`}
          title="Nhấn để mở bảng tùy chỉnh kích thước chi tiết"
        >
          <Type className="w-3 h-3 text-emerald-600 shrink-0" />
          <span>{effectiveScale}%</span>
          <SlidersHorizontal className="w-2.5 h-2.5 text-slate-400" />
        </button>

        {/* Zoom In Button */}
        <button
          type="button"
          onClick={handleStepUp}
          disabled={scale >= 145}
          className="h-full px-2 text-slate-600 hover:text-emerald-700 hover:bg-slate-50 disabled:opacity-40 disabled:hover:bg-white transition-colors cursor-pointer flex items-center justify-center"
          title="Phóng to cỡ chữ & giao diện (+5%)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Popover Settings Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.98 }}
            transition={{ duration: 0.15 }}
            className="absolute right-0 top-full mt-2 w-80 sm:w-96 bg-white rounded-2xl shadow-xl border border-slate-200 p-4 z-50 text-slate-800"
          >
            {/* Header */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="p-1.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200/60">
                  <SlidersHorizontal className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs sm:text-sm font-black text-slate-900 uppercase tracking-wide">
                    Tùy Chỉnh Kích Thước & Chữ
                  </h4>
                  <p className="text-[11px] text-slate-500">
                    Phóng to hoặc thu nhỏ giao diện & bảng dữ liệu
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Slider Control */}
            <div className="py-3.5 space-y-2">
              <div className="flex items-center justify-between text-xs font-bold">
                <span className="text-slate-600">Độ phóng to hiện tại:</span>
                <span className="px-2.5 py-0.5 bg-emerald-100 text-emerald-900 rounded-full font-mono text-xs">
                  {scale}% {autoFit && scale !== effectiveScale && `(Tự động: ${effectiveScale}%)`}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="text-[11px] text-slate-400 font-mono font-bold">80%</span>
                <input
                  type="range"
                  min={80}
                  max={145}
                  step={5}
                  value={scale}
                  onChange={(e) => onScaleChange(Number(e.target.value))}
                  className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-emerald-600"
                />
                <span className="text-[11px] text-slate-400 font-mono font-bold">145%</span>
              </div>
            </div>

            {/* Presets Grid */}
            <div className="space-y-1.5 pb-3">
              <label className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block">
                Mức chọn nhanh:
              </label>
              <div className="grid grid-cols-3 gap-1.5">
                {PRESET_SCALES.map((p) => {
                  const isCurrent = scale === p.value;
                  return (
                    <button
                      key={p.value}
                      type="button"
                      onClick={() => onScaleChange(p.value)}
                      className={`px-2 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 border ${
                        isCurrent
                          ? "bg-emerald-600 text-white border-emerald-700 shadow-2xs"
                          : "bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-200"
                      }`}
                    >
                      {isCurrent && <Check className="w-3 h-3 text-white" />}
                      <span>{p.value}%</span>
                      <span className="text-[10px] opacity-75 font-normal">({p.label})</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Auto-Fit Screen Toggle */}
            <div className="p-2.5 bg-slate-50 rounded-xl border border-slate-200/80 mb-3">
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoFit}
                  onChange={(e) => onAutoFitChange(e.target.checked)}
                  className="mt-0.5 rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
                />
                <div>
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1">
                    <Monitor className="w-3.5 h-3.5 text-emerald-600" />
                    Tự động chỉnh tỷ lệ theo độ rộng màn hình
                  </span>
                  <p className="text-[10.5px] text-slate-500 mt-0.5 leading-relaxed">
                    Tự động tăng tỷ lệ chữ và bảng khi mở toàn màn hình hoặc trên màn hình máy tính lớn (Full HD, 2K, 4K) giúp dễ đọc mà không bị nhỏ.
                  </p>
                </div>
              </label>
            </div>

            {/* Sample Live Preview Box */}
            <div className="p-2.5 bg-slate-100/70 rounded-xl border border-slate-200 text-xs text-slate-700 mb-3 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase">Xem thử kích thước thực tế:</div>
              <div className="font-semibold text-slate-900 flex items-center gap-2">
                <span className="px-1.5 py-0.5 bg-emerald-100 text-emerald-900 font-mono font-bold rounded text-[11px]">
                  Phiếu #108
                </span>
                <span>Khách hàng: <strong>CTY AN NAM PHÁT</strong></span>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Xe: 60C-51100 • Ngày giao: 22/09/2026
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex items-center justify-between pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={onResetScale}
                className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
                title="Khôi phục về cỡ chữ tiêu chuẩn 100%"
              >
                <RotateCcw className="w-3 h-3" />
                Đặt lại chuẩn (100%)
              </button>

              <button
                type="button"
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              >
                Hoàn tất
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
