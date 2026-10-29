import React, { useState, useMemo } from "react";
import {
  ArrowLeft,
  Plus,
  Building2,
  Calendar,
  CheckCircle2,
  AlertTriangle,
  Search,
  Edit2,
  Trash2,
  CreditCard,
  FileText,
  TrendingUp,
  Award,
  X,
  Tag,
  Percent,
  Copy,
  Banknote,
  Package,
  Receipt,
  Wallet,
} from "lucide-react";
import {
  Supplier,
  SupplierBonusEntry,
  SupplierBonusData,
  BonusPeriodType,
  SupplierPayment,
  BonusPaymentMethod,
  BONUS_PAYMENT_METHODS,
} from "../types/supplierBonus";
import {
  loadSupplierBonusData,
  saveSupplierBonusData,
  formatVND,
  parseVND,
  calculateBreakdownByType,
  buildPeriodString,
} from "../utils/supplierBonusStorage";
import { formatDateDDMMYYYY, getLocalTodayISO } from "../utils/dateUtils";

interface SupplierBonusManagerProps {
  onBackToMain: () => void;
  existingCustomerSuggestions?: string[]; // Gợi ý tên đối tác từ app cũ nếu có
  onAutoBackupNotification?: (message: string) => void;
}

// Flattened payment item for the standalone "Danh Sách Đã Trả"
export interface FlattenedPaymentItem extends SupplierPayment {
  bonusEntryId: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  type: BonusPeriodType;
  period: string;
  bonusAmount: number;
  bonusRemaining: number;
}

