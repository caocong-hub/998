export type TeachingPathNode = {
  id: string;
  title: string;
  summary: string;
  details: string;
};

const DEFAULT_MAX_NODES = 8;
const MIN_SEGMENT_CHARS = 12;
const MAX_TITLE_LEN = 42;
const MAX_SUMMARY_LEN = 96;
const MAX_DETAILS_LEN = 2000;

function truncate(s: string, maxLen: number, suffix = "…") {
  if (s.length <= maxLen) return s;
  return s.slice(0, Math.max(0, maxLen - suffix.length)) + suffix;
}

/**
 * Deterministic, explainable split of lesson text into knowledge-point-shaped nodes.
 * Replaceable later with LLM or an external parse service.
 */
export function parseTeachingPathFromText(
  raw: string,
  options?: { maxNodes?: number }
): TeachingPathNode[] {
  const maxNodes = options?.maxNodes ?? DEFAULT_MAX_NODES;
  const text = raw.trim().replace(/\r\n/g, "\n");
  if (!text) return [];

  let chunks: string[] = [];

  const paragraphs = text
    .split(/\n\s*\n/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (paragraphs.length >= 2) {
    chunks = paragraphs;
  } else {
    const single = paragraphs[0] ?? text;
    chunks = single
      .split(/(?<=[。！？；])\s*/)
      .map((s) => s.trim())
      .filter((s) => s.length >= MIN_SEGMENT_CHARS);
  }

  chunks = chunks.filter((c) => c.length >= MIN_SEGMENT_CHARS);

  if (chunks.length === 0) {
    chunks = [text];
  }

  chunks = chunks.slice(0, maxNodes);

  return chunks.map((chunk, i) => {
    const firstLine = chunk.split("\n")[0]?.trim() || chunk;
    const firstSentence =
      chunk.split(/[。！？]/)[0]?.trim() || firstLine;

    const title =
      truncate(firstSentence, MAX_TITLE_LEN) || `Knowledge point ${i + 1}`;
    const summary =
      truncate(firstSentence, MAX_SUMMARY_LEN) || title;
    const details =
      chunk.length > MAX_DETAILS_LEN
        ? chunk.slice(0, MAX_DETAILS_LEN - 1) + "…"
        : chunk;

    return {
      id: `kp-${i + 1}`,
      title,
      summary,
      details,
    };
  });
}
