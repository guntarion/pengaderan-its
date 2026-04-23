// src/lib/ai-utils.ts
// Shared utilities for AI API routes.
// Framework-agnostic — no project-specific logic.

/**
 * Robustly parse JSON from AI response content.
 * Handles: markdown code blocks, raw JSON objects {}, raw JSON arrays [],
 * and extra surrounding text. Works for both object and array top-level responses.
 *
 * IMPORTANT: Always use this instead of inline regex patterns.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parseAIJsonResponse(content: string): any {
  // Try markdown code block first
  const codeBlockMatch = content.match(/```json?\s*([\s\S]*?)```/);
  if (codeBlockMatch?.[1]) {
    return JSON.parse(codeBlockMatch[1].trim());
  }

  // Find outermost JSON object {} and array []
  const objStart = content.indexOf('{');
  const objEnd = content.lastIndexOf('}');
  const arrStart = content.indexOf('[');
  const arrEnd = content.lastIndexOf(']');

  const hasObj = objStart !== -1 && objEnd > objStart;
  const hasArr = arrStart !== -1 && arrEnd > arrStart;

  if (hasObj && hasArr) {
    // Both found — use whichever starts first
    return objStart < arrStart
      ? JSON.parse(content.substring(objStart, objEnd + 1))
      : JSON.parse(content.substring(arrStart, arrEnd + 1));
  } else if (hasObj) {
    return JSON.parse(content.substring(objStart, objEnd + 1));
  } else if (hasArr) {
    return JSON.parse(content.substring(arrStart, arrEnd + 1));
  }

  // Last resort: try parsing the entire string
  return JSON.parse(content);
}

/**
 * Normalize any value to string for Prisma String? fields.
 * AI sometimes returns arrays or objects for fields that should be strings.
 *
 * Rules:
 * - Array → numbered list joined by newlines
 * - Object → key: value markdown pairs
 * - null/undefined → null
 * - Other → String(v)
 */
export function toStr(v: unknown): string | null {
  if (v == null) return null;

  if (Array.isArray(v)) {
    if (v.length === 0) return null;
    return v
      .map((item, i) => {
        if (typeof item === 'object' && item !== null) {
          const obj = item as Record<string, unknown>;
          const label = String(obj.name || obj.title || obj.label || '');
          const desc = String(obj.description || obj.detail || '');
          return `${i + 1}. ${label}${desc ? ': ' + desc : ''}`;
        }
        return `${i + 1}. ${item}`;
      })
      .join('\n');
  }

  if (typeof v === 'object') {
    const entries = Object.entries(v as Record<string, unknown>);
    if (entries.length === 0) return null;
    return entries
      .map(([key, val]) => {
        const valStr =
          typeof val === 'object' && val !== null ? JSON.stringify(val) : String(val ?? '');
        return `**${key}**: ${valStr}`;
      })
      .join('\n\n');
  }

  return String(v);
}

/**
 * Build a safe context string from optional fields.
 * Returns only non-empty fields to avoid cluttering prompts with undefined values.
 * Pass in a record of label → value pairs.
 *
 * Example:
 *   buildPromptContext({ 'Project Name': project.name, 'Description': project.desc })
 *   → "Project Name: My App\nDescription: A great app"
 */
export function buildPromptContext(fields: Record<string, string | null | undefined>): string {
  return Object.entries(fields)
    .filter(([, val]) => val != null && val.trim() !== '')
    .map(([key, val]) => `${key}: ${val}`)
    .join('\n');
}
