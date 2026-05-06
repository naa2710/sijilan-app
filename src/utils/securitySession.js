const DEFAULT_LOCK_TIMEOUT_MINUTES = 30;

const readTimestamp = (storageKey) => {
  try {
    return Number(window.localStorage.getItem(storageKey)) || 0;
  } catch (error) {
    return 0;
  }
};

export const getLockTimeoutMinutes = (value) => {
  const parsedValue = Number(value);
  return parsedValue > 0 ? parsedValue : DEFAULT_LOCK_TIMEOUT_MINUTES;
};

export const getLockTimeoutMs = (value) => (
  getLockTimeoutMinutes(value) * 60 * 1000
);

export const getLastSecurityActivity = (storageKey) => readTimestamp(storageKey);

export const touchSecurityActivity = (storageKey) => {
  const nextTimestamp = Date.now();

  try {
    window.localStorage.setItem(storageKey, String(nextTimestamp));
  } catch (error) {
    // Ignore storage errors for activity timestamps.
  }

  return nextTimestamp;
};

export const clearSecurityActivity = (storageKey) => {
  try {
    window.localStorage.removeItem(storageKey);
  } catch (error) {
    // Ignore storage errors for activity timestamps.
  }
};

export const shouldLockByTimeout = ({ pin, timeoutMinutes, storageKey }) => {
  if (!pin) {
    return false;
  }

  const lastActivity = getLastSecurityActivity(storageKey);
  if (!lastActivity) {
    return true;
  }

  return (Date.now() - lastActivity) >= getLockTimeoutMs(timeoutMinutes);
};
