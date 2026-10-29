import { BackupRecord, DeliveryOrder, ReminderNote, ImagePage } from "../types";
import { getLocalTodayISO } from "./dateUtils";
import {
  getSavedPrintTemplate,
  savePrintTemplate,
  PrintTemplateConfig,
} from "./printTemplateStorage";
import {
  getSavedQuickMessages,
  saveQuickMessages,
  QuickMessage,
} from "./quickMessagesStorage";
import { loadReminders, saveReminders } from "./reminderStorage";
import { loadSupplierBonusData, saveSupplierBonusData } from "./supplierBonusStorage";

const BACKUP_STORAGE_KEY = "giao_nhan_records_backup_v1";
const DRIVERS_KEY = "giao_nhan_driver_names_v1";
const CUSTOMERS_KEY = "giao_nhan_customer_names_v1";
const VEHICLES_KEY = "giao_nhan_vehicle_plates_v1";
const AREAS_KEY = "giao_nhan_areas_v1";
const LOCATIONS_KEY = "giao_nhan_delivery_locations_v1";

const INITIAL_BACKUP_DATE = getLocalTodayISO();

export const INITIAL_SAMPLE_BACKUP: BackupRecord = {
  id: "backup_default_latest",
  driverName: "Nguyễn Văn Tuấn",
  customerName: "Đại lý Minh Phát",
  area: "Miền Đông",
  deliveryLocation: "Kho Biên Hòa",
  vehicleNumber: "60C-51100",
  recordDate: INITIAL_BACKUP_DATE,
  notes: "Bản sao lưu đối soát toàn bộ danh sách đơn hàng và sổ kho mới nhất",
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  pages: [],
  manualNumbers: [],
  warehouseNumbers: [],
  orders: [
    {
      id: "ord_sample_52",
      ticketNumber: 52,
      driverName: "Nguyễn Văn Tuấn",
      customerName: "Đại lý Minh Phát",
      area: "Miền Đông",
      deliveryLocation: "Kho Biên Hòa",
      vehicleNumber: "60C-51100",
      deliveryDate: INITIAL_BACKUP_DATE,
      status: "delivering",
      notes: "Hẹn khách giao trước 15:00 & kiểm đếm phiếu",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ord_sample_78",
      ticketNumber: 78,
      driverName: "Trần Hữu Thắng",
      customerName: "Công ty Tân Á Đông",
      area: "Bình Dương",
      deliveryLocation: "Kho Dĩ An",
      vehicleNumber: "60H-03519",
      deliveryDate: INITIAL_BACKUP_DATE,
      status: "delivered",
      notes: "Đã ký nhận đủ 2 liên hóa đơn đỏ",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ord_sample_104",
      ticketNumber: 104,
      driverName: "Nguyễn Văn Tuấn",
      customerName: "Đại lý Minh Phát",
      vehicleNumber: "60C-51100",
      deliveryDate: INITIAL_BACKUP_DATE,
      status: "delivered",
      notes: "Bàn giao tại kho bãi số 2",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ord_sample_116",
      ticketNumber: 116,
      driverName: "Lê Văn Hùng",
      customerName: "Vật liệu Xây dựng Hòa Phát",
      vehicleNumber: "51D-88214",
      deliveryDate: INITIAL_BACKUP_DATE,
      status: "delivering",
      notes: "Khách hẹn giao buổi chiều",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ord_sample_128",
      ticketNumber: 128,
      driverName: "Nguyễn Văn Tuấn",
      customerName: "Đại lý Minh Phát",
      vehicleNumber: "60C-51100",
      deliveryDate: INITIAL_BACKUP_DATE,
      status: "delivered",
      notes: "Đã hoàn tất kiểm kê hàng hóa",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ord_sample_142",
      ticketNumber: 142,
      driverName: "Phạm Văn Bình",
      customerName: "Kho Vận Miền Đông",
      vehicleNumber: "60C-33821",
      deliveryDate: INITIAL_BACKUP_DATE,
      status: "pending",
      notes: "Chưa Nhận Đơn",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ord_sample_155",
      ticketNumber: 155,
      driverName: "Trần Hữu Thắng",
      customerName: "Công ty Tân Á Đông",
      vehicleNumber: "60H-03519",
      deliveryDate: INITIAL_BACKUP_DATE,
      status: "delivered",
      notes: "Giao xong trong ca sáng",
      createdAt: new Date().toISOString(),
    },
    {
      id: "ord_sample_169",
      ticketNumber: 169,
      driverName: "Nguyễn Văn Tuấn",
      customerName: "Đại lý Minh Phát",
      vehicleNumber: "60C-51100",
      deliveryDate: INITIAL_BACKUP_DATE,
      status: "delivered",
      notes: "Phiếu đã ký giáp lai",
      createdAt: new Date().toISOString(),
    },
  ],
};

