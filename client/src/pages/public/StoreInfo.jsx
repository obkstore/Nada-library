import { Helmet } from 'react-helmet-async';
import { useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { pickLang, useShopName, useStoreSettings } from '../../hooks/useStoreSettings';
import { cleanWhatsapp } from '../../utils/whatsapp';
import { siteUrl } from '../../utils/whatsapp';

// Store info: address, hours, phone, WhatsApp, socials, embedded map (when set).
export default function StoreInfo() {
  const { t, i18n } = useTranslation();
  const { lang } = useParams();
  const cur = i18n.language === 'en' ? 'en' : 'ar';
  const s = useStoreSettings();
  const shopName = useShopName();
  const site = siteUrl();
  const wa = cleanWhatsapp(s?.whatsappNumber);

  const row = (label, value, ltr) =>
    value ? (
      <p className="mt-2">
        <span className="font-bold">{label}: </span>
        <span dir={ltr ? 'ltr' : undefined} className={ltr ? 'inline-block' : undefined}>{value}</span>
      </p>
    ) : null;

  const socials = [
    ['Facebook', s?.social?.facebook, 'https://facebook.com/'],
    ['Instagram', s?.social?.instagram, 'https://instagram.com/'],
    ['TikTok', s?.social?.tiktok, 'https://tiktok.com/@'],
  ].filter(([, v]) => v);

  return (
    <>
      <Helmet>
        <title>{`${t('public.seoStore')} | ${shopName}`}</title>
        <meta name="description" content={t('seo.homeDesc')} />
        <link rel="canonical" href={`${site}/${lang}/store`} />
        <link rel="alternate" hrefLang="ar" href={`${site}/ar/store`} />
        <link rel="alternate" hrefLang="en" href={`${site}/en/store`} />
      </Helmet>

      <h1 className="text-2xl font-extrabold mb-4">{t('public.seoStore')}</h1>
      {!s ? (
        <p className="py-8 text-center">{t('admin.common.loading')}</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-extrabold">{pickLang(s.storeName, cur)}</h2>
            {row(t('public.storeAddress'), pickLang(s.address, cur))}
            {row(t('public.storeHours'), pickLang(s.hours, cur))}
            {row(t('public.storePhone'), s.phone, true)}
            {wa && (
              <p className="mt-2">
                <span className="font-bold">{t('public.storeWhatsapp')}: </span>
                <a dir="ltr" className="inline-block font-bold text-green-700" href={`https://wa.me/${wa}`} target="_blank" rel="noopener noreferrer">
                  {s.whatsappNumber}
                </a>
              </p>
            )}
            {socials.length > 0 && (
              <div className="mt-3">
                <span className="font-bold">{t('public.followUs')}: </span>
                <span className="inline-flex gap-3 ms-1">
                  {socials.map(([label, handle, base]) => (
                    <a key={label} href={`${base}${handle}`} target="_blank" rel="noopener noreferrer" className="font-bold text-brand-600">
                      {label}
                    </a>
                  ))}
                </span>
              </div>
            )}
          </div>
          <div className="bg-white rounded-xl shadow-sm p-5">
            <h2 className="font-extrabold mb-2">{t('public.storeMap')}</h2>
            {s.mapEmbedUrl ? (
              <iframe title={t('public.storeMap')} src={s.mapEmbedUrl} loading="lazy" className="w-full h-72 rounded-lg border-0" />
            ) : (
              <p className="text-sm text-stone-500">{pickLang(s.address, cur)}</p>
            )}
          </div>
        </div>
      )}
    </>
  );
}
