import {
  FolderSync,
  CalendarClock,
  Award,
  Clock,
  Database,
  Download,
  FolderOpen,
  PlusCircle,
  RefreshCw,
  ShieldCheck,
  CheckCircle2,
  ChevronUp,
} from "lucide-react";
import DisplayScaleController from "./DisplayScaleController";
import { formatRealtimeClock } from "../utils/dateUtils";

export interface CommonToolbarProps {
  activePage: "main" | "reminders" | "supplier_bonuses";
  onNavigatePage: (page: "main" | "reminders" | "supplier_bonuses") => void;
  liveCurrentTime: Date;
  currentRecordId: string | null;
  lastSavedText?: string | null;
  // Display Scale & Fullscreen
  uiScale: number;
  effectiveScale: number;
  onScaleChange: (val: number) => void;
  autoFitScreen: boolean;
  onAutoFitChange: (val: boolean) => void;
  isFullscreen: boolean;
  onToggleFullscreen: () => void;
  onResetScale: () => void;
  // Counts
  remindersCount: number;
  backupsCount: number;
  // Handlers
  onSaveOrUpdateBackup: () => void;
  onComprehensiveFullBackup: () => void;
  onOpenBackupHistory: () => void;
  onStartNewSession: () => void;
  onResetSession: () => void;
  onToggleCollapse?: () => void;
}

