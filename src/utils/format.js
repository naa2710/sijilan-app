const ARABIC_DIGITS = {
  '٠': '0',
  '١': '1',
  '٢': '2',
  '٣': '3',
  '٤': '4',
  '٥': '5',
  '٦': '6',
  '٧': '7',
  '٨': '8',
  '٩': '9',
};

const ENGLISH_NUMBER_FORMATTER = new Intl.NumberFormat('en-US', {
  maximumFractionDigits: 2,
});

export const toEnglishDigits = (value = '') =>
  String(value).replace(/[٠-٩]/g, (digit) => ARABIC_DIGITS[digit] || digit);

export const formatNumber = (value) => {
  const normalized = toEnglishDigits(value ?? 0);
  const parsed = Number(normalized);

  if (!Number.isFinite(parsed)) return '0';
  return ENGLISH_NUMBER_FORMATTER.format(parsed);
};

export const formatDate = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  const year = String(date.getFullYear());
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');

  return `${year}/${month}/${day}`;
};

export const formatTime = (value) => {
  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return '';

  return date.toLocaleTimeString('ar-SA', {
    hour: '2-digit',
    minute: '2-digit',
  });
};

export const formatDateTime = (value) => {
  const formattedDate = formatDate(value);
  const formattedTime = formatTime(value);

  if (!formattedDate) return '';
  if (!formattedTime) return formattedDate;

  return `${formattedDate} | ${formattedTime}`;
};

export const normalizeSearchText = (value = '') =>
  toEnglishDigits(value).trim();

export const normalizeDigitsInData = (value) => {
  if (typeof value === 'string') {
    return toEnglishDigits(value);
  }

  if (Array.isArray(value)) {
    return value.map((item) => normalizeDigitsInData(item));
  }

  if (value && typeof value === 'object') {
    return Object.fromEntries(
      Object.entries(value).map(([key, item]) => [key, normalizeDigitsInData(item)]),
    );
  }

  return value;
};