export function getLatestBackupRecord(records?: BackupRecord[]): BackupRecord | null {
  const list = records && records.length > 0 ? records : loadBackups();
  if (!list || list.length === 0) return null;
  const sorted = [...list].sort((a, b) => {
    const timeA = new Date(a.updatedAt || a.createdAt || 0).getTime();
    const timeB = new Date(b.updatedAt || b.createdAt || 0).getTime();
    return timeB - timeA;
  });
  // Prefer records that have orders or warehouse numbers
  const withOrders = sorted.find(
    (b) => (b.orders && b.orders.length > 0) || (b.warehouseNumbers && b.warehouseNumbers.length > 0)
  );
  return withOrders || sorted[0];
}

export function loadBackups(): BackupRecord[] {
  try {
    const raw = localStorage.getItem(BACKUP_STORAGE_KEY);
    if (!raw) {
      saveBackupsList([INITIAL_SAMPLE_BACKUP]);
      return [INITIAL_SAMPLE_BACKUP];
    }
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed) || parsed.length === 0) {
      saveBackupsList([INITIAL_SAMPLE_BACKUP]);
      return [INITIAL_SAMPLE_BACKUP];
    }
    let needsPersist = false;
    const records = parsed.map((r: any) => {
      let pages = r.pages || r.pages2 || r.pages1 || [];
      let manualNumbers = r.manualNumbers || r.manualNumbers2 || [];
      let warehouseNumbers = r.warehouseNumbers || r.image2Numbers || [];
      
      // Clear sample staging numbers if present from default sample
      if (
        r.id === "backup_default_latest" &&
        Array.isArray(manualNumbers) &&
        manualNumbers.length === 8 &&
        manualNumbers[0] === 52
      ) {
        manualNumbers = [];
        warehouseNumbers = [];
        needsPersist = true;
      }

      const orders = Array.isArray(r.orders) && r.orders.length > 0
        ? r.orders
        : warehouseNumbers.map((num: number, idx: number) => ({
            id: `ord_${r.id || "legacy"}_${num}_${idx}`,
            ticketNumber: num,
            driverName: r.driverName || "",
            customerName: r.customerName || "",
            deliveryDate: r.recordDate || getLocalTodayISO(),
            status: "delivered",
          }));
      return {
        ...r,
        pages,
        manualNumbers,
        warehouseNumbers,
        orders,
      };
    });
    if (needsPersist) {
      saveBackupsList(records);
    }
    return records;
  } catch (err) {
    console.error("Failed to load backups from localStorage:", err);
    return [INITIAL_SAMPLE_BACKUP];
  }
}

