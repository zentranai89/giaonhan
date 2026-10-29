import { formatDateDDMMYYYY, getLocalTodayISO, extractMonthFromDate } from "./dateUtils";

export interface QuickMessage {
  id: string;
  title: string;
  content: string;
  isDefault?: boolean;
  isCustom?: boolean;
  createdAt?: number;
}

const STORAGE_KEY = "delivery_orders_quick_messages_v2";

export const DEFAULT_QUICK_MESSAGES: QuickMessage[] = [
  {
    id: "msg_1",
    title: "Bảng kê giao hàng hôm nay",
    content:
      "📦 Dạ em gửi anh/chị hình ảnh bảng kê xuất kho & giao hàng ngày {date} (gồm {totalOrders} đơn hàng, {totalTickets} số phiếu). Anh/chị xem và kiểm tra giúp em nhé! ✅",
    isDefault: true,
    isCustom: false,
  },
  {
    id: "msg_2",
    title: "Báo cáo điều phối xe & tài xế",
    content:
      "🚚 Kính gửi Quản lý/Khách hàng, em xin gửi hình ảnh bảng kê giao nhận xe {vehicle} - Người giao: {driver} ngày {date}. Tổng số: {totalOrders} đơn ({totalTickets} phiếu). 📋",
    isDefault: false,
    isCustom: false,
  },
  {
    id: "msg_3",
    title: "Đối chiếu số phiếu xuất kho",
    content:
      "📋 Em gửi anh/chị đối chiếu danh sách {totalTickets} số phiếu giao hàng kho ngày {date}. Nhờ anh/chị kiểm đếm và phản hồi giúp em ạ. Cảm ơn anh/chị! ✨",
    isDefault: false,
    isCustom: false,
  },
  {
    id: "msg_4",
    title: "Xác nhận giao hàng hoàn tất",
    content:
      "✅ THÔNG BÁO HOÀN TẤT: Đã hoàn thành đối chiếu bảng kê giao hàng ngày {date} ({totalOrders} đơn, {totalTickets} phiếu). Chi tiết đính kèm trong hình ảnh phía dưới. 📦",
    isDefault: false,
    isCustom: false,
  },
  {
    id: "msg_5",
    title: "Gửi khách hàng kiểm tra đơn",
    content:
      "📍 Kính gửi {customer}, em xin gửi bảng kê chi tiết các phiếu giao hàng ngày {date} tại khu vực {area}. Quý khách vui lòng kiểm tra đối chiếu giúp bên em nhé! 🙏",
    isDefault: false,
    isCustom: false,
  },
  {
    id: "msg_6",
    title: "Báo cáo so sánh hôm nay và hôm qua",
    content:
      "📊 Báo cáo đối chiếu: Ngày hôm qua ({yesterday}) và ngày hôm nay ({date}). Hôm nay xuất kho {totalTickets} phiếu ({totalOrders} đơn). 🚚",
    isDefault: false,
    isCustom: false,
  },
];

export function getSavedQuickMessages(): QuickMessage[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    let list: QuickMessage[] = DEFAULT_QUICK_MESSAGES;
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) {
        list = parsed;
      }
    } else {
      // Check legacy key v1
      const legacyRaw = localStorage.getItem("delivery_orders_quick_messages_v1");
      if (legacyRaw) {
        const legacyParsed = JSON.parse(legacyRaw);
        if (Array.isArray(legacyParsed) && legacyParsed.length > 0) {
          list = legacyParsed;
        }
      }
    }

    // Tự động bảo vệ & giữ nguyên định dạng phong phú (màu chữ, in đậm, in nghiêng, ngắt dòng, icon...)
    const sanitizedList: QuickMessage[] = list.map((msg) => ({
      ...msg,
      title: convertToPlainText(msg.title || "").trim() || "Lời nhắn nhanh",
      content: sanitizeRichHtml(msg.content || "").trim(),
    }));

    return sanitizedList;
  } catch (e) {
    console.error("Failed to load quick messages from localStorage", e);
    return DEFAULT_QUICK_MESSAGES;
  }
}

export function saveQuickMessages(messages: QuickMessage[]): boolean {
  try {
    const cleaned = messages.map((m) => ({
      ...m,
      title: convertToPlainText(m.title || "").trim() || "Lời nhắn nhanh",
      content: sanitizeRichHtml(m.content || "").trim(),
    }));
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cleaned));
    return true;
  } catch (e) {
    console.error("Failed to save quick messages to localStorage", e);
    return false;
  }
}

