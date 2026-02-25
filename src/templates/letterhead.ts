const logos = {
  left: {
    src: "/assets/logo/sasmita.png",
    alt: "Logo Yayasan Sasmita Jaya",
  },
  right: {
    src: "/assets/logo/unpam.png",
    alt: "Logo Lembaga Sertifikasi Profesi",
  },
};

const brand = {
  foundation: "YAYASAN SASMITA JAYA",
  institution: "UNIVERSITAS PAMULANG",
  tagline: "\u201cLEMBAGA SERTIFIKASI PROFESI\u201d",
};

const addresses = [
  { label: "Kampus 1.", value: "Jl. Surya Kencana No.1, Pamulang, Kota Tangerang Selatan, Banten 15417" },
  { label: "Kampus 2.", value: "Jl. Raya Puspitek No.46, Serpong, Kota Tangerang Selatan, Banten 15316" },
  { label: "Kampus 3.", value: "Jl. Witana Harja No.18B, Pamulang, Kota Tangerang Selatan, Banten 15417" },
  { label: "Kampus 4.", value: "Jl. Raya Jakarta-Serang, Walantaka, Kota Serang, Banten 42183" },
];

const contacts = [
  { label: "E.", value: "lsp@unpam.ac.id" },
  { label: "Web.", value: "www.lsp.unpam.ac.id" },
  { label: "IG.", value: "@lsp_unpam" },
];

const renderAddresses = (tag: "p" | "div") => addresses.map((addr) => `<${tag}><strong>${addr.label}</strong> ${addr.value}</${tag}>`).join("\n");

const renderContacts = (tag: "p" | "div") => {
  if (tag === "p") {
    return `<p><strong>${contacts[0].label}</strong> ${contacts[0].value} &nbsp;|&nbsp; <strong>${contacts[1].label}</strong> ${contacts[1].value} &nbsp;|&nbsp; <strong>${contacts[2].label}</strong> ${contacts[2].value}</p>`;
  }

  return `
    <div style="margin-top:4px; color:#001f5f; font-weight:600;">
      <span><strong>${contacts[0].label}</strong> ${contacts[0].value}</span>
      <span style="margin:0 6px;">|</span>
      <span><strong>${contacts[1].label}</strong> ${contacts[1].value}</span>
      <span style="margin:0 6px;">|</span>
      <span><strong>${contacts[2].label}</strong> ${contacts[2].value}</span>
    </div>
  `;
};

export const letterheadHeaderHtml = `
  <header class="word-header" data-running="word-header">
    <div class="word-header__inner">
      <div class="word-logo-frame">
        <img class="word-logo" src="${logos.left.src}" alt="${logos.left.alt}" />
      </div>
      <div class="word-identity">
        <p class="word-identity__foundation">${brand.foundation}</p>
        <h1>${brand.institution}</h1>
        <p class="word-identity__tagline">${brand.tagline}</p>
      </div>
      <div class="word-logo-frame">
        <img class="word-logo" src="${logos.right.src}" alt="${logos.right.alt}" />
      </div>
    </div>
    <div class="word-divider word-divider--double">
      <span></span>
      <span></span>
    </div>
  </header>
`;

export const letterheadFooterHtml = `
  <footer class="word-footer" data-running="word-footer">
    <div class="word-footer__inner">
      <div class="word-footer__addresses">
        ${renderAddresses("p")}
      </div>
      <div class="word-footer__contacts">
        ${renderContacts("p")}
      </div>
    </div>
    <div class="word-footer__bar">
      <span class="word-footer__bar-segment word-footer__bar-segment--navy"></span>
      <span class="word-footer__bar-segment word-footer__bar-segment--gold"></span>
      <span class="word-footer__bar-segment word-footer__bar-segment--red"></span>
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
  <div style="font-family:'Times New Roman', serif; color:#001f5f; text-align:center; padding:6mm 15mm 0;">
    <div style="display:grid; grid-template-columns:120px 1fr 120px; gap:16px; align-items:center;">
      <div style="width:120px; height:120px; border:1.4px solid #d1d9ef; border-radius:6px; display:flex; align-items:center; justify-content:center; padding:4px; background:#fff;">
        <img src="${logos.left.src}" style="width:100%; height:100%; object-fit:contain;" alt="${logos.left.alt}" />
      </div>
      <div style="flex:1; text-transform:uppercase;">
        <div style="font-weight:700; letter-spacing:1.5px;">${brand.foundation}</div>
        <div style="font-weight:700; font-size:26px; letter-spacing:2px; margin:2px 0;">${brand.institution}</div>
        <div style="font-weight:600; letter-spacing:1.2px;">${brand.tagline}</div>
      </div>
      <div style="width:120px; height:120px; border:1.4px solid #d1d9ef; border-radius:6px; display:flex; align-items:center; justify-content:center; padding:4px; background:#fff;">
        <img src="${logos.right.src}" style="width:100%; height:100%; object-fit:contain;" alt="${logos.right.alt}" />
      </div>
    </div>
    <div style="margin:6px 0 0;">
      <div style="border-top:3px solid #001f5f; margin:0 auto 2px;"></div>
      <div style="border-top:1.5px solid #001f5f; margin:0 auto;"></div>
    </div>
  </div>
`;

export const letterheadDocxFooterHtml = `
  <div style="font-family:'Times New Roman', serif; font-size:9pt; color:#1f385f; border-top:2px solid #001f5f; padding:8mm 15mm 0;">
    <div>
      ${renderAddresses("div")}
    </div>
    ${renderContacts("div")}
    <div style="display:flex; height:6px; border-radius:999px; overflow:hidden; margin-top:8px;">
      <span style="flex:1; background:#001f5f;"></span>
      <span style="flex:1; background:#ffc000;"></span>
      <span style="flex:1; background:#c00000;"></span>
    </div>
  </div>
`;
