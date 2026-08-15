/**
 * SEO component — wraps react-helmet-async to add meta tags per route.
 *
 * ADD to aviqr-ui-web/package.json dependencies:
 *   "react-helmet-async": "^2.0.5"
 *
 * ADD to main.jsx (wrap <App/> with <HelmetProvider>):
 *   import { HelmetProvider } from 'react-helmet-async';
 *   <HelmetProvider><App /></HelmetProvider>
 *
 * Usage: <SEO title="AviQR Dashboard" description="Manage your restaurant" />
 */
import { Helmet } from 'react-helmet-async';

const SITE_NAME = 'AviQR';
const DEFAULT_DESC = 'QR-powered digital menu, live order management, and multilingual restaurant platform for India.';
const DEFAULT_IMG = 'https://aviqr.com/og-image.png'; // 1200×630 px Open Graph image

export default function SEO({ title, description, image, canonical, noIndex = false }) {
  const pageTitle = title ? `${title} | ${SITE_NAME}` : `${SITE_NAME} — Restaurant & Hotel QR Platform`;
  const pageDesc  = description || DEFAULT_DESC;
  const pageImage = image || DEFAULT_IMG;

  return (
    <Helmet>
      <title>{pageTitle}</title>
      <meta name="description" content={pageDesc}/>
      {canonical && <link rel="canonical" href={canonical}/>}
      {noIndex   && <meta name="robots" content="noindex,nofollow"/>}

      {/* Open Graph */}
      <meta property="og:type"        content="website"/>
      <meta property="og:title"       content={pageTitle}/>
      <meta property="og:description" content={pageDesc}/>
      <meta property="og:image"       content={pageImage}/>
      <meta property="og:site_name"   content={SITE_NAME}/>
      {canonical && <meta property="og:url" content={canonical}/>}

      {/* Twitter / X */}
      <meta name="twitter:card"        content="summary_large_image"/>
      <meta name="twitter:title"       content={pageTitle}/>
      <meta name="twitter:description" content={pageDesc}/>
      <meta name="twitter:image"       content={pageImage}/>

      {/* Schema.org — SoftwareApplication */}
      <script type="application/ld+json">{JSON.stringify({
        "@context": "https://schema.org",
        "@type": "SoftwareApplication",
        "name": "AviQR",
        "applicationCategory": "BusinessApplication",
        "operatingSystem": "Web, Android",
        "description": DEFAULT_DESC,
        "url": "https://aviqr.com",
        "offers": { "@type": "Offer", "price": "0", "priceCurrency": "INR" }
      })}</script>
    </Helmet>
  );
}
