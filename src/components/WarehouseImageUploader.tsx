import React, { useRef, useState, DragEvent, useEffect } from "react";
import {
  Upload,
  FileImage,
  Image as ImageIcon,
  Sparkles,
  Check,
  AlertCircle,
  Trash2,
  Plus,
  X,
  Clipboard,
  Layers,
  Eye,
  RotateCcw,
  RefreshCw,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImagePage } from "../types";

interface WarehouseImageUploaderProps {
  pages: ImagePage[];
  onAddImages: (files: File[]) => void;
  isLoading: boolean;
  uploadStatus?: {
    current: number;
    total: number;
    fileName?: string;
    stepText?: string;
  } | null;
  onClearPage: (pageId: string) => void;
  onClearAll: () => void;
  onScanAll: () => void;
  onPreviewPage?: (pageId: string) => void;
  activePreviewPageId?: string | null;
}

export default function WarehouseImageUploader({
  pages,
  onAddImages,
  isLoading,
  uploadStatus,
  onClearPage,
  onClearAll,
  onScanAll,
  onPreviewPage,
  activePreviewPageId,
}: WarehouseImageUploaderProps) {
  const [isDragOver, setIsDragOver] = useState(false);
  // Mặc định khi mở ứng dụng là thu gọn để giao diện gọn gàng
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("warehouse_uploader_collapsed");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("warehouse_uploader_collapsed", String(isCollapsed));
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Global paste handler - Tải dữ liệu lên trực tiếp, không cần hiện thông báo xác nhận
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      const files = e.clipboardData?.files;
      if (files && files.length > 0) {
        const imageFiles = Array.from(files).filter((file) => file.type.startsWith("image/"));
        if (imageFiles.length > 0) {
          e.preventDefault();
          setIsCollapsed(false);
          onAddImages(imageFiles);
          return;
        }
      }

      const items = e.clipboardData?.items;
      if (items) {
        const imageItems: File[] = [];
        for (let i = 0; i < items.length; i++) {
          if (items[i].type.startsWith("image/")) {
            const blob = items[i].getAsFile();
            if (blob) {
              const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
              const file = new File([blob], `anh-kho-paste-${timestamp}.png`, { type: items[i].type });
              imageItems.push(file);
            }
          }
        }
        if (imageItems.length > 0) {
          e.preventDefault();
          setIsCollapsed(false);
          onAddImages(imageItems);
        }
      }
    };
    window.addEventListener("paste", handlePaste);
    return () => window.removeEventListener("paste", handlePaste);
  }, [onAddImages]);

  const handleReadClipboard = async () => {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageTypes = item.types.filter((type) => type.startsWith("image/"));
        if (imageTypes.length > 0) {
          const blob = await item.getType(imageTypes[0]);
          const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
          const file = new File([blob], `anh-kho-${timestamp}.png`, { type: imageTypes[0] });
          setIsCollapsed(false);
          onAddImages([file]);
          return;
        }
      }
      alert("Không tìm thấy hình ảnh nào trong Bộ nhớ tạm. Vui lòng copy hình ảnh hoặc chụp màn hình trước!");
    } catch {
      alert("Nhấp chuột vào trang web rồi ấn tổ hợp phím Ctrl + V (hoặc Cmd + V trên macOS) để dán trực tiếp ảnh!");
    }
  };

  const handleFiles = (files: FileList | File[]) => {
    setErrorMsg(null);
    const validImages = Array.from(files).filter((file) => file.type.startsWith("image/"));
    if (validImages.length === 0) {
      setErrorMsg("Vui lòng chỉ chọn hoặc kéo thả tệp hình ảnh (PNG, JPG, JPEG, WEBP).");
      return;
    }
    setIsCollapsed(false);
    onAddImages(validImages);
  };

  const onDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const onDragLeave = () => {
    setIsDragOver(false);
  };

  const onDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFiles(e.dataTransfer.files);
    }
  };

  const totalScanned = pages.reduce((acc, p) => acc + p.numbers.length, 0);
  const unscannedCount = pages.filter((p) => p.numbers.length === 0).length;

  return (
    <div className={`bg-white rounded-2xl border border-gray-200/90 shadow-xs font-sans mb-6 transition-all ${isCollapsed ? "p-3.5 sm:p-4" : "p-4 sm:p-5"}`}>
      {/* Header */}
      <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${isCollapsed ? "pb-0 mb-0 border-b-0" : "pb-3 border-b border-gray-100 mb-4"}`}>
        <div className="flex items-center gap-2.5">
          <div className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h2 id="upload-delivery-data-heading" className="text-base font-bold text-gray-900 flex items-center gap-2">
              Tải Dữ Liệu Giao Nhận
              <span className="text-xs px-2.5 py-0.5 font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/60 rounded-full font-mono">
                {pages.length} trang ảnh
              </span>
            </h2>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {!isCollapsed && pages.length > 0 && (
            <>
              <button
                type="button"
                onClick={onScanAll}
                disabled={isLoading}
                className={`inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 rounded-xl transition-all shadow-xs cursor-pointer ${
                  isLoading
                    ? "bg-emerald-100 text-emerald-400 cursor-not-allowed"
                    : "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95"
                }`}
                title="Dùng AI quét lại toàn bộ số phiếu trên các trang ảnh"
              >
                <Sparkles className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`} />
                {isLoading ? "Đang quét OCR..." : "Quét nhận diện OCR"}
              </button>

              <button
                type="button"
                onClick={onClearAll}
                disabled={isLoading}
                className="inline-flex items-center gap-1 text-xs font-medium px-2.5 py-2 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-xl transition-colors cursor-pointer"
                title="Xóa tất cả các trang ảnh đã tải"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Xóa tất cả
              </button>
            </>
          )}

          {/* Nút Thu gọn / Mở rộng */}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
            title={isCollapsed ? "Mở rộng khu vực tải dữ liệu giao nhận" : "Thu gọn khu vực tải dữ liệu giao nhận"}
          >
            {isCollapsed ? (
              <>
                <ChevronDown className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Mở rộng ↓</span>
              </>
            ) : (
              <>
                <ChevronUp className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span>Thu gọn ↑</span>
              </>
            )}
          </button>
        </div>
      </div>

      <AnimatePresence initial={false}>
        {!isCollapsed && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="overflow-hidden"
          >

      {/* On-screen Uploading Notification Banner */}
      {isLoading && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-4 p-4 bg-linear-to-r from-emerald-50 via-teal-50 to-emerald-50 border-2 border-emerald-500/80 rounded-2xl text-emerald-950 shadow-md ring-2 ring-emerald-500/20"
        >
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-xs">
                <RefreshCw className="w-5 h-5 animate-spin" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wider">
                    {uploadStatus?.stepText || "Hệ thống đang tải ảnh lên & nhận diện số phiếu kho..."}
                  </h4>
                  {uploadStatus && uploadStatus.total > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-emerald-600 text-white text-[10px] font-bold">
                      {uploadStatus.current}/{uploadStatus.total}
                    </span>
                  )}
                </div>
                <p className="text-xs text-emerald-800 font-medium mt-0.5">
                  {uploadStatus?.fileName
                    ? `Đang đọc file: ${uploadStatus.fileName}. Hệ thống AI đang trích xuất số phiếu kho (1 - 1500).`
                    : "Đang tải ảnh và quét OCR tự động bằng AI, vui lòng chờ trong giây lát..."}
                </p>
              </div>
            </div>

            {uploadStatus && uploadStatus.total > 0 && (
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
                <div className="w-24 bg-emerald-200 rounded-full h-2.5 overflow-hidden">
                  <div
                    className="bg-emerald-600 h-2.5 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(15, Math.round((uploadStatus.current / uploadStatus.total) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-mono font-bold text-emerald-800">
                  {Math.round((uploadStatus.current / uploadStatus.total) * 100)}%
                </span>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Error message */}
      {errorMsg && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-500" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Upload Zone & Pages Grid */}
      <div className="space-y-4">
        {/* Drag & Drop Box */}
        <div
          onDragOver={onDragOver}
          onDragLeave={onDragLeave}
          onDrop={onDrop}
          onClick={() => {
            if (!isLoading) fileInputRef.current?.click();
          }}
          className={`border-2 border-dashed rounded-2xl p-6 sm:p-8 text-center transition-all ${
            isLoading
              ? "border-emerald-500 bg-emerald-50/70 cursor-wait"
              : isDragOver
              ? "border-emerald-500 bg-emerald-50/50 scale-[1.005] cursor-pointer"
              : "border-gray-200 hover:border-emerald-400 hover:bg-slate-50/70 bg-slate-50/30 cursor-pointer"
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            multiple
            disabled={isLoading}
            className="hidden"
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleFiles(e.target.files);
                e.target.value = "";
              }
            }}
          />

          {isLoading ? (
            <div className="max-w-md mx-auto flex flex-col items-center py-2">
              <div className="w-14 h-14 rounded-2xl bg-emerald-100 border border-emerald-300 flex items-center justify-center text-emerald-700 mb-3 shadow-xs animate-bounce">
                <RefreshCw className="w-7 h-7 animate-spin" />
              </div>

              <p className="text-sm sm:text-base font-black text-emerald-950 uppercase tracking-wide mb-1">
                Đang tải ảnh lên hệ thống & quét số phiếu kho
              </p>

              <p className="text-xs text-emerald-800 font-medium">
                {uploadStatus?.stepText || "Hệ thống đang tải dữ liệu ảnh và quét nhận diện AI tự động..."}
              </p>

              <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 bg-white rounded-full border border-emerald-200 text-[11px] font-bold text-emerald-800 shadow-2xs">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                Vui lòng không tắt trình duyệt trong lúc tải ảnh
              </div>
            </div>
          ) : (
            <div className="max-w-md mx-auto flex flex-col items-center">
              <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200/60 flex items-center justify-center text-emerald-600 mb-3 shadow-xs">
                <Upload className="w-6 h-6" />
              </div>

              <p className="text-sm font-bold text-gray-800 mb-1">
                Kéo thả ảnh sổ giao hàng kho vào đây, hoặc{" "}
                <span className="text-emerald-600 underline underline-offset-2">chọn từ thiết bị</span>
              </p>

              <p className="text-xs text-gray-400 mb-3">
                Hỗ trợ tải nhiều ảnh một lúc (Trang 1, Trang 2...). Hệ thống tự cập nhật ngày theo ngày chụp/sửa của ảnh.
              </p>

              <div className="flex flex-wrap items-center justify-center gap-2" onClick={(e) => e.stopPropagation()}>
                <button
                  type="button"
                  onClick={handleReadClipboard}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-white border border-gray-200 hover:border-emerald-400 hover:text-emerald-700 text-gray-600 rounded-lg shadow-2xs transition-colors cursor-pointer"
                >
                  <Clipboard className="w-3.5 h-3.5" />
                  Dán ảnh từ bộ nhớ tạm (Ctrl + V)
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Thumbnail Preview of Uploaded Pages */}
        {pages.length > 0 && (
          <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-bold text-gray-700 uppercase tracking-wide">
                Các trang chứng từ đã tải ({pages.length})
              </span>
              <span className="text-xs text-gray-500">
                Đã nhận diện: <strong className="text-emerald-600">{totalScanned}</strong> số phiếu
                {unscannedCount > 0 && (
                  <span className="text-amber-600 ml-1">({unscannedCount} trang chưa quét)</span>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3">
              {pages.map((page, idx) => {
                const isSelected = activePreviewPageId === page.id;
                return (
                  <div
                    key={page.id}
                    onClick={() => onPreviewPage && onPreviewPage(page.id)}
                    className={`group relative rounded-xl border overflow-hidden bg-white transition-all cursor-pointer ${
                      isSelected
                        ? "border-emerald-500 ring-2 ring-emerald-500/20 shadow-sm"
                        : "border-gray-200 hover:border-gray-300 shadow-2xs"
                    }`}
                  >
                    {/* Thumbnail Image */}
                    <div className="aspect-3/4 w-full bg-slate-100 relative overflow-hidden flex items-center justify-center">
                      {page.preview ? (
                        <img
                          src={page.preview}
                          alt={page.fileName}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <ImageIcon className="w-8 h-8 text-gray-300" />
                      )}

                      {/* Top Overlay Badge */}
                      <div className="absolute top-1.5 left-1.5 px-2 py-0.5 bg-slate-900/70 backdrop-blur-xs text-white text-[10px] font-bold rounded-md">
                        Trang {idx + 1}
                      </div>

                      {/* Delete Button */}
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onClearPage(page.id);
                        }}
                        className="absolute top-1.5 right-1.5 p-1 bg-red-600/80 hover:bg-red-600 text-white rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                        title="Xóa trang này"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>

                      {/* Bottom numbers count */}
                      <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/75 to-transparent p-1.5 text-center">
                        <span className="text-[11px] font-bold text-white">
                          {page.numbers.length > 0 ? `${page.numbers.length} số phiếu` : "Chưa có số"}
                        </span>
                      </div>
                    </div>

                    {/* Page filename */}
                    <div className="p-1.5 text-center bg-white">
                      <p className="text-[10px] text-gray-600 truncate" title={page.fileName}>
                        {page.fileName}
                      </p>
                    </div>
                  </div>
                );
              })}

              {/* Add more button tile */}
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="aspect-3/4 rounded-xl border-2 border-dashed border-gray-200 hover:border-emerald-400 hover:bg-emerald-50/40 transition-colors flex flex-col items-center justify-center text-gray-400 hover:text-emerald-700 p-2 cursor-pointer"
              >
                <Plus className="w-6 h-6 mb-1 text-emerald-600" />
                <span className="text-[11px] font-bold">Thêm trang</span>
              </button>
            </div>
          </div>
        )}
      </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
