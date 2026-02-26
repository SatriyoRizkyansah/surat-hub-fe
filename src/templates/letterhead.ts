const logos = {
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

const brand = {
  line1: "YAYASAN SASMITA JAYA",
  line2: "UNIVERSITAS PAMULANG",
  line3: "FAKULTAS TEKNIK",
  subtitle: '"LEMBAGA SERTIFIKASI PROFESI"',
};

const addresses = [
  { label: "Kampus 1,", value: "Jl. Surya Kencana No.1, Pamulang, Kota Tangerang Selatan, Banten 15417" },
  { label: "Kampus 2,", value: "Jl. Raya Puspitek No. 46, Serpong, Kota Tangerang Selatan, Banten 15316" },
  { label: "Kampus 3,", value: "Jl. Witana Harja No. 18b, Pamulang, Kota Tangerang Selatan, Banten 15417" },
  { label: "Kampus 4,", value: "Jl. Raya Jakarta-Serang, Walantaka, Kota Serang, Banten 42183" },
];

const contacts = [
  { label: "E.", value: "lsp@unpam.ac.id," },
  { label: "|", value: "www.lsp.unpam.ac.id" },
  { label: "| Instagram :", value: "lsp_unpam" },
];

const renderAddresses = (tag: "p" | "div") => addresses.map((addr) => `<${tag}><strong>${addr.label}</strong> ${addr.value}</${tag}>`).join("\n");

const renderContacts = (tag: "p" | "div") => {
  const contactLine = `<strong>${contacts[0].label}</strong> ${contacts[0].value} ${contacts[1].label} ${contacts[1].value} ${contacts[2].label} ${contacts[2].value}`;
  if (tag === "p") {
    return `<p>${contactLine}</p>`;
  }
  return `<div style="margin-top:4px; color:#001f5f; font-weight:600;">${contactLine}</div>`;
};

export const letterheadHeaderHtml = `
  <header class="word-header" data-running="word-header" contenteditable="false" data-letterhead-lock="header">
    <div class="word-header__grid">
      <div class="word-logo word-logo--left">
        <img class="word-logo__image" src="${logos.left.src}" alt="${logos.left.alt}" />
      </div>
      <div class="word-identity">
        <p class="word-identity__line word-identity__line--foundation">${brand.line1}</p>
        <p class="word-identity__line word-identity__line--institution">${brand.line2}</p>
        <p class="word-identity__line word-identity__line--faculty">${brand.line3}</p>
        <p class="word-identity__line word-identity__line--subtitle">${brand.subtitle}</p>
      </div>
      <div class="word-logo word-logo--right">
        <img class="word-logo__image" src="${logos.right.src}" alt="${logos.right.alt}" />
      </div>
    </div>
    <div class="word-divider">
      <span class="word-divider__line word-divider__line--thin"></span>
      <span class="word-divider__line word-divider__line--thick"></span>
    </div>
  </header>
`;

export const letterheadFooterHtml = `
  <footer class="word-footer" data-running="word-footer" contenteditable="false" data-letterhead-lock="footer">
    <div class="word-footer__inner">
      <div class="word-footer__content">
        <div class="word-footer__addresses">
          ${renderAddresses("p")}
        </div>
        <div class="word-footer__contacts">
          ${renderContacts("p")}
        </div>
      </div>
      <div class="word-footer__qr">
        <img class="word-footer__qr-image" src="${logos.qr.src}" alt="${logos.qr.alt}" />
        <span class="word-footer__qr-label">www.unpam.ac.id</span>
      </div>
    </div>
    <div class="word-footer__bar">
      <span class="word-footer__bar-segment word-footer__bar-segment--red"></span>
      <span class="word-footer__bar-segment word-footer__bar-segment--gold"></span>
      <span class="word-footer__bar-segment word-footer__bar-segment--navy"></span>
    </div>
  </footer>
`;

export const wrapWithLetterhead = (bodyHtml: string) => {
  const normalizedBody = bodyHtml.includes('class="word-body"') ? bodyHtml : `<div class="word-body">${bodyHtml}</div>`;
  return `
    <div class="surat-tugas">
      ${letterheadHeaderHtml}
      <div class="surat-word">
        ${normalizedBody}
      </div>
      ${letterheadFooterHtml}
    </div>
  `;
};

export const ensureLetterhead = (html: string) => {
  const hasHeader = html.includes("word-header");
  const hasFooter = html.includes("word-footer");

  if (hasHeader && hasFooter) {
    return html;
  }

  if (html.includes('class="surat-tugas"')) {
    const withHeader = hasHeader ? html : html.replace('<div class="surat-tugas">', `<div class="surat-tugas">${letterheadHeaderHtml}`);
    const withFooter = withHeader.includes("word-footer") ? withHeader : withHeader.replace(/<\/div>\s*$/, `${letterheadFooterHtml}</div>`);
    return withFooter;
  }

  return wrapWithLetterhead(html);
};

export const letterheadDocxHeaderHtml = `
  <div style="font-family:'Times New Roman', serif; color:#001f5f; text-align:center; text-transform:uppercase; padding:4mm 15mm 3mm;">
    <div style="display:flex; align-items:center; justify-content:space-between; gap:8mm;">
      <div style="width:${logos.left.width}; height:${logos.left.height}; display:flex; align-items:center; justify-content:center;">
        <img src="${logos.left.src}" style="width:100%; height:100%; object-fit:contain;" alt="${logos.left.alt}" />
      </div>
      <div style="flex:1; text-align:center; line-height:0.9;">
        <div style="font-size:12pt; font-weight:700; letter-spacing:0.04em;">${brand.line1}</div>
        <div style="font-size:20pt; font-weight:700; letter-spacing:0.06em; margin:1px 0 2px;">${brand.line2}</div>
        <div style="font-size:18pt; font-weight:700; letter-spacing:0.05em; margin-bottom:2px;">${brand.line3}</div>
        <div style="font-size:12pt; font-weight:700; letter-spacing:0.04em; line-height:1.1;">${brand.subtitle}</div>
      </div>
      <div style="width:${logos.right.width}; height:${logos.right.height}; display:flex; align-items:center; justify-content:center;">
        <img src="${logos.right.src}" style="width:100%; height:100%; object-fit:contain;" alt="${logos.right.alt}" />
      </div>
    </div>
    <div style="margin-top:4mm;">
      <div style="height:1px; background:#001f5f; opacity:0.95;"></div>
      <div style="height:3px; background:#001f5f; margin-top:1mm; border-radius:1px;"></div>
    </div>
  </div>
`;

export const letterheadDocxFooterHtml = `
  <div style="font-family:'Times New Roman', serif; font-size:10pt; color:#1f385f; border-top:2px solid #001f5f; padding:6mm 15mm 0;">
    <div style="display:flex; align-items:flex-start; gap:8mm;">
      <div style="flex:1;">
        <div style="line-height:1.35;">
          ${renderAddresses("div")}
        </div>
        ${renderContacts("div")}
      </div>
      <div style="display:flex; flex-direction:column; align-items:center; gap:2px; flex-shrink:0;">
        <img src="${logos.qr.src}" style="width:${logos.qr.width}; height:${logos.qr.height}; object-fit:contain;" alt="${logos.qr.alt}" />
        <div style="font-size:8pt; color:#001f5f; font-weight:600;">www.unpam.ac.id</div>
      </div>
    </div>
    <div style="display:flex; height:6px; overflow:hidden; margin-top:6px;">
      <span style="flex:1; background:#c00000;"></span>
      <span style="flex:1; background:#ffc000;"></span>
      <span style="flex:1; background:#001f5f;"></span>
    </div>
  </div>
`;
