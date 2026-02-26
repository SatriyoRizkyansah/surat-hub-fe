import { wrapWithLetterhead } from "../templates/letterhead";

const MM_PER_INCH = 25.4;
const DPI = 96;
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const HEADER_HEIGHT_MM = 62;
const FOOTER_HEIGHT_MM = 34;
const BODY_HEIGHT_MM = PAGE_HEIGHT_MM - HEADER_HEIGHT_MM - FOOTER_HEIGHT_MM;

const mmToPx = (mm: number) => (mm / MM_PER_INCH) * DPI;
const PAGE_WIDTH_PX = mmToPx(PAGE_WIDTH_MM);
const BODY_LIMIT_PX = mmToPx(BODY_HEIGHT_MM);

const serializeNode = (node: ChildNode): string => {
  if (node.nodeType === Node.ELEMENT_NODE) {
    return (node as HTMLElement).outerHTML;
  }
  return node.textContent ?? "";
};

const prepareMeasurementBody = () => {
  let root = document.getElementById("pagination-measure-root") as HTMLDivElement | null;
  if (!root) {
    root = document.createElement("div");
    root.id = "pagination-measure-root";
    root.className = "ck-content";
    root.style.position = "absolute";
    root.style.left = "-9999px";
    root.style.top = "0";
    root.style.width = `${PAGE_WIDTH_PX}px`;
    root.style.pointerEvents = "none";
    root.style.visibility = "hidden";
    document.body.appendChild(root);
  }

  root.innerHTML = "";

  const body = document.createElement("div");
  body.className = "word-body";
  body.style.minHeight = "0";
  body.style.width = "100%";
  body.style.padding = "0";
  body.style.margin = "0";
  root.appendChild(body);
  return body;
};

export type PaginatedLetterResult = {
  wrappedPages: string[];
  bodySegments: string[];
};

export const paginateLetterPages = (bodyHtml: string): PaginatedLetterResult => {
  if (typeof document === "undefined") {
    return {
      wrappedPages: [wrapWithLetterhead(bodyHtml)],
      bodySegments: [bodyHtml],
    };
  }

  const measurementBody = prepareMeasurementBody();
  const parser = new DOMParser();
  const doc = parser.parseFromString(`<div>${bodyHtml}</div>`, "text/html");
  const nodes = Array.from(doc.body.childNodes).filter((node) => {
    if (node.nodeType === Node.TEXT_NODE) {
      return (node.textContent ?? "").trim() !== "";
    }
    return true;
  });

  const wrappedPages: string[] = [];
  const bodySegments: string[] = [];
  let currentParts: string[] = [];

  const flushPage = () => {
    const combined = currentParts.join("").trim() || "<p><br /></p>";
    bodySegments.push(combined);
    wrappedPages.push(wrapWithLetterhead(combined));
    currentParts = [];
    measurementBody.innerHTML = "";
  };

  if (nodes.length === 0) {
    flushPage();
    return { wrappedPages, bodySegments };
  }

  nodes.forEach((node, index) => {
    const serialized = serializeNode(node);
    const heightAfterAppend = (() => {
      const clone = node.cloneNode(true);
      measurementBody.appendChild(clone);
      return measurementBody.scrollHeight;
    })();

    if (heightAfterAppend <= BODY_LIMIT_PX || currentParts.length === 0) {
      currentParts.push(serialized);
    } else {
      flushPage();
      const clone = node.cloneNode(true);
      measurementBody.appendChild(clone);
      currentParts.push(serialized);
    }

    if (index === nodes.length - 1) {
      flushPage();
    }
  });

  return { wrappedPages, bodySegments };
};
