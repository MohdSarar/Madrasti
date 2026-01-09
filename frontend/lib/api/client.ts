import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL;

export const apiClient = axios.create({
  baseURL,
  timeout: 10_000
});

function isBrowser() {
  return typeof window !== 'undefined';
}

function getAccessToken() {
  if (!isBrowser()) return null;
  return window.localStorage.getItem('access_token');
}

function getRefreshToken() {
  if (!isBrowser()) return null;
  return window.localStorage.getItem('refresh_token');
}

function setAccessToken(token: string) {
  if (!isBrowser()) return;
  window.localStorage.setItem('access_token', token);
}

apiClient.interceptors.request.use((config: InternalAxiosRequestConfig) => {
  const token = getAccessToken();
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

let refreshingPromise: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const { data } = await axios.post(
      `${baseURL ?? ''}/v1/auth/refresh`,
      { refresh_token: refreshToken },
      { timeout: 10_000 }
    );

    const newAccessToken = data?.access_token as string | undefined;
    if (!newAccessToken) return null;
    setAccessToken(newAccessToken);
    return newAccessToken;
  } catch {
    return null;
  }
}

apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const status = error.response?.status;
    const original = error.config;

    if (!original || status !== 401) {
      return Promise.reject(error);
    }

    // Avoid infinite loops
    if ((original as any)._retry) {
      return Promise.reject(error);
    }
    (original as any)._retry = true;

    if (!refreshingPromise) {
      refreshingPromise = refreshAccessToken().finally(() => {
        refreshingPromise = null;
      });
    }

    const newToken = await refreshingPromise;
    if (!newToken) {
      return Promise.reject(error);
    }

    original.headers = original.headers ?? {};
    (original.headers as any).Authorization = `Bearer ${newToken}`;
    return apiClient(original);
  }
);

