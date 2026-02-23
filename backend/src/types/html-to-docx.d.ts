declare module "html-to-docx" {
  type HtmlToDocxOptions = {
    font?: string;
    cssStyle?: string;
    getImageArrayBuffer?: (imageUrl: string) => Promise<ArrayBuffer> | ArrayBuffer;
    table?: {
      row?: {
        cantSplit?: boolean;
      };
    };
    footer?: boolean;
    header?: boolean;
    margins?: { top?: number; right?: number; bottom?: number; left?: number };
    page?: { size?: string; landscape?: boolean };
    width?: number;
  };

  export default function htmlToDocx(html: string, userOptions?: HtmlToDocxOptions, styleOptions?: HtmlToDocxOptions): Promise<ArrayBuffer>;
}
