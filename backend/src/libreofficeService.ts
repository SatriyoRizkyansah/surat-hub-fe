import libreofficeConvert from "libreoffice-convert";

const OUTPUT_EXTENSION = ".pdf";

export async function convertDocxToPdf(docxBuffer: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    libreofficeConvert.convert(docxBuffer, OUTPUT_EXTENSION, undefined, (error: Error | null, result: Buffer | Uint8Array | undefined) => {
      if (error) {
        reject(error);
        return;
      }

      if (!result) {
        reject(new Error("LibreOffice conversion did not return a result"));
        return;
      }

      resolve(Buffer.from(result));
    });
  });
}
