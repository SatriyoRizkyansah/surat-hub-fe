import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PizZip from "pizzip";
import { convertHtmlToDocx } from "./htmlConversionService.js";

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

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(__dirname, "../templates");

const templateMap: Record<string, string> = {
  "surat-tugas": "contoh-template.docx",
  "contoh-template": "contoh-template.docx",
};

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

const CONTENT_PLACEHOLDER = "{{content}}";
const RUN_CLOSING_SEQUENCE = "</w:t></w:r></w:p>";

const injectContentPlaceholder = (documentXml: string, contentBodyXml: string) => {
  const placeholderIndex = documentXml.indexOf(CONTENT_PLACEHOLDER);

  if (placeholderIndex === -1) {
    throw new Error("Template tidak memiliki placeholder {{content}}");
  }

  const before = documentXml.slice(0, placeholderIndex);
  let after = documentXml.slice(placeholderIndex + CONTENT_PLACEHOLDER.length);

  if (after.startsWith(RUN_CLOSING_SEQUENCE)) {
    after = after.slice(RUN_CLOSING_SEQUENCE.length);
  }

  const injection = `${RUN_CLOSING_SEQUENCE}${contentBodyXml}`;
  return `${before}${injection}${after}`;
};

const extractContentBodyXml = (contentXml: string) => {
  const bodyMatch = contentXml.match(/<w:body>([\s\S]*)<\/w:body>/);
  if (!bodyMatch) {
    throw new Error("Could not extract body from content DOCX");
  }

  let bodyXml = bodyMatch[1].trim();
  bodyXml = bodyXml.replace(/<w:sectPr>[\s\S]*<\/w:sectPr>/, "").trim();
  return bodyXml;
};

const stripHtmlToDocxWrapperParagraphs = (bodyXml: string) => {
  // `html-to-docx` typically wraps content with a leading and trailing empty paragraph.
  // These often become visible as awkward blank space when injected into a styled template.
  // We'll remove only truly-empty paragraphs (no <w:t>) from start/end.
  let xml = bodyXml.trim();

  const isEmptyParagraph = (pXml: string) => {
    // If the paragraph contains drawings/objects, keep it.
    if (/<w:drawing[\s>]|<w:object[\s>]|<v:shape[\s>]/.test(pXml)) return false;

    // If there is text, consider it empty only if it's whitespace-only.
    // html-to-docx frequently emits: <w:t xml:space="preserve">       </w:t>
    const textValues = [...pXml.matchAll(/<w:t(?:[^>]*)>([\s\S]*?)<\/w:t>/g)].map((m) => m[1] ?? "");
    if (textValues.length > 0) {
      const allWhitespace = textValues.every((t) => t.replace(/\s+/g, "") === "");
      if (!allWhitespace) return false;
    }

    // No text or whitespace-only text => treat as empty.
    return true;
  };

  const takeFirstParagraph = () => {
    const m = xml.match(/^<w:p\b[\s\S]*?<\/w:p>/);
    return m?.[0];
  };

  const takeLastParagraph = () => {
    const m = xml.match(/<w:p\b[\s\S]*?<\/w:p>$/);
    return m?.[0];
  };

  // Strip at most a few to avoid pathological regex behavior.
  for (let i = 0; i < 5; i++) {
    const first = takeFirstParagraph();
    if (!first || !isEmptyParagraph(first)) break;
    xml = xml.slice(first.length).trimStart();
  }

  for (let i = 0; i < 5; i++) {
    const last = takeLastParagraph();
    if (!last || !isEmptyParagraph(last)) break;
    xml = xml.slice(0, -last.length).trimEnd();
  }

  return xml;
};

export async function generateSuratDocx(params: { templateId: string; fields: SuratFields; contentHtml: string }): Promise<Buffer> {
  // Read template
  const templatePath = getTemplatePath(params.templateId);
  const templateBinary = await fs.readFile(templatePath);

  // Generate DOCX fragment from HTML
  const contentDocxBuffer = await convertHtmlToDocx(params.contentHtml);
  const contentZip = new PizZip(contentDocxBuffer);
  const contentDocXml = contentZip.file("word/document.xml")?.asText();

  if (!contentDocXml) {
    throw new Error("Failed to extract content from generated DOCX");
  }

  const contentBodyXml = extractContentBodyXml(contentDocXml);
  const cleanedContentBodyXml = stripHtmlToDocxWrapperParagraphs(contentBodyXml);

  // Load template
  const templateZip = new PizZip(templateBinary);
  const templateDocXml = templateZip.file("word/document.xml")?.asText();

  if (!templateDocXml) {
    throw new Error("Template file is invalid");
  }

  // Replace metadata fields
  const normalizedFields = Object.fromEntries(Object.entries(params.fields).map(([key, value]) => [key, value ?? ""]));
  const renderedXml = replaceTemplateFields(templateDocXml, normalizedFields);

  const finalXml = injectContentPlaceholder(renderedXml, cleanedContentBodyXml);

  // Generate final DOCX
  templateZip.file("word/document.xml", finalXml);
  return templateZip.generate({ type: "nodebuffer", mimeType: DOCX_MIME });
}
