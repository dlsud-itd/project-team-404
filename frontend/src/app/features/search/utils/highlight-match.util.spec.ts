import { escapeHtml, highlightMatch, highlightMatchHtml } from './highlight-match.util';

describe('highlightMatch', () => {
  it('marks every match, ignoring case and keeping the original casing', () => {
    expect(highlightMatch('Sprint plan for sprint 6', 'SPRINT')).toEqual([
      { text: 'Sprint', match: true },
      { text: ' plan for ', match: false },
      { text: 'sprint', match: true },
      { text: ' 6', match: false },
    ]);
  });

  it('treats the query literally, so regex characters match themselves', () => {
    expect(highlightMatch('Cost (est.) $5.00', '(est.)')).toEqual([
      { text: 'Cost ', match: false },
      { text: '(est.)', match: true },
      { text: ' $5.00', match: false },
    ]);
    expect(highlightMatch('a.b', '.*')).toEqual([{ text: 'a.b', match: false }]);
  });

  it('trims the query and returns the whole text when it is empty', () => {
    expect(highlightMatch('Write report', '  ')).toEqual([{ text: 'Write report', match: false }]);
    expect(highlightMatch('Write report', ' report ')).toEqual([
      { text: 'Write ', match: false },
      { text: 'report', match: true },
    ]);
  });

  it('returns nothing for empty text', () => {
    expect(highlightMatch('', 'x')).toEqual([]);
  });

  it('keeps HTML as plain text in the parts', () => {
    const parts = highlightMatch('<img src=x onerror=alert(1)>', 'img');
    expect(parts.map((part) => part.text).join('')).toBe('<img src=x onerror=alert(1)>');
  });
});

describe('escapeHtml', () => {
  it('escapes the characters that matter in HTML', () => {
    expect(escapeHtml(`<a href="x">Tom & Jerry's</a>`)).toBe(
      '&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;',
    );
  });
});

describe('highlightMatchHtml', () => {
  it('escapes the text before wrapping matches in <mark>', () => {
    expect(highlightMatchHtml('<b>bold</b> move', 'bold')).toBe(
      '&lt;b&gt;<mark>bold</mark>&lt;/b&gt; move',
    );
  });

  it('escapes a query that looks like markup', () => {
    expect(highlightMatchHtml('use <script> tags', '<script>')).toBe(
      'use <mark>&lt;script&gt;</mark> tags',
    );
  });
});