export function resetQuickMessages(): QuickMessage[] {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error("Failed to reset quick messages", e);
  }
  return DEFAULT_QUICK_MESSAGES;
}

/**
 * Làm sạch mã HTML an toàn, loại bỏ script/iframe nhưng GIỮ NGUYÊN 100%:
 * - Màu chữ (style="color:...", <font color="...">)
 * - Màu nền (background-color)
 * - In đậm (b, strong, font-weight)
 * - In nghiêng (i, em, font-style)
 * - Gạch chân (u, text-decoration)
 * - Cỡ chữ, căn lề, ngắt dòng (br, p, div)
 * - Bảng biểu, danh sách, icon, biểu tượng emoji
 */
export function sanitizeRichHtml(rawHtml: string): string {
  if (!rawHtml) return "";
  try {
    if (typeof DOMParser === "undefined") return rawHtml;
    if (!/<[a-z][\s\S]*>/i.test(rawHtml)) {
      return rawHtml;
    }

    const parser = new DOMParser();
    const doc = parser.parseFromString(rawHtml, "text/html");

    // Loại bỏ các thẻ thực thi nguy hiểm
    const dangerousTags = [
      "script",
      "iframe",
      "object",
      "embed",
      "applet",
      "link",
      "meta",
      "style",
      "form",
      "input",
      "button",
    ];
    dangerousTags.forEach((tagName) => {
      const elements = doc.querySelectorAll(tagName);
      elements.forEach((el) => el.remove());
    });

    // Loại bỏ các sự kiện on* nguy hiểm nhưng giữ nguyên style, class, title, color
    const allElements = doc.querySelectorAll("*");
    allElements.forEach((el) => {
      const attrs = Array.from(el.attributes);
      for (const attr of attrs) {
        const name = attr.name.toLowerCase();
        const value = attr.value.toLowerCase();
        if (
          name.startsWith("on") ||
          value.includes("javascript:") ||
          value.includes("data:text/html")
        ) {
          el.removeAttribute(attr.name);
        }
      }
    });

    return doc.body.innerHTML;
  } catch (e) {
    console.warn("Lỗi sanitizeRichHtml:", e);
    return rawHtml;
  }
}

/**
 * Chuẩn bị nội dung hiển thị trong trình soạn thảo Rich Text:
 * Nếu là văn bản thuần có dấu xuống dòng \n, chuyển thành <br/> để hiển thị đúng dòng.
 */
export function formatContentForEditor(content: string): string {
  if (!content) return "";
  if (/<[a-z][\s\S]*>/i.test(content)) {
    return content;
  }
  return content.replace(/\r\n|\n|\r/g, "<br/>");
}

