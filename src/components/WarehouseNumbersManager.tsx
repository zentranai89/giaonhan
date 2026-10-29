import React, { useState, useMemo, useRef, useEffect, useCallback, KeyboardEvent } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  FileText,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  Search,
  Copy,
  Download,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  Eye,
  EyeOff,
  Sparkles,
  ArrowUpDown,
  FileSpreadsheet,
  Layers,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  RotateCcw,
  RefreshCw,
  Truck,
  User,
  Building2,
  Calendar,
  Send,
  ArrowDownCircle,
  CheckCircle,
  Sliders,
  Scan,
  MousePointerClick,
  Target,
  Loader2,
  MapPin,
  CheckSquare,
  Square,
  Share2,
  ExternalLink,
  MessageSquare,
  Zap,
} from "lucide-react";
import { ImagePage, DeliveryOrder, OrderStatus } from "../types";
import WarehouseVisualInspector from "./WarehouseVisualInspector";
import {
  getDriverSuggestions,
  getVehicleSuggestions,
  getCustomerSuggestions,
  getAreaSuggestions,
  addAreaSuggestion,
  getDeliveryLocationSuggestions,
  addDeliveryLocationSuggestion,
  deduplicateCaseInsensitive,
} from "../utils/backupStorage";
import {
  formatDateDDMMYYYY,
  getLocalTodayISO,
  extractMonthFromDate,
  getOrderMonth,
} from "../utils/dateUtils";

const STATUS_OPTIONS: { value: OrderStatus; label: string }[] = [
  { value: "delivered", label: "Hoàn Thành" },
  { value: "delivering", label: "Đơn Chưa Giao" },
  { value: "pending", label: "Chưa Nhận Đơn" },
  { value: "unsigned", label: "Không Ký Đơn" },
  { value: "returned", label: "Trả Hàng" },
  { value: "cancelled", label: "Hủy Đơn" },
  { value: "lost", label: "Mất Đơn" },
];

const getStatusBadgeStyle = (status: OrderStatus) => {
  switch (status) {
    case "delivered":
      return {
        bg: "bg-emerald-50",
        text: "text-emerald-800",
        border: "border-emerald-300",
        badge: "bg-emerald-100 text-emerald-900 border-emerald-300",
        selectBg: "bg-emerald-50 text-emerald-800 border-emerald-400",
      };
    case "delivering":
      return {
        bg: "bg-red-50",
        text: "text-red-700 font-bold",
        border: "border-red-300",
        badge: "bg-red-100 text-red-800 border-red-300 font-extrabold",
        selectBg: "bg-red-50 text-red-700 border-red-400 font-bold",
      };
    case "returned":
      return {
        bg: "bg-orange-50",
        text: "text-orange-700 font-bold",
        border: "border-orange-300",
        badge: "bg-orange-100 text-orange-900 border-orange-300 font-bold",
        selectBg: "bg-orange-50 text-orange-700 border-orange-400 font-bold",
      };
    case "pending":
      return {
        bg: "bg-amber-50",
        text: "text-amber-800",
        border: "border-amber-300",
        badge: "bg-amber-100 text-amber-900 border-amber-300",
        selectBg: "bg-amber-50 text-amber-800 border-amber-400",
      };
    case "unsigned":
      return {
        bg: "bg-purple-50",
        text: "text-purple-700 font-bold",
        border: "border-purple-300",
        badge: "bg-purple-100 text-purple-900 border-purple-300 font-extrabold",
        selectBg: "bg-purple-50 text-purple-700 border-purple-400 font-bold",
      };
    case "cancelled":
      return {
        bg: "bg-slate-100",
        text: "text-slate-700",
        border: "border-slate-300",
        badge: "bg-slate-200 text-slate-800 border-slate-300",
        selectBg: "bg-slate-100 text-slate-700 border-slate-400",
      };
    case "lost":
      return {
        bg: "bg-rose-50",
        text: "text-rose-700",
        border: "border-rose-300",
        badge: "bg-rose-100 text-rose-900 border-rose-300 font-bold",
        selectBg: "bg-rose-50 text-rose-700 border-rose-400",
      };
    default:
      return {
        bg: "bg-gray-50",
        text: "text-gray-700",
        border: "border-gray-200",
        badge: "bg-gray-100 text-gray-800 border-gray-200",
        selectBg: "bg-white text-gray-700 border-gray-300",
      };
  }
};

interface WarehouseNumbersManagerProps {
  pages: ImagePage[];
  manualNumbers: number[];
  allNumbers: number[];
  driverName: string;
  customerName: string;
  area?: string;
  deliveryLocation?: string;
  vehicleNumber?: string;
  recordDate: string;
  customerAutoSource?: string | null;
  dateAutoSource?: string | null;
  orders?: DeliveryOrder[];
  onAddManualNumber: (num: number) => void;
  onAddBatchNumbers: (nums: number[]) => void;
  onRemoveNumber: (num: number) => void;
  onRemoveBatchNumbers?: (nums: number[]) => void;
  onEditNumber: (oldNum: number, newNum: number) => void;
  onClearAllNumbers: () => void;
  activePreviewPageId: string | null;
  setActivePreviewPageId: (pageId: string) => void;
  onSyncWarehouseToOrders: (syncData: {
    vehicleNumber: string;
    driverName: string;
    customerName: string;
    area?: string;
    deliveryLocation?: string;
    deliveryDate: string;
    month?: number;
    status: OrderStatus;
    ticketStatusMap?: Record<number, OrderStatus>;
    ticketMonthMap?: Record<number, number>;
    updateExisting: boolean;
    clearUploadedPages?: boolean;
    duplicateAction?: "add_duplicate" | "update_existing" | "skip";
  }) => void;
  onAddNumberToPage?: (pageId: string, num: number, box?: number[]) => void;
  ordersTableSlot?: React.ReactNode;
  imageUploaderSlot?: React.ReactNode;
}

