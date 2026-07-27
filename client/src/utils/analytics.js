// Loads Google Analytics only if REACT_APP_GA_ID is set — so local dev and
// anyone who hasn't set up GA yet doesn't send any tracking data at all.
export function initAnalytics() {
  const gaId = process.env.REACT_APP_GA_ID;
  if (!gaId) return;

  const script1 = document.createElement('script');
  script1.async = true;
  script1.src = `https://www.googletagmanager.com/gtag/js?id=${gaId}`;
  document.head.appendChild(script1);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  gtag('js', new Date());
  gtag('config', gaId);
}
