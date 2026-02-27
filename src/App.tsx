/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import {
  Alignment,
  Base64UploadAdapter,
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  FontFamily,
  FontSize,
  GeneralHtmlSupport,
  Heading,
  HorizontalLine,
  Image,
  ImageCaption,
  ImageInsert,
  ImageResize,
  ImageStyle,
  ImageToolbar,
  Indent,
  IndentBlock,
  Italic,
  Link,
  List,
  ListProperties,
  Paragraph,
  PasteFromOffice,
  RemoveFormat,
  SelectAll,
  Table,
  TableCellProperties,
  TableProperties,
  TableToolbar,
  Underline,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import "./App.css";
import "./templates/suratTugas.css";
import { wrapWithLetterhead, buildDocxHeaderHtml, buildDocxFooterHtml } from "./templates/letterhead";
import { suratTugasBody } from "./templates/suratTugasTemplate";
import { paginateLetterPages } from "./utils/paginateLetter";
import { LetterProvider } from "./context/LetterContext";
import { useLetterContext } from "./context/useLetterContext";

type Template = {
  id: string;
  name: string;
  content: string;
};
const editorPlugins = [
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  RemoveFormat,
  Alignment,
  FontFamily,
  FontSize,
  List,
  ListProperties,
  Indent,
  IndentBlock,
  BlockQuote,
  Link,
  Table,
  TableToolbar,
  TableProperties,
  TableCellProperties,
  HorizontalLine,
  GeneralHtmlSupport,
  PasteFromOffice,
  SelectAll,
  Image,
  ImageInsert,
  ImageToolbar,
  ImageCaption,
  ImageResize,
  ImageStyle,
  Base64UploadAdapter,
];

const templates: Template[] = [
  {
    id: "surat-tugas",
    name: "Undangan Sosialisasi LSP",
    content: suratTugasBody,
  },
  {
    id: "undangan-rapat",
    name: "Undangan Rapat",
    content: `
      <p><strong>Nomor</strong>: 01/UND/II/2026</p>
      <p><strong>Perihal</strong>: Undangan Rapat Koordinasi</p>
      <p><br /></p>
      <p>Kepada Yth.</p>
      <p>Tim Operasional</p>
      <p>Di Tempat</p>
      <p><br /></p>
      <p>Dengan hormat,</p>
      <p>Sehubungan dengan persiapan program baru, kami mengundang Bapak/Ibu untuk hadir pada rapat koordinasi yang akan dilaksanakan pada:</p>
      <ul>
        <li><strong>Hari/Tanggal</strong>: Senin, 24 Februari 2026</li>
        <li><strong>Waktu</strong>: 09.00 - 11.00 WIB</li>
        <li><strong>Tempat</strong>: Ruang Rapat Lantai 3</li>
        <li><strong>Agenda</strong>: Sinkronisasi timeline dan kebutuhan</li>
      </ul>
      <p>Atas perhatian dan kehadirannya, kami ucapkan terima kasih.</p>
      <p><br /></p>
      <p>Hormat kami,</p>
      <p><strong>Manajer Operasional</strong></p>
      <p><br /><br /></p>
      <p>______________________</p>
    `,
  },
  {
    id: "surat-pemberitahuan",
    name: "Pemberitahuan Internal",
    content: `
      <p><strong>Nomor</strong>: 05/PBT/II/2026</p>
      <p><strong>Perihal</strong>: Pemberitahuan Pemeliharaan Sistem</p>
      <p><br /></p>
      <p>Kepada Yth.</p>
      <p>Seluruh Karyawan</p>
      <p>Di Tempat</p>
      <p><br /></p>
      <p>Dengan hormat,</p>
      <p>Berikut kami informasikan akan dilakukan pemeliharaan sistem pada:</p>
      <ul>
        <li><strong>Hari/Tanggal</strong>: Sabtu, 1 Maret 2026</li>
        <li><strong>Waktu</strong>: 20.00 - 23.00 WIB</li>
        <li><strong>Dampak</strong>: Akses aplikasi internal akan terbatas</li>
      </ul>
      <p>Mohon menyesuaikan rencana pekerjaan dan pastikan data penting telah di-backup sebelum waktu tersebut.</p>
      <p><br /></p>
      <p>Terima kasih atas pengertiannya.</p>
      <p><br /></p>
      <p>Salam,</p>
      <p><strong>Divisi IT</strong></p>
      <p><br /><br /></p>
      <p>______________________</p>
    `,
  },
];

const blankBody = "<p><br /></p>";

const MM_PER_INCH = 25.4;
const DPI = 96;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const PAGE_WIDTH_PX = (PAGE_WIDTH_MM / MM_PER_INCH) * DPI;
const PAGE_HEIGHT_PX = (PAGE_HEIGHT_MM / MM_PER_INCH) * DPI;
const PREVIEW_SCALE = 0.3;
const PREVIEW_WIDTH_PX = PAGE_WIDTH_PX * PREVIEW_SCALE;
const PREVIEW_HEIGHT_PX = PAGE_HEIGHT_PX * PREVIEW_SCALE;

const inlineImageCache = new Map<string, string>();

const toAbsoluteUrl = (src: string) => {
  if (!src) return null;
  if (/^(data:|https?:|blob:)/i.test(src)) return src;
  if (src.startsWith("//")) {
    return `${window.location.protocol}${src}`;
  }
  if (src.startsWith("/")) {
    return `${window.location.origin}${src}`;
  }
  try {
    return new URL(src, window.location.href).href;
  } catch (error) {
    console.warn("Gagal membuat URL absolut", src, error);
    return null;
  }
};

const blobToDataUrl = (blob: Blob) =>
  new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });

