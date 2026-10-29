/**
 * Utility functions for date and time formatting
 * Standardized format: dd/mm/yyyy and HH:mm:ss dd/mm/yyyy
 */

/**
 * Returns today's date in local timezone as YYYY-MM-DD
 */
export function getLocalTodayISO(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/**
 * Formats a date string (YYYY-MM-DD, ISO string, or timestamp) to dd/mm/yyyy
 */
export function formatDateDDMMYYYY(dateStr?: string | null): string {
  if (!dateStr || typeof dateStr !== "string") return "";
  const trimmed = dateStr.trim();
  if (!trimmed) return "";

  // Check if already in dd/mm/yyyy format
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/");
    return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
  }

  // If in YYYY-MM-DD format (or starts with it)
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed)) {
    const datePart = trimmed.split("T")[0];
    const parts = datePart.split("-");
    if (parts.length === 3) {
      const [y, m, d] = parts;
      return `${d.padStart(2, "0")}/${m.padStart(2, "0")}/${y}`;
    }
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    const day = String(d.getDate()).padStart(2, "0");
    const month = String(d.getMonth() + 1).padStart(2, "0");
    const year = d.getFullYear();
    return `${day}/${month}/${year}`;
  }

  return trimmed;
}

/**
 * Formats a timestamp/ISO string to "HH:mm dd/mm/yyyy" or "HH:mm:ss dd/mm/yyyy"
 */
export function formatBackupDateTime(
  isoStr?: string | null,
  includeSeconds: boolean = true
): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return isoStr;

  const hours = String(d.getHours()).padStart(2, "0");
  const minutes = String(d.getMinutes()).padStart(2, "0");
  const seconds = String(d.getSeconds()).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const year = d.getFullYear();

  const timePart = includeSeconds ? `${hours}:${minutes}:${seconds}` : `${hours}:${minutes}`;
  return `${timePart} ${day}/${month}/${year}`;
}

/**
 * Formats current live date and time for real-time clocks: "HH:mm:ss dd/mm/yyyy"
 */
export function formatRealtimeClock(date: Date = new Date(), includeSeconds: boolean = true): string {
  const hours = String(date.getHours()).padStart(2, "0");
  const minutes = String(date.getMinutes()).padStart(2, "0");
  const seconds = String(date.getSeconds()).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const year = date.getFullYear();

  return includeSeconds
    ? `${hours}:${minutes}:${seconds} ${day}/${month}/${year}`
    : `${hours}:${minutes} ${day}/${month}/${year}`;
}

/**
 * Calculates human-readable relative time (e.g., "Vừa xong", "30 giây trước", "5 phút trước")
 */
export function formatRelativeTime(isoStr?: string | null): string {
  if (!isoStr) return "";
  const d = new Date(isoStr);
  if (isNaN(d.getTime())) return "";

  const now = Date.now();
  const diffSec = Math.floor((now - d.getTime()) / 1000);

  if (diffSec < 5) return "Vừa xong (thời gian thực)";
  if (diffSec < 60) return `${diffSec} giây trước`;
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin} phút trước`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours} giờ trước`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays === 1) {
    const hours = String(d.getHours()).padStart(2, "0");
    const minutes = String(d.getMinutes()).padStart(2, "0");
    return `Hôm qua lúc ${hours}:${minutes}`;
  }
  if (diffDays < 7) return `${diffDays} ngày trước`;
  return formatBackupDateTime(isoStr, false);
}

/**
 * Compares two ticket numbers (numeric or alphanumeric string with special characters)
 * Uses natural alphanumeric sorting
 */
export function compareTicketNumbers(
  a: number | string | undefined | null,
  b: number | string | undefined | null
): number {
  if (a === undefined || a === null) return -1;
  if (b === undefined || b === null) return 1;
  const numA = Number(a);
  const numB = Number(b);
  if (!isNaN(numA) && !isNaN(numB) && String(a).trim() !== "" && String(b).trim() !== "") {
    return numA - numB;
  }
  return String(a)
    .trim()
    .localeCompare(String(b).trim(), undefined, { numeric: true, sensitivity: "base" });
}

/**
 * Parses raw ticket input into a number if purely numeric digits, or trims and keeps as string (allowing letters and special characters)
 */
export function parseTicketNumberInput(input: string | number | undefined | null): string | number {
  if (input === undefined || input === null) return "";
  if (typeof input === "number") return input;
  const trimmed = input.trim();
  if (!trimmed) return "";
  if (/^\d+$/.test(trimmed)) {
    const num = Number(trimmed);
    return !isNaN(num) ? num : trimmed;
  }
  return trimmed;
}

