import type { UnitInfo, LetterMeta, CampusAddress, LetterContext } from "../types/letter";

// ─── Default values (used as fallback until backend provides real data) ───

export const DEFAULT_LOGOS = {
  left: {
    src: "/assets/logo/LogoSasmita.png",
    alt: "Logo Yayasan Sasmita Jaya",
    width: "4.23cm",
    height: "2.99cm",
  },
  right: {
    src: "/assets/logo/LogoUnpam.png",
    alt: "Logo Universitas Pamulang",
    width: "2.48cm",
    height: "2.48cm",
  },
  qr: {
    src: "/assets/logo/qr-unpam.png",
    alt: "QR Code unpam.ac.id",
    width: "1.8cm",
    height: "1.8cm",
  },
};

export const DEFAULT_UNIT_INFO: UnitInfo = {
  institutionLine: "YAYASAN SASMITA JAYA",
  universityLine: "UNIVERSITAS PAMULANG",
  unitName: "FAKULTAS TEKNIK",
  subUnit: '"LEMBAGA SERTIFIKASI PROFESI"',
  logoLeft: DEFAULT_LOGOS.left.src,
  logoRight: DEFAULT_LOGOS.right.src,
  email: "lsp@unpam.ac.id",
  website: "www.lsp.unpam.ac.id",
  instagram: "lsp_unpam",
};

export const DEFAULT_ADDRESSES: CampusAddress[] = [
  { label: "Kampus 1,", value: "Jl. Surya Kencana No.1, Pamulang, Kota Tangerang Selatan, Banten 15417" },
  { label: "Kampus 2,", value: "Jl. Raya Puspitek No. 46, Serpong, Kota Tangerang Selatan, Banten 15316" },
  { label: "Kampus 3,", value: "Jl. Witana Harja No. 18b, Pamulang, Kota Tangerang Selatan, Banten 15417" },
  { label: "Kampus 4,", value: "Jl. Raya Jakarta-Serang, Walantaka, Kota Serang, Banten 42183" },
];

export const DEFAULT_LETTER_META: LetterMeta = {
  nomorSurat: "",
  tanggalSurat: new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" }),
  qrCodeUrl: DEFAULT_LOGOS.qr.src,
  qrLabel: "www.unpam.ac.id",
  templateId: "surat-tugas",
};

export const DEFAULT_LETTER_CONTEXT: LetterContext = {
  unit: DEFAULT_UNIT_INFO,
  meta: DEFAULT_LETTER_META,
  addresses: DEFAULT_ADDRESSES,
};

// ─── Helper renderers ───

const renderAddresses = (tag: "p" | "div", addresses: CampusAddress[] = DEFAULT_ADDRESSES) => addresses.map((addr) => `<${tag}><strong>${addr.label}</strong> ${addr.value}</${tag}>`).join("\n");

const renderContacts = (tag: "p" | "div", unit: UnitInfo = DEFAULT_UNIT_INFO) => {
  const contactLine = `<strong>E.</strong> ${unit.email}, | ${unit.website} | Instagram : ${unit.instagram}`;
  if (tag === "p") {
    return `<p>${contactLine}</p>`;
  }
  return `<div style="margin-top:4px; color:#001f5f; font-weight:600;">${contactLine}</div>`;
};

// ─── Dynamic header/footer builders ───

export const buildLetterheadHeaderHtml = (unit: UnitInfo = DEFAULT_UNIT_INFO) => `
  <header class="word-header" data-running="word-header" contenteditable="false" data-letterhead-lock="header">
    <div class="word-header__grid">
      <div class="word-logo word-logo--left">
        <img class="word-logo__image" src="${unit.logoLeft}" alt="Logo Kiri" />
      </div>
      <div class="word-identity">
        <p class="word-identity__line word-identity__line--foundation">${unit.institutionLine}</p>
        <p class="word-identity__line word-identity__line--institution">${unit.universityLine}</p>
        <p class="word-identity__line word-identity__line--faculty">${unit.unitName}</p>
        <p class="word-identity__line word-identity__line--subtitle">${unit.subUnit}</p>
      </div>
      <div class="word-logo word-logo--right">
        <img class="word-logo__image" src="${unit.logoRight}" alt="Logo Kanan" />
      </div>
    </div>
    <div class="word-divider">
      <span class="word-divider__line word-divider__line--thin"></span>
      <span class="word-divider__line word-divider__line--thick"></span>
    </div>
  </header>
`;

export const buildLetterheadFooterHtml = (unit: UnitInfo = DEFAULT_UNIT_INFO, meta: LetterMeta = DEFAULT_LETTER_META, addresses: CampusAddress[] = DEFAULT_ADDRESSES) => `
  <footer class="word-footer" data-running="word-footer" contenteditable="false" data-letterhead-lock="footer">
    <div class="word-footer__inner">
      <div class="word-footer__content">
        <div class="word-footer__addresses">
          ${renderAddresses("p", addresses)}
        </div>
        <div class="word-footer__contacts">
          ${renderContacts("p", unit)}
        </div>
      </div>
      <div class="word-footer__qr">
        <img class="word-footer__qr-image" src="${meta.qrCodeUrl}" alt="QR Code" />
        <span class="word-footer__qr-label">${meta.qrLabel}</span>
      </div>
    </div>
    <div class="word-footer__bar">
      <span class="word-footer__bar-segment word-footer__bar-segment--red"></span>
      <span class="word-footer__bar-segment word-footer__bar-segment--gold"></span>
      <span class="word-footer__bar-segment word-footer__bar-segment--navy"></span>
    </div>
  </footer>
`;

