import React, { useState, useId, useEffect } from "react";
import {
  X,
  Search,
  FileCheck,
  Trash2,
  Download,
  Upload,
  FolderOpen,
  Save,
  RotateCcw,
  FileText,
  Layers,
  Sparkles,
  Clock,
  CheckCircle2,
  CalendarClock,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { BackupRecord } from "../types";
import { formatBackupDateTime, formatRealtimeClock, formatRelativeTime } from "../utils/dateUtils";
import { loadReminders } from "../utils/reminderStorage";
import {
  deleteBackup,
  exportBackupsToJson,
  exportComprehensiveFullBackup,
  exportSingleBackupToJson,
  importFullDataBackup,
  parseBackupJsonFile,
  saveBackupsList,
} from "../utils/backupStorage";

interface BackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  backups: BackupRecord[];
  onRefreshBackups: () => void;
  currentRecordId: string | null;
  onLoadRecord: (record: BackupRecord) => void;
  onUpdateCurrentRecordWithData?: (recordId: string) => void;
}

export default function BackupModal({
  isOpen,
  onClose,
  backups,
  onRefreshBackups,
  currentRecordId,
  onLoadRecord,
  onUpdateCurrentRecordWithData,
}: BackupModalProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [updateFeedbackMsg, setUpdateFeedbackMsg] = useState<string | null>(null);
  const [liveTime, setLiveTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const fileInputId = useId();

  if (!isOpen) return null;

  // Filter backups
  const filtered = backups.filter((record) => {
    const term = searchTerm.toLowerCase().trim();
    const matchDriver = (record.driverName || "").toLowerCase().includes(term);
    const matchCustomer = (record.customerName || "").toLowerCase().includes(term);
    const matchDate = (record.recordDate || "").includes(term);
    const matchNotes = (record.notes || "").toLowerCase().includes(term);
    const matchesSearch = !term || matchDriver || matchCustomer || matchDate || matchNotes;

    const matchesDateFilter = !dateFilter || record.recordDate === dateFilter;

    return matchesSearch && matchesDateFilter;
  });

  const handleDelete = (id: string) => {
    deleteBackup(id);
    onRefreshBackups();
    setConfirmDeleteId(null);
  };

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportError(null);
    setImportSuccess(null);

    try {
      const text = await file.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(text);
      } catch (jsonErr: any) {
        throw new Error("Tệp không đúng định dạng JSON: " + jsonErr.message);
      }

      // Check if it's a comprehensive backup package
      if (parsed && typeof parsed === "object" && (parsed.version?.includes("comprehensive") || parsed.printTemplate || parsed.quickMessages)) {
        const importRes = importFullDataBackup(parsed);
        if (importRes.success) {
          onRefreshBackups();
          setImportSuccess(importRes.summary);
          e.target.value = "";
          return;
        }
      }

      // Standard backup record array or single record fallback
      const importedRecords = await parseBackupJsonFile(file);
      if (importedRecords.length === 0) {
        throw new Error("Tệp không chứa bản ghi sao lưu nào.");
      }

      // Merge with existing
      const existing = [...backups];
      let addedCount = 0;
      let updatedCount = 0;

      importedRecords.forEach((imported) => {
        const idx = existing.findIndex((r) => r.id === imported.id);
        if (idx >= 0) {
          existing[idx] = imported;
          updatedCount++;
        } else {
          existing.unshift(imported);
          addedCount++;
        }
      });

      saveBackupsList(existing);
      onRefreshBackups();
      setImportSuccess(`Khôi phục thành công: Thêm mới ${addedCount}, cập nhật ${updatedCount} bản ghi.`);
      e.target.value = "";
    } catch (err: any) {
      setImportError(err.message || "Lỗi khi nhập tệp sao lưu.");
      e.target.value = "";
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-900/60 backdrop-blur-xs font-sans">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="bg-white rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl border border-gray-100 overflow-hidden"
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
              <FolderOpen className="w-5 h-5" />
            </span>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-base font-bold text-gray-900">Lịch Sử Sao Lưu Sổ Giao Hàng Kho</h3>
                <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 bg-white border border-emerald-200 rounded-lg text-xs font-mono text-emerald-800 shadow-2xs font-semibold">
                  <Clock className="w-3.5 h-3.5 text-emerald-600 animate-pulse" />
                  Thời gian thực: {formatRealtimeClock(liveTime, true)}
                </span>
              </div>
              <p className="text-xs text-gray-500">
                Quản lý các bản ghi số phiếu giao hàng kho, cập nhật và đồng bộ theo thời gian thực.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Update feedback banner */}
        {updateFeedbackMsg && (
          <div className="mx-4 mt-3 px-3 py-2 bg-emerald-100/90 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{updateFeedbackMsg}</span>
          </div>
        )}

        {/* Search, Filter & Actions Toolbar */}
        <div className="p-4 border-b border-gray-100 bg-white space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            {/* Search Box */}
            <div className="relative flex-1">
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Tìm theo người giao, khách hàng, khu vực, ngày hoặc ghi chú..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
              />
              {searchTerm && (
                <button
                  type="button"
                  onClick={() => setSearchTerm("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Date filter */}
            <div className="flex items-center gap-2">
              <div className="relative flex items-center">
                <input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="text-xs py-1.5 px-2.5 border border-gray-200 rounded-xl bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-gray-700"
                  title="Lọc theo ngày giao hàng"
                />
                {dateFilter && (
                  <button
                    type="button"
                    onClick={() => setDateFilter("")}
                    className="ml-1 text-[11px] text-gray-400 hover:text-gray-600 font-bold"
                    title="Xóa lọc ngày"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Import / Export tools */}
          <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  const res = exportComprehensiveFullBackup();
                  setImportSuccess(res.summary);
                }}
                className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                title="Tải về file JSON sao lưu toàn bộ: danh sách đơn hàng, ghi chú công việc, tùy chọn mẫu in, lời nhắn nhanh và tất cả các mục sao lưu trước đó"
              >
                <Download className="w-3.5 h-3.5 text-white" /> Xuất file sao lưu toàn bộ (.JSON)
              </button>

              <label
                htmlFor={fileInputId}
                className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded-lg transition-colors cursor-pointer border border-emerald-200/50"
                title="Khôi phục dữ liệu từ file JSON đã lưu"
              >
                <Upload className="w-3.5 h-3.5" /> Khôi phục từ file JSON
              </label>
              <input
                id={fileInputId}
                type="file"
                accept=".json,application/json"
                onChange={handleImportFile}
                className="hidden"
              />
            </div>

            {importSuccess && (
              <span className="text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {importSuccess}
              </span>
            )}
            {importError && (
              <span className="text-[11px] font-semibold text-red-600 bg-red-50 px-2 py-0.5 rounded border border-red-200">
                {importError}
              </span>
            )}
          </div>
        </div>

        {/* Backups List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-slate-50/50">
          {filtered.length === 0 ? (
            <div className="py-12 text-center text-gray-400">
              <FileCheck className="w-10 h-10 mx-auto mb-2 text-gray-300" />
              <p className="text-sm font-semibold text-gray-600">
                {backups.length === 0 ? "Chưa có bản ghi sao lưu nào" : "Không tìm thấy bản sao lưu phù hợp"}
              </p>
              <p className="text-xs text-gray-400 mt-1 max-w-sm mx-auto">
                {backups.length === 0
                  ? "Sau khi quét ảnh hoặc cập nhật số phiếu kho, nhấn 'Sao lưu dữ liệu' ở màn hình chính để lưu lại."
                  : "Thử thay đổi từ khóa tìm kiếm hoặc bỏ chọn lọc ngày."}
              </p>
            </div>
          ) : (
            filtered.map((record) => {
              const isCurrent = record.id === currentRecordId;
              const pagesList = record.pages || record.pages2 || record.pages1 || [];
              const numbersList = record.warehouseNumbers || record.image2Numbers || [];
              const totalNumbers = numbersList.length;

              const storedReminders = loadReminders();
              const recordReminders = Array.isArray(record.reminders)
                ? record.reminders
                : (record.id === "backup_default_latest" || isCurrent ? storedReminders : []);

              const matchedReminders = (!Array.isArray(record.reminders) && record.orders && record.orders.length > 0)
                ? storedReminders.filter((rem) =>
                    record.orders?.some(
                      (ord) =>
                        (rem.ticketNumber && Number(rem.ticketNumber) === ord.ticketNumber) ||
                        (rem.customerName && ord.customerName && rem.customerName.trim().toLowerCase() === ord.customerName.trim().toLowerCase())
                    )
                  )
                : [];

              const reminderCount = Array.isArray(record.reminders)
                ? record.reminders.length
                : (recordReminders.length > 0
                    ? recordReminders.length
                    : (matchedReminders.length > 0 ? matchedReminders.length : 0));

              return (
                <div
                  key={record.id}
                  className={`bg-white rounded-xl border transition-all p-4 ${
                    isCurrent
                      ? "border-emerald-500 shadow-sm ring-2 ring-emerald-500/10"
                      : "border-gray-200/80 hover:border-gray-300 shadow-xs"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-gray-100">
                    {/* Top line indicator */}
                    <div className="flex flex-wrap items-center gap-2">
                      {/* Current open badge */}
                      {isCurrent && (
                        <span className="text-[10px] font-bold px-2 py-0.5 bg-emerald-600 text-white rounded-md">
                          Đang mở
                        </span>
                      )}
                    </div>

                    {/* Total slips & status breakdown */}
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 bg-emerald-50 border border-emerald-200/80 px-2.5 py-1 rounded-lg">
                        <FileText className="w-3.5 h-3.5 text-emerald-600" />
                        {record.orders && record.orders.length > 0 ? record.orders.length : totalNumbers} đơn / số phiếu
                      </span>

                      {record.orders && record.orders.length > 0 && (
                        <div className="flex items-center gap-1 text-[11px] flex-wrap">
                          {record.orders.filter((o) => o.status === "delivered").length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-emerald-100/70 text-emerald-800 font-semibold">
                              {record.orders.filter((o) => o.status === "delivered").length} đã giao
                            </span>
                          )}
                          {record.orders.filter((o) => o.status === "delivering").length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-blue-100/70 text-blue-800 font-semibold">
                              {record.orders.filter((o) => o.status === "delivering").length} đang giao
                            </span>
                          )}
                          {/* Phía sau đang giao: Số lượng ghi chú công việc */}
                          <span
                            className={`px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1 ${
                              reminderCount > 0
                                ? "bg-amber-100 text-amber-900 border border-amber-200/80"
                                : "bg-slate-100 text-slate-600 border border-slate-200/60"
                            }`}
                            title={`Số lượng ghi chú công việc: ${reminderCount}`}
                          >
                            <CalendarClock className={`w-3 h-3 ${reminderCount > 0 ? "text-amber-700" : "text-slate-500"}`} />
                            {reminderCount} ghi chú công việc
                          </span>
                          {record.orders.filter((o) => o.status === "pending").length > 0 && (
                            <span className="px-1.5 py-0.5 rounded bg-amber-100/70 text-amber-800 font-semibold">
                              {record.orders.filter((o) => o.status === "pending").length} chờ giao
                            </span>
                          )}
                        </div>
                      )}

                      {(!record.orders || record.orders.length === 0) && (
                        <span
                          className={`px-1.5 py-0.5 rounded font-semibold inline-flex items-center gap-1 text-[11px] ${
                            reminderCount > 0
                              ? "bg-amber-100 text-amber-900 border border-amber-200/80"
                              : "bg-slate-100 text-slate-600 border border-slate-200/60"
                          }`}
                          title={`Số lượng ghi chú công việc: ${reminderCount}`}
                        >
                          <CalendarClock className={`w-3 h-3 ${reminderCount > 0 ? "text-amber-700" : "text-slate-500"}`} />
                          {reminderCount} ghi chú công việc
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Middle detail info */}
                  <div className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-xs text-gray-600">
                    <div className="flex flex-wrap items-center gap-4">
                      <span className="flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5 text-slate-400" />
                        Chứng từ: <strong className="text-gray-900">{pagesList.length}</strong> trang ảnh
                      </span>
                      {record.notes && (
                        <span className="text-gray-500 italic max-w-xs truncate" title={record.notes}>
                          "{record.notes}"
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px] text-gray-500 font-mono">
                      <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200">
                        <Clock className="w-3 h-3 text-emerald-600 shrink-0" />
                        Sao lưu lúc: <strong className="text-slate-900">{formatBackupDateTime(record.updatedAt || record.createdAt, true) || "Chưa có"}</strong>
                      </span>
                      {(record.updatedAt || record.createdAt) && (
                        <span className="text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded font-semibold border border-emerald-200/80">
                          {formatRelativeTime(record.updatedAt || record.createdAt)}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Actions row */}
                  <div className="pt-2 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          onLoadRecord(record);
                          onClose();
                        }}
                        className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs"
                      >
                        <FolderOpen className="w-3.5 h-3.5" /> Mở xem & Cập nhật
                      </button>

                      {isCurrent && onUpdateCurrentRecordWithData && (
                        <button
                          type="button"
                          onClick={() => {
                            onUpdateCurrentRecordWithData(record.id);
                            setUpdateFeedbackMsg(`Đã cập nhật bản sao lưu lúc ${formatBackupDateTime(new Date().toISOString(), true)} theo thời gian thực!`);
                            setTimeout(() => setUpdateFeedbackMsg(null), 3500);
                          }}
                          className="inline-flex items-center gap-1 text-xs font-bold px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200/60 rounded-lg transition-colors cursor-pointer"
                          title="Lưu lại toàn bộ thay đổi hiện tại vào bản ghi này theo thời gian thực"
                        >
                          <Save className="w-3.5 h-3.5" /> Cập nhật dữ liệu
                        </button>
                      )}

                      <button
                        type="button"
                        onClick={() => exportSingleBackupToJson(record)}
                        className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1.5 text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
                        title="Tải về file JSON của bản ghi này"
                      >
                        <Download className="w-3.5 h-3.5" /> Xuất tệp
                      </button>
                    </div>

                    <div>
                      {confirmDeleteId === record.id ? (
                        <div className="flex items-center gap-1.5">
                          <span className="text-[11px] text-red-600 font-bold">Xác nhận xóa?</span>
                          <button
                            type="button"
                            onClick={() => handleDelete(record.id)}
                            className="text-xs font-bold px-2 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition-colors"
                          >
                            Xóa
                          </button>
                          <button
                            type="button"
                            onClick={() => setConfirmDeleteId(null)}
                            className="text-xs font-semibold px-2 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                          >
                            Hủy
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(record.id)}
                          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors cursor-pointer"
                          title="Xóa bản ghi sao lưu này"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer info */}
        <div className="px-5 py-3 border-t border-gray-100 bg-white flex items-center justify-between text-xs text-gray-500">
          <div>
            Hiển thị <strong>{filtered.length}</strong> / <strong>{backups.length}</strong> bản ghi
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </motion.div>
    </div>
  );
}
