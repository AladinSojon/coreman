# Hosting CoreMan from this Windows PC (temporary)

The shop runs on this PC and is published through a **Cloudflare Tunnel** — no router or port changes, HTTPS
included. Good for going live quietly and testing; move to the VPS (`deploy/README.md`) before advertising or
taking online payments.

Private files live in `%USERPROFILE%\.coreman\` (never in the project):

| File | What |
|---|---|
| `host.env` | settings: database, random JWT secret, public URLs, optional `TUNNEL_TOKEN` |
| `admin-login.txt` | the admin password (the sample `admin123` / `demo123` logins are disabled) |
| `public-url.txt` | the current public link |
| `logs\` | backend, shop and tunnel logs |
| `backups\` | database backups |
| `bin\cloudflared.exe` | Cloudflare's tunnel program |

## Every day
Run in PowerShell from the project folder:

| Task | Command |
|---|---|
| Start (backend + shop + tunnel) | `powershell -ExecutionPolicy Bypass -File deploy\windows\start.ps1` |
| Stop | `powershell -ExecutionPolicy Bypass -File deploy\windows\stop.ps1` |
| After pulling new code | `git pull`, then `build.ps1`, then `start.ps1` |
| Back up the database | `powershell -ExecutionPolicy Bypass -File deploy\windows\backup.ps1` |

Keep the PC **on and awake**: Windows Settings → System → Power → set "Sleep" to **Never** when plugged in.
PostgreSQL starts with Windows; after a restart just run `start.ps1` again.

**Daily backup (optional):** Task Scheduler → Create Basic Task → Daily → Start a program:
`powershell.exe` with arguments `-ExecutionPolicy Bypass -File "C:\Users\User\Documents\coreman\deploy\windows\backup.ps1"`.
Copy a backup to Google Drive / a USB drive now and then.

## Temporary link vs your own domain
Without `TUNNEL_TOKEN`, `start.ps1` gives a random `https://<words>.trycloudflare.com` link that **changes
every time** you start it. To use **your domain** permanently (free):

1. Create a free account at **dash.cloudflare.com** → **Add a domain** → enter your domain → Free plan.
2. Cloudflare shows two **nameservers**. In **Hostinger → Domains → your domain → DNS / Nameservers**, choose
   "Change nameservers" and enter those two. (Takes minutes to a few hours.)
3. In Cloudflare: **Zero Trust → Networks → Tunnels → Create a tunnel** → type **Cloudflared** → name it
   `coreman`. Copy the **token** (the long text after `--token` in the install command — don't run that command).
4. In the tunnel's **Public Hostnames**, add:
   - `yourdomain.com` → Service `HTTP` → `localhost:4173`
   - `www.yourdomain.com` → Service `HTTP` → `localhost:4173`
   (Under *Additional settings → HTTP Settings*, set **HTTP Host Header** to `localhost:4173`.)
5. Edit `%USERPROFILE%\.coreman\host.env`:
   ```
   TUNNEL_TOKEN=<the token>
   FRONTEND_URL=https://yourdomain.com
   BACKEND_URL=https://yourdomain.com
   CORS_ORIGINS=https://yourdomain.com,https://www.yourdomain.com
   ```
6. Run `stop.ps1`, then `start.ps1`. Your shop is at `https://yourdomain.com`.

When you later move to the VPS, change the domain's DNS in Cloudflare to the VPS IP (or move the nameservers
back to Hostinger) and follow `deploy/README.md`.

## Moving this PC's data to the VPS later
```powershell
powershell -ExecutionPolicy Bypass -File deploy\windows\backup.ps1
scp $env:USERPROFILE\.coreman\backups\<newest>.dump root@YOUR_VPS_IP:/root/coreman.dump
```
Then on the VPS: `systemctl stop coreman && sudo -u postgres pg_restore --clean --if-exists --no-owner --role=coreman -d coreman /root/coreman.dump && systemctl start coreman`.
