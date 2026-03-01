import express from "express";
import cors from "cors";
import puppeteer from "puppeteer-core";
import path from "path";
import { fileURLToPath } from "url";
import fs from "fs";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Serve static assets (logos) so Puppeteer can reference them
app.use("/assets", express.static(path.join(__dirname, "..", "public", "assets")));

/**
 * Find Chrome executable - check common locations
 */
function findChrome() {
  const candidates = [
    // Puppeteer cache locations
    ...findPuppeteerChrome(),
    // Common system locations
    "/usr/bin/google-chrome-stable",
    "/usr/bin/google-chrome",
    "/usr/bin/chromium-browser",
    "/usr/bin/chromium",
    "/snap/bin/chromium",
  ];
  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }
  return null;
}

function findPuppeteerChrome() {
  const cacheDir = path.join(process.env.HOME || "", ".cache", "puppeteer");
  const paths = [];

  // Check chrome-headless-shell first (lighter, perfect for PDF)
  try {
    const headlessDir = path.join(cacheDir, "chrome-headless-shell");
    if (fs.existsSync(headlessDir)) {
      const versions = fs.readdirSync(headlessDir).sort().reverse();
      for (const ver of versions) {
        const exe = path.join(headlessDir, ver, "chrome-headless-shell-linux64", "chrome-headless-shell");
        if (fs.existsSync(exe)) paths.push(exe);
      }
    }
  } catch {
    /* ignore */
  }

  // Check full chrome
  try {
    const chromeDir = path.join(cacheDir, "chrome");
    if (fs.existsSync(chromeDir)) {
      const versions = fs.readdirSync(chromeDir).sort().reverse();
      for (const ver of versions) {
        const exe = path.join(chromeDir, ver, "chrome-linux64", "chrome");
        if (fs.existsSync(exe)) paths.push(exe);
      }
    }
  } catch {
    /* ignore */
  }

  return paths;
}

/**
 * Convert a local image file to a base64 data URI
 */
