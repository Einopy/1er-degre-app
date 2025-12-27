import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function normalizeEditorHTML(html: string): string {
  if (!html) return '';

  let normalized = html
    .replace(/>\s+</g, '><')
    .replace(/\s+/g, ' ')
    .replace(/<p>\s*<\/p>/g, '<p></p>')
    .replace(/<p><br><\/p>/g, '<p></p>')
    .replace(/<p>\s*<br\s*\/?>\s*<\/p>/g, '<p></p>')
    .trim();

  normalized = normalized.replace(
    /<span[^>]*data-placeholder="([^"]+)"[^>]*>.*?<\/span>/g,
    '$1'
  );

  normalized = normalized
    .replace(/\s+class="[^"]*"/g, '')
    .replace(/\s+style="[^"]*"/g, '')
    .replace(/\s+data-[^=]+="[^"]*"/g, '');

  normalized = normalized
    .replace(/<p><\/p>$/g, '')
    .replace(/^<p><\/p>/g, '');

  return normalized.trim();
}

export function normalizeTextForSearch(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}
