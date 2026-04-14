/**
 * Replace date placeholders in config strings.
 * Supports {{YYYYMMDD}} and {{DATE_ISO}} placeholders.
 */
export function replaceDatePlaceholders<T>(obj: T): T {
  const now = new Date();
  const YYYYMMDD = now.toISOString().slice(0, 10).replace(/-/g, '');
  const DATE_ISO = now.toISOString().slice(0, 10);

  if (typeof obj === 'string') {
    return obj
      .replace(/\{\{YYYYMMDD\}\}/g, YYYYMMDD)
      .replace(/\{\{DATE_ISO\}\}/g, DATE_ISO) as T;
  } else if (Array.isArray(obj)) {
    return obj.map(replaceDatePlaceholders) as T;
  } else if (typeof obj === 'object' && obj !== null) {
    const result = { ...obj };
    for (const key of Object.keys(result as Record<string, unknown>)) {
      (result as Record<string, unknown>)[key] = replaceDatePlaceholders(
        (result as Record<string, unknown>)[key]
      );
    }
    return result;
  }
  return obj;
}
