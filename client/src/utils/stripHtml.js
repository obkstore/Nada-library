// Client mirror of server/utils/sanitize.js — used BEFORE submit to warn the
// admin when text will change (server strips authoritatively on save).
export function stripHtml(input) {
  if (typeof input !== 'string') return input;
  return input.replace(/<[^>]*>/g, '');
}

// values: [{ label, value }]. Returns labels whose value changes after stripping.
export function findStripped(values) {
  return values.filter(({ value }) => stripHtml(value) !== value).map(({ label }) => label);
}
