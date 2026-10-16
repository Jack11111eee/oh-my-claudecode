/**
 * Rules Parser
 *
 * Parses YAML frontmatter from rule files.
 * Supports multiple formats for compatibility.
 *
 * Ported from oh-my-opencode's rules-injector hook.
 */

import type { RuleMetadata, RuleFrontmatterResult } from './types.js';
import { stripLeadingUtf8Bom } from '../../utils/frontmatter.js';

/**
 * Parse YAML frontmatter from rule file content.
 * Supports:
 * - Single string: globs: "**\/*.py"
 * - Inline array: globs: ["**\/*.py", "src/**\/*.ts"]
 * - Multi-line array with dashes
 * - Comma-separated: globs: "**\/*.py, src/**\/*.ts"
 * - Claude Code 'paths' field (alias for globs)
 */
export function parseRuleFrontmatter(content: string): RuleFrontmatterResult {
  const frontmatterRegex = /^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/;
  // A UTF-8 BOM (Windows editors) would otherwise hide the opening `---`.
  const match = stripLeadingUtf8Bom(content).match(frontmatterRegex);

  if (!match) {
    return { metadata: {}, body: content };
  }

  const yamlContent = match[1];
  const body = match[2];

  try {
    const metadata = parseYamlContent(yamlContent);
    return { metadata, body };
  } catch {
    return { metadata: {}, body: content };
  }
}

/**
 * Parse YAML content without external library.
 */
function parseYamlContent(yamlContent: string): RuleMetadata {
  // Split on CRLF or LF so a trailing "\r" from a Windows-authored rule file
  // never leaks into a line and prevents multi-line array items from matching.
  const lines = yamlContent.split(/\r?\n/);
  const metadata: RuleMetadata = {};

  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const colonIndex = line.indexOf(':');

    if (colonIndex === -1) {
      i++;
      continue;
    }

    const key = line.slice(0, colonIndex).trim();
    const rawValue = stripTrailingComment(line.slice(colonIndex + 1));

    if (key === 'description') {
      metadata.description = parseStringValue(rawValue);
    } else if (key === 'alwaysApply') {
      metadata.alwaysApply = rawValue === 'true';
    } else if (key === 'globs' || key === 'paths' || key === 'applyTo') {
      const { value, consumed } = parseArrayOrStringValue(rawValue, lines, i);
      // Merge paths into globs (Claude Code compatibility)
      metadata.globs = mergeGlobs(metadata.globs, value);
      i += consumed;
      continue;
    }

    i++;
  }

  return metadata;
}

function isSingleQuoteEscapeAtItemEnd(
  value: string,
  backslashIndex: number,
  allowTrailingComment = false
): boolean {
  let nextIndex = backslashIndex + 3;
  while (nextIndex < value.length && (value[nextIndex] === ' ' || value[nextIndex] === '\t')) {
    nextIndex++;
  }
  return (
    nextIndex === value.length ||
    value[nextIndex] === ',' ||
    value[nextIndex] === ']' ||
    (allowTrailingComment &&
      nextIndex > backslashIndex + 3 &&
      value[nextIndex] === '#')
  );
}

function isClosingSingleQuoteBeforeComment(value: string, backslashIndex: number): boolean {
  let commentIndex = backslashIndex + 2;
  if (value[commentIndex] !== ' ' && value[commentIndex] !== '\t') return false;
  while (commentIndex < value.length && (value[commentIndex] === ' ' || value[commentIndex] === '\t')) {
    commentIndex++;
  }
  return (
    value[commentIndex] === '#' &&
    (commentIndex + 1 === value.length || value[commentIndex + 1] === ' ' || value[commentIndex + 1] === '\t')
  );
}

interface ParserScanIndex {
  readonly nextNonWhitespace: Int32Array;
  readonly matchingQuoteEnd: Int32Array;
  readonly suffixIsCommentOrPadding?: Uint8Array;
  readonly flowQuoteStarts: Set<number>;
}

