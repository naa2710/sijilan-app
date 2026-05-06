const randomBuffer = (length = 32) => {
  const buffer = new Uint8Array(length);
  window.crypto.getRandomValues(buffer);
  return buffer;
};

const arrayBufferToBase64Url = (buffer) => {
  const bytes = new Uint8Array(buffer);
  let binary = '';

  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });

  return window.btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '');
};

const base64UrlToUint8Array = (value = '') => {
  const padded = value.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(value.length / 4) * 4, '=');
  const binary = window.atob(padded);
  const buffer = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    buffer[i] = binary.charCodeAt(i);
  }

  return buffer;
};

export const hasBiometricSupport = () => (
  typeof window !== 'undefined'
  && window.isSecureContext
  && typeof window.PublicKeyCredential !== 'undefined'
  && typeof navigator?.credentials?.create === 'function'
  && typeof navigator?.credentials?.get === 'function'
);

export const registerBiometricUnlock = async () => {
  if (!hasBiometricSupport()) {
    throw new Error('هذا الجهاز لا يدعم فتح التطبيق بالبصمة.');
  }

  const credential = await navigator.credentials.create({
    publicKey: {
      challenge: randomBuffer(),
      rp: { name: 'سجلاتي' },
      user: {
        id: randomBuffer(16),
        name: 'local-user',
        displayName: 'مستخدم التطبيق',
      },
      pubKeyCredParams: [
        { type: 'public-key', alg: -7 },
        { type: 'public-key', alg: -257 },
      ],
      timeout: 60000,
      attestation: 'none',
      authenticatorSelection: {
        authenticatorAttachment: 'platform',
        userVerification: 'required',
        residentKey: 'preferred',
      },
    },
  });

  if (!credential?.rawId) {
    throw new Error('تعذر حفظ بصمة الجهاز.');
  }

  return arrayBufferToBase64Url(credential.rawId);
};

export const verifyBiometricUnlock = async (credentialId) => {
  if (!hasBiometricSupport()) {
    throw new Error('هذا الجهاز لا يدعم التحقق بالبصمة.');
  }

  if (!credentialId) {
    throw new Error('لا توجد بصمة محفوظة لهذا التطبيق.');
  }

  const assertion = await navigator.credentials.get({
    publicKey: {
      challenge: randomBuffer(),
      allowCredentials: [
        {
          id: base64UrlToUint8Array(credentialId),
          type: 'public-key',
        },
      ],
      userVerification: 'required',
      timeout: 60000,
    },
  });

  return Boolean(assertion);
};