export default function SupplierBonusManager({
  onBackToMain,
  existingCustomerSuggestions = [],
  onAutoBackupNotification,
}: SupplierBonusManagerProps) {
  // 1. Data state
  const [data, setData] = useState<SupplierBonusData>(() => loadSupplierBonusData());

  const updateAndPersistData = (updater: (prev: SupplierBonusData) => SupplierBonusData) => {
    setData((prev) => {
      const next = updater(prev);
      saveSupplierBonusData(next);
      return next;
    });
  };

  // 2. View switch: "bonus" (Danh Sách Thưởng) vs "payments" (Danh Sách Đã Trả)
  const [activeView, setActiveView] = useState<"bonus" | "payments">("bonus");

  // 3. Filter states
  const [activeTab, setActiveTab] = useState<"all" | BonusPeriodType>("all");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string>("all");
  const [yearFilter, setYearFilter] = useState<string>("all");
  const [monthFilter, setMonthFilter] = useState<string>("all");
  const [quarterFilter, setQuarterFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<"all" | "unpaid" | "completed">("all");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Payment list specific filter
  const [paymentSearchQuery, setPaymentSearchQuery] = useState<string>("");
  const [paymentTypeFilter, setPaymentTypeFilter] = useState<"all" | BonusPeriodType>("all");
  const [paymentSupplierFilter, setPaymentSupplierFilter] = useState<string>("all");
  const [paymentYearFilter, setPaymentYearFilter] = useState<string>("all");

  // 4. Modals state
  const [isBonusModalOpen, setIsBonusModalOpen] = useState(false);
  const [editingBonus, setEditingBonus] = useState<SupplierBonusEntry | null>(null);
  const [cloningBonusSource, setCloningBonusSource] = useState<{ id: string; supplierName: string; period: string } | null>(null);

  // Modal trả tiền cho 1 khoản thưởng cụ thể
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [activeBonusForPayment, setActiveBonusForPayment] = useState<SupplierBonusEntry | null>(null);

  // Modal ghi nhận trả tiền độc lập (từ Tab Danh Sách Đã Trả)
  const [isStandalonePaymentModalOpen, setIsStandalonePaymentModalOpen] = useState(false);
  const [standaloneSupplierId, setStandaloneSupplierId] = useState<string>("");
  const [standaloneBonusId, setStandaloneBonusId] = useState<string>("");
  const [standalonePaymentAmountStr, setStandalonePaymentAmountStr] = useState<string>("");
  const [standalonePaymentDate, setStandalonePaymentDate] = useState<string>(getLocalTodayISO());
  const [standalonePaymentNotes, setStandalonePaymentNotes] = useState<string>("");

  // Modal chỉnh sửa 1 lần thanh toán cụ thể
  const [editingPaymentItem, setEditingPaymentItem] = useState<FlattenedPaymentItem | null>(null);
  const [editPaymentAmountStr, setEditPaymentAmountStr] = useState<string>("");
  const [editPaymentDate, setEditPaymentDate] = useState<string>("");
  const [editPaymentNotes, setEditPaymentNotes] = useState<string>("");

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [editingSupplier, setEditingSupplier] = useState<Supplier | null>(null);

  // Trạng thái xóa tức thì / inline confirmation để không bao giờ bị lỗi do modal chặn
  const [pendingDeleteBonusId, setPendingDeleteBonusId] = useState<string | null>(null);
  const [pendingDeletePaymentId, setPendingDeletePaymentId] = useState<string | null>(null);
  const [pendingDeleteSupplierId, setPendingDeleteSupplierId] = useState<string | null>(null);
  const [lastDeletedBonus, setLastDeletedBonus] = useState<SupplierBonusEntry | null>(null);

  // Modal xác nhận xóa độc lập (z-[9999] đảm bảo không bị che khuất)
  const [confirmDeleteModal, setConfirmDeleteModal] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    subMessage?: string;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: "",
    message: "",
    onConfirm: () => {},
  });

  const [toastConfig, setToastConfig] = useState<{
    message: string;
    onUndo?: () => void;
  } | null>(null);

  const showToast = (msg: string, onUndo?: () => void) => {
    setToastConfig({ message: msg, onUndo });
    if (onAutoBackupNotification) onAutoBackupNotification(msg);
    setTimeout(() => {
      setToastConfig((curr) => (curr?.message === msg ? null : curr));
    }, 4500);
  };

  // 5. Form states for Bonus Entry
  const [formSupplierId, setFormSupplierId] = useState<string>("");
  const [formType, setFormType] = useState<BonusPeriodType>("month");
  const [formMonth, setFormMonth] = useState<number>(new Date().getMonth() + 1);
  const [formQuarter, setFormQuarter] = useState<number>(Math.floor(new Date().getMonth() / 3) + 1);
  const [formYear, setFormYear] = useState<number>(new Date().getFullYear());
  const [formCustomPeriod, setFormCustomPeriod] = useState<string>("");
  const [formPayoutDate, setFormPayoutDate] = useState<string>(getLocalTodayISO());
  const [formPaymentMethod, setFormPaymentMethod] = useState<BonusPaymentMethod>("Chuyển khoản");
  const [formAmountStr, setFormAmountStr] = useState<string>("");
  const [formInitialPaidStr, setFormInitialPaidStr] = useState<string>("0");
  const [formNotes, setFormNotes] = useState<string>("");

  // 6. Form states for Payment Entry (từ dòng khoản thưởng)
  const [paymentAmountStr, setPaymentAmountStr] = useState<string>("");
  const [paymentDate, setPaymentDate] = useState<string>(getLocalTodayISO());
  const [paymentMethodForPayment, setPaymentMethodForPayment] = useState<BonusPaymentMethod>("Chuyển khoản");
  const [paymentNotes, setPaymentNotes] = useState<string>("");

  // Standalone payment form states (từ Tab Danh Sách Đã Trả)
  const [standalonePaymentMethod, setStandalonePaymentMethod] = useState<BonusPaymentMethod>("Chuyển khoản");

  // Edit payment item form states
  const [editPaymentMethod, setEditPaymentMethod] = useState<BonusPaymentMethod>("Chuyển khoản");

  // Filter theo hình thức trả thưởng
  const [paymentMethodFilter, setPaymentMethodFilter] = useState<string>("all");
  const [paymentListMethodFilter, setPaymentListMethodFilter] = useState<string>("all");

  // Helper render huy hiệu hình thức trả thưởng đẹp mắt, chuẩn màu
  const renderPaymentMethodBadge = (method?: string | null) => {
    if (!method) {
      return (
        <span className="inline-flex items-center px-2 py-0.5 rounded text-[11px] text-slate-400 font-medium italic">
          — (Chưa chọn)
        </span>
      );
    }

    switch (method) {
      case "Tiền mặt":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-emerald-50 text-emerald-800 border border-emerald-200 shadow-2xs whitespace-nowrap">
            <Banknote className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
            <span>Tiền mặt</span>
          </span>
        );
      case "Chuyển khoản":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-sky-50 text-sky-800 border border-sky-200 shadow-2xs whitespace-nowrap">
            <CreditCard className="w-3.5 h-3.5 text-sky-600 shrink-0" />
            <span>Chuyển khoản</span>
          </span>
        );
      case "Cấn trừ công nợ":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-purple-50 text-purple-800 border border-purple-200 shadow-2xs whitespace-nowrap">
            <Receipt className="w-3.5 h-3.5 text-purple-600 shrink-0" />
            <span>Cấn trừ công nợ</span>
          </span>
        );
      case "Bằng hàng":
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full font-bold text-[11px] bg-amber-50 text-amber-900 border border-amber-200 shadow-2xs whitespace-nowrap">
            <Package className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            <span>Bằng hàng</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-semibold text-[11px] bg-slate-100 text-slate-700 border border-slate-200">
            {method}
          </span>
        );
    }
  };

  // 7. Form states for Supplier
  const [formSupplierCode, setFormSupplierCode] = useState<string>("");
  const [formSupplierName, setFormSupplierName] = useState<string>("");
  const [formSupplierNotes, setFormSupplierNotes] = useState<string>("");
  const [formSupplierStatus, setFormSupplierStatus] = useState<"active" | "inactive">("active");
  const [supplierSearchQuery, setSupplierSearchQuery] = useState<string>("");

  // Derived unique years
  const availableYears = useMemo(() => {
    const years = new Set<number>();
    data.bonusEntries.forEach((b) => {
      if (b.year) years.add(b.year);
    });
    years.add(new Date().getFullYear());
    return Array.from(years).sort((a, b) => b - a);
  }, [data.bonusEntries]);

  // Overall totals and breakdown
  const breakdown = useMemo(() => {
    return calculateBreakdownByType(data.bonusEntries);
  }, [data.bonusEntries]);

  // Selected supplier details if one is selected
  const selectedSupplier = useMemo(() => {
    if (selectedSupplierId === "all") return null;
    return data.suppliers.find((s) => s.id === selectedSupplierId) || null;
  }, [data.suppliers, selectedSupplierId]);

  // Supplier-specific breakdown
  const supplierBreakdown = useMemo(() => {
    if (!selectedSupplierId || selectedSupplierId === "all") return null;
    const supEntries = data.bonusEntries.filter((b) => b.supplierId === selectedSupplierId);
    return calculateBreakdownByType(supEntries);
  }, [data.bonusEntries, selectedSupplierId]);

  // Filtered Bonus Entries List (DANH SÁCH THƯỞNG)
  const filteredBonusEntries = useMemo(() => {
    return data.bonusEntries.filter((entry) => {
      if (activeTab !== "all" && entry.type !== activeTab) return false;
      if (selectedSupplierId !== "all" && entry.supplierId !== selectedSupplierId) return false;
      if (yearFilter !== "all" && entry.year && String(entry.year) !== yearFilter) return false;
      if (monthFilter !== "all" && entry.type === "month" && String(entry.month) !== monthFilter) return false;
      if (quarterFilter !== "all" && entry.type === "quarter" && String(entry.quarter) !== quarterFilter) return false;
      if (statusFilter === "unpaid" && entry.remainingAmount <= 0) return false;
      if (statusFilter === "completed" && entry.remainingAmount > 0) return false;
      if (paymentMethodFilter !== "all" && entry.paymentMethod !== paymentMethodFilter) return false;

      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const matchName = entry.supplierName.toLowerCase().includes(q);
        const matchCode = entry.supplierCode.toLowerCase().includes(q);
        const matchPeriod = entry.period.toLowerCase().includes(q);
        const matchNotes = (entry.notes || "").toLowerCase().includes(q);
        const matchMethod = (entry.paymentMethod || "").toLowerCase().includes(q);
        const matchDate = (entry.payoutDate || "").includes(q) || formatDateDDMMYYYY(entry.payoutDate).includes(q);
        if (!matchName && !matchCode && !matchPeriod && !matchNotes && !matchDate && !matchMethod) return false;
      }

      return true;
    }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }, [
    data.bonusEntries,
    activeTab,
    selectedSupplierId,
    yearFilter,
    monthFilter,
    quarterFilter,
    statusFilter,
    paymentMethodFilter,
    searchQuery,
  ]);

  // ALL FLATTENED PAYMENTS (DANH SÁCH ĐÃ TRẢ TOÀN BỘ)
  const allPayments = useMemo(() => {
    const list: FlattenedPaymentItem[] = [];
    data.bonusEntries.forEach((b) => {
      (b.payments || []).forEach((p) => {
        list.push({
          ...p,
          paymentMethod: p.paymentMethod || b.paymentMethod,
          bonusEntryId: b.id,
          supplierId: b.supplierId,
          supplierCode: b.supplierCode,
          supplierName: b.supplierName,
          type: b.type,
          period: b.period,
          bonusAmount: b.amount,
          bonusRemaining: b.remainingAmount,
        });
      });
    });
    return list.sort((a, b) => {
      const dateA = a.paymentDate || a.createdAt;
      const dateB = b.paymentDate || b.createdAt;
      return new Date(dateB).getTime() - new Date(dateA).getTime();
    });
  }, [data.bonusEntries]);

  // Filtered Payments List (DANH SÁCH ĐÃ TRẢ ĐÃ LỌC)
  const filteredPayments = useMemo(() => {
    return allPayments.filter((p) => {
      if (paymentSupplierFilter !== "all" && p.supplierId !== paymentSupplierFilter) return false;
      if (paymentTypeFilter !== "all" && p.type !== paymentTypeFilter) return false;
      if (paymentListMethodFilter !== "all" && p.paymentMethod !== paymentListMethodFilter) return false;
      if (paymentYearFilter !== "all") {
        const payYear = p.paymentDate ? p.paymentDate.slice(0, 4) : "";
        if (payYear !== paymentYearFilter) return false;
      }
      if (paymentSearchQuery.trim()) {
        const q = paymentSearchQuery.toLowerCase().trim();
        const matchName = p.supplierName.toLowerCase().includes(q);
        const matchCode = p.supplierCode.toLowerCase().includes(q);
        const matchPeriod = p.period.toLowerCase().includes(q);
        const matchNotes = (p.notes || "").toLowerCase().includes(q);
        const matchMethod = (p.paymentMethod || "").toLowerCase().includes(q);
        const matchDate = (p.paymentDate || "").includes(q) || formatDateDDMMYYYY(p.paymentDate).includes(q);
        if (!matchName && !matchCode && !matchPeriod && !matchNotes && !matchDate && !matchMethod) return false;
      }
      return true;
    });
  }, [allPayments, paymentSupplierFilter, paymentTypeFilter, paymentListMethodFilter, paymentYearFilter, paymentSearchQuery]);

  // Total paid amount for currently filtered payments
  const totalFilteredPaymentsAmount = useMemo(() => {
    return filteredPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
  }, [filteredPayments]);

  // Filtered Suppliers List in Manager Modal
  const filteredSuppliers = useMemo(() => {
    return data.suppliers.filter((s) => {
      if (supplierSearchQuery.trim()) {
        const q = supplierSearchQuery.toLowerCase().trim();
        return s.name.toLowerCase().includes(q) || s.code.toLowerCase().includes(q) || (s.notes || "").toLowerCase().includes(q);
      }
      return true;
    });
  }, [data.suppliers, supplierSearchQuery]);

  // Available bonuses for the selected supplier in standalone payment modal
  const standaloneAvailableBonuses = useMemo(() => {
    if (!standaloneSupplierId) return [];
    return data.bonusEntries.filter((b) => b.supplierId === standaloneSupplierId);
  }, [data.bonusEntries, standaloneSupplierId]);

  // ==========================================
  // HANDLERS: BONUS ENTRY MODAL
  // ==========================================
  const handleOpenAddBonusModal = () => {
    setEditingBonus(null);
    setCloningBonusSource(null);
    setFormSupplierId(selectedSupplierId !== "all" ? selectedSupplierId : data.suppliers[0]?.id || "");
    setFormType("month");
    setFormMonth(new Date().getMonth() + 1);
    setFormQuarter(Math.floor(new Date().getMonth() / 3) + 1);
    setFormYear(new Date().getFullYear());
    setFormCustomPeriod("");
    setFormPayoutDate(""); // Để trống mặc định, người dùng có thể nhập nếu muốn
    setFormPaymentMethod("Chuyển khoản");
    setFormAmountStr("");
    setFormInitialPaidStr("0");
    setFormNotes("");
    setIsBonusModalOpen(true);
  };

  const handleOpenEditBonusModal = (entry: SupplierBonusEntry) => {
    setEditingBonus(entry);
    setCloningBonusSource(null);
    setFormSupplierId(entry.supplierId);
    setFormType(entry.type);
    setFormMonth(entry.month || new Date().getMonth() + 1);
    setFormQuarter(entry.quarter || 1);
    setFormYear(entry.year || new Date().getFullYear());
    setFormCustomPeriod(entry.type === "other" ? entry.period : "");
    setFormPayoutDate(entry.payoutDate || ""); // Có thể để trống nếu chưa có ngày
    setFormPaymentMethod((entry.paymentMethod as BonusPaymentMethod) || "Chuyển khoản");
    setFormAmountStr(entry.amount ? String(entry.amount) : "");
    setFormInitialPaidStr(entry.paidAmount ? String(entry.paidAmount) : "0");
    setFormNotes(entry.notes || "");
    setIsBonusModalOpen(true);
  };

  // Thao tác Nhân bản khoản thưởng & chiết khấu (Copy / Clone)
  const handleDuplicateBonus = (entry: SupplierBonusEntry, quickInstantClone = false) => {
    if (quickInstantClone) {
      // Nhân bản nhanh trực tiếp không cần mở modal
      const newEntry: SupplierBonusEntry = {
        ...entry,
        id: `bonus_${Date.now()}`,
        payments: [],
        paidAmount: 0,
        remainingAmount: entry.amount,
        payoutDate: entry.payoutDate || undefined,
        paymentMethod: entry.paymentMethod || "Chuyển khoản",
        notes: entry.notes ? `${entry.notes} (Bản sao)` : "Bản sao nhân bản",
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      updateAndPersistData((prev) => ({
        ...prev,
        bonusEntries: [newEntry, ...prev.bonusEntries],
      }));
      showToast(`Đã nhân bản nhanh khoản thưởng ${entry.period} của ${entry.supplierName}!`);
      return;
    }

    // Mở form thêm mới với toàn bộ dữ liệu đã được nạp sẵn từ bản gốc
    setEditingBonus(null);
    setCloningBonusSource({ id: entry.id, supplierName: entry.supplierName, period: entry.period });
    setFormSupplierId(entry.supplierId);
    setFormType(entry.type);
    setFormMonth(entry.month ? (entry.month % 12) + 1 : new Date().getMonth() + 1);
    setFormQuarter(entry.quarter || Math.floor(new Date().getMonth() / 3) + 1);
    setFormYear(entry.year || new Date().getFullYear());
    setFormCustomPeriod(entry.type === "other" ? `${entry.period} (Bản sao)` : "");
    setFormPayoutDate(entry.payoutDate || "");
    setFormPaymentMethod((entry.paymentMethod as BonusPaymentMethod) || "Chuyển khoản");
    setFormAmountStr(entry.amount ? String(entry.amount) : "");
    setFormInitialPaidStr("0"); // Bản sao mới khởi tạo chưa trả tiền
    setFormNotes(entry.notes || "");
    setIsBonusModalOpen(true);
    showToast(`Đã nạp dữ liệu nhân bản từ ${entry.supplierName} (${entry.period})!`);
  };

  const handleSaveBonus = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formSupplierId) {
      alert("Vui lòng chọn Nhà cung cấp!");
      return;
    }
    const sup = data.suppliers.find((s) => s.id === formSupplierId);
    if (!sup) {
      alert("Không tìm thấy Nhà cung cấp đã chọn!");
      return;
    }

    const amount = parseVND(formAmountStr);
    if (amount <= 0) {
      alert("Vui lòng nhập số tiền thưởng / chiết khấu lớn hơn 0!");
      return;
    }

    const initialPaid = parseVND(formInitialPaidStr);
    const periodStr = buildPeriodString(formType, formMonth, formQuarter, formYear, formCustomPeriod);
    const payoutDateClean = formPayoutDate.trim() ? formPayoutDate.trim() : undefined;

    if (editingBonus) {
      // Sửa khoản thưởng đang có
      updateAndPersistData((prev) => ({
        ...prev,
        bonusEntries: prev.bonusEntries.map((b) => {
          if (b.id !== editingBonus.id) return b;
          let updatedPayments = [...b.payments];
          let finalPaid = b.paidAmount;

          if (initialPaid !== b.paidAmount) {
            finalPaid = initialPaid;
            if (updatedPayments.length <= 1) {
              updatedPayments = initialPaid > 0 ? [
                {
                  id: updatedPayments[0]?.id || `pay_${Date.now()}`,
                  amount: initialPaid,
                  paymentDate: updatedPayments[0]?.paymentDate || payoutDateClean || getLocalTodayISO(),
                  paymentMethod: formPaymentMethod,
                  notes: updatedPayments[0]?.notes || "Thanh toán đợt 1",
                  createdAt: new Date().toISOString(),
                },
              ] : [];
            }
          }

          return {
            ...b,
            supplierId: sup.id,
            supplierCode: sup.code,
            supplierName: sup.name,
            type: formType,
            period: periodStr,
            month: formType === "month" ? formMonth : undefined,
            quarter: formType === "quarter" ? formQuarter : undefined,
            year: formYear,
            payoutDate: payoutDateClean,
            paymentMethod: formPaymentMethod,
            amount,
            paidAmount: finalPaid,
            remainingAmount: amount - finalPaid,
            payments: updatedPayments,
            notes: formNotes.trim(),
            updatedAt: new Date().toISOString(),
          };
        }),
      }));
      showToast(`Đã cập nhật khoản thưởng ${periodStr} của ${sup.name}!`);
    } else {
      // Thêm khoản thưởng mới
      const newPayments: SupplierPayment[] = [];
      if (initialPaid > 0) {
        newPayments.push({
          id: `pay_${Date.now()}`,
          amount: initialPaid,
          paymentDate: payoutDateClean || getLocalTodayISO(),
          paymentMethod: formPaymentMethod,
          notes: "Thanh toán ban đầu",
          createdAt: new Date().toISOString(),
        });
      }

      const newEntry: SupplierBonusEntry = {
        id: `bonus_${Date.now()}`,
        supplierId: sup.id,
        supplierCode: sup.code,
        supplierName: sup.name,
        type: formType,
        period: periodStr,
        month: formType === "month" ? formMonth : undefined,
        quarter: formType === "quarter" ? formQuarter : undefined,
        year: formYear,
        payoutDate: payoutDateClean,
        paymentMethod: formPaymentMethod,
        amount,
        payments: newPayments,
        paidAmount: initialPaid,
        remainingAmount: amount - initialPaid,
        notes: formNotes.trim(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      updateAndPersistData((prev) => ({
        ...prev,
        bonusEntries: [newEntry, ...prev.bonusEntries],
      }));
      showToast(`Đã thêm mới khoản thưởng ${periodStr} (${formatVND(amount)}) cho ${sup.name}!`);
    }

    setCloningBonusSource(null);
    setIsBonusModalOpen(false);
  };

  // Hàm thực thi xóa khoản thưởng dứt điểm, đồng thời lưu để hoàn tác (Undo) nếu cần
  const executeDeleteBonus = (id: string, periodName?: string) => {
    const toDelete = data.bonusEntries.find((b) => b.id === id);
    if (!toDelete) return;

    setLastDeletedBonus(toDelete);
    updateAndPersistData((prev) => ({
      ...prev,
      bonusEntries: prev.bonusEntries.filter((b) => b.id !== id),
    }));
    setPendingDeleteBonusId(null);
    setConfirmDeleteModal((prev) => ({ ...prev, isOpen: false }));

    showToast(
      `Đã xóa thành công khoản thưởng "${periodName || toDelete.period}" của ${toDelete.supplierName}!`,
      () => handleRestoreBonus(toDelete)
    );
  };

  const handleRestoreBonus = (restoredEntry?: SupplierBonusEntry) => {
    const target = restoredEntry || lastDeletedBonus;
    if (!target) return;
    updateAndPersistData((prev) => ({
      ...prev,
      bonusEntries: [target, ...prev.bonusEntries.filter((b) => b.id !== target.id)],
    }));
    showToast(`Đã khôi phục lại khoản thưởng "${target.period}"!`);
    setLastDeletedBonus(null);
  };

  // Xóa khoản thưởng - Hỗ trợ cả confirm modal lẫn inline confirmation
  const handleDeleteBonus = (entry: SupplierBonusEntry) => {
    setConfirmDeleteModal({
      isOpen: true,
      title: "Xóa khoản thưởng / chiết khấu",
      message: `Bạn có chắc chắn muốn xóa khoản thưởng "${entry.period}" của Nhà cung cấp ${entry.supplierName}?`,
      subMessage: `Số tiền: ${formatVND(entry.amount)} • Đã trả: ${formatVND(entry.paidAmount)} • Còn lại: ${formatVND(entry.remainingAmount)}`,
      onConfirm: () => {
        executeDeleteBonus(entry.id, entry.period);
      },
    });
  };

  // ==========================================
  // HANDLERS: THANH TOÁN (PAYMENT TỪ DÒNG KHOẢN THƯỞNG)
  // ==========================================
  const handleOpenPaymentModal = (entry: SupplierBonusEntry) => {
    setActiveBonusForPayment(entry);
    setPaymentAmountStr(entry.remainingAmount > 0 ? String(entry.remainingAmount) : "");
    setPaymentDate(getLocalTodayISO());
    setPaymentMethodForPayment((entry.paymentMethod as BonusPaymentMethod) || "Chuyển khoản");
    setPaymentNotes("");
    setIsPaymentModalOpen(true);
  };

  const handleAddPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeBonusForPayment) return;

    const payAmt = parseVND(paymentAmountStr);
    if (payAmt <= 0) {
      alert("Vui lòng nhập số tiền thanh toán lớn hơn 0!");
      return;
    }

    const payDateClean = paymentDate || getLocalTodayISO();
    const newPayment: SupplierPayment = {
      id: `pay_${Date.now()}`,
      amount: payAmt,
      paymentDate: payDateClean,
      paymentMethod: paymentMethodForPayment,
      notes: paymentNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    updateAndPersistData((prev) => ({
      ...prev,
      bonusEntries: prev.bonusEntries.map((b) => {
        if (b.id !== activeBonusForPayment.id) return b;
        const updatedPayments = [...b.payments, newPayment];
        const newPaid = updatedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        return {
          ...b,
          payoutDate: b.payoutDate || payDateClean,
          paymentMethod: b.paymentMethod || paymentMethodForPayment,
          payments: updatedPayments,
          paidAmount: newPaid,
          remainingAmount: b.amount - newPaid,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));

    showToast(`Đã ghi nhận thanh toán ${formatVND(payAmt)} cho ${activeBonusForPayment.supplierName}!`);
    setIsPaymentModalOpen(false);
  };

  const executeDeletePayment = (bonusEntryId: string, paymentId: string, supplierName?: string) => {
    updateAndPersistData((prev) => ({
      ...prev,
      bonusEntries: prev.bonusEntries.map((b) => {
        if (b.id !== bonusEntryId) return b;
        const updatedPayments = b.payments.filter((p) => p.id !== paymentId);
        const newPaid = updatedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        const updatedBonus = {
          ...b,
          payments: updatedPayments,
          paidAmount: newPaid,
          remainingAmount: b.amount - newPaid,
          updatedAt: new Date().toISOString(),
        };
        if (activeBonusForPayment?.id === bonusEntryId) {
          setActiveBonusForPayment(updatedBonus);
        }
        return updatedBonus;
      }),
    }));
    setPendingDeletePaymentId(null);
    setConfirmDeleteModal((prev) => ({ ...prev, isOpen: false }));
    showToast(`Đã xóa lượt thanh toán${supplierName ? ` của ${supplierName}` : ""}!`);
  };

  const handleDeletePayment = (paymentId: string) => {
    if (!activeBonusForPayment) return;
    setConfirmDeleteModal({
      isOpen: true,
      title: "Xóa đợt thanh toán",
      message: `Bạn có chắc muốn xóa đợt thanh toán này của ${activeBonusForPayment.supplierName}?`,
      onConfirm: () => {
        executeDeletePayment(activeBonusForPayment.id, paymentId, activeBonusForPayment.supplierName);
      },
    });
  };

  // ==========================================
  // HANDLERS: GHI NHẬN ĐÃ TRẢ TỰ DO (STANDALONE PAYMENT TỪ TAB ĐÃ TRẢ)
  // ==========================================
  const handleOpenStandalonePaymentModal = () => {
    const firstSupWithBonus = data.suppliers.find((s) => data.bonusEntries.some((b) => b.supplierId === s.id)) || data.suppliers[0];
    const initialSupId = paymentSupplierFilter !== "all" ? paymentSupplierFilter : firstSupWithBonus?.id || "";
    setStandaloneSupplierId(initialSupId);

    const bonusesForSup = data.bonusEntries.filter((b) => b.supplierId === initialSupId);
    const firstUnpaidBonus = bonusesForSup.find((b) => b.remainingAmount > 0) || bonusesForSup[0];
    setStandaloneBonusId(firstUnpaidBonus?.id || "");
    setStandalonePaymentAmountStr(firstUnpaidBonus && firstUnpaidBonus.remainingAmount > 0 ? String(firstUnpaidBonus.remainingAmount) : "");
    setStandalonePaymentDate(getLocalTodayISO());
    setStandalonePaymentMethod((firstUnpaidBonus?.paymentMethod as BonusPaymentMethod) || "Chuyển khoản");
    setStandalonePaymentNotes("");
    setIsStandalonePaymentModalOpen(true);
  };

  const handleSaveStandalonePayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!standaloneBonusId) {
      alert("Vui lòng chọn khoản thưởng / chiết khấu cần thanh toán!");
      return;
    }

    const payAmt = parseVND(standalonePaymentAmountStr);
    if (payAmt <= 0) {
      alert("Vui lòng nhập số tiền thanh toán lớn hơn 0!");
      return;
    }

    const targetBonus = data.bonusEntries.find((b) => b.id === standaloneBonusId);
    if (!targetBonus) {
      alert("Không tìm thấy khoản thưởng tương ứng!");
      return;
    }

    const payDateClean = standalonePaymentDate || getLocalTodayISO();
    const newPayment: SupplierPayment = {
      id: `pay_${Date.now()}`,
      amount: payAmt,
      paymentDate: payDateClean,
      paymentMethod: standalonePaymentMethod,
      notes: standalonePaymentNotes.trim(),
      createdAt: new Date().toISOString(),
    };

    updateAndPersistData((prev) => ({
      ...prev,
      bonusEntries: prev.bonusEntries.map((b) => {
        if (b.id !== standaloneBonusId) return b;
        const updatedPayments = [...b.payments, newPayment];
        const newPaid = updatedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        return {
          ...b,
          payoutDate: b.payoutDate || payDateClean,
          paymentMethod: b.paymentMethod || standalonePaymentMethod,
          payments: updatedPayments,
          paidAmount: newPaid,
          remainingAmount: b.amount - newPaid,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));

    showToast(`Đã thêm lượt trả tiền ${formatVND(payAmt)} cho ${targetBonus.supplierName} (${targetBonus.period})!`);
    setIsStandalonePaymentModalOpen(false);
  };

  // ==========================================
  // HANDLERS: CHỈNH SỬA & XÓA LẦN THANH TOÁN (TỪ BẢNG ĐÃ TRẢ)
  // ==========================================
  const handleOpenEditPaymentItem = (paymentItem: FlattenedPaymentItem) => {
    setEditingPaymentItem(paymentItem);
    setEditPaymentAmountStr(String(paymentItem.amount));
    setEditPaymentDate(paymentItem.paymentDate || getLocalTodayISO());
    setEditPaymentMethod((paymentItem.paymentMethod as BonusPaymentMethod) || "Chuyển khoản");
    setEditPaymentNotes(paymentItem.notes || "");
  };

  const handleSaveEditPaymentItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPaymentItem) return;

    const newAmt = parseVND(editPaymentAmountStr);
    if (newAmt <= 0) {
      alert("Vui lòng nhập số tiền thanh toán lớn hơn 0!");
      return;
    }

    updateAndPersistData((prev) => ({
      ...prev,
      bonusEntries: prev.bonusEntries.map((b) => {
        if (b.id !== editingPaymentItem.bonusEntryId) return b;
        const updatedPayments = b.payments.map((p) => {
          if (p.id !== editingPaymentItem.id) return p;
          return {
            ...p,
            amount: newAmt,
            paymentDate: editPaymentDate || getLocalTodayISO(),
            paymentMethod: editPaymentMethod,
            notes: editPaymentNotes.trim(),
          };
        });
        const newPaid = updatedPayments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0);
        return {
          ...b,
          payments: updatedPayments,
          paidAmount: newPaid,
          remainingAmount: b.amount - newPaid,
          updatedAt: new Date().toISOString(),
        };
      }),
    }));

    showToast(`Đã cập nhật lượt trả tiền ${formatVND(newAmt)} cho ${editingPaymentItem.supplierName}!`);
    setEditingPaymentItem(null);
  };

  // Xóa lượt trả tiền - Dùng in-app confirm modal không bao giờ bị chặn
  const handleDeleteFlattenedPayment = (paymentItem: FlattenedPaymentItem) => {
    setConfirmDeleteModal({
      isOpen: true,
      title: "Xóa lượt trả tiền",
      message: `Bạn có chắc muốn xóa lượt trả tiền ${formatVND(paymentItem.amount)} ngày ${formatDateDDMMYYYY(paymentItem.paymentDate)} của ${paymentItem.supplierName}?`,
      subMessage: `Khoản thưởng liên quan: ${paymentItem.period} (${formatVND(paymentItem.bonusAmount)})`,
      onConfirm: () => {
        executeDeletePayment(paymentItem.bonusEntryId, paymentItem.id, paymentItem.supplierName);
      },
    });
  };

  // ==========================================
  // HANDLERS: SUPPLIER MODAL
  // ==========================================
  const handleOpenAddSupplier = () => {
    setEditingSupplier(null);
    setFormSupplierCode(`NCC-${Date.now().toString().slice(-4)}`);
    setFormSupplierName("");
    setFormSupplierNotes("");
    setFormSupplierStatus("active");
    setIsSupplierModalOpen(true);
  };

  const handleOpenEditSupplier = (sup: Supplier) => {
    setEditingSupplier(sup);
    setFormSupplierCode(sup.code);
    setFormSupplierName(sup.name);
    setFormSupplierNotes(sup.notes || "");
    setFormSupplierStatus(sup.status);
    setIsSupplierModalOpen(true);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanCode = formSupplierCode.trim().toUpperCase();
    const cleanName = formSupplierName.trim();

    if (!cleanCode) {
      alert("Vui lòng nhập Mã Nhà cung cấp!");
      return;
    }
    if (!cleanName) {
      alert("Vui lòng nhập Tên Nhà cung cấp!");
      return;
    }

    const isDup = data.suppliers.some(
      (s) => s.code.toLowerCase() === cleanCode.toLowerCase() && s.id !== editingSupplier?.id
    );
    if (isDup) {
      alert(`Mã Nhà cung cấp "${cleanCode}" đã tồn tại! Vui lòng chọn mã khác.`);
      return;
    }

    if (editingSupplier) {
      updateAndPersistData((prev) => ({
        ...prev,
        suppliers: prev.suppliers.map((s) =>
          s.id === editingSupplier.id
            ? {
                ...s,
                code: cleanCode,
                name: cleanName,
                notes: formSupplierNotes.trim(),
                status: formSupplierStatus,
                updatedAt: new Date().toISOString(),
              }
            : s
        ),
        bonusEntries: prev.bonusEntries.map((b) =>
          b.supplierId === editingSupplier.id
            ? {
                ...b,
                supplierCode: cleanCode,
                supplierName: cleanName,
              }
            : b
        ),
      }));
      showToast(`Đã cập nhật Nhà cung cấp "${cleanName}"!`);
    } else {
      const newSup: Supplier = {
        id: `sup_${Date.now()}`,
        code: cleanCode,
        name: cleanName,
        notes: formSupplierNotes.trim(),
        status: formSupplierStatus,
        createdAt: new Date().toISOString(),
      };
      updateAndPersistData((prev) => ({
        ...prev,
        suppliers: [newSup, ...prev.suppliers],
      }));
      showToast(`Đã thêm mới Nhà cung cấp "${cleanName}"!`);
      setFormSupplierId(newSup.id);
    }

    setEditingSupplier(null);
    setFormSupplierCode("");
    setFormSupplierName("");
    setFormSupplierNotes("");
  };

  const executeDeleteSupplier = (supId: string, supName: string) => {
    updateAndPersistData((prev) => ({
      ...prev,
      suppliers: prev.suppliers.filter((s) => s.id !== supId),
      bonusEntries: prev.bonusEntries.filter((b) => b.supplierId !== supId),
    }));

    if (selectedSupplierId === supId) {
      setSelectedSupplierId("all");
    }
    setPendingDeleteSupplierId(null);
    setConfirmDeleteModal((prev) => ({ ...prev, isOpen: false }));
    showToast(`Đã xóa Nhà cung cấp "${supName}" và các khoản liên quan!`);
  };

  // Xóa Nhà Cung Cấp - Dùng in-app confirm modal không bao giờ bị chặn
  const handleDeleteSupplier = (sup: Supplier) => {
    const relatedCount = data.bonusEntries.filter((b) => b.supplierId === sup.id).length;
    setConfirmDeleteModal({
      isOpen: true,
      title: "Xóa Nhà cung cấp",
      message: `Bạn có chắc chắn muốn xóa Nhà cung cấp "${sup.name}" (${sup.code})?`,
      subMessage: relatedCount > 0
        ? `CẢNH BÁO: Nhà cung cấp này đang có ${relatedCount} khoản thưởng/chiết khấu. Khi xóa, toàn bộ các khoản thưởng này cũng sẽ bị xóa khỏi hệ thống!`
        : undefined,
      onConfirm: () => {
        executeDeleteSupplier(sup.id, sup.name);
      },
    });
  };

  return (
    <div className="w-full space-y-4 pb-12 font-sans">
      {/* Toast Feedback with optional Undo */}
      {toastConfig && (
        <div className="fixed top-5 right-5 z-[10000] bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-2xl flex items-center gap-3 text-xs font-semibold animate-in slide-in-from-top-3 border border-slate-700">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastConfig.message}</span>
          {toastConfig.onUndo && (
            <button
              type="button"
              onClick={() => {
                toastConfig.onUndo!();
                setToastConfig(null);
              }}
              className="px-2.5 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-bold cursor-pointer transition-colors shadow-xs"
            >
              Hoàn tác
            </button>
          )}
        </div>
      )}

      {/* TOP BAR / NAVIGATION */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs p-3.5 sm:p-4 flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBackToMain}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Quay lại giao diện chính của ứng dụng"
          >
            <ArrowLeft className="w-4 h-4 text-slate-700" />
            <span>← Về App chính</span>
          </button>

          <div className="border-l border-slate-200 pl-3">
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-blue-100 text-blue-800 rounded-lg">
                <Award className="w-4 h-4 text-blue-700" />
              </span>
              <h1 className="text-sm sm:text-base font-black text-slate-900 uppercase tracking-tight">
                THƯỞNG & CHIẾT KHẤU NHÀ CUNG CẤP
              </h1>
            </div>
            <p className="text-[11px] text-slate-500 hidden sm:block mt-0.5">
              Theo dõi tách biệt: Danh sách thưởng cần thu &amp; Danh sách nhà cung cấp đã trả tiền
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start md:self-auto flex-wrap">
          <button
            type="button"
            onClick={() => setIsSupplierModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 border border-slate-300 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95"
            title="Quản lý danh sách các Nhà cung cấp"
          >
            <Building2 className="w-3.5 h-3.5 text-slate-600" />
            <span>Nhà cung cấp ({data.suppliers.length})</span>
          </button>

          <button
            type="button"
            onClick={handleOpenAddBonusModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shadow-blue-500/20"
            title="Nhập khoản thưởng hoặc chiết khấu mới"
          >
            <Plus className="w-4 h-4" />
            <span>+ Thêm khoản thưởng</span>
          </button>

          <button
            type="button"
            onClick={handleOpenStandalonePaymentModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm active:scale-95 shadow-emerald-500/20"
            title="Ghi nhận lượt trả tiền mới từ nhà cung cấp"
          >
            <CreditCard className="w-4 h-4" />
            <span>+ Ghi nhận đã trả</span>
          </button>
        </div>
      </div>

      {/* ======================================================== */}
      {/* KHU VỰC TỔNG QUAN HỢP NHẤT (CHUNG CHO TẤT CẢ HOẶC NCC CỤ THỂ) */}
      {/* ======================================================== */}
      {(() => {
        const isSupplierSelected = Boolean(selectedSupplier && supplierBreakdown);
        const activeSummary = isSupplierSelected ? supplierBreakdown! : breakdown;

        return (
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            {/* Header thanh tổng quan: Nếu chọn NCC thì hiển thị thông tin NCC kèm nút 'Xem tất cả NCC', nếu không thì hiển thị Tổng hợp toàn bộ NCC */}
            <div className={`p-3 sm:px-4 sm:py-3 border-b flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
              isSupplierSelected
                ? "bg-gradient-to-r from-blue-50/90 via-indigo-50/60 to-white border-blue-200"
                : "bg-slate-50/80 border-slate-200"
            }`}>
              <div className="flex items-center gap-2.5 flex-wrap">
                {isSupplierSelected ? (
                  <>
                    <span className="px-2 py-0.5 rounded-md bg-blue-700 text-white font-mono font-bold text-xs shadow-2xs">
                      {selectedSupplier!.code}
                    </span>
                    <h2 className="text-sm sm:text-base font-extrabold text-slate-900">
                      {selectedSupplier!.name}
                    </h2>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        selectedSupplier!.status === "active"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      {selectedSupplier!.status === "active" ? "Đang hoạt động" : "Ngừng hoạt động"}
                    </span>
                    {selectedSupplier!.notes && (
                      <span className="text-xs text-slate-500 italic hidden md:inline">
                        — Ghi chú: {selectedSupplier!.notes}
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    <span className="p-1 rounded-lg bg-blue-100 text-blue-700">
                      <Award className="w-4 h-4" />
                    </span>
                    <h2 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase tracking-wide">
                      TỔNG HỢP TOÀN BỘ NHÀ CUNG CẤP
                    </h2>
                    <span className="text-[11px] font-medium text-slate-500">
                      ({data.suppliers.length} nhà cung cấp • {data.bonusEntries.length} khoản thưởng)
                    </span>
                  </>
                )}
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                {isSupplierSelected ? (
                  <button
                    type="button"
                    onClick={() => setSelectedSupplierId("all")}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-blue-700 hover:text-blue-900 bg-white hover:bg-blue-50 px-3 py-1.5 rounded-xl border border-blue-300 shadow-2xs transition-colors cursor-pointer"
                    title="Bấm để quay lại xem tổng hợp tất cả nhà cung cấp"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Xem tất cả NCC</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1.5 text-xs text-slate-600">
                    <span className="text-[11px] font-medium text-slate-500 hidden sm:inline">Lọc theo NCC:</span>
                    <select
                      value={selectedSupplierId}
                      onChange={(e) => setSelectedSupplierId(e.target.value)}
                      className="text-xs font-bold py-1 px-2.5 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="all">-- Xem tất cả ({data.suppliers.length} NCC) --</option>
                      {data.suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.code} - {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            </div>

            {/* 5 Thẻ thống kê hợp nhất: TỔNG QUAN, THÁNG, QUÝ, NĂM, KHÁC */}
            <div className="p-3 sm:p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {/* Thẻ 1: TỔNG CỘNG / TỔNG QUAN */}
              <div
                onClick={() => {
                  setActiveTab("all");
                  setActiveView("bonus");
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                  activeTab === "all" && activeView === "bonus"
                    ? "bg-gradient-to-br from-blue-50 via-white to-blue-50/40 border-blue-400 ring-2 ring-blue-500/20 shadow-xs"
                    : "bg-white border-slate-200/90 hover:border-blue-300 hover:shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-blue-900 flex items-center gap-1">
                    <Award className="w-3.5 h-3.5 text-blue-600" />
                    {isSupplierSelected ? "TỔNG QUAN" : "TỔNG CỘNG"} ({activeSummary.all.count})
                  </span>
                  {activeTab === "all" && activeView === "bonus" && (
                    <span className="w-2 h-2 rounded-full bg-blue-600 animate-pulse" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-slate-500">Tổng thưởng:</span>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {formatVND(activeSummary.all.total)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-emerald-700 font-medium">Đã trả:</span>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {formatVND(activeSummary.all.paid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                    <span className="text-xs font-bold text-rose-700">Còn phải thu:</span>
                    <span className="text-sm font-mono font-black text-rose-600">
                      {formatVND(activeSummary.all.remaining)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thẻ 2: THÁNG */}
              <div
                onClick={() => {
                  setActiveTab("month");
                  setActiveView("bonus");
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                  activeTab === "month" && activeView === "bonus"
                    ? "bg-gradient-to-br from-indigo-50 via-white to-indigo-50/40 border-indigo-400 ring-2 ring-indigo-500/20 shadow-xs"
                    : "bg-white border-slate-200/90 hover:border-indigo-300 hover:shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-indigo-900 flex items-center gap-1">
                    <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                    THÁNG ({activeSummary.month.count})
                  </span>
                  {activeTab === "month" && activeView === "bonus" && (
                    <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-slate-500">Tổng thưởng:</span>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {formatVND(activeSummary.month.total)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-emerald-700 font-medium">Đã trả:</span>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {formatVND(activeSummary.month.paid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                    <span className="text-xs font-bold text-rose-700">Còn:</span>
                    <span className="text-sm font-mono font-black text-rose-600">
                      {formatVND(activeSummary.month.remaining)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thẻ 3: QUÝ */}
              <div
                onClick={() => {
                  setActiveTab("quarter");
                  setActiveView("bonus");
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                  activeTab === "quarter" && activeView === "bonus"
                    ? "bg-gradient-to-br from-purple-50 via-white to-purple-50/40 border-purple-400 ring-2 ring-purple-500/20 shadow-xs"
                    : "bg-white border-slate-200/90 hover:border-purple-300 hover:shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-purple-900 flex items-center gap-1">
                    <Percent className="w-3.5 h-3.5 text-purple-600" />
                    QUÝ ({activeSummary.quarter.count})
                  </span>
                  {activeTab === "quarter" && activeView === "bonus" && (
                    <span className="w-2 h-2 rounded-full bg-purple-600 animate-pulse" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-slate-500">Tổng thưởng:</span>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {formatVND(activeSummary.quarter.total)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-emerald-700 font-medium">Đã trả:</span>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {formatVND(activeSummary.quarter.paid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                    <span className="text-xs font-bold text-rose-700">Còn:</span>
                    <span className="text-sm font-mono font-black text-rose-600">
                      {formatVND(activeSummary.quarter.remaining)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thẻ 4: NĂM */}
              <div
                onClick={() => {
                  setActiveTab("year");
                  setActiveView("bonus");
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                  activeTab === "year" && activeView === "bonus"
                    ? "bg-gradient-to-br from-amber-50 via-white to-amber-50/40 border-amber-400 ring-2 ring-amber-500/20 shadow-xs"
                    : "bg-white border-slate-200/90 hover:border-amber-300 hover:shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-amber-950 flex items-center gap-1">
                    <TrendingUp className="w-3.5 h-3.5 text-amber-600" />
                    NĂM ({activeSummary.year.count})
                  </span>
                  {activeTab === "year" && activeView === "bonus" && (
                    <span className="w-2 h-2 rounded-full bg-amber-600 animate-pulse" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-slate-500">Tổng thưởng:</span>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {formatVND(activeSummary.year.total)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-emerald-700 font-medium">Đã trả:</span>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {formatVND(activeSummary.year.paid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                    <span className="text-xs font-bold text-rose-700">Còn:</span>
                    <span className="text-sm font-mono font-black text-rose-600">
                      {formatVND(activeSummary.year.remaining)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Thẻ 5: KHÁC */}
              <div
                onClick={() => {
                  setActiveTab("other");
                  setActiveView("bonus");
                }}
                className={`p-3 rounded-xl border transition-all cursor-pointer relative overflow-hidden ${
                  activeTab === "other" && activeView === "bonus"
                    ? "bg-gradient-to-br from-teal-50 via-white to-teal-50/40 border-teal-400 ring-2 ring-teal-500/20 shadow-xs"
                    : "bg-white border-slate-200/90 hover:border-teal-300 hover:shadow-2xs"
                }`}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-extrabold uppercase tracking-wider text-teal-950 flex items-center gap-1">
                    <Tag className="w-3.5 h-3.5 text-teal-600" />
                    KHÁC ({activeSummary.other.count})
                  </span>
                  {activeTab === "other" && activeView === "bonus" && (
                    <span className="w-2 h-2 rounded-full bg-teal-600 animate-pulse" />
                  )}
                </div>
                <div className="space-y-1">
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-slate-500">Tổng thưởng:</span>
                    <span className="text-xs font-mono font-bold text-slate-900">
                      {formatVND(activeSummary.other.total)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline">
                    <span className="text-[11px] text-emerald-700 font-medium">Đã trả:</span>
                    <span className="text-xs font-mono font-bold text-emerald-700">
                      {formatVND(activeSummary.other.paid)}
                    </span>
                  </div>
                  <div className="flex justify-between items-baseline pt-1 border-t border-slate-100">
                    <span className="text-xs font-bold text-rose-700">Còn:</span>
                    <span className="text-sm font-mono font-black text-rose-600">
                      {formatVND(activeSummary.other.remaining)}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );
      })()}

      {/* ======================================================== */}
      {/* 2 TABS LỚN: TÁCH RIÊNG DANH SÁCH THƯỞNG VÀ DANH SÁCH ĐÃ TRẢ */}
      {/* ======================================================== */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-1.5 p-1 bg-slate-100/90 rounded-xl w-full sm:w-auto">
          <button
            type="button"
            onClick={() => setActiveView("bonus")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeView === "bonus"
                ? "bg-blue-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <FileText className="w-4 h-4" />
            <span>1. DANH SÁCH KHOẢN THƯỞNG ({data.bonusEntries.length})</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveView("payments")}
            className={`flex-1 sm:flex-initial inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-xs font-extrabold transition-all cursor-pointer ${
              activeView === "payments"
                ? "bg-emerald-600 text-white shadow-xs"
                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            <span>2. DANH SÁCH ĐÃ TRẢ TIỀN ({allPayments.length} lượt trả)</span>
          </button>
        </div>

        <div className="flex items-center gap-2 px-2">
          {activeView === "bonus" ? (
            <button
              type="button"
              onClick={handleOpenAddBonusModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-blue-700" />
              <span>+ Thêm khoản thưởng mới</span>
            </button>
          ) : (
            <button
              type="button"
              onClick={handleOpenStandalonePaymentModal}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-xl text-xs font-bold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-emerald-700" />
              <span>+ Thêm lượt trả tiền</span>
            </button>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* VIEW 1: DANH SÁCH KHOẢN THƯỞNG & CHIẾT KHẤU             */}
      {/* ======================================================== */}
      {activeView === "bonus" && (
        <div className="space-y-4">
          {/* TOOLBAR & FILTERS CHO DANH SÁCH THƯỞNG */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 space-y-3">
            {/* Hàng 1: Tabs phân loại */}
            <div className="flex flex-wrap items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveTab("all")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "all"
                      ? "bg-slate-900 text-white shadow-xs"
                      : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                  }`}
                >
                  Tất cả ({breakdown.all.count})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("month")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "month"
                      ? "bg-indigo-600 text-white shadow-xs"
                      : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                  }`}
                >
                  Tháng ({breakdown.month.count})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("quarter")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "quarter"
                      ? "bg-purple-600 text-white shadow-xs"
                      : "bg-purple-50 text-purple-700 hover:bg-purple-100"
                  }`}
                >
                  Quý ({breakdown.quarter.count})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("year")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "year"
                      ? "bg-amber-600 text-white shadow-xs"
                      : "bg-amber-50 text-amber-800 hover:bg-amber-100"
                  }`}
                >
                  Năm ({breakdown.year.count})
                </button>
                <button
                  type="button"
                  onClick={() => setActiveTab("other")}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                    activeTab === "other"
                      ? "bg-teal-600 text-white shadow-xs"
                      : "bg-teal-50 text-teal-800 hover:bg-teal-100"
                  }`}
                >
                  Khác ({breakdown.other.count})
                </button>
              </div>

              <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <span>Đang hiển thị: <strong>{filteredBonusEntries.length}</strong> / {data.bonusEntries.length} khoản thưởng</span>
              </div>
            </div>

            {/* Hàng 2: Bộ lọc chi tiết & Tìm kiếm */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Nhà cung cấp
                </label>
                <select
                  value={selectedSupplierId}
                  onChange={(e) => setSelectedSupplierId(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">-- Tất cả nhà cung cấp ({data.suppliers.length}) --</option>
                  {data.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Năm
                </label>
                <select
                  value={yearFilter}
                  onChange={(e) => setYearFilter(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">-- Tất cả các năm --</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={String(yr)}>
                      Năm {yr}
                    </option>
                  ))}
                </select>
              </div>

              {(activeTab === "all" || activeTab === "month") && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Tháng cụ thể
                  </label>
                  <select
                    value={monthFilter}
                    onChange={(e) => setMonthFilter(e.target.value)}
                    className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">-- Tất cả các tháng --</option>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                      <option key={m} value={String(m)}>
                        Tháng {m}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {activeTab === "quarter" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                    Quý cụ thể
                  </label>
                  <select
                    value={quarterFilter}
                    onChange={(e) => setQuarterFilter(e.target.value)}
                    className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="all">-- Tất cả các quý --</option>
                    {[1, 2, 3, 4].map((q) => (
                      <option key={q} value={String(q)}>
                        Quý {q}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Trạng thái thanh toán
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">-- Tất cả trạng thái --</option>
                  <option value="unpaid">Còn phải thu (&gt; 0 đ)</option>
                  <option value="completed">Đã thu đủ (Còn 0 đ)</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Hình thức trả
                </label>
                <select
                  value={paymentMethodFilter}
                  onChange={(e) => setPaymentMethodFilter(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">-- Tất cả hình thức --</option>
                  {BONUS_PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Tìm kiếm
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Tên NCC, mã, kỳ, ghi chú, ngày..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                  {searchQuery && (
                    <button
                      type="button"
                      onClick={() => setSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BẢNG DANH SÁCH CÁC KHOẢN THƯỞNG: CÓ CỘT MỚI 'NGÀY TRẢ THƯỞNG' VÀ 'HÌNH THỨC TRẢ THƯỞNG' */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-slate-50 border-b border-slate-200/80 flex items-center justify-between">
              <span className="text-xs font-bold text-slate-900 uppercase tracking-tight flex items-center gap-1.5">
                <FileText className="w-4 h-4 text-blue-600" />
                DANH SÁCH KHOẢN THƯỞNG &amp; CHIẾT KHẤU ({filteredBonusEntries.length})
              </span>

              {(selectedSupplierId !== "all" || yearFilter !== "all" || monthFilter !== "all" || quarterFilter !== "all" || statusFilter !== "all" || paymentMethodFilter !== "all" || searchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedSupplierId("all");
                    setYearFilter("all");
                    setMonthFilter("all");
                    setQuarterFilter("all");
                    setStatusFilter("all");
                    setPaymentMethodFilter("all");
                    setSearchQuery("");
                    setActiveTab("all");
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            {filteredBonusEntries.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <Award className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-bold text-slate-700 text-sm">Chưa có khoản thưởng nào phù hợp</p>
                <p className="text-xs text-slate-400">
                  Nhấn "+ Thêm khoản thưởng" để bắt đầu theo dõi chiết khấu và thưởng từ nhà cung cấp.
                </p>
                <button
                  type="button"
                  onClick={handleOpenAddBonusModal}
                  className="mt-2 inline-flex items-center gap-1 px-4 py-2 bg-blue-600 text-white rounded-xl text-xs font-bold hover:bg-blue-700 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Thêm khoản thưởng ngay
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full min-w-[980px] text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/90 border-b border-slate-200 text-slate-700 text-[11px] uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">STT</th>
                      <th className="py-2.5 px-3 min-w-[150px]">Nhà cung cấp</th>
                      <th className="py-2.5 px-2.5 text-center w-18">Loại</th>
                      <th className="py-2.5 px-3 w-28 text-center">Thời gian</th>
                      {/* CỘT MỚI YÊU CẦU: NGÀY TRẢ THƯỞNG */}
                      <th className="py-2.5 px-3 w-36 text-center whitespace-nowrap bg-blue-50/80 text-blue-900 border-x border-blue-200/60 font-black">
                        NGÀY TRẢ THƯỞNG
                      </th>
                      {/* CỘT MỚI YÊU CẦU: HÌNH THỨC TRẢ THƯỞNG */}
                      <th className="py-2.5 px-3 min-w-[140px] text-center whitespace-nowrap bg-slate-50 text-slate-800 border-r border-slate-200 font-bold">
                        Hình thức trả thưởng
                      </th>
                      <th className="py-2.5 px-3 text-right min-w-[110px]">Tiền thưởng</th>
                      <th className="py-2.5 px-3 text-right min-w-[110px]">Đã trả</th>
                      <th className="py-2.5 px-3 text-right min-w-[110px]">Còn phải thu</th>
                      <th className="py-2.5 px-3 min-w-[130px] max-w-xs">Ghi chú chính sách</th>
                      <th className="py-2.5 px-3 w-44 text-center whitespace-nowrap">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredBonusEntries.map((entry, idx) => {
                      const isFullyPaid = entry.remainingAmount <= 0;
                      const isOverpaid = entry.paidAmount > entry.amount;

                      let typeBadgeClass = "bg-slate-100 text-slate-700 border-slate-200";
                      let typeLabel = "Khác";
                      if (entry.type === "month") {
                        typeBadgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold";
                        typeLabel = "Tháng";
                      } else if (entry.type === "quarter") {
                        typeBadgeClass = "bg-purple-50 text-purple-700 border-purple-200 font-bold";
                        typeLabel = "Quý";
                      } else if (entry.type === "year") {
                        typeBadgeClass = "bg-amber-50 text-amber-800 border-amber-200 font-bold";
                        typeLabel = "Năm";
                      }

                      const effectivePayoutDate = entry.payoutDate;

                      return (
                        <tr
                          key={entry.id}
                          className={`transition-colors ${idx % 2 === 1 ? "bg-slate-50/40" : "bg-white"} hover:bg-blue-50/50`}
                        >
                          <td className="py-2.5 px-3 text-center text-slate-400 font-mono text-[11px]">
                            {idx + 1}
                          </td>

                          <td className="py-2.5 px-3">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span
                                onClick={() => setSelectedSupplierId(entry.supplierId)}
                                className="hover:underline hover:text-blue-600 cursor-pointer"
                                title="Lọc xem riêng các khoản của NCC này"
                              >
                                {entry.supplierName}
                              </span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {entry.supplierCode}
                              </span>
                            </div>
                          </td>

                          <td className="py-2.5 px-2 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-lg border text-[10.5px] ${typeBadgeClass}`}>
                              {typeLabel}
                            </span>
                          </td>

                          <td className="py-2.5 px-3 font-semibold text-slate-800 text-center">
                            {entry.period}
                          </td>

                          {/* CỘT MỚI YÊU CẦU: NGÀY TRẢ THƯỞNG (Có thể để trống) */}
                          <td className="py-2.5 px-3 text-center border-x border-blue-100/60 bg-blue-50/15">
                            {effectivePayoutDate ? (
                              <button
                                type="button"
                                onClick={() => handleOpenEditBonusModal(entry)}
                                className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-lg bg-white text-blue-950 border border-blue-200 font-mono font-bold text-[11.5px] hover:border-blue-400 hover:shadow-2xs transition-all cursor-pointer group"
                                title="Bấm để chỉnh sửa Ngày trả thưởng"
                              >
                                <Calendar className="w-3.5 h-3.5 text-blue-600 shrink-0 group-hover:scale-110 transition-transform" />
                                <span>{formatDateDDMMYYYY(effectivePayoutDate)}</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenEditBonusModal(entry)}
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors cursor-pointer italic font-medium"
                                title="Ngày trả thưởng đang để trống - Bấm để đặt ngày nếu muốn"
                              >
                                <span>—</span>
                                <span className="text-[10px] text-slate-400 font-normal">(Để trống)</span>
                              </button>
                            )}
                          </td>

                          {/* CỘT MỚI YÊU CẦU: HÌNH THỨC TRẢ THƯỞNG */}
                          <td className="py-2.5 px-3 text-center border-r border-slate-200/60">
                            <button
                              type="button"
                              onClick={() => handleOpenEditBonusModal(entry)}
                              className="cursor-pointer hover:opacity-80 transition-opacity inline-flex items-center justify-center"
                              title="Bấm để chỉnh sửa Hình thức trả thưởng"
                            >
                              {renderPaymentMethodBadge(entry.paymentMethod)}
                            </button>
                          </td>

                          <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900 text-xs sm:text-[13px]">
                            {formatVND(entry.amount)}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            <div className="font-mono font-bold text-emerald-700 text-xs sm:text-[13px]">
                              {formatVND(entry.paidAmount)}
                            </div>
                            {entry.payments.length > 0 && (
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveView("payments");
                                  setPaymentSupplierFilter(entry.supplierId);
                                }}
                                className="text-[10px] text-blue-600 hover:underline block font-normal cursor-pointer text-right w-full"
                                title="Xem danh sách các lần trả tiền này"
                              >
                                ({entry.payments.length} lần trả)
                              </button>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-right">
                            {isFullyPaid ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100 text-emerald-800 font-bold text-[11px]">
                                <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                Đã thu đủ
                              </span>
                            ) : (
                              <div className="font-mono font-black text-rose-600 text-xs sm:text-[13px]">
                                {formatVND(entry.remainingAmount)}
                              </div>
                            )}
                            {isOverpaid && (
                              <span className="text-[10px] font-bold text-amber-600 flex items-center justify-end gap-1 mt-0.5" title="Số tiền đã trả vượt quá mức thưởng ban đầu!">
                                <AlertTriangle className="w-3 h-3 text-amber-500" />
                                Trả dư {formatVND(entry.paidAmount - entry.amount)}
                              </span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-slate-600 max-w-xs text-xs">
                            {entry.notes ? (
                              <p className="truncate" title={entry.notes}>
                                {entry.notes}
                              </p>
                            ) : (
                              <span className="text-slate-300 italic">--</span>
                            )}
                          </td>

                          <td className="py-2.5 px-3 text-center">
                            <div className="flex items-center justify-center gap-1">
                              {/* Ghi nhận Đã trả */}
                              <button
                                type="button"
                                onClick={() => handleOpenPaymentModal(entry)}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs active:scale-95 whitespace-nowrap"
                                title="Ghi nhận trả tiền"
                              >
                                <CreditCard className="w-3.5 h-3.5" />
                                <span>Đã trả</span>
                              </button>

                              {/* NHÂN BẢN KHOẢN THƯỞNG */}
                              <button
                                type="button"
                                onClick={() => handleDuplicateBonus(entry)}
                                className="p-1.5 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-blue-200"
                                title="Nhân bản khoản thưởng (Sao chép sang khoản mới)"
                              >
                                <Copy className="w-4 h-4" />
                              </button>

                              {/* Chỉnh sửa */}
                              <button
                                type="button"
                                onClick={() => handleOpenEditBonusModal(entry)}
                                className="p-1.5 text-slate-600 hover:text-blue-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-slate-200"
                                title="Sửa khoản thưởng này"
                              >
                                <Edit2 className="w-4 h-4" />
                              </button>

                              {/* NÚT XÓA: HỖ TRỢ XÁC NHẬN TỨC THÌ INLINE KHÔNG LO LỖI MODAL BỊ CHẶN */}
                              {pendingDeleteBonusId === entry.id ? (
                                <div className="inline-flex items-center gap-0.5 bg-rose-50 border border-rose-300 p-0.5 rounded-lg animate-in fade-in">
                                  <button
                                    type="button"
                                    onClick={() => executeDeleteBonus(entry.id, entry.period)}
                                    className="px-2 py-0.5 bg-rose-600 hover:bg-rose-700 text-white rounded text-[10.5px] font-bold transition-all shadow-xs flex items-center gap-0.5 cursor-pointer active:scale-95"
                                    title="Xác nhận xóa vĩnh viễn"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Xóa!</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingDeleteBonusId(null)}
                                    className="p-1 text-slate-400 hover:text-slate-700 rounded text-xs cursor-pointer"
                                    title="Hủy"
                                  >
                                    <X className="w-3 h-3" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPendingDeleteBonusId(entry.id);
                                    setTimeout(() => {
                                      setPendingDeleteBonusId((curr) => (curr === entry.id ? null : curr));
                                    }, 6000);
                                  }}
                                  className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                                  title="Xóa khoản thưởng này (Bấm để xác nhận)"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                  {/* TỔNG CỘNG CHO DANH SÁCH ĐƯỢC LỌC - CANH CHỈNH ĐÚNG 11 CỘT */}
                  {filteredBonusEntries.length > 0 && (
                    <tfoot className="bg-slate-100/95 border-t-2 border-slate-300 font-bold text-slate-800 text-xs">
                      <tr>
                        <td colSpan={6} className="py-3 px-3 text-right uppercase tracking-wider text-[11px] text-slate-700 font-black border-r border-slate-200/80">
                          TỔNG CỘNG ({filteredBonusEntries.length} KHOẢN):
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-slate-900 text-xs sm:text-sm border-r border-slate-200/80 whitespace-nowrap">
                          {formatVND(filteredBonusEntries.reduce((sum, e) => sum + e.amount, 0))}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 text-xs sm:text-sm border-r border-slate-200/80 whitespace-nowrap">
                          {formatVND(filteredBonusEntries.reduce((sum, e) => sum + e.paidAmount, 0))}
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-rose-600 text-xs sm:text-sm border-r border-slate-200/80 whitespace-nowrap">
                          {formatVND(filteredBonusEntries.reduce((sum, e) => sum + Math.max(0, e.remainingAmount), 0))}
                        </td>
                        <td colSpan={2} className="py-3 px-3 bg-slate-50/60"></td>
                      </tr>
                    </tfoot>
                  )}
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* VIEW 2: DANH SÁCH NHÀ CUNG CẤP ĐÃ TRẢ TIỀN               */}
      {/* ======================================================== */}
      {activeView === "payments" && (
        <div className="space-y-4">
          {/* TOOLBAR & FILTERS CHO DANH SÁCH ĐÃ TRẢ */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-3.5 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2.5 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <span className="p-1.5 bg-emerald-100 text-emerald-800 rounded-lg">
                  <CreditCard className="w-4 h-4 text-emerald-700" />
                </span>
                <div>
                  <h3 className="text-xs sm:text-sm font-extrabold text-slate-900 uppercase">
                    DANH SÁCH CÁC ĐỢT NHÀ CUNG CẤP ĐÃ TRẢ TIỀN
                  </h3>
                  <span className="text-[11px] text-slate-500 font-medium">
                    Tổng cộng: <strong>{filteredPayments.length}</strong> đợt trả • Tổng tiền đã nhận:{" "}
                    <strong className="text-emerald-700 font-mono">{formatVND(totalFilteredPaymentsAmount)}</strong>
                  </span>
                </div>
              </div>

              <button
                type="button"
                onClick={handleOpenStandalonePaymentModal}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-xs active:scale-95 self-start sm:self-auto"
              >
                <Plus className="w-4 h-4" />
                <span>+ Ghi nhận lượt trả tiền</span>
              </button>
            </div>

            {/* Hàng lọc Danh sách Đã trả */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Nhà cung cấp
                </label>
                <select
                  value={paymentSupplierFilter}
                  onChange={(e) => setPaymentSupplierFilter(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">-- Tất cả nhà cung cấp ({data.suppliers.length}) --</option>
                  {data.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Loại kỳ thưởng
                </label>
                <select
                  value={paymentTypeFilter}
                  onChange={(e) => setPaymentTypeFilter(e.target.value as any)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">-- Tất cả loại kỳ --</option>
                  <option value="month">Khoản Tháng</option>
                  <option value="quarter">Khoản Quý</option>
                  <option value="year">Khoản Năm</option>
                  <option value="other">Khoản Khác</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Năm trả tiền
                </label>
                <select
                  value={paymentYearFilter}
                  onChange={(e) => setPaymentYearFilter(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">-- Tất cả các năm --</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={String(yr)}>
                      Năm {yr}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Hình thức trả
                </label>
                <select
                  value={paymentListMethodFilter}
                  onChange={(e) => setPaymentListMethodFilter(e.target.value)}
                  className="w-full text-xs py-1.5 px-2.5 rounded-xl border border-slate-300 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="all">-- Tất cả hình thức --</option>
                  {BONUS_PAYMENT_METHODS.map((m) => (
                    <option key={m} value={m}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div className="relative">
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1">
                  Tìm kiếm lượt trả
                </label>
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    value={paymentSearchQuery}
                    onChange={(e) => setPaymentSearchQuery(e.target.value)}
                    placeholder="Tên NCC, ngày, ghi chú..."
                    className="w-full pl-8 pr-7 py-1.5 text-xs rounded-xl border border-slate-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                  {paymentSearchQuery && (
                    <button
                      type="button"
                      onClick={() => setPaymentSearchQuery("")}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* BẢNG DANH SÁCH NHÀ CUNG CẤP ĐÃ TRẢ TIỀN */}
          <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
            <div className="p-3.5 bg-emerald-50/60 border-b border-emerald-100 flex items-center justify-between">
              <span className="text-xs font-bold text-emerald-950 uppercase tracking-tight flex items-center gap-1.5">
                <CreditCard className="w-4 h-4 text-emerald-700" />
                LỊCH SỬ NHÀ CUNG CẤP ĐÃ TRẢ TIỀN ({filteredPayments.length} LƯỢT)
              </span>

              {(paymentSupplierFilter !== "all" || paymentTypeFilter !== "all" || paymentListMethodFilter !== "all" || paymentYearFilter !== "all" || paymentSearchQuery) && (
                <button
                  type="button"
                  onClick={() => {
                    setPaymentSupplierFilter("all");
                    setPaymentTypeFilter("all");
                    setPaymentListMethodFilter("all");
                    setPaymentYearFilter("all");
                    setPaymentSearchQuery("");
                  }}
                  className="text-[11px] font-bold text-rose-600 hover:text-rose-800 underline cursor-pointer"
                >
                  Xóa bộ lọc
                </button>
              )}
            </div>

            {filteredPayments.length === 0 ? (
              <div className="py-12 text-center text-slate-400 space-y-2">
                <CreditCard className="w-10 h-10 mx-auto text-slate-300" />
                <p className="font-bold text-slate-700 text-sm">Chưa có lượt trả tiền nào</p>
                <p className="text-xs text-slate-400">
                  Nhấn "+ Ghi nhận đã trả" để thêm đợt thanh toán từ nhà cung cấp.
                </p>
                <button
                  type="button"
                  onClick={handleOpenStandalonePaymentModal}
                  className="mt-2 inline-flex items-center gap-1 px-4 py-2 bg-emerald-600 text-white rounded-xl text-xs font-bold hover:bg-emerald-700 cursor-pointer shadow-xs"
                >
                  <Plus className="w-4 h-4" /> Ghi nhận đợt trả tiền ngay
                </button>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-slate-700 text-[11px] uppercase font-bold tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">STT</th>
                      <th className="py-2.5 px-3 w-32">Ngày tháng trả</th>
                      <th className="py-2.5 px-3">Nhà cung cấp</th>
                      <th className="py-2.5 px-3">Thuộc khoản thưởng nào</th>
                      <th className="py-2.5 px-2.5 text-center w-20">Loại</th>
                      <th className="py-2.5 px-3 text-center min-w-[130px]">Hình thức trả</th>
                      <th className="py-2.5 px-3 text-right">Số tiền đã trả</th>
                      <th className="py-2.5 px-3">Ghi chú đợt trả</th>
                      <th className="py-2.5 px-3 w-28 text-center">Thao tác</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredPayments.map((payItem, idx) => {
                      let typeBadgeClass = "bg-slate-100 text-slate-700 border-slate-200";
                      let typeLabel = "Khác";
                      if (payItem.type === "month") {
                        typeBadgeClass = "bg-indigo-50 text-indigo-700 border-indigo-200 font-bold";
                        typeLabel = "Tháng";
                      } else if (payItem.type === "quarter") {
                        typeBadgeClass = "bg-purple-50 text-purple-700 border-purple-200 font-bold";
                        typeLabel = "Quý";
                      } else if (payItem.type === "year") {
                        typeBadgeClass = "bg-amber-50 text-amber-800 border-amber-200 font-bold";
                        typeLabel = "Năm";
                      }

                      return (
                        <tr
                          key={payItem.id || idx}
                          className="hover:bg-emerald-50/40 transition-colors"
                        >
                          <td className="py-3 px-3 text-center text-slate-400 font-mono">
                            {idx + 1}
                          </td>

                          <td className="py-3 px-3 font-mono font-bold text-slate-900">
                            <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-slate-100 border border-slate-200 text-slate-800">
                              <Calendar className="w-3 h-3 text-emerald-600" />
                              {formatDateDDMMYYYY(payItem.paymentDate)}
                            </span>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-bold text-slate-900 flex items-center gap-1.5 flex-wrap">
                              <span>{payItem.supplierName}</span>
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-slate-100 text-slate-600 border border-slate-200">
                                {payItem.supplierCode}
                              </span>
                            </div>
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-800">{payItem.period}</div>
                            <span className="text-[10.5px] text-slate-400">
                              Tổng thưởng: {formatVND(payItem.bonusAmount)}
                            </span>
                          </td>

                          <td className="py-3 px-2.5 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-lg border text-[10.5px] ${typeBadgeClass}`}>
                              {typeLabel}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            {renderPaymentMethodBadge(payItem.paymentMethod)}
                          </td>

                          <td className="py-3 px-3 text-right">
                            <div className="font-mono font-black text-emerald-700 text-sm">
                              {formatVND(payItem.amount)}
                            </div>
                          </td>

                          <td className="py-3 px-3 text-slate-600 max-w-xs">
                            {payItem.notes ? (
                              <p className="truncate" title={payItem.notes}>
                                {payItem.notes}
                              </p>
                            ) : (
                              <span className="text-slate-300 italic">--</span>
                            )}
                          </td>

                          <td className="py-3 px-3 text-center">
                            <div className="flex items-center justify-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleOpenEditPaymentItem(payItem)}
                                className="p-1.5 text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition-colors cursor-pointer"
                                title="Sửa lần trả tiền này"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>

                              {pendingDeletePaymentId === payItem.id ? (
                                <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-300 p-0.5 rounded-lg animate-in fade-in">
                                  <button
                                    type="button"
                                    onClick={() => executeDeletePayment(payItem.bonusEntryId, payItem.id, payItem.supplierName)}
                                    className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                                    title="Xác nhận xóa vĩnh viễn"
                                  >
                                    <Trash2 className="w-3 h-3" />
                                    <span>Xóa!</span>
                                  </button>
                                  <button
                                    type="button"
                                    onClick={() => setPendingDeletePaymentId(null)}
                                    className="p-1 text-slate-500 hover:text-slate-800 rounded text-xs cursor-pointer"
                                    title="Hủy"
                                  >
                                    <X className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setPendingDeletePaymentId(payItem.id);
                                    setTimeout(() => {
                                      setPendingDeletePaymentId((curr) => (curr === payItem.id ? null : curr));
                                    }, 6000);
                                  }}
                                  className="p-1.5 text-slate-500 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                  title="Xóa lần trả tiền này (Bấm để xác nhận)"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  {/* TỔNG TIỀN ĐÃ TRẢ */}
                  {filteredPayments.length > 0 && (
                    <tfoot className="bg-slate-100/95 border-t-2 border-slate-300 font-bold text-slate-800 text-xs">
                      <tr>
                        <td colSpan={6} className="py-3 px-3 text-right uppercase tracking-wider text-[11px] text-slate-700 font-black border-r border-slate-200/80">
                          TỔNG TIỀN ĐÃ TRẢ ({filteredPayments.length} LƯỢT):
                        </td>
                        <td className="py-3 px-3 text-right font-mono font-black text-emerald-700 text-xs sm:text-sm border-r border-slate-200/80 whitespace-nowrap">
                          {formatVND(totalFilteredPaymentsAmount)}
                        </td>
                        <td colSpan={2} className="py-3 px-3 bg-slate-50/60"></td>
                      </tr>
                    </tfoot>
                  )}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 1: THÊM / SỬA KHOẢN THƯỞNG & CHIẾT KHẤU            */}
      {/* ======================================================== */}
      {isBonusModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-6">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-blue-700 to-indigo-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                {cloningBonusSource ? (
                  <Copy className="w-5 h-5 text-amber-300" />
                ) : (
                  <Award className="w-5 h-5 text-blue-200" />
                )}
                <h3 className="font-extrabold text-sm sm:text-base">
                  {editingBonus
                    ? "Chỉnh sửa khoản thưởng / chiết khấu"
                    : cloningBonusSource
                    ? `Nhân bản khoản thưởng (${cloningBonusSource.period})`
                    : "Thêm mới khoản thưởng / chiết khấu"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setCloningBonusSource(null);
                  setIsBonusModalOpen(false);
                }}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveBonus} className="p-4 sm:p-6 space-y-4">
              {cloningBonusSource && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-center justify-between text-xs text-amber-900 animate-in fade-in">
                  <div className="flex items-center gap-2">
                    <Copy className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>
                      Đang nhân bản từ: <strong>{cloningBonusSource.supplierName}</strong> ({cloningBonusSource.period})
                    </span>
                  </div>
                  <span className="text-[10.5px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-md border border-amber-300">
                    Bản sao mới
                  </span>
                </div>
              )}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-slate-800 uppercase">
                    Nhà cung cấp *
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      setIsSupplierModalOpen(true);
                      handleOpenAddSupplier();
                    }}
                    className="text-[11px] font-bold text-blue-600 hover:underline cursor-pointer"
                  >
                    + Thêm NCC mới
                  </button>
                </div>
                <select
                  required
                  value={formSupplierId}
                  onChange={(e) => setFormSupplierId(e.target.value)}
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">-- Chọn Nhà cung cấp --</option>
                  {data.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5">
                  Phân loại thưởng / chiết khấu *
                </label>
                <div className="grid grid-cols-4 gap-2">
                  <button
                    type="button"
                    onClick={() => setFormType("month")}
                    className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      formType === "month"
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Tháng
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("quarter")}
                    className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      formType === "quarter"
                        ? "bg-purple-600 text-white border-purple-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Quý
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("year")}
                    className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      formType === "year"
                        ? "bg-amber-600 text-white border-amber-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Năm
                  </button>
                  <button
                    type="button"
                    onClick={() => setFormType("other")}
                    className={`py-2 px-1 text-center text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                      formType === "other"
                        ? "bg-teal-600 text-white border-teal-600 shadow-sm"
                        : "bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    Khác
                  </button>
                </div>
              </div>

              <div className="p-3 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                <span className="text-[11px] font-bold text-slate-700 uppercase block">
                  Thời gian áp dụng
                </span>

                {formType === "month" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Tháng</label>
                      <select
                        value={formMonth}
                        onChange={(e) => setFormMonth(Number(e.target.value))}
                        className="w-full text-xs font-bold py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                      >
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                          <option key={m} value={m}>
                            Tháng {m}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Năm</label>
                      <select
                        value={formYear}
                        onChange={(e) => setFormYear(Number(e.target.value))}
                        className="w-full text-xs font-bold py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                      >
                        {availableYears.map((y) => (
                          <option key={y} value={y}>
                            Năm {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {formType === "quarter" && (
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Quý</label>
                      <select
                        value={formQuarter}
                        onChange={(e) => setFormQuarter(Number(e.target.value))}
                        className="w-full text-xs font-bold py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                      >
                        {[1, 2, 3, 4].map((q) => (
                          <option key={q} value={q}>
                            Quý {q}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Năm</label>
                      <select
                        value={formYear}
                        onChange={(e) => setFormYear(Number(e.target.value))}
                        className="w-full text-xs font-bold py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                      >
                        {availableYears.map((y) => (
                          <option key={y} value={y}>
                            Năm {y}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}

                {formType === "year" && (
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Năm</label>
                    <select
                      value={formYear}
                      onChange={(e) => setFormYear(Number(e.target.value))}
                      className="w-full text-xs font-bold py-1.5 px-2 bg-white border border-slate-300 rounded-lg text-slate-800"
                    >
                      {availableYears.map((y) => (
                        <option key={y} value={y}>
                          Năm {y}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {formType === "other" && (
                  <div>
                    <label className="text-[10px] text-slate-500 font-bold block mb-0.5">Nội dung chương trình / Thời gian</label>
                    <input
                      type="text"
                      required
                      value={formCustomPeriod}
                      onChange={(e) => setFormCustomPeriod(e.target.value)}
                      placeholder="VD: CT Khuyến mãi Hè, Thưởng Tết 2026..."
                      className="w-full text-xs py-1.5 px-2.5 bg-white border border-slate-300 rounded-lg text-slate-800"
                    />
                  </div>
                )}
              </div>

              {/* Ô NHẬP: NGÀY TRẢ THƯỞNG (CÓ THỂ ĐỂ TRỐNG) */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-bold text-blue-900 uppercase flex items-center gap-1.5">
                    <Calendar className="w-3.5 h-3.5 text-blue-600" />
                    <span>NGÀY TRẢ THƯỞNG <span className="text-[11px] font-normal text-slate-500 normal-case">(Có thể để trống)</span></span>
                  </label>
                  {formPayoutDate && (
                    <button
                      type="button"
                      onClick={() => setFormPayoutDate("")}
                      className="text-[11px] text-rose-600 hover:text-rose-800 font-semibold cursor-pointer hover:underline"
                    >
                      ✕ Xóa ngày (Để trống)
                    </button>
                  )}
                </div>
                <input
                  type="date"
                  value={formPayoutDate}
                  onChange={(e) => setFormPayoutDate(e.target.value)}
                  className="w-full text-xs font-medium py-2 px-3 rounded-xl border border-blue-300 bg-blue-50/20 text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono font-bold"
                />
                <p className="text-[10.5px] text-slate-500 mt-1 italic">
                  * Không bắt buộc: Bạn có thể để trống trường này nếu nhà cung cấp chưa ấn định ngày chi trả cụ thể.
                </p>
              </div>

              {/* Ô CHỌN: HÌNH THỨC TRẢ THƯỞNG */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-blue-600" />
                    <span>HÌNH THỨC TRẢ THƯỞNG *</span>
                  </span>
                  <span className="text-[11px] font-normal text-slate-500 normal-case">
                    (Chọn 1 trong 4 hình thức)
                  </span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {BONUS_PAYMENT_METHODS.map((method) => {
                    const isSelected = formPaymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setFormPaymentMethod(method)}
                        className={`py-2 px-2.5 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                          isSelected
                            ? method === "Tiền mặt"
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300"
                              : method === "Chuyển khoản"
                              ? "bg-blue-600 text-white border-blue-600 shadow-xs ring-2 ring-blue-300"
                              : method === "Cấn trừ công nợ"
                              ? "bg-purple-600 text-white border-purple-600 shadow-xs ring-2 ring-purple-300"
                              : "bg-amber-600 text-white border-amber-600 shadow-xs ring-2 ring-amber-300"
                            : "bg-white hover:bg-slate-50 text-slate-700 border-slate-300 hover:border-slate-400"
                        }`}
                      >
                        {method === "Tiền mặt" && <Banknote className="w-3.5 h-3.5 shrink-0" />}
                        {method === "Chuyển khoản" && <CreditCard className="w-3.5 h-3.5 shrink-0" />}
                        {method === "Cấn trừ công nợ" && <Receipt className="w-3.5 h-3.5 shrink-0" />}
                        {method === "Bằng hàng" && <Package className="w-3.5 h-3.5 shrink-0" />}
                        <span>{method}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Số tiền thưởng / chiết khấu (VNĐ) *
                  </label>
                  <input
                    type="text"
                    required
                    value={formAmountStr ? new Intl.NumberFormat("vi-VN").format(parseVND(formAmountStr)) : ""}
                    onChange={(e) => setFormAmountStr(e.target.value)}
                    placeholder="VD: 30.000.000"
                    className="w-full text-sm font-mono font-bold py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                    Đã trả (VNĐ)
                  </label>
                  <input
                    type="text"
                    value={formInitialPaidStr ? new Intl.NumberFormat("vi-VN").format(parseVND(formInitialPaidStr)) : "0"}
                    onChange={(e) => setFormInitialPaidStr(e.target.value)}
                    placeholder="0"
                    className="w-full text-sm font-mono font-bold py-2 px-3 rounded-xl border border-slate-300 bg-white text-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </div>

              {(() => {
                const amt = parseVND(formAmountStr);
                const paid = parseVND(formInitialPaidStr);
                const rem = amt - paid;
                return (
                  <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center justify-between text-xs">
                    <span className="font-bold text-blue-900 uppercase">Còn phải thu (Tự tính):</span>
                    <span className="font-mono font-black text-base text-rose-600">
                      {formatVND(rem)}
                    </span>
                  </div>
                );
              })()}

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Ghi chú (Chính sách thưởng, điều kiện, tỷ lệ chiết khấu...)
                </label>
                <textarea
                  rows={3}
                  value={formNotes}
                  onChange={(e) => setFormNotes(e.target.value)}
                  placeholder="VD: Chiết khấu 3% doanh số đạt 600 triệu, nhận thưởng chuyển khoản trước ngày 15..."
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                {editingBonus ? (
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        executeDeleteBonus(editingBonus.id, editingBonus.period);
                        setIsBonusModalOpen(false);
                      }}
                      className="px-3.5 py-2 text-xs font-bold text-rose-700 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                      title="Xóa vĩnh viễn khoản thưởng này khỏi hệ thống"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => {
                        handleDuplicateBonus(editingBonus);
                      }}
                      className="px-3 py-2 text-xs font-bold text-blue-700 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                      title="Tạo bản sao mới từ khoản thưởng này"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      <span>Nhân bản</span>
                    </button>
                  </div>
                ) : <div />}

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsBonusModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-blue-600 hover:bg-blue-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                  >
                    {editingBonus ? "Lưu cập nhật" : "Thêm khoản thưởng"}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 2: GHI NHẬN ĐÃ TRẢ CHO 1 KHOẢN THƯỞNG CỤ THỂ      */}
      {/* ======================================================== */}
      {isPaymentModalOpen && activeBonusForPayment && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-6">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-200" />
                <div>
                  <h3 className="font-extrabold text-sm sm:text-base">Ghi nhận thanh toán / Đã trả</h3>
                  <p className="text-[11px] text-emerald-100">
                    {activeBonusForPayment.supplierName} • {activeBonusForPayment.period}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsPaymentModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-4">
              <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 grid grid-cols-3 gap-2 text-center text-xs">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-500 block">Tiền thưởng</span>
                  <span className="font-mono font-bold text-slate-900 text-sm">
                    {formatVND(activeBonusForPayment.amount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-emerald-700 block">Đã trả</span>
                  <span className="font-mono font-bold text-emerald-700 text-sm">
                    {formatVND(activeBonusForPayment.paidAmount)}
                  </span>
                </div>
                <div>
                  <span className="text-[10px] uppercase font-bold text-rose-700 block">Còn lại</span>
                  <span className="font-mono font-black text-rose-600 text-sm">
                    {formatVND(activeBonusForPayment.remainingAmount)}
                  </span>
                </div>
              </div>

              <form onSubmit={handleAddPayment} className="p-3.5 bg-emerald-50/70 rounded-2xl border border-emerald-200 space-y-3">
                <span className="text-xs font-bold text-emerald-950 uppercase flex items-center gap-1.5">
                  <Plus className="w-3.5 h-3.5 text-emerald-700" />
                  Ghi nhận đợt thanh toán này
                </span>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800">Số tiền trả đợt này (VNĐ) *</label>
                    {activeBonusForPayment.remainingAmount > 0 && (
                      <button
                        type="button"
                        onClick={() => setPaymentAmountStr(String(activeBonusForPayment.remainingAmount))}
                        className="text-[11px] font-bold text-emerald-700 hover:underline cursor-pointer"
                      >
                        Trả hết còn lại ({formatVND(activeBonusForPayment.remainingAmount)})
                      </button>
                    )}
                  </div>
                  <input
                    type="text"
                    required
                    value={paymentAmountStr ? new Intl.NumberFormat("vi-VN").format(parseVND(paymentAmountStr)) : ""}
                    onChange={(e) => setPaymentAmountStr(e.target.value)}
                    placeholder="VD: 15.000.000"
                    className="w-full text-sm font-mono font-bold py-2 px-3 rounded-xl border border-emerald-300 bg-white text-slate-900 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">Ngày thanh toán</label>
                    <input
                      type="date"
                      value={paymentDate}
                      onChange={(e) => setPaymentDate(e.target.value)}
                      className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-800"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-700 block mb-1">Ghi chú đợt trả</label>
                    <input
                      type="text"
                      value={paymentNotes}
                      onChange={(e) => setPaymentNotes(e.target.value)}
                      placeholder="VD: Chuyển khoản BIDV, Đợt 2..."
                      className="w-full text-xs py-1.5 px-2.5 rounded-lg border border-slate-300 bg-white text-slate-800"
                    />
                  </div>
                </div>

                {/* HÌNH THỨC TRẢ THƯỞNG ĐỢT NÀY */}
                <div>
                  <label className="text-[10px] font-bold text-slate-800 uppercase block mb-1 flex items-center gap-1.5">
                    <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Hình thức trả thưởng *</span>
                  </label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                    {BONUS_PAYMENT_METHODS.map((method) => {
                      const isSelected = paymentMethodForPayment === method;
                      return (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethodForPayment(method)}
                          className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                            isSelected
                              ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs ring-2 ring-emerald-300"
                              : "bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                          }`}
                        >
                          {method === "Tiền mặt" && <Banknote className="w-3 h-3 shrink-0" />}
                          {method === "Chuyển khoản" && <CreditCard className="w-3 h-3 shrink-0" />}
                          {method === "Cấn trừ công nợ" && <Receipt className="w-3 h-3 shrink-0" />}
                          {method === "Bằng hàng" && <Package className="w-3 h-3 shrink-0" />}
                          <span>{method}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                >
                  Xác nhận thanh toán đợt này
                </button>
              </form>

              <div>
                <span className="text-xs font-bold text-slate-800 uppercase block mb-2">
                  Lịch sử các lần đã trả ({activeBonusForPayment.payments.length})
                </span>
                {activeBonusForPayment.payments.length === 0 ? (
                  <p className="text-xs text-slate-400 italic">Chưa có đợt thanh toán nào được ghi nhận.</p>
                ) : (
                  <div className="space-y-1.5 max-h-40 overflow-y-auto pr-1">
                    {activeBonusForPayment.payments.map((p, pIdx) => (
                      <div
                        key={p.id || pIdx}
                        className="flex items-center justify-between p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="font-mono font-bold text-emerald-800">
                              {formatVND(p.amount)}
                            </span>
                            {p.paymentMethod && renderPaymentMethodBadge(p.paymentMethod)}
                          </div>
                          <span className="text-[10.5px] text-slate-500">
                            Ngày: {formatDateDDMMYYYY(p.paymentDate)} {p.notes ? `• ${p.notes}` : ""}
                          </span>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleDeletePayment(p.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 rounded cursor-pointer"
                          title="Xóa lần trả này"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <div className="pt-2 border-t border-slate-100 text-right">
                <button
                  type="button"
                  onClick={() => setIsPaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 3: GHI NHẬN ĐÃ TRẢ TỰ DO (STANDALONE PAYMENT)      */}
      {/* ======================================================== */}
      {isStandalonePaymentModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden my-6">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-emerald-700 to-teal-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-200" />
                <h3 className="font-extrabold text-sm sm:text-base">Ghi nhận lượt nhà cung cấp đã trả tiền</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsStandalonePaymentModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveStandalonePayment} className="p-4 sm:p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  1. Chọn Nhà cung cấp *
                </label>
                <select
                  required
                  value={standaloneSupplierId}
                  onChange={(e) => {
                    const newSupId = e.target.value;
                    setStandaloneSupplierId(newSupId);
                    const bonusesForSup = data.bonusEntries.filter((b) => b.supplierId === newSupId);
                    const firstUnpaid = bonusesForSup.find((b) => b.remainingAmount > 0) || bonusesForSup[0];
                    setStandaloneBonusId(firstUnpaid?.id || "");
                    setStandalonePaymentAmountStr(firstUnpaid && firstUnpaid.remainingAmount > 0 ? String(firstUnpaid.remainingAmount) : "");
                  }}
                  className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="">-- Chọn Nhà cung cấp --</option>
                  {data.suppliers.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.code} - {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  2. Thuộc khoản thưởng / chiết khấu nào *
                </label>
                {standaloneAvailableBonuses.length === 0 ? (
                  <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900">
                    Nhà cung cấp này chưa có khoản thưởng nào. Vui lòng thêm khoản thưởng trước!
                  </div>
                ) : (
                  <select
                    required
                    value={standaloneBonusId}
                    onChange={(e) => {
                      const bId = e.target.value;
                      setStandaloneBonusId(bId);
                      const b = data.bonusEntries.find((item) => item.id === bId);
                      if (b && b.remainingAmount > 0) {
                        setStandalonePaymentAmountStr(String(b.remainingAmount));
                      }
                    }}
                    className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  >
                    <option value="">-- Chọn khoản thưởng liên quan --</option>
                    {standaloneAvailableBonuses.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.period} ({b.type.toUpperCase()}) • Thưởng: {formatVND(b.amount)} • Còn: {formatVND(b.remainingAmount)}
                      </option>
                    ))}
                  </select>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-bold text-slate-800 uppercase">Số tiền đã trả *</label>
                    {(() => {
                      const b = data.bonusEntries.find((item) => item.id === standaloneBonusId);
                      if (b && b.remainingAmount > 0) {
                        return (
                          <button
                            type="button"
                            onClick={() => setStandalonePaymentAmountStr(String(b.remainingAmount))}
                            className="text-[10px] font-bold text-emerald-700 hover:underline cursor-pointer"
                          >
                            Hết còn lại ({formatVND(b.remainingAmount)})
                          </button>
                        );
                      }
                      return null;
                    })()}
                  </div>
                  <input
                    type="text"
                    required
                    value={standalonePaymentAmountStr ? new Intl.NumberFormat("vi-VN").format(parseVND(standalonePaymentAmountStr)) : ""}
                    onChange={(e) => setStandalonePaymentAmountStr(e.target.value)}
                    placeholder="VD: 15.000.000"
                    className="w-full text-sm font-mono font-bold py-2 px-3 rounded-xl border border-slate-300 bg-white text-emerald-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-800 uppercase mb-1">Ngày trả tiền *</label>
                  <input
                    type="date"
                    required
                    value={standalonePaymentDate}
                    onChange={(e) => setStandalonePaymentDate(e.target.value)}
                    className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-medium"
                  />
                </div>
              </div>

              {/* HÌNH THỨC TRẢ TIỀN */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1.5 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Hình thức trả tiền *</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {BONUS_PAYMENT_METHODS.map((method) => {
                    const isSelected = standalonePaymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setStandalonePaymentMethod(method)}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs ring-2 ring-emerald-300"
                            : "bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        {method === "Tiền mặt" && <Banknote className="w-3 h-3 shrink-0" />}
                        {method === "Chuyển khoản" && <CreditCard className="w-3 h-3 shrink-0" />}
                        {method === "Cấn trừ công nợ" && <Receipt className="w-3 h-3 shrink-0" />}
                        {method === "Bằng hàng" && <Package className="w-3 h-3 shrink-0" />}
                        <span>{method}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Ghi chú đợt trả tiền
                </label>
                <input
                  type="text"
                  value={standalonePaymentNotes}
                  onChange={(e) => setStandalonePaymentNotes(e.target.value)}
                  placeholder="VD: Chuyển khoản Vietcombank, thanh toán đợt 2, ủy nhiệm chi #88..."
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsStandalonePaymentModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={!standaloneBonusId}
                  className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl shadow-xs transition-colors cursor-pointer"
                >
                  Xác nhận lưu đợt trả tiền
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 4: SỬA LẦN THANH TOÁN ĐÃ CÓ                        */}
      {/* ======================================================== */}
      {editingPaymentItem && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden my-6">
            <div className="p-4 bg-emerald-800 text-white flex items-center justify-between">
              <div>
                <h3 className="font-extrabold text-sm">Chỉnh sửa đợt trả tiền</h3>
                <p className="text-[11px] text-emerald-200">
                  {editingPaymentItem.supplierName} • {editingPaymentItem.period}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditingPaymentItem(null)}
                className="p-1 text-white/80 hover:text-white rounded-lg cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditPaymentItem} className="p-4 sm:p-5 space-y-3.5">
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Số tiền đã trả (VNĐ) *
                </label>
                <input
                  type="text"
                  required
                  value={editPaymentAmountStr ? new Intl.NumberFormat("vi-VN").format(parseVND(editPaymentAmountStr)) : ""}
                  onChange={(e) => setEditPaymentAmountStr(e.target.value)}
                  className="w-full text-sm font-mono font-bold py-2 px-3 rounded-xl border border-slate-300 bg-white text-emerald-800 focus:ring-2 focus:ring-emerald-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Ngày trả tiền *
                </label>
                <input
                  type="date"
                  required
                  value={editPaymentDate}
                  onChange={(e) => setEditPaymentDate(e.target.value)}
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-800 font-medium"
                />
              </div>

              {/* HÌNH THỨC TRẢ TIỀN */}
              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-emerald-700" />
                  <span>Hình thức trả tiền *</span>
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                  {BONUS_PAYMENT_METHODS.map((method) => {
                    const isSelected = editPaymentMethod === method;
                    return (
                      <button
                        key={method}
                        type="button"
                        onClick={() => setEditPaymentMethod(method)}
                        className={`py-1.5 px-2 rounded-xl border text-[11px] font-bold flex items-center justify-center gap-1 transition-all cursor-pointer ${
                          isSelected
                            ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs ring-2 ring-emerald-300"
                            : "bg-white text-slate-700 border-slate-300 hover:border-slate-400 hover:bg-slate-50"
                        }`}
                      >
                        {method === "Tiền mặt" && <Banknote className="w-3 h-3 shrink-0" />}
                        {method === "Chuyển khoản" && <CreditCard className="w-3 h-3 shrink-0" />}
                        {method === "Cấn trừ công nợ" && <Receipt className="w-3 h-3 shrink-0" />}
                        {method === "Bằng hàng" && <Package className="w-3 h-3 shrink-0" />}
                        <span>{method}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 uppercase mb-1">
                  Ghi chú đợt trả
                </label>
                <input
                  type="text"
                  value={editPaymentNotes}
                  onChange={(e) => setEditPaymentNotes(e.target.value)}
                  placeholder="VD: Chuyển khoản qua BIDV..."
                  className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-800"
                />
              </div>

              <div className="flex items-center justify-between gap-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => {
                    executeDeletePayment(editingPaymentItem.bonusEntryId, editingPaymentItem.id, editingPaymentItem.supplierName);
                    setEditingPaymentItem(null);
                  }}
                  className="px-3.5 py-2 text-xs font-bold text-rose-700 hover:text-white hover:bg-rose-600 bg-rose-50 border border-rose-200 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs active:scale-95"
                  title="Xóa đợt trả tiền này"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xóa đợt trả</span>
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setEditingPaymentItem(null)}
                    className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-100 rounded-xl cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="submit"
                    className="px-5 py-2 text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl shadow-xs cursor-pointer"
                  >
                    Lưu thay đổi
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 5: QUẢN LÝ NHÀ CUNG CẤP                             */}
      {/* ======================================================== */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-2xl overflow-hidden my-6">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-slate-900 to-slate-800 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  Quản lý Nhà cung cấp ({data.suppliers.length})
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsSupplierModalOpen(false)}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-4 sm:p-6 space-y-5">
              <form onSubmit={handleSaveSupplier} className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3">
                <span className="text-xs font-bold text-slate-900 uppercase block">
                  {editingSupplier ? "Sửa thông tin Nhà cung cấp" : "Thêm mới Nhà cung cấp"}
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Mã NCC * (Duy nhất)
                    </label>
                    <input
                      type="text"
                      required
                      value={formSupplierCode}
                      onChange={(e) => setFormSupplierCode(e.target.value.toUpperCase())}
                      placeholder="VD: NCC-VNM"
                      className="w-full text-xs font-mono font-bold py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-900 uppercase"
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Tên Nhà cung cấp *
                    </label>
                    <input
                      type="text"
                      required
                      value={formSupplierName}
                      onChange={(e) => setFormSupplierName(e.target.value)}
                      placeholder="VD: Công ty Cổ phần Sữa Việt Nam"
                      className="w-full text-xs font-semibold py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-900"
                    />
                  </div>
                </div>

                {existingCustomerSuggestions.length > 0 && !editingSupplier && (
                  <div>
                    <span className="text-[10px] text-slate-500 font-bold block mb-1">
                      Điền nhanh từ danh sách app cũ (không bắt buộc):
                    </span>
                    <div className="flex flex-wrap gap-1 max-h-20 overflow-y-auto">
                      {existingCustomerSuggestions.slice(0, 10).map((name) => (
                        <button
                          key={name}
                          type="button"
                          onClick={() => {
                            setFormSupplierName(name);
                            if (!formSupplierCode || formSupplierCode.startsWith("NCC-")) {
                              const codeSuffix = name.split(" ").map(w => w[0]).join("").slice(0, 4).toUpperCase();
                              setFormSupplierCode(`NCC-${codeSuffix}`);
                            }
                          }}
                          className="text-[10.5px] px-2 py-0.5 bg-white border border-slate-300 hover:border-blue-400 hover:text-blue-700 text-slate-700 rounded-md transition-colors cursor-pointer"
                        >
                          + {name}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="sm:col-span-2">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Ghi chú NCC
                    </label>
                    <input
                      type="text"
                      value={formSupplierNotes}
                      onChange={(e) => setFormSupplierNotes(e.target.value)}
                      placeholder="VD: Hợp đồng số 12, chiết khấu 3%..."
                      className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white text-slate-800"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase mb-1">
                      Trạng thái
                    </label>
                    <select
                      value={formSupplierStatus}
                      onChange={(e) => setFormSupplierStatus(e.target.value as any)}
                      className="w-full text-xs py-2 px-3 rounded-xl border border-slate-300 bg-white font-medium text-slate-800"
                    >
                      <option value="active">Đang hoạt động</option>
                      <option value="inactive">Ngừng hoạt động</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-1">
                  {editingSupplier && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingSupplier(null);
                        setFormSupplierCode(`NCC-${Date.now().toString().slice(-4)}`);
                        setFormSupplierName("");
                        setFormSupplierNotes("");
                      }}
                      className="px-3 py-1.5 text-xs text-slate-600 hover:underline cursor-pointer"
                    >
                      Hủy sửa
                    </button>
                  )}
                  <button
                    type="submit"
                    className="px-4 py-2 bg-slate-900 hover:bg-black text-white rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-xs"
                  >
                    {editingSupplier ? "Lưu thay đổi" : "Thêm Nhà cung cấp"}
                  </button>
                </div>
              </form>

              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-900 uppercase">
                    Danh sách Nhà cung cấp hiện có ({filteredSuppliers.length})
                  </span>
                  <div className="relative w-48">
                    <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={supplierSearchQuery}
                      onChange={(e) => setSupplierSearchQuery(e.target.value)}
                      placeholder="Tìm tên / mã..."
                      className="w-full pl-7 pr-2 py-1 text-xs rounded-lg border border-slate-200"
                    />
                  </div>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {filteredSuppliers.map((s) => {
                    const bonusCount = data.bonusEntries.filter((b) => b.supplierId === s.id).length;
                    return (
                      <div
                        key={s.id}
                        className="p-3 bg-white border border-slate-200 rounded-xl flex items-center justify-between gap-3 text-xs hover:border-slate-300 transition-colors"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-800 font-mono font-bold text-[11px] border border-slate-200">
                              {s.code}
                            </span>
                            <span className="font-bold text-slate-900">{s.name}</span>
                            <span
                              className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                s.status === "active"
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-slate-200 text-slate-600"
                              }`}
                            >
                              {s.status === "active" ? "Hoạt động" : "Ngừng"}
                            </span>
                          </div>
                          {s.notes && (
                            <p className="text-[11px] text-slate-500 mt-0.5 italic">{s.notes}</p>
                          )}
                          <span className="text-[10px] text-blue-700 font-medium">
                            Đang theo dõi: {bonusCount} khoản thưởng
                          </span>
                        </div>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() => handleOpenEditSupplier(s)}
                            className="p-1.5 text-slate-500 hover:text-blue-600 rounded cursor-pointer"
                            title="Sửa nhà cung cấp"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          {pendingDeleteSupplierId === s.id ? (
                            <div className="inline-flex items-center gap-1 bg-rose-50 border border-rose-300 p-0.5 rounded-lg animate-in fade-in">
                              <button
                                type="button"
                                onClick={() => executeDeleteSupplier(s.id, s.name)}
                                className="px-2 py-1 bg-rose-600 hover:bg-rose-700 text-white rounded text-[11px] font-bold transition-all shadow-xs flex items-center gap-1 cursor-pointer active:scale-95"
                                title="Xác nhận xóa NCC"
                              >
                                <Trash2 className="w-3 h-3" />
                                <span>Xóa!</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setPendingDeleteSupplierId(null)}
                                className="p-1 text-slate-500 hover:text-slate-800 rounded text-xs cursor-pointer"
                                title="Hủy"
                              >
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => {
                                setPendingDeleteSupplierId(s.id);
                                setTimeout(() => {
                                  setPendingDeleteSupplierId((curr) => (curr === s.id ? null : curr));
                                }, 6000);
                              }}
                              className="p-1.5 text-slate-500 hover:text-rose-600 rounded cursor-pointer"
                              title="Xóa nhà cung cấp"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="pt-2 border-t border-slate-100 text-right">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Đóng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* MODAL 6: XÁC NHẬN XÓA TÙY BIẾN (Z-[9999] ĐẢM BẢO LUÔN     */}
      {/* NẰM TRÊN MỌI MODAL KHÁC VÀ KHÔNG BAO GIỜ BỊ CHẶN)         */}
      {/* ======================================================== */}
      {confirmDeleteModal.isOpen && (
        <div className="fixed inset-0 z-[9999] bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 overflow-y-auto animate-in fade-in">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-md overflow-hidden my-6">
            <div className="p-4 sm:p-5 bg-gradient-to-r from-rose-600 to-red-700 text-white flex items-center justify-between">
              <div className="flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-rose-200" />
                <h3 className="font-extrabold text-sm sm:text-base">
                  {confirmDeleteModal.title || "Xác nhận xóa"}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setConfirmDeleteModal((prev) => ({ ...prev, isOpen: false }))}
                className="p-1.5 text-white/80 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-5 space-y-4">
              <div className="text-xs sm:text-sm text-slate-800 leading-relaxed font-semibold">
                {confirmDeleteModal.message}
              </div>

              {confirmDeleteModal.subMessage && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-xs text-amber-900 font-medium">
                  {confirmDeleteModal.subMessage}
                </div>
              )}

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setConfirmDeleteModal((prev) => ({ ...prev, isOpen: false }))}
                  className="px-4 py-2 text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={() => {
                    confirmDeleteModal.onConfirm();
                  }}
                  className="px-5 py-2 text-xs font-bold bg-rose-600 hover:bg-rose-700 text-white rounded-xl shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Xác nhận xóa</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