function imageToBase64(filePath) {
  try {
    const absolutePath = path.resolve(__dirname, "..", "public", filePath.replace(/^\//, ""));
    if (!fs.existsSync(absolutePath)) {
      console.warn(`Image not found: ${absolutePath}`);
      return "";
    }
    const buffer = fs.readFileSync(absolutePath);
    const ext = path.extname(absolutePath).slice(1).toLowerCase();
    const mime = ext === "svg" ? "image/svg+xml" : `image/${ext === "jpg" ? "jpeg" : ext}`;
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch (err) {
    console.warn(`Failed to convert image to base64: ${filePath}`, err);
    return "";
  }
}

// Pre-convert default logos/QR to base64 for fallback
const defaultLogoLeftBase64 = imageToBase64("assets/logo/LogoSasmita.png");
const defaultLogoRightBase64 = imageToBase64("assets/logo/LogoUnpam.png");
const defaultQrBase64 = imageToBase64("assets/logo/qr-unpam.png");

/**
 * Default values matching DEFAULT_UNIT_INFO in letterhead.ts
 */
const DEFAULTS = {
  unit: {
    institutionLine: "YAYASAN SASMITA JAYA",
    universityLine: "UNIVERSITAS PAMULANG",
    unitName: "FAKULTAS TEKNIK",
    subUnit: '"LEMBAGA SERTIFIKASI PROFESI"',
    logoLeft: "/assets/logo/LogoSasmita.png",
    logoRight: "/assets/logo/LogoUnpam.png",
    email: "lsp@unpam.ac.id",
    website: "www.lsp.unpam.ac.id",
    instagram: "lsp_unpam",
  },
  meta: {
    qrCodeUrl: "/assets/logo/qr-unpam.png",
    qrLabel: "www.unpam.ac.id",
  },
  addresses: [
    { label: "Kampus 1,", value: "Jl. Surya Kencana No.1, Pamulang, Kota Tangerang Selatan, Banten 15417" },
    { label: "Kampus 2,", value: "Jl. Raya Puspitek No. 46, Serpong, Kota Tangerang Selatan, Banten 15316" },
    { label: "Kampus 3,", value: "Jl. Witana Harja No. 18b, Pamulang, Kota Tangerang Selatan, Banten 15417" },
    { label: "Kampus 4,", value: "Jl. Raya Jakarta-Serang, Walantaka, Kota Serang, Banten 42183" },
  ],
};

/**
 * Resolve an image src to a base64 data URI.
 * If it's already data:, return as-is. If it's a local path, convert.
 */
function resolveImageSrc(src, fallbackBase64) {
  if (!src) return fallbackBase64;
  if (src.startsWith("data:")) return src;
  const converted = imageToBase64(src.replace(/^\//, ""));
  return converted || fallbackBase64;
}

/**
 * Read suratTugas.css once at startup — this is the single source of truth
 * for all header/footer/content styling. The PDF document reuses the exact
 * same CSS classes as the CKEditor frontend.
 */
const suratTugasCssPath = path.join(__dirname, "..", "src", "templates", "suratTugas.css");
const suratTugasCss = fs.existsSync(suratTugasCssPath) ? fs.readFileSync(suratTugasCssPath, "utf-8") : "";

/**
 * Build header HTML using the SAME structure as letterhead.ts buildLetterheadHeaderHtml.
 * Images are resolved to base64 so Puppeteer doesn't need network access.
 */
function buildPdfHeaderHtml(unit) {
  const logoLeftB64 = resolveImageSrc(unit.logoLeft, defaultLogoLeftBase64);
  const logoRightB64 = resolveImageSrc(unit.logoRight, defaultLogoRightBase64);

  return `
  <header class="word-header">
    <div class="word-header__grid">
      <div class="word-logo word-logo--left">
        <img class="word-logo__image" src="${logoLeftB64}" alt="Logo Kiri" />
      </div>
      <div class="word-identity">
        <p class="word-identity__line word-identity__line--foundation">${unit.institutionLine}</p>
        <p class="word-identity__line word-identity__line--institution">${unit.universityLine}</p>
        <p class="word-identity__line word-identity__line--faculty">${unit.unitName}</p>
        <p class="word-identity__line word-identity__line--subtitle">${unit.subUnit}</p>
      </div>
      <div class="word-logo word-logo--right">
        <img class="word-logo__image" src="${logoRightB64}" alt="Logo Kanan" />
      </div>
    </div>
    <div class="word-divider">
      <span class="word-divider__line word-divider__line--thin"></span>
      <span class="word-divider__line word-divider__line--thick"></span>
    </div>
  </header>`;
}

/**
 * Build footer HTML using the SAME structure as letterhead.ts buildLetterheadFooterHtml.
 */
function buildPdfFooterHtml(unit, meta, addresses) {
  const qrB64 = resolveImageSrc(meta.qrCodeUrl, defaultQrBase64);
  const addressesHtml = addresses.map((addr) => `<p><strong>${addr.label}</strong> ${addr.value}</p>`).join("\n          ");
  const contactLine = `<strong>E.</strong> ${unit.email}, | ${unit.website} | Instagram : ${unit.instagram}`;

  return `
  <footer class="word-footer">
    <div class="word-footer__inner">
      <div class="word-footer__content">
        <div class="word-footer__addresses">
          ${addressesHtml}
        </div>
        <div class="word-footer__contacts">
          <p>${contactLine}</p>
        </div>
      </div>
      <div class="word-footer__qr">
        <img class="word-footer__qr-image" src="${qrB64}" alt="QR Code" />
        <span class="word-footer__qr-label">${meta.qrLabel}</span>
      </div>
    </div>
    <div class="word-footer__bar">
      <span class="word-footer__bar-segment word-footer__bar-segment--red"></span>
      <span class="word-footer__bar-segment word-footer__bar-segment--gold"></span>
      <span class="word-footer__bar-segment word-footer__bar-segment--navy"></span>
    </div>
  </footer>`;
}

/**
 * Build HTML document for PDF export.
 *
 * TABLE TRICK approach:
 * - <thead> table-header-group → header repeats on every page
 * - <tfoot> table-footer-group → footer repeats on every page
 * - <tbody> content flows naturally, Chromium paginates between them
 *
 * After render, Puppeteer injects a spacer in the last page so the footer
 * sits at the bottom of the physical page (not right after content).
 */
function buildPdfHtml(bodyContent, letterCtx = {}) {
  const unit = { ...DEFAULTS.unit, ...(letterCtx.unit || {}) };
  const meta = { ...DEFAULTS.meta, ...(letterCtx.meta || {}) };
  const addresses = letterCtx.addresses || DEFAULTS.addresses;

  const headerHtml = buildPdfHeaderHtml(unit);
  const footerHtml = buildPdfFooterHtml(unit, meta, addresses);

  // Transform CSS: replace the :where() selector so .pdf-page picks up all styles
  let pdfCss = suratTugasCss.replace(/:where\(\.ck-content,\s*\.export-paper\)/g, ".pdf-page");

  // Strip @media print block — contains position:running() and @page @top-center
  // which Chromium doesn't support
  pdfCss = pdfCss.replace(/@media\s+print\s*\{[\s\S]*?\n\}/g, "/* @media print stripped */");

  // Strip standalone @page from original CSS — we define our own
  pdfCss = pdfCss.replace(/@page\s*\{[^}]*\}/g, "/* @page stripped */");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <style>
    @page { size: A4; margin: 0; }
    
    * { margin: 0; padding: 0; box-sizing: border-box; }
    
    html, body {
      width: 210mm;
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.15;
      color: #1f2a37;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    
    /* ═══ Original frontend CSS ═══ */
    ${pdfCss}
    
    /* ═══ Minimal PDF overrides ═══ */
    
    /* Remove paper card styling (border, shadow, min-height) */
    .pdf-page .surat-tugas {
      border: none !important;
      box-shadow: none !important;
      border-radius: 0 !important;
      padding: 0 !important;
      margin: 0 !important;
      width: 100% !important;
      min-height: auto !important;
    }
    
    /* surat-word must be block for table layout to work */
    .pdf-page .surat-word {
      display: block !important;
      min-height: auto !important;
      position: static !important;
    }
    
    /* ═══ TABLE layout for repeating header & footer ═══ */
    .pdf-table {
      width: 210mm;
      display: table;
      table-layout: fixed;
      border-collapse: collapse;
      border-spacing: 0;
    }
    .pdf-table > thead { display: table-header-group; }
    .pdf-table > tfoot { display: table-footer-group; }
    .pdf-table > tbody { display: table-row-group; }
    
    .pdf-table td {
      padding: 0;
      border: none;
    }
    
    /* Header: static position, full width with padding */
    .pdf-page .word-header {
      width: 210mm;
      padding: var(--word-margin-top, 8mm) var(--word-margin-x, 15mm) 3mm;
      position: static !important;
    }
    
    /* Footer: static position (tfoot handles placement), full width */
    .pdf-page .word-footer {
      width: 210mm;
      padding: 4mm var(--word-margin-x, 15mm) var(--word-margin-bottom, 8mm);
      position: static !important;
      margin-top: 0 !important;
    }
    
    /* Content: keep original flex layout + gap for spacing fidelity */
    .pdf-page .word-body {
      padding: 0 var(--word-margin-x, 15mm);
      margin: 6mm 0 10mm 0;
      min-height: auto !important;
    }
    
    /* Constrain user-inserted images */
    .pdf-page .word-body img:not(.word-logo__image):not(.word-footer__qr-image) {
      max-width: 100% !important;
      height: auto !important;
    }
    .pdf-page figure {
      max-width: 100% !important;
    }
  </style>
</head>
<body>
  <div class="pdf-page">
   <div class="surat-word">
    <table class="pdf-table">
      <thead><tr><td>${headerHtml}</td></tr></thead>
      <tfoot><tr><td>${footerHtml}</td></tr></tfoot>
      <tbody><tr><td>
        <div class="word-body">
          ${bodyContent}
        </div>
      </td></tr></tbody>
    </table>
   </div>
  </div>
</body>
</html>`;
}

/**
 * POST /api/export-pdf
 * Body: { content: string, letterCtx?: { unit, meta, addresses } }
 * Returns: PDF file as binary
 *
 * Uses TABLE TRICK (thead/tfoot) for repeating header/footer.
 * After initial render, injects a spacer to push the last-page footer
 * to the bottom of the physical page.
 */
app.post("/api/export-pdf", async (req, res) => {
  const { content, letterCtx } = req.body;

  if (!content) {
    return res.status(400).json({ error: "content is required" });
  }

  let browser;
  try {
    const executablePath = findChrome();
    if (!executablePath) {
      return res.status(500).json({
        error: "Chrome/Chromium not found. Install Chrome or run: npx puppeteer browsers install chrome",
      });
    }
    console.log("Using Chrome at:", executablePath);

    browser = await puppeteer.launch({
      headless: true,
      executablePath,
      args: ["--no-sandbox", "--disable-setuid-sandbox", "--disable-dev-shm-usage", "--font-render-hinting=none"],
    });

    const page = await browser.newPage();

    // Set viewport width to A4 at 96dpi — height doesn't matter for multi-page print
    const A4_W_PX = Math.floor(210 * (96 / 25.4)); // 794px
    await page.setViewport({ width: A4_W_PX, height: 1122 });

    const htmlDocument = buildPdfHtml(content, letterCtx);

    await page.setContent(htmlDocument, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");

    // ── Push footer to bottom of last page via padding-bottom on tbody <td> ──
    //
    // How it works:
    //   1. Measure header (thead) and footer (tfoot) heights in mm.
    //   2. Calculate usable body height per page = 297mm - header - footer.
    //   3. Calculate how much content is on the last page.
    //   4. The gap = usable - lastPageContent = empty space above tfoot.
    //   5. Add that gap as padding-bottom on the tbody <td> so tfoot is pushed
    //      to the very bottom of the last physical page.
    //
    // Why padding-bottom (not a spacer row, not min-height):
    //   - padding-bottom is part of the cell, not a new row — no extra tfoot position shift.
    //   - Setting it in mm keeps it in print-space units, avoiding px↔mm rounding.
    //   - We subtract a 1.5mm safety buffer to ensure we never overflow to a new page.
    const debugInfo = await page.evaluate(() => {
      const table = document.querySelector(".pdf-table");
      if (!table) return { error: "no table" };

      const thead = table.querySelector("thead");
      const tfoot = table.querySelector("tfoot");
      const tbody = table.querySelector("tbody");
      const tbodyTd = tbody?.querySelector("td");
      if (!thead || !tfoot || !tbody || !tbodyTd) return { error: "missing parts" };

      const PX_PER_MM = 96 / 25.4;
      const PAGE_H_MM = 297;

      const theadH_mm = thead.getBoundingClientRect().height / PX_PER_MM;
      const tfootH_mm = tfoot.getBoundingClientRect().height / PX_PER_MM;

      // Usable body area per page in mm
      const usable_mm = PAGE_H_MM - theadH_mm - tfootH_mm;
      if (usable_mm <= 0) return { error: "usable <= 0", theadH_mm, tfootH_mm };

      // Content height currently in the tbody cell (excludes any padding we add)
      const contentH_mm = tbodyTd.getBoundingClientRect().height / PX_PER_MM;

      // How many pages does content span?
      const pages = Math.max(1, Math.ceil(contentH_mm / usable_mm));

      // How much of the last page is already filled by content?
      const lastPageUsed_mm = contentH_mm - (pages - 1) * usable_mm;

      // Gap = remaining empty space on the last page before tfoot
      const gap_mm = usable_mm - lastPageUsed_mm;

      const info = { theadH_mm, tfootH_mm, usable_mm, contentH_mm, pages, lastPageUsed_mm, gap_mm };

      // Apply gap as padding-bottom so tfoot lands at page bottom.
      // Safety: subtract 3mm buffer + clamp so padding never exceeds (usable - 10mm)
      // to prevent the padding itself from pushing content to an extra blank page.
      const SAFETY_MM = 3;
      const MAX_PAD_MM = usable_mm - 10;
      if (gap_mm > SAFETY_MM * 2) {
        const padH_mm = Math.min(gap_mm - SAFETY_MM, MAX_PAD_MM);
        tbodyTd.style.paddingBottom = `${padH_mm.toFixed(3)}mm`;
        info.paddingBottomSet = `${padH_mm.toFixed(3)}mm`;
      }

      return info;
    });

    console.log("PDF layout debug:", JSON.stringify(debugInfo));

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });

    res.set({
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="surat.pdf"',
      "Content-Length": pdfBuffer.length,
    });

    res.send(pdfBuffer);
  } catch (err) {
    console.error("PDF generation failed:", err);
    res.status(500).json({ error: "PDF generation failed", details: err.message });
  } finally {
    if (browser) {
      await browser.close();
    }
  }
});

/**
 * Health check
 */
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", timestamp: new Date().toISOString() });
});

app.listen(PORT, () => {
  console.log(`✅ PDF export server running at http://localhost:${PORT}`);
});
