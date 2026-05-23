/**
 * File upload validation: matches the spec — 5MB max, jpeg/png/webp/pdf only.
 */

export const ALLOWED_RECEIPT_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'] as const;
export const MAX_RECEIPT_BYTES = 5 * 1024 * 1024;

export interface FileValidationResult {
  ok: boolean;
  error?: string;
}

export function validateReceiptFile(file: File): FileValidationResult {
  if (file.size > MAX_RECEIPT_BYTES) {
    return { ok: false, error: `File is larger than ${(MAX_RECEIPT_BYTES / 1024 / 1024).toFixed(0)}MB.` };
  }
  if (!ALLOWED_RECEIPT_MIME.includes(file.type as typeof ALLOWED_RECEIPT_MIME[number])) {
    return { ok: false, error: `Unsupported file type "${file.type}". Use JPEG, PNG, WebP, or PDF.` };
  }
  return { ok: true };
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(reader.error);
    reader.onload = () => resolve(reader.result as string);
    reader.readAsDataURL(file);
  });
}

/**
 * Read a File as raw base64 (no `data:...;base64,` prefix).
 * Useful for APIs that want bytes only — e.g. Gemini's `inline_data.data`.
 */
export async function readFileAsBase64(file: File): Promise<string> {
  const dataUrl = await readFileAsDataURL(file);
  const commaIdx = dataUrl.indexOf(',');
  return commaIdx === -1 ? dataUrl : dataUrl.slice(commaIdx + 1);
}
