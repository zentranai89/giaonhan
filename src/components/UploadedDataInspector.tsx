import React, { useState, useMemo, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Copy,
  Download,
  Share2,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  EyeOff,
  Sparkles,
  ChevronLeft,
  ChevronRight,
  MousePointerClick,
  Target,
  Loader2,
  ExternalLink,
  MessageSquare,
  Scan,
  X,
} from "lucide-react";
import { ImagePage, DeliveryOrder } from "../types";
import { formatDateDDMMYYYY, getLocalTodayISO } from "../utils/dateUtils";

interface UploadedDataInspectorProps {
  pages: ImagePage[];
  manualNumbers: number[];
  allNumbers: number[];
  onRemoveNumber: (num: number) => void;
  onAddNumberToPage?: (pageId: string, num: number, box?: number[]) => void;
  activePreviewPageId: string | null;
  setActivePreviewPageId: (pageId: string) => void;
  driverName?: string;
  customerName?: string;
  vehicleNumber?: string;
  area?: string;
  recordDate?: string;
}

export default function UploadedDataInspector({
  pages,
  manualNumbers,
  allNumbers,
  onRemoveNumber,
  onAddNumberToPage,
  activePreviewPageId,
  setActivePreviewPageId,
  driverName = "",
  customerName = "",
  vehicleNumber = "",
  area = "",
  recordDate = "",
}: UploadedDataInspectorProps) {
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareFormat, setShareFormat] = useState<"comma" | "numbered" | "detailed">("detailed");
  const [shareCopied, setShareCopied] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [showOverlays, setShowOverlays] = useState(true);
  const [overlayMode, setOverlayMode] = useState<"subtle" | "hover-only" | "corners">("subtle");
  const [hoveredNumber, setHoveredNumber] = useState<number | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  // Click-to-detect state
  interface SpotScanState {
    pageId: string;
    clickRelX: number;
    clickRelY: number;
    cropBase64: string;
    status: "scanning" | "detected" | "not_found" | "error";
    detectedNum: number | null;
    manualInputVal: string;
    mappedBox: number[];
    errorMessage?: string;
  }
  const [isClickDetectMode, setIsClickDetectMode] = useState(true);
  const [spotScan, setSpotScan] = useState<SpotScanState | null>(null);
  const imgContainerRef = useRef<HTMLDivElement>(null);

  // Close spot scan on Escape
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && spotScan) {
        setSpotScan(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [spotScan]);

  const activePage = useMemo(() => {
    return pages.find((p) => p.id === activePreviewPageId) || pages[0] || null;
  }, [pages, activePreviewPageId]);

  // AI scanned set
  const aiScannedSet = useMemo(() => {
    const s = new Set<number>();
    pages.forEach((p) => p.numbers.forEach((n) => s.add(n)));
    return s;
  }, [pages]);

  // Duplicate numbers
  const duplicateNumbers = useMemo(() => {
    const counts = new Map<number, number>();
    pages.forEach((p) => {
      p.numbers.forEach((n) => counts.set(n, (counts.get(n) || 0) + 1));
    });
    manualNumbers.forEach((n) => counts.set(n, (counts.get(n) || 0) + 1));
    const dups = new Set<number>();
    counts.forEach((cnt, val) => {
      if (cnt > 1) dups.add(val);
    });
    return dups;
  }, [pages, manualNumbers]);

  const handleCopyNumbers = (separator: "comma" | "newline") => {
    if (allNumbers.length === 0) return;
    const text = separator === "comma" ? allNumbers.join(", ") : allNumbers.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(`Đã sao chép ${allNumbers.length} số phiếu!`);
      setTimeout(() => setCopiedText(null), 3000);
    });
  };

  const handleExportCSV = () => {
    if (allNumbers.length === 0) return;
    const dateStr = recordDate || getLocalTodayISO();
    const rows = [
      ["STT", "So_Phieu_Kho", "Nguoi_Giao", "So_Xe", "Khach_Hang", "Khu_Vuc", "Ngay_Giao"],
      ...allNumbers.map((num, idx) => [
        String(idx + 1),
        String(num),
        driverName || "",
        vehicleNumber || "",
        customerName || "",
        area || "",
        formatDateDDMMYYYY(dateStr),
      ]),
    ];
    const csvContent = "\uFEFF" + rows.map((e) => e.join(",")).join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bang_Ke_So_Phieu_Kho_${formatDateDDMMYYYY(dateStr).replace(/\//g, "-")}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const formattedShareText = useMemo(() => {
    if (shareFormat === "comma") return allNumbers.join(", ");
    if (shareFormat === "numbered") return allNumbers.map((n, i) => `#${i + 1}: ${n}`).join("\n");
    const lines: string[] = [];
    lines.push("📋 DANH SÁCH SỐ PHIẾU GIAO HÀNG KHO");
    lines.push(`📅 Ngày: ${formatDateDDMMYYYY(recordDate || getLocalTodayISO())}`);
    lines.push(`📊 Tổng số: ${allNumbers.length} số phiếu`);
    if (vehicleNumber) lines.push(`🚛 Số xe: ${vehicleNumber}`);
    if (driverName) lines.push(`👤 Người giao: ${driverName}`);
    if (customerName) lines.push(`🏢 Khách hàng: ${customerName}`);
    if (area) lines.push(`📍 Khu vực: ${area}`);
    lines.push("--------------------------------");
    lines.push("📌 Danh sách số phiếu:");
    lines.push(allNumbers.join(", "));
    return lines.join("\n");
  }, [allNumbers, shareFormat, recordDate, vehicleNumber, driverName, customerName, area]);

  const handleCopyShareText = () => {
    navigator.clipboard.writeText(formattedShareText).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    });
  };

  // Click on image to detect missing number
  const handleImageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activePage || !activePage.preview) return;
    if (!isClickDetectMode) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-detected-box]") || target.closest("button") || target.closest("input")) return;
    const container = imgContainerRef.current;
    if (!container) return;
    const rect = container.getBoundingClientRect();
    const relX = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    const relY = Math.max(0, Math.min(1, (e.clientY - rect.top) / rect.height));

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = activePage.preview;
      await img.decode();
      const natW = img.naturalWidth || 800;
      const natH = img.naturalHeight || 1000;
      const cropW = Math.min(natW, Math.max(160, Math.round(natW * 0.2)));
      const cropH = Math.min(natH, Math.max(90, Math.round(natH * 0.1)));
      const cropLeft = Math.max(0, Math.min(natW - cropW, Math.round(relX * natW - cropW / 2)));
      const cropTop = Math.max(0, Math.min(natH - cropH, Math.round(relY * natH - cropH / 2)));
      const canvas = document.createElement("canvas");
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext("2d");
      if (ctx) ctx.drawImage(img, cropLeft, cropTop, cropW, cropH, 0, 0, cropW, cropH);
      const cropBase64 = canvas.toDataURL("image/jpeg", 0.95);

      setSpotScan({
        pageId: activePage.id,
        clickRelX: relX,
        clickRelY: relY,
        cropBase64,
        status: "scanning",
        detectedNum: null,
        manualInputVal: "",
        mappedBox: [relY * 1000 - 15, relX * 1000 - 25, relY * 1000 + 15, relX * 1000 + 25],
      });

      const response = await fetch("/api/ocr", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: cropBase64, mimeType: "image/jpeg" }),
      });
      const data = await response.json();
      if (response.ok && data.numbers && data.numbers.length > 0) {
        const found = data.numbers[0];
        setSpotScan((prev) => (prev ? { ...prev, status: "detected", detectedNum: found, manualInputVal: String(found) } : null));
      } else {
        setSpotScan((prev) => (prev ? { ...prev, status: "not_found", detectedNum: null, manualInputVal: "" } : null));
      }
    } catch {
      setSpotScan((prev) => (prev ? { ...prev, status: "not_found", detectedNum: null, manualInputVal: "" } : null));
    }
  };

  const handleConfirmAddSpotNumber = () => {
    if (!spotScan || !activePage) return;
    const rawNum = spotScan.manualInputVal ? parseInt(spotScan.manualInputVal, 10) : spotScan.detectedNum;
    if (!rawNum || isNaN(rawNum) || rawNum < 1 || rawNum > 1500) return;
    if (onAddNumberToPage) {
      onAddNumberToPage(spotScan.pageId, rawNum, spotScan.mappedBox);
    }
    setSpotScan(null);
  };

  // Only render if there are pages or numbers
  if (pages.length === 0 && allNumbers.length === 0) return null;

  return (
    <section aria-labelledby="uploaded-data-info-heading" className="bg-white rounded-2xl border border-gray-200/90 shadow-xs p-4 sm:p-5 font-sans">
      {/* Header section */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-gray-100">
        <div>
          <h2 id="uploaded-data-info-heading" className="text-base font-bold text-gray-900 flex items-center gap-2">
            <FileText className="w-5 h-5 text-emerald-600" />
            <span>Thông Tin Dữ Liệu Đã Tải Lên</span>
            <span className="text-xs px-2.5 py-0.5 font-bold bg-emerald-100 text-emerald-800 rounded-full font-mono">
              {allNumbers.length} số phiếu • {pages.length} trang ảnh
            </span>
          </h2>
        </div>

        {/* Action buttons */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Copy tools */}
          <div className="relative inline-flex rounded-xl shadow-2xs">
            <button
              type="button"
              onClick={() => handleCopyNumbers("comma")}
              className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-l-xl transition-colors cursor-pointer"
              title="Sao chép danh sách số phiếu ngăn cách bởi dấu phẩy"
            >
              <Copy className="w-3.5 h-3.5" /> Sao chép ( , )
            </button>
            <button
              type="button"
              onClick={() => handleCopyNumbers("newline")}
              className="inline-flex items-center text-xs font-semibold px-2.5 py-1.5 bg-slate-200/70 hover:bg-slate-300 text-slate-700 rounded-r-xl border-l border-slate-300 transition-colors cursor-pointer"
              title="Sao chép danh sách số phiếu mỗi số một dòng"
            >
              Xuống dòng
            </button>
          </div>

          {/* Chia sẻ Danh sách */}
          <button
            type="button"
            onClick={() => setIsShareModalOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 active:bg-indigo-200 text-indigo-700 border border-indigo-200/80 rounded-xl transition-all cursor-pointer shadow-2xs"
            title="Chia sẻ danh sách số phiếu qua Zalo, Tin nhắn, Web Share..."
          >
            <Share2 className="w-3.5 h-3.5 text-indigo-600" />
            <span>Chia sẻ Danh sách</span>
          </button>

          {/* Export CSV */}
          <button
            type="button"
            onClick={handleExportCSV}
            className="inline-flex items-center gap-1 text-xs font-semibold px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-xl transition-colors cursor-pointer shadow-2xs"
            title="Xuất file Excel / CSV bảng kê số phiếu giao hàng kho"
          >
            <Download className="w-3.5 h-3.5" /> Xuất Excel/CSV
          </button>

          {copiedText && (
            <span className="text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200">
              {copiedText}
            </span>
          )}
        </div>
      </div>

      {/* Summary KPI Badges */}
      <div className="flex flex-wrap items-center gap-3 my-4">
        <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl min-w-[140px] flex-1">
          <p className="text-[11px] font-semibold text-slate-500 uppercase">Tổng số phiếu kho</p>
          <p className="text-xl font-extrabold text-slate-900 mt-0.5">{allNumbers.length}</p>
        </div>

        {aiScannedSet.size > 0 && (
          <div className="p-3 bg-emerald-50/70 border border-emerald-200/60 rounded-xl min-w-[140px] flex-1">
            <p className="text-[11px] font-semibold text-emerald-700 uppercase">Quét tự động AI</p>
            <p className="text-xl font-extrabold text-emerald-800 mt-0.5">{aiScannedSet.size}</p>
          </div>
        )}

        {manualNumbers.length > 0 && (
          <div className="p-3 bg-cyan-50/70 border border-cyan-200/60 rounded-xl min-w-[140px] flex-1">
            <p className="text-[11px] font-semibold text-cyan-700 uppercase">Thêm thủ công</p>
            <p className="text-xl font-extrabold text-cyan-800 mt-0.5">{manualNumbers.length}</p>
          </div>
        )}

        {duplicateNumbers.size > 0 && (
          <div className="p-3 bg-amber-50 border border-amber-200/80 rounded-xl min-w-[140px] flex-1 text-amber-900">
            <p className="text-[11px] font-semibold uppercase">Số bị trùng lặp</p>
            <p className="text-xl font-extrabold mt-0.5">{duplicateNumbers.size} số</p>
          </div>
        )}
      </div>

      {/* Visual Document Inspector when pages exist */}
      {pages.length > 0 && activePage && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
            <div className="flex items-center gap-2">
              <Scan className="w-4 h-4 text-emerald-600" />
              <h3 className="text-xs sm:text-sm font-bold text-gray-900">
                Kiểm Tra Trực Quan Chứng Từ ({pages.length} trang ảnh)
              </h3>
            </div>

            {/* Page selection pills if multiple */}
            {pages.length > 1 && (
              <div className="flex flex-wrap items-center gap-1">
                {pages.map((p, idx) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => setActivePreviewPageId(p.id)}
                    className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      p.id === activePage.id
                        ? "bg-emerald-600 text-white border-emerald-600 shadow-2xs"
                        : "bg-white text-gray-700 border-gray-200 hover:bg-gray-50"
                    }`}
                  >
                    Trang {idx + 1} ({p.numbers.length})
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Image Canvas with Bounding Boxes */}
          <div className="relative border border-gray-200 rounded-2xl overflow-hidden bg-slate-900 flex items-center justify-center min-h-[350px]">
            {activePage.preview ? (
              <div
                ref={imgContainerRef}
                onClick={handleImageClick}
                className="relative cursor-crosshair select-none max-w-full"
                style={{ transform: `scale(${zoomLevel})`, transformOrigin: "center top", transition: "transform 0.15s ease" }}
              >
                <img
                  src={activePage.preview}
                  alt={activePage.fileName}
                  className="max-h-[600px] w-auto object-contain block mx-auto"
                />

                {/* Bounding boxes overlay */}
                {showOverlays &&
                  activePage.coords &&
                  activePage.coords.map((box, idx) => {
                    const num = activePage.numbers[idx];
                    if (!box || box.length !== 4) return null;
                    const [ymin, xmin, ymax, xmax] = box;
                    const top = `${ymin / 10}%`;
                    const left = `${xmin / 10}%`;
                    const width = `${(xmax - xmin) / 10}%`;
                    const height = `${(ymax - ymin) / 10}%`;

                    return (
                      <div
                        key={idx}
                        data-detected-box="true"
                        onDoubleClick={() => num && onRemoveNumber(num)}
                        style={{ top, left, width, height }}
                        className="absolute border-2 border-emerald-400 bg-emerald-500/20 hover:bg-emerald-500/40 rounded transition-all cursor-pointer flex items-center justify-center group"
                        title={`Số phiếu: ${num}. Nhấn đúp để xóa.`}
                      >
                        {num && (
                          <span className="text-[10px] font-black px-1 rounded bg-slate-900/90 text-white shadow-xs pointer-events-none">
                            {num}
                          </span>
                        )}
                      </div>
                    );
                  })}
              </div>
            ) : (
              <p className="text-xs text-gray-400 p-8">Không có hình ảnh xem trước cho trang này</p>
            )}

            {/* Click to detect popover */}
            {spotScan && (
              <div className="absolute bottom-4 left-1/2 -translate-x-1/2 z-30 bg-slate-900 text-white px-4 py-3 rounded-2xl shadow-2xl border border-slate-700 flex items-center gap-3 text-xs">
                {spotScan.status === "scanning" && (
                  <div className="flex items-center gap-2">
                    <Loader2 className="w-4 h-4 text-emerald-400 animate-spin" />
                    <span>Đang nhận diện số tại vị trí bấm...</span>
                  </div>
                )}
                {spotScan.status === "detected" && (
                  <div className="flex items-center gap-2.5">
                    <span>Số tìm thấy:</span>
                    <input
                      type="number"
                      value={spotScan.manualInputVal}
                      onChange={(e) => setSpotScan({ ...spotScan, manualInputVal: e.target.value })}
                      className="w-16 px-2 py-1 bg-slate-800 text-white rounded-lg border border-emerald-400 font-bold text-center"
                    />
                    <button
                      type="button"
                      onClick={handleConfirmAddSpotNumber}
                      className="px-3 py-1 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-bold text-white cursor-pointer"
                    >
                      Thêm số này
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpotScan(null)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                )}
                {spotScan.status === "not_found" && (
                  <div className="flex items-center gap-2">
                    <span>Không tìm thấy số. Nhập tay:</span>
                    <input
                      type="number"
                      value={spotScan.manualInputVal}
                      onChange={(e) => setSpotScan({ ...spotScan, manualInputVal: e.target.value })}
                      placeholder="Số..."
                      className="w-16 px-2 py-1 bg-slate-800 text-white rounded-lg border border-slate-600 font-bold text-center"
                    />
                    <button
                      type="button"
                      onClick={handleConfirmAddSpotNumber}
                      disabled={!spotScan.manualInputVal}
                      className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 rounded-lg font-bold cursor-pointer"
                    >
                      Lưu
                    </button>
                    <button
                      type="button"
                      onClick={() => setSpotScan(null)}
                      className="p-1 text-slate-400 hover:text-white"
                    >
                      ✕
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Share Modal */}
      <AnimatePresence>
        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-lg w-full overflow-hidden text-slate-800"
            >
              <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Share2 className="w-4 h-4 text-indigo-600" />
                  <h4 className="font-bold text-sm text-slate-900">Chia sẻ Danh sách Số Phiếu</h4>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-lg cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                <textarea
                  readOnly
                  rows={6}
                  value={formattedShareText}
                  className="w-full text-xs font-mono p-3 bg-slate-50 border border-slate-200 rounded-xl select-all outline-none resize-none"
                  onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                />
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-500">{allNumbers.length} số phiếu</span>
                  <button
                    type="button"
                    onClick={handleCopyShareText}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors shadow-xs"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    <span>{shareCopied ? "Đã sao chép!" : "Sao chép nội dung"}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
