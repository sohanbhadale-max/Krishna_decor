# Krishna Decor cloud sync: Render + Neon

The live cloud workspace uses Render for hosting the Node.js API with the Neon Postgres database.

The architecture is:

    Manager APK / Staff APK / Windows Manager
                    |
                 HTTPS API (Render)
                    |
          Neon Postgres (private credential)

## Safety model

- The apps connect only to the Render HTTPS address (`https://krishna-decor-api.onrender.com/api`). They never receive a database password.
- `DATABASE_URL` is stored as a Render secret environment variable, not in source control or the client apps.
- Passwords are salted and hashed with Node `scrypt`; browser/device sessions are represented by hashes in the database and expire after 12 hours.
- Manager and staff access checks run in the API on every request. A staff login cannot use manager routes.
- API responses disable caching and include content-type, referrer, and frame protections.
- Staff offline submissions carry an idempotency key, so a reconnect cannot create duplicate measurements.
- Keep the original `api/data/krishna-decor.json` and the Windows Hub backups as an independent restore copy.

No internet service is risk-free. Protect the manager password, limit Render/Neon dashboard access to the owner, and do not share the Render or Neon database credentials.

## Deploy to Render

1. **Create Web Service on Render**:
   - Create a new **Web Service** on [Render Dashboard](https://dashboard.render.com).
   - Connect this repository, or deploy using the included `render.yaml` Blueprint.
   - **Build Command**: `npm ci --omit=dev`
   - **Start Command**: `node api/src/cloud-server.js`
   - **Health Check Path**: `/api/health`

2. **Fixed API Address**:
   The apps use this fixed HTTPS address automatically:

       https://krishna-decor-api.onrender.com/api

3. **Render Environment Variables**:
   In the Render Web Service Settings -> Environment:

       DATABASE_URL=<the Neon pooled connection string>
       CORS_ORIGINS=https://localhost,capacitor://localhost,null

   Do not put `DATABASE_URL` in any frontend setting, installer, APK, or source file.

4. **Verify Health**:
   Confirm `https://krishna-decor-api.onrender.com/api/health` returns `{"ok":true}`.

5. **Migrate Local Data (Optional / Once)**:
   Import existing local records once from a trusted computer:

       cd E:\PROJECTS\d-decor
       $env:DATABASE_URL='<the Neon pooled URL>'
       npm run db:migrate-local-data

   The importer only inserts missing IDs; it does not overwrite existing cloud records.

6. **Install and Run**:
   Install the APKs and Windows Manager. They connect automatically to `https://krishna-decor-api.onrender.com/api`; sign in with the manager/staff credentials.

## Operational notes

- Render's free tier can take a short time to wake after inactivity. The staff app keeps queued field submissions safely on device until the API responds.
- Keep a monthly exported copy of the Neon data and the existing Windows backup. Before updates, test on a Neon branch when available.
- If moving from the local Windows Hub, stop editing both data stores independently once the cloud import is completed. The cloud service becomes the single source of truth.
