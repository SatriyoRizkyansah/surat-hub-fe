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
    const htmlDocument = buildPdfHtml(content, letterCtx);

    await page.setContent(htmlDocument, { waitUntil: "networkidle0" });
    await page.evaluateHandle("document.fonts.ready");

    // ── Step 1: First render to find actual page count ──
    const firstPdf = await page.pdf({
      format: "A4",
      printBackground: true,
      displayHeaderFooter: false,
      preferCSSPageSize: true,
    });

    // Count pages by scanning for PDF page-tree markers
    // Each "/Type /Page\n" (not "/Type /Pages") = one page
    const pdfStr = firstPdf.toString("binary");
    const pageMatches = pdfStr.match(/\/Type\s*\/Page(?!s)/g);
    const actualPages = pageMatches ? pageMatches.length : 1;

    // ── Step 2: Inject spacer so footer lands at page bottom ──
    await page.evaluate((numPages) => {
      const PAGE_H = 297 * (96 / 25.4); // A4 height in CSS px (1122.52)
      const table = document.querySelector(".pdf-table");
      if (!table) return;

      const tfoot = table.querySelector("tfoot");
      const tbody = table.querySelector("tbody");
      if (!tfoot || !tbody) return;

      // Measure actual content + header heights (without tfoot)
      tfoot.style.display = "none";
      const contentH = table.getBoundingClientRect().height;
      tfoot.style.display = "";

      const footerH = tfoot.getBoundingClientRect().height;

      // What page does content end on? (0-indexed)
      const lastContentPage = Math.ceil(contentH / PAGE_H) - 1;
      // Top of last page
      const lastPageTop = lastContentPage * PAGE_H;
      // Content bottom relative to last page
      const contentOnLastPage = contentH - lastPageTop;
      // Available space on last page for content + footer
      const available = PAGE_H - contentOnLastPage;

      // Only add spacer if footer fits on last page (otherwise it'll be on next page anyway)
      // and there's gap between content-end and where footer should be
      if (available >= footerH) {
        const spacer = available - footerH;
        if (spacer > 1) {
          const spacerRow = document.createElement("tr");
          const spacerCell = document.createElement("td");
          spacerCell.style.cssText = `height:${spacer}px;padding:0;border:none;line-height:0;font-size:0;`;
          spacerRow.appendChild(spacerCell);
          tbody.appendChild(spacerRow);
        }
      }
    }, actualPages);

    // ── Step 3: Final render with spacer in place ──
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
