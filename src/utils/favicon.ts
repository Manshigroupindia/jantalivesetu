/**
 * Utility to dynamically update the browser tab favicon and apple-touch-icon
 * using the Director-configured Company Logo URL with cache-busting.
 */
export function updateFavicon(logoUrl?: string | null, updatedAt?: string): void {
  try {
    const fallbackUrl = '/logo.svg';
    const rawUrl = logoUrl && logoUrl.trim() !== '' ? logoUrl.trim() : fallbackUrl;

    // Generate cache-busting version query string to bypass browser favicon cache
    const cacheVersion = updatedAt ? new Date(updatedAt).getTime() : Date.now();
    const finalHref = rawUrl.includes('?') ? `${rawUrl}&v=${cacheVersion}` : `${rawUrl}?v=${cacheVersion}`;

    // Query all existing icon links
    const existingIcons = Array.from(
      document.querySelectorAll<HTMLLinkElement>("link[rel*='icon'], link[rel='apple-touch-icon']")
    );

    // Primary favicon element
    let primaryIcon = existingIcons.find((link) => link.rel === 'icon' || link.rel === 'shortcut icon');
    if (!primaryIcon) {
      primaryIcon = document.createElement('link');
      primaryIcon.rel = 'icon';
      document.head.appendChild(primaryIcon);
    }

    // Update primary favicon href
    primaryIcon.rel = 'icon';
    primaryIcon.href = finalHref;

    // Apple touch icon element
    let appleIcon = existingIcons.find((link) => link.rel === 'apple-touch-icon');
    if (!appleIcon) {
      appleIcon = document.createElement('link');
      appleIcon.rel = 'apple-touch-icon';
      document.head.appendChild(appleIcon);
    }
    appleIcon.href = finalHref;

    // Remove any extra conflicting icon tags to avoid browser ambiguity
    existingIcons.forEach((link) => {
      if (link !== primaryIcon && link !== appleIcon && link.parentNode) {
        link.parentNode.removeChild(link);
      }
    });
  } catch (err) {
    console.error('Failed to update browser favicon:', err);
  }
}
