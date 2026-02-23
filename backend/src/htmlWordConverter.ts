import { AlignmentType, BorderStyle, Document, NumberFormat, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import PizZip from "pizzip";
import { decode } from "html-entities";
import { HTMLElement, NodeType, parse } from "node-html-parser";

const ORDERED_LIST_REFERENCE = "ordered-list";
const BULLET_LIST_REFERENCE = "bullet-list";
const LINE_SPACING = 360;
const FIRST_LINE_INDENT = 520;
const LINE_SPACING_AFTER_DEFAULT = 120;
const LINE_SPACING_AFTER_META = 40;
const LINE_SPACING_AFTER_LIST = 60;
const TABLE_BORDER_COLOR = "B4C6E7";

const NON_INDENT_CLASSNAMES = new Set(["word-meta", "word-address", "word-signature", "word-detail", "word-footer", "word-signature__name", "word-signature__id"]);

type ListState = { type: "ordered" | "bullet"; level: number };

type ConverterContext = {
  classPath: string[];
  list?: ListState;
};

type InlineFormatting = {
  bold?: boolean;
  italics?: boolean;
  underline?: boolean;
  caps?: boolean;
};

const getTagName = (element: HTMLElement) => element.tagName.toLowerCase();

const getClassNames = (element?: HTMLElement) =>
  (element?.classNames ?? "")
    .split(/\s+/)
    .map((name) => name.trim())
    .filter(Boolean);

const extendClassPath = (context: ConverterContext, element: HTMLElement) => [...context.classPath, ...getClassNames(element)];

const hasClassInContext = (context: ConverterContext, className: string) => context.classPath.includes(className);

const shouldIndent = (context: ConverterContext) => {
  if (context.list) {
    return false;
  }

  return !context.classPath.some((className) => NON_INDENT_CLASSNAMES.has(className));
};

const getParagraphSpacing = (context: ConverterContext) => {
  if (context.list) {
    return { line: LINE_SPACING, lineRule: "auto", after: LINE_SPACING_AFTER_LIST } as const;
  }

  if (hasClassInContext(context, "word-meta")) {
    return { line: LINE_SPACING, lineRule: "auto", after: LINE_SPACING_AFTER_META } as const;
  }

  return { line: LINE_SPACING, lineRule: "auto", after: LINE_SPACING_AFTER_DEFAULT } as const;
};

const getParagraphAlignment = (context: ConverterContext) => {
  if (hasClassInContext(context, "word-address") || hasClassInContext(context, "word-signature")) {
    return AlignmentType.LEFT;
  }

  return AlignmentType.JUSTIFIED;
};

const numberingConfig = [
  {
    reference: ORDERED_LIST_REFERENCE,
    levels: [
      {
        level: 0,
        format: NumberFormat.DECIMAL,
        text: "%1.",
        alignment: AlignmentType.START,
        style: {
          paragraph: {
            indent: {
              left: 720,
              hanging: 360,
            },
          },
        },
      },
    ],
  },
  {
    reference: BULLET_LIST_REFERENCE,
    levels: [
      {
        level: 0,
        format: NumberFormat.BULLET,
        text: "\u2022",
        alignment: AlignmentType.START,
        style: {
          paragraph: {
            indent: {
              left: 720,
              hanging: 360,
            },
          },
        },
      },
    ],
  },
];

const sanitizeText = (value: string) => {
  const decoded = decode(value.replace(/\r?\n+/g, " ")).replace(/\u00A0/g, " ");
  if (!decoded.trim()) {
    return "";
  }
  return decoded.replace(/\s+/g, " ");
};

const convertInlineChildren = (nodes: HTMLElement["childNodes"], context: ConverterContext, formatting: InlineFormatting): TextRun[] => {
  const runs: TextRun[] = [];

  nodes.forEach((node) => {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const sanitized = sanitizeText(node.rawText ?? "");
      if (!sanitized) return;
      runs.push(
        new TextRun({
          text: sanitized,
          bold: formatting.bold,
          italics: formatting.italics,
          underline: formatting.underline ? {} : undefined,
          allCaps: formatting.caps,
        }),
      );
      return;
    }

    if (!(node instanceof HTMLElement)) {
      return;
    }

    const tag = getTagName(node);
    if (tag === "br") {
      runs.push(new TextRun({ break: 1 }));
      return;
    }

    const nextFormatting: InlineFormatting = { ...formatting };

    if (tag === "strong" || tag === "b") nextFormatting.bold = true;
    if (tag === "em" || tag === "i") nextFormatting.italics = true;
    if (tag === "u") nextFormatting.underline = true;

    const styleAttr = node.getAttribute("style") ?? "";
    if (/font-weight\s*:\s*(bold|600|700)/i.test(styleAttr)) nextFormatting.bold = true;
    if (/font-style\s*:\s*italic/i.test(styleAttr)) nextFormatting.italics = true;
    if (/text-decoration\s*:\s*underline/i.test(styleAttr)) nextFormatting.underline = true;

    if (getClassNames(node).includes("word-signature__name")) {
      nextFormatting.caps = true;
      nextFormatting.bold = true;
    }

    const childContext: ConverterContext = {
      ...context,
      classPath: extendClassPath(context, node),
    };

    runs.push(...convertInlineChildren(node.childNodes, childContext, nextFormatting));
  });

  return runs;
};

