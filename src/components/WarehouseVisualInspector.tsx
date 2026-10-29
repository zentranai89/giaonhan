import React from "react";
import {
  Scan,
  Eye,
  EyeOff,
  ChevronLeft,
  ChevronRight,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  MousePointerClick,
  Target,
  Trash2,
  Loader2,
  X,
  Layers,
} from "lucide-react";
import { ImagePage } from "../types";

export interface WarehouseVisualInspectorProps {
  pages: ImagePage[];
  activePageIndex: number;
  activePage: ImagePage | null;
  activePreviewPageId: string | null;
  setActivePreviewPageId: (id: string) => void;
  showVisualInspector: boolean;
  setIsInspectorCollapsed: (val: boolean) => void;
  showOverlays: boolean;
  setShowOverlays: (val: boolean) => void;
  overlayMode: "subtle" | "hover-only" | "corners";
  setOverlayMode: (mode: "subtle" | "hover-only" | "corners") => void;
  showLabels: boolean;
  setShowLabels: React.Dispatch<React.SetStateAction<boolean>>;
  zoomLevel: number;
  setZoomLevel: React.Dispatch<React.SetStateAction<number>>;
  isClickDetectMode: boolean;
  setIsClickDetectMode: (val: boolean) => void;
  handleImageClick: (e: React.MouseEvent<HTMLDivElement>) => void;
  imgContainerRef: React.RefObject<HTMLDivElement | null>;
  hoveredNumber: number | null;
  selectedNumber: number | null;
  setSelectedNumber: (num: number | null) => void;
  duplicateNumbers: Set<number>;
  lowConfidenceSet: Set<number>;
  orderTicketSet: Set<string>;
  handleDoubleClickNumberOnImage: (num: number) => void;
  spotScan: any;
  setSpotScan: React.Dispatch<React.SetStateAction<any>>;
  handleConfirmAddSpotNumber: (numOverride?: number) => void;
  getBoxStyle: (box: number[]) => React.CSSProperties;
}

