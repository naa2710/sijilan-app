import { Capacitor } from '@capacitor/core';
import { GoogleAuth } from '@southdevs/capacitor-google-auth';
import { BACKUP_FILE_PREFIX_VALUE, getBackupFileName, parseBackupText, serializeBackup } from './backup';

export const GOOGLE_DRIVE_CLIENT_ID = String(import.meta.env.VITE_GOOGLE_DRIVE_CLIENT_ID || '').trim();
export const GOOGLE_DRIVE_ANDROID_CLIENT_ID = String(
  import.meta.env.VITE_GOOGLE_DRIVE_ANDROID_CLIENT_ID || GOOGLE_DRIVE_CLIENT_ID,
).trim();
export const GOOGLE_DRIVE_SCOPE = 'https://www.googleapis.com/auth/drive.appdata';
export const GOOGLE_DRIVE_AUTH_SCOPES = [GOOGLE_DRIVE_SCOPE, 'profile', 'email'];
export const ANDROID_DEBUG_SHA1 = 'A8:A2:BD:9B:50:1C:5E:6F:1A:57:FF:AF:E5:92:C6:5B:F6:43:C0:EB';
export const ANDROID_PACKAGE_NAME = 'com.asim.moneyapp';
const GOOGLE_IDENTITY_SCRIPT = 'https://accounts.google.com/gsi/client';
const GOOGLE_DRIVE_BASE_URL = 'https://www.googleapis.com/drive/v3/files';
const GOOGLE_DRIVE_UPLOAD_URL = 'https://www.googleapis.com/upload/drive/v3/files';
const GOOGLE_DRIVE_REDIRECT_STATE_KEY = 'google_drive_oauth_state';
const GOOGLE_DRIVE_REDIRECT_STARTED_AT_KEY = 'google_drive_oauth_started_at';

let googleIdentityPromise;
let nativeGoogleAuthInitPromise;
let webTokenClient;

const getAuthHeader = (accessToken) => ({
  Authorization: `Bearer ${accessToken}`,
});

const driveRequest = async (url, accessToken, options = {}) => {
  const response = await fetch(url, {
    ...options,
    headers: {
      ...(options.headers || {}),
      ...getAuthHeader(accessToken),
    },
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || 'تعذر تنفيذ طلب Google Drive.');
  }

  return response;
};

