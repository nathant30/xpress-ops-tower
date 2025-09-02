/**
 * Safe HTML Sanitizer for Xpress Ops Tower
 * Prevents XSS attacks by sanitizing HTML content
 */

import React from 'react';

interface SanitizedContent {
  sanitized: string;
  safe: boolean;
  warnings: string[];
}

const ALLOWED_TAGS = ['p', 'br', 'strong', 'em', 'u', 'code', 'pre', 'ul', 'ol', 'li'];
const DANGEROUS_PATTERNS = [
  /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
  /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
  /<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi,
  /<embed\b[^>]*>/gi,
  /<link\b[^>]*>/gi,
  /<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi,
  /on\w+\s*=\s*[^>]*/gi, // Event handlers
  /javascript:/gi,
  /vbscript:/gi,
  /data:(?!image\/)/gi, // Data URLs except images
];

/**
 * Sanitize HTML content to prevent XSS attacks
 * @param content - Raw HTML content
 * @returns Sanitized content with warnings
 */
export function sanitizeHTML(content: string): SanitizedContent {
  if (!content || typeof content !== 'string') {
    return {
      sanitized: '',
      safe: true,
      warnings: []
    };
  }

  const warnings: string[] = [];
  let sanitized = content;

  // Check for dangerous patterns
  DANGEROUS_PATTERNS.forEach(pattern => {
    if (pattern.test(sanitized)) {
      warnings.push(`Removed potentially dangerous content: ${pattern.source}`);
      sanitized = sanitized.replace(pattern, '');
    }
  });

  // Remove any remaining HTML tags not in allowed list
  const tagPattern = /<\/?(\w+)(?:\s[^>]*)?\s*>/gi;
  sanitized = sanitized.replace(tagPattern, (match, tagName) => {
    if (ALLOWED_TAGS.includes(tagName.toLowerCase())) {
      // Keep allowed tags but strip attributes for safety
      const isClosing = match.startsWith('</');
      return isClosing ? `</${tagName}>` : `<${tagName}>`;
    }
    warnings.push(`Removed disallowed HTML tag: ${tagName}`);
    return '';
  });

  // Escape remaining angle brackets
  sanitized = sanitized.replace(/</g, '&lt;').replace(/>/g, '&gt;');

  return {
    sanitized: sanitized.trim(),
    safe: warnings.length === 0,
    warnings
  };
}

/**
 * Convert plain text to safe HTML with basic formatting
 * @param text - Plain text content
 * @returns Safe HTML with basic formatting preserved
 */
export function textToSafeHTML(text: string): string {
  if (!text) return '';
  
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\n/g, '<br>')
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/`(.*?)`/g, '<code>$1</code>');
}

/**
 * React component for safe HTML rendering
 */

interface SafeHTMLProps {
  content: string;
  className?: string;
  allowBasicFormatting?: boolean;
  onSanitizationWarning?: (warnings: string[]) => void;
}

export const SafeHTML: React.FC<SafeHTMLProps> = ({ 
  content, 
  className = '', 
  allowBasicFormatting = false,
  onSanitizationWarning
}) => {
  const processed = React.useMemo(() => {
    if (allowBasicFormatting) {
      const sanitized = sanitizeHTML(content);
      if (sanitized.warnings.length > 0 && onSanitizationWarning) {
        onSanitizationWarning(sanitized.warnings);
      }
      return sanitized.sanitized;
    }
    return textToSafeHTML(content);
  }, [content, allowBasicFormatting, onSanitizationWarning]);

  return (
    <div 
      className={className}
      dangerouslySetInnerHTML={{ __html: processed }}
    />
  );
};

/**
 * Simple safe text component (recommended for most cases)
 */
export const SafeText: React.FC<{ 
  content: string; 
  className?: string;
  preserveFormatting?: boolean;
}> = ({ content, className = '', preserveFormatting = false }) => {
  if (!content) return null;
  
  if (preserveFormatting) {
    return (
      <div className={className} style={{ whiteSpace: 'pre-wrap' }}>
        {content}
      </div>
    );
  }
  
  return (
    <div className={className}>
      {content}
    </div>
  );
};

export default { sanitizeHTML, textToSafeHTML, SafeHTML, SafeText };