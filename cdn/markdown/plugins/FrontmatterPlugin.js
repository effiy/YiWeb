/**
 * Frontmatter Plugin
 * Parses YAML frontmatter from markdown
 */

const parseYamlScalar = (raw) => {
  const v = String(raw ?? '').trim();
  if (!v) return '';
  if (v === 'null' || v === '~') return null;
  if (v === 'true') return true;
  if (v === 'false') return false;
  if (/^-?\d+(?:\.\d+)?$/.test(v)) {
    const n = Number(v);
    if (Number.isFinite(n)) return n;
  }
  if (v.startsWith('[') && v.endsWith(']') && v.length >= 2) {
    const inner = v.slice(1, -1).trim();
    if (!inner) return [];
    const parts = [];
    let buf = '';
    let quote = '';
    for (let i = 0; i < inner.length; i += 1) {
      const ch = inner[i];
      if (quote) {
        if (ch === '\\' && i + 1 < inner.length) {
          buf += ch + inner[i + 1];
          i += 1;
          continue;
        }
        if (ch === quote) quote = '';
        buf += ch;
        continue;
      }
      if (ch === '"' || ch === "'") {
        quote = ch;
        buf += ch;
        continue;
      }
      if (ch === ',') {
        parts.push(buf.trim());
        buf = '';
        continue;
      }
      buf += ch;
    }
    if (buf.trim()) parts.push(buf.trim());
    return parts.filter(Boolean).map((p) => parseYamlScalar(p));
  }
  if (
    (v.startsWith('"') && v.endsWith('"') && v.length >= 2) ||
    (v.startsWith("'") && v.endsWith("'") && v.length >= 2)
  ) {
    const inner = v.slice(1, -1);
    return v[0] === '"'
      ? inner.replace(/\\"/g, '"').replace(/\\n/g, '\n').replace(/\\t/g, '\t').replace(/\\r/g, '\r').replace(/\\\\/g, '\\')
      : inner.replace(/\\'/g, "'");
  }
  return v;
};

const parseYamlBlock = (lines, startIndex, indent) => {
  const nextMeaningfulIndex = (from) => {
    for (let j = from; j < lines.length; j += 1) {
      const t = String(lines[j] ?? '');
      if (!t.trim()) continue;
      if (t.trim().startsWith('#')) continue;
      return j;
    }
    return -1;
  };

  const getLine = (idx) => {
    const raw = String(lines[idx] ?? '').replace(/\t/g, '    ');
    const m = raw.match(/^(\s*)(.*)$/);
    const spaces = m ? m[1] : '';
    return { indent: spaces.length, text: (m ? m[2] : raw).trimEnd() };
  };

  const firstIdx = nextMeaningfulIndex(startIndex);
  if (firstIdx < 0) return [null, lines.length];
  const first = getLine(firstIdx);
  if (first.indent < indent) return [null, firstIdx];

  const parseSequence = (i, baseIndent) => {
    const arr = [];
    let idx = i;
    while (idx < lines.length) {
      const nextIdx = nextMeaningfulIndex(idx);
      if (nextIdx < 0) return [arr, lines.length];
      const { indent: li, text } = getLine(nextIdx);
      if (li < baseIndent) return [arr, nextIdx];
      if (li !== baseIndent || !text.trimStart().startsWith('- ')) {
        idx = nextIdx + 1;
        continue;
      }
      const itemText = text.trimStart().slice(2).trim();
      if (!itemText) {
        const [child, after] = parseYamlBlock(lines, nextIdx + 1, baseIndent + 2);
        arr.push(child);
        idx = after;
        continue;
      }
      const colon = itemText.indexOf(':');
      if (colon > 0) {
        const k = itemText.slice(0, colon).trim();
        const rest = itemText.slice(colon + 1).trim();
        const obj = {};
        if (rest) {
          obj[k] = parseYamlScalar(rest);
          arr.push(obj);
          idx = nextIdx + 1;
          continue;
        }
        const [child, after] = parseYamlBlock(lines, nextIdx + 1, baseIndent + 2);
        obj[k] = child;
        arr.push(obj);
        idx = after;
        continue;
      }
      arr.push(parseYamlScalar(itemText));
      idx = nextIdx + 1;
    }
    return [arr, idx];
  };

  const parseMapping = (i, baseIndent) => {
    const obj = {};
    let idx = i;
    while (idx < lines.length) {
      const nextIdx = nextMeaningfulIndex(idx);
      if (nextIdx < 0) return [obj, lines.length];
      const { indent: li, text } = getLine(nextIdx);
      if (li < baseIndent) return [obj, nextIdx];
      if (li !== baseIndent) {
        idx = nextIdx + 1;
        continue;
      }
      const trimmed = text.trimStart();
      if (trimmed.startsWith('- ')) return [obj, nextIdx];
      const colon = trimmed.indexOf(':');
      if (colon <= 0) {
        idx = nextIdx + 1;
        continue;
      }
      const key = trimmed.slice(0, colon).trim();
      const rest = trimmed.slice(colon + 1).trim();
      if (!rest) {
        const peekIdx = nextMeaningfulIndex(nextIdx + 1);
        const nextLine = peekIdx >= 0 ? getLine(peekIdx) : null;
        const wantsArray = !!(nextLine && nextLine.indent >= baseIndent + 2 && nextLine.text.trimStart().startsWith('- '));
        const [child, after] = wantsArray
          ? parseSequence(nextIdx + 1, baseIndent + 2)
          : parseYamlBlock(lines, nextIdx + 1, baseIndent + 2);
        obj[key] = child == null ? (wantsArray ? [] : {}) : child;
        idx = after;
        continue;
      }
      obj[key] = parseYamlScalar(rest);
      idx = nextIdx + 1;
    }
    return [obj, idx];
  };

  return first.text.trimStart().startsWith('- ')
    ? parseSequence(firstIdx, indent)
    : parseMapping(firstIdx, indent);
};

const parseMarkdownFrontmatter = (text) => {
  try {
    const raw = text == null ? '' : String(text);
    if (!raw) return { frontmatter: null, content: '' };

    const normalized = raw.replace(/\r\n/g, '\n').replace(/\r/g, '\n').replace(/^\uFEFF/, '');
    const lines = normalized.split('\n');

    let i = 0;
    while (i < lines.length && !String(lines[i] ?? '').trim()) i += 1;
    if (String(lines[i] ?? '').trim() !== '---') return { frontmatter: null, content: raw };

    let end = -1;
    for (let j = i + 1; j < lines.length; j += 1) {
      const t = String(lines[j] ?? '').trim();
      if (t === '---' || t === '...') {
        end = j;
        break;
      }
    }
    if (end < 0) return { frontmatter: null, content: raw };

    const frontmatterLines = lines.slice(i + 1, end);
    const [frontmatter] = parseYamlBlock(frontmatterLines, 0, 0);
    const content = lines.slice(end + 1).join('\n');

    return { frontmatter: frontmatter ?? null, content };
  } catch (error) {
    const fallbackContent = text == null ? '' : String(text);
    return { frontmatter: null, content: fallbackContent };
  }
};

export const FrontmatterPlugin = {
  name: 'frontmatter',
  version: '1.0.0',
  priority: 50,

  _frontmatter: null,

  onInit() {
    this._frontmatter = null;
  },

  preprocess(markdown) {
    const { frontmatter, content } = parseMarkdownFrontmatter(markdown);
    this._frontmatter = frontmatter;
    return content;
  },

  getFrontmatter() {
    return this._frontmatter;
  }
};
