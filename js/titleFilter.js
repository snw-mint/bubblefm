const FUTILE_TAG_REGEX =
  /\b(soundtrack|ost|motion picture|score|remaster(?:ed)?|deluxe|expanded|anniversary|edition|version|ver\.|edit|mix|remix|bonus|explicit|clean|live|acoustic|instrumental|karaoke|demo|session|radio|single|album|extended|mono|stereo|feat\.?|ft\.?|with|from|prod\.?|official|audio|video|lp|ep|special|reissue|vault)\b|\b(?:19|20)\d{2}\b|\b(?:7|10|12)\s*["'′″]/i;

const TRAILING_DASH_TAG_REGEX =
  /\s*[-–—:]\s*(?:from\b.*|(?:original\s+)?(?:motion\s+picture\s+)?soundtrack.*|(?:(?:19|20)\d{2}\s+)?remaster(?:ed)?.*|(?:7|10|12)\s*["'′″].*|(?:single|album|radio|extended|acoustic|live|demo|instrumental|mono|stereo|explicit|clean|deluxe|expanded|anniversary|bonus|special)\b.*)$/i;

const MAX_TITLE_LENGTH = 50;

export function cleanTitle(str) {
  if (!str) return "";
  const original = String(str).replace(/\s+/g, " ").trim();

  let cleaned = original.replace(/\s*[\(\[]([^)\]]*)[\)\]]/g, (match, inner, offset) => {
    if (offset === 0 && !FUTILE_TAG_REGEX.test(inner)) {
      return match;
    }
    return "";
  });

  cleaned = cleaned.replace(/\s*[\(\[][^)\]]*$/, "");
  cleaned = cleaned.replace(TRAILING_DASH_TAG_REGEX, "");
  cleaned = cleaned.replace(/\s+/g, " ").trim();

  const result = cleaned || original;
  if (result.length > MAX_TITLE_LENGTH) {
    const sliced = result.slice(0, MAX_TITLE_LENGTH - 3);
    const lastSpace = sliced.lastIndexOf(" ");
    const trimmed = lastSpace > 20 ? sliced.slice(0, lastSpace) : sliced;
    return trimmed.trimEnd() + "...";
  }

  return result;
}