/**
 * Index quote matches and genuine flow-item quote starts once. Brace matching
 * uses linear scans and only allocates brace state when braces exist.
 */
function createParserScanIndex(
  value: string,
  suffixIsCommentOrPadding?: Uint8Array,
  flowArrayOpenerIndex = -1
): ParserScanIndex {
  const length = value.length;
  const nextNonWhitespace = new Int32Array(length + 1);
  const matchingQuoteEnd = new Int32Array(length);
  const nextDoubleQuote = new Int32Array(length + 1);
  const nextSingleQuote = new Int32Array(length + 1);
  matchingQuoteEnd.fill(-1);
  nextDoubleQuote.fill(-1);
  nextSingleQuote.fill(-1);
  nextNonWhitespace[length] = length;

  for (let i = length - 1; i >= 0; i--) {
    const char = value[i];
    nextNonWhitespace[i] = /\s/.test(char) ? nextNonWhitespace[i + 1] : i;
    nextDoubleQuote[i] =
      char === '\\' && i + 1 < length
        ? nextDoubleQuote[i + 2]
        : char === '"'
          ? i
          : nextDoubleQuote[i + 1];
    nextSingleQuote[i] =
      char === '\\' && i + 2 < length && value[i + 1] === "'" && value[i + 2] === "'"
        ? isSingleQuoteEscapeAtItemEnd(value, i)
          ? nextSingleQuote[i + 2]
          : nextSingleQuote[i + 1]
        : char === '\\' && i + 1 < length
          ? nextSingleQuote[i + 2]
          : char === "'" && value[i + 1] === "'"
            ? nextSingleQuote[i + 2]
            : char === "'"
              ? i
              : nextSingleQuote[i + 1];

    if (char === '"') matchingQuoteEnd[i] = nextDoubleQuote[i + 1];
    else if (char === "'") matchingQuoteEnd[i] = nextSingleQuote[i + 1];
  }

  const flowQuoteStarts = findFlowQuoteStarts(
    value,
    nextNonWhitespace,
    matchingQuoteEnd,
    suffixIsCommentOrPadding,
    flowArrayOpenerIndex
  );

  return {
    nextNonWhitespace,
    matchingQuoteEnd,
    suffixIsCommentOrPadding,
    flowQuoteStarts,
  };
}

