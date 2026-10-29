import React, { useState, useEffect, useRef } from "react";
import QRCode from "qrcode";
import {
  Share2,
  Copy,
  Check,
  QrCode,
  ExternalLink,
  Download,
  Upload,
  Smartphone,
  Globe,
  FileJson,
  X,
  Sparkles,
  Info,
  CheckCircle2,
  Send,
  MessageCircle,
} from "lucide-react";
import { DeliveryOrder } from "../types";
import { exportComprehensiveFullBackup, importFullDataBackup } from "../utils/backupStorage";

export const PUBLIC_SHARED_APP_URL =
  "https://ais-pre-owgdpnreody7nokosx6zes-685155367668.asia-southeast1.run.app";

interface ShareAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  orders: DeliveryOrder[];
  warehouseNumbers: number[];
  remindersCount?: number;
  onDataImported?: () => void;
  showToastNotification: (msg: string) => void;
}

export const ShareAppModal: React.FC<ShareAppModalProps> = ({
  isOpen,
  onClose,
  orders,
  warehouseNumbers,
  onDataImported,
  showToastNotification,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [copiedMessage, setCopiedMessage] = useState(false);
  const [copiedData, setCopiedData] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"link" | "data" | "import">("link");
  const [importText, setImportText] = useState("");
  const [importStatus, setImportStatus] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Compute the best shareable public URL
  const getShareUrl = (): string => {
    if (typeof window !== "undefined") {
      const href = window.location.href.split("#")[0].split("?")[0];
      // If dev URL, convert to public shared pre-release URL
      if (href.includes("ais-dev-")) {
        return href.replace("ais-dev-", "ais-pre-");
      }
      // If running inside local or preview dev, provide fallback to the public shared app URL
      if (href.includes("localhost") || href.includes("127.0.0.1") || !href.includes(".run.app")) {
        return PUBLIC_SHARED_APP_URL;
      }
      return href;
    }
    return PUBLIC_SHARED_APP_URL;
  };

  const shareUrl = getShareUrl();

  // Generate QR Code whenever modal opens or URL changes
  useEffect(() => {
    if (!isOpen) return;
    QRCode.toDataURL(shareUrl, {
      width: 280,
      margin: 2,
      color: {
        dark: "#0f172a",
        light: "#ffffff",
      },
      errorCorrectionLevel: "M",
    })
      .then((url) => setQrDataUrl(url))
      .catch((err) => console.error("Error generating QR:", err));
  }, [isOpen, shareUrl]);

  if (!isOpen) return null;

  // Bulletproof copy function supporting iframes and mobile webviews
  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(text);
        return true;
      }
    } catch {
      // Fallback below
    }
    try {
      const textarea = document.createElement("textarea");
      textarea.value = text;
      textarea.contentEditable = "true";
      textarea.readOnly = false;
      textarea.style.position = "fixed";
      textarea.style.left = "-9999px";
      textarea.style.top = "-9999px";
      document.body.appendChild(textarea);
      textarea.focus();
      textarea.select();
      textarea.setSelectionRange(0, 99999);
      const successful = document.execCommand("copy");
      document.body.removeChild(textarea);
      return successful;
    } catch {
      return false;
    }
  };

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(shareUrl);
    if (ok) {
      setCopiedLink(true);
      showToastNotification("Đã sao chép liên kết chia sẻ ứng dụng!");
      setTimeout(() => setCopiedLink(false), 2500);
    } else {
      showToastNotification("Vui lòng bôi đen và sao chép đường link bên dưới.");
    }
  };

  const handleCopyShareMessage = async () => {
    const message = `👉 Mời bạn truy cập ứng dụng "Theo dõi giao nhận và Ghi chú":\n${shareUrl}`;
    const ok = await copyToClipboard(message);
    if (ok) {
      setCopiedMessage(true);
      showToastNotification("Đã chép nội dung tin nhắn chia sẻ kèm link!");
      setTimeout(() => setCopiedMessage(false), 2500);
    } else {
      handleCopyLink();
    }
  };

  const handleShareZalo = () => {
    try {
      const zaloUrl = `https://zalo.me/share?url=${encodeURIComponent(shareUrl)}`;
      window.open(zaloUrl, "_blank", "noopener,noreferrer");
      showToastNotification("Đang mở chia sẻ qua Zalo...");
    } catch {
      handleCopyLink();
    }
  };

  const handleNativeShare = async () => {
    if (typeof navigator !== "undefined" && navigator.share) {
      try {
        await navigator.share({
          title: "Theo dõi giao nhận và Ghi chú",
          text: "Hệ thống quản lý, đối soát số giao hàng kho và theo dõi đơn hàng",
          url: shareUrl,
        });
        showToastNotification("Đã mở menu chia sẻ thành công!");
      } catch (err: any) {
        if (err?.name !== "AbortError") {
          handleCopyLink();
        }
      }
    } else {
      handleShareZalo();
    }
  };

  const handleExportDataFile = () => {
    exportComprehensiveFullBackup();
    showToastNotification("Đã tải xuống file dữ liệu sao lưu (.json) để chia sẻ!");
  };

  const handleCopyDataJson = async () => {
    try {
      const result = exportComprehensiveFullBackup();
      const jsonString = JSON.stringify(result.packageData, null, 2);
      const ok = await copyToClipboard(jsonString);
      if (ok) {
        setCopiedData(true);
        showToastNotification("Đã sao chép toàn bộ gói dữ liệu JSON vào Clipboard!");
        setTimeout(() => setCopiedData(false), 2500);
      } else {
        showToastNotification("Không thể tự động sao chép. Vui lòng bấm nút tải file (.json).");
      }
    } catch {
      showToastNotification("Không thể tạo chuỗi dữ liệu sao chép.");
    }
  };

  const handleImportTextData = () => {
    if (!importText.trim()) {
      setImportStatus("Vui lòng dán chuỗi dữ liệu JSON hợp lệ vào ô bên dưới.");
      return;
    }
    const result = importFullDataBackup(importText.trim());
    if (result.success) {
      setImportStatus(result.summary || "Nhập dữ liệu thành công! Đang làm mới...");
      showToastNotification("Đã nạp thành công toàn bộ dữ liệu được chia sẻ!");
      setTimeout(() => {
        if (onDataImported) onDataImported();
        onClose();
      }, 1200);
    } else {
      setImportStatus("Dữ liệu không đúng định dạng. Vui lòng kiểm tra lại chuỗi JSON.");
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const content = event.target?.result as string;
      if (content) {
        setImportText(content);
        const result = importFullDataBackup(content);
        if (result.success) {
          setImportStatus(result.summary || "Nhập file thành công! Đang cập nhật ứng dụng...");
          showToastNotification("Đã tải thành công dữ liệu từ file chia sẻ!");
          setTimeout(() => {
            if (onDataImported) onDataImported();
            onClose();
          }, 1200);
        } else {
          setImportStatus("File tải lên không hợp lệ. Vui lòng chọn file sao lưu định dạng .json");
        }
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-200 max-w-xl w-full overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="px-5 py-4 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-white/20 rounded-xl">
              <Share2 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-extrabold text-base sm:text-lg">Chia sẻ Ứng dụng & Dữ liệu</h3>
              <p className="text-emerald-100 text-xs">
                Mở trên điện thoại, máy tính khác hoặc gửi danh sách cho đồng nghiệp
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-lg text-emerald-100 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
            title="Đóng"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-slate-200 bg-slate-50/80 px-4 pt-2 gap-2 text-xs font-bold text-slate-600">
          <button
            type="button"
            onClick={() => setActiveTab("link")}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "link"
                ? "border-emerald-600 text-emerald-700 font-extrabold"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <Globe className="w-3.5 h-3.5" />
            Liên kết & Mã QR
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("data")}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "data"
                ? "border-emerald-600 text-emerald-700 font-extrabold"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <FileJson className="w-3.5 h-3.5" />
            Chia sẻ Dữ liệu ({orders.length} đơn)
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("import")}
            className={`pb-2.5 px-3 border-b-2 flex items-center gap-1.5 transition-all cursor-pointer ${
              activeTab === "import"
                ? "border-emerald-600 text-emerald-700 font-extrabold"
                : "border-transparent hover:text-slate-900"
            }`}
          >
            <Upload className="w-3.5 h-3.5" />
            Nhập dữ liệu đồng bộ
          </button>
        </div>

        {/* Body Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-slate-800 text-sm">
          {activeTab === "link" && (
            <div className="space-y-4">
              {/* Share link input with copy button */}
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1.5">
                  Đường dẫn công khai mở ứng dụng (Dùng được cho mọi người & mọi thiết bị):
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={shareUrl}
                    onClick={(e) => (e.target as HTMLInputElement).select()}
                    className="flex-1 px-3 py-2 text-xs bg-slate-50 border border-slate-300 rounded-xl font-mono text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500 select-all"
                  />
                  <button
                    type="button"
                    onClick={handleCopyLink}
                    className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer ${
                      copiedLink
                        ? "bg-emerald-600 text-white"
                        : "bg-emerald-600 hover:bg-emerald-700 text-white active:scale-95"
                    }`}
                  >
                    {copiedLink ? (
                      <>
                        <Check className="w-3.5 h-3.5" /> Đã chép
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" /> Sao chép link
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick actions: Zalo + Native share + Open in tab */}
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleShareZalo}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95"
                  title="Mở Zalo để gửi link trực tiếp cho bạn bè hoặc nhóm"
                >
                  <MessageCircle className="w-3.5 h-3.5" />
                  Gửi qua Zalo
                </button>

                <button
                  type="button"
                  onClick={handleCopyShareMessage}
                  className={`inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold rounded-xl transition-all shadow-xs cursor-pointer active:scale-95 border ${
                    copiedMessage
                      ? "bg-teal-600 text-white border-teal-600"
                      : "bg-white hover:bg-slate-50 text-teal-800 border-teal-300"
                  }`}
                  title="Sao chép lời nhắn giới thiệu kèm link để dán vào tin nhắn"
                >
                  {copiedMessage ? (
                    <>
                      <Check className="w-3.5 h-3.5" /> Đã chép lời nhắn kèm link
                    </>
                  ) : (
                    <>
                      <Send className="w-3.5 h-3.5 text-teal-600" /> Chép lời nhắn kèm link
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={handleNativeShare}
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-2xs cursor-pointer"
                  title="Mở menu chia sẻ hệ điều hành"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  Menu hệ thống
                </button>

                <a
                  href={shareUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 text-xs font-semibold rounded-xl transition-all shadow-2xs"
                >
                  <ExternalLink className="w-3.5 h-3.5 text-slate-500" />
                  Mở tab mới
                </a>
              </div>

              {/* QR Code Section */}
              <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl flex flex-col sm:flex-row items-center gap-4">
                <div className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-200/80 shrink-0">
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Mã QR ứng dụng" className="w-36 h-36 object-contain" />
                  ) : (
                    <div className="w-36 h-36 flex items-center justify-center text-slate-400">
                      <QrCode className="w-10 h-10 animate-pulse" />
                    </div>
                  )}
                </div>
                <div className="space-y-2 text-center sm:text-left">
                  <div className="flex items-center justify-center sm:justify-start gap-1.5 text-emerald-800 font-bold text-xs uppercase tracking-wider">
                    <Smartphone className="w-4 h-4 text-emerald-600" />
                    Quét nhanh bằng camera điện thoại
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed">
                    Dùng ứng dụng Máy ảnh (Camera), Zalo hoặc trình quét QR trên điện thoại/máy tính bảng để mở trực tiếp ứng dụng mà không cần gõ địa chỉ web.
                  </p>
                  {qrDataUrl && (
                    <a
                      href={qrDataUrl}
                      download="qr-theo-doi-giao-nhan.png"
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 hover:underline pt-1"
                    >
                      <Download className="w-3 h-3" /> Tải ảnh mã QR về máy
                    </a>
                  )}
                </div>
              </div>

              {/* Note on shared environment */}
              <div className="flex items-start gap-2 p-3 bg-amber-50 border border-amber-200/80 rounded-xl text-xs text-amber-900 leading-relaxed">
                <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <strong>Lưu ý về dữ liệu:</strong> Đường liên kết trên mở phiên bản công khai của ứng dụng. Để người nhận có ngay toàn bộ danh sách đơn hàng và số kho bạn đang làm việc, bạn có thể chuyển qua tab <strong>"Chia sẻ Dữ liệu"</strong> để tải file sao lưu gửi kèm.
                </div>
              </div>
            </div>
          )}

          {activeTab === "data" && (
            <div className="space-y-4">
              <div className="p-3 bg-emerald-50/70 border border-emerald-200 rounded-xl text-xs text-emerald-900 leading-relaxed">
                <div className="font-bold flex items-center gap-1.5 mb-1">
                  <Sparkles className="w-4 h-4 text-emerald-600" />
                  Dữ liệu hiện tại của bạn:
                </div>
                <div>
                  • <strong>{orders.length}</strong> đơn hàng trong danh sách.
                  <br />
                  • <strong>{warehouseNumbers.length}</strong> số phiếu kho đã nhận diện/đối soát.
                  <br />
                  • Kèm theo toàn bộ lịch sử sao lưu, cấu hình mẫu in và ghi chú nhắc hẹn.
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Cách 1: Tải file dữ liệu để gửi qua Zalo / Telegram / Email (Khuyên dùng)
                </label>
                <button
                  type="button"
                  onClick={handleExportDataFile}
                  className="w-full py-2.5 px-4 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer active:scale-98 transition-all"
                >
                  <Download className="w-4 h-4" />
                  Tải file sao lưu toàn bộ (.json) gửi cho đồng nghiệp
                </button>
                <p className="text-[11px] text-slate-500">
                  Người nhận chỉ cần nhấn nút "Nhập dữ liệu đồng bộ" trên máy của họ và chọn file này là có ngay toàn bộ danh sách.
                </p>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Cách 2: Sao chép chuỗi mã dữ liệu (Gửi trực tiếp qua tin nhắn)
                </label>
                <button
                  type="button"
                  onClick={handleCopyDataJson}
                  className={`w-full py-2.5 px-4 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                    copiedData
                      ? "bg-slate-800 text-white"
                      : "bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-300"
                  }`}
                >
                  {copiedData ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" /> Đã sao chép mã dữ liệu vào Clipboard!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4 text-slate-600" /> Sao chép toàn bộ mã dữ liệu (Copy JSON)
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {activeTab === "import" && (
            <div className="space-y-4">
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Cách 1: Chọn file sao lưu được đồng nghiệp gửi (.json)
                </label>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  accept=".json,application/json"
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="w-full py-2.5 px-4 bg-white border-2 border-dashed border-emerald-300 hover:border-emerald-500 text-emerald-800 hover:bg-emerald-50/50 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <Upload className="w-4 h-4 text-emerald-600" />
                  Bấm để chọn file dữ liệu (.json) từ máy tính/điện thoại
                </button>
              </div>

              <div className="pt-2 border-t border-slate-200 space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Cách 2: Hoặc dán chuỗi mã dữ liệu nhận được vào đây
                </label>
                <textarea
                  rows={4}
                  value={importText}
                  onChange={(e) => setImportText(e.target.value)}
                  placeholder="Dán nội dung JSON sao lưu vào đây..."
                  className="w-full p-2.5 text-xs font-mono bg-slate-50 border border-slate-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                <button
                  type="button"
                  onClick={handleImportTextData}
                  disabled={!importText.trim()}
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  Xác nhận nạp dữ liệu vào ứng dụng
                </button>
              </div>

              {importStatus && (
                <div
                  className={`p-3 rounded-xl text-xs font-semibold ${
                    importStatus.includes("thành công")
                      ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                      : "bg-red-50 text-red-800 border border-red-200"
                  }`}
                >
                  {importStatus}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
};
