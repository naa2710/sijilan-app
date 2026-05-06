export const PARTNER_GENDERS = {
  male: 'male',
  female: 'female',
};

export const normalizePartnerGender = (value) => (
  value === PARTNER_GENDERS.female ? PARTNER_GENDERS.female : PARTNER_GENDERS.male
);

export const normalizePartner = (partner = {}, index = 0) => ({
  id: partner?.id ?? Date.now() + index,
  name: partner?.name || `فرد ${index + 1}`,
  whatsappNumber: partner?.whatsappNumber || '',
  gender: normalizePartnerGender(partner?.gender),
});

export const normalizePartners = (partners = []) => {
  if (!Array.isArray(partners) || partners.length === 0) {
    return [
      normalizePartner({ id: 1, name: 'فرد 1' }, 0),
      normalizePartner({ id: 2, name: 'فرد 2' }, 1),
    ];
  }

  return partners.map((partner, index) => normalizePartner(partner, index));
};

export const getPartnerLabels = (partnerOrGender) => {
  const gender = normalizePartnerGender(
    typeof partnerOrGender === 'string' ? partnerOrGender : partnerOrGender?.gender,
  );

  if (gender === PARTNER_GENDERS.female) {
    return {
      gender,
      role: 'الشريكة',
      roleWithArticle: 'الشريكة',
      roleObject: 'للشريكة',
      roleOwner: 'هذه الشريكة',
      pronoun: 'لها',
      installTitle: 'واجهة الشريكة',
      recordOwner: 'هذه الشريكة',
    };
  }

  return {
    gender,
    role: 'الشريك',
    roleWithArticle: 'الشريك',
    roleObject: 'للشريك',
    roleOwner: 'هذا الشريك',
    pronoun: 'له',
    installTitle: 'واجهة الشريك',
    recordOwner: 'هذا الشريك',
  };
};
