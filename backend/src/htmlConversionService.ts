import htmlToDocx from "html-to-docx";

const normalizeHtmlForDocx = (html: string) => {
  // Remove common CKEditor artifacts that convert into whitespace-only paragraphs in DOCX.
  let out = html ?? "";

  // Non-breaking spaces become significant whitespace in Word.
  out = out.replace(/\u00A0/g, " ");

  // Remove empty paragraphs (including ones made from &nbsp; and <br>).
  out = out.replace(/<p>(?:\s|&nbsp;|<br\s*\/?\s*>)*<\/p>/gi, "");

  // Collapse multiple <br> into one.
  out = out.replace(/(?:<br\s*\/?\s*>\s*){2,}/gi, "<br />");

  // Remove empty inline wrappers.
  out = out.replace(/<(strong|em|u|span|b|i)>(?:\s|&nbsp;)*<\/\1>/gi, "");

  return out.trim();
};

/**
 * Converts HTML content to DOCX buffer
 * Used for both PDF and DOCX generation
 */
export async function convertHtmlToDocx(html: string): Promise<Buffer> {
  const normalizedHtml = normalizeHtmlForDocx(html);

  if (!normalizedHtml || normalizedHtml.trim() === "") {
    // Return minimal DOCX
    const emptyDocx = await htmlToDocx("<p></p>");
    return Buffer.from(emptyDocx);
  }

  try {
    // Wrap HTML with proper styling
    const wrappedHtml = `
      <html>
        <head>
          <style>
            * {
              font-family: 'Times New Roman', serif;
              font-size: 12pt;
              color: #1f2a37;
            }
            
            body {
              margin: 0;
              padding: 0;
            }
            
            p {
              margin: 0 0 6px 0;
              text-align: justify;
              line-height: 1.5;
              text-indent: 0;
            }

            br {
              line-height: 1.5;
            }
            
            p:first-child {
              text-indent: 0;
            }
            
            h1, h2, h3, h4, h5, h6 {
              margin: 8px 0 4px 0;
              text-indent: 0;
              font-weight: bold;
            }
            
            h1 { font-size: 22pt; }
            h2 { font-size: 18pt; }
            h3 { font-size: 16pt; }
            h4 { font-size: 14pt; }
            h5 { font-size: 13pt; }
            h6 { font-size: 12pt; }
            
            strong { font-weight: bold; }
            em { font-style: italic; }
            u { text-decoration: underline; }
            
            a {
              color: #1b3263;
              text-decoration: underline;
              font-weight: bold;
            }
            
            table {
              width: 100%;
              border-collapse: collapse;
              margin: 12px 0;
            }
            
            td, th {
              border: 1px solid #d6dae2;
              padding: 6px 8px;
              vertical-align: top;
              font-size: 11pt;
              text-align: left;
            }
            
            th {
              font-weight: bold;
              background-color: #f5f5f5;
            }
            
            ul {
              margin: 0 0 6px 0.5in;
              padding: 0;
              list-style-type: disc;
            }
            
            ol {
              margin: 0 0 6px 0.5in;
              padding: 0;
              list-style-type: decimal;
            }
            
            li {
              margin-bottom: 4px;
              text-align: justify;
            }
            
            blockquote {
              margin: 8px 0;
              padding: 0 0.5in;
              border-left: 3px solid #d6dae2;
              font-style: italic;
            }
          </style>
        </head>
        <body>
          ${normalizedHtml}
        </body>
      </html>
    `;

    // Convert to DOCX
    const docxArrayBuffer = await htmlToDocx(wrappedHtml);
    return Buffer.from(docxArrayBuffer);
  } catch (error) {
    console.error("Error converting HTML to DOCX:", error);
    throw new Error(`HTML to DOCX conversion failed: ${(error as Error).message}`);
  }
}