export default function CommonToolbar({
  activePage,
  onNavigatePage,
  liveCurrentTime,
  currentRecordId,
  lastSavedText,
  uiScale,
  effectiveScale,
  onScaleChange,
  autoFitScreen,
  onAutoFitChange,
  isFullscreen,
  onToggleFullscreen,
  onResetScale,
  remindersCount,
  backupsCount,
  onSaveOrUpdateBackup,
  onComprehensiveFullBackup,
  onOpenBackupHistory,
  onStartNewSession,
  onResetSession,
  onToggleCollapse,
}: CommonToolbarProps) {
  // Config logo & active styling based on current page
  const pageConfig = {
    main: {
      title: "THEO DÕI GIAO NHẬN",
      shortTitle: "GIAO NHẬN KHO",
      icon: FolderSync,
      iconBg: "bg-gradient-to-tr from-emerald-600 to-teal-500 shadow-emerald-500/20",
      accentText: "text-emerald-700",
    },
    reminders: {
      title: "GHI CHÚ NHẮC HẸN & LỊCH GIAO",
      shortTitle: "GHI CHÚ CÔNG VIỆC",
      icon: CalendarClock,
      iconBg: "bg-gradient-to-tr from-amber-600 to-orange-500 shadow-amber-500/20",
      accentText: "text-amber-700",
    },
    supplier_bonuses: {
      title: "THƯỞNG & CHIẾT KHẤU NCC",
      shortTitle: "THƯỞNG & CK NCC",
      icon: Award,
      iconBg: "bg-gradient-to-tr from-blue-600 to-indigo-600 shadow-blue-500/20",
      accentText: "text-blue-700",
    },
  }[activePage];

  const IconComponent = pageConfig.icon;

  return (
    <div className="w-full bg-white/95 backdrop-blur-md border-b border-slate-200/80 shadow-xs transition-all">
      <div className="w-full px-2.5 sm:px-4 lg:px-5 py-2">
        <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-2.5">
          {/* LEFT: Logo Branding, Page Title & Page Switcher Tabs */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
            {/* Logo Badge */}
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl text-white shadow-xs flex items-center justify-center shrink-0 transition-transform active:scale-95 ${pageConfig.iconBg}`}
              >
                <IconComponent className="w-5 h-5" />
              </div>
              <div className="leading-tight">
                <h1 className="text-sm sm:text-base font-extrabold tracking-tight text-slate-900 uppercase">
                  {pageConfig.title}
                </h1>
                <span className="text-[10px] sm:text-[11px] font-semibold text-slate-500 hidden sm:inline-block">
                  Hệ Thống Quản Lý Giao Hàng &amp; Đối Soát Chứng Từ
                </span>
              </div>
            </div>

            {/* Segmented Page Navigation Tabs */}
            <nav
              aria-label="Chuyển đổi giao diện"
              className="flex items-center p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 gap-0.5 text-xs font-bold shrink-0"
            >
              <button
                type="button"
                onClick={() => onNavigatePage("main")}
                className={`h-7.5 px-2.5 rounded-lg inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  activePage === "main"
                    ? "bg-white text-emerald-800 shadow-2xs font-extrabold border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
                title="Mở giao diện Theo Dõi Giao Nhận & Số Phiếu Kho"
              >
                <FolderSync className="w-3.5 h-3.5 text-emerald-600" />
                <span>Theo Dõi Giao Nhận</span>
              </button>

              <button
                type="button"
                onClick={() => onNavigatePage("reminders")}
                className={`h-7.5 px-2.5 rounded-lg inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  activePage === "reminders"
                    ? "bg-white text-amber-900 shadow-2xs font-extrabold border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
                title="Mở giao diện Ghi Chú Nhắc Hẹn & Lịch Giao"
              >
                <CalendarClock className="w-3.5 h-3.5 text-amber-600" />
                <span>Ghi Chú Công Việc</span>
                {remindersCount > 0 && (
                  <span
                    className={`px-1.5 py-0.2 rounded-full text-[10px] font-black ${
                      activePage === "reminders"
                        ? "bg-amber-100 text-amber-900 border border-amber-300"
                        : "bg-amber-200 text-amber-900"
                    }`}
                  >
                    {remindersCount}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => onNavigatePage("supplier_bonuses")}
                className={`h-7.5 px-2.5 rounded-lg inline-flex items-center gap-1.5 transition-all cursor-pointer ${
                  activePage === "supplier_bonuses"
                    ? "bg-white text-blue-900 shadow-2xs font-extrabold border border-slate-200/60"
                    : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                }`}
                title="Mở module Thưởng & Chiết Khấu Nhà Cung Cấp"
              >
                <Award className="w-3.5 h-3.5 text-blue-600" />
                <span className="hidden sm:inline">Thưởng &amp; CK NCC</span>
                <span className="sm:hidden">Thưởng NCC</span>
              </button>
            </nav>
          </div>

          {/* RIGHT: Clock, Save Status, Display Scale, and Action Buttons */}
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2 self-stretch sm:self-auto justify-end">
            {/* Real-time System Clock & Save Status Chip */}
            <div
              className="h-9 hidden lg:inline-flex items-center gap-2 px-2.5 bg-slate-50 border border-slate-200/90 rounded-xl text-xs font-mono text-slate-700 shadow-2xs shrink-0 select-none"
              title="Đồng hồ hệ thống thời gian thực"
            >
              <div className="flex items-center gap-1.5 font-bold text-slate-800">
                <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse shrink-0" />
                <span>{formatRealtimeClock(liveCurrentTime, true)}</span>
              </div>
              {lastSavedText ? (
                <span
                  className="text-[11px] text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200 font-semibold max-w-[170px] truncate"
                  title={`Thời gian lưu gần nhất: ${lastSavedText}`}
                >
                  Đã lưu: {lastSavedText}
                </span>
              ) : currentRecordId ? (
                <span className="text-[11px] text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded-md border border-emerald-200 font-semibold">
                  Đã liên kết
                </span>
              ) : null}
            </div>

            {/* Display Scale Controller & Fullscreen (Standardized h-9) */}
            <DisplayScaleController
              scale={uiScale}
              effectiveScale={effectiveScale}
              onScaleChange={onScaleChange}
              autoFit={autoFitScreen}
              onAutoFitChange={onAutoFitChange}
              isFullscreen={isFullscreen}
              onToggleFullscreen={onToggleFullscreen}
              onResetScale={onResetScale}
            />

            {/* Primary Action Button: Save / Update Backup */}
            <button
              type="button"
              onClick={onSaveOrUpdateBackup}
              className="h-9 inline-flex items-center gap-1.5 text-xs font-bold px-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl active:scale-95 transition-all shadow-xs hover:shadow-md border border-emerald-500/40 cursor-pointer shrink-0"
              title="Sao lưu tất cả dữ liệu: Đơn hàng, số phiếu kho, chứng từ ảnh & ghi chú nhắc hẹn"
            >
              <Database className="w-3.5 h-3.5 text-emerald-100 shrink-0" />
              <span>{currentRecordId ? "Lưu cập nhật" : "Sao lưu tất cả"}</span>
              <span className="hidden 2xl:inline-flex items-center gap-0.5 px-1 py-0.2 text-[9px] font-black bg-emerald-900/60 text-emerald-100 rounded border border-emerald-400/30 uppercase tracking-wider">
                <ShieldCheck className="w-2.5 h-2.5 text-emerald-200" />
                Toàn bộ
              </span>
            </button>

            {/* Download Full JSON Backup Button */}
            <button
              type="button"
              onClick={onComprehensiveFullBackup}
              className="h-9 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl active:scale-95 transition-all shadow-2xs cursor-pointer shrink-0"
              title="Tải file sao lưu toàn bộ (.JSON) bao gồm đơn hàng, nhắc hẹn, cấu hình mẫu in & lịch sử"
            >
              <Download className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
              <span className="hidden sm:inline">Sao lưu</span> .JSON
            </button>

            {/* Backup History Button */}
            <button
              type="button"
              onClick={onOpenBackupHistory}
              className="h-9 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 border border-emerald-200 hover:border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-xl active:bg-emerald-200 transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Xem danh sách các bản sao lưu đã lưu"
            >
              <FolderOpen className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Lịch sử</span>
              <span className="ml-0.5 px-1.5 py-0.2 bg-emerald-200 text-emerald-900 rounded-full text-[10px] font-black">
                {backupsCount}
              </span>
            </button>

            {/* New Session Button */}
            <button
              type="button"
              onClick={onStartNewSession}
              className="h-9 inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 sm:px-3 border border-slate-200 hover:border-slate-300 text-slate-700 bg-white hover:bg-slate-50 rounded-xl active:bg-slate-100 transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Tạo phiên nhập mới (dọn sạch các trang ảnh và chuẩn bị nhập mới)"
            >
              <PlusCircle className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
              <span>Tạo mới</span>
            </button>

            {/* Refresh App State Button */}
            <button
              type="button"
              onClick={onResetSession}
              className="h-9 w-9 inline-flex items-center justify-center border border-slate-200 hover:border-slate-300 text-slate-500 hover:text-slate-800 bg-white hover:bg-slate-50 rounded-xl active:bg-slate-100 transition-colors shadow-2xs cursor-pointer shrink-0"
              title="Làm mới trạng thái ứng dụng"
            >
              <RefreshCw className="w-3.5 h-3.5" />
            </button>

            {/* Collapse Toolbar Button: Thu gọn thanh công cụ để tăng diện tích làm việc */}
            {onToggleCollapse && (
              <button
                type="button"
                onClick={onToggleCollapse}
                className="h-9 inline-flex items-center gap-1.5 text-xs font-bold px-2.5 sm:px-3 border border-emerald-200 hover:border-emerald-300 text-emerald-800 hover:text-emerald-950 bg-emerald-50/80 hover:bg-emerald-100/80 rounded-xl active:scale-95 transition-all shadow-2xs cursor-pointer shrink-0"
                title="Thu gọn thanh công cụ trên cùng để tăng diện tích làm việc"
              >
                <ChevronUp className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                <span className="hidden sm:inline">Thu gọn</span>
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
