import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PizZip from "pizzip";
import { marked } from "marked";
import type { MarkedOptions } from "marked";
import { convertHtmlToWordBodyXml } from "./htmlWordConverter.js";
import { convertMarkdownToWordBodyXml } from "./markdownWordConverter.js";

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
const CONTENT_PLACEHOLDER = "__DOCX_CONTENT_PLACEHOLDER__";
const MARKDOWN_OPTIONS: MarkedOptions = {
  gfm: true,
  breaks: true,
};

const templateMap: Record<string, string> = {
  "surat-tugas": "surat-tugas.docx",
};

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const templatesDir = path.resolve(__dirname, "../templates");

const getTemplatePath = (templateId: string) => {
  const fileName = templateMap[templateId] ?? templateMap["surat-tugas"];
  return path.join(templatesDir, fileName);
};

const normalizeFields = (fields: SuratFields) => Object.fromEntries(Object.entries(fields).map(([key, value]) => [key, value ?? ""]));

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const escapeXmlText = (value: string) => value.replace(/\r?\n/g, " ").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");

const replaceFieldTags = (documentXml: string, fields: Record<string, string>) => {
  return Object.entries(fields).reduce((xml, [key, value]) => {
    if (!key) return xml;
    const regex = new RegExp(`{{\\s*${escapeRegExp(key)}\\s*}}`, "g");
    return xml.replace(regex, escapeXmlText(value));
  }, documentXml);
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

const injectWordXml = (documentXml: string, wordXml: string, placeholderToken: string) => {
  const placeholderIndex = documentXml.indexOf(placeholderToken);
  if (placeholderIndex === -1) {
    throw new Error("Placeholder konten tidak ditemukan di template DOCX");
  }

  if (documentXml.includes(placeholderToken)) {
    const paragraphStart = findParagraphStartIndex(documentXml, placeholderIndex);
    const paragraphEnd = documentXml.indexOf("</w:p>", placeholderIndex);

    if (paragraphStart !== -1 && paragraphEnd !== -1) {
      const afterParagraph = paragraphEnd + "</w:p>".length;
      return `${documentXml.slice(0, paragraphStart)}${wordXml}${documentXml.slice(afterParagraph)}`;
    }

    return documentXml.replace(placeholderToken, wordXml);
  }
  return documentXml;
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

const convertMarkdownToHtml = (markdown?: string) => {
  if (!markdown?.trim()) {
    return undefined;
  }

  const parsed = marked.parse(markdown, MARKDOWN_OPTIONS);
  return typeof parsed === "string" ? parsed : parsed.toString();
};

const resolveHtmlContent = ({ markdown, html }: { markdown?: string; html?: string }) => {
  const markdownHtml = convertMarkdownToHtml(markdown);
  if (markdownHtml?.trim()) {
    return markdownHtml;
  }

  if (html?.trim()) {
    return html;
  }

  return "<p></p>";
};

const convertPreferredContentToWordXml = async ({ markdown, html }: { markdown?: string; html?: string }) => {
  const trimmedMarkdown = markdown?.trim();
  if (trimmedMarkdown) {
    try {
      return await convertMarkdownToWordBodyXml(trimmedMarkdown);
    } catch (error) {
      console.error("Gagal mengonversi Markdown menjadi DOCX", error);
      throw new Error("Konversi Markdown gagal. Periksa konten Markdown atau hubungi developer.");
    }
  }

  const htmlSource = resolveHtmlContent({ markdown, html });
  const safeHtml = ensureWordContentWrapper(htmlSource);
  return convertHtmlToWordBodyXml(safeHtml);
};

export async function generateSuratDocx(params: { templateId: string; fields: SuratFields; contentHtml?: string; contentMarkdown?: string }): Promise<Buffer> {
  const templatePath = getTemplatePath(params.templateId);
  const templateBinary = await fs.readFile(templatePath);

  const templateZip = new PizZip(templateBinary);
  const documentXml = templateZip.file("word/document.xml")?.asText();

  if (!documentXml) {
    throw new Error("Template DOCX tidak memiliki word/document.xml");
  }

  const normalizedFields = normalizeFields(params.fields);
  let updatedDocumentXml = replaceFieldTags(documentXml, normalizedFields);
  updatedDocumentXml = updatedDocumentXml.replace(/{{\s*content\s*}}/g, CONTENT_PLACEHOLDER);

  const wordXml = await convertPreferredContentToWordXml({ markdown: params.contentMarkdown, html: params.contentHtml });
  const finalDocumentXml = injectWordXml(updatedDocumentXml, wordXml, CONTENT_PLACEHOLDER);

  templateZip.file("word/document.xml", finalDocumentXml);
  return templateZip.generate({ type: "nodebuffer", mimeType: DOCX_MIME });
}
