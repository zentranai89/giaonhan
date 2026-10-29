import React, { useState, useMemo, useEffect } from "react";
import {
  CalendarClock,
  PlusCircle,
  Search,
  Filter,
  ArrowLeft,
  ArrowUpDown,
  Download,
  Copy,
  Check,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Trash2,
  Edit2,
  FileText,
  User,
  Sparkles,
  ExternalLink,
  ChevronDown,
  X,
  Bell,
  Calendar,
  AlertCircle,
  Link as LinkIcon,
  RefreshCw,
  Building2,
  CreditCard,
  RotateCcw,
  AlertOctagon,
  Percent,
  Package,
} from "lucide-react";
import { ReminderNote, ReminderPriority, ReminderStatus, DeliveryOrder } from "../types";
import {
  loadReminders,
  saveReminders,
  saveOrUpdateReminder,
  deleteReminder,
  deleteMultipleReminders,
  batchUpdateReminderStatus,
  getReminderTimeStatus,
} from "../utils/reminderStorage";
import { formatDateDDMMYYYY, formatBackupDateTime } from "../utils/dateUtils";
import { getCustomerSuggestions } from "../utils/backupStorage";
import { getSupplierOptions, SupplierOptionItem } from "../utils/supplierBonusStorage";

interface ReminderNotesManagerProps {
  orders?: DeliveryOrder[];
  onBackToMain: () => void;
  onNavigateToOrder?: (ticketNumber: number | string) => void;
  prefillTicketNumber?: number | string;
  prefillCustomerName?: string;
  prefillVehicleNumber?: string;
  onRemindersChange?: () => void;
  onAutoBackupAllData?: (isNewReminder?: boolean) => void;
}

const PRIORITY_CONFIG: Record<
  ReminderPriority,
  { label: string; color: string; bg: string; border: string; badge: string; dot: string }
> = {
  supplier: {
    label: "Nhà Cung Cấp",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    badge: "bg-indigo-600 text-white",
    dot: "bg-indigo-600",
  },
  customer: {
    label: "Khách Hàng",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-600 text-white",
    dot: "bg-emerald-600",
  },
  other: {
    label: "Khác",
    color: "text-slate-700",
    bg: "bg-slate-100",
    border: "border-slate-300",
    badge: "bg-slate-600 text-white",
    dot: "bg-slate-500",
  },
  // Backward compatibility for previously saved records
  high: {
    label: "Nhà Cung Cấp",
    color: "text-indigo-700",
    bg: "bg-indigo-50",
    border: "border-indigo-200",
    badge: "bg-indigo-600 text-white",
    dot: "bg-indigo-600",
  },
  medium: {
    label: "Khách Hàng",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    badge: "bg-emerald-600 text-white",
    dot: "bg-emerald-600",
  },
  low: {
    label: "Khác",
    color: "text-slate-700",
    bg: "bg-slate-100",
    border: "border-slate-300",
    badge: "bg-slate-600 text-white",
    dot: "bg-slate-500",
  },
};

const STATUS_CONFIG: Record<
  ReminderStatus,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  pending: {
    label: "Chưa xử lý",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200",
    icon: Clock,
  },
  processing: {
    label: "Đang xử lý",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: RefreshCw,
  },
  reconciling: {
    label: "Đang xử lý",
    color: "text-blue-700",
    bg: "bg-blue-50",
    border: "border-blue-200",
    icon: RefreshCw,
  },
  cannot_process: {
    label: "Không xử lý được",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200",
    icon: AlertTriangle,
  },
  cancelled: {
    label: "Đã hủy",
    color: "text-slate-600",
    bg: "bg-slate-100",
    border: "border-slate-300",
    icon: XCircle,
  },
  completed: {
    label: "Hoàn thành",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200",
    icon: CheckCircle2,
  },
  overpaid: {
    label: "Thanh Toán Dư",
    color: "text-purple-700",
    bg: "bg-purple-50",
    border: "border-purple-200",
    icon: CreditCard,
  },
  returned: {
    label: "Trả Hàng",
    color: "text-orange-700",
    bg: "bg-orange-50",
    border: "border-orange-200",
    icon: RotateCcw,
  },
  debt_error: {
    label: "Sai Công Nợ",
    color: "text-red-700",
    bg: "bg-red-50",
    border: "border-red-200",
    icon: AlertOctagon,
  },
  discount: {
    label: "Chiết khấu",
    color: "text-sky-700",
    bg: "bg-sky-50",
    border: "border-sky-200",
    icon: Percent,
  },
  goods_receipt: {
    label: "Nhập Hàng",
    color: "text-teal-700",
    bg: "bg-teal-50",
    border: "border-teal-200",
    icon: Package,
  },
};

