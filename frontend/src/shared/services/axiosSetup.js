import axios from "axios";

export const handleAxiosErrorResponse = (error) => {
  if (error && error.response) {
    const { status } = error.response;
    const currentPath = typeof window !== "undefined" ? window.location.pathname : "";

    if (status === 401) {
      const isPublicAuthPage =
        currentPath === "/login" ||
        currentPath === "/forgot-password" ||
        currentPath.startsWith("/reset-password") ||
        currentPath.startsWith("/verify");

      if (!isPublicAuthPage && typeof window !== "undefined") {
        window.location.href = "/login";
      }
    } else if (status === 403) {
      const isLoginAttempt = error.config?.url?.includes("/api/auth/login");
      if (!isLoginAttempt && currentPath !== "/access-denied" && typeof window !== "undefined") {
        window.location.href = "/access-denied";
      }
    }
  }
  return Promise.reject(error);
};

export const attachCentralInterceptor = (instance) => {
  if (!instance || !instance.interceptors) return instance;
  instance.interceptors.response.use((res) => res, handleAxiosErrorResponse);
  return instance;
};

// Global default interceptor
axios.interceptors.response.use((res) => res, handleAxiosErrorResponse);
