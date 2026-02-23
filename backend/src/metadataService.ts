const DEFAULT_UNIT = process.env.UNIT_PENGIRIM ?? "Lembaga Sertifikasi Profesi";
const DEFAULT_KODE_UNIT = process.env.KODE_UNIT ?? "LSP";

const DEFAULT_SIGNER = {
  nama: process.env.PENANDATANGAN_NAMA ?? "Dr. Nur Azizah, S.Kom., M.M.",
  jabatan: process.env.PENANDATANGAN_JABATAN ?? "Kepala Lembaga Sertifikasi Profesi",
  nip: process.env.PENANDATANGAN_NIP ?? "19790821 200801 2 002",
};

type Penandatangan = typeof DEFAULT_SIGNER;

export type SuratMetadata = {
  unit_pengirim: string;
  no_surat: string;
  tanggal_terbit: string;
  penandatangan: Penandatangan;
};

let currentPeriodKey = buildPeriodKey(new Date());
let sequence = 0;

function buildPeriodKey(date: Date) {
  return `${date.getFullYear()}-${date.getMonth() + 1}`;
}

function toRoman(num: number) {
  const romanMap: [number, string][] = [
    [1000, "M"],
    [900, "CM"],
    [500, "D"],
    [400, "CD"],
    [100, "C"],
    [90, "XC"],
    [50, "L"],
    [40, "XL"],
    [10, "X"],
    [9, "IX"],
    [5, "V"],
    [4, "IV"],
    [1, "I"],
  ];
  let result = "";
  let remaining = num;
  for (const [value, symbol] of romanMap) {
    while (remaining >= value) {
      result += symbol;
      remaining -= value;
    }
  }
  return result;
}

function formatTanggalIndonesia(date: Date) {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "long", year: "numeric" }).format(date);
}

function ensurePeriod(date: Date) {
  const key = buildPeriodKey(date);
  if (key !== currentPeriodKey) {
    currentPeriodKey = key;
    sequence = 0;
  }
  return key;
}

function composeNomorSurat(seq: number, date: Date) {
  const romanMonth = toRoman(date.getMonth() + 1);
  const padded = seq.toString().padStart(3, "0");
  return `${padded}/${DEFAULT_KODE_UNIT}/${romanMonth}/${date.getFullYear()}`;
}

function buildMetadata(seq: number, date: Date): SuratMetadata {
  return {
    unit_pengirim: DEFAULT_UNIT,
    no_surat: composeNomorSurat(seq, date),
    tanggal_terbit: formatTanggalIndonesia(date),
    penandatangan: DEFAULT_SIGNER,
  };
}

export function previewSuratMetadata(): SuratMetadata {
  const now = new Date();
  ensurePeriod(now);
  return buildMetadata(sequence + 1, now);
}

export function claimSuratMetadata(): SuratMetadata {
  const now = new Date();
  ensurePeriod(now);
  sequence += 1;
  return buildMetadata(sequence, now);
}
