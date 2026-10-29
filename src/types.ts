import { SupplierBonusData } from "./types/supplierBonus";
export * from "./types/supplierBonus";

export interface OCRResult {
  numbers: number[];
  lowConfidence: number[];
  rawText?: string;
}

export interface ImagePage {
  id: string;
  fileName: string;
  preview: string; // base64
  numbers: number[];
  coords: { value: number; box: number[] }[];
  lowConfidence: number[];
}

export type OrderStatus = "delivered" | "delivering" | "pending" | "unsigned" | "returned" | "cancelled" | "lost";

export type ReminderPriority = "supplier" | "customer" | "other" | "high" | "medium" | "low";
export type ReminderStatus =
  | "pending"          // Chưa xử lý
  | "processing"       // Đang xử lý
  | "cannot_process"   // Không xử lý được
  | "cancelled"        // Đã hủy
  | "completed"        // Hoàn thành
  | "overpaid"         // Thanh Toán Dư
  | "returned"         // Trả Hàng
  | "debt_error"       // Sai Công Nợ
  | "discount"         // Chiết khấu
  | "goods_receipt"    // Nhập Hàng
  | "reconciling";     // Đang xử lý (tương thích cũ)

export interface ReminderNote {
  id: string;
  title: string;              // Nội Dung Công Việc
  appointmentDate?: string;   // Ngày hẹn (YYYY-MM-DD), có thể để trống
  appointmentTime?: string;   // Giờ hẹn (HH:mm)
  customerName?: string;      // Tên khách hàng / Đối tác
  phoneNumber?: string;       // SĐT liên hệ
  ticketNumber?: number | string; // Số phiếu / đơn liên kết nếu có
  vehicleNumber?: string;     // Biển số xe liên quan nếu có
  priority: ReminderPriority; // Phân loại: supplier (Nhà Cung Cấp), customer (Khách Hàng), other (Khác)
  status: ReminderStatus;     // Trạng thái: pending (Chưa xử lý), processing (Đang xử lý), cannot_process (Không xử lý được), cancelled (Đã hủy), completed (Hoàn thành)
  notes?: string;             // Ghi chú chi tiết
  createdAt: string;          // ISO string
  updatedAt?: string;         // ISO string
  completedAt?: string;       // ISO string
}

export interface DeliveryOrder {
  id: string;
  ticketNumber: number | string;
  month?: number; // Tháng giao hàng (1 - 12)
  driverName: string;
  customerName: string;
  area?: string; // Khu vực giao hàng
  deliveryLocation?: string; // Nơi giao (hỗ trợ tương thích ngược)
  vehicleNumber?: string; // Số xe (biển số xe)
  deliveryDate: string; // YYYY-MM-DD
  status: OrderStatus;
  notes?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface BackupRecord {
  id: string;
  driverName: string;
  customerName: string;
  area?: string; // Khu vực
  deliveryLocation?: string; // Nơi giao
  vehicleNumber?: string;
  recordDate: string; // YYYY-MM-DD
  notes?: string;
  createdAt: string; // ISO string
  updatedAt: string; // ISO string
  pages: ImagePage[];
  manualNumbers: number[];
  warehouseNumbers: (number | string)[];
  orders?: DeliveryOrder[];
  reminders?: ReminderNote[];
  printTemplate?: any;
  quickMessages?: any[];
  supplierBonusData?: SupplierBonusData;
  // Backward compatibility fields for legacy records
  pages1?: ImagePage[];
  pages2?: ImagePage[];
  manualNumbers1?: number[];
  manualNumbers2?: number[];
  image1Numbers?: number[];
  image2Numbers?: number[];
  comparison?: any;
}

export type DuplicateSyncMode = "add_as_new" | "both" | "update_all_existing";

export interface SyncWarehouseOptions {
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
  duplicateMode?: DuplicateSyncMode;
  numbersToSync?: number[];
  clearUploadedPages?: boolean;
}

