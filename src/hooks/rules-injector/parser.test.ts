import { describe, expect, it } from 'vitest';

import { parseRuleFrontmatter } from './parser.js';

// Rule files authored on Windows use CRLF line endings. The frontmatter
// delimiter regex tolerates `\r`, but the multi-line array branch matches
// items with `/^\s+-\s*(.*)$/`, and JS `.`/`$` do not span a trailing `\r`.
// Without normalising line endings, a `\r`-terminated `  - pattern` item
// fails to match and the whole array collapses (globs -> ''), so the rule
// silently applies to nothing.
describe('parseRuleFrontmatter line endings', () => {
  it('parses a multi-line globs array with CRLF line endings', () => {
    const content = [
      '---',
      'globs:',
      '  - "**/*.py"',
      '  - "src/**/*.ts"',
      'alwaysApply: false',
      '---',
      'body',
    ].join('\r\n');

    const { metadata } = parseRuleFrontmatter(content);

    expect(metadata.globs).toEqual(['**/*.py', 'src/**/*.ts']);
  });

  it('matches the LF result for the same multi-line array', () => {
    const lines = [
      '---',
      'globs:',
      '  - "**/*.py"',
      '  - "src/**/*.ts"',
      '---',
      'body',
    ];

    const lf = parseRuleFrontmatter(lines.join('\n'));
    const crlf = parseRuleFrontmatter(lines.join('\r\n'));

    expect(crlf.metadata).toEqual(lf.metadata);
  });

  it('parses a multi-line paths alias array with CRLF line endings', () => {
    const content = [
      '---',
      'paths:',
      '  - "*.md"',
      '---',
      'body',
    ].join('\r\n');

    const { metadata } = parseRuleFrontmatter(content);

    expect(metadata.globs).toEqual(['*.md']);
  });
});

describe('parseRuleFrontmatter brace globs', () => {
  const parseGlobs = (line: string) => parseRuleFrontmatter(`---\n${line}\n---\nbody`).metadata.globs;

  it('keeps commas inside braces in a bare string value', () => {
    expect(parseGlobs('paths: src/**/*.{ts,tsx}')).toEqual(['src/**/*.{ts,tsx}']);
    expect(parseGlobs('paths: src/*.{ts,tsx,}')).toEqual(['src/*.{ts,tsx,}']);
  });

  it('still splits comma-separated patterns outside braces', () => {
    expect(parseGlobs('globs: a/*.{ts,tsx}, b/*.md')).toEqual(['a/*.{ts,tsx}', 'b/*.md']);
    expect(parseGlobs('globs: **/*.ts,**/*.tsx')).toEqual(['**/*.ts', '**/*.tsx']);
    expect(parseGlobs("globs: \"docs/what's-new.md, src/*.ts\"")).toEqual([
      "docs/what's-new.md",
      'src/*.ts',
    ]);
    expect(parseGlobs("globs: docs/what's-new.md, src/*.ts")).toEqual([
      "docs/what's-new.md",
      'src/*.ts',
    ]);
    expect(parseGlobs('globs: a{b.ts, docs/*.md')).toEqual(['a{b.ts', 'docs/*.md']);
    expect(parseGlobs('paths: [a{b.ts, docs/*.md]')).toEqual(['a{b.ts', 'docs/*.md']);
  });

  it('keeps commas inside braces in an unquoted inline array item', () => {
    expect(parseGlobs('paths: [src/*.{ts,tsx}, docs/*.md]')).toEqual(['src/*.{ts,tsx}', 'docs/*.md']);
    expect(parseGlobs('paths: [src/*.{ts,tsx,}, docs/*.md]')).toEqual(['src/*.{ts,tsx,}', 'docs/*.md']);
    expect(parseGlobs("paths: [docs/what's-new.md, src/*.ts]")).toEqual(["docs/what's-new.md", 'src/*.ts']);
    expect(parseGlobs('paths: ["src/*.{ts,tsx}", "docs/*.md"]')).toEqual(['src/*.{ts,tsx}', 'docs/*.md']);
    expect(parseGlobs(String.raw`globs: ['fixtures/\{a,b\}.json']`)).toEqual([
      String.raw`fixtures/\{a,b\}.json`,
    ]);
  });

  it('handles deeply nested brace alternatives with quote-looking items', () => {
    const depth = 128;
    const pattern = `src/${'{a,"quoted",'.repeat(depth)}leaf${'}'.repeat(depth)}`;

    expect(parseGlobs(`globs: [${pattern}, docs/**]`)).toEqual([pattern, 'docs/**']);
  });

  it('preserves escaped literal brace globs in a block array', () => {
    const literalGlob = String.raw`fixtures/\{a,b\}.json`;
    const { metadata } = parseRuleFrontmatter(`---\nglobs:\n  - '${literalGlob}'\n---\nbody`);

    expect(metadata.globs).toEqual([literalGlob]);
  });

  it('merges paths and globs without splitting brace alternatives', () => {
    const { metadata } = parseRuleFrontmatter([
      '---',
      'paths: src/**/*.{ts,tsx}',
      'globs: "**/*.md"',
      '---',
      'body',
    ].join('\n'));

    expect(metadata.globs).toEqual(['src/**/*.{ts,tsx}', '**/*.md']);
  });
});