const createParagraph = (element: HTMLElement, context: ConverterContext) => {
  const runs = convertInlineChildren(element.childNodes, context, {});
  const children = runs.length ? runs : [new TextRun("")];

  return new Paragraph({
    children,
    spacing: getParagraphSpacing(context),
    alignment: getParagraphAlignment(context),
    indent: context.list || !shouldIndent(context) ? undefined : { firstLine: FIRST_LINE_INDENT },
    numbering: context.list
      ? {
          reference: context.list.type === "ordered" ? ORDERED_LIST_REFERENCE : BULLET_LIST_REFERENCE,
          level: context.list.level,
        }
      : undefined,
  });
};

const convertList = (element: HTMLElement, context: ConverterContext, type: ListState["type"]): (Paragraph | Table)[] => {
  const baseContext: ConverterContext = {
    ...context,
    classPath: extendClassPath(context, element),
  };

  const level = (context.list?.level ?? -1) + 1;

  return element.childNodes.filter((node): node is HTMLElement => node instanceof HTMLElement && getTagName(node) === "li").flatMap((node) => convertElement(node, { ...baseContext, list: { type, level } }));
};

const createTable = (element: HTMLElement, context: ConverterContext) => {
  const tableContext: ConverterContext = {
    ...context,
    classPath: extendClassPath(context, element),
  };

  const rows = element.querySelectorAll("tr").map((row) => {
    const rowContext: ConverterContext = {
      ...tableContext,
      classPath: extendClassPath(tableContext, row),
    };

    const cells = row.querySelectorAll("th,td").map((cell) => {
      const cellContext: ConverterContext = {
        ...rowContext,
        classPath: extendClassPath(rowContext, cell),
      };

      const paragraphs = convertNodes(cell.childNodes, cellContext).filter((block): block is Paragraph => block instanceof Paragraph);
      if (!paragraphs.length) {
        paragraphs.push(new Paragraph({ children: [new TextRun("")], spacing: getParagraphSpacing(cellContext) }));
      }

      return new TableCell({
        children: paragraphs,
        margins: { top: 80, bottom: 80, left: 120, right: 120 },
      });
    });

    return new TableRow({ children: cells });
  });

  return new Table({
    rows,
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: { style: BorderStyle.SINGLE, color: TABLE_BORDER_COLOR, size: 4 },
      bottom: { style: BorderStyle.SINGLE, color: TABLE_BORDER_COLOR, size: 4 },
      left: { style: BorderStyle.SINGLE, color: TABLE_BORDER_COLOR, size: 4 },
      right: { style: BorderStyle.SINGLE, color: TABLE_BORDER_COLOR, size: 4 },
      insideHorizontal: { style: BorderStyle.SINGLE, color: TABLE_BORDER_COLOR, size: 4 },
      insideVertical: { style: BorderStyle.SINGLE, color: TABLE_BORDER_COLOR, size: 4 },
    },
  });
};

