// Simple Node.js compatible sanitization
export function sanitizeContent(content: string): string {
  if (!content) return content;
  
  // Remove HTML tags and scripts
  let sanitized = content
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<[^>]+>/g, '')
    .trim();
  
  // Limit length
  if (sanitized.length > 5000) {
    sanitized = sanitized.substring(0, 5000);
  }
  
  return sanitized;
}

export function sanitizeMessageContent(content: string): string {
  return sanitizeContent(content);
}