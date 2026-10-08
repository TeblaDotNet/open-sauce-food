# Open Sauce Food hosting rehearsal and deployment runbook

Status: local Apache rehearsal passed on 8 October 2026. **Production publication is not authorised and is not yet ready.** No production uploads, configuration changes or landing-page changes were made.

## Evidence and scope

The existing isolated `tebla-release-rehearsal-wordpress-1` and database were started on loopback port 8082. Apache 2.4.68 / PHP 8.4.26 served the unchanged WordPress parent from `/var/www/html`. The complete static artifact occupied the physical `/var/www/html/opensaucefood/` directory. No Tebla repository file or parent rewrite file was edited. The headers module was enabled only inside the isolated Apache container.

Before the child configuration, existing static pages bypassed WordPress, but missing subsite pages went through WordPress and returned its 404 page. With [the scoped configuration](opensaucefood.htaccess), missing paths return the [subsite error document](404.html) with HTTP 404 and no PHP response header. The child's own rewrite rule terminates rewriting, `FallbackResource` is disabled, directory indexes use `index.html`, slash redirects remain enabled, and directory listing is disabled. The parent WordPress `.htaccess` is unchanged.

The HTTP sweep verified all 1,377 generated pages and 145 shared/media assets against their local SHA-256 values. Three missing paths returned genuine subsite 404s, four slash requests returned 301, the assets directory returned 403, and conditional CSS retrieval returned 304. The packaged release contains 1,524 files: those pages/assets plus `.htaccess` and `404.html`. Build-only reports and the generator ownership manifest are not uploaded.

Browser acceptance ran against Apache, covering all three views, both themes, syntax colours, Story/Notes, ingredient/process/equipment loops, part anchors, usage backlinks, tags/categories, complete reference indexes, Spec/About, mobile widths and JavaScript disabled. Screenshots and detailed receipts are local evidence, not public source material.

Same-filesystem directory cutover and rollback were exercised. The protected staging directory returned 403 even for a known existing index file. Candidate checksums all passed. The candidate was activated, HTTP-tested, and rolled back; the previous artifact was restored. Parent `.htaccess` and `index.php` hashes, and the rendered parent homepage hash, were unchanged. The restored subsite passed the full HTTP sweep again.

## Production findings — read only

Public HTTP is reachable. Responses identify `LiteSpeed` and `X-Served-By: web3.bhx`. The decoded landing page is 26,748 bytes, SHA-256:

```
1cf60d4fbb3505e425816c30a87880c6a53e0780867f0d1550ee232d3228d9ef
```

The root, `/opensaucefood`, `/opensaucefood/`, a nonexistent subsite page and a nonexistent CSS path all returned HTTP 200 with these identical landing bytes. The observed Last-Modified was 28 September 2026 07:18:31 GMT. Responses supported compressed transfer and advertised byte ranges. No Cache-Control or CDN cache-hit header was observed on these requests; this does not prove absence of server/CDN caching. A final root fetch matched the initial checksum.

This is evidence of a landing fallback, not evidence of a physical subsite directory or a specific rewrite rule. The saved Apache/WordPress file in the Tebla checkout is NOT verified production configuration. Local Apache success does NOT prove the current LiteSpeed root fallback permits the child configuration to run.

No matched, complete production SSH/SFTP connection configuration was found in the inspected saved locations. A standalone SSH key is insufficient evidence of the correct host/account; no guessed login was attempted. Authenticated inspection therefore stopped. No passwords or private keys were printed or copied.

### Required manual production verification

Using the owner's existing control panel/confirmed connection, record the following privately before approving upload:

| Item | Required evidence |
| --- | --- |
| Domain mapping | Actual resolved document root for `tebla.net`; symlink targets if applicable. Do not assume `public_html`. |
| Current files | Root listing, landing entry file, active root `.htaccess`, any parent/vhost rewrites, DirectoryIndex and ErrorDocument settings. Preserve exact bytes. |
| Existing destination | Whether `opensaucefood` exists, its type/contents/owner/mode; do not replace unowned content. |
| Routing | Does the landing fallback exclude existing files/directories? Do child overrides run for missing descendants? |
| LiteSpeed support | Effective handling of END, FallbackResource, ErrorDocument, Options, DirectoryIndex and Header directives. Verify responses on protected staging, not merely syntax acceptance. |
| Access | Confirm host, account, host-key fingerprint and SSH versus SFTP-only capability. Do not disable host-key verification. |
| Storage | Owner/group/modes, quota and free space sufficient for incoming + current + previous releases and optional archive (reserve at least 150 MiB). |
| Cutover | Server-side directory rename permission, same-filesystem device IDs, and whether moving into the destination is permitted. |
| Symlinks | Host policy, FollowSymLinks/SymLinksIfOwnerMatch and ability to replace a symlink atomically; currently unverified. |
| Protected staging | Prefer outside the web root on the same filesystem. If inside, require access denial and test a known file returns 403 before uploading the artifact. |
| Cache | Host/CDN overrides, purge capability and effective cache headers. |

