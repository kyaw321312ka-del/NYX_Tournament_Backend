# Tournament draws

The first manual draw workflow supports single elimination. Only confirmed
registrations (normally confirmed after payment approval) are eligible. Draft
bracket size is generated as the smallest power of two that fits the confirmed
registrations present when the draft is created. The bracket positions remain
empty until assigned.

All admin endpoints require an admin bearer token.

1. List eligible entries:

   `GET /api/admin/tournament-categories/:categoryId/eligible-registrations`

2. Create a draft:

   `POST /api/admin/tournament-categories/:categoryId/draws`

   ```json
   {
     "drawFormat": "SINGLE_ELIMINATION",
     "seedingMethod": "MANUAL"
   }
   ```

3. Assign or replace positions. The `assignments` array is the complete draft
   assignment set; omit a prior assignment to clear it:

   `PUT /api/admin/draws/:drawId/positions`

   ```json
   {
     "assignments": [
       { "registrationId": 41, "bracketPosition": 1 },
       { "registrationId": 44, "bracketPosition": 4 },
       { "registrationId": 52, "bracketPosition": 8 }
     ]
   }
   ```

   Registrations must have been confirmed when the draft was created and must
   still be confirmed in the same tournament category. Each registration and
   each bracket position can be used only once.

4. Publish after assigning at least two entries:

   `POST /api/admin/draws/:drawId/publish`

   Empty positions are treated as byes. Bye winners automatically advance
   through the bracket; matches awaiting played matches remain pending.
   Publishing archives the category's previous published draw.

5. Read the latest admin draw with
   `GET /api/admin/tournament-categories/:categoryId/draws`, or the published
   draw without authentication with
   `GET /api/tournament-categories/:categoryId/draw`.

Create a new draft if additional registrations become confirmed after the
current draft was generated. Draw versions and their assignments are retained.
Match result entry and winner advancement after played matches are not yet
implemented.

Apply the schema migration before using the draw endpoints:

```sh
npx prisma migrate deploy
```
