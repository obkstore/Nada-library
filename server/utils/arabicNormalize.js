// Shared Arabic search normalization (must stay in sync with client/src/utils/arabicNormalize.js).
// Goal: searching "كراسه" finds "كراسة", "أحمد" finds "احمد", etc.
function normalizeArabic(input) {
  if (!input) return '';
  return String(input)
    .replace(/[أإآٱ]/g, 'ا') // alef variants -> bare alef
    .replace(/ة/g, 'ه') // ta marbuta -> ha (so كراسة == كراسه)
    .replace(/ى/g, 'ي') // alef maqsura -> ya
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '') // strip tashkeel/diacritics + tatweel
    .replace(/\s+/g, ' ')
    .trim()
    .toLowerCase();
}

// Escape user input before embedding it in a RegExp (prevents ReDoS / syntax errors).
function escapeRegExp(str) {
  return String(str || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

// URL-friendly slug from English name. Falls back to a short unique id when no English name.
// Examples: "Pencil Box 12 Colors" -> "pencil-box-12-colors"
function slugifyEnglish(text) {
  const base = String(text || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60);
  return base;
}

function fallbackSlug() {
  return 'product-' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

module.exports = { normalizeArabic, escapeRegExp, slugifyEnglish, fallbackSlug };
