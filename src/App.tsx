/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import html2pdf from "html2pdf.js";
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

function App() {
  const [content, setContent] = useState<string>(templates[0]?.content ?? "");
  const [activeTemplate, setActiveTemplate] = useState<string>(templates[0]?.id ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const editorElementRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<any>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);

  const buildSuratTugasExportHtml = (body: string) => {
    const hasWrapper = body.includes('class="surat-tugas"');
    if (hasWrapper) {
      return body.replace('<div class="surat-tugas">', `<div class="surat-tugas">${suratTugasHeader}`).replace(/<\/div>\s*$/, `${suratTugasFooter}</div>`);
    }

    return `<div class="surat-tugas">${suratTugasHeader}${body}${suratTugasFooter}</div>`;
  };

  const handleExportDocx = async () => {
    const payload = {
      content,
      header: {
        html: `
          <div style="font-family:'Times New Roman', serif; color:#001f5f; text-align:center;">
            <div style="display:flex; gap:6px; margin-bottom:8px;">
              <span style="flex:1; height:6px; background:#c00000; border-radius:999px; display:block;"></span>
              <span style="flex:1; height:6px; background:#ffc000; border-radius:999px; display:block;"></span>
              <span style="flex:1; height:6px; background:#001f5f; border-radius:999px; display:block;"></span>
            </div>
            <div style="display:flex; align-items:center; justify-content:space-between; gap:16px;">
              <img src="/assets/logo/logo-kiri.svg" style="width:110px; height:110px; object-fit:contain;" />
              <div style="flex:1;">
                <div style="font-weight:700; letter-spacing:0.5px;">YAYASAN SASMITA JAYA</div>
                <div style="font-weight:700; font-size:22px; letter-spacing:1px;">UNIVERSITAS PAMULANG</div>
                <div style="font-weight:700; font-size:14px; margin-top:4px;">LEMBAGA SERTIFIKASI PROFESI</div>
                <div style="font-style:italic; font-weight:700; margin-top:2px;">“LEMBAGA SERTIFIKASI PROFESI”</div>
              </div>
              <img src="/assets/logo/logo-kanan.svg" style="width:130px; height:130px; object-fit:contain;" />
            </div>
            <div style="margin-top:8px;">
              <div style="border-top:2px solid #001f5f; margin:2px auto; width:90%;"></div>
              <div style="border-top:4px solid #001f5f; margin:2px auto; width:90%;"></div>
            </div>
          </div>
        `,
        height: 120,
      },
      footer: {
        html: `
          <div style="font-family:'Times New Roman', serif; font-size:9pt; color:#1f385f; border-top:2px solid #001f5f; padding-top:6px;">
            <div>
              <div><strong>Kampus 1.</strong> Jl. Surya Kencana No.1, Pamulang, Kota Tangerang Selatan, Banten 15417</div>
              <div><strong>Kampus 2.</strong> Jl. Raya Puspitek No.46, Serpong, Kota Tangerang Selatan, Banten 15316</div>
              <div><strong>Kampus 3.</strong> Jl. Witana Harja No.18B, Pamulang, Kota Tangerang Selatan, Banten 15417</div>
              <div><strong>Kampus 4.</strong> Jl. Raya Jakarta-Serang, Walantaka, Kota Serang, Banten 42183</div>
            </div>
            <div style="margin-top:4px; display:flex; flex-wrap:wrap; gap:8px;">
              <span><strong>E.</strong> lsp@unpam.ac.id</span>
              <span>|</span>
              <span><strong>Web.</strong> www.lsp.unpam.ac.id</span>
              <span>|</span>
              <span><strong>IG.</strong> @lsp_unpam</span>
            </div>
          </div>
        `,
        height: 100,
      },
      pageSize: "A4",
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

  const exportHtml = useMemo(() => {
    if (activeTemplate === "surat-tugas") {
      return buildSuratTugasExportHtml(content);
    }
    return content;
  }, [activeTemplate, content]);

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
          <button className="ghost" type="button" onClick={handleExportDocx}>
            Export DOCX (with header/footer)
          </button>
          <button
            className="ghost"
            type="button"
            onClick={() => {
              console.log("Dummy POST payload", {
                template: activeTemplate,
                content,
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
