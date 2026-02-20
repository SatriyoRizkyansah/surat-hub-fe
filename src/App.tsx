/* eslint-disable @typescript-eslint/ban-ts-comment */
/* eslint-disable @typescript-eslint/no-explicit-any */
// @ts-nocheck
import { useEffect, useMemo, useRef, useState } from "react";
import ClassicEditor from "@ckeditor/ckeditor5-build-classic";
import "ckeditor5/ckeditor5.css";
import "./App.css";
import "./templates/suratTugas.css";

type Template = {
  id: string;
  name: string;
  content: string;
};

const templates: Template[] = [
  {
    id: "surat-tugas",
    name: "Surat Tugas (A4)",
    content: `
      <div class="surat-tugas">
        <div class="st-header">
          <div class="st-logo-box">
            <img class="st-logo" src="/assets/logo/logo-kiri.svg" alt="Logo kiri" />
          </div>
          <div class="st-title">
            <p class="st-line-top"></p>
            <p class="st-sasmitajaya">YAYASAN SASMITA JAYA</p>
            <h2>UNIVERSITAS PAMULANG</h2>
            <p class="st-lembaga">LEMBAGA PENELITIAN DAN PENGABDIAN KEPADA MASYARAKAT</p>
            <p class="st-line-bottom"></p>
          </div>
          <div class="st-logo-box">
            <img class="st-logo" src="/assets/logo/logo-kanan.svg" alt="Logo kanan" />
          </div>
        </div>

        <div class="st-subhead">
          <span class="st-small">Kampus: Jl. Surya Kencana No.1, Pamulang, Tangerang Selatan</span>
        </div>

        <div class="st-divider"></div>

        <p class="st-heading">SURAT TUGAS</p>
        <p class="st-sub">Nomor : {{nomor_surat}}</p>

        <div class="st-body">
          <p>Dekan Fakultas Ekonomi dan Bisnis Universitas Pamulang menugaskan kepada:</p>
          <table>
            <tr><td class="st-label">Nama</td><td>: {{nama_dosen}}</td></tr>
            <tr><td class="st-label">NIDN/NIDK</td><td>: {{nidn}}</td></tr>
            <tr><td class="st-label">Jabatan</td><td>: {{jabatan}}</td></tr>
          </table>

          <p>Untuk melaksanakan tugas sebagai Pembimbing Penulisan Tugas Akhir (TA), Skripsi, Tesis kepada:</p>
          <table>
            <tr><td class="st-label">Nama</td><td>: {{nama_mahasiswa}}</td></tr>
            <tr><td class="st-label">NIM</td><td>: {{nim}}</td></tr>
            <tr><td class="st-label">Fakultas/Prodi</td><td>: {{prodi}}</td></tr>
            <tr><td class="st-label">Judul Tugas Akhir</td><td>: {{judul_ta}}</td></tr>
          </table>

          <p>Surat tugas ini dibuat untuk dilaksanakan dengan penuh tanggung jawab dan membuat laporan.</p>

          <div class="st-sign">
            <div class="st-sign-inner">
              <p>Pamulang, {{tanggal}}</p>
              <p>a.n. Dekan,</p>
              <p class="st-sign-space">__________________________</p>
              <p class="st-sign-name">{{penandatangan}}</p>
              <p class="st-sign-nip">{{nip_penandatangan}}</p>
            </div>
          </div>
        </div>

        <div class="st-footer">
          <div class="st-footer-inner">
            <div class="st-footer-text">
              <p><strong>Kampus 1.</strong> Jl. Surya Kencana No.1, Pamulang, Kota Tangerang Selatan, Banten 15417</p>
              <p><strong>Kampus 2.</strong> Jl. Raya Puspitek No.11, Serpong, Kota Tangerang Selatan, Banten 15316</p>
              <p><strong>Kampus 3.</strong> Jl. Witana Harja No 18, Pamulang, Kota Tangerang Selatan, Banten 15417</p>
              <p><strong>Kampus 4.</strong> Jl. Raya Jakarta Km 8 No.6, Kelapa Dua, Kab. Tangerang, Banten 15810</p>
              <p>Email: humas@unpam.ac.id &nbsp;|&nbsp; Helpdesk: helpdesk.unpam.ac.id &nbsp;|&nbsp; www.unpam.ac.id</p>
            </div>
            <div class="st-footer-qr">QR</div>
          </div>
        </div>
      </div>
    `,
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

  const toolbar = useMemo(() => ["heading", "|", "bold", "italic", "link", "|", "bulletedList", "numberedList", "|", "blockQuote", "insertTable", "|", "undo", "redo"], []);

  useEffect(() => {
    let isMounted = true;

    const init = async () => {
      if (!editorElementRef.current) return;

      try {
        const editor = await ClassicEditor.create(editorElementRef.current, {
          toolbar,
          placeholder: "Tulis surat di sini...",
          htmlSupport: {
            allow: [
              {
                name: /.*?/,
                attributes: true,
                classes: true,
                styles: true,
              },
            ],
          },
          // CKEditor 5 predefined build needs a license key value; "GPL" is valid for open-source usage.
          licenseKey: "GPL",
        });

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
  }, [toolbar]);

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
        <div className="paper">
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
      </section>
    </div>
  );
}

export default App;
