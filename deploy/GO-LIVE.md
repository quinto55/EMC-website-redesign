# Go-live: the new EMC Tickets site on the current web host

For whoever has the web host login. You do not need to know how the site was built. Follow the steps in order. If a step does not look the way this page says it should, stop and ask before going on.

## 1. What this does, and what it must not disturb

**What this does.** The built site is a folder of ordinary files. You upload them into the web root of the host that serves emctickets.com, next to WordPress. Then you paste one short block of rules at the very top of the root `.htaccess` file: it makes the new home page the one shown at `/`, leaves WordPress its own addresses at `/` (its search, its short links and anything a form sends to `/`), and sends eight old addresses to their new pages.

**What this procedure must never do:**

- Change DNS (no record at GoDaddy or anywhere else is touched).
- Edit or delete any WordPress file.
- Touch any of the 18 event folders.
- Delete anything that was not uploaded by this procedure.

**What must keep working the whole time:** the 18 event sites (`/flstatefair/` and the other 17), the four old pages (`/event-intake-form/`, `/event-list/`, `/circle-k-video/`, `/greater-jacksonville-fair/`), the email (Microsoft 365) and the ticketing app at `app.emctickets.com`. The check script in sections 2 and 5 tests all of them.

**Two kinds of names you will see.** The new site's own files live in a folder called `emc-site/`. The new pages live in eight folders: `platform/`, `retail-partners/`, `marketing/`, `about/`, `contact/`, `iafe/`, `privacy/`, `terms/`. Everything uploaded is listed in the twelve names in section 4. Nothing else is uploaded.

**How this page counts.** The numbered headings are sections (section 4 is Upload). The numbered lines inside a section are items, so "section 4, item 5" is the rules block.

## 2. Before you start

Work on a computer that has this repository, Node 22, bash and python3 (the build script uses both). Run the commands from the repository folder. Before the first command, run `npm ci` once: it installs what the build needs, and without it item 3 fails.

1. **Check the live site as it is today.** Run:

   ```
   node scripts/check-live.mjs https://emctickets.com --pre
   ```

   Good: every line starts with `OK` and the last line says `25 OK, 0 FAIL`. Save the output (copy it into a file). If any line says `FAIL`, stop: something is already broken before you started, and it is not yours to fix by going on.

2. **Download two things from the host.** (a) The real `.htaccess` from the web root (the folder that holds `wp-config.php`, `wp-admin` and the 18 event folders). (b) A listing of the web root: one name per line, nothing else. On SSH that is `ls -A > webroot-listing.txt` run in the web root. In a file manager, write the names down one per line. Not `ls -l`: long listings are refused. The listing must include WordPress's own entries (such as `wp-config.php` and `wp-content`); a listing without them is refused as the wrong folder. Keep both files.

3. **Build the package and compare it with the listing.** Run:

   ```
   bash scripts/build-host.sh webroot-listing.txt
   ```

   It first prints how many names it read and which package names it compared, then builds. It stops, builds nothing and leaves no zip if the listing is empty, in long format, does not look like a WordPress web root, or has a name clash (case does not matter). The check sees only real files and folders in the web root. It cannot see WordPress's own pages, such as a WordPress page called About: a new page folder replaces a WordPress page of the same address the moment it is uploaded (intended for `/about/`).

   Good: it ends with `Package ready: dist-host/ (68 files, 28M) and dist-host.zip (27M)` (the numbers can differ a little) and a top-level line naming exactly twelve entries. **If it prints `CLASH` for any name, stop.** That name already exists on the host and uploading would overwrite it. Download a copy of every file or folder reported as a clash before anything is overwritten, and keep the copies with your backups. Do not go on until the controller has decided what to do.

