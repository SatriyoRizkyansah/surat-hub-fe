# 🧾 FLOW FRONTEND - SISTEM SURAT (FINAL)

## 🧠 KONSEP UTAMA
Surat bukan proses sekali submit, tapi **stateful process (bertahap)**:

Draft → Generate Nomor → Export PDF → Distribusi

---

# 🎯 FLOW UTAMA FRONTEND

## 🔹 1. Buat Surat (Create Draft)

**Endpoint**
POST /api/surat

**Response**
{
  "id": "uuid-surat"
}

**Frontend Behavior**
- Simpan `surat_id`
- Redirect ke halaman editor

---

## 🔹 2. Halaman Editor Surat

### 🧩 Komponen UI:
- Input perihal
- Dropdown kategori surat
- Dropdown kode masalah
- Rich Text Editor (isi surat)
- Tombol:
  - 💾 Simpan
  - 🔢 Generate Nomor
  - 📄 Export PDF
  - 📤 Kirim

---

## 🔹 3. Simpan / Update Surat

**Endpoint**
PATCH /api/surat/:id

**Body**
{
  "content": "<html>",
  "perihal": "...",
  "idKodeMasalah": "..."
}

**Frontend Behavior**
- Auto save (debounce 1–2 detik) ATAU manual
- Simpan semua perubahan editor

---

## 🔹 4. Generate Nomor Surat

**Endpoint**
POST /api/surat/:id/generate-nomor

**Response**
{
  "nomorSurat": "001/D.12/UNPAM/KM/III/2026"
}

---

## 🔥 INJECT NOMOR SURAT KE EDITOR

Gunakan placeholder di editor:

Nomor: {{nomor_surat}}

**Frontend Replace**
```js
content = content.replace('{{nomor_surat}}', nomorSurat)