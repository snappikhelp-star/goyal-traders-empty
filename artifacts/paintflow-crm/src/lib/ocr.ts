import { createWorker } from "tesseract.js";

// ─── Types ────────────────────────────────────────────────────

export interface OcrProductFields {
  name?: string;
  brand?: string;
  shade_number?: string;
  shade_name?: string;
  pack_size?: string;
  barcode?: string;
}

export interface OcrInvoiceFields {
  raw_text: string;
  lines: string[];
}

// ─── Known paint brands ───────────────────────────────────────

const KNOWN_BRANDS = [
  "Asian Paints", "Berger", "Dulux", "Nerolac", "Kansai Nerolac",
  "Indigo", "Jotun", "Shalimar", "Akzo Nobel", "Nippon",
  "Snowcem", "Royale", "Apcolite", "Enamel", "Tractor",
];

// ─── Pack size patterns ───────────────────────────────────────
// Matches: 1L, 4L, 20L, 10kg, 500ml, 1 Ltr, 20 Litre, 4 KG, etc.
const PACK_SIZE_RE =
  /\b(\d+(?:\.\d+)?)\s*(l|ltr|litre|liter|liters|litres|kg|kgs|kilogram|ml|milliliter|gm|gram)\b/gi;

// ─── Shade number patterns ────────────────────────────────────
// Matches codes like: T-100, A100, 7671 N, OW-234, P 45 etc.
const SHADE_NUM_RE =
  /\b([A-Z]{1,3}[-\s]?\d{2,6}(?:\s?[A-Z]{0,2})?)\b/g;

// ─── Barcode patterns ─────────────────────────────────────────
// 8–14 digit sequences (EAN-8, EAN-13, UPC-A, etc.)
const BARCODE_RE = /\b(\d{8,14})\b/g;

// ─── Core OCR extraction ──────────────────────────────────────

/**
 * Run OCR on an image file and return the raw text + split lines.
 * Reusable for invoice scanning and any other document.
 */
export async function extractTextFromImage(
  imageFile: File,
  onProgress?: (pct: number) => void
): Promise<OcrInvoiceFields> {
  const worker = await createWorker("eng", 1, {
    logger: (m) => {
      if (m.status === "recognizing text" && onProgress) {
        onProgress(Math.round((m.progress ?? 0) * 100));
      }
    },
  });

  try {
    const url = URL.createObjectURL(imageFile);
    const { data } = await worker.recognize(url);
    URL.revokeObjectURL(url);
    const raw_text = data.text ?? "";
    const lines = raw_text
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    return { raw_text, lines };
  } finally {
    await worker.terminate();
  }
}

// ─── Product field parser ─────────────────────────────────────

/**
 * Parse OCR text into structured product fields.
 * Returns only fields that could be detected — undetected fields are undefined.
 */
export function parseProductFields(raw_text: string, lines: string[]): OcrProductFields {
  const result: OcrProductFields = {};
  const upper = raw_text.toUpperCase();

  // ── Brand ──────────────────────────────────────────────────
  for (const brand of KNOWN_BRANDS) {
    if (upper.includes(brand.toUpperCase())) {
      result.brand = brand;
      break;
    }
  }

  // ── Pack size ──────────────────────────────────────────────
  const packMatch = PACK_SIZE_RE.exec(raw_text);
  if (packMatch) {
    const qty = packMatch[1];
    const unit = packMatch[2].toLowerCase();
    const normUnit =
      unit.startsWith("l") ? "L" :
      unit.startsWith("ml") ? "ml" :
      unit.startsWith("k") ? "kg" :
      unit.startsWith("g") ? "gm" : unit.toUpperCase();
    result.pack_size = `${qty}${normUnit}`;
  }
  // Reset lastIndex (global regex)
  PACK_SIZE_RE.lastIndex = 0;

  // ── Barcode ────────────────────────────────────────────────
  let barcodeMatch: RegExpExecArray | null;
  while ((barcodeMatch = BARCODE_RE.exec(raw_text)) !== null) {
    const candidate = barcodeMatch[1];
    // Prefer EAN-13 (13 digits) or EAN-8 (8 digits)
    if (candidate.length === 13 || candidate.length === 8 || candidate.length === 12) {
      result.barcode = candidate;
      break;
    }
  }
  BARCODE_RE.lastIndex = 0;

  // ── Shade number ───────────────────────────────────────────
  let shadeNumMatch: RegExpExecArray | null;
  while ((shadeNumMatch = SHADE_NUM_RE.exec(raw_text)) !== null) {
    const candidate = shadeNumMatch[1].trim();
    // Exclude pack sizes and short noise
    if (candidate.length >= 3 && !/^\d+$/.test(candidate)) {
      result.shade_number = candidate;
      break;
    }
  }
  SHADE_NUM_RE.lastIndex = 0;

  // ── Product name & shade name — use prominent lines ────────
  // Heuristic: longer lines near the top are usually the product name.
  const candidates = lines
    .filter((l) => l.length > 3 && l.length < 80)
    .filter((l) => !/^\d+$/.test(l))           // not pure numbers
    .filter((l) => !/^[^a-zA-Z]+$/.test(l));   // must contain letters

  if (candidates.length > 0 && !result.brand) {
    // If no brand found via known list, first line is often brand/name
    result.name = candidates[0];
  } else if (candidates.length > 0) {
    // Brand found — product name is likely the longest descriptive line
    const byLength = [...candidates].sort((a, b) => b.length - a.length);
    result.name = byLength[0];
  }

  // Shade name: look for lines containing colour keywords
  const colourKeywords = /\b(white|cream|ivory|beige|grey|gray|blue|green|red|yellow|orange|purple|brown|black|pink|teal|azure|pearl|silk|satin|dune|sand|linen|stone|terracotta|mustard|olive)\b/i;
  const shadeLine = lines.find((l) => colourKeywords.test(l) && l !== result.name);
  if (shadeLine) {
    result.shade_name = shadeLine.replace(/shade[:\s]*/i, "").trim();
  }

  return result;
}

// ─── Combined helper (used by Products page) ─────────────────

/**
 * Upload an image and extract product fields in one call.
 */
export async function extractProductFromPhoto(
  imageFile: File,
  onProgress?: (pct: number) => void
): Promise<OcrProductFields> {
  const { raw_text, lines } = await extractTextFromImage(imageFile, onProgress);
  return parseProductFields(raw_text, lines);
}
