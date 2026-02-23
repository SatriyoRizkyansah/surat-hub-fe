import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import PizZip from "pizzip";
import { marked } from "marked";
import type { MarkedOptions } from "marked";
import { convertHtmlToWordBodyXml } from "./htmlWordConverter.js";
import { convertMarkdownToWordArtifacts, type MarkdownWordArtifacts } from "./markdownWordConverter.js";

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

const LINE_SPACING = 360;
const PARAGRAPH_SPACING_AFTER = 120;
const LIST_SPACING_AFTER = 60;
const FIRST_LINE_INDENT = 520;

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

type WordContentArtifacts = (MarkdownWordArtifacts & { source: "markdown" }) | ({ bodyXml: string; stylesXml?: string; numberingXml?: string } & { source: "html" });
const removeMarkdownStyles = (xml: string) => xml.replace(/<w:(?:p|r|tbl)Style[^>]*Md[^>]*\/>/g, "").replace(/<w:(?:p|r|tbl)Style[^>]*Md[^>]*><\/w:(?:p|r|tbl)Style>/g, "");

const ensureParagraphFormatting = (xml: string) =>
  xml.replace(/<w:p(\s[^>]*)?>([\s\S]*?)<\/w:p>/g, (_match, attrs = "", inner) => {
    const hasPPr = /<w:pPr/.test(inner);
    if (!hasPPr) {
      const spacing = `<w:spacing w:line="${LINE_SPACING}" w:lineRule="auto" w:after="${PARAGRAPH_SPACING_AFTER}"/>`;
      const indent = `<w:ind w:firstLine="${FIRST_LINE_INDENT}"/>`;
      const jc = `<w:jc w:val="both"/>`;
      const pPr = `<w:pPr>${jc}${indent}${spacing}</w:pPr>`;
      return `<w:p${attrs}>${pPr}${inner}</w:p>`;
    }

    const enhancedInner = inner.replace(/<w:pPr([^>]*)>([\s\S]*?)<\/w:pPr>/, (_pPrMatch: string, pPrAttrs = "", pPrInner = "") => {
      const hasList = /<w:numPr/.test(pPrInner);
      let updatedInner = pPrInner;

      if (!hasList && !/<w:jc/.test(updatedInner)) {
        updatedInner = `<w:jc w:val="both"/>${updatedInner}`;
      }

      if (!/w:spacing/.test(updatedInner)) {
        const spacingTag = `<w:spacing w:line="${LINE_SPACING}" w:lineRule="auto" w:after="${hasList ? LIST_SPACING_AFTER : PARAGRAPH_SPACING_AFTER}"/>`;
        updatedInner = `${updatedInner}${spacingTag}`;
      }

      if (!hasList && !/w:ind/.test(updatedInner)) {
        updatedInner = `${updatedInner}<w:ind w:firstLine="${FIRST_LINE_INDENT}"/>`;
      }

      return `<w:pPr${pPrAttrs}>${updatedInner}</w:pPr>`;
    });

    return `<w:p${attrs}>${enhancedInner}</w:p>`;
  });

const sanitizeMarkdownBodyXml = (xml: string) => ensureParagraphFormatting(removeMarkdownStyles(xml));

const appendBeforeClosingTag = (xml: string, closingTag: string, fragment: string) => {
  const index = xml.lastIndexOf(closingTag);
  if (index === -1) {
    return xml + fragment;
  }

  return `${xml.slice(0, index)}${fragment}${xml.slice(index)}`;
};

const mergeWordStyles = (baseXml?: string, additionXml?: string) => {
  if (!additionXml?.trim()) {
    return baseXml;
  }

  if (!baseXml?.trim()) {
    return additionXml;
  }

  const STYLE_REGEX = /<w:style[\s\S]*?<\/w:style>/g;
  const STYLE_ID_REGEX = /w:styleId="([^"]+)"/;
  const existing = new Set<string>();

  [...baseXml.matchAll(STYLE_REGEX)].forEach((match) => {
    const idMatch = match[0].match(STYLE_ID_REGEX);
    if (idMatch?.[1]) {
      existing.add(idMatch[1]);
    }
  });

  let merged = baseXml;

  [...additionXml.matchAll(STYLE_REGEX)].forEach((match) => {
    const idMatch = match[0].match(STYLE_ID_REGEX);
    const styleId = idMatch?.[1];
    if (!styleId || !styleId.startsWith("Md") || existing.has(styleId)) {
      return;
    }

    merged = appendBeforeClosingTag(merged, "</w:styles>", match[0]);
    existing.add(styleId);
  });

  return merged;
};

