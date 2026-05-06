import { toPng, toBlob } from 'html-to-image';

export const captureNodeAsPng = async (node, backgroundColor, pixelRatio = 2) => {
  if (!node) {
    throw new Error('لم يتم العثور على العنصر المطلوب للتصدير');
  }

  return toPng(node, {
    cacheBust: true,
    pixelRatio,
    backgroundColor,
  });
};

export const captureNodeAsBlob = async (node, backgroundColor, pixelRatio = 2) => {
  if (!node) {
    throw new Error('لم يتم العثور على العنصر المطلوب للتصدير');
  }

  const blob = await toBlob(node, {
    cacheBust: true,
    pixelRatio,
    backgroundColor,
  });

  if (!blob) {
    throw new Error('فشل إنشاء ملف الصورة');
  }

  return blob;
};
