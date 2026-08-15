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
// A frozen URL list freezes which documents a corpus contains and says nothing
// about what they say, so this also enforces `gates/documents-<id>.json`: every
// document is checked against a committed length and hash, and a build that
// disagrees fails naming the file. Writing those records is the separate,
// deliberate act of `--rebaseline`, never a side effect of fetching.
//
//   node scripts/fetch-corpus.ts                 # every corpus that has a list
//   node scripts/fetch-corpus.ts --only aepd-faq-es
//   node scripts/fetch-corpus.ts --refresh       # re-fetch what is already there
//   node scripts/fetch-corpus.ts --rebaseline    # accept the delta, rewrite the pins
//
// Exit codes: 1 the build came back short, 3 a document no longer matches its
// pin, 2 the arguments named no corpus.

import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const REPO = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const MANIFEST = join(REPO, 'gates', 'corpora.json');

const USER_AGENT =
  'shbernal-typography-corpus/0.1 (release gate; +https://github.com/shbernal/typography)';

/** Milliseconds between requests. Every request, not every request to a given
 * host: corpora are fetched one after another and each one draws from a single
 * publisher, so consecutive requests share a host except at the seven corpus
 * boundaries, and keying this by hostname would buy about ten seconds across the
 * whole run in exchange for carrying the state to do it.
 *
 * Politeness, not performance, and the number is set by the least tolerant
 * publisher rather than by what the rest would put up with. 400 was too fast for
 * one of them: at that rate the AEPD refused 17 of 116 requests from a GitHub
 * runner, and with retries it still refused 7. A monthly job has no deadline, so
 * spending six minutes waiting across the 241 documents costs nothing, and asking
 * a data protection authority for 116 pages in 46 seconds costs goodwill this
 * repo is spending on somebody else's servers. */
const DELAY = 1_500;

/** How many times to re-ask after a transient refusal, and how long to wait
 * before each. Growing, because the thing being waited out is a rate limiter.
 *
 * This is not defensive programming for its own sake. The first run of the corpus
 * workflow got 17 `503 Service Unavailable` responses out of 116 from one
 * publisher, purely for asking 116 times in a row from a data centre. Every URL
 * was live and the list had not rotted. Three retries recovered 10 of the 17,
 * which is why the ladder now runs to 90 seconds and why `DELAY` went up: a
 * retry ladder treats the symptom, and the request rate is the cause. */
const RETRY_DELAYS = [2_000, 8_000, 20_000, 45_000, 90_000];

/** Statuses worth asking again about. A 404 is an answer and re-asking is rude;
 * a 429 or a 5xx is the server saying "not now". */
function transient(status: number): boolean {
  return status === 408 || status === 429 || status >= 500;
}