export function replaceMessageVariables(
  template: string,
  vars: {
    date?: string;
    yesterday?: string;
    time?: string;
    datetime?: string;
    manifestDate?: string;
    month?: number | string;
    totalOrders?: number | string;
    totalTickets?: number | string;
    deliveredOrders?: number | string;
    undeliveredOrders?: number | string;
    ticketList?: string;
    vehicle?: string;
    driver?: string;
    driverList?: string;
    customer?: string;
    area?: string;
  }
): string {
  if (!template) return "";
  // GIỮ NGUYÊN ĐỊNH DẠNG GIÀU (màu chữ, in đậm, in nghiêng, ngắt dòng, icon...)
  let result = template;

  // Ngày tháng hiện tại thực tế trên hệ thống (chuẩn dd/mm/yyyy)
  const d = vars.date ? formatDateDDMMYYYY(vars.date) : formatDateDDMMYYYY(getLocalTodayISO());
  
  // Ngày hôm qua
  const defaultYesterday = (() => {
    const yDate = new Date();
    yDate.setDate(yDate.getDate() - 1);
    return formatDateDDMMYYYY(getLocalTodayISO(yDate));
  })();
  const y = vars.yesterday ? formatDateDDMMYYYY(vars.yesterday) : defaultYesterday;

  const now = new Date();
  const t = vars.time || `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
  const dt = vars.datetime || `${t} ${d}`;
  const md = vars.manifestDate ? formatDateDDMMYYYY(vars.manifestDate) : d;
  const mVal = vars.month !== undefined && vars.month !== null
    ? String(vars.month)
    : String(vars.date ? (extractMonthFromDate(vars.date) || (now.getMonth() + 1)) : (now.getMonth() + 1));
  const ordCount = String(vars.totalOrders ?? 0);
  const ticketCount = String(vars.totalTickets ?? 0);
  const delivCount = String(vars.deliveredOrders ?? 0);
  const undelivCount = String(vars.undeliveredOrders ?? 0);
  const tList = vars.ticketList && vars.ticketList !== "(Chưa có)" ? vars.ticketList : "--";
  const veh = vars.vehicle && vars.vehicle !== "(Chưa có)" ? vars.vehicle : "--";
  const drv = vars.driver && vars.driver !== "(Chưa có)" ? vars.driver : "--";
  const drvList = vars.driverList && vars.driverList !== "(Chưa có)" ? vars.driverList : (drv !== "--" ? drv : "--");
  const cus = vars.customer && vars.customer !== "(Chưa có)" ? vars.customer : "quý khách";
  const ar = vars.area && vars.area !== "(Chưa có)" ? vars.area : "--";

  // Hỗ trợ mã ngày hôm qua (chấp nhận cả khoảng trắng trong ngoặc nhọn)
  result = result.replace(/\{\s*(yesterday|ngayhomqua|ngay_hom_qua|ngày hôm qua|homqua|hôm qua)\s*\}/gi, y);

  // Hỗ trợ các biến ngày hiện tại dựa vào ngày thực tế trên hệ thống
  result = result.replace(/\{\s*(date|ngay|ngày|today|ngayhientai|ngày hiện tại|hientai|hiện tại)\s*\}/gi, d);
  result = result.replace(/\{\s*(time|gio|giờ|giohientai|giờ hiện tại)\s*\}/gi, t);
  result = result.replace(/\{\s*(datetime|ngaygio|ngày giờ|thoigian|thời gian)\s*\}/gi, dt);
  result = result.replace(/\{\s*(manifestDate|ngaychungtu|ngày chứng từ|ngaybangke|ngày bảng kê)\s*\}/gi, md);
  result = result.replace(/\{\s*(month|thang|tháng)\s*\}/gi, mVal);

  result = result.replace(/\{\s*(totalOrders|sodon|số đơn|donhang|đơn hàng)\s*\}/gi, ordCount);
  result = result.replace(/\{\s*(totalTickets|sophieu|số phiếu|phieu|phiếu)\s*\}/gi, ticketCount);
  result = result.replace(/\{\s*(deliveredOrders|sodondagiao|số đơn đã giao|dagiao|đã giao)\s*\}/gi, delivCount);
  result = result.replace(/\{\s*(undeliveredOrders|sodonchuagiao|số đơn chưa giao|chuagiao|chưa giao)\s*\}/gi, undelivCount);
  result = result.replace(/\{\s*(ticketList|danhsachphieu|danh sách phiếu|cacphieu|các phiếu)\s*\}/gi, tList);

  result = result.replace(/\{\s*(driverList|danhsachnguoigiao|danh sách người giao|danhsachtaixe|danh sách tài xế|cacnguoigiao|các người giao|ds_nguoigiao|ds người giao)\s*\}/gi, drvList);
  result = result.replace(/\{\s*(vehicle|soxe|số xe|xe)\s*\}/gi, veh);
  result = result.replace(/\{\s*(driver|taixe|tài xế|nguoigiao|người giao)\s*\}/gi, drv);
  result = result.replace(/\{\s*(customer|khachhang|khách hàng|khach|khách)\s*\}/gi, cus);
  result = result.replace(/\{\s*(area|khuvuc|khu vực|noigiao|nơi giao)\s*\}/gi, ar);

  return result.trim();
}

/**
 * Chuyển đổi chuỗi tin nhắn thành HTML giàu cho các ứng dụng hỗ trợ rich text (Zalo, Word, Gmail, Teams...)
 * GIỮ NGUYÊN mọi màu chữ, in đậm, in nghiêng, ngắt dòng, icon đã soạn thảo hoặc dán vào.
 */
export function convertToRichHtml(text: string): string {
  if (!text) return "";
  const hasHtml = /<(br|p|div|span|b|strong|i|em|u|font|table|ul|ol|li)[\s>]/i.test(text);

  let formatted = text;
  if (!hasHtml) {
    // Nếu là plain text có \n, đổi thành <br/>
    formatted = text.replace(/\r\n|\n|\r/g, "<br/>");
  }

  // Khung bao bọc an toàn, không ghi đè màu chữ bên trong (color: inherit) và giữ nguyên ngắt dòng
  return `<div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 14px; line-height: 1.6; white-space: pre-wrap;">${formatted}</div>`;
}

