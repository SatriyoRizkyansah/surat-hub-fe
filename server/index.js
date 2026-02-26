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

// Pre-convert logos/QR to base64 for embedding in PDF HTML
const logoLeftBase64 = imageToBase64("assets/logo/LogoSasmita.png");
const logoRightBase64 = imageToBase64("assets/logo/LogoUnpam.png");
const qrBase64 = imageToBase64("assets/logo/qr-unpam.png");

/**
 * Build a COMPLETE HTML document that includes header, footer, and content.
 *
 * KEY APPROACH: Instead of using Puppeteer's `displayHeaderFooter` (which runs
 * in a sandboxed context with severe CSS limitations), we embed the header and
 * footer directly in the page using `position: fixed`. This makes the browser
 * itself render them identically to the preview, repeating on every printed page.
 *
 * - Header: position:fixed at top, z-index above content
 * - Footer: position:fixed at bottom, z-index above content
 * - Content: padded top/bottom to avoid overlap with fixed header/footer
 * - @page margins = 0, because we handle spacing ourselves
 */
function buildFullHtmlDocument(bodyContent) {
  return `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8" />
  <style>
    /* ── Page setup ── */
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

    /* ═══════════════════════════════════════
       FIXED HEADER (repeats every page)
       ═══════════════════════════════════════ */
    .pdf-header {
      position: fixed;
      top: 0;
      left: 0;
      right: 0;
      height: 42mm;
      padding: 6mm 15mm 0 15mm;
      background: #fff;
      z-index: 100;
      text-align: center;
      color: #001f5f;
      font-family: 'Times New Roman', serif;
      text-transform: uppercase;
    }

    .pdf-header__grid {
      display: flex;
      align-items: center;
      justify-content: space-between;
      gap: 6mm;
    }

    .pdf-header__logo-left {
      width: 4.23cm;
      height: 2.99cm;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .pdf-header__logo-right {
      width: 2.48cm;
      height: 2.48cm;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }

    .pdf-header__logo-left img,
    .pdf-header__logo-right img {
      width: 100%;
      height: 100%;
      object-fit: contain;
    }

    .pdf-header__identity {
      flex: 1;
      text-align: center;
      display: flex;
      flex-direction: column;
      gap: 0.5mm;
      line-height: 1.05;
    }

    .pdf-header__line1 {
      font-size: 12pt;
      font-weight: 700;
      letter-spacing: 0.04em;
    }
    .pdf-header__line2 {
      font-size: 20pt;
      font-weight: 700;
      letter-spacing: 0.06em;
    }
    .pdf-header__line3 {
      font-size: 18pt;
      font-weight: 700;
      letter-spacing: 0.05em;
    }
    .pdf-header__subtitle {
      font-size: 12pt;
      font-weight: 700;
      letter-spacing: 0.04em;
      line-height: 1.1;
    }

    .pdf-header__divider {
      display: flex;
      flex-direction: column;
      gap: 1mm;
      margin-top: 3mm;
    }
    .pdf-header__divider-thin {
      height: 1px;
      background: #001f5f;
      opacity: 0.95;
    }
    .pdf-header__divider-thick {
      height: 3px;
      background: #001f5f;
    }

    /* ═══════════════════════════════════════
       FIXED FOOTER (repeats every page)
       ═══════════════════════════════════════ */
    .pdf-footer {
      position: fixed;
      bottom: 0;
      left: 0;
      right: 0;
      height: 36mm;
      padding: 0 15mm 6mm 15mm;
      background: #fff;
      z-index: 100;
      font-family: 'Times New Roman', serif;
      font-size: 10pt;
      color: #4b5563;
    }

    .pdf-footer__border {
      border-top: 2px solid #001f5f;
      padding-top: 3mm;
    }

    .pdf-footer__inner {
      display: flex;
      align-items: flex-start;
      gap: 5mm;
    }

    .pdf-footer__content {
      flex: 1;
    }

    .pdf-footer__addresses {
      line-height: 1.3;
    }
    .pdf-footer__addresses p {
      margin: 1px 0;
      font-size: 10pt;
    }

    .pdf-footer__contacts {
      margin-top: 2px;
      color: #001f5f;
      font-weight: 600;
      font-size: 10pt;
    }

    .pdf-footer__qr {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1px;
      flex-shrink: 0;
    }
    .pdf-footer__qr img {
      width: 1.8cm;
      height: 1.8cm;
      object-fit: contain;
    }
    .pdf-footer__qr-label {
      font-size: 8pt;
      color: #001f5f;
      font-weight: 600;
      white-space: nowrap;
    }

    .pdf-footer__bar {
      display: flex;
      height: 6px;
      overflow: hidden;
      margin-top: 4px;
    }
    .pdf-footer__bar span { flex: 1; }
    .pdf-footer__bar-red  { background: #c00000; }
    .pdf-footer__bar-gold { background: #ffc000; }
    .pdf-footer__bar-navy { background: #001f5f; }

    /* ═══════════════════════════════════════
       CONTENT AREA
       ═══════════════════════════════════════ */
    .pdf-content {
      /* Push below fixed header and above fixed footer */
      padding-top: 44mm;
      padding-bottom: 38mm;
      padding-left: 15mm;
      padding-right: 15mm;
      min-height: 297mm;
    }

    /* ── Surat content styling (matches suratTugas.css) ── */
    .pdf-content p,
    .pdf-content li {
      margin: 0 0 6pt;
    }

    .word-meta {
      display: flex;
      flex-direction: column;
      gap: 2px;
      margin-top: 4px;
    }
    .word-meta p {
      display: flex;
      gap: 8px;
    }
    .word-meta span {
      font-weight: 700;
      min-width: 120px;
    }

    .word-address {
      margin-top: 10px;
    }
    .word-address p {
      margin: 0;
    }

    .word-detail {
      width: 100%;
      border-collapse: collapse;
      margin: 8px 0 6px;
      font-size: 12pt;
    }
    .word-detail td {
      padding: 4px 8px;
      border: 1px solid #d6dae2;
      vertical-align: top;
      line-height: 1.15;
    }
    .word-detail td:first-child {
      width: 150px;
      font-weight: 600;
      background: #f2f4f8;
    }

    ul {
      margin: 0 0 0 18px;
      padding: 0;
    }

    .word-signature {
      text-align: left;
      margin-top: 16px;
      margin-left: auto;
    }
    .word-signature p {
      margin: 0 0 4px;
    }
    .word-signature__space {
      height: 72px;
    }
    .word-signature__name {
      text-decoration: underline;
    }

    table {
      border-collapse: collapse;
    }
    table td, table th {
      padding: 4px 8px;
      border: 1px solid #d6dae2;
      vertical-align: top;
    }

    /* CKEditor content compat */
    figure.table {
      margin: 0.9em auto;
      display: table;
    }
    .table table {
      border-collapse: collapse;
      width: 100%;
    }
  </style>
</head>
<body>

  <!-- Fixed header: repeats on every printed page -->
  <div class="pdf-header">
    <div class="pdf-header__grid">
      <div class="pdf-header__logo-left">
        <img src="${logoLeftBase64}" alt="Logo Sasmita Jaya" />
      </div>
      <div class="pdf-header__identity">
        <div class="pdf-header__line1">YAYASAN SASMITA JAYA</div>
        <div class="pdf-header__line2">UNIVERSITAS PAMULANG</div>
        <div class="pdf-header__line3">FAKULTAS TEKNIK</div>
        <div class="pdf-header__subtitle">"LEMBAGA SERTIFIKASI PROFESI"</div>
      </div>
      <div class="pdf-header__logo-right">
        <img src="${logoRightBase64}" alt="Logo Unpam" />
      </div>
    </div>
    <div class="pdf-header__divider">
      <div class="pdf-header__divider-thin"></div>
      <div class="pdf-header__divider-thick"></div>
    </div>
  </div>

  <!-- Fixed footer: repeats on every printed page -->
  <div class="pdf-footer">
    <div class="pdf-footer__border">
      <div class="pdf-footer__inner">
        <div class="pdf-footer__content">
          <div class="pdf-footer__addresses">
            <p><strong>Kampus 1,</strong> Jl. Surya Kencana No.1, Pamulang, Kota Tangerang Selatan, Banten 15417</p>
            <p><strong>Kampus 2,</strong> Jl. Raya Puspitek No. 46, Serpong, Kota Tangerang Selatan, Banten 15316</p>
            <p><strong>Kampus 3,</strong> Jl. Witana Harja No. 18b, Pamulang, Kota Tangerang Selatan, Banten 15417</p>
            <p><strong>Kampus 4,</strong> Jl. Raya Jakarta-Serang, Walantaka, Kota Serang, Banten 42183</p>
          </div>
          <div class="pdf-footer__contacts">
            <strong>E.</strong> lsp@unpam.ac.id, | www.lsp.unpam.ac.id | Instagram : lsp_unpam
          </div>
        </div>
        <div class="pdf-footer__qr">
          <img src="${qrBase64}" alt="QR Code unpam.ac.id" />
          <span class="pdf-footer__qr-label">www.unpam.ac.id</span>
        </div>
      </div>
      <div class="pdf-footer__bar">
        <span class="pdf-footer__bar-red"></span>
        <span class="pdf-footer__bar-gold"></span>
        <span class="pdf-footer__bar-navy"></span>
      </div>
    </div>
  </div>

  <!-- Page content (flows between fixed header/footer) -->
  <div class="pdf-content">
    ${bodyContent}
  </div>

</body>
</html>`;
}

/**
 * POST /api/export-pdf
 * Body: { content: string (HTML body from CKEditor) }
 * Returns: PDF file as binary
 */
app.post("/api/export-pdf", async (req, res) => {
  const { content } = req.body;

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

    const htmlDocument = buildFullHtmlDocument(content);

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
