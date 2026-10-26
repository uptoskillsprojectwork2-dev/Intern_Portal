const authEndpoints = ['/api/auth/login', '/api/auth/forgot-password', '/api/auth/reset-password'];

export function installApiInterceptors(client) {
  client.interceptors.response.use((response) => response, (error) => {
    const status = error.response?.status;
    const url = error.config?.url || '';
    if (status === 429) {
      const seconds = Number(error.response.headers?.['retry-after'] || error.response.data?.retryAfter);
      const wait = Number.isFinite(seconds) && seconds > 0
        ? ` Please wait ${seconds >= 60 ? `${Math.ceil(seconds / 60)} minute${Math.ceil(seconds / 60) === 1 ? '' : 's'}` : `${seconds} seconds`} before trying again.`
        : ' Please wait before trying again.';
      if (error.response.data) error.response.data.message = `${error.response.data.message || 'Too many attempts.'}${wait}`;
    }
    if (typeof window !== 'undefined') {
      const onLoginPage = ['/login', '/forgot-password'].includes(window.location.pathname) || window.location.pathname.startsWith('/reset-password/');
      if (status === 401 && !onLoginPage && !authEndpoints.some((endpoint) => url.includes(endpoint)) && window.location.pathname !== '/access-denied') {
        window.location.assign('/login');
      } else if (status === 403 && window.location.pathname !== '/access-denied') {
        window.location.assign('/access-denied');
      }
    }
    return Promise.reject(error);
  });
  return client;
}