const convertElement = (element: HTMLElement, context: ConverterContext): (Paragraph | Table)[] => {
  const tag = getTagName(element);
  const scopedContext: ConverterContext = {
    ...context,
    classPath: extendClassPath(context, element),
  };

  switch (tag) {
    case "div":
    case "section":
    case "article":
      return convertNodes(element.childNodes, scopedContext);
    case "p":
    case "h1":
    case "h2":
    case "h3":
      return [createParagraph(element, scopedContext)];
    case "ol":
      return convertList(element, scopedContext, "ordered");
    case "ul":
      return convertList(element, scopedContext, "bullet");
    case "li":
      return [createParagraph(element, scopedContext)];
    case "table":
      return [createTable(element, scopedContext)];
    case "tbody":
    case "thead":
    case "tr":
      return convertNodes(element.childNodes, scopedContext);
    default:
      return [createParagraph(element, scopedContext)];
  }
};

const convertNodes = (nodes: HTMLElement["childNodes"], context: ConverterContext): (Paragraph | Table)[] => {
  const blocks: (Paragraph | Table)[] = [];

  nodes.forEach((node) => {
    if (node.nodeType === NodeType.TEXT_NODE) {
      const sanitized = sanitizeText(node.rawText ?? "");
      if (!sanitized) return;
      blocks.push(
        new Paragraph({
          children: [new TextRun(sanitized)],
          spacing: getParagraphSpacing(context),
          alignment: getParagraphAlignment(context),
        }),
      );
      return;
    }

    if (node instanceof HTMLElement) {
      blocks.push(...convertElement(node, context));
    }
  });

  return blocks;
};

export const extractBodyInnerXml = (documentXml: string) => {
  const bodyStartTag = "<w:body>";
  const bodyEndTag = "</w:body>";
  const bodyStart = documentXml.indexOf(bodyStartTag);
  const bodyEnd = documentXml.indexOf(bodyEndTag);

  if (bodyStart === -1 || bodyEnd === -1 || bodyEnd <= bodyStart) {
    throw new Error("Dokumen hasil konversi tidak memiliki struktur body yang valid");
  }

  const bodyInner = documentXml.slice(bodyStart + bodyStartTag.length, bodyEnd);
  return bodyInner
    .replace(/<w:sectPr[\s\S]*?<\/w:sectPr>/g, "")
    .replace(/<w:sectPr[^>]*\/>/g, "")
    .trim();
};

export const convertHtmlToWordBodyXml = async (html: string) => {
  const wrapperHtml = html.trim() ? html : "<p></p>";
  const root = parse(`<div data-docx-root>${wrapperHtml}</div>`, { lowerCaseTagName: false, comment: false });
  const mount = root.firstChild instanceof HTMLElement ? (root.firstChild as HTMLElement) : undefined;
  const children = mount ? convertNodes(mount.childNodes, { classPath: getClassNames(mount) }) : [];

  const document = new Document({
    numbering: { config: numberingConfig },
    sections: [
      {
        properties: {},
        children: children.length ? children : [new Paragraph("")],
      },
    ],
  });

  const buffer = await Packer.toBuffer(document);
  const zip = new PizZip(buffer);
  const documentXml = zip.file("word/document.xml")?.asText();

  if (!documentXml) {
    throw new Error("Gagal membentuk dokumen Word dari HTML");
  }

  return extractBodyInnerXml(documentXml);
};
