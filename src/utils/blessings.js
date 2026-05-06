export const BLESSING_MESSAGES = [
    {
        title: 'دعاء بزيادة الرزق',
        buildBody: (name) => `اللهم ارزق ${name} رزقًا واسعًا حلالًا طيبًا مباركًا فيه، وافتح له أبواب فضلك ورحمتك.`,
    },
    {
        title: 'بشارة طيبة',
        buildBody: (name) => `اللهم بارك لـ ${name} في القليل والكثير، ويسر له الخير حيث كان، واجعل فيما يكسبه بركة ونماء.`,
    },
    {
        title: 'دعاء السعة',
        buildBody: (name) => `يا رزاق يا كريم، وسع على ${name} من فضلك، واصرف عنه الضيق، وبارك له في كل حوالة وإيصال.`,
    },
    {
        title: 'ذكرى مباركة',
        buildBody: (name) => `اللهم افتح لـ ${name} أبواب الرزق، ووفقه في عمله، واجعل عاقبة سعيه خيرًا وسكينةً وطمأنينة.`,
    },
];

export const pickBlessingMessage = (partnerName) => {
    const lastIndexKey = 'shared-record-last-blessing-index';
    const previousIndex = Number(localStorage.getItem(lastIndexKey));
    let nextIndex = Math.floor(Math.random() * BLESSING_MESSAGES.length);

    if (BLESSING_MESSAGES.length > 1) {
        while (nextIndex === previousIndex) {
            nextIndex = Math.floor(Math.random() * BLESSING_MESSAGES.length);
        }
    }

    localStorage.setItem(lastIndexKey, String(nextIndex));
    const blessing = BLESSING_MESSAGES[nextIndex];
    return {
        title: blessing.title,
        body: blessing.buildBody(partnerName),
    };
};
