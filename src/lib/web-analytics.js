let initialized = false;

export function initCloudflareWebAnalytics() {
  if (initialized || typeof document === 'undefined') return;
  const token = String(import.meta.env.VITE_CF_WEB_ANALYTICS_TOKEN || '').trim();
  if (!token) return;
  if (document.querySelector('script[data-teconnect-cf-analytics]')) {
    initialized = true;
    return;
  }

  const script = document.createElement('script');
  script.type = 'module';
  script.src = 'https://static.cloudflareinsights.com/beacon.min.js';
  script.setAttribute('data-cf-beacon', JSON.stringify({ token }));
  script.setAttribute('data-teconnect-cf-analytics', 'true');
  script.async = true;
  script.onerror = () => {};
  document.head.appendChild(script);
  initialized = true;
}
