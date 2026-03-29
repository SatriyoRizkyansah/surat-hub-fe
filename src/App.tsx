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

type AuthTokenItem = {
  role: string;
  access_token: string;
  hak_akses?: string;
};

type ApiResponse<T> = {
  status?: number;
  message?: string;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total_datas: number;
    total_pages: number;
  };
};

type MstKategoriSurat = {
  id: string;
  nama_kategori: string;
  kode_kategori: string;
  jenis_surat: string;
};

type MstKodeMasalah = {
  id: string;
  kode_masalah: string;
  deskripsi?: string | null;
};

type SuratListItem = {
  id: string;
  perihal: string;
  nomor_surat?: string | null;
  created_at?: string;
};

type SuratFormState = {
  idKategoriSurat: string;
  idKodeMasalah: string;
  perihal: string;
  pengirimExternal: string;
  jenisSurat: string;
  prioritas: string;
};

type DistribusiItem = {
  kdLembaga: string;
  kdSubLembaga: string;
  instruksi: string;
};

type AlertType = "info" | "success" | "error";

type AlertItem = {
  id: string;
  type: AlertType;
  message: string;
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

const API_BASE = "http://localhost:3000";

const buildApiUrl = (baseUrl: string, path: string) => {
  const safeBase = (baseUrl || window.location.origin).trim();
  const normalizedBase = safeBase.endsWith("/") ? safeBase : `${safeBase}/`;
  const normalizedPath = path.startsWith("/") ? path.slice(1) : path;
  return new URL(normalizedPath, normalizedBase).toString();
};

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
  const { letterCtx, setMeta } = useLetterContext();
  const [bodyHtml, setBodyHtml] = useState<string>(initialBody);
  const [activeTemplate, setActiveTemplate] = useState<string>(templates[0]?.id ?? "");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const [autoSaveStatus, setAutoSaveStatus] = useState<string | null>(null);
  const [isAutoSaving, setIsAutoSaving] = useState(false);
  const [loginUsername, setLoginUsername] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [tokenOptions, setTokenOptions] = useState<AuthTokenItem[]>([]);
  const [authToken, setAuthToken] = useState(() => localStorage.getItem("suratHub.token") || "");
  const [authRole, setAuthRole] = useState(() => localStorage.getItem("suratHub.role") || "");
  const [alerts, setAlerts] = useState<AlertItem[]>([]);
  const [kategoriList, setKategoriList] = useState<MstKategoriSurat[]>([]);
  const [kodeMasalahList, setKodeMasalahList] = useState<MstKodeMasalah[]>([]);
  const [suratList, setSuratList] = useState<SuratListItem[]>([]);
  const [selectedSuratId, setSelectedSuratId] = useState("");
  const [suratForm, setSuratForm] = useState<SuratFormState>({
    idKategoriSurat: "",
    idKodeMasalah: "",
    perihal: "",
    pengirimExternal: "",
    jenisSurat: "KELUAR",
    prioritas: "SEDANG",
  });
  const [distribusiItems, setDistribusiItems] = useState<DistribusiItem[]>([{ kdLembaga: "", kdSubLembaga: "", instruksi: "" }]);
  const editorElementRef = useRef<HTMLDivElement | null>(null);
  const editorInstanceRef = useRef<any>(null);
  const paperRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const bodyHtmlRef = useRef(bodyHtml);
  const externalUpdateRef = useRef(false);
  const autoSaveTimerRef = useRef<number | null>(null);
  const letterCtxRef = useRef(letterCtx);
  letterCtxRef.current = letterCtx;
  const { wrappedPages, bodySegments } = useMemo(() => paginateLetterPages(bodyHtml, letterCtx), [bodyHtml, letterCtx]);

  const applyNomorPlaceholder = (content: string, nomorSurat: string) => {
    if (!content || !nomorSurat) return content;
    return content.replace(/\{\{nomor_surat\}\}/gi, nomorSurat);
  };

  const pushAlert = (type: AlertType, message: string) => {
    const id = `${Date.now()}-${Math.random().toString(16).slice(2)}`;
    setAlerts((prev) => [...prev, { id, type, message }]);
    window.setTimeout(() => {
      setAlerts((prev) => prev.filter((item) => item.id !== id));
    }, 4200);
  };

  const apiFetchJson = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (!headers.has("Content-Type") && options.method && options.method !== "GET") {
      headers.set("Content-Type", "application/json");
    }
    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }
    const res = await fetch(buildApiUrl(API_BASE, path), { ...options, headers });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
    }
    return data as ApiResponse<any>;
  };

  const apiFetchBlob = async (path: string, options: RequestInit = {}) => {
    const headers = new Headers(options.headers || {});
    if (authToken) {
      headers.set("Authorization", `Bearer ${authToken}`);
    }
    const res = await fetch(buildApiUrl(API_BASE, path), { ...options, headers });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data?.message || data?.error || `HTTP ${res.status}`);
    }
    return res.blob();
  };

  const loadMasterData = async () => {
    const [kategoriRes, kodeRes] = await Promise.all([apiFetchJson("/api/mst-surat/get-daftar-kategori-surat"), apiFetchJson("/api/mst-surat/get-daftar-kode-masalah")]);
    setKategoriList(kategoriRes.data || []);
    setKodeMasalahList(kodeRes.data || []);
  };

  const loadSuratList = async () => {
    const res = await apiFetchJson("/api/surat/dibuat?page=1&limit=10");
    setSuratList(res.data || []);
  };

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
    if (!authToken) {
      return () => {
        const instance = editorInstanceRef.current;
        if (instance) {
          instance.destroy().catch(() => {});
          editorInstanceRef.current = null;
        }
      };
    }

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

    // test

    init();

    return () => {
      isMounted = false;
      const instance = editorInstanceRef.current;
      if (instance) {
        instance.destroy().catch(() => {});
        editorInstanceRef.current = null;
      }
    };
  }, [editorConfig, authToken]);

  useEffect(() => {
    if (authToken) {
      localStorage.setItem("suratHub.token", authToken);
    }
    if (authRole) {
      localStorage.setItem("suratHub.role", authRole);
    }
  }, [authToken, authRole]);

  useEffect(() => {
    if (!authToken) return;
    loadMasterData()
      .then(() => loadSuratList())
      .catch((err) => {
        pushAlert("error", err.message || "Gagal memuat data master");
      });
  }, [authToken]);

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

  useEffect(() => {
    if (!autoSaveEnabled || !selectedSuratId) return;
    if (autoSaveTimerRef.current) {
      window.clearTimeout(autoSaveTimerRef.current);
    }
    setAutoSaveStatus("Menunggu perubahan...");
    autoSaveTimerRef.current = window.setTimeout(async () => {
      try {
        setIsAutoSaving(true);
        setAutoSaveStatus("Menyimpan otomatis...");
        const content = bodyHtmlRef.current;
        await apiFetchJson(`/api/surat/${selectedSuratId}`, {
          method: "PATCH",
          body: JSON.stringify({
            content,
            perihal: suratForm.perihal || undefined,
            pengirimExternal: suratForm.pengirimExternal || undefined,
          }),
        });
        setAutoSaveStatus("Tersimpan");
      } catch (err: any) {
        setAutoSaveStatus(err.message || "Autosave gagal");
      } finally {
        setIsAutoSaving(false);
      }
    }, 1200);

    return () => {
      if (autoSaveTimerRef.current) {
        window.clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [bodyHtml, suratForm.perihal, suratForm.pengirimExternal, autoSaveEnabled, selectedSuratId, authToken]);

  const handleTemplateSelect = (templateId: string) => {
    const selected = templates.find((tpl) => tpl.id === templateId);
    if (!selected) return;

    setActiveTemplate(templateId);
    setMeta({ templateId: templateId });
    externalUpdateRef.current = true;
    setBodyHtml(extractWordBodyHtml(selected.content));
  };

  const handleClear = () => {
    setActiveTemplate("");
    setMeta({ templateId: "" });
    externalUpdateRef.current = true;
    setBodyHtml("<p><br /></p>");
  };

  const handleLogin = async () => {
    if (!loginUsername || !loginPassword) {
      pushAlert("error", "Username dan password harus diisi");
      return;
    }
    try {
      const res = await apiFetchJson("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ username: loginUsername, password: loginPassword }),
      });
      const tokens = (res.data?.tokens || []) as AuthTokenItem[];
      setTokenOptions(tokens);
      if (tokens.length > 0) {
        setAuthToken(tokens[0].access_token);
        setAuthRole(tokens[0].role || "");
        pushAlert("success", "Login berhasil. Pilih role bila perlu.");
      } else {
        setAuthToken("");
        setAuthRole("");
        pushAlert("error", "Login berhasil, tapi token tidak ditemukan");
      }
    } catch (err: any) {
      pushAlert("error", err.message || "Login gagal");
    }
  };

  const handleSelectToken = (tokenValue: string) => {
    const found = tokenOptions.find((item) => item.access_token === tokenValue);
    setAuthToken(tokenValue);
    setAuthRole(found?.role || "");
    if (tokenValue) {
      pushAlert("success", `Role aktif: ${found?.role || "-"}`);
    }
  };

  const handleLogout = () => {
    setAuthToken("");
    setAuthRole("");
    setTokenOptions([]);
    setSelectedSuratId("");
    setSuratList([]);
    setKategoriList([]);
    setKodeMasalahList([]);
    setAutoSaveStatus(null);
    pushAlert("info", "Anda sudah logout");
  };

  const handleCreateDraft = async () => {
    if (!suratForm.idKategoriSurat || !suratForm.idKodeMasalah || !suratForm.perihal) {
      pushAlert("error", "Lengkapi kategori, kode masalah, dan perihal");
      return;
    }
    try {
      const res = await apiFetchJson("/api/surat", {
        method: "POST",
        body: JSON.stringify({
          idKategoriSurat: suratForm.idKategoriSurat,
          idKodeMasalah: suratForm.idKodeMasalah,
          perihal: suratForm.perihal,
          pengirimExternal: suratForm.pengirimExternal || undefined,
          jenisSurat: suratForm.jenisSurat,
          prioritas: suratForm.prioritas,
        }),
      });
      const suratId = res.data?.id || "";
      if (suratId) {
        setSelectedSuratId(suratId);
        setAutoSaveStatus("Draft dibuat, siap menulis");
      }
      await loadSuratList();
      pushAlert("success", "Draft surat berhasil dibuat");
    } catch (err: any) {
      pushAlert("error", err.message || "Gagal membuat draft surat");
    }
  };

  const handleUpdateSurat = async () => {
    if (!selectedSuratId) {
      pushAlert("error", "Pilih surat terlebih dahulu");
      return;
    }
    try {
      const content = bodyHtml;
      await apiFetchJson(`/api/surat/${selectedSuratId}`, {
        method: "PATCH",
        body: JSON.stringify({
          content,
          perihal: suratForm.perihal || undefined,
          pengirimExternal: suratForm.pengirimExternal || undefined,
        }),
      });
      pushAlert("success", "Surat diperbarui");
      setAutoSaveStatus("Tersimpan");
      await loadSuratList();
    } catch (err: any) {
      pushAlert("error", err.message || "Gagal update surat");
    }
  };

  const handleGenerateNomor = async () => {
    if (!selectedSuratId) {
      pushAlert("error", "Pilih surat terlebih dahulu");
      return;
    }
    try {
      const res = await apiFetchJson(`/api/surat/${selectedSuratId}/generate-nomor`, {
        method: "POST",
      });
      const nomorSurat = res.data?.nomorSurat || "";
      if (nomorSurat) {
        setMeta({ nomorSurat });
        const updatedBody = applyNomorPlaceholder(bodyHtmlRef.current, nomorSurat);
        if (updatedBody !== bodyHtmlRef.current) {
          externalUpdateRef.current = true;
          setBodyHtml(updatedBody);
        }
      }
      pushAlert("success", "Nomor surat berhasil dibuat");
      await loadSuratList();
    } catch (err: any) {
      pushAlert("error", err.message || "Gagal generate nomor surat");
    }
  };

  const handleExportSuratPdf = async () => {
    if (!selectedSuratId) {
      pushAlert("error", "Pilih surat terlebih dahulu");
      return;
    }
    try {
      const blob = await apiFetchBlob(`/api/surat/${selectedSuratId}/export-pdf`, {
        method: "POST",
      });
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `surat-${selectedSuratId}.pdf`;
      link.click();
      URL.revokeObjectURL(link.href);
      pushAlert("success", "PDF berhasil diunduh");
    } catch (err: any) {
      pushAlert("error", err.message || "Gagal export PDF");
    }
  };

  const handleDistribusi = async () => {
    if (!selectedSuratId) {
      pushAlert("error", "Pilih surat terlebih dahulu");
      return;
    }
    const payloadItems = distribusiItems
      .map((item) => ({
        kdLembaga: item.kdLembaga.trim(),
        kdSubLembaga: item.kdSubLembaga.trim() || undefined,
        instruksi: item.instruksi.trim() || undefined,
      }))
      .filter((item) => item.kdLembaga);
    if (payloadItems.length === 0) {
      pushAlert("error", "Isi minimal satu kode lembaga untuk distribusi");
      return;
    }
    try {
      await apiFetchJson(`/api/surat/${selectedSuratId}/distribusi`, {
        method: "POST",
        body: JSON.stringify({ distribusi: payloadItems }),
      });
      pushAlert("success", "Surat berhasil didistribusikan");
      await loadSuratList();
    } catch (err: any) {
      pushAlert("error", err.message || "Gagal distribusi surat");
    }
  };

  return (
    <div className="app-shell">
      <div className="toast-container">
        {alerts.map((alert) => (
          <div key={alert.id} className={`toast toast--${alert.type}`}>
            <span>{alert.message}</span>
            <button type="button" className="toast-close" onClick={() => setAlerts((prev) => prev.filter((item) => item.id !== alert.id))}>
              ×
            </button>
          </div>
        ))}
      </div>
      <header className="app-header">
        <div>
          <p className="eyebrow">Surat Hub</p>
          <h1>Editor surat dengan format kertas</h1>
          <p className="lede">Tulis, edit, dan suntik template surat langsung di aplikasi tanpa perlu membuka editor lain.</p>
        </div>
        <div className="header-actions">
          {authToken ? (
            <>
              <button className="ghost" type="button" onClick={handleExportPdf}>
                Export PDF
              </button>
              <button className="ghost" type="button" onClick={handleExportDocx}>
                Export DOCX (with header/footer)
              </button>
              <button className="ghost" type="button" onClick={handleClear} aria-label="Bersihkan isi editor">
                Bersihkan
              </button>
              <button className="ghost" type="button" onClick={handleLogout}>
                Logout
              </button>
            </>
          ) : null}
        </div>
      </header>

      {!authToken && (
        <section className="panel login-panel">
          <div className="panel-title">Login</div>
          <div className="api-grid">
            <div className="api-card">
              <p className="api-card__title">Masuk HRMS</p>
              <div className="field-row">
                <label className="field">
                  <span>Username</span>
                  <input value={loginUsername} onChange={(event) => setLoginUsername(event.target.value)} />
                </label>
                <label className="field">
                  <span>Password</span>
                  <input type="password" value={loginPassword} onChange={(event) => setLoginPassword(event.target.value)} />
                </label>
              </div>
              <div className="field-row">
                <button className="ghost" type="button" onClick={handleLogin}>
                  Login
                </button>
                <label className="field">
                  <span>Role Token</span>
                  <select value={authToken} onChange={(event) => handleSelectToken(event.target.value)}>
                    <option value="">Pilih token</option>
                    {tokenOptions.map((token) => (
                      <option key={token.access_token} value={token.access_token}>
                        {token.role} {token.hak_akses ? `- ${token.hak_akses}` : ""}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
              <div className="api-hint">Token aktif: {authRole || "-"}</div>
            </div>
          </div>
        </section>
      )}

      {authToken && (
        <section className="panel">
          <div className="panel-title">Workflow Surat (Backend)</div>
          <div className="api-grid">
            <div className="api-card">
              <p className="api-card__title">Buat Draft</p>
              <label className="field">
                <span>Kategori Surat</span>
                <select value={suratForm.idKategoriSurat} onChange={(event) => setSuratForm((prev) => ({ ...prev, idKategoriSurat: event.target.value }))}>
                  <option value="">Pilih kategori</option>
                  {kategoriList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.nama_kategori} ({item.kode_kategori})
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Kode Masalah</span>
                <select value={suratForm.idKodeMasalah} onChange={(event) => setSuratForm((prev) => ({ ...prev, idKodeMasalah: event.target.value }))}>
                  <option value="">Pilih kode</option>
                  {kodeMasalahList.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.kode_masalah} {item.deskripsi ? `- ${item.deskripsi}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <label className="field">
                <span>Perihal</span>
                <input value={suratForm.perihal} onChange={(event) => setSuratForm((prev) => ({ ...prev, perihal: event.target.value }))} />
              </label>
              <label className="field">
                <span>Pengirim External (opsional)</span>
                <input value={suratForm.pengirimExternal} onChange={(event) => setSuratForm((prev) => ({ ...prev, pengirimExternal: event.target.value }))} />
              </label>
              <div className="field-row">
                <label className="field">
                  <span>Jenis Surat</span>
                  <select value={suratForm.jenisSurat} onChange={(event) => setSuratForm((prev) => ({ ...prev, jenisSurat: event.target.value }))}>
                    <option value="MASUK">MASUK</option>
                    <option value="KELUAR">KELUAR</option>
                  </select>
                </label>
                <label className="field">
                  <span>Prioritas</span>
                  <select value={suratForm.prioritas} onChange={(event) => setSuratForm((prev) => ({ ...prev, prioritas: event.target.value }))}>
                    <option value="RENDAH">RENDAH</option>
                    <option value="SEDANG">SEDANG</option>
                    <option value="TINGGI">TINGGI</option>
                    <option value="MENDESAK">MENDESAK</option>
                  </select>
                </label>
              </div>
              <button className="ghost" type="button" onClick={handleCreateDraft}>
                Buat Draft
              </button>
            </div>

            <div className="api-card">
              <p className="api-card__title">Draft Aktif</p>
              <label className="field">
                <span>Surat Dibuat</span>
                <select value={selectedSuratId} onChange={(event) => setSelectedSuratId(event.target.value)}>
                  <option value="">Pilih surat</option>
                  {suratList.map((surat) => (
                    <option key={surat.id} value={surat.id}>
                      {surat.perihal} {surat.nomor_surat ? `- ${surat.nomor_surat}` : ""}
                    </option>
                  ))}
                </select>
              </label>
              <div className="autosave-row">
                <label className="field autosave-toggle">
                  <span>Autosave</span>
                  <input type="checkbox" checked={autoSaveEnabled} onChange={(event) => setAutoSaveEnabled(event.target.checked)} />
                </label>
                {autoSaveStatus && <span className={`autosave-pill${isAutoSaving ? " is-saving" : ""}`}>{autoSaveStatus}</span>}
              </div>
              <div className="field-row">
                <button className="ghost" type="button" onClick={handleUpdateSurat}>
                  Simpan Konten
                </button>
                <button className="ghost" type="button" onClick={handleGenerateNomor}>
                  Generate Nomor
                </button>
              </div>
              <div className="field-row">
                <button className="ghost" type="button" onClick={handleExportSuratPdf}>
                  Export PDF (Backend)
                </button>
              </div>
            </div>

            <div className="api-card">
              <p className="api-card__title">Distribusi</p>
              {distribusiItems.map((item, index) => (
                <div key={`distribusi-${index}`} className="distribusi-row">
                  <label className="field">
                    <span>Kode Lembaga</span>
                    <input value={item.kdLembaga} onChange={(event) => setDistribusiItems((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, kdLembaga: event.target.value } : row)))} />
                  </label>
                  <label className="field">
                    <span>Kode Sub Lembaga</span>
                    <input value={item.kdSubLembaga} onChange={(event) => setDistribusiItems((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, kdSubLembaga: event.target.value } : row)))} />
                  </label>
                  <label className="field">
                    <span>Instruksi</span>
                    <input value={item.instruksi} onChange={(event) => setDistribusiItems((prev) => prev.map((row, rowIndex) => (rowIndex === index ? { ...row, instruksi: event.target.value } : row)))} />
                  </label>
                </div>
              ))}
              <div className="field-row">
                <button className="ghost" type="button" onClick={() => setDistribusiItems((prev) => [...prev, { kdLembaga: "", kdSubLembaga: "", instruksi: "" }])}>
                  Tambah Baris
                </button>
                <button className="ghost" type="button" onClick={handleDistribusi}>
                  Kirim Distribusi
                </button>
              </div>
            </div>
          </div>
        </section>
      )}

      {authToken && (
        <>
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
        </>
      )}
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
