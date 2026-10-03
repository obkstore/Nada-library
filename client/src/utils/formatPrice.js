// Price formatting honoring store settings:
// currency.symbol per language, symbolPosition, decimals (0 for SYP), digitStyle.
const ARABIC_INDIC = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

export function toDigits(str, digitStyle) {
  if (digitStyle !== 'arabic-indic') return str;
  return String(str).replace(/[0-9]/g, (d) => ARABIC_INDIC[Number(d)]);
}

export function formatPrice(value, settings, lang) {
  const n = Number(value) || 0;
  const currency = settings?.currency || { symbol: { ar: 'ل.س', en: 'SYP' }, decimals: 0, symbolPosition: 'after' };
  const symbol = lang === 'en' ? currency.symbol?.en || 'SYP' : currency.symbol?.ar || 'ل.س';
  const decimals = currency.decimals ?? 0;
  const fixed = n.toFixed(decimals);
  const [intPart, decPart] = fixed.split('.');
  const grouped = Number(intPart).toLocaleString('en-US');
  const num = decPart !== undefined ? `${grouped}.${decPart}` : grouped;
  const withDigits = toDigits(num, settings?.digitStyle || 'western');
  return currency.symbolPosition === 'before' ? `${symbol} ${withDigits}` : `${withDigits} ${symbol}`;
}
