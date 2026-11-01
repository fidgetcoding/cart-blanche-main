import { describe, expect, it } from 'vitest';
import { csvCell, toCsv } from '../csv';

describe('csv', () => {
  it('stops a cell running as a spreadsheet formula', () => {
    expect(csvCell('=cmd@example.com')).toBe("'=cmd@example.com");
    for (const start of ['+1', '-1', '@a', '\tb']) expect(csvCell(start).startsWith("'")).toBe(true);
  });

  it('leaves ordinary text alone', () => {
    expect(csvCell('a@example.com')).toBe('a@example.com');
  });

  it('quotes commas and quotes', () => {
    expect(toCsv(['a', 'b'], [['1,2', 'say "hi"']])).toBe('a,b\n"1,2","say ""hi"""');
  });
});
