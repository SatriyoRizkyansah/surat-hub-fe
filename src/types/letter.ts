/**
 * Informasi unit organisasi pengirim surat.
 * Data ini nantinya akan datang dari backend (API) berdasarkan
 * user yang login atau unit yang dipilih.
 */
export interface UnitInfo {
  /** Baris yayasan, misal "YAYASAN SASMITA JAYA" */
  institutionLine: string;
  /** Baris universitas, misal "UNIVERSITAS PAMULANG" */
  universityLine: string;
  /** Nama unit/fakultas, misal "FAKULTAS TEKNIK" */
  unitName: string;
  /** Sub-unit / label tambahan, misal '"LEMBAGA SERTIFIKASI PROFESI"' */
  subUnit: string;
  /** URL atau path logo kiri */
  logoLeft: string;
  /** URL atau path logo kanan */
  logoRight: string;
  /** Email unit */
  email: string;
  /** Website unit */
  website: string;
  /** Instagram handle */
  instagram: string;
}

/**
 * Alamat kampus. Bisa statis (config) atau dinamis dari backend.
 */
export interface CampusAddress {
  label: string;
  value: string;
}

/**
 * Metadata surat yang di-generate atau dikonfigurasi per surat.
 */
export interface LetterMeta {
  /** Nomor surat, misal "012/UND/LSP/II/2026" */
  nomorSurat: string;
  /** Tanggal surat */
  tanggalSurat: string;
  /** URL QR code (bisa data:uri atau path lokal) */
  qrCodeUrl: string;
  /** Label di bawah QR code */
  qrLabel: string;
  /** ID template yang dipakai */
  templateId: string;
}

/**
 * Context lengkap untuk merender surat (header + footer + export).
 * Digunakan oleh letterhead builder, preview, dan PDF server.
 */
export interface LetterContext {
  unit: UnitInfo;
  meta: LetterMeta;
  addresses: CampusAddress[];
}