const inlineImageElement = async (img: HTMLImageElement) => {
  const rawSrc = img.getAttribute("src") ?? "";
  if (!rawSrc || rawSrc.startsWith("data:")) return;
  const absoluteSrc = toAbsoluteUrl(rawSrc);
  if (!absoluteSrc) return;
  if (inlineImageCache.has(absoluteSrc)) {
    img.setAttribute("src", inlineImageCache.get(absoluteSrc) ?? rawSrc);
    return;
  }

  try {
    const response = await fetch(absoluteSrc);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const blob = await response.blob();
    const dataUrl = await blobToDataUrl(blob);
    inlineImageCache.set(absoluteSrc, dataUrl);
    img.setAttribute("src", dataUrl);
  } catch (error) {
    console.warn("Gagal mengubah gambar jadi data URL", absoluteSrc, error);
  }
};

const inlineImagesInElement = async (root: HTMLElement | DocumentFragment) => {
  const images = Array.from(root.querySelectorAll?.("img") ?? []);
  await Promise.all(images.map((img) => inlineImageElement(img)));
};

const inlineImagesInHtml = async (html: string) => {
  const parser = new DOMParser();
  const doc = parser.parseFromString(html, "text/html");
  if (doc.body) {
    await inlineImagesInElement(doc.body);
    return doc.body.innerHTML;
  }
  return html;
};

const extractWordBodyHtml = (html: string) => {
  if (!html) return "<p><br /></p>";
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");
    const wordBody = doc.querySelector?.(".word-body");
    if (wordBody) {
      return wordBody.innerHTML.trim() || "<p><br /></p>";
    }

    const suratWord = doc.querySelector?.(".surat-word");
    if (suratWord) {
      return suratWord.innerHTML.trim() || "<p><br /></p>";
    }

    const bodyHtml = doc.body?.innerHTML?.trim();
    return bodyHtml && bodyHtml !== "" ? bodyHtml : "<p><br /></p>";
  } catch (error) {
    console.warn("Gagal mengekstrak word-body", error);
    return html;
  }
};

const initialBody = extractWordBodyHtml(templates[0]?.content ?? blankBody);

