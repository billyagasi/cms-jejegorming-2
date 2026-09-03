export const MONTHS_ID = [
  'Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni',
  'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember',
];

export const MONTHS_ID_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'Mei', 'Jun', 'Jul', 'Ags', 'Sep', 'Okt', 'Nov', 'Des'];

export const DAYS_ID = ['Minggu', 'Senin', 'Selasa', 'Rabu', 'Kamis', 'Jumat', 'Sabtu'];

export function formatRupiah(value: number | undefined | null): string {
  const n = typeof value === 'number' && isFinite(value) ? value : 0;
  return `Rp ${new Intl.NumberFormat('id-ID').format(Math.round(n))}`;
}

/** Input: 'YYYY-MM-DD' → '11 Juni 2026' */
export function formatDateID(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr || '-';
  const [y, m, d] = dateStr.split('-').map(Number);
  if (!y || !m || !d) return dateStr;
  return `${d} ${MONTHS_ID[m - 1]} ${y}`;
}

/** Input: 'YYYY-MM-DD' → 'Kamis, 11 Juni 2026' */
export function formatDayDateID(dateStr: string): string {
  if (!dateStr || dateStr.length < 10) return dateStr || '-';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(Date.UTC(y, m - 1, d));
  if (isNaN(date.getTime())) return dateStr;
  return `${DAYS_ID[date.getUTCDay()]}, ${d} ${MONTHS_ID[m - 1]} ${y}`;
}

/** Input: ISO datetime → '11 Jun 2026, 14:30' */
export function formatDateTimeID(iso: string): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (isNaN(date.getTime())) return iso;
  const d = date.getDate();
  const mo = date.getMonth();
  const y = date.getFullYear();
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  return `${d} ${MONTHS_ID_SHORT[mo]} ${y}, ${hh}:${mi}`;
}

export function todayISO(): string {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
}

/** Normalisasi nomor WhatsApp: buang non-digit, 0 awal → 62 */
export function toWAPhone(phone: string): string {
  const digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('0')) return `62${digits.slice(1)}`;
  if (digits.startsWith('62')) return digits;
  if (digits.startsWith('628')) return digits;
  return digits;
}

export function waLink(phone: string, message: string): string {
  return `https://api.whatsapp.com/send?phone=${toWAPhone(phone)}&text=${encodeURIComponent(message)}`;
}

export function generateId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
}

/** CSV semicolon-delimited + BOM (kompatibel Excel locale Indonesia) */
export function toCSV(rows: (string | number)[][]): string {
  const escape = (v: string | number) => {
    const s = String(v ?? '');
    return /[";\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return '\uFEFF' + rows.map((r) => r.map(escape).join(';')).join('\n');
}

export function downloadBlob(filename: string, content: string, mime = 'text/plain;charset=utf-8'): void {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function downloadCSV(filename: string, rows: (string | number)[][]): void {
  downloadBlob(filename, toCSV(rows), 'text/csv;charset=utf-8');
}

/** Parse daftar URL foto dari berbagai format (JSON array, quoted JSON, delimiter |||) */
export function parsePhotoUrls(raw?: string | string[]): string[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.filter(Boolean);
  const s = String(raw).trim();
  if (!s) return [];
  try {
    const parsed = JSON.parse(s);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    /* fallback di bawah */
  }
  try {
    const unquoted = JSON.parse(`"${s.replace(/"/g, '\\"')}"`);
    const parsed = JSON.parse(unquoted);
    if (Array.isArray(parsed)) return parsed.map(String).filter(Boolean);
  } catch {
    /* fallback di bawah */
  }
  return s.split('|||').map((u) => u.trim()).filter(Boolean);
}

/** Copy ke clipboard dengan fallback */
export async function copyToClipboard(text: string): Promise<boolean> {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      return true;
    } catch {
      return false;
    }
  }
}
