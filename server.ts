import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT =
  process.env.NODE_ENV === "production"
    ? process.env.PORT
      ? parseInt(process.env.PORT, 10)
      : 3000
    : 3000;

// Set up JSON body parser with increased limit to handle base64 image uploads
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Initialize Google Gen AI client with appropriate safety defaults
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey: apiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// Candidate models in order of priority: modern recommended flash model first, then fallback aliases
const CANDIDATE_MODELS = [
  "gemini-3.8-flash",
  "gemini-flash-latest",
  "gemini-3.1-flash-lite",
];

function isRetryableError(err: any): boolean {
  if (!err) return false;
  const status = err.status || err.code || err.statusCode;
  const message = String(err.message || "");
  return (
    status === 503 ||
    status === 429 ||
    status === "UNAVAILABLE" ||
    status === "RESOURCE_EXHAUSTED" ||
    message.includes("503") ||
    message.includes("429") ||
    message.includes("high demand") ||
    message.includes("UNAVAILABLE") ||
    message.includes("spikes in demand") ||
    message.includes("RESOURCE_EXHAUSTED") ||
    message.includes("temporarily unavailable") ||
    message.includes("overloaded")
  );
}

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function sanitizeErrorMessage(err: any): string {
  if (!err) return "Lỗi không xác định khi nhận diện số phiếu qua AI.";
  let msg = err.message || String(err);
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
    msg.includes("503") ||
    msg.includes("high demand") ||
    msg.includes("UNAVAILABLE") ||
    err?.status === 503 ||
    err?.code === 503
  ) {
    return "Mô hình nhận diện AI đang tạm thời quá tải do nhu cầu cao (503). Vui lòng bấm thử lại sau giây lát.";
  }
  if (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    err?.status === 429
  ) {
    return "Đã đạt giới hạn yêu cầu API tạm thời (429). Vui lòng chờ vài giây rồi thử lại.";
  }
  return msg;
}

