import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import htmlToDocx from "html-to-docx";
import PizZip from "pizzip";
import { parse, HTMLElement as HtmlElement } from "node-html-parser";

export type SuratFields = {
  unit_pengirim: string;
  no_surat: string;
  tanggal_terbit?: string;
  penandatangan_nama?: string;
  penandatangan_jabatan?: string;
  penandatangan_nip?: string;
  [key: string]: string | undefined;
};

const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
const BASE_TYPOGRAPHY = "font-family:'Times New Roman', serif;font-size:12pt;color:#1f2a37;line-height:150%;mso-line-height-rule:exactly;";
const PARAGRAPH_INDENT_EXEMPT_CLASSES = ["word-meta", "word-address", "word-signature", "word-footer", "word-detail"];

const hasClass = (element: HtmlElement, className: string) => element.classList?.contains(className) ?? false;

const getTagName = (element: HtmlElement) => (element.tagName ? element.tagName.toLowerCase() : "");

const getParentElement = (element?: HtmlElement): HtmlElement | undefined => {
  if (!element) return undefined;
  const potentialParent = element.parentNode;
  return potentialParent instanceof HtmlElement ? potentialParent : undefined;
};

const isInsideClass = (element: HtmlElement, className: string): boolean => {
  let current: HtmlElement | undefined = element;
  while (current) {
    if (hasClass(current, className)) return true;
    current = getParentElement(current);
  }
  return false;
};

const isInsideListItem = (element: HtmlElement): boolean => {
  let current = getParentElement(element);
  while (current) {
    if (current instanceof HtmlElement && getTagName(current) === "li") {
      return true;
    }
    current = getParentElement(current);
  }
  return false;
};

const shouldClearIndent = (element: HtmlElement): boolean => {
  if (PARAGRAPH_INDENT_EXEMPT_CLASSES.some((className) => isInsideClass(element, className))) {
    return true;
  }
  if (isInsideListItem(element)) {
    return true;
  }
  const parent = getParentElement(element);
  if (parent instanceof HtmlElement && hasClass(parent, "word-content")) {
    return !element.previousElementSibling;
  }
  return false;
};

const isFirstColumnCell = (element: HtmlElement): boolean => {
  if (getTagName(element) !== "td") return false;
  const parentRow = getParentElement(element);
  if (!(parentRow instanceof HtmlElement)) return false;
  const siblings = parentRow.childNodes.filter((node): node is HtmlElement => node instanceof HtmlElement && getTagName(node) === "td");
  return siblings.length > 0 && siblings[0] === element;
};

const appendInlineStyles = (element: HtmlElement, fragments: string[]) => {
  const style = fragments
    .map((fragment) => fragment.trim())
    .filter(Boolean)
    .join(" ");

  if (!style) return;

  const existing = element.getAttribute("style");
  if (existing) {
    const sanitizedExisting = existing.trim().replace(/;$/, "");
    element.setAttribute("style", `${sanitizedExisting}; ${style}`);
    return;
  }

  element.setAttribute("style", style);
};

const collectInlineStyles = (element: HtmlElement): string[] => {
  const tag = getTagName(element);
  const styles: string[] = [];

  if (["p", "li", "td", "th", "span"].includes(tag)) {
    styles.push(BASE_TYPOGRAPHY);
  }

  if (tag === "p") {
    styles.push("margin:0 0 6px;text-align:justify;text-indent:26px;");
    if (shouldClearIndent(element)) {
      styles.push("text-indent:0;");
    }
  }

  if (tag === "table") {
    styles.push("width:100%;border-collapse:collapse;margin:10px 0 14px;");
  }

  if (tag === "td" || tag === "th") {
    styles.push("border:0.75pt solid #a5b4cf;padding:6px 10px;vertical-align:top;font-size:11pt;");

    if (isInsideClass(element, "word-detail") && isFirstColumnCell(element)) {
      styles.push("width:185px;font-weight:600;color:#1b3263;background:#eef2ff;border-right-color:#516a9c;");
    }
  }

  if (tag === "ol") {
    styles.push("margin:0 0 0 22px;padding:0 0 0 6px;list-style-type:decimal;list-style-position:outside;display:block;");
  }

  if (tag === "ul") {
    styles.push("margin:0 0 0 22px;padding:0 0 0 6px;list-style-type:disc;list-style-position:outside;display:block;");
  }

  if (tag === "li") {
    styles.push("margin-bottom:4px;text-align:justify;display:list-item;text-indent:0;");
  }

  if (hasClass(element, "word-meta")) {
    styles.push("margin:6px 0 12px;");
  }

  if (tag === "p" && isInsideClass(element, "word-meta")) {
    styles.push("margin:2px 0;");
  }

  if (tag === "span" && isInsideClass(element, "word-meta")) {
    styles.push("font-weight:600;min-width:110px;display:inline-block;color:#1b3263;");
  }

  if (hasClass(element, "word-signature")) {
    styles.push("margin-top:26px;text-align:left;");
  }

  if (hasClass(element, "word-signature__space")) {
    styles.push("height:70px;display:block;");
  }

  if (hasClass(element, "word-signature__name")) {
    styles.push("font-weight:700;text-transform:uppercase;");
  }

  if (hasClass(element, "word-signature__id")) {
    styles.push("margin-top:2px;font-size:10pt;letter-spacing:0.3px;");
  }

  if (hasClass(element, "word-footer")) {
    styles.push("margin-top:18px;border-top:2px solid #001f5f;padding-top:8px;font-size:10pt;color:#4b5563;");
  }

  return styles;
};

