import { Packer } from "docx";
import markdownDocx, { type MarkdownDocxOptions } from "markdown-docx";
import PizZip from "pizzip";
import { extractBodyInnerXml } from "./htmlWordConverter.js";

export type MarkdownWordArtifacts = {
  bodyXml: string;
  stylesXml?: string;
  numberingXml?: string;
};

const convertMarkdown = async (markdown: string, options: MarkdownDocxOptions) => {
  const document = await markdownDocx(markdown, options);
  return Packer.toBuffer(document);
};

const normalizeMarkdown = (markdown?: string) => {
  const trimmed = markdown?.trim();
  return trimmed && trimmed.length > 0 ? trimmed : "";
};

const DEFAULT_DOCUMENT_STYLES: NonNullable<MarkdownDocxOptions["document"]> = {
  styles: {
    default: {
      document: {
        run: {
          font: "Times New Roman",
          size: 24,
        },
        paragraph: {
          spacing: {
            line: 360,
            lineRule: "auto",
            after: 120,
          },
        },
      },
    },
  },
};

const MARKDOWN_OPTIONS: MarkdownDocxOptions = {
  gfm: true,
  breaks: true,
  ignoreHtml: false,
  ignoreFootnote: false,
  document: DEFAULT_DOCUMENT_STYLES,
};

export const convertMarkdownToWordArtifacts = async (markdown?: string): Promise<MarkdownWordArtifacts> => {
  const safeMarkdown = normalizeMarkdown(markdown) || "\n";
  const buffer = await convertMarkdown(safeMarkdown, MARKDOWN_OPTIONS);
  const zip = new PizZip(buffer);
  const documentXml = zip.file("word/document.xml")?.asText();

  if (!documentXml) {
    throw new Error("Gagal mengonversi Markdown menjadi dokumen Word");
  }

  return {
    bodyXml: extractBodyInnerXml(documentXml),
    stylesXml: zip.file("word/styles.xml")?.asText(),
    numberingXml: zip.file("word/numbering.xml")?.asText(),
  };
};