export function saveBackupsList(records: BackupRecord[]): boolean {
  try {
    localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(records));
    return true;
  } catch (err: any) {
    console.warn("localStorage quota exceeded or failed, attempting lightweight save:", err);
    // If quota exceeded, try stripping high-res previews to preserve critical records & numbers
    try {
      const lightweightRecords = records.map((r) => ({
        ...r,
        pages: (r.pages || []).map((p) => ({
          ...p,
          preview: p.preview && p.preview.length > 50000 ? "" : p.preview,
        })),
      }));
      localStorage.setItem(BACKUP_STORAGE_KEY, JSON.stringify(lightweightRecords));
      return true;
    } catch (innerErr) {
      console.error("Could not save to localStorage even with lightweight mode:", innerErr);
      return false;
    }
  }
}

export function saveOrUpdateBackup(record: BackupRecord): { success: boolean; isUpdate: boolean; error?: string } {
  const existing = loadBackups();
  const index = existing.findIndex((item) => item.id === record.id);
  let updatedList: BackupRecord[];
  let isUpdate = false;
  const now = new Date();
  const nowIso = now.toISOString();

  if (index >= 0) {
    // Update existing record with real-time timestamp
    isUpdate = true;
    updatedList = [...existing];
    updatedList[index] = {
      ...record,
      recordDate: record.recordDate || existing[index].recordDate || getLocalTodayISO(now),
      updatedAt: nowIso,
    };
  } else {
    // Insert new record at top with real-time timestamp
    updatedList = [
      {
        ...record,
        recordDate: record.recordDate || getLocalTodayISO(now),
        createdAt: record.createdAt || nowIso,
        updatedAt: nowIso,
      },
      ...existing,
    ];
  }

  const ok = saveBackupsList(updatedList);
  if (!ok) {
    return { success: false, isUpdate, error: "Bộ nhớ trình duyệt đã đầy. Bạn có thể xuất file JSON để lưu trữ vĩnh viễn." };
  }

  // Save suggestions for driver and customer
  if (record.driverName.trim()) {
    addDriverSuggestion(record.driverName.trim());
  }
  if (record.customerName.trim()) {
    addCustomerSuggestion(record.customerName.trim());
  }

  return { success: true, isUpdate };
}

export function deleteBackup(recordId: string): boolean {
  const existing = loadBackups();
  const filtered = existing.filter((item) => item.id !== recordId);
  return saveBackupsList(filtered);
}

export function clearAllBackups(): boolean {
  try {
    localStorage.removeItem(BACKUP_STORAGE_KEY);
    return true;
  } catch {
    return false;
  }
}

export function getBackupExportFilename(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const hh = pad(date.getHours());
  const mm = pad(date.getMinutes());
  const dd = pad(date.getDate());
  const month = pad(date.getMonth() + 1);
  const yyyy = date.getFullYear();
  return `saoluu_${hh}${mm}_${dd}${month}${yyyy}.json`;
}

