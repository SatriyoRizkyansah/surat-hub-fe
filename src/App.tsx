/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
import { marked } from "marked";
import {
  Alignment,
  BlockQuote,
  Bold,
  ClassicEditor,
  Essentials,
  FontFamily,
  FontSize,
  GeneralHtmlSupport,
  Heading,
  HorizontalLine,
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
  Markdown,
} from "ckeditor5";
import "ckeditor5/ckeditor5.css";
import "./App.css";
import "./templates/suratTugas.css";
import { suratTugasBody, suratTugasFooter, suratTugasHeader } from "./templates/suratTugasTemplate";

type Template = {
  id: string;
  name: string;
  content: string;
};

type PenandatanganInfo = {
  jabatan: string;
  nama: string;
  nip: string;
};

type SuratMetadata = {
  nomor: string;
  tanggal: string;
  unit: string;
  penandatangan: PenandatanganInfo;
};

const MARKDOWN_OPTIONS = {
  gfm: true,
  breaks: true,
  headerIds: false,
  mangle: false,
};

const convertMarkdownToHtml = (markdown: string) => {
  if (!markdown?.trim()) {
    return "<p></p>";
  }

  const parsed = marked.parse(markdown, MARKDOWN_OPTIONS);
  return typeof parsed === "string" ? parsed : parsed.toString();
};

const formatIndonesianDate = (input: Date | string) => {
  const date = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date);
};

