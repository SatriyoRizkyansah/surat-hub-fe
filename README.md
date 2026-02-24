# surat-hub-fe

Monorepo sederhana untuk aplikasi React + TypeScript (Vite) di sisi frontend dan Express + TypeScript di backend untuk otomatisasi surat kedinasan. Frontend masih mengikuti struktur template Vite sehingga dokumentasi resminya tetap relevan.

## Frontend stack (React + TypeScript + Vite)

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

### React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

### Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(['dist']),
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
    ],
    languageOptions: {
      parserOptions: {
        project: ['./tsconfig.node.json', './tsconfig.app.json'],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
])
```

### React-specific lint plugins

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

```js
// eslint.config.js
import reactX from "eslint-plugin-react-x";
import reactDom from "eslint-plugin-react-dom";

export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...
      // Enable lint rules for React
      reactX.configs["recommended-typescript"],
      // Enable lint rules for React DOM
      reactDom.configs.recommended,
    ],
    languageOptions: {
      parserOptions: {
        project: ["./tsconfig.node.json", "./tsconfig.app.json"],
        tsconfigRootDir: import.meta.dirname,
      },
      // other options...
    },
  },
]);
```

## Backend DOCX/PDF export highlights

- `backend/src/docxService.ts` sekarang mengandalkan `convertHtmlToWordXml` untuk mengubah HTML menjadi WordprocessingML sebelum disisipkan ke template `.docx` di `backend/templates`.
- `backend/src/htmlConversionService.ts` akan memberi style dasar (Times New Roman, indentasi paragraf, tabel/list rapi) dan menjaga struktur tetap kompatibel dengan Word.
- Endpoint `POST /api/export-docx` menerima `{ templateId, content }`, menggabungkan metadata surat, lalu mengembalikan buffer DOCX dengan header metadata tambahan.
- Endpoint `POST /api/export-pdf` sekarang **generate DOCX terlebih dahulu lalu mengonversinya ke PDF via LibreOffice** sehingga header/footer 100% mengikuti template Word yang sama (`contoh-template.docx`). Pastikan binary `soffice` tersedia di PATH server.

### Running the backend locally

```bash
cd backend
npm install
npm run dev
```

When you send HTML through the `/api/export-docx` payload it will be converted using the new service before injection into the Word template, memastikan tata letak tidak berantakan.