If the production parent fallback intercepts the subsite despite its physical directory, stop. Prepare and separately review the narrowest `/opensaucefood/` exclusion; do not invent or apply a broad root rewrite replacement.

LiteSpeed documents rewrite-processing differences from Apache: [migration compatibility](https://docs.litespeedtech.com/lsws/cp/cpanel/switch-apache/) and [configuration](https://docs.litespeedtech.com/lsws/configuration/). The actual host's behaviour must be tested.

## Initial cache and media policy

Assets currently have stable names, not content fingerprints. Use `Cache-Control: no-cache` for HTML and assets initially: caching is allowed, but reuse requires revalidation. Apache ETag/Last-Modified conditional retrieval was verified with a 304. Do not apply immutable/year-long caching to mutable filenames. Longer caching can follow versioned/fingerprinted URLs in a separate task. Ensure the host does not override this policy.

The baked-rice image remains 4,340,300 bytes and is served successfully as an ordinary static WebP. It is acceptable for functional first-alpha hosting; its transfer cost is noticeable on slow connections. Record image optimisation as a separate follow-up. No source media was changed.

## Prepare a future release (local only)

1. Finish review and commit the exact source tree intended for publication. Current rehearsal receipts explicitly record `sourceDirty: true`; their commit alone does not identify the uncommitted build. A full source fingerprint is also recorded. Do not relabel a dirty rehearsal package as a committed production release.
2. Run the existing checks and regenerate without content edits:

```sh
pnpm check
pnpm build
pnpm test
pnpm corpus
pnpm site:build
pnpm site:validate
node scripts/check-public-release.ts
node scripts/hosting-package.ts release-YYYYMMDD-shortcommit
```

3. The package builder refuses to overwrite an existing release directory and verifies every copied file against the generated ownership hashes. Its output under `hosting-work/<release>/` contains `web/`, `SHA256SUMS`, and `release-manifest.json`. The latter records source commit, dirty state, source-tree hashes, intended URL, file count, bytes and every payload checksum.
4. Keep `SHA256SUMS` and `release-manifest.json` private alongside the release; only `web/` is the deployable subsite. Preserve dotfiles during transfer. No general WordPress release/apply helper belongs in this procedure.
5. Freeze the tested package; record its checksum and release ID. Do not rebuild during upload or mix files from two builds.

## Upload and cutover — requires separate live authorisation

The following procedure is concrete, but host paths and permissions MUST first be filled from verified production evidence. There is intentionally no auto-upload command or configured live destination.

1. Record the current root response and landing-file checksum, root configuration checksum, and current subsite state. Keep the existing live landing page untouched and unlinked.
2. Create one uniquely named private staging directory `RELEASES/incoming-RELEASE` on the same filesystem as the destination. Never use the document root itself as a sync/delete target.
3. Upload the contents of the package's `web/` directory into that staging directory using the confirmed SFTP connection (or approved SSH transfer). Upload only this allowlist. Upload manifests beside it, privately.
4. With SSH, run `sha256sum -c ../SHA256SUMS` from the staged payload, and compare the complete relative file inventory/count with `release-manifest.json`, including `.htaccess`. With SFTP only, download staged files into a new local verification directory and compare names, lengths and SHA-256s. A successful client transfer progress bar is insufficient verification.
5. Check permissions as the site's real owner; readable files and traversable directories, without world-writable permissions. Preserve correct account ownership. The root-owned Docker rehearsal modes are not a production prescription.
6. Test the package on an approved protected staging host with the same `/opensaucefood/` prefix and effective LiteSpeed rules. Run all HTTP/browser checks below. An arbitrary hidden URL is not access protection.
7. **First publication, destination absent:** server-side rename the fully verified staged directory to the exact resolved `DOCUMENT_ROOT/opensaucefood`. Same-filesystem rename to a nonexistent destination was supported locally; confirm it on the host. Do not merge-upload into the public path.
8. **Later update, physical directory present:** move exactly `DOCUMENT_ROOT/opensaucefood` to `RELEASES/previous-RELEASE`, then move exactly the verified incoming directory into its place. This is TWO operations, not an atomic directory replacement. Agree a brief window and handle failure of the second operation by immediately restoring the first directory. During the gap, parent routing may catch requests; do not claim zero downtime. If this is unacceptable, defer publication until a host-supported atomic symlink switch has been separately verified.
9. SFTP rename is usable only if confirmed to be a server-side rename within the same filesystem. An operation implemented as copy/delete is not equivalent. If safe rename is unavailable, stop and agree a different bounded procedure; do not substitute live incremental sync.
10. Run the exact smoke checks immediately. Retain the previous artifact privately; do not delete it during acceptance. Apply only a scoped cache purge if the host requires one.

## Rollback

For an update, move the failed current subsite to a new private `failed-RELEASE` path, then rename `previous-RELEASE` back to the exact `DOCUMENT_ROOT/opensaucefood` path. Both paths must be verified non-conflicting siblings/on the same filesystem. Verify the restored file inventory and root/subsite HTTP checks. This reverses only the subsite, not WordPress or root configuration.

For the FIRST publication where no destination previously existed, rename the new subsite back to private staging. Verify root bytes match the pre-publication snapshot and the subsite returns its recorded pre-publication behaviour. That previous behaviour currently appears to be landing content with HTTP 200, not a valid subsite.

Do not use recursive delete, root-wide sync, database restore, WordPress apply or a landing-page replacement. Keep failed/new and previous releases for inspection until the owner accepts cleanup.

Local proof used protected `.opensauce-rehearsal/` within the rehearsal volume (HTTP 403 verified). `candidate` and the live directory had the same device ID. The existing subsite was moved to `previous`, candidate to live, then live to `rolled-back-candidate` and previous back to live. Response checks distinguished the versions, and parent file/body hashes were unchanged. No production atomicity is inferred from this local result.

## Exact post-publication smoke checks

Use `https://tebla.net` for the following paths, recording status, final URL, response headers and body identity:

| Path | Expected |
| --- | --- |
| `/` | 200, unchanged landing bytes; no Open Sauce Food navigation link |
| `/opensaucefood` | 301 to `/opensaucefood/` |
| `/opensaucefood/` | 200, Open Sauce Food homepage |
| `/opensaucefood/recipes/` | 200, all 410 local recipe links |
| `/opensaucefood/recipes/tag/sauce/` | 200, 24 recipes |
| `/opensaucefood/recipes/category/baking/` | 200, 3 recipes |
| `/opensaucefood/recipe/mayonnaise-or-aioli/` | 200, correct recipe and GitHub source link |
| `/opensaucefood/ingredients/egg/` | 200, egg knowledge and local usage backlinks |
| `/opensaucefood/processes/blend/` | 200, blend reference |
| `/opensaucefood/equipment/immersion-blender/` | 200, equipment reference |
| `/opensaucefood/spec/` and `/opensaucefood/about/` | 200, correct documents |
| `/opensaucefood/recipe/does-not-exist/` | 404, subsite error page, not the landing or WordPress page |
| `/opensaucefood/not-a-real-page/` | 404, subsite error page |
| `/opensaucefood/assets/not-a-real-file.css` | 404, never 200 HTML fallback |
| `/opensaucefood/assets/` | 403, no listing |
| CSS, all three JS files, both fonts, mayonnaise image, baked-rice image | 200, correct bytes/MIME and subsite paths |
| CSS conditional request with received ETag | 304; effective revalidation cache policy |

Refresh a deep recipe URL directly. Confirm the canonical URL is the production trailing-slash URL without view state. Click egg `#part-yolk`, blend and immersion-blender links from Code and Compact, and return through usage links. Check original text, theme, syntax colours, Story/Notes, mobile width and JavaScript-disabled navigation. A fragment is checked in the browser; it is not sent in HTTP requests.

The full read-only sweep can run with `node scripts/hosting-smoke.ts https://tebla.net` after future publication. It expects the locally frozen `site-dist` corresponding to the release. The browser harness accepts `SITE_TEST_ORIGIN=https://tebla.net`; use the same release and explicitly authorised post-publication checks. Never point filesystem deployment commands at the site root.

## Ready decision

**Local hosting rehearsal: PASS. Ready for live deployment: NO, pending production verification and separate authorisation.** The main unresolved blocker is the actual LiteSpeed landing fallback and effective child overrides. Production document root, active configuration, account permissions, space, staging protection and safe rename/symlink capabilities remain unverified. No additional site feature is required before those hosting checks.