export const loadGoogleIdentity = () => {
  if (window.google?.accounts?.oauth2) return Promise.resolve(window.google);
  if (googleIdentityPromise) return googleIdentityPromise;

  googleIdentityPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${GOOGLE_IDENTITY_SCRIPT}"]`);
    if (existing) {
      existing.addEventListener('load', () => resolve(window.google), { once: true });
      existing.addEventListener('error', () => reject(new Error('فشل تحميل Google Identity Services.')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = GOOGLE_IDENTITY_SCRIPT;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve(window.google);
    script.onerror = () => reject(new Error('فشل تحميل Google Identity Services.'));
    document.head.appendChild(script);
  });

  return googleIdentityPromise;
};

export const initializeNativeGoogleAuth = async () => {
  if (!Capacitor.isNativePlatform()) return;
  if (!GOOGLE_DRIVE_ANDROID_CLIENT_ID) {
    throw new Error('Google Drive Client ID غير مضبوط في إعدادات التطبيق.');
  }
  if (nativeGoogleAuthInitPromise) return nativeGoogleAuthInitPromise;

  nativeGoogleAuthInitPromise = GoogleAuth.initialize({
    clientId: GOOGLE_DRIVE_ANDROID_CLIENT_ID,
    scopes: GOOGLE_DRIVE_AUTH_SCOPES,
  }).catch((error) => {
    nativeGoogleAuthInitPromise = null;
    throw error;
  });

  return nativeGoogleAuthInitPromise;
};

const errorIncludes = (error, patterns) => {
  const normalized = String(error?.message || error || '').toLowerCase();
  return patterns.some((pattern) => normalized.includes(pattern.toLowerCase()));
};

export const getGoogleDriveErrorMessage = (error) => {
  if (errorIncludes(error, ['redirecting_for_google_auth'])) {
    return 'جارٍ تحويلك إلى Google لإكمال الربط...';
  }

  if (errorIncludes(error, ['popup_failed_to_open'])) {
    return 'المتصفح منع نافذة Google المنبثقة، وسيتم استخدام صفحة تسجيل كاملة بدل النافذة المنبثقة.';
  }

  if (errorIncludes(error, ['12501', 'cancel', 'canceled', 'cancelled'])) {
    return 'تم إلغاء تسجيل الدخول قبل الاكتمال.';
  }

  if (errorIncludes(error, ['10', 'developer_error', '12500'])) {
    return 'Google Sign-In رفض الطلب. تحقق من تطابق package name و SHA-1 ومن تثبيت آخر APK ثم احذف النسخة القديمة قبل إعادة التجربة.';
  }

  if (errorIncludes(error, ['storage relay uri is not allowed', 'invalid_request'])) {
    return 'التطبيق دخل في مسار OAuth الخاص بالويب بدل Android. احذف النسخة القديمة وثبّت آخر APK جديدة.';
  }

  if (errorIncludes(error, ['insufficient', '403', 'drive', 'appdatafolder'])) {
    return 'تم تسجيل الدخول لكن Google Drive رفض الصلاحية المطلوبة. ثبّت آخر APK ثم جرّب الربط من جديد.';
  }

  if (errorIncludes(error, ['network_error', 'socket', 'timeout'])) {
    return 'تعذر الاتصال بخدمات Google حاليًا. تحقق من الإنترنت ثم أعد المحاولة.';
  }

  if (errorIncludes(error, ['access token', 'null client', 'initialize'])) {
    return 'تهيئة Google داخل Android لم تكتمل. افتح آخر نسخة من التطبيق ثم جرّب الربط مرة أخرى.';
  }

  return error?.message || 'تعذر تنفيذ عملية Google Drive.';
};

const buildRedirectUri = () => `${window.location.origin}${window.location.pathname}`;

const createOAuthState = () => `${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;

const setGoogleDriveRedirectState = (state) => {
  sessionStorage.setItem(GOOGLE_DRIVE_REDIRECT_STATE_KEY, state);
  sessionStorage.setItem(GOOGLE_DRIVE_REDIRECT_STARTED_AT_KEY, String(Date.now()));
};

const clearGoogleDriveRedirectState = () => {
  sessionStorage.removeItem(GOOGLE_DRIVE_REDIRECT_STATE_KEY);
  sessionStorage.removeItem(GOOGLE_DRIVE_REDIRECT_STARTED_AT_KEY);
};

export const startGoogleDriveRedirectAuth = () => {
  if (!GOOGLE_DRIVE_CLIENT_ID) {
    throw new Error('Google Drive Client ID غير مضبوط في إعدادات التطبيق.');
  }

  const state = createOAuthState();
  const redirectUri = buildRedirectUri();
  const authUrl = new URL('https://accounts.google.com/o/oauth2/v2/auth');

  setGoogleDriveRedirectState(state);

  authUrl.searchParams.set('client_id', GOOGLE_DRIVE_CLIENT_ID);
  authUrl.searchParams.set('redirect_uri', redirectUri);
  authUrl.searchParams.set('response_type', 'token');
  authUrl.searchParams.set('scope', GOOGLE_DRIVE_SCOPE);
  authUrl.searchParams.set('include_granted_scopes', 'true');
  authUrl.searchParams.set('prompt', 'consent');
  authUrl.searchParams.set('state', state);

  window.location.assign(authUrl.toString());
};

export const consumeGoogleDriveRedirectResult = () => {
  if (!window.location.hash?.includes('access_token=')) return null;

  const hashParams = new URLSearchParams(window.location.hash.slice(1));
  const accessToken = hashParams.get('access_token');
  const returnedState = hashParams.get('state');
  const expectedState = sessionStorage.getItem(GOOGLE_DRIVE_REDIRECT_STATE_KEY);

  if (!accessToken) return null;

  if (expectedState && returnedState && expectedState !== returnedState) {
    throw new Error('تعذر التحقق من جلسة Google Drive بعد الرجوع من Google.');
  }

  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState({}, document.title, cleanUrl);
  clearGoogleDriveRedirectState();

  return {
    access_token: accessToken,
    expires_in: hashParams.get('expires_in'),
    token_type: hashParams.get('token_type'),
    scope: hashParams.get('scope'),
  };
};

export const prewarmGoogleDriveAuth = async () => {
  if (Capacitor.isNativePlatform()) {
    await initializeNativeGoogleAuth();
    return;
  }

  await loadGoogleIdentity();
};

const getWebTokenClient = () => {
  if (webTokenClient) return webTokenClient;
  if (!GOOGLE_DRIVE_CLIENT_ID) return null;
  if (!window.google?.accounts?.oauth2) return null;

  webTokenClient = window.google.accounts.oauth2.initTokenClient({
    client_id: GOOGLE_DRIVE_CLIENT_ID,
    scope: GOOGLE_DRIVE_SCOPE,
    callback: () => {},
    error_callback: () => {},
  });

  return webTokenClient;
};

export const authorizeGoogleDrive = async (prompt = 'consent') => {
  if (Capacitor.isNativePlatform()) {
    await initializeNativeGoogleAuth();

    const user = await GoogleAuth.signIn({
      clientId: GOOGLE_DRIVE_ANDROID_CLIENT_ID,
      scopes: GOOGLE_DRIVE_AUTH_SCOPES,
      grantOfflineAccess: false,
      serverClientId: GOOGLE_DRIVE_CLIENT_ID,
    });

    const token = user?.authentication?.accessToken;

    if (!token) {
      throw new Error('تعذر الحصول على access token من Google على Android.');
    }

    return {
      access_token: token,
      nativeUser: user,
    };
  }

  return new Promise((resolve, reject) => {
    const tokenClient = getWebTokenClient();

    if (!tokenClient) {
      startGoogleDriveRedirectAuth();
      reject(new Error('redirecting_for_google_auth'));
      return;
    }

    tokenClient.callback = (response) => {
        if (response.error) {
          reject(new Error(response.error));
          return;
        }

        resolve(response);
    };

    tokenClient.error_callback = (error) => {
      if (error?.type === 'popup_failed_to_open') {
        startGoogleDriveRedirectAuth();
        reject(new Error('redirecting_for_google_auth'));
        return;
      }

      reject(new Error(error?.type || 'تعذر تسجيل الدخول إلى Google Drive.'));
    };

    tokenClient.requestAccessToken({ prompt });
  });
};

export const revokeGoogleDriveToken = async (token) => {
  if (Capacitor.isNativePlatform()) {
    await initializeNativeGoogleAuth();
    await GoogleAuth.signOut();
    return;
  }

  if (!token || !window.google?.accounts?.oauth2) return;

  await new Promise((resolve) => {
    window.google.accounts.oauth2.revoke(token, () => resolve());
  });
};

export const listGoogleDriveBackups = async (accessToken) => {
  const query = encodeURIComponent(`name contains '${BACKUP_FILE_PREFIX_VALUE}' and trashed = false`);
  const url = `${GOOGLE_DRIVE_BASE_URL}?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime,size)&orderBy=modifiedTime desc&pageSize=10`;
  const response = await driveRequest(url, accessToken);
  const data = await response.json();
  return data.files || [];
};

export const uploadBackupToGoogleDrive = async (accessToken, payload) => {
  const metadata = {
    name: getBackupFileName(payload),
    parents: ['appDataFolder'],
    description: 'Sijilati automatic backup',
    mimeType: 'application/json',
  };

  const form = new FormData();
  form.append('metadata', new Blob([JSON.stringify(metadata)], { type: 'application/json' }));
  form.append('file', new Blob([serializeBackup(payload)], { type: 'application/json' }));

  const response = await driveRequest(
    `${GOOGLE_DRIVE_UPLOAD_URL}?uploadType=multipart&fields=id,name,modifiedTime,size`,
    accessToken,
    {
      method: 'POST',
      body: form,
    },
  );

  return response.json();
};

export const downloadBackupFromGoogleDrive = async (accessToken, fileId) => {
  const response = await driveRequest(`${GOOGLE_DRIVE_BASE_URL}/${fileId}?alt=media`, accessToken);
  const text = await response.text();
  return parseBackupText(text);
};
