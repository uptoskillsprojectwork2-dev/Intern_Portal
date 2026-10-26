export const formatRateLimitError = (error, defaultFallback = "Too many attempts. Please try again later.") => {
  if (!error) return defaultFallback;

  const status = error.response?.status || error.status;
  if (status === 429) {
    const headers = error.response?.headers;
    const retryAfterHeader =
      headers?.["retry-after"] ||
      headers?.["Retry-After"] ||
      (headers?.get ? headers.get("retry-after") : null);

    if (retryAfterHeader) {
      const seconds = parseInt(retryAfterHeader, 10);
      if (!isNaN(seconds) && seconds > 0) {
        if (seconds < 60) {
          return `Too many attempts. Please try again in ${seconds} second${seconds === 1 ? "" : "s"}.`;
        }
        const minutes = Math.ceil(seconds / 60);
        return `Too many attempts. Please try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`;
      }
    }

    return error.response?.data?.message || error.message || "Too many attempts. Please try again in a few minutes.";
  }

  return error.response?.data?.message || error.message || defaultFallback;
};
