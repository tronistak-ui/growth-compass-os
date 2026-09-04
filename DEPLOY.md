# Deploy runbook

How to stand up one client's dedicated instance from scratch (Oracle Cloud VM
or any similar Ubuntu box you control) and how to update one later. Every
client gets their own VM + their own Postgres — this is not a shared/multi-VM
setup.

## 1. Prerequisites on the VM

- Ubuntu 22.04+ (or similar), with a non-root sudo user
- **Node.js 24** — install via `setup_24.x`, not `setup_22.x`. This isn't
  just a "tested on" preference: `package-lock.json` in this repo is
  generated with npm 11 (Node 24's bundled npm), and `npm ci` under npm 10
  (Node 22's bundled npm) fails with `Missing: lru-cache@... from lock
  file` — the two npm majors resolve this project's optional peer deps
  differently. Confirm with `node --version` / `npm --version`.
- Postgres 16 (either installed directly on the VM, or run via the included
  `docker-compose.yml` — either is fine, this app only needs a reachable
  `DATABASE_URL`)
- Nginx (or another reverse proxy) for TLS termination — this app's own
  server (`scripts/serve.mjs`) speaks plain HTTP only, on purpose; it expects
  to sit behind a proxy that handles HTTPS, same as most Node deployments
- A domain name pointed at the VM, with a valid TLS cert (`certbot` +
  Let's Encrypt is the standard free option). No domain yet? `certbot`
  can still issue a real cert against `<ip-with-dashes>.nip.io` (resolves
  straight to that IP) — enough to get genuine HTTPS for testing.
- **Swap space, if the VM has ~1GB RAM or less** (e.g. a free-tier
  micro instance). `npm ci` / `vite build` can exhaust 1GB and trigger the
  OOM killer, which can take down the SSH session along with the build.
  Add a 2GB swapfile before Step 2:
  ```bash
  sudo fallocate -l 2G /swapfile
  sudo chmod 600 /swapfile
  sudo mkswap /swapfile
  sudo swapon /swapfile
  echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
  ```

## 2. Get the code and configure it

```bash
git clone <your-repo-url> growth-compass
cd growth-compass
npm ci
cp .env.example .env   # or hand-write one — see the table below
```

After `npm ci`, check whether any install scripts were blocked (a newer npm
default requires explicit approval for install/postinstall scripts):

```bash
npm install-scripts ls
```

If it lists packages (typically `argon2` — needs a native compile via
node-gyp, this app's password hashing depends on it — and `esbuild`, which
needs its postinstall to fetch the right binary), approve each one:

```bash
npm install-scripts approve <package>@<version>
```

Skipping this produces a build that looks successful but breaks password
hashing (and possibly the build tooling) at runtime.

There is no `.env.example` committed yet — `.env` is gitignored on purpose
(it holds real secrets). Copy the variable names from the reference table
below, or from the comments already in a working `.env` from another
deployment, and fill in fresh values for this client.

### Environment variables

Every secret below needs a **fresh, unique value per client deployment** —
never copy one client's `.env` secrets to another's. Generate each with:

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
```

| Variable | Required | Notes |
|---|---|---|
| `BRAND_NAME`, `BRAND_TAGLINE` | Yes | Baked into the build at compile time — see white-label notes below |
| `SUPPORT_EMAIL` | No | Leave empty to hide the "Contact support" link entirely |
| `DATABASE_URL` | Yes | `postgres://user:pass@host:5432/dbname` — generate the DB password with the `base64url` form of the command above (not plain `base64`); a `/` or `+` in the password breaks URL parsing (`TypeError: Invalid URL` from the `postgres` driver) since it's embedded unescaped in the connection string |
| `SESSION_SECRET` | Yes | 32 random bytes, base64url |
| `PLATFORM_ADMIN_CLAIM_SECRET` | Yes | Set before first deploy, claim admin immediately after, then treat as compromised (see step 5) |
| `APP_BASE_URL` | Yes | The real public URL, e.g. `https://client.example.com` — used to build OAuth redirect URLs and links in emails |
| `OAUTH_STATE_SECRET` | Yes | 32 random bytes, base64url |
| `TOKEN_ENCRYPTION_KEY` | Yes | 32 random bytes, **base64** (not base64url) — encrypts stored OAuth tokens at rest |
| `GOOGLE_CLIENT_ID`/`SECRET`/`OAUTH_REDIRECT_URL` | No | Leave blank to disable Google Business Profile connect |
| `INSTAGRAM_APP_ID`/`SECRET`/`OAUTH_REDIRECT_URL`/`WEBHOOK_VERIFY_TOKEN` | No | Leave blank to disable Instagram connect |
| `SMTP_HOST`, `SMTP_PORT` | Yes | Real provider (SendGrid, SES, Mailgun, etc.), not Mailpit |
| `SMTP_USER`, `SMTP_PASS` | Yes (for a real provider) | Every real provider requires these; only Mailpit (dev-only) doesn't |
| `SMTP_SECURE` | Yes | `"true"` for port 465, `"false"` for port 587 (STARTTLS) — check your provider's docs |
| `ALERT_FROM_EMAIL` | Yes | The From address for verification/invite/digest emails |
| `STORAGE_LOCAL_ROOT`, `STORAGE_BASE_URL` | Yes | Local-disk file storage — fine for a single-VM deployment |

### Setting up SMTP (Brevo)

Every real client needs their **own** SMTP provider account — not one
shared across clients (see the business-model notes on why: shared send
quota, shared sender reputation, and it breaks the "fully theirs, no
ongoing dependency on you" pitch). **Brevo** is the recommended default:
free tier is 300 emails/day (9,000/month — far more than a small
business's verification/invite/digest volume), no card required to sign
up, and it's a standard SMTP relay that plugs directly into the variables
below.

1. Sign up at brevo.com using the **client's** business email (or yours,
   if you're managing it on their behalf) → verify the account email.
2. **Settings → SMTP & API** → **Generate a new SMTP key** — this is
   `SMTP_PASS` below (not the account password). Note the **SMTP login**
   shown on the same page — that's `SMTP_USER`.
3. For real deliverability (skipping this works, but lands in spam more
   often): **Senders, Domains & Dedicated IPs → Domains → Add a domain**,
   then add the SPF/DKIM DNS records it gives you at the client's domain
   registrar.

```
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=<the SMTP login from step 2>
SMTP_PASS=<the SMTP key from step 2>
ALERT_FROM_EMAIL=alerts@<client's domain>
```

Verify it actually works per Step 7 below — sign up a test account and
confirm the verification email lands in a real inbox, not just that the
send call didn't error.

### White-labeling this client

Before building: set `BRAND_NAME`/`BRAND_TAGLINE` in `.env`, and replace
`public/brand-mark.png` (and the favicon files in `public/`) with the
client's logo. These are compiled into the client bundle — changing them
requires a rebuild, not just an env var change at runtime.

## 3. Database setup

```bash
npm run db:migrate
```

This runs every migration in `drizzle/migrations/` against `DATABASE_URL`.
Safe to re-run — already-applied migrations are skipped.

## 4. Build and run

```bash
npm run build   # outputs dist/client (static assets) + dist/server/server.js (SSR handler)
npm start        # runs scripts/serve.mjs — a plain Node HTTP server on $PORT (default 3000)
```

`npm start` reads `PORT` and `HOST` from the environment (defaults `3000` /
`0.0.0.0`) and reads everything else from `.env` if you launch it with
`node --env-file=.env scripts/serve.mjs` (or export the variables another
way — e.g. a systemd `EnvironmentFile`).

**Why a custom `scripts/serve.mjs` instead of a framework-provided server:**
this project's exact TanStack Start + Nitro version combination does not
produce a self-running server from `vite build` alone (`dist/server/server.js`
is just a Web-standard `{ fetch(request) }` handler, nothing opens a port).
The framework's own fix for that, `@tanstack/nitro-v2-vite-plugin`, was
tried and produces a real entry point, but the available beta version has a
bug (`TypeError: Invalid URL`, traced to its bundled `srvx` request adapter
failing to build an absolute URL from a raw Node request — a matching issue
is filed upstream) that makes every real request 500. `scripts/serve.mjs` is
a small, deliberately boring Node `http` server that wraps the same
`{ fetch }` handler directly, serves `dist/client` as static files, and has
no dependency on that adapter working. If a future upgrade fixes the
upstream bug, this file can be retired in favor of the framework's own
preset — until then, this is the supported way to run the app.

Run it under a process manager so it restarts on crash/reboot. Simplest is
systemd:

```ini
# /etc/systemd/system/growth-compass.service
[Unit]
Description=Growth Compass
After=network.target postgresql.service

[Service]
Type=simple
User=growthcompass
WorkingDirectory=/home/growthcompass/growth-compass
EnvironmentFile=/home/growthcompass/growth-compass/.env
Environment=NODE_ENV=production
Environment=PORT=3000
ExecStart=/usr/bin/node scripts/serve.mjs
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now growth-compass
sudo systemctl status growth-compass
```

**Don't test sign-up/sign-in yet if TLS isn't live.** The session cookie is
set with `secure: true` whenever `NODE_ENV=production` (see
`src/server/functions/auth.ts`), and browsers silently drop `Secure`
cookies over plain HTTP. Signing in before Step 5 is done will *look* like
it works (no error) but the session never actually persists — you just get
bounced back out. Finish Step 5 first, then test auth.

## 5. Reverse proxy + TLS

Point Nginx at the app and let it handle HTTPS:

```nginx
server {
    listen 443 ssl;
    server_name client.example.com;

    ssl_certificate     /etc/letsencrypt/live/client.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/client.example.com/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}

server {
    listen 80;
    server_name client.example.com;
    return 301 https://$host$request_uri;
}
```

`certbot --nginx` will provision and auto-renew the certificate.

## 6. First-run: claim platform admin

1. Sign up for the very first account through the running app (this becomes
   the client's `business_owner`).
2. Go to `/admin`, paste in the `PLATFORM_ADMIN_CLAIM_SECRET` from `.env`,
   click "Claim platform admin". This only works once — the first successful
   claim locks it for good.
3. Immediately after, treat `PLATFORM_ADMIN_CLAIM_SECRET` as compromised —
   it has no further use once an admin exists, so there's no need to rotate
   it, just don't rely on it for anything again.

## 7. Verify the deployment

- Load the public URL — sign-in page renders, correct branding/logo.
- Sign up a test account, confirm the verification email actually arrives
  (real inbox, not Mailpit) — this is the one thing that silently breaks if
  `SMTP_USER`/`SMTP_PASS`/`SMTP_SECURE` are wrong.
- Sign in, confirm the dashboard loads with real (empty) data.
- Check `sudo systemctl status growth-compass` and `journalctl -u
  growth-compass -f` for errors under real traffic.
- Load `/legal/terms` and `/legal/privacy` — before the first real client,
  update the "Last updated" date in both (`src/routes/legal/terms.tsx` and
  `privacy.tsx`) and confirm the terms (fee, refund policy, support window)
  are what you actually intend to honor for this client.

## 8. Updating an existing deployment

```bash
cd growth-compass
git pull
npm ci
npm run db:migrate
npm run build
sudo systemctl restart growth-compass
```

## 9. Backups

Postgres is the only stateful piece (file storage is local disk under
`STORAGE_LOCAL_ROOT` — `scripts/backup.sh` backs that up too if it's set
and non-empty). A single-VM setup has no redundancy on its own, so
**off-VM backups aren't optional** — do this before the client's real data
starts flowing in, not after something goes wrong. This matters more than
it might look: Oracle's Always Free tier reclaims idle compute instances
after 7 days of low CPU/network/memory usage, and can terminate an entire
account after 30 days of inactivity — a quiet client's box can genuinely
get deleted out from under them with no warning.

### 9a. Create the backup bucket (Oracle Cloud)

1. OCI Console → **Storage → Object Storage & Archive Storage → Buckets**
   → **Create Bucket**. Name it something like `<client>-backups`, leave
   the rest default → **Create**.
2. Note your **Object Storage namespace** (Console → your profile menu →
   **Tenancy: <name>** → shown on that page) and the **region** you're in
   (e.g. `ap-mumbai-1`) — both go into `.env` below.
3. Generate a **Customer Secret Key** (this is what makes Object Storage
   speak the S3-compatible API `scripts/backup.sh` uses): Console → profile
   menu → **My profile** → **Customer Secret Keys** → **Generate Secret
   Key**. Copy the key immediately — like the EC2 key pair, it's shown once.

### 9b. Wire it up on the VM

Install the AWS CLI (works against any S3-compatible API, not just AWS):

```bash
sudo apt install -y awscli
```

Add these to `.env`, alongside the app's own variables:

```
BACKUP_S3_BUCKET=<client>-backups
BACKUP_S3_ENDPOINT=https://<namespace>.compat.objectstorage.<region>.oci.customer-oci.com
BACKUP_S3_REGION=<region>
AWS_ACCESS_KEY_ID=<the Customer Secret Key's access key>
AWS_SECRET_ACCESS_KEY=<the Customer Secret Key's secret key>
```

Test it once by hand before automating anything:

```bash
cd ~/growth-compass
set -a; source .env; set +a
bash scripts/backup.sh
```

That should print `[backup] done` and the object(s) should now be visible
in the OCI bucket. If it fails, the error is almost always the endpoint URL
(check the namespace/region are right) or the AWS CLI not picking up the
credentials — `aws configure` interactively as a fallback if `.env` env
vars aren't being read as expected in your shell.

### 9c. Automate it

```bash
sudo tee /etc/systemd/system/growth-compass-backup.service > /dev/null <<'EOF'
[Unit]
Description=Growth Compass — backup to object storage

[Service]
Type=oneshot
User=ubuntu
WorkingDirectory=/home/ubuntu/growth-compass
EnvironmentFile=/home/ubuntu/growth-compass/.env
ExecStart=/bin/bash scripts/backup.sh
EOF

sudo tee /etc/systemd/system/growth-compass-backup.timer > /dev/null <<'EOF'
[Unit]
Description=Run growth-compass-backup daily

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable --now growth-compass-backup.timer
systemctl list-timers growth-compass-backup.timer
```

`Persistent=true` means a backup that was missed while the VM was off
still runs once it's back up, instead of silently waiting for the next
scheduled day. Check it actually ran the next day with `sudo systemctl
status growth-compass-backup.service` and `journalctl -u
growth-compass-backup -n 20`.

Old objects in the bucket aren't cleaned up by this script — set a
**lifecycle rule** on the bucket (OCI Console → the bucket → **Lifecycle
Policy Rules**) to auto-expire objects after however long you want backups
retained (e.g. 30 days), rather than letting them accumulate forever.

## Known non-blocking issue

A React hydration console warning (`Minified React error #418`) can appear
on first paint in production. It's a harmless, self-correcting mismatch
(React silently regenerates the client tree) — every actual code path
(sign-in/out, session cookies, database reads and writes, static assets) has
been verified working end-to-end despite it. Worth revisiting if a future
TanStack Start/React upgrade resolves it, but it is not a launch blocker.
