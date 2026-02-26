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
 * Build a COMPLETE HTML document reusing the SAME CSS classes and HTML structure
 * as the CKEditor frontend (suratTugas.css + letterhead.ts).
 *
 * The only additions for PDF:
 * - .word-header gets `position: fixed; top: 0` so it repeats on every page
 * - .word-footer gets `position: fixed; bottom: 0` so it repeats on every page
 * - Body content gets padding-top/bottom to avoid overlapping the fixed elements
 */
function buildFullHtmlDocument(bodyContent, letterCtx = {}) {
  const unit = { ...DEFAULTS.unit, ...(letterCtx.unit || {}) };
  const meta = { ...DEFAULTS.meta, ...(letterCtx.meta || {}) };
  const addresses = letterCtx.addresses || DEFAULTS.addresses;

  const headerHtml = buildPdfHeaderHtml(unit);
  const footerHtml = buildPdfFooterHtml(unit, meta, addresses);

  // Transform suratTugas.css for PDF context:
  // Replace :where(.ck-content, .export-paper) with a generic selector
  // so the same styles apply inside our PDF document body.
  const pdfCss = suratTugasCss.replace(/:where\(\.ck-content,\s*\.export-paper\)/g, ".pdf-page");

  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <style>
    /* ── Reset & page setup ── */
    @page {
      size: A4;
      margin: 0;
    }

    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }

    html, body {
      width: 210mm;
      font-family: 'Times New Roman', serif;
      font-size: 12pt;
      line-height: 1.15;
      color: #1f2a37;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }

    /* ── Import the same CSS as the frontend ── */
    ${pdfCss}

    /* ═══════════════════════════════════════
       PDF OVERRIDES: make header/footer fixed
       so they repeat on every printed page.
       ═══════════════════════════════════════ */
    .pdf-page .word-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      padding: var(--word-margin-top) var(--word-margin-x) 0;
      background: #fff;
      z-index: 100;
    }

    .pdf-page .word-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      padding: 0 var(--word-margin-x) var(--word-margin-bottom);
      background: #fff;
      z-index: 100;
      margin-top: 0;
    }

    /* Remove the paper border/shadow/radius for PDF (it's a real page) */
    .pdf-page .surat-tugas {
      border: none;
      box-shadow: none;
      border-radius: 0;
      padding: 0;
      margin: 0;
      width: 100%;
      min-height: auto;
    }

    /* Content area: pushed down past fixed header, up from fixed footer */
    .pdf-page .surat-word {
      padding-top: calc(var(--word-header-height) + 2mm);
      padding-bottom: calc(var(--word-footer-height) + 2mm);
      padding-left: var(--word-margin-x);
      padding-right: var(--word-margin-x);
      min-height: 297mm;
    }

    /* Word-body doesn't need min-height in PDF (surat-word handles it) */
    .pdf-page .word-body {
      min-height: auto;
      margin: 0;
    }
  </style>
</head>
<body>
  <div class="pdf-page">
    ${headerHtml}
    ${footerHtml}
    <div class="surat-word">
      <div class="word-body">
        ${bodyContent}
      </div>
    </div>
  </div>
</body>
</html>`;
}

/**
 * POST /api/export-pdf
 * Body: { content: string, letterCtx?: { unit, meta, addresses } }
 * Returns: PDF file as binary
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

    const htmlDocument = buildFullHtmlDocument(content, letterCtx);

    await page.setContent(htmlDocument, {
      waitUntil: "networkidle0",
    });

    // Wait for fonts & images to load
    await page.evaluateHandle("document.fonts.ready");

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      // Header & footer are embedded in the HTML itself using position:fixed,
      // so we do NOT use Puppeteer's displayHeaderFooter (which has severe
      // CSS limitations). Margins are 0 because our CSS handles spacing.
      displayHeaderFooter: false,
      margin: {
        top: "0px",
        bottom: "0px",
        left: "0px",
        right: "0px",
      },
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
