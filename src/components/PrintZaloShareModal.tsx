import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from "react";
import {
  X,
  Share2,
  Copy,
  CopyCheck,
  Download,
  CheckCircle2,
  MessageSquare,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  Save,
  RotateCcw,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Code2,
  Clock,
  Type,
  Palette,
  Smile,
  ChevronDown,
  ChevronUp,
  Bold,
  Italic,
  Underline,
  Eraser,
  Highlighter,
  Maximize2,
  Minimize2,
} from "lucide-react";
import { toPng } from "html-to-image";
import {
  QuickMessage,
  getSavedQuickMessages,
  saveQuickMessages,
  resetQuickMessages,
  replaceMessageVariables,
  convertToRichHtml,
  convertToPlainText,
  copyRichFormattedText,
  sanitizeRichHtml,
  formatContentForEditor,
} from "../utils/quickMessagesStorage";
import { formatDateDDMMYYYY, getLocalTodayISO } from "../utils/dateUtils";

interface PrintZaloShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  documentElementId?: string;
  dateStr?: string;
  manifestDateStr?: string;
  totalOrders: number;
  totalTickets: number;
  deliveredOrders?: number;
  undeliveredOrders?: number;
  ticketListStr?: string;
  vehicleNumber?: string;
  driverName?: string;
  driverListStr?: string;
  customerName?: string;
  area?: string;
}

// Danh mục icon & ký tự đặc biệt nhanh
const QUICK_LOGISTICS_ICONS = [
  "📦", "🚚", "📋", "📍", "✅", "❌", "⚠️", "⏰", "🗓️", "🏢", "👤", "📞", "💰", "⭐", "🔹", "🔸", "🎯", "➡️", "📝", "🆗"
];
const EXTRA_SYMBOLS = [
  "🚗", "🛵", "🚛", "📑", "🧾", "🏷️", "🔍", "💬", "🚀", "🤝", "💡", "📌", "🚩", "🔴", "🟢", "🟡", "✦", "★", "•", "→", "✓", "✗", "☎", "✉", "✆", "⦿", "⏳"
];

// Bảng màu chữ nhanh cho soạn thảo lời nhắn
const QUICK_TEXT_COLORS = [
  { name: "Đỏ", hex: "#dc2626", bgClass: "bg-red-600" },
  { name: "Xanh dương", hex: "#2563eb", bgClass: "bg-blue-600" },
  { name: "Xanh lá", hex: "#16a34a", bgClass: "bg-emerald-600" },
  { name: "Cam đậm", hex: "#ea580c", bgClass: "bg-orange-600" },
  { name: "Tím", hex: "#9333ea", bgClass: "bg-purple-600" },
  { name: "Đen", hex: "#0f172a", bgClass: "bg-slate-900" },
];

// Bảng màu nền dạ quang (Highlight)
const QUICK_HIGHLIGHT_COLORS = [
  { name: "Dạ quang vàng", hex: "#fef08a", bgClass: "bg-yellow-200 border-yellow-400" },
  { name: "Xanh mạ nhạt", hex: "#bbf7d0", bgClass: "bg-emerald-200 border-emerald-400" },
  { name: "Hồng phấn", hex: "#fbcfe8", bgClass: "bg-pink-200 border-pink-400" },
  { name: "Xóa highlight", hex: "transparent", bgClass: "bg-white border-dashed border-slate-300" },
];

// Component Soạn Thảo Lời Nhắn Nhanh Đa Định Dạng (Rich Text Visual Editor):
// Giữ nguyên 100% nội dung, ký tự, ngắt dòng, màu chữ, in đậm, in nghiêng khi sao chép và dán vào
interface QuickMessageEditorProps {
  key?: React.Key;
  value: string;
  onChange: (htmlOrText: string) => void;
  placeholder?: string;
  minHeight?: string;
  maxHeight?: string;
  tagButtons?: Array<{
    code: string;
    name: string;
    currentVal: string;
    borderClass: string;
    bgClass: string;
    textClass: string;
  }>;
  onTagInserted?: (tagCode: string) => void;
  extraRightAction?: React.ReactNode;
}

