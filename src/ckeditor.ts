/* eslint-disable @typescript-eslint/ban-ts-comment */
// @ts-nocheck
import ClassicEditorBase from "@ckeditor/ckeditor5-editor-classic/src/classiceditor.js";
import type { EditorConfig } from "@ckeditor/ckeditor5-core/src/editor/editorconfig.js";
import Essentials from "@ckeditor/ckeditor5-essentials/src/essentials.js";
import Paragraph from "@ckeditor/ckeditor5-paragraph/src/paragraph.js";
import Heading from "@ckeditor/ckeditor5-heading/src/heading.js";
import Bold from "@ckeditor/ckeditor5-basic-styles/src/bold.js";
import Italic from "@ckeditor/ckeditor5-basic-styles/src/italic.js";
import Underline from "@ckeditor/ckeditor5-basic-styles/src/underline.js";
import RemoveFormat from "@ckeditor/ckeditor5-remove-format/src/removeformat.js";
import Alignment from "@ckeditor/ckeditor5-alignment/src/alignment.js";
import FontFamily from "@ckeditor/ckeditor5-font/src/fontfamily.js";
import FontSize from "@ckeditor/ckeditor5-font/src/fontsize.js";
import List from "@ckeditor/ckeditor5-list/src/list.js";
import ListProperties from "@ckeditor/ckeditor5-list/src/listproperties.js";
import Indent from "@ckeditor/ckeditor5-indent/src/indent.js";
import IndentBlock from "@ckeditor/ckeditor5-indent/src/indentblock.js";
import BlockQuote from "@ckeditor/ckeditor5-block-quote/src/blockquote.js";
import Link from "@ckeditor/ckeditor5-link/src/link.js";
import Table from "@ckeditor/ckeditor5-table/src/table.js";
import TableToolbar from "@ckeditor/ckeditor5-table/src/tabletoolbar.js";
import TableProperties from "@ckeditor/ckeditor5-table/src/tableproperties.js";
import TableCellProperties from "@ckeditor/ckeditor5-table/src/tablecellproperties.js";
import HorizontalLine from "@ckeditor/ckeditor5-horizontal-line/src/horizontalline.js";
import GeneralHtmlSupport from "@ckeditor/ckeditor5-html-support/src/generalhtmlsupport.js";
import PasteFromOffice from "@ckeditor/ckeditor5-paste-from-office/src/pastefromoffice.js";
import SelectAll from "@ckeditor/ckeditor5-select-all/src/selectall.js";

class ClassicLetterEditor extends ClassicEditorBase {}

ClassicLetterEditor.builtinPlugins = [
  Essentials,
  Paragraph,
  Heading,
  Bold,
  Italic,
  Underline,
  RemoveFormat,
  Alignment,
  FontFamily,
  FontSize,
  List,
  ListProperties,
  Indent,
  IndentBlock,
  BlockQuote,
  Link,
  Table,
  TableToolbar,
  TableProperties,
  TableCellProperties,
  HorizontalLine,
  GeneralHtmlSupport,
  PasteFromOffice,
  SelectAll,
];

ClassicLetterEditor.defaultConfig = {
  toolbar: {
    items: [
      "undo",
      "redo",
      "|",
      "heading",
      "fontFamily",
      "fontSize",
      "|",
      "bold",
      "italic",
      "underline",
      "removeFormat",
      "|",
      "alignment",
      "outdent",
      "indent",
      "|",
      "bulletedList",
      "numberedList",
      "|",
      "link",
      "blockQuote",
      "horizontalLine",
      "insertTable",
      "selectAll",
    ],
    shouldNotGroupWhenFull: true,
  },
  fontFamily: {
    options: ["default", "Times New Roman, Times, serif", "Calibri, sans-serif", "Cambria, Georgia, serif", "Arial, Helvetica, sans-serif"],
    supportAllValues: true,
  },
  fontSize: {
    options: [8, 9, 10, 11, 12, 14, 16, 18, 20, 22, 24, 26, 28, 32, 36, 40, 44, 48],
    supportAllValues: true,
  },
  alignment: {
    options: ["left", "center", "right", "justify"],
  },
  list: {
    properties: {
      styles: true,
      startIndex: true,
      reversed: true,
    },
  },
  table: {
    contentToolbar: ["tableColumn", "tableRow", "mergeTableCells", "tableProperties", "tableCellProperties"],
  },
  htmlSupport: {
    allow: [
      {
        name: /.*?/,
        attributes: true,
        classes: true,
        styles: true,
      },
    ],
  },
  language: "id",
} as unknown as EditorConfig;

export default ClassicLetterEditor;