const normalizeHtmlForWord = (html: string) => {
  try {
    const root = parse(`<div data-docx-root>${html}</div>`, { lowerCaseTagName: false, comment: false });
    const mount = root.firstChild;

    if (!mount || !(mount instanceof HtmlElement)) {
      return html;
    }

    const traverse = (node: HtmlElement) => {
      appendInlineStyles(node, collectInlineStyles(node));
      node.childNodes.forEach((child) => {
        if (child instanceof HtmlElement) {
          traverse(child);
        }
      });
    };

    mount.childNodes.forEach((child) => {
      if (child instanceof HtmlElement) {
        traverse(child);
      }
    });

    return mount.innerHTML;
  } catch (error) {
    console.warn("Gagal normalisasi HTML untuk DOCX", error);
    return html;
  }
};

const baseCss = `
  :root {
    --word-navy: #001f5f;
    --word-slate: #1f2a37;
    --word-muted: #4b5563;
    --word-border: #a5b4cf;
    --word-border-strong: #516a9c;
    --word-accent: #1b3263;
  }

  body {
    font-family: 'Times New Roman', serif;
    font-size: 12pt;
    color: var(--word-slate);
    line-height: 1.5;
    margin: 0;
  }

  .docx-export {
    width: 100%;
  }

  .docx-export * {
    box-sizing: border-box;
  }

  .word-content {
    margin: 4px 0 12px;
  }

  .word-content p {
    margin: 0 0 6px;
    text-align: justify;
    text-indent: 26px;
  }

  .word-content p:first-of-type,
  .word-address p,
  .word-meta p,
  .word-signature p,
  .word-detail p,
  li p {
    text-indent: 0;
  }

  .word-content strong {
    font-weight: 700;
    color: var(--word-accent);
  }

  .word-meta {
    margin: 6px 0 12px;
  }

  .word-meta p {
    margin: 2px 0;
  }

  .word-meta span {
    display: inline-block;
    min-width: 110px;
    font-weight: 600;
    color: var(--word-accent);
  }

  .word-address {
    margin-bottom: 6px;
  }

  .word-address p {
    margin: 0;
  }

  .word-detail,
  table {
    width: 100%;
    border-collapse: collapse;
    margin: 10px 0 14px;
  }

  .word-detail td,
  table td,
  table th {
    border: 0.75pt solid var(--word-border);
    padding: 6px 10px;
    vertical-align: top;
    font-size: 11pt;
  }

  .word-detail td:first-child {
    width: 185px;
    font-weight: 600;
    color: var(--word-accent);
    background: #eef2ff;
    border-right-color: var(--word-border-strong);
  }

  .word-detail td:last-child {
    color: var(--word-slate);
  }

  ul,
  ol {
    margin: 0 0 0 22px;
    padding: 0 0 0 6px;
  }

  li {
    margin-bottom: 4px;
    text-align: justify;
    text-indent: 0;
  }

  .word-signature {
    margin-top: 26px;
    text-align: left;
    align-self: flex-end;
  }

  .word-signature p {
    margin: 2px 0;
    text-align: left;
  }

  .word-signature__space {
    height: 70px;
  }

  .word-signature__name {
    font-weight: 700;
    text-transform: uppercase;
  }

  .word-signature__id {
    margin-top: 2px;
    font-size: 10pt;
    letter-spacing: 0.3px;
  }

  .word-footer {
    margin-top: 18px;
    border-top: 2px solid var(--word-navy);
    padding-top: 8px;
    font-size: 10pt;
    color: var(--word-muted);
  }

  .word-footer p {
    margin: 2px 0;
  }
`;

