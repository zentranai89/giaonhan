import { Supplier, SupplierBonusEntry, SupplierBonusData, BonusPeriodType } from "../types/supplierBonus";

const SUPPLIER_BONUS_STORAGE_KEY = "supplier_bonus_management_v1";

export const INITIAL_SAMPLE_SUPPLIERS: Supplier[] = [
  {
    id: "sup_vinamilk",
    code: "NCC-VNM",
    name: "Công ty Cổ phần Sữa Việt Nam (Vinamilk)",
    notes: "Chính sách chiết khấu tháng 3%, thưởng quý 2% nếu vượt chỉ tiêu 500 triệu",
    status: "active",
    createdAt: "2026-01-01T08:00:00.000Z",
  },
  {
    id: "sup_masan",
    code: "NCC-MSN",
    name: "Tập đoàn Masan (Masan Consumer)",
    notes: "Chiết khấu thương mại theo quý và thưởng năm đạt KPI",
    status: "active",
    createdAt: "2026-01-05T09:30:00.000Z",
  },
  {
    id: "sup_unilever",
    code: "NCC-ULV",
    name: "Unilever Việt Nam",
    notes: "Chiết khấu hóa đơn tháng và thưởng trưng bày hàng hóa",
    status: "active",
    createdAt: "2026-01-10T10:15:00.000Z",
  },
  {
    id: "sup_suntory",
    code: "NCC-PEPSI",
    name: "Suntory PepsiCo Việt Nam",
    notes: "Thưởng chương trình Hè và Tết đặc biệt",
    status: "active",
    createdAt: "2026-01-15T14:00:00.000Z",
  },
];

export const INITIAL_SAMPLE_BONUS_ENTRIES: SupplierBonusEntry[] = [
  {
    id: "bonus_vnm_m10",
    supplierId: "sup_vinamilk",
    supplierCode: "NCC-VNM",
    supplierName: "Công ty Cổ phần Sữa Việt Nam (Vinamilk)",
    type: "month",
    period: "Tháng 10/2026",
    month: 10,
    year: 2026,
    amount: 30000000,
    paymentMethod: "Chuyển khoản",
    payments: [
      {
        id: "pay_1",
        amount: 15000000,
        paymentDate: "2026-10-02",
        paymentMethod: "Chuyển khoản",
        notes: "Chuyển khoản Vietcombank đợt 1",
        createdAt: "2026-10-02T10:00:00.000Z",
      },
    ],
    paidAmount: 15000000,
    remainingAmount: 15000000,
    payoutDate: "2026-10-02",
    notes: "Chiết khấu doanh số Tháng 10 đạt mức 650 triệu (3%)",
    createdAt: "2026-10-01T08:00:00.000Z",
  },
  {
    id: "bonus_msn_q3",
    supplierId: "sup_masan",
    supplierCode: "NCC-MSN",
    supplierName: "Tập đoàn Masan (Masan Consumer)",
    type: "quarter",
    period: "Quý 3/2026",
    quarter: 3,
    year: 2026,
    amount: 50000000,
    paymentMethod: "Chuyển khoản",
    payments: [
      {
        id: "pay_2",
        amount: 50000000,
        paymentDate: "2026-09-25",
        paymentMethod: "Chuyển khoản",
        notes: "Đã tất toán toàn bộ qua BIDV",
        createdAt: "2026-09-25T11:00:00.000Z",
      },
    ],
    paidAmount: 50000000,
    remainingAmount: 0,
    payoutDate: "2026-09-25",
    notes: "Thưởng chỉ tiêu phân phối ngành hàng gia vị Quý 3",
    createdAt: "2026-09-20T09:00:00.000Z",
  },
  {
    id: "bonus_ulv_y2026",
    supplierId: "sup_unilever",
    supplierCode: "NCC-ULV",
    supplierName: "Unilever Việt Nam",
    type: "year",
    period: "Năm 2026",
    year: 2026,
    amount: 120000000,
    paymentMethod: "Cấn trừ công nợ",
    payments: [
      {
        id: "pay_3",
        amount: 40000000,
        paymentDate: "2026-07-10",
        paymentMethod: "Cấn trừ công nợ",
        notes: "Cấn trừ vào hóa đơn mua hàng đợt 1",
        createdAt: "2026-07-10T14:30:00.000Z",
      },
    ],
    paidAmount: 40000000,
    remainingAmount: 80000000,
    payoutDate: "2026-07-10",
    notes: "Thưởng cam kết sản lượng năm 2026 theo hợp đồng nguyên tắc",
    createdAt: "2026-01-10T08:00:00.000Z",
  },
  {
    id: "bonus_pepsi_ct",
    supplierId: "sup_suntory",
    supplierCode: "NCC-PEPSI",
    supplierName: "Suntory PepsiCo Việt Nam",
    type: "other",
    period: "CT Khuyến mãi Mùa Hè 2026",
    year: 2026,
    amount: 25000000,
    paymentMethod: "Bằng hàng",
    payments: [],
    paidAmount: 0,
    remainingAmount: 25000000,
    payoutDate: "2026-06-30",
    notes: "Thưởng trưng bày ụ hàng tủ lạnh & poster điểm bán chiến dịch hè - Trả bằng sản phẩm khuyến mãi",
    createdAt: "2026-06-01T08:00:00.000Z",
  },
];

