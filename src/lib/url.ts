/**
 * URL normalization for the one-listing-per-URL rule.
 * Strips protocol, www, query strings, fragments, trailing slashes;
 * lowercases host. "https://Example.com/x/" === "example.com/x".
 */
export function normalizeUrl(input: string): string {
  let s = input.trim().toLowerCase();
  if (!s) return "";
  s = s.replace(/^[a-z][a-z0-9+.-]*:\/\//, ""); // protocol
  s = s.replace(/^www\./, "");
  s = s.split("#")[0].split("?")[0];
  while (s.endsWith("/")) s = s.slice(0, -1);
  if (!s.includes(".")) return ""; // no TLD => not a valid site URL
  return s;
}

export function isValidNormalizedUrl(n: string): boolean {
  // normalized form: host(. with tld) + optional path, total length cap
  const re = /^[a-z0-9-]+(\.[a-z0-9-]+)+(:\d+)?(\/[^\s]*)?$/;
  return n.length > 0 && n.length <= 2048 && re.test(n);
}
