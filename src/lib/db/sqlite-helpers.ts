import { SQL, sql } from "drizzle-orm";
import { AnySQLiteColumn } from "drizzle-orm/sqlite-core";

/**
 * Helper functions for working with JSON arrays in SQLite
 * These replace PostgreSQL array operations with JSON functions
 */

/**
 * Check if a JSON array column contains a specific value
 * Replaces PostgreSQL's arrayContains() function
 */
export function jsonArrayContains(column: AnySQLiteColumn, value: string): SQL {
  return sql`json_extract(${column}, '$') LIKE ${`%"${value}"%`}`;
}

/**
 * Check if a JSON array column contains any of the provided values
 */
export function jsonArrayContainsAny(
  column: AnySQLiteColumn,
  values: string[]
): SQL {
  const conditions = values.map(
    (val) => sql`json_extract(${column}, '$') LIKE ${`%"${val}"%`}`
  );
  return sql`(${sql.join(conditions, sql` OR `)})`;
}

/**
 * Get the length of a JSON array
 */
export function jsonArrayLength(column: AnySQLiteColumn): SQL<number> {
  return sql<number>`json_array_length(${column})`;
}

/**
 * Extract all tags from all rows as separate rows
 * This replaces PostgreSQL's unnest() function for tags aggregation
 * Note: This is a helper for manual processing, SQLite doesn't have a direct equivalent
 */
export function extractTagsForAggregation(): {
  extractTag: SQL<string>;
  hasTags: SQL<boolean>;
} {
  return {
    extractTag: sql<string>`json_extract(value, '$')`,
    hasTags: sql<boolean>`json_array_length(${sql.raw("tags")}) > 0`,
  };
}

/**
 * Check if JSON array is not null and has items
 */
export function jsonArrayNotEmpty(column: AnySQLiteColumn): SQL {
  return sql`${column} IS NOT NULL AND json_array_length(${column}) > 0`;
}

/**
 * Parse JSON array string to JavaScript array
 */
export function parseJsonArray(jsonString: string | null): string[] {
  if (!jsonString) return [];
  try {
    const parsed = JSON.parse(jsonString);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Convert JavaScript array to JSON string for storage
 */
export function stringifyJsonArray(arr: string[] | null | undefined): string {
  if (!arr || !Array.isArray(arr)) return "[]";
  return JSON.stringify(arr);
}