// Server-side Gemini API OCR router
app.post("/api/ocr", async (req, res): Promise<any> => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing image data" });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server. Please add it to your secrets.",
      });
    }

    // Clean base64 string
    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: cleanBase64,
      },
    };

    const promptText = `
Đọc tất cả số phiếu xuất hiện trong ảnh và xác định tọa độ hộp giới hạn (bounding box) cho từng số đó.

QUY TẮC PHÁT HIỆN SỐ PHIẾU:
* Chỉ lấy số phiếu từ 1 đến 1500.
* TUYỆT ĐỐI BỎ QUA các số thuộc về số tiền, giá tiền, hoặc mệnh giá (ví dụ: "1.000.000", "1.000", "2.050.000", "2.000", "50.000 VNĐ", "đ", v.v.). Bất kể con số nào có dấu chấm (.) hoặc dấu phẩy (,) phân tách hàng nghìn đại diện cho mệnh giá tiền thì bỏ qua toàn bộ.
* TUYỆT ĐỐI BỎ QUA các số thuộc về ngày tháng hoặc định dạng có dấu gạch chéo '/' (ví dụ: các cụm "22/01", "22/1", "22/3", "1/12" hoặc bất kỳ chuỗi số nào có gạch chéo / ). Tránh tách lẻ các ký số này ra để làm số phiếu.
* Bỏ qua toàn bộ chữ viết tay khác và chữ in khác ngoài số phiếu.
* Chỉ quan tâm các con số của số phiếu đơn lẻ, thường nằm ở góc hoặc cột số thứ tự từ 1 đến 1500.
* Tự sửa lỗi OCR nếu ký tự số bị nhầm thành chữ cái:
  O -> 0
  S -> 5
  I -> 1
  l -> 1

QUY TẮC TỌA ĐỘ HỘP GIỚI HẠN (box):
* Cho mỗi số phiếu tìm được, chỉ định hộp giới hạn [ymin, xmin, ymax, xmax] ôm sát chữ số trên vùng ảnh.
* Tọa độ được chuẩn hóa dưới dạng số nguyên trong khoảng từ 0 đến 1000 (0 đại diện cho mép trên/trái, 1000 cho mép dưới/phải). Ví dụ: [ymin, xmin, ymax, xmax] của số ở góc trên bên trái có thể là [50, 40, 90, 110].
* Trả về danh sách tăng dần theo giá trị số phiếu.
* Xác định các số mờ nhòe, nhạt màu hoặc cần suy đoán tự sửa đổi vào nhóm 'lowConfidence'.
`;

    const ocrSchema = {
      type: Type.OBJECT,
      properties: {
        numbers: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              value: {
                type: Type.INTEGER,
                description: "Giá trị số phiếu dạng số nguyên (1 - 1500)."
              },
              box: {
                type: Type.ARRAY,
                items: { type: Type.INTEGER },
                description: "Hộp giới hạn quanh số phiếu gồm 4 phần tử [ymin, xmin, ymax, xmax] từ 0 đến 1000."
              }
            },
            required: ["value", "box"]
          },
          description: "Mảng danh sách các số phiếu tìm được và tọa độ của chúng."
        },
        lowConfidence: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER },
          description: "Các số phiếu có độ mờ nhạt, khó tin cậy hoặc được tự chỉnh sửa."
        },
      },
      required: ["numbers", "lowConfidence"],
    };

    let responseText: string | null = null;
    let lastError: any = null;

    // Iterate through candidate models with automated retry & fallback mechanism
    for (const modelName of CANDIDATE_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [imagePart, { text: promptText }],
            config: {
              responseMimeType: "application/json",
              responseSchema: ocrSchema,
            },
          });

          if (response?.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[OCR] Model ${modelName} (attempt ${attempt}) error:`, err?.message || err);

          if (isRetryableError(err) && attempt < 2) {
            // Short exponential backoff with jitter before retrying same model
            await sleep(600 * attempt + Math.floor(Math.random() * 300));
            continue;
          }
          // Move to next candidate model
          break;
        }
      }

      if (responseText) {
        break;
      }
    }

    if (!responseText) {
      const sanitized = sanitizeErrorMessage(lastError);
      console.error("All OCR candidate models exhausted. Last error:", lastError);
      const isOverloaded = isRetryableError(lastError);
      return res.status(isOverloaded ? 503 : 500).json({
        error: sanitized,
      });
    }

    // Strip code block markers if present
    const cleanedText = responseText
      .replace(/^```json\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(cleanedText);

    // Rigorous server-side post-processing to guarantee prompt constraint compliance
    let parsedNumbers = Array.isArray(parsed.numbers) ? parsed.numbers : [];
    let lowConfidence: number[] = Array.isArray(parsed.lowConfidence) ? parsed.lowConfidence : [];

    const finalCoords: { value: number; box: number[] }[] = [];
    let numbers: number[] = [];

    for (const item of parsedNumbers) {
      if (!item || typeof item !== "object") continue;
      const value = Math.floor(Number(item.value));
      if (isNaN(value) || value < 1 || value > 1500) continue;

      let box = item.box;
      if (!Array.isArray(box) || box.length !== 4) {
        box = [0, 0, 0, 0];
      } else {
        box = box.map((val) => Math.max(0, Math.min(1000, Math.floor(Number(val)))));
      }

      finalCoords.push({ value, box });
      numbers.push(value);
    }

    // Filter to ensure all items are integers between 1 and 1500
    numbers = numbers
      .map((n) => Math.floor(Number(n)))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 1500);

    lowConfidence = lowConfidence
      .map((n) => Math.floor(Number(n)))
      .filter((n) => !isNaN(n) && n >= 1 && n <= 1500);

    // Apply ascending sorting and unique values constraint
    numbers = Array.from(new Set(numbers)).sort((a, b) => a - b);
    lowConfidence = Array.from(new Set(lowConfidence)).sort((a, b) => a - b);

    // Filter unique coordinates
    const uniqueCoords: { value: number; box: number[] }[] = [];
    const seenVals = new Set<number>();
    for (const item of finalCoords) {
      if (!seenVals.has(item.value)) {
        seenVals.add(item.value);
        uniqueCoords.push(item);
      }
    }
    uniqueCoords.sort((a, b) => a.value - b.value);

    return res.json({
      numbers,
      lowConfidence,
      coords: uniqueCoords,
    });
  } catch (error: any) {
    console.error("OCR API error:", error);
    const sanitized = sanitizeErrorMessage(error);
    return res.status(500).json({
      error: sanitized,
    });
  }
});

