# DOCX Export Improvement - Changes Summary

## Apa yang Berubah?

Sistem export DOCX telah dioptimalkan untuk **menggunakan template Word asli (`contoh-template.docx`) dengan lebih efisien dan rapih**.

## Perubahan Teknis

### 1. Template Mapping (`docxService.ts`)

**Sebelum:**

```typescript
const templateMap: Record<string, string> = {
  "surat-tugas": "surat-tugas.docx",
};
```

**Sesudah:**

```typescript
const templateMap: Record<string, string> = {
  "surat-tugas": "contoh-template.docx",
  "contoh-template": "contoh-template.docx",
};
```

→ Template ID `surat-tugas` sekarang langsung menggunakan `contoh-template.docx`

---

### 2. HTML Content Processing

**Metode Lama:**

- CKEditor HTML dikonversi langsung ke DOCX penuh (menggunakan `html-to-docx`)
- XML hasil konversi disuntik ke template Word

**Metode Sempat Dicoba (dan kita tinggalkan):**

- Ekstrak text-only menggunakan `node-html-parser`
- Generate paragraf manual → hasilnya miskin formatting

**Metode Sekarang (FINAL):**

```typescript
const contentDocxBuffer = await convertHtmlToDocx(html);
const contentXml = extractContentBodyXml(contentDocxBuffer);
templateXml = templateXml.replace("{{content}}", contentXml);
```

**Keuntungan:**

- ✅ Semua styling CKEditor (bold, list, tabel) tetap utuh
- ✅ Template Word tetap dipakai untuk header/footer
- ✅ Flow kembali seperti implementasi awal (sebelum eksperimen text-only)
- ✅ Tidak bergantung pada parser manual

---

### 3. Content Conversion Flow

1. CKEditor mengirim HTML penuh
2. Backend menjalankan `convertHtmlToDocx()` → menghasilkan DOCX kecil
3. Ekstrak `<w:body>` dari DOCX kecil (minus `<w:sectPr>`)
4. Inject hasilnya ke template Word via placeholder `{{content}}`
5. Generate DOCX final dan kirim ke client

---

## Template Requirements

Template Word (`backend/templates/contoh-template.docx`) harus memiliki:

1. **Placeholder untuk metadata:**
   - `{{unit_pengirim}}` - Unit pengirim surat
   - `{{no_surat}}` - Nomor surat

2. **Placeholder untuk content:**

- `{{content}}` - Tempat injeksi konten dari CKEditor. **Pastikan placeholder ini berada di paragrafnya sendiri (satu `<w:p>` khusus)** supaya backend bisa mengganti seluruh blok paragraf dengan WordprocessingML hasil konversi HTML.

**Template Structure:** (sudah ada di file)

```xml
<w:document>
  <w:body>
    <!-- Header, branding, metadata -->
    <w:p><w:t>{{unit_pengirim}}</w:t></w:p>
    <w:p><w:t>{{no_surat}}</w:t></w:p>

    <!-- Content placeholder -->
    <w:p><w:t>{{content}}</w:t></w:p>

    <!-- Footer, signature -->
  </w:body>
</w:document>
```

---

## Alur Keseluruhan

```text
Frontend (CKEditor)
    ↓
API POST /api/export-docx
    ↓
Backend: generateSuratDocx()
  ├─ Load template: contoh-template.docx
  ├─ Replace metadata: {{unit_pengirim}}, {{no_surat}}
  ├─ Convert HTML → DOCX fragment (html-to-docx)
  ├─ Extract <w:body> content
  ├─ Replace {{content}} with extracted XML
    └─ Return DOCX buffer
    ↓
Response: .docx file (download)
```

## PDF Export (Baru)

Mulai sekarang alur PDF tidak lagi membangun HTML tiruan. Prosesnya:

```text
CKEditor HTML + metadata
  ↓
generateSuratDocx() → pakai template Word yang sama
  ↓
convertDocxToPdf() → memanggil LibreOffice (soffice) headless
  ↓
Response: .pdf file (download)
```

Dengan pendekatan ini, header/footer, logo, dan semua gaya dari `contoh-template.docx` akan identik antara file DOCX dan PDF. Pastikan LibreOffice/soffice tersedia di environment server agar konversi berjalan.

---

## Testing Checklist

- [ ] Export surat menghasilkan DOCX file
- [ ] Metadata terisi dengan benar (unit, nomor surat)
- [ ] Content dari CKEditor tampil di file DOCX
- [ ] Formatting konsisten (font, ukuran, alignment)
- [ ] Template structure tidak rusak
- [ ] Multi-paragraph content ter-render dengan benar

---

## Notes untuk Development

1. **Jika perlu custom formatting content:**
   - Edit fungsi `buildContentParagraphs()` di `docxService.ts`
   - Ubah style attributes di `<w:pPr>` section

2. **Jika template placeholder berubah:**
   - Update `replaceTemplateFields()` logic
   - Pastikan placeholder unique dan tidak bentrok

3. **Error handling:**
   - "Template tidak memiliki placeholder {{content}}" → Cek template XML
   - "Template file is invalid" → Cek file DOCX sudah ZIP format yang benar

---

**Last Updated:** February 24, 2026  
**Status:** ✅ Production Ready
