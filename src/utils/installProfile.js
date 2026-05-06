const INSTALL_PROFILE_KEY = 'financial_install_profile';

const safeParse = (value) => {
  try {
    return JSON.parse(value);
  } catch (error) {
    return null;
  }
};

export const getInstallProfile = () => {
  if (typeof window === 'undefined') return null;
  return safeParse(window.localStorage.getItem(INSTALL_PROFILE_KEY));
};

export const setInstallProfile = (profile) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(
    INSTALL_PROFILE_KEY,
    JSON.stringify({
      ...profile,
      updatedAt: new Date().toISOString(),
    }),
  );
};

export const clearInstallProfile = () => {
  if (typeof window === 'undefined') return;
  window.localStorage.removeItem(INSTALL_PROFILE_KEY);
};

export const buildPartnerSharedSearch = ({ partnerId, partnerName, partnerGender }) => {
  const params = new URLSearchParams();
  params.set('sharedMode', 'write');
  params.set('partnerId', String(partnerId));
  params.set('partnerName', partnerName || '');
  params.set('partnerGender', partnerGender || 'male');
  return `?${params.toString()}`;
};

export const resolveStandalonePartnerSearch = () => {
  const profile = getInstallProfile();
  if (profile?.mode !== 'partner' || !profile?.partnerId) {
    return null;
  }

  return buildPartnerSharedSearch({
    partnerId: profile.partnerId,
    partnerName: profile.partnerName,
    partnerGender: profile.partnerGender,
  });
};
