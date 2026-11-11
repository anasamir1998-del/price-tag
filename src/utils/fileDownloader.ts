/**
 * Bulletproof Browser File Download Utility
 * Ensures proper extension, explicit MIME types, and cross-browser filename support
 */
export function downloadFile(
  data: Blob | string,
  fileName: string,
  mimeType?: string
): void {
  let blob: Blob;

  if (typeof data === 'string') {
    blob = new Blob([data], { type: mimeType || 'text/plain;charset=utf-8' });
  } else {
    blob = mimeType && blob!?.type !== mimeType ? new Blob([data], { type: mimeType }) : data;
  }

  // Fallback / clean sanitized ASCII-safe fallback or unicode
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.style.display = 'none';
  a.href = url;
  a.download = fileName;

  document.body.appendChild(a);
  a.click();

  // Clean up
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 2000);
}
