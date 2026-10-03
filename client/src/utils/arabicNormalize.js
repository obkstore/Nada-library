// Must stay in sync with server/utils/arabicNormalize.js
export function normalizeArabic(input) {
  if (!input) return '';
  return String(input)
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[ً-ٲٰـ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}