function AppInner() {
  const { letterCtx } = useLetterContext();
  const [bodyHtml, setBodyHtml] = useState<string>(initialBody);
  const [activeTemplate, setActiveTemplate] = useState<string>(templates[0]?.id ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const editorElementRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<any>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const bodyHtmlRef = useRef(bodyHtml);
  const externalUpdateRef = useRef(false);
  const letterCtxRef = useRef(letterCtx);
  letterCtxRef.current = letterCtx;
  const { wrappedPages, bodySegments } = useMemo(() => paginateLetterPages(bodyHtml, letterCtx), [bodyHtml, letterCtx]);

  const handleExportDocx = async () => {
    const docxHeader = buildDocxHeaderHtml(letterCtx.unit);
    const docxFooter = buildDocxFooterHtml(letterCtx.unit, letterCtx.meta, letterCtx.addresses);
    const pageSegments = bodySegments.length > 0 ? bodySegments : [bodyHtml];
    const paginatedHtml = pageSegments
      .map((segment, index) => {
        const isLast = index === pageSegments.length - 1;
        const pageBreakStyle = isLast ? "page-break-after:auto;" : "page-break-after:always;";
        return `
          <div class="surat-docx-page" style="${pageBreakStyle}">
            <div style="padding:0 0 12mm; font-family:'Times New Roman', serif; font-size:12pt; color:#1f2a37;">
              ${docxHeader}
              <div style="padding:0 15mm; min-height:120mm; line-height:1.4;">
                ${segment}
              </div>
              ${docxFooter}
            </div>
          </div>
        `;
      })
      .join("");
    const inlinedHtml = await inlineImagesInHtml(paginatedHtml);
    const payload = {
      content: inlinedHtml,
      templateId: activeTemplate || "surat-tugas",
    };

    try {
      const res = await fetch("/api/export-docx", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);

      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "surat-tugas.docx";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Gagal export DOCX via backend", err);
      alert("Export DOCX gagal. Pastikan endpoint /api/export-docx tersedia.");
    }
  };

  const handleExportPdf = async () => {
    // Send body HTML + letter context to Puppeteer backend for proper paginated PDF
    const content = bodyHtml;
    if (!content || content.trim() === "<p><br /></p>") {
      alert("Isi surat masih kosong.");
      return;
    }

    try {
      const res = await fetch("/api/export-pdf", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content, letterCtx }),
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.error || `Status ${res.status}`);
      }

      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "surat.pdf";
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Gagal export PDF via backend", err);
      alert("Export PDF gagal. Pastikan server PDF berjalan (npm run server).");
    }
  };

  const toolbar = useMemo(
    () => [
      "undo",
      "redo",
      "|",
      "heading",
      "fontFamily",
      "fontSize",
      "|",
      "bold",
      "italic",
      "underline",
      "removeFormat",
      "|",
      "alignment",
      "outdent",
      "indent",
      "|",
      "bulletedList",
      "numberedList",
      "|",
      "link",
      "blockQuote",
      "horizontalLine",
      "insertTable",
      "insertImage",
      "selectAll",
    ],
    [],
  );

  const editorConfig = useMemo(
    () => ({
      plugins: editorPlugins,
      toolbar,
      placeholder: "Tulis surat di sini...",
      fontFamily: {
        options: ["default", "Times New Roman, Times, serif", "Calibri, sans-serif", "Cambria, Georgia, serif", "Arial, Helvetica, sans-serif"],
        supportAllValues: true,
      },
      fontSize: {
        options: [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48],
        supportAllValues: true,
      },
      alignment: {
        options: ["left", "center", "right", "justify"],
      },
      list: {
        properties: {
          styles: true,
          startIndex: true,
          reversed: true,
        },
      },
      table: {
        contentToolbar: ["tableColumn", "tableRow", "mergeTableCells", "tableProperties", "tableCellProperties"],
      },
      image: {
        toolbar: ["imageStyle:inline", "imageStyle:block", "imageStyle:side", "|", "toggleImageCaption", "imageTextAlternative"],
        insert: {
          type: "auto",
        },
      },
      htmlSupport: {
        allow: [
          {
            name: /.*?/,
            classes: true,
            styles: true,
            attributes: true,
          },
        ],
      },
      licenseKey: "GPL",
    }),
    [toolbar],
  );

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!editorElementRef.current) return;

      try {
        const editor = await ClassicEditor.create(editorElementRef.current, editorConfig);

        if (!isMounted) return;

        editor.setData(wrapWithLetterhead(bodyHtmlRef.current, letterCtxRef.current));
        editor.model.document.on("change:data", () => {
          const data = editor.getData();
          const normalizedBody = extractWordBodyHtml(data);
          if (normalizedBody !== bodyHtmlRef.current) {
            bodyHtmlRef.current = normalizedBody;
            setBodyHtml(normalizedBody);
          }
        });

        editorInstanceRef.current = editor;
        setLoading(false);
      } catch (err) {
        console.error("Gagal memuat CKEditor", err);
        if (isMounted) {
          setError("Editor gagal dimuat. Muat ulang halaman atau cek konsol.");
          setLoading(false);
        }
      }
    };

    init();

    return () => {
      isMounted = false;
      const instance = editorInstanceRef.current;
      if (instance) {
        instance.destroy().catch(() => {});
        editorInstanceRef.current = null;
      }
    };
  }, [editorConfig]);

  useEffect(() => {
    bodyHtmlRef.current = bodyHtml;
    if (!externalUpdateRef.current) {
      return;
    }
    externalUpdateRef.current = false;
    const instance = editorInstanceRef.current;
    if (!instance) return;
    const target = wrapWithLetterhead(bodyHtml, letterCtx);
    const current = instance.getData();
    if (current.trim() !== target.trim()) {
      instance.setData(target);
    }
  }, [bodyHtml, letterCtx]);

  const handleTemplateSelect = (templateId: string) => {
    const selected = templates.find((tpl) => tpl.id === templateId);
    if (!selected) return;

    setActiveTemplate(templateId);
    externalUpdateRef.current = true;
    setBodyHtml(extractWordBodyHtml(selected.content));
  };

  const handleClear = () => {
    setActiveTemplate("");
    externalUpdateRef.current = true;
    setBodyHtml("<p><br /></p>");
  };

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Surat Hub</p>
          <h1>Editor surat dengan format kertas</h1>
          <p className="lede">Tulis, edit, dan suntik template surat langsung di aplikasi tanpa perlu membuka editor lain.</p>
        </div>
        <div className="header-actions">
          <button className="ghost" type="button" onClick={handleExportPdf}>
            Export PDF
          </button>
          <button className="ghost" type="button" onClick={handleExportDocx}>
            Export DOCX (with header/footer)
          </button>
          <button
            className="ghost"
            type="button"
            onClick={() => {
              console.log("Dummy POST payload", {
                template: activeTemplate,
                content: wrapWithLetterhead(bodyHtml, letterCtx),
                letterCtx,
              });
              alert("Simulasi kirim ke backend (cek console untuk payload)");
            }}
          >
            Simulasi kirim (dummy)
          </button>
          <button className="ghost" type="button" onClick={handleClear} aria-label="Bersihkan isi editor">
            Bersihkan
          </button>
        </div>
      </header>

      <section className="panel">
        <div className="panel-title">Template cepat</div>
        <div className="template-actions">
          {templates.map((template) => (
            <button key={template.id} className={`template-button${activeTemplate === template.id ? " is-active" : ""}`} type="button" onClick={() => handleTemplateSelect(template.id)}>
              {template.name}
            </button>
          ))}
          <button className="template-button" type="button" onClick={handleClear}>
            Template kosong
          </button>
        </div>
      </section>

      <section className="editor-wrapper">
        <div className="paper" ref={paperRef}>
          {error && <div className="editor-error">{error}</div>}
          {loading && !error && <p className="editor-loading">Memuat editor...</p>}
          <div ref={editorElementRef} className={`editor-host${loading ? " is-loading" : ""}`} aria-label="Editor surat" />
        </div>
        <div className="sidebar-stack">
          <div className="preview-panel">
            <p className="note-title">Pratinjau A4</p>
            <div className="preview-pages-mini">
              {wrappedPages.map((pageHtml, index) => (
                <div key={`preview-page-${index}`} className="preview-page">
                  <div className="preview-page__shell" style={{ width: `${PREVIEW_WIDTH_PX}px`, height: `${PREVIEW_HEIGHT_PX}px` }}>
                    <div
                      className="preview-page__inner ck-content"
                      style={{
                        width: `${PAGE_WIDTH_PX}px`,
                        height: `${PAGE_HEIGHT_PX}px`,
                        transform: `scale(${PREVIEW_SCALE})`,
                        transformOrigin: "top left",
                      }}
                      dangerouslySetInnerHTML={{ __html: pageHtml }}
                    />
                  </div>
                  <span className="preview-page__label">Halaman {index + 1}</span>
                </div>
              ))}
            </div>
          </div>
          <div className="side-notes">
            <p className="note-title">Catatan</p>
            <ul>
              <li>Kertas terkunci pada ukuran A4 (210 × 297mm).</li>
              <li>Header dan footer otomatis disuntik setiap halaman.</li>
              <li>Gunakan tombol template untuk mengganti isi dengan cepat.</li>
            </ul>
          </div>
        </div>
        <div className="export-wrapper" aria-hidden="true">
          <div className="export-pages" ref={exportRef}>
            {wrappedPages.map((pageHtml, index) => (
              <div key={`export-page-${index}`} className="export-paper ck-content" dangerouslySetInnerHTML={{ __html: pageHtml }} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
}

/** Wrap AppInner with LetterProvider so all children can access/modify letter context */
function App() {
  return (
    <LetterProvider>
      <AppInner />
    </LetterProvider>
  );
}

export default App;
