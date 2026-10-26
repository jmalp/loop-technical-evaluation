import rawBoardCases from '../../tests/data/board-cases.json';

/**
 * Board-case data (SPEC §5, NFR-10). `tests/data/board-cases.json` is the only source of board
 * scenarios; it is validated here, when this module loads, so bad data fails before any board
 * test is generated.
 */

/** The four columns every board shows, in display order (SPEC v1.2, NFR-10). */
export const COLUMNS = ['To Do', 'In Progress', 'Review', 'Done'] as const;

export type Column = (typeof COLUMNS)[number];

/** One board scenario: a task card, the column it sits in and its exact tags (SPEC §5). */
export interface BoardCase {
  readonly id: string;
  readonly project: string;
  readonly task: string;
  readonly column: Column;
  /** Exact and complete: the card shows these tags and no others (NFR-06). Order does not matter. */
  readonly tags: readonly string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim() !== '';
}

function isColumn(value: string): value is Column {
  return (COLUMNS as readonly string[]).includes(value);
}

/**
 * Checks the raw data and returns it typed. Throws on the first problem, naming the case's index
 * and the field: duplicate IDs, empty or missing fields, unknown columns, and empty or duplicate
 * tags. An empty list is rejected too, because it would silently generate no board tests.
 */
export function validateBoardCases(input: unknown): BoardCase[] {
  if (!Array.isArray(input) || input.length === 0) {
    throw new Error('Board cases must be a non-empty array of case objects.');
  }

  const seenIds = new Set<string>();
  return input.map((item: unknown, index): BoardCase => {
    const where = `Board case [${index}]`;
    if (!isRecord(item)) {
      throw new Error(`${where} must be an object.`);
    }

    const requireString = (field: string): string => {
      const value = item[field];
      if (!isNonEmptyString(value)) {
        throw new Error(`${where}: "${field}" must be a non-empty string.`);
      }
      return value;
    };
    const id = requireString('id');
    const project = requireString('project');
    const task = requireString('task');
    const column = requireString('column');
    const { tags } = item;

    if (seenIds.has(id)) {
      throw new Error(`${where}: duplicate id "${id}".`);
    }
    seenIds.add(id);

    if (!isColumn(column)) {
      const allowed = COLUMNS.map((name) => `"${name}"`).join(', ');
      throw new Error(
        `${where}: "column" must be one of ${allowed}, got "${column}".`,
      );
    }

    if (
      !Array.isArray(tags) ||
      tags.length === 0 ||
      !tags.every(isNonEmptyString)
    ) {
      throw new Error(
        `${where}: "tags" must be a non-empty array of non-empty strings.`,
      );
    }
    const seenTags = new Set<string>();
    for (const tag of tags) {
      if (seenTags.has(tag)) {
        throw new Error(`${where}: duplicate tag "${tag}".`);
      }
      seenTags.add(tag);
    }

    return { id, project, task, column, tags };
  });
}

/** The validated contents of `tests/data/board-cases.json`. */
export const boardCases: readonly BoardCase[] =
  validateBoardCases(rawBoardCases);
