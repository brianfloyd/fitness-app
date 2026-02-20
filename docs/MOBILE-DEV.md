# Mobile Access to Dev Server

Use this when you get **"site can't be reached"** on your phone when opening the dev server URL.

## Checklist

1. **Same Wi‑Fi**  
   Phone and PC must be on the same Wi‑Fi network (not cellular, not guest network).

2. **Correct URL**  
   Use the URL shown when you run `start-dev.ps1`, e.g. `https://192.168.1.112:5173`.  
   The IP is your PC’s local address; it can change (e.g. after reboot). Restart the script to see the current IP.

3. **Windows Firewall**  
   Allow inbound connections on port **5173** so your phone can reach the dev server.

---

## Allow port 5173 in Windows Firewall

Run **PowerShell as Administrator**, then:

```powershell
New-NetFirewallRule -DisplayName "Vite Dev 5173" -Direction Inbound -LocalPort 5173 -Protocol TCP -Action Allow -Profile Private
```

- **Private** = home/work networks (typical for Wi‑Fi at home).  
- To allow on **Domain** as well, add `-Profile Private,Domain`.  
- To remove the rule later:  
  `Remove-NetFirewallRule -DisplayName "Vite Dev 5173"`

---

## If your PC’s IP is not 192.168.1.112

The dev server certificate is valid for `localhost`, `127.0.0.1`, `0.0.0.0`, and `192.168.1.112`. If your PC has a different IP (e.g. `192.168.0.5` or `10.0.0.4`):

1. Open `frontend/vite.config.js`.
2. In the `mkcert({ hosts: [...] })` list, add your current IP (e.g. `'192.168.0.5'`).
3. Restart the frontend dev server.

You can see your IP in the `start-dev.ps1` output or with:

```powershell
Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.InterfaceAlias -notmatch 'Loopback' -and $_.IPAddress -match '^192\.|^10\.' }
```

---

## Certificate on the phone

When you open `https://<your-ip>:5173` on the phone, the browser will warn about the certificate (dev-only, not trusted on the device). Choose **Advanced** (or similar) and **Proceed** so the page loads.

---

## Service worker warning: "Fetch failed (e.g. cert or network on mobile)"

If you see in the console:

- `[Service Worker] Fetch failed (e.g. cert or network on mobile): / TypeError: Failed to fetch`
- `Failed to load resource: 503 (Network Error)` on the document

**Cause:** The service worker tried to load the page or an asset from the network and the request failed. On mobile this is often due to:

1. **Certificate** – You didn’t accept the dev certificate on the phone, or the browser is blocking mixed/secure content.
2. **Network** – Phone and PC aren’t on the same Wi‑Fi, or the firewall is blocking port 5173.
3. **Wrong IP** – The dev server certificate doesn’t include your PC’s current IP (see “If your PC’s IP is not 192.168.1.112” above).

**What to do:** Fix the cause (cert, firewall, same Wi‑Fi, correct IP in `vite.config.js`). After the app has loaded successfully once, the service worker will use a cached copy when the network fails, so reload may still work.