function findFlowQuoteStarts(
  value: string,
  nextNonWhitespace: Int32Array,
  matchingQuoteEnd: Int32Array,
  suffixIsCommentOrPadding?: Uint8Array,
  flowArrayOpenerIndex = -1
): Set<number> {
  const length = value.length;
  const hasBraces = value.includes('{') || value.includes('}');
  const flowQuoteStarts = new Set<number>();
  if (!hasBraces) return flowQuoteStarts;

  const braceClosingByOpening = new Map<number, number>();
  const nextWhitespaceSeparatedHash = new Int32Array(length + 1);
  const braceStack: number[] = [];
  let canStartQuote = true;

  nextWhitespaceSeparatedHash[length] = length;
  for (let i = length - 1; i >= 0; i--) {
    nextWhitespaceSeparatedHash[i] =
      value[i] === '#' && (value[i - 1] === ' ' || value[i - 1] === '\t')
        ? i
        : nextWhitespaceSeparatedHash[i + 1];
  }

  // First pair braces while honoring unambiguous quotes at YAML item boundaries.
  // Quotes inside a brace glob are deliberately treated as literal punctuation.
  for (let i = 0; i < length; i++) {
    const char = value[i];
    if (char === ']' && suffixIsCommentOrPadding?.[i + 1]) break;
    if (i === flowArrayOpenerIndex) {
      canStartQuote = true;
      continue;
    }
    if (
      canStartQuote &&
      braceStack.length === 0 &&
      (char === '"' || char === "'")
    ) {
      const quoteEndIndex = matchingQuoteEnd[i];
      if (
        quoteEndIndex >= 0 &&
        hasFlowItemBoundaryAfterQuote(
          value,
          quoteEndIndex,
          nextNonWhitespace,
          suffixIsCommentOrPadding
        )
      ) {
        flowQuoteStarts.add(i);
        i = quoteEndIndex;
        canStartQuote = false;
        continue;
      }
    }

    if (char === '\\' && i + 1 < length) {
      i++;
      canStartQuote = false;
    } else if (char === '{') {
      braceStack.push(i);
      canStartQuote = false;
    } else if (char === '}' && braceStack.length > 0) {
      const openingIndex = braceStack.pop()!;
      braceClosingByOpening.set(openingIndex, i);
      canStartQuote = false;
    } else if (char === ',' && braceStack.length === 0) {
      canStartQuote = true;
    } else if (!/\s/.test(char)) {
      canStartQuote = false;
    }
  }

  // Recover quoted YAML items after unmatched brace openers. A raw closer in a
  // candidate quote means the quote is literal inside a balanced brace group;
  // an embedded whitespace-separated hash still permits recovery because it
  // would otherwise be consumed as a YAML comment.
  braceStack.length = 0;
  for (let i = 0; i < length; i++) {
    const char = value[i];
    if (char === ']' && suffixIsCommentOrPadding?.[i + 1]) break;
    if (flowQuoteStarts.has(i)) {
      const quoteEndIndex = matchingQuoteEnd[i];
      if (quoteEndIndex >= i) i = quoteEndIndex;
      continue;
    }
    if (char === '\\' && i + 1 < length) {
      i++;
    } else if (char === '{') {
      braceStack.push(i);
    } else if (char === '}' && braceStack.length > 0) {
      braceStack.pop();
    } else if (char === ',' && braceStack.length > 0) {
      const quoteIndex = nextNonWhitespace[i + 1];
      const quoteChar = value[quoteIndex];
      const quoteEndIndex = matchingQuoteEnd[quoteIndex];
      if (
        (quoteChar === '"' || quoteChar === "'") &&
        quoteEndIndex >= 0 &&
        hasFlowItemBoundaryAfterQuote(
          value,
          quoteEndIndex,
          nextNonWhitespace,
          suffixIsCommentOrPadding
        )
      ) {
        const openingIndex = braceStack[braceStack.length - 1];
        const closingIndex = braceClosingByOpening.get(openingIndex);
        const closerIsInsideQuote = closingIndex !== undefined && closingIndex <= quoteEndIndex;
        const hashIndex = nextWhitespaceSeparatedHash[quoteIndex + 1];
        if (
          closingIndex === undefined ||
          (closerIsInsideQuote && hashIndex < quoteEndIndex)
        ) {
          flowQuoteStarts.add(quoteIndex);
          braceStack.length = 0;
        }
      }
    }
  }

  return flowQuoteStarts;
}

function hasFlowItemBoundaryAfterQuote(
  value: string,
  quoteEndIndex: number,
  nextNonWhitespace: Int32Array,
  suffixIsCommentOrPadding?: Uint8Array
): boolean {
  const boundaryIndex = nextNonWhitespace[quoteEndIndex + 1];
  const isArrayClosingBracket =
    value[boundaryIndex] === ']' && suffixIsCommentOrPadding?.[boundaryIndex + 1] === 1;
  return boundaryIndex === value.length || value[boundaryIndex] === ',' || isArrayClosingBracket;
}

function findQuotedFlowItemEndAfterComma(
  value: string,
  commaIndex: number,
  scanIndex: ParserScanIndex
): number {
  const quoteIndex = scanIndex.nextNonWhitespace[commaIndex + 1];
  const closingQuoteIndex = scanIndex.matchingQuoteEnd[quoteIndex] ?? -1;
  return scanIndex.flowQuoteStarts.has(quoteIndex) &&
    closingQuoteIndex >= 0 &&
    hasFlowItemBoundaryAfterQuote(
      value,
      closingQuoteIndex,
      scanIndex.nextNonWhitespace,
      scanIndex.suffixIsCommentOrPadding
    )
    ? closingQuoteIndex
    : -1;
}

