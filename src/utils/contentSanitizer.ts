import * as DOMPurify from 'dompurify';

// Simple Node.js compatible sanitization
export function sanitizeContent(content: string): string {
  if (!content) return content;
  
  // Basic sanitization - allow only safe formatting
  const sanitized = DOMPurify.sanitize(content, {
    ALLOWED_TAGS: ['b', 'i', 'em', 'strong', 'br', 'p'],
    ALLOWED_ATTR: []
  });
  
  return sanitized.trim();
}

export function sanitizeMessageContent(content: string): string {
  return sanitizeContent(content);
}