/**
 * Extracts month number (1 to 12) from a date string (YYYY-MM-DD, DD/MM/YYYY, or ISO)
 */
export function extractMonthFromDate(dateStr?: string | null): number | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [, m] = trimmed.split("/");
    const val = parseInt(m, 10);
    return !isNaN(val) && val >= 1 && val <= 12 ? val : null;
  }

  // YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed)) {
    const datePart = trimmed.split("T")[0];
    const parts = datePart.split("-");
    if (parts.length >= 2) {
      const val = parseInt(parts[1], 10);
      return !isNaN(val) && val >= 1 && val <= 12 ? val : null;
    }
  }

  const d = new Date(trimmed);
  if (!isNaN(d.getTime())) {
    return d.getMonth() + 1;
  }

  return null;
}

/**
 * Returns month number (1-12) for an order, checking order.month first, then extracting from deliveryDate
 */
export function getOrderMonth(order?: { month?: number; deliveryDate?: string } | null): number | null {
  if (!order) return null;
  if (order.month !== undefined && order.month !== null && typeof order.month === "number" && !isNaN(order.month) && order.month >= 1 && order.month <= 12) {
    return order.month;
  }
  return extractMonthFromDate(order.deliveryDate);
}

/**
 * Returns a sortable number for order month/year:
 * e.g. year * 100 + month (202609 for month 9 year 2026), or month alone if no year.
 * Returns null if no month can be determined.
 */
export function getOrderYearMonth(order?: { month?: number; deliveryDate?: string } | null): number | null {
  if (!order) return null;
  const m = getOrderMonth(order);
  if (m === null || m === undefined) return null;

  if (order.deliveryDate) {
    const trimmed = order.deliveryDate.trim();
    if (/^\d{4}-\d{1,2}/.test(trimmed)) {
      const year = parseInt(trimmed.slice(0, 4), 10);
      if (!isNaN(year) && year > 1900 && year < 2200) {
        return year * 100 + m;
      }
    } else if (/\d{4}$/.test(trimmed)) {
      const match = trimmed.match(/\b(20\d\d)\b/);
      if (match) {
        const year = parseInt(match[1], 10);
        return year * 100 + m;
      }
    }
  }

  const currentYear = new Date().getFullYear();
  return currentYear * 100 + m;
}

/**
 * Sắp xếp đơn theo thứ tự:
 * Nhóm theo Tháng tăng dần (ví dụ: tháng 9 trước, rồi đến tháng 10...),
 * Trong từng tháng, số phiếu sắp xếp tăng dần 1, 2, 3, 5...
 */
export function compareOrdersByMonthThenTicket(
  a: { ticketNumber?: number | string; month?: number; deliveryDate?: string },
  b: { ticketNumber?: number | string; month?: number; deliveryDate?: string }
): number {
  const ymA = getOrderYearMonth(a);
  const ymB = getOrderYearMonth(b);

  if (ymA !== null && ymB !== null) {
    if (ymA !== ymB) {
      return ymA - ymB;
    }
  } else if (ymA !== null && ymB === null) {
    return -1;
  } else if (ymA === null && ymB !== null) {
    return 1;
  }

  return compareTicketNumbers(a.ticketNumber, b.ticketNumber);
}

/**
 * Updates a date string (YYYY-MM-DD or DD/MM/YYYY) with a new month (1 to 12),
 * preserving year and day (clamped to max days of the target month).
 * Returns date in YYYY-MM-DD format.
 */
export function updateDateWithMonth(dateStr?: string | null, targetMonth: number = 1): string {
  const safeMonth = Math.min(12, Math.max(1, Math.round(targetMonth)));
  const today = new Date();
  let year = today.getFullYear();
  let day = today.getDate();

  if (dateStr && typeof dateStr === "string") {
    const trimmed = dateStr.trim();
    if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
      const [d, , y] = trimmed.split("/");
      const pD = parseInt(d, 10);
      const pY = parseInt(y, 10);
      if (!isNaN(pD)) day = pD;
      if (!isNaN(pY)) year = pY;
    } else if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed)) {
      const datePart = trimmed.split("T")[0];
      const parts = datePart.split("-");
      if (parts.length >= 3) {
        const pY = parseInt(parts[0], 10);
        const pD = parseInt(parts[2], 10);
        if (!isNaN(pY)) year = pY;
        if (!isNaN(pD)) day = pD;
      }
    }
  }

  // Calculate max days in safeMonth for this year
  const maxDays = new Date(year, safeMonth, 0).getDate();
  const clampedDay = Math.min(day, maxDays);

  return `${year}-${String(safeMonth).padStart(2, "0")}-${String(clampedDay).padStart(2, "0")}`;
}