interface FetchSpec {
  readonly urls: string;
  readonly format: 'html' | 'xml' | 'wp-json';
  readonly region?: string;
  readonly drop?: string;
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

export function toText(markup: string, region?: RegExp, drop?: RegExp): string {
  let value = markup.replace(/\r\n?/g, '\n');
  value = value.replace(/<!--[\s\S]*?-->/g, '');
  value = value.replace(/<(script|style|noscript|svg|head)\b[^>]*>[\s\S]*?<\/\1>/gi, '');

  if (region) {
    const kept = [...value.matchAll(region)].map((match) => match[1]).filter(Boolean);
    if (!kept.length) return '';
    value = kept.join('\n\n');
  }

  // `region` says where the article is. `drop` says which parts of it the
  // newsroom's template wrote rather than the author, and it runs second because
  // what it removes is inside what `region` kept.
  //
  // This is a sharp tool and the only thing keeping it honest is that it must be
  // narrow. A corpus of professionally typeset text is only evidence for as long
  // as nobody is choosing which sentences it contains, and a `drop` wide enough
  // to catch prose would let a finding be removed instead of explained. So the
  // patterns here are written to match a specific piece of furniture and to stop
  // matching entirely if it changes, rather than to match approximately: when a
  // publisher restyles the thing, the block comes back, the fingerprint moves and
  // `gate-findings.ts --verify` fails with a human reading the delta. Silently
  // dropping more is the failure this cannot be allowed to have; dropping less is
  // merely loud.
  //
  // A newline, not an empty string, for the same reason `BLOCK` becomes one:
  // splicing the two sides together would weld the last word before the block to
  // the first word after it and manufacture a finding nobody wrote.
  if (drop) value = value.replace(drop, '\n');

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

/** The readable part of a document's name: the last two path segments of its
 * URL, flattened to characters a filesystem will not argue about. */
function tailOf(url: string): string {
  return (
    url
      .replace(/^https?:\/\//, '')
      .replace(/[?#].*$/, '')
      .split('/')
      .filter(Boolean)
      .slice(-2)
      .join('-')
      .replace(/[^A-Za-z0-9._-]/g, '-')
      .slice(-60) || 'document'
  );
}

/** A stable file name for every document in a list, derived from its URL and
 * from nothing else.
 *
 * These used to carry the document's zero-padded index in the URL list, which
 * made a name a statement about where the URL sat rather than about which
 * document it was. Removing one URL therefore renumbered every document after
 * it, so deleting a page a publisher had withdrawn - one line in one list -
 * arrived as a rewrite of most of a manifest, and the real change was somewhere
 * inside it. The publisher's own stable id is usually already in the tail
 * (`newnsb-m5dXtFD2sVP_nBvBol-Tm`), and the `wp-json` branch below has never
 * used a prefix at all, naming by post id.
 *
 * What the index also did, by accident, was separate two URLs whose last two
 * segments coincide. That is done here explicitly instead, and every colliding
 * URL takes the suffix rather than the second and subsequent ones: a name then
 * depends on the *set* of URLs and not on the order they appear in, which is the
 * property the index prefix did not have and the reason it had to go. None of
 * the seven lists this applies to collides today; the check is here so that the
 * day one does, it is a rename of two documents rather than two documents
 * quietly becoming one. */
function namesFor(urls: readonly string[]): string[] {
  const tails = urls.map(tailOf);
  const claims = new Map<string, number>();
  for (const tail of tails) claims.set(tail, (claims.get(tail) ?? 0) + 1);
  return tails.map((tail, at) =>
    (claims.get(tail) ?? 0) > 1
      ? `${tail}-${createHash('sha256')
          .update(urls[at] ?? '')
          .digest('hex')
          .slice(0, 8)}.txt`
      : `${tail}.txt`,
  );
}

// --- what a build actually produced ---------------------------------------

/** One document, described rather than redistributed.
 *
 * `gates/corpora/` is ignored because these are somebody else's published works,
 * so the only thing a rebuild on another machine can compare against is what
 * this repo commits *about* them. A character count and a hash per document are
 * metadata rather than text, so they are this repo's to commit.
 *
 * These began as a way to *localise* a fingerprint delta. The first real
 * disagreement was exactly that shape: `theconversation-fr` rebuilds 76
 * characters shorter from a data centre than from a residential connection, both
 * numbers stable, and nobody could localise it further than "somewhere in 43
 * documents". A per-document record turns that into a line of output naming the
 * file.
 *
 * They are now the corpus contract, which is a stronger claim and a different
 * job. The URL list says which documents a corpus contains; this says what they
 * say. Without it a rebuild is a fresh sample of a moving web that happens to be
 * addressed by frozen URLs, and "the corpora are rebuildable" degrades to "the
 * URLs still resolve". */
interface DocumentRecord {
  readonly name: string;
  readonly characters: number;
  readonly sha: string;
}

function manifestFor(id: string): string {
  return join(REPO, 'gates', `documents-${id}.json`);
}

/** Reads a corpus back off disk. Sorted, because `readdirSync` order is the
 * filesystem's business and a manifest that reordered itself between a Linux
 * runner and a Windows laptop would be a diff about nothing. */
function describe(dir: string): DocumentRecord[] {
  return readdirSync(dir)
    .filter((name) => name.endsWith('.txt'))
    .sort()
    .map((name) => {
      const text = readFileSync(join(dir, name), 'utf8');
      return {
        name,
        characters: text.length,
        sha: createHash('sha256').update(text).digest('hex').slice(0, 16),
      };
    });
}

/** How a corpus came out. Two independent facts, because they are two different
 * events with two different people to talk to: `short` means the network or the
 * publisher did not hand over a document, `mismatch` means it handed over a
 * different one than last time. */
interface Outcome {
  readonly short: boolean;
  readonly mismatch: boolean;
}

/** Checks a build against the committed records, and says what to go and read.
 *
 * This used to report and then write the new manifest anyway, on the argument
 * that `gate-findings.ts --verify` was the real gate and this was only the thing
 * to read once it went red. That was wrong, in a way that took a live incident to
 * see: a rebuild picked up three documents a publisher had silently rewritten,
 * overwrote the record of what they used to say, and exited 0. The evidence that
 * anything had moved was destroyed by the run that discovered it, and what
 * survived was a corpus that looked freshly verified. A pin that the thing
 * producing the corpus is free to rewrite is not a pin.
 *
 * `absent` names the documents whose fetch already failed. Without it, every one
 * of them is reported a second time as missing from the build, which is true and
 * is the same event told twice - with the second telling being the more alarming
 * one, since "the publisher deleted it" and "the request timed out" read very
 * differently at the top of a CI log. */
function verify(
  id: string,
  records: readonly DocumentRecord[],
  absent: ReadonlySet<string>,
): 'pinned' | 'unpinned' | 'mismatch' {
  const out = manifestFor(id);
  if (!existsSync(out)) {
    // Not a failure, because a corpus being added has no records yet and there is
    // no order in which it could: the first build is what there is to describe.
    // Deleting the file for a corpus that has one is a visible act on a tracked
    // file, and `pnpm gates:status` says so as well.
    console.log(`  no records in gates/documents-${id}.json, --rebaseline to write them`);
    return 'unpinned';
  }
  const committed = (JSON.parse(readFileSync(out, 'utf8')) as { documents: DocumentRecord[] })
    .documents;
  const before = new Map(committed.map((doc) => [doc.name, doc]));
  const after = new Map(records.map((doc) => [doc.name, doc]));
  const off: string[] = [];

  for (const [name, now] of after) {
    const then = before.get(name);
    if (!then) {
      off.push(`    + ${name}: not in the manifest, ${now.characters} characters`);
      continue;
    }
    if (then.sha === now.sha) continue;
    off.push(
      `    ~ ${name}: sha mismatch, ${then.characters} -> ${now.characters} characters` +
        (then.characters === now.characters ? ', same length and different text' : ''),
    );
  }
  for (const name of before.keys())
    if (!after.has(name) && !absent.has(name))
      off.push(`    - ${name}: in the manifest, not in this build`);

  if (!off.length) return 'pinned';
  console.error(`  ${off.length} document(s) do not match gates/documents-${id}.json:`);
  // Sorted, so the three kinds group: what appeared, what went, what changed.
  for (const line of off.sort()) console.error(line);
  return 'mismatch';
}

/** Verifies, and then writes the records only if asked and only if the build was
 * whole.
 *
 * Rebaselining from an incomplete fetch is the trap this is shaped around: it
 * records the documents that failed to arrive as having ceased to exist, and it
 * does it without saying so, which is how a corpus loses 10% of itself and
 * reports a clean run. */
function reconcile(
  id: string,
  records: readonly DocumentRecord[],
  absent: ReadonlySet<string>,
  whole: boolean,
  rebaseline: boolean,
): Outcome {
  const verdict = verify(id, records, absent);

  if (rebaseline && !whole) {
    console.error(`  refusing to rebaseline ${id} from a build that came back short.`);
    return { short: true, mismatch: false };
  }
  if (rebaseline) {
    writeFileSync(
      manifestFor(id),
      `${JSON.stringify({ corpus: id, documents: records }, null, 2)}\n`,
    );
    console.log(`  gates/documents-${id}.json written from this build`);
    return { short: false, mismatch: false };
  }
  return { short: !whole, mismatch: verdict === 'mismatch' };
}

async function fetchCorpus(spec: CorpusSpec, options: Options): Promise<Outcome> {
  if (!spec.fetch) return { short: false, mismatch: false };
  const dir = join(REPO, 'gates', 'corpora', spec.id);
  if (existsSync(dir) && !options.refresh) {
    console.log(`${spec.id}: already present, skipping (--refresh to re-fetch)`);
    // Checked, not skipped. What is on disk did not change by being skipped, but
    // whether it matches the records is a question about the corpus rather than
    // about this run, and it is the cheap one: no network, and it is what makes
    // a local corpus that has been edited or truncated fail the moment anyone
    // runs `pnpm corpus`. Running this over an existing corpus with
    // `--rebaseline` is also how the records were first written, without
    // re-asking eight publishers for documents already sitting in
    // `gates/corpora/`.
    return reconcile(spec.id, describe(dir), new Set(), true, options.rebaseline);
  }
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });

  const region = spec.fetch.region ? new RegExp(spec.fetch.region, 'g') : undefined;
  const drop = spec.fetch.drop ? new RegExp(spec.fetch.drop, 'g') : undefined;
  const urls = readUrls(join(REPO, spec.fetch.urls));
  const names = namesFor(urls);
  const claimed = new Set<string>();
  // The names of documents this build already knows it does not have, so that
  // `verify` does not report them a second time as having vanished from the
  // publisher. Only the one-URL-one-document formats can fill this in: a
  // `wp-json` request that fails carries away the ids of every post it would
  // have returned, and there is nothing to name.
  const absent = new Set<string>();
  let written = 0;
  let characters = 0;
  let empty = 0;
  let failed = 0;

  for (const [at, url] of urls.entries()) {
    const named = spec.fetch.format === 'wp-json' ? undefined : (names[at] ?? tailOf(url));
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
      if (named) absent.add(named);
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
      documents.push({ name: named ?? tailOf(url), markup: body });
    }

    for (const document of documents) {
      const text = toText(document.markup, region, drop);
      // An empty extraction means the region selector missed, and a corpus
      // quietly short of the documents it claims is the failure this counts.
      if (text.trim().length === 0) {
        absent.add(document.name);
        empty++;
        continue;
      }
      // `namesFor` has already made the URL-derived names unique, but the
      // `wp-json` branch names by post id and a paginated API can serve the same
      // post twice. Either way the symptom would be a corpus one document short
      // with nothing saying so, since the second write silently replaces the
      // first and the count of what was asked for is not the count of what is on
      // disk.
      if (claimed.has(document.name))
        throw new Error(
          `${spec.id}: two documents both named ${document.name}. ` +
            'The second would overwrite the first and the corpus would come back short.',
        );
      claimed.add(document.name);
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

  if (empty || failed)
    console.error(
      `  ${spec.id} is short ${empty + failed} of the ${urls.length} documents its list names. ` +
        'Do not re-baseline the gate from this build.',
    );

  return reconcile(spec.id, describe(dir), absent, !empty && !failed, options.rebaseline);
}

interface Options {
  readonly refresh: boolean;
  readonly rebaseline: boolean;
  readonly only?: string | undefined;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const onlyArg = args[args.indexOf('--only') + 1];
  const options: Options = {
    refresh: args.includes('--refresh'),
    rebaseline: args.includes('--rebaseline'),
    only: args.includes('--only') ? onlyArg : undefined,
  };

  const manifest = JSON.parse(readFileSync(MANIFEST, 'utf8')) as { corpora: CorpusSpec[] };
  const wanted = manifest.corpora.filter(
    (spec) => spec.fetch !== undefined && (!options.only || spec.id === options.only),
  );
  if (!wanted.length) {
    console.error(
      options.only ? `no fetchable corpus named ${options.only}` : 'no fetchable corpora',
    );
    process.exitCode = 2;
    return;
  }

  let short = false;
  let mismatch = false;
  for (const spec of wanted) {
    const outcome = await fetchCorpus(spec, options);
    short ||= outcome.short;
    mismatch ||= outcome.mismatch;
  }

  // Two exit codes because they are two events, and the one thing a maintainer
  // must not have to guess at 4am on the first of the month is which one
  // happened. 1 is "we did not get the text": a 404, a timeout, a region
  // selector that no longer matches, and the corpus on disk is incomplete. 3 is
  // "we got different text": every document arrived and one of them is not what
  // it was, which is a change somebody published and a person has to read.
  //
  // Short wins when both are true. An incomplete build cannot be trusted to be
  // saying anything about the documents that did arrive either, and its
  // mismatches are printed above regardless.
  if (short) {
    console.error('\nThe fetch did not complete. Nothing was rebaselined.');
    process.exitCode = 1;
  } else if (mismatch) {
    console.error(
      '\nSome documents no longer match gates/documents-*.json, and nothing failed\n' +
        'to arrive: the text itself is not what this repo records. Read the delta\n' +
        'above. Rerun with --rebaseline to accept it, which is a commit of its own.',
    );
    process.exitCode = 3;
  }
}

// Only when this file is the thing that was run. `toText` is exported so it can
// be exercised directly, and `drop` is the first part of it that has to be: it is
// a regular expression written against somebody else's markup, and the way to
// find out whether it still matches should not be a rebuild that asks eight
// publishers for 241 documents. Until this guard existed, importing the module
// for that started a corpus build as a side effect of the import.
//
// `import.meta.main` would say this in one word and is not available on the Node
// 22 this package declares support for, where it reads `undefined` and the script
// would do nothing at all when run. A comparison that is merely verbose beats one
// that silently no-ops on the oldest runtime we promise.
if (resolve(process.argv[1] ?? '') === fileURLToPath(import.meta.url)) await main();
