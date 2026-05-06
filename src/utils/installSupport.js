const IOS_PATTERN = /iPad|iPhone|iPod/i;
const ANDROID_PATTERN = /Android/i;
const SAFARI_PATTERN = /^((?!chrome|android|crios|fxios|edgios).)*safari/i;

export const isStandaloneDisplayMode = () => (
  window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator.standalone === true
);

export const detectInstallPlatform = () => {
  if (typeof window === 'undefined') {
    return {
      isAndroid: false,
      isIOS: false,
      isSafari: false,
      isStandalone: false,
    };
  }

  const userAgent = window.navigator.userAgent || '';
  const isIOS = IOS_PATTERN.test(userAgent) || (window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1);
  const isAndroid = ANDROID_PATTERN.test(userAgent);
  const isSafari = SAFARI_PATTERN.test(userAgent);

  return {
    isAndroid,
    isIOS,
    isSafari,
    isStandalone: isStandaloneDisplayMode(),
  };
};

export const getInstallInstructions = (appName = 'التطبيق') => {
  const platform = detectInstallPlatform();

  if (platform.isStandalone) {
    return `تم تثبيت ${appName} بالفعل ويعمل الآن كواجهة مستقلة على الجهاز.`;
  }

  if (platform.isIOS) {
    return `لتثبيت ${appName} على iPhone أو iPad: افتح قائمة المشاركة في Safari ثم اختر "إضافة إلى الشاشة الرئيسية".`;
  }

  if (platform.isAndroid) {
    return `لتثبيت ${appName} على Android: افتح قائمة المتصفح ثم اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية".`;
  }

  if (platform.isSafari) {
    return `إذا لم يظهر خيار التثبيت مباشرة، افتح ${appName} من Chrome أو Edge على الجوال ثم اختر "تثبيت التطبيق" من قائمة المتصفح.`;
  }

  return `إذا لم يظهر خيار التثبيت مباشرة، افتح ${appName} من Chrome أو Edge ثم اختر "تثبيت التطبيق" أو "إضافة إلى الشاشة الرئيسية" من قائمة المتصفح.`;
};
