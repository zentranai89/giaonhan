import React, { useState, useMemo, useId, useEffect } from "react";
import {
  FileText,
  User,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Truck,
  Ban,
  Search,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Download,
  Copy,
  ArrowUpDown,
  Filter,
  Save,
  CheckSquare,
  Square,
  FileSpreadsheet,
  RotateCw,
  Sparkles,
  Users,
  FolderSync,
  FolderOpen,
  Database,
  Upload,
  History,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  PlusCircle,
  AlertTriangle,
  PackageX,
  CalendarClock,
  BellPlus,
  Bell,
  MapPin,
  Printer,
  Maximize2,
  Minimize2,
  Eye,
  Share2,
  PenOff,
  Sliders,
  RotateCcw,
  LayoutList,
  Type,
} from "lucide-react";
import { DeliveryOrder, OrderStatus, BackupRecord } from "../types";
import {
  getSavedPrintTemplate,
  savePrintTemplate,
  resetPrintTemplate,
  PrintTemplateConfig,
  DEFAULT_PRINT_TEMPLATE,
} from "../utils/printTemplateStorage";
import PrintZaloShareModal from "./PrintZaloShareModal";
import {
  getBackupExportFilename,
  exportComprehensiveFullBackup,
  importFullDataBackup,
  getAreaSuggestions,
  addAreaSuggestion,
  getDeliveryLocationSuggestions,
  addDeliveryLocationSuggestion,
  getCustomerSuggestions,
  addCustomerSuggestion,
  addDriverSuggestion,
  addVehicleSuggestion,
  getDriverSuggestions,
  getVehicleSuggestions,
} from "../utils/backupStorage";
import {
  formatDateDDMMYYYY,
  formatBackupDateTime,
  formatRealtimeClock,
  formatRelativeTime,
  getLocalTodayISO,
  compareTicketNumbers,
  parseTicketNumberInput,
  extractMonthFromDate,
  updateDateWithMonth,
  getOrderMonth,
  getOrderYearMonth,
  compareOrdersByMonthThenTicket,
  getOrderTicketMonthKey,
  getHandoverDeadlineInfo,
} from "../utils/dateUtils";

export const STATUS_CONFIG: Record<
  OrderStatus,
  { label: string; color: string; bg: string; border: string; icon: any }
> = {
  delivered: {
    label: "Hoàn Thành",
    color: "text-emerald-700",
    bg: "bg-emerald-50",
    border: "border-emerald-200/80",
    icon: CheckCircle2,
  },
  delivering: {
    label: "Đơn Chưa Giao",
    color: "text-red-600 font-bold",
    bg: "bg-red-50",
    border: "border-red-300",
    icon: Truck,
  },
  pending: {
    label: "Chưa Nhận Đơn",
    color: "text-amber-700",
    bg: "bg-amber-50",
    border: "border-amber-200/80",
    icon: Clock,
  },
  unsigned: {
    label: "Không Ký Đơn",
    color: "text-purple-700 font-bold",
    bg: "bg-purple-50",
    border: "border-purple-300",
    icon: PenOff,
  },
  returned: {
    label: "Trả Hàng",
    color: "text-orange-700 font-bold",
    bg: "bg-orange-50",
    border: "border-orange-300",
    icon: RotateCcw,
  },
  cancelled: {
    label: "Hủy Đơn",
    color: "text-slate-700",
    bg: "bg-slate-100",
    border: "border-slate-200",
    icon: Ban,
  },
  lost: {
    label: "Mất Đơn",
    color: "text-rose-700",
    bg: "bg-rose-50",
    border: "border-rose-200/80",
    icon: PackageX,
  },
};

// Active statuses as requested by user
export const STATUS_OPTIONS: OrderStatus[] = [
  "delivered",
  "delivering",
  "pending",
  "unsigned",
  "returned",
  "cancelled",
  "lost",
];

/**
 * Lấy màu sắc cho TÊN KHÁCH HÀNG theo trạng thái đơn:
 * - Đơn Chưa Giao (delivering): Màu đỏ (#dc2626) trùng màu trạng thái Đơn Chưa Giao
 * - Trả Hàng (returned): Màu cam đậm (#c2410c) trùng màu trạng thái Trả Hàng
 * - Chưa Nhận Đơn (pending): Màu hổ phách/vàng cam (#b45309) trùng màu trạng thái Chưa Nhận Đơn
 * - Không Ký Đơn (unsigned): Màu tím (#7e22ce) trùng màu trạng thái Không Ký Đơn
 * - Hủy Đơn (cancelled): Màu xám đá (#334155) trùng màu trạng thái Hủy Đơn
 * - Mất Đơn (lost): Màu hồng đỏ (#be123c) trùng màu trạng thái Mất Đơn
 * - Hoàn Thành (delivered): Mặc định màu đen (#000000), in đậm.
 */
export interface CustomerStatusColor {
  textClass: string;
  hex: string;
  iconClass: string;
  cssClass: string;
}

export const getCustomerColorByStatus = (status: OrderStatus | string | undefined): CustomerStatusColor => {
  switch (status) {
    case "delivering":
      return {
        textClass: "text-red-600 font-bold",
        hex: "#dc2626",
        iconClass: "text-red-500",
        cssClass: "customer-status-delivering",
      };
    case "returned":
      return {
        textClass: "text-orange-700 font-bold",
        hex: "#c2410c",
        iconClass: "text-orange-500",
        cssClass: "customer-status-returned",
      };
    case "pending":
      return {
        textClass: "text-amber-700 font-bold",
        hex: "#b45309",
        iconClass: "text-amber-600",
        cssClass: "customer-status-pending",
      };
    case "unsigned":
      return {
        textClass: "text-purple-700 font-bold",
        hex: "#7e22ce",
        iconClass: "text-purple-600",
        cssClass: "customer-status-unsigned",
      };
    case "cancelled":
      return {
        textClass: "text-slate-700 font-bold",
        hex: "#334155",
        iconClass: "text-slate-500",
        cssClass: "customer-status-cancelled",
      };
    case "lost":
      return {
        textClass: "text-rose-700 font-bold",
        hex: "#be123c",
        iconClass: "text-rose-500",
        cssClass: "customer-status-lost",
      };
    case "delivered":
    default:
      return {
        textClass: "text-black font-bold",
        hex: "#000000",
        iconClass: "text-slate-700",
        cssClass: "customer-status-delivered",
      };
  }
};

interface DeliveryOrdersTableProps {
  orders: DeliveryOrder[];
  onUpdateOrder: (updatedOrder: DeliveryOrder) => void;
  onAddOrder: (newOrder: Partial<DeliveryOrder>) => void;
  onDeleteOrder: (orderId: string) => void;
  onBatchUpdateStatus: (status: OrderStatus, orderIds?: string[]) => void;
  onBatchUpdateDriver?: (driverName: string, orderIds: string[]) => void;
  onBatchUpdateVehicle?: (vehicleNumber: string, orderIds: string[]) => void;
  onBatchUpdateCustomer?: (customerName: string, orderIds: string[]) => void;
  onBatchUpdateArea?: (area: string, orderIds: string[]) => void;
  onBatchUpdateDeliveryDate?: (deliveryDate: string, orderIds: string[]) => void;
  onBatchUpdateMonth?: (newMonth: number, orderIds: string[]) => void;
  onBatchDeleteOrders?: (orderIds: string[]) => void;
  defaultDriverName?: string;
  defaultCustomerName?: string;
  defaultArea?: string;
  defaultDeliveryLocation?: string;
  defaultRecordDate?: string;
  defaultVehicleNumber?: string;
  customerAutoSource?: string | null;
  dateAutoSource?: string | null;
  currentRecordId: string | null;
  onSaveBackup: () => void;
  onUpdateBackup?: (targetId?: string) => void;
  backups?: BackupRecord[];
  onLoadRecord?: (record: BackupRecord) => void;
  onMergeBackupOrders?: (record: BackupRecord) => void;
  onOpenBackupModal?: () => void;
  onLoadLatestBackup?: () => void;
  isSaved?: boolean;
  warehouseNumbers?: number[];
  onAddReminderForOrder?: (order: DeliveryOrder) => void;
  onOpenRemindersPage?: () => void;
  remindersCount?: number;
  onOpenShareModal?: () => void;
  targetTicketNumber?: number | string | null;
  onClearTargetTicketNumber?: () => void;
}

// Key lưu trữ bộ lọc tiêu chí danh sách đơn hàng vào localStorage
const CRITERIA_FILTERS_STORAGE_KEY = "delivery_orders_criteria_filters_v2";

export interface SavedCriteriaFilters {
  monthFilter: string;
  vehicleFilter: string;
  customerFilter: string;
  areaFilter: string;
  locationFilter: string;
  dateFilter: string;
  driverFilter: string;
  selectedStatuses: OrderStatus[];
  filterDuplicatesOnly: boolean;
  searchTerm: string;
}

const getSavedCriteriaFilters = (): Partial<SavedCriteriaFilters> => {
  try {
    const raw = localStorage.getItem(CRITERIA_FILTERS_STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw);
    if (typeof parsed === "object" && parsed !== null) {
      return parsed;
    }
  } catch {}
  return {};
};

const saveCriteriaFilters = (filters: SavedCriteriaFilters) => {
  try {
    localStorage.setItem(CRITERIA_FILTERS_STORAGE_KEY, JSON.stringify(filters));
  } catch {}
};