export function loadSupplierBonusData(): SupplierBonusData {
  try {
    const raw = localStorage.getItem(SUPPLIER_BONUS_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && Array.isArray(parsed.suppliers) && Array.isArray(parsed.bonusEntries)) {
        return {
          suppliers: parsed.suppliers,
          bonusEntries: parsed.bonusEntries.map((b: SupplierBonusEntry) => {
            const payments = Array.isArray(b.payments) ? b.payments : [];
            const paid = payments.reduce((sum, p) => sum + (Number(p.amount) || 0), 0) || (Number(b.paidAmount) || 0);
            const total = Number(b.amount) || 0;
            return {
              ...b,
              amount: total,
              payments,
              paidAmount: paid,
              remainingAmount: total - paid,
              payoutDate: b.payoutDate || undefined,
              paymentMethod: b.paymentMethod || undefined,
            };
          }),
        };
      }
    }
  } catch (err) {
    console.error("Lỗi khi đọc dữ liệu Thưởng & Chiết khấu NCC từ localStorage:", err);
  }

  // Khởi tạo dữ liệu mẫu nếu chưa có
  const defaultData: SupplierBonusData = {
    suppliers: INITIAL_SAMPLE_SUPPLIERS,
    bonusEntries: INITIAL_SAMPLE_BONUS_ENTRIES,
  };
  saveSupplierBonusData(defaultData);
  return defaultData;
}

export function saveSupplierBonusData(data: SupplierBonusData): void {
  try {
    localStorage.setItem(SUPPLIER_BONUS_STORAGE_KEY, JSON.stringify(data));
  } catch (err) {
    console.error("Lỗi khi lưu dữ liệu Thưởng & Chiết khấu NCC vào localStorage:", err);
  }
}

/** Định dạng số tiền VNĐ dễ nhìn (VD: 30.000.000 đ) */
export function formatVND(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) return "0 đ";
  return new Intl.NumberFormat("vi-VN").format(Math.round(amount)) + " đ";
}

/** Chuyển đổi chuỗi nhập liệu thành số nguyên sạch */
export function parseVND(input: string | number): number {
  if (typeof input === "number") return isNaN(input) ? 0 : input;
  if (!input) return 0;
  const cleaned = input.toString().replace(/[^0-9-]/g, "");
  const num = parseInt(cleaned, 10);
  return isNaN(num) ? 0 : num;
}

export interface CategorySummary {
  total: number;
  paid: number;
  remaining: number;
  count: number;
}

/** Tính tổng số tiền theo từng phân loại Tháng / Quý / Năm / Khác và Tổng cộng */
export function calculateBreakdownByType(entries: SupplierBonusEntry[]): {
  all: CategorySummary;
  month: CategorySummary;
  quarter: CategorySummary;
  year: CategorySummary;
  other: CategorySummary;
} {
  const result = {
    all: { total: 0, paid: 0, remaining: 0, count: 0 },
    month: { total: 0, paid: 0, remaining: 0, count: 0 },
    quarter: { total: 0, paid: 0, remaining: 0, count: 0 },
    year: { total: 0, paid: 0, remaining: 0, count: 0 },
    other: { total: 0, paid: 0, remaining: 0, count: 0 },
  };

  entries.forEach((e) => {
    const amt = Number(e.amount) || 0;
    const paid = Number(e.paidAmount) || 0;
    const rem = amt - paid;
    const t = e.type as BonusPeriodType;

    // Tổng chung
    result.all.total += amt;
    result.all.paid += paid;
    result.all.remaining += rem;
    result.all.count += 1;

    // Từng nhóm
    if (result[t]) {
      result[t].total += amt;
      result[t].paid += paid;
      result[t].remaining += rem;
      result[t].count += 1;
    } else {
      result.other.total += amt;
      result.other.paid += paid;
      result.other.remaining += rem;
      result.other.count += 1;
    }
  });

  return result;
}

/** Tạo chuỗi chuẩn cho Thời gian */
export function buildPeriodString(type: BonusPeriodType, month?: number, quarter?: number, year?: number, customText?: string): string {
  const currentYear = year || new Date().getFullYear();
  switch (type) {
    case "month":
      return `Tháng ${month || 1}/${currentYear}`;
    case "quarter":
      return `Quý ${quarter || 1}/${currentYear}`;
    case "year":
      return `Năm ${currentYear}`;
    case "other":
      return (customText && customText.trim()) || "Chương trình thưởng";
    default:
      return (customText && customText.trim()) || "Khoản thưởng";
  }
}

export interface SupplierOptionItem {
  id: string;
  code: string;
  name: string;
}

/** Lấy danh sách tên Nhà cung cấp từ mô-đun Thưởng & Chiết khấu Nhà cung cấp */
export function getSupplierOptions(): SupplierOptionItem[] {
  try {
    const data = loadSupplierBonusData();
    const map = new Map<string, SupplierOptionItem>();

    if (Array.isArray(data.suppliers)) {
      data.suppliers.forEach((s) => {
        if (s.name && s.name.trim()) {
          const trimmed = s.name.trim();
          map.set(trimmed.toLowerCase(), {
            id: s.id,
            code: s.code || "",
            name: trimmed,
          });
        }
      });
    }

    if (Array.isArray(data.bonusEntries)) {
      data.bonusEntries.forEach((b) => {
        if (b.supplierName && b.supplierName.trim()) {
          const trimmed = b.supplierName.trim();
          const key = trimmed.toLowerCase();
          if (!map.has(key)) {
            map.set(key, {
              id: b.supplierId || `sup_${trimmed}`,
              code: b.supplierCode || "",
              name: trimmed,
            });
          }
        }
      });
    }

    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name, "vi"));
  } catch (err) {
    console.error("Error reading supplier options:", err);
    return [];
  }
}

/** Lấy danh sách chuỗi tên Nhà cung cấp sạch */
export function getSupplierNames(): string[] {
  return getSupplierOptions().map((s) => s.name);
}