/**
 * Tạo khóa định danh số phiếu theo từng tháng:
 * Ví dụ: Phiếu 12 tháng 9 -> "12__m9"
 *        Phiếu 12 tháng 10 -> "12__m10"
 * Như vậy phiếu 12 tháng 9 sẽ KHÔNG bị tính là trùng với phiếu 12 tháng 10.
 */
export function getOrderTicketMonthKey(
  ticketNumber: number | string | undefined | null,
  monthOrOrder?: number | null | { month?: number; deliveryDate?: string }
): string {
  const ticket = String(ticketNumber ?? "").trim().toLowerCase();
  if (!ticket) return "";
  let month: number | null = null;
  if (typeof monthOrOrder === "number") {
    month = monthOrOrder;
  } else if (monthOrOrder) {
    month = getOrderMonth(monthOrOrder);
  }
  return month ? `${ticket}__m${month}` : `${ticket}__nomonth`;
}

/**
 * Chuyển đổi chuỗi ngày sang đối tượng Date lúc 00:00:00 giờ địa phương
 */
export function parseDateToMidnight(dateStr?: string | null): Date | null {
  if (!dateStr || typeof dateStr !== "string") return null;
  const trimmed = dateStr.trim();
  if (!trimmed) return null;

  // Trường hợp định dạng DD/MM/YYYY
  if (/^\d{1,2}\/\d{1,2}\/\d{4}$/.test(trimmed)) {
    const [d, m, y] = trimmed.split("/").map(Number);
    return new Date(y, m - 1, d);
  }

  // Trường hợp định dạng YYYY-MM-DD
  if (/^\d{4}-\d{1,2}-\d{1,2}/.test(trimmed)) {
    const datePart = trimmed.split("T")[0];
    const [y, m, d] = datePart.split("-").map(Number);
    return new Date(y, m - 1, d);
  }

  const parsed = new Date(trimmed);
  if (!isNaN(parsed.getTime())) {
    return new Date(parsed.getFullYear(), parsed.getMonth(), parsed.getDate());
  }

  return null;
}

export interface HandoverDeadlineInfo {
  daysLeft: number;
  isOverdue: boolean;
  overdueDays: number;
  elapsedDays: number;
  displayText: string;
}

/**
 * Tính toán thời hạn bàn giao đơn hàng (mặc định 7 ngày kể từ ngày giao hàng):
 * - Bắt đầu từ ngày giao trừ dần (ngày giao còn 7 ngày, sau 1 ngày còn 6 ngày...)
 * - Đến ngày thứ 7: còn 0 ngày (hôm nay là hạn chót)
 * - Nếu quá 7 ngày: báo quá hạn bàn giao (isOverdue = true, overdueDays)
 */
export function getHandoverDeadlineInfo(
  deliveryDateStr?: string | null,
  limitDays: number = 7
): HandoverDeadlineInfo | null {
  if (!deliveryDateStr) return null;
  const deliveryDate = parseDateToMidnight(deliveryDateStr);
  if (!deliveryDate) return null;

  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  // Số ngày đã trôi qua kể từ ngày giao hàng
  const diffMs = today.getTime() - deliveryDate.getTime();
  const elapsedDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Nếu ngày giao ở tương lai, thời hạn vẫn còn nguyên vẹn limitDays ngày
  const safeElapsed = Math.max(0, elapsedDays);
  const daysLeft = limitDays - safeElapsed;

  if (daysLeft < 0) {
    const overdueDays = Math.abs(daysLeft);
    return {
      daysLeft,
      isOverdue: true,
      overdueDays,
      elapsedDays,
      displayText: `Quá hạn bàn giao (${overdueDays} ngày)`,
    };
  }

  if (daysLeft === 0) {
    return {
      daysLeft: 0,
      isOverdue: false,
      overdueDays: 0,
      elapsedDays,
      displayText: "Thời hạn còn: Hôm nay (hạn chót)",
    };
  }

  return {
    daysLeft,
    isOverdue: false,
    overdueDays: 0,
    elapsedDays,
    displayText: `Thời hạn còn ${daysLeft} ngày`,
  };
}



