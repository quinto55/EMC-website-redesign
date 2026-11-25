# Go-live through Cloudflare: the new EMC Tickets site with only the GoDaddy login

Use this page when nobody has the login of the web host (the server at 162.144.98.42). The other way, uploading the files onto that host, is `deploy/GO-LIVE.md`. Do one or the other, never both.

## 1. What this does, and what it must not disturb

**What this does.** Cloudflare (free plan) becomes the domain's DNS and stands in front of the old web host. A small Cloudflare program, the Worker (`deploy/cloudflare/worker.js`), answers the new site's pages and files itself and passes every other request to the old host unchanged. It follows the same rules as the Apache block (`deploy/htaccess-block.conf`): WordPress keeps its own addresses at `/` (a search, a short link, anything sent to `/` with POST), and eight old addresses move for good to their new pages.

**What must keep working the whole time:** the 18 event sites (`/flstatefair/` and the other 17), the four old pages (`/event-intake-form/`, `/event-list/`, `/circle-k-video/`, `/greater-jacksonville-fair/`), the email (Microsoft 365), `app.emctickets.com` and every other name under emctickets.com. `scripts/check-live.mjs` tests the web part. `scripts/check-dns.mjs` tests that every DNS record, email included, answers the same at Cloudflare as at GoDaddy before the switch.

**What this never does:** delete or change a record at GoDaddy (they stay as the way back), or touch the old host.

**Live since 2026-11-24, about 11:45 PM.** After the switch `check-live.mjs --post` on https://emctickets.com gave 51 OK, 0 FAIL; a search and a POST to `/` reached WordPress. Cloudflare account: quintanaanthony23@gmail.com's; name servers `macy` and `margo.ns.cloudflare.com`; Worker `emc-site`.

**Proven before go-live (2026-11-24):** the Worker run locally against the real old host passed all 51 checks of `check-live.mjs --post`, and a search, a short link and a POST to `/` reached WordPress.

## 2. Before you start

1. `npm ci` once, from the repository folder.
2. **Check the live site as it is today:** `node scripts/check-live.mjs https://emctickets.com --pre`. Good: `25 OK, 0 FAIL`. Save the output. If anything fails, stop.
3. **Export the zone file from GoDaddy.** GoDaddy, the domain emctickets.com, DNS, then the menu on the DNS records page, "Export zone file". Save it as `emctickets.com.zone.txt` and keep it: it is the full list of records, and the way back.

## 3. Cloudflare account and DNS

1. **Create a Cloudflare account** (free). The owner of the domain does this, with their own email and password, and turns on two-step sign-in.
2. **Add the domain.** "Add a domain", `emctickets.com`, the **Free** plan. Cloudflare scans for records.
3. **Import the zone file.** DNS, Records, "Import and Export", import `emctickets.com.zone.txt`. Cloudflare may report records that already exist from its scan; that is fine.
4. **Proxy status.** Cloudflare's import turns the proxy ON for every A and CNAME record; turn it off on all of them first. **Until the name servers are switched and the certificate is live (section 6), keep every record DNS only, these two included.** After that, exactly two records are **Proxied** (orange cloud): the `A` record for `emctickets.com` (162.144.98.42) and the `CNAME` `www`. **Every other record is DNS only** (grey cloud): the wildcard `*`, `app`, `webmail`, `ftp`, `autodiscover`, `email`, `msoid`, `lyncdiscover`, `sip`, the two `selector._domainkey` names, `tickets` and anything else. Email and the ticketing app break if they are proxied.
5. **Note Cloudflare's two name servers** (shown when you add the domain, for example `xxx.ns.cloudflare.com`).
6. **Compare every record:**

   ```
   node scripts/check-dns.mjs emctickets.com.zone.txt <cloudflare-ns-1> <cloudflare-ns-2>
   ```

   Good: the last line says `N OK, 0 DIFF`. For `emctickets.com` and `www` the addresses are skipped on purpose (Cloudflare answers with its own). Fix every `DIFF` in Cloudflare's DNS page and run it again. One `DIFF` is expected and harmless: a `TXT` at `_domainconnect`, which Cloudflare adds on its own. **Do not go on with a `DIFF` on an email record** (`MX`, `TXT`, `autodiscover`, `selector1`/`selector2`, `_dmarc`, `msoid`, `sip`, `lyncdiscover`, the `SRV` records).

## 4. Cloudflare settings