export default function WarehouseVisualInspector({
  pages,
  activePageIndex,
  activePage,
  activePreviewPageId,
  setActivePreviewPageId,
  showVisualInspector,
  setIsInspectorCollapsed,
  showOverlays,
  setShowOverlays,
  overlayMode,
  setOverlayMode,
  showLabels,
  setShowLabels,
  zoomLevel,
  setZoomLevel,
  isClickDetectMode,
  setIsClickDetectMode,
  handleImageClick,
  imgContainerRef,
  hoveredNumber,
  selectedNumber,
  setSelectedNumber,
  duplicateNumbers,
  lowConfidenceSet,
  orderTicketSet,
  handleDoubleClickNumberOnImage,
  spotScan,
  setSpotScan,
  handleConfirmAddSpotNumber,
  getBoxStyle,
}: WarehouseVisualInspectorProps) {
  if (pages.length === 0) return null;

  if (!showVisualInspector) {
    return (
      <div className="mt-3 pt-2.5 border-t border-slate-200 flex items-center justify-between">
        <span className="text-xs text-slate-500">
          Đang ẩn phần Kiểm Tra Trực Quan Chứng Từ ({pages.length} trang đã tải).
        </span>
        <button
          type="button"
          onClick={() => setIsInspectorCollapsed(false)}
          className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-200 transition-colors cursor-pointer"
        >
          <Scan className="w-3.5 h-3.5" />
          <span>Mở lại Kiểm Tra Trực Quan Chứng Từ</span>
        </button>
      </div>
    );
  }

  return (
    <div className="mt-4 pt-4 border-t border-slate-200">
      <div className="bg-slate-900 text-white rounded-2xl p-4 flex flex-col min-h-[460px] shadow-sm">
        {/* Inspector Header */}
        <div className="flex items-center justify-between pb-2.5 border-b border-slate-800 mb-2">
          <div className="flex items-center gap-2">
            <span className="p-1.5 bg-emerald-500/20 text-emerald-400 rounded-lg">
              <Scan className="w-4 h-4" />
            </span>
            <div>
              <h3 className="text-xs font-bold text-slate-100 flex items-center gap-1.5">
                Kiểm Tra Trực Quan Chứng Từ
                <span className="text-[9px] font-medium text-emerald-400 bg-emerald-950/80 border border-emerald-600/50 px-1.5 py-0.2 rounded">
                  Chống che chữ
                </span>
              </h3>
              <p className="text-[10px] text-slate-400">
                {pages.length > 0
                  ? `Trang ${activePageIndex + 1}/${pages.length} (${activePage?.numbers.length || 0} số phiếu)`
                  : "Chưa có ảnh chứng từ"}
              </p>
            </div>
          </div>

          {/* Page Switcher, Overlays toggle & Collapse button */}
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowOverlays(!showOverlays)}
              className={`p-1.5 rounded-lg text-xs transition-colors cursor-pointer ${
                showOverlays ? "bg-emerald-600 text-white" : "bg-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title={showOverlays ? "Đang hiện khung số (bấm để ẩn)" : "Đang ẩn khung số (bấm để hiện)"}
            >
              {showOverlays ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            </button>

            {pages.length > 1 && (
              <div className="flex items-center bg-slate-800 rounded-lg p-0.5">
                <button
                  type="button"
                  disabled={activePageIndex <= 0}
                  onClick={() => {
                    if (activePageIndex > 0) {
                      setActivePreviewPageId(pages[activePageIndex - 1].id);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <span className="text-[10px] font-mono px-1.5 text-slate-300">
                  {activePageIndex + 1}/{pages.length}
                </span>
                <button
                  type="button"
                  disabled={activePageIndex >= pages.length - 1}
                  onClick={() => {
                    if (activePageIndex < pages.length - 1) {
                      setActivePreviewPageId(pages[activePageIndex + 1].id);
                    }
                  }}
                  className="p-1 text-slate-400 hover:text-white disabled:opacity-30 cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            )}

            {/* Nút thu gọn / tạm ẩn để giao diện dễ nhìn */}
            <button
              type="button"
              onClick={() => setIsInspectorCollapsed(true)}
              className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
              title="Tạm ẩn phần này để giao diện rộng rãi, dễ nhìn (có thể bật lại bất cứ lúc nào)"
            >
              <EyeOff className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Anti-occlusion controls & display modes */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 py-1 px-2 bg-slate-950/70 border border-slate-800/90 rounded-xl text-[11px] mb-2">
          <div className="flex items-center gap-1">
            <span className="text-[10px] text-slate-400 font-medium hidden sm:inline">Chế độ:</span>
            <div className="flex items-center bg-slate-900 rounded-lg p-0.5 border border-slate-800">
              <button
                type="button"
                onClick={() => setOverlayMode("subtle")}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                  overlayMode === "subtle"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Viền mỏng trong suốt, nhãn gọn trong góc - Không đè dòng trên"
              >
                Viền mỏng
              </button>
              <button
                type="button"
                onClick={() => setOverlayMode("hover-only")}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                  overlayMode === "hover-only"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Chỉ hiện nhãn khi rê chuột - 0% che chữ trên ảnh"
              >
                Rê chuột xem
              </button>
              <button
                type="button"
                onClick={() => setOverlayMode("corners")}
                className={`px-2 py-0.5 rounded text-[10px] font-semibold transition-colors cursor-pointer ${
                  overlayMode === "corners"
                    ? "bg-emerald-600 text-white shadow-xs"
                    : "text-slate-400 hover:text-slate-200"
                }`}
                title="Góc gọng kìm - Chỉ hiển thị 4 góc khung"
              >
                Gọng kìm
              </button>
            </div>
          </div>

          <div className="flex items-center gap-1.5 ml-auto">
            <button
              type="button"
              onClick={() => setShowLabels((prev) => !prev)}
              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium border transition-colors cursor-pointer ${
                showLabels
                  ? "bg-cyan-950/70 border-cyan-600/50 text-cyan-300"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200"
              }`}
              title={showLabels ? "Bấm để tắt nhãn số" : "Bấm để bật nhãn số"}
            >
              <Eye className="w-2.5 h-2.5" />
              {showLabels ? "Nhãn: Bật" : "Nhãn: Tắt"}
            </button>
          </div>
        </div>

        {/* Zoom Controls & Help */}
        <div className="flex items-center justify-between py-1 text-[11px] text-slate-400">
          <span className="text-[10px] truncate max-w-[200px]">
            {overlayMode === "hover-only"
              ? "Rê chuột vào số để xem chi tiết"
              : "Ruột viền 100% trong suốt không che chữ"}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.max(0.7, z - 0.2))}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
              title="Thu nhỏ"
            >
              <ZoomOut className="w-3 h-3" />
            </button>
            <span className="text-[10px] font-mono w-8 text-center">{Math.round(zoomLevel * 100)}%</span>
            <button
              type="button"
              onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.2))}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded cursor-pointer"
              title="Phóng to"
            >
              <ZoomIn className="w-3 h-3" />
            </button>
            <button
              type="button"
              onClick={() => setZoomLevel(1)}
              className="p-1 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded ml-0.5 cursor-pointer"
              title="Đặt lại kích thước chuẩn"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>
        </div>

        {/* Click-to-Detect Missing Numbers Bar */}
        <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 bg-gradient-to-r from-emerald-950/80 via-slate-900 to-teal-950/80 border border-emerald-500/40 rounded-xl text-xs mb-2">
          <div className="flex items-center gap-1.5 min-w-0">
            <span className="p-1 rounded-md bg-emerald-500/20 text-emerald-300 shrink-0">
              <MousePointerClick className="w-3.5 h-3.5" />
            </span>
            <span className="text-[11px] text-emerald-200 font-medium truncate">
              Kích chuột để nhận diện số thiếu • <strong className="text-amber-200 font-semibold">Nhấn chuột 2 lần vào số</strong> để xóa
            </span>
          </div>
          <button
            type="button"
            onClick={() => {
              setIsClickDetectMode(!isClickDetectMode);
              if (spotScan) setSpotScan(null);
            }}
            className={`shrink-0 px-2.5 py-1 rounded-lg text-[10.5px] font-bold transition-all flex items-center gap-1 cursor-pointer border ${
              isClickDetectMode
                ? "bg-emerald-600 text-white border-emerald-400 shadow-sm"
                : "bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200"
            }`}
            title={isClickDetectMode ? "Đang bật nhận diện khi nhấp chuột" : "Đang tắt nhận diện khi nhấp chuột"}
          >
            <Target className="w-3 h-3" />
            <span>{isClickDetectMode ? "Đang Bật" : "Tắt"}</span>
          </button>
        </div>

        {/* Document Image Stage */}
        <div className="flex-1 rounded-xl bg-slate-950 border border-slate-800 relative overflow-auto flex items-center justify-center p-2 min-h-[340px]">
          {activePage && activePage.preview ? (
            <div
              ref={imgContainerRef as any}
              onClick={handleImageClick}
              className={`relative transition-transform origin-center inline-block ${
                isClickDetectMode ? "cursor-crosshair" : ""
              }`}
              style={{ transform: `scale(${zoomLevel})` }}
            >
              <img
                src={activePage.preview}
                alt={activePage.fileName}
                className="max-h-[380px] w-auto object-contain rounded select-none pointer-events-none block"
              />

              {/* Bounding box overlays */}
              {showOverlays &&
                activePage.coords &&
                activePage.coords.map((item, cIdx) => {
                  const isHovered = hoveredNumber === item.value;
                  const isSelected = selectedNumber === item.value;
                  const isDup = duplicateNumbers.has(item.value);
                  const isLowConf = lowConfidenceSet.has(item.value);

                  if (overlayMode === "corners") {
                    return (
                      <div
                        key={cIdx}
                        data-detected-box="true"
                        style={getBoxStyle(item.box)}
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedNumber(item.value === selectedNumber ? null : item.value);
                        }}
                        onDoubleClick={(e) => {
                          e.stopPropagation();
                          handleDoubleClickNumberOnImage(item.value);
                        }}
                        title={`Số phiếu: ${item.value} (Nhấn chuột 2 lần để xóa)`}
                        className={`absolute transition-all cursor-pointer pointer-events-auto ${
                          isHovered || isSelected
                            ? "bg-emerald-500/10 ring-2 ring-emerald-400 z-30"
                            : "bg-transparent hover:ring-1 hover:ring-rose-400/60"
                        }`}
                      >
                        <span className="absolute -top-[1px] -left-[1px] w-1.5 h-1.5 border-t-2 border-l-2 border-cyan-400 pointer-events-none" />
                        <span className="absolute -top-[1px] -right-[1px] w-1.5 h-1.5 border-t-2 border-r-2 border-cyan-400 pointer-events-none" />
                        <span className="absolute -bottom-[1px] -left-[1px] w-1.5 h-1.5 border-b-2 border-l-2 border-cyan-400 pointer-events-none" />
                        <span className="absolute -bottom-[1px] -right-[1px] w-1.5 h-1.5 border-b-2 border-r-2 border-cyan-400 pointer-events-none" />

                        {showLabels && (
                          <span className="absolute bottom-0 right-0 bg-slate-900/90 text-emerald-300 text-[9px] font-mono font-bold px-1 py-0.2 rounded-tl border-t border-l border-emerald-500/40">
                            {item.value}
                          </span>
                        )}
                      </div>
                    );
                  }

                  const showLabelNow =
                    overlayMode === "hover-only"
                      ? isHovered || isSelected
                      : showLabels;

                  return (
                    <div
                      key={cIdx}
                      data-detected-box="true"
                      style={getBoxStyle(item.box)}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedNumber(item.value === selectedNumber ? null : item.value);
                      }}
                      onDoubleClick={(e) => {
                        e.stopPropagation();
                        handleDoubleClickNumberOnImage(item.value);
                      }}
                      title={`Số phiếu: ${item.value} (Nhấn chuột 2 lần để xóa)`}
                      className={`absolute border pointer-events-auto transition-all cursor-pointer ${
                        isHovered || isSelected
                          ? "border-emerald-400 bg-emerald-500/10 ring-2 ring-emerald-400/80 z-30"
                          : isDup
                          ? "border-amber-400/80 bg-amber-500/5 hover:border-amber-300"
                          : isLowConf
                          ? "border-rose-400/80 bg-rose-500/5 hover:border-rose-300"
                          : "border-emerald-500/50 bg-transparent hover:border-emerald-400"
                      }`}
                    >
                      {showLabelNow && (
                        <span
                          className={`absolute -top-4 left-0 px-1 py-0.2 rounded text-[9px] font-mono font-bold whitespace-nowrap shadow-xs pointer-events-none transition-opacity ${
                            isHovered || isSelected
                              ? "bg-emerald-500 text-slate-950 scale-105 z-40"
                              : isDup
                              ? "bg-amber-500/90 text-slate-950"
                              : isLowConf
                              ? "bg-rose-500/90 text-white"
                              : "bg-slate-900/85 text-emerald-300 border border-emerald-500/40"
                          }`}
                        >
                          {item.value}
                        </span>
                      )}
                    </div>
                  );
                })}

              {/* Spot scan popover */}
              {spotScan && (
                <div
                  style={{
                    top: `${spotScan.clickRelY * 100}%`,
                    left: `${spotScan.clickRelX * 100}%`,
                  }}
                  onClick={(e) => e.stopPropagation()}
                  className="absolute z-50 -translate-x-1/2 -translate-y-1/2 min-w-[210px] p-2.5 bg-slate-900/95 backdrop-blur-md rounded-xl border border-emerald-500 shadow-2xl text-white text-xs pointer-events-auto"
                >
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 mb-2">
                    <span className="text-[10.5px] font-bold text-emerald-400 flex items-center gap-1">
                      <Target className="w-3 h-3" /> Điểm vừa bấm
                    </span>
                    <button
                      type="button"
                      onClick={() => setSpotScan(null)}
                      className="text-slate-400 hover:text-white p-0.5 rounded cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>

                  {spotScan.cropBase64 && (
                    <div className="mb-2 bg-black rounded p-1 flex justify-center border border-slate-800">
                      <img
                        src={spotScan.cropBase64}
                        alt="Vùng quét"
                        className="max-h-16 w-auto object-contain rounded"
                      />
                    </div>
                  )}

                  {spotScan.status === "scanning" && (
                    <div className="flex items-center justify-center gap-2 py-2 text-emerald-300">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      <span className="text-[11px]">Đang nhận diện số...</span>
                    </div>
                  )}

                  {spotScan.status === "detected" && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-1">
                        <span className="text-[10px] text-slate-400">Nhận diện được:</span>
                        <span className="text-sm font-mono font-black text-emerald-300">
                          #{spotScan.detectedNum}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          value={spotScan.manualInputVal}
                          onChange={(e) =>
                            setSpotScan((prev: any) =>
                              prev ? { ...prev, manualInputVal: e.target.value } : null
                            )
                          }
                          className="w-16 px-1.5 py-1 text-xs font-mono font-bold bg-slate-800 border border-slate-700 rounded text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleConfirmAddSpotNumber()}
                          className="flex-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 font-bold text-[11px] rounded transition-colors"
                        >
                          Thêm số này
                        </button>
                      </div>
                    </div>
                  )}

                  {spotScan.status === "not_found" && (
                    <div className="space-y-2">
                      <p className="text-[10px] text-amber-300">
                        Chưa rõ số tại điểm bấm. Hãy nhập số để thêm:
                      </p>
                      <div className="flex items-center gap-1.5">
                        <input
                          type="number"
                          placeholder="Số phiếu"
                          value={spotScan.manualInputVal}
                          onChange={(e) =>
                            setSpotScan((prev: any) =>
                              prev ? { ...prev, manualInputVal: e.target.value } : null
                            )
                          }
                          className="w-16 px-1.5 py-1 text-xs font-mono font-bold bg-slate-800 border border-slate-700 rounded text-white"
                        />
                        <button
                          type="button"
                          onClick={() => handleConfirmAddSpotNumber()}
                          className="flex-1 px-2 py-1 bg-emerald-600 hover:bg-emerald-700 font-bold text-[11px] rounded transition-colors"
                        >
                          Xác nhận
                        </button>
                      </div>
                    </div>
                  )}

                  {spotScan.status === "error" && (
                    <div className="space-y-1.5 text-center py-1">
                      <p className="text-[10px] text-rose-300">{spotScan.errorMessage}</p>
                      <button
                        type="button"
                        onClick={() => setSpotScan(null)}
                        className="text-[10px] text-slate-400 underline"
                      >
                        Đóng
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center text-slate-500 py-16">
              <Layers className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <p className="text-xs font-semibold">Chưa có trang ảnh nào để hiển thị</p>
              <p className="text-[11px] text-slate-600 mt-1">Tải ảnh Sổ Giao Hàng Kho ở phần trên để xem tại đây</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
