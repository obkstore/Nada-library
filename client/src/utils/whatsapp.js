// WhatsApp deep links. Messages are built in the visitor's CURRENT language.
// - number is cleaned to digits only (admin may store spaces, +, dashes).
// - page links are ABSOLUTE via VITE_SITE_URL so they work inside chat apps.
// - Out-of-stock products keep the button with an "ask about availability" message.
export function cleanWhatsapp(number) {
  return String(number || '').replace(/\D/g, '');
}

export function siteUrl() {
  const env = import.meta.env.VITE_SITE_URL;
  if (env) return String(env).replace(/\/$/, '');
  if (typeof window !== 'undefined') return window.location.origin;
  return '';
}

export function productPageUrl(slug, lang) {
  return `${siteUrl()}/${lang}/products/${slug}`;
}

export function waProductLink(number, { name, price, url, lang, inStock = true }) {
  const clean = cleanWhatsapp(number);
  if (!clean) return '';
  const ask =
    lang === 'en'
      ? inStock
        ? `Hello! I want to ask about this product:\n${name}\nPrice: ${price}\n${url}`
        : `Hello! Is this product available?\n${name}\nPrice: ${price}\n${url}`
      : inStock
        ? `مرحباً! أريد الاستفسار عن هذا المنتج:\n${name}\nالسعر: ${price}\n${url}`
        : `مرحباً! هل هذا المنتج متوفر؟\n${name}\nالسعر: ${price}\n${url}`;
  return `https://wa.me/${clean}?text=${encodeURIComponent(ask)}`;
}

export function waSupplyListLink(number, { title, lines, total, url, lang }) {
  const clean = cleanWhatsapp(number);
  if (!clean) return '';
  const header =
    lang === 'en' ? `Hello! I want to order this supply list: ${title}\n` : `مرحباً! أريد طلب قائمة المستلزمات: ${title}\n`;
  const totalLine = lang === 'en' ? `\nTotal: ${total}` : `\nالإجمالي: ${total}`;
  const linkLine = url ? `\n${url}` : '';
  return `https://wa.me/${clean}?text=${encodeURIComponent(header + lines.join('\n') + totalLine + linkLine)}`;
}

export function supplyListPageUrl(id, lang) {
  return `${siteUrl()}/${lang}/supply-lists/${id}`;
}
