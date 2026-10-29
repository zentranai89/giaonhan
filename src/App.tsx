import { useState, useMemo, useEffect, useRef } from "react";
import {
  FolderSync,
  Sparkles,
  FolderOpen,
  RefreshCw,
  PlusCircle,
  Save,
  CheckCircle2,
  Calendar,
  Building2,
  RotateCcw,
  RotateCw,
  AlertCircle,
  CalendarClock,
  ArrowLeft,
  Bell,
  Database,
  ShieldCheck,
  Clock,
  Share2,
  Download,
  Award,
  ChevronDown,
} from "lucide-react";
import WarehouseImageUploader from "./components/WarehouseImageUploader";
import WarehouseNumbersManager from "./components/WarehouseNumbersManager";
import UploadedDataInspector from "./components/UploadedDataInspector";
import DeliveryOrdersTable from "./components/DeliveryOrdersTable";
import BackupModal from "./components/BackupModal";
import { ShareAppModal } from "./components/ShareAppModal";
import { ReminderNotesManager } from "./components/ReminderNotesManager";
import SupplierBonusManager from "./components/SupplierBonusManager";
import DisplayScaleController from "./components/DisplayScaleController";
import CommonToolbar from "./components/CommonToolbar";
import { ImagePage, BackupRecord, DeliveryOrder, OrderStatus, ReminderNote } from "./types";
import {
  loadBackups,
  getLatestBackupRecord,
  saveOrUpdateBackup,
  exportComprehensiveFullBackup,
  extractDateFromFile,
  extractCustomerFromFile,
  addDriverSuggestion,
  addCustomerSuggestion,
  addVehicleSuggestion,
  addAreaSuggestion,
  addDeliveryLocationSuggestion,
  getCustomerSuggestions,
} from "./utils/backupStorage";
import { loadReminders, saveReminders } from "./utils/reminderStorage";
import { getSavedPrintTemplate } from "./utils/printTemplateStorage";
import { getSavedQuickMessages } from "./utils/quickMessagesStorage";
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
  compareOrdersByMonthThenTicket,
} from "./utils/dateUtils";
import { motion } from "motion/react";

// Helper to extract clean order list from a backup record
function extractOrdersFromRecord(record: BackupRecord | null): DeliveryOrder[] {
  if (!record) return [];
  if (Array.isArray(record.orders) && record.orders.length > 0) {
    const list = record.orders.map((o) => ({
      ...o,
      month: o.month ?? extractMonthFromDate(o.deliveryDate) ?? undefined,
      area: o.area || o.deliveryLocation || record.area || record.deliveryLocation || "",
      deliveryLocation: o.deliveryLocation || o.area || record.deliveryLocation || record.area || "",
      deliveryDate: o.deliveryDate || "",
    }));
    return list.sort((a, b) => compareOrdersByMonthThenTicket(a, b));
  }
  const loadedNumbers = record.warehouseNumbers || record.image2Numbers || [];
  const recDate = record.recordDate || getLocalTodayISO();
  const recMonth = extractMonthFromDate(recDate) ?? undefined;
  const list = loadedNumbers.map((num, idx) => ({
    id: "ord_" + (record.id || "loaded") + "_" + num + "_" + idx,
    ticketNumber: num,
    month: recMonth,
    vehicleNumber: record.vehicleNumber || "",
    driverName: record.driverName || "",
    customerName: record.customerName || "",
    area: record.area || record.deliveryLocation || "",
    deliveryLocation: record.deliveryLocation || record.area || "",
    deliveryDate: recDate,
    status: "delivered" as OrderStatus,
    notes: "",
  }));
  return list.sort((a, b) => compareOrdersByMonthThenTicket(a, b));
}