4. **Read the real `.htaccess`.** Open the file you downloaded and look for two things.

   - **A page-cache plugin.** Look for blocks with a marker line such as `# BEGIN WP Super Cache`, `# BEGIN W3TC` (W3 Total Cache), `# BEGIN LiteSpeed`, `# BEGIN WP Rocket`, or any other block you did not expect that mentions "cache". These plugins can serve a saved copy of an old page from their own rewrite rules, even at an address where a new page folder now exists (the home page, and `/about/`). If you find one, add these two lines to the block before you paste it (section 4, item 5): directly after the line `RewriteRule ^$ /index.php [L]` and before the first `# Old address` line, so the new home page and the new page folders win:

     ```
     RewriteRule ^$ /index.html [L]
     RewriteRule ^(platform|retail-partners|marketing|about|contact|iafe|privacy|terms)/$ - [L]
     ```

     They must come after the `RewriteRule ^$ /index.php [L]` line, never before it, so WordPress still gets its own addresses at `/`. Note in your records that you added them. Without a page-cache plugin, do not add them.
   - **A `DirectoryIndex` line.** The new block sets its own, and it sits above the old one, so there is nothing to change. Just note whether one exists and what it says.

   Write down what you found (cache plugin: yes or no, and which; `DirectoryIndex`: yes or no).

5. **Look at how the four old pages talk to `/`.** The block hands WordPress back its own addresses at `/`: anything sent to `/` with POST, and any `/?` address that carries one of these names: `s`, `p`, `page_id`, `preview`, `rest_route`, `gf_page`, `wc-ajax`, `feed`, `jet_form_builder_submit` (a name is the word just before an `=`). Open each old page in a browser (`/event-intake-form/`, `/event-list/`, `/circle-k-video/`, `/greater-jacksonville-fair/`), view its source (Ctrl+U) and use Find for `emctickets.com/?`, `href="/?`, `action="/"` and `action="https://emctickets.com/"`.

   - Every `emctickets.com/?` address and every `href="/?` address found must carry at least one name from the list.
   - A form whose `action` is `/` or `https://emctickets.com/` and that says `method="post"` needs nothing. One that does not say `method="post"` sends its fields as names: at least one field's `name` must be in the list.

   If a name is missing, add it to the block's second `RewriteCond` line before you paste it: inside the brackets, with a `|` in front of it (for example `...|feed|jet_form_builder_submit|newname)=`). Write down that you did. Good: nothing found, or everything found is covered by the list.

6. **Look for stray front pages.** Look inside the web root and inside each of the 18 event folders for a file named `index.html`, `index.htm` or `default.html`. **If any event folder has one, stop and ask before going on.** The block's `DirectoryIndex index.html index.php` line would make that file the folder's front page. (The web root should have no `index.html` yet; if it has one, the clash check in item 3 stops you.)

7. **Confirm the host runs Apache 2.4 or later.** The block uses the `QSD` flag, which needs Apache 2.4. Check the `Server` header of any page (for example `curl -sI https://emctickets.com/ | grep -i '^server'`, which may show only "Apache" with no number) or look in the hosting control panel (the server or PHP information page shows the Apache version). If you cannot tell, ask the host. If it is older than 2.4, remove `,QSD` from the two lines that carry it (`/online/` and `/onsite/`) before pasting the block, and write down that you did.

## 3. Back up

1. On the host, copy the original `.htaccess` to a new file named `.htaccess.before-emc-static` in the same folder. Do not rename the original; copy it.
2. Keep the copy you downloaded in section 2 on your computer too.

Good: the host now has both `.htaccess` and `.htaccess.before-emc-static`, with identical contents.

## 4. Upload

Three things to know before you upload:

- **A page folder goes live the moment it is uploaded, before the block is pasted.** A real folder beats WordPress, unless a page-cache plugin's rules are in the root `.htaccess` (section 2, item 4): then the plugin may keep serving its saved copy of the old page until the block, with its two extra lines, is pasted. In particular `/about/` (a WordPress page today) switches to the new About page as soon as the `about/` folder exists (with a page-cache plugin, once the block is pasted). This is intended.
- **The home page may switch early.** On the usual server setting (`index.php` listed before `index.html`) `/` stays WordPress until the block is pasted. On a host that lists `index.html` first, `/` switches as soon as `index.html` is uploaded. That is why `index.html` goes up last.
- **Permissions.** On the host, folders must be 755 and files 644. If your upload program keeps the permissions the files have on your computer, set them to 755 and 644 after uploading.

