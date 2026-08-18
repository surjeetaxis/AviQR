/**
 * SEO component — wraps react-helmet-async to add meta tags per route.
 *
 * Usage: <SEO title="AviQR Dashboard" description="Manage your restaurant" />
 *
 * Pass `schema` (an object or array of objects) to attach page-specific
 * JSON-LD — e.g. a Restaurant/Menu graph on a shop's public menu page, or
 * a FAQPage graph on the FAQ page — in addition to (or, with
 * `appSchema={false}`, instead of) the site-wide SoftwareApplication block.
 */
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'AviQR';
const SITE_URL = 'https://aviqr.com';
const DEFAULT_DESC = 'QR-powered digital menu, live order management, and multilingual restaurant platform for India.';
const DEFAULT_IMG = `${SITE_URL}/og-image.png`; // 1200×630 px Open Graph image

const APP_SCHEMA = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "AviQR",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web, Android",
  "description": DEFAULT_DESC,
  "url": SITE_URL,
  "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR" }
};

export default function SEO({ title, description, image, canonical, noIndex = false, type = 'website', schema, appSchema = true }) {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Restaurant & Hotel QR Platform`;
  const pageDesc  = description || DEFAULT_DESC;
  const pageImage = image || DEFAULT_IMG;
  const extraSchemas = schema ? (Array.isArray(schema) ? schema : [schema]) : [];
  const schemas = appSchema ? [APP_SCHEMA, ...extraSchemas] : extraSchemas;

  return (
    <Helmet>
      <html lang="en"/>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDesc}/>
      {canonical && <link rel="canonical" href={canonical}/>}
      {noIndex   && <meta name="robots" content="noindex,nofollow"/>}

      {/* Open Graph */}
      <meta property="og:type"        content={type}/>
      <meta property="og:title"       content={pageTitle}/>
      <meta property="og:description" content={pageDesc}/>
      <meta property="og:image"       content={pageImage}/>
      <meta property="og:site_name"   content={SITE_NAME}/>
      <meta property="og:locale"      content="en_IN"/>
      {canonical && <meta property="og:url" content={canonical}/>}

      {/* Twitter / X */}
      <meta name="twitter:card"        content="summary_large_image"/>
      <meta name="twitter:title"       content={pageTitle}/>
      <meta name="twitter:description" content={pageDesc}/>
      <meta name="twitter:image"       content={pageImage}/>

      {/* Schema.org JSON-LD */}
      {schemas.map((s, i) => (
        <script key={i} type="application/ld+json">{JSON.stringify(s)}</script>
      ))}
    </Helmet>
  );
}