export const ReminderNotesManager: React.FC<ReminderNotesManagerProps> = ({
  orders = [],
  onBackToMain,
  onNavigateToOrder,
  prefillTicketNumber,
  prefillCustomerName,
  prefillVehicleNumber,
  onRemindersChange,
  onAutoBackupAllData,
}) => {
  const [reminders, setReminders] = useState<ReminderNote[]>(() => loadReminders());

  // In-app Delete Confirmation Modal State (replaces problematic window.confirm)
  const [deleteConfirmTarget, setDeleteConfirmTarget] = useState<{
    type: "single" | "batch";
    id?: string;
    title?: string;
    count?: number;
    ticketNumber?: number | string;
    appointmentDate?: string;
  } | null>(null);

  // Search & Filters
  const [searchTerm, setSearchTerm] = useState("");
  // Multi-select status filter (cho phép tích chọn 1 hoặc nhiều mục trạng thái)
  const [selectedStatuses, setSelectedStatuses] = useState<ReminderStatus[]>([]);
  const [isTodayOverdueFilter, setIsTodayOverdueFilter] = useState(false);
  const [dateFilter, setDateFilter] = useState<"all" | "today" | "upcoming7" | "specific">("all");
  const [specificDate, setSpecificDate] = useState("");
  // Multi-select priority/classification filter (cho phép tích chọn 1 hoặc nhiều phân loại)
  const [selectedPriorities, setSelectedPriorities] = useState<ReminderPriority[]>([]);
  const [sortBy, setSortBy] = useState<"dateAsc" | "dateDesc" | "priority" | "createdAt">("dateAsc");

  // Toggle 1 trạng thái trong bộ lọc (hỗ trợ tích chọn đồng thời nhiều trạng thái)
  const toggleStatusFilter = (st: ReminderStatus) => {
    setSelectedStatuses((prev) =>
      prev.includes(st) ? prev.filter((item) => item !== st) : [...prev, st]
    );
  };

  // Reset về tất cả trạng thái
  const handleSelectAllStatuses = () => {
    setSelectedStatuses([]);
    setIsTodayOverdueFilter(false);
  };

  // Toggle 1 phân loại trong bộ lọc
  const togglePriorityFilter = (p: ReminderPriority) => {
    setSelectedPriorities((prev) =>
      prev.includes(p) ? prev.filter((item) => item !== p) : [...prev, p]
    );
  };

  // Selection
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingReminder, setEditingReminder] = useState<ReminderNote | null>(null);
  const [isDuplicateMode, setIsDuplicateMode] = useState(false);
  const [sourceReminder, setSourceReminder] = useState<ReminderNote | null>(null);

  // Toast / Copy notification
  const [toastMsg, setToastMsg] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setTimeout(() => {
      setToastMsg((prev) => (prev === msg ? null : prev));
    }, 3000);
  };

  // Form states for Add/Edit Modal
  const [formTitle, setFormTitle] = useState("");
  const [formDate, setFormDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [formTime, setFormTime] = useState("");
  const [formCustomer, setFormCustomer] = useState("");
  const [formTicket, setFormTicket] = useState<string>("");
  const [formPriority, setFormPriority] = useState<ReminderPriority>("customer");
  const [formStatus, setFormStatus] = useState<ReminderStatus>("pending");
  const [formNotes, setFormNotes] = useState("");

  // Quick ticket editing state directly on table row
  const [editingTicketId, setEditingTicketId] = useState<string | null>(null);
  const [editingTicketValue, setEditingTicketValue] = useState("");

  // 1. Danh sách Nhà Cung Cấp lấy từ THƯỞNG & CHIẾT KHẤU NHÀ CUNG CẤP
  const supplierOptions = useMemo<SupplierOptionItem[]>(() => {
    return getSupplierOptions();
  }, [isModalOpen]);

  // 2. Danh sách Khách Hàng lấy từ THEO DÕI GIAO NHẬN (orders) kết hợp sao lưu
  const deliveryCustomerSuggestions = useMemo<string[]>(() => {
    const list: string[] = [];
    const seen = new Set<string>();

    // Ưu tiên khách hàng từ danh sách đơn hàng thực tế trong THEO DÕI GIAO NHẬN
    if (Array.isArray(orders)) {
      orders.forEach((o) => {
        if (o.customerName && o.customerName.trim()) {
          const name = o.customerName.trim();
          const lower = name.toLowerCase();
          if (!seen.has(lower)) {
            seen.add(lower);
            list.push(name);
          }
        }
      });
    }

    // Bổ sung các khách hàng đã lưu từ trước
    const backupCust = getCustomerSuggestions();
    backupCust.forEach((name) => {
      if (name && name.trim()) {
        const trimmed = name.trim();
        const lower = trimmed.toLowerCase();
        if (!seen.has(lower)) {
          seen.add(lower);
          list.push(trimmed);
        }
      }
    });

    return list.sort((a, b) => a.localeCompare(b, "vi"));
  }, [orders, isModalOpen]);

  // Tương thích ngược
  const customerSuggestions = deliveryCustomerSuggestions;

  // 3. Số phiếu đơn hàng liên kết của khách hàng đang chọn trong THEO DÕI GIAO NHẬN
  const customerLinkedTickets = useMemo(() => {
    if (!formCustomer.trim() || !Array.isArray(orders)) return [];
    const lowerCust = formCustomer.trim().toLowerCase();
    const matchedTickets: Array<number | string> = [];
    orders.forEach((o) => {
      if (o.customerName && o.customerName.trim().toLowerCase() === lowerCust && o.ticketNumber !== undefined) {
        if (!matchedTickets.includes(o.ticketNumber)) {
          matchedTickets.push(o.ticketNumber);
        }
      }
    });
    return matchedTickets;
  }, [orders, formCustomer]);

  // If prefilled props passed from main page (e.g. clicking "Tạo nhắc hẹn" from order row)
  useEffect(() => {
    if (prefillTicketNumber || prefillCustomerName) {
      setFormTitle(`Nhắc hẹn đơn #${prefillTicketNumber || ""} - ${prefillCustomerName || ""}`);
      setFormTicket(prefillTicketNumber ? String(prefillTicketNumber) : "");
      setFormCustomer(prefillCustomerName || "");
      setFormDate(new Date().toISOString().slice(0, 10));
      setEditingReminder(null);
      setIsModalOpen(true);
    }
  }, [prefillTicketNumber, prefillCustomerName]);

  // Calculate high-level metrics
  const todayStr = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const stats = useMemo(() => {
    let todayCount = 0;
    let overdueCount = 0;
    let pendingCount = 0;
    let processingCount = 0;
    let cannotProcessCount = 0;
    let cancelledCount = 0;
    let completedCount = 0;
    let overpaidCount = 0;
    let returnedCount = 0;
    let debtErrorCount = 0;
    let discountCount = 0;
    let goodsReceiptCount = 0;
    let supplierCount = 0;
    let customerCount = 0;
    let otherCount = 0;

    reminders.forEach((r) => {
      const p =
        r.priority === "high"
          ? "supplier"
          : r.priority === "medium"
          ? "customer"
          : r.priority === "low"
          ? "other"
          : r.priority;

      if (p === "supplier") supplierCount++;
      else if (p === "customer") customerCount++;
      else otherCount++;

      const st = r.status === "reconciling" ? "processing" : r.status;
      if (st === "completed") {
        completedCount++;
      } else if (st === "cancelled") {
        cancelledCount++;
      } else if (st === "processing") {
        processingCount++;
        if (r.appointmentDate && r.appointmentDate < todayStr) overdueCount++;
        else if (r.appointmentDate && r.appointmentDate === todayStr) todayCount++;
      } else if (st === "cannot_process") {
        cannotProcessCount++;
        if (r.appointmentDate && r.appointmentDate < todayStr) overdueCount++;
        else if (r.appointmentDate && r.appointmentDate === todayStr) todayCount++;
      } else if (st === "overpaid") {
        overpaidCount++;
        if (r.appointmentDate && r.appointmentDate < todayStr) overdueCount++;
        else if (r.appointmentDate && r.appointmentDate === todayStr) todayCount++;
      } else if (st === "returned") {
        returnedCount++;
        if (r.appointmentDate && r.appointmentDate < todayStr) overdueCount++;
        else if (r.appointmentDate && r.appointmentDate === todayStr) todayCount++;
      } else if (st === "debt_error") {
        debtErrorCount++;
        if (r.appointmentDate && r.appointmentDate < todayStr) overdueCount++;
        else if (r.appointmentDate && r.appointmentDate === todayStr) todayCount++;
      } else if (st === "discount") {
        discountCount++;
        if (r.appointmentDate && r.appointmentDate < todayStr) overdueCount++;
        else if (r.appointmentDate && r.appointmentDate === todayStr) todayCount++;
      } else if (st === "goods_receipt") {
        goodsReceiptCount++;
        if (r.appointmentDate && r.appointmentDate < todayStr) overdueCount++;
        else if (r.appointmentDate && r.appointmentDate === todayStr) todayCount++;
      } else {
        pendingCount++;
        if (r.appointmentDate && r.appointmentDate < todayStr) overdueCount++;
        else if (r.appointmentDate && r.appointmentDate === todayStr) todayCount++;
      }
    });

    return {
      total: reminders.length,
      today: todayCount,
      overdue: overdueCount,
      pending: pendingCount,
      processing: processingCount,
      reconciling: processingCount,
      cannotProcess: cannotProcessCount,
      cancelled: cancelledCount,
      completed: completedCount,
      overpaid: overpaidCount,
      returned: returnedCount,
      debtError: debtErrorCount,
      discount: discountCount,
      goodsReceipt: goodsReceiptCount,
      supplier: supplierCount,
      customer: customerCount,
      other: otherCount,
    };
  }, [reminders, todayStr]);

  // Open modal for new reminder
  const handleOpenAddModal = () => {
    setEditingReminder(null);
    setIsDuplicateMode(false);
    setSourceReminder(null);
    setFormTitle("");
    setFormDate(new Date().toISOString().slice(0, 10));
    setFormTime("");
    setFormCustomer("");
    setFormTicket("");
    setFormPriority("customer");
    setFormStatus("pending");
    setFormNotes("");
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEditModal = (rem: ReminderNote) => {
    setEditingReminder(rem);
    setIsDuplicateMode(false);
    setSourceReminder(null);
    setFormTitle(rem.title);
    setFormDate(rem.appointmentDate);
    setFormTime(rem.appointmentTime || "");
    setFormCustomer(rem.customerName || "");
    const normPriority: ReminderPriority =
      rem.priority === "high"
        ? "supplier"
        : rem.priority === "medium"
        ? "customer"
        : rem.priority === "low"
        ? "other"
        : rem.priority || "customer";
    setFormPriority(normPriority);
    setFormTicket(rem.ticketNumber !== undefined ? String(rem.ticketNumber) : "");
    setFormStatus(rem.status);
    setFormNotes(rem.notes || "");
    setIsModalOpen(true);
  };

  // Save current form as a brand new duplicated note (from inside edit modal) without overwriting the old note/file
  const handleSaveAsNewDuplicateFromEdit = () => {
    if (!formTitle.trim()) {
      showToast("Vui lòng nhập Nội Dung Công Việc.");
      return;
    }
    const newId = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const nowIso = new Date().toISOString();
    const baseTitle = formTitle.trim().replace(/\s*\(Bản sao.*?\)/gi, "").trim();
    const parsedTicket = formTicket.trim() || undefined;
    const newTitle = formTitle.includes("(Bản sao)") ? formTitle.trim() : `${baseTitle} (Bản sao)`;

    const payload: ReminderNote = {
      id: newId,
      title: newTitle,
      appointmentDate: formDate.trim() || "",
      appointmentTime: formTime.trim() || undefined,
      customerName: formCustomer.trim() || undefined,
      ticketNumber: parsedTicket,
      priority: formPriority,
      status: formStatus,
      notes: formNotes.trim() || undefined,
      createdAt: nowIso,
      updatedAt: nowIso,
      completedAt: formStatus === "completed" ? nowIso : undefined,
    };

    saveOrUpdateReminder(payload);
    setReminders(loadReminders());
    onRemindersChange?.();
    setIsModalOpen(false);
    setEditingReminder(null);
    setIsDuplicateMode(false);
    setSourceReminder(null);

    if (onAutoBackupAllData) {
      onAutoBackupAllData(true);
    }

    const timeFormatted = formatBackupDateTime(nowIso, true);
    showToast(`Đã tạo ghi chú mới "${payload.title}" thành công (${timeFormatted}) - Ghi chú/file cũ được giữ nguyên vẹn!`);
  };

  // Submit Add, Edit or Duplicate
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast("Vui lòng nhập Nội Dung Công Việc.");
      return;
    }

    // In duplicate mode or add mode: ALWAYS generate a brand new unique ID so it NEVER overwrites any existing note
    const isNew = !editingReminder || isDuplicateMode;
    const nowIso = new Date().toISOString();
    const newId = `rem_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

    const parsedTicket = formTicket.trim() || undefined;

    const payload: ReminderNote = {
      id: isNew ? newId : editingReminder!.id,
      title: formTitle.trim(),
      appointmentDate: formDate.trim() || "",
      appointmentTime: formTime.trim() || undefined,
      customerName: formCustomer.trim() || undefined,
      ticketNumber: parsedTicket,
      priority: formPriority,
      status: formStatus,
      notes: formNotes.trim() || undefined,
      createdAt: isNew ? nowIso : (editingReminder?.createdAt || nowIso),
      updatedAt: nowIso,
      completedAt: formStatus === "completed" ? (isNew ? nowIso : (editingReminder?.completedAt || nowIso)) : undefined,
    };

    saveOrUpdateReminder(payload);
    const updatedList = loadReminders();
    setReminders(updatedList);
    onRemindersChange?.();
    setIsModalOpen(false);

    const wasDuplicate = isDuplicateMode;
    setIsDuplicateMode(false);
    setSourceReminder(null);
    setEditingReminder(null);

    if (onAutoBackupAllData) {
      onAutoBackupAllData(isNew);
    }

    const timeFormatted = formatBackupDateTime(nowIso, true);
    if (wasDuplicate) {
      showToast(`Đã nhân bản & tạo ghi chú mới "${payload.title}" (${timeFormatted}) - Tuyệt đối không ghi đè lên file/ghi chú cũ!`);
    } else if (isNew) {
      showToast(`Đã thêm nhắc hẹn mới & tự động sao lưu toàn bộ dữ liệu (${timeFormatted})!`);
    } else {
      showToast(`Đã cập nhật ghi chú nhắc hẹn & sao lưu dữ liệu (${timeFormatted})!`);
    }
  };

  // Quick direct status setter
  const handleSetStatus = (rem: ReminderNote, nextStatus: ReminderStatus) => {
    const now = new Date().toISOString();
    const updated: ReminderNote = {
      ...rem,
      status: nextStatus,
      updatedAt: now,
      completedAt: nextStatus === "completed" ? (rem.completedAt || now) : undefined,
    };
    saveOrUpdateReminder(updated);
    setReminders(loadReminders());
    onRemindersChange?.();
    onAutoBackupAllData?.(false);
    showToast(`Đã chuyển trạng thái: "${STATUS_CONFIG[nextStatus]?.label || nextStatus}"`);
  };

  const STATUS_CYCLE_ORDER: ReminderStatus[] = [
    "pending",
    "processing",
    "cannot_process",
    "overpaid",
    "returned",
    "debt_error",
    "discount",
    "goods_receipt",
    "cancelled",
    "completed",
  ];

  // Quick cycle status on row: Chưa xử lý ➔ Đang xử lý ➔ Không xử lý được ➔ Thanh Toán Dư ➔ Trả Hàng ➔ Sai Công Nợ ➔ Chiết khấu ➔ Nhập Hàng ➔ Đã hủy ➔ Hoàn thành
  const handleCycleStatus = (rem: ReminderNote) => {
    const current = rem.status === "reconciling" ? "processing" : rem.status;
    const curIdx = STATUS_CYCLE_ORDER.indexOf(current);
    const nextStatus =
      curIdx >= 0 && curIdx < STATUS_CYCLE_ORDER.length - 1
        ? STATUS_CYCLE_ORDER[curIdx + 1]
        : STATUS_CYCLE_ORDER[0];
    handleSetStatus(rem, nextStatus);
  };

  // Quick 1-click toggle complete / reopen
  const handleToggleComplete = (rem: ReminderNote) => {
    const nextStatus: ReminderStatus = rem.status === "completed" ? "pending" : "completed";
    handleSetStatus(rem, nextStatus);
  };

  // Quick inline save of ticket number directly from table row
  const handleSaveInlineTicket = (rem: ReminderNote) => {
    const trimmed = editingTicketValue.trim();
    const val = trimmed || undefined;
    const nowIso = new Date().toISOString();
    const updated: ReminderNote = {
      ...rem,
      ticketNumber: val,
      updatedAt: nowIso,
    };
    saveOrUpdateReminder(updated);
    setReminders(loadReminders());
    onRemindersChange?.();
    onAutoBackupAllData?.(false);
    setEditingTicketId(null);
    if (val !== undefined) {
      showToast(`Đã lưu số phiếu "${val}" thành công!`);
    } else {
      showToast("Đã xóa số phiếu.");
    }
  };

  // Single Delete (opens in-app confirmation modal)
  const handleDeleteReminder = (rem: ReminderNote) => {
    setDeleteConfirmTarget({
      type: "single",
      id: rem.id,
      title: rem.title,
      ticketNumber: rem.ticketNumber,
      appointmentDate: rem.appointmentDate,
      count: 1,
    });
  };

  // Batch Delete (opens in-app confirmation modal)
  const handleBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setDeleteConfirmTarget({
      type: "batch",
      count: selectedIds.length,
    });
  };

  // Confirm delete execution (no popup blockers, perfectly safe in iframe)
  const handleExecuteDelete = () => {
    if (!deleteConfirmTarget) return;

    if (deleteConfirmTarget.type === "single" && deleteConfirmTarget.id) {
      const targetId = deleteConfirmTarget.id;
      const targetTitle = deleteConfirmTarget.title;
      deleteReminder(targetId);
      const updated = loadReminders();
      setReminders(updated);
      setSelectedIds((prev) => prev.filter((item) => item !== targetId));
      onRemindersChange?.();
      onAutoBackupAllData?.(false);
      showToast(`Đã xóa thành công nhắc hẹn "${targetTitle || ''}".`);
    } else if (deleteConfirmTarget.type === "batch" && selectedIds.length > 0) {
      const count = selectedIds.length;
      deleteMultipleReminders(selectedIds);
      const updated = loadReminders();
      setReminders(updated);
      setSelectedIds([]);
      onRemindersChange?.();
      onAutoBackupAllData?.(false);
      showToast(`Đã xóa thành công ${count} nhắc hẹn đã chọn.`);
    }

    setDeleteConfirmTarget(null);
  };

  // Batch Status Update
  const handleBatchStatus = (status: ReminderStatus) => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    batchUpdateReminderStatus(selectedIds, status);
    setReminders(loadReminders());
    setSelectedIds([]); // Auto deselect after batch update
    onRemindersChange?.();
    onAutoBackupAllData?.(false);
    showToast(`Đã cập nhật trạng thái cho ${count} nhắc hẹn.`);
  };

  // Duplicate single reminder note: open modal prefilled with old data in dedicated duplicate mode
  const handleDuplicateReminder = (rem: ReminderNote) => {
    setEditingReminder(null); // CRITICAL: null ensures NO OVERWRITE of original note
    setIsDuplicateMode(true);
    setSourceReminder(rem);
    const baseTitle = rem.title.replace(/\s*\(Bản sao.*?\)/gi, "").trim();
    setFormTitle(`${baseTitle} (Bản sao)`);
    setFormDate(rem.appointmentDate || todayStr);
    setFormTime(rem.appointmentTime || "");
    setFormCustomer(rem.customerName || "");
    const normPriority: ReminderPriority =
      rem.priority === "high"
        ? "supplier"
        : rem.priority === "medium"
        ? "customer"
        : rem.priority === "low"
        ? "other"
        : rem.priority || "customer";
    setFormPriority(normPriority);
    setFormTicket(rem.ticketNumber !== undefined ? String(rem.ticketNumber) : "");
    setFormStatus(rem.status || "pending");
    setFormNotes(rem.notes || "");
    setIsModalOpen(true);
  };

  // Duplicate multiple selected reminder notes
  const handleBatchDuplicate = () => {
    if (selectedIds.length === 0) return;
    const toDuplicate = reminders.filter((r) => selectedIds.includes(r.id));
    const now = Date.now();
    toDuplicate.forEach((rem, idx) => {
      const baseTitle = rem.title.replace(/\s*\(Bản sao.*?\)/gi, "").trim();
      const duplicated: ReminderNote = {
        ...rem,
        id: `rem_${now}_${idx}_${Math.random().toString(36).substring(2, 7)}`,
        title: `${baseTitle} (Bản sao)`,
        createdAt: new Date().toISOString(),
        updatedAt: undefined,
      };
      saveOrUpdateReminder(duplicated);
    });
    const count = toDuplicate.length;
    setReminders(loadReminders());
    setSelectedIds([]); // Auto deselect after batch duplicate
    onRemindersChange?.();
    onAutoBackupAllData?.(true);
    showToast(`Đã nhân bản thành công ${count} ghi chú mới (Tạo riêng biệt, không ghi đè lên file/ghi chú cũ).`);
  };

  // Selection handlers
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.checked) {
      setSelectedIds(filteredReminders.map((r) => r.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]));
  };

  // Filter and sort list
  const filteredReminders = useMemo(() => {
    let list = [...reminders];

    // Status multi-selection filter (tích chọn 1 hoặc nhiều trạng thái cùng lúc)
    if (selectedStatuses.length > 0) {
      list = list.filter((r) => {
        const normStatus = r.status === "reconciling" ? "processing" : r.status;
        return (
          selectedStatuses.includes(r.status) ||
          selectedStatuses.includes(normStatus as ReminderStatus)
        );
      });
    }

    // Today / Overdue filter
    if (isTodayOverdueFilter) {
      list = list.filter(
        (r) =>
          r.status !== "completed" &&
          r.status !== "cancelled" &&
          Boolean(r.appointmentDate && r.appointmentDate <= todayStr)
      );
    }

    // Priority / Classification filter (Phân Loại - hỗ trợ tích chọn 1 hoặc nhiều)
    if (selectedPriorities.length > 0) {
      list = list.filter((r) => {
        const p =
          r.priority === "high"
            ? "supplier"
            : r.priority === "medium"
            ? "customer"
            : r.priority === "low"
            ? "other"
            : r.priority;
        return selectedPriorities.includes(p as ReminderPriority);
      });
    }

    // Date filter
    if (dateFilter === "today") {
      list = list.filter((r) => r.appointmentDate === todayStr);
    } else if (dateFilter === "upcoming7") {
      const in7Days = new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10);
      list = list.filter((r) => Boolean(r.appointmentDate && r.appointmentDate >= todayStr && r.appointmentDate <= in7Days));
    } else if (dateFilter === "specific" && specificDate) {
      list = list.filter((r) => r.appointmentDate === specificDate);
    }

    // Search term
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase().trim();
      list = list.filter((r) => {
        return (
          r.title.toLowerCase().includes(term) ||
          (r.customerName && r.customerName.toLowerCase().includes(term)) ||
          (r.notes && r.notes.toLowerCase().includes(term)) ||
          (r.ticketNumber !== undefined && String(r.ticketNumber).toLowerCase().includes(term))
        );
      });
    }

    // Sorting
    list.sort((a, b) => {
      if (sortBy === "dateAsc") {
        if (!a.appointmentDate && !b.appointmentDate) return 0;
        if (!a.appointmentDate) return 1;
        if (!b.appointmentDate) return -1;
        const timeA = `${a.appointmentDate} ${a.appointmentTime || "00:00"}`;
        const timeB = `${b.appointmentDate} ${b.appointmentTime || "00:00"}`;
        return timeA.localeCompare(timeB);
      } else if (sortBy === "dateDesc") {
        if (!a.appointmentDate && !b.appointmentDate) return 0;
        if (!a.appointmentDate) return 1;
        if (!b.appointmentDate) return -1;
        const timeA = `${a.appointmentDate} ${a.appointmentTime || "00:00"}`;
        const timeB = `${b.appointmentDate} ${b.appointmentTime || "00:00"}`;
        return timeB.localeCompare(timeA);
      } else if (sortBy === "priority") {
        const pOrder: Record<string, number> = {
          supplier: 1,
          customer: 2,
          other: 3,
          high: 1,
          medium: 2,
          low: 3,
        };
        const orderA = pOrder[a.priority] || 99;
        const orderB = pOrder[b.priority] || 99;
        return orderA - orderB;
      } else {
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    return list;
  }, [reminders, selectedStatuses, isTodayOverdueFilter, selectedPriorities, dateFilter, specificDate, searchTerm, sortBy, todayStr]);

  // Export to CSV
  const handleExportCSV = () => {
    if (filteredReminders.length === 0) {
      showToast("Không có dữ liệu nhắc hẹn để xuất.");
      return;
    }

    const headers = [
      "STT",
      "Nội Dung Công Việc",
      "Ngày hẹn",
      "Giờ hẹn",
      "Phân Loại",
      "Trạng thái",
      "Khách hàng",
      "Số phiếu",
      "Ghi chú",
      "Ngày tạo",
    ];

    const rows = filteredReminders.map((r, idx) => [
      idx + 1,
      `"${(r.title || "").replace(/"/g, '""')}"`,
      formatDateDDMMYYYY(r.appointmentDate),
      r.appointmentTime || "",
      PRIORITY_CONFIG[r.priority]?.label || r.priority,
      STATUS_CONFIG[r.status]?.label || r.status,
      `"${(r.customerName || "").replace(/"/g, '""')}"`,
      r.ticketNumber || "",
      `"${(r.notes || "").replace(/"/g, '""')}"`,
      formatBackupDateTime(r.createdAt),
    ]);

    const csvContent = "\uFEFF" + [headers.join(","), ...rows.map((e) => e.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `ghi_chu_cong_viec_${todayStr}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    showToast("Đã xuất file Excel/CSV danh sách công việc!");
  };

  // Copy to clipboard
  const handleCopyList = () => {
    if (filteredReminders.length === 0) {
      showToast("Danh sách trống!");
      return;
    }

    const text = filteredReminders
      .map((r, i) => {
        const timeStr = r.appointmentTime ? `${r.appointmentTime} - ` : "";
        const dateStr = r.appointmentDate ? formatDateDDMMYYYY(r.appointmentDate) : "Chưa hẹn ngày";
        const prioStr = r.priority ? `[${PRIORITY_CONFIG[r.priority]?.label || r.priority}] ` : "";
        const custStr = r.customerName ? ` (Khách: ${r.customerName})` : "";
        const ticketStr = r.ticketNumber ? ` [Số phiếu: ${r.ticketNumber}]` : "";
        return `${i + 1}. ${prioStr}${r.title} | Hẹn: ${timeStr}${dateStr}${custStr}${ticketStr} | Trạng thái: ${
          STATUS_CONFIG[r.status]?.label
        }`;
      })
      .join("\n");

    navigator.clipboard.writeText(text).then(
      () => showToast("Đã sao chép danh sách nhắc hẹn vào clipboard!"),
      () => showToast("Không thể sao chép, vui lòng cấp quyền clipboard.")
    );
  };

  return (
    <div className="space-y-4">
      {/* Toast Notification */}
      {toastMsg && (
        <div className="fixed top-5 right-5 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-xl text-xs font-semibold flex items-center gap-2 border border-slate-700 animate-in fade-in slide-in-from-top-2">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMsg}</span>
        </div>
      )}

      {/* Main Section Header Card */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-4 sm:p-5">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="p-2.5 bg-gradient-to-br from-amber-500 to-orange-600 rounded-xl text-white shadow-md shadow-amber-500/20">
              <CalendarClock className="w-6 h-6" />
            </span>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-lg sm:text-xl font-bold text-gray-900 tracking-tight">
                  DANH SÁCH GHI CHÚ CÔNG VIỆC
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-100 text-amber-900 border border-amber-200">
                  {reminders.length} ghi chú
                </span>
                {stats.overdue > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-rose-500 text-white flex items-center gap-1 animate-pulse">
                    <AlertTriangle className="w-3 h-3" />
                    Quá hạn: {stats.overdue}
                  </span>
                )}
                {stats.today > 0 && (
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-amber-500 text-white flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    Hôm nay: {stats.today}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Action buttons: Link to Main page, Add, Export, Copy */}
          <div className="flex flex-wrap items-center gap-2 self-stretch md:self-auto justify-end">
            <button
              type="button"
              onClick={onBackToMain}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-lg active:scale-98 transition-all shadow-xs cursor-pointer"
              title="Quay về trang Quản Lý Giao Hàng & Số Phiếu Kho"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Quay lại trang chính
            </button>

            <button
              type="button"
              onClick={handleOpenAddModal}
              className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg active:bg-amber-800 transition-all shadow-xs cursor-pointer"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Thêm nhắc hẹn
            </button>

            <button
              type="button"
              onClick={handleCopyList}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border border-gray-200 hover:border-gray-300 text-gray-700 bg-white hover:bg-gray-50 rounded-lg active:bg-gray-100 transition-colors shadow-2xs cursor-pointer"
              title="Sao chép danh sách nhắc hẹn đang lọc"
            >
              <Copy className="w-3.5 h-3.5 text-gray-600" />
              Sao chép
            </button>

            <button
              type="button"
              onClick={handleExportCSV}
              className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 border border-emerald-200 hover:border-emerald-300 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 rounded-lg active:bg-emerald-200 transition-colors shadow-2xs cursor-pointer"
              title="Xuất danh sách ra file Excel/CSV"
            >
              <Download className="w-3.5 h-3.5 text-emerald-600" />
              Xuất Excel
            </button>
          </div>
        </div>

        {/* Quick Filter Tabs - Tích chọn 1 hoặc nhiều mục trạng thái */}
        <div className="mt-4 pt-4 border-t border-gray-100 flex flex-wrap items-center gap-1.5">
          <div className="flex items-center gap-1 mr-1 text-gray-400 select-none">
            <Filter className="w-3.5 h-3.5 text-gray-400" />
            <span className="text-[11px] font-semibold hidden sm:inline text-gray-500">Lọc trạng thái:</span>
          </div>

          <button
            type="button"
            onClick={handleSelectAllStatuses}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
              selectedStatuses.length === 0 && !isTodayOverdueFilter
                ? "bg-slate-900 text-white shadow-xs"
                : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
            }`}
            title="Bấm để hiển thị tất cả trạng thái"
          >
            <span
              className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                selectedStatuses.length === 0 && !isTodayOverdueFilter
                  ? "bg-white text-slate-900 font-bold"
                  : "border border-slate-400 bg-white"
              }`}
            >
              {selectedStatuses.length === 0 && !isTodayOverdueFilter && (
                <Check className="w-2.5 h-2.5 stroke-[3]" />
              )}
            </span>
            Tất cả ({reminders.length})
          </button>

          {(stats.today > 0 || stats.overdue > 0) && (
            <button
              type="button"
              onClick={() => setIsTodayOverdueFilter((prev) => !prev)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                isTodayOverdueFilter
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200"
              }`}
              title="Tích chọn để lọc Hôm nay & Quá hạn"
            >
              <span
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                  isTodayOverdueFilter
                    ? "bg-white text-rose-700 font-bold"
                    : "border border-rose-300 bg-white"
                }`}
              >
                {isTodayOverdueFilter && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
              <AlertTriangle className="w-3.5 h-3.5" />
              Hôm nay & Quá hạn ({stats.today + stats.overdue})
            </button>
          )}

          {(stats.pending > 0 || selectedStatuses.includes("pending")) && (
            <button
              type="button"
              onClick={() => toggleStatusFilter("pending")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedStatuses.includes("pending")
                  ? "bg-amber-600 text-white shadow-xs"
                  : "bg-amber-50 text-amber-800 hover:bg-amber-100 border border-amber-200/80"
              }`}
              title="Tích chọn để lọc Chưa xử lý"
            >
              <span
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                  selectedStatuses.includes("pending")
                    ? "bg-white text-amber-700 font-bold"
                    : "border border-amber-400 bg-white"
                }`}
              >
                {selectedStatuses.includes("pending") && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
              <Clock className="w-3.5 h-3.5" />
              Chưa xử lý ({stats.pending})
            </button>
          )}

          {(stats.processing > 0 || selectedStatuses.includes("processing") || selectedStatuses.includes("reconciling")) && (
            <button
              type="button"
              onClick={() => toggleStatusFilter("processing")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedStatuses.includes("processing") || selectedStatuses.includes("reconciling")
                  ? "bg-blue-600 text-white shadow-xs"
                  : "bg-blue-50 text-blue-800 hover:bg-blue-100 border border-blue-200/80"
              }`}
              title="Tích chọn để lọc Đang xử lý"
            >
              <span
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                  selectedStatuses.includes("processing") || selectedStatuses.includes("reconciling")
                    ? "bg-white text-blue-700 font-bold"
                    : "border border-blue-400 bg-white"
                }`}
              >
                {(selectedStatuses.includes("processing") || selectedStatuses.includes("reconciling")) && (
                  <Check className="w-2.5 h-2.5 stroke-[3]" />
                )}
              </span>
              <RefreshCw className="w-3.5 h-3.5" />
              Đang xử lý ({stats.processing})
            </button>
          )}

          {(stats.cannotProcess > 0 || selectedStatuses.includes("cannot_process")) && (
            <button
              type="button"
              onClick={() => toggleStatusFilter("cannot_process")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedStatuses.includes("cannot_process")
                  ? "bg-rose-600 text-white shadow-xs"
                  : "bg-rose-50 text-rose-800 hover:bg-rose-100 border border-rose-200/80"
              }`}
              title="Tích chọn để lọc Không xử lý được"
            >
              <span
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                  selectedStatuses.includes("cannot_process")
                    ? "bg-white text-rose-700 font-bold"
                    : "border border-rose-400 bg-white"
                }`}
              >
                {selectedStatuses.includes("cannot_process") && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
              <AlertTriangle className="w-3.5 h-3.5" />
              Không xử lý được ({stats.cannotProcess})
            </button>
          )}

          {(stats.overpaid > 0 || selectedStatuses.includes("overpaid")) && (
            <button
              type="button"
              onClick={() => toggleStatusFilter("overpaid")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedStatuses.includes("overpaid")
                  ? "bg-purple-600 text-white shadow-xs"
                  : "bg-purple-50 text-purple-800 hover:bg-purple-100 border border-purple-200/80"
              }`}
              title="Tích chọn để lọc Thanh Toán Dư"
            >
              <span
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                  selectedStatuses.includes("overpaid")
                    ? "bg-white text-purple-700 font-bold"
                    : "border border-purple-400 bg-white"
                }`}
              >
                {selectedStatuses.includes("overpaid") && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
              <CreditCard className="w-3.5 h-3.5" />
              Thanh Toán Dư ({stats.overpaid})
            </button>
          )}

          {(stats.returned > 0 || selectedStatuses.includes("returned")) && (
            <button
              type="button"
              onClick={() => toggleStatusFilter("returned")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedStatuses.includes("returned")
                  ? "bg-orange-600 text-white shadow-xs"
                  : "bg-orange-50 text-orange-800 hover:bg-orange-100 border border-orange-200/80"
              }`}
              title="Tích chọn để lọc Trả Hàng"
            >
              <span
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                  selectedStatuses.includes("returned")
                    ? "bg-white text-orange-700 font-bold"
                    : "border border-orange-400 bg-white"
                }`}
              >
                {selectedStatuses.includes("returned") && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
              <RotateCcw className="w-3.5 h-3.5" />
              Trả Hàng ({stats.returned})
            </button>
          )}

          {(stats.debtError > 0 || selectedStatuses.includes("debt_error")) && (
            <button
              type="button"
              onClick={() => toggleStatusFilter("debt_error")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedStatuses.includes("debt_error")
                  ? "bg-red-600 text-white shadow-xs"
                  : "bg-red-50 text-red-800 hover:bg-red-100 border border-red-200/80"
              }`}
              title="Tích chọn để lọc Sai Công Nợ"
            >
              <span
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                  selectedStatuses.includes("debt_error")
                    ? "bg-white text-red-700 font-bold"
                    : "border border-red-400 bg-white"
                }`}
              >
                {selectedStatuses.includes("debt_error") && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
              <AlertOctagon className="w-3.5 h-3.5" />
              Sai Công Nợ ({stats.debtError})
            </button>
          )}

          {(stats.discount > 0 || selectedStatuses.includes("discount")) && (
            <button
              type="button"
              onClick={() => toggleStatusFilter("discount")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedStatuses.includes("discount")
                  ? "bg-sky-600 text-white shadow-xs"
                  : "bg-sky-50 text-sky-800 hover:bg-sky-100 border border-sky-200/80"
              }`}
              title="Tích chọn để lọc Chiết khấu"
            >
              <span
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                  selectedStatuses.includes("discount")
                    ? "bg-white text-sky-700 font-bold"
                    : "border border-sky-400 bg-white"
                }`}
              >
                {selectedStatuses.includes("discount") && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
              <Percent className="w-3.5 h-3.5" />
              Chiết khấu ({stats.discount})
            </button>
          )}

          {(stats.goodsReceipt > 0 || selectedStatuses.includes("goods_receipt")) && (
            <button
              type="button"
              onClick={() => toggleStatusFilter("goods_receipt")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedStatuses.includes("goods_receipt")
                  ? "bg-teal-600 text-white shadow-xs"
                  : "bg-teal-50 text-teal-800 hover:bg-teal-100 border border-teal-200/80"
              }`}
              title="Tích chọn để lọc Nhập Hàng"
            >
              <span
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                  selectedStatuses.includes("goods_receipt")
                    ? "bg-white text-teal-700 font-bold"
                    : "border border-teal-400 bg-white"
                }`}
              >
                {selectedStatuses.includes("goods_receipt") && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
              <Package className="w-3.5 h-3.5" />
              Nhập Hàng ({stats.goodsReceipt})
            </button>
          )}

          {(stats.cancelled > 0 || selectedStatuses.includes("cancelled")) && (
            <button
              type="button"
              onClick={() => toggleStatusFilter("cancelled")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedStatuses.includes("cancelled")
                  ? "bg-slate-600 text-white shadow-xs"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-200"
              }`}
              title="Tích chọn để lọc Đã hủy"
            >
              <span
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                  selectedStatuses.includes("cancelled")
                    ? "bg-white text-slate-700 font-bold"
                    : "border border-slate-400 bg-white"
                }`}
              >
                {selectedStatuses.includes("cancelled") && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
              <XCircle className="w-3.5 h-3.5" />
              Đã hủy ({stats.cancelled})
            </button>
          )}

          {(stats.completed > 0 || selectedStatuses.includes("completed")) && (
            <button
              type="button"
              onClick={() => toggleStatusFilter("completed")}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                selectedStatuses.includes("completed")
                  ? "bg-emerald-600 text-white shadow-xs"
                  : "bg-emerald-50 text-emerald-800 hover:bg-emerald-100 border border-emerald-200/80"
              }`}
              title="Tích chọn để lọc Hoàn thành"
            >
              <span
                className={`w-3.5 h-3.5 rounded flex items-center justify-center transition-colors ${
                  selectedStatuses.includes("completed")
                    ? "bg-white text-emerald-700 font-bold"
                    : "border border-emerald-400 bg-white"
                }`}
              >
                {selectedStatuses.includes("completed") && <Check className="w-2.5 h-2.5 stroke-[3]" />}
              </span>
              <CheckCircle2 className="w-3.5 h-3.5" />
              Hoàn thành ({stats.completed})
            </button>
          )}

          {/* Nút xóa lọc nhanh khi đang tích chọn */}
          {(selectedStatuses.length > 0 || isTodayOverdueFilter) && (
            <button
              type="button"
              onClick={() => {
                setSelectedStatuses([]);
                setIsTodayOverdueFilter(false);
              }}
              className="text-xs text-rose-600 hover:text-rose-800 font-semibold underline ml-1 cursor-pointer transition-colors"
              title="Bỏ tích tất cả các bộ lọc trạng thái"
            >
              ✕ Bỏ lọc ({selectedStatuses.length + (isTodayOverdueFilter ? 1 : 0)})
            </button>
          )}
        </div>
      </div>

      {/* Filter, Search & Sort Action Bar */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm p-3 sm:p-4">
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
          {/* Search Input */}
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm theo Nội Dung Công Việc, Nhà cung cấp, Khách hàng, số phiếu..."
              className="w-full pl-9 pr-8 py-2 text-xs rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none transition-all"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Quick Dropdown Filters */}
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value as any)}
              className="px-2.5 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="all">📅 Mọi ngày hẹn</option>
              <option value="today">Hôm nay</option>
              <option value="upcoming7">7 ngày tới</option>
              <option value="specific">Chọn ngày cụ thể...</option>
            </select>

            {dateFilter === "specific" && (
              <input
                type="date"
                value={specificDate}
                onChange={(e) => setSpecificDate(e.target.value)}
                className="px-2.5 py-1.5 text-xs rounded-xl border border-amber-300 bg-amber-50/50 text-gray-800 outline-none font-medium"
              />
            )}

            {/* Phân Loại filter */}
            <select
              value={
                selectedPriorities.length === 1
                  ? selectedPriorities[0]
                  : selectedPriorities.length === 0
                  ? "all"
                  : "multiple"
              }
              onChange={(e) => {
                const val = e.target.value;
                if (val === "all") setSelectedPriorities([]);
                else setSelectedPriorities([val as ReminderPriority]);
              }}
              className="px-2.5 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="all">🔍 Tất cả phân loại</option>
              {selectedPriorities.length > 1 && (
                <option value="multiple" disabled>
                  Đang chọn {selectedPriorities.length} phân loại
                </option>
              )}
              <option value="supplier">🏢 Nhà Cung Cấp ({stats.supplier})</option>
              <option value="customer">👤 Khách Hàng ({stats.customer})</option>
              <option value="other">📋 Khác ({stats.other})</option>
            </select>

            {/* Sort order */}
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="px-2.5 py-2 text-xs font-semibold rounded-xl border border-gray-200 bg-white text-gray-700 focus:border-amber-500 outline-none cursor-pointer"
            >
              <option value="dateAsc">Ngày hẹn gần nhất</option>
              <option value="dateDesc">Ngày hẹn xa nhất</option>
              <option value="priority">Phân loại (NCC ➔ Khách)</option>
              <option value="createdAt">Mới tạo gần đây</option>
            </select>
          </div>
        </div>
      </div>

      {/* Batch Operations (when rows are selected) */}
      {selectedIds.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2 p-3 bg-amber-50/90 border-2 border-amber-300 rounded-xl text-xs font-semibold text-amber-900 shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-pulse" />
            <span>
              Đã chọn <strong>{selectedIds.length}</strong> ghi chú
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-gray-500 hidden sm:inline">Đổi trạng thái:</span>
            <button
              type="button"
              onClick={() => handleBatchStatus("pending")}
              className="px-2.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Chưa xử lý
            </button>
            <button
              type="button"
              onClick={() => handleBatchStatus("processing")}
              className="px-2.5 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Đang xử lý
            </button>
            <button
              type="button"
              onClick={() => handleBatchStatus("cannot_process")}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Không xử lý được
            </button>
            <button
              type="button"
              onClick={() => handleBatchStatus("overpaid")}
              className="px-2.5 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Thanh Toán Dư
            </button>
            <button
              type="button"
              onClick={() => handleBatchStatus("returned")}
              className="px-2.5 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Trả Hàng
            </button>
            <button
              type="button"
              onClick={() => handleBatchStatus("debt_error")}
              className="px-2.5 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Sai Công Nợ
            </button>
            <button
              type="button"
              onClick={() => handleBatchStatus("discount")}
              className="px-2.5 py-1.5 bg-sky-600 hover:bg-sky-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Chiết khấu
            </button>
            <button
              type="button"
              onClick={() => handleBatchStatus("goods_receipt")}
              className="px-2.5 py-1.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Nhập Hàng
            </button>
            <button
              type="button"
              onClick={() => handleBatchStatus("cancelled")}
              className="px-2.5 py-1.5 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Đã hủy
            </button>
            <button
              type="button"
              onClick={() => handleBatchStatus("completed")}
              className="px-2.5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
            >
              Hoàn thành
            </button>
            <button
              type="button"
              onClick={handleBatchDuplicate}
              className="px-2.5 py-1.5 bg-white hover:bg-blue-50 text-blue-700 border border-blue-300 rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
              title="Nhân bản tất cả các ghi chú đã chọn"
            >
              <Copy className="w-3.5 h-3.5 text-blue-600" />
              Nhân bản ({selectedIds.length})
            </button>
            <button
              type="button"
              onClick={handleBatchDelete}
              className="px-2.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa
            </button>
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-gray-500 hover:text-gray-700 underline text-xs ml-1 cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Main Table Card */}
      <div className="bg-white rounded-2xl border border-gray-200/90 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-gray-200/90 text-gray-600 font-bold tracking-tight select-none">
                <th className="py-3 px-3 w-10 text-center">
                  <input
                    type="checkbox"
                    checked={
                      filteredReminders.length > 0 && selectedIds.length === filteredReminders.length
                    }
                    onChange={handleSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                  />
                </th>
                <th className="py-3 px-2 w-12 text-center">STT</th>
                <th className="py-3 px-3 w-32">Phân Loại</th>
                <th className="py-3 px-3 min-w-[170px]">Nhà Cung Cấp / Khách Hàng</th>
                <th className="py-3 px-3 min-w-[130px]">Số Phiếu</th>
                <th className="py-3 px-4 min-w-[220px]">Nội Dung Công Việc</th>
                <th className="py-3 px-3 min-w-[130px]">Ngày hẹn</th>
                <th className="py-3 px-3 min-w-[130px] text-center">Trạng thái</th>
                <th className="py-3 px-3 min-w-[140px]">Ghi chú</th>
                <th className="py-3 px-3 w-24 text-center">Thao tác</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {filteredReminders.length === 0 ? (
                <tr>
                  <td colSpan={10} className="py-12 text-center text-gray-400">
                    <div className="max-w-xs mx-auto flex flex-col items-center gap-2">
                      <CalendarClock className="w-10 h-10 text-gray-300 stroke-1" />
                      <p className="font-semibold text-gray-600 text-sm">Không tìm thấy ghi chú nhắc hẹn</p>
                      <p className="text-xs text-gray-400">
                        Chưa có lịch hẹn nào phù hợp bộ lọc hoặc từ khóa tìm kiếm.
                      </p>
                      <button
                        type="button"
                        onClick={handleOpenAddModal}
                        className="mt-2 inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded-lg text-xs font-bold transition-colors cursor-pointer"
                      >
                        <PlusCircle className="w-3.5 h-3.5" />
                        Tạo nhắc hẹn đầu tiên
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredReminders.map((rem, idx) => {
                  const isSelected = selectedIds.includes(rem.id);
                  const prio = PRIORITY_CONFIG[rem.priority];
                  const stat = STATUS_CONFIG[rem.status] || STATUS_CONFIG.pending;
                  const timeStatus = getReminderTimeStatus(
                    rem.appointmentDate,
                    rem.appointmentTime,
                    rem.status === "completed"
                  );
                  const StatIcon = stat.icon;

                  return (
                    <tr
                      key={rem.id}
                      className={`hover:bg-slate-50/80 transition-colors ${
                        isSelected ? "bg-amber-50/60" : idx % 2 === 1 ? "bg-slate-50/30" : "bg-white"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-3 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(rem.id)}
                          className="w-4 h-4 rounded border-gray-300 text-amber-600 focus:ring-amber-500 cursor-pointer"
                        />
                      </td>

                      {/* STT */}
                      <td className="py-3 px-2 text-center text-gray-400 font-mono text-[11px] font-semibold">
                        {idx + 1}
                      </td>

                      {/* Phân Loại */}
                      <td className="py-3 px-3 whitespace-nowrap">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${prio?.bg || "bg-gray-50"} ${prio?.color || "text-gray-700"} ${prio?.border || "border-gray-200"}`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${prio?.dot || "bg-gray-400"}`}
                          />
                          {prio?.label || rem.priority}
                        </span>
                      </td>

                      {/* Nhà Cung Cấp / Khách Hàng (Gọn gàng, bỏ dòng phụ) */}
                      <td className="py-3 px-3">
                        {rem.customerName ? (
                          <div className="flex items-center gap-2">
                            {rem.priority === "supplier" || rem.priority === "high" ? (
                              <span
                                className="p-1 rounded-md bg-indigo-100 text-indigo-700 shrink-0"
                                title="Nhà Cung Cấp (từ Thưởng & Chiết Khấu)"
                              >
                                <Building2 className="w-3.5 h-3.5" />
                              </span>
                            ) : rem.priority === "customer" || rem.priority === "medium" ? (
                              <span
                                className="p-1 rounded-md bg-emerald-100 text-emerald-700 shrink-0"
                                title="Khách Hàng (từ Theo Dõi Giao Nhận)"
                              >
                                <User className="w-3.5 h-3.5" />
                              </span>
                            ) : (
                              <span className="p-1 rounded-md bg-slate-100 text-slate-600 shrink-0">
                                <User className="w-3.5 h-3.5" />
                              </span>
                            )}
                            <span
                              className="font-bold text-gray-800 text-xs block whitespace-normal break-words leading-tight hover:text-amber-700 transition-colors"
                              title={rem.customerName}
                            >
                              {rem.customerName}
                            </span>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Số Phiếu: Phân loại nào cũng có ô số Phiếu, nhưng chỉ Khách Hàng mới liên kết sang Theo Dõi Giao Nhận */}
                      <td className="py-3 px-3">
                        {editingTicketId === rem.id ? (
                          <div className="flex items-center gap-1 animate-in fade-in">
                            <input
                              type="text"
                              autoFocus
                              value={editingTicketValue}
                              onChange={(e) => setEditingTicketValue(e.target.value)}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveInlineTicket(rem);
                                if (e.key === "Escape") setEditingTicketId(null);
                              }}
                              placeholder="Nhập số phiếu..."
                              className="w-24 px-2 py-1 text-xs rounded-lg border border-blue-400 bg-white font-mono font-bold text-blue-700 outline-none focus:ring-2 focus:ring-blue-200"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveInlineTicket(rem)}
                              className="p-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-md transition-colors cursor-pointer"
                              title="Lưu số phiếu"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTicketId(null)}
                              className="p-1 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-md transition-colors cursor-pointer"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        ) : rem.ticketNumber !== undefined && String(rem.ticketNumber).trim() !== "" ? (
                          rem.priority === "customer" || rem.priority === "medium" ? (
                            /* Khách Hàng: Có nút bấm liên kết sang Theo Dõi Giao Nhận - Màu số phiếu là màu Xanh dương */
                            <div className="flex items-center gap-1 group/ticket">
                              <button
                                type="button"
                                onClick={() => {
                                  if (onNavigateToOrder) {
                                    onNavigateToOrder(rem.ticketNumber!);
                                  } else {
                                    onBackToMain();
                                  }
                                }}
                                className="inline-flex items-center gap-1.5 text-xs font-semibold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200 transition-all shadow-2xs cursor-pointer active:scale-95"
                                title={`Bấm để chuyển sang THEO DÕI GIAO NHẬN và định vị phiếu ${rem.ticketNumber}`}
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600 group-hover/ticket:scale-110 transition-transform" />
                                <span className="font-mono font-semibold" style={{ color: "#2563eb" }}>
                                  {rem.ticketNumber}
                                </span>
                                <ExternalLink className="w-3 h-3 text-blue-500" />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTicketId(rem.id);
                                  setEditingTicketValue(String(rem.ticketNumber || ""));
                                }}
                                className="opacity-60 hover:opacity-100 p-1 text-blue-600 hover:bg-blue-100 rounded-md transition-all cursor-pointer"
                                title="Nhấp để sửa hoặc nhập tay số phiếu khác"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          ) : (
                            /* Nhà Cung Cấp hoặc Khác: Hiển thị số phiếu màu Xanh dương (nhập tay, không có liên kết như khách hàng) */
                            <div className="flex items-center gap-1 group/ticket">
                              <span
                                className="inline-flex items-center gap-1.5 text-xs font-semibold px-2 py-1 rounded-lg border shadow-2xs text-blue-700 bg-blue-50 border-blue-200"
                                title={`Số phiếu ${rem.ticketNumber} (Nhập tay, không liên kết giao nhận)`}
                              >
                                <FileText className="w-3.5 h-3.5 text-blue-600" />
                                <span className="font-mono font-semibold" style={{ color: "#2563eb" }}>
                                  {rem.ticketNumber}
                                </span>
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingTicketId(rem.id);
                                  setEditingTicketValue(String(rem.ticketNumber || ""));
                                }}
                                className="opacity-60 hover:opacity-100 p-1 text-slate-600 hover:bg-slate-100 rounded-md transition-all cursor-pointer"
                                title="Nhấp để sửa hoặc nhập tay số phiếu khác"
                              >
                                <Edit2 className="w-3 h-3" />
                              </button>
                            </div>
                          )
                        ) : (
                          /* Chưa có số phiếu: Cho phép bấm nhập tay trực tiếp */
                          <button
                            type="button"
                            onClick={() => {
                              setEditingTicketId(rem.id);
                              setEditingTicketValue("");
                            }}
                            className="italic text-[11px] flex items-center gap-1 text-gray-400 hover:text-blue-700 hover:underline cursor-pointer"
                            title="Bấm để nhập tay số phiếu"
                          >
                            <FileText className="w-3 h-3 text-gray-400" />
                            + Nhập số phiếu
                          </button>
                        )}
                      </td>

                      {/* Nội Dung Công Việc (nội dung bên trong chữ màu đỏ) */}
                      <td className="py-3 px-4">
                        <div
                          className="font-bold text-red-600 text-xs hover:text-red-700 transition-colors break-words leading-snug"
                          style={{ color: "#dc2626" }}
                          title={rem.title}
                        >
                          {rem.title}
                        </div>
                      </td>

                      {/* Ngày hẹn (có thể để trống) */}
                      <td className="py-3 px-3">
                        {rem.appointmentDate ? (
                          <div className="flex flex-col gap-1">
                            <div className="font-semibold text-gray-900 text-xs flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                              <span>{formatDateDDMMYYYY(rem.appointmentDate)}</span>
                            </div>
                            <div>
                              <span
                                className={`inline-block text-[10px] px-2 py-0.2 rounded-full border ${timeStatus.badgeClass}`}
                              >
                                {timeStatus.label}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Status with quick cycle click */}
                      <td className="py-3 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => handleCycleStatus(rem)}
                          className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer hover:shadow-xs active:scale-95 ${stat.bg} ${stat.color} ${stat.border}`}
                          title="Bấm để đổi nhanh trạng thái: Chưa xử lý ➔ Đang xử lý ➔ Không xử lý được ➔ Thanh Toán Dư ➔ Trả Hàng ➔ Sai Công Nợ ➔ Chiết khấu ➔ Nhập Hàng ➔ Đã hủy ➔ Hoàn thành"
                        >
                          <StatIcon className="w-3 h-3" />
                          {stat.label}
                        </button>
                      </td>

                      {/* Notes: nội dung trong Ghi chú chữ màu đen thường không in đậm */}
                      <td className="py-3 px-3">
                        {rem.notes ? (
                          <span
                            className="text-gray-900 font-normal text-xs line-clamp-2 break-words"
                            title={rem.notes}
                          >
                            {rem.notes}
                          </span>
                        ) : (
                          <span className="text-gray-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-3 text-center">
                        <div className="inline-flex items-center justify-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(rem)}
                            className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                              rem.status === "completed"
                                ? "text-emerald-700 hover:bg-emerald-100 bg-emerald-50"
                                : "text-gray-400 hover:text-emerald-600 hover:bg-emerald-50"
                            }`}
                            title={rem.status === "completed" ? "Đổi sang Chưa xử lý" : "Đánh dấu Hoàn thành ngay"}
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDuplicateReminder(rem)}
                            className="p-1.5 text-gray-500 hover:text-indigo-700 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                            title="Nhân bản ghi chú này (Cập nhật và lưu thành ghi chú mới, không ghi đè lên file cũ)"
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(rem)}
                            className="p-1.5 text-gray-500 hover:text-amber-700 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                            title="Chỉnh sửa nhắc hẹn"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteReminder(rem)}
                            className="p-1.5 text-gray-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Xóa nhắc hẹn"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Table Footer Stats */}
        <div className="bg-slate-50 border-t border-gray-200 px-4 py-3 flex items-center justify-between gap-2 text-xs text-gray-500">
          <div className="flex items-center gap-2">
            <span>
              Đang hiển thị <strong>{filteredReminders.length}</strong> / <strong>{reminders.length}</strong> ghi chú
            </span>
            {selectedIds.length > 0 && (
              <span className="text-amber-800 font-semibold">• Đã chọn {selectedIds.length}</span>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: Thêm / Sửa / Nhân Bản Ghi Chú Nhắc Hẹn */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-2xl max-w-xl w-full border border-gray-200 shadow-2xl overflow-hidden my-8">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2.5">
                <span className={`p-2 rounded-lg text-white ${isDuplicateMode ? "bg-indigo-600 shadow-xs" : "bg-amber-600"}`}>
                  {isDuplicateMode ? <Copy className="w-5 h-5" /> : <CalendarClock className="w-5 h-5" />}
                </span>
                <div>
                  <h3 className="font-bold text-gray-900 text-base">
                    {isDuplicateMode
                      ? "Nhân Bản Ghi Chú Công Việc (Tạo Mới)"
                      : editingReminder
                      ? "Chỉnh Sửa Ghi Chú Nhắc Hẹn"
                      : "Thêm Ghi Chú Nhắc Hẹn Mới"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    {isDuplicateMode
                      ? "Cập nhật và lưu thành ghi chú mới độc lập • Tuyệt đối không ghi đè lên file/ghi chú cũ"
                      : "Đặt lịch hẹn nhắc nhở công việc, khách hàng, giờ giao và đối soát"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsModalOpen(false);
                  setIsDuplicateMode(false);
                  setSourceReminder(null);
                  setEditingReminder(null);
                }}
                className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="p-5 space-y-4">
              {/* Notice Banner when in Duplicate Mode */}
              {isDuplicateMode && (
                <div className="p-3 bg-indigo-50/90 border border-indigo-200 rounded-xl flex items-start gap-2.5 text-xs text-indigo-950">
                  <Copy className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                  <div>
                    <span className="font-bold block text-indigo-900">
                      Chế độ nhân bản tạo mới:
                    </span>
                    <p className="text-indigo-800 text-[11px] mt-0.5 leading-relaxed">
                      Khi bấm <b>"Lưu nhân bản (Tạo ghi chú mới)"</b>, hệ thống sẽ sinh mã số mới và tạo một ghi chú riêng biệt vào danh sách.
                      {sourceReminder?.title
                        ? ` File/ghi chú gốc "${sourceReminder.title}" được giữ nguyên vẹn 100%, không bị ghi đè.`
                        : " Tuyệt đối không ghi đè lên file/ghi chú cũ."}
                    </p>
                  </div>
                </div>
              )}
              {/* Nội Dung Công Việc */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Nội Dung Công Việc <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="Ví dụ: Gọi khách hẹn giờ nhận hàng buổi chiều, Lấy lại phiếu đỏ..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none font-semibold text-red-600"
                />
              </div>

              {/* Phân Loại & Trạng thái */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Phân Loại <span className="text-rose-500">*</span>
                  </label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as ReminderPriority)}
                    className={`w-full px-3 py-2 text-xs rounded-xl border font-bold outline-none cursor-pointer transition-all ${
                      formPriority === "supplier"
                        ? "border-indigo-300 bg-indigo-50/70 text-indigo-900 focus:border-indigo-500"
                        : formPriority === "customer"
                        ? "border-emerald-300 bg-emerald-50/70 text-emerald-900 focus:border-emerald-500"
                        : "border-slate-300 bg-slate-50 text-slate-800 focus:border-slate-500"
                    }`}
                  >
                    <option value="supplier">🏢 Nhà Cung Cấp (Lấy từ Thưởng &amp; Chiết Khấu)</option>
                    <option value="customer">👤 Khách Hàng (Lấy từ Theo Dõi Giao Nhận)</option>
                    <option value="other">📋 Khác (Nội bộ / Việc chung)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-800 mb-1">
                    Trạng thái nhắc hẹn
                  </label>
                  <select
                    value={formStatus === "reconciling" ? "processing" : formStatus}
                    onChange={(e) => setFormStatus(e.target.value as ReminderStatus)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-amber-500 outline-none font-semibold cursor-pointer"
                  >
                    <option value="pending">⏳ Chưa xử lý</option>
                    <option value="processing">🔄 Đang xử lý</option>
                    <option value="cannot_process">⚠️ Không xử lý được</option>
                    <option value="overpaid">💳 Thanh Toán Dư</option>
                    <option value="returned">↩️ Trả Hàng</option>
                    <option value="debt_error">🚫 Sai Công Nợ</option>
                    <option value="discount">🏷️ Chiết khấu</option>
                    <option value="goods_receipt">📦 Nhập Hàng</option>
                    <option value="cancelled">❌ Đã hủy</option>
                    <option value="completed">✅ Hoàn thành</option>
                  </select>
                </div>
              </div>

              {/* Đối tác: Nhà Cung Cấp / Khách Hàng / Khác & Số phiếu liên kết (CHỈ Khách Hàng mới liên kết phiếu đơn hàng) */}
              <div
                className={`p-3.5 rounded-xl border transition-all space-y-2.5 ${
                  formPriority === "supplier"
                    ? "bg-indigo-50/50 border-indigo-200"
                    : formPriority === "customer"
                    ? "bg-emerald-50/50 border-emerald-200"
                    : "bg-slate-50/80 border-slate-200"
                }`}
              >
                {formPriority === "customer" ? (
                  /* Phân Loại: Khách Hàng -> Hiển thị cả Tên Khách Hàng & Số phiếu đơn hàng liên kết (nếu có) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Cột 1: Tên Khách Hàng */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                          <User className="w-3.5 h-3.5 text-emerald-600" />
                          Tên Khách Hàng <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-2 py-0.5 rounded-md font-semibold">
                          Theo Dõi Giao Nhận ({deliveryCustomerSuggestions.length})
                        </span>
                      </div>
                      <input
                        type="text"
                        list="reminder-customer-suggestions"
                        value={formCustomer}
                        onChange={(e) => setFormCustomer(e.target.value)}
                        placeholder="Nhập hoặc chọn tên Khách hàng..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-300 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none font-medium"
                      />
                      <datalist id="reminder-customer-suggestions">
                        {deliveryCustomerSuggestions.map((c, i) => (
                          <option key={i} value={c} />
                        ))}
                      </datalist>

                      {/* Dropdown chọn nhanh Khách Hàng */}
                      {deliveryCustomerSuggestions.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <select
                            value={deliveryCustomerSuggestions.includes(formCustomer) ? formCustomer : ""}
                            onChange={(e) => {
                              if (e.target.value) setFormCustomer(e.target.value);
                            }}
                            className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-emerald-200 bg-white text-emerald-900 font-medium outline-none focus:border-emerald-500 cursor-pointer"
                          >
                            <option value="">▼ Chọn nhanh từ DS Khách Hàng ({deliveryCustomerSuggestions.length} khách)...</option>
                            {deliveryCustomerSuggestions.map((c, i) => (
                              <option key={i} value={c}>
                                {c}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Cột 2: Số Phiếu (nhập tay hoặc chọn liên kết) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-emerald-950 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          Số Phiếu (nhập tay hoặc chọn liên kết)
                        </label>
                        <span className="text-[10px] text-emerald-700 bg-emerald-100/80 px-1.5 py-0.2 rounded font-medium">
                          {customerLinkedTickets.length > 0
                            ? `${customerLinkedTickets.length} phiếu khả dụng`
                            : "Có thể nhập tay số bất kỳ"}
                        </span>
                      </div>
                      <input
                        type="text"
                        list="reminder-ticket-suggestions"
                        value={formTicket}
                        onChange={(e) => setFormTicket(e.target.value)}
                        placeholder="Nhập tay số phiếu (VD: 105, 2026...) hoặc chọn..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-emerald-300 bg-white focus:border-emerald-600 focus:ring-2 focus:ring-emerald-100 outline-none font-mono font-medium"
                      />
                      <datalist id="reminder-ticket-suggestions">
                        {orders.map((o) => (
                          <option key={o.id} value={o.ticketNumber}>
                            {`${o.ticketNumber} - ${o.customerName || ""}`}
                          </option>
                        ))}
                      </datalist>

                      {/* Gợi ý số phiếu của khách hàng này trong THEO DÕI GIAO NHẬN */}
                      {customerLinkedTickets.length > 0 && (
                        <div className="mt-1.5 flex flex-wrap items-center gap-1 text-[11px]">
                          <span className="text-blue-900 font-semibold text-[10.5px]">Phiếu của khách:</span>
                          {customerLinkedTickets.map((t) => (
                            <button
                              key={t}
                              type="button"
                              onClick={() => setFormTicket(String(t))}
                              className={`px-1.5 py-0.5 rounded text-[10.5px] font-mono font-bold border transition-colors cursor-pointer ${
                                formTicket === String(t)
                                  ? "bg-blue-600 text-white border-blue-700 shadow-2xs"
                                  : "bg-white hover:bg-blue-50 text-blue-700 border-blue-300"
                              }`}
                              title="Bấm để chọn số phiếu này"
                            >
                              {t}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                ) : formPriority === "supplier" ? (
                  /* Phân Loại: Nhà Cung Cấp -> Tên Nhà Cung Cấp & Ô nhập tay Số Phiếu (không liên kết giao nhận) */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Cột 1: Tên Nhà Cung Cấp */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                          <Building2 className="w-3.5 h-3.5 text-indigo-600" />
                          Tên Nhà Cung Cấp <span className="text-rose-500">*</span>
                        </label>
                        <span className="text-[10px] text-indigo-700 bg-indigo-100/80 px-2 py-0.5 rounded-md font-semibold">
                          Thưởng &amp; Chiết Khấu NCC ({supplierOptions.length})
                        </span>
                      </div>
                      <input
                        type="text"
                        list="reminder-supplier-suggestions"
                        value={formCustomer}
                        onChange={(e) => setFormCustomer(e.target.value)}
                        placeholder="Nhập hoặc chọn tên Nhà cung cấp..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-300 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-medium"
                      />
                      <datalist id="reminder-supplier-suggestions">
                        {supplierOptions.map((s, i) => (
                          <option key={i} value={s.name}>
                            {s.code ? `[${s.code}] ${s.name}` : s.name}
                          </option>
                        ))}
                      </datalist>

                      {/* Dropdown chọn nhanh Nhà Cung Cấp */}
                      {supplierOptions.length > 0 && (
                        <div className="mt-1.5 flex items-center gap-1.5">
                          <select
                            value={supplierOptions.some((s) => s.name === formCustomer) ? formCustomer : ""}
                            onChange={(e) => {
                              if (e.target.value) setFormCustomer(e.target.value);
                            }}
                            className="w-full px-2 py-1.5 text-[11px] rounded-lg border border-indigo-200 bg-white text-indigo-900 font-medium outline-none focus:border-indigo-500 cursor-pointer"
                          >
                            <option value="">▼ Chọn nhanh từ DS Nhà Cung Cấp ({supplierOptions.length} NCC)...</option>
                            {supplierOptions.map((s) => (
                              <option key={s.id || s.name} value={s.name}>
                                {s.code ? `[${s.code}] ` : ""}{s.name}
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>

                    {/* Cột 2: Số Phiếu (nhập tay, không liên kết giao nhận) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-indigo-950 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-indigo-600" />
                          Số Phiếu (nhập tay)
                        </label>
                        <span className="text-[10px] text-indigo-700 bg-indigo-100/80 px-1.5 py-0.2 rounded font-medium">
                          Phiếu NCC / Hóa đơn
                        </span>
                      </div>
                      <input
                        type="text"
                        value={formTicket}
                        onChange={(e) => setFormTicket(e.target.value)}
                        placeholder="Nhập tay số phiếu NCC, hóa đơn, chứng từ..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-indigo-300 bg-white focus:border-indigo-600 focus:ring-2 focus:ring-indigo-100 outline-none font-mono font-medium"
                      />
                      <p className="text-[10.5px] text-indigo-600/80 mt-1 italic">
                        * Nhập tay số phiếu giao hàng, hóa đơn NCC (không liên kết giao nhận).
                      </p>
                    </div>
                  </div>
                ) : (
                  /* Phân Loại: Khác -> Họ và Tên & Ô nhập tay Số Phiếu */
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Cột 1: Họ và Tên / Đối Tác */}
                    <div>
                      <label className="block text-xs font-bold text-gray-800 mb-1 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-slate-500" />
                        Họ và Tên / Đối Tác
                      </label>
                      <input
                        type="text"
                        list="reminder-customer-suggestions"
                        value={formCustomer}
                        onChange={(e) => setFormCustomer(e.target.value)}
                        placeholder="Họ và tên hoặc tên đối tác..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                      />
                      <datalist id="reminder-customer-suggestions">
                        {deliveryCustomerSuggestions.map((c, i) => (
                          <option key={i} value={c} />
                        ))}
                      </datalist>
                    </div>

                    {/* Cột 2: Số Phiếu (nhập tay) */}
                    <div>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-xs font-bold text-slate-800 flex items-center gap-1">
                          <FileText className="w-3.5 h-3.5 text-slate-500" />
                          Số Phiếu (nhập tay)
                        </label>
                        <span className="text-[10px] text-slate-600 bg-slate-200/80 px-1.5 py-0.2 rounded font-medium">
                          Số tham chiếu
                        </span>
                      </div>
                      <input
                        type="text"
                        value={formTicket}
                        onChange={(e) => setFormTicket(e.target.value)}
                        placeholder="Nhập tay số phiếu tham chiếu, việc nội bộ..."
                        className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 bg-white focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none font-mono font-medium"
                      />
                      <p className="text-[10.5px] text-slate-500 mt-1 italic">
                        * Nhập tay số phiếu tham chiếu hoặc ghi chú nội bộ.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Ngày hẹn (có thể để trống) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-gray-800 flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-amber-600" />
                    Ngày hẹn
                  </label>
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-gray-400">
                      (Có thể để trống)
                    </span>
                    {formDate && (
                      <button
                        type="button"
                        onClick={() => setFormDate("")}
                        className="text-[10.5px] text-rose-600 hover:text-rose-800 hover:underline cursor-pointer font-semibold"
                        title="Bấm để xóa ngày hẹn (để trống)"
                      >
                        ✕ Xóa ngày
                      </button>
                    )}
                  </div>
                </div>
                <input
                  type="date"
                  value={formDate}
                  onChange={(e) => setFormDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none font-medium"
                />
              </div>

              {/* Ghi chú chi tiết */}
              <div>
                <label className="block text-xs font-bold text-gray-800 mb-1">
                  Ghi chú chi tiết thêm
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="Ghi chú thêm thông tin cho lái xe hoặc nhân viên giao nhận..."
                  className="w-full px-3 py-2 text-xs rounded-xl border border-gray-200 focus:border-amber-500 focus:ring-2 focus:ring-amber-200 outline-none"
                />
              </div>

              {/* Actions in modal */}
              <div className="flex flex-wrap items-center justify-end gap-2 pt-3 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => {
                    setIsModalOpen(false);
                    setIsDuplicateMode(false);
                    setSourceReminder(null);
                    setEditingReminder(null);
                  }}
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Đóng
                </button>

                {/* Khi đang sửa ghi chú cũ: Cung cấp tùy chọn Nhân bản thành ghi chú mới để không bị ghi đè */}
                {editingReminder && !isDuplicateMode && (
                  <button
                    type="button"
                    onClick={handleSaveAsNewDuplicateFromEdit}
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95"
                    title="Lưu các thông tin hiện tại thành một ghi chú mới toanh, không ghi đè lên file/ghi chú cũ này"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-600" />
                    Nhân bản thành ghi chú mới
                  </button>
                )}

                <button
                  type="submit"
                  className={`inline-flex items-center gap-1.5 px-5 py-2 text-white rounded-xl text-xs font-bold transition-all shadow-xs cursor-pointer active:scale-95 ${
                    isDuplicateMode
                      ? "bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800"
                      : "bg-amber-600 hover:bg-amber-700 active:bg-amber-800"
                  }`}
                >
                  {isDuplicateMode ? (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      Lưu nhân bản (Tạo ghi chú mới)
                    </>
                  ) : editingReminder ? (
                    "Lưu thay đổi (Ghi đè file này)"
                  ) : (
                    "Tạo nhắc hẹn"
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* In-app Delete Confirmation Modal (Solves issue with deletion not working) */}
      {deleteConfirmTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in">
          <div
            className="bg-white rounded-2xl shadow-2xl max-w-md w-full border border-gray-200 overflow-hidden animate-in zoom-in-95"
            role="dialog"
            aria-modal="true"
          >
            <div className="p-5 sm:p-6">
              <div className="flex items-center gap-3 mb-3 text-rose-600">
                <div className="p-2.5 bg-rose-100 rounded-xl">
                  <AlertTriangle className="w-6 h-6 text-rose-600" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-gray-900">
                    {deleteConfirmTarget.type === "batch"
                      ? `Xác nhận xóa ${deleteConfirmTarget.count} nhắc hẹn?`
                      : "Xác nhận xóa nhắc hẹn?"}
                  </h3>
                  <p className="text-xs text-gray-500">
                    Thao tác này sẽ xóa vĩnh viễn khỏi danh sách và không thể hoàn tác.
                  </p>
                </div>
              </div>

              {deleteConfirmTarget.type === "single" && deleteConfirmTarget.title && (
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 my-4 text-xs space-y-1">
                  <div className="font-semibold text-gray-900">
                    {deleteConfirmTarget.title}
                  </div>
                  {deleteConfirmTarget.appointmentDate && (
                    <div className="text-gray-500">
                      Ngày hẹn: <span className="font-medium text-gray-700">{formatDateDDMMYYYY(deleteConfirmTarget.appointmentDate)}</span>
                    </div>
                  )}
                  {deleteConfirmTarget.ticketNumber && (
                    <div className="text-blue-700 font-mono font-bold">
                      Số phiếu: {deleteConfirmTarget.ticketNumber}
                    </div>
                  )}
                </div>
              )}

              {deleteConfirmTarget.type === "batch" && (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3 my-4 text-xs text-rose-800">
                  Bạn đã chọn <strong>{deleteConfirmTarget.count}</strong> ghi chú nhắc hẹn để xóa.
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setDeleteConfirmTarget(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleExecuteDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xác nhận xóa
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
