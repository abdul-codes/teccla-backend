import { JSDOM } from 'jsdom';
import DOMPurify from 'dompurify';

// Initialize DOMPurify with jsdom window
const window = new JSDOM('').window;
const purify = DOMPurify(window);

/**
 * Sanitize content to prevent XSS attacks
 * Uses DOMPurify for robust HTML sanitization
 */
export function sanitizeContent(content: string, maxLength: number = 5000): string {
  if (!content) return content;

  // Truncate to max length before sanitizing (prevents DoS)
  const truncated = content.substring(0, maxLength);

  // Sanitize using DOMPurify
  const sanitized = purify.sanitize(truncated, {
    ALLOWED_TAGS: [], // Disallow all HTML tags
    ALLOWED_ATTR: [], // Disallow all HTML attributes
    KEEP_CONTENT: true, // Keep text content
  });

  return sanitized.trim();
}

/**
 * Sanitize message content with specific rules for chat
 */
export function sanitizeMessageContent(content: string): string {
  return sanitizeContent(content, 5000); // 5000 char limit for messages
}

/**
 * Sanitize user input for rich text (if needed in future)
 * Allows basic formatting tags but blocks scripts and dangerous attributes
 */
export function sanitizeRichText(content: string): string {
  if (!content) return content;

  const truncated = content.substring(0, 10000); // 10000 char limit

  return purify.sanitize(truncated, {
    ALLOWED_TAGS: ['b', 'i', 'u', 'strong', 'em', 'p', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: [], // No attributes allowed for security
    KEEP_CONTENT: true,
  }).trim();
}
