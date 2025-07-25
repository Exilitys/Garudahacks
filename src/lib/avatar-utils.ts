// Utility functions for avatar handling

/**
 * Adds cache busting parameter to avatar URLs to force refresh
 */
export const addCacheBusting = (
  url: string | null | undefined
): string | undefined => {
  if (!url) return undefined;

  // If URL already has query parameters, append with &
  const separator = url.includes("?") ? "&" : "?";
  return `${url}${separator}t=${Date.now()}`;
};

/**
 * Gets avatar URL with cache busting for real-time updates
 */
export const getAvatarUrl = (
  avatarUrl: string | null | undefined,
  fallbackId?: string
): string | undefined => {
  if (!avatarUrl) return undefined;

  // For Supabase storage URLs, add cache busting
  if (avatarUrl.includes("supabase") || avatarUrl.includes("storage")) {
    return addCacheBusting(avatarUrl);
  }

  return avatarUrl;
};

/**
 * Triggers a global avatar update event for all components to refresh
 */
export const triggerAvatarUpdate = (profileId: string, avatarUrl: string) => {
  window.dispatchEvent(
    new CustomEvent("avatarUpdated", {
      detail: { profileId, avatarUrl },
    })
  );
};
