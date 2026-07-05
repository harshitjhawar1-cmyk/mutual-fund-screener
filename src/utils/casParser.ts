import { Holding, CASData } from '../types/holding';

/** Extract raw text from a PDF File using pdf.js */
export async function extractPdfText(file: File): Promise<string> {
  const pdfjsLib = await import('pdfjs-dist');
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  const pages: string[] = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    pages.push(content.items.map((item: any) => item.str).join(' '));
  }
  return pages.join('\n');
}

/** Parse a number string like "1,23,456.789" → 123456.789 */
function parseNum(s: string): number {
  return parseFloat(s.replace(/,/g, '')) || 0;
}

/**
 * Parse CAMS / KFintech CAS text into structured holdings.
 * Handles:
 *  - CAMS format: "Closing Unit Balance: X  Cost Value: Y  Market Value: Z"
 *  - KFintech format: "Units : X  NAV (₹) : Y  Market Value (₹) : Z"
 *  - Older CAMS:  "Closing Balance: X @ ₹NAV\nMarket Value as on ... : ₹Z"
 */
export function parseCASText(text: string): CASData {
  const holdings: Holding[] = [];

  // ── Investor metadata ─────────────────────────────────────────────────────
  const nameMatch = text.match(/(?:Name\s*[:\-]\s*)([A-Z][A-Za-z ]{2,50})/);
  const panMatch = text.match(/PAN\s*[:\-]\s*([A-Z]{5}[0-9]{4}[A-Z])/);
  const dateMatch = text.match(/(?:Statement Period|As on|as on)[^0-9]*(\d{2}[-\/]\w{3,}[-\/]\d{4}|\d{2}[-\/]\d{2}[-\/]\d{4})/i);

  // ── Split by folio sections ───────────────────────────────────────────────
  // CAMS: "Folio No: XXXXXXXXX / 0"
  // KFintech: "Folio No.: XXXXXXXXX"
  const folioSections = text.split(/(?=Folio\s*No\.?\s*:)/i);

  for (const section of folioSections) {
    if (!section.trim()) continue;

    const folioMatch = section.match(/Folio\s*No\.?\s*:\s*([\w\/\s]+?)(?:\s{2,}|\n|PAN|$)/i);
    const folioNo = folioMatch ? folioMatch[1].trim() : '';

    // ── Scheme name ──────────────────────────────────────────────────────────
    // Strategy: find first long line that looks like a fund name (contains "Fund" or "Scheme" or ends in common MF suffixes)
    const schemeMatch = section.match(
      /(?:Scheme\s*:\s*|Fund\s*:\s*|^\s*)([A-Z][A-Za-z0-9 &\-(),:.']+(?:Fund|Scheme|Plan|Growth|ELSS|FoF|ETF)[A-Za-z0-9 &\-(),:.']*)/m
    );
    let schemeName = schemeMatch ? schemeMatch[1].trim() : '';
    // Fallback: take the longest line before the transaction table
    if (!schemeName) {
      const lines = section.split('\n').map(l => l.trim()).filter(Boolean);
      const fundLine = lines.find(l => l.length > 30 && /fund|scheme|growth|elss/i.test(l));
      if (fundLine) schemeName = fundLine;
    }
    if (!schemeName) continue;

    // ── CAMS modern format ────────────────────────────────────────────────────
    // "Closing Unit Balance: 1,234.567  Cost Value: 50,000.00  Market Value: 75,234.56"
    const camsModern = section.match(
      /Closing\s+Unit\s+Balance\s*[:\-]?\s*([\d,]+\.\d+)\s+Cost\s+Value\s*[:\-]?\s*([\d,]+(?:\.\d+)?)\s+Market\s+Value\s*[:\-]?\s*([\d,]+(?:\.\d+)?)/i
    );
    if (camsModern) {
      holdings.push({
        schemeName,
        folioNo,
        units: parseNum(camsModern[1]),
        costValue: parseNum(camsModern[2]),
        marketValue: parseNum(camsModern[3]),
      });
      continue;
    }

    // ── CAMS older format ─────────────────────────────────────────────────────
    // "Closing Balance: 1,234.567 @ ₹56.789"  +  "Market Value as on ... : ₹75,234.56"
    const camsOldUnits = section.match(/Closing\s+Balance\s*[:\-]?\s*([\d,]+\.\d+)\s*@\s*[₹Rs.]?\s*([\d,]+\.\d+)/i);
    const camsOldMV = section.match(/Market\s+Value\s+as\s+on[^:₹]*[:\-]?\s*[₹Rs.]?\s*([\d,]+(?:\.\d+)?)/i);
    const camsOldCost = section.match(/(?:Purchase\s+Cost|Cost\s+Value)[^:₹]*[:\-]?\s*[₹Rs.]?\s*([\d,]+(?:\.\d+)?)/i);
    if (camsOldUnits) {
      holdings.push({
        schemeName,
        folioNo,
        units: parseNum(camsOldUnits[1]),
        costValue: camsOldCost ? parseNum(camsOldCost[1]) : 0,
        marketValue: camsOldMV ? parseNum(camsOldMV[1]) : parseNum(camsOldUnits[1]) * parseNum(camsOldUnits[2]),
      });
      continue;
    }

    // ── KFintech format ───────────────────────────────────────────────────────
    // "Units : 1,234.567  NAV (₹) : 56.789  Market Value (₹) : 75,234.56"
    const kfin = section.match(
      /Units\s*[:\-]?\s*([\d,]+\.\d+)\s+NAV\s*\([₹Rs.]+\)\s*[:\-]?\s*([\d,]+\.\d+)\s+Market\s+Value\s*\([₹Rs.]+\)\s*[:\-]?\s*([\d,]+(?:\.\d+)?)/i
    );
    if (kfin) {
      holdings.push({
        schemeName,
        folioNo,
        units: parseNum(kfin[1]),
        costValue: 0,
        marketValue: parseNum(kfin[3]),
      });
      continue;
    }

    // ── Generic fallback ──────────────────────────────────────────────────────
    // Look for any "Units" + "Market Value" pair
    const genericUnits = section.match(/(?:Units|Balance)\s*[:\-]?\s*([\d,]+\.\d{3})/i);
    const genericMV = section.match(/Market\s+Value\s*[:\-]?\s*[₹Rs.]?\s*([\d,]+(?:\.\d+)?)/i);
    if (genericUnits && genericMV) {
      holdings.push({
        schemeName,
        folioNo,
        units: parseNum(genericUnits[1]),
        costValue: 0,
        marketValue: parseNum(genericMV[1]),
      });
    }
  }

  const totalCost = holdings.reduce((s, h) => s + h.costValue, 0);
  const totalMarketValue = holdings.reduce((s, h) => s + h.marketValue, 0);

  return {
    investorName: nameMatch?.[1],
    pan: panMatch?.[1],
    statementDate: dateMatch?.[1],
    holdings,
    totalCost,
    totalMarketValue,
  };
}

/** Fuzzy-match a CAS scheme name to an AMFI scheme name */
export function matchSchemeName(casName: string, amfiNames: string[]): string | null {
  const normalise = (s: string) =>
    s.toLowerCase()
      .replace(/\s+/g, ' ')
      .replace(/[^a-z0-9 ]/g, '')
      .trim();

  const norm = normalise(casName);
  // exact
  const exact = amfiNames.find(n => normalise(n) === norm);
  if (exact) return exact;
  // contains
  const contains = amfiNames.find(n => normalise(n).includes(norm) || norm.includes(normalise(n)));
  if (contains) return contains;
  // first 5 words
  const words = norm.split(' ').slice(0, 5).join(' ');
  return amfiNames.find(n => normalise(n).startsWith(words)) ?? null;
}