// ─── Backward-compatible static exports (use defaults) ───

export const letterheadHeaderHtml = buildLetterheadHeaderHtml();
export const letterheadFooterHtml = buildLetterheadFooterHtml();

// ─── Wrapper function ───

export const wrapWithLetterhead = (bodyHtml: string, ctx?: Partial<LetterContext>) => {
  const unit = ctx?.unit ?? DEFAULT_UNIT_INFO;
  const meta = ctx?.meta ?? DEFAULT_LETTER_META;
  const addresses = ctx?.addresses ?? DEFAULT_ADDRESSES;

  const header = buildLetterheadHeaderHtml(unit);
  const footer = buildLetterheadFooterHtml(unit, meta, addresses);
  const normalizedBody = bodyHtml.includes('class="word-body"') ? bodyHtml : `<div class="word-body">${bodyHtml}</div>`;

  return `
    <div class="surat-tugas">
      ${header}
      <div class="surat-word">
        ${normalizedBody}
      </div>
      ${footer}
    </div>
  `;
};

export const ensureLetterhead = (html: string, ctx?: Partial<LetterContext>) => {
  const hasHeader = html.includes("word-header");
  const hasFooter = html.includes("word-footer");

  if (hasHeader && hasFooter) {
    return html;
  }

  const header = buildLetterheadHeaderHtml(ctx?.unit);
  const footer = buildLetterheadFooterHtml(ctx?.unit, ctx?.meta, ctx?.addresses);

  if (html.includes('class="surat-tugas"')) {
    const withHeader = hasHeader ? html : html.replace('<div class="surat-tugas">', `<div class="surat-tugas">${header}`);
    const withFooter = withHeader.includes("word-footer") ? withHeader : withHeader.replace(/<\/div>\s*$/, `${footer}</div>`);
    return withFooter;
  }

  return wrapWithLetterhead(html, ctx);
};

// ─── DOCX inline-styled exports (also dynamic) ───

export const buildDocxHeaderHtml = (unit: UnitInfo = DEFAULT_UNIT_INFO) => `
  <div style="font-family:'Times New Roman', serif; color:#001f5f; text-align:center; text-transform:uppercase; padding:4mm 15mm 3mm;">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:8mm;">
      <div style="width:${DEFAULT_LOGOS.left.width}; height:${DEFAULT_LOGOS.left.height}; display:flex; align-items:center; justify-content:center;">
        <img src="${unit.logoLeft}" style="width:100%; height:100%; object-fit:contain;" alt="Logo Kiri" />
      </div>
      <div style="flex:1; text-align:center; line-height:0.9;">
        <div style="font-size:12pt; font-weight:700; letter-spacing:0.04em;">${unit.institutionLine}</div>
        <div style="font-size:20pt; font-weight:700; letter-spacing:0.06em; margin:1px 0 2px;">${unit.universityLine}</div>
        <div style="font-size:18pt; font-weight:700; letter-spacing:0.05em; margin-bottom:2px;">${unit.unitName}</div>
        <div style="font-size:12pt; font-weight:700; letter-spacing:0.04em; line-height:1.1;">${unit.subUnit}</div>
      </div>
      <div style="width:${DEFAULT_LOGOS.right.width}; height:${DEFAULT_LOGOS.right.height}; display:flex; align-items:center; justify-content:center;">
        <img src="${unit.logoRight}" style="width:100%; height:100%; object-fit:contain;" alt="Logo Kanan" />
      </div>
    </div>
    <div style="margin-top:4mm;">
      <div style="height:1px; background:#001f5f; opacity:0.95;"></div>
      <div style="height:3px; background:#001f5f; margin-top:1mm; border-radius:1px;"></div>
    </div>
  </div>
`;

export const buildDocxFooterHtml = (unit: UnitInfo = DEFAULT_UNIT_INFO, meta: LetterMeta = DEFAULT_LETTER_META, addresses: CampusAddress[] = DEFAULT_ADDRESSES) => `
  <div style="font-family:'Times New Roman', serif; font-size:10pt; color:#1f385f; border-top:2px solid #001f5f; padding:6mm 15mm 0;">
    <div style="display:flex; align-items:flex-start; gap:8mm;">
      <div style="flex:1;">
        <div style="line-height:1.35;">
          ${renderAddresses("div", addresses)}
        </div>
        ${renderContacts("div", unit)}
      </div>
      <div style="display:flex; flex-direction:column; align-items:center; gap:2px; flex-shrink:0;">
        <img src="${meta.qrCodeUrl}" style="width:${DEFAULT_LOGOS.qr.width}; height:${DEFAULT_LOGOS.qr.height}; object-fit:contain;" alt="QR Code" />
        <div style="font-size:8pt; color:#001f5f; font-weight:600;">${meta.qrLabel}</div>
      </div>
    </div>
    <div style="display:flex; height:6px; overflow:hidden; margin-top:6px;">
      <span style="flex:1; background:#c00000;"></span>
      <span style="flex:1; background:#ffc000;"></span>
      <span style="flex:1; background:#001f5f;"></span>
    </div>
  </div>
`;

/** Backward-compatible static DOCX exports */
export const letterheadDocxHeaderHtml = buildDocxHeaderHtml();
export const letterheadDocxFooterHtml = buildDocxFooterHtml();