export default function App() {
  // Page Navigation State: "main" (Trang chính) | "reminders" (Ghi chú nhắc hẹn) | "supplier_bonuses" (Thưởng & Chiết khấu NCC)
  const [activePage, setActivePage] = useState<"main" | "reminders" | "supplier_bonuses">("main");
  const [targetTicketNumber, setTargetTicketNumber] = useState<number | string | null>(null);
  const [reminderPrefill, setReminderPrefill] = useState<{
    ticketNumber?: number | string;
    customerName?: string;
    vehicleNumber?: string;
  } | null>(null);
  const [remindersCount, setRemindersCount] = useState<number>(() => loadReminders().length);

  // Backups state & find latest backup immediately
  const [backups, setBackups] = useState<BackupRecord[]>(() => loadBackups());
  const initialLatestBackup = useMemo(() => {
    return getLatestBackupRecord(backups);
  }, []);

  // Session metadata states - initialized with latest backup record
  const [driverName, setDriverName] = useState(() => initialLatestBackup?.driverName || "");
  const [customerName, setCustomerName] = useState(() => initialLatestBackup?.customerName || "");
  const [area, setArea] = useState(() => initialLatestBackup?.area || initialLatestBackup?.deliveryLocation || "");
  const [deliveryLocation, setDeliveryLocation] = useState(() => initialLatestBackup?.deliveryLocation || initialLatestBackup?.area || "");
  const [customerAutoSource, setCustomerAutoSource] = useState<string | null>(null);
  const [vehicleNumber, setVehicleNumber] = useState(() => initialLatestBackup?.vehicleNumber || "");
  const [recordDate, setRecordDate] = useState(() => initialLatestBackup?.recordDate || getLocalTodayISO());
  const [dateAutoSource, setDateAutoSource] = useState<string | null>(() => initialLatestBackup ? "Được nạp từ bản sao lưu mới nhất" : null);
  const [notes, setNotes] = useState(() => initialLatestBackup?.notes || "");
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(() => initialLatestBackup?.id || null);

  const [isBackupModalOpen, setIsBackupModalOpen] = useState(false);
  const [isShareModalOpen, setIsShareModalOpen] = useState(false);
  const [saveToast, setSaveToast] = useState<string | null>(null);
  const [liveCurrentTime, setLiveCurrentTime] = useState(new Date());

  useEffect(() => {
    const timer = setInterval(() => {
      setLiveCurrentTime(new Date());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Warehouse image pages, manual numbers & delivery orders initialized with latest backup record
  const [pages, setPages] = useState<ImagePage[]>(
    () => initialLatestBackup?.pages || initialLatestBackup?.pages2 || initialLatestBackup?.pages1 || []
  );
  const [manualNumbers, setManualNumbers] = useState<number[]>(() => {
    const raw = initialLatestBackup?.manualNumbers || initialLatestBackup?.manualNumbers2 || [];
    if (raw.length === 8 && raw[0] === 52 && raw[1] === 78) return [];
    return raw;
  });
  const [orders, setOrders] = useState<DeliveryOrder[]>(() => extractOrdersFromRecord(initialLatestBackup));
  const [activePreviewPageId, setActivePreviewPageId] = useState<string | null>(
    () => initialLatestBackup?.pages?.[0]?.id || null
  );

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [uploadStatus, setUploadStatus] = useState<{
    current: number;
    total: number;
    fileName?: string;
    stepText?: string;
  } | null>(null);

  const showToastNotification = (msg: string) => {
    setSaveToast(msg);
    setTimeout(() => {
      setSaveToast((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  // Tùy chỉnh tỷ lệ hiển thị & Cỡ chữ (Display Scale & Fullscreen Settings)
  const UI_SCALE_KEY = "warehouse_ui_scale_percent";
  const AUTO_FIT_KEY = "warehouse_ui_autofit_screen";

  const [uiScale, setUiScale] = useState<number>(() => {
    try {
      const saved = localStorage.getItem(UI_SCALE_KEY);
      if (saved) {
        const val = Number(saved);
        if (!isNaN(val) && val >= 75 && val <= 160) return val;
      }
    } catch {}
    return 100;
  });

  const [autoFitScreen, setAutoFitScreen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem(AUTO_FIT_KEY);
      if (saved !== null) return saved === "true";
    } catch {}
    return true;
  });

  const [windowWidth, setWindowWidth] = useState(() => (typeof window !== "undefined" ? window.innerWidth : 1280));
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Sync fullscreen state via standard browser event
  useEffect(() => {
    const handleFsChange = () => {
      setIsFullscreen(Boolean(document.fullscreenElement));
    };
    document.addEventListener("fullscreenchange", handleFsChange);
    return () => document.removeEventListener("fullscreenchange", handleFsChange);
  }, []);

  // Sync window resize to adaptively calculate scale when window size changes
  useEffect(() => {
    const handleResize = () => {
      setWindowWidth(window.innerWidth);
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Compute effective scale:
  // When autoFitScreen is enabled, adapt smoothly for high-res & wide full-screen displays
  const effectiveScale = useMemo(() => {
    if (!autoFitScreen) return uiScale;
    let bonus = 0;
    if (windowWidth >= 2560) {
      bonus = 15; // 4K / Ultrawide: +15%
    } else if (windowWidth >= 1920) {
      bonus = 10; // Full HD / 2K: +10%
    } else if (windowWidth >= 1536) {
      bonus = 5; // Large screens: +5%
    }
    return Math.min(150, uiScale + bonus);
  }, [uiScale, autoFitScreen, windowWidth]);

  // Apply effective scale to document root font-size & CSS variable
  useEffect(() => {
    const baseFontSize = (effectiveScale / 100) * 16;
    document.documentElement.style.fontSize = `${baseFontSize}px`;
    document.documentElement.style.setProperty("--ui-scale", `${effectiveScale}%`);
    try {
      localStorage.setItem(UI_SCALE_KEY, String(uiScale));
      localStorage.setItem(AUTO_FIT_KEY, String(autoFitScreen));
    } catch {}
  }, [effectiveScale, uiScale, autoFitScreen]);

  const handleToggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        if (document.documentElement.requestFullscreen) {
          await document.documentElement.requestFullscreen();
        }
      } else {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        }
      }
    } catch (err) {
      console.warn("Fullscreen toggle restricted in iframe:", err);
      showToastNotification("Gợi ý: Bạn cũng có thể bấm phím F11 trên bàn phím để bật/tắt toàn màn hình.");
    }
  };

  const handleResetScale = () => {
    setUiScale(100);
    showToastNotification("Đã đặt lại kích thước hiển thị về mức chuẩn 100%");
  };

  // Compute aggregated numbers from all warehouse scanned pages + manual additions (strictly warehouse numbers)
  // Giữ nguyên thứ tự nhập hoặc xuất hiện của các số phiếu kho (VD: 50.57.76.100.110)
  const allWarehouseNumbers = useMemo(() => {
    const s = new Set<number>();
    pages.forEach((p) => p.numbers.forEach((n) => s.add(n)));
    manualNumbers.forEach((n) => s.add(n));
    return Array.from(s).filter((n) => !isNaN(n) && n > 0);
  }, [pages, manualNumbers]);

  // All raw warehouse numbers preserving duplicates from documents & manual additions
  const allRawWarehouseNumbers = useMemo(() => {
    const list: number[] = [];
    pages.forEach((p) =>
      p.numbers.forEach((n) => {
        const num = Number(n);
        if (!isNaN(num) && num > 0) list.push(num);
      })
    );
    manualNumbers.forEach((n) => {
      const num = Number(n);
      if (!isNaN(num) && num > 0) list.push(num);
    });
    return list;
  }, [pages, manualNumbers]);

  const hasLoadedData = pages.length > 0 || manualNumbers.length > 0 || orders.length > 0;

  // Unified automated backup function to persist all application data (orders, warehouse numbers, metadata, reminders)
  const handleAutoBackupAllData = (options?: {
    customOrders?: DeliveryOrder[];
    customReminders?: ReminderNote[];
    overrideMeta?: {
      driverName?: string;
      customerName?: string;
      area?: string;
      deliveryLocation?: string;
      vehicleNumber?: string;
      recordDate?: string;
      notes?: string;
      pages?: ImagePage[];
      manualNumbers?: number[];
    };
    targetRecordId?: string | null;
    toastMessage?: string;
    silent?: boolean;
    isNewRecordIfNoCurrent?: boolean;
  }) => {
    const now = new Date();
    const nowIso = now.toISOString();

    const targetOrders = options?.customOrders ?? orders;
    const targetReminders = options?.customReminders ?? loadReminders();
    const targetDriver = (options?.overrideMeta?.driverName ?? driverName).trim();
    const targetCustomer = (options?.overrideMeta?.customerName ?? customerName).trim();
    const targetArea = (options?.overrideMeta?.area ?? options?.overrideMeta?.deliveryLocation ?? area ?? deliveryLocation).trim();
    const targetLocation = (options?.overrideMeta?.deliveryLocation ?? options?.overrideMeta?.area ?? deliveryLocation ?? area).trim();
    const targetVehicle = (options?.overrideMeta?.vehicleNumber ?? vehicleNumber).trim();
    const targetDate = options?.overrideMeta?.recordDate || recordDate || getLocalTodayISO(now);
    const targetNotes = (options?.overrideMeta?.notes ?? notes).trim();
    const targetPages = options?.overrideMeta?.pages ?? pages;
    const targetManual = options?.overrideMeta?.manualNumbers ?? manualNumbers;
    const targetWarehouseNumbers = allWarehouseNumbers;

    // Determine target record ID:
    let recordIdToUse = options?.targetRecordId || currentRecordId;
    if (!recordIdToUse) {
      if (options?.isNewRecordIfNoCurrent || backups.length === 0) {
        recordIdToUse = "rec_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);
      } else {
        recordIdToUse = backups[0].id;
      }
    }

    const existingBackup = backups.find((b) => b.id === recordIdToUse);

    const recordToSave: BackupRecord = {
      id: recordIdToUse,
      driverName: targetDriver || existingBackup?.driverName || "",
      customerName: targetCustomer || existingBackup?.customerName || "",
      area: targetArea || existingBackup?.area || existingBackup?.deliveryLocation || "",
      deliveryLocation: targetLocation || targetArea || existingBackup?.deliveryLocation || existingBackup?.area || "",
      vehicleNumber: targetVehicle || existingBackup?.vehicleNumber || "",
      recordDate: targetDate || existingBackup?.recordDate || getLocalTodayISO(now),
      notes: targetNotes || existingBackup?.notes || "",
      createdAt: existingBackup?.createdAt || nowIso,
      updatedAt: nowIso,
      pages: targetPages,
      manualNumbers: targetManual,
      warehouseNumbers: targetWarehouseNumbers.length > 0 ? targetWarehouseNumbers : (existingBackup?.warehouseNumbers || []),
      orders: targetOrders,
      reminders: targetReminders,
      printTemplate: getSavedPrintTemplate(),
      quickMessages: getSavedQuickMessages(),
    };

    // Ensure reminders are also synced to dedicated reminder key
    if (targetReminders && Array.isArray(targetReminders)) {
      saveReminders(targetReminders);
    }

    const res = saveOrUpdateBackup(recordToSave);
    if (res.success) {
      setCurrentRecordId(recordIdToUse);
      setBackups(loadBackups());
      if (!options?.silent) {
        const msg =
          options?.toastMessage ||
          `Đã lưu cập nhật toàn bộ: ${targetOrders.length} đơn hàng, ${targetReminders.length} ghi chú, mẫu in & lời nhắn lúc ${formatBackupDateTime(nowIso, true)}!`;
        showToastNotification(msg);
      }
      return { success: true, recordId: recordIdToUse };
    } else {
      if (!options?.silent) {
        setErrorMessage(res.error || "Không thể cập nhật bản sao lưu vào bộ nhớ trình duyệt.");
      }
      return { success: false, error: res.error };
    }
  };

  // Comprehensive full application backup export handler: Packages EVERYTHING (orders, notes, print template, quick messages, all backups, suggestions)
  const handleComprehensiveFullBackup = () => {
    handleAutoBackupAllData({ silent: true });
    const res = exportComprehensiveFullBackup({
      id: currentRecordId || undefined,
      driverName,
      customerName,
      area: area || deliveryLocation,
      deliveryLocation: deliveryLocation || area,
      vehicleNumber,
      recordDate,
      notes,
      orders,
      warehouseNumbers: allWarehouseNumbers,
      manualNumbers,
      pages,
    });
    showToastNotification(res.summary);
  };

  // On-demand sync handler: Called when user clicks "Cập nhật" in WarehouseNumbersManager
  const handleSyncWarehouseToOrders = (syncData: {
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
  }) => {
    const duplicateAction = syncData.duplicateAction || (syncData.updateExisting ? "update_existing" : "add_duplicate");
    const numbersToProcess =
      duplicateAction === "add_duplicate" && allRawWarehouseNumbers.length > 0
        ? allRawWarehouseNumbers
        : allWarehouseNumbers;

    if (numbersToProcess.length === 0) {
      setErrorMessage("Không có số phiếu kho nào để cập nhật vào danh sách đơn hàng.");
      return;
    }

    const previousPagesCount = pages.length;
    const shouldClear = syncData.clearUploadedPages ?? true;

    // Update session defaults
    if (syncData.vehicleNumber) {
      setVehicleNumber(syncData.vehicleNumber);
      addVehicleSuggestion(syncData.vehicleNumber);
    }
    if (syncData.driverName) {
      setDriverName(syncData.driverName);
      addDriverSuggestion(syncData.driverName);
    }
    if (syncData.customerName) {
      setCustomerName(syncData.customerName);
    }
    const targetArea = (syncData.area || syncData.deliveryLocation || "").trim();
    if (targetArea) {
      setArea(targetArea);
      setDeliveryLocation(targetArea);
      addAreaSuggestion(targetArea);
    }
    if (syncData.deliveryDate) {
      setRecordDate(syncData.deliveryDate);
    }

    const effectiveDeliveryDate = syncData.deliveryDate || getLocalTodayISO();
    const effectiveMonth = syncData.month ?? extractMonthFromDate(effectiveDeliveryDate) ?? undefined;

    const nextOrders = [...orders];
    let addedCount = 0;
    let duplicateCount = 0;
    let updatedCount = 0;

    numbersToProcess.forEach((num) => {
      const numKey = String(num).trim().toLowerCase();
      const numStatus = (syncData.ticketStatusMap && syncData.ticketStatusMap[num]) || syncData.status || "delivered";
      const numMonth = (syncData.ticketMonthMap && syncData.ticketMonthMap[num]) ?? syncData.month ?? effectiveMonth;
      const matchingIndices = nextOrders
        .map((o, idx) => ({ o, idx }))
        .filter(({ o }) => {
          if (String(o.ticketNumber).trim().toLowerCase() !== numKey) return false;
          const oMonth = getOrderMonth(o);
          if (numMonth && oMonth) {
            return numMonth === oMonth;
          }
          return true;
        })
        .map(({ idx }) => idx);

      const hasExisting = matchingIndices.length > 0;

      if (hasExisting && duplicateAction === "update_existing") {
        // Ghi đè thông tin đơn cũ / ghi đè đơn cũ:
        // CẬP NHẬT TRẠNG THÁI & THÁNG CỦA ĐƠN TRƯỚC ĐÓ THEO SỐ PHIẾU NÀY
        // CÒN TẤT CẢ CÁC THÔNG TIN TRƯỚC ĐÓ (Xe, Người giao, Khách hàng, Khu vực, Ngày, Ghi chú, v.v.) ĐỀU GIỮ NGUYÊN.
        matchingIndices.forEach((targetIdx) => {
          nextOrders[targetIdx] = {
            ...nextOrders[targetIdx],
            status: numStatus,
            month: numMonth,
            updatedAt: new Date().toISOString(),
          };
        });
        updatedCount += matchingIndices.length;
      } else if (hasExisting && duplicateAction === "skip") {
        // Bỏ qua đơn trùng
      } else {
        // duplicateAction === "add_duplicate" HOẶC đơn chưa từng có trong danh sách
        // Cho phép thêm mới đơn hàng vào DANH SÁCH với trạng thái và tháng riêng của từng số phiếu
        const newOrder: DeliveryOrder = {
          id: "ord_" + Date.now() + "_" + String(num).replace(/[^a-zA-Z0-9]/g, "_") + "_" + Math.random().toString(36).substring(2, 7),
          ticketNumber: num,
          month: numMonth,
          vehicleNumber: syncData.vehicleNumber.trim(),
          driverName: syncData.driverName.trim(),
          customerName: syncData.customerName.trim(),
          area: targetArea,
          deliveryLocation: targetArea,
          deliveryDate: effectiveDeliveryDate,
          status: numStatus,
          notes: "",
          createdAt: new Date().toISOString(),
        };
        nextOrders.push(newOrder);
        if (hasExisting || nextOrders.filter((o) => String(o.ticketNumber).trim().toLowerCase() === numKey).length > 1) {
          duplicateCount++;
        } else {
          addedCount++;
        }
      }
    });

    nextOrders.sort((a, b) => compareOrdersByMonthThenTicket(a, b));
    setOrders(nextOrders);

    // Tự động xóa các ảnh tải lên trong phần "Các trang chứng từ đã tải" sau khi cập nhật vào đơn hàng
    if (shouldClear) {
      setPages([]);
      setManualNumbers([]);
      setActivePreviewPageId(null);
    }

    const clearNotice =
      shouldClear && previousPagesCount > 0
        ? ` • Đã dọn ${previousPagesCount} trang ảnh đã tải`
        : "";

    let actionDetail = "";
    if (updatedCount > 0 && addedCount > 0) {
      actionDetail = ` (Chuyển ${updatedCount} đơn cũ sang "Hoàn Thành", thêm ${addedCount} đơn mới)`;
    } else if (updatedCount > 0) {
      actionDetail = ` (Đã chuyển ${updatedCount} đơn cũ sang trạng thái "Hoàn Thành", giữ nguyên toàn bộ thông tin cũ)`;
    } else if (addedCount > 0) {
      actionDetail = ` (Đã thêm ${addedCount} đơn mới)`;
    }

    // Tự động sao lưu tất cả dữ liệu khi bấm Cập Nhật Vào Danh Sách Đơn Hàng
    const nowIso = new Date().toISOString();
    const timeFormatted = formatBackupDateTime(nowIso, true);
    handleAutoBackupAllData({
      customOrders: nextOrders,
      overrideMeta: {
        driverName: syncData.driverName,
        customerName: syncData.customerName,
        deliveryLocation: syncData.deliveryLocation,
        vehicleNumber: syncData.vehicleNumber,
        recordDate: syncData.deliveryDate,
        pages: shouldClear ? [] : pages,
        manualNumbers: shouldClear ? [] : manualNumbers,
      },
      isNewRecordIfNoCurrent: true,
      toastMessage: `Đã cập nhật ${numbersToProcess.length} số phiếu vào DANH SÁCH${actionDetail} & tự động sao lưu tất cả dữ liệu lúc ${timeFormatted}${clearNotice}!`,
    });
  };

  // OCR Single Page Worker
  const processOcrForPage = async (
    base64Data: string,
    mimeType: string,
    fileName: string
  ): Promise<ImagePage> => {
    const response = await fetch("/api/ocr", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ imageBase64: base64Data, mimeType }),
    });

    let data: any = null;
    try {
      data = await response.json();
    } catch {
      // response might not be JSON
    }

    if (!response.ok) {
      let msg = data?.error || `Lỗi máy chủ (${response.status})`;
      if (typeof msg === "string" && msg.trim().startsWith("{")) {
        try {
          const parsed = JSON.parse(msg.trim());
          if (parsed?.error?.message) {
            msg = parsed.error.message;
          }
        } catch {
          // ignore
        }
      }
      if (
        typeof msg === "string" &&
        (msg.includes("503") ||
          msg.includes("high demand") ||
          msg.includes("UNAVAILABLE") ||
          response.status === 503)
      ) {
        msg =
          "Mô hình nhận diện AI đang tạm thời quá tải do nhu cầu cao (503). Vui lòng bấm thử lại sau giây lát.";
      }
      throw new Error(msg);
    }

    return {
      id: Date.now().toString() + Math.random().toString(36).substring(2, 7),
      fileName,
      preview: base64Data,
      numbers: data.numbers || [],
      coords: data.coords || [],
      lowConfidence: data.lowConfidence || [],
    };
  };

  // Upload and process multiple warehouse sheet images
  const handleAddImages = async (files: File[]) => {
    if (files.length === 0) return;

    // 1. Tự động trích xuất ngày theo file tải lên
    const dateInfo = extractDateFromFile(files[0]);
    let effectiveDate = recordDate;
    if (dateInfo && dateInfo.dateStr) {
      effectiveDate = dateInfo.dateStr;
      setRecordDate(dateInfo.dateStr);
      setDateAutoSource(dateInfo.source);
    }

    // 2. Tự động trích xuất tên khách hàng dựa trên file tải lên
    const customerInfo = extractCustomerFromFile(files[0]);
    let effectiveCustomer = customerName;
    if (customerInfo && customerInfo.customerName) {
      effectiveCustomer = customerInfo.customerName;
      setCustomerName(customerInfo.customerName);
      setCustomerAutoSource(customerInfo.source);
    }

    setIsLoading(true);
    setErrorMessage(null);
    setUploadStatus({
      current: 0,
      total: files.length,
      fileName: files[0]?.name || "",
      stepText: `Đang tải ${files.length} ảnh lên & khởi chạy nhận diện AI...`,
    });

    try {
      const newlyScannedNumbers: number[] = [];
      let index = 0;
      for (const file of files) {
        index++;
        setUploadStatus({
          current: index,
          total: files.length,
          fileName: file.name,
          stepText: `Đang tải ảnh và quét trang ${index}/${files.length}: ${file.name}...`,
        });

        const base64Data = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === "string") resolve(reader.result);
            else reject(new Error("Lỗi đọc file ảnh"));
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const newPage = await processOcrForPage(base64Data, file.type, file.name);
        newlyScannedNumbers.push(...newPage.numbers);
        setPages((prev) => {
          const updated = [...prev, newPage];
          if (!activePreviewPageId) {
            setActivePreviewPageId(newPage.id);
          }
          return updated;
        });
      }

      const customerMsg = effectiveCustomer ? ` • Khách hàng: ${effectiveCustomer}` : "";
      showToastNotification(
        `Đã nhận diện thành công ${files.length} trang ảnh (${newlyScannedNumbers.length} số phiếu kho)${customerMsg}. Nhấn "Cập nhật vào danh sách đơn hàng" để chuyển vào đơn!`
      );
    } catch (err: any) {
      console.error("OCR upload error:", err);
      setErrorMessage(
        `Lỗi khi nhận diện ảnh: ${err.message || "Kiểm tra lại khóa API hoặc định dạng tệp."}`
      );
    } finally {
      setIsLoading(false);
      setUploadStatus(null);
    }
  };

  // Re-scan all uploaded pages
  const handleScanAll = async () => {
    if (pages.length === 0) return;
    setIsLoading(true);
    setErrorMessage(null);
    setUploadStatus({
      current: 0,
      total: pages.length,
      stepText: `Đang quét lại ${pages.length} trang chứng từ...`,
    });

    try {
      const updatedPages: ImagePage[] = [];
      const rescannedNumbers: number[] = [];
      let idx = 0;
      for (const page of pages) {
        idx++;
        setUploadStatus({
          current: idx,
          total: pages.length,
          fileName: page.fileName,
          stepText: `Đang quét lại trang ${idx}/${pages.length}: ${page.fileName}...`,
        });

        if (page.preview) {
          const rePage = await processOcrForPage(page.preview, "image/jpeg", page.fileName);
          rescannedNumbers.push(...rePage.numbers);
          updatedPages.push({ ...rePage, id: page.id });
        } else {
          updatedPages.push(page);
        }
      }
      setPages(updatedPages);
      showToastNotification(
        `Đã quét lại ${rescannedNumbers.length} số phiếu trên các trang ảnh! Nhấn "Cập nhật" để chuyển vào đơn hàng.`
      );
    } catch (err: any) {
      console.error("Re-scan error:", err);
      setErrorMessage(`Lỗi khi quét lại: ${err.message || "Không thể hoàn thành nhận diện."}`);
    } finally {
      setIsLoading(false);
      setUploadStatus(null);
    }
  };

  const handleClearPage = (pageId: string) => {
    setPages((prev) => {
      const next = prev.filter((p) => p.id !== pageId);
      if (activePreviewPageId === pageId) {
        setActivePreviewPageId(next[0]?.id || null);
      }
      return next;
    });
  };

  const handleClearWarehouseStaging = () => {
    setPages([]);
    setManualNumbers([]);
    setActivePreviewPageId(null);
    showToastNotification("Đã xóa các trang ảnh và số phiếu kho chờ cập nhật.");
  };

  const handleClearAll = () => {
    setPages([]);
    setManualNumbers([]);
    setOrders([]);
    setActivePreviewPageId(null);
  };

  // Manual Adjustments - only update manualNumbers in warehouse list; user clicks "Cập nhật" to sync to orders
  // Giữ nguyên thứ tự nhập của người dùng (VD: 50.57.76.100.110)
  const handleAddManualNumber = (num: number) => {
    if (!manualNumbers.includes(num)) {
      setManualNumbers((prev) => [...prev, num]);
    }
    showToastNotification(`Đã thêm số phiếu kho ${num}. Nhấn "Cập nhật vào danh sách đơn hàng" để chuyển vào đơn.`);
  };

  // Thêm số phiếu nhận diện từ việc bấm chuột trực tiếp vào trang ảnh chứng từ
  const handleAddNumberToPage = (pageId: string, num: number, box?: number[]) => {
    setPages((prev) =>
      prev.map((p) => {
        if (p.id !== pageId) return p;
        const updatedNumbers = p.numbers.includes(num)
          ? p.numbers
          : [...p.numbers, num];
        const updatedCoords = [...(p.coords || [])];
        if (box) {
          const existingIdx = updatedCoords.findIndex((c) => c.value === num);
          if (existingIdx >= 0) {
            updatedCoords[existingIdx] = { value: num, box };
          } else {
            updatedCoords.push({ value: num, box });
          }
        }
        return {
          ...p,
          numbers: updatedNumbers,
          coords: updatedCoords,
        };
      })
    );
    showToastNotification(`Đã nhận diện & thêm số phiếu #${num} vào trang chứng từ kho.`);
  };

  const handleAddBatchNumbers = (nums: number[]) => {
    setManualNumbers((prev) => {
      const existing = new Set(prev);
      const toAdd = nums.filter((n) => !existing.has(n));
      return [...prev, ...toAdd];
    });
    showToastNotification(
      `Đã thêm ${nums.length} số phiếu kho. Nhấn "Cập nhật vào danh sách đơn hàng" để chuyển vào đơn.`
    );
  };

  // Thao tác sửa / xóa ở phần "Cập Nhật Vào Danh Sách Đơn Giao Hàng & Số Phiếu Kho":
  // Độc lập hoàn toàn với "Danh Sách Đơn Giao Hàng & Số Phiếu Kho" (orders).
  // Chỉ khi người dùng bấm "Cập Nhật Vào Danh Sách Đơn Hàng" mới cập nhật vào danh sách đơn hàng.
  const handleRemoveNumber = (numToRemove: number) => {
    setManualNumbers((prev) => prev.filter((n) => n !== numToRemove));
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        numbers: p.numbers.filter((n) => n !== numToRemove),
        coords: (p.coords || []).filter((c) => c.value !== numToRemove),
        lowConfidence: (p.lowConfidence || []).filter((n) => n !== numToRemove),
      }))
    );
    showToastNotification(
      `Đã xóa số phiếu kho ${numToRemove} khỏi danh sách kho. Nhấn "Cập nhật vào danh sách đơn hàng" để đồng bộ sang đơn hàng.`
    );
  };

  const handleRemoveBatchNumbers = (numsToRemove: number[]) => {
    if (!numsToRemove || numsToRemove.length === 0) return;
    const removeSet = new Set(numsToRemove);
    setManualNumbers((prev) => prev.filter((n) => !removeSet.has(n)));
    setPages((prev) =>
      prev.map((p) => ({
        ...p,
        numbers: p.numbers.filter((n) => !removeSet.has(n)),
        coords: (p.coords || []).filter((c) => !removeSet.has(c.value)),
        lowConfidence: (p.lowConfidence || []).filter((n) => !removeSet.has(n)),
      }))
    );
    showToastNotification(
      `Đã xóa ${numsToRemove.length} số phiếu đã chọn khỏi dữ liệu tải lên.`
    );
  };

  const handleEditNumber = (oldNum: number, newNum: number) => {
    // Sửa số phiếu kho chỉ cập nhật trong pages và manualNumbers, hoàn toàn không can thiệp vào đơn hàng (orders)
    setManualNumbers((prev) => {
      if (prev.includes(oldNum)) {
        return prev.map((n) => (n === oldNum ? newNum : n)).sort((a, b) => a - b);
      }
      return prev;
    });
    setPages((prev) =>
      prev.map((p) => {
        if (!p.numbers.includes(oldNum)) return p;
        return {
          ...p,
          numbers: p.numbers.map((n) => (n === oldNum ? newNum : n)),
          coords: (p.coords || []).map((c) => (c.value === oldNum ? { ...c, value: newNum } : c)),
          lowConfidence: (p.lowConfidence || []).map((n) => (n === oldNum ? newNum : n)),
        };
      })
    );
    showToastNotification(
      `Đã sửa số phiếu kho ${oldNum} thành ${newNum}. Nhấn "Cập nhật vào danh sách đơn hàng" để đồng bộ sang đơn hàng.`
    );
  };

  // Delivery Orders Management Callbacks
  const handleUpdateOrder = (updatedOrder: DeliveryOrder) => {
    const finalArea = (updatedOrder.area || updatedOrder.deliveryLocation || "").trim();
    let finalDate = updatedOrder.deliveryDate;
    let finalMonth = updatedOrder.month;

    if (finalMonth !== undefined && finalMonth !== null) {
      if (finalDate && extractMonthFromDate(finalDate) !== finalMonth) {
        finalDate = updateDateWithMonth(finalDate, finalMonth);
      }
    } else if (finalDate) {
      finalMonth = extractMonthFromDate(finalDate) ?? undefined;
    }

    const sanitizedOrder: DeliveryOrder = {
      ...updatedOrder,
      month: finalMonth,
      area: finalArea,
      deliveryLocation: finalArea,
      deliveryDate: finalDate,
      updatedAt: new Date().toISOString(),
    };
    if (finalArea) {
      addAreaSuggestion(finalArea);
    }
    setOrders((prev) => {
      const next = prev.map((o) => (o.id === sanitizedOrder.id ? sanitizedOrder : o));
      handleAutoBackupAllData({ customOrders: next, silent: true });
      return next;
    });
    showToastNotification(`Đã cập nhật đơn số phiếu ${sanitizedOrder.ticketNumber}`);
  };

  const handleAddOrder = (newOrderData: Partial<DeliveryOrder>) => {
    const rawTicket = newOrderData.ticketNumber;
    const ticketValue = parseTicketNumberInput(rawTicket);
    if (ticketValue === "") return;

    const status = newOrderData.status || "delivered";
    const finalArea = (newOrderData.area !== undefined ? newOrderData.area : (newOrderData.deliveryLocation || area || deliveryLocation || "")).trim();
    const targetDate = newOrderData.deliveryDate !== undefined ? newOrderData.deliveryDate : (recordDate || getLocalTodayISO());
    const targetMonth = newOrderData.month ?? extractMonthFromDate(targetDate) ?? undefined;

    const newOrder: DeliveryOrder = {
      id: "ord_" + Date.now() + "_" + String(ticketValue).replace(/[^a-zA-Z0-9]/g, "_") + "_" + Math.random().toString(36).substring(2, 6),
      ticketNumber: ticketValue,
      month: targetMonth,
      vehicleNumber: (newOrderData.vehicleNumber !== undefined ? newOrderData.vehicleNumber : vehicleNumber).trim(),
      driverName: (newOrderData.driverName !== undefined ? newOrderData.driverName : driverName).trim(),
      customerName: (newOrderData.customerName !== undefined ? newOrderData.customerName : customerName).trim(),
      area: finalArea,
      deliveryLocation: finalArea,
      deliveryDate: targetDate,
      status,
      notes: (newOrderData.notes || "").trim(),
      createdAt: new Date().toISOString(),
    };

    if (finalArea) {
      addAreaSuggestion(finalArea);
    }

    setOrders((prev) => {
      // Cho phép thêm trùng số phiếu theo yêu cầu: không xóa đơn đã có cùng số phiếu
      const next = [...prev, newOrder].sort((a, b) => compareOrdersByMonthThenTicket(a, b));
      handleAutoBackupAllData({ customOrders: next, silent: true });
      return next;
    });

    showToastNotification(`Đã thêm đơn hàng số phiếu ${ticketValue}`);
  };

  const handleDeleteOrder = (orderId: string) => {
    const orderToDelete = orders.find((o) => o.id === orderId);
    if (orderToDelete) {
      setOrders((prev) => {
        const next = prev.filter((o) => o.id !== orderId);
        handleAutoBackupAllData({ customOrders: next, silent: true });
        return next;
      });
      showToastNotification(`Đã xóa đơn số phiếu ${orderToDelete.ticketNumber}`);
    }
  };

  const handleBatchUpdateStatus = (status: OrderStatus, orderIds?: string[]) => {
    setOrders((prev) => {
      const next = prev.map((o) => {
        if (!orderIds || orderIds.length === 0 || orderIds.includes(o.id)) {
          return {
            ...o,
            status,
            deliveryDate: o.deliveryDate,
            updatedAt: new Date().toISOString(),
          };
        }
        return o;
      });
      handleAutoBackupAllData({ customOrders: next, silent: true });
      return next;
    });
    showToastNotification(
      `Đã chuyển trạng thái sang "${
        status === "delivered"
          ? "Hoàn Thành"
          : status === "returned"
          ? "Trả Hàng"
          : status === "delivering"
          ? "Đơn Chưa Giao"
          : status === "pending"
          ? "Chưa Nhận Đơn"
          : status === "unsigned"
          ? "Không Ký Đơn"
          : status === "lost"
          ? "Mất Đơn"
          : "Hủy Đơn"
      }"!`
    );
  };

  const handleBatchUpdateDriver = (newDriver: string, orderIds: string[]) => {
    const trimmed = newDriver.trim();
    setOrders((prev) =>
      prev.map((o) =>
        orderIds.includes(o.id)
          ? { ...o, driverName: trimmed, updatedAt: new Date().toISOString() }
          : o
      )
    );
    if (trimmed) {
      addDriverSuggestion(trimmed);
    }
    const displayVal = trimmed ? `"${trimmed}"` : "để trống (không có người giao)";
    showToastNotification(`Đã sửa người giao thành ${displayVal} cho ${orderIds.length} đơn hàng!`);
  };

  const handleBatchUpdateVehicle = (newVehicle: string, orderIds: string[]) => {
    const trimmed = newVehicle.trim();
    setOrders((prev) =>
      prev.map((o) =>
        orderIds.includes(o.id)
          ? { ...o, vehicleNumber: trimmed, updatedAt: new Date().toISOString() }
          : o
      )
    );
    if (trimmed) {
      addVehicleSuggestion(trimmed);
    }
    const displayVal = trimmed ? `"${trimmed}"` : "để trống (không có số xe)";
    showToastNotification(`Đã sửa số xe thành ${displayVal} cho ${orderIds.length} đơn hàng!`);
  };

  const handleBatchUpdateCustomer = (newCustomer: string, orderIds: string[]) => {
    const trimmed = newCustomer.trim();
    setOrders((prev) =>
      prev.map((o) =>
        orderIds.includes(o.id)
          ? { ...o, customerName: trimmed, updatedAt: new Date().toISOString() }
          : o
      )
    );
    if (trimmed) {
      addCustomerSuggestion(trimmed);
    }
    const displayVal = trimmed ? `"${trimmed}"` : "để trống (không có khách hàng)";
    showToastNotification(`Đã sửa khách hàng thành ${displayVal} cho ${orderIds.length} đơn hàng!`);
  };

  const handleBatchUpdateArea = (newArea: string, orderIds: string[]) => {
    const trimmed = newArea.trim();
    setOrders((prev) =>
      prev.map((o) =>
        orderIds.includes(o.id)
          ? {
              ...o,
              area: trimmed,
              deliveryLocation: trimmed,
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );
    if (trimmed) {
      addAreaSuggestion(trimmed);
    }
    const displayVal = trimmed ? `"${trimmed}"` : "để trống (không có khu vực)";
    showToastNotification(`Đã sửa khu vực thành ${displayVal} cho ${orderIds.length} đơn hàng!`);
  };

  const handleBatchUpdateDeliveryDate = (newDate: string, orderIds: string[]) => {
    const trimmed = newDate.trim();
    const newMonth = extractMonthFromDate(trimmed) ?? undefined;
    setOrders((prev) =>
      prev.map((o) =>
        orderIds.includes(o.id)
          ? {
              ...o,
              deliveryDate: trimmed,
              month: newMonth !== undefined ? newMonth : o.month,
              updatedAt: new Date().toISOString(),
            }
          : o
      )
    );
    const displayDate = trimmed ? formatDateDDMMYYYY(trimmed) : "để trống";
    showToastNotification(`Đã sửa ngày giao thành "${displayDate}" cho ${orderIds.length} đơn hàng!`);
  };

  const handleBatchUpdateMonth = (newMonth: number, orderIds: string[]) => {
    const safeMonth = Math.min(12, Math.max(1, Math.round(newMonth)));
    setOrders((prev) =>
      prev.map((o) => {
        if (!orderIds.includes(o.id)) return o;
        const curDate = o.deliveryDate || recordDate || getLocalTodayISO();
        const updatedDate = updateDateWithMonth(curDate, safeMonth);
        return {
          ...o,
          month: safeMonth,
          deliveryDate: updatedDate,
          updatedAt: new Date().toISOString(),
        };
      })
    );
    showToastNotification(`Đã sửa tháng thành "Tháng ${safeMonth}" cho ${orderIds.length} đơn hàng!`);
  };

  const handleBatchDeleteOrders = (orderIds: string[]) => {
    setOrders((prev) => {
      const next = prev.filter((o) => !orderIds.includes(o.id));
      handleAutoBackupAllData({ customOrders: next, silent: true });
      return next;
    });
    showToastNotification(`Đã xóa ${orderIds.length} đơn hàng đã chọn!`);
  };

  // Save / Update Backup Handlers
  const handleSaveNewBackup = () => {
    const allReminders = loadReminders();
    if (!hasLoadedData && !driverName && !customerName && !vehicleNumber && allReminders.length === 0) {
      setErrorMessage("Chưa có dữ liệu số phiếu, đơn hàng hoặc nhắc hẹn để sao lưu.");
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    const newRecordId = "rec_" + Date.now() + "_" + Math.random().toString(36).substring(2, 7);

    handleAutoBackupAllData({
      targetRecordId: newRecordId,
      toastMessage: `Đã sao lưu tất cả dữ liệu lúc ${formatBackupDateTime(nowIso, true)} theo thời gian thực!`,
    });
  };

  const handleUpdateBackup = (targetId?: string) => {
    const idToUpdate = targetId || currentRecordId;
    if (!idToUpdate) {
      handleSaveNewBackup();
      return;
    }

    const now = new Date();
    const nowIso = now.toISOString();
    handleAutoBackupAllData({
      targetRecordId: idToUpdate,
      toastMessage: `Đã cập nhật sao lưu tất cả dữ liệu lúc ${formatBackupDateTime(nowIso, true)} theo thời gian thực!`,
    });
  };

  const handleMergeBackupOrders = (record: BackupRecord) => {
    const loadedNumbers = record.warehouseNumbers || record.image2Numbers || [];
    const incomingOrders: DeliveryOrder[] =
      record.orders && record.orders.length > 0
        ? record.orders.map((o) => ({
            ...o,
            area: o.area || o.deliveryLocation || record.area || record.deliveryLocation || "",
            deliveryLocation: o.deliveryLocation || o.area || record.deliveryLocation || record.area || "",
            deliveryDate: o.deliveryDate || "",
          }))
        : loadedNumbers.map((num, idx) => ({
            id: "ord_" + (record.id || "loaded") + "_" + num + "_" + idx,
            ticketNumber: num,
            vehicleNumber: record.vehicleNumber || "",
            driverName: record.driverName || "",
            customerName: record.customerName || "",
            area: record.area || record.deliveryLocation || "",
            deliveryLocation: record.deliveryLocation || record.area || "",
            deliveryDate: record.recordDate || getLocalTodayISO(),
            status: "delivered" as OrderStatus,
            notes: "",
          }));

    if (incomingOrders.length === 0) {
      setErrorMessage("Bản sao lưu này không có đơn hàng nào để gộp.");
      return;
    }

    setOrders((prev) => {
      const existingMap = new Map<string, DeliveryOrder>();
      prev.forEach((o) => existingMap.set(String(o.ticketNumber).trim().toLowerCase(), o));

      const updated = [...prev];
      let mergedCount = 0;
      let addedCount = 0;

      incomingOrders.forEach((inOrd) => {
        const ticketKey = String(inOrd.ticketNumber).trim().toLowerCase();
        if (existingMap.has(ticketKey)) {
          const idx = updated.findIndex((o) => String(o.ticketNumber).trim().toLowerCase() === ticketKey);
          if (idx >= 0) {
            updated[idx] = {
              ...updated[idx],
              vehicleNumber: inOrd.vehicleNumber || updated[idx].vehicleNumber,
              driverName: inOrd.driverName || updated[idx].driverName,
              customerName: inOrd.customerName || updated[idx].customerName,
              area: inOrd.area || inOrd.deliveryLocation || updated[idx].area || updated[idx].deliveryLocation,
              deliveryLocation: inOrd.deliveryLocation || inOrd.area || updated[idx].deliveryLocation || updated[idx].area,
              deliveryDate: inOrd.deliveryDate || updated[idx].deliveryDate,
              status: inOrd.status || updated[idx].status,
              notes: inOrd.notes || updated[idx].notes,
              updatedAt: new Date().toISOString(),
            };
            mergedCount++;
          }
        } else {
          updated.push(inOrd);
          existingMap.set(ticketKey, inOrd);
          addedCount++;
        }
      });

      return updated.sort((a, b) => compareOrdersByMonthThenTicket(a, b));
    });

    if (record.manualNumbers && record.manualNumbers.length > 0) {
      setManualNumbers((prev) =>
        Array.from(new Set([...prev, ...record.manualNumbers]))
      );
    }

    showToastNotification(
      `Đã gộp thành công ${incomingOrders.length} đơn từ bản sao lưu "${
        record.customerName || record.driverName || record.recordDate
      }" vào danh sách!`
    );
  };

  const handleLoadRecord = (record: BackupRecord) => {
    const loadedPages = record.pages || record.pages2 || record.pages1 || [];
    let loadedManual = record.manualNumbers || record.manualNumbers2 || [];
    if (record.id === "backup_default_latest" && loadedManual.length === 8 && loadedManual[0] === 52) {
      loadedManual = [];
    }
    const loadedNumbers = record.warehouseNumbers || record.image2Numbers || [];

    const loadedOrders: DeliveryOrder[] =
      record.orders && record.orders.length > 0
        ? record.orders.map((o) => ({
            ...o,
            area: o.area || o.deliveryLocation || record.area || record.deliveryLocation || "",
            deliveryLocation: o.deliveryLocation || o.area || record.deliveryLocation || record.area || "",
            deliveryDate: o.deliveryDate || "",
          }))
        : loadedNumbers.map((num, idx) => ({
            id: "ord_" + (record.id || "loaded") + "_" + num + "_" + idx,
            ticketNumber: num,
            vehicleNumber: record.vehicleNumber || "",
            driverName: record.driverName || "",
            customerName: record.customerName || "",
            area: record.area || record.deliveryLocation || "",
            deliveryLocation: record.deliveryLocation || record.area || "",
            deliveryDate: record.recordDate || getLocalTodayISO(),
            status: "delivered" as OrderStatus,
            notes: "",
          }));

    setPages(loadedPages);
    setManualNumbers(loadedManual);
    setOrders(loadedOrders);
    setDriverName(record.driverName || "");
    setCustomerName(record.customerName || "");
    setArea(record.area || record.deliveryLocation || "");
    setDeliveryLocation(record.deliveryLocation || record.area || "");
    setVehicleNumber(record.vehicleNumber || "");
    setRecordDate(record.recordDate || new Date().toISOString().slice(0, 10));
    setNotes(record.notes || "");
    setCurrentRecordId(record.id);
    setDateAutoSource("Được nạp từ bản sao lưu");
    setCustomerAutoSource(null);
    setErrorMessage(null);
    setActivePreviewPageId(loadedPages[0]?.id || null);

    if (record.reminders && record.reminders.length > 0) {
      const currentStored = loadReminders();
      const mergedMap = new Map<string, ReminderNote>();
      currentStored.forEach((r) => mergedMap.set(r.id, r));
      record.reminders.forEach((r) => {
        if (!mergedMap.has(r.id)) {
          mergedMap.set(r.id, r);
        }
      });
      const mergedList = Array.from(mergedMap.values());
      saveReminders(mergedList);
      setRemindersCount(mergedList.length);
    }

    showToastNotification(`Đã mở bản ghi: ${record.customerName || record.driverName || "Đã tải"}`);
  };

  const handleLoadLatestBackup = () => {
    const latest = getLatestBackupRecord(loadBackups());
    if (latest) {
      handleLoadRecord(latest);
      showToastNotification(`Đã hiện tất cả danh sách từ bản sao lưu mới nhất: ${latest.customerName || latest.driverName || latest.recordDate}`);
    } else {
      showToastNotification("Chưa tìm thấy bản sao lưu nào");
    }
  };

  // Mount effect: Ensure DANH SÁCH is never empty on load by fetching latest backup if needed
  useEffect(() => {
    if (orders.length === 0) {
      const latest = getLatestBackupRecord(loadBackups());
      if (latest) {
        handleLoadRecord(latest);
      }
    }
  }, []);

  const handleStartNewSession = () => {
    setPages([]);
    setManualNumbers([]);
    setOrders([]);
    setCurrentRecordId(null);
    setDriverName("");
    setCustomerName("");
    setArea("");
    setDeliveryLocation("");
    setVehicleNumber("");
    setCustomerAutoSource(null);
    setNotes("");
    setDateAutoSource(null);
    setRecordDate(new Date().toISOString().slice(0, 10));
    setErrorMessage(null);
    setActivePreviewPageId(null);
    showToastNotification("Đã bắt đầu phiên nhập mới");
  };

  const handleReset = () => {
    handleStartNewSession();
    setIsLoading(false);
  };

  const handleAddReminderForOrder = (order: DeliveryOrder) => {
    setReminderPrefill({
      ticketNumber: order.ticketNumber,
      customerName: order.customerName,
      vehicleNumber: order.vehicleNumber,
    });
    setActivePage("reminders");
    setRemindersCount(loadReminders().length);
    showToastNotification(`Mở ghi chú nhắc hẹn cho số phiếu #${order.ticketNumber}`);
  };

  const handleNavigateToOrderFromReminder = (ticketNum: number | string) => {
    setTargetTicketNumber(ticketNum);
    setActivePage("main");
    setRemindersCount(loadReminders().length);
    showToastNotification(`Đã chuyển sang DANH SÁCH - Đang hiển thị đơn số phiếu #${ticketNum}`);
  };

  // Quản lý trạng thái Thu gọn / Mở rộng thanh công cụ trên cùng
  const [isToolbarCollapsed, setIsToolbarCollapsed] = useState(false);

  return (
    <div
      className="min-h-screen bg-slate-50 text-slate-800 selection:bg-emerald-100 selection:text-emerald-900 pb-12 font-sans transition-all"
      style={{
        zoom: effectiveScale !== 100 ? `${effectiveScale / 100}` : undefined,
      }}
    >
      {/* Nút biểu tượng mở rộng ghim ở góc trên cùng bên phải khi thanh công cụ đang thu gọn (chỉ hiện icon, ẩn chữ) */}
      {isToolbarCollapsed && (
        <div className="fixed top-2 right-2.5 sm:right-4 z-50 animate-in fade-in zoom-in-95 duration-200">
          <button
            type="button"
            onClick={() => setIsToolbarCollapsed(false)}
            className="w-9 h-9 flex items-center justify-center bg-white/95 hover:bg-emerald-50 text-emerald-700 hover:text-emerald-950 rounded-xl border border-emerald-300 shadow-md hover:shadow-lg transition-all cursor-pointer active:scale-90 group backdrop-blur-md"
            title="Mở rộng thanh công cụ trên cùng"
            aria-label="Mở rộng thanh công cụ trên cùng"
          >
            <ChevronDown className="w-4 h-4 text-emerald-700 group-hover:translate-y-0.5 transition-transform" />
          </button>
        </div>
      )}

      {/* Decorative top border */}
      <div className={`h-1 bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 w-full transition-opacity duration-300 ${isToolbarCollapsed ? "opacity-30" : "opacity-100"}`} />

      {/* Main Header Bar - Sticky with smooth transition & zero blank space when collapsed */}
      <header
        className={`sticky top-0 z-30 w-full transition-all duration-300 ease-in-out ${
          isToolbarCollapsed
            ? "max-h-0 opacity-0 -translate-y-full pointer-events-none overflow-hidden"
            : "max-h-[500px] opacity-100 translate-y-0 overflow-visible shadow-xs"
        }`}
      >
        <CommonToolbar
          activePage={activePage}
          onNavigatePage={(page) => {
            if (page === "reminders") {
              setReminderPrefill(null);
            }
            setActivePage(page);
            setRemindersCount(loadReminders().length);
          }}
          liveCurrentTime={liveCurrentTime}
          currentRecordId={currentRecordId}
          lastSavedText={(() => {
            const active = backups.find((b) => b.id === currentRecordId);
            return active
              ? formatBackupDateTime(active.updatedAt || active.createdAt, true)
              : null;
          })()}
          uiScale={uiScale}
          effectiveScale={effectiveScale}
          onScaleChange={(val) => setUiScale(val)}
          autoFitScreen={autoFitScreen}
          onAutoFitChange={(val) => setAutoFitScreen(val)}
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          onResetScale={handleResetScale}
          remindersCount={remindersCount}
          backupsCount={backups.length}
          onSaveOrUpdateBackup={() => {
            if (currentRecordId) {
              handleUpdateBackup(currentRecordId);
            } else {
              handleSaveNewBackup();
            }
          }}
          onComprehensiveFullBackup={handleComprehensiveFullBackup}
          onOpenBackupHistory={() => setIsBackupModalOpen(true)}
          onStartNewSession={handleStartNewSession}
          onResetSession={handleReset}
          onToggleCollapse={() => setIsToolbarCollapsed(true)}
        />

        {/* Global Loading Banner on Top of Screen */}
        {isLoading && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3.5 sm:p-4 rounded-2xl bg-linear-to-r from-emerald-600 to-teal-700 text-white flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg ring-4 ring-emerald-500/20"
          >
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-white/20 flex items-center justify-center shrink-0">
                <RotateCw className="w-5 h-5 animate-spin text-white" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-extrabold uppercase tracking-wider text-xs">
                    {uploadStatus?.stepText || "Hệ thống đang tải ảnh lên & quét số phiếu kho..."}
                  </span>
                  {uploadStatus && uploadStatus.total > 0 && (
                    <span className="px-2 py-0.5 rounded-full bg-white/20 text-white font-mono font-bold text-[10px]">
                      {uploadStatus.current}/{uploadStatus.total}
                    </span>
                  )}
                </div>
                <p className="text-emerald-100 text-xs mt-0.5">
                  {uploadStatus?.fileName
                    ? `File: ${uploadStatus.fileName} • Đang nhận diện AI và lọc số phiếu kho (1 - 1500). Vui lòng không đóng trang!`
                    : "Đang xử lý ảnh tải lên và nhận diện văn bản OCR tự động. Vui lòng đợi trong giây lát..."}
                </p>
              </div>
            </div>

            {uploadStatus && uploadStatus.total > 0 && (
              <div className="flex items-center gap-2 self-end sm:self-center shrink-0 bg-white/10 px-3 py-1.5 rounded-xl border border-white/20">
                <div className="w-24 bg-white/20 rounded-full h-2 overflow-hidden">
                  <div
                    className="bg-white h-2 rounded-full transition-all duration-300"
                    style={{
                      width: `${Math.max(10, Math.round((uploadStatus.current / uploadStatus.total) * 100))}%`,
                    }}
                  />
                </div>
                <span className="text-xs font-mono font-bold">
                  {Math.round((uploadStatus.current / uploadStatus.total) * 100)}%
                </span>
              </div>
            )}
          </motion.div>
        )}

        {/* Global Error Banner */}
        {errorMessage && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-3 p-3.5 rounded-xl bg-red-50 border border-red-200 text-red-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-xs"
          >
            <div className="flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold uppercase tracking-wider text-[11px] block">Lỗi nhận diện / hệ thống:</span>
                <p className="mt-0.5 text-red-800 font-medium leading-relaxed">
                  {errorMessage}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 self-end sm:self-center shrink-0">
              {pages.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setErrorMessage(null);
                    handleScanAll();
                  }}
                  className="px-3 py-1.5 rounded-lg bg-red-600 hover:bg-red-700 text-white font-semibold text-xs transition-colors flex items-center gap-1.5 cursor-pointer shadow-xs"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Quét lại toàn bộ</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setErrorMessage(null)}
                className="px-3 py-1.5 rounded-lg bg-white hover:bg-red-100 text-red-700 border border-red-200 font-semibold text-xs transition-colors cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </motion.div>
        )}
      </header>

      {/* Main Content Body - Full Width */}
      <main className="w-full px-3 sm:px-5 lg:px-6 py-3.5 space-y-5">
        {activePage === "main" ? (
          <>
            {/* 1, 2, 3. THÊM SỐ PHIẾU, SỐ PHIẾU GIAO NHẬN, THÔNG TIN SỐ PHIẾU */}
            <WarehouseNumbersManager
              pages={pages}
              manualNumbers={manualNumbers}
              allNumbers={allWarehouseNumbers}
              driverName={driverName}
              customerName={customerName}
              area={area}
              deliveryLocation={deliveryLocation}
              vehicleNumber={vehicleNumber}
              recordDate={recordDate}
              customerAutoSource={customerAutoSource}
              dateAutoSource={dateAutoSource}
              orders={orders}
              onAddManualNumber={handleAddManualNumber}
              onAddBatchNumbers={handleAddBatchNumbers}
              onRemoveNumber={handleRemoveNumber}
              onRemoveBatchNumbers={handleRemoveBatchNumbers}
              onEditNumber={handleEditNumber}
              onClearAllNumbers={handleClearWarehouseStaging}
              activePreviewPageId={activePreviewPageId}
              setActivePreviewPageId={setActivePreviewPageId}
              onSyncWarehouseToOrders={handleSyncWarehouseToOrders}
              onAddNumberToPage={handleAddNumberToPage}
            />

            {/* 4. DANH SÁCH: Bộ lọc Số xe, Khách hàng, Khu vực, Ngày giao, Người giao, chọn hàng loạt & Phần sao lưu cập nhật dữ liệu */}
            <DeliveryOrdersTable
              orders={orders}
              targetTicketNumber={targetTicketNumber}
              onClearTargetTicketNumber={() => setTargetTicketNumber(null)}
              warehouseNumbers={allWarehouseNumbers}
              onUpdateOrder={handleUpdateOrder}
              onAddOrder={handleAddOrder}
              onDeleteOrder={handleDeleteOrder}
              onBatchUpdateStatus={handleBatchUpdateStatus}
              onBatchUpdateDriver={handleBatchUpdateDriver}
              onBatchUpdateVehicle={handleBatchUpdateVehicle}
              onBatchUpdateCustomer={handleBatchUpdateCustomer}
              onBatchUpdateArea={handleBatchUpdateArea}
              onBatchUpdateDeliveryDate={handleBatchUpdateDeliveryDate}
              onBatchUpdateMonth={handleBatchUpdateMonth}
              onBatchDeleteOrders={handleBatchDeleteOrders}
              defaultDriverName={driverName}
              defaultCustomerName={customerName}
              defaultArea={area}
              defaultDeliveryLocation={deliveryLocation}
              defaultRecordDate={recordDate}
              defaultVehicleNumber={vehicleNumber}
              customerAutoSource={customerAutoSource}
              dateAutoSource={dateAutoSource}
              currentRecordId={currentRecordId}
              onSaveBackup={handleSaveNewBackup}
              onUpdateBackup={handleUpdateBackup}
              backups={backups}
              onLoadRecord={handleLoadRecord}
              onMergeBackupOrders={handleMergeBackupOrders}
              onLoadLatestBackup={handleLoadLatestBackup}
              onOpenBackupModal={() => setIsBackupModalOpen(true)}
              onOpenShareModal={() => setIsShareModalOpen(true)}
              onAddReminderForOrder={handleAddReminderForOrder}
              onOpenRemindersPage={() => {
                setReminderPrefill(null);
                setActivePage("reminders");
                setRemindersCount(loadReminders().length);
              }}
              remindersCount={remindersCount}
            />

            {/* 5. CÁC KHU VỰC CÒN LẠI: Tải Dữ Liệu Giao Nhận */}
            <WarehouseImageUploader
              pages={pages}
              onAddImages={handleAddImages}
              isLoading={isLoading}
              uploadStatus={uploadStatus}
              onClearPage={handleClearPage}
              onClearAll={handleClearWarehouseStaging}
              onScanAll={handleScanAll}
              onPreviewPage={(pageId) => setActivePreviewPageId(pageId)}
              activePreviewPageId={activePreviewPageId}
            />

            {/* 6. CÁC KHU VỰC CÒN LẠI: Thông Tin Dữ Liệu Đã Tải Lên & Trình Xem Chứng Từ */}
            <UploadedDataInspector
              pages={pages}
              manualNumbers={manualNumbers}
              allNumbers={allWarehouseNumbers}
              onRemoveNumber={handleRemoveNumber}
              onAddNumberToPage={handleAddNumberToPage}
              activePreviewPageId={activePreviewPageId}
              setActivePreviewPageId={setActivePreviewPageId}
              driverName={driverName}
              customerName={customerName}
              vehicleNumber={vehicleNumber}
              area={area}
              recordDate={recordDate}
            />
          </>
        ) : activePage === "reminders" ? (
          /* TRANG MỚI: GHI CHÚ NHẮC HẸN */
          <ReminderNotesManager
            orders={orders}
            onBackToMain={() => {
              setActivePage("main");
              setRemindersCount(loadReminders().length);
            }}
            onNavigateToOrder={handleNavigateToOrderFromReminder}
            onRemindersChange={() => setRemindersCount(loadReminders().length)}
            onAutoBackupAllData={(isNewReminder) => {
              const nowIso = new Date().toISOString();
              const timeFormatted = formatBackupDateTime(nowIso, true);
              handleAutoBackupAllData({
                customReminders: loadReminders(),
                toastMessage: isNewReminder
                  ? `Đã thêm nhắc hẹn mới & tự động sao lưu toàn bộ dữ liệu lúc ${timeFormatted}!`
                  : undefined,
                silent: !isNewReminder,
              });
            }}
            prefillTicketNumber={reminderPrefill?.ticketNumber}
            prefillCustomerName={reminderPrefill?.customerName}
            prefillVehicleNumber={reminderPrefill?.vehicleNumber}
          />
        ) : (
          /* MODULE RIÊNG: THƯỞNG & CHIẾT KHẤU NHÀ CUNG CẤP */
          <SupplierBonusManager
            onBackToMain={() => setActivePage("main")}
            existingCustomerSuggestions={getCustomerSuggestions()}
            onAutoBackupNotification={(msg) => showToastNotification(msg)}
          />
        )}
      </main>

      {/* Backup and Data Manager Modal */}
      <BackupModal
        isOpen={isBackupModalOpen}
        onClose={() => setIsBackupModalOpen(false)}
        backups={backups}
        onRefreshBackups={() => setBackups(loadBackups())}
        currentRecordId={currentRecordId}
        onLoadRecord={handleLoadRecord}
        onUpdateCurrentRecordWithData={(id) => handleUpdateBackup(id)}
      />

      {/* Share Application & Data Sync Modal */}
      <ShareAppModal
        isOpen={isShareModalOpen}
        onClose={() => setIsShareModalOpen(false)}
        orders={orders}
        warehouseNumbers={allWarehouseNumbers}
        remindersCount={remindersCount}
        onDataImported={() => {
          setBackups(loadBackups());
          const latest = getLatestBackupRecord(loadBackups());
          if (latest) handleLoadRecord(latest);
        }}
        showToastNotification={showToastNotification}
      />

      {/* Footer (Hidden) */}
      <footer className="hidden">
        <p className="hidden">Quản Lý Số Giao Hàng Kho • Google AI Studio Build 2026.</p>
      </footer>

      {/* Floating Toast Notification */}
      {saveToast && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="fixed bottom-5 right-5 z-50 py-2.5 px-4 bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2.5 shadow-2xl border border-slate-700"
        >
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{saveToast}</span>
          <button
            type="button"
            onClick={() => setSaveToast(null)}
            className="ml-2 text-slate-300 hover:text-white text-xs font-bold cursor-pointer"
          >
            ✕
          </button>
        </motion.div>
      )}
    </div>
  );
}
