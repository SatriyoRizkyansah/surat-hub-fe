declare module "libreoffice-convert" {
  type LibreOfficeCallback = (error: Error | null, result?: Buffer | Uint8Array) => void;

  type LibreOfficeConvert = (document: Buffer, format: string, filter: string | undefined, callback?: LibreOfficeCallback) => void;
  type LibreOfficeConvertWithOptions = (document: Buffer, format: string, filter: string | undefined, options: Record<string, unknown>, callback?: LibreOfficeCallback) => void;

  export const convert: LibreOfficeConvert;
  export const convertWithOptions: LibreOfficeConvertWithOptions;

  const _default: {
    convert: LibreOfficeConvert;
    convertWithOptions: LibreOfficeConvertWithOptions;
  };

  export default _default;
}