const templateMap: Record<string, string> = {
  "surat-tugas": "surat-tugas.docx",
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(__dirname, "../templates");

const getTemplatePath = (templateId: string) => {
  const fileName = templateMap[templateId] ?? templateMap["surat-tugas"];
  return path.join(templatesDir, fileName);
};

const escapeXml = (value: string) => value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const replaceTemplateFields = (documentXml: string, fields: Record<string, string>) => {
  let updatedXml = documentXml;

  for (const [key, value] of Object.entries(fields)) {
    if (key === "content") continue;

    const placeholder = `{{${key}}}`;
    if (!updatedXml.includes(placeholder)) continue;

    const escapedValue = escapeXml(value);
    updatedXml = updatedXml.split(placeholder).join(escapedValue);
  }

  return updatedXml;
};

const extractBodyInnerXml = (documentXml: string) => {
  const bodyStartTag = "<w:body>";
  const bodyEndTag = "</w:body>";
  const bodyStart = documentXml.indexOf(bodyStartTag);
  const bodyEnd = documentXml.indexOf(bodyEndTag);

  if (bodyStart === -1 || bodyEnd === -1 || bodyEnd <= bodyStart) {
    throw new Error("Struktur dokumen tidak lengkap pada hasil konversi HTML");
  }

  const bodyInner = documentXml.slice(bodyStart + bodyStartTag.length, bodyEnd);
  const withoutSectPr = bodyInner.replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/g, "").replace(/<w:sectPr[^>]*\/>/g, "");

  return withoutSectPr.trim();
};

const findParagraphStartIndex = (xml: string, fromIndex: number) => {
  const tag = "<w:p";
  let searchIndex = fromIndex;

  while (searchIndex >= 0) {
    const candidate = xml.lastIndexOf(tag, searchIndex);
    if (candidate === -1) return -1;

    const nextChar = xml[candidate + tag.length];
    if (!nextChar || nextChar === " " || nextChar === ">" || nextChar === "\n" || nextChar === "\r" || nextChar === "\t") {
      return candidate;
    }

    searchIndex = candidate - 1;
  }

  return -1;
};

const injectWordXml = (documentXml: string, wordXml: string) => {
  const contentPlaceholder = "{{content}}";
  if (documentXml.includes(contentPlaceholder)) {
    const placeholderIndex = documentXml.indexOf(contentPlaceholder);
    const paragraphStart = findParagraphStartIndex(documentXml, placeholderIndex);
    const paragraphEnd = documentXml.indexOf("</w:p>", placeholderIndex);

    if (paragraphStart !== -1 && paragraphEnd !== -1) {
      const afterParagraph = paragraphEnd + "</w:p>".length;
      return `${documentXml.slice(0, paragraphStart)}${wordXml}${documentXml.slice(afterParagraph)}`;
    }

    return documentXml.replace(contentPlaceholder, wordXml);
  }

  const sectPrIndex = documentXml.lastIndexOf("<w:sectPr");
  if (sectPrIndex === -1) {
    throw new Error("Template tidak memiliki <w:sectPr> untuk menyisipkan konten");
  }

  return `${documentXml.slice(0, sectPrIndex)}${wordXml}${documentXml.slice(sectPrIndex)}`;
};

const ensureWordContentWrapper = (html: string) => {
  const trimmed = html.trim();
  if (!trimmed) {
    return '<div class="word-content"><p></p></div>';
  }

  const hasWordContent = /class\s*=\s*"[^"]*word-content/i.test(trimmed);
  if (hasWordContent) {
    return trimmed;
  }

  return `<div class="word-content">${trimmed}</div>`;
};

export async function generateSuratDocx(params: { templateId: string; fields: SuratFields; contentHtml: string }): Promise<Buffer> {
  const templatePath = getTemplatePath(params.templateId);
  const templateBinary = await fs.readFile(templatePath);

  const zip = new PizZip(templateBinary);
  const documentXml = zip.file("word/document.xml")?.asText();
  if (!documentXml) {
    throw new Error("File template tidak valid: missing word/document.xml");
  }

  const normalizedFields = Object.fromEntries(Object.entries(params.fields).map(([key, value]) => [key, value ?? ""]));
  const renderedDocumentXml = replaceTemplateFields(documentXml, normalizedFields);

  const safeBody = params.contentHtml?.trim()?.length ? params.contentHtml : "<p></p>";
  const preparedBody = ensureWordContentWrapper(safeBody);
  const normalizedBody = normalizeHtmlForWord(preparedBody);
  const htmlDocument = `<!DOCTYPE html><html><head><meta charset="UTF-8" /><style>${baseCss}</style></head><body><section class="docx-export">${normalizedBody}</section></body></html>`;

  const convertedBuffer = await htmlToDocx(htmlDocument, undefined, {
    font: "Times New Roman",
    getImageArrayBuffer: undefined,
    table: { row: { cantSplit: true } },
  });

  const htmlZip = new PizZip(convertedBuffer);
  const convertedXml = htmlZip.file("word/document.xml")?.asText();

  if (!convertedXml) {
    throw new Error("Gagal mengubah HTML menjadi dokumen Word");
  }

  const wordXml = extractBodyInnerXml(convertedXml);
  const updatedDocumentXml = injectWordXml(renderedDocumentXml, wordXml);

  zip.file("word/document.xml", updatedDocumentXml);

  return zip.generate({ type: "nodebuffer", mimeType: DOCX_MIME });
}
