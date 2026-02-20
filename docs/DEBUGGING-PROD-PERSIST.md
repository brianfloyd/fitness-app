# Debugging production data not persisting

When weight/fat % (or other data) don’t persist after refresh in **production** but work in dev, use the steps below.

## 1. Backend logs (Railway)

In **Railway** → your service → **Logs**, watch for lines prefixed with `[logs]` and `[requireProfileId]`:

- **`[logs] POST`** – When a save is requested: `profileId`, `logDate`, `bodyKeys` (fields received), `weight`, `fat_percent`, `hasFile`.
- **`[logs] POST saved`** – After a successful save: `profileId`, `date`, `weight`, `fat_percent`.
- **`[logs] GET`** – When a log is loaded: `profileId`, `date`, `found` (true/false), and if found then `weight`, `fat_percent`.
- **`[requireProfileId] 401`** – Request rejected due to missing or invalid `X-Profile-Id`.

**What to check:**

- If you never see **`[logs] POST`** when you save → request isn’t reaching the API (e.g. wrong URL, 401 before route).
- If you see **`[requireProfileId] 401`** → frontend isn’t sending a valid profile (session/header issue).
- If **`[logs] POST`** has `bodyKeys: 'none'` or empty → body not parsed (e.g. wrong Content-Type).
- If **`[logs] POST saved`** shows correct values but **`[logs] GET`** shows `found: false` or different `profileId` → same profile not used on load (e.g. different profile id on refresh).

## 2. Frontend debug (browser Console)

In **production**, open DevTools (F12) → **Console**, then:

1. Enable debug logging:
   ```js
   localStorage.setItem('fitness_debug', '1');
   ```
2. Refresh the page, log in, enter weight and fat %, wait for auto-save (or trigger save).
3. Watch for `[fitness]` logs:
   - **fetch** – Each API call: method, URL, `hasProfileId`, `profileId`.
   - **response** – Status code and URL.
   - **saveLog** – Payload sent: `date`, `weight`, `fat_percent`, `hasPhoto`.
   - **saveLog done** – Response after save: `date`, `weight`, `fat_percent`.
   - **getLogByDate** – After load: `weight`, `fat_percent`.

4. Refresh again and see whether **getLogByDate** shows the values you saved.

5. Disable debug when done:
   ```js
   localStorage.removeItem('fitness_debug');
   ```

**What to check:**

- **hasProfileId: false** or **profileId** missing → user/session not set; you may get 401 and land on login.
- **response 401** → backend rejecting (check Railway for `[requireProfileId] 401`).
- **saveLog** shows correct values but **getLogByDate** after refresh shows null → backend not saving or different profile on load (compare with Railway `[logs] POST saved` and `[logs] GET`).

## 3. Network tab

In DevTools → **Network**:

- When you save: find the **POST** to `/api/logs`. Check **Status** (200 vs 401/500), **Request Headers** for **X-Profile-Id**, and **Payload** (or Form Data) for `date`, `weight`, `fat_percent`.
- After refresh: find the **GET** to `/api/logs/YYYY-MM-DD`. Check **Status** and **Response** body for `weight`, `fat_percent`.

This confirms whether the right profile and body are sent and what the server returns.
