const trimTrailingSlash = (value = '') => String(value || '').replace(/\/+$/, '');

export const getApiBaseUrl = () => trimTrailingSlash(import.meta.env.VITE_WHATSAPP_API_BASE || '');

let cachedApiServerAvailability = null;
let cachedApiServerCheckedAt = 0;
let apiServerAvailabilityPromise = null;

const API_SUCCESS_CACHE_TTL_MS = 15000;
const API_FAILURE_CACHE_TTL_MS = 3000;

const getAvailabilityCacheTtl = () => (
  cachedApiServerAvailability ? API_SUCCESS_CACHE_TTL_MS : API_FAILURE_CACHE_TTL_MS
);

const isAvailabilityCacheFresh = () => (
  cachedApiServerAvailability !== null
  && (Date.now() - cachedApiServerCheckedAt) < getAvailabilityCacheTtl()
);

const updateCachedAvailability = (value) => {
  cachedApiServerAvailability = value;
  cachedApiServerCheckedAt = Date.now();
  return value;
};

const readStatusPayload = async (response) => {
  const contentType = response.headers.get('content-type') || '';
  if (!contentType.includes('application/json')) {
    return null;
  }

  try {
    return await response.json();
  } catch (error) {
    return null;
  }
};

export const withApiBase = (path) => {
  const normalizedPath = String(path || '').startsWith('/') ? path : `/${path}`;
  const baseUrl = getApiBaseUrl();
  return baseUrl ? `${baseUrl}${normalizedPath}` : normalizedPath;
};

export const getCachedApiServerAvailability = () => cachedApiServerAvailability;

export const resetApiServerAvailabilityCache = () => {
  cachedApiServerAvailability = null;
  cachedApiServerCheckedAt = 0;
};

export const checkApiServerAvailability = async ({ force = false } = {}) => {
  if (!force && isAvailabilityCacheFresh()) {
    return cachedApiServerAvailability;
  }

  if (!force && apiServerAvailabilityPromise) {
    return apiServerAvailabilityPromise;
  }

  apiServerAvailabilityPromise = (async () => {
    try {
      const controller = typeof AbortController !== 'undefined' ? new AbortController() : null;
      const timeoutId = controller
        ? window.setTimeout(() => controller.abort(), 2500)
        : null;

      const response = await fetch(withApiBase('/api/whatsapp/status'), {
        method: 'GET',
        cache: 'no-store',
        signal: controller?.signal,
      });

      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }

      if (!response.ok) {
        return updateCachedAvailability(false);
      }

      const payload = await readStatusPayload(response);
      const isHealthy = Boolean(
        payload?.ok
        && (
          payload?.status === 'healthy'
          || typeof payload?.configured === 'boolean'
        ),
      );

      return updateCachedAvailability(isHealthy);
    } catch (error) {
      return updateCachedAvailability(false);
    } finally {
      apiServerAvailabilityPromise = null;
    }
  })();

  return apiServerAvailabilityPromise;
};

export const prewarmApiServerAvailability = () => {
  checkApiServerAvailability().catch(() => false);
};