/**
 * Chuyển đổi chuỗi tin nhắn thành plain-text sạch dự phòng:
 * Chuyển thẻ ngắt dòng thành dấu xuống dòng thật (\n), giữ nguyên icon/emoji và tiếng Việt chuẩn
 */
export function convertToPlainText(text: string): string {
  if (!text) return "";
  let plain = String(text);

  // Chuyển thẻ xuống dòng và đóng đoạn thành dấu xuống dòng thật
  plain = plain.replace(/<br\s*[\/]?>/gi, "\n");
  plain = plain.replace(/<\/p>/gi, "\n");
  plain = plain.replace(/<\/div>/gi, "\n");
  plain = plain.replace(/<\/li>/gi, "\n");
  plain = plain.replace(/<\/tr>/gi, "\n");

  // Loại bỏ toàn bộ các thẻ HTML (<b ...>, <span>, <div>, ...)
  plain = plain.replace(/<[^>]*>/g, "");

  // Giải mã toàn bộ HTML entities phổ biến gây ký tự lạ
  plain = plain.replace(/&nbsp;/gi, " ");
  plain = plain.replace(/&amp;/gi, "&");
  plain = plain.replace(/&quot;/gi, '"');
  plain = plain.replace(/&#39;|&apos;/gi, "'");
  plain = plain.replace(/&lt;/gi, "<");
  plain = plain.replace(/&gt;/gi, ">");

  // Xóa các khoảng trống thừa nhiều dòng liên tiếp
  plain = plain.replace(/\r\n/g, "\n");
  plain = plain.replace(/\n{3,}/g, "\n\n");

  return plain.trim();
}

/**
 * Hàm sao chép đa định dạng (Rich Text HTML + Plain Text):
 * Cho phép dán vào Zalo, Word, Gmail, Teams giữ nguyên:
 * - Màu chữ (inline CSS)
 * - In đậm (b/strong)
 * - In nghiêng (i/em)
 * - Gạch chân (u)
 * - Ký tự đặc biệt & Icon (Unicode UTF-8)
 */
export async function copyRichFormattedText(htmlText: string, plainText: string): Promise<boolean> {
  // Phương thức 1: ClipboardItem API (Chuẩn hiện đại cho Zalo Web, Word, Chrome/Edge/Safari)
  try {
    if (typeof ClipboardItem !== "undefined" && navigator.clipboard && navigator.clipboard.write) {
      const htmlBlob = new Blob([htmlText], { type: "text/html" });
      const textBlob = new Blob([plainText], { type: "text/plain" });
      await navigator.clipboard.write([
        new ClipboardItem({
          "text/html": htmlBlob,
          "text/plain": textBlob,
        }),
      ]);
      return true;
    }
  } catch (err) {
    console.warn("ClipboardItem write failed, fallback to execCommand:", err);
  }

  // Phương thức 2: execCommand trên vùng contenteditable ẩn
  try {
    const hiddenDiv = document.createElement("div");
    hiddenDiv.setAttribute("contenteditable", "true");
    hiddenDiv.innerHTML = htmlText;
    hiddenDiv.style.position = "fixed";
    hiddenDiv.style.pointerEvents = "none";
    hiddenDiv.style.opacity = "0";
    hiddenDiv.style.left = "-9999px";
    hiddenDiv.style.top = "-9999px";
    document.body.appendChild(hiddenDiv);

    const range = document.createRange();
    range.selectNodeContents(hiddenDiv);
    const selection = window.getSelection();
    if (selection) {
      selection.removeAllRanges();
      selection.addRange(range);
      const ok = document.execCommand("copy");
      selection.removeAllRanges();
      document.body.removeChild(hiddenDiv);
      if (ok) return true;
    } else {
      document.body.removeChild(hiddenDiv);
    }
  } catch (err) {
    console.warn("execCommand copy fallback failed:", err);
  }

  // Phương thức 3: navigator.clipboard.writeText (dự phòng văn bản)
  try {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      await navigator.clipboard.writeText(plainText);
      return true;
    }
  } catch (err) {
    console.error("writeText fallback failed:", err);
  }

  return false;
}

