export type BonusPeriodType = "month" | "quarter" | "year" | "other";

export type BonusPaymentMethod = "Tiền mặt" | "Chuyển khoản" | "Cấn trừ công nợ" | "Bằng hàng";
export const BONUS_PAYMENT_METHODS: BonusPaymentMethod[] = [
  "Tiền mặt",
  "Chuyển khoản",
  "Cấn trừ công nợ",
  "Bằng hàng"
];

export interface Supplier {
  id: string;
  code: string; // Mã Nhà cung cấp (duy nhất, không trùng lặp)
  name: string; // Tên Nhà cung cấp
  notes?: string; // Ghi chú
  status: "active" | "inactive"; // Trạng thái: Đang hoạt động / Ngừng hoạt động
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierPayment {
  id: string;
  amount: number; // Số tiền trả (VNĐ)
  paymentDate: string; // YYYY-MM-DD
  paymentMethod?: BonusPaymentMethod | string; // Hình thức trả: Tiền mặt, Chuyển khoản, Cấn trừ công nợ, Bằng hàng
  notes?: string; // Ghi chú lần thanh toán (VD: Chuyển khoản, Đợt 1...)
  createdAt: string;
}

export interface SupplierBonusEntry {
  id: string;
  supplierId: string;
  supplierCode: string;
  supplierName: string;
  type: BonusPeriodType; // "month" | "quarter" | "year" | "other"
  period: string; // Chuỗi hiển thị: "Tháng 10/2026", "Quý 4/2026", "Năm 2026", "CT Khuyến mãi A"...
  month?: number; // 1 - 12 (khi type === "month")
  quarter?: number; // 1 - 4 (khi type === "quarter")
  year?: number; // e.g. 2026
  amount: number; // Số tiền thưởng / chiết khấu (VNĐ)
  payments: SupplierPayment[]; // Lịch sử các lần thanh toán
  paidAmount: number; // Tổng số tiền đã trả
  remainingAmount: number; // Còn phải thu = amount - paidAmount
  payoutDate?: string; // Ngày trả thưởng (YYYY-MM-DD)
  paymentMethod?: BonusPaymentMethod | string; // Hình thức trả thưởng: Tiền mặt, Chuyển khoản, Cấn trừ công nợ, Bằng hàng
  notes?: string; // Ghi chú: chính sách thưởng, điều kiện nhận thưởng, tỷ lệ chiết khấu, v.v.
  createdAt: string;
  updatedAt?: string;
}

export interface SupplierBonusData {
  suppliers: Supplier[];
  bonusEntries: SupplierBonusEntry[];
}
