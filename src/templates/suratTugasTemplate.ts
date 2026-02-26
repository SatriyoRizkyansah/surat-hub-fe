import { letterheadFooterHtml, letterheadHeaderHtml } from "./letterhead";

// Templates store RAW body content only.
// The editor wraps them with letterhead dynamically using the current LetterContext.

export const suratTugasHeader = letterheadHeaderHtml;

const suratTugasContent = `
  <div class="word-meta">
    <p><span>Nomor</span>: 012/UND/LSP/II/2026</p>
    <p><span>Lampiran</span>: -</p>
    <p><span>Hal</span>: Undangan Sosialisasi Urgensi Sertifikasi Mahasiswa SI</p>
  </div>

  <div class="word-address">
    <p>Kepada Yth.</p>
    <p><strong>Koordinator Program Studi Sistem Informasi</strong></p>
    <p>Universitas Pamulang</p>
    <p>di Tempat</p>
  </div>

  <p>Dengan hormat,</p>
  <p>
    Dalam rangka percepatan sertifikasi kompetensi mahasiswa, kami mengundang Bapak/Ibu untuk hadir pada kegiatan sosialisasi urgensi sertifikasi dengan detail berikut:
  </p>

  <table class="word-detail">
    <tr>
      <td>Hari/Tanggal</td>
      <td>: Senin, 3 Maret 2026</td>
    </tr>
    <tr>
      <td>Waktu</td>
      <td>: 09.00 – 12.00 WIB</td>
    </tr>
    <tr>
      <td>Tempat</td>
      <td>: Auditorium Lantai 8, Kampus Viktor</td>
    </tr>
    <tr>
      <td>Agenda</td>
      <td>: Sosialisasi program sertifikasi profesi dan penyiapan dokumen</td>
    </tr>
  </table>

  <p>Adapun pokok pembahasan yang akan disampaikan meliputi:</p>
  <ul>
    <li>Roadmap sertifikasi untuk mahasiswa Sistem Informasi Angkatan 2022–2024.</li>
    <li>Standar kompetensi prioritas beserta susunan skema uji.</li>
    <li>Mekanisme pendaftaran, verifikasi dokumen, dan jadwal asesmen.</li>
    <li>Peran dosen pembimbing dan koordinator prodi sebagai pendamping asesor.</li>
  </ul>

  <p>
    Mengingat urgensi program ini sebagai syarat kelulusan dan akreditasi prodi, kami berharap kehadiran Bapak/Ibu tepat waktu. Besar harapan kami agar informasi ini dapat diteruskan kepada tim pelaksana prodi untuk menyiapkan data calon peserta.
  </p>

  <div class="word-signature">
    <p>Pamulang, 18 Februari 2026</p>
    <p><strong>Kepala Lembaga Sertifikasi Profesi</strong></p>
    <div class="word-signature__space"></div>
    <p class="word-signature__name">Dr. Nur Azizah, S.Kom., M.M.</p>
    <p class="word-signature__id">NIP. 19790821 200801 2 002</p>
  </div>
`;

export const suratTugasBody = suratTugasContent;

export const suratTugasFooter = letterheadFooterHtml;