function QuickMessageEditor({
  value,
  onChange,
  placeholder = "Nhập hoặc dán nội dung lời nhắn tại đây (Giữ nguyên màu chữ, in đậm, dòng, ký tự)...",
  minHeight = "95px",
  maxHeight = "260px",
  tagButtons,
  onTagInserted,
  extraRightAction,
}: QuickMessageEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);
  const lastHtmlRef = useRef<string | null>(null);
  const isMountedRef = useRef<boolean>(false);
  const savedSelectionRef = useRef<Range | null>(null);

  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [showHighlightPicker, setShowHighlightPicker] = useState(false);

  // Lưu lại vị trí con trỏ chuột trong vùng soạn thảo
  const saveSelection = () => {
    if (typeof window === "undefined") return;
    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
      savedSelectionRef.current = sel.getRangeAt(0).cloneRange();
    }
  };

  // Khôi phục lại vị trí con trỏ
  const restoreSelection = () => {
    if (typeof window === "undefined") return;
    if (savedSelectionRef.current && window.getSelection) {
      const sel = window.getSelection();
      if (sel) {
        sel.removeAllRanges();
        sel.addRange(savedSelectionRef.current);
      }
    }
  };

  // Đồng bộ nội dung khi mount lần đầu và khi prop value thay đổi từ bên ngoài (chọn mẫu, sửa mẫu, nạp lại dữ liệu...)
  useLayoutEffect(() => {
    if (!editorRef.current) return;
    const formatted = formatContentForEditor(value || "");

    // Đảm bảo nội dung luôn được nạp đầy đủ khi mở mẫu ra sửa, đổi mẫu, hoặc nạp lại
    if (!isMountedRef.current || !editorRef.current.innerHTML || editorRef.current.innerHTML !== formatted) {
      if (document.activeElement !== editorRef.current || !editorRef.current.innerHTML) {
        editorRef.current.innerHTML = formatted;
        lastHtmlRef.current = formatted;
      }
    }
    isMountedRef.current = true;
  }, [value]);

  // Xử lý khi người dùng nhập liệu trực tiếp
  const handleInput = () => {
    if (!editorRef.current) return;
    const newHtml = editorRef.current.innerHTML;
    lastHtmlRef.current = newHtml;
    onChange(newHtml);
    saveSelection();
  };

  // Chèn đoạn mã HTML/Ký tự ngay tại vị trí con trỏ chuột
  const insertHtmlAtCursor = (htmlToInsert: string) => {
    restoreSelection();
    if (editorRef.current && (!savedSelectionRef.current || !editorRef.current.contains(savedSelectionRef.current.commonAncestorContainer))) {
      editorRef.current.focus();
    }

    const sel = window.getSelection();
    if (sel && sel.rangeCount > 0 && editorRef.current && editorRef.current.contains(sel.anchorNode)) {
      const range = sel.getRangeAt(0);
      range.deleteContents();

      const el = document.createElement("div");
      el.innerHTML = htmlToInsert;
      const frag = document.createDocumentFragment();
      let node: ChildNode | null;
      let lastNode: ChildNode | null = null;
      while ((node = el.firstChild)) {
        lastNode = frag.appendChild(node);
      }
      range.insertNode(frag);

      if (lastNode) {
        const newRange = range.cloneRange();
        newRange.setStartAfter(lastNode);
        newRange.collapse(true);
        sel.removeAllRanges();
        sel.addRange(newRange);
        savedSelectionRef.current = newRange.cloneRange();
      }

      if (editorRef.current) {
        const nextVal = editorRef.current.innerHTML;
        lastHtmlRef.current = nextVal;
        onChange(nextVal);
      }
      return;
    }

    // Dự phòng: Nối tiếp vào cuối nếu chưa có vị trí con trỏ
    if (editorRef.current) {
      editorRef.current.innerHTML += htmlToInsert;
      const nextVal = editorRef.current.innerHTML;
      lastHtmlRef.current = nextVal;
      onChange(nextVal);
    }
  };

  // Xử lý dán (PASTE): GIỮ NGUYÊN 100% NỘI DUNG, KÝ TỰ, DÒNG, MÀU SẮC, CHỮ IN ĐẬM/NGHIÊNG
  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    e.preventDefault();
    const html = e.clipboardData.getData("text/html");
    const text = e.clipboardData.getData("text/plain");

    if (html) {
      // Nội dung sao chép có kèm định dạng rich text (từ Zalo, Word, Excel, Web, Email...)
      const safeHtml = sanitizeRichHtml(html);
      insertHtmlAtCursor(safeHtml);
    } else if (text) {
      // Nội dung là văn bản thuần -> Giữ nguyên ngắt dòng \n và khoảng trắng
      const textFormatted = text
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/\r\n|\n|\r/g, "<br/>");
      insertHtmlAtCursor(textFormatted);
    }
  };

  // Thực thi lệnh định dạng trực tiếp trên trình duyệt
  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    restoreSelection();
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(cmd, false, val);
    if (editorRef.current) {
      const nextVal = editorRef.current.innerHTML;
      lastHtmlRef.current = nextVal;
      onChange(nextVal);
    }
    saveSelection();
  };

  // Chèn biểu tượng / icon
  const insertSymbol = (sym: string) => {
    insertHtmlAtCursor(sym);
  };

  // Chèn mã biến ({date}, {totalOrders}...)
  const insertTag = (tagCode: string) => {
    insertHtmlAtCursor(` ${tagCode} `);
    if (onTagInserted) onTagInserted(tagCode);
  };

  const isEmpty =
    !value ||
    value === "<br>" ||
    value === "<div><br></div>" ||
    value.replace(/<[^>]*>/g, "").trim() === "";

  return (
    <div className="space-y-1.5">
      {/* THANH CÔNG CỤ SOẠN THẢO TRỰC QUAN: MÀU SẮC, IN ĐẬM, NGHIÊNG, ICON */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 p-1.5 bg-slate-100/90 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-1">
          {/* Nhóm định dạng kiểu chữ: Đậm, Nghiêng, Gạch chân */}
          <div className="flex items-center gap-0.5 bg-white p-0.5 rounded-lg border border-slate-200">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCmd("bold")}
              className="w-6 h-6 flex items-center justify-center text-xs font-bold text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
              title="In đậm (Bold)"
            >
              <Bold className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCmd("italic")}
              className="w-6 h-6 flex items-center justify-center text-xs italic text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
              title="In nghiêng (Italic)"
            >
              <Italic className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => execCmd("underline")}
              className="w-6 h-6 flex items-center justify-center text-xs underline text-slate-800 hover:bg-slate-100 rounded-md cursor-pointer transition-colors"
              title="Gạch chân (Underline)"
            >
              <Underline className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Nhóm Màu Chữ Trực Quan */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowColorPicker(!showColorPicker);
                setShowHighlightPicker(false);
                setShowEmojiPicker(false);
              }}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 text-[10.5px] font-bold rounded-lg border border-slate-300 shadow-2xs cursor-pointer flex items-center gap-1"
              title="Chọn màu chữ cho văn bản"
            >
              <Palette className="w-3 h-3 text-red-500" />
              <span>Màu chữ</span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>

            {showColorPicker && (
              <div className="absolute left-0 top-full mt-1 w-52 p-2 bg-white rounded-xl shadow-xl border border-slate-300 z-50 animate-scale-in space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-[10.5px] font-bold text-slate-700">
                  <span>Chọn màu chữ:</span>
                  <button
                    type="button"
                    onClick={() => setShowColorPicker(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-6 gap-1.5">
                  {QUICK_TEXT_COLORS.map((col) => (
                    <button
                      key={col.hex}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        execCmd("foreColor", col.hex);
                        setShowColorPicker(false);
                      }}
                      className={`w-6 h-6 rounded-md ${col.bgClass} shadow-2xs hover:scale-110 transition-transform cursor-pointer border border-black/10`}
                      title={`Màu ${col.name}`}
                    />
                  ))}
                </div>
                <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between gap-1 text-[10px] text-slate-600">
                  <span>Màu tùy chỉnh:</span>
                  <input
                    type="color"
                    onChange={(e) => {
                      execCmd("foreColor", e.target.value);
                    }}
                    className="w-6 h-6 p-0 border border-slate-300 rounded cursor-pointer"
                    title="Chọn màu tùy biến khác"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Nhóm Màu Nền Dạ Quang (Highlight) */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowHighlightPicker(!showHighlightPicker);
                setShowColorPicker(false);
                setShowEmojiPicker(false);
              }}
              className="px-2 py-1 bg-white hover:bg-slate-50 text-slate-700 text-[10.5px] font-bold rounded-lg border border-slate-300 shadow-2xs cursor-pointer flex items-center gap-1"
              title="Đánh dấu dạ quang (Highlight)"
            >
              <Highlighter className="w-3 h-3 text-amber-500" />
              <span>Nền dạ quang</span>
              <ChevronDown className="w-2.5 h-2.5 text-slate-400" />
            </button>

            {showHighlightPicker && (
              <div className="absolute left-0 top-full mt-1 w-48 p-2 bg-white rounded-xl shadow-xl border border-slate-300 z-50 animate-scale-in space-y-2">
                <div className="flex items-center justify-between pb-1 border-b border-slate-100 text-[10.5px] font-bold text-slate-700">
                  <span>Màu nền dạ quang:</span>
                  <button
                    type="button"
                    onClick={() => setShowHighlightPicker(false)}
                    className="text-slate-400 hover:text-slate-600 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="flex items-center gap-1.5">
                  {QUICK_HIGHLIGHT_COLORS.map((hl) => (
                    <button
                      key={hl.name}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        execCmd("hiliteColor", hl.hex);
                        setShowHighlightPicker(false);
                      }}
                      className={`w-7 h-7 rounded-md ${hl.bgClass} shadow-2xs hover:scale-110 transition-transform cursor-pointer border text-[10px] flex items-center justify-center font-bold`}
                      title={hl.name}
                    >
                      {hl.hex === "transparent" ? "✕" : "A"}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Xóa định dạng */}
          <button
            type="button"
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => execCmd("removeFormat")}
            className="w-6 h-6 flex items-center justify-center text-slate-500 hover:text-slate-800 hover:bg-white rounded-md cursor-pointer transition-colors border border-transparent hover:border-slate-300"
            title="Xóa định dạng (Trở về chữ thường)"
          >
            <Eraser className="w-3.5 h-3.5" />
          </button>

          {/* Dải Icon logistics nhanh */}
          <div className="hidden sm:flex items-center gap-0.5 p-0.5 bg-white rounded-lg border border-slate-200">
            {QUICK_LOGISTICS_ICONS.slice(0, 8).map((icon) => (
              <button
                key={icon}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => insertSymbol(icon)}
                className="w-6 h-6 flex items-center justify-center text-xs hover:bg-slate-100 rounded-md cursor-pointer transition-transform active:scale-110"
                title={`Chèn icon ${icon}`}
              >
                {icon}
              </button>
            ))}
          </div>

          {/* Nút mở rộng Icon & Ký tự đặc biệt */}
          <div className="relative">
            <button
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => {
                setShowEmojiPicker(!showEmojiPicker);
                setShowColorPicker(false);
                setShowHighlightPicker(false);
              }}
              className="px-2 py-1 bg-white hover:bg-slate-100 text-slate-700 text-[10px] font-bold rounded-lg border border-slate-300 shadow-2xs cursor-pointer flex items-center gap-0.5"
              title="Mở thêm nhiều icon và ký tự đặc biệt"
            >
              <Smile className="w-3 h-3 text-amber-600" />
              <span>Icon</span>
              {showEmojiPicker ? <ChevronUp className="w-2.5 h-2.5" /> : <ChevronDown className="w-2.5 h-2.5 text-slate-400" />}
            </button>

            {showEmojiPicker && (
              <div className="absolute left-0 sm:right-0 top-full mt-1.5 w-64 p-2 bg-white rounded-xl shadow-xl border border-slate-300 z-50 animate-scale-in">
                <div className="flex items-center justify-between pb-1 mb-1.5 border-b border-slate-100 text-[10.5px] font-bold text-slate-800">
                  <span>Chọn icon &amp; ký tự đặc biệt:</span>
                  <button
                    type="button"
                    onClick={() => setShowEmojiPicker(false)}
                    className="text-slate-400 hover:text-slate-700 p-0.5 cursor-pointer"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
                <div className="grid grid-cols-7 gap-1 max-h-48 overflow-y-auto pr-0.5">
                  {[...QUICK_LOGISTICS_ICONS, ...EXTRA_SYMBOLS].map((sym, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={() => {
                        insertSymbol(sym);
                      }}
                      className="w-7 h-7 flex items-center justify-center text-sm hover:bg-amber-50 rounded-lg border border-transparent hover:border-amber-300 cursor-pointer transition-transform hover:scale-110"
                      title={`Chèn ký tự ${sym}`}
                    >
                      {sym}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>

        {extraRightAction && (
          <div className="ml-auto flex items-center">
            {extraRightAction}
          </div>
        )}
      </div>

      {/* VÙNG SOẠN THẢO TRỰC QUAN (CONTENTEDITABLE) - GIỮ NGUYÊN MỌI ĐỊNH DẠNG KHI COPY/PASTE */}
      <div className="relative">
        <div
          ref={(el) => {
            (editorRef as any).current = el;
            if (el && !el.innerHTML && value) {
              el.innerHTML = formatContentForEditor(value);
            }
          }}
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onPaste={handlePaste}
          onKeyUp={saveSelection}
          onMouseUp={saveSelection}
          onBlur={saveSelection}
          style={{ minHeight, maxHeight }}
          className="w-full p-3 text-xs border border-gray-300 rounded-xl bg-white focus:outline-hidden focus:border-blue-500 focus:ring-1 focus:ring-blue-500 leading-relaxed text-gray-900 shadow-2xs font-medium resize-y overflow-y-auto whitespace-pre-wrap select-text transition-colors"
        />

        {/* Chữ gợi ý Placeholder khi trống */}
        {isEmpty && (
          <div
            onClick={() => editorRef.current?.focus()}
            className="absolute top-3 left-3 right-3 text-xs text-gray-400 pointer-events-none select-none italic font-normal"
          >
            {placeholder}
          </div>
        )}
      </div>

      {/* Thanh Thông báo xác nhận giữ nguyên định dạng */}
      <div className="flex items-center gap-1.5 text-[10.5px] text-emerald-800 bg-emerald-50/90 px-2.5 py-1 rounded-lg border border-emerald-200">
        <Sparkles className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
        <span>
          <strong>Dán nguyên vẹn 100%:</strong> Khi bạn sao chép (copy) và dán (paste) vào đây, toàn bộ màu chữ, in đậm, in nghiêng, ngắt dòng, icon &amp; ký tự đặc biệt đều được giữ nguyên vẹn không đổi!
        </span>
      </div>

      {/* Thanh Chèn mã thông tin tự động ({date}, {totalOrders}...) */}
      {tagButtons && tagButtons.length > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider flex items-center gap-1">
            <Code2 className="w-3 h-3 text-blue-600" />
            Chèn mã:
          </span>
          {tagButtons.map((tag) => (
            <button
              key={tag.code}
              type="button"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => insertTag(tag.code)}
              className={`px-2 py-0.5 rounded text-[10.5px] font-semibold transition-colors cursor-pointer border shadow-2xs ${tag.bgClass} ${tag.borderClass} ${tag.textClass}`}
              title={`Chèn ${tag.name} (${tag.currentVal})`}
            >
              + {tag.name} ({tag.currentVal})
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function PrintZaloShareModal({
  isOpen,
  onClose,
  documentElementId = "print-manifest-document",
  dateStr = "",
  manifestDateStr = "",
  totalOrders,
  totalTickets,
  deliveredOrders = 0,
  undeliveredOrders = 0,
  ticketListStr = "",
  vehicleNumber = "",
  driverName = "",
  driverListStr = "",
  customerName = "",
  area = "",
}: PrintZaloShareModalProps) {
  // Image generation states
  const [imageBlob, setImageBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [isGeneratingImage, setIsGeneratingImage] = useState(false);
  const [imageError, setImageError] = useState<string | null>(null);

  // Quick messages states
  const [quickMessages, setQuickMessages] = useState<QuickMessage[]>(() => getSavedQuickMessages());
  const [selectedMessageId, setSelectedMessageId] = useState<string>(() => {
    const list = getSavedQuickMessages();
    return list[0]?.id || "custom";
  });
  const [messageText, setMessageText] = useState("");
  const [isManagingTemplates, setIsManagingTemplates] = useState(false);
  const [filterType, setFilterType] = useState<"all" | "custom" | "default">("all");

  // New message form states (Tạo lời nhắn do tôi tự tạo)
  const [newTitle, setNewTitle] = useState("");
  const [newContent, setNewContent] = useState("");
  const [isAddingNewTemplate, setIsAddingNewTemplate] = useState(false);
  const [editingTemplateId, setEditingTemplateId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [editingContent, setEditingContent] = useState("");

  // Feedback notifications
  const [feedback, setFeedback] = useState<{
    type: "image" | "text" | "save" | "error";
    text: string;
  } | null>(null);

  // In-app deletion and reset confirmation states
  const [templateToDelete, setTemplateToDelete] = useState<{ id: string; title: string } | null>(null);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);

  // Chế độ toàn màn hình (Fullscreen) giúp không gian rộng rãi, dễ thao tác
  const [isFullscreen, setIsFullscreen] = useState<boolean>(() => {
    try {
      const saved = localStorage.getItem("zalo_share_modal_fullscreen");
      return saved !== null ? saved === "true" : true; // Mặc định mở toàn màn hình để dễ thao tác
    } catch {
      return true;
    }
  });

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      try {
        localStorage.setItem("zalo_share_modal_fullscreen", String(next));
      } catch {}
      return next;
    });
  };

  const handleStartEditTemplate = (m: QuickMessage) => {
    setEditingTemplateId(m.id);
    setEditingTitle(m.title);
    setEditingContent(m.content || "");
  };

  // Sequential copy step: 1. Copy lời nhắn trước -> 2. Sau đó tới hình ảnh
  const [sequentialCopyStep, setSequentialCopyStep] = useState<"idle" | "message_copied" | "image_copied">("idle");

  // Ngày tháng & thời gian hiện tại dựa vào ngày thực tế trên hệ thống
  const [realtimeNow, setRealtimeNow] = useState(() => new Date());

  useEffect(() => {
    if (!isOpen) return;
    setRealtimeNow(new Date());
    const interval = setInterval(() => {
      setRealtimeNow(new Date());
    }, 1000);
    return () => clearInterval(interval);
  }, [isOpen]);

  const realTodayDateStr = useMemo(() => {
    return formatDateDDMMYYYY(getLocalTodayISO(realtimeNow));
  }, [realtimeNow]);

  const realYesterdayDateStr = useMemo(() => {
    const yDate = new Date(realtimeNow);
    yDate.setDate(yDate.getDate() - 1);
    return formatDateDDMMYYYY(getLocalTodayISO(yDate));
  }, [realtimeNow]);

  const realTodayTimeStr = useMemo(() => {
    const h = String(realtimeNow.getHours()).padStart(2, "0");
    const m = String(realtimeNow.getMinutes()).padStart(2, "0");
    return `${h}:${m}`;
  }, [realtimeNow]);

  const realTodayDateTimeStr = useMemo(() => {
    return `${realTodayTimeStr} ${realTodayDateStr}`;
  }, [realTodayTimeStr, realTodayDateStr]);

  // Template dynamic variables
  const templateVars = useMemo(
    () => ({
      date: realTodayDateStr,
      yesterday: realYesterdayDateStr, // Thêm mã ngày hôm qua
      time: realTodayTimeStr,
      datetime: realTodayDateTimeStr,
      manifestDate: manifestDateStr || dateStr || realTodayDateStr,
      totalOrders,
      totalTickets,
      deliveredOrders,
      undeliveredOrders,
      ticketList: ticketListStr,
      vehicle: vehicleNumber,
      driver: driverName,
      driverList: driverListStr || driverName || "",
      customer: customerName,
      area,
    }),
    [
      realTodayDateStr,
      realYesterdayDateStr,
      realTodayTimeStr,
      realTodayDateTimeStr,
      manifestDateStr,
      dateStr,
      totalOrders,
      totalTickets,
      deliveredOrders,
      undeliveredOrders,
      ticketListStr,
      vehicleNumber,
      driverName,
      driverListStr,
      customerName,
      area,
    ]
  );

  // Cấu hình danh sách mã tự động bổ sung
  const TAG_BUTTONS_LIST = useMemo(
    () => [
      {
        code: "{yesterday}",
        name: "Ngày hôm qua",
        currentVal: realYesterdayDateStr,
        borderClass: "border-amber-400 hover:border-amber-600",
        bgClass: "bg-amber-50 hover:bg-amber-100",
        textClass: "text-amber-950 font-bold",
      },
      {
        code: "{date}",
        name: "Ngày thực tế",
        currentVal: realTodayDateStr,
        borderClass: "border-emerald-300 hover:border-emerald-500",
        bgClass: "bg-emerald-50/70 hover:bg-emerald-100",
        textClass: "text-emerald-950 font-bold",
      },
      {
        code: "{time}",
        name: "Giờ thực tế",
        currentVal: realTodayTimeStr,
        borderClass: "border-sky-300 hover:border-sky-500",
        bgClass: "bg-sky-50/70 hover:bg-sky-100",
        textClass: "text-sky-900 font-semibold",
      },
      {
        code: "{datetime}",
        name: "Ngày & Giờ",
        currentVal: realTodayDateTimeStr,
        borderClass: "border-teal-300 hover:border-teal-500",
        bgClass: "bg-teal-50/70 hover:bg-teal-100",
        textClass: "text-teal-900 font-semibold",
      },
      {
        code: "{manifestDate}",
        name: "Ngày bảng kê",
        currentVal: manifestDateStr || dateStr || realTodayDateStr,
        borderClass: "border-slate-300 hover:border-slate-500",
        bgClass: "bg-slate-50/80 hover:bg-slate-100",
        textClass: "text-slate-800 font-semibold",
      },
      {
        code: "{totalTickets}",
        name: "Tổng số phiếu",
        currentVal: `${totalTickets} phiếu`,
        borderClass: "border-blue-300 hover:border-blue-500",
        bgClass: "bg-blue-50/70 hover:bg-blue-100",
        textClass: "text-blue-900 font-bold",
      },
      {
        code: "{totalOrders}",
        name: "Tổng số đơn",
        currentVal: `${totalOrders} đơn`,
        borderClass: "border-purple-300 hover:border-purple-500",
        bgClass: "bg-purple-50/70 hover:bg-purple-100",
        textClass: "text-purple-900 font-bold",
      },
      {
        code: "{deliveredOrders}",
        name: "Đơn đã giao",
        currentVal: `${deliveredOrders} đơn`,
        borderClass: "border-emerald-300 hover:border-emerald-500",
        bgClass: "bg-emerald-50/80 hover:bg-emerald-100",
        textClass: "text-emerald-900 font-bold",
      },
      {
        code: "{undeliveredOrders}",
        name: "Đơn chưa giao",
        currentVal: `${undeliveredOrders} đơn`,
        borderClass: "border-rose-300 hover:border-rose-500",
        bgClass: "bg-rose-50/80 hover:bg-rose-100",
        textClass: "text-rose-900 font-bold",
      },
      {
        code: "{vehicle}",
        name: "Biển số xe",
        currentVal: vehicleNumber || "(Chưa có)",
        borderClass: "border-amber-300 hover:border-amber-500",
        bgClass: "bg-amber-50/70 hover:bg-amber-100",
        textClass: "text-amber-900",
      },
      {
        code: "{driver}",
        name: "Tài xế / Người giao",
        currentVal: driverName || "(Chưa có)",
        borderClass: "border-teal-300 hover:border-teal-500",
        bgClass: "bg-teal-50/70 hover:bg-teal-100",
        textClass: "text-teal-900",
      },
      {
        code: "{driverList}",
        name: "Danh sách người giao",
        currentVal: driverListStr || driverName || "(Chưa có)",
        borderClass: "border-cyan-400 hover:border-cyan-600",
        bgClass: "bg-cyan-50/90 hover:bg-cyan-100",
        textClass: "text-cyan-950 font-bold",
      },
      {
        code: "{customer}",
        name: "Tên khách hàng",
        currentVal: customerName || "(Chưa có)",
        borderClass: "border-rose-300 hover:border-rose-500",
        bgClass: "bg-rose-50/70 hover:bg-rose-100",
        textClass: "text-rose-900",
      },
      {
        code: "{area}",
        name: "Khu vực / Nơi giao",
        currentVal: area || "(Chưa có)",
        borderClass: "border-indigo-300 hover:border-indigo-500",
        bgClass: "bg-indigo-50/70 hover:bg-indigo-100",
        textClass: "text-indigo-900",
      },
      {
        code: "{ticketList}",
        name: "Danh sách số phiếu",
        currentVal: ticketListStr || "(Chưa có)",
        borderClass: "border-violet-300 hover:border-violet-500",
        bgClass: "bg-violet-50/70 hover:bg-violet-100",
        textClass: "text-violet-900",
      },
    ],
    [
      realYesterdayDateStr,
      realTodayDateStr,
      realTodayTimeStr,
      realTodayDateTimeStr,
      manifestDateStr,
      dateStr,
      totalTickets,
      totalOrders,
      deliveredOrders,
      undeliveredOrders,
      vehicleNumber,
      driverName,
      driverListStr,
      customerName,
      area,
      ticketListStr,
    ]
  );

  // Reset sequential copy step when modal closes/opens or template changes
  useEffect(() => {
    setSequentialCopyStep("idle");
  }, [isOpen, selectedMessageId]);

  // Khi chọn mẫu hoặc mở modal: thay thế các biến để hiển thị nội dung phong phú
  useEffect(() => {
    if (!isOpen) return;
    if (selectedMessageId === "custom") return;
    const found = quickMessages.find((m) => m.id === selectedMessageId);
    if (found) {
      setMessageText(replaceMessageVariables(found.content, templateVars));
    }
  }, [isOpen, selectedMessageId, quickMessages, templateVars]);

  // Kết xuất ảnh bảng kê
  const generateImageFromDoc = async () => {
    setImageError(null);
    setIsGeneratingImage(true);

    try {
      const node = document.getElementById(documentElementId);
      if (!node) {
        setImageError("Không tìm thấy vùng dữ liệu bảng in (#" + documentElementId + ") để kết xuất ảnh.");
        setIsGeneratingImage(false);
        return;
      }

      await new Promise((r) => setTimeout(r, 120));

      const width = node.scrollWidth || node.offsetWidth || 1020;
      const height = node.scrollHeight || node.offsetHeight || 800;

      const dataUrl = await toPng(node, {
        quality: 0.98,
        pixelRatio: 2,
        backgroundColor: "#ffffff",
        cacheBust: true,
        skipFonts: true,
        fontEmbedCSS: "",
        width,
        height,
      });

      setImageUrl(dataUrl);

      const res = await fetch(dataUrl);
      const blob = await res.blob();
      setImageBlob(blob);
    } catch (err: any) {
      console.error("Lỗi khi kết xuất ảnh bảng kê:", err);
      setImageError("Không thể tạo hình ảnh bảng kê: " + (err?.message || "Lỗi đồ họa"));
    } finally {
      setIsGeneratingImage(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setImageBlob(null);
    setImageUrl(null);
    const timer = setTimeout(() => {
      generateImageFromDoc();
    }, 200);
    return () => clearTimeout(timer);
  }, [isOpen, documentElementId]);

  const displayedMessages = useMemo(() => {
    if (filterType === "custom") {
      return quickMessages.filter((m) => m.isCustom);
    }
    if (filterType === "default") {
      return quickMessages.filter((m) => !m.isCustom);
    }
    return quickMessages;
  }, [quickMessages, filterType]);

  const customMessagesCount = quickMessages.filter((m) => m.isCustom).length;

  // Sao Chép Hình Ảnh
  const handleCopyImageToClipboard = async () => {
    if (!imageBlob && !imageUrl) {
      setFeedback({
        type: "error",
        text: "Hình ảnh đang được tạo, vui lòng đợi trong giây lát...",
      });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    try {
      let blob = imageBlob;
      if (!blob && imageUrl) {
        const res = await fetch(imageUrl);
        blob = await res.blob();
      }

      if (blob && navigator.clipboard && (window as any).ClipboardItem) {
        const pngBlob = blob.type === "image/png" ? blob : new Blob([blob], { type: "image/png" });
        const item = new (window as any).ClipboardItem({ "image/png": pngBlob });
        await navigator.clipboard.write([item]);

        setFeedback({
          type: "image",
          text: "ĐÃ SAO CHÉP HÌNH ẢNH BẢNG KÊ! Bạn có thể nhấn Ctrl + V (hoặc chạm giữ > Dán) vào bất kỳ ứng dụng nào để gửi.",
        });
        setTimeout(() => setFeedback(null), 4500);
        return;
      }
    } catch (e: any) {
      console.warn("Lỗi ClipboardItem image write, chuyển sang tải ảnh:", e);
      handleDownloadImage();
      setFeedback({
        type: "image",
        text: "Trình duyệt chặn sao chép hình ảnh trực tiếp. Đã tự động tải file ảnh về máy!",
      });
      setTimeout(() => setFeedback(null), 4500);
      return;
    }

    handleDownloadImage();
  };

  // Sao Chép Lời Nhắn Nhanh (Giữ nguyên màu chữ, in đậm, in nghiêng, ký tự đặc biệt, icon)
  const handleCopyMessageText = async () => {
    const plain = convertToPlainText(messageText).trim();
    if (!plain) {
      setFeedback({
        type: "error",
        text: "Lời nhắn đang trống! Vui lòng chọn mẫu hoặc nhập nội dung.",
      });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    const resolvedHtml = replaceMessageVariables(messageText, templateVars);
    const htmlOutput = convertToRichHtml(resolvedHtml);
    const plainOutput = convertToPlainText(resolvedHtml);

    const success = await copyRichFormattedText(htmlOutput, plainOutput);

    if (success) {
      setFeedback({
        type: "text",
        text: "ĐÃ COPY LỜI NHẮN (Giữ nguyên màu chữ, in đậm, in nghiêng, ký tự & icon)! Bạn có thể dán (Ctrl+V) vào Zalo, Word, tin nhắn...",
      });
    } else {
      setFeedback({
        type: "text",
        text: "Đã sao chép nội dung lời nhắn!",
      });
    }
    setTimeout(() => setFeedback(null), 3500);
  };

  // Tải file ảnh
  const handleDownloadImage = () => {
    if (!imageUrl) return;
    const cleanDate = (dateStr || new Date().toISOString().slice(0, 10)).replace(/\//g, "-");
    const filename = `Bang_Ke_Giao_Hang_${cleanDate}.png`;
    const link = document.createElement("a");
    link.href = imageUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setFeedback({
      type: "image",
      text: `Đã tải file ảnh bảng kê về máy: ${filename}`,
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Copy lần lượt cả 2 nội dung
  const handleCopyBothMessageAndImage = async () => {
    if (sequentialCopyStep !== "message_copied") {
      const plain = convertToPlainText(messageText).trim();
      if (!plain) {
        setFeedback({
          type: "error",
          text: "Lời nhắn đang trống! Vui lòng chọn mẫu hoặc nhập nội dung lời nhắn.",
        });
        setTimeout(() => setFeedback(null), 3000);
        return;
      }

      const resolvedHtml = replaceMessageVariables(messageText, templateVars);
      const htmlOutput = convertToRichHtml(resolvedHtml);
      const plainOutput = convertToPlainText(resolvedHtml);
      await copyRichFormattedText(htmlOutput, plainOutput);

      setSequentialCopyStep("message_copied");
      setFeedback({
        type: "text",
        text: "BƯỚC 1/2: ĐÃ COPY LỜI NHẮN (giữ màu chữ, in đậm, in nghiêng, icon)! Bạn dán (Ctrl+V) vào Zalo trước, sau đó bấm Copy tiếp Hình ảnh.",
      });
      setTimeout(() => setFeedback(null), 6000);
      return;
    }

    let blob = imageBlob;
    if (!blob && imageUrl) {
      try {
        const res = await fetch(imageUrl);
        blob = await res.blob();
      } catch (e) {
        console.error("Lỗi lấy blob ảnh:", e);
      }
    }

    try {
      if (blob && navigator.clipboard && (window as any).ClipboardItem) {
        const pngBlob = blob.type === "image/png" ? blob : new Blob([blob], { type: "image/png" });
        const imgItem = new (window as any).ClipboardItem({ "image/png": pngBlob });
        await navigator.clipboard.write([imgItem]);

        setSequentialCopyStep("image_copied");
        setFeedback({
          type: "image",
          text: "BƯỚC 2/2: ĐÃ COPY HÌNH ẢNH! Hãy nhấn (Ctrl + V) vào Zalo để gửi bảng kê. Đã hoàn tất 2 bước!",
        });
        setTimeout(() => {
          setFeedback(null);
          setSequentialCopyStep("idle");
        }, 5000);
        return;
      }
    } catch (e: any) {
      console.warn("ClipboardItem write failed, downloading image fallback:", e);
    }

    handleDownloadImage();
    setSequentialCopyStep("image_copied");
    setFeedback({
      type: "image",
      text: "BƯỚC 2/2: Đã tải file ảnh về máy! Bạn kéo thả ảnh vào Zalo để gửi. Hoàn tất cả 2 nội dung!",
    });
    setTimeout(() => {
      setFeedback(null);
      setSequentialCopyStep("idle");
    }, 5000);
  };

  // Quản lý Mẫu: Thêm mới do người dùng tự tạo
  const handleSaveNewTemplate = () => {
    const plain = convertToPlainText(newContent).trim();
    if (!newTitle.trim() || !plain) {
      setFeedback({
        type: "error",
        text: "Vui lòng nhập đầy đủ tiêu đề và nội dung lời nhắn!",
      });
      setTimeout(() => setFeedback(null), 3000);
      return;
    }

    const newMsg: QuickMessage = {
      id: "msg_user_" + Date.now(),
      title: newTitle.trim(),
      content: newContent.trim(),
      isCustom: true,
      createdAt: Date.now(),
    };

    const updated = [newMsg, ...quickMessages];
    setQuickMessages(updated);
    saveQuickMessages(updated);

    setSelectedMessageId(newMsg.id);
    setMessageText(replaceMessageVariables(newMsg.content, templateVars));

    setNewTitle("");
    setNewContent("");
    setIsAddingNewTemplate(false);

    setFeedback({
      type: "save",
      text: `Đã lưu lời nhắn tự tạo "${newMsg.title}" thành công!`,
    });
    setTimeout(() => setFeedback(null), 3500);
  };

  // Quản lý Mẫu: Cập nhật mẫu đã chỉnh sửa
  const handleSaveEditTemplate = () => {
    const plain = convertToPlainText(editingContent).trim();
    if (!editingTemplateId || !editingTitle.trim() || !plain) return;

    const updated = quickMessages.map((m) =>
      m.id === editingTemplateId
        ? { ...m, title: editingTitle.trim(), content: editingContent.trim(), isCustom: true }
        : m
    );

    setQuickMessages(updated);
    saveQuickMessages(updated);

    if (selectedMessageId === editingTemplateId) {
      setMessageText(replaceMessageVariables(editingContent.trim(), templateVars));
    }

    setEditingTemplateId(null);
    setFeedback({
      type: "save",
      text: "Đã cập nhật lời nhắn thành công!",
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Xóa mẫu
  const handleDeleteTemplate = (id: string, title: string) => {
    setTemplateToDelete({ id, title });
  };

  const confirmDeleteTemplate = () => {
    if (!templateToDelete) return;
    const { id, title } = templateToDelete;

    const updated = quickMessages.filter((m) => m.id !== id);
    setQuickMessages(updated);
    saveQuickMessages(updated);

    if (selectedMessageId === id) {
      const nextActive = updated[0];
      setSelectedMessageId(nextActive ? nextActive.id : "custom");
      if (nextActive) {
        setMessageText(replaceMessageVariables(nextActive.content, templateVars));
      } else {
        setMessageText("");
      }
    }

    setTemplateToDelete(null);
    setFeedback({
      type: "save",
      text: `Đã xóa thành công mẫu lời nhắn "${title}".`,
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  // Khôi phục danh sách mẫu mặc định
  const handleResetTemplates = () => {
    setIsResetConfirmOpen(true);
  };

  const confirmResetTemplates = () => {
    const def = resetQuickMessages();
    setQuickMessages(def);
    setSelectedMessageId(def[0]?.id || "custom");
    if (def[0]) {
      setMessageText(replaceMessageVariables(def[0].content, templateVars));
    }
    setIsResetConfirmOpen(false);
    setFeedback({
      type: "save",
      text: "Đã khôi phục danh sách mẫu lời nhắn về mặc định!",
    });
    setTimeout(() => setFeedback(null), 3000);
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 z-60 bg-black/75 backdrop-blur-xs flex flex-col no-print animate-fade-in ${
        isFullscreen ? "p-0" : "p-2.5 sm:p-4 items-center justify-center overflow-y-auto"
      }`}
    >
      <div
        className={`bg-white shadow-2xl flex flex-col transition-all duration-200 ${
          isFullscreen
            ? "w-full h-full rounded-none overflow-hidden"
            : "w-full max-w-5xl rounded-2xl border border-gray-300 overflow-hidden my-auto max-h-[94vh]"
        }`}
      >
        {/* Header */}
        <div className="px-5 py-3.5 bg-linear-to-r from-blue-700 via-indigo-600 to-sky-700 text-white flex items-center justify-between shrink-0 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-xs text-white flex items-center justify-center shadow-sm shrink-0">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                Chia Sẻ Bảng Kê (Hình Ảnh &amp; Lời Nhắn Nhanh)
                <span className="text-[11px] font-semibold bg-white/20 text-white px-2 py-0.5 rounded-full">
                  Ảnh PNG 2x
                </span>
                {isFullscreen && (
                  <span className="text-[10px] font-bold bg-emerald-500/30 text-emerald-100 border border-emerald-300/40 px-2 py-0.5 rounded-full hidden sm:inline">
                    Toàn màn hình
                  </span>
                )}
              </h3>
              <p className="text-xs text-blue-100">
                Xuất ảnh độ nét cao 2x • Trả lời nhanh chuẩn Tiếng Việt • Dán Zalo, tin nhắn không bị lỗi chữ hay ký tự lạ
              </p>
            </div>
          </div>
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={toggleFullscreen}
              className="px-2.5 py-1.5 text-white/90 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5 text-xs font-semibold"
              title={isFullscreen ? "Thu nhỏ cửa sổ" : "Mở rộng toàn màn hình (Full screen)"}
            >
              {isFullscreen ? (
                <>
                  <Minimize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Thu nhỏ</span>
                </>
              ) : (
                <>
                  <Maximize2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Toàn màn hình</span>
                </>
              )}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="p-2 text-white/80 hover:text-white hover:bg-white/15 rounded-xl transition-colors cursor-pointer"
              title="Đóng (ESC)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Dynamic Feedback Banner */}
        {feedback && (
          <div
            className={`px-4 py-2.5 text-xs font-bold flex items-center justify-between shrink-0 animate-fade-in border-b ${
              feedback.type === "error"
                ? "bg-rose-50 border-rose-200 text-rose-800"
                : feedback.type === "save"
                ? "bg-amber-50 border-amber-200 text-amber-900"
                : "bg-emerald-50 border-emerald-200 text-emerald-900"
            }`}
          >
            <div className="flex items-center gap-2">
              <CheckCircle2
                className={`w-4 h-4 shrink-0 ${
                  feedback.type === "error"
                    ? "text-rose-600"
                    : feedback.type === "save"
                    ? "text-amber-600"
                    : "text-emerald-600"
                }`}
              />
              <span>{feedback.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setFeedback(null)}
              className="text-gray-500 hover:text-gray-800 text-xs cursor-pointer ml-2"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Modal Body */}
        <div
          className={`flex-1 overflow-y-auto p-4 sm:p-5 text-xs bg-slate-50/60 ${
            isFullscreen
              ? "grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-5 items-start"
              : "space-y-4"
          }`}
        >

          {/* PHẦN 1: FILE HÌNH ẢNH BẢNG KÊ ĐỂ CHIA SẺ & SAO CHÉP */}
          <div
            className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 ${
              isFullscreen ? "lg:col-span-5 flex flex-col h-full lg:sticky lg:top-0" : ""
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-gray-100">
              <div className="flex items-center gap-2">
                <ImageIcon className="w-4 h-4 text-emerald-600" />
                <span className="font-bold text-slate-900 uppercase tracking-wide text-xs">
                  File hình ảnh bảng kê xuất ra để chia sẻ
                </span>
              </div>
              <div className="flex items-center gap-2">
                {imageUrl && (
                  <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-0.5 rounded-full">
                    ✓ File ảnh PNG chuẩn nét 2x
                  </span>
                )}
                <button
                  type="button"
                  onClick={generateImageFromDoc}
                  disabled={isGeneratingImage}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer disabled:opacity-50"
                  title="Kết xuất lại hình ảnh từ bảng xem trước"
                >
                  <RefreshCw className={`w-3 h-3 ${isGeneratingImage ? "animate-spin" : ""}`} />
                  <span>{isGeneratingImage ? "Đang xử lý..." : "Làm mới ảnh"}</span>
                </button>
              </div>
            </div>

            {/* Khung hiển thị trước hình ảnh */}
            <div
              className={`border border-dashed border-gray-300 rounded-xl overflow-hidden bg-slate-50/80 p-2 flex flex-col items-center justify-center ${
                isFullscreen ? "min-h-[220px] max-h-[460px] flex-1" : "min-h-[140px] max-h-[220px]"
              }`}
            >
              {isGeneratingImage ? (
                <div className="flex flex-col items-center justify-center gap-2 text-gray-500 py-6">
                  <Loader2 className="w-7 h-7 animate-spin text-blue-600" />
                  <span className="text-xs font-semibold">
                    Đang kết xuất bảng kê ra hình ảnh độ nét cao...
                  </span>
                </div>
              ) : imageError ? (
                <div className="p-3 text-center text-rose-600 text-xs space-y-1">
                  <p className="font-bold">Chưa tạo được hình ảnh:</p>
                  <p>{imageError}</p>
                  <button
                    type="button"
                    onClick={generateImageFromDoc}
                    className="mt-2 px-3 py-1 bg-rose-100 hover:bg-rose-200 text-rose-800 font-bold rounded-lg cursor-pointer"
                  >
                    Thử lại
                  </button>
                </div>
              ) : imageUrl ? (
                <div className={`w-full h-full flex flex-col items-center overflow-auto ${isFullscreen ? "max-h-[440px]" : "max-h-[200px]"}`}>
                  <img
                    src={imageUrl}
                    alt="Hình ảnh bảng kê giao hàng"
                    className="max-w-full h-auto object-contain rounded shadow-2xs border border-gray-200"
                  />
                </div>
              ) : null}
            </div>
          </div>

          {/* PHẦN 2: LỜI NHẮN NHANH KHI CHIA SẺ & LỜI NHẮN DO TÔI TỰ TẠO */}
          <div
            className={`bg-white border border-slate-200 rounded-2xl p-4 shadow-2xs space-y-3 ${
              isFullscreen ? "lg:col-span-7 flex flex-col" : ""
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 pb-1 border-b border-gray-100">
              <div className="flex flex-wrap items-center gap-2">
                <MessageSquare className="w-4 h-4 text-blue-600" />
                <span className="font-bold text-slate-900 uppercase tracking-wide text-xs">
                  Lời nhắn nhanh gửi kèm (Màu trực tiếp trên chữ)
                </span>
                <span className="inline-flex items-center gap-1 bg-emerald-50 border border-emerald-300 text-emerald-900 text-[10.5px] font-bold px-2.5 py-0.5 rounded-full font-mono shadow-2xs" title="Ngày hôm nay">
                  <Clock className="w-3 h-3 text-emerald-600 animate-pulse" />
                  Hôm nay: {realTodayDateStr}
                </span>
                <span className="inline-flex items-center gap-1 bg-amber-50 border border-amber-300 text-amber-900 text-[10.5px] font-bold px-2 py-0.5 rounded-full font-mono shadow-2xs" title="Ngày hôm qua">
                  Hôm qua: {realYesterdayDateStr}
                </span>
                {customMessagesCount > 0 && (
                  <span className="bg-amber-100 text-amber-800 text-[10.5px] font-bold px-2 py-0.5 rounded-full">
                    {customMessagesCount} mẫu tự tạo
                  </span>
                )}
              </div>

              {/* Toggle Quản lý mẫu & Tạo mới */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddingNewTemplate(true)}
                  className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 px-2.5 py-1 rounded-lg transition-colors cursor-pointer shadow-2xs"
                  title="Tạo thêm một mẫu lời nhắn mới do chính bạn soạn thảo"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Tạo lời nhắn mới</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsManagingTemplates(!isManagingTemplates)}
                  className={`inline-flex items-center gap-1 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-colors cursor-pointer ${
                    isManagingTemplates
                      ? "bg-blue-600 text-white border-blue-600"
                      : "bg-gray-50 text-gray-700 border-gray-300 hover:bg-gray-100"
                  }`}
                  title="Quản lý, chỉnh sửa hoặc xóa các mẫu lời nhắn"
                >
                  <Edit2 className="w-3 h-3" />
                  <span>{isManagingTemplates ? "Đóng quản lý" : "Quản lý mẫu"}</span>
                </button>
              </div>
            </div>

            {/* FORM 1: Soạn lời nhắn nhanh mới (Do tôi tự tạo) */}
            {isAddingNewTemplate && (
              <div className="p-3.5 bg-linear-to-r from-emerald-50/90 to-teal-50/90 border border-emerald-300 rounded-xl space-y-3 animate-fade-in shadow-2xs">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-emerald-600" />
                    Soạn lời nhắn nhanh mới (Do tôi tự tạo)
                  </span>
                  <button
                    type="button"
                    onClick={() => setIsAddingNewTemplate(false)}
                    className="text-gray-400 hover:text-gray-700 cursor-pointer"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <input
                  type="text"
                  placeholder="Tiêu đề mẫu (VD: Gửi Quản Lý Kho, Báo Cáo Tài Xế, Gửi Khách Hàng...)"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-1.5 bg-white border border-emerald-300 rounded-lg text-xs font-bold text-gray-900 focus:outline-hidden focus:ring-1 focus:ring-emerald-500"
                />

                {/* Trình soạn thảo trực tiếp cho Form tạo mới: Chuẩn tiếng Việt, icon, mã chèn sạch sẽ */}
                <QuickMessageEditor
                  key="new-template-editor"
                  value={newContent}
                  onChange={setNewContent}
                  placeholder="Soạn nội dung mẫu lời nhắn... (Bấm chèn icon hoặc chèn mã để tự động điền thông tin...)"
                  minHeight={isFullscreen ? "120px" : "100px"}
                  tagButtons={TAG_BUTTONS_LIST}
                  onTagInserted={(code) => {
                    setFeedback({
                      type: "save",
                      text: `Đã chèn mã ${code} vào ô Soạn lời nhắn mới!`,
                    });
                    setTimeout(() => setFeedback(null), 2500);
                  }}
                />

                <div className="flex items-center justify-end gap-2 pt-2 border-t border-emerald-200/80">
                  <button
                    type="button"
                    onClick={() => setIsAddingNewTemplate(false)}
                    className="px-3 py-1 text-xs text-gray-600 hover:text-gray-800 cursor-pointer"
                  >
                    Hủy
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveNewTemplate}
                    className="px-4 py-1.5 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white text-xs font-bold rounded-lg cursor-pointer flex items-center gap-1 shadow-xs"
                  >
                    <Save className="w-3.5 h-3.5" />
                    <span>Lưu lời nhắn này</span>
                  </button>
                </div>
              </div>
            )}

            {/* FORM 2: Quản lý & Chỉnh sửa mẫu */}
            {isManagingTemplates && (
              <div className="p-3 bg-slate-50 border border-blue-200 rounded-xl space-y-3 animate-fade-in shadow-2xs">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-1.5 border-b border-gray-200">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-blue-950">
                      Danh Sách Lời Nhắn ({quickMessages.length})
                    </span>
                    <div className="inline-flex rounded-lg border border-gray-200 bg-white p-0.5 text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setFilterType("all")}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          filterType === "all" ? "bg-blue-600 text-white font-bold" : "text-gray-600"
                        }`}
                      >
                        Tất cả ({quickMessages.length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterType("custom")}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          filterType === "custom" ? "bg-amber-600 text-white font-bold" : "text-gray-600"
                        }`}
                      >
                        Do tôi tạo ({customMessagesCount})
                      </button>
                      <button
                        type="button"
                        onClick={() => setFilterType("default")}
                        className={`px-2 py-0.5 rounded cursor-pointer ${
                          filterType === "default" ? "bg-blue-600 text-white font-bold" : "text-gray-600"
                        }`}
                      >
                        Mặc định
                      </button>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={handleResetTemplates}
                    className="text-[11px] text-gray-500 hover:text-red-600 cursor-pointer flex items-center gap-1"
                    title="Khôi phục danh sách mẫu về mặc định ban đầu"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Mẫu gốc</span>
                  </button>
                </div>

                {/* Danh sách các mẫu */}
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {displayedMessages.map((m) => {
                    const isEditing = editingTemplateId === m.id;
                    return (
                      <div
                        key={m.id}
                        className={`p-2.5 rounded-xl border transition-all ${
                          m.isCustom
                            ? "bg-amber-50/50 border-amber-200 hover:border-amber-300"
                            : "bg-white border-gray-200 hover:border-gray-300"
                        }`}
                      >
                        {isEditing ? (
                          <div className="space-y-2.5">
                            <input
                              type="text"
                              value={editingTitle}
                              onChange={(e) => setEditingTitle(e.target.value)}
                              className="w-full px-2.5 py-1 bg-white border border-blue-400 rounded-lg text-xs font-bold text-gray-900"
                              placeholder="Tiêu đề mẫu lời nhắn..."
                            />

                            {/* Trình soạn thảo chỉnh sửa mẫu: Nạp đầy đủ 100% nội dung đã tạo trước đó */}
                            <QuickMessageEditor
                              key={`edit-editor-${m.id}`}
                              value={editingContent !== undefined && editingContent !== "" ? editingContent : (m.content || "")}
                              onChange={setEditingContent}
                              placeholder="Nội dung lời nhắn..."
                              minHeight="95px"
                              tagButtons={TAG_BUTTONS_LIST}
                              onTagInserted={(code) => {
                                setFeedback({
                                  type: "save",
                                  text: `Đã chèn mã ${code} vào ô Sửa lời nhắn!`,
                                });
                                setTimeout(() => setFeedback(null), 2500);
                              }}
                            />

                            <div className="flex items-center justify-end gap-2 pt-1.5 border-t border-blue-100">
                              <button
                                type="button"
                                onClick={() => setEditingTemplateId(null)}
                                className="px-2.5 py-0.5 text-xs text-gray-600 hover:text-gray-800 cursor-pointer"
                              >
                                Hủy
                              </button>
                              <button
                                type="button"
                                onClick={handleSaveEditTemplate}
                                className="px-3.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg font-bold text-xs cursor-pointer shadow-xs"
                              >
                                Lưu thay đổi
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <p className="font-bold text-gray-900">{m.title}</p>
                                {m.isCustom && (
                                  <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded-full border border-amber-300">
                                    Do tôi tạo
                                  </span>
                                )}
                              </div>
                              <div
                                className="text-gray-700 text-[11.5px] line-clamp-3 mt-1 font-sans leading-relaxed whitespace-pre-wrap"
                                dangerouslySetInnerHTML={{ __html: sanitizeRichHtml(m.content) }}
                              />
                            </div>
                            <div className="flex items-center gap-1 shrink-0">
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedMessageId(m.id);
                                  setMessageText(replaceMessageVariables(m.content, templateVars));
                                }}
                                className="px-2 py-1 bg-blue-50 hover:bg-blue-100 text-blue-700 text-[10.5px] font-bold rounded-lg cursor-pointer"
                              >
                                Dùng mẫu
                              </button>
                              <button
                                type="button"
                                onClick={() => handleStartEditTemplate(m)}
                                className="p-1.5 text-gray-500 hover:text-blue-600 hover:bg-blue-50 rounded-lg cursor-pointer"
                                title="Sửa mẫu này"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleDeleteTemplate(m.id, m.title)}
                                className="p-1.5 text-gray-500 hover:text-red-600 hover:bg-red-50 rounded-lg cursor-pointer"
                                title="Xóa mẫu này"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            {/* Thanh chọn nhanh mẫu - ẨN KHI MỞ 'Quản lý mẫu' theo đúng yêu cầu */}
            {!isManagingTemplates && (
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-[11px] font-bold text-gray-700">Chọn nhanh mẫu lời nhắn:</span>
                  <span className="text-[10.5px] text-gray-400">Bấm để tự động điền</span>
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {quickMessages.map((msg) => (
                    <button
                      key={msg.id}
                      type="button"
                      onClick={() => {
                        setSelectedMessageId(msg.id);
                        setMessageText(replaceMessageVariables(msg.content, templateVars));
                      }}
                      className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all cursor-pointer border flex items-center gap-1.5 ${
                        selectedMessageId === msg.id
                          ? "bg-blue-600 text-white border-blue-600 shadow-2xs font-bold ring-2 ring-blue-400/30"
                          : msg.isCustom
                          ? "bg-amber-50 hover:bg-amber-100 text-amber-900 border-amber-300"
                          : "bg-white text-slate-700 border-slate-200 hover:bg-slate-100"
                      }`}
                    >
                      {msg.isCustom && <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>}
                      <span>{msg.title}</span>
                    </button>
                  ))}
                </div>

                {/* KHUNG HIỂN THỊ VÀ CHỈNH SỬA NỘI DUNG LỜI NHẮN TRẢ LỜI NHANH */}
                <div className="mt-3.5 pt-3 border-t border-slate-200 space-y-2.5">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-1.5">
                      <MessageSquare className="w-4 h-4 text-blue-600" />
                      <span className="text-xs font-bold text-slate-900">
                        Nội dung trả lời nhanh (Giữ nguyên màu, chữ, dòng &amp; ký tự):
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const found = quickMessages.find((m) => m.id === selectedMessageId);
                        if (found) {
                          setMessageText(replaceMessageVariables(found.content, templateVars));
                          setFeedback({
                            type: "save",
                            text: "Đã làm mới lại nội dung lời nhắn theo dữ liệu bảng kê!",
                          });
                          setTimeout(() => setFeedback(null), 2500);
                        }
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 px-2.5 py-1 rounded-lg border border-blue-200 transition-colors cursor-pointer"
                      title="Nạp lại nội dung từ mẫu gốc với ngày giờ và số liệu mới nhất"
                    >
                      <RefreshCw className="w-3 h-3" />
                      <span>Nạp lại theo số liệu</span>
                    </button>
                  </div>

                  {/* Trình soạn thảo trực quan: Copy/Dán giữ nguyên 100% màu sắc, định dạng, ký tự, dòng */}
                  <QuickMessageEditor
                    value={messageText}
                    onChange={setMessageText}
                    placeholder="Soạn hoặc dán lời nhắn trả lời nhanh tại đây (Giữ nguyên màu chữ, in đậm, in nghiêng, ngắt dòng, ký tự & icon)..."
                    minHeight={isFullscreen ? "130px" : "95px"}
                    maxHeight={isFullscreen ? "360px" : "220px"}
                    tagButtons={TAG_BUTTONS_LIST}
                    onTagInserted={(code) => {
                      setFeedback({
                        type: "save",
                        text: `Đã chèn mã ${code} vào nội dung lời nhắn!`,
                      });
                      setTimeout(() => setFeedback(null), 2500);
                    }}
                    extraRightAction={
                      <button
                        type="button"
                        onClick={handleCopyMessageText}
                        className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all cursor-pointer shadow-2xs"
                        title="Sao chép lời nhắn nhanh trực tiếp vào clipboard"
                      >
                        <Copy className="w-3.5 h-3.5" />
                        <span>Copy lời nhắn</span>
                      </button>
                    }
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Tiến trình Copy lần lượt */}
        {sequentialCopyStep === "message_copied" && (
          <div className="mx-4 sm:mx-5 mb-2.5 p-3 bg-linear-to-r from-blue-50 via-amber-50 to-emerald-50 border-2 border-amber-400 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs shadow-sm animate-in fade-in">
            <div className="flex items-center gap-2.5">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-600 text-white text-xs font-black shrink-0 shadow-xs">
                ✓ 1
              </span>
              <div>
                <p className="font-bold text-amber-950 flex items-center gap-1.5">
                  <span>ĐÃ COPY LỜI NHẮN (BƯỚC 1/2)!</span>
                  <span className="text-[10px] font-semibold bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded-md border border-emerald-300">
                    Giữ màu chữ, đậm, icon
                  </span>
                </p>
                <p className="text-[11px] text-amber-900 mt-0.5">
                  Bạn dán (<kbd className="font-mono bg-white px-1 py-0.5 rounded border border-amber-300">Ctrl + V</kbd>) lời nhắn vào Zalo trước. Sau đó bấm nút bên dưới để copy tiếp hình ảnh.
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={handleCopyBothMessageAndImage}
              className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 transition-all text-xs ring-2 ring-emerald-400/50"
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Bước 2: Copy Hình ảnh ngay</span>
            </button>
          </div>
        )}

        {sequentialCopyStep === "image_copied" && (
          <div className="mx-4 sm:mx-5 mb-2.5 p-2.5 bg-emerald-50 border-2 border-emerald-300 rounded-xl flex items-center justify-between gap-2 text-xs text-emerald-950 shadow-xs animate-in fade-in">
            <div className="flex items-center gap-2">
              <span className="flex items-center justify-center w-6 h-6 rounded-full bg-emerald-700 text-white text-xs font-black shrink-0">
                ✓ 2
              </span>
              <span>
                <strong>ĐÃ COPY HÌNH ẢNH BẢNG KÊ (BƯỚC 2/2)!</strong> Hãy qua Zalo nhấn <kbd className="font-mono bg-white px-1 py-0.5 rounded border border-emerald-300 text-emerald-900">Ctrl + V</kbd> để gửi ảnh. Đã hoàn tất cả 2 nội dung!
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSequentialCopyStep("idle")}
              className="px-2.5 py-1 bg-white hover:bg-emerald-100 text-emerald-800 rounded-lg text-xs font-semibold cursor-pointer border border-emerald-200"
            >
              Làm lại
            </button>
          </div>
        )}

        {/* Modal Footer */}
        <div className="px-4 sm:px-5 py-3.5 bg-white border-t border-slate-200 flex flex-wrap items-center justify-between gap-2.5 shrink-0 shadow-xs">
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled={!imageUrl || isGeneratingImage}
              onClick={handleDownloadImage}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300 rounded-xl text-xs font-semibold transition-colors cursor-pointer shadow-2xs disabled:opacity-50"
              title="Tải file hình ảnh (.PNG) của bảng kê về máy"
            >
              <Download className="w-3.5 h-3.5 text-slate-600" />
              <span>Tải file ảnh (.PNG)</span>
            </button>
          </div>

          <div className="flex flex-wrap items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleCopyMessageText}
              className="inline-flex items-center gap-1.5 px-3 py-2 bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 rounded-xl text-xs font-bold transition-colors cursor-pointer shadow-2xs"
              title="Sao chép nội dung lời nhắn giữ nguyên màu chữ, in đậm, in nghiêng, icon và ký tự đặc biệt"
            >
              <Copy className="w-3.5 h-3.5 text-blue-600" />
              <span>Copy lời nhắn (Định dạng)</span>
            </button>

            <button
              type="button"
              disabled={!imageBlob && !imageUrl}
              onClick={handleCopyImageToClipboard}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50 ring-2 ring-emerald-500/20"
              title="Sao chép trực tiếp file ảnh vào Clipboard để bạn bấm Ctrl+V vào bất kỳ ứng dụng nào"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy hình ảnh (Dán nhanh)</span>
            </button>

            <button
              type="button"
              disabled={!imageBlob && !imageUrl}
              onClick={handleCopyBothMessageAndImage}
              className={`inline-flex items-center gap-2 px-4 py-2 text-white rounded-xl text-xs font-bold transition-all cursor-pointer shadow-md disabled:opacity-50 ${
                sequentialCopyStep === "message_copied"
                  ? "bg-linear-to-r from-amber-600 via-orange-600 to-emerald-600 hover:from-amber-700 hover:to-emerald-700 ring-4 ring-amber-400/60 shadow-lg scale-102"
                  : sequentialCopyStep === "image_copied"
                  ? "bg-emerald-700 hover:bg-emerald-800 ring-2 ring-emerald-400"
                  : "bg-linear-to-r from-blue-600 via-indigo-600 to-sky-600 hover:from-blue-700 hover:to-indigo-700 ring-2 ring-indigo-400/30"
              }`}
            >
              {sequentialCopyStep === "message_copied" ? (
                <>
                  <ImageIcon className="w-4 h-4 text-amber-100 animate-bounce" />
                  <span>Bước 2/2: Bấm để Copy Hình ảnh</span>
                </>
              ) : sequentialCopyStep === "image_copied" ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>✓ Đã xong (Bấm để copy lại)</span>
                </>
              ) : (
                <>
                  <CopyCheck className="w-4 h-4" />
                  <span>Copy lời nhắn &amp; hình ảnh (Lần lượt)</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Hộp thoại xác nhận xóa mẫu */}
      {templateToDelete && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-rose-200 space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900">
                  Xác nhận xóa mẫu lời nhắn?
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Bạn có chắc chắn muốn xóa mẫu: <strong className="text-rose-700 font-bold">&quot;{templateToDelete.title}&quot;</strong>?
                </p>
                <p className="text-[11px] text-slate-400 mt-1">
                  Mẫu này sẽ được xóa vĩnh viễn khỏi danh sách lời nhắn của bạn.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setTemplateToDelete(null)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmDeleteTemplate}
                className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 active:bg-rose-800 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Hộp thoại xác nhận khôi phục mẫu mặc định */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-70 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-fade-in no-print">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 shadow-2xl border border-amber-200 space-y-4 animate-scale-in">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                <RotateCcw className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h4 className="text-sm font-bold text-slate-900">
                  Khôi phục danh sách mẫu gốc?
                </h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">
                  Hành động này sẽ đặt lại danh sách lời nhắn về các mẫu mặc định ban đầu của ứng dụng.
                </p>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="px-3.5 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-800 bg-slate-100 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={confirmResetTemplates}
                className="px-4 py-1.5 text-xs font-bold text-white bg-amber-600 hover:bg-amber-700 active:bg-amber-800 rounded-xl transition-colors cursor-pointer shadow-xs flex items-center gap-1.5"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Khôi phục mẫu gốc</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