1. **SSL/TLS, encryption mode: Full.** After the certificate is live (section 6), also turn on **Always Use HTTPS** (SSL/TLS, Edge Certificates): without it `http://emctickets.com/` shows the new home page over plain http. No loop in Full mode, which reaches the old host over https. Not Flexible: the old host sends http to https, and Flexible would loop forever. Not Full (strict): if the old host ever fails to renew its certificate (Let's Encrypt, valid until 2027-01-18 on 2026-11-24), strict mode takes every event site down. Leave "Always Use HTTPS" off; the old host already does it.
2. **Scrape Shield, Email Address Obfuscation: off.** It rewrites email links on every page, the event sites included.
3. **Caching, Configuration, Browser Cache TTL: "Respect Existing Headers".**
4. **Caching, Cache Rules: one rule, "All incoming requests", Cache eligibility: Bypass cache.** The old host's pages and pictures then behave exactly as today (nothing held at Cloudflare). The new site's own files are not affected: the Worker serves them with their own cache times (`deploy/cloudflare/_headers`).

## 5. Put the Worker on

1. `npx wrangler login`. The account owner approves it in their browser.
2. `bash scripts/build-cloudflare.sh`. Good: it ends with `Cloudflare build ready: dist-cf/ (158 files)` (the number can differ a little) after the same checks `build-host.sh` runs.
3. `npx wrangler deploy -c deploy/cloudflare/wrangler.jsonc`. Good: it names the route `emctickets.com/*`. While the domain is still pending at Cloudflare nothing changes for visitors.
4. **Fail open.** Workers & Pages, Workers Routes, the route `emctickets.com/*`: request limit failure mode **Fail open**. The free plan runs the Worker 100,000 times a day. Every request that is not a file of the new site counts, event sites included. Past the limit, fail open sends everything to the old host for the rest of the day, so the event sites keep working (only the new pages are missing). Fail closed would show an error page on every address.

## 6. Switch the name servers

1. **GoDaddy, emctickets.com, DNS, Nameservers, Change, "I'll use my own nameservers":** enter Cloudflare's two, save, "Continue & Verify". GoDaddy texts a code to the account's phone (the one ending 2760 on 2026-11-24); its owner types it in. Do not delete anything else at GoDaddy. (DNSSEC is not on at the registry on 2026-11-24, so there is nothing to turn off; if GoDaddy says it is on, turn it off first and wait a day.)
2. Wait until Cloudflare says the domain is **Active** (it was within minutes on 2026-11-24). With both records still DNS only, every visitor keeps reaching the old site exactly as before, and email keeps flowing because both sets of name servers give the same records.
3. **Wait for the certificate.** SSL/TLS, Edge Certificates: the Universal certificate for `emctickets.com, *.emctickets.com` goes from "Pending Validation" to **Active** after the domain is Active. **Never proxy before this:** a proxied record without the certificate fails every https visit, event sites included (this happened for a few minutes on 2026-11-24 until the two records went back to DNS only). To check from a terminal: `echo | openssl s_client -connect 104.21.92.16:443 -servername emctickets.com 2>/dev/null | openssl x509 -noout -subject` prints the certificate once it is live.
4. **Now proxy the two records** (`emctickets.com` and `www`, section 3, item 4). This is the moment the new site goes live.
5. **Check, once a lookup of emctickets.com gives Cloudflare's addresses** (for example `https://dns.google/resolve?name=emctickets.com&type=A`):
   - `node scripts/check-live.mjs https://emctickets.com --post`. Good: `51 OK, 0 FAIL`.
   - WordPress still gets its own addresses: `curl -s 'https://emctickets.com/?s=test' | grep -c 'name="emc-site"'` prints `0`, and the page is WordPress's search results.
   - By eye, in a private window, on a phone and on a computer: the home page (the curtain on a computer), Platform, Contact, one event site.
   - One real contact form message from the live domain, by hand (as in `GO-LIVE.md` section 5, item 4).
   - Send one email to and from anthony@emctickets.com.

## 7. Undo

- **Fast (about a minute): take the Worker off.** Workers & Pages, Workers Routes, delete the route `emctickets.com/*` (or `npx wrangler delete -c deploy/cloudflare/wrangler.jsonc`). Every address goes to the old host again, the old WordPress home page included, still through Cloudflare. Then run `node scripts/check-live.mjs https://emctickets.com --pre`. Good: `25 OK, 0 FAIL`.
- **Full (hours): leave Cloudflare.** GoDaddy, Nameservers, back to GoDaddy's own (`ns51.domaincontrol.com`, `ns52.domaincontrol.com`). GoDaddy's records were never touched. If any are missing, re-enter them from the zone file saved in section 2.

## 8. Later deploys

`bash scripts/build-cloudflare.sh`, then `npx wrangler deploy -c deploy/cloudflare/wrangler.jsonc`, then `node scripts/check-live.mjs https://emctickets.com --post` (good: `51 OK, 0 FAIL`). Nothing at GoDaddy or in Cloudflare's settings changes.

## 9. What is different from today

- **The old host sees Cloudflare's addresses, not visitors'.** WordPress security plugins and the host's visitor logs see Cloudflare. If the host starts refusing Cloudflare, every event site shows a Cloudflare error: undo fast (section 7), then ask the host.
- **The daily Worker limit.** Watch the Worker's request count in Cloudflare the first few days, more so while a fair is selling. If it nears 100,000 a day, Workers Paid ($5 a month, 10 million requests) removes the limit. Another option: routes with no Worker for the 18 event folders, so their traffic skips the Worker.
- **Visitor counts for `/iafe/`** come from Cloudflare's analytics, not the host's logs.
- **Klaviyo's `info` and `send` subdomains** are handed to Klaviyo's name servers, which refused to answer for them on 2026-11-24, before and after the switch alike. Not caused by this change; Klaviyo's sending-domain setup is unfinished or abandoned.