export default function DeliveryOrdersTable({
  orders,
  onUpdateOrder,
  onAddOrder,
  onDeleteOrder,
  onBatchUpdateStatus,
  onBatchUpdateDriver,
  onBatchUpdateVehicle,
  onBatchUpdateCustomer,
  onBatchUpdateArea,
  onBatchUpdateDeliveryDate,
  onBatchUpdateMonth,
  onBatchDeleteOrders,
  defaultDriverName = "",
  defaultCustomerName = "",
  defaultArea = "",
  defaultDeliveryLocation = "",
  defaultRecordDate = "",
  defaultVehicleNumber = "",
  customerAutoSource,
  dateAutoSource,
  currentRecordId,
  onSaveBackup,
  onUpdateBackup,
  backups = [],
  onLoadRecord,
  onMergeBackupOrders,
  onOpenBackupModal,
  onLoadLatestBackup,
  warehouseNumbers,
  onAddReminderForOrder,
  onOpenRemindersPage,
  remindersCount,
  onOpenShareModal,
  targetTicketNumber,
  onClearTargetTicketNumber,
}: DeliveryOrdersTableProps) {
  // Search and Primary Filters (tự động nạp bộ lọc đã lưu từ phiên trước)
  const [initialFilters] = useState(() => getSavedCriteriaFilters());

  const [searchTerm, setSearchTerm] = useState(() => initialFilters.searchTerm ?? "");
  // Tích chọn nhiều trạng thái cùng lúc (khi rỗng = Tất cả trạng thái)
  const [selectedStatuses, setSelectedStatuses] = useState<OrderStatus[]>(
    () => initialFilters.selectedStatuses ?? []
  );
  const [filterDuplicatesOnly, setFilterDuplicatesOnly] = useState<boolean>(
    () => Boolean(initialFilters.filterDuplicatesOnly)
  );
  // Thu gọn / Mở rộng toàn bộ danh sách đơn hàng (Mặc định khi mở ứng dụng là thu gọn)
  const [isCollapsed, setIsCollapsed] = useState(() => {
    try {
      const saved = localStorage.getItem("delivery_orders_table_collapsed");
      return saved !== null ? saved === "true" : true;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("delivery_orders_table_collapsed", String(isCollapsed));
    } catch {
      // ignore
    }
  }, [isCollapsed]);

  // Nếu chuyển từ trang nhắc hẹn tới số phiếu cụ thể, tự động mở rộng danh sách
  useEffect(() => {
    if (targetTicketNumber) {
      setIsCollapsed(false);
    }
  }, [targetTicketNumber]);

  const handleToggleStatusFilter = (st: OrderStatus) => {
    setSelectedStatuses((prev) => {
      if (prev.includes(st)) {
        return prev.filter((s) => s !== st);
      } else {
        return [...prev, st];
      }
    });
  };

  const handleSelectAllStatuses = () => {
    setSelectedStatuses([]);
    setFilterDuplicatesOnly(false);
  };

  // In-app order deletion states (replaces window.confirm)
  const [orderToDelete, setOrderToDelete] = useState<DeliveryOrder | null>(null);
  const [isBatchDeleteConfirmOpen, setIsBatchDeleteConfirmOpen] = useState(false);

  // Khóa định danh số phiếu theo từng tháng: Ví dụ phiếu 12 tháng 9 KHÔNG tính là trùng với phiếu 12 tháng 10
  const duplicateTicketKeys = useMemo(() => {
    const counts = new Map<string, number>();
    orders.forEach((o) => {
      const key = getOrderTicketMonthKey(o.ticketNumber, o);
      if (key !== "") {
        counts.set(key, (counts.get(key) || 0) + 1);
      }
    });
    const dups = new Set<string>();
    counts.forEach((count, key) => {
      if (count > 1) dups.add(key);
    });
    return dups;
  }, [orders]);

  // Danh sách các số phiếu trùng lặp trong cùng tháng
  const duplicateTicketNumbers = useMemo(() => {
    const dups = new Set<string>();
    orders.forEach((o) => {
      const key = getOrderTicketMonthKey(o.ticketNumber, o);
      if (key !== "" && duplicateTicketKeys.has(key)) {
        dups.add(key);
      }
    });
    return dups;
  }, [orders, duplicateTicketKeys]);

  const duplicateOrdersCount = useMemo(() => {
    return orders.filter((o) => {
      const key = getOrderTicketMonthKey(o.ticketNumber, o);
      return key !== "" && duplicateTicketKeys.has(key);
    }).length;
  }, [orders, duplicateTicketKeys]);

  // Đếm các đơn hàng Chưa Nhận Đơn / Không ký đơn đã quá hạn 7 ngày
  const overdueHandoverOrders = useMemo(() => {
    return orders.filter((o) => {
      if (o.status !== "pending" && o.status !== "unsigned") return false;
      const info = getHandoverDeadlineInfo(o.deliveryDate);
      return info && info.isOverdue;
    });
  }, [orders]);
  const [vehicleFilter, setVehicleFilter] = useState<string>(() => initialFilters.vehicleFilter ?? "all");
  const [customerFilter, setCustomerFilter] = useState<string>(() => initialFilters.customerFilter ?? "all");
  const [areaFilter, setAreaFilter] = useState<string>(() => initialFilters.areaFilter ?? "all");
  const [locationFilter, setLocationFilter] = useState<string>(() => initialFilters.locationFilter ?? "all");
  const [dateFilter, setDateFilter] = useState<string>(() => initialFilters.dateFilter ?? "all");
  const [monthFilter, setMonthFilter] = useState<string>(() => initialFilters.monthFilter ?? "all");
  const [driverFilter, setDriverFilter] = useState<string>(() => initialFilters.driverFilter ?? "all");

  // Tự động lưu bộ lọc lại khi người dùng chọn tiêu chí, duy trì cho đến khi chọn bộ lọc mới
  useEffect(() => {
    saveCriteriaFilters({
      monthFilter,
      vehicleFilter,
      customerFilter,
      areaFilter,
      locationFilter,
      dateFilter,
      driverFilter,
      selectedStatuses,
      filterDuplicatesOnly,
      searchTerm,
    });
  }, [
    monthFilter,
    vehicleFilter,
    customerFilter,
    areaFilter,
    locationFilter,
    dateFilter,
    driverFilter,
    selectedStatuses,
    filterDuplicatesOnly,
    searchTerm,
  ]);

  const [sortField, setSortField] = useState<
    "ticketNumber" | "month" | "vehicleNumber" | "customerName" | "area" | "deliveryLocation" | "deliveryDate" | "driverName" | "status"
  >("ticketNumber");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const handleHeaderSort = (
    field: "ticketNumber" | "month" | "vehicleNumber" | "customerName" | "area" | "deliveryLocation" | "deliveryDate" | "driverName" | "status"
  ) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  // Selection for batch actions
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Pagination: Cho phép chọn hiển thị 20, 50 hoặc 100 số phiếu mỗi trang. Mặc định 20 số phiếu/trang.
  const [pageSize, setPageSize] = useState<number>(20);
  const [currentPage, setCurrentPage] = useState<number>(1);

  // Tự động về trang 1 khi tìm kiếm, đổi bộ lọc hoặc đổi kích thước trang
  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchTerm,
    selectedStatuses,
    filterDuplicatesOnly,
    monthFilter,
    vehicleFilter,
    customerFilter,
    areaFilter,
    locationFilter,
    dateFilter,
    driverFilter,
    pageSize,
  ]);

  // Batch modal states
  const [isBatchDriverModalOpen, setIsBatchDriverModalOpen] = useState(false);
  const [batchDriverInput, setBatchDriverInput] = useState("");

  const [isBatchVehicleModalOpen, setIsBatchVehicleModalOpen] = useState(false);
  const [batchVehicleInput, setBatchVehicleInput] = useState("");

  const [isBatchCustomerModalOpen, setIsBatchCustomerModalOpen] = useState(false);
  const [batchCustomerInput, setBatchCustomerInput] = useState("");

  const [isBatchAreaModalOpen, setIsBatchAreaModalOpen] = useState(false);
  const [batchAreaInput, setBatchAreaInput] = useState("");

  const [isBatchDateModalOpen, setIsBatchDateModalOpen] = useState(false);
  const [batchDateInput, setBatchDateInput] = useState("");

  const [isBatchMonthModalOpen, setIsBatchMonthModalOpen] = useState(false);
  const [batchMonthInput, setBatchMonthInput] = useState<string>(() => String(new Date().getMonth() + 1));

  // Inline editing state
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState<Partial<DeliveryOrder>>({});

  // Quick add state
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newTicketNumber, setNewTicketNumber] = useState("");
  const [newMonth, setNewMonth] = useState<number>(() => new Date().getMonth() + 1);
  const [newVehicleNumber, setNewVehicleNumber] = useState("");
  const [newDriverName, setNewDriverName] = useState("");
  const [newCustomerName, setNewCustomerName] = useState("");
  const [newArea, setNewArea] = useState(defaultArea || defaultDeliveryLocation || "");
  const [newDeliveryLocation, setNewDeliveryLocation] = useState(defaultDeliveryLocation || defaultArea || "");
  const [newDeliveryDate, setNewDeliveryDate] = useState("");
  const [newStatus, setNewStatus] = useState<OrderStatus>("delivered");
  const [newNotes, setNewNotes] = useState("");

  useEffect(() => {
    const val = defaultArea || defaultDeliveryLocation || "";
    setNewArea(val);
    setNewDeliveryLocation(val);
  }, [defaultArea, defaultDeliveryLocation]);

  const areaSuggestions = useMemo(() => getAreaSuggestions(), [newArea]);

  // Duplicate Ticket Confirmation Modal State
  const [duplicateConfirmData, setDuplicateConfirmData] = useState<{
    type: "edit" | "add";
    ticketNumber: number | string;
    month?: number | null;
    updatedOrder?: DeliveryOrder;
    newOrderPayload?: Partial<DeliveryOrder>;
    duplicateOrders: DeliveryOrder[];
  } | null>(null);

  // Đóng modal xác nhận trùng phiếu bằng phím ESC
  useEffect(() => {
    if (!duplicateConfirmData) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        setDuplicateConfirmData(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [duplicateConfirmData]);

  // Xử lý khi người dùng đồng ý cập nhật / thêm trùng số phiếu
  const handleConfirmDuplicateAction = () => {
    if (!duplicateConfirmData) return;

    if (duplicateConfirmData.type === "edit" && duplicateConfirmData.updatedOrder) {
      onUpdateOrder(duplicateConfirmData.updatedOrder);
      setEditingId(null);
      setEditForm({});
    } else if (duplicateConfirmData.type === "add" && duplicateConfirmData.newOrderPayload) {
      onAddOrder(duplicateConfirmData.newOrderPayload);
      setNewTicketNumber("");
      setNewNotes("");
      setIsAddingNew(false);
    }
    setDuplicateConfirmData(null);
  };

  const handleCancelDuplicateAction = () => {
    setDuplicateConfirmData(null);
  };

  // Toast for copy or quick actions
  const [copyToast, setCopyToast] = useState<string | null>(null);

  // Chế độ xem full danh sách (Full Screen Mode)
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Chế độ xem bản in & In ấn (Print Preview & Print Mode)
  const [isPrintModalOpen, setIsPrintModalOpen] = useState(false);
  const [printScope, setPrintScope] = useState<"all" | "filtered" | "selected">("filtered");
  const [isPrintShareOpen, setIsPrintShareOpen] = useState(false);
  
  // Print Template Configuration (tùy chỉnh và lưu mẫu lại cho lần sau)
  const [printConfig, setPrintConfig] = useState<PrintTemplateConfig>(() => getSavedPrintTemplate());
  const [isCustomizingPrint, setIsCustomizingPrint] = useState(false);
  const [printCustomizeTab, setPrintCustomizeTab] = useState<"header" | "columns" | "signatures" | "style">("header");
  const [printSavedFeedback, setPrintSavedFeedback] = useState<string | null>(null);

  const handleOpenPrintModal = () => {
    setPrintConfig(getSavedPrintTemplate());
    if (selectedIds.length > 0) {
      setPrintScope("selected");
    } else if (hasActiveFilters) {
      setPrintScope("filtered");
    } else {
      setPrintScope("all");
    }
    setIsPrintModalOpen(true);
  };

  const handleSavePrintTemplate = () => {
    const ok = savePrintTemplate(printConfig);
    if (ok) {
      setPrintSavedFeedback("Đã lưu mẫu in thành công! Mẫu này sẽ tự động nạp cho các lần in tiếp theo.");
      setTimeout(() => setPrintSavedFeedback(null), 3500);
    }
  };

  const handleResetPrintTemplate = () => {
    if (window.confirm("Bạn có chắc chắn muốn khôi phục về mẫu in mặc định ban đầu không?")) {
      const def = resetPrintTemplate();
      setPrintConfig(def);
      setPrintSavedFeedback("Đã khôi phục về mẫu in mặc định!");
      setTimeout(() => setPrintSavedFeedback(null), 3000);
    }
  };

  // Đóng Fullscreen, Print Modal hoặc Zalo Share Modal bằng phím ESC
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        if (isPrintShareOpen) {
          setIsPrintShareOpen(false);
        } else if (isPrintModalOpen) {
          setIsPrintModalOpen(false);
        } else if (isFullscreen) {
          setIsFullscreen(false);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isFullscreen, isPrintModalOpen, isPrintShareOpen]);

  // Backup & Data update section state (ẩn theo yêu cầu người dùng, có thể bật tắt nhanh)
  const [showBackupSection, setShowBackupSection] = useState(false);
  const [isBackupSectionExpanded, setIsBackupSectionExpanded] = useState(true);
  const [selectedBackupId, setSelectedBackupId] = useState<string>(
    () => currentRecordId || (backups && backups[0] ? backups[0].id : "")
  );
  const [backupFeedbackMsg, setBackupFeedbackMsg] = useState<string | null>(null);
  const [liveClock, setLiveClock] = useState(new Date());
  const jsonFileInputId = useId();

  // Keep selectedBackupId synced with currentRecordId or latest backup
  useEffect(() => {
    if (currentRecordId) {
      setSelectedBackupId(currentRecordId);
    } else if (!selectedBackupId && backups && backups.length > 0) {
      setSelectedBackupId(backups[0].id);
    }
  }, [currentRecordId, backups]);

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveClock(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Tự động chuyển và định vị đúng số phiếu khi được điều hướng từ Ghi Chú Nhắc Hẹn
  useEffect(() => {
    if (targetTicketNumber !== null && targetTicketNumber !== undefined && targetTicketNumber !== "") {
      setSelectedStatuses([]);
      setVehicleFilter("all");
      setCustomerFilter("all");
      setDateFilter("all");
      setMonthFilter("all");
      setDriverFilter("all");
      setSearchTerm(String(targetTicketNumber));

      setTimeout(() => {
        const rowEl = document.getElementById(`order-row-ticket-${targetTicketNumber}`);
        if (rowEl) {
          rowEl.scrollIntoView({ behavior: "smooth", block: "center" });
        } else {
          const listHeading = document.getElementById("delivery-orders-list-heading");
          if (listHeading) {
            listHeading.scrollIntoView({ behavior: "smooth", block: "start" });
          }
        }
      }, 180);
    }
  }, [targetTicketNumber]);

  const currentActiveBackup = useMemo(() => {
    if (!currentRecordId || !backups) return null;
    return backups.find((b) => b.id === currentRecordId) || null;
  }, [currentRecordId, backups]);

  const selectedBackupRecord = useMemo(() => {
    if (!selectedBackupId || !backups) return null;
    return backups.find((b) => b.id === selectedBackupId) || null;
  }, [selectedBackupId, backups]);

  const handleTriggerSaveNew = () => {
    onSaveBackup();
    const nowIso = new Date().toISOString();
    setBackupFeedbackMsg(`Đã sao lưu danh sách đơn hàng lúc ${formatBackupDateTime(nowIso, true)} theo thời gian thực!`);
    setTimeout(() => setBackupFeedbackMsg(null), 3500);
  };

  const handleTriggerUpdateCurrent = () => {
    if (onUpdateBackup && currentRecordId) {
      onUpdateBackup(currentRecordId);
      const nowIso = new Date().toISOString();
      setBackupFeedbackMsg(`Đã cập nhật dữ liệu vào bản ghi sao lưu lúc ${formatBackupDateTime(nowIso, true)} theo thời gian thực!`);
      setTimeout(() => setBackupFeedbackMsg(null), 3500);
    } else {
      handleTriggerSaveNew();
    }
  };

  const handleLoadSelectedBackup = () => {
    if (!selectedBackupRecord || !onLoadRecord) return;
    if (
      orders.length > 0 &&
      !window.confirm(
        `Bạn có chắc chắn muốn nạp bản sao lưu "${
          selectedBackupRecord.customerName ||
          selectedBackupRecord.driverName ||
          selectedBackupRecord.recordDate
        }"? Toàn bộ danh sách đơn hiện tại sẽ được THAY THẾ bằng dữ liệu từ bản sao lưu này.`
      )
    ) {
      return;
    }
    onLoadRecord(selectedBackupRecord);
    setBackupFeedbackMsg(
      `Đã nạp bản sao lưu "${
        selectedBackupRecord.customerName || selectedBackupRecord.driverName || "Đã chọn"
      }" vào danh sách!`
    );
    setTimeout(() => setBackupFeedbackMsg(null), 3500);
  };

  const handleMergeSelectedBackup = () => {
    if (!selectedBackupRecord || !onMergeBackupOrders) return;
    onMergeBackupOrders(selectedBackupRecord);
    setBackupFeedbackMsg(
      `Đã gộp đơn hàng từ bản sao lưu "${
        selectedBackupRecord.customerName || selectedBackupRecord.driverName || "Đã chọn"
      }" vào danh sách!`
    );
    setTimeout(() => setBackupFeedbackMsg(null), 3500);
  };

  const handleExportBackupJson = () => {
    const res = exportComprehensiveFullBackup({
      id: currentRecordId || undefined,
      driverName: defaultDriverName,
      customerName: defaultCustomerName,
      vehicleNumber: defaultVehicleNumber,
      recordDate: defaultRecordDate,
      orders,
      warehouseNumbers: orders.map((o) => o.ticketNumber).filter((n) => n !== undefined && n !== null && String(n).trim() !== ""),
    });
    setBackupFeedbackMsg(res.summary);
    setTimeout(() => setBackupFeedbackMsg(null), 4500);
  };

  const handleImportJsonFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text);
      let incomingOrders: DeliveryOrder[] = [];

      // Check if it's a comprehensive full application backup package
      if (parsed && typeof parsed === "object" && (parsed.version?.includes("comprehensive") || parsed.printTemplate || parsed.quickMessages)) {
        const fullRes = importFullDataBackup(parsed);
        if (fullRes.success) {
          if (parsed.currentSession?.orders && Array.isArray(parsed.currentSession.orders) && parsed.currentSession.orders.length > 0) {
            incomingOrders = parsed.currentSession.orders;
          }
          setBackupFeedbackMsg(fullRes.summary);
        }
      }

      if (incomingOrders.length === 0) {
        if (Array.isArray(parsed)) {
          if (parsed[0]?.ticketNumber !== undefined) {
            incomingOrders = parsed;
          } else if (parsed[0]?.orders) {
            incomingOrders = parsed[0].orders;
          }
        } else if (parsed && parsed.orders && Array.isArray(parsed.orders)) {
          incomingOrders = parsed.orders;
        } else if (parsed && parsed.warehouseNumbers && Array.isArray(parsed.warehouseNumbers)) {
          incomingOrders = parsed.warehouseNumbers.map((num: number, idx: number) => ({
            id: "ord_imp_" + num + "_" + idx,
            ticketNumber: num,
            vehicleNumber: parsed.vehicleNumber || defaultVehicleNumber,
            driverName: parsed.driverName || defaultDriverName,
            customerName: parsed.customerName || defaultCustomerName,
            deliveryDate: parsed.recordDate || defaultRecordDate || new Date().toISOString().slice(0, 10),
            status: "delivered" as OrderStatus,
            notes: "",
          }));
        }
      }

      if (incomingOrders.length === 0) {
        alert("Không tìm thấy dữ liệu đơn hàng hợp lệ trong tệp JSON.");
        return;
      }

      const doMerge = window.confirm(
        `Tìm thấy ${incomingOrders.length} đơn hàng trong tệp sao lưu JSON.\n\n• Nhấn OK để GỘP cập nhật vào danh sách đơn hiện tại (giữ các đơn đang có, bổ sung đơn mới).\n• Nhấn HỦY (Cancel) để THAY THẾ toàn bộ danh sách đơn hiện tại bằng tệp này.`
      );

      if (doMerge) {
        incomingOrders.forEach((ord) => onAddOrder(ord));
        setBackupFeedbackMsg(`Đã gộp ${incomingOrders.length} đơn từ file JSON vào danh sách!`);
      } else {
        if (onLoadRecord) {
          onLoadRecord({
            id: "rec_imp_" + Date.now(),
            driverName: parsed.driverName || defaultDriverName,
            customerName: parsed.customerName || defaultCustomerName,
            vehicleNumber: parsed.vehicleNumber || defaultVehicleNumber,
            recordDate: parsed.recordDate || defaultRecordDate || new Date().toISOString().slice(0, 10),
            notes: parsed.notes || "",
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            pages: [],
            manualNumbers: [],
            orders: incomingOrders,
            warehouseNumbers: incomingOrders.map((o) => o.ticketNumber),
          });
        }
        setBackupFeedbackMsg(`Đã thay thế toàn bộ bằng ${incomingOrders.length} đơn từ file JSON!`);
      }
      setTimeout(() => setBackupFeedbackMsg(null), 3500);
    } catch (err: any) {
      alert("Lỗi đọc file JSON: " + (err.message || "Định dạng không đúng"));
    } finally {
      e.target.value = "";
    }
  };

  // Status counts
  const statusCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: orders.length,
      delivered: 0,
      delivering: 0,
      pending: 0,
      unsigned: 0,
      returned: 0,
      cancelled: 0,
      lost: 0,
    };
    orders.forEach((o) => {
      if (counts[o.status] !== undefined) {
        counts[o.status]++;
      }
    });
    return counts;
  }, [orders]);

  // Unique options for dropdown filters (chỉ lấy các giá trị thực tế có phát sinh trong đơn hàng, không phân biệt hoa thường)
  const uniqueVehicles = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      const v = (o.vehicleNumber || "").trim();
      if (v) {
        const key = v.toLowerCase();
        if (!map.has(key)) map.set(key, v);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "vi", { sensitivity: "base" }));
  }, [orders]);

  const uniqueCustomers = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      const c = (o.customerName || "").trim();
      if (c) {
        const key = c.toLowerCase();
        if (!map.has(key)) map.set(key, c);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "vi", { sensitivity: "base" }));
  }, [orders]);

  const uniqueAreas = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      const a = (o.area || o.deliveryLocation || "").trim();
      if (a) {
        const key = a.toLowerCase();
        if (!map.has(key)) map.set(key, a);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "vi", { sensitivity: "base" }));
  }, [orders]);

  const uniqueLocations = uniqueAreas;

  const uniqueDates = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      const d = (o.deliveryDate || "").trim();
      if (d) set.add(d);
    });
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [orders]);

  const uniqueDrivers = useMemo(() => {
    const map = new Map<string, string>();
    orders.forEach((o) => {
      const d = (o.driverName || "").trim();
      if (d) {
        const key = d.toLowerCase();
        if (!map.has(key)) map.set(key, d);
      }
    });
    return Array.from(map.values()).sort((a, b) => a.localeCompare(b, "vi", { sensitivity: "base" }));
  }, [orders]);

  // Tổng hợp thông tin cập nhật trước đó để chọn nhanh khi sửa đơn hàng (đơn gần nhất ưu tiên đứng trước)
  const previousVehicles = useMemo(() => {
    const list: string[] = [];
    for (let i = orders.length - 1; i >= 0; i--) {
      const v = (orders[i].vehicleNumber || "").trim();
      if (v && !list.some((item) => item.toLowerCase() === v.toLowerCase())) {
        list.push(v);
      }
    }
    getVehicleSuggestions().forEach((v) => {
      const trimmed = v.trim();
      if (trimmed && !list.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        list.push(trimmed);
      }
    });
    return list;
  }, [orders]);

  const previousDrivers = useMemo(() => {
    const list: string[] = [];
    for (let i = orders.length - 1; i >= 0; i--) {
      const d = (orders[i].driverName || "").trim();
      if (d && !list.some((item) => item.toLowerCase() === d.toLowerCase())) {
        list.push(d);
      }
    }
    getDriverSuggestions().forEach((d) => {
      const trimmed = d.trim();
      if (trimmed && !list.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        list.push(trimmed);
      }
    });
    return list;
  }, [orders]);

  const previousCustomers = useMemo(() => {
    const list: string[] = [];
    for (let i = orders.length - 1; i >= 0; i--) {
      const c = (orders[i].customerName || "").trim();
      if (c && !list.some((item) => item.toLowerCase() === c.toLowerCase())) {
        list.push(c);
      }
    }
    getCustomerSuggestions().forEach((c) => {
      const trimmed = c.trim();
      if (trimmed && !list.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        list.push(trimmed);
      }
    });
    return list;
  }, [orders]);

  const previousAreas = useMemo(() => {
    const list: string[] = [];
    for (let i = orders.length - 1; i >= 0; i--) {
      const a = (orders[i].area || orders[i].deliveryLocation || "").trim();
      if (a && !list.some((item) => item.toLowerCase() === a.toLowerCase())) {
        list.push(a);
      }
    }
    getAreaSuggestions().forEach((a) => {
      const trimmed = a.trim();
      if (trimmed && !list.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        list.push(trimmed);
      }
    });
    getDeliveryLocationSuggestions().forEach((a) => {
      const trimmed = a.trim();
      if (trimmed && !list.some((item) => item.toLowerCase() === trimmed.toLowerCase())) {
        list.push(trimmed);
      }
    });
    return list;
  }, [orders]);

  // Thống kê số lượng đơn theo tháng (1 đến 12)
  const monthCounts = useMemo(() => {
    const counts: Record<number, number> = {};
    orders.forEach((o) => {
      const m = getOrderMonth(o);
      if (m) {
        counts[m] = (counts[m] || 0) + 1;
      }
    });
    return counts;
  }, [orders]);

  // Danh sách các tháng có phát sinh trong đơn hàng
  const uniqueMonths = useMemo(() => {
    const set = new Set<number>();
    orders.forEach((o) => {
      const m = getOrderMonth(o);
      if (m) set.add(m);
    });
    return Array.from(set).sort((a, b) => a - b);
  }, [orders]);

  // Số lượng bộ lọc có dữ liệu phát sinh
  const availableFilterCount = useMemo(() => {
    return (
      (uniqueMonths.length > 0 || monthFilter !== "all" ? 1 : 0) +
      (uniqueVehicles.length > 0 || vehicleFilter !== "all" ? 1 : 0) +
      (uniqueCustomers.length > 0 || customerFilter !== "all" ? 1 : 0) +
      (uniqueAreas.length > 0 || areaFilter !== "all" || locationFilter !== "all" ? 1 : 0) +
      (uniqueDates.length > 0 || dateFilter !== "all" ? 1 : 0) +
      (uniqueDrivers.length > 0 || driverFilter !== "all" ? 1 : 0)
    );
  }, [
    uniqueMonths.length,
    monthFilter,
    uniqueVehicles.length,
    vehicleFilter,
    uniqueCustomers.length,
    customerFilter,
    uniqueAreas.length,
    areaFilter,
    locationFilter,
    uniqueDates.length,
    dateFilter,
    uniqueDrivers.length,
    driverFilter,
  ]);

  // Check if any filter is active
  const hasActiveFilters =
    selectedStatuses.length > 0 ||
    filterDuplicatesOnly ||
    monthFilter !== "all" ||
    vehicleFilter !== "all" ||
    customerFilter !== "all" ||
    areaFilter !== "all" ||
    locationFilter !== "all" ||
    dateFilter !== "all" ||
    driverFilter !== "all" ||
    searchTerm.trim().length > 0;

  const handleClearAllFilters = () => {
    setSelectedStatuses([]);
    setFilterDuplicatesOnly(false);
    setMonthFilter("all");
    setVehicleFilter("all");
    setCustomerFilter("all");
    setAreaFilter("all");
    setLocationFilter("all");
    setDateFilter("all");
    setDriverFilter("all");
    setSearchTerm("");
    saveCriteriaFilters({
      monthFilter: "all",
      vehicleFilter: "all",
      customerFilter: "all",
      areaFilter: "all",
      locationFilter: "all",
      dateFilter: "all",
      driverFilter: "all",
      selectedStatuses: [],
      filterDuplicatesOnly: false,
      searchTerm: "",
    });
  };

  // Filtered and sorted list
  const filteredOrders = useMemo(() => {
    return orders
      .filter((order) => {
        const matchesStatus =
          selectedStatuses.length === 0 || selectedStatuses.includes(order.status);

        const dupKey = getOrderTicketMonthKey(order.ticketNumber, order);
        const matchesDuplicate = !filterDuplicatesOnly || (dupKey !== "" && duplicateTicketKeys.has(dupKey));

        const matchesVehicle =
          vehicleFilter === "all" ||
          (order.vehicleNumber || "").trim().toLowerCase() === vehicleFilter.trim().toLowerCase();
        const matchesCustomer =
          customerFilter === "all" ||
          (order.customerName || "").trim().toLowerCase() === customerFilter.trim().toLowerCase();
        const orderArea = (order.area || order.deliveryLocation || "").trim().toLowerCase();
        const matchesArea =
          (areaFilter === "all" || orderArea === areaFilter.trim().toLowerCase()) &&
          (locationFilter === "all" || orderArea === locationFilter.trim().toLowerCase());
        const matchesDate =
          dateFilter === "all" || (order.deliveryDate || "").trim() === dateFilter;
        const ordMonth = getOrderMonth(order);
        const matchesMonth =
          monthFilter === "all" ||
          (ordMonth !== null && String(ordMonth) === monthFilter);
        const matchesDriver =
          driverFilter === "all" ||
          (order.driverName || "").trim().toLowerCase() === driverFilter.trim().toLowerCase();

        const term = searchTerm.toLowerCase().trim();
        const matchesSearch =
          !term ||
          String(order.ticketNumber).toLowerCase().includes(term) ||
          (order.vehicleNumber || "").toLowerCase().includes(term) ||
          (order.driverName || "").toLowerCase().includes(term) ||
          (order.customerName || "").toLowerCase().includes(term) ||
          (order.area || "").toLowerCase().includes(term) ||
          (order.deliveryLocation || "").toLowerCase().includes(term) ||
          (order.notes || "").toLowerCase().includes(term) ||
          (order.deliveryDate || "").toLowerCase().includes(term);

        return (
          matchesStatus &&
          matchesDuplicate &&
          matchesMonth &&
          matchesVehicle &&
          matchesCustomer &&
          matchesArea &&
          matchesDate &&
          matchesDriver &&
          matchesSearch
        );
      })
      .sort((a, b) => {
        let comp = 0;
        if (sortField === "ticketNumber" || sortField === "month") {
          // Sắp xếp theo thứ tự: hết tháng 9 (1, 2, 3, 5...), rồi bắt đầu đến tháng 10 (1, 2, 3...)
          comp = compareOrdersByMonthThenTicket(a, b);
        } else if (sortField === "vehicleNumber") {
          comp = (a.vehicleNumber || "").localeCompare(b.vehicleNumber || "", "vi", { sensitivity: "base" });
        } else if (sortField === "customerName") {
          comp = (a.customerName || "").localeCompare(b.customerName || "", "vi", { sensitivity: "base" });
        } else if (sortField === "deliveryLocation" || (sortField as string) === "area") {
          const aArea = (a.area || a.deliveryLocation || "");
          const bArea = (b.area || b.deliveryLocation || "");
          comp = aArea.localeCompare(bArea, "vi", { sensitivity: "base" });
        } else if (sortField === "driverName") {
          comp = (a.driverName || "").localeCompare(b.driverName || "", "vi", { sensitivity: "base" });
        } else if (sortField === "deliveryDate") {
          comp = (a.deliveryDate || "").localeCompare(b.deliveryDate || "");
          if (comp === 0) {
            comp = compareOrdersByMonthThenTicket(a, b);
          }
        } else if (sortField === "status") {
          comp = a.status.localeCompare(b.status);
        }
        return sortDirection === "asc" ? comp : -comp;
      });
  }, [
    orders,
    selectedStatuses,
    monthFilter,
    vehicleFilter,
    customerFilter,
    areaFilter,
    locationFilter,
    dateFilter,
    driverFilter,
    searchTerm,
    sortField,
    sortDirection,
  ]);

  // Total counts before filter (tất cả đơn hàng)
  const totalOrdersCount = orders.length;
  const totalTicketsCount = useMemo(() => {
    return orders.filter(
      (o) =>
        o.ticketNumber !== undefined &&
        o.ticketNumber !== null &&
        String(o.ticketNumber).trim() !== ""
    ).length;
  }, [orders]);

  const uniqueTicketsCount = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (
        o.ticketNumber !== undefined &&
        o.ticketNumber !== null &&
        String(o.ticketNumber).trim() !== ""
      ) {
        set.add(String(o.ticketNumber).trim());
      }
    });
    return set.size;
  }, [orders]);

  // Counts after filter (sau khi đã lọc)
  const filteredOrdersCount = filteredOrders.length;
  const filteredTicketsCount = useMemo(() => {
    return filteredOrders.filter(
      (o) =>
        o.ticketNumber !== undefined &&
        o.ticketNumber !== null &&
        String(o.ticketNumber).trim() !== ""
    ).length;
  }, [filteredOrders]);

  const filteredUniqueTicketsCount = useMemo(() => {
    const set = new Set<string>();
    filteredOrders.forEach((o) => {
      if (
        o.ticketNumber !== undefined &&
        o.ticketNumber !== null &&
        String(o.ticketNumber).trim() !== ""
      ) {
        set.add(String(o.ticketNumber).trim());
      }
    });
    return set.size;
  }, [filteredOrders]);

  const selectedTicketsCount = useMemo(() => {
    return orders.filter((o) => selectedIds.includes(o.id)).length;
  }, [orders, selectedIds]);

  // Phân trang đơn hàng:
  // Cho phép chọn hiển thị 20, 50 hoặc 100 số phiếu mỗi trang. Mặc định 20 số phiếu/trang.
  // Tìm kiếm và bộ lọc luôn chạy trên TOÀN BỘ dữ liệu của tất cả các trang.
  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / pageSize));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPages);

  const startIndex = (safeCurrentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, filteredOrders.length);

  const paginatedOrders = useMemo(() => {
    return filteredOrders.slice(startIndex, endIndex);
  }, [filteredOrders, startIndex, endIndex]);

  // Danh sách số trang hiển thị thông minh
  const paginationRange = useMemo(() => {
    if (totalPages <= 7) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    const delta = 1;
    const range: (number | string)[] = [];
    const rangeWithDots: (number | string)[] = [];
    let prev: number | undefined;

    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= safeCurrentPage - delta && i <= safeCurrentPage + delta)) {
        range.push(i);
      }
    }

    for (const i of range) {
      if (prev !== undefined) {
        if ((i as number) - prev === 2) {
          rangeWithDots.push(prev + 1);
        } else if ((i as number) - prev !== 1) {
          rangeWithDots.push("...");
        }
      }
      rangeWithDots.push(i);
      prev = i as number;
    }

    return rangeWithDots;
  }, [totalPages, safeCurrentPage]);

  // Danh sách đơn hàng xuất ra bản in
  const ordersToPrint = useMemo(() => {
    let list: DeliveryOrder[];
    if (printScope === "selected" && selectedIds.length > 0) {
      list = orders.filter((o) => selectedIds.includes(o.id));
    } else if (printScope === "all") {
      list = [...orders];
    } else {
      return filteredOrders;
    }
    return list.sort((a, b) => compareOrdersByMonthThenTicket(a, b));
  }, [printScope, orders, filteredOrders, selectedIds]);

  const printTicketsCount = useMemo(() => {
    return ordersToPrint.filter(
      (o) =>
        o.ticketNumber !== undefined &&
        o.ticketNumber !== null &&
        String(o.ticketNumber).trim() !== ""
    ).length;
  }, [ordersToPrint]);

  const handlePrint = () => {
    window.print();
  };

  // Start editing row
  const handleStartEdit = (order: DeliveryOrder) => {
    setEditingId(order.id);
    setEditForm({
      ticketNumber: order.ticketNumber,
      month: getOrderMonth(order) ?? undefined,
      vehicleNumber: order.vehicleNumber || "",
      driverName: order.driverName,
      customerName: order.customerName,
      area: order.area || order.deliveryLocation || "",
      deliveryLocation: order.area || order.deliveryLocation || "",
      deliveryDate: order.deliveryDate,
      status: order.status,
      notes: order.notes || "",
    });
  };

  // Save edit row
  const handleSaveEdit = (orderId: string) => {
    const rawTicket = editForm.ticketNumber;
    const ticketValue = parseTicketNumberInput(rawTicket);

    if (ticketValue === "") {
      alert("Vui lòng nhập số phiếu hợp lệ.");
      return;
    }

    const currentOrder = orders.find((o) => o.id === orderId);
    if (!currentOrder) return;

    const finalStatus = editForm.status || currentOrder.status;
    const finalArea = (editForm.area || editForm.deliveryLocation || "").trim();
    const finalDate = editForm.deliveryDate !== undefined ? editForm.deliveryDate : (currentOrder.deliveryDate || "");
    const finalMonth = editForm.month !== undefined ? editForm.month : (extractMonthFromDate(finalDate) ?? currentOrder.month ?? undefined);

    const nextOrderPayload: DeliveryOrder = {
      ...currentOrder,
      ticketNumber: ticketValue,
      month: finalMonth,
      vehicleNumber: (editForm.vehicleNumber || "").trim(),
      driverName: (editForm.driverName || "").trim(),
      customerName: (editForm.customerName || "").trim(),
      area: finalArea,
      deliveryLocation: finalArea,
      deliveryDate: finalDate,
      status: finalStatus,
      notes: (editForm.notes || "").trim(),
      updatedAt: new Date().toISOString(),
    };

    if (nextOrderPayload.vehicleNumber) {
      addVehicleSuggestion(nextOrderPayload.vehicleNumber);
    }
    if (nextOrderPayload.driverName) {
      addDriverSuggestion(nextOrderPayload.driverName);
    }
    if (nextOrderPayload.customerName) {
      addCustomerSuggestion(nextOrderPayload.customerName);
    }
    if (finalArea) {
      addAreaSuggestion(finalArea);
      addDeliveryLocationSuggestion(finalArea);
    }

    // Kiểm tra các đơn hàng khác trong danh sách đang có cùng số phiếu này trong cùng THÁNG
    const ticketKey = String(ticketValue).trim().toLowerCase();
    const editMonth = nextOrderPayload.month ?? (nextOrderPayload.deliveryDate ? extractMonthFromDate(nextOrderPayload.deliveryDate) : undefined);
    const duplicateOrders = orders.filter((o) => {
      if (o.id === orderId) return false;
      if (String(o.ticketNumber).trim().toLowerCase() !== ticketKey) return false;
      const oMonth = getOrderMonth(o);
      if (editMonth && oMonth) {
        return editMonth === oMonth;
      }
      return true;
    });

    if (duplicateOrders.length > 0) {
      // Cho phép cập nhật trùng số phiếu, nhưng thông báo xác nhận trước khi cập nhật
      setDuplicateConfirmData({
        type: "edit",
        ticketNumber: ticketValue,
        month: editMonth || null,
        updatedOrder: nextOrderPayload,
        duplicateOrders,
      });
      return;
    }

    onUpdateOrder(nextOrderPayload);
    setEditingId(null);
    setEditForm({});
  };

  // Cancel edit row
  const handleCancelEdit = () => {
    setEditingId(null);
    setEditForm({});
  };

  // Quick cycle status on click
  const handleCycleStatus = (order: DeliveryOrder) => {
    const currentIndex = STATUS_OPTIONS.indexOf(order.status);
    const nextIndex = currentIndex === -1 ? 0 : (currentIndex + 1) % STATUS_OPTIONS.length;
    const nextStatus = STATUS_OPTIONS[nextIndex];
    onUpdateOrder({
      ...order,
      status: nextStatus,
      deliveryDate: order.deliveryDate,
      updatedAt: new Date().toISOString(),
    });
  };

  // Direct update status for single order
  const handleUpdateOrderStatus = (order: DeliveryOrder, newStatus: OrderStatus) => {
    if (order.status === newStatus) return;
    onUpdateOrder({
      ...order,
      status: newStatus,
      updatedAt: new Date().toISOString(),
    });
    setCopyToast(`Đã chuyển đơn #${order.ticketNumber} sang "${STATUS_CONFIG[newStatus]?.label || newStatus}"`);
    setTimeout(() => setCopyToast(null), 3000);
  };

  // Direct update month for single order ("Chọn Tháng cho từng đơn")
  const handleUpdateOrderMonth = (order: DeliveryOrder, targetMonth?: number) => {
    const curDate = order.deliveryDate || defaultRecordDate || getLocalTodayISO();
    const updatedDate = targetMonth ? updateDateWithMonth(curDate, targetMonth) : curDate;
    onUpdateOrder({
      ...order,
      month: targetMonth,
      deliveryDate: updatedDate,
      updatedAt: new Date().toISOString(),
    });
    setCopyToast(
      targetMonth
        ? `Đã chọn Tháng ${targetMonth} cho đơn #${order.ticketNumber}`
        : `Đã bỏ chọn tháng cho đơn #${order.ticketNumber}`
    );
    setTimeout(() => setCopyToast(null), 3000);
  };

  // Quick Add submit
  const handleAddNewSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const ticketValue = parseTicketNumberInput(newTicketNumber);
    if (ticketValue === "") {
      alert("Vui lòng nhập số phiếu hợp lệ.");
      return;
    }

    const finalArea = (newArea || newDeliveryLocation || defaultArea || defaultDeliveryLocation || "").trim();
    const finalDate = newDeliveryDate || defaultRecordDate || getLocalTodayISO();
    const newOrderPayload: Partial<DeliveryOrder> = {
      ticketNumber: ticketValue,
      month: newMonth,
      vehicleNumber: (newVehicleNumber || defaultVehicleNumber).trim(),
      driverName: (newDriverName || defaultDriverName).trim(),
      customerName: (newCustomerName || defaultCustomerName).trim(),
      area: finalArea,
      deliveryLocation: finalArea,
      deliveryDate: newDeliveryDate || defaultRecordDate || getLocalTodayISO(),
      status: newStatus,
      notes: newNotes.trim(),
    };

    if (finalArea) {
      addAreaSuggestion(finalArea);
    }

    const ticketKey = String(ticketValue).trim().toLowerCase();
    const duplicateOrders = orders.filter((o) => {
      if (String(o.ticketNumber).trim().toLowerCase() !== ticketKey) return false;
      const oMonth = getOrderMonth(o);
      if (newMonth && oMonth) {
        return newMonth === oMonth;
      }
      return true;
    });

    if (duplicateOrders.length > 0) {
      // Cho phép thêm mới trùng số phiếu, nhưng thông báo xác nhận trước khi cập nhật vào danh sách
      setDuplicateConfirmData({
        type: "add",
        ticketNumber: ticketValue,
        month: newMonth || null,
        newOrderPayload,
        duplicateOrders,
      });
      return;
    }

    onAddOrder(newOrderPayload);

    setNewTicketNumber("");
    setNewDeliveryLocation(defaultDeliveryLocation || "");
    setNewNotes("");
    setIsAddingNew(false);
  };

  // Select all / toggle
  const isAllSelected =
    filteredOrders.length > 0 && filteredOrders.every((o) => selectedIds.includes(o.id));

  const handleToggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredOrders.map((o) => o.id));
    }
  };

  const handleToggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  // Batch action handlers
  const handleApplyBatchDriver = () => {
    const trimmed = batchDriverInput.trim();

    if (onBatchUpdateDriver) {
      onBatchUpdateDriver(trimmed, selectedIds);
    } else {
      // Fallback local update
      selectedIds.forEach((id) => {
        const order = orders.find((o) => o.id === id);
        if (order) {
          onUpdateOrder({
            ...order,
            driverName: trimmed,
            updatedAt: new Date().toISOString(),
          });
        }
      });
    }

    if (trimmed) {
      addDriverSuggestion(trimmed);
    }

    const displayVal = trimmed ? `"${trimmed}"` : "để trống (không có người giao)";
    setCopyToast(`Đã sửa người giao thành ${displayVal} cho ${selectedIds.length} đơn!`);
    setTimeout(() => setCopyToast(null), 3500);
    setSelectedIds([]);
    setIsBatchDriverModalOpen(false);
    setBatchDriverInput("");
  };

  const handleApplyBatchVehicle = () => {
    const trimmed = batchVehicleInput.trim();

    if (onBatchUpdateVehicle) {
      onBatchUpdateVehicle(trimmed, selectedIds);
    } else {
      // Fallback local update
      selectedIds.forEach((id) => {
        const order = orders.find((o) => o.id === id);
        if (order) {
          onUpdateOrder({
            ...order,
            vehicleNumber: trimmed,
            updatedAt: new Date().toISOString(),
          });
        }
      });
    }

    if (trimmed) {
      addVehicleSuggestion(trimmed);
    }

    const displayVal = trimmed ? `"${trimmed}"` : "để trống (không có số xe)";
    setCopyToast(`Đã sửa số xe thành ${displayVal} cho ${selectedIds.length} đơn!`);
    setTimeout(() => setCopyToast(null), 3500);
    setSelectedIds([]);
    setIsBatchVehicleModalOpen(false);
    setBatchVehicleInput("");
  };

  const handleApplyBatchCustomer = () => {
    const trimmed = batchCustomerInput.trim();

    if (onBatchUpdateCustomer) {
      onBatchUpdateCustomer(trimmed, selectedIds);
    } else {
      selectedIds.forEach((id) => {
        const order = orders.find((o) => o.id === id);
        if (order) {
          onUpdateOrder({
            ...order,
            customerName: trimmed,
            updatedAt: new Date().toISOString(),
          });
        }
      });
    }
    if (trimmed) {
      addCustomerSuggestion(trimmed);
    }

    const displayVal = trimmed ? `"${trimmed}"` : "để trống (không có khách hàng)";
    setCopyToast(`Đã sửa khách hàng thành ${displayVal} cho ${selectedIds.length} đơn!`);
    setTimeout(() => setCopyToast(null), 3500);
    setSelectedIds([]);
    setIsBatchCustomerModalOpen(false);
    setBatchCustomerInput("");
  };

  const handleApplyBatchArea = () => {
    const trimmed = batchAreaInput.trim();

    if (onBatchUpdateArea) {
      onBatchUpdateArea(trimmed, selectedIds);
    } else {
      selectedIds.forEach((id) => {
        const order = orders.find((o) => o.id === id);
        if (order) {
          onUpdateOrder({
            ...order,
            area: trimmed,
            deliveryLocation: trimmed,
            updatedAt: new Date().toISOString(),
          });
        }
      });
    }
    if (trimmed) {
      addAreaSuggestion(trimmed);
    }

    const displayVal = trimmed ? `"${trimmed}"` : "để trống (không có khu vực)";
    setCopyToast(`Đã sửa khu vực thành ${displayVal} cho ${selectedIds.length} đơn!`);
    setTimeout(() => setCopyToast(null), 3500);
    setSelectedIds([]);
    setIsBatchAreaModalOpen(false);
    setBatchAreaInput("");
  };

  const handleApplyBatchDeliveryDate = () => {
    const trimmed = batchDateInput.trim();
    if (onBatchUpdateDeliveryDate) {
      onBatchUpdateDeliveryDate(trimmed, selectedIds);
    } else {
      selectedIds.forEach((id) => {
        const order = orders.find((o) => o.id === id);
        if (order) {
          onUpdateOrder({
            ...order,
            deliveryDate: trimmed,
            updatedAt: new Date().toISOString(),
          });
        }
      });
    }

    const displayDate = trimmed ? formatDateDDMMYYYY(trimmed) : "để trống";
    setCopyToast(`Đã sửa ngày giao thành "${displayDate}" cho ${selectedIds.length} đơn!`);
    setTimeout(() => setCopyToast(null), 3500);
    setSelectedIds([]);
    setIsBatchDateModalOpen(false);
    setBatchDateInput("");
  };

  const handleApplyBatchMonth = (monthToApply?: number) => {
    const rawVal = monthToApply !== undefined ? monthToApply : Number(batchMonthInput);
    if (isNaN(rawVal) || rawVal < 1 || rawVal > 12) return;
    const targetMonth = Math.round(rawVal);

    if (onBatchUpdateMonth) {
      onBatchUpdateMonth(targetMonth, selectedIds);
    } else {
      selectedIds.forEach((id) => {
        const order = orders.find((o) => o.id === id);
        if (order) {
          const curDate = order.deliveryDate || defaultRecordDate || getLocalTodayISO();
          const updatedDate = updateDateWithMonth(curDate, targetMonth);
          onUpdateOrder({
            ...order,
            month: targetMonth,
            deliveryDate: updatedDate,
            updatedAt: new Date().toISOString(),
          });
        }
      });
    }

    setCopyToast(`Đã sửa tháng thành "Tháng ${targetMonth}" cho ${selectedIds.length} đơn!`);
    setTimeout(() => setCopyToast(null), 3500);
    setSelectedIds([]);
    setIsBatchMonthModalOpen(false);
  };

  // Duplicate single order
  const handleDuplicateOrder = (order: DeliveryOrder) => {
    const cleanNotes = (order.notes || "").replace(/\s*\(Bản sao\)$/i, "").trim();
    onAddOrder({
      ticketNumber: order.ticketNumber,
      vehicleNumber: order.vehicleNumber || "",
      driverName: order.driverName || "",
      customerName: order.customerName || "",
      area: order.area || order.deliveryLocation || "",
      deliveryLocation: order.deliveryLocation || order.area || "",
      deliveryDate: order.deliveryDate || "",
      status: order.status,
      notes: cleanNotes ? `${cleanNotes} (Bản sao)` : "(Bản sao)",
    });
    setCopyToast(`Đã nhân bản đơn hàng số phiếu #${order.ticketNumber}!`);
    setTimeout(() => setCopyToast(null), 3000);
  };

  // Duplicate multiple selected orders
  const handleApplyBatchDuplicate = () => {
    if (selectedIds.length === 0) return;
    const selectedOrders = orders.filter((o) => selectedIds.includes(o.id));
    selectedOrders.forEach((order) => {
      const cleanNotes = (order.notes || "").replace(/\s*\(Bản sao\)$/i, "").trim();
      onAddOrder({
        ticketNumber: order.ticketNumber,
        vehicleNumber: order.vehicleNumber || "",
        driverName: order.driverName || "",
        customerName: order.customerName || "",
        area: order.area || order.deliveryLocation || "",
        deliveryLocation: order.deliveryLocation || order.area || "",
        deliveryDate: order.deliveryDate || "",
        status: order.status,
        notes: cleanNotes ? `${cleanNotes} (Bản sao)` : "(Bản sao)",
      });
    });
    const count = selectedOrders.length;
    setSelectedIds([]);
    setCopyToast(`Đã nhân bản thành công ${count} đơn hàng đã chọn!`);
    setTimeout(() => setCopyToast(null), 3500);
  };

  const handleApplyBatchDelete = () => {
    if (selectedIds.length === 0) return;
    setIsBatchDeleteConfirmOpen(true);
  };

  const handleExecuteBatchDelete = () => {
    if (selectedIds.length === 0) return;
    const count = selectedIds.length;
    if (onBatchDeleteOrders) {
      onBatchDeleteOrders(selectedIds);
    } else {
      selectedIds.forEach((id) => onDeleteOrder(id));
    }
    setSelectedIds([]);
    setIsBatchDeleteConfirmOpen(false);
    setCopyToast(`Đã xóa thành công ${count} đơn hàng đã chọn!`);
    setTimeout(() => setCopyToast(null), 3000);
  };

  const handleExecuteSingleDelete = () => {
    if (orderToDelete) {
      const ticket = orderToDelete.ticketNumber;
      onDeleteOrder(orderToDelete.id);
      setCopyToast(`Đã xóa đơn hàng số phiếu #${ticket}`);
      setTimeout(() => setCopyToast(null), 3000);
      setOrderToDelete(null);
    }
  };

  // Export to CSV
  const handleExportCSV = () => {
    if (orders.length === 0) return;

    const headers = [
      "STT",
      "Số phiếu",
      "Tháng",
      "Số xe",
      "Người giao",
      "Tên khách hàng",
      "Khu vực",
      "Ngày giao",
      "Trạng thái đơn",
      "Ghi chú",
    ];

    const rows = filteredOrders.map((order, idx) => [
      idx + 1,
      order.ticketNumber,
      getOrderMonth(order) ?? "",
      `"${(order.vehicleNumber || "").replace(/"/g, '""')}"`,
      `"${(order.driverName || "").replace(/"/g, '""')}"`,
      `"${(order.customerName || "").replace(/"/g, '""')}"`,
      `"${(order.area || order.deliveryLocation || "").replace(/"/g, '""')}"`,
      order.status === "delivering" || order.status === "returned"
        ? ""
        : formatDateDDMMYYYY(order.deliveryDate) || order.deliveryDate || "",
      `"${STATUS_CONFIG[order.status]?.label || order.status}"`,
      `"${(order.notes || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent =
      "\uFEFF" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");

    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanDate = defaultRecordDate || new Date().toISOString().slice(0, 10);
    link.href = url;
    link.setAttribute("download", `bang_ke_giao_hang_${cleanDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Copy list of ticket numbers
  const handleCopyTicketNumbers = () => {
    const listStr = filteredOrders.map((o) => o.ticketNumber).join(", ");
    navigator.clipboard.writeText(listStr);
    setCopyToast("Đã sao chép danh sách số phiếu!");
    setTimeout(() => setCopyToast(null), 3000);
  };

  return (
    <section
      className={`transition-all duration-200 ${
        isFullscreen
          ? "fixed inset-0 z-50 bg-slate-100 p-4 sm:p-6 overflow-y-auto flex flex-col h-screen w-screen shadow-2xl"
          : isCollapsed
          ? "bg-white rounded-2xl border border-gray-200/80 shadow-xs p-4 sm:p-5 mb-5"
          : "bg-white rounded-2xl border border-gray-200/80 shadow-xs p-5 sm:p-6 mb-8"
      }`}
    >
      {/* Table Header Bar */}
      <div
        className={`flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-all ${
          isCollapsed ? "mb-0 pb-0 border-b-0" : "mb-4 pb-4 border-b border-gray-100"
        }`}
      >
        <div>
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="p-2 bg-emerald-100 text-emerald-800 rounded-xl">
              <FileSpreadsheet className="w-5 h-5" />
            </span>
            <h2 id="delivery-orders-list-heading" className="text-base sm:text-lg font-bold text-gray-900 uppercase tracking-tight flex flex-wrap items-center gap-2">
              DANH SÁCH
              <span className="text-xs font-semibold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 rounded-full font-mono normal-case">
                {orders.length} đơn
              </span>
              {isFullscreen && (
                <span className="text-[11px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-lg flex items-center gap-1 normal-case">
                  Toàn màn hình
                </span>
              )}
            </h2>
          </div>
        </div>

        {/* Header Actions */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Nút Xem Full Danh Sách */}
          <button
            type="button"
            onClick={() => {
              if (isCollapsed) setIsCollapsed(false);
              setIsFullscreen((prev) => !prev);
            }}
            className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 rounded-lg border transition-all cursor-pointer shadow-xs active:scale-95 ${
              isFullscreen
                ? "bg-amber-100 hover:bg-amber-200 text-amber-950 border-amber-300 ring-2 ring-amber-400"
                : "bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900 border-gray-200"
            }`}
            title={
              isFullscreen
                ? "Thu nhỏ về giao diện thường (ESC)"
                : "Xem toàn màn hình danh sách đơn hàng (Full Screen)"
            }
          >
            {isFullscreen ? (
              <>
                <Minimize2 className="w-3.5 h-3.5 text-amber-800" />
                Thu nhỏ (ESC)
              </>
            ) : (
              <>
                <Maximize2 className="w-3.5 h-3.5 text-slate-600" />
                Xem full danh sách
              </>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              setIsAddingNew(true);
              setIsCollapsed(false);
              setNewVehicleNumber(defaultVehicleNumber);
              setNewDriverName(defaultDriverName);
              setNewCustomerName(defaultCustomerName);
              setNewDeliveryDate(defaultRecordDate);
            }}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs active:bg-emerald-800"
            title="Thêm số phiếu hoặc đơn hàng mới vào danh sách"
          >
            <Plus className="w-4 h-4" /> Thêm đơn hàng
          </button>

          <button
            type="button"
            onClick={currentRecordId ? handleTriggerUpdateCurrent : handleTriggerSaveNew}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-xs active:bg-emerald-200"
            title="Sao lưu hoặc lưu cập nhật danh sách đơn hàng vào bộ nhớ"
          >
            <Save className="w-4 h-4 text-emerald-600" />
            {currentRecordId ? "Lưu cập nhật" : "Sao lưu dữ liệu"}
          </button>

          <button
            type="button"
            onClick={handleExportCSV}
            disabled={orders.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 text-gray-700 hover:text-emerald-800 hover:bg-emerald-50 rounded-lg border border-gray-200 bg-white transition-colors cursor-pointer disabled:opacity-50"
            title="Xuất bảng kê chi tiết ra Excel / CSV"
          >
            <Download className="w-3.5 h-3.5 text-emerald-600" />
            Xuất Excel
          </button>

          {/* Nút Thu gọn / Mở rộng - Đặt ở góc phải cùng hàng với các nút */}
          <button
            type="button"
            onClick={() => setIsCollapsed((prev) => !prev)}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-all cursor-pointer shadow-xs active:scale-95"
            title={isCollapsed ? "Mở rộng hiển thị toàn bộ nội dung danh sách đơn hàng" : "Thu gọn nội dung danh sách đơn hàng"}
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

      {/* Toàn bộ nội dung phía dưới header có thể thu gọn / mở rộng */}
      {!isCollapsed && (
        <div className="transition-all duration-300 ease-in-out animate-in fade-in">

      {/* Target Ticket Banner from Reminder Notes (Direct navigation feedback) */}
      {targetTicketNumber && (
        <div className="bg-amber-50/95 border-2 border-amber-300 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs animate-in fade-in">
          <div className="flex items-start sm:items-center gap-3">
            <div className="p-2.5 bg-amber-200 text-amber-900 rounded-xl shrink-0">
              <FileText className="w-5 h-5 text-amber-800" />
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs uppercase font-bold tracking-wider text-amber-800">
                  Chuyển từ Ghi Chú Nhắc Hẹn:
                </span>
                <span className="px-2.5 py-0.5 rounded-lg bg-amber-200 text-amber-950 font-mono font-black text-sm border border-amber-400">
                  Số phiếu #{targetTicketNumber}
                </span>
              </div>
              <p className="text-xs text-amber-900 mt-0.5">
                Hệ thống đã tự động lọc và cuộn tới đúng đơn hàng này trong DANH SÁCH để bạn xem và thao tác.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            <button
              type="button"
              onClick={() => {
                if (onClearTargetTicketNumber) onClearTargetTicketNumber();
                setSearchTerm("");
              }}
              className="px-3 py-1.5 bg-white hover:bg-amber-100 text-amber-900 border border-amber-300 text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer"
            >
              Xem toàn bộ danh sách
            </button>
            {onOpenRemindersPage && (
              <button
                type="button"
                onClick={onOpenRemindersPage}
                className="px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold rounded-xl transition-all shadow-2xs cursor-pointer flex items-center gap-1.5"
              >
                <CalendarClock className="w-3.5 h-3.5" />
                Quay lại Nhắc Hẹn
              </button>
            )}
          </div>
        </div>
      )}

      {/* PHẦN SAO LƯU & CẬP NHẬT DỮ LIỆU VÀO DANH SÁCH (ẨN THEO YÊU CẦU NGƯỜI DÙNG) */}
      {showBackupSection && (
        <div className="bg-gradient-to-br from-emerald-50/80 via-teal-50/40 to-slate-50 border-2 border-emerald-300/80 rounded-2xl p-4 sm:p-5 mb-5 shadow-xs transition-all animate-in fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-emerald-200/70">
            <div className="flex items-center gap-2.5">
              <span className="p-2 bg-emerald-600 text-white rounded-xl shadow-xs">
                <FolderSync className="w-5 h-5" />
              </span>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <h3 className="text-sm sm:text-base font-bold text-gray-900 uppercase tracking-tight">
                    Phần Sao Lưu & CẬP NHẬT DỮ LIỆU VÀO DANH SÁCH
                  </h3>
                  {currentRecordId ? (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-full inline-flex items-center gap-1 font-mono">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Đang liên kết: {currentActiveBackup?.customerName || currentActiveBackup?.driverName || "Bản ghi"}
                      {currentActiveBackup?.recordDate && ` (${formatDateDDMMYYYY(currentActiveBackup.recordDate)})`}
                      {(currentActiveBackup?.updatedAt || currentActiveBackup?.createdAt) && (
                        <span className="text-emerald-800 font-normal">
                          • Lưu lúc: {formatBackupDateTime(currentActiveBackup.updatedAt || currentActiveBackup.createdAt, true)} ({formatRelativeTime(currentActiveBackup.updatedAt || currentActiveBackup.createdAt)})
                        </span>
                      )}
                    </span>
                  ) : (
                    <span className="text-[11px] font-semibold px-2.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-200 rounded-full inline-flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-amber-600" />
                      Phiên mới ({orders.length} đơn chưa lưu)
                    </span>
                  )}
                  <span className="text-[11px] font-mono font-bold text-slate-700 bg-white/90 border border-slate-200/90 px-2 py-0.5 rounded-lg inline-flex items-center gap-1.5 shadow-2xs">
                    <Clock className="w-3 h-3 text-emerald-600 animate-pulse" />
                    Thời gian thực: <strong>{formatRealtimeClock(liveClock, true)}</strong>
                  </span>
                </div>
                <p className="text-xs text-gray-500 mt-0.5">
                  Sao lưu danh sách hiện tại vào bộ nhớ hoặc cập nhật, nạp, gộp các đơn hàng từ bản sao lưu trước đó theo thời gian thực.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 self-end sm:self-auto">
              {onOpenBackupModal && (
                <button
                  type="button"
                  onClick={onOpenBackupModal}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 bg-white hover:bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title="Mở toàn bộ danh sách lịch sử sao lưu"
                >
                  <FolderOpen className="w-3.5 h-3.5 text-emerald-600" />
                  Quản lý sao lưu ({backups.length})
                </button>
              )}

              <button
                type="button"
                onClick={() => setIsBackupSectionExpanded((prev) => !prev)}
                className="p-1.5 text-gray-500 hover:text-gray-800 hover:bg-white rounded-lg transition-colors cursor-pointer border border-transparent hover:border-gray-200"
                title={isBackupSectionExpanded ? "Thu gọn phần sao lưu" : "Mở rộng phần sao lưu"}
              >
                {isBackupSectionExpanded ? (
                  <ChevronUp className="w-4 h-4" />
                ) : (
                  <ChevronDown className="w-4 h-4" />
                )}
              </button>

              <button
                type="button"
                onClick={() => setShowBackupSection(false)}
                className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 hover:text-rose-700 hover:bg-rose-50 px-2.5 py-1.5 rounded-lg border border-gray-200 hover:border-rose-200 transition-colors cursor-pointer"
                title="Ẩn phần này"
              >
                <X className="w-3.5 h-3.5 text-gray-500 hover:text-rose-600" />
                Ẩn phần này
              </button>
            </div>
          </div>

        {/* Feedback Alert if available */}
        {backupFeedbackMsg && (
          <div className="mt-3 px-3 py-2 bg-emerald-100/90 border border-emerald-300 text-emerald-900 rounded-xl text-xs font-medium flex items-center gap-2 animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
            <span>{backupFeedbackMsg}</span>
          </div>
        )}

        {isBackupSectionExpanded && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-4 pt-1">
            {/* Cột 1: Thao tác Sao lưu Danh sách hiện tại */}
            <div className="bg-white/95 rounded-xl border border-emerald-200/90 p-3.5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Save className="w-3.5 h-3.5 text-emerald-600" />
                    1. Sao Lưu Danh Sách Đơn Hàng
                  </span>
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                    {orders.length} đơn hiện có
                  </span>
                </div>
                <p className="text-xs text-gray-600 leading-relaxed">
                  Lưu trữ toàn bộ dữ liệu phần mềm (gồm Danh Sách {orders.length} đơn hàng, Ghi chú công việc, Tùy chọn mẫu in, Lời nhắn nhanh và các bản sao lưu trước đó) vào bộ nhớ an toàn theo thời gian thực.
                </p>
                <div className="mt-2 flex items-center justify-between text-[11px] font-mono text-emerald-900 bg-emerald-50/80 border border-emerald-200/70 rounded-lg px-2.5 py-1.5">
                  <span className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-emerald-600" />
                    Thời gian sao lưu ghi nhận:
                  </span>
                  <strong className="text-emerald-950 font-bold">{formatRealtimeClock(liveClock, true)}</strong>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                {currentRecordId ? (
                  <>
                    <button
                      type="button"
                      onClick={handleTriggerUpdateCurrent}
                      className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs active:bg-emerald-800"
                      title="Lưu cập nhật toàn bộ vào bản ghi sao lưu đang mở"
                    >
                      <RotateCw className="w-3.5 h-3.5" />
                      Lưu cập nhật bản ghi này
                    </button>
                    <button
                      type="button"
                      onClick={handleTriggerSaveNew}
                      className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-200 rounded-lg transition-colors cursor-pointer shadow-2xs"
                      title="Lưu thành một bản sao lưu mới hoàn toàn"
                    >
                      <PlusCircle className="w-3.5 h-3.5 text-blue-600" />
                      Lưu thành bản sao mới
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    onClick={handleTriggerSaveNew}
                    disabled={orders.length === 0 && !defaultCustomerName && !defaultDriverName}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-50 active:bg-emerald-800"
                    title="Sao lưu toàn bộ danh sách đơn hàng và dữ liệu vào bộ nhớ"
                  >
                    <Save className="w-3.5 h-3.5" />
                    Lưu cập nhật dữ liệu toàn bộ
                  </button>
                )}

                <button
                  type="button"
                  onClick={handleExportBackupJson}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg transition-colors cursor-pointer ml-auto shadow-xs"
                  title="Tải về file JSON sao lưu toàn bộ: danh sách đơn hàng, ghi chú công việc, tùy chọn mẫu in, lời nhắn nhanh và tất cả các mục sao lưu trước đó"
                >
                  <Download className="w-3.5 h-3.5 text-white" />
                  Sao lưu toàn bộ (.JSON)
                </button>
              </div>
            </div>

            {/* Cột 2: Cập nhật từ Bản sao lưu vào Danh sách */}
            <div className="bg-white/95 rounded-xl border border-emerald-200/90 p-3.5 flex flex-col justify-between space-y-3">
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-bold text-gray-800 uppercase tracking-wide flex items-center gap-1.5">
                    <Database className="w-3.5 h-3.5 text-teal-600" />
                    2. Cập Nhật Từ Bản Sao Lưu Vào Danh Sách
                  </span>
                  <span className="text-[11px] font-medium text-gray-500">
                    {backups.length} bản sao lưu đã có
                  </span>
                </div>

                <div className="mt-1">
                  <select
                    value={selectedBackupId}
                    onChange={(e) => setSelectedBackupId(e.target.value)}
                    className="w-full text-xs font-medium bg-gray-50 border border-gray-300 rounded-lg px-2.5 py-2 text-gray-800 focus:bg-white focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 outline-none transition-colors"
                  >
                    <option value="">
                      -- Chọn bản sao lưu để nạp hoặc cập nhật ({backups.length}) --
                    </option>
                    {backups.map((b) => {
                      const count = b.orders?.length || b.warehouseNumbers?.length || 0;
                      const title = b.customerName || b.driverName || "Bản ghi";
                      const plate = b.vehicleNumber ? `[${b.vehicleNumber}] ` : "";
                      const formattedDate = formatDateDDMMYYYY(b.recordDate) || b.recordDate;
                      const formattedTime = formatBackupDateTime(b.updatedAt || b.createdAt, true);
                      return (
                        <option key={b.id} value={b.id}>
                          Ngày: {formattedDate} | {title} | {plate}Lưu lúc: {formattedTime} ({count} đơn)
                        </option>
                      );
                    })}
                  </select>
                </div>

                {selectedBackupRecord && (
                  <div className="mt-2.5 p-2.5 bg-teal-50/90 border border-teal-200/90 rounded-xl text-[11px] text-teal-950 space-y-2 shadow-xs">
                    <div className="flex flex-wrap items-center justify-between gap-1.5 pb-1.5 border-b border-teal-200/70">
                      <div className="font-bold text-teal-900 text-xs flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-teal-600" />
                        <span>{selectedBackupRecord.customerName || selectedBackupRecord.driverName || "Bản ghi sao lưu"}</span>
                      </div>
                      <span className="inline-flex items-center gap-1 font-semibold text-teal-900 bg-white/90 border border-teal-300/80 px-2 py-0.5 rounded-md font-mono text-[10px] shadow-2xs">
                        <Clock className="w-3 h-3 text-teal-600" />
                        Ngày giờ sao lưu: <strong>{formatBackupDateTime(selectedBackupRecord.updatedAt || selectedBackupRecord.createdAt, true) || "Chưa rõ"}</strong>
                        {(selectedBackupRecord.updatedAt || selectedBackupRecord.createdAt) && (
                          <span className="text-emerald-800 font-bold ml-1">({formatRelativeTime(selectedBackupRecord.updatedAt || selectedBackupRecord.createdAt)})</span>
                        )}
                      </span>
                    </div>

                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-0.5 text-teal-900">
                      <div>
                        <span className="text-[10px] text-teal-700 block">Ngày giao hàng:</span>
                        <strong className="font-mono text-teal-950 text-xs">
                          {formatDateDDMMYYYY(selectedBackupRecord.recordDate) || selectedBackupRecord.recordDate || "Chưa có"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-teal-700 block">Số xe:</span>
                        <strong className="text-teal-950 font-semibold">
                          {selectedBackupRecord.vehicleNumber || "Chưa có"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-teal-700 block">Người giao:</span>
                        <strong className="text-teal-950 font-semibold">
                          {selectedBackupRecord.driverName || "Chưa có"}
                        </strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-teal-700 block">Tổng số đơn:</span>
                        <strong className="text-emerald-700 font-bold text-xs">
                          {selectedBackupRecord.orders?.length || selectedBackupRecord.warehouseNumbers?.length || 0} đơn
                        </strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={handleLoadSelectedBackup}
                  disabled={!selectedBackupRecord}
                  className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors cursor-pointer shadow-xs disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Tải toàn bộ số phiếu & đơn của bản ghi này thay thế danh sách hiện tại"
                >
                  <RotateCw className="w-3.5 h-3.5" />
                  Nạp thay thế vào danh sách
                </button>

                <button
                  type="button"
                  onClick={handleMergeSelectedBackup}
                  disabled={!selectedBackupRecord}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold px-3 py-2 bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-200 rounded-lg transition-colors cursor-pointer shadow-2xs disabled:opacity-40 disabled:cursor-not-allowed"
                  title="Gộp các đơn từ bản sao lưu này vào danh sách hiện tại (giữ các đơn đang có)"
                >
                  <FolderSync className="w-3.5 h-3.5 text-teal-600" />
                  Gộp cập nhật vào danh sách
                </button>

                <label
                  htmlFor={jsonFileInputId}
                  className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-2 bg-gray-50 hover:bg-gray-100 text-gray-700 border border-gray-200 rounded-lg transition-colors cursor-pointer ml-auto"
                  title="Nhập file JSON từ máy tính vào danh sách đơn"
                >
                  <Upload className="w-3.5 h-3.5 text-gray-500" />
                  Nhập file JSON
                  <input
                    id={jsonFileInputId}
                    type="file"
                    accept=".json"
                    onChange={handleImportJsonFile}
                    className="hidden"
                  />
                </label>
              </div>
            </div>
          </div>
        )}
      </div>
      )}

      {/* Multi-criteria Filter Bar: Chỉ hiển thị khi có phát sinh dữ liệu trong các trường lọc hoặc có bộ lọc đã lưu */}
      {availableFilterCount > 0 && (
        <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 mb-4 space-y-3 shadow-2xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-xs font-bold text-slate-800">
              <span className="flex items-center gap-1.5">
                <Filter className="w-4 h-4 text-emerald-600" />
                <span>BỘ LỌC CHỌN TIÊU CHÍ:</span>
              </span>
              {hasActiveFilters ? (
                <span className="text-[10.5px] bg-emerald-100 text-emerald-900 border border-emerald-300 px-2 py-0.5 rounded-full font-bold flex items-center gap-1 shadow-2xs">
                  <Check className="w-3 h-3 text-emerald-700" />
                  Đang lọc ({filteredOrders.length}/{orders.length} đơn) • Đã lưu bộ lọc
                </span>
              ) : (
                <span className="text-[10px] text-slate-500 font-medium">
                  (Bộ lọc được tự động lưu lại cho đến khi bạn chọn bộ lọc mới)
                </span>
              )}
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                onClick={handleClearAllFilters}
                className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 border border-rose-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                title="Xóa tất cả các tiêu chí đang lọc và làm mới bộ lọc"
              >
                <RotateCw className="w-3 h-3" />
                <span>Xóa tất cả bộ lọc</span>
              </button>
            )}
          </div>

          {/* Select Dropdowns: Chỉ hiển thị các tiêu chí có phát sinh dữ liệu */}
          <div
            className={`grid gap-2.5 ${
              availableFilterCount === 1
                ? "grid-cols-1 max-w-sm"
                : availableFilterCount === 2
                ? "grid-cols-1 sm:grid-cols-2"
                : availableFilterCount === 3
                ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3"
                : availableFilterCount === 4
                ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-4"
                : availableFilterCount === 5
                ? "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5"
                : "grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6"
            }`}
          >
            {/* 1. Lọc theo Tháng - Tháng 1 đến Tháng 12 */}
            {(uniqueMonths.length > 0 || monthFilter !== "all") && (
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-indigo-500" /> Tháng
                </label>
                <select
                  value={monthFilter}
                  onChange={(e) => setMonthFilter(e.target.value)}
                  className={`w-full text-xs py-1.5 px-2.5 rounded-lg border bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors ${
                    monthFilter !== "all"
                      ? "border-indigo-500 font-bold text-indigo-900 bg-indigo-50/50"
                      : "border-gray-200 text-gray-700"
                  }`}
                >
                  <option value="all">-- Tất cả các tháng ({uniqueMonths.length}) --</option>
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const count = monthCounts[m] || 0;
                    return (
                      <option key={m} value={String(m)}>
                        Tháng {m} {count > 0 ? `(${count} đơn)` : ""}
                      </option>
                    );
                  })}
                </select>
              </div>
            )}

            {/* 2. Lọc theo Số xe - chỉ hiện khi có số xe phát sinh */}
            {(uniqueVehicles.length > 0 || vehicleFilter !== "all") && (
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                  <Truck className="w-3 h-3 text-slate-400" /> Số xe (Biển số)
                </label>
                <select
                  value={vehicleFilter}
                  onChange={(e) => setVehicleFilter(e.target.value)}
                  className={`w-full text-xs py-1.5 px-2.5 rounded-lg border bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors ${
                    vehicleFilter !== "all"
                      ? "border-emerald-500 font-bold text-emerald-900 bg-emerald-50/40"
                      : "border-gray-200 text-gray-700"
                  }`}
                >
                  <option value="all">-- Tất cả số xe ({uniqueVehicles.length}) --</option>
                  {vehicleFilter !== "all" && !uniqueVehicles.includes(vehicleFilter) && (
                    <option value={vehicleFilter}>Xe: {vehicleFilter}</option>
                  )}
                  {uniqueVehicles.map((veh) => (
                    <option key={veh} value={veh}>
                      Xe: {veh}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 2. Lọc theo Tên khách hàng - chỉ hiện khi có khách hàng phát sinh */}
            {(uniqueCustomers.length > 0 || customerFilter !== "all") && (
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                  <Building2 className="w-3 h-3 text-slate-400" /> Tên khách hàng
                </label>
                <select
                  value={customerFilter}
                  onChange={(e) => setCustomerFilter(e.target.value)}
                  className={`w-full text-xs py-1.5 px-2.5 rounded-lg border bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors ${
                    customerFilter !== "all"
                      ? "border-emerald-500 font-bold text-emerald-900 bg-emerald-50/40"
                      : "border-gray-200 text-gray-700"
                  }`}
                >
                  <option value="all">-- Tất cả khách hàng ({uniqueCustomers.length}) --</option>
                  {customerFilter !== "all" && !uniqueCustomers.includes(customerFilter) && (
                    <option value={customerFilter}>KH: {customerFilter}</option>
                  )}
                  {uniqueCustomers.map((cust) => (
                    <option key={cust} value={cust}>
                      KH: {cust}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 3. Lọc theo Khu vực - chỉ hiện khi có khu vực phát sinh */}
            {(uniqueAreas.length > 0 || areaFilter !== "all" || locationFilter !== "all") && (
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" /> Khu vực
                </label>
                <select
                  value={areaFilter !== "all" ? areaFilter : locationFilter}
                  onChange={(e) => {
                    setAreaFilter(e.target.value);
                    setLocationFilter(e.target.value);
                  }}
                  className={`w-full text-xs py-1.5 px-2.5 rounded-lg border bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors ${
                    (areaFilter !== "all" || locationFilter !== "all")
                      ? "border-emerald-500 font-bold text-emerald-900 bg-emerald-50/40"
                      : "border-gray-200 text-gray-700"
                  }`}
                >
                  <option value="all">-- Tất cả khu vực ({uniqueAreas.length}) --</option>
                  {(areaFilter !== "all" || locationFilter !== "all") &&
                    !uniqueAreas.includes(areaFilter !== "all" ? areaFilter : locationFilter) && (
                      <option value={areaFilter !== "all" ? areaFilter : locationFilter}>
                        {areaFilter !== "all" ? areaFilter : locationFilter}
                      </option>
                    )}
                  {uniqueAreas.map((loc) => (
                    <option key={loc} value={loc}>
                      {loc}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 4. Lọc theo Ngày giao - chỉ hiện khi có ngày giao phát sinh */}
            {(uniqueDates.length > 0 || dateFilter !== "all") && (
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" /> Ngày giao hàng
                </label>
                <select
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className={`w-full text-xs py-1.5 px-2.5 rounded-lg border bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors ${
                    dateFilter !== "all"
                      ? "border-emerald-500 font-bold text-emerald-900 bg-emerald-50/40"
                      : "border-gray-200 text-gray-700"
                  }`}
                >
                  <option value="all">-- Tất cả ngày giao ({uniqueDates.length}) --</option>
                  {dateFilter !== "all" && !uniqueDates.includes(dateFilter) && (
                    <option value={dateFilter}>Ngày: {formatDateDDMMYYYY(dateFilter)}</option>
                  )}
                  {uniqueDates.map((dt) => (
                    <option key={dt} value={dt}>
                      Ngày: {formatDateDDMMYYYY(dt)}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* 5. Lọc theo Người giao - chỉ hiện khi có người giao phát sinh */}
            {(uniqueDrivers.length > 0 || driverFilter !== "all") && (
              <div>
                <label className="block text-[10px] font-bold text-slate-600 uppercase mb-1 flex items-center gap-1">
                  <User className="w-3 h-3 text-slate-400" /> Người giao
                </label>
                <select
                  value={driverFilter}
                  onChange={(e) => setDriverFilter(e.target.value)}
                  className={`w-full text-xs py-1.5 px-2.5 rounded-lg border bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500 transition-colors ${
                    driverFilter !== "all"
                      ? "border-emerald-500 font-bold text-emerald-900 bg-emerald-50/40"
                      : "border-gray-200 text-gray-700"
                  }`}
                >
                  <option value="all">-- Tất cả người giao ({uniqueDrivers.length}) --</option>
                  {driverFilter !== "all" && !uniqueDrivers.includes(driverFilter) && (
                    <option value={driverFilter}>{driverFilter}</option>
                  )}
                  {uniqueDrivers.map((drv) => (
                    <option key={drv} value={drv}>
                      {drv}
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Status Filter Tabs - Tích chọn xem nhiều trạng thái cùng lúc */}
      <div className="flex flex-wrap items-center gap-1.5 mb-3 bg-slate-100/90 p-2 rounded-xl border border-gray-200/70 shadow-2xs">
        {/* Nút "Tất cả trạng thái" */}
        <button
          type="button"
          onClick={handleSelectAllStatuses}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer border ${
            selectedStatuses.length === 0 && !filterDuplicatesOnly
              ? "bg-white text-gray-900 shadow-xs border-gray-300 ring-2 ring-emerald-500/20"
              : "bg-white/40 text-gray-600 border-transparent hover:bg-white hover:text-gray-900 hover:border-gray-200"
          }`}
          title="Xem tất cả đơn hàng (bỏ lọc trạng thái và trùng đơn)"
        >
          {selectedStatuses.length === 0 && !filterDuplicatesOnly ? (
            <CheckSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
          ) : (
            <Square className="w-3.5 h-3.5 text-gray-400 shrink-0" />
          )}
          <span>Tất cả trạng thái</span>
          <span
            className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-mono ${
              selectedStatuses.length === 0 && !filterDuplicatesOnly
                ? "bg-emerald-100 text-emerald-800 font-bold"
                : "bg-slate-200 text-gray-600"
            }`}
          >
            {statusCounts.all}
          </span>
        </button>

        {/* Nút "Trùng Đơn" - Thêm vào nếu có đơn trùng trong danh sách */}
        {duplicateOrdersCount > 0 && (
          <button
            type="button"
            onClick={() => setFilterDuplicatesOnly((prev) => !prev)}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
              filterDuplicatesOnly
                ? "bg-amber-500 text-white border-amber-600 shadow-xs font-bold ring-2 ring-amber-400/30"
                : "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100 hover:border-amber-400"
            }`}
            title={`Lọc xem ${duplicateOrdersCount} đơn hàng bị trùng số phiếu (Trùng Đơn)`}
          >
            {filterDuplicatesOnly ? (
              <CheckSquare className="w-3.5 h-3.5 shrink-0 text-white" />
            ) : (
              <Square className="w-3.5 h-3.5 text-amber-600 shrink-0" />
            )}
            <AlertTriangle className={`w-3.5 h-3.5 shrink-0 ${filterDuplicatesOnly ? "text-white" : "text-amber-600 animate-pulse"}`} />
            <span>Trùng Đơn</span>
            <span
              className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-mono ${
                filterDuplicatesOnly
                  ? "bg-white text-amber-950 font-bold shadow-2xs"
                  : "bg-amber-200 text-amber-950 font-bold"
              }`}
            >
              {duplicateOrdersCount}
            </span>
          </button>
        )}

        {/* Các nút tích chọn nhiều trạng thái cùng lúc */}
        {STATUS_OPTIONS.map((st) => {
          const cfg = STATUS_CONFIG[st];
          const Icon = cfg.icon;
          const count = statusCounts[st] || 0;
          const isChecked = selectedStatuses.includes(st);

          // Chỉ hiện những trạng thái có thông số và phát sinh thực tế (count > 0) hoặc đang được tích chọn
          if (count === 0 && !isChecked) {
            return null;
          }

          return (
            <button
              key={st}
              type="button"
              onClick={() => handleToggleStatusFilter(st)}
              className={`inline-flex items-center gap-1.5 px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer border ${
                isChecked
                  ? `${cfg.bg} ${cfg.color} ${cfg.border} shadow-xs font-bold ring-2 ring-current/20`
                  : "bg-white/50 text-gray-600 border-transparent hover:bg-white hover:text-gray-900 hover:border-gray-200"
              }`}
              title={`Tích chọn xem trạng thái: ${cfg.label} (có thể tích chọn nhiều trạng thái cùng lúc)`}
            >
              {isChecked ? (
                <CheckSquare className="w-3.5 h-3.5 shrink-0" />
              ) : (
                <Square className="w-3.5 h-3.5 text-gray-400 shrink-0" />
              )}
              <Icon className="w-3 h-3 shrink-0" />
              <span>{cfg.label}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10.5px] font-mono ${
                  isChecked
                    ? "bg-white/90 font-bold shadow-2xs"
                    : "bg-slate-200/80 text-gray-600"
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}

        {/* Nút xóa lọc nhanh khi đang chọn 1 hoặc nhiều trạng thái hoặc đang lọc Trùng Đơn */}
        {(selectedStatuses.length > 0 || filterDuplicatesOnly) && (
          <button
            type="button"
            onClick={handleSelectAllStatuses}
            className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 px-2.5 py-1 rounded-lg transition-colors cursor-pointer"
            title="Bỏ lọc để xem lại tất cả các trạng thái"
          >
            <X className="w-3 h-3" />
            {filterDuplicatesOnly && selectedStatuses.length === 0
              ? "Đang lọc Trùng Đơn (Xem tất cả)"
              : `Đang chọn ${selectedStatuses.length + (filterDuplicatesOnly ? 1 : 0)} bộ lọc (Xem tất cả)`}
          </button>
        )}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {overdueHandoverOrders.length > 0 && (
            <button
              type="button"
              onClick={() => {
                setSelectedStatuses(["pending", "unsigned"]);
                setFilterDuplicatesOnly(false);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-black bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 rounded-lg shadow-2xs transition-colors cursor-pointer animate-pulse"
              title={`Có ${overdueHandoverOrders.length} đơn hàng Chưa Nhận Đơn / Không ký đơn đã quá hạn 7 ngày. Bấm để lọc xem ngay!`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
              <span>Quá hạn bàn giao: {overdueHandoverOrders.length} đơn</span>
            </button>
          )}

          {duplicateTicketNumbers.size > 0 && (
            <span
              className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-extrabold bg-amber-100 text-amber-900 border border-amber-300 rounded-lg shadow-2xs"
              title={`Có ${duplicateTicketNumbers.size} số phiếu bị trùng nhau trong danh sách đơn hàng`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
              Trùng mã: {duplicateTicketNumbers.size} số phiếu
            </span>
          )}
        </div>
      </div>

      {/* Standout Prominent Batch Action Toolbar when items are selected */}
      {selectedIds.length > 0 && (
        <div className="mb-3.5 p-2.5 sm:p-3 bg-emerald-50 border-2 border-emerald-500/80 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-2.5 animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 bg-emerald-600 text-white rounded-lg text-xs font-bold shadow-2xs">
              <CheckSquare className="w-3.5 h-3.5" />
              Đã chọn {selectedIds.length} đơn hàng
            </span>
            <span className="text-xs text-emerald-800 hidden sm:inline">
              Chọn thao tác xử lý hàng loạt:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 1. Sửa Người Giao Hàng Loạt */}
            <button
              type="button"
              onClick={() => {
                setBatchDriverInput(defaultDriverName || "");
                setIsBatchDriverModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              title="Đổi người giao cho tất cả các đơn hàng đã chọn"
            >
              <Users className="w-3.5 h-3.5 text-blue-600" />
              Sửa người giao ({selectedIds.length})
            </button>

            {/* Sửa Tháng Hàng Loạt - Trước Số Xe */}
            <button
              type="button"
              onClick={() => {
                setBatchMonthInput(String(new Date().getMonth() + 1));
                setIsBatchMonthModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              title="Đổi tháng giao hàng cho tất cả các đơn hàng đã chọn"
            >
              <Calendar className="w-3.5 h-3.5 text-indigo-600" />
              Sửa tháng ({selectedIds.length})
            </button>

            {/* 2. Sửa Số Xe Hàng Loạt */}
            <button
              type="button"
              onClick={() => {
                setBatchVehicleInput(defaultVehicleNumber || "");
                setIsBatchVehicleModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              title="Đổi biển số xe cho tất cả các đơn hàng đã chọn"
            >
              <Truck className="w-3.5 h-3.5 text-emerald-600" />
              Sửa số xe ({selectedIds.length})
            </button>

            {/* 3. Sửa Khách Hàng Hàng Loạt */}
            <button
              type="button"
              onClick={() => {
                setBatchCustomerInput(defaultCustomerName || "");
                setIsBatchCustomerModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              title="Đổi tên khách hàng cho tất cả các đơn hàng đã chọn"
            >
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Sửa khách hàng ({selectedIds.length})
            </button>

            {/* 4. Sửa Khu Vực Hàng Loạt */}
            <button
              type="button"
              onClick={() => {
                setBatchAreaInput(defaultArea || defaultDeliveryLocation || "");
                setIsBatchAreaModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              title="Đổi khu vực cho tất cả các đơn hàng đã chọn"
            >
              <MapPin className="w-3.5 h-3.5 text-amber-600" />
              Sửa khu vực ({selectedIds.length})
            </button>

            {/* 5. Sửa Ngày Giao Hàng Loạt */}
            <button
              type="button"
              onClick={() => {
                setBatchDateInput(defaultRecordDate || getLocalTodayISO());
                setIsBatchDateModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-lg border border-slate-300 shadow-2xs transition-colors cursor-pointer"
              title="Đổi ngày giao cho tất cả các đơn hàng đã chọn"
            >
              <Calendar className="w-3.5 h-3.5 text-purple-600" />
              Sửa ngày giao ({selectedIds.length})
            </button>

            {/* 6. Đổi Trạng Thái Hàng Loạt */}
            <div className="flex items-center gap-1">
              <select
                onChange={(e) => {
                  if (e.target.value) {
                    onBatchUpdateStatus(e.target.value as OrderStatus, selectedIds);
                    setSelectedIds([]);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
                className="text-xs font-bold py-1.5 px-2.5 bg-white border border-emerald-400 rounded-lg text-emerald-950 focus:ring-2 focus:ring-emerald-500 shadow-2xs cursor-pointer"
              >
                <option value="" disabled>
                  Đổi trạng thái hàng loạt...
                </option>
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {STATUS_CONFIG[st].label}
                  </option>
                ))}
              </select>
            </div>

            {/* Đổi Tháng Hàng Loạt Nhanh */}
            <div className="flex items-center gap-1">
              <select
                onChange={(e) => {
                  if (e.target.value && onBatchUpdateMonth) {
                    onBatchUpdateMonth(Number(e.target.value), selectedIds);
                    setSelectedIds([]);
                    e.target.value = "";
                  }
                }}
                defaultValue=""
                className="text-xs font-bold py-1.5 px-2.5 bg-white border border-indigo-400 rounded-lg text-indigo-950 focus:ring-2 focus:ring-indigo-500 shadow-2xs cursor-pointer"
                title="Đổi tháng nhanh cho tất cả các đơn hàng đã chọn"
              >
                <option value="" disabled>
                  Đổi tháng hàng loạt...
                </option>
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            </div>

            {/* 7. Nhân bản các đơn đã chọn */}
            <button
              type="button"
              onClick={handleApplyBatchDuplicate}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-blue-50 text-blue-700 text-xs font-bold rounded-lg border border-blue-300 shadow-2xs transition-colors cursor-pointer"
              title="Nhân bản tất cả các đơn hàng đã chọn"
            >
              <Copy className="w-3.5 h-3.5 text-blue-600" />
              Nhân bản ({selectedIds.length})
            </button>

            {/* 8. Xóa các đơn đã chọn */}
            <button
              type="button"
              onClick={handleApplyBatchDelete}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-bold rounded-lg border border-rose-200 transition-colors cursor-pointer"
              title="Xóa toàn bộ các đơn hàng đã chọn"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Xóa
            </button>

            {/* 5. Bỏ chọn */}
            <button
              type="button"
              onClick={() => setSelectedIds([])}
              className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2 py-1 underline cursor-pointer"
            >
              Bỏ chọn
            </button>
          </div>
        </div>
      )}

      {/* Search, Sort, Export toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
        <div className="flex flex-1 items-center gap-2">
          {/* Search Box */}
          <div className="relative flex-1 max-w-xl">
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Tìm kiếm số phiếu, số xe, khách hàng, khu vực, người giao..."
              className="w-full pl-8 pr-7 py-1.5 text-xs rounded-lg border border-gray-200 focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 bg-white"
            />
            {searchTerm && (
              <button
                type="button"
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Sort selector */}
          <div className="flex items-center gap-1 text-xs text-gray-500">
            <ArrowUpDown className="w-3.5 h-3.5 text-gray-400" />
            <select
              value={sortField}
              onChange={(e) => setSortField(e.target.value as any)}
              className="text-xs py-1 px-2 border border-gray-200 rounded-lg bg-white text-gray-700 focus:outline-hidden"
            >
              <option value="ticketNumber">Sắp theo: Số phiếu (1, 2, 3... theo từng tháng)</option>
              <option value="month">Sắp theo: Tháng (Tháng 1 đến 12 &amp; Số phiếu)</option>
              <option value="vehicleNumber">Sắp theo: Số xe</option>
              <option value="customerName">Sắp theo: Khách hàng</option>
              <option value="deliveryLocation">Sắp theo: Khu vực</option>
              <option value="driverName">Sắp theo: Người giao</option>
              <option value="deliveryDate">Sắp theo: Ngày giao</option>
              <option value="status">Sắp theo: Trạng thái</option>
            </select>
            <button
              type="button"
              onClick={() => setSortDirection((d) => (d === "asc" ? "desc" : "asc"))}
              className="p-1 text-gray-600 hover:bg-gray-100 rounded-md text-xs font-bold cursor-pointer"
              title="Đảo chiều sắp xếp"
            >
              {sortDirection === "asc" ? "↑" : "↓"}
            </button>
          </div>

          {/* Quick Page Navigator in Top Toolbar */}
          {totalPages > 1 && (
            <div className="hidden sm:flex items-center gap-1.5 text-xs bg-slate-50 border border-gray-200 px-2 py-1 rounded-lg">
              <span className="text-gray-500 font-medium">Trang:</span>
              <select
                value={safeCurrentPage}
                onChange={(e) => setCurrentPage(Number(e.target.value))}
                className="bg-white border border-gray-300 rounded px-1.5 py-0.5 font-bold text-gray-800 text-xs cursor-pointer focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                title="Chọn số trang"
              >
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                  <option key={p} value={p}>
                    {p} / {totalPages}
                  </option>
                ))}
              </select>
              <div className="flex items-center">
                <button
                  type="button"
                  disabled={safeCurrentPage <= 1}
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  className="p-0.5 text-gray-600 hover:text-emerald-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  disabled={safeCurrentPage >= totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  className="p-0.5 text-gray-600 hover:text-emerald-700 hover:bg-gray-200 rounded disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  title="Trang sau"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Right actions */}
        <div className="flex items-center gap-2">
          {/* Nút Xem bản in & In */}
          <button
            type="button"
            onClick={handleOpenPrintModal}
            disabled={orders.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-900 border border-indigo-300 rounded-lg transition-colors cursor-pointer shadow-2xs active:bg-indigo-200 disabled:opacity-50"
            title="Xem trước bản in bảng kê và in ra giấy hoặc xuất PDF"
          >
            <Printer className="w-3.5 h-3.5 text-indigo-600" />
            <span>Xem bản in &amp; In</span>
          </button>

          {/* Nút Chia sẻ hình ảnh trực tiếp từ bảng */}
          <button
            type="button"
            onClick={() => {
              handleOpenPrintModal();
              setIsPrintShareOpen(true);
            }}
            disabled={orders.length === 0}
            className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-900 border border-blue-300 rounded-lg transition-colors cursor-pointer shadow-2xs active:bg-blue-200 disabled:opacity-50"
            title="Xuất file ảnh bảng kê & Chia sẻ kèm lời nhắn nhanh tự tạo"
          >
            <Share2 className="w-3.5 h-3.5 text-blue-600" />
            <span>Chia sẻ hình ảnh</span>
          </button>
        </div>
      </div>

      {/* Quick Add New Form (Collapsible) */}
      {isAddingNew && (
        <form
          onSubmit={handleAddNewSubmit}
          className="mb-4 p-4 bg-emerald-50/80 border border-emerald-200 rounded-xl space-y-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900 flex items-center gap-1.5">
              <Plus className="w-4 h-4 text-emerald-600" />
              Thêm mới đơn giao hàng vào danh sách
            </span>
            <button
              type="button"
              onClick={() => setIsAddingNew(false)}
              className="text-gray-400 hover:text-gray-600 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-2.5">
            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-0.5">SỐ PHIẾU *</label>
              <input
                type="text"
                required
                value={newTicketNumber}
                onChange={(e) => setNewTicketNumber(e.target.value)}
                placeholder="VD: 105, P-01, #XK/26..."
                className={`w-full text-xs px-2.5 py-1.5 bg-white border rounded-lg focus:outline-hidden focus:ring-2 font-mono font-bold ${
                  newTicketNumber.trim() !== "" &&
                  orders.some(
                    (o) =>
                      String(o.ticketNumber).trim().toLowerCase() === newTicketNumber.trim().toLowerCase() &&
                      (newMonth && getOrderMonth(o) ? getOrderMonth(o) === newMonth : true)
                  )
                    ? "border-amber-400 ring-1 ring-amber-300 focus:ring-amber-500 text-amber-900"
                    : "border-gray-300 focus:ring-emerald-500 text-gray-900"
                }`}
              />
              {(() => {
                const ticketKey = newTicketNumber.trim().toLowerCase();
                const hasDup =
                  ticketKey !== "" &&
                  orders.some(
                    (o) =>
                      String(o.ticketNumber).trim().toLowerCase() === ticketKey &&
                      (newMonth && getOrderMonth(o) ? getOrderMonth(o) === newMonth : true)
                  );
                if (hasDup) {
                  return (
                    <span className="flex items-center gap-1 mt-1 text-[10px] font-bold text-amber-700">
                      <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                      Số phiếu đã có trong Tháng {newMonth}
                    </span>
                  );
                }
                return null;
              })()}
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-0.5 flex items-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-600" /> THÁNG
              </label>
              <select
                value={newMonth}
                onChange={(e) => {
                  const m = Number(e.target.value);
                  setNewMonth(m);
                }}
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-indigo-300 font-bold text-indigo-900 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-0.5">SỐ XE</label>
              <input
                type="text"
                list="quick-add-vehicle-options"
                value={newVehicleNumber}
                onChange={(e) => setNewVehicleNumber(e.target.value)}
                placeholder="VD: 51C-123.45"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
              />
              <datalist id="quick-add-vehicle-options">
                {previousVehicles.map((v) => (
                  <option key={v} value={v} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-0.5">NGƯỜI GIAO</label>
              <input
                type="text"
                list="quick-add-driver-options"
                value={newDriverName}
                onChange={(e) => setNewDriverName(e.target.value)}
                placeholder="Người giao..."
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <datalist id="quick-add-driver-options">
                {previousDrivers.map((d) => (
                  <option key={d} value={d} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-0.5">
                TÊN KHÁCH HÀNG
              </label>
              <input
                type="text"
                list="quick-add-customer-options"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
                placeholder="Khách hàng / đại lý..."
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <datalist id="quick-add-customer-options">
                {previousCustomers.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-0.5 flex items-center gap-1">
                <MapPin className="w-3 h-3 text-emerald-600" /> KHU VỰC
              </label>
              <input
                type="text"
                list="quick-add-area-options"
                value={newArea}
                onChange={(e) => {
                  setNewArea(e.target.value);
                  setNewDeliveryLocation(e.target.value);
                }}
                placeholder="Khu vực (Miền Đông, Bình Dương...)"
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500"
              />
              <datalist id="quick-add-area-options">
                {previousAreas.map((a) => (
                  <option key={a} value={a} />
                ))}
              </datalist>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-0.5">NGÀY GIAO</label>
              <input
                type="date"
                disabled={newStatus === "delivering" || newStatus === "returned"}
                value={newStatus === "delivering" || newStatus === "returned" ? "" : newDeliveryDate}
                onChange={(e) => setNewDeliveryDate(e.target.value)}
                className={`w-full text-xs px-2.5 py-1.5 rounded-lg border focus:outline-hidden focus:ring-2 ${
                  newStatus === "delivering" || newStatus === "returned"
                    ? "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed"
                    : "bg-white border-gray-300 focus:ring-emerald-500"
                }`}
              />
            </div>

            <div>
              <label className="block text-[10px] font-bold text-gray-700 mb-0.5">TRẠNG THÁI</label>
              <select
                value={newStatus}
                onChange={(e) => {
                  const val = e.target.value as OrderStatus;
                  setNewStatus(val);
                  if (val === "delivering" || val === "returned") {
                    setNewDeliveryDate("");
                  } else if (!newDeliveryDate) {
                    setNewDeliveryDate(defaultRecordDate || getLocalTodayISO());
                  }
                }}
                className="w-full text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-semibold"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st} value={st}>
                    {STATUS_CONFIG[st].label}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <input
              type="text"
              value={newNotes}
              onChange={(e) => setNewNotes(e.target.value)}
              placeholder="Ghi chú đơn hàng (nếu có)..."
              className="flex-1 max-w-md text-xs px-2.5 py-1.5 bg-white border border-gray-300 rounded-lg focus:outline-hidden mr-2"
            />

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setIsAddingNew(false)}
                className="px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-200 rounded-lg cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                className="px-4 py-1.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer"
              >
                Lưu vào danh sách
              </button>
            </div>
          </div>
        </form>
      )}

      {/* Main Delivery Items Table */}
      <div className={`border border-gray-200 rounded-xl overflow-hidden bg-white shadow-2xs ${isFullscreen ? "flex-1 flex flex-col min-h-0" : ""}`}>
        <div className={`overflow-x-auto ${isFullscreen ? "flex-1 max-h-[calc(100vh-260px)] min-h-[500px]" : "max-h-[72vh] min-h-[420px]"} overflow-y-auto`}>
          <table className="w-full text-left border-collapse text-xs">
            <thead className="bg-slate-50 text-gray-700 font-bold sticky top-0 z-10 border-b border-gray-200">
              <tr>
                <th className="py-2.5 px-3 w-10 text-center">
                  <button
                    type="button"
                    onClick={handleToggleSelectAll}
                    className="text-gray-500 hover:text-emerald-700 cursor-pointer"
                    title="Chọn tất cả hoặc bỏ chọn tất cả"
                  >
                    {isAllSelected ? (
                      <CheckSquare className="w-4 h-4 text-emerald-600" />
                    ) : (
                      <Square className="w-4 h-4" />
                    )}
                  </button>
                </th>
                <th className="py-2.5 px-2.5 w-12 text-center text-gray-500">STT</th>
                <th
                  onClick={() => handleHeaderSort("ticketNumber")}
                  className="py-2.5 px-3 font-bold text-gray-900 w-28 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                  title="Nhấn để sắp xếp theo số phiếu: 1, 2, 3... theo từng tháng"
                >
                  <div className="flex items-center gap-1">
                    <span>SỐ PHIẾU</span>
                    {sortField === "ticketNumber" && (
                      <span className="text-emerald-700 font-extrabold text-xs">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort("month")}
                  className="py-2.5 px-2 font-bold text-gray-900 w-20 text-center cursor-pointer select-none hover:bg-slate-100 transition-colors"
                  title="Nhấn để sắp xếp theo tháng (1 đến 12) & số phiếu"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>THÁNG</span>
                    {sortField === "month" && (
                      <span className="text-indigo-700 font-extrabold text-xs">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort("vehicleNumber")}
                  className="py-2.5 px-3 font-bold text-gray-900 w-32 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                  title="Nhấn để sắp xếp theo số xe"
                >
                  <div className="flex items-center gap-1">
                    <span>SỐ XE</span>
                    {sortField === "vehicleNumber" && (
                      <span className="text-emerald-700 font-extrabold text-xs">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort("driverName")}
                  className="py-2.5 px-3 font-bold text-gray-900 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                  title="Nhấn để sắp xếp theo người giao"
                >
                  <div className="flex items-center gap-1">
                    <span>NGƯỜI GIAO</span>
                    {sortField === "driverName" && (
                      <span className="text-emerald-700 font-extrabold text-xs">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort("customerName")}
                  className="py-2.5 px-3 font-bold text-gray-900 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                  title="Nhấn để sắp xếp theo tên khách hàng"
                >
                  <div className="flex items-center gap-1">
                    <span>TÊN KHÁCH HÀNG</span>
                    {sortField === "customerName" && (
                      <span className="text-emerald-700 font-extrabold text-xs">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort("area")}
                  className="py-2.5 px-3 font-bold text-gray-900 cursor-pointer select-none hover:bg-slate-100 transition-colors"
                  title="Nhấn để sắp xếp theo khu vực"
                >
                  <div className="flex items-center gap-1">
                    <span>KHU VỰC</span>
                    {(sortField === "area" || (sortField as string) === "deliveryLocation") && (
                      <span className="text-emerald-700 font-extrabold text-xs">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort("deliveryDate")}
                  className="py-2.5 px-3 font-bold text-gray-900 w-36 min-w-[135px] cursor-pointer select-none hover:bg-slate-100 transition-colors"
                  title="Nhấn để sắp xếp theo ngày giao"
                >
                  <div className="flex items-center gap-1">
                    <span>NGÀY GIAO</span>
                    {sortField === "deliveryDate" && (
                      <span className="text-emerald-700 font-extrabold text-xs">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th
                  onClick={() => handleHeaderSort("status")}
                  className="py-2.5 px-3 font-bold text-gray-900 w-44 text-center cursor-pointer select-none hover:bg-slate-100 transition-colors"
                  title="Nhấn để sắp xếp theo trạng thái đơn"
                >
                  <div className="flex items-center justify-center gap-1">
                    <span>TRẠNG THÁI ĐƠN</span>
                    {sortField === "status" && (
                      <span className="text-emerald-700 font-extrabold text-xs">
                        {sortDirection === "asc" ? "↑" : "↓"}
                      </span>
                    )}
                  </div>
                </th>
                <th className="py-2.5 px-3 font-bold text-gray-900 text-center">GHI CHÚ</th>
                <th className="py-2.5 px-3 font-bold text-gray-900 w-20 text-right">THAO TÁC</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-gray-100">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={12} className="py-12 text-center text-gray-400">
                    <FileText className="w-8 h-8 mx-auto mb-1 text-gray-300" />
                    <p className="font-semibold text-gray-600">Chưa có đơn hàng nào</p>
                    <p className="text-[11px] text-gray-400 mt-0.5">
                      {orders.length === 0
                        ? "Nhấn nút bên dưới để hiện toàn bộ danh sách từ bản sao lưu mới nhất, hoặc tải ảnh sổ kho để bắt đầu."
                        : "Không tìm thấy đơn hàng nào phù hợp với bộ lọc đã chọn."}
                    </p>
                    {orders.length === 0 && (
                      <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                        {onLoadLatestBackup && (
                          <button
                            type="button"
                            onClick={onLoadLatestBackup}
                            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-xs transition-colors cursor-pointer active:scale-95"
                          >
                            <FolderSync className="w-4 h-4" />
                            Hiện tất cả danh sách từ bản sao lưu mới nhất
                          </button>
                        )}
                        {onOpenBackupModal && (
                          <button
                            type="button"
                            onClick={onOpenBackupModal}
                            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                          >
                            <FolderOpen className="w-4 h-4 text-emerald-600" />
                            Xem lịch sử sao lưu
                          </button>
                        )}
                      </div>
                    )}
                    {hasActiveFilters && (
                      <button
                        type="button"
                        onClick={handleClearAllFilters}
                        className="mt-2 text-xs text-emerald-700 font-bold underline cursor-pointer"
                      >
                        Xóa toàn bộ bộ lọc
                      </button>
                    )}
                  </td>
                </tr>
              ) : (
                paginatedOrders.map((order, pageIdx) => {
                  const itemIndex = startIndex + pageIdx;
                  const isEditing = editingId === order.id;
                  const isSelected = selectedIds.includes(order.id);
                  const statusCfg = STATUS_CONFIG[order.status] || STATUS_CONFIG.pending;
                  const StatusIcon = statusCfg.icon;
                  const dupKey = getOrderTicketMonthKey(order.ticketNumber, order);
                  const isDuplicateTicket = dupKey !== "" && duplicateTicketKeys.has(dupKey);

                  if (isEditing) {
                    return (
                      <tr key={order.id} className="bg-emerald-50/50">
                        <td className="py-2 px-3 text-center">
                          <CheckSquare className="w-4 h-4 text-emerald-600 mx-auto" />
                        </td>
                        <td className="py-2 px-2.5 text-center text-gray-400 font-mono font-bold">
                          {itemIndex + 1}
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            value={editForm.ticketNumber ?? ""}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                ticketNumber: e.target.value,
                              }))
                            }
                            placeholder="Số phiếu..."
                            className={`w-full px-2 py-1 bg-white border rounded text-xs font-mono font-bold ${
                              (() => {
                                const curTicket = String(editForm.ticketNumber ?? "").trim().toLowerCase();
                                const curMonth = editForm.month ?? (editForm.deliveryDate ? extractMonthFromDate(editForm.deliveryDate) : getOrderMonth(order));
                                return curTicket !== "" &&
                                  orders.some(
                                    (o) =>
                                      o.id !== order.id &&
                                      String(o.ticketNumber).trim().toLowerCase() === curTicket &&
                                      (curMonth && getOrderMonth(o) ? getOrderMonth(o) === curMonth : true)
                                  );
                              })()
                                ? "border-amber-400 text-amber-900 ring-1 ring-amber-300"
                                : "border-emerald-400 text-emerald-900"
                            }`}
                          />
                          {(() => {
                            const curTicket = String(editForm.ticketNumber ?? "").trim().toLowerCase();
                            const curMonth = editForm.month ?? (editForm.deliveryDate ? extractMonthFromDate(editForm.deliveryDate) : getOrderMonth(order));
                            const isDup =
                              curTicket !== "" &&
                              orders.some(
                                (o) =>
                                  o.id !== order.id &&
                                  String(o.ticketNumber).trim().toLowerCase() === curTicket &&
                                  (curMonth && getOrderMonth(o) ? getOrderMonth(o) === curMonth : true)
                              );
                            if (isDup) {
                              return (
                                <span className="flex items-center gap-0.5 mt-0.5 text-[10px] font-bold text-amber-700">
                                  <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                  Trùng phiếu {curMonth ? `T${curMonth}` : ""}
                                </span>
                              );
                            }
                            return null;
                          })()}
                        </td>
                        <td className="py-2 px-2 text-center">
                          <select
                            value={editForm.month ?? (editForm.deliveryDate ? extractMonthFromDate(editForm.deliveryDate) : "")}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : undefined;
                              setEditForm((prev) => {
                                let nextDate = prev.deliveryDate;
                                if (val !== undefined && nextDate) {
                                  nextDate = updateDateWithMonth(nextDate, val);
                                }
                                return {
                                  ...prev,
                                  month: val,
                                  deliveryDate: nextDate,
                                };
                              });
                            }}
                            className="w-full px-1 py-1 bg-white border border-indigo-300 font-bold text-indigo-950 rounded text-xs text-center focus:ring-1 focus:ring-indigo-500 cursor-pointer"
                          >
                            <option value="">--</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                              <option key={m} value={m}>
                                {m}
                              </option>
                            ))}
                          </select>
                        </td>
                        {/* Số xe */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            list="edit-row-vehicle-suggestions"
                            value={editForm.vehicleNumber || ""}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                vehicleNumber: e.target.value,
                              }))
                            }
                            placeholder="Số xe"
                            className="w-full px-2 py-1 bg-white border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded text-xs font-mono"
                          />
                          <datalist id="edit-row-vehicle-suggestions">
                            {previousVehicles.map((v) => (
                              <option key={v} value={v} />
                            ))}
                          </datalist>
                        </td>

                        {/* Người giao */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            list="edit-row-driver-suggestions"
                            value={editForm.driverName || ""}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, driverName: e.target.value }))
                            }
                            placeholder="Người giao"
                            className="w-full px-2 py-1 bg-white border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded text-xs"
                          />
                          <datalist id="edit-row-driver-suggestions">
                            {previousDrivers.map((d) => (
                              <option key={d} value={d} />
                            ))}
                          </datalist>
                        </td>

                        {/* Tên khách hàng */}
                        <td className="py-2 px-3">
                          {(() => {
                            const custColor = getCustomerColorByStatus(editForm.status);
                            return (
                              <input
                                type="text"
                                list="edit-row-customer-suggestions"
                                value={editForm.customerName || ""}
                                onChange={(e) =>
                                  setEditForm((prev) => ({ ...prev, customerName: e.target.value }))
                                }
                                placeholder="Tên khách hàng"
                                style={{ color: custColor.hex, fontWeight: "bold" }}
                                className={`w-full px-2 py-1 bg-white border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded text-xs font-bold ${custColor.textClass} ${custColor.cssClass}`}
                              />
                            );
                          })()}
                          <datalist id="edit-row-customer-suggestions">
                            {previousCustomers.map((c) => (
                              <option key={c} value={c} />
                            ))}
                          </datalist>
                        </td>

                        {/* Khu vực */}
                        <td className="py-2 px-3">
                          <input
                            type="text"
                            list="edit-row-area-suggestions"
                            value={editForm.area ?? editForm.deliveryLocation ?? ""}
                            onChange={(e) =>
                              setEditForm((prev) => ({
                                ...prev,
                                area: e.target.value,
                                deliveryLocation: e.target.value,
                              }))
                            }
                            placeholder="Khu vực"
                            className="w-full px-2 py-1 bg-white border border-gray-300 focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 rounded text-xs"
                          />
                          <datalist id="edit-row-area-suggestions">
                            {previousAreas.map((a) => (
                              <option key={a} value={a} />
                            ))}
                          </datalist>
                        </td>
                        <td className="py-2 px-3">
                          <input
                            type="date"
                            value={
                              editForm.deliveryDate !== undefined
                                ? editForm.deliveryDate
                                : (order.deliveryDate || "")
                            }
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, deliveryDate: e.target.value }))
                            }
                            className="w-full px-2 py-1 rounded text-xs border bg-white border-gray-300"
                          />
                        </td>
                        <td className="py-2 px-3 text-center">
                          <select
                            value={editForm.status || order.status || "delivered"}
                            onChange={(e) => {
                              const val = e.target.value as OrderStatus;
                              setEditForm((prev) => ({
                                ...prev,
                                status: val,
                              }));
                            }}
                            className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-xs font-semibold"
                          >
                            {STATUS_OPTIONS.map((st) => (
                              <option key={st} value={st}>
                                {STATUS_CONFIG[st].label}
                              </option>
                            ))}
                          </select>
                        </td>
                        <td className="py-2 px-3 text-center">
                          <input
                            type="text"
                            value={editForm.notes || ""}
                            onChange={(e) =>
                              setEditForm((prev) => ({ ...prev, notes: e.target.value }))
                            }
                            placeholder="Ghi chú"
                            className="w-full px-2 py-1 bg-white border border-gray-300 rounded text-xs text-center font-bold text-[#DEAC35]"
                            style={{ color: "#DEAC35" }}
                          />
                        </td>
                        <td className="py-2 px-3 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(order.id)}
                              className="p-1 bg-emerald-600 text-white rounded hover:bg-emerald-700 cursor-pointer"
                              title="Lưu sửa đổi"
                            >
                              <Check className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={handleCancelEdit}
                              className="p-1 bg-gray-200 text-gray-700 rounded hover:bg-gray-300 cursor-pointer"
                              title="Hủy"
                            >
                              <X className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  const isTargeted =
                    targetTicketNumber !== null &&
                    targetTicketNumber !== undefined &&
                    String(order.ticketNumber).trim() === String(targetTicketNumber).trim();
                  const isEven = pageIdx % 2 === 0;

                  return (
                    <tr
                      key={order.id}
                      id={`order-row-ticket-${order.ticketNumber}`}
                      className={`transition-colors ${
                        isTargeted
                          ? "bg-amber-100/95 ring-2 ring-amber-400 ring-inset"
                          : isSelected
                          ? "bg-emerald-50/90 text-emerald-950 font-medium"
                          : isEven
                          ? "bg-white hover:bg-emerald-50/50"
                          : "bg-slate-50/60 hover:bg-emerald-50/50"
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="py-2.5 px-3 text-center">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleToggleSelect(order.id)}
                          className="rounded text-emerald-600 focus:ring-emerald-500 cursor-pointer w-4 h-4"
                        />
                      </td>

                      {/* STT */}
                      <td className="py-2.5 px-2.5 text-center text-gray-400 font-mono">
                        {itemIndex + 1}
                      </td>

                      {/* Số phiếu */}
                      <td className="py-2.5 px-3">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span
                            className={`inline-flex items-center gap-1 font-mono font-bold text-sm px-2.5 py-0.5 rounded border transition-all ${
                              isTargeted
                                ? "text-amber-950 bg-amber-200 border-amber-400 ring-1 ring-amber-500 shadow-2xs"
                                : isDuplicateTicket
                                ? "text-amber-900 bg-amber-50 border-amber-300 ring-1 ring-amber-400/50"
                                : "text-emerald-800 bg-emerald-50 border border-emerald-200/60"
                            }`}
                          >
                            <FileText className={`w-3.5 h-3.5 ${isTargeted ? "text-amber-700" : isDuplicateTicket ? "text-amber-600" : "text-emerald-600"}`} />
                            {order.ticketNumber}
                          </span>
                          {isDuplicateTicket && (
                            <span
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-bold shrink-0 shadow-2xs"
                              title="Số phiếu này xuất hiện nhiều lần trong danh sách đơn hàng"
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-amber-600" />
                              Trùng phiếu
                            </span>
                          )}
                          {isTargeted && (
                            <span className="px-1.5 py-0.5 bg-amber-600 text-white rounded text-[10px] font-extrabold uppercase animate-pulse shrink-0">
                              Đang xem
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Tháng - Thêm chức năng Chọn Tháng cho từng đơn (chỉ hiện số tháng để gọn hơn) */}
                      <td className="py-2.5 px-2 text-center">
                        <div className="relative inline-flex items-center justify-center">
                          <select
                            value={getOrderMonth(order) ?? ""}
                            onChange={(e) => {
                              const val = e.target.value ? Number(e.target.value) : undefined;
                              handleUpdateOrderMonth(order, val);
                            }}
                            className={`appearance-none pl-2.5 pr-4 py-1 text-center font-mono font-bold text-xs rounded border transition-all cursor-pointer shadow-2xs focus:outline-hidden focus:ring-2 focus:ring-indigo-400 ${
                              getOrderMonth(order)
                                ? "bg-indigo-50 text-indigo-950 border-indigo-300 hover:bg-indigo-100 hover:border-indigo-400"
                                : "bg-slate-50 text-slate-500 border-dashed border-slate-300 hover:bg-slate-100 hover:text-slate-700 italic"
                            }`}
                            title={`Chọn tháng cho đơn số phiếu #${order.ticketNumber}${getOrderMonth(order) ? ` (Tháng ${getOrderMonth(order)})` : ""}`}
                          >
                            <option value="" className="bg-white text-gray-500 font-normal">--</option>
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                              <option key={m} value={m} className="bg-white text-indigo-950 font-bold">
                                {m}
                              </option>
                            ))}
                          </select>
                          <ChevronDown className="w-2.5 h-2.5 text-indigo-700 pointer-events-none absolute right-1 opacity-70 shrink-0" />
                        </div>
                      </td>

                      {/* Số xe */}
                      <td className="py-2.5 px-3">
                        {order.vehicleNumber ? (
                          <span className="inline-flex items-center gap-1 font-mono font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                            <Truck className="w-3 h-3 text-slate-500" />
                            {order.vehicleNumber}
                          </span>
                        ) : (
                          <span className="text-gray-300 italic text-[11px]">--</span>
                        )}
                      </td>

                      {/* Người giao */}
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-gray-800 flex items-center gap-1">
                          <User className="w-3 h-3 text-slate-400 flex-shrink-0" />
                          {order.driverName || (
                            <span className="text-gray-300 italic text-[11px]">Chưa nhập</span>
                          )}
                        </span>
                      </td>

                      {/* Tên khách hàng */}
                      <td className="py-2.5 px-3">
                        {(() => {
                          const custColor = getCustomerColorByStatus(order.status);
                          return (
                            <span
                              className={`flex items-center gap-1.5 text-left font-bold ${custColor.textClass} ${custColor.cssClass}`}
                              style={{
                                color: custColor.hex,
                                fontWeight: "bold",
                              }}
                            >
                              <Building2
                                className={`w-3.5 h-3.5 flex-shrink-0 ${custColor.iconClass}`}
                              />
                              {order.customerName ? (
                                <span
                                  className={`customer-name-text font-bold text-xs ${custColor.textClass} ${custColor.cssClass}`}
                                  style={{
                                    color: custColor.hex,
                                    fontWeight: "bold",
                                  }}
                                >
                                  {order.customerName}
                                </span>
                              ) : (
                                <span className="text-gray-300 italic text-[11px] font-normal">
                                  Chưa nhập
                                </span>
                              )}
                            </span>
                          );
                        })()}
                      </td>

                      {/* Khu vực */}
                      <td className="py-2.5 px-3">
                        <span className="font-semibold text-gray-800 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-emerald-600 flex-shrink-0" />
                          {(order.area || order.deliveryLocation) ? (
                            <span>{order.area || order.deliveryLocation}</span>
                          ) : (
                            <span className="text-gray-300 italic text-[11px]">Chưa nhập</span>
                          )}
                        </span>
                      </td>

                      {/* Ngày giao - Giữ nguyên và hiển thị ngày giao đã lưu kèm thời hạn bàn giao */}
                      <td className="py-2.5 px-3 font-mono text-[11px]">
                        {(() => {
                          const isHandoverTarget = order.status === "pending" || order.status === "unsigned";
                          const handoverInfo = isHandoverTarget ? getHandoverDeadlineInfo(order.deliveryDate) : null;

                          return (
                            <div className="flex flex-col gap-1 items-start">
                              {order.deliveryDate ? (
                                <span className="flex items-center gap-1 text-gray-700 font-semibold">
                                  <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                                  {formatDateDDMMYYYY(order.deliveryDate) || order.deliveryDate}
                                </span>
                              ) : isHandoverTarget ? (
                                <span className="text-gray-400 italic text-[10.5px]">Chưa nhập ngày</span>
                              ) : null}

                              {/* Dưới Ngày giao hàng hiện nội dung thời hạn cho trạng thái: "Chưa Nhận Đơn", "Không Ký Đơn / không ký phiếu" */}
                              {isHandoverTarget && handoverInfo && (
                                handoverInfo.isOverdue ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-black bg-rose-100 text-rose-700 border border-rose-300 shadow-2xs whitespace-nowrap animate-pulse"
                                    title={`Đơn hàng đã quá hạn bàn giao 7 ngày kể từ ngày giao ${formatDateDDMMYYYY(order.deliveryDate)} (quá hạn ${handoverInfo.overdueDays} ngày)`}
                                  >
                                    <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                    <span>Quá hạn bàn giao ({handoverInfo.overdueDays} ngày)</span>
                                  </span>
                                ) : handoverInfo.daysLeft === 0 ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs whitespace-nowrap"
                                    title={`Hôm nay là hạn chót 7 ngày bàn giao kể từ ngày giao ${formatDateDDMMYYYY(order.deliveryDate)}`}
                                  >
                                    <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                    <span>Thời hạn còn: Hôm nay (hạn chót)</span>
                                  </span>
                                ) : handoverInfo.daysLeft <= 3 ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs whitespace-nowrap"
                                    title={`Thời hạn bàn giao 7 ngày kể từ ngày giao: còn ${handoverInfo.daysLeft} ngày (bắt đầu từ ngày giao trừ dần)`}
                                  >
                                    <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                    <span>Thời hạn còn: {handoverInfo.daysLeft} ngày</span>
                                  </span>
                                ) : (
                                  <span
                                    className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs whitespace-nowrap"
                                    title={`Thời hạn bàn giao 7 ngày kể từ ngày giao: còn ${handoverInfo.daysLeft} ngày (bắt đầu từ ngày giao trừ dần)`}
                                  >
                                    <Clock className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                    <span>Thời hạn còn: {handoverInfo.daysLeft} ngày</span>
                                  </span>
                                )
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Trạng thái đơn - Cập nhật trạng thái theo từng đơn hàng */}
                      <td className="py-2.5 px-3 text-center">
                        <div className="inline-flex items-center justify-center gap-1.5 flex-wrap">
                          <div className="relative inline-flex items-center">
                            <select
                              value={order.status}
                              onChange={(e) => handleUpdateOrderStatus(order, e.target.value as OrderStatus)}
                              className={`inline-flex items-center gap-1.5 pl-7 pr-6 py-1 rounded-full text-xs font-bold border transition-all cursor-pointer shadow-2xs hover:shadow-xs appearance-none focus:outline-hidden focus:ring-2 focus:ring-emerald-500 ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}
                              title={`Nhấn để cập nhật trạng thái cho đơn số phiếu #${order.ticketNumber}`}
                            >
                              {STATUS_OPTIONS.map((st) => (
                                <option key={st} value={st} className="bg-white text-gray-900 font-semibold py-1">
                                  {STATUS_CONFIG[st].label}
                                </option>
                              ))}
                            </select>
                            <div className="absolute left-2.5 pointer-events-none text-current flex items-center">
                              <StatusIcon className="w-3.5 h-3.5 shrink-0" />
                            </div>
                            <div className="absolute right-2 pointer-events-none opacity-60 flex items-center">
                              <ChevronDown className="w-3 h-3 shrink-0" />
                            </div>
                          </div>

                          {/* Hiện kế bên trạng thái đã giao trạng thái trùng mã nếu có số phiếu trùng nhau */}
                          {isDuplicateTicket && (
                            <span
                              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-white shadow-2xs animate-pulse"
                              title={`Số phiếu #${order.ticketNumber} bị trùng nhau (trùng mã trong danh sách đơn hàng)`}
                            >
                              <AlertTriangle className="w-3 h-3 text-white shrink-0" />
                              Trùng mã
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Ghi chú */}
                      <td className="py-2.5 px-3 text-center text-[#DEAC35] font-bold text-xs max-w-xs truncate" style={{ color: "#DEAC35" }}>
                        {order.notes || <span className="text-gray-300 italic font-normal">--</span>}
                      </td>

                      {/* Thao tác */}
                      <td className="py-2.5 px-3 text-right">
                        <div className="flex items-center justify-end gap-1">
                          {onAddReminderForOrder && (
                            <button
                              type="button"
                              onClick={() => onAddReminderForOrder(order)}
                              className="p-1 text-gray-400 hover:text-amber-600 hover:bg-amber-50 rounded transition-colors cursor-pointer"
                              title={`Tạo ghi chú nhắc hẹn cho số phiếu #${order.ticketNumber}`}
                            >
                              <BellPlus className="w-3.5 h-3.5" />
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={() => handleDuplicateOrder(order)}
                            className="p-1 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors cursor-pointer"
                            title={`Nhân bản đơn hàng số phiếu #${order.ticketNumber}`}
                          >
                            <Copy className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleStartEdit(order)}
                            className="p-1 text-gray-400 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors cursor-pointer"
                            title="Chỉnh sửa đơn hàng"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => setOrderToDelete(order)}
                            className="p-1 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer"
                            title="Xóa đơn hàng này"
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

        {/* Table Footer Summary & Pagination */}
        <div className="bg-slate-50 px-4 py-3 border-t border-gray-200 flex flex-col lg:flex-row items-center justify-between text-xs text-gray-700 gap-3">
          {/* Trái: Thống kê số lượng, phạm vi hiển thị và bộ chọn 20, 50, 100 số phiếu/trang */}
          <div className="flex flex-wrap items-center gap-2.5 w-full lg:w-auto justify-between lg:justify-start">
            <div className="flex flex-wrap items-center gap-2">
              {hasActiveFilters ? (
                <span>
                  Tổng số phiếu: <strong className="text-gray-900">{filteredTicketsCount}</strong>{" "}
                  <span className="text-gray-500 font-normal">/ {totalTicketsCount}</span> phiếu
                </span>
              ) : (
                <span>
                  Tổng số phiếu: <strong className="text-gray-900">{totalTicketsCount}</strong> phiếu
                </span>
              )}

              {filteredOrders.length > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-slate-600">
                    Hiển thị: <strong className="text-emerald-800 font-bold">{startIndex + 1} - {endIndex}</strong>
                  </span>
                </>
              )}

              {selectedIds.length > 0 && (
                <>
                  <span className="text-gray-300">•</span>
                  <span className="text-emerald-700 font-bold bg-emerald-100/90 px-2 py-0.5 rounded-full text-[11px]">
                    Đã chọn: {selectedIds.length}
                  </span>
                </>
              )}
            </div>

            {/* Bộ chọn hiển thị 20, 50 hoặc 100 số phiếu mỗi trang */}
            <div className="flex items-center gap-1.5 bg-white px-2.5 py-1 rounded-xl border border-gray-200 shadow-2xs">
              <span className="text-gray-500 text-[11px] font-medium whitespace-nowrap">Hiển thị:</span>
              <div className="inline-flex rounded-lg border border-gray-200 p-0.5 bg-slate-100">
                {[20, 50, 100].map((size) => (
                  <button
                    key={size}
                    type="button"
                    onClick={() => {
                      setPageSize(size);
                      setCurrentPage(1);
                    }}
                    className={`px-2 py-0.5 text-xs font-bold rounded-md transition-all cursor-pointer ${
                      pageSize === size
                        ? "bg-emerald-600 text-white shadow-2xs font-extrabold"
                        : "text-gray-600 hover:text-gray-900 hover:bg-white"
                    }`}
                    title={`Hiển thị ${size} số phiếu mỗi trang`}
                  >
                    {size}
                  </button>
                ))}
              </div>
              <span className="text-gray-500 text-[11px] whitespace-nowrap">phiếu/trang</span>
            </div>
          </div>

          {/* Phải: Phân trang - Nút chuyển trang trước, trang sau, chọn số trang, danh sách số trang */}
          {totalPages > 1 && (
            <div className="flex flex-wrap items-center gap-1.5 w-full lg:w-auto justify-center lg:justify-end">
              {/* Nút Về Trang Đầu */}
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage(1)}
                className="p-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                title="Về trang đầu tiên (Trang 1)"
              >
                <ChevronsLeft className="w-3.5 h-3.5" />
              </button>

              {/* Nút Trang Trước */}
              <button
                type="button"
                disabled={safeCurrentPage <= 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs active:scale-95"
                title="Chuyển sang trang trước"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Trước</span>
              </button>

              {/* Danh sách các số trang */}
              <div className="flex items-center gap-1">
                {paginationRange.map((pageItem, idx) => {
                  if (pageItem === "...") {
                    return (
                      <span key={`dots-${idx}`} className="px-1 text-gray-400 text-xs font-bold select-none">
                        ...
                      </span>
                    );
                  }
                  const pNum = Number(pageItem);
                  const isActive = pNum === safeCurrentPage;
                  return (
                    <button
                      key={pNum}
                      type="button"
                      onClick={() => setCurrentPage(pNum)}
                      className={`min-w-[28px] h-7 px-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center ${
                        isActive
                          ? "bg-emerald-600 text-white shadow-xs font-extrabold ring-2 ring-emerald-600/30"
                          : "bg-white border border-gray-200 text-gray-700 hover:bg-slate-100 hover:border-gray-300"
                      }`}
                      title={`Đến trang ${pNum}`}
                    >
                      {pNum}
                    </button>
                  );
                })}
              </div>

              {/* Chọn số trang nhanh bằng Dropdown */}
              <div className="flex items-center gap-1 ml-0.5">
                <span className="text-gray-500 text-[11px] hidden sm:inline">Trang:</span>
                <select
                  value={safeCurrentPage}
                  onChange={(e) => setCurrentPage(Number(e.target.value))}
                  className="text-xs font-bold py-1 px-2 border border-gray-300 rounded-lg bg-white text-gray-800 focus:outline-hidden focus:ring-2 focus:ring-emerald-500 cursor-pointer shadow-2xs"
                  title="Chọn số trang để chuyển trực tiếp đến"
                >
                  {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                    <option key={p} value={p}>
                      Trang {p} / {totalPages}
                    </option>
                  ))}
                </select>
              </div>

              {/* Nút Trang Sau */}
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold rounded-lg border border-gray-300 bg-white text-gray-700 hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs active:scale-95"
                title="Chuyển sang trang sau"
              >
                <span className="hidden sm:inline">Sau</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>

              {/* Nút Đến Trang Cuối */}
              <button
                type="button"
                disabled={safeCurrentPage >= totalPages}
                onClick={() => setCurrentPage(totalPages)}
                className="p-1.5 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-100 disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer transition-colors shadow-2xs"
                title={`Đến trang cuối cùng (Trang ${totalPages})`}
              >
                <ChevronsRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: SỬA NGƯỜI GIAO HÀNG LOẠT */}
      {isBatchDriverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-blue-100 text-blue-700 rounded-xl">
                  <Users className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Sửa Người Giao Hàng Loạt
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Áp dụng cho <strong>{selectedIds.length}</strong> đơn hàng đã chọn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchDriverModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    Nhập tên người giao mới:
                  </label>
                  {batchDriverInput && (
                    <button
                      type="button"
                      onClick={() => setBatchDriverInput("")}
                      className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline cursor-pointer font-medium"
                    >
                      Xóa trắng (để trống)
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={batchDriverInput}
                  onChange={(e) => setBatchDriverInput(e.target.value)}
                  placeholder="VD: Nguyễn Văn A... (hoặc để trống để xóa)"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-blue-500"
                  autoFocus
                />
                <p className="text-[11px] mt-1">
                  {batchDriverInput.trim() ? (
                    <span className="text-gray-500">
                      Sẽ cập nhật người giao thành: <strong className="text-blue-700 font-semibold">{batchDriverInput.trim()}</strong>
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">
                      Để trống: sẽ xóa người giao (không có người giao) cho {selectedIds.length} đơn hàng đã chọn.
                    </span>
                  )}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-gray-500">
                    Chọn nhanh hoặc xóa trống:
                  </label>
                  <button
                    type="button"
                    onClick={() => setBatchDriverInput("")}
                    className="text-[11px] px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded border border-rose-200 cursor-pointer"
                  >
                    Để trống người giao
                  </button>
                </div>
                {uniqueDrivers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200/70">
                    {uniqueDrivers.map((drv) => (
                      <button
                        key={drv}
                        type="button"
                        onClick={() => setBatchDriverInput(drv)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                          batchDriverInput.trim().toLowerCase() === drv.trim().toLowerCase()
                            ? "bg-blue-600 text-white border-blue-600 font-bold shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {drv}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsBatchDriverModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApplyBatchDriver}
                className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {batchDriverInput.trim()
                  ? `Cập nhật ${selectedIds.length} đơn`
                  : `Xóa người giao (${selectedIds.length} đơn)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: SỬA SỐ XE HÀNG LOẠT */}
      {isBatchVehicleModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-emerald-100 text-emerald-700 rounded-xl">
                  <Truck className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Sửa Số Xe Hàng Loạt
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Áp dụng cho <strong>{selectedIds.length}</strong> đơn hàng đã chọn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchVehicleModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    Nhập số xe (biển số xe) mới:
                  </label>
                  {batchVehicleInput && (
                    <button
                      type="button"
                      onClick={() => setBatchVehicleInput("")}
                      className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline cursor-pointer font-medium"
                    >
                      Xóa trắng (để trống)
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={batchVehicleInput}
                  onChange={(e) => setBatchVehicleInput(e.target.value)}
                  placeholder="VD: 51C-123.45... (hoặc để trống để xóa)"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500 font-mono"
                  autoFocus
                />
                <p className="text-[11px] mt-1">
                  {batchVehicleInput.trim() ? (
                    <span className="text-gray-500">
                      Sẽ cập nhật số xe thành: <strong className="text-emerald-700 font-semibold font-mono">{batchVehicleInput.trim()}</strong>
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">
                      Để trống: sẽ xóa số xe (không có số xe) cho {selectedIds.length} đơn hàng đã chọn.
                    </span>
                  )}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-gray-500">
                    Chọn nhanh hoặc xóa trống:
                  </label>
                  <button
                    type="button"
                    onClick={() => setBatchVehicleInput("")}
                    className="text-[11px] px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded border border-rose-200 cursor-pointer"
                  >
                    Để trống số xe
                  </button>
                </div>
                {uniqueVehicles.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200/70 font-mono">
                    {uniqueVehicles.map((veh) => (
                      <button
                        key={veh}
                        type="button"
                        onClick={() => setBatchVehicleInput(veh)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                          batchVehicleInput.trim().toLowerCase() === veh.trim().toLowerCase()
                            ? "bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {veh}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsBatchVehicleModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApplyBatchVehicle}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {batchVehicleInput.trim()
                  ? `Cập nhật ${selectedIds.length} đơn`
                  : `Xóa số xe (${selectedIds.length} đơn)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: SỬA KHÁCH HÀNG HÀNG LOẠT */}
      {isBatchCustomerModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Building2 className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Sửa Khách Hàng Hàng Loạt
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Áp dụng cho <strong>{selectedIds.length}</strong> đơn hàng đã chọn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchCustomerModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    Nhập tên khách hàng mới:
                  </label>
                  {batchCustomerInput && (
                    <button
                      type="button"
                      onClick={() => setBatchCustomerInput("")}
                      className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline cursor-pointer font-medium"
                    >
                      Xóa trắng (để trống)
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={batchCustomerInput}
                  onChange={(e) => setBatchCustomerInput(e.target.value)}
                  placeholder="VD: Cửa hàng ABC, Đại lý XYZ... (hoặc để trống để xóa)"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                  autoFocus
                />
                <p className="text-[11px] mt-1">
                  {batchCustomerInput.trim() ? (
                    <span className="text-gray-500">
                      Sẽ cập nhật khách hàng thành: <strong className="text-indigo-700 font-semibold">{batchCustomerInput.trim()}</strong>
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">
                      Để trống: sẽ xóa khách hàng (không có khách hàng) cho {selectedIds.length} đơn hàng đã chọn.
                    </span>
                  )}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-gray-500">
                    Chọn nhanh hoặc xóa trống:
                  </label>
                  <button
                    type="button"
                    onClick={() => setBatchCustomerInput("")}
                    className="text-[11px] px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded border border-rose-200 cursor-pointer"
                  >
                    Để trống khách hàng
                  </button>
                </div>
                {uniqueCustomers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200/70">
                    {uniqueCustomers.map((cust) => (
                      <button
                        key={cust}
                        type="button"
                        onClick={() => setBatchCustomerInput(cust)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                          batchCustomerInput.trim().toLowerCase() === cust.trim().toLowerCase()
                            ? "bg-indigo-600 text-white border-indigo-600 font-bold shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {cust}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsBatchCustomerModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApplyBatchCustomer}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {batchCustomerInput.trim()
                  ? `Cập nhật ${selectedIds.length} đơn`
                  : `Xóa khách hàng (${selectedIds.length} đơn)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: SỬA KHU VỰC HÀNG LOẠT */}
      {isBatchAreaModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-amber-100 text-amber-700 rounded-xl">
                  <MapPin className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Sửa Khu Vực Hàng Loạt
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Áp dụng cho <strong>{selectedIds.length}</strong> đơn hàng đã chọn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchAreaModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-xs font-bold text-gray-700">
                    Nhập khu vực mới:
                  </label>
                  {batchAreaInput && (
                    <button
                      type="button"
                      onClick={() => setBatchAreaInput("")}
                      className="text-[11px] text-rose-600 hover:text-rose-700 hover:underline cursor-pointer font-medium"
                    >
                      Xóa trắng (để trống)
                    </button>
                  )}
                </div>
                <input
                  type="text"
                  value={batchAreaInput}
                  onChange={(e) => setBatchAreaInput(e.target.value)}
                  placeholder="VD: Miền Đông, Miền Tây... (hoặc để trống để xóa)"
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-500"
                  autoFocus
                />
                <p className="text-[11px] mt-1">
                  {batchAreaInput.trim() ? (
                    <span className="text-gray-500">
                      Sẽ cập nhật khu vực thành: <strong className="text-amber-700 font-semibold">{batchAreaInput.trim()}</strong>
                    </span>
                  ) : (
                    <span className="text-amber-700 font-medium">
                      Để trống: sẽ xóa khu vực (không có khu vực) cho {selectedIds.length} đơn hàng đã chọn.
                    </span>
                  )}
                </p>
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block text-[11px] font-semibold text-gray-500">
                    Chọn nhanh hoặc xóa trống:
                  </label>
                  <button
                    type="button"
                    onClick={() => setBatchAreaInput("")}
                    className="text-[11px] px-2 py-0.5 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded border border-rose-200 cursor-pointer"
                  >
                    Để trống khu vực
                  </button>
                </div>
                {uniqueAreas.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200/70">
                    {uniqueAreas.map((ar) => (
                      <button
                        key={ar}
                        type="button"
                        onClick={() => setBatchAreaInput(ar)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                          batchAreaInput.trim().toLowerCase() === ar.trim().toLowerCase()
                            ? "bg-amber-600 text-white border-amber-600 font-bold shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {ar}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsBatchAreaModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApplyBatchArea}
                className="px-4 py-2 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                {batchAreaInput.trim()
                  ? `Cập nhật ${selectedIds.length} đơn`
                  : `Xóa khu vực (${selectedIds.length} đơn)`}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: SỬA NGÀY GIAO HÀNG LOẠT */}
      {isBatchDateModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-purple-100 text-purple-700 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Sửa Ngày Giao Hàng Loạt
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Áp dụng cho <strong>{selectedIds.length}</strong> đơn hàng đã chọn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchDateModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Chọn ngày giao mới:
                </label>
                <input
                  type="date"
                  value={batchDateInput}
                  onChange={(e) => setBatchDateInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-gray-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-purple-500 font-medium"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  Chọn nhanh ngày:
                </label>
                <div className="flex flex-wrap gap-1.5">
                  <button
                    type="button"
                    onClick={() => setBatchDateInput(getLocalTodayISO())}
                    className="text-[11px] px-2.5 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 font-semibold rounded-md border border-purple-200 cursor-pointer"
                  >
                    Hôm nay
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() - 1);
                      setBatchDateInput(d.toISOString().slice(0, 10));
                    }}
                    className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md border border-slate-300 cursor-pointer"
                  >
                    Hôm qua
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const d = new Date();
                      d.setDate(d.getDate() + 1);
                      setBatchDateInput(d.toISOString().slice(0, 10));
                    }}
                    className="text-[11px] px-2.5 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-md border border-slate-300 cursor-pointer"
                  >
                    Ngày mai
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchDateInput("")}
                    className="text-[11px] px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-medium rounded-md border border-rose-200 cursor-pointer"
                    title="Để trống ngày giao (dành cho đơn chưa giao)"
                  >
                    Để trống ngày giao
                  </button>
                </div>
              </div>

              {uniqueDates.length > 0 && (
                <div>
                  <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                    Hoặc chọn từ danh sách ngày đã có:
                  </label>
                  <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto p-1 bg-slate-50 rounded-lg border border-slate-200/70">
                    {uniqueDates.map((dt) => (
                      <button
                        key={dt}
                        type="button"
                        onClick={() => setBatchDateInput(dt)}
                        className={`text-[11px] px-2.5 py-1 rounded-md border transition-all cursor-pointer ${
                          batchDateInput === dt
                            ? "bg-purple-600 text-white border-purple-600 font-bold shadow-2xs"
                            : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {formatDateDDMMYYYY(dt)}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsBatchDateModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleApplyBatchDeliveryDate}
                className="px-4 py-2 text-xs font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Cập nhật {selectedIds.length} đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: SỬA THÁNG GIAO HÀNG LOẠT */}
      {isBatchMonthModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs animate-fade-in">
          <div className="bg-white rounded-2xl max-w-md w-full p-5 shadow-xl border border-gray-200 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                  <Calendar className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-sm font-bold text-gray-900">
                    Sửa Tháng Giao Hàng Loạt
                  </h3>
                  <p className="text-[11px] text-gray-500">
                    Áp dụng cho <strong>{selectedIds.length}</strong> đơn hàng đã chọn
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsBatchMonthModalOpen(false)}
                className="text-gray-400 hover:text-gray-600 p-1 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  Chọn tháng mới (Tháng 1 đến Tháng 12):
                </label>
                <select
                  value={batchMonthInput}
                  onChange={(e) => setBatchMonthInput(e.target.value)}
                  className="w-full text-xs px-3 py-2 bg-white border border-indigo-300 font-bold text-indigo-900 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-indigo-500 cursor-pointer"
                  autoFocus
                >
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <option key={m} value={String(m)}>
                      Tháng {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-gray-500 mb-1">
                  Chọn nhanh tháng (1, 2, ..., 12):
                </label>
                <div className="grid grid-cols-6 gap-1.5">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => {
                        setBatchMonthInput(String(m));
                        handleApplyBatchMonth(m);
                      }}
                      className={`text-xs font-mono font-bold py-2 rounded-lg border transition-all cursor-pointer text-center ${
                        batchMonthInput === String(m)
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs scale-105"
                          : "bg-indigo-50 hover:bg-indigo-100 text-indigo-950 border-indigo-200"
                      }`}
                      title={`Áp dụng ngay Tháng ${m}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
              <button
                type="button"
                onClick={() => setIsBatchMonthModalOpen(false)}
                className="px-3.5 py-2 text-xs font-semibold text-gray-600 hover:bg-gray-100 rounded-lg cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleApplyBatchMonth()}
                className="px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-xs cursor-pointer flex items-center gap-1.5"
              >
                <Check className="w-3.5 h-3.5" />
                Cập nhật {selectedIds.length} đơn
              </button>
            </div>
          </div>
        </div>
      )}

      {/* In-app Single Order Delete Confirmation Modal */}
      {orderToDelete && (
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
                    Xác nhận xóa đơn hàng?
                  </h3>
                  <p className="text-xs text-gray-500">
                    Đơn hàng sẽ được xóa khỏi danh sách và dữ liệu giao nhận.
                  </p>
                </div>
              </div>

              <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 my-4 text-xs space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-gray-500 font-medium">Số phiếu:</span>
                  <strong className="text-emerald-800 font-mono text-sm">#{orderToDelete.ticketNumber}</strong>
                </div>
                {orderToDelete.customerName && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Khách hàng:</span>
                    <strong className="text-gray-800">{orderToDelete.customerName}</strong>
                  </div>
                )}
                {(orderToDelete.area || orderToDelete.deliveryLocation) && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Khu vực:</span>
                    <strong className="text-gray-800">{orderToDelete.area || orderToDelete.deliveryLocation}</strong>
                  </div>
                )}
                {orderToDelete.vehicleNumber && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Số xe:</span>
                    <strong className="text-slate-800 font-mono">{orderToDelete.vehicleNumber}</strong>
                  </div>
                )}
                {orderToDelete.driverName && (
                  <div className="flex items-center justify-between">
                    <span className="text-gray-500 font-medium">Người giao:</span>
                    <strong className="text-gray-800">{orderToDelete.driverName}</strong>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setOrderToDelete(null)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleExecuteSingleDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xóa đơn hàng
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* In-app Batch Delete Confirmation Modal */}
      {isBatchDeleteConfirmOpen && (
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
                    Xóa hàng loạt {selectedIds.length} đơn hàng?
                  </h3>
                  <p className="text-xs text-gray-500">
                    Thao tác này sẽ xóa vĩnh viễn {selectedIds.length} đơn hàng đã chọn khỏi danh sách.
                  </p>
                </div>
              </div>

              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-800 my-4">
                Bạn đang chọn xóa <strong>{selectedIds.length} đơn hàng</strong> cùng lúc. Sau khi xóa, bạn có thể khôi phục lại nếu có bản sao lưu trước đó.
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={() => setIsBatchDeleteConfirmOpen(false)}
                  className="px-4 py-2 border border-gray-200 text-gray-700 hover:bg-gray-50 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  Hủy bỏ
                </button>
                <button
                  type="button"
                  onClick={handleExecuteBatchDelete}
                  className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold transition-all shadow-xs flex items-center gap-1.5 cursor-pointer active:scale-98"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Xác nhận xóa {selectedIds.length} đơn
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Thông Báo / Xác Nhận Trước Khi Cập Nhật Hoặc Thêm Trùng Số Phiếu */}
      {duplicateConfirmData && (
        <div
          id="duplicate-ticket-notification-modal"
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs font-sans"
          role="dialog"
          aria-modal="true"
        >
          <div className="bg-white rounded-2xl max-w-lg w-full max-h-[90vh] flex flex-col shadow-2xl border border-amber-300 overflow-hidden animate-in zoom-in-95">
            {/* Header */}
            <div className="px-5 py-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-50 border-b border-amber-200/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
                  <AlertTriangle className="w-5 h-5 text-white" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Thông Báo Trùng Số Phiếu
                  </h3>
                  <p className="text-xs text-amber-900 font-medium">
                    {duplicateConfirmData.type === "edit"
                      ? "Xác nhận cập nhật đơn hàng với số phiếu đã có trong danh sách"
                      : "Xác nhận thêm mới đơn hàng với số phiếu đã có trong danh sách"}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleCancelDuplicateAction}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                title="Hủy bỏ"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-5 overflow-y-auto space-y-4 max-h-[calc(90vh-140px)]">
              <div className="p-3.5 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1.5">
                <p className="font-bold text-amber-900 text-sm flex items-center gap-1.5">
                  <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                  Số phiếu <span className="font-mono underline font-extrabold text-amber-950">#{duplicateConfirmData.ticketNumber}</span> đã có trong danh sách đơn hàng {duplicateConfirmData.month ? `Tháng ${duplicateConfirmData.month}` : ""}!
                </p>
                <p className="text-amber-800 leading-relaxed">
                  Bạn đang thao tác {duplicateConfirmData.type === "edit" ? "cập nhật" : "thêm mới"} đơn hàng trùng số phiếu với{" "}
                  <strong>{duplicateConfirmData.duplicateOrders.length} đơn hàng</strong> đang có trong cùng {duplicateConfirmData.month ? `Tháng ${duplicateConfirmData.month}` : "danh sách"}.
                </p>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-800 mb-2">
                  Chi tiết đơn hàng đang có cùng số phiếu #{duplicateConfirmData.ticketNumber}:
                </label>
                <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                  {duplicateConfirmData.duplicateOrders.map((dupOrd, idx) => (
                    <div
                      key={dupOrd.id || idx}
                      className="p-3 rounded-xl border border-slate-200 bg-slate-50/80 text-xs space-y-1 shadow-2xs"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900 font-mono">
                          Đơn #{idx + 1} • Phiếu #{dupOrd.ticketNumber}
                        </span>
                        <span className={`px-2 py-0.5 rounded text-[10.5px] font-semibold border ${
                          dupOrd.status === "delivering"
                            ? "bg-red-50 border-red-200 text-red-600 font-bold"
                            : dupOrd.status === "returned"
                            ? "bg-orange-50 border-orange-200 text-orange-700 font-bold"
                            : dupOrd.status === "delivered"
                            ? "bg-emerald-50 border-emerald-200 text-emerald-800 font-bold"
                            : "bg-white border-slate-200 text-slate-700"
                        }`}>
                          {STATUS_CONFIG[dupOrd.status]?.label || dupOrd.status}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 gap-2 text-[11.5px] text-slate-600 pt-1">
                        <div>
                          <span className="text-slate-400">Khách:</span>{" "}
                          {(() => {
                            const custColor = getCustomerColorByStatus(dupOrd.status);
                            return (
                              <strong
                                style={{ color: custColor.hex, fontWeight: "bold" }}
                                className={`${custColor.textClass} ${custColor.cssClass} font-bold`}
                              >
                                {dupOrd.customerName || "Chưa nhập"}
                              </strong>
                            );
                          })()}
                        </div>
                        <div>
                          <span className="text-slate-400">Khu vực:</span>{" "}
                          <strong className="text-slate-800">{dupOrd.area || dupOrd.deliveryLocation || "Chưa nhập"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Xe:</span>{" "}
                          <strong className="text-slate-800 font-mono">{dupOrd.vehicleNumber || "Chưa nhập"}</strong>
                        </div>
                        <div>
                          <span className="text-slate-400">Người giao:</span>{" "}
                          <strong className="text-slate-800">{dupOrd.driverName || "Chưa nhập"}</strong>
                        </div>
                        <div className="col-span-2">
                          <span className="text-slate-400">Ngày:</span>{" "}
                          <strong className="text-slate-800">{formatDateDDMMYYYY(dupOrd.deliveryDate)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="p-3 bg-emerald-50 rounded-xl border border-emerald-200 text-[11.5px] text-emerald-900 space-y-1">
                <p className="font-semibold text-emerald-950 flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                  Bạn có muốn tiếp tục cập nhật trùng số phiếu không?
                </p>
                <p className="text-emerald-800">
                  Hệ thống cho phép lưu trùng số phiếu theo nhu cầu quản lý. Cả hai đơn hàng sẽ được lưu độc lập và đánh dấu nhãn <b>"Trùng phiếu"</b> trong danh sách để dễ nhận biết.
                </p>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={handleCancelDuplicateAction}
                className="px-4 py-2 border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDuplicateAction}
                className="px-5 py-2 bg-amber-600 hover:bg-amber-700 active:scale-98 text-white font-bold text-xs rounded-xl transition-all shadow-md flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-4 h-4" />
                {duplicateConfirmData.type === "edit"
                  ? "Đồng ý cập nhật trùng số phiếu"
                  : "Đồng ý thêm trùng số phiếu"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL XEM TRƯỚC BẢN IN & IN DANH SÁCH (PRINT PREVIEW & PRINT) */}
      {isPrintModalOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center p-2 sm:p-4 bg-black/60 backdrop-blur-xs overflow-y-auto animate-fade-in no-scrollbar">
          <div className="bg-white rounded-2xl w-full max-w-[98vw] 2xl:max-w-[1680px] shadow-2xl border border-gray-300 flex flex-col my-4 sm:my-6 transition-all overflow-visible">
            {/* Modal Header & Options Toolbar (Ẩn khi in) */}
            <div className="sticky top-0 z-30 p-4 bg-white border-b border-gray-200 flex flex-col gap-3 shrink-0 shadow-xs rounded-t-2xl no-print">
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <span className="p-2 bg-indigo-100 text-indigo-700 rounded-xl">
                    <Printer className="w-5 h-5" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-gray-900 flex items-center gap-2">
                      Xem Trước Bản In &amp; In Danh Sách
                      <span className="text-xs font-semibold px-2 py-0.5 bg-indigo-100 text-indigo-800 rounded-full font-mono">
                        {ordersToPrint.length} đơn ({printTicketsCount} phiếu)
                      </span>
                    </h3>
                    <p className="text-xs text-gray-500">
                      Khổ giấy chuẩn A4 (Ngang) • Dễ dàng in trực tiếp ra máy in hoặc Lưu dưới dạng file PDF • Có thể tùy chỉnh &amp; lưu mẫu
                    </p>
                  </div>
                </div>

                {/* Main Action Buttons */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Nút Chia sẻ hình ảnh & Lời nhắn tự tạo */}
                  <button
                    type="button"
                    onClick={() => setIsPrintShareOpen(true)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-linear-to-r from-blue-600 via-sky-600 to-blue-700 hover:from-blue-700 hover:to-sky-700 active:scale-98 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer ring-2 ring-blue-400/30"
                    title="Xuất file ảnh bảng kê độ nét cao & Chia sẻ kèm lời nhắn nhanh tự tạo"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Chia sẻ (Ảnh &amp; Lời nhắn)</span>
                  </button>

                  {/* Nút bật/tắt ngăn Tùy chỉnh mẫu in */}
                  <button
                    type="button"
                    onClick={() => setIsCustomizingPrint(!isCustomizingPrint)}
                    className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all cursor-pointer shadow-2xs ${
                      isCustomizingPrint
                        ? "bg-amber-100 border-amber-300 text-amber-900 ring-2 ring-amber-400/40"
                        : "bg-amber-50 hover:bg-amber-100 border-amber-200 text-amber-900"
                    }`}
                    title="Tùy chỉnh tiêu đề công ty, cột hiển thị, chữ ký và lưu mẫu in"
                  >
                    <Sliders className="w-3.5 h-3.5 text-amber-700" />
                    <span>{isCustomizingPrint ? "Đóng tùy chỉnh" : "Tùy chỉnh mẫu in"}</span>
                  </button>

                  {/* Nút Lưu mẫu cho lần sau */}
                  <button
                    type="button"
                    onClick={handleSavePrintTemplate}
                    className="inline-flex items-center gap-1.5 px-3 py-2 bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                    title="Lưu mẫu thiết kế này vào bộ nhớ để lần sau tự động áp dụng"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu mẫu này</span>
                  </button>

                  {/* Nút Đóng */}
                  <button
                    type="button"
                    onClick={() => setIsPrintModalOpen(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-colors cursor-pointer"
                    title="Đóng cửa sổ xem trước (ESC)"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Sub-toolbar: Quick scopes & Print quick settings */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-gray-100 text-xs">
                {/* Chọn phạm vi in */}
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider">Phạm vi:</span>
                  <div className="inline-flex rounded-lg border border-gray-200 bg-gray-50 p-0.5 text-xs font-semibold">
                    <button
                      type="button"
                      onClick={() => setPrintScope("filtered")}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        printScope === "filtered"
                          ? "bg-white text-indigo-700 font-bold shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Đang lọc ({filteredOrders.length})
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintScope("all")}
                      className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                        printScope === "all"
                          ? "bg-white text-indigo-700 font-bold shadow-xs"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Tất cả ({orders.length})
                    </button>
                    {selectedIds.length > 0 && (
                      <button
                        type="button"
                        onClick={() => setPrintScope("selected")}
                        className={`px-2.5 py-1 rounded-md transition-all cursor-pointer ${
                          printScope === "selected"
                            ? "bg-white text-indigo-700 font-bold shadow-xs"
                            : "text-gray-600 hover:text-gray-900"
                        }`}
                      >
                        Đã chọn ({selectedIds.length})
                      </button>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  {/* Cỡ chữ in */}
                  <div className="flex items-center gap-1 bg-gray-50 border border-gray-200 px-2 py-1 rounded-lg">
                    <Type className="w-3.5 h-3.5 text-gray-500" />
                    <span className="text-[11px] text-gray-500 font-medium">Cỡ chữ:</span>
                    <button
                      type="button"
                      onClick={() => setPrintConfig((prev) => ({ ...prev, fontSize: "compact" }))}
                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-semibold transition-colors cursor-pointer ${
                        printConfig.fontSize === "compact"
                          ? "bg-indigo-600 text-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Nhỏ
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintConfig((prev) => ({ ...prev, fontSize: "standard" }))}
                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-semibold transition-colors cursor-pointer ${
                        printConfig.fontSize === "standard"
                          ? "bg-indigo-600 text-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Vừa
                    </button>
                    <button
                      type="button"
                      onClick={() => setPrintConfig((prev) => ({ ...prev, fontSize: "large" }))}
                      className={`px-1.5 py-0.5 rounded text-[10.5px] font-semibold transition-colors cursor-pointer ${
                        printConfig.fontSize === "large"
                          ? "bg-indigo-600 text-white"
                          : "text-gray-600 hover:text-gray-900"
                      }`}
                    >
                      Lớn
                    </button>
                  </div>

                  {/* Checkbox hiện chữ ký */}
                  <label className="flex items-center gap-1.5 text-xs text-gray-700 bg-white px-2.5 py-1.5 rounded-lg border border-gray-200 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={printConfig.showSignatures}
                      onChange={(e) =>
                        setPrintConfig((prev) => ({ ...prev, showSignatures: e.target.checked }))
                      }
                      className="rounded text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5 cursor-pointer"
                    />
                    <span>Hiện chữ ký</span>
                  </label>

                  {/* Đặt lại mẫu gốc */}
                  <button
                    type="button"
                    onClick={handleResetPrintTemplate}
                    className="inline-flex items-center gap-1 text-[11px] text-gray-500 hover:text-gray-700 bg-gray-50 hover:bg-gray-100 border border-gray-200 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors"
                    title="Khôi phục lại toàn bộ mẫu in về mặc định ban đầu"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Mẫu gốc</span>
                  </button>
                </div>
              </div>



              {/* Toast thông báo lưu mẫu */}
              {printSavedFeedback && (
                <div className="bg-emerald-50 border border-emerald-300 text-emerald-900 text-xs px-3 py-1.5 rounded-xl font-bold flex items-center justify-between animate-fade-in">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>{printSavedFeedback}</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setPrintSavedFeedback(null)}
                    className="text-emerald-700 hover:text-emerald-900 text-xs cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {/* Customization Drawer / Panel (Hiện khi isCustomizingPrint = true) */}
            {isCustomizingPrint && (
              <div className="bg-amber-50/70 border-b border-amber-200 p-4 shrink-0 overflow-y-auto max-h-[42vh] no-scrollbar no-print">
                <div className="max-w-4xl mx-auto space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 bg-amber-500/20 text-amber-800 rounded-lg">
                        <Sliders className="w-4 h-4" />
                      </span>
                      <h4 className="text-xs font-bold text-amber-950 uppercase tracking-wider">
                        Tùy Chỉnh Thông Tin Mẫu In &amp; Lưu Lại Cho Lần Sau
                      </h4>
                    </div>
                    {/* Tabs */}
                    <div className="flex items-center gap-1 text-xs">
                      <button
                        type="button"
                        onClick={() => setPrintCustomizeTab("header")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                          printCustomizeTab === "header"
                            ? "bg-amber-700 text-white shadow-2xs"
                            : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        Tiêu đề &amp; Đơn vị
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintCustomizeTab("columns")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                          printCustomizeTab === "columns"
                            ? "bg-amber-700 text-white shadow-2xs"
                            : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        Cột bảng kê
                      </button>
                      <button
                        type="button"
                        onClick={() => setPrintCustomizeTab("signatures")}
                        className={`px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                          printCustomizeTab === "signatures"
                            ? "bg-amber-700 text-white shadow-2xs"
                            : "bg-white text-amber-900 border border-amber-200 hover:bg-amber-100"
                        }`}
                      >
                        Chữ ký &amp; Chân trang
                      </button>
                    </div>
                  </div>

                  {/* Tab 1: Header */}
                  {printCustomizeTab === "header" && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3 bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs text-xs">
                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Tên Bộ phận / Đơn vị / Tên Công ty
                        </label>
                        <input
                          type="text"
                          value={printConfig.companyHeader}
                          onChange={(e) =>
                            setPrintConfig((prev) => ({ ...prev, companyHeader: e.target.value }))
                          }
                          placeholder="VD: CÔNG TY TNHH NHƯ TRẦN NGỌC..."
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg font-semibold text-gray-900 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Phụ đề đơn vị / Địa chỉ / Hotline
                        </label>
                        <input
                          type="text"
                          value={printConfig.companySubHeader}
                          onChange={(e) =>
                            setPrintConfig((prev) => ({ ...prev, companySubHeader: e.target.value }))
                          }
                          placeholder="VD: Hệ thống Quản lý Đơn hàng & Bảng kê Phiếu giao hàng"
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg text-gray-900 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Tiêu đề chính của bảng in
                        </label>
                        <input
                          type="text"
                          value={printConfig.documentTitle}
                          onChange={(e) =>
                            setPrintConfig((prev) => ({ ...prev, documentTitle: e.target.value }))
                          }
                          placeholder="VD: BẢNG KÊ GIAO HÀNG & PHIẾU XUẤT KHO"
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg font-black text-gray-900 uppercase focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Mã số mẫu biểu (Góc phải trên)
                        </label>
                        <input
                          type="text"
                          value={printConfig.formCode}
                          onChange={(e) =>
                            setPrintConfig((prev) => ({ ...prev, formCode: e.target.value }))
                          }
                          placeholder="VD: Mẫu biểu: BK-GH/XK"
                          className="w-full px-2.5 py-1.5 border border-gray-300 rounded-lg font-mono text-gray-900 focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500"
                        />
                      </div>

                      <div className="md:col-span-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-1">
                        <label className="flex items-center gap-2 cursor-pointer select-none text-xs text-gray-700">
                          <input
                            type="checkbox"
                            checked={printConfig.showPrintDate}
                            onChange={(e) =>
                              setPrintConfig((prev) => ({ ...prev, showPrintDate: e.target.checked }))
                            }
                            className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
                          />
                          <span>Hiển thị ngày giờ in thời gian thực ở góc trên</span>
                        </label>

                        <div className="flex-1 max-w-sm">
                          <input
                            type="text"
                            value={printConfig.headerNote || ""}
                            onChange={(e) =>
                              setPrintConfig((prev) => ({ ...prev, headerNote: e.target.value }))
                            }
                            placeholder="Ghi chú thêm dưới tiêu đề (nếu có)..."
                            className="w-full px-2.5 py-1 text-xs border border-gray-200 rounded-lg"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Tab 2: Columns */}
                  {printCustomizeTab === "columns" && (
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs text-xs space-y-2.5">
                      <p className="text-[11px] text-gray-500 italic">
                        Bật/tắt các cột bạn muốn in và đổi tên tiêu đề cột theo ý muốn:
                      </p>
                      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
                        {(
                          [
                            ["index", "STT"],
                            ["ticketNumber", "Số phiếu"],
                            ["month", "Tháng"],
                            ["vehicleNumber", "Số xe"],
                            ["driverName", "Người giao"],
                            ["customerName", "Khách hàng"],
                            ["area", "Khu vực"],
                            ["deliveryDate", "Ngày giao"],
                            ["handoverDeadline", "Hạn Bàn Giao"],
                            ["status", "Trạng thái"],
                            ["notes", "Ghi chú"],
                            ["signature", "Ký nhận"],
                          ] as const
                        ).map(([colKey, defaultTitle]) => {
                          const col = printConfig.columns[colKey] || { label: defaultTitle, visible: true };
                          return (
                            <div
                              key={colKey}
                              className={`p-2 rounded-lg border flex flex-col gap-1 transition-all ${
                                col.visible
                                  ? "bg-amber-50/50 border-amber-200"
                                  : "bg-gray-50 border-gray-200 opacity-60"
                              }`}
                            >
                              <label className="flex items-center gap-1.5 cursor-pointer select-none font-bold text-gray-800 text-[11px]">
                                <input
                                  type="checkbox"
                                  checked={col.visible}
                                  onChange={(e) => {
                                    setPrintConfig((prev) => ({
                                      ...prev,
                                      columns: {
                                        ...prev.columns,
                                        [colKey]: {
                                          ...prev.columns[colKey],
                                          visible: e.target.checked,
                                        },
                                      },
                                    }));
                                  }}
                                  className="rounded text-amber-600 focus:ring-amber-500 w-3.5 h-3.5"
                                />
                                <span className="truncate">{defaultTitle}</span>
                              </label>
                              <input
                                type="text"
                                value={col.label}
                                disabled={!col.visible}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setPrintConfig((prev) => ({
                                    ...prev,
                                    columns: {
                                      ...prev.columns,
                                      [colKey]: {
                                        ...prev.columns[colKey],
                                        label: val,
                                      },
                                    },
                                  }));
                                }}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded font-semibold text-gray-900 bg-white"
                              />
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Tab 3: Signatures & Footer */}
                  {printCustomizeTab === "signatures" && (
                    <div className="bg-white p-3.5 rounded-xl border border-amber-200 shadow-2xs text-xs space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-gray-100">
                        <label className="flex items-center gap-2 cursor-pointer select-none font-bold text-gray-800">
                          <input
                            type="checkbox"
                            checked={printConfig.showSignatures}
                            onChange={(e) =>
                              setPrintConfig((prev) => ({ ...prev, showSignatures: e.target.checked }))
                            }
                            className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4"
                          />
                          <span>Bật hiển thị phần chữ ký xác nhận ở chân trang</span>
                        </label>
                      </div>

                      {printConfig.showSignatures && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
                          {printConfig.signatures.map((sig, sIdx) => (
                            <div key={sig.id} className="p-2.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                              <div className="flex items-center justify-between">
                                <span className="text-[10px] font-bold text-gray-500 uppercase">
                                  Ô Ký #{sIdx + 1}
                                </span>
                                <label className="flex items-center gap-1 text-[10.5px] text-gray-600 cursor-pointer">
                                  <input
                                    type="checkbox"
                                    checked={sig.visible}
                                    onChange={(e) => {
                                      const next = [...printConfig.signatures];
                                      next[sIdx] = { ...next[sIdx], visible: e.target.checked };
                                      setPrintConfig((prev) => ({ ...prev, signatures: next }));
                                    }}
                                    className="rounded text-amber-600 w-3 h-3"
                                  />
                                  <span>Hiện</span>
                                </label>
                              </div>
                              <input
                                type="text"
                                value={sig.title}
                                placeholder="Tiêu đề người ký"
                                onChange={(e) => {
                                  const next = [...printConfig.signatures];
                                  next[sIdx] = { ...next[sIdx], title: e.target.value };
                                  setPrintConfig((prev) => ({ ...prev, signatures: next }));
                                }}
                                className="w-full px-2 py-1 text-xs border border-gray-300 rounded font-bold text-gray-900 bg-white"
                              />
                              <input
                                type="text"
                                value={sig.subtitle}
                                placeholder="Phụ đề (Ký, họ tên...)"
                                onChange={(e) => {
                                  const next = [...printConfig.signatures];
                                  next[sIdx] = { ...next[sIdx], subtitle: e.target.value };
                                  setPrintConfig((prev) => ({ ...prev, signatures: next }));
                                }}
                                className="w-full px-2 py-0.5 text-[11px] border border-gray-200 rounded italic text-gray-600 bg-white"
                              />
                            </div>
                          ))}
                        </div>
                      )}

                      <div>
                        <label className="block text-[11px] font-bold text-gray-700 mb-1">
                          Ghi chú chân trang (In phía dưới cùng bảng kê)
                        </label>
                        <input
                          type="text"
                          value={printConfig.footerNote || ""}
                          onChange={(e) =>
                            setPrintConfig((prev) => ({ ...prev, footerNote: e.target.value }))
                          }
                          placeholder="VD: Quý khách vui lòng kiểm đếm kỹ số lượng và tình trạng hàng hóa trước khi ký nhận..."
                          className="w-full px-3 py-1.5 border border-gray-300 rounded-lg text-xs"
                        />
                      </div>
                    </div>
                  )}

                  {/* Drawer Footer Actions */}
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
                    <p className="text-[11px] text-amber-900 font-medium flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                      Mọi chỉnh sửa sẽ hiển thị ngay ở bản xem trước phía dưới.
                    </p>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={handleResetPrintTemplate}
                        className="px-3 py-1.5 bg-white hover:bg-gray-100 border border-gray-300 text-gray-700 text-xs font-semibold rounded-xl cursor-pointer transition-colors"
                      >
                        Khôi phục mẫu mặc định
                      </button>
                      <button
                        type="button"
                        onClick={handleSavePrintTemplate}
                        className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs cursor-pointer transition-all flex items-center gap-1.5"
                      >
                        <Save className="w-3.5 h-3.5" />
                        Lưu mẫu này cho lần sau
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Phần nội dung xem trước bản in: Hiện đầy đủ toàn bộ nội dung, không cắt ngắn, không hiện thanh lăn */}
            <div className="w-full p-0 bg-white flex flex-col overflow-visible no-scrollbar">
              {/* Document for Screen Preview and Physical Print */}
              <div
                id="print-manifest-document"
                className="bg-white text-slate-900 w-full h-auto min-h-full flex-1 flex flex-col justify-between p-6 sm:p-10 font-sans"
              >
                {/* Header biểu mẫu */}
                <div className="flex items-start justify-between border-b-2 border-slate-900 pb-3 mb-4 text-xs">
                  <div>
                    <h4 className="font-bold text-sm uppercase tracking-wider text-slate-900">
                      {printConfig.companyHeader || "BỘ PHẬN KHO VẬN & ĐIỀU PHỐI GIAO NHẬN"}
                    </h4>
                    {printConfig.companySubHeader && (
                      <p className="text-slate-600 text-[11px] mt-0.5">
                        {printConfig.companySubHeader}
                      </p>
                    )}
                  </div>
                  <div className="text-right text-[11px] text-slate-700">
                    {printConfig.showPrintDate && (
                      <p>
                        <strong>Ngày in:</strong> {formatRealtimeClock(liveClock)}
                      </p>
                    )}
                    {printConfig.formCode && (
                      <p className="text-slate-500 font-mono text-[10px]">{printConfig.formCode}</p>
                    )}
                  </div>
                </div>

                {/* Tiêu đề chính */}
                <div className="text-center my-4">
                  <h2 className="text-xl sm:text-2xl font-black uppercase tracking-wider text-slate-900">
                    {printConfig.documentTitle || "BẢNG KÊ GIAO HÀNG & PHIẾU XUẤT KHO"}
                  </h2>
                  {printConfig.headerNote && (
                    <p className="text-xs text-slate-600 italic mt-0.5">{printConfig.headerNote}</p>
                  )}
                  <div className="flex flex-wrap items-center justify-center gap-3 text-xs text-slate-700 mt-1.5 font-medium">
                    <span>
                      Tổng số: <strong>{ordersToPrint.length}</strong> đơn hàng
                    </span>
                    <span>•</span>
                    <span>
                      Tổng số phiếu: <strong className="font-mono font-bold">{printTicketsCount}</strong> phiếu
                    </span>
                    {hasActiveFilters && printScope === "filtered" && (
                      <>
                        <span>•</span>
                        <span className="italic text-slate-600">
                          (Danh sách xuất theo điều kiện lọc hiện tại)
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Bảng kê chi tiết đơn hàng: Hiện đầy đủ tất cả các cột và dòng, không thanh lăn */}
                <div className="my-4 w-full overflow-visible no-scrollbar">
                  <table
                    className={`w-full border-collapse border border-slate-800 table-auto ${
                      printConfig.fontSize === "compact"
                        ? "text-[10px]"
                        : printConfig.fontSize === "large"
                        ? "text-xs"
                        : "text-[11px]"
                    }`}
                  >
                    <thead>
                      {(() => {
                        const headerSizeClass =
                          printConfig.fontSize === "compact"
                            ? "text-xs font-black py-2"
                            : printConfig.fontSize === "large"
                            ? "text-sm sm:text-base font-black py-3.5"
                            : "text-[13px] sm:text-sm font-black py-2.5";

                        return (
                          <tr className="bg-slate-100 text-slate-900 border-b-2 border-slate-800 text-center uppercase">
                            {printConfig.columns.index.visible && (
                              <th className={`border border-slate-700 ${headerSizeClass} px-1 w-10 text-center align-middle tracking-wider`}>
                                {printConfig.columns.index.label}
                              </th>
                            )}
                            {printConfig.columns.ticketNumber.visible && (
                              <th className={`border border-slate-700 ${headerSizeClass} px-2 w-28 min-w-[100px] text-center align-middle tracking-wider`}>
                                {printConfig.columns.ticketNumber.label}
                              </th>
                            )}
                            {printConfig.columns.month?.visible && (
                              <th className={`border border-slate-700 ${headerSizeClass} px-2 w-16 text-center align-middle tracking-wider`}>
                                {printConfig.columns.month.label}
                              </th>
                            )}
                            {printConfig.columns.vehicleNumber.visible && (
                              <th className={`border border-slate-700 ${headerSizeClass} px-2 w-24 text-center align-middle tracking-wider`}>
                                {printConfig.columns.vehicleNumber.label}
                              </th>
                            )}
                            {printConfig.columns.driverName.visible && (
                              <th className={`border border-slate-700 ${headerSizeClass} px-2.5 min-w-[110px] text-center align-middle tracking-wider`}>
                                {printConfig.columns.driverName.label}
                              </th>
                            )}
                            {printConfig.columns.customerName.visible && (
                              <th className={`border border-slate-700 ${headerSizeClass} px-2.5 min-w-[150px] text-center align-middle tracking-wider`}>
                                {printConfig.columns.customerName.label}
                              </th>
                            )}
                            {printConfig.columns.area.visible && (
                              <th className={`border border-slate-700 ${headerSizeClass} px-2.5 min-w-[100px] text-center align-middle tracking-wider`}>
                                {printConfig.columns.area.label}
                              </th>
                            )}
                            {printConfig.columns.deliveryDate?.visible && (
                              <th className={`border border-slate-700 ${headerSizeClass} px-2 min-w-[110px] text-center align-middle tracking-wider`}>
                                {printConfig.columns.deliveryDate.label}
                              </th>
                            )}
                            {printConfig.columns.handoverDeadline?.visible && (
                              <th className={`border border-slate-700 ${headerSizeClass} px-2 min-w-[150px] text-center align-middle tracking-wider`}>
                                {printConfig.columns.handoverDeadline.label}
                              </th>
                            )}
                            {printConfig.columns.status.visible && (
                              <th className={`border border-slate-700 ${headerSizeClass} px-2 min-w-[135px] text-center align-middle tracking-wider`}>
                                {printConfig.columns.status.label}
                              </th>
                            )}
                            {printConfig.columns.notes.visible && (
                              <th className={`border border-slate-700 ${headerSizeClass} px-2 min-w-[100px] text-center align-middle tracking-wider`}>
                                {printConfig.columns.notes.label}
                              </th>
                            )}
                            {printConfig.columns.signature.visible && (
                              <th className={`border border-slate-700 ${headerSizeClass} px-2 w-24 min-w-[90px] text-center align-middle tracking-wider`}>
                                {printConfig.columns.signature.label}
                              </th>
                            )}
                          </tr>
                        );
                      })()}
                    </thead>
                    <tbody>
                      {ordersToPrint.length === 0 ? (
                        <tr>
                          <td
                            colSpan={
                              Object.values(printConfig.columns).filter(
                                (c: any) => c?.visible
                              ).length || 1
                            }
                            className="border border-slate-400 py-8 text-center text-slate-500 italic"
                          >
                            Không có đơn hàng nào trong phạm vi in này.
                          </td>
                        </tr>
                      ) : (
                        ordersToPrint.map((ord, idx) => {
                          const statusCfg = STATUS_CONFIG[ord.status] || {
                            label: ord.status,
                            color: "text-gray-700",
                            bg: "bg-gray-100",
                            border: "border-gray-300",
                            icon: Clock,
                          };
                          const StatusIcon = statusCfg.icon || Clock;

                          const dupKey = getOrderTicketMonthKey(ord.ticketNumber, ord);
                          const isDuplicateTicket = dupKey !== "" && duplicateTicketKeys.has(dupKey);

                          const padClass =
                            printConfig.fontSize === "compact"
                              ? "py-1 px-1.5"
                              : printConfig.fontSize === "large"
                              ? "py-2 px-2.5"
                              : "py-1.5 px-2";

                          const isHandoverTarget = ord.status === "pending" || ord.status === "unsigned";
                          const handoverInfo = isHandoverTarget ? getHandoverDeadlineInfo(ord.deliveryDate) : null;
                          const custColor = getCustomerColorByStatus(ord.status);

                          return (
                            <tr key={ord.id} className="border-b border-slate-300 hover:bg-slate-50/50">
                              {printConfig.columns.index.visible && (
                                <td className={`border border-slate-300 ${padClass} text-center font-mono text-gray-500 text-xs`}>
                                  {idx + 1}
                                </td>
                              )}
                              {printConfig.columns.ticketNumber.visible && (
                                <td className={`border border-slate-300 ${padClass} text-center whitespace-nowrap`}>
                                  <div className="flex items-center justify-center gap-1.5 flex-wrap">
                                    <span
                                      className={`inline-flex items-center gap-1 font-mono font-bold text-sm px-2.5 py-0.5 rounded border transition-all ${
                                        isDuplicateTicket
                                          ? "text-amber-900 bg-amber-50 border-amber-300 ring-1 ring-amber-400/50"
                                          : "text-emerald-800 bg-emerald-50 border border-emerald-200/60"
                                      }`}
                                    >
                                      <FileText
                                        className={`w-3.5 h-3.5 shrink-0 ${
                                          isDuplicateTicket ? "text-amber-600" : "text-emerald-600"
                                        }`}
                                      />
                                      {ord.ticketNumber}
                                    </span>
                                    {isDuplicateTicket && (
                                      <span
                                        className="inline-flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-800 border border-amber-300 rounded text-[10px] font-bold shrink-0 shadow-2xs"
                                        title="Số phiếu này xuất hiện nhiều lần trong danh sách đơn hàng"
                                      >
                                        <AlertTriangle className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                        Trùng phiếu
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}
                              {printConfig.columns.month?.visible && (
                                <td className={`border border-slate-300 ${padClass} text-center whitespace-nowrap`}>
                                  {(() => {
                                    const m = getOrderMonth(ord);
                                    return m ? (
                                      <span className="inline-flex items-center justify-center font-mono font-bold text-xs text-indigo-950 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded shadow-2xs">
                                        {m}
                                      </span>
                                    ) : (
                                      <span className="text-gray-300 italic text-[11px]">--</span>
                                    );
                                  })()}
                                </td>
                              )}
                              {printConfig.columns.vehicleNumber.visible && (
                                <td className={`border border-slate-300 ${padClass} text-center whitespace-nowrap`}>
                                  {ord.vehicleNumber ? (
                                    <span className="inline-flex items-center gap-1 font-mono font-semibold text-xs text-slate-800 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                                      <Truck className="w-3 h-3 text-slate-500 shrink-0" />
                                      {ord.vehicleNumber}
                                    </span>
                                  ) : (
                                    <span className="text-gray-300 italic text-[11px]">--</span>
                                  )}
                                </td>
                              )}
                              {printConfig.columns.driverName.visible && (
                                <td className={`border border-slate-300 ${padClass} break-words`}>
                                  <span className="font-semibold text-gray-800 flex items-center gap-1 text-xs">
                                    <User className="w-3 h-3 text-slate-400 shrink-0" />
                                    {ord.driverName || (
                                      <span className="text-gray-300 italic text-[11px]">Chưa nhập</span>
                                    )}
                                  </span>
                                </td>
                              )}
                              {printConfig.columns.customerName.visible && (
                                <td className={`border border-slate-300 ${padClass} break-words`}>
                                  <span
                                    className={`flex items-center gap-1.5 text-left font-bold ${custColor.textClass} ${custColor.cssClass}`}
                                    style={{
                                      color: custColor.hex,
                                      fontWeight: "bold",
                                    }}
                                  >
                                    <Building2
                                      className={`w-3.5 h-3.5 shrink-0 ${custColor.iconClass}`}
                                    />
                                    {ord.customerName ? (
                                      <span
                                        className={`customer-name-text font-bold text-xs ${custColor.textClass} ${custColor.cssClass}`}
                                        style={{
                                          color: custColor.hex,
                                          fontWeight: "bold",
                                        }}
                                      >
                                        {ord.customerName}
                                      </span>
                                    ) : (
                                      <span className="text-gray-300 italic text-[11px] font-normal">
                                        Chưa nhập
                                      </span>
                                    )}
                                  </span>
                                </td>
                              )}
                              {printConfig.columns.area.visible && (
                                <td className={`border border-slate-300 ${padClass} break-words`}>
                                  <span className="font-semibold text-gray-800 flex items-center gap-1 text-xs">
                                    <MapPin className="w-3 h-3 text-emerald-600 shrink-0" />
                                    {(ord.area || ord.deliveryLocation) ? (
                                      <span>{ord.area || ord.deliveryLocation}</span>
                                    ) : (
                                      <span className="text-gray-300 italic text-[11px]">Chưa nhập</span>
                                    )}
                                  </span>
                                </td>
                              )}
                              {printConfig.columns.deliveryDate?.visible && (
                                <td className={`border border-slate-300 ${padClass} text-center font-mono text-[11px] whitespace-nowrap`}>
                                  {ord.deliveryDate ? (
                                    <span className="inline-flex items-center justify-center gap-1 text-gray-700 font-semibold whitespace-nowrap">
                                      <Calendar className="w-3 h-3 text-indigo-500 shrink-0" />
                                      {formatDateDDMMYYYY(ord.deliveryDate) || ord.deliveryDate}
                                    </span>
                                  ) : (
                                    <span className="text-gray-400 italic text-[10.5px]">--</span>
                                  )}
                                </td>
                              )}
                              {printConfig.columns.handoverDeadline?.visible && (
                                <td className={`border border-slate-300 ${padClass} text-center whitespace-nowrap`}>
                                  {isHandoverTarget && handoverInfo ? (
                                    handoverInfo.isOverdue ? (
                                      <span
                                        className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-black bg-rose-100 text-rose-700 border border-rose-300 shadow-2xs whitespace-nowrap"
                                        title={`Đơn hàng đã quá hạn bàn giao 7 ngày kể từ ngày giao ${formatDateDDMMYYYY(ord.deliveryDate)} (quá hạn ${handoverInfo.overdueDays} ngày)`}
                                      >
                                        <AlertTriangle className="w-2.5 h-2.5 text-rose-600 shrink-0" />
                                        <span>Quá hạn bàn giao ({handoverInfo.overdueDays} ngày)</span>
                                      </span>
                                    ) : handoverInfo.daysLeft === 0 ? (
                                      <span
                                        className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-100 text-amber-900 border border-amber-300 shadow-2xs whitespace-nowrap"
                                        title={`Hôm nay là hạn chót 7 ngày bàn giao kể từ ngày giao ${formatDateDDMMYYYY(ord.deliveryDate)}`}
                                      >
                                        <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                        <span>Thời hạn còn: Hôm nay (hạn chót)</span>
                                      </span>
                                    ) : handoverInfo.daysLeft <= 3 ? (
                                      <span
                                        className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold bg-amber-50 text-amber-800 border border-amber-300 shadow-2xs whitespace-nowrap"
                                        title={`Thời hạn bàn giao 7 ngày kể từ ngày giao: còn ${handoverInfo.daysLeft} ngày (bắt đầu từ ngày giao trừ dần)`}
                                      >
                                        <Clock className="w-2.5 h-2.5 text-amber-600 shrink-0" />
                                        <span>Thời hạn còn: {handoverInfo.daysLeft} ngày</span>
                                      </span>
                                    ) : (
                                      <span
                                        className="inline-flex items-center justify-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-semibold bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs whitespace-nowrap"
                                        title={`Thời hạn bàn giao 7 ngày kể từ ngày giao: còn ${handoverInfo.daysLeft} ngày (bắt đầu từ ngày giao trừ dần)`}
                                      >
                                        <Clock className="w-2.5 h-2.5 text-blue-600 shrink-0" />
                                        <span>Thời hạn còn: {handoverInfo.daysLeft} ngày</span>
                                      </span>
                                    )
                                  ) : (
                                    <span className="text-gray-300 italic text-[11px]">--</span>
                                  )}
                                </td>
                              )}
                              {printConfig.columns.status.visible && (
                                <td className={`border border-slate-300 ${padClass} text-center whitespace-nowrap`}>
                                  <div className="inline-flex items-center justify-center gap-1.5 flex-wrap">
                                    <span
                                      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold border transition-all ${statusCfg.bg} ${statusCfg.color} ${statusCfg.border}`}
                                    >
                                      <StatusIcon className="w-3 h-3 shrink-0" />
                                      {statusCfg.label}
                                    </span>
                                    {isDuplicateTicket && (
                                      <span
                                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-black bg-amber-500 text-white shadow-2xs"
                                        title={`Số phiếu #${ord.ticketNumber} bị trùng nhau (trùng mã trong danh sách đơn hàng)`}
                                      >
                                        <AlertTriangle className="w-3 h-3 text-white shrink-0" />
                                        Trùng mã
                                      </span>
                                    )}
                                  </div>
                                </td>
                              )}
                              {printConfig.columns.notes.visible && (
                                <td
                                  className={`border border-slate-300 ${padClass} text-center text-[#DEAC35] font-bold text-xs max-w-xs break-words`}
                                  style={{ color: "#DEAC35", fontWeight: "bold" }}
                                >
                                  {ord.notes || <span className="text-gray-300 italic font-normal">--</span>}
                                </td>
                              )}
                              {printConfig.columns.signature.visible && (
                                <td className={`border border-slate-300 ${padClass} text-center text-[10px] text-slate-400 h-10`}>
                                </td>
                              )}
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Phần Chữ Ký Xác Nhận */}
                {printConfig.showSignatures && (
                  <div className="mt-8 pt-4 border-t border-slate-300 print-page-break">
                    <div
                      className={`grid gap-2 text-center text-xs ${
                        printConfig.signatures.filter((s) => s.visible).length === 1
                          ? "grid-cols-1"
                          : printConfig.signatures.filter((s) => s.visible).length === 2
                          ? "grid-cols-2"
                          : printConfig.signatures.filter((s) => s.visible).length === 3
                          ? "grid-cols-3"
                          : "grid-cols-4"
                      }`}
                    >
                      {printConfig.signatures
                        .filter((s) => s.visible)
                        .map((sig) => (
                          <div key={sig.id}>
                            <p className="font-bold uppercase text-slate-900">{sig.title}</p>
                            {sig.subtitle && (
                              <p className="text-[10px] italic text-slate-500">{sig.subtitle}</p>
                            )}
                            <div className="h-16"></div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}

                {/* Ghi chú chân trang */}
                {printConfig.footerNote && (
                  <div className="mt-4 pt-2 border-t border-slate-200 text-center text-[10.5px] italic text-slate-600">
                    {printConfig.footerNote}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
        </div>
      )}

      {/* MODAL CHIA SẺ HÌNH ẢNH & LỜI NHẮN NHANH DO TỰ TẠO */}
      <PrintZaloShareModal
        isOpen={isPrintShareOpen}
        onClose={() => setIsPrintShareOpen(false)}
        documentElementId="print-manifest-document"
        dateStr={formatDateDDMMYYYY(getLocalTodayISO())}
        manifestDateStr={formatDateDDMMYYYY(defaultRecordDate || getLocalTodayISO())}
        totalOrders={ordersToPrint.length}
        totalTickets={printTicketsCount}
        deliveredOrders={ordersToPrint.filter((o) => o.status === "delivered").length}
        undeliveredOrders={ordersToPrint.filter((o) => o.status !== "delivered").length}
        ticketListStr={
          ordersToPrint
            .map((o) => o.ticketNumber)
            .filter((t) => t !== undefined && t !== null && String(t).trim() !== "")
            .join(", ")
        }
        vehicleNumber={defaultVehicleNumber}
        driverName={defaultDriverName}
        driverListStr={Array.from(
          new Set(
            ordersToPrint
              .map((o) => o.driverName?.trim())
              .filter((d): d is string => !!d)
          )
        ).join(", ")}
        customerName={defaultCustomerName}
        area={defaultArea || defaultDeliveryLocation}
      />
    </section>
  );
}
