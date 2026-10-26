import {
  boardCases,
  COLUMNS,
  validateBoardCases,
} from '../../src/data/boardCases';
import { expect, test } from '../../src/fixtures/test';
import rawBoardCases from '../data/board-cases.json';

// NFR-10: the board-case data and its validator. No test here asks for `page`, so no browser
// starts (NFR-08).

/** A synthetic valid case. Each rejection test breaks exactly one thing in a copy of it. */
const validCase = {
  id: 'TC-99',
  project: 'Any project',
  task: 'Any task',
  column: 'To Do',
  tags: ['Feature'],
};

test.describe('Board-case data (NFR-10)', () => {
  test('the data file passes validation', () => {
    expect(() => validateBoardCases(rawBoardCases)).not.toThrow();
    expect(boardCases).toEqual(rawBoardCases);
  });

  test('accepts every board column', () => {
    expect(COLUMNS).toEqual(['To Do', 'In Progress', 'Review', 'Done']);
    const onePerColumn = COLUMNS.map((column, index) => ({
      ...validCase,
      id: `TC-9${index}`,
      column,
    }));
    expect(validateBoardCases(onePerColumn)).toEqual(onePerColumn);
  });

  test('rejects data that is not a non-empty array', () => {
    expect(() => validateBoardCases({ ...validCase })).toThrow(
      'Board cases must be a non-empty array',
    );
    expect(() => validateBoardCases([])).toThrow(
      'Board cases must be a non-empty array',
    );
    expect(() => validateBoardCases(['TC-01'])).toThrow(
      'Board case [0] must be an object',
    );
  });

  test('rejects a duplicate id', () => {
    expect(() =>
      validateBoardCases([validCase, { ...validCase, task: 'Other task' }]),
    ).toThrow('Board case [1]: duplicate id "TC-99"');
  });

  test('rejects an empty or missing field', () => {
    for (const field of ['id', 'project', 'task', 'column'] as const) {
      const message = `Board case [0]: "${field}" must be a non-empty string`;
      expect(() => validateBoardCases([{ ...validCase, [field]: '' }])).toThrow(
        message,
      );
      expect(() =>
        validateBoardCases([{ ...validCase, [field]: '   ' }]),
      ).toThrow(message);
      expect(() =>
        validateBoardCases([{ ...validCase, [field]: undefined }]),
      ).toThrow(message);
    }
  });

  test('rejects an unknown column', () => {
    expect(() =>
      validateBoardCases([{ ...validCase, column: 'Backlog' }]),
    ).toThrow(
      'Board case [0]: "column" must be one of "To Do", "In Progress", "Review", "Done", got "Backlog"',
    );
    // Columns are matched exactly, so a case difference is a wrong column too.
    expect(() =>
      validateBoardCases([{ ...validCase, column: 'to do' }]),
    ).toThrow('got "to do"');
  });

  test('rejects empty tags', () => {
    const message =
      'Board case [0]: "tags" must be a non-empty array of non-empty strings';
    expect(() => validateBoardCases([{ ...validCase, tags: [] }])).toThrow(
      message,
    );
    expect(() =>
      validateBoardCases([{ ...validCase, tags: undefined }]),
    ).toThrow(message);
    expect(() =>
      validateBoardCases([{ ...validCase, tags: ['Feature', ''] }]),
    ).toThrow(message);
    expect(() =>
      validateBoardCases([{ ...validCase, tags: ['Feature', 7] }]),
    ).toThrow(message);
  });

  test('rejects duplicate tags', () => {
    expect(() =>
      validateBoardCases([{ ...validCase, tags: ['Feature', 'Feature'] }]),
    ).toThrow('Board case [0]: duplicate tag "Feature"');
  });
});
