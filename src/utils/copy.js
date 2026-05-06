export const copyTextToClipboard = async (text) => {
  const normalizedText = String(text ?? '');

  if (!normalizedText) {
    throw new Error('لا يوجد نص لنسخه.');
  }

  if (navigator?.clipboard?.writeText) {
    try {
      await navigator.clipboard.writeText(normalizedText);
      return true;
    } catch (error) {
      // Fall back to legacy copy for in-app browsers and restricted contexts.
    }
  }

  const textArea = document.createElement('textarea');
  textArea.value = normalizedText;
  textArea.setAttribute('readonly', '');
  textArea.setAttribute('aria-hidden', 'true');
  textArea.style.position = 'fixed';
  textArea.style.top = '0';
  textArea.style.left = '-9999px';
  textArea.style.opacity = '0';

  document.body.appendChild(textArea);

  const selection = document.getSelection();
  const previousRange = selection && selection.rangeCount > 0 ? selection.getRangeAt(0) : null;

  textArea.focus();
  textArea.select();
  textArea.setSelectionRange(0, normalizedText.length);

  let copied = false;

  try {
    copied = document.execCommand('copy');
  } finally {
    document.body.removeChild(textArea);

    if (selection) {
      selection.removeAllRanges();
      if (previousRange) {
        selection.addRange(previousRange);
      }
    }
  }

  if (!copied) {
    throw new Error('تعذر نسخ النص تلقائيًا.');
  }

  return true;
};
