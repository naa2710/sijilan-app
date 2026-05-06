const loadImageFromDataUrl = (dataUrl) => new Promise((resolve, reject) => {
  const image = new Image();
  image.onload = () => resolve(image);
  image.onerror = () => reject(new Error('تعذر قراءة صورة الإيصال.'));
  image.src = dataUrl;
});

const readFileAsDataUrl = (file) => new Promise((resolve, reject) => {
  const reader = new FileReader();
  reader.onload = () => resolve(String(reader.result || ''));
  reader.onerror = () => reject(new Error('تعذر قراءة ملف الصورة.'));
  reader.readAsDataURL(file);
});

const normalizeImageBounds = (width, height, maxDimension) => {
  if (!width || !height) return { width: maxDimension, height: maxDimension };
  const largestSide = Math.max(width, height);
  if (largestSide <= maxDimension) return { width, height };
  const scale = maxDimension / largestSide;
  return {
    width: Math.round(width * scale),
    height: Math.round(height * scale),
  };
};

export const prepareReceiptImage = async (file, options = {}) => {
  if (!file) return null;
  if (!file.type.startsWith('image/')) {
    throw new Error('الملف المختار ليس صورة.');
  }

  const {
    maxDimension = 1400,
    quality = 0.78,
    outputType = 'image/jpeg',
  } = options;

  const originalDataUrl = await readFileAsDataUrl(file);
  const image = await loadImageFromDataUrl(originalDataUrl);
  const size = normalizeImageBounds(image.width, image.height, maxDimension);

  const canvas = document.createElement('canvas');
  canvas.width = size.width;
  canvas.height = size.height;

  const context = canvas.getContext('2d');
  if (!context) {
    throw new Error('تعذر تجهيز الصورة.');
  }

  context.drawImage(image, 0, 0, size.width, size.height);

  const dataUrl = canvas.toDataURL(outputType, quality);

  return {
    dataUrl,
    fileName: file.name || `receipt-${Date.now()}.jpg`,
    mimeType: outputType,
    width: size.width,
    height: size.height,
  };
};

export const dataUrlToFile = (dataUrl, fileName = `receipt-${Date.now()}.jpg`) => {
  const [meta, base64] = String(dataUrl || '').split(',');
  const mimeType = meta?.match(/data:(.*?);base64/)?.[1] || 'image/jpeg';
  const binary = atob(base64 || '');
  const bytes = new Uint8Array(binary.length);

  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }

  return new File([bytes], fileName, { type: mimeType });
};