function isFlowItemBoundaryAtComma(
  value: string,
  commaIndex: number,
  braceStack: number[],
  scanIndex: ParserScanIndex
): boolean {
  if (braceStack.length === 0) return true;
  const quoteEndIndex = findQuotedFlowItemEndAfterComma(value, commaIndex, scanIndex);
  if (quoteEndIndex === -1) return false;
  braceStack.length = 0;
  return true;
}

function findFlowArrayClosingIndex(value: string, openerIndex: number): number {
  const suffixIsCommentOrPadding = new Uint8Array(value.length + 1);
  suffixIsCommentOrPadding[value.length] = 1;
  for (let i = value.length - 1; i >= 0; i--) {
    const char = value[i];
    suffixIsCommentOrPadding[i] =
      char === ' ' || char === '\t'
        ? suffixIsCommentOrPadding[i + 1]
        : char === '#' && (i === 0 || value[i - 1] === ' ' || value[i - 1] === '\t')
          ? 1
          : 0;
  }

  let scanIndex: ParserScanIndex | undefined;
  let quoteChar = '';
  let canStartQuote = true;
  const braceStack: number[] = [];
  for (let i = openerIndex + 1; i < value.length; i++) {
    const char = value[i];
    if (quoteChar) {
      if (quoteChar === "'" && char === '\\' && value[i + 1] === "'" && value[i + 2] === "'") {
        if (isSingleQuoteEscapeAtItemEnd(value, i)) i++;
        canStartQuote = false;
      } else if (char === '\\' && i + 1 < value.length) i++;
      else if (char === "'" && quoteChar === "'" && value[i + 1] === "'") i++;
      else if (char === quoteChar) {
        quoteChar = '';
        canStartQuote = false;
      }
    } else if ((char === '"' || char === "'") && canStartQuote) {
      quoteChar = char;
    } else if (char === '\\' && i + 1 < value.length) {
      i++;
      canStartQuote = false;
    } else if (char === '{') {
      braceStack.push(i);
      canStartQuote = false;
    } else if (char === '}' && braceStack.length > 0) {
      braceStack.pop();
      canStartQuote = false;
    } else if (char === ']' && suffixIsCommentOrPadding[i + 1]) {
      return i;
    } else if (char === ',' && braceStack.length === 0) {
      canStartQuote = true;
    } else if (char === ',' && braceStack.length > 0) {
      scanIndex ??= createParserScanIndex(value, suffixIsCommentOrPadding, openerIndex);
      canStartQuote = isFlowItemBoundaryAtComma(value, i, braceStack, scanIndex);
    } else if (!/\s/.test(char)) {
      canStartQuote = false;
    }
  }
  return -1;
}

/**
 * Trim a YAML value and drop a trailing ` # comment`. A `#` only starts a
 * comment at the start of the value or after a YAML space/tab, never inside quotes.
 */
