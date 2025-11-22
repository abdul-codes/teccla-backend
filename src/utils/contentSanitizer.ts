import DOMPurify from 'dompurify';
import { JSDOM } from 'jsdom';

// Create DOMPurify instance with JSDOM
const window = new JSDOM('').window;
const purify = DOMPurify(window);

export function sanitizeContent(content: string): string {
  if (!content) return content;
  
  // Basic sanitization - allow only safe formatting
  const sanitized = purify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: []
  });
  
  return sanitized.trim();
}

export function sanitizeMessageContent(content: string): string {
  return sanitizeContent(content);
}