export function exportBackupsToJson(records?: BackupRecord[]) {
  const dataToExport = records || loadBackups();
  const jsonStr = JSON.stringify(dataToExport, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = getBackupExportFilename(new Date());
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function exportSingleBackupToJson(record: BackupRecord) {
  const jsonStr = JSON.stringify(record, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = getBackupExportFilename(new Date());
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export interface ComprehensiveBackupPackage {
  appName: string;
  version: string;
  exportedAt: string;
  description: string;
  summary: {
    totalOrders: number;
    totalReminders: number;
    totalBackups: number;
    hasPrintTemplate: boolean;
    hasQuickMessages: boolean;
  };
  // 1. Danh sách đơn hàng & phiên hiện hành
  currentSession: {
    recordId?: string;
    driverName: string;
    customerName: string;
    area: string;
    deliveryLocation: string;
    vehicleNumber: string;
    recordDate: string;
    notes: string;
    orders: DeliveryOrder[];
    warehouseNumbers: (number | string)[];
    manualNumbers: number[];
    pages: ImagePage[];
  };
  // 2. Ghi chú công việc / nhắc nhở
  reminders: ReminderNote[];
  // 3. Tùy chọn cấu hình mẫu in
  printTemplate: PrintTemplateConfig;
  // 4. Danh sách mẫu lời nhắn nhanh (mặc định + tự tạo)
  quickMessages: QuickMessage[];
  // 5. Toàn bộ các bản sao lưu trước đó
  backups: BackupRecord[];
  // 6. Danh mục gợi ý đã lưu
  suggestions: {
    drivers: string[];
    customers: string[];
    vehicles: string[];
    areas: string[];
    locations: string[];
  };
  // 7. Cấu hình bảng hiển thị
  tableSettings?: {
    visibleColumns?: any;
    columnWidths?: any;
  };
  // 8. Dữ liệu module Thưởng & Chiết khấu Nhà cung cấp
  supplierBonusData?: any;
}

export function exportComprehensiveFullBackup(currentSessionData?: Partial<BackupRecord> & { orders?: DeliveryOrder[] }): {
  success: boolean;
  filename: string;
  summary: string;
  packageData: ComprehensiveBackupPackage;
} {
  const now = new Date();
  const nowIso = now.toISOString();

  // Load all parts
  const allBackups = loadBackups();
  const allReminders = loadReminders();
  const printTemplate = getSavedPrintTemplate();
  const quickMessages = getSavedQuickMessages();
  const drivers = getDriverSuggestions();
  const customers = getCustomerSuggestions();
  const vehicles = getVehicleSuggestions();
  const areas = getAreaSuggestions();
  const locations = getDeliveryLocationSuggestions();

  let visibleColumns = null;
  let columnWidths = null;
  try {
    const rawCols = localStorage.getItem("delivery_orders_visible_columns_v1");
    if (rawCols) visibleColumns = JSON.parse(rawCols);
    const rawWidths = localStorage.getItem("delivery_orders_column_widths_v1");
    if (rawWidths) columnWidths = JSON.parse(rawWidths);
  } catch {
    // ignore
  }

  // Current session orders & info
  const latest = allBackups[0] || null;
  const currentOrders: DeliveryOrder[] = currentSessionData?.orders || latest?.orders || [];
  const currentSession = {
    recordId: currentSessionData?.id || latest?.id || "rec_current",
    driverName: currentSessionData?.driverName || latest?.driverName || "",
    customerName: currentSessionData?.customerName || latest?.customerName || "",
    area: currentSessionData?.area || latest?.area || "",
    deliveryLocation: currentSessionData?.deliveryLocation || latest?.deliveryLocation || "",
    vehicleNumber: currentSessionData?.vehicleNumber || latest?.vehicleNumber || "",
    recordDate: currentSessionData?.recordDate || latest?.recordDate || nowIso.slice(0, 10),
    notes: currentSessionData?.notes || latest?.notes || "",
    orders: currentOrders,
    warehouseNumbers: currentSessionData?.warehouseNumbers || latest?.warehouseNumbers || currentOrders.map((o) => o.ticketNumber),
    manualNumbers: currentSessionData?.manualNumbers || latest?.manualNumbers || [],
    pages: currentSessionData?.pages || latest?.pages || [],
  };

  const fullPackage: ComprehensiveBackupPackage = {
    appName: "Theo dõi giao nhận và Ghi chú",
    version: "2.5-comprehensive-backup",
    exportedAt: nowIso,
    description: "Bản sao lưu toàn bộ hệ thống: Danh sách đơn hàng, Ghi chú công việc, Tùy chọn mẫu in, Lời nhắn nhanh, và các bản sao lưu trước đó",
    summary: {
      totalOrders: currentOrders.length,
      totalReminders: allReminders.length,
      totalBackups: allBackups.length,
      hasPrintTemplate: true,
      hasQuickMessages: true,
    },
    currentSession,
    reminders: allReminders,
    printTemplate,
    quickMessages,
    backups: allBackups,
    suggestions: {
      drivers,
      customers,
      vehicles,
      areas,
      locations,
    },
    tableSettings: {
      visibleColumns,
      columnWidths,
    },
    supplierBonusData: loadSupplierBonusData(),
  };

  const jsonStr = JSON.stringify(fullPackage, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  const filename = getBackupExportFilename(now).replace("saoluu_", "saoluu_toanbo_ungdung_");
  link.href = url;
  link.setAttribute("download", filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);

  return {
    success: true,
    filename,
    summary: `Đã sao lưu toàn bộ: ${currentOrders.length} đơn hàng, ${allReminders.length} ghi chú việc, mẫu in tùy chọn, ${quickMessages.length} lời nhắn và ${allBackups.length} bản ghi sao lưu lịch sử!`,
    packageData: fullPackage,
  };
}

export function exportAllDataAsJson() {
  return exportComprehensiveFullBackup();
}

export function importFullDataBackup(jsonStringOrObj: string | any): {
  success: boolean;
  summary: string;
  restoredItems: string[];
} {
  try {
    const data = typeof jsonStringOrObj === "string" ? JSON.parse(jsonStringOrObj) : jsonStringOrObj;
    const restoredItems: string[] = [];

    // 1. Phục hồi Tùy chọn mẫu in nếu có
    if (data.printTemplate && typeof data.printTemplate === "object") {
      savePrintTemplate(data.printTemplate);
      restoredItems.push("Tùy chọn cấu hình mẫu in");
    }

    // 2. Phục hồi Lời nhắn nhanh nếu có
    if (Array.isArray(data.quickMessages) && data.quickMessages.length > 0) {
      saveQuickMessages(data.quickMessages);
      restoredItems.push(`${data.quickMessages.length} mẫu lời nhắn nhanh`);
    }

    // 3. Phục hồi Ghi chú công việc / nhắc nhở
    const reminders = data.reminders || data.allReminders;
    if (Array.isArray(reminders) && reminders.length > 0) {
      try {
        saveReminders(reminders);
        restoredItems.push(`${reminders.length} ghi chú công việc`);
      } catch {
        // ignore
      }
    }

    // 4. Phục hồi Danh mục gợi ý (Tài xế, Khách hàng, Biển số, Khu vực)
    if (data.suggestions && typeof data.suggestions === "object") {
      if (Array.isArray(data.suggestions.drivers)) {
        try {
          localStorage.setItem(DRIVERS_KEY, JSON.stringify(data.suggestions.drivers));
        } catch {}
      }
      if (Array.isArray(data.suggestions.customers)) {
        try {
          localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(data.suggestions.customers));
        } catch {}
      }
      if (Array.isArray(data.suggestions.vehicles)) {
        try {
          localStorage.setItem(VEHICLES_KEY, JSON.stringify(data.suggestions.vehicles));
        } catch {}
      }
      if (Array.isArray(data.suggestions.areas)) {
        try {
          localStorage.setItem(AREAS_KEY, JSON.stringify(data.suggestions.areas));
        } catch {}
      }
      restoredItems.push("Danh mục gợi ý tài xế, xe, khách hàng");
    }

    // 5. Phục hồi Cài đặt bảng hiển thị
    if (data.tableSettings) {
      if (data.tableSettings.visibleColumns) {
        try {
          localStorage.setItem("delivery_orders_visible_columns_v1", JSON.stringify(data.tableSettings.visibleColumns));
        } catch {}
      }
      if (data.tableSettings.columnWidths) {
        try {
          localStorage.setItem("delivery_orders_column_widths_v1", JSON.stringify(data.tableSettings.columnWidths));
        } catch {}
      }
    }

    // 6. Phục hồi Dữ liệu Thưởng & Chiết khấu Nhà cung cấp
    if (data.supplierBonusData && typeof data.supplierBonusData === "object") {
      try {
        saveSupplierBonusData(data.supplierBonusData);
        const supCount = Array.isArray(data.supplierBonusData.suppliers) ? data.supplierBonusData.suppliers.length : 0;
        const bonusCount = Array.isArray(data.supplierBonusData.bonusEntries) ? data.supplierBonusData.bonusEntries.length : 0;
        restoredItems.push(`Dữ liệu Thưởng & Chiết khấu NCC (${supCount} nhà cung cấp, ${bonusCount} khoản thưởng)`);
      } catch {}
    }

    // 7. Phục hồi Toàn bộ bản sao lưu trước đó & Danh sách đơn hàng
    let backupsToSave: BackupRecord[] = [];
    if (Array.isArray(data)) {
      backupsToSave = data;
    } else if (data && typeof data === "object") {
      if (Array.isArray(data.backups)) {
        backupsToSave = data.backups;
      } else if (Array.isArray(data.allBackups)) {
        backupsToSave = data.allBackups;
      } else if (data.currentSession?.orders || data.currentOrders || data.orders) {
        const orders = data.currentSession?.orders || data.currentOrders || data.orders || [];
        const record: BackupRecord = {
          id: data.currentSession?.recordId || `share_${Date.now()}`,
          driverName: data.currentSession?.driverName || data.driverName || "",
          customerName: data.currentSession?.customerName || data.customerName || "",
          vehicleNumber: data.currentSession?.vehicleNumber || data.vehicleNumber || "",
          area: data.currentSession?.area || data.area || "",
          deliveryLocation: data.currentSession?.deliveryLocation || data.deliveryLocation || "",
          recordDate: data.currentSession?.recordDate || data.recordDate || new Date().toISOString().slice(0, 10),
          notes: data.currentSession?.notes || data.notes || "Dữ liệu được khôi phục từ bản sao lưu toàn bộ",
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          pages: data.currentSession?.pages || [],
          manualNumbers: data.currentSession?.manualNumbers || data.currentWarehouseNumbers || [],
          warehouseNumbers: data.currentSession?.warehouseNumbers || data.currentWarehouseNumbers || [],
          orders,
          printTemplate: data.printTemplate,
          quickMessages: data.quickMessages,
          reminders: reminders || [],
        };
        backupsToSave = [record, ...loadBackups()];
      }
    }

    if (backupsToSave.length > 0) {
      saveBackupsList(backupsToSave);
      restoredItems.push(`${backupsToSave.length} bản ghi sao lưu danh sách đơn hàng`);
    }

    const success = restoredItems.length > 0;
    return {
      success,
      summary: success
        ? `Khôi phục toàn diện thành công: ${restoredItems.join(", ")}.`
        : "Không tìm thấy dữ liệu hợp lệ trong file.",
      restoredItems,
    };
  } catch (err: any) {
    console.error("Error importing comprehensive backup:", err);
    return {
      success: false,
      summary: "Lỗi giải mã file sao lưu: " + (err?.message || "File không đúng định dạng JSON"),
      restoredItems: [],
    };
  }
}

export function parseBackupJsonFile(file: File): Promise<BackupRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const text = reader.result as string;
        const parsed = JSON.parse(text);
        const normalizeItem = (r: any): BackupRecord => {
          const pages = r.pages || r.pages2 || r.pages1 || [];
          const manualNumbers = r.manualNumbers || r.manualNumbers2 || [];
          const warehouseNumbers = r.warehouseNumbers || r.image2Numbers || [];
          const orders = Array.isArray(r.orders) && r.orders.length > 0
            ? r.orders
            : warehouseNumbers.map((num: number, idx: number) => ({
                id: `ord_${r.id || "imported"}_${num}_${idx}`,
                ticketNumber: num,
                driverName: r.driverName || "",
                customerName: r.customerName || "",
                deliveryDate: r.recordDate || new Date().toISOString().slice(0, 10),
                status: "delivered",
              }));
          return {
            ...r,
            pages,
            manualNumbers,
            warehouseNumbers,
            orders,
          };
        };

        if (Array.isArray(parsed)) {
          resolve(parsed.map(normalizeItem));
        } else if (parsed && typeof parsed === "object" && parsed.id) {
          // Single record imported
          resolve([normalizeItem(parsed)]);
        } else {
          reject(new Error("Định dạng file sao lưu không hợp lệ."));
        }
      } catch (err: any) {
        reject(new Error("Không thể đọc file JSON: " + err.message));
      }
    };
    reader.onerror = () => reject(new Error("Lỗi khi đọc file."));
    reader.readAsText(file);
  });
}