function stripTrailingComment(value: string): string {
  const flowArrayOpenerIndex = value.search(/\S/);
  const isFlowArray = flowArrayOpenerIndex >= 0 && value[flowArrayOpenerIndex] === '[';
  const flowArrayContentStartIndex = isFlowArray ? flowArrayOpenerIndex + 1 : 0;
  const flowArrayClosingIndex = isFlowArray
    ? findFlowArrayClosingIndex(value, flowArrayOpenerIndex)
    : -1;
  const flowArrayContent =
    isFlowArray && flowArrayClosingIndex >= flowArrayContentStartIndex
      ? value.slice(flowArrayContentStartIndex, flowArrayClosingIndex)
      : '';
  const balancedBraceIndices = isFlowArray
    ? findBalancedBraceIndices(flowArrayContent, true)
    : null;
  let quoteChar = '';
  let canStartQuote = true;
  let braceDepth = 0;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (quoteChar) {
      if (
        quoteChar === "'" &&
        char === '\\' &&
        value[i + 1] === "'" &&
        value[i + 2] !== "'" &&
        !isFlowArray &&
        isClosingSingleQuoteBeforeComment(value, i)
      ) {
        quoteChar = '';
        i++;
        canStartQuote = false;
      } else if (quoteChar === "'" && char === '\\' && value[i + 1] === "'" && value[i + 2] === "'") {
        if (isSingleQuoteEscapeAtItemEnd(value, i, !isFlowArray)) i++;
        canStartQuote = false;
      } else if (char === '\\' && i + 1 < value.length) i++;
      else if (char === "'" && quoteChar === "'" && value[i + 1] === "'") i++;
      else if (char === quoteChar) {
        quoteChar = '';
        canStartQuote = false;
      }
    } else if ((char === '"' || char === "'") && canStartQuote) {
      quoteChar = char;
    } else if (char === '\\' && i + 1 < value.length) {
      i++;
      canStartQuote = false;
    } else if (
      char === '#' &&
      (i === 0 || value[i - 1] === ' ' || value[i - 1] === '\t')
    ) {
      return value.slice(0, i).trim();
    } else {
      const braceIndex = i - flowArrayContentStartIndex;
      if (isFlowArray && i === flowArrayOpenerIndex) {
        canStartQuote = true;
      } else if (balancedBraceIndices?.openings.has(braceIndex)) {
        braceDepth++;
        canStartQuote = false;
      } else if (balancedBraceIndices?.closings.has(braceIndex)) {
        braceDepth--;
        canStartQuote = false;
      } else if (char === ',' && isFlowArray && braceDepth === 0) {
        canStartQuote = true;
      } else if (!/\s/.test(char)) {
        canStartQuote = false;
      }
    }
  }
  return value.trim();
}

/**
 * Parse a string value, removing surrounding quotes.
 */
function parseStringValue(value: string): string {
  if (!value) return '';

  // Remove surrounding quotes
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1);
  }

  return value;
}

/**
 * Parse array or string value from YAML.
 * Returns the parsed value and number of lines consumed.
 */
function parseArrayOrStringValue(
  rawValue: string,
  lines: string[],
  currentIndex: number
): { value: string | string[]; consumed: number } {
  // Case 1: Inline array ["a", "b", "c"]
  if (rawValue.startsWith('[')) {
    return { value: parseInlineArray(rawValue), consumed: 1 };
  }

  // Case 2: Multi-line array (value is empty, next lines start with a dash)
  if (!rawValue || rawValue === '') {
    const arrayItems: string[] = [];
    let consumed = 1;

    for (let j = currentIndex + 1; j < lines.length; j++) {
      const nextLine = lines[j];

      // Check whether this line starts with a YAML sequence marker.
      const arrayMatch = nextLine.match(/^\s*-\s*(.*)$/);
      if (arrayMatch) {
        const itemValue = parseStringValue(stripTrailingComment(arrayMatch[1]));
        if (itemValue) {
          arrayItems.push(itemValue);
        }
        consumed++;
      } else if (nextLine.trim() === '') {
        // Skip empty lines within array
        consumed++;
      } else {
        // Not an array item, stop
        break;
      }
    }

    if (arrayItems.length > 0) {
      return { value: arrayItems, consumed };
    }
  }

  // Case 3: Comma-separated patterns in single string
  const stringValue = parseStringValue(rawValue);
  if (stringValue.includes(',')) {
    const items = splitOutsideBraces(stringValue)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return { value: items, consumed: 1 };
  }

  // Case 4: Single string value
  return { value: stringValue, consumed: 1 };
}

/**
 * Split on commas that are not inside a `{...}` brace group, so a glob such as
 * `src/**\/*.{ts,tsx}` stays one pattern while `a/*.ts, b/*.ts` still splits.
 */
