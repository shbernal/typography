// Builds the findings-gate corpora from frozen lists of document URLs.
//
// The corpora themselves are third-party published text and are not this repo's
// to redistribute, so `gates/corpora/` is ignored. What is committed is the URL
// list, this fetcher, and the resulting counts. That is deliberate: a gate whose
// corpus cannot be rebuilt is a number nobody can check. With the list frozen,
// anyone can run this and see whether they get the same fingerprint.
//
// The extraction is the load-bearing part. This package's entire subject is
// characters that are invisible on screen, so the reader must not normalise,
// drop or invent a single one: no whitespace collapsing beyond ASCII space and
// tab, no Unicode normalisation, no half-decoded entity. Block-level tags become
// newlines, because stripping them silently would weld two words together and
// manufacture a finding the publisher never wrote.
//
//   node scripts/fetch-corpus.ts                 # every corpus that has a list
//   node scripts/fetch-corpus.ts --only aepd-faq-es
//   node scripts/fetch-corpus.ts --refresh       # re-fetch what is already there

import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(REPO, 'gates', 'corpora.json');

const USER_AGENT =
  'shbernal-typography-corpus/0.1 (release gate; +https://github.com/shbernal/typography)';

/** Milliseconds between requests to one host. Politeness, not performance. */
const DELAY = 400;

/** How many times to re-ask after a transient refusal, and how long to wait
 * before each. Growing, because the thing being waited out is a rate limiter.
 *
 * This is not defensive programming for its own sake. The first scheduled run of
 * the corpus workflow got 17 `503 Service Unavailable` responses out of 116 from
 * one publisher, purely for asking 116 times in a row from a data centre. Every
 * URL was live and the list had not rotted. */
const RETRY_DELAYS = [2_000, 8_000, 20_000];

/** Statuses worth asking again about. A 404 is an answer and re-asking is rude;
 * a 429 or a 5xx is the server saying "not now". */
function transient(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

interface FetchSpec {
  readonly urls: string;
  readonly format: 'html' | 'xml' | 'wp-json';
  readonly region?: string;
}

interface CorpusSpec {
  readonly id: string;
  readonly lang: string;
  readonly fetch?: FetchSpec;
}

// --- HTML and XML to text -------------------------------------------------

/** Elements after which a newline has to appear, or two words weld together and
 * manufacture a finding the publisher never wrote.
 *
 * The tail of the list is not HTML. `texto` and `parrafo` are the Boletín
 * Oficial del Estado's, and everything from `para` on is DocBook, taken from the
 * element inventory of the one DocBook source here rather than from the schema:
 * the BSI Kompendium is served from a version-pinned URL, so its inventory is
 * fixed and a longer list would be guesswork. `emphasis` and `link` are
 * deliberately absent, being inline.
 *
 * Adding the DocBook names does not disturb the HTML corpora. Most are not HTML
 * elements at all; `title` only ever occurs inside `<head>`, which is stripped
 * whole; and `thead`, `tbody` and `colgroup` wrap `tr`, which is already here, so
 * the extra newline lands next to one that already existed and the empty line
 * between them is dropped below. */
const BLOCK =
  /<\/?(?:p|div|br|li|ul|ol|tr|td|th|table|h[1-6]|section|article|header|footer|nav|blockquote|dd|dt|dl|figure|figcaption|main|aside|hr|form|option|select|button|label|texto|parrafo|para|simpara|title|listitem|itemizedlist|orderedlist|chapter|book|info|index|informaltable|colgroup|thead|tbody)\b[^>]*>/gi;

/** Named entities that appear in the sources we read. Numeric ones are general. */
const NAMED: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
  laquo: '«',
  raquo: '»',
  lsquo: '‘',
  rsquo: '’',
  ldquo: '“',
  rdquo: '”',
  bdquo: '„',
  sbquo: '‚',
  ndash: '–',
  // Built rather than pasted: this repo forbids the literal character, and a
  // corpus reader that dropped it would be editing the evidence.
  mdash: String.fromCharCode(0x2014),
  hellip: '…',
  iquest: '¿',
  iexcl: '¡',
  szlig: 'ß',
  shy: '­',
  thinsp: ' ',
  ensp: ' ',
  emsp: ' ',
  deg: '°',
  euro: '€',
  middot: '·',
  bull: '•',
  copy: '©',
  reg: '®',
  trade: '™',
  times: '×',
  sect: '§',
  para: '¶',
};

function decodeEntities(value: string): string {
  return value.replace(/&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g, (whole, body: string) => {
    if (body.startsWith('#')) {
      const code =
        body[1] === 'x' || body[1] === 'X'
          ? Number.parseInt(body.slice(2), 16)
          : Number.parseInt(body.slice(1), 10);
      return Number.isFinite(code) && code > 0 && code <= 0x10ffff
        ? String.fromCodePoint(code)
        : whole;
    }
    return NAMED[body] ?? whole;
  });
}