// Endpoint to recognize missing ticket number at a specific cropped spot from image click
app.post("/api/ocr-spot", async (req, res): Promise<any> => {
  try {
    const { imageBase64, mimeType } = req.body;

    if (!imageBase64) {
      return res.status(400).json({ error: "Missing image data" });
    }

    if (!apiKey) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured on the server. Please add it to your secrets.",
      });
    }

    const cleanBase64 = imageBase64.replace(/^data:image\/\w+;base64,/, "");

    const imagePart = {
      inlineData: {
        mimeType: mimeType || "image/jpeg",
        data: cleanBase64,
      },
    };

    const promptText = `
Đọc con số phiếu kho xuất hiện trong vùng ảnh cắt cận cảnh này (số nguyên từ 1 đến 1500).
Vùng ảnh này được cắt ngay tại vị trí người dùng vừa bấm chuột vào ảnh chứng từ kho để nhận diện số phiếu còn thiếu.

QUY TẮC PHÁT HIỆN:
* Tập trung vào con số viết tay hoặc in nằm ở vị trí trung tâm hoặc nổi bật nhất trong ảnh cắt này.
* Chỉ lấy số nguyên trong khoảng 1 đến 1500.
* TUYỆT ĐỐI BỎ QUA các số tiền (có dấu chấm/phẩy hàng nghìn như 100.000, 20.000, 50.000 VNĐ), ngày tháng (có gạch chéo / như 22/1, 23/02), số điện thoại, hoặc chữ viết chữ cái.
* Tự sửa lỗi OCR nếu ký tự số bị nhầm với chữ cái:
  O -> 0, S -> 5, I -> 1, l -> 1, B -> 8, Z -> 2.
* Xác định hộp giới hạn [ymin, xmin, ymax, xmax] ôm sát chữ số trên vùng ảnh cắt này (tọa độ chuẩn hóa từ 0 đến 1000).
* Nếu không có con số nào phù hợp trong khoảng 1-1500 hoặc chỉ có vết bẩn/khoảng trống/chữ cái, trả về number: 0.
`;

    const spotSchema = {
      type: Type.OBJECT,
      properties: {
        number: {
          type: Type.INTEGER,
          description: "Giá trị số phiếu dạng số nguyên (1 - 1500), hoặc 0 nếu không tìm thấy.",
        },
        box: {
          type: Type.ARRAY,
          items: { type: Type.INTEGER },
          description: "Hộp giới hạn quanh số phiếu gồm 4 phần tử [ymin, xmin, ymax, xmax] từ 0 đến 1000 trong ảnh cắt.",
        },
        rawText: {
          type: Type.STRING,
          description: "Chuỗi ký tự hoặc con số nhận diện được trước khi lọc.",
        },
      },
      required: ["number"],
    };

    let responseText: string | null = null;
    let lastError: any = null;

    for (const modelName of CANDIDATE_MODELS) {
      for (let attempt = 1; attempt <= 2; attempt++) {
        try {
          const response = await ai.models.generateContent({
            model: modelName,
            contents: [imagePart, { text: promptText }],
            config: {
              responseMimeType: "application/json",
              responseSchema: spotSchema,
            },
          });

          if (response?.text) {
            responseText = response.text;
            break;
          }
        } catch (err: any) {
          lastError = err;
          console.warn(`[Spot OCR] Model ${modelName} (attempt ${attempt}) error:`, err?.message || err);
          if (isRetryableError(err) && attempt < 2) {
            await sleep(500 * attempt + Math.floor(Math.random() * 200));
            continue;
          }
          break;
        }
      }
      if (responseText) break;
    }

    if (!responseText) {
      const sanitized = sanitizeErrorMessage(lastError);
      console.error("All Spot OCR candidate models exhausted. Last error:", lastError);
      const isOverloaded = isRetryableError(lastError);
      return res.status(isOverloaded ? 503 : 500).json({ error: sanitized });
    }

    const cleanedText = responseText
      .replace(/^```json\s*/, "")
      .replace(/\s*```$/, "")
      .trim();

    const parsed = JSON.parse(cleanedText);
    const num = Math.floor(Number(parsed.number));
    let box =
      Array.isArray(parsed.box) && parsed.box.length === 4
        ? parsed.box.map((v: any) => Math.max(0, Math.min(1000, Math.floor(Number(v)))))
        : [150, 150, 850, 850];

    const validNumber = !isNaN(num) && num >= 1 && num <= 1500 ? num : null;

    return res.json({
      number: validNumber,
      box,
      rawText: parsed.rawText || "",
    });
  } catch (error: any) {
    console.error("Spot OCR API error:", error);
    const sanitized = sanitizeErrorMessage(error);
    return res.status(500).json({ error: sanitized });
  }
});

async function start() {
  // Vite middleware setup if in development mode
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Statics for Production mode
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server is running on port ${PORT}`);
  });
}

start().catch((err) => {
  console.error("Failed to start server", err);
});
