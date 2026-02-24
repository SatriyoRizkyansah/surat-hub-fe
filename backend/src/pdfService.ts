import type { SuratFields } from "./docxService.js";
import { generateSuratDocx } from "./docxService.js";
import { convertDocxToPdf } from "./libreofficeService.js";

type GeneratePdfParams = {
  templateId: string;
  fields: SuratFields;
  contentHtml: string;
};

export async function generateSuratPdf({ templateId, fields, contentHtml }: GeneratePdfParams): Promise<Buffer> {
  const docxBuffer = await generateSuratDocx({ templateId, fields, contentHtml });
  return convertDocxToPdf(docxBuffer);
}