export function toText(markup: string, region?: RegExp): string {
  let value = markup.replace(/\r\n?/g, '\n');
  value = value.replace(/<!--[\s\S]*?-->/g, '');
  value = value.replace(/<(script|style|noscript|svg|head)\b[^>]*>[\s\S]*?<\/\1>/gi, '');

  if (region) {
    const kept = [...value.matchAll(region)].map((match) => match[1]).filter(Boolean);
    if (!kept.length) return '';
    value = kept.join('\n\n');
  }

  value = value.replace(BLOCK, '\n');
  value = value.replace(/<[^>]+>/g, '');
  value = decodeEntities(value);

  // Only the ASCII space and tab collapse. U+00A0, U+202F and U+2009 are the
  // subject under test and are left exactly as the publisher set them.
  value = value.replace(/[ \t]+/g, ' ');
  return `${value
    .split('\n')
    .map((line) => line.replace(/^ +| +$/g, ''))
    .filter((line) => line.length > 0)
    .join('\n')}\n`;
}

// --- fetching -------------------------------------------------------------

const sleep = (ms: number): Promise<void> => new Promise((done) => setTimeout(done, ms));

async function get(url: string): Promise<string> {
  // Retries a refusal that says "not now" and nothing else. A 404 throws on the
  // first attempt, because that is the answer this script exists to surface: the
  // URL list has rotted and somebody has to go and look.
  for (let attempt = 0; ; attempt++) {
    let response: Response;
    try {
      response = await fetch(url, { headers: { 'user-agent': USER_AGENT } });
    } catch (error) {
      // A socket that never opened is the same kind of event as a 503.
      if (attempt >= RETRY_DELAYS.length) throw error;
      await sleep(RETRY_DELAYS[attempt]!);
      continue;
    }
    if (response.ok) return response.text();
    if (!transient(response.status) || attempt >= RETRY_DELAYS.length)
      throw new Error(`${response.status} ${response.statusText} for ${url}`);
    console.error(
      `  ${response.status} ${response.statusText}, retrying in ${RETRY_DELAYS[attempt]! / 1000}s: ${url}`,
    );
    await sleep(RETRY_DELAYS[attempt]!);
  }
}

function readUrls(file: string): string[] {
  return readFileSync(file, 'utf8')
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 0 && !line.startsWith('#'));
}

/** A stable, readable file name for a document, derived from its URL. */
function nameFor(url: string, index: number): string {
  const tail = url
    .replace(/^https?:\/\//, '')
    .replace(/[?#].*$/, '')
    .split('/')
    .filter(Boolean)
    .slice(-2)
    .join('-')
    .replace(/[^A-Za-z0-9._-]/g, '-')
    .slice(-60);
  return `${String(index).padStart(4, '0')}-${tail || 'document'}.txt`;
}

async function fetchCorpus(spec: CorpusSpec, refresh: boolean): Promise<void> {
  if (!spec.fetch) return;
  const dir = join(REPO, 'gates', 'corpora', spec.id);
  if (existsSync(dir) && !refresh) {
    console.log(`${spec.id}: already present, skipping (--refresh to re-fetch)`);
    return;
  }
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const region = spec.fetch.region ? new RegExp(spec.fetch.region, 'g') : undefined;
  const urls = readUrls(join(REPO, spec.fetch.urls));
  let written = 0;
  let characters = 0;
  let empty = 0;
  let failed = 0;

  for (const [at, url] of urls.entries()) {
    let body: string;
    try {
      body = await get(url);
    } catch (error) {
      // Counted, not just logged. A document that does not arrive makes the
      // corpus smaller than the list it was built from, and a rebuild that
      // returns 10% less text and exits 0 is worse than one that fails: the
      // corpus looks fine, the fingerprint moves, and the obvious next move is
      // to re-baseline the gate against text that was never missing.
      console.error(`  ${spec.id}: ${(error as Error).message}`);
      failed++;
      await sleep(DELAY);
      continue;
    }

    const documents: { name: string; markup: string }[] = [];
    if (spec.fetch.format === 'wp-json') {
      // WordPress serves this API with a byte order mark, which JSON.parse
      // rejects.
      const posts = JSON.parse(body.replace(/^﻿/, '')) as {
        id: number;
        content: { rendered: string };
      }[];
      for (const post of posts)
        documents.push({ name: `${String(post.id)}.txt`, markup: post.content.rendered });
    } else {
      documents.push({ name: nameFor(url, at), markup: body });
    }

    for (const document of documents) {
      const text = toText(document.markup, region);
      // An empty extraction means the region selector missed, and a corpus
      // quietly short of the documents it claims is the failure this counts.
      if (text.trim().length === 0) {
        empty++;
        continue;
      }
      writeFileSync(join(dir, document.name), text, 'utf8');
      written++;
      characters += text.length;
    }
    await sleep(DELAY);
  }

  console.log(
    `${spec.id}: ${written} documents, ${characters} characters` +
      (empty ? `, ${empty} empty extraction(s)` : '') +
      (failed ? `, ${failed} document(s) that did not arrive` : ''),
  );
  if (empty || failed) {
    if (failed)
      console.error(
        `  ${spec.id} is short ${failed} of the ${urls.length} documents its list names. ` +
          'Do not re-baseline the gate from this build.',
      );
    process.exitCode = 1;
  }
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const refresh = args.includes('--refresh');
  const onlyArg = args[args.indexOf('--only') + 1];
  const only = args.includes('--only') ? onlyArg : undefined;

  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { corpora: CorpusSpec[] };
  const wanted = manifest.corpora.filter(
    (spec) => spec.fetch !== undefined && (!only || spec.id === only),
  );
  if (!wanted.length) {
    console.error(only ? `no fetchable corpus named ${only}` : 'no fetchable corpora');
    process.exitCode = 2;
    return;
  }

  for (const spec of wanted) await fetchCorpus(spec, refresh);
}

await main();