const mergeWordNumbering = (baseXml?: string, additionXml?: string) => {
  if (!additionXml?.trim()) {
    return baseXml;
  }

  if (!baseXml?.trim()) {
    return additionXml;
  }

  const ABSTRACT_REGEX = /<w:abstractNum[\s\S]*?<\/w:abstractNum>/g;
  const NUM_REGEX = /<w:num[\s\S]*?<\/w:num>/g;
  const ABSTRACT_ID_REGEX = /w:abstractNumId="(\d+)"/;
  const NUM_ID_REGEX = /w:numId="(\d+)"/;

  const abstractExisting = new Set<string>();
  const numExisting = new Set<string>();

  [...baseXml.matchAll(ABSTRACT_REGEX)].forEach((match) => {
    const idMatch = match[0].match(ABSTRACT_ID_REGEX);
    if (idMatch?.[1]) {
      abstractExisting.add(idMatch[1]);
    }
  });

  [...baseXml.matchAll(NUM_REGEX)].forEach((match) => {
    const idMatch = match[0].match(NUM_ID_REGEX);
    if (idMatch?.[1]) {
      numExisting.add(idMatch[1]);
    }
  });

  let merged = baseXml;

  [...additionXml.matchAll(ABSTRACT_REGEX)].forEach((match) => {
    const idMatch = match[0].match(ABSTRACT_ID_REGEX);
    const abstractId = idMatch?.[1];
    if (!abstractId || abstractExisting.has(abstractId)) {
      return;
    }
    merged = appendBeforeClosingTag(merged, "</w:numbering>", match[0]);
    abstractExisting.add(abstractId);
  });

  [...additionXml.matchAll(NUM_REGEX)].forEach((match) => {
    const idMatch = match[0].match(NUM_ID_REGEX);
    const numId = idMatch?.[1];
    if (!numId || numExisting.has(numId)) {
      return;
    }
    merged = appendBeforeClosingTag(merged, "</w:numbering>", match[0]);
    numExisting.add(numId);
  });

  return merged;
};

const convertPreferredContentToWordXml = async ({ markdown, html }: { markdown?: string; html?: string }): Promise<WordContentArtifacts> => {
  const trimmedMarkdown = markdown?.trim();
  if (trimmedMarkdown) {
    try {
      const artifacts = await convertMarkdownToWordArtifacts(trimmedMarkdown);
      return { ...artifacts, source: "markdown" };
    } catch (error) {
      console.error("Gagal mengonversi Markdown menjadi DOCX", error);
      throw new Error("Konversi Markdown gagal. Periksa konten Markdown atau hubungi developer.");
    }
  }

  const htmlSource = resolveHtmlContent({ markdown, html });
  const safeHtml = ensureWordContentWrapper(htmlSource);
  const bodyXml = await convertHtmlToWordBodyXml(safeHtml);
  return { bodyXml, source: "html" };
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

  const contentArtifacts = await convertPreferredContentToWordXml({ markdown: params.contentMarkdown, html: params.contentHtml });
  const bodyXml = contentArtifacts.source === "markdown" ? sanitizeMarkdownBodyXml(contentArtifacts.bodyXml) : contentArtifacts.bodyXml;
  const finalDocumentXml = injectWordXml(updatedDocumentXml, bodyXml, CONTENT_PLACEHOLDER);

  templateZip.file("word/document.xml", finalDocumentXml);
  if (contentArtifacts.source === "html" && contentArtifacts.stylesXml?.trim()) {
    const templateStylesXml = templateZip.file("word/styles.xml")?.asText();
    const mergedStyles = mergeWordStyles(templateStylesXml, contentArtifacts.stylesXml);
    if (mergedStyles?.trim()) {
      templateZip.file("word/styles.xml", mergedStyles);
    }
  }

  if (contentArtifacts.numberingXml?.trim()) {
    const templateNumberingXml = templateZip.file("word/numbering.xml")?.asText();
    const mergedNumbering = mergeWordNumbering(templateNumberingXml, contentArtifacts.numberingXml) ?? contentArtifacts.numberingXml;
    templateZip.file("word/numbering.xml", mergedNumbering);
  }
  return templateZip.generate({ type: "nodebuffer", mimeType: DOCX_MIME });
}
