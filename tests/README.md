# Nightly smoke tests

End-to-end checks that run against **production** every night at
**03:00 IST** (21:30 UTC) via GitHub Actions. The suite verifies the
three customer-facing flows that would ruin a day if they silently
broke:

1. **Online booking** — home page renders, `/book` wizard mounts, the real
   `/api/bookings` endpoint accepts a payload and writes a confirmed row
   to Sheet1.
2. **Walk-in logging** — `/admin` renders, the real `/api/admin/revenue`
   endpoint accepts a walk-in payload and writes a row to the Revenue
   sheet.
3. **Kiosk entry** — `/kiosk` renders with a QR code (verifies the
   server component builds and the client shell hydrates).

The suite does not touch Razorpay. It uses a server-side bypass so a
valid test booking lands in Sheet1 marked as paid, without a real
charge. See **How the bypass works** below.

## How the bypass works

A long random token lives in **one** place server-side (`AUTOTEST_TOKEN`
env var on Vercel). When a request to the booking or walk-in API
carries that token in the `x-autotest-token` header:

- `POST /api/bookings` — writes a row tagged `[AUTOTEST]` in
  `specialRequests`, with `paymentStatus = paid`, no Razorpay round-
  trip, no confirmation email.
- `POST /api/admin/revenue` — skips the PIN check, tags `notes` with
  `[AUTOTEST]`.
- `POST /api/admin/autotest-cleanup` — deletes test rows older than
  7 days from both sheets.

Without the header, every endpoint behaves exactly as before. Without
`AUTOTEST_TOKEN` set in the environment at all, the header is ignored.
The feature is impossible to misuse by accident on a preview deploy
that hasn't been configured.

## First-time setup

### 1. Generate the token

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

Save it somewhere safe — you'll paste it into two places below.

### 2. Vercel

Project → Settings → Environment Variables → Add:

| Name             | Value              | Environments           |
| ---------------- | ------------------ | ---------------------- |
| `AUTOTEST_TOKEN` | *(the token above)* | Production, Preview    |

Redeploy once so the running server picks up the new env var.

### 3. GitHub

Repo → Settings → Secrets and variables → Actions → New repository
secret, add all three:

| Name                  | Value                                                       |
| --------------------- | ----------------------------------------------------------- |
| `AUTOTEST_TOKEN`      | *the same token you set on Vercel*                          |
| `DISCORD_WEBHOOK_URL` | (optional) a Discord channel webhook — alerts go here on failure |
| `ADMIN_PIN`           | (optional) the staff PIN — only needed if a future test drives the admin UI |

### 4. Discord webhook (optional)

In Discord: Server Settings → Integrations → Webhooks → New Webhook.
Pick a channel, copy the URL, paste into the `DISCORD_WEBHOOK_URL`
GitHub secret above. On failure the suite posts a one-line summary
with a link to the GitHub Actions run.

### 5. First manual run

GitHub → Actions tab → *Daily smoke test* → **Run workflow**. Watch
the job complete. First real nightly run goes out at the next 21:30 UTC.

## Running the suite locally

```bash
# One-time: install Playwright browsers.
npx playwright install chromium

# Then every time:
export AUTOTEST_TOKEN=<the token>
export SMOKE_BASE_URL=http://localhost:3000   # or your dev tunnel
npx playwright test
```

Open the HTML report after a run with `npx playwright show-report`.

## Finding and deleting test rows manually

Rows the suite wrote are easy to spot in the sheets:

- **Sheet1 (bookings)** — `email` starts with `autotest+` and
  `specialRequests` starts with `[AUTOTEST]`.
- **Revenue** — `notes` starts with `[AUTOTEST]`.

You almost never need to delete them by hand — the next nightly run
calls `/api/admin/autotest-cleanup` before writing anything new, which
sweeps everything older than 7 days. To force a sweep right now:

```bash
curl -X POST \
  -H "x-autotest-token: $AUTOTEST_TOKEN" \
  https://www.tesseractarena.com/api/admin/autotest-cleanup
```

## When the suite fails

1. Check the Discord ping — it says which spec failed.
2. Open the GitHub Actions run → download the
   `playwright-report` artifact → extract and open `index.html` for
   trace + screenshot of the exact failing step.
3. If the failure was a flake (one-off network blip, 409 due to a
   genuinely full slot), re-run the workflow. The suite retries once
   on CI automatically.
4. If it's real, that's exactly what this exists for — fix the bug.
