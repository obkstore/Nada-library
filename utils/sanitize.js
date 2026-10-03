// Server-side text sanitization for admin-entered content.
// Descriptions are PLAIN TEXT (no rich editor, no stored HTML). We strip tags
// rather than reject: the admin form warns (client-side pre-check with the same
// rule) whenever its text differs after stripping.
function stripHtml(input) {
  if (typeof input !== 'string') return input;
  return input.replace(/<[^>]*>/g, '');
}

function stripAndTrim(input) {
  const stripped = stripHtml(input);
  return typeof stripped === 'string' ? stripped.trim() : stripped;
}

module.exports = { stripHtml, stripAndTrim };