const defaultMetadata: SuratMetadata = {
  nomor: "012/UND/LSP/II/2026",
  tanggal: formatIndonesianDate(new Date()),
  unit: "Lembaga Sertifikasi Profesi",
  penandatangan: {
    jabatan: "Kepala Lembaga Sertifikasi Profesi",
    nama: "Dr. Nur Azizah, S.Kom., M.M.",
    nip: "19790821 200801 2 002",
  },
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:5000";

const downloadBlob = (blob: Blob, filename: string) => {
  const link = document.createElement("a");
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
};

const buildMetadataBlock = (meta: SuratMetadata) => `
  <div class="word-meta">
    <p><span>Nomor</span>: ${meta.nomor || "-"}</p>
    <p><span>Tanggal</span>: ${meta.tanggal || "-"}</p>
    <p><span>Unit</span>: ${meta.unit || "-"}</p>
  </div>
`;

const buildSignatureBlock = (meta: SuratMetadata) => `
  <div class="word-signature">
    <p>${meta.tanggal ? `Pamulang, ${meta.tanggal}` : ""}</p>
    <p><strong>${meta.penandatangan.jabatan || ""}</strong></p>
    <div class="word-signature__space"></div>
    <p class="word-signature__name">${meta.penandatangan.nama || ""}</p>
    <p class="word-signature__id">NIP. ${meta.penandatangan.nip || "-"}</p>
  </div>
`;
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
  Markdown,
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
**Nomor**: 01/UND/II/2026
**Perihal**: Undangan Rapat Koordinasi

Kepada Yth.
Tim Operasional
Di Tempat

Dengan hormat,

Sehubungan dengan persiapan program baru, kami mengundang Bapak/Ibu untuk hadir pada rapat koordinasi yang akan dilaksanakan pada:

- **Hari/Tanggal**: Senin, 24 Februari 2026
- **Waktu**: 09.00 - 11.00 WIB
- **Tempat**: Ruang Rapat Lantai 3
- **Agenda**: Sinkronisasi timeline dan kebutuhan

Atas perhatian dan kehadirannya, kami ucapkan terima kasih.

Hormat kami,

**Manajer Operasional**

______________________
    `,
  },
  {
    id: "surat-pemberitahuan",
    name: "Pemberitahuan Internal",
    content: `
**Nomor**: 05/PBT/II/2026
**Perihal**: Pemberitahuan Pemeliharaan Sistem

Kepada Yth.
Seluruh Karyawan
Di Tempat

Dengan hormat,

Berikut kami informasikan akan dilakukan pemeliharaan sistem pada:

- **Hari/Tanggal**: Sabtu, 1 Maret 2026
- **Waktu**: 20.00 - 23.00 WIB
- **Dampak**: Akses aplikasi internal akan terbatas

Mohon menyesuaikan rencana pekerjaan dan pastikan data penting telah di-backup sebelum waktu tersebut.

Terima kasih atas pengertiannya.

Salam,

**Divisi IT**

______________________
    `,
  },
];

const buildSuratTugasHtml = (body: string, meta: SuratMetadata, options?: { includeChrome?: boolean }) => {
  const includeChrome = options?.includeChrome ?? true;
  const cleanedBody = body.includes("word-content") ? body : `<div class="word-content">${body}</div>`;
  return `
    <div class="surat-tugas surat-word">
      ${includeChrome ? suratTugasHeader : ""}
      ${buildMetadataBlock(meta)}
      ${cleanedBody}
      ${buildSignatureBlock(meta)}
      ${includeChrome ? suratTugasFooter : ""}
    </div>
  `;
};

function App() {
  const [content, setContent] = useState<string>(templates[0]?.content ?? "");
  const [activeTemplate, setActiveTemplate] = useState<string>(templates[0]?.id ?? "");
  const [suratMeta, setSuratMeta] = useState<SuratMetadata>(defaultMetadata);
  const [metaLoading, setMetaLoading] = useState(true);
  const [metadataError, setMetadataError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [docxLoading, setDocxLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const editorElementRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<any>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const loadMetadata = useCallback(async () => {
    setMetaLoading(true);
    setMetadataError(null);
    try {
      const res = await fetch(`${API_BASE_URL}/api/surat/metadata/preview`);
      if (!res.ok) throw new Error(`Status ${res.status}`);
      const data = await res.json();
      setSuratMeta({
        nomor: data.no_surat,
        tanggal: data.tanggal_terbit,
        unit: data.unit_pengirim,
        penandatangan: {
          jabatan: data.penandatangan?.jabatan ?? defaultMetadata.penandatangan.jabatan,
          nama: data.penandatangan?.nama ?? defaultMetadata.penandatangan.nama,
          nip: data.penandatangan?.nip ?? defaultMetadata.penandatangan.nip,
        },
      });
    } catch (err) {
      console.error("Gagal memuat metadata surat", err);
      setMetadataError("Tidak dapat memuat metadata otomatis, gunakan nilai default sementara.");
    } finally {
      setMetaLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMetadata();
  }, [loadMetadata]);

  const renderedContentHtml = useMemo(() => convertMarkdownToHtml(content), [content]);

  const handleExportDocx = async () => {
    if (metaLoading) return;
    const filename = `${activeTemplate || "surat"}.docx`;

    const payload = {
      templateId: activeTemplate || "surat-tugas",
      contentMarkdown: content,
      contentHtml: renderedContentHtml,
    };

    setDocxLoading(true);
    try {
      const res = await fetch(`${API_BASE_URL}/api/export-docx`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(`Status ${res.status}`);

      const blob = await res.blob();
      downloadBlob(blob, filename);
    } catch (err) {
      console.error("Gagal membangun DOCX", err);
      alert(`Export DOCX gagal. Pastikan backend jalan di ${API_BASE_URL} atau coba lagi nanti.`);
    } finally {
      setDocxLoading(false);
    }
  };

  const handleExportPdf = () => {
    const element = exportRef.current;
    if (!element) return;

    html2pdf()
      .from(element)
      .set({
        margin: 0,
        filename: "surat-tugas.pdf",
        image: { type: "jpeg", quality: 0.98 },
        html2canvas: { scale: 2 },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait" },
      })
      .save();
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
        options: [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24],
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
      htmlSupport: {
        allow: [
          {
            name: /.*?/,
            classes: true,
            styles: true,
          },
        ],
      },
      licenseKey: "GPL",
    }),
    [toolbar],
  );

  const exportHtml = activeTemplate === "surat-tugas" ? buildSuratTugasHtml(renderedContentHtml, suratMeta) : renderedContentHtml;

  const exportButtonLabel = docxLoading ? "Sedang menyiapkan DOCX..." : metaLoading ? "Menunggu metadata..." : "Export DOCX (backend)";
  const isExportDisabled = docxLoading || metaLoading;

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!editorElementRef.current) return;

      try {
        const editor = await ClassicEditor.create(editorElementRef.current, editorConfig);

        if (!isMounted) return;

        editor.setData(content);
        editor.model.document.on("change:data", () => {
          const data = editor.getData();
          setContent(data);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editorConfig]);

  useEffect(() => {
    const instance = editorInstanceRef.current;
    if (!instance) return;
    if (instance.getData() !== content) {
      instance.setData(content);
    }
  }, [content]);

  const handleTemplateSelect = (templateId: string) => {
    const selected = templates.find((tpl) => tpl.id === templateId);
    if (!selected) return;

    setActiveTemplate(templateId);
    setContent(selected.content);
  };

  const handleClear = () => {
    setActiveTemplate("");
    setContent("");
    setSuratMeta(defaultMetadata);
    loadMetadata();
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
            Export PDF (frontend)
          </button>
          <button className="ghost" type="button" onClick={handleExportDocx} disabled={isExportDisabled} aria-busy={isExportDisabled}>
            {exportButtonLabel}
          </button>
          <button
            className="ghost"
            type="button"
            onClick={() => {
              console.log("Dummy POST payload", {
                template: activeTemplate,
                contentMarkdown: content,
                contentHtml: renderedContentHtml,
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

      <section className="panel">
        <div className="panel-title">Detail surat otomatis</div>
        {metadataError && <p className="meta-error">{metadataError}</p>}
        <div className="meta-grid meta-grid--readonly">
          <div className="meta-field">
            <span>Nomor Surat</span>
            <p className="meta-value" aria-live="polite">
              {metaLoading ? "Memuat..." : suratMeta.nomor || "-"}
            </p>
          </div>
          <div className="meta-field">
            <span>Tanggal Terbit</span>
            <p className="meta-value">{metaLoading ? "Memuat..." : suratMeta.tanggal || "-"}</p>
          </div>
          <div className="meta-field">
            <span>Unit Pengirim</span>
            <p className="meta-value">{metaLoading ? "Memuat..." : suratMeta.unit || "-"}</p>
          </div>
          <div className="meta-field">
            <span>Penandatangan</span>
            <p className="meta-value">{metaLoading ? "Memuat..." : suratMeta.penandatangan.jabatan}</p>
          </div>
          <div className="meta-field">
            <span>Nama</span>
            <p className="meta-value">{metaLoading ? "Memuat..." : suratMeta.penandatangan.nama}</p>
          </div>
          <div className="meta-field">
            <span>NIP</span>
            <p className="meta-value">{metaLoading ? "Memuat..." : suratMeta.penandatangan.nip}</p>
          </div>
        </div>
        <div className="meta-actions">
          <button className="ghost" type="button" onClick={loadMetadata} disabled={metaLoading} aria-busy={metaLoading}>
            {metaLoading ? "Memuat metadata..." : "Perbarui metadata"}
          </button>
        </div>
      </section>

      <section className="editor-wrapper">
        <div className="paper" ref={paperRef}>
          {error && <div className="editor-error">{error}</div>}
          {loading && !error && <p className="editor-loading">Memuat editor...</p>}
          <div ref={editorElementRef} className={`editor-host${loading ? " is-loading" : ""}`} aria-label="Editor surat" />
        </div>
        <div className="side-notes">
          <p className="note-title">Catatan</p>
          <ul>
            <li>Kertas mengikuti rasio A4 (210mm x 297mm) dengan margin.</li>
            <li>Kamu bisa mengganti isi dengan tombol template di atas.</li>
            <li>Integrasi backend nantinya bisa memuat template sebagai HTML.</li>
          </ul>
        </div>
        <div className="export-wrapper" aria-hidden="true">
          <div className="export-paper ck-content" ref={exportRef} dangerouslySetInnerHTML={{ __html: exportHtml }} />
        </div>
      </section>
    </div>
  );
}

export default App;
