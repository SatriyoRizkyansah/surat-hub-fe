import { Packer } from "docx";
import markdownDocx, { type MarkdownDocxOptions } from "markdown-docx";
import PizZip from "pizzip";
import { extractBodyInnerXml } from "./htmlWordConverter.js";

const convertMarkdown = async (markdown: string, options: MarkdownDocxOptions) => {
  const document = await markdownDocx(markdown, options);
  return Packer.toBuffer(document);
};

const normalizeMarkdown = (markdown?: string) => {
  const trimmed = markdown?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "";
};

const MARKDOWN_OPTIONS: MarkdownDocxOptions = {
  gfm: true,
  breaks: true,
  ignoreHtml: false,
  ignoreFootnote: false,
};

export const convertMarkdownToWordBodyXml = async (markdown?: string) => {
  const safeMarkdown = normalizeMarkdown(markdown) || "\n";
  const buffer = await convertMarkdown(safeMarkdown, MARKDOWN_OPTIONS);
  const zip = new PizZip(buffer);
  const documentXml = zip.file("word/document.xml")?.asText();

  if (!documentXml) {
    throw new Error("Gagal mengonversi Markdown menjadi dokumen Word");
  }

  return extractBodyInnerXml(documentXml);
};