function splitOutsideBraces(value: string, respectQuotes = false): string[] {
  const { openings, closings } = findBalancedBraceIndices(value, respectQuotes);
  const items: string[] = [];
  let current = '';
  let depth = 0;
  let quoteChar = '';
  // Inline-array quotes only start at item boundaries; apostrophes in plain globs are literal.
  let canStartQuote = true;
  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (respectQuotes && quoteChar) {
      if (quoteChar === "'" && char === '\\' && value[i + 1] === "'" && value[i + 2] === "'") {
        current += char;
        if (isSingleQuoteEscapeAtItemEnd(value, i)) current += value[++i];
        continue;
      }
      if (char === '\\' && i + 1 < value.length) {
        current += char + value[++i];
        continue;
      }
      current += char;
      if (quoteChar === "'" && char === "'" && value[i + 1] === "'") {
        current += value[++i];
      } else if (char === quoteChar) {
        quoteChar = '';
        canStartQuote = false;
      }
      continue;
    }
    if (char === '\\' && i + 1 < value.length) {
      current += char + value[++i];
      if (!quoteChar) canStartQuote = false;
      continue;
    }
    if (respectQuotes && canStartQuote && (char === '"' || char === "'")) {
      quoteChar = char;
      current += char;
      continue;
    }
    if (openings.has(i)) {
      depth++;
      canStartQuote = false;
    } else if (closings.has(i)) {
      depth--;
      canStartQuote = false;
    }
    if (char === ',' && depth === 0) {
      items.push(current);
      current = '';
      canStartQuote = true;
    } else {
      current += char;
      if (!/\s/.test(char)) canStartQuote = false;
    }
  }
  items.push(current);
  return items;
}

/** Find only balanced, unescaped brace pairs, ignoring brace characters in quotes. */
function findBalancedBraceIndices(
  value: string,
  respectQuotes: boolean
): { openings: Set<number>; closings: Set<number> } {
  const openings = new Set<number>();
  const closings = new Set<number>();
  const stack: number[] = [];
  let scanIndex: ParserScanIndex | undefined;
  let quoteChar = '';
  let canStartQuote = true;

  for (let i = 0; i < value.length; i++) {
    const char = value[i];
    if (respectQuotes && quoteChar) {
      if (quoteChar === "'" && char === '\\' && value[i + 1] === "'" && value[i + 2] === "'") {
        if (isSingleQuoteEscapeAtItemEnd(value, i)) i++;
        canStartQuote = false;
      } else if (char === '\\' && i + 1 < value.length) {
        i++;
      } else if (quoteChar === "'" && char === "'" && value[i + 1] === "'") {
        i++;
      } else if (char === quoteChar) {
        quoteChar = '';
        canStartQuote = false;
      }
      continue;
    }
    if (char === '\\' && i + 1 < value.length) {
      i++;
      if (!quoteChar) canStartQuote = false;
      continue;
    }
    if (respectQuotes && canStartQuote && (char === '"' || char === "'")) {
      quoteChar = char;
    } else if (char === '{') {
      stack.push(i);
      canStartQuote = false;
    } else if (char === '}' && stack.length > 0) {
      openings.add(stack.pop()!);
      closings.add(i);
      canStartQuote = false;
    } else if (char === ',' && stack.length === 0) {
      canStartQuote = true;
    } else if (char === ',' && respectQuotes && stack.length > 0) {
      scanIndex ??= createParserScanIndex(value);
      canStartQuote = isFlowItemBoundaryAtComma(value, i, stack, scanIndex);
    } else if (!/\s/.test(char)) {
      canStartQuote = false;
    }
  }
  return { openings, closings };
}

/**
 * Parse inline JSON-like array: ["a", "b", "c"]
 */
function parseInlineArray(value: string): string[] {
  const endIdx = value.lastIndexOf(']');
  if (endIdx === -1) return [];
  const content = value.slice(1, endIdx).trim();
  if (!content) return [];

  return splitOutsideBraces(content, true)
    .map((item) => item.trim())
    .filter((item) => item.length > 0)
    .map(parseStringValue);
}

/**
 * Merge two globs values (for combining paths and globs).
 */
function mergeGlobs(
  existing: string | string[] | undefined,
  newValue: string | string[]
): string | string[] {
  if (!existing) return newValue;

  const existingArray = Array.isArray(existing) ? existing : [existing];
  const newArray = Array.isArray(newValue) ? newValue : [newValue];

  return [...existingArray, ...newArray];
}
