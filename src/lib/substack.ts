/**
 * Fetch and parse The AI Runtime's Substack RSS at build time.
 * Used by /library and /about to auto-surface latest issues without
 * requiring a manual reading-list entry for each new post.
 *
 * Build-time only — runs once per deploy. Soft-fails if the feed is
 * unreachable so a network blip never breaks the build.
 */

export interface SubstackPost {
  title: string;
  url: string;
  publishedAt: Date;
  summary: string;
  author?: string;
}

const FEED_URL = 'https://theairuntime.com/feed';
const FETCH_TIMEOUT_MS = 5000;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'");
}

function extractCData(raw: string): string {
  const m = raw.match(/^<!\[CDATA\[([\s\S]*?)\]\]>$/);
  return m ? m[1] : raw;
}

function pick(item: string, tag: string): string {
  const m = item.match(new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`));
  if (!m) return '';
  return decodeEntities(extractCData(m[1].trim()));
}

function stripHtml(s: string, limit = 220): string {
  const text = s.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  if (text.length <= limit) return text;
  return text.slice(0, limit).replace(/\s+\S*$/, '') + '…';
}

export async function fetchSubstackPosts(limit = 6): Promise<SubstackPost[]> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);

  let xml: string;
  try {
    const res = await fetch(FEED_URL, {
      signal: controller.signal,
      headers: { 'user-agent': 'TheAIRuntime-Site/1.0 (+https://events.theairuntime.com)' },
    });
    if (!res.ok) return [];
    xml = await res.text();
  } catch {
    return [];
  } finally {
    clearTimeout(timeout);
  }

  const items = Array.from(xml.matchAll(/<item>([\s\S]*?)<\/item>/g));
  const posts: SubstackPost[] = items.slice(0, limit).map((m) => {
    const item = m[1];
    return {
      title: pick(item, 'title'),
      url: pick(item, 'link'),
      publishedAt: new Date(pick(item, 'pubDate') || Date.now()),
      summary: stripHtml(pick(item, 'description')),
      author: pick(item, 'dc:creator') || undefined,
    };
  });

  return posts.filter((p) => p.title && p.url);
}