export default function WarehouseNumbersManager({
  pages,
  manualNumbers,
  allNumbers,
  driverName,
  customerName,
  area = "",
  deliveryLocation = "",
  vehicleNumber = "",
  recordDate,
  customerAutoSource = null,
  dateAutoSource = null,
  orders = [],
  onAddManualNumber,
  onAddBatchNumbers,
  onRemoveNumber,
  onRemoveBatchNumbers,
  onEditNumber,
  onClearAllNumbers,
  activePreviewPageId,
  setActivePreviewPageId,
  onSyncWarehouseToOrders,
  onAddNumberToPage,
  ordersTableSlot,
  imageUploaderSlot,
}: WarehouseNumbersManagerProps) {
  // Update section states
  // Mặc định để trống: Số xe (Biển số), Người giao, Khách hàng theo yêu cầu người dùng
  const [syncVehicle, setSyncVehicle] = useState("");
  const [syncDriver, setSyncDriver] = useState("");
  const [syncCustomer, setSyncCustomer] = useState("");
  const [syncArea, setSyncArea] = useState(area || deliveryLocation || "");
  const [syncDeliveryLocation, setSyncDeliveryLocation] = useState(deliveryLocation || area || "");
  // Ngày giao mặc định là ngày hiện tại hệ thống
  const [syncDate, setSyncDate] = useState(() => getLocalTodayISO());
  // Tháng mặc định được trích xuất từ ngày giao hoặc tháng hiện tại
  const [syncMonth, setSyncMonth] = useState<number>(() => extractMonthFromDate(getLocalTodayISO()) || (new Date().getMonth() + 1));
  const [syncStatus, setSyncStatus] = useState<OrderStatus>("delivered");
  // Quản lý trạng thái theo từng đơn hàng / số phiếu kho
  const [ticketStatusMap, setTicketStatusMap] = useState<Record<number, OrderStatus>>(() => {
    try {
      const saved = localStorage.getItem("warehouse_ticket_status_map");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("warehouse_ticket_status_map", JSON.stringify(ticketStatusMap));
    } catch {
      // ignore
    }
  }, [ticketStatusMap]);

  // Quản lý tháng theo từng đơn hàng / số phiếu kho
  const [ticketMonthMap, setTicketMonthMap] = useState<Record<number, number>>(() => {
    try {
      const saved = localStorage.getItem("warehouse_ticket_month_map");
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem("warehouse_ticket_month_map", JSON.stringify(ticketMonthMap));
    } catch {
      // ignore
    }
  }, [ticketMonthMap]);

  // Trạng thái khi nhập thêm số phiếu kho mới ở ô "Thêm Số Phiếu"
  const [addInputStatus, setAddInputStatus] = useState<OrderStatus>("delivered");
  // Tháng khi nhập thêm số phiếu mới ở ô "Thêm Số Phiếu" - Mặc định là tháng hiện tại của hệ thống
  const currentSystemMonth = new Date().getMonth() + 1;
  const [addInputMonth, setAddInputMonth] = useState<number>(() => new Date().getMonth() + 1);
  // Quản lý trạng thái hiển thị của 2 khu vực: SỐ PHIẾU GIAO NHẬN và THÔNG TIN SỐ PHIẾU
  // Mặc định khi mở ứng dụng: chỉ hiển thị THÊM SỐ PHIẾU và DANH SÁCH; ẩn SỐ PHIẾU GIAO NHẬN và THÔNG TIN SỐ PHIẾU
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);

  // Tự động ẩn 2 khu vực khi xóa hết số phiếu giao nhận
  useEffect(() => {
    if (allNumbers.length === 0) {
      setIsDetailsOpen(false);
    }
  }, [allNumbers.length]);

  // Bộ lọc theo trạng thái ở danh sách số phiếu
  const [statusFilter, setStatusFilter] = useState<OrderStatus | "all">("all");

  const getTicketStatus = (num: number): OrderStatus => {
    return ticketStatusMap[num] || syncStatus;
  };

  const handleSetTicketStatus = (num: number, st: OrderStatus) => {
    setTicketStatusMap((prev) => ({
      ...prev,
      [num]: st,
    }));
  };

  const handleBatchSetTicketStatus = (nums: number[], st: OrderStatus) => {
    setTicketStatusMap((prev) => {
      const next = { ...prev };
      nums.forEach((n) => {
        next[n] = st;
      });
      return next;
    });
  };

  const getTicketMonth = (num: number): number => {
    return ticketMonthMap[num] ?? syncMonth;
  };

  const handleSetTicketMonth = (num: number, m: number) => {
    setTicketMonthMap((prev) => ({
      ...prev,
      [num]: m,
    }));
  };

  const handleBatchSetTicketMonth = (nums: number[], m: number) => {
    setTicketMonthMap((prev) => {
      const next = { ...prev };
      nums.forEach((n) => {
        next[n] = m;
      });
      return next;
    });
  };

  const handleClearAllWarehouseNumbers = () => {
    setTicketStatusMap({});
    setTicketMonthMap({});
    try {
      localStorage.removeItem("warehouse_ticket_status_map");
      localStorage.removeItem("warehouse_ticket_month_map");
    } catch {}
    onClearAllNumbers();
  };

  const [syncUpdateExisting, setSyncUpdateExisting] = useState(false);
  const [allowDuplicateToOrders, setAllowDuplicateToOrders] = useState(true);
  const [autoClearImages, setAutoClearImages] = useState(true);
  const [justSyncedSuccess, setJustSyncedSuccess] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  // Multi-selection state for batch operations (chọn nhiều số phiếu, xóa nhiều số phiếu)
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);

  // Sync selected numbers with current allNumbers
  useEffect(() => {
    setSelectedNumbers((prev) => prev.filter((n) => allNumbers.includes(n)));
  }, [allNumbers]);

  const [pendingDuplicates, setPendingDuplicates] = useState<number[]>([]);
  const [batchStatusTarget, setBatchStatusTarget] = useState<OrderStatus>("delivered");
  const [batchMonthTarget, setBatchMonthTarget] = useState<number>(syncMonth);

  // Cập nhật mục tiêu đổi tháng hàng loạt khi syncMonth thay đổi
  useEffect(() => {
    setBatchMonthTarget(syncMonth);
  }, [syncMonth]);

  // Hàm kiểm tra một số phiếu có bị trùng với Danh Sách Đơn Hàng trong một tháng cụ thể hay không
  const isTicketDuplicateInMonth = useCallback(
    (ticketNum: number | string, targetMonth: number): boolean => {
      const key = String(ticketNum).trim().toLowerCase();
      if (!key) return false;
      return orders.some((o) => {
        const ordMonth = getOrderMonth(o);
        const matchesMonth = ordMonth ? ordMonth === targetMonth : targetMonth === syncMonth;
        return matchesMonth && String(o.ticketNumber ?? "").trim().toLowerCase() === key;
      });
    },
    [orders, syncMonth]
  );

  // Danh sách các số phiếu bị trùng đơn với Danh Sách Đơn Hàng khi đổi sang batchMonthTarget
  const batchMonthDuplicateTickets = useMemo(() => {
    const targets = selectedNumbers.length > 0 ? selectedNumbers : allNumbers;
    return targets.filter((n) => isTicketDuplicateInMonth(n, batchMonthTarget));
  }, [selectedNumbers, allNumbers, batchMonthTarget, isTicketDuplicateInMonth]);

  const handleApplyBatchMonth = (m: number) => {
    setBatchMonthTarget(m);
    if (selectedNumbers.length === 0) {
      setInputError("Vui lòng tích chọn vào đơn hàng cần đổi tháng!");
      setTimeout(() => setInputError(null), 3500);
      return;
    }

    // Kiểm tra các số phiếu trùng đơn trong Tháng m với Danh Sách Đơn Hàng
    const dups = selectedNumbers.filter((n) => isTicketDuplicateInMonth(n, m));

    handleBatchSetTicketMonth(selectedNumbers, m);
    setInputError(null);

    if (dups.length > 0) {
      setInputSuccess(
        `Đã đổi Tháng ${m} cho ${selectedNumbers.length} đơn hàng đã tích chọn! ⚠️ CẢNH BÁO TRÙNG ĐƠN: Có ${dups.length} số phiếu đã tồn tại trong Danh Sách Đơn Hàng Tháng ${m} (${dups.slice(0, 8).join(", ")}${dups.length > 8 ? "..." : ""})`
      );
      setTimeout(() => setInputSuccess(null), 5000);
    } else {
      setInputSuccess(`Đã đổi Tháng ${m} cho ${selectedNumbers.length} đơn hàng đã tích chọn! (Không trùng đơn)`);
      setTimeout(() => setInputSuccess(null), 3500);
    }
  };

  const handleApplyBatchStatus = (st: OrderStatus) => {
    setBatchStatusTarget(st);
    if (selectedNumbers.length === 0) {
      setInputError("Vui lòng tích chọn vào đơn hàng cần đổi trạng thái!");
      setTimeout(() => setInputError(null), 3500);
      return;
    }
    handleBatchSetTicketStatus(selectedNumbers, st);
    const stLabel = STATUS_OPTIONS.find((s) => s.value === st)?.label || st;
    setInputError(null);
    setInputSuccess(`Đã đổi trạng thái "${stLabel}" cho ${selectedNumbers.length} đơn hàng đã tích chọn!`);
    setTimeout(() => setInputSuccess(null), 3000);
  };

  const [isPerTicketStatusOpen, setIsPerTicketStatusOpen] = useState(true);

  // Tạm ẩn phần Kiểm Tra Trực Quan Chứng Từ khi chưa tải phiếu giao hàng lên, khi tải lên mới hiện ra
  const [isInspectorCollapsed, setIsInspectorCollapsed] = useState(false);

  // Tự động hiện phần Kiểm Tra Trực Quan khi người dùng tải thêm trang ảnh phiếu giao hàng mới
  const prevPagesCountRef = useRef(pages.length);
  useEffect(() => {
    if (pages.length > prevPagesCountRef.current && pages.length > 0) {
      setIsInspectorCollapsed(false);
    }
    prevPagesCountRef.current = pages.length;
  }, [pages.length]);

  // Tự động mở khi bấm chọn xem trước trang từ bên ngoài
  useEffect(() => {
    if (activePreviewPageId && pages.length > 0) {
      setIsInspectorCollapsed(false);
    }
  }, [activePreviewPageId, pages.length]);

  // Chỉ hiển thị phần "Kiểm Tra Trực Quan Chứng Từ" khi đã tải phiếu giao hàng lên (pages.length > 0)
  const showVisualInspector = pages.length > 0 && !isInspectorCollapsed;

  // Tổng hợp toàn bộ thông tin đã có trước đó trong Danh Sách Đơn Hàng
  const orderHistory = useMemo(() => {
    const vehicleCountMap = new Map<string, number>();
    const driverCountMap = new Map<string, number>();
    const customerCountMap = new Map<string, number>();
    const areaCountMap = new Map<string, number>();

    const vehiclesList: string[] = [];
    const driversList: string[] = [];
    const customersList: string[] = [];
    const areasList: string[] = [];

    let latestVehicle = "";
    let latestDriver = "";
    let latestCustomer = "";
    let latestArea = "";
    let latestMonth = 0;

    // Duyệt từ đơn gần nhất về trước
    for (let i = orders.length - 1; i >= 0; i--) {
      const o = orders[i];
      const v = (o.vehicleNumber || "").trim();
      const d = (o.driverName || "").trim();
      const c = (o.customerName || "").trim();
      const a = (o.area || o.deliveryLocation || "").trim();
      const m = getOrderMonth(o);

      if (m && !latestMonth) latestMonth = m;

      if (v) {
        if (!latestVehicle) latestVehicle = v;
        const vKey = v.toLowerCase();
        vehicleCountMap.set(vKey, (vehicleCountMap.get(vKey) || 0) + 1);
        if (!vehiclesList.some((x) => x.toLowerCase() === vKey)) vehiclesList.push(v);
      }
      if (d) {
        if (!latestDriver) latestDriver = d;
        const dKey = d.toLowerCase();
        driverCountMap.set(dKey, (driverCountMap.get(dKey) || 0) + 1);
        if (!driversList.some((x) => x.toLowerCase() === dKey)) driversList.push(d);
      }
      if (c) {
        if (!latestCustomer) latestCustomer = c;
        const cKey = c.toLowerCase();
        customerCountMap.set(cKey, (customerCountMap.get(cKey) || 0) + 1);
        if (!customersList.some((x) => x.toLowerCase() === cKey)) customersList.push(c);
      }
      if (a) {
        if (!latestArea) latestArea = a;
        const aKey = a.toLowerCase();
        areaCountMap.set(aKey, (areaCountMap.get(aKey) || 0) + 1);
        if (!areasList.some((x) => x.toLowerCase() === aKey)) areasList.push(a);
      }
    }

    const combinedVehicles = deduplicateCaseInsensitive([...vehiclesList, ...getVehicleSuggestions()]);
    const combinedDrivers = deduplicateCaseInsensitive([...driversList, ...getDriverSuggestions()]);
    const combinedCustomers = deduplicateCaseInsensitive([...customersList, ...getCustomerSuggestions()]);
    const combinedAreas = deduplicateCaseInsensitive([...areasList, ...getAreaSuggestions()]);

    return {
      vehicles: combinedVehicles,
      drivers: combinedDrivers,
      customers: combinedCustomers,
      areas: combinedAreas,
      latestVehicle,
      latestDriver,
      latestCustomer,
      latestArea,
      latestMonth,
      vehicleCounts: vehicleCountMap,
      driverCounts: driverCountMap,
      customerCounts: customerCountMap,
      areaCounts: areaCountMap,
      hasAnyOrderData: Boolean(latestVehicle || latestDriver || latestCustomer || latestArea || latestMonth),
    };
  }, [orders]);

  const fillFromLatestOrder = () => {
    if (orderHistory.latestVehicle) setSyncVehicle(orderHistory.latestVehicle);
    if (orderHistory.latestDriver) setSyncDriver(orderHistory.latestDriver);
    if (orderHistory.latestCustomer) setSyncCustomer(orderHistory.latestCustomer);
    if (orderHistory.latestArea) {
      setSyncArea(orderHistory.latestArea);
      setSyncDeliveryLocation(orderHistory.latestArea);
    }
    if (orderHistory.latestMonth) {
      setSyncMonth(orderHistory.latestMonth);
    }
  };

  // Sync state if props change (chỉ đồng bộ Khu vực / Địa điểm nếu có, Số xe, Người giao, Khách hàng giữ trống mặc định)
  useEffect(() => {
    if (deliveryLocation !== undefined) {
      setSyncDeliveryLocation(deliveryLocation);
      if (!area) setSyncArea(deliveryLocation);
    }
  }, [deliveryLocation]);
  useEffect(() => {
    if (area !== undefined) setSyncArea(area);
  }, [area]);

  // Suggestions for inputs
  const driverSuggestions = useMemo(() => getDriverSuggestions(), [syncDriver]);
  const vehicleSuggestions = useMemo(() => getVehicleSuggestions(), [syncVehicle]);
  const customerSuggestions = useMemo(() => getCustomerSuggestions(), [syncCustomer]);
  const areaSuggestions = useMemo(() => getAreaSuggestions(), [syncArea]);
  const locationSuggestions = useMemo(() => getDeliveryLocationSuggestions(), [syncDeliveryLocation]);

  // Order sync lookup for duplicate checking on sync trigger & Trùng Đơn indicators
  // Chỉ kiểm tra trùng với các đơn hàng trong cùng THÁNG (ví dụ: phiếu 12 tháng 9 không trùng với phiếu 12 tháng 10)
  const orderTicketSet = useMemo(() => {
    const s = new Set<string>();
    orders.forEach((o) => {
      const ordMonth = getOrderMonth(o);
      if (!syncMonth || !ordMonth || ordMonth === syncMonth) {
        const val = String(o.ticketNumber ?? "").trim().toLowerCase();
        if (val) s.add(val);
      }
    });
    return s;
  }, [orders, syncMonth]);

  // Danh sách các ngày giao đang có trong Danh Sách Đơn Hàng để liên kết và chọn nhanh
  const existingOrderDates = useMemo(() => {
    const set = new Set<string>();
    orders.forEach((o) => {
      if (o.deliveryDate) set.add(o.deliveryDate);
    });
    return Array.from(set).filter(Boolean).sort().reverse();
  }, [orders]);

  const orderTicketMap = useMemo(() => {
    const m = new Map<string, DeliveryOrder>();
    orders.forEach((o) => {
      const ordMonth = getOrderMonth(o);
      if (!syncMonth || !ordMonth || ordMonth === syncMonth) {
        const val = String(o.ticketNumber ?? "").trim().toLowerCase();
        if (val) m.set(val, o);
      }
    });
    return m;
  }, [orders, syncMonth]);

  const orderDuplicatesCount = useMemo(() => {
    return allNumbers.filter((n) => orderTicketSet.has(String(n).trim().toLowerCase())).length;
  }, [allNumbers, orderTicketSet]);

  const handleTriggerSync = () => {
    if (allNumbers.length === 0) return;

    // Nếu đã tích chọn "Ghi đè thông tin đơn cũ", trực tiếp thực hiện ghi đè (chỉ chuyển sang "Đã giao", giữ nguyên thông tin cũ)
    if (syncUpdateExisting) {
      executeSync("update_existing");
      return;
    }

    // Kiểm tra các số phiếu bị trùng với danh sách đơn hàng hiện tại hoặc chứng từ
    const orderDups = allNumbers.filter((n) => orderTicketSet.has(String(n).trim().toLowerCase()));
    const dupSet = new Set<number>();
    orderDups.forEach((n) => dupSet.add(n));
    duplicateNumbers.forEach((n) => dupSet.add(n));
    const allDups = Array.from(dupSet).sort((a, b) => a - b);

    // Luôn hiển thị thông báo trước khi cập nhật nếu phát hiện trùng số phiếu
    if (allDups.length > 0) {
      setPendingDuplicates(allDups);
      setShowDuplicateModal(true);
      return;
    }

    // Nếu không trùng số phiếu nào, thực hiện cập nhật ngay
    executeSync("add_duplicate");
  };

  const executeSync = (duplicateAction: "add_duplicate" | "update_existing" | "skip" = "add_duplicate") => {
    const finalArea = (syncArea || syncDeliveryLocation || "").trim();
    if (finalArea) {
      addAreaSuggestion(finalArea);
    }
    onSyncWarehouseToOrders({
      vehicleNumber: syncVehicle.trim(),
      driverName: syncDriver.trim(),
      customerName: syncCustomer.trim(),
      area: finalArea,
      deliveryLocation: finalArea,
      deliveryDate: syncDate || getLocalTodayISO(),
      month: syncMonth,
      status: syncStatus,
      ticketStatusMap,
      ticketMonthMap,
      updateExisting: syncUpdateExisting,
      clearUploadedPages: autoClearImages,
      duplicateAction,
    });
    setShowDuplicateModal(false);
    setPendingDuplicates([]);
    setJustSyncedSuccess(true);
    setTimeout(() => setJustSyncedSuccess(false), 4000);
  };

  const handleCancelSync = () => {
    setShowDuplicateModal(false);
    setPendingDuplicates([]);
  };

  // Close duplicate confirmation modal on ESC key
  useEffect(() => {
    if (!showDuplicateModal) return;
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape") {
        handleCancelSync();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showDuplicateModal]);
  // Input state: Unified single & batch input
  const [numberInput, setNumberInput] = useState("");
  const [inputError, setInputError] = useState<string | null>(null);
  const [inputSuccess, setInputSuccess] = useState<string | null>(null);

  // Edit inline state
  const [editingNumber, setEditingNumber] = useState<number | null>(null);
  const [editValue, setEditValue] = useState("");

  // Search & Filter & Sort
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<"all" | "ai" | "manual" | "lowConfidence" | "duplicates" | "orderDuplicates">("all");
  // Mặc định 'input': giữ nguyên đúng thứ tự người dùng nhập vào (VD: 50.57.76.100.110)
  const [sortOrder, setSortOrder] = useState<"input" | "asc" | "desc">("input");

  // Visual document inspector states
  const [showOverlays, setShowOverlays] = useState(true);
  const [overlayMode, setOverlayMode] = useState<"subtle" | "hover-only" | "corners">("subtle");
  const [showLabels, setShowLabels] = useState(true);
  const [zoomLevel, setZoomLevel] = useState(1);
  const [hoveredNumber, setHoveredNumber] = useState<number | null>(null);
  const [selectedNumber, setSelectedNumber] = useState<number | null>(null);

  // Click-to-detect missing numbers in visual document inspector
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

  // Close spot scan popover on Escape key
  useEffect(() => {
    const handleKeyDown = (e: globalThis.KeyboardEvent) => {
      if (e.key === "Escape" && spotScan) {
        setSpotScan(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [spotScan]);

  // Kích chuột vào ảnh để nhận diện số phiếu còn thiếu
  const handleImageClick = async (e: React.MouseEvent<HTMLDivElement>) => {
    if (!activePage || !activePage.preview) return;
    if (!isClickDetectMode) return;

    const target = e.target as HTMLElement;
    // Bỏ qua nếu bấm vào khung số đã có, nút bấm hoặc ô nhập
    if (
      target.closest("[data-detected-box]") ||
      target.closest("button") ||
      target.closest("input")
    ) {
      return;
    }

    const container = imgContainerRef.current;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const relX = Math.max(0, Math.min(1, clientX / rect.width));
    const relY = Math.max(0, Math.min(1, clientY / rect.height));

    const clickXNorm = relX * 1000;
    const clickYNorm = relY * 1000;

    try {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = activePage.preview;
      await img.decode();

      const natW = img.naturalWidth || 800;
      const natH = img.naturalHeight || 1000;

      // Cắt vùng ảnh cận cảnh xung quanh điểm bấm (khoảng 20% rộng x 10% cao)
      const cropW = Math.min(natW, Math.max(160, Math.round(natW * 0.2)));
      const cropH = Math.min(natH, Math.max(90, Math.round(natH * 0.1)));

      const clickNatX = relX * natW;
      const clickNatY = relY * natH;

      const cropLeft = Math.max(
        0,
        Math.min(natW - cropW, Math.round(clickNatX - cropW / 2))
      );
      const cropTop = Math.max(
        0,
        Math.min(natH - cropH, Math.round(clickNatY - cropH / 2))
      );

      const canvas = document.createElement("canvas");
      canvas.width = cropW;
      canvas.height = cropH;
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.drawImage(img, cropLeft, cropTop, cropW, cropH, 0, 0, cropW, cropH);
      }
      const cropBase64 = canvas.toDataURL("image/jpeg", 0.95);

      const cropBoxOnFullImage = {
        ymin: (cropTop / natH) * 1000,
        xmin: (cropLeft / natW) * 1000,
        ymax: ((cropTop + cropH) / natH) * 1000,
        xmax: ((cropLeft + cropW) / natW) * 1000,
      };

      setSpotScan({
        pageId: activePage.id,
        clickRelX: relX,
        clickRelY: relY,
        cropBase64,
        status: "scanning",
        detectedNum: null,
        manualInputVal: "",
        mappedBox: [
          Math.max(0, Math.round(clickYNorm - 25)),
          Math.max(0, Math.round(clickXNorm - 35)),
          Math.min(1000, Math.round(clickYNorm + 25)),
          Math.min(1000, Math.round(clickXNorm + 35)),
        ],
      });

      const res = await fetch("/api/ocr-spot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageBase64: cropBase64, mimeType: "image/jpeg" }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(
          data?.error || "Không thể nhận diện số phiếu tại điểm bấm"
        );
      }

      if (
        data.number &&
        typeof data.number === "number" &&
        data.number >= 1 &&
        data.number <= 1500
      ) {
        let mappedBox = [
          Math.max(0, Math.round(clickYNorm - 25)),
          Math.max(0, Math.round(clickXNorm - 35)),
          Math.min(1000, Math.round(clickYNorm + 25)),
          Math.min(1000, Math.round(clickXNorm + 35)),
        ];

        if (Array.isArray(data.box) && data.box.length === 4) {
          const boxHeight = cropBoxOnFullImage.ymax - cropBoxOnFullImage.ymin;
          const boxWidth = cropBoxOnFullImage.xmax - cropBoxOnFullImage.xmin;

          mappedBox = [
            Math.max(
              0,
              Math.min(
                1000,
                Math.round(
                  cropBoxOnFullImage.ymin + (data.box[0] / 1000) * boxHeight
                )
              )
            ),
            Math.max(
              0,
              Math.min(
                1000,
                Math.round(
                  cropBoxOnFullImage.xmin + (data.box[1] / 1000) * boxWidth
                )
              )
            ),
            Math.max(
              0,
              Math.min(
                1000,
                Math.round(
                  cropBoxOnFullImage.ymin + (data.box[2] / 1000) * boxHeight
                )
              )
            ),
            Math.max(
              0,
              Math.min(
                1000,
                Math.round(
                  cropBoxOnFullImage.xmin + (data.box[3] / 1000) * boxWidth
                )
              )
            ),
          ];
        }

        setSpotScan((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: "detected",
            detectedNum: data.number,
            manualInputVal: String(data.number),
            mappedBox,
          };
        });
      } else {
        setSpotScan((prev) => {
          if (!prev) return null;
          return {
            ...prev,
            status: "not_found",
            detectedNum: null,
            manualInputVal: "",
          };
        });
      }
    } catch (err: any) {
      setSpotScan((prev) => {
        if (!prev) return null;
        return {
          ...prev,
          status: "error",
          errorMessage: err.message || "Lỗi khi quét điểm ảnh",
        };
      });
    }
  };

  const handleConfirmAddSpotNumber = (numOverride?: number) => {
    if (!spotScan || !activePage) return;
    const rawNum =
      numOverride ??
      (spotScan.manualInputVal
        ? parseInt(spotScan.manualInputVal, 10)
        : spotScan.detectedNum);
    if (!rawNum || isNaN(rawNum) || rawNum < 1 || rawNum > 1500) return;

    if (onAddNumberToPage) {
      onAddNumberToPage(spotScan.pageId, rawNum, spotScan.mappedBox);
    } else {
      onAddManualNumber(rawNum);
    }

    setSelectedNumber(rawNum);
    setSpotScan(null);
  };

  // Xóa số phiếu khi nhấn chuột 2 lần vào khung số trên ảnh chứng từ
  const handleDoubleClickNumberOnImage = (num: number) => {
    if (selectedNumber === num) {
      setSelectedNumber(null);
    }
    if (hoveredNumber === num) {
      setHoveredNumber(null);
    }
    if (spotScan) {
      setSpotScan(null);
    }
    onRemoveNumber(num);
  };

  // Copy toast
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Collect all AI-scanned numbers
  const aiScannedSet = useMemo(() => {
    const s = new Set<number>();
    pages.forEach((p) => p.numbers.forEach((n) => s.add(n)));
    return s;
  }, [pages]);

  // Collect low confidence numbers
  const lowConfidenceSet = useMemo(() => {
    const s = new Set<number>();
    pages.forEach((p) => (p.lowConfidence || []).forEach((n) => s.add(n)));
    return s;
  }, [pages]);

  // Compute duplicate occurrences
  const duplicateNumbers = useMemo(() => {
    const counts = new Map<number, number>();
    // Count from all pages
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

  // Filtered & Sorted list of numbers
  const displayNumbers = useMemo(() => {
    let list = [...allNumbers];

    // Filter by type
    if (filterType === "ai") {
      list = list.filter((n) => aiScannedSet.has(n));
    } else if (filterType === "manual") {
      list = list.filter((n) => manualNumbers.includes(n));
    } else if (filterType === "lowConfidence") {
      list = list.filter((n) => lowConfidenceSet.has(n));
    } else if (filterType === "duplicates") {
      list = list.filter((n) => duplicateNumbers.has(n));
    } else if (filterType === "orderDuplicates") {
      list = list.filter((n) => orderTicketSet.has(String(n).trim().toLowerCase()));
    }

    // Filter by individual status
    if (statusFilter !== "all") {
      list = list.filter((n) => (ticketStatusMap[n] || syncStatus) === statusFilter);
    }

    // Filter by search
    if (searchTerm.trim()) {
      const term = searchTerm.trim();
      list = list.filter((n) => n.toString().includes(term));
    }

    // Sort: khi là 'input' thì giữ nguyên thứ tự nhập gốc (VD: 50.57.76.100.110)
    if (sortOrder === "asc") {
      list.sort((a, b) => a - b);
    } else if (sortOrder === "desc") {
      list.sort((a, b) => b - a);
    }

    return list;
  }, [allNumbers, filterType, statusFilter, ticketStatusMap, syncStatus, searchTerm, sortOrder, aiScannedSet, manualNumbers, lowConfidenceSet, duplicateNumbers, orderTicketSet]);

  const handleToggleSelectNumber = (num: number) => {
    setSelectedNumbers((prev) =>
      prev.includes(num) ? prev.filter((n) => n !== num) : [...prev, num]
    );
  };

  const handleSelectAll = () => {
    setSelectedNumbers([...displayNumbers]);
  };

  const handleDeselectAll = () => {
    setSelectedNumbers([]);
  };

  const dupNums = useMemo(() => {
    return displayNumbers.filter((n) =>
      orderTicketSet.has(String(n).trim().toLowerCase())
    );
  }, [displayNumbers, orderTicketSet]);

  const isAllDupsSelected =
    dupNums.length > 0 && dupNums.every((n) => selectedNumbers.includes(n));

  const handleSelectDuplicatesOnly = () => {
    if (isAllDupsSelected) {
      setSelectedNumbers((prev) => prev.filter((n) => !dupNums.includes(n)));
    } else {
      setSelectedNumbers((prev) => Array.from(new Set([...prev, ...dupNums])));
    }
  };

  const handleDeleteSelected = () => {
    if (selectedNumbers.length === 0) return;
    if (onRemoveBatchNumbers) {
      onRemoveBatchNumbers(selectedNumbers);
    } else {
      selectedNumbers.forEach((n) => onRemoveNumber(n));
    }
    setTicketStatusMap((prev) => {
      const next = { ...prev };
      selectedNumbers.forEach((n) => delete next[n]);
      return next;
    });
    setSelectedNumbers([]);
  };

  // Share List modal state & configuration
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [shareScope, setShareScope] = useState<"all" | "selected">("all");
  const [shareFormat, setShareFormat] = useState<"detailed" | "compact" | "numbered">("detailed");
  const [shareCopied, setShareCopied] = useState(false);

  // Active numbers to share
  const shareNumbers = useMemo(() => {
    if (shareScope === "selected" && selectedNumbers.length > 0) {
      const selected = [...selectedNumbers];
      if (sortOrder === "asc") selected.sort((a, b) => a - b);
      else if (sortOrder === "desc") selected.sort((a, b) => b - a);
      return selected;
    }
    return displayNumbers.length > 0 ? displayNumbers : allNumbers;
  }, [shareScope, selectedNumbers, displayNumbers, allNumbers, sortOrder]);

  const formattedShareText = useMemo(() => {
    if (shareNumbers.length === 0) return "Chưa có số phiếu nào trong danh sách.";

    if (shareFormat === "compact") {
      return shareNumbers.join(", ");
    }

    if (shareFormat === "numbered") {
      return shareNumbers.map((n, i) => `#${i + 1}: ${n}`).join("\n");
    }

    // Detailed format
    const lines: string[] = [];
    lines.push("📋 DANH SÁCH SỐ PHIẾU GIAO HÀNG KHO");
    lines.push(`📅 Ngày: ${formatDateDDMMYYYY(syncDate || recordDate || getLocalTodayISO())}`);
    lines.push(`📊 Tổng số: ${shareNumbers.length} số phiếu`);
    if (syncVehicle || vehicleNumber) lines.push(`🚛 Số xe: ${syncVehicle || vehicleNumber}`);
    if (syncDriver || driverName) lines.push(`👤 Người giao: ${syncDriver || driverName}`);
    if (syncCustomer || customerName) lines.push(`🏢 Khách hàng: ${syncCustomer || customerName}`);
    if (syncArea || area) lines.push(`📍 Khu vực: ${syncArea || area}`);
    lines.push("--------------------------------");
    lines.push("📌 Danh sách số phiếu:");
    lines.push(shareNumbers.join(", "));
    return lines.join("\n");
  }, [shareNumbers, shareFormat, syncDate, recordDate, syncVehicle, vehicleNumber, syncDriver, driverName, syncCustomer, customerName, syncArea, area]);

  const handleShareNative = async () => {
    if (navigator?.share) {
      try {
        await navigator.share({
          title: `Danh sách số phiếu kho (${shareNumbers.length} số phiếu)`,
          text: formattedShareText,
        });
        return;
      } catch {
        // User canceled or failed
      }
    }
    handleCopyShareText();
  };

  const handleCopyShareText = () => {
    navigator.clipboard.writeText(formattedShareText).then(() => {
      setShareCopied(true);
      setTimeout(() => setShareCopied(false), 2500);
    });
  };

  const handleDownloadShareTxt = () => {
    const blob = new Blob([formattedShareText], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `Danh_Sach_So_Phieu_Kho_${formatDateDDMMYYYY(syncDate || getLocalTodayISO()).replace(/\//g, "-")}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Merged: Add number(s) (Chức năng gộp chung: thêm 1 số hoặc nhập hàng loạt nhiều số)
  const handleAddNumbers = () => {
    setInputError(null);
    setInputSuccess(null);

    const trimmed = numberInput.trim();
    if (!trimmed) {
      setInputError("Vui lòng nhập số phiếu kho (VD: 145 hoặc 12, 15 28 44).");
      return;
    }

    const matches = trimmed.match(/\d+/g);
    if (!matches || matches.length === 0) {
      setInputError("Không tìm thấy số phiếu hợp lệ nào. Vui lòng nhập số nguyên từ 1 đến 1500.");
      return;
    }

    const rawNumbers = matches.map((m) => parseInt(m, 10));

    // Lọc các số hợp lệ (1 - 1500), loại bỏ trùng lặp trong chuỗi vừa nhập
    const validUniqueNums: number[] = [];
    rawNumbers.forEach((n) => {
      if (!isNaN(n) && n >= 1 && n <= 1500 && !validUniqueNums.includes(n)) {
        validUniqueNums.push(n);
      }
    });

    const outOfRange = rawNumbers.filter((n) => isNaN(n) || n < 1 || n > 1500);

    if (validUniqueNums.length === 0) {
      setInputError("Tất cả các số đã nhập đều ngoài phạm vi hợp lệ (số phiếu phải từ 1 đến 1500).");
      return;
    }

    // Nếu người dùng chỉ nhập 1 số
    if (rawNumbers.length === 1 && validUniqueNums.length === 1) {
      const singleNum = validUniqueNums[0];
      if (allNumbers.includes(singleNum)) {
        setInputError(`Số phiếu ${singleNum} đã có trong danh sách phiếu kho.`);
        return;
      }
      onAddManualNumber(singleNum);
      handleSetTicketStatus(singleNum, addInputStatus);
      handleSetTicketMonth(singleNum, addInputMonth);
      setNumberInput("");
      setIsDetailsOpen(true);
      const stLabel = STATUS_OPTIONS.find((s) => s.value === addInputStatus)?.label || addInputStatus;
      let msg = `Đã thêm số phiếu ${singleNum} (Tháng ${addInputMonth} - ${stLabel}) thành công.`;
      if (isTicketDuplicateInMonth(singleNum, addInputMonth)) {
        msg += ` ⚠️ CẢNH BÁO TRÙNG ĐƠN: Số phiếu ${singleNum} đã tồn tại trong Danh Sách Đơn Hàng Tháng ${addInputMonth}.`;
      }
      setInputSuccess(msg);
      setTimeout(() => setInputSuccess(null), 4000);
      return;
    }

    // Nếu người dùng nhập / dán nhiều số (hàng loạt)
    const newNumsToAdd = validUniqueNums.filter((n) => !allNumbers.includes(n));
    const alreadyExistingNums = validUniqueNums.filter((n) => allNumbers.includes(n));

    if (newNumsToAdd.length === 0) {
      setInputError(
        `Tất cả ${validUniqueNums.length} số đã nhập đều đã có trong danh sách (${validUniqueNums.slice(0, 6).join(", ")}${validUniqueNums.length > 6 ? "..." : ""}).`
      );
      return;
    }

    onAddBatchNumbers(newNumsToAdd);
    handleBatchSetTicketStatus(newNumsToAdd, addInputStatus);
    handleBatchSetTicketMonth(newNumsToAdd, addInputMonth);
    setNumberInput("");
    setIsDetailsOpen(true);

    const stLabel = STATUS_OPTIONS.find((s) => s.value === addInputStatus)?.label || addInputStatus;
    let successMsg = `Đã thêm thành công ${newNumsToAdd.length} số phiếu mới (Tháng ${addInputMonth} - ${stLabel})`;
    if (alreadyExistingNums.length > 0) {
      successMsg += ` (đã bỏ qua ${alreadyExistingNums.length} số đã có: ${alreadyExistingNums.slice(0, 5).join(", ")}${alreadyExistingNums.length > 5 ? "..." : ""})`;
    }
    if (outOfRange.length > 0) {
      successMsg += ` (bỏ qua ${outOfRange.length} số ngoài 1-1500)`;
    }
    const dups = newNumsToAdd.filter((n) => isTicketDuplicateInMonth(n, addInputMonth));
    if (dups.length > 0) {
      successMsg += ` ⚠️ CẢNH BÁO TRÙNG ĐƠN: Có ${dups.length} số phiếu đã tồn tại trong Danh Sách Đơn Hàng Tháng ${addInputMonth} (${dups.slice(0, 6).join(", ")}${dups.length > 6 ? "..." : ""})`;
    }
    setInputSuccess(successMsg);
    setTimeout(() => setInputSuccess(null), 5000);
  };

  const handleKeyDownNumbers = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      e.preventDefault();
      handleAddNumbers();
    }
  };

  const handlePasteNumbers = (e: React.ClipboardEvent<HTMLInputElement>) => {
    const pasteText = e.clipboardData.getData("text");
    if (pasteText && (pasteText.includes("\n") || pasteText.includes("\r"))) {
      e.preventDefault();
      const cleanText = pasteText.replace(/\r?\n+/g, " ").trim();
      setNumberInput((prev) => (prev ? prev.trim() + " " + cleanText : cleanText));
      setInputError(null);
    }
  };

  // Save inline edit
  const handleSaveEdit = (oldNum: number) => {
    const parsed = parseInt(editValue.trim(), 10);
    if (isNaN(parsed) || parsed < 1 || parsed > 1500) {
      alert("Số phiếu phải từ 1 đến 1500.");
      return;
    }
    if (parsed !== oldNum && allNumbers.includes(parsed)) {
      alert(`Số phiếu ${parsed} đã tồn tại trong danh sách.`);
      return;
    }
    onEditNumber(oldNum, parsed);
    if (ticketStatusMap[oldNum]) {
      setTicketStatusMap((prev) => {
        const next = { ...prev };
        next[parsed] = prev[oldNum];
        delete next[oldNum];
        return next;
      });
    }
    if (ticketMonthMap[oldNum]) {
      setTicketMonthMap((prev) => {
        const next = { ...prev };
        next[parsed] = prev[oldNum];
        delete next[oldNum];
        return next;
      });
    }
    setEditingNumber(null);
    setEditValue("");
  };

  // Copy to clipboard
  const handleCopyNumbers = (format: "comma" | "newline") => {
    const text = format === "comma" ? displayNumbers.join(", ") : displayNumbers.join("\n");
    navigator.clipboard.writeText(text).then(() => {
      setCopiedText(format === "comma" ? "Đã sao chép (phân cách phẩy)!" : "Đã sao chép (xuống dòng)!");
      setTimeout(() => setCopiedText(null), 2500);
    });
  };

  // Export to CSV
  const handleExportCSV = () => {
    let csv = "\uFEFF";
    csv += "BÁO CÁO DANH SÁCH SỐ GIAO HÀNG KHO\n";
    csv += `Ngày giao hàng: ,${formatDateDDMMYYYY(recordDate) || recordDate || "Chưa chọn"}\n`;
    csv += `Người giao nhận hàng: ,${driverName || "Chưa nhập"}\n`;
    csv += `Khách hàng: ,${customerName || "Chưa nhập"}\n`;
    csv += `Tổng số phiếu kho: ,${allNumbers.length}\n\n`;

    csv += "STT,Số phiếu kho,Nguồn nhận diện,Ghi chú\n";
    allNumbers
      .slice()
      .sort((a, b) => a - b)
      .forEach((num, index) => {
        const isAi = aiScannedSet.has(num);
        const isManual = manualNumbers.includes(num);
        const source = isAi && isManual ? "Quét AI + Thêm tay" : isAi ? "Quét AI" : "Thêm tay";
        const note = duplicateNumbers.has(num) ? "Trùng lặp" : lowConfidenceSet.has(num) ? "Trùng" : "";
        csv += `${index + 1},${num},"${source}","${note}"\n`;
      });

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const cleanDate = recordDate || new Date().toISOString().slice(0, 10);
    link.setAttribute("href", url);
    link.setAttribute("download", `danh_sach_so_kho_${cleanDate}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  // Currently active page for visual inspector
  const activePage = useMemo(() => {
    if (pages.length === 0) return null;
    if (!activePreviewPageId) return pages[0];
    return pages.find((p) => p.id === activePreviewPageId) || pages[0];
  }, [pages, activePreviewPageId]);

  const activePageIndex = pages.findIndex((p) => p.id === activePage?.id);

  // Box style normalized from 0-1000
  const getBoxStyle = (box: number[]) => {
    if (!box || box.length !== 4) return {};
    const [ymin, xmin, ymax, xmax] = box;
    return {
      top: `${ymin / 10}%`,
      left: `${xmin / 10}%`,
      width: `${(xmax - xmin) / 10}%`,
      height: `${(ymax - ymin) / 10}%`,
    };
  };

  return (
    <div className="space-y-4">
      {/* 1. KHU VỰC: THÊM SỐ PHIẾU */}
      <div className="bg-white rounded-2xl border border-emerald-200/90 shadow-xs p-4 sm:p-5 font-sans">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3.5 border-b border-emerald-100">
          <div className="flex items-center gap-2.5">
            <span className="p-2 bg-emerald-700 text-white rounded-xl shadow-xs">
              <Plus className="w-4 h-4" />
            </span>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm sm:text-base font-black text-emerald-950 uppercase tracking-wide">
                  THÊM SỐ PHIẾU
                </h2>
                <span className="text-[11px] font-mono font-bold px-2.5 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full">
                  {allNumbers.length} số phiếu
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium mt-0.5">
                Nhập 1 số hoặc dán nhiều số (VD: 50.57.76.100.110 hoặc 12, 15, 28) - Nhấn Enter để thêm
              </p>
            </div>
          </div>

          {/* Nút THU GỌN / MỞ RỘNG */}
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setIsDetailsOpen((prev) => !prev)}
              className={`inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer shadow-2xs ${
                isDetailsOpen
                  ? "bg-emerald-100 hover:bg-emerald-200 text-emerald-900 border border-emerald-300"
                  : "bg-emerald-700 hover:bg-emerald-800 text-white shadow-emerald-700/20"
              }`}
              title={
                isDetailsOpen
                  ? "Thu gọn hai khu vực Số Phiếu Giao Nhận & Thông Tin Số Phiếu"
                  : "Mở rộng hai khu vực Số Phiếu Giao Nhận & Thông Tin Số Phiếu"
              }
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>
                {isDetailsOpen
                  ? "Thu Gọn Số Phiếu & Chi Tiết ▲"
                  : `Mở Rộng Số Phiếu & Chi Tiết (${allNumbers.length}) ▼`}
              </span>
            </button>
          </div>
        </div>

        {/* Khối nhập số phiếu */}
          <div className="flex flex-col md:flex-row items-stretch md:items-center gap-2.5">
            <div className="relative flex-1">
              <input
                type="text"
                value={numberInput}
                onChange={(e) => {
                  setNumberInput(e.target.value);
                  setInputError(null);
                  setInputSuccess(null);
                }}
                onKeyDown={handleKeyDownNumbers}
                onPaste={handlePasteNumbers}
                placeholder="Nhập hoặc dán các số phiếu (VD: 50.57.76.100.110 hoặc 12, 15, 28)... nhấn Enter để thêm"
                className="w-full text-xs font-semibold px-3.5 py-2.5 rounded-xl border border-emerald-300 bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/25 focus:border-emerald-600 placeholder:text-gray-400 shadow-2xs pr-8 text-slate-900"
              />
              {numberInput && (
                <button
                  type="button"
                  onClick={() => {
                    setNumberInput("");
                    setInputError(null);
                    setInputSuccess(null);
                  }}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-0.5 rounded cursor-pointer"
                  title="Xóa ô nhập"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Tháng khi thêm số phiếu - Mặc định là tháng hiện tại hệ thống */}
            <div className="flex items-center gap-1.5 shrink-0 bg-indigo-50/80 px-2.5 py-1.5 rounded-xl border border-indigo-200">
              <label className="text-[11px] font-bold text-indigo-950 whitespace-nowrap flex items-center gap-1">
                <Calendar className="w-3 h-3 text-indigo-700" />
                Tháng:
              </label>
              <select
                value={addInputMonth}
                onChange={(e) => setAddInputMonth(Number(e.target.value))}
                className="text-xs font-bold px-2 py-1 bg-white text-indigo-950 rounded-lg border border-indigo-300 shadow-2xs cursor-pointer font-mono"
                title="Chọn tháng khi thêm số phiếu mới (Mặc định là tháng hiện tại của hệ thống)"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                  <option key={m} value={m}>
                    Tháng {m} {m === currentSystemMonth ? "(Hiện tại)" : ""}
                  </option>
                ))}
              </select>
            </div>

            {/* Trạng thái khi thêm */}
            <div className="flex items-center gap-1.5 shrink-0 bg-emerald-50/80 px-2.5 py-1.5 rounded-xl border border-emerald-200">
              <label className="text-[11px] font-bold text-emerald-950 whitespace-nowrap">
                Trạng thái:
              </label>
              <select
                value={addInputStatus}
                onChange={(e) => setAddInputStatus(e.target.value as OrderStatus)}
                className={`text-xs font-bold px-2 py-1 bg-white rounded-lg border shadow-2xs cursor-pointer ${getStatusBadgeStyle(addInputStatus).text} ${getStatusBadgeStyle(addInputStatus).border}`}
                title="Chọn trạng thái đơn hàng khi thêm số phiếu mới"
              >
                {STATUS_OPTIONS.map((st) => (
                  <option key={st.value} value={st.value}>
                    {st.label}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              onClick={handleAddNumbers}
              className="inline-flex items-center justify-center gap-1.5 text-xs font-bold px-4 py-2.5 bg-emerald-700 hover:bg-emerald-800 active:scale-98 text-white rounded-xl transition-all cursor-pointer shadow-xs whitespace-nowrap"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm Số Phiếu</span>
            </button>
          </div>

          {inputError && (
            <p className="text-[11.5px] text-red-600 font-semibold mt-2 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
              <span>{inputError}</span>
            </p>
          )}

          {inputSuccess && (
            <p className="text-[11.5px] text-emerald-800 font-bold mt-2 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
              <span>{inputSuccess}</span>
            </p>
          )}

        {/* Chỉ dẫn tiện ích khi 2 khu vực đang thu gọn */}
        {!isDetailsOpen && allNumbers.length > 0 && (
          <div className="mt-3.5 pt-2.5 border-t border-emerald-100/70 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600 bg-emerald-50/50 p-2.5 rounded-xl border border-emerald-200/50">
            <span className="flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Đang có <strong>{allNumbers.length}</strong> số phiếu giao nhận sẵn sàng. Hai khu vực SỐ PHIẾU GIAO NHẬN và THÔNG TIN SỐ PHIẾU đang được thu gọn gọn gàng.
            </span>
            <button
              type="button"
              onClick={() => setIsDetailsOpen(true)}
              className="text-emerald-700 font-bold hover:underline cursor-pointer text-left sm:text-right"
            >
              Mở rộng để xem & cập nhật ➔
            </button>
          </div>
        )}
      </div>

      {/* 2 & 3. KHU VỰC: SỐ PHIẾU GIAO NHẬN & THÔNG TIN SỐ PHIẾU (Tự động ẩn/hiện) */}
      <AnimatePresence>
        {isDetailsOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.25, ease: "easeInOut" }}
            className="space-y-4 overflow-hidden"
          >
            {/* 2. KHU VỰC: SỐ PHIẾU GIAO NHẬN */}
        <div className="mt-3.5 pt-3.5 border-t border-emerald-200/80 bg-white/75 backdrop-blur-xs p-3 sm:p-4 rounded-2xl border border-emerald-300/80 shadow-2xs">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 pb-2.5 border-b border-emerald-200/70">
            <div className="flex items-center gap-2">
              <span className="p-1 bg-teal-700 text-white rounded-lg shadow-2xs">
                <Sliders className="w-3.5 h-3.5" />
              </span>
              <span className="text-xs sm:text-sm font-black text-emerald-950 uppercase tracking-wide">
                SỐ PHIẾU GIAO NHẬN
              </span>
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 bg-emerald-100 text-emerald-900 border border-emerald-300 rounded-full">
                {allNumbers.length} số phiếu
              </span>
              {selectedNumbers.length > 0 && (
                <span className="text-[10px] font-bold px-2 py-0.5 bg-amber-100 text-amber-900 border border-amber-300 rounded-full">
                  Đã chọn {selectedNumbers.length}/{allNumbers.length} đơn
                </span>
              )}
            </div>

            {/* Global Actions & Toggle */}
            <div className="flex flex-wrap items-center gap-2">
              {allNumbers.length > 0 && (
                <>
                  {/* Nút Chọn tất cả / Bỏ chọn hàng loạt */}
                  <button
                    type="button"
                    onClick={() => {
                      if (selectedNumbers.length === allNumbers.length && allNumbers.length > 0) {
                        handleDeselectAll();
                      } else {
                        setSelectedNumbers([...allNumbers]);
                      }
                    }}
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-2.5 py-1.5 rounded-xl border transition-all cursor-pointer shadow-2xs ${
                      selectedNumbers.length > 0
                        ? "bg-emerald-100/90 text-emerald-900 border-emerald-400"
                        : "bg-white text-slate-700 border-slate-300 hover:bg-slate-50"
                    }`}
                    title={
                      selectedNumbers.length === allNumbers.length
                        ? "Bỏ chọn tất cả số phiếu"
                        : "Chọn tất cả các số phiếu để thao tác hàng loạt"
                    }
                  >
                    {selectedNumbers.length === allNumbers.length && allNumbers.length > 0 ? (
                      <CheckSquare className="w-3.5 h-3.5 text-emerald-700" />
                    ) : (
                      <Square className="w-3.5 h-3.5 text-slate-500" />
                    )}
                    <span>
                      {selectedNumbers.length > 0
                        ? `Đã chọn (${selectedNumbers.length}/${allNumbers.length})`
                        : "Chọn hàng loạt"}
                    </span>
                  </button>

                  {/* Xóa các đơn đã chọn (nếu có chọn) */}
                  {selectedNumbers.length > 0 && (
                    <button
                      type="button"
                      onClick={handleDeleteSelected}
                      className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 px-2.5 py-1.5 rounded-xl border border-red-200 hover:border-red-600 transition-all cursor-pointer shadow-2xs active:scale-95"
                      title={`Xóa ${selectedNumbers.length} số phiếu đã chọn`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>Xóa ({selectedNumbers.length}) đã chọn</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={handleClearAllWarehouseNumbers}
                    className="inline-flex items-center gap-1.5 text-xs font-bold text-red-700 hover:text-white bg-red-50 hover:bg-red-600 px-3 py-1.5 rounded-xl border border-red-200 hover:border-red-600 transition-all cursor-pointer shadow-2xs active:scale-95"
                    title="Xóa tất cả các mục này khỏi danh sách số phiếu kho"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Xóa tất cả</span>
                  </button>
                </>
              )}

              {allNumbers.length > 0 && (
                <button
                  type="button"
                  onClick={() => setIsPerTicketStatusOpen(!isPerTicketStatusOpen)}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-100/70 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-300 transition-colors cursor-pointer"
                  title={isPerTicketStatusOpen ? "Thu gọn danh sách" : "Mở rộng danh sách"}
                >
                  <span>{isPerTicketStatusOpen ? "Thu gọn" : "Xem chi tiết"}</span>
                  {isPerTicketStatusOpen ? (
                    <ChevronUp className="w-3.5 h-3.5" />
                  ) : (
                    <ChevronDown className="w-3.5 h-3.5" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Thông báo hướng dẫn / kết quả khi thao tác đổi trạng thái & tháng */}
          {inputError && (
            <p className="text-[11.5px] text-red-700 bg-red-50 border border-red-200 px-3 py-1.5 rounded-xl font-bold my-2 flex items-center gap-1.5 shadow-2xs">
              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{inputError}</span>
            </p>
          )}
          {inputSuccess && (
            <p className="text-[11.5px] text-emerald-900 bg-emerald-50 border border-emerald-300 px-3 py-1.5 rounded-xl font-bold my-2 flex items-center gap-1.5 shadow-2xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{inputSuccess}</span>
            </p>
          )}

          {/* BẢNG CÔNG CỤ ĐỔI HÀNG LOẠT: 1. ĐỔI TRẠNG THÁI & 2. ĐỔI THÁNG (Chỉ đổi khi đã tích chọn đơn hàng) */}
          {allNumbers.length > 0 && (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 my-3">
              {/* 1. KHỐI ĐỔI TRẠNG THÁI HÀNG LOẠT */}
              <div className="p-3 bg-linear-to-r from-slate-50 to-emerald-50/60 rounded-xl border border-emerald-200/90 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11.5px] font-bold text-slate-800 flex items-center gap-1.5">
                      <Sliders className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
                      <span>
                        {selectedNumbers.length > 0
                          ? `Đổi ${selectedNumbers.length} đơn đã tích chọn sang:`
                          : "Tích chọn đơn để đổi trạng thái:"}
                      </span>
                    </span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border shadow-2xs ${getStatusBadgeStyle(batchStatusTarget).badge}`}>
                      {STATUS_OPTIONS.find((s) => s.value === batchStatusTarget)?.label || batchStatusTarget}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={batchStatusTarget}
                      onChange={(e) => handleApplyBatchStatus(e.target.value as OrderStatus)}
                      className="text-xs font-bold px-2.5 py-1.5 bg-white rounded-lg border border-slate-300 shadow-2xs text-slate-800 cursor-pointer flex-1"
                    >
                      {STATUS_OPTIONS.map((st) => (
                        <option key={st.value} value={st.value}>
                          {st.label}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleApplyBatchStatus(batchStatusTarget)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-2xs whitespace-nowrap ${
                        selectedNumbers.length > 0
                          ? "bg-emerald-700 hover:bg-emerald-800 active:scale-95 text-white cursor-pointer"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300 cursor-pointer"
                      }`}
                      title={
                        selectedNumbers.length > 0
                          ? `Áp dụng trạng thái này cho ${selectedNumbers.length} số phiếu đã chọn`
                          : "Vui lòng tích chọn vào ô các đơn hàng bên dưới để đổi trạng thái"
                      }
                    >
                      {selectedNumbers.length > 0 ? `Đổi ${selectedNumbers.length} đơn` : "Đổi các đơn đã chọn"}
                    </button>
                  </div>
                </div>

                {/* Các nút chọn nhanh trạng thái */}
                <div className="flex flex-wrap items-center gap-1 mt-2 pt-2 border-t border-slate-200/60">
                  {STATUS_OPTIONS.map((st) => (
                    <button
                      key={st.value}
                      type="button"
                      onClick={() => handleApplyBatchStatus(st.value)}
                      className={`text-[9.5px] font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                        batchStatusTarget === st.value
                          ? `${getStatusBadgeStyle(st.value).badge} ring-1 ring-emerald-600 scale-102`
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      }`}
                      title={
                        selectedNumbers.length > 0
                          ? `Đổi trạng thái "${st.label}" cho ${selectedNumbers.length} đơn đã tích chọn`
                          : `Tích chọn đơn hàng bên dưới rồi bấm để đổi sang "${st.label}"`
                      }
                    >
                      {st.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* 2. KHỐI ĐỔI THÁNG HÀNG LOẠT (Tương tự như tháng của Cập Nhật Vào Danh Sách Đơn Giao Hàng & Số Phiếu Kho) */}
              <div className="p-3 bg-linear-to-r from-indigo-50/90 to-blue-50/70 rounded-xl border border-indigo-200/90 shadow-2xs flex flex-col justify-between">
                <div>
                  <div className="flex items-center justify-between gap-1 mb-1.5">
                    <span className="text-[11.5px] font-bold text-indigo-950 flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-indigo-700 shrink-0" />
                      <span>
                        {selectedNumbers.length > 0
                          ? `Đổi ${selectedNumbers.length} đơn đã tích chọn sang Tháng:`
                          : "Tích chọn đơn để đổi Tháng:"}
                      </span>
                    </span>
                    <div className="flex items-center gap-1.5 flex-wrap justify-end">
                      {batchMonthDuplicateTickets.length > 0 ? (
                        <span
                          className="px-2 py-0.5 bg-rose-100 text-rose-950 border border-rose-300 font-bold rounded-md shadow-2xs flex items-center gap-1 text-[10px]"
                          title={`Có ${batchMonthDuplicateTickets.length} số phiếu (${batchMonthDuplicateTickets.slice(0, 6).join(", ")}${batchMonthDuplicateTickets.length > 6 ? "..." : ""}) đã tồn tại trong Danh Sách Đơn Hàng Tháng ${batchMonthTarget} (Trùng Đơn)`}
                        >
                          <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                          Trùng Đơn: {batchMonthDuplicateTickets.length} số phiếu
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold rounded-md shadow-2xs flex items-center gap-1 text-[10px]">
                          <Check className="w-3 h-3 text-emerald-600 shrink-0" />
                          Không trùng đơn
                        </span>
                      )}
                      <span className="text-[10px] font-mono font-bold text-indigo-800 bg-indigo-50 border border-indigo-200/80 px-2 py-0.5 rounded-md shadow-2xs">
                        Tháng {batchMonthTarget}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <select
                      value={batchMonthTarget}
                      onChange={(e) => {
                        const m = Number(e.target.value);
                        if (!isNaN(m) && m >= 1 && m <= 12) {
                          handleApplyBatchMonth(m);
                        }
                      }}
                      className="text-xs font-bold px-2.5 py-1.5 bg-white rounded-lg border border-indigo-300 shadow-2xs text-indigo-950 cursor-pointer flex-1"
                    >
                      {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                        <option key={m} value={m}>
                          Tháng {m}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleApplyBatchMonth(batchMonthTarget)}
                      className={`text-xs font-bold px-3 py-1.5 rounded-lg transition-all shadow-2xs whitespace-nowrap ${
                        selectedNumbers.length > 0
                          ? "bg-indigo-700 hover:bg-indigo-800 active:scale-95 text-white cursor-pointer"
                          : "bg-slate-200 text-slate-600 hover:bg-slate-300 cursor-pointer"
                      }`}
                      title={
                        selectedNumbers.length > 0
                          ? `Áp dụng Tháng ${batchMonthTarget} cho ${selectedNumbers.length} số phiếu đã chọn${batchMonthDuplicateTickets.length > 0 ? ` (Trùng Đơn: ${batchMonthDuplicateTickets.length} số phiếu)` : ""}`
                          : "Vui lòng tích chọn vào ô các đơn hàng bên dưới để đổi tháng"
                      }
                    >
                      {selectedNumbers.length > 0 ? `Đổi ${selectedNumbers.length} đơn` : "Đổi các đơn đã chọn"}
                    </button>
                  </div>
                </div>

                {/* Danh sách 12 tháng chọn nhanh (1, 2, ..., 12) - Giống hoàn toàn như tháng trong Thông Tin Số Phiếu */}
                <div className="grid grid-cols-6 gap-1 mt-2 pt-2 border-t border-indigo-200/60">
                  {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                    const dupsCountForM = selectedNumbers.length > 0
                      ? selectedNumbers.filter((n) => isTicketDuplicateInMonth(n, m)).length
                      : allNumbers.filter((n) => isTicketDuplicateInMonth(n, m)).length;
                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => {
                          handleApplyBatchMonth(m);
                        }}
                        className={`relative text-[9.5px] font-mono font-bold py-1 rounded border transition-all cursor-pointer text-center ${
                          batchMonthTarget === m
                            ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs scale-105"
                            : dupsCountForM > 0
                            ? "bg-rose-50 text-rose-900 border-rose-300 hover:bg-rose-100"
                            : "bg-white text-slate-700 border-indigo-100 hover:bg-indigo-50 hover:border-indigo-300"
                        }`}
                        title={
                          selectedNumbers.length > 0
                            ? `Đổi sang Tháng ${m} cho ${selectedNumbers.length} đơn đã tích chọn${dupsCountForM > 0 ? ` (Cảnh báo: Trùng Đơn ${dupsCountForM} số phiếu)` : " (Không trùng đơn)"}`
                            : `Tích chọn đơn hàng bên dưới rồi bấm để đổi sang Tháng ${m}${dupsCountForM > 0 ? ` (Trùng Đơn: ${dupsCountForM} số phiếu)` : ""}`
                        }
                      >
                        {m}
                        {dupsCountForM > 0 && (
                          <span
                            className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-rose-500 ring-1 ring-white"
                            title={`Có ${dupsCountForM} số phiếu bị trùng đơn ở Tháng ${m}`}
                          />
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Thống kê số lượng đơn theo từng trạng thái & tháng */}
          {allNumbers.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5 my-2.5 p-2 bg-slate-50/80 rounded-xl border border-slate-200/80">
              <span className="text-[11px] font-bold text-slate-700 mr-1 flex items-center gap-1">
                Thống kê:
              </span>
              {STATUS_OPTIONS.map((st) => {
                const count = allNumbers.filter((n) => (ticketStatusMap[n] || syncStatus) === st.value).length;
                if (count === 0) return null;
                const style = getStatusBadgeStyle(st.value);
                return (
                  <span
                    key={st.value}
                    className={`text-[10.5px] font-bold px-2 py-0.5 rounded-lg border flex items-center gap-1 shadow-2xs shrink-0 ${style.badge}`}
                  >
                    <span>{st.label}:</span>
                    <span className="font-mono">{count}</span>
                  </span>
                );
              })}

              <span className="text-[11px] font-bold text-indigo-950 ml-2 mr-1 flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-indigo-700 shrink-0" /> Theo Tháng:
              </span>
              {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
                const count = allNumbers.filter((n) => (ticketMonthMap[n] ?? syncMonth) === m).length;
                if (count === 0) return null;
                return (
                  <span
                    key={m}
                    className="text-[10.5px] font-mono font-bold px-2 py-0.5 rounded-lg border border-indigo-200 bg-indigo-50 text-indigo-900 shadow-2xs shrink-0"
                    title={`${count} đơn hàng thuộc Tháng ${m}`}
                  >
                    Tháng {m}: {count}
                  </span>
                );
              })}

              {/* Thống kê trùng đơn theo tháng của từng đơn hàng */}
              {allNumbers.filter((n) => isTicketDuplicateInMonth(n, ticketMonthMap[n] ?? syncMonth)).length > 0 && (
                <span
                  className="text-[10.5px] font-bold px-2 py-0.5 rounded-lg border border-rose-300 bg-rose-100 text-rose-950 flex items-center gap-1 shadow-2xs shrink-0"
                  title="Số lượng đơn hàng đang bị trùng với Danh Sách Đơn Hàng theo tháng tương ứng"
                >
                  <AlertTriangle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>Trùng Đơn:</span>
                  <span className="font-mono">
                    {allNumbers.filter((n) => isTicketDuplicateInMonth(n, ticketMonthMap[n] ?? syncMonth)).length}
                  </span>
                </span>
              )}
            </div>
          )}

          {/* Danh sách từng đơn hàng / số phiếu kho để đổi trạng thái và tháng riêng */}
          {allNumbers.length === 0 ? (
            <div className="py-6 text-center text-slate-500 bg-white/60 rounded-xl border border-dashed border-emerald-200 mt-2">
              <FileText className="w-6 h-6 mx-auto mb-1.5 text-emerald-400" />
              <p className="text-xs font-semibold">
                Chưa có số phiếu kho nào. Hãy nhập số ở ô <b>"Thêm Số Phiếu"</b> ở trên hoặc tải ảnh phiếu giao hàng để quét tự động.
              </p>
            </div>
          ) : isPerTicketStatusOpen ? (
            <div className="max-h-[380px] sm:max-h-[440px] overflow-y-auto p-2 bg-slate-50/70 rounded-xl border border-emerald-200/80 mt-1.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-2">
                {allNumbers.map((num, idx) => {
                  const currentSt = ticketStatusMap[num] || syncStatus;
                  const currentMonth = ticketMonthMap[num] ?? syncMonth;
                  const isOrderDup = isTicketDuplicateInMonth(num, currentMonth);
                  const stStyle = getStatusBadgeStyle(currentSt);
                  const isSelected = selectedNumbers.includes(num);

                  return (
                    <div
                      key={num}
                      onClick={() => handleToggleSelectNumber(num)}
                      className={`p-2 rounded-xl border transition-all shadow-2xs cursor-pointer select-none flex flex-col justify-between gap-1.5 ${
                        isSelected
                          ? "ring-2 ring-emerald-500 border-emerald-500 bg-emerald-50/90 shadow-xs"
                          : isOrderDup
                          ? "bg-rose-50/90 border-rose-300 hover:border-rose-400 shadow-2xs"
                          : currentSt === "delivered"
                          ? "bg-white border-emerald-200 hover:border-emerald-300"
                          : `${stStyle.bg} ${stStyle.border}`
                      }`}
                    >
                      {/* Hàng 1: Checkbox + STT + Số phiếu + Badge Trùng + Nút xóa X */}
                      <div className="flex items-center justify-between gap-1 w-full">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {/* Checkbox chọn hàng loạt */}
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleToggleSelectNumber(num);
                            }}
                            className="text-gray-400 hover:text-emerald-600 transition-colors p-0.5 cursor-pointer shrink-0"
                            title={isSelected ? "Bỏ chọn số này" : "Chọn số này để đổi trạng thái hoặc tháng"}
                          >
                            {isSelected ? (
                              <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                            ) : (
                              <Square className="w-3.5 h-3.5 text-gray-300 hover:text-gray-500" />
                            )}
                          </button>

                          {/* Số thứ tự nhỏ gọn */}
                          <span className="text-[10px] text-slate-400 font-mono font-medium shrink-0">
                            #{idx + 1}
                          </span>

                          {/* Số phiếu to rõ thuần túy */}
                          <span
                            className={`font-black text-sm font-mono tracking-tight truncate ${
                              isOrderDup ? "text-rose-950 font-black" : isSelected ? "text-emerald-950 font-black" : "text-slate-900"
                            }`}
                            title={`Số phiếu kho ${num}${isOrderDup ? ` (đã có trong Danh Sách Đơn Hàng Tháng ${currentMonth})` : ""}`}
                          >
                            {num}
                          </span>

                          {/* Badge Trùng Đơn gọn gàng */}
                          {isOrderDup && (
                            <span
                              className="text-[9px] font-bold px-1 py-0.2 bg-rose-100 text-rose-950 rounded border border-rose-300 shrink-0 flex items-center gap-0.5 shadow-2xs"
                              title={`Số phiếu ${num} đã tồn tại trong Danh Sách Đơn Hàng Tháng ${currentMonth} (Trùng Đơn)`}
                            >
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-600" />
                              <span>Trùng</span>
                            </span>
                          )}
                        </div>

                        {/* Nút xóa nhanh số phiếu này */}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            onRemoveNumber(num);
                          }}
                          className="p-0.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors cursor-pointer shrink-0"
                          title={`Xóa số phiếu ${num}`}
                        >
                          <X className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Hàng 2: Selector Tháng + Selector Trạng thái compact */}
                      <div
                        className="flex items-center gap-1.5 w-full pt-1 border-t border-slate-200/50"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Selector đổi tháng compact */}
                        <div className="relative shrink-0">
                          <select
                            value={currentMonth}
                            onChange={(e) => {
                              const newM = Number(e.target.value);
                              handleSetTicketMonth(num, newM);
                              if (isTicketDuplicateInMonth(num, newM)) {
                                setInputSuccess(
                                  `Đã đổi số phiếu ${num} sang Tháng ${newM}! ⚠️ CẢNH BÁO TRÙNG ĐƠN: Số phiếu ${num} đã tồn tại trong Danh Sách Đơn Hàng Tháng ${newM}.`
                                );
                                setTimeout(() => setInputSuccess(null), 4500);
                              }
                            }}
                            className="text-[10.5px] font-bold px-1.5 py-0.5 bg-indigo-50/90 text-indigo-950 rounded-md border border-indigo-200 cursor-pointer focus:ring-1 focus:ring-indigo-400 transition-all font-mono shadow-2xs shrink-0"
                            title={`Cập nhật tháng riêng cho đơn hàng số phiếu ${num} (Hiện tại: Tháng ${currentMonth})`}
                          >
                            {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                              <option key={m} value={m}>
                                Tháng {m}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* Selector đổi trạng thái compact */}
                        <div className="relative flex-1 min-w-0">
                          <select
                            value={currentSt}
                            onChange={(e) => {
                              handleSetTicketStatus(num, e.target.value as OrderStatus);
                            }}
                            className={`w-full text-[10.5px] font-bold px-1.5 py-0.5 rounded-md border cursor-pointer focus:ring-1 transition-all shadow-2xs truncate ${stStyle.selectBg}`}
                            title={`Cập nhật trạng thái riêng cho đơn hàng số phiếu ${num}`}
                          >
                            {STATUS_OPTIONS.map((st) => (
                              <option key={st.value} value={st.value}>
                                {st.label}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-slate-500 italic mt-1">
              Đang thu gọn danh sách {allNumbers.length} số phiếu kho. Nhấn "Xem chi tiết" để xem và điều chỉnh trạng thái từng đơn hàng.
            </p>
          )}
        </div>

            {/* 3. KHU VỰC: THÔNG TIN SỐ PHIẾU */}
      <div className="my-5 p-4 sm:p-5 rounded-2xl bg-linear-to-r from-emerald-50/90 via-teal-50/60 to-blue-50/60 border-2 border-emerald-300/80 shadow-xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 pb-3.5 border-b border-emerald-200/80">
          <div>
            <div className="flex items-center gap-2">
              <span className="p-1.5 bg-emerald-600 text-white rounded-lg shadow-xs">
                <RefreshCw className="w-4 h-4" />
              </span>
              <h3 className="text-sm sm:text-base font-black text-emerald-950 uppercase tracking-wide">
                THÔNG TIN SỐ PHIẾU
              </h3>
            </div>
          </div>

          {/* Trạng thái chứng từ đã tải lên */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="px-2.5 py-1 bg-white font-semibold text-slate-700 rounded-lg border border-slate-200 shadow-2xs">
              Số phiếu kho: <strong className="text-slate-900">{allNumbers.length}</strong>
            </span>
            <span className="px-2.5 py-1 bg-white font-semibold text-slate-700 rounded-lg border border-slate-200 shadow-2xs">
              Trang chứng từ: <strong className="text-slate-900">{pages.length}</strong>
            </span>
            {orderDuplicatesCount > 0 && (
              <span
                className="px-2.5 py-1 bg-rose-100 text-rose-950 border border-rose-300 font-bold rounded-lg shadow-2xs flex items-center gap-1.5"
                title={`Có ${orderDuplicatesCount} số phiếu đã tồn tại trong Danh Sách Đơn Hàng (Trùng Đơn)`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
                Trùng Đơn: {orderDuplicatesCount} số phiếu
              </span>
            )}
            {duplicateNumbers.size > 0 && (
              <span
                className="px-2.5 py-1 bg-amber-100 text-amber-950 border border-amber-300 font-bold rounded-lg shadow-2xs flex items-center gap-1.5"
                title={`Có ${duplicateNumbers.size} số phiếu bị trùng lặp trong các trang chứng từ đã tải`}
              >
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                Trùng chứng từ: {duplicateNumbers.size} số phiếu
              </span>
            )}
            {duplicateNumbers.size === 0 && orderDuplicatesCount === 0 && allNumbers.length > 0 && (
              <span className="px-2.5 py-1 bg-emerald-50 text-emerald-800 border border-emerald-200 font-semibold rounded-lg shadow-2xs flex items-center gap-1">
                <Check className="w-3.5 h-3.5 text-emerald-600" />
                Không trùng đơn / chứng từ
              </span>
            )}
          </div>
        </div>

        {/* Thanh gợi ý thông tin đã có trước đó trong Danh Sách Đơn Hàng (Đã ẩn theo yêu cầu) */}

        {/* Input fields row: Số xe, Người giao, Khách hàng, Khu vực, Ngày giao (Đã ẩn Tháng và Trạng thái mặc định theo yêu cầu) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3 pt-3.5">
          {/* 1. Số xe */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Truck className="w-3.5 h-3.5 text-emerald-700" /> Số xe (Biển số)
            </label>
            <input
              type="text"
              list="sync-vehicle-options"
              value={syncVehicle}
              onChange={(e) => setSyncVehicle(e.target.value)}
              placeholder="VD: 60C-51100, 60H-03519..."
              className="w-full text-xs font-semibold px-3 py-2 bg-white rounded-xl border border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs font-mono"
            />
            <datalist id="sync-vehicle-options">
              {orderHistory.vehicles.map((v) => (
                <option key={v} value={v} />
              ))}
            </datalist>

            {/* Danh sách các số xe chọn nhanh */}
            {orderHistory.vehicles.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {orderHistory.vehicles.slice(0, 4).map((plate) => (
                  <button
                    key={plate}
                    type="button"
                    onClick={() => setSyncVehicle(plate)}
                    className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                      syncVehicle.trim().toLowerCase() === plate.trim().toLowerCase()
                        ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                        : "bg-white text-slate-700 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400"
                    }`}
                    title={`Chọn số xe ${plate}`}
                  >
                    {plate}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Người giao */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-emerald-700" /> Người giao
            </label>
            <input
              type="text"
              list="sync-driver-options"
              value={syncDriver}
              onChange={(e) => setSyncDriver(e.target.value)}
              placeholder="VD: Nguyễn Văn A"
              className="w-full text-xs font-semibold px-3 py-2 bg-white rounded-xl border border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
            />
            <datalist id="sync-driver-options">
              {orderHistory.drivers.map((d) => (
                <option key={d} value={d} />
              ))}
            </datalist>

            {/* Danh sách chọn nhanh Người giao */}
            {orderHistory.drivers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {orderHistory.drivers.slice(0, 4).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => setSyncDriver(d)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                      syncDriver.trim().toLowerCase() === d.trim().toLowerCase()
                        ? "bg-blue-600 text-white border-blue-600 shadow-2xs"
                        : "bg-white text-slate-700 border-blue-200 hover:bg-blue-50 hover:border-blue-400"
                    }`}
                    title={`Chọn người giao ${d}`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Khách hàng */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5 text-emerald-700" /> Khách hàng
            </label>
            <input
              type="text"
              list="sync-customer-options"
              value={syncCustomer}
              onChange={(e) => setSyncCustomer(e.target.value)}
              placeholder="VD: Cty Tân Thuận"
              className="w-full text-xs font-semibold px-3 py-2 bg-white rounded-xl border border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
            />
            <datalist id="sync-customer-options">
              {orderHistory.customers.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>

            {/* Danh sách chọn nhanh Khách hàng */}
            {orderHistory.customers.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                {orderHistory.customers.slice(0, 4).map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setSyncCustomer(c)}
                    className={`text-[10px] font-semibold px-2 py-0.5 rounded-md border transition-all cursor-pointer ${
                      syncCustomer.trim().toLowerCase() === c.trim().toLowerCase()
                        ? "bg-indigo-600 text-white border-indigo-600 shadow-2xs"
                        : "bg-white text-slate-700 border-indigo-200 hover:bg-indigo-50 hover:border-indigo-400"
                    }`}
                    title={`Chọn khách hàng ${c}`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
            {customerAutoSource && (
              <p className="text-[10px] text-emerald-700 mt-0.5 truncate font-medium" title={customerAutoSource}>
                ⚡ {customerAutoSource}
              </p>
            )}
          </div>

          {/* Khu Vực - Nằm ngay phía sau Khách hàng theo yêu cầu */}
          <div>
            <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1 flex items-center gap-1">
              <MapPin className="w-3.5 h-3.5 text-emerald-700" /> Khu vực
            </label>
            <input
              type="text"
              list="sync-area-options"
              value={syncArea}
              onChange={(e) => {
                setSyncArea(e.target.value);
                setSyncDeliveryLocation(e.target.value);
              }}
              placeholder="VD: Miền Đông, Bình Dương, Quận 12..."
              className="w-full text-xs font-semibold px-3 py-2 bg-white rounded-xl border border-emerald-300 focus:border-emerald-600 focus:ring-2 focus:ring-emerald-500/20 shadow-2xs"
            />
            <datalist id="sync-area-options">
              {orderHistory.areas.map((loc) => (
                <option key={loc} value={loc} />
              ))}
            </datalist>

            {/* Chọn nhanh khu vực */}
            <div className="flex flex-wrap items-center gap-1 mt-1.5">
              {orderHistory.areas.slice(0, 4).map((ar) => (
                <button
                  key={ar}
                  type="button"
                  onClick={() => {
                    setSyncArea(ar);
                    setSyncDeliveryLocation(ar);
                  }}
                  className={`text-[9.5px] font-semibold px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                    syncArea.trim().toLowerCase() === ar.trim().toLowerCase()
                      ? "bg-emerald-700 text-white border-emerald-700 shadow-2xs"
                      : "bg-white text-slate-600 border-emerald-200 hover:bg-emerald-50 hover:border-emerald-400"
                  }`}
                  title={`Chọn nhanh khu vực ${ar}`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>

          {/* Ngày giao - Mặc định là ngày hiện tại hệ thống */}
          <div>
            <div className="flex items-center justify-between gap-1 mb-1">
              <label className="text-[11px] font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5 text-emerald-700" /> Ngày giao
              </label>
              <button
                type="button"
                onClick={() => {
                  const today = getLocalTodayISO();
                  setSyncDate(today);
                  const m = extractMonthFromDate(today);
                  if (m) {
                    setSyncMonth(m);
                    setBatchMonthTarget(m);
                  }
                }}
                className="text-[9px] font-bold px-1.5 py-0.5 bg-emerald-100 text-emerald-800 hover:bg-emerald-200 border border-emerald-300 rounded cursor-pointer transition-colors"
                title="Đặt lại về ngày hiện tại của hệ thống"
              >
                Hôm nay
              </button>
            </div>
            <input
              type="date"
              value={syncDate}
              onChange={(e) => {
                const newD = e.target.value;
                setSyncDate(newD);
                const m = extractMonthFromDate(newD);
                if (m) {
                  setSyncMonth(m);
                  setBatchMonthTarget(m);
                }
              }}
              className="w-full text-xs font-semibold px-3 py-2 rounded-xl border focus:ring-2 shadow-2xs font-mono transition-colors bg-white text-gray-900 border-emerald-300 focus:border-emerald-600 focus:ring-emerald-500/20"
            />
            <p className="text-[10px] text-emerald-700 mt-1 font-medium">
              Mặc định: ngày hiện tại hệ thống ({formatDateDDMMYYYY(getLocalTodayISO())})
            </p>

            {/* Danh sách ngày có sẵn trong Danh Sách Đơn Hàng để chọn nhanh */}
            {existingOrderDates.length > 0 && (
              <div className="flex flex-wrap items-center gap-1 mt-1.5">
                <span className="text-[9px] text-gray-400 font-medium">Từ Danh Sách:</span>
                {existingOrderDates.slice(0, 3).map((d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => {
                      setSyncDate(d);
                      const m = extractMonthFromDate(d);
                      if (m) {
                        setSyncMonth(m);
                        setBatchMonthTarget(m);
                      }
                    }}
                    className={`text-[10px] font-mono px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                      syncDate === d
                        ? "bg-teal-700 text-white border-teal-700 font-bold shadow-2xs"
                        : "bg-white text-slate-600 border-gray-200 hover:bg-teal-50 hover:border-teal-300"
                    }`}
                    title={`Chọn ngày ${formatDateDDMMYYYY(d)} đã có trong Danh Sách`}
                  >
                    {formatDateDDMMYYYY(d)}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
        {/* Action bar and update options */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mt-4 pt-3 border-t border-emerald-200/80">
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4">
            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-emerald-950 bg-emerald-100/80 hover:bg-emerald-100 px-3 py-1.5 rounded-xl border border-emerald-300 transition-colors shadow-2xs">
              <input
                type="checkbox"
                checked={allowDuplicateToOrders}
                onChange={(e) => setAllowDuplicateToOrders(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <span>Cho cập nhật số trùng vào phần DANH SÁCH</span>
            </label>

            <label
              className="flex items-center gap-2 cursor-pointer select-none text-xs font-semibold text-slate-700 bg-amber-50/70 hover:bg-amber-100/70 px-2.5 py-1.5 rounded-xl border border-amber-200 transition-colors shadow-2xs"
              title="Chỉ thay đổi trạng thái của đơn trước đó sang 'Hoàn Thành', tất cả các thông tin trước đó giữ nguyên"
            >
              <input
                type="checkbox"
                checked={syncUpdateExisting}
                onChange={(e) => setSyncUpdateExisting(e.target.checked)}
                className="rounded text-amber-600 focus:ring-amber-500 w-4 h-4 cursor-pointer"
              />
              <span>Ghi đè thông tin đơn cũ (Chỉ đổi sang "Hoàn Thành", giữ nguyên thông tin cũ)</span>
            </label>

            <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-slate-700">
              <input
                type="checkbox"
                checked={autoClearImages}
                onChange={(e) => setAutoClearImages(e.target.checked)}
                className="rounded text-emerald-600 focus:ring-emerald-500 w-4 h-4 cursor-pointer"
              />
              <span>Tự động xóa các ảnh trong "Các trang chứng từ đã tải"</span>
            </label>
          </div>

          <div className="flex items-center gap-3">
            {justSyncedSuccess && (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-800 bg-white/95 px-3 py-1.5 rounded-xl border border-emerald-300 shadow-xs">
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                Đã cập nhật vào đơn hàng thành công!
              </span>
            )}

            <button
              type="button"
              onClick={handleTriggerSync}
              disabled={allNumbers.length === 0}
              className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-xs transition-all shadow-md cursor-pointer ${
                allNumbers.length === 0
                  ? "bg-slate-300 text-slate-500 cursor-not-allowed"
                  : "bg-linear-to-r from-emerald-600 via-teal-600 to-emerald-700 hover:from-emerald-500 hover:to-teal-600 text-white shadow-emerald-600/30 hover:shadow-lg active:scale-95 ring-2 ring-emerald-500/40"
              }`}
            >
              <RefreshCw className="w-4 h-4" />
              <span>
                Cập Nhật Vào Danh Sách Đơn Hàng ({allNumbers.length} số phiếu)
              </span>
            </button>
          </div>
        </div>
      </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Bảng Thông Báo Xác Nhận Khi Trùng Số Phiếu */}
      <AnimatePresence>
        {showDuplicateModal && (
          <div
            id="duplicate-ticket-confirm-modal"
            className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-950/70 backdrop-blur-xs font-sans"
            role="dialog"
            aria-modal="true"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 12 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 12 }}
              transition={{ duration: 0.18, ease: "easeOut" }}
              className="bg-white rounded-2xl max-w-xl w-full max-h-[92vh] flex flex-col shadow-2xl border border-amber-200 overflow-hidden"
            >
              {/* Header */}
              <div className="px-5 py-4 bg-gradient-to-r from-amber-500/15 via-orange-500/10 to-amber-50 border-b border-amber-200/80 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span className="p-2.5 bg-amber-500 text-white rounded-xl shadow-xs">
                    <AlertTriangle className="w-5 h-5 text-white" />
                  </span>
                  <div>
                    <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                      Phát Hiện Trùng Số Phiếu Kho
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 border border-amber-300">
                        {pendingDuplicates.length} số phiếu
                      </span>
                    </h3>
                    <p className="text-xs text-slate-600">
                      Vui lòng xác nhận đồng ý hoặc không đồng ý trước khi cập nhật vào đơn hàng
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleCancelSync}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
                  title="Đóng / Hủy"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4 max-h-[calc(92vh-140px)]">
                {/* Warning Summary Card */}
                <div className="p-3.5 bg-amber-50/90 rounded-xl border border-amber-200 text-xs text-amber-950 space-y-1">
                  <p className="font-semibold text-amber-900 flex items-center gap-1.5">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    Có <span className="font-bold text-amber-700 underline">{pendingDuplicates.length} số phiếu kho</span> bạn đang cập nhật đã tồn tại trong Danh Sách Đơn Hàng.
                  </p>
                  <p className="text-amber-800 text-[11.5px] pl-5.5">
                    Đợt này có <b>{allNumbers.length} số phiếu</b> (gồm <b>{allNumbers.length - pendingDuplicates.length}</b> phiếu mới và <b>{pendingDuplicates.length}</b> phiếu bị trùng).
                  </p>
                </div>

                {/* List of Duplicate Tickets */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-bold text-slate-800">
                      Chi tiết {pendingDuplicates.length} số phiếu bị trùng trong đơn hàng:
                    </label>
                    <span className="text-[11px] text-slate-500 font-medium">
                      (Thông tin hiện tại trong danh sách)
                    </span>
                  </div>

                  <div className="max-h-48 overflow-y-auto rounded-xl border border-slate-200 bg-slate-50/60 p-2 divide-y divide-slate-200">
                    {pendingDuplicates.map((num) => {
                      const existingOrder = orders.find((o) => Number(o.ticketNumber) === num && (!syncMonth || getOrderMonth(o) === syncMonth));
                      const statusLabel =
                        STATUS_OPTIONS.find((s) => s.value === existingOrder?.status)?.label ||
                        existingOrder?.status ||
                        "";

                      return (
                        <div key={num} className="py-2 px-1 first:pt-1 last:pb-1 flex items-center justify-between gap-2 text-xs">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="font-mono font-bold px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300 text-xs shrink-0">
                              #{num}
                            </span>
                            {existingOrder ? (
                              <div className="text-[11.5px] text-slate-700 truncate">
                                <span className="font-semibold text-slate-900">
                                  {existingOrder.customerName || "Chưa có tên khách"}
                                </span>
                                {existingOrder.vehicleNumber && (
                                  <span className="text-slate-500"> • Xe: {existingOrder.vehicleNumber}</span>
                                )}
                                {existingOrder.driverName && (
                                  <span className="text-slate-500"> • Người giao: {existingOrder.driverName}</span>
                                )}
                                {(existingOrder.area || existingOrder.deliveryLocation) && (
                                  <span className="text-slate-500"> • Khu vực: {existingOrder.area || existingOrder.deliveryLocation}</span>
                                )}
                              </div>
                            ) : (
                              <span className="text-slate-500 text-[11px]">Đã có trong đơn hàng</span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 shrink-0">
                            {existingOrder?.deliveryDate && (
                              <span className="text-[10.5px] text-slate-500">
                                {formatDateDDMMYYYY(existingOrder.deliveryDate)}
                              </span>
                            )}
                            {statusLabel && (
                              <span className="text-[10px] font-semibold px-2 py-0.5 rounded bg-white text-slate-700 border border-slate-200">
                                {statusLabel}
                              </span>
                            )}
                            {/* Hiện kế bên trạng thái đã giao trạng thái trùng mã */}
                            <span className="text-[10px] font-black px-2 py-0.5 rounded bg-amber-500 text-white shadow-2xs flex items-center gap-1">
                              <AlertTriangle className="w-2.5 h-2.5" />
                              Trùng mã
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Explanation of options */}
                <div className="bg-slate-50 rounded-xl p-3.5 border border-slate-200 text-xs text-slate-600 space-y-2.5">
                  <p className="font-bold text-slate-800">Quy trình xử lý khi xác nhận:</p>
                  <ul className="space-y-2 text-[11.5px]">
                    <li className="flex items-start gap-1.5">
                      <Check className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900">Cập nhật số trùng vào DANH SÁCH:</span>{" "}
                        <span>
                          Thêm tất cả các số phiếu vào <b className="text-emerald-700">DANH SÁCH</b> (bao gồm cả các đơn trùng số phiếu). Cả hai đơn hàng sẽ được lưu riêng biệt và đánh dấu huy hiệu <b className="text-amber-800">"Trùng phiếu"</b> để quản lý minh bạch.
                        </span>
                        {autoClearImages && (
                          <span className="block mt-1 text-emerald-700 font-medium">
                            • Tự động xóa các trang ảnh trong "Các trang chứng từ đã tải".
                          </span>
                        )}
                      </div>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <RefreshCw className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900">Ghi đè đơn cũ:</span>{" "}
                        <span>
                          Chỉ thay đổi trạng thái của các đơn trước đó sang <b className="text-emerald-700">"Hoàn Thành"</b>, còn tất cả các thông tin trước đó (Số xe, Người giao, Khách hàng, Ngày giao, Khu vực...) đều được <b className="text-slate-800">giữ nguyên</b> hoàn toàn.
                        </span>
                      </div>
                    </li>
                    <li className="flex items-start gap-1.5">
                      <X className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-900">Hủy bỏ:</span> Hủy thao tác cập nhật, giữ nguyên danh sách hiện tại.
                      </div>
                    </li>
                  </ul>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-col sm:flex-row items-center justify-end gap-2.5">
                <button
                  type="button"
                  onClick={handleCancelSync}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-700 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                >
                  <X className="w-4 h-4 text-slate-500" />
                  <span>Hủy bỏ</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeSync("update_existing")}
                  className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-amber-300 bg-amber-50 hover:bg-amber-100 text-amber-900 font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-2xs cursor-pointer"
                  title="Chỉ thay đổi trạng thái của đơn trước đó sang 'Hoàn Thành', giữ nguyên tất cả thông tin cũ"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-amber-700" />
                  <span>Ghi đè đơn cũ (Đổi sang "Hoàn Thành")</span>
                </button>

                <button
                  type="button"
                  onClick={() => executeSync("add_duplicate")}
                  className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-linear-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 active:scale-98 text-white font-bold text-xs transition-all shadow-md flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Đồng ý cập nhật số trùng vào DANH SÁCH</span>
                </button>
              </div>
            </motion.div>
          </div>
        )}

        {/* Share List Modal */}
        {isShareModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="bg-white rounded-2xl max-w-lg w-full overflow-hidden shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]"
            >
              {/* Modal Header */}
              <div className="px-5 py-4 bg-linear-to-r from-indigo-900 via-indigo-800 to-slate-900 text-white flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 bg-white/10 rounded-xl">
                    <Share2 className="w-5 h-5 text-indigo-300" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold flex items-center gap-2">
                      Chia Sẻ Danh Sách Số Phiếu Kho
                      <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded-full bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
                        {shareNumbers.length} số phiếu
                      </span>
                    </h3>
                    <p className="text-[11px] text-indigo-200/80">
                      Gửi nhanh qua Zalo, Tin nhắn SMS hoặc sao chép văn bản
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsShareModalOpen(false)}
                  className="p-1.5 text-white/70 hover:text-white hover:bg-white/10 rounded-xl transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Modal Body */}
              <div className="p-5 overflow-y-auto space-y-4">
                {/* Scope Selection (if some numbers are selected) */}
                {selectedNumbers.length > 0 && (
                  <div className="bg-indigo-50/70 p-3 rounded-xl border border-indigo-200/70 flex items-center justify-between">
                    <span className="text-xs font-semibold text-indigo-950">Phạm vi chia sẻ:</span>
                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={() => setShareScope("all")}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                          shareScope === "all"
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                        }`}
                      >
                        Tất cả ({allNumbers.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setShareScope("selected")}
                        className={`text-xs px-2.5 py-1 rounded-lg font-bold transition-colors cursor-pointer ${
                          shareScope === "selected"
                            ? "bg-indigo-600 text-white shadow-2xs"
                            : "bg-white text-indigo-700 hover:bg-indigo-100 border border-indigo-200"
                        }`}
                      >
                        Chỉ {selectedNumbers.length} số đã chọn
                      </button>
                    </div>
                  </div>
                )}

                {/* Format Tabs */}
                <div>
                  <label className="block text-[11px] font-bold text-gray-700 uppercase tracking-wider mb-1.5">
                    Định dạng nội dung
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    <button
                      type="button"
                      onClick={() => setShareFormat("detailed")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        shareFormat === "detailed"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/20"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      Báo cáo chi tiết
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareFormat("compact")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        shareFormat === "compact"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/20"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      Dãy số (phẩy)
                    </button>
                    <button
                      type="button"
                      onClick={() => setShareFormat("numbered")}
                      className={`px-3 py-2 rounded-xl text-xs font-bold border transition-all text-center cursor-pointer ${
                        shareFormat === "numbered"
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs ring-2 ring-indigo-500/20"
                          : "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
                      }`}
                    >
                      Mỗi dòng một số
                    </button>
                  </div>
                </div>

                {/* Text preview */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="text-[11px] font-bold text-gray-700 uppercase tracking-wider">
                      Xem trước nội dung tin nhắn
                    </label>
                    <span className="text-[10px] text-gray-400">
                      {formattedShareText.length} ký tự
                    </span>
                  </div>
                  <textarea
                    readOnly
                    rows={6}
                    value={formattedShareText}
                    className="w-full text-xs font-mono p-3 bg-slate-50 border border-gray-200 rounded-xl text-slate-800 focus:outline-hidden resize-none select-all"
                    onClick={(e) => (e.target as HTMLTextAreaElement).select()}
                  />
                </div>

                {/* Toast feedback */}
                {shareCopied && (
                  <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs font-bold flex items-center justify-center gap-2 animate-in fade-in">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    Đã sao chép nội dung vào bộ nhớ tạm!
                  </div>
                )}
              </div>

              {/* Modal Actions */}
              <div className="px-5 py-3.5 bg-slate-50 border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5">
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={handleDownloadShareTxt}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-gray-300 bg-white hover:bg-gray-100 text-gray-700 font-semibold text-xs transition-colors cursor-pointer"
                    title="Lưu thành file văn bản (.txt)"
                  >
                    <Download className="w-3.5 h-3.5 text-gray-600" />
                    <span>Lưu file .txt</span>
                  </button>

                  <a
                    href="https://chat.zalo.me/"
                    target="_blank"
                    rel="noreferrer"
                    onClick={handleCopyShareText}
                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-blue-200 bg-blue-50 hover:bg-blue-100 text-blue-700 font-semibold text-xs transition-colors cursor-pointer"
                    title="Sao chép nội dung và mở Zalo Web"
                  >
                    <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
                    <span>Mở Zalo</span>
                    <ExternalLink className="w-3 h-3 text-blue-400" />
                  </a>
                </div>

                <div className="flex items-center gap-2 ml-auto">
                  <button
                    type="button"
                    onClick={handleCopyShareText}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 font-bold text-xs transition-colors cursor-pointer"
                  >
                    <Copy className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Sao chép</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleShareNative}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 text-white font-bold text-xs transition-all shadow-md cursor-pointer"
                    title="Mở menu chia sẻ hệ thống (Zalo, Tin nhắn, Mail...)"
                  >
                    <Share2 className="w-3.5 h-3.5" />
                    <span>Chia sẻ ngay</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
