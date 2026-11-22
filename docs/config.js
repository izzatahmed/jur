/* PUBLIC settings only. Never put GitHub tokens, API secrets, or passwords here. */
window.UJORH_CONFIG = {
  mode: 'demo', // Change to 'live' only after deploying the secure Worker.
  apiUrl: '', // Example: 'https://uj-orh-submissions.YOUR-SUBDOMAIN.workers.dev'
  turnstileSiteKey: '', // Cloudflare Turnstile public SITE key (not secret)
  maxFileMB: 5,
  supportEmail: '' // Optional email for author support; leave empty if not yet established.
};
