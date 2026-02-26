# React + TypeScript + Vite

This template provides a minimal setup to get React working in Vite with HMR and some ESLint rules.

## Requirements

- Node.js 20.19 or newer (Vite 7 raises warnings on older 20.x releases)

Currently, two official plugins are available:

- [@vitejs/plugin-react](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react) uses [Babel](https://babeljs.io/) (or [oxc](https://oxc.rs) when used in [rolldown-vite](https://vite.dev/guide/rolldown)) for Fast Refresh
- [@vitejs/plugin-react-swc](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react-swc) uses [SWC](https://swc.rs/) for Fast Refresh

## React Compiler

The React Compiler is not enabled on this template because of its impact on dev & build performances. To add it, see [this documentation](https://react.dev/learn/react-compiler/installation).

## Expanding the ESLint configuration

If you are developing a production application, we recommend updating the configuration to enable type-aware lint rules:

```js
export default defineConfig([
  globalIgnores(["dist"]),
  {
    files: ["**/*.{ts,tsx}"],
    extends: [
      // Other configs...

      // Remove tseslint.configs.recommended and replace with this
      tseslint.configs.recommendedTypeChecked,
      // Alternatively, use this for stricter rules
      tseslint.configs.strictTypeChecked,
      // Optionally, add this for stylistic rules
      tseslint.configs.stylisticTypeChecked,

      // Other configs...
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

You can also install [eslint-plugin-react-x](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-x) and [eslint-plugin-react-dom](https://github.com/Rel1cx/eslint-react/tree/main/packages/plugins/eslint-plugin-react-dom) for React-specific lint rules:

````js
// eslint.config.js
import reactX from 'eslint-plugin-react-x'
import reactDom from 'eslint-plugin-react-dom'

export default defineConfig([
  globalIgnores(['dist']),
  {
    files: ['**/*.{ts,tsx}'],
    extends: [
      // Other configs...
      # surat-hub-fe

      Front-end for composing official letters with a Word-style letterhead using React, TypeScript, Vite, and CKEditor 5.

      ## Requirements

      - Node.js 20.19 or newer (Vite 7 warns on older 20.x versions)
      - npm 10+ (or another Node package manager if you prefer)

      ## Getting started

      ```bash
      npm install
      npm run dev
      ```

      Then open the URL printed by Vite (usually http://localhost:5173) to start editing the templates.

      ## Available scripts

      | Command          | Description                                |
      | ---------------- | ------------------------------------------ |
      | `npm run dev`    | Start the Vite dev server with HMR          |
      | `npm run build`  | Type-check then build static assets         |
      | `npm run preview`| Preview the production build locally        |

      ## Features

      - CKEditor 5 with customized toolbar and extended font families/sizes for official documents.
      - Auto-injected header and footer that mirror the organization letterhead on every page, including exports.
      - PDF and DOCX export helpers (DOCX via backend endpoint).
      - Tailored CSS to mimic A4 layout with precise margins, grids, and typography.

      ## Notes

      - The DOCX export endpoint `/api/export-docx` must be available in the backend folder for one-click document generation.
      - Update the assets under `public/assets/logo` if the organization branding changes.
````