describe('parseRuleFrontmatter UTF-8 BOM', () => {
  it('parses a rule file that starts with a BOM', () => {
    const { metadata, body } = parseRuleFrontmatter('\uFEFF---\nglobs: "src/**/*.ts"\nalwaysApply: false\n---\nrule\uFEFF body');

    expect(metadata.globs).toBe('src/**/*.ts');
    expect(body).toBe('rule\uFEFF body');
  });
});

describe('parseRuleFrontmatter trailing comments', () => {
  const parse = (yaml: string) => parseRuleFrontmatter(`---\n${yaml}\n---\nbody`).metadata;

  it('ignores a comment after alwaysApply', () => {
    expect(parse('alwaysApply: true # applies everywhere').alwaysApply).toBe(true);
  });

  it('ignores a comment after a scalar glob', () => {
    expect(parse('globs: "src/**/*.ts" # typescript only').globs).toBe('src/**/*.ts');
    expect(parse('paths: src/**/*.ts   # typescript only').globs).toBe('src/**/*.ts');
  });

  it('ignores comments after list items and after the key', () => {
    expect(parse('paths: # rule targets\n  - "src/**" # code\n  - lib/**')).toEqual({
      globs: ['src/**', 'lib/**'],
    });
  });

  it('ignores a comment after an inline array', () => {
    expect(parse('globs: ["a/**", "b/**"] # both').globs).toEqual(['a/**', 'b/**']);
  });

  it('keeps adjacent hashes in inline-array globs when finding the closing bracket', () => {
    expect(parse('globs: [src/[ab]#tag{foo,"bar}, "docs/ #notes/**"]').globs).toEqual([
      'src/[ab]#tag{foo,"bar}',
      'docs/ #notes/**',
    ]);
  });

  it('keeps # inside quotes and glued to non-space text', () => {
    expect(parse('globs: "docs/ #notes/**"').globs).toBe('docs/ #notes/**');
    expect(parse('globs: docs/#notes/**').globs).toBe('docs/#notes/**');
  });

  it('treats a whitespace-separated hash in an unquoted glob as a comment', () => {
    expect(parse('globs: docs/ #notes/**').globs).toBe('docs/');
  });

  it('keeps hashes inside quoted inline-array globs and strips the outside comment', () => {
    expect(parse('globs: ["docs/ #notes/**", "src/**"] # both patterns').globs).toEqual([
      'docs/ #notes/**',
      'src/**',
    ]);
    expect(parse("paths: ['docs/ #notes/**', 'src/**'] # both patterns").globs).toEqual([
      'docs/ #notes/**',
      'src/**',
    ]);
  });

  it('does not treat quote characters in glob character classes as YAML quotes', () => {
    expect(parse("globs: docs/[']*.md # docs only").globs).toBe("docs/[']*.md");

    const inlineArray = String.raw`globs: [docs/[']*.md, "src/**"] # both`;
    expect(parse(inlineArray).globs).toEqual(["docs/[']*.md", 'src/**']);

    const escapedBracketArray = String.raw`globs: [src/\[, "docs/ #notes/**"] # both`;
    expect(parse(escapedBracketArray).globs).toEqual([String.raw`src/\[`, 'docs/ #notes/**']);
  });

  it('recognizes quoted items after unmatched braces without scanning comment text', () => {
    expect(parse('globs: [a{b.ts, "docs/ #notes/**"] # see }]').globs).toEqual([
      'a{b.ts',
      'docs/ #notes/**',
    ]);
  });

  it('keeps unmatched braces from spanning later quoted flow items', () => {
    expect(parse('globs: [a{b, "docs/ } #notes/**", src/**]').globs).toEqual([
      'a{b',
      'docs/ } #notes/**',
      'src/**',
    ]);
  });

  it('keeps doubled apostrophes inside quoted flow items after backslashes', () => {
    const inlineArray = String.raw`globs: [a{b, 'docs/ } \'' #notes/**', src/**] # both`;

    expect(parse(inlineArray).globs).toEqual([
      'a{b',
      String.raw`docs/ } \'' #notes/**`,
      'src/**',
    ]);
  });

  it('keeps balanced brace groups across quoted alternatives', () => {
    expect(parse(`globs: [src/{foo,'bar',baz}, docs/**]`).globs).toEqual([
      "src/{foo,'bar',baz}",
      'docs/**',
    ]);
  });

  it('keeps a brace-closing literal quote pair inside its glob item', () => {
    expect(parse("globs: [src/{foo,'bar}', docs/**]").globs).toEqual([
      "src/{foo,'bar}'",
      'docs/**',
    ]);
  });

  it('does not use flow-item recovery for comma-separated scalar globs', () => {
    expect(parse(`globs: "src/{foo,' #bar}', docs/**"`).globs).toEqual([
      "src/{foo,' #bar}'",
      'docs/**',
    ]);
  });

  it('keeps a literal quote from hiding a balanced brace closer', () => {
    const firstPattern = `src/{a,'x',"}`;

    expect(parse(`globs: [${firstPattern}, "docs/**", z/**]`).globs).toEqual([
      firstPattern,
      'docs/**',
      'z/**',
    ]);
    expect(parse(`globs: [${firstPattern}, "docs/ #notes/**", z/**]`).globs).toEqual([
      firstPattern,
      'docs/ #notes/**',
      'z/**',
    ]);
  });

  it('keeps brace-alternative quotes out of flow item boundaries', () => {
    const inlineArray = String.raw`globs: [src/{foo,'bar}, "docs/ #notes/**"] # see ]`;
    expect(parse(inlineArray).globs).toEqual(["src/{foo,'bar}", 'docs/ #notes/**']);
  });

  it('keeps a brace-alternative quote from consuming a later glob character class', () => {
    expect(parse(`globs: [src/{foo,'bar}, docs/[']*.md]`).globs).toEqual([
      "src/{foo,'bar}",
      "docs/[']*.md",
    ]);
  });

  it('does not pair braces across doubled apostrophes in quoted items', () => {
    const inlineArray = String.raw`globs: ['a''{', x}, 'docs/ #notes/**'] # both`;
    expect(parse(inlineArray).globs).toEqual(["a''{", 'x}', 'docs/ #notes/**']);
  });

  it('does not start comments after Unicode whitespace inside an unquoted glob', () => {
    const nbsp = '\u00a0';

    expect(parse(`globs: ["src/**", docs/${nbsp}#notes/**] # both patterns`).globs).toEqual([
      'src/**',
      `docs/${nbsp}#notes/**`,
    ]);
  });

  it('opens quoted values after Unicode whitespace padding', () => {
    const nbsp = '\u00a0';

    expect(parse(`globs:${nbsp}"docs/ #notes/**" # scalar`).globs).toBe('docs/ #notes/**');
    expect(
      parse(`globs: ["src/**",${nbsp}"docs/ #notes/**"] # array`).globs,
    ).toEqual(['src/**', 'docs/ #notes/**']);
  });

  it('keeps hashes after escaped quote delimiters and strips outside comments', () => {
    const escapedDoubleQuote = String.raw`docs/\" #notes/**`;
    const escapedSingleQuote = "docs/'' #notes/**";
    const backslashEscapedSingleQuote = String.raw`docs/\' #notes/**`;
    const backslashBeforeDoubledApostrophe = String.raw`docs/\'' #notes/**`;
    const terminalBackslashEscapedApostrophe = String.raw`globs: ['docs/foo\'', 'src/**'] # both`;

    expect(parse(`globs: "${escapedDoubleQuote}" # trailing comment`).globs).toBe(escapedDoubleQuote);
    expect(
      parse(`globs: ["${escapedDoubleQuote}", "src/**"] # trailing comment`).globs,
    ).toEqual([escapedDoubleQuote, 'src/**']);
    expect(parse(`globs: '${escapedSingleQuote}' # trailing comment`).globs).toBe(escapedSingleQuote);
    expect(parse(`globs: ['${escapedSingleQuote}', 'src/**'] # trailing comment`).globs).toEqual([
      escapedSingleQuote,
      'src/**',
    ]);
    expect(parse(`globs: '${backslashEscapedSingleQuote}' # trailing comment`).globs).toBe(
      backslashEscapedSingleQuote,
    );
    expect(
      parse(`globs: ['${backslashEscapedSingleQuote}', 'src/**'] # trailing comment`).globs,
    ).toEqual([backslashEscapedSingleQuote, 'src/**']);
    expect(
      parse(`globs: ['${backslashBeforeDoubledApostrophe}', 'src/**'] # trailing comment`).globs,
    ).toEqual([backslashBeforeDoubledApostrophe, 'src/**']);
    expect(parse(terminalBackslashEscapedApostrophe).globs).toEqual([
      String.raw`docs/foo\'`,
      'src/**',
    ]);
    expect(parse(String.raw`globs: 'docs/foo\'' # don't include`).globs).toBe(
      String.raw`docs/foo\'`,
    );
    expect(parse(String.raw`globs: 'docs/foo\'' # 'legacy'`).globs).toBe(String.raw`docs/foo\'`);
    expect(parse(String.raw`globs: 'docs/foo\'' # users'`).globs).toBe(String.raw`docs/foo\'`);
    expect(parse(String.raw`globs: 'docs/foo\' # docs`).globs).toBe('docs/foo\\');
    expect(parse(String.raw`globs: 'docs/foo\' # users'`).globs).toBe('docs/foo\\');
    expect(parse(`globs:\n  - 'docs/foo\\' # docs`).globs).toEqual(['docs/foo\\']);
  });

  it('parses a large brace-free inline array value', () => {
    const pattern = 'a'.repeat(1024 * 1024);

    expect(parse(`globs: [${pattern}] # x`).globs).toEqual([pattern]);
  });
});

describe('parseRuleFrontmatter unindented block sequences', () => {
  const parseGlobs = (yaml: string) => parseRuleFrontmatter(`---\n${yaml}\n---\nbody`).metadata.globs;

  it('reads list items written at the same indentation as their key', () => {
    expect(parseGlobs('paths:\n- src/**/*.ts\n- "lib/**"')).toEqual(['src/**/*.ts', 'lib/**']);
    expect(parseGlobs('globs:\n- "**/*.py"')).toEqual(['**/*.py']);
  });

  it('stops at the next key after an unindented list', () => {
    const { metadata } = parseRuleFrontmatter('---\npaths:\n- src/**\nalwaysApply: true\n---\nbody');

    expect(metadata.globs).toEqual(['src/**']);
    expect(metadata.alwaysApply).toBe(true);
  });

  it('still reads indented lists and CRLF lists', () => {
    expect(parseGlobs('paths:\n  - src/**')).toEqual(['src/**']);
    expect(parseRuleFrontmatter('---\r\npaths:\r\n- src/**\r\n---\r\nbody').metadata.globs).toEqual(['src/**']);
  });
});