Upload the contents of `dist-host/` by hand in the order below. If you instead unzip `dist-host.zip` straight into the web root, everything except the block appears at once. That is acceptable, but then do the check in item 1 and paste the block immediately (item 5).

Order:

1. The folder `emc-site/` (it includes a hidden file `emc-site/.htaccess`; make sure your upload program shows and sends hidden files).

   **Then open https://emctickets.com/emc-site/og-image.png.** Good: the EMC sharing picture (the logo and "One system from first ticket to final report."). If it shows a server error (500), the host has refused that folder's settings file: delete `emc-site/.htaccess` (that one file only) and stop. Do not touch the root `.htaccess`; ask before going on. This is an early warning, not a guarantee: the root file is still checked straight after item 5.
2. The eight page folders: `platform/`, `retail-partners/`, `marketing/`, `about/`, `contact/`, `iafe/`, `privacy/`, `terms/`.
3. `sitemap.xml`, then `robots.txt`.
4. `index.html`.
5. **The rules block.** Open the root `.htaccess` on the host. Paste the whole contents of `deploy/htaccess-block.conf` at the very top, above everything already there (including WordPress's own block), with any lines you added in section 2, items 4 and 5. Change nothing below it. Save.

   **Straight after saving, open https://emctickets.com/ and https://emctickets.com/flstatefair/ in a private browser window.** Good: the new home page, and the event site as it was before. On a computer the new home page opens behind a curtain: a night-time fair picture with the EMC logo, the words "Behind every great fair." and "Scroll to pull back the curtain". That is the new home page. Scroll, click, or wait about six seconds and it pulls back. On a phone there is no curtain. If either shows a server error (500) or the event site has changed, go straight to section 6, Undo.

Do not upload `MANIFEST.txt` separately: it is already inside `emc-site/`. Do not upload `dist-host/` as a folder; its contents go into the web root.

Good: opening https://emctickets.com/ in a private browser window shows the new home page, and https://emctickets.com/what-we-do/ lands on the new Platform page. **If the site shows a server error (500) at any point, go straight to section 6, Undo.**

## 5. Check

1. Run:

   ```
   node scripts/check-live.mjs https://emctickets.com --post
   ```

   Good: every line starts with `OK` and the last line says `50 OK, 0 FAIL`. This repeats the section 2 checks (event sites, old pages, app links; an event site also fails here if its page is the new site's, which means a stray front page was promoted) and adds: each new page answers 200 and carries the new site's marker, each of the eight old addresses answers with a permanent redirect to the right place, the three QR links answer, `robots.txt` and `sitemap.xml` answer, the home page's stylesheet and one video answer, and the opening picture of the home page's curtain (`fair-poster.jpg`) answers. A redirect that first answers over http with the right address is shown as `OK` with a note. If you see that note, open that old address in a browser and check that the address ends on https. If any line says `FAIL`, read what it expected and what came back; the line says what to check. If an event site or old page fails, **undo first** (section 6), then investigate.

2. **WordPress still gets its own addresses at `/`.** Run:

   ```
   curl -s -o /dev/null -w '%{http_code}\n' 'https://emctickets.com/?s=test'
   curl -s 'https://emctickets.com/?s=test' | grep -c 'name="emc-site"'
   ```

   Good: the first command prints `200` (the site answered the search) and the second prints `0` (the search reached WordPress, not the new home page). The `0` alone proves nothing, because an error page also prints `0`. If either prints anything else, **undo first** (section 6), then investigate: the old pages' forms and search may not be reaching WordPress.

3. Look at the site by eye in a private window, on a phone and on a computer: the home page (on a computer, watch the curtain pull back once), Platform, Contact.

4. **One real form submission.** Send it from the live domain, or from localhost with `?formtest=1` added to the page address. Do not send the first test from a free preview sub-domain: the form service may block those. Good: the message arrives at the receiving email address. (This only works once the form key is in place; see the open items.)

5. **One intake form submission.** With the owner's OK, submit the form on `/event-intake-form/` once, marked as a test wherever the form allows it. Or ask whoever receives those forms to confirm that the next one arrives. Good: it arrives, as it did before.

Keep the `--post` output with the `--pre` output from section 2.

## 6. Undo

**Only delete the things named here. They are exactly what this procedure uploaded. Never delete anything else from the web root.** After items 1 and 2 the old site is fully back.

1. **Remove the block.** Open the root `.htaccess` on the host and delete every line from `# BEGIN EMC static site` to `# END EMC static site`, inclusive. Change nothing else. To confirm the file is back to the original, compare it with your backup (`.htaccess.before-emc-static`), for example `cmp .htaccess .htaccess.before-emc-static` on SSH, which prints nothing when they are identical. If it says `EOF on` one of the two files instead, run `diff .htaccess .htaccess.before-emc-static`: when all it shows is one empty line at the end of one file, that difference is harmless. Only if nothing else changed `.htaccess` since the backup (no plugin or person saved it in between), you may instead copy `.htaccess.before-emc-static` over `.htaccess`.
2. **Delete these eleven things from the web root, by name:** `index.html`, `robots.txt`, `sitemap.xml`, and the eight folders `platform`, `retail-partners`, `marketing`, `about`, `contact`, `iafe`, `privacy`, `terms`. The folders must go too: a real folder keeps shadowing the WordPress page of the same address (for example `/about/`), and the new `robots.txt` and `sitemap.xml` would keep naming pages that no longer exist. (WordPress creates its own `robots.txt` and `sitemap.xml` again when no real file exists.)
3. **Optional:** delete the folder `emc-site/`. Nothing links to it once item 2 is done, so it can stay.

**Confirm the old site is back:** run `node scripts/check-live.mjs https://emctickets.com --pre` (good: `0 FAIL`, the same as before you started), then open `/`, `/about/` and one event site in a private window and check they look as they did before.

## 7. Later deploys

When the site changes after go-live:

1. `bash scripts/build-host.sh` (no listing needed this time).
2. Upload the same set as section 4, items 1 to 4, replacing what is there.
3. Do not touch `.htaccess`: the block stays as it is.
4. Run `node scripts/check-live.mjs https://emctickets.com --post`. Good: `50 OK, 0 FAIL`.

The videos are cached for one hour only, so a replaced video shows up within the hour. Hashed files under `emc-site/assets/` get new names each build; the old ones may be left in place.

## 8. Open items

- **robots.txt and sitemap.xml.** A real `robots.txt` and `sitemap.xml` now take over from the ones WordPress generates today. This is intended. The new `robots.txt` keeps the WordPress rules and names the new sitemap.
- **The form key (spec question Q2).** Until the form service's access key is put in `src/site-config.js` and the site is rebuilt, the contact form on the live domain shows only the email fallback (an "Email Anthony" button and the toll-free number). After the key is in, rebuild and upload again (section 7).
- **The first real form test** should be sent from the live domain or from localhost with `?formtest=1`, because the form service may block free preview sub-domains.
- **The old Google Tag Manager container (Q3).** The old WordPress home page loads container GTM-WXP79P4D. The new pages do not carry it until someone says the data is used.
- **How the files get uploaded (Q1)** depends on the access Anthony can give: SFTP, SSH, or someone uploading by hand. The steps above work the same way with any of them.
- **Visitor counts.** The host's ordinary visitor logs should be enough to count card scans on `/iafe/`. To be confirmed once there is access.
