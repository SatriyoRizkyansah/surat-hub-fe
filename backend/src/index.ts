import path from "node:path";
import express, { type Request, type Response } from "express";
import cors from "cors";
import { generateSuratDocx } from "./docxService.js";
import { generateSuratPdf } from "./pdfService.js";
import { claimSuratMetadata, previewSuratMetadata } from "./metadataService.js";

const PORT = process.env.PORT ?? 5000;
const app = express();

app.use(cors());
app.use(express.json({ limit: "5mb" }));
app.use("/assets", express.static(path.resolve(process.cwd(), "public", "assets")));

app.post("/api/export-docx", async (req: Request, res: Response) => {
  try {
    const { templateId = "surat-tugas", content }: { templateId?: string; content?: string } = req.body ?? {};

    if (!content) {
      return res.status(400).json({ message: "content (HTML) wajib diisi" });
    }

    const metadata = claimSuratMetadata();

    const buffer = await generateSuratDocx({
      templateId,
      fields: {
        unit_pengirim: metadata.unit_pengirim,
        no_surat: metadata.no_surat,
        tanggal_terbit: metadata.tanggal_terbit,
        penandatangan_nama: metadata.penandatangan.nama,
        penandatangan_jabatan: metadata.penandatangan.jabatan,
        penandatangan_nip: metadata.penandatangan.nip,
      },
      contentHtml: content,
    });

    res.setHeader("Content-Type", "application/vnd.openxmlformats-officedocument.wordprocessingml.document");
    res.setHeader("Content-Disposition", 'attachment; filename="surat.docx"');
    res.setHeader("X-No-Surat", metadata.no_surat);
    res.setHeader("X-Unit-Pengirim", metadata.unit_pengirim);
    return res.send(buffer);
  } catch (error) {
    console.error("Gagal membuat DOCX", error);
    return res.status(500).json({ message: "Gagal membuat dokumen", detail: (error as Error).message });
  }
});

app.post("/api/export-pdf", async (req: Request, res: Response) => {
  try {
    const { templateId = "surat-tugas", content }: { templateId?: string; content?: string } = req.body ?? {};

    if (!content) {
      return res.status(400).json({ message: "content (HTML) wajib diisi" });
    }

    const metadata = claimSuratMetadata();

    const buffer = await generateSuratPdf({
      templateId,
      contentHtml: content,
      fields: {
        unit_pengirim: metadata.unit_pengirim,
        no_surat: metadata.no_surat,
        tanggal_terbit: metadata.tanggal_terbit,
        penandatangan_nama: metadata.penandatangan.nama,
        penandatangan_jabatan: metadata.penandatangan.jabatan,
        penandatangan_nip: metadata.penandatangan.nip,
      },
    });

    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", `attachment; filename="${templateId || "surat"}.pdf"`);
    res.setHeader("X-No-Surat", metadata.no_surat);
    res.setHeader("X-Unit-Pengirim", metadata.unit_pengirim);
    return res.send(buffer);
  } catch (error) {
    console.error("Gagal membuat PDF", error);
    return res.status(500).json({ message: "Gagal membuat PDF", detail: (error as Error).message });
  }
});

app.get("/api/surat/metadata/preview", (_req: Request, res: Response) => {
  const metadata = previewSuratMetadata();
  res.json(metadata);
});

app.get("/api/health", (_req: Request, res: Response) => {
  res.json({ status: "ok", time: new Date().toISOString() });
});

app.use("/templates", express.static(path.resolve(process.cwd(), "backend", "templates")));

app.listen(PORT, () => {
  console.log(`Surat Hub backend listening on http://localhost:${PORT}`);
});
