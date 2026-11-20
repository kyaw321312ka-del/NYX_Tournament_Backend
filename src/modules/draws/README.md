# Tournament draws

The current draw workflow supports `SINGLE_ELIMINATION` only. It uses manual
seeding and requires confirmed registrations (normally confirmed after payment
approval). Drafts create the empty bracket structure first; admins then assign
eligible registrations to its positions.

Admins configure category scoring rules and placement point tiers through
`POST /api/tournaments` or `PUT /api/tournaments/:id`. The scoring settings
are snapshotted when the draw is created, so results use the same rules even
if category settings later change.

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

3. Assign or replace positions. The `assignments` array is the complete set of
   draft assignments; omit a prior assignment to clear it:

   `PUT /api/admin/draws/:drawId/positions`

   ```json
   {
     "assignments": [
       { "registrationId": 41, "bracketPosition": 1 },
       { "registrationId": 44, "bracketPosition": 4 }
     ]
   }
   ```

   Each registration and bracket position may be used only once.

4. Publish:

   `POST /api/admin/draws/:drawId/publish`

   Empty positions are byes, and bye winners advance automatically.

5. Submit completed match games. Game scores are validated against the scoring
   rules snapshotted from the tournament category when the draw was created:

   `PUT /api/admin/draws/:drawId/matches/:matchId/result`

   ```json
   {
     "games": [
       { "gameNumber": 1, "participant1Score": 21, "participant2Score": 18 },
       { "gameNumber": 2, "participant1Score": 19, "participant2Score": 21 },
       { "gameNumber": 3, "participant1Score": 21, "participant2Score": 15 }
     ]
   }
   ```

   The winner advances into the next round automatically. A game must reach
   `pointsToWin` and the configured margin, unless the winner reaches
   `maxPoints`, where the next point wins.

6. Finalize after every playable match is completed:

   `POST /api/admin/draws/:drawId/finalize-results`

   Configured `pointTiers` are awarded by final placement. In doubles, both
   registration members receive the placement points. Unconfigured placements
   receive no award, and a player cannot be awarded twice for the same
   tournament category.

   Read the recorded award history with
   `GET /api/admin/tournament-categories/:categoryId/ranking-point-awards`.

7. Read the latest admin draw with
   `GET /api/admin/tournament-categories/:categoryId/draws`, or the published
   draw without authentication with
   `GET /api/tournament-categories/:categoryId/draw`.

Round-robin and group-knockout formats are deferred.
