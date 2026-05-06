import { getPartnerLabels } from './partnerProfile';

export const buildPartnerRoute = ({ partnerId, partnerName, partnerGender, search }) => {
    if (search) {
        return search.startsWith('?') ? `/${search}` : `/?${search}`;
    }

    const params = new URLSearchParams();
    params.set('sharedMode', 'write');
    params.set('partnerId', String(partnerId));
    params.set('partnerName', partnerName || '');
    params.set('partnerGender', partnerGender || 'male');
    return `/?${params.toString()}`;
};

export const buildPartnerManifest = ({ partnerId, partnerName, partnerGender, themeColor, search }) => {
    const labels = getPartnerLabels(partnerGender);
    return ({
        id: buildPartnerRoute({ partnerId, partnerName, partnerGender, search }),
        name: `${labels.installTitle} ${partnerName}`,
        short_name: `${labels.installTitle} ${partnerName}`,
        description: `نسخة مستقلة ${labels.roleObject} ${partnerName} لتسجيل الإيصالات ومتابعة رسائل الإدارة فقط.`,
        start_url: buildPartnerRoute({ partnerId, partnerName, partnerGender, search }),
        scope: '/',
        display: 'standalone',
        background_color: '#0B0E12',
        theme_color: themeColor || '#EF233C',
        lang: 'ar',
        dir: 'rtl',
        icons: [
            {
                src: '/favicon.png',
                sizes: '64x64 32x32 24x24 16x16',
                type: 'image/png',
            },
            {
                src: '/logo192.png',
                sizes: '192x192',
                type: 'image/png',
            },
            {
                src: '/logo512.png',
                sizes: '512x512',
                type: 'image/png',
            },
            {
                src: '/icon-maskable-512.png',
                sizes: '512x512',
                type: 'image/png',
                purpose: 'maskable',
            },
        ],
    });
};
