export interface PrintSignatureItem {
  id: string;
  title: string;
  subtitle: string;
  visible: boolean;
}

export interface PrintColumnsConfig {
  index: { label: string; visible: boolean };
  ticketNumber: { label: string; visible: boolean };
  month: { label: string; visible: boolean };
  vehicleNumber: { label: string; visible: boolean };
  driverName: { label: string; visible: boolean };
  customerName: { label: string; visible: boolean };
  area: { label: string; visible: boolean };
  deliveryDate: { label: string; visible: boolean };
  handoverDeadline: { label: string; visible: boolean };
  status: { label: string; visible: boolean };
  notes: { label: string; visible: boolean };
  signature: { label: string; visible: boolean };
}

export interface PrintTemplateConfig {
  companyHeader: string;
  companySubHeader: string;
  formCode: string;
  documentTitle: string;
  headerNote: string;
  showPrintDate: boolean;
  columns: PrintColumnsConfig;
  showSignatures: boolean;
  signatures: PrintSignatureItem[];
  footerNote: string;
  fontSize: "compact" | "standard" | "large";
}

export const DEFAULT_PRINT_TEMPLATE: PrintTemplateConfig = {
  companyHeader: "BỘ PHẬN KHO VẬN & ĐIỀU PHỐI GIAO NHẬN",
  companySubHeader: "Hệ thống Quản lý Đơn hàng & Bảng kê Phiếu giao hàng",
  formCode: "Mẫu biểu: BK-GH/XK",
  documentTitle: "BẢNG KÊ GIAO HÀNG & PHIẾU XUẤT KHO",
  headerNote: "",
  showPrintDate: true,
  columns: {
    index: { label: "STT", visible: true },
    ticketNumber: { label: "SỐ PHIẾU", visible: true },
    month: { label: "THÁNG", visible: true },
    vehicleNumber: { label: "SỐ XE", visible: true },
    driverName: { label: "NGƯỜI GIAO", visible: true },
    customerName: { label: "TÊN KHÁCH HÀNG", visible: true },
    area: { label: "KHU VỰC", visible: true },
    deliveryDate: { label: "NGÀY GIAO", visible: true },
    handoverDeadline: { label: "HẠN BÀN GIAO", visible: true },
    status: { label: "TRẠNG THÁI", visible: true },
    notes: { label: "GHI CHÚ", visible: true },
    signature: { label: "KÝ NHẬN", visible: true },
  },
  showSignatures: true,
  signatures: [
    { id: "sig_1", title: "Người Lập Bảng Kê", subtitle: "(Ký, ghi rõ họ tên)", visible: true },
    { id: "sig_2", title: "Thủ Kho Xuất Hàng", subtitle: "(Ký, ghi rõ họ tên)", visible: true },
    { id: "sig_3", title: "Người Giao Hàng", subtitle: "(Ký, ghi rõ họ tên)", visible: true },
    { id: "sig_4", title: "Người Nhận / Ký Duyệt", subtitle: "(Ký, ghi rõ họ tên)", visible: true },
  ],
  footerNote: "",
  fontSize: "standard",
};

const STORAGE_KEY = "delivery_orders_print_template_v1";

export function getSavedPrintTemplate(): PrintTemplateConfig {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PRINT_TEMPLATE;
    const parsed = JSON.parse(raw);
    return {
      ...DEFAULT_PRINT_TEMPLATE,
      ...parsed,
      columns: {
        ...DEFAULT_PRINT_TEMPLATE.columns,
        month: { label: "THÁNG", visible: true },
        handoverDeadline: { label: "HẠN BÀN GIAO", visible: true },
        ...(parsed.columns || {}),
      },
      signatures:
        Array.isArray(parsed.signatures) && parsed.signatures.length > 0
          ? parsed.signatures
          : DEFAULT_PRINT_TEMPLATE.signatures,
    };
  } catch {
    return DEFAULT_PRINT_TEMPLATE;
  }
}

export function savePrintTemplate(config: PrintTemplateConfig): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    return true;
  } catch (e) {
    console.error("Failed to save print template to localStorage", e);
    return false;
  }
}

export function resetPrintTemplate(): PrintTemplateConfig {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to reset print template", e);
  }
  return DEFAULT_PRINT_TEMPLATE;
}