/**
 * Deduplicate string array ignoring case, preserving the first occurrence's formatting
 */
export function deduplicateCaseInsensitive(list: string[]): string[] {
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of list) {
    const trimmed = (item || "").trim();
    if (!trimmed) continue;
    const lower = trimmed.toLowerCase();
    if (!seen.has(lower)) {
      seen.add(lower);
      result.push(trimmed);
    }
  }
  return result;
}

// Driver & Customer auto-suggestions
export function getDriverSuggestions(): string[] {
  try {
    const raw = localStorage.getItem(DRIVERS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return deduplicateCaseInsensitive(list);
  } catch {
    return [];
  }
}

export function addDriverSuggestion(name: string) {
  if (!name || !name.trim()) return;
  try {
    const current = getDriverSuggestions();
    const updated = deduplicateCaseInsensitive([name.trim(), ...current]).slice(0, 20);
    localStorage.setItem(DRIVERS_KEY, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }
}

export function getCustomerSuggestions(): string[] {
  try {
    const raw = localStorage.getItem(CUSTOMERS_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return deduplicateCaseInsensitive(list);
  } catch {
    return [];
  }
}

export function addCustomerSuggestion(name: string) {
  if (!name || !name.trim()) return;
  try {
    const current = getCustomerSuggestions();
    const updated = deduplicateCaseInsensitive([name.trim(), ...current]).slice(0, 20);
    localStorage.setItem(CUSTOMERS_KEY, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }
}

export const DEFAULT_VEHICLES: string[] = [
  "60C-51100",
  "60H-03519",
  "60H-03220",
  "51D-62180",
];

export function getVehicleSuggestions(): string[] {
  try {
    const raw = localStorage.getItem(VEHICLES_KEY);
    const customList: string[] = raw ? JSON.parse(raw) : [];
    return deduplicateCaseInsensitive([...DEFAULT_VEHICLES, ...customList]);
  } catch {
    return DEFAULT_VEHICLES;
  }
}

export function addVehicleSuggestion(plate: string) {
  if (!plate || !plate.trim()) return;
  try {
    const current = getVehicleSuggestions();
    const updated = deduplicateCaseInsensitive([plate.trim(), ...current]).slice(0, 20);
    localStorage.setItem(VEHICLES_KEY, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }
}

export const DEFAULT_AREAS: string[] = [
  "Miền Đông",
  "Miền Tây",
  "Nội thành",
  "Ngoại thành",
  "Bình Dương",
  "Đồng Nai",
  "TP.HCM",
  "Long An",
];

export function getAreaSuggestions(): string[] {
  try {
    const raw = localStorage.getItem(AREAS_KEY);
    const customList: string[] = raw ? JSON.parse(raw) : [];
    return deduplicateCaseInsensitive([...DEFAULT_AREAS, ...customList]);
  } catch {
    return DEFAULT_AREAS;
  }
}

export function addAreaSuggestion(area: string) {
  if (!area || !area.trim()) return;
  try {
    const current = getAreaSuggestions();
    const updated = deduplicateCaseInsensitive([area.trim(), ...current]).slice(0, 30);
    localStorage.setItem(AREAS_KEY, JSON.stringify(updated));
  } catch (e) {
    // ignore
  }
}

export const DEFAULT_LOCATIONS: string[] = [
  "Kho Biên Hòa",
  "Kho Dĩ An",
  "Kho Tân Bình",
  "Kho Thủ Đức",
  "Kho Long Bình",
];

export function getDeliveryLocationSuggestions(): string[] {
  return getAreaSuggestions();
}

export function addDeliveryLocationSuggestion(location: string) {
  addAreaSuggestion(location);
}

export function extractCustomerFromFile(file: File): { customerName: string; source: string } | null {
  const rawName = file.name;
  // Remove file extension
  const baseName = rawName.replace(/\.[^/.]+$/, "");

  // 1. Check explicit keywords: khach_hang, kh, cty, cong_ty, dai_ly, dl, don_vi, khach
  const keywordRegex = /(?:kh[aá]ch(?:[ _-]h[aà]ng)?|kh|cty|c[oô]ng[ _-]ty|đ[aạ]i[ _-]l[yý]|dl|don[ _-]vi|doanh[ _-]nghiep)[ _:-]+([a-zA-Z0-9_\u00C0-\u024F\u1E00-\u1EFF\s]+?)(?:[ _-]+(?:20\d\d|\d{1,2}[-_/]\d{1,2}|phieu|trang|page|\d+$)|$)/i;
  const match = baseName.match(keywordRegex);
  if (match && match[1]) {
    const cleaned = match[1].replace(/[_-]+/g, " ").trim();
    if (cleaned.length >= 2) {
      return {
        customerName: cleaned,
        source: `Trích xuất từ tên tệp: "${cleaned}"`,
      };
    }
  }

  // 2. If the file name is not a generic camera/screenshot prefix (e.g. IMG_2026, PXL_, Screenshot)
  const isGenericCamera = /^(?:IMG|PXL|PHOTO|SCAN|IMAGE|DSC|VID|CAM|Screenshot|z\d+)[_-]?\d*/i.test(baseName);
  if (!isGenericCamera) {
    // Remove date parts if present
    const withoutDates = baseName
      .replace(/(?:20\d\d[-_/.](?:0[1-9]|1[0-2])[-_/.](?:0[1-9]|[12]\d|3[01]))/g, "")
      .replace(/(?:(?:0[1-9]|[12]\d|3[01])[-_/.](?:0[1-9]|1[0-2])[-_/.](?:20\d\d))/g, "")
      .replace(/\b\d{8,}\b/g, "")
      .replace(/[_-]+/g, " ")
      .trim();

    if (withoutDates.length >= 3 && !/^\d+$/.test(withoutDates)) {
      return {
        customerName: withoutDates,
        source: `Lấy từ tên tệp tải lên: "${withoutDates}"`,
      };
    }
  }

  return null;
}

export function extractDateFromFile(file: File): { dateStr: string; source: string } {
  const name = file.name;

  // 1. Try checking file name for patterns like YYYY-MM-DD or YYYY_MM_DD
  const ymdMatch = name.match(/(20\d\d)[-_/.](0[1-9]|1[0-2])[-_/.](0[1-9]|[12]\d|3[01])/);
  if (ymdMatch) {
    return {
      dateStr: `${ymdMatch[1]}-${ymdMatch[2]}-${ymdMatch[3]}`,
      source: `Ngày từ tên tệp (${name})`,
    };
  }

  // Pattern: DD-MM-YYYY or DD_MM_YYYY
  const dmyMatch = name.match(/(0[1-9]|[12]\d|3[01])[-_/.](0[1-9]|1[0-2])[-_/.](20\d\d)/);
  if (dmyMatch) {
    return {
      dateStr: `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`,
      source: `Ngày từ tên tệp (${name})`,
    };
  }

  // 2. Check file.lastModified timestamp
  if (file.lastModified) {
    const d = new Date(file.lastModified);
    if (!isNaN(d.getTime())) {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return {
        dateStr: `${y}-${m}-${day}`,
        source: `Ngày chụp/sửa tệp: ${name} (${day}/${m}/${y})`,
      };
    }
  }

  // 3. Fallback: today's upload date
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return {
    dateStr: `${y}-${m}-${day}`,
    source: `Ngày tải lên hôm nay (${day}/${m}/${y})`,
  };
}
