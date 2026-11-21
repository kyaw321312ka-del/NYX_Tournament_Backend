# Tournament draws

The current draw workflow supports `SINGLE_ELIMINATION` only. It uses manual
seeding and requires confirmed registrations (normally confirmed after payment
approval). Drafts create the empty bracket structure first; admins then assign
eligible registrations to its positions.

Admins configure category scoring rules and placement point tiers through
`POST /api/tournaments` or `PUT /api/tournaments/:id`. The scoring settings
are snapshotted when the draw is created, so results use the same rules even
if category settings later change.

For development testing, `npm run seed:eligible-registrations` adds 15 more
confirmed, paid test registrations to the seeded tournament category without
creating or changing a draw. The new accounts are
`nyx.seed.player.36@example.test` through `nyx.seed.player.50@example.test`.
It requires `SEED_TEST_DATA=true`, an existing `ADMIN_EMAIL`, and
`TEST_USERS_PASSWORD` in the local environment, and refuses to run in production.

`npm run seed:doubles-tournament` adds 15 confirmed, paid men's-doubles team
registrations (30 test players) to the same test tournament. It creates or
updates the men's-doubles category but does not create a draw. The accounts use
`nyx.seed.doubles.player.01@example.test` through
`nyx.seed.doubles.player.30@example.test` and the local
`TEST_USERS_PASSWORD`.

Use `npm run seed:doubles-tournament-with-results` to create or reuse and publish
the 16-position doubles draw, assign its teams, and generate synthetic results
for every playable match. It leaves the draw unfinalized. The command is
idempotent and preserves results that already exist.

After publishing the seeded draw, `npm run seed:match-results` adds synthetic
scores to its remaining playable matches. It preserves results already entered,
uses the draw's scoring-rule snapshot, and does not finalize the draw. It
requires `SEED_TEST_DATA=true` and refuses to run in production.

All admin endpoints require an admin bearer token.

0. Read supported draw options and a category's saved configuration:

   `GET /api/draw-configurations/options`

   `GET /api/admin/draw-configurations`

   `GET /api/admin/tournament-categories/:categoryId/draw-configuration`

   The first response lists supported formats and seeding methods. The second
   lists every saved category draw configuration. The third returns the saved
   configuration row for one tournament category.

1. List eligible entries:

   `GET /api/admin/tournament-categories/:categoryId/eligible-registrations`

2. Create a draft:

   `POST /api/admin/tournament-categories/:categoryId/draws`

   A category can use its stored `drawConfiguration`; no JSON body is required.
   If sent, the legacy body may specify the supported manual single-elimination
   values:

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
   When `thirdPlaceMatch` is enabled, the bracket also creates a bronze match
   between the two semifinal losers. The third-place match appears in its own
   round, is included in match-result entry, and must be completed before
   tournament results can be finalized. Third-place winner is placement 3;
   third-place loser is placement 4.

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
   Finalization is terminal for the tournament category: creating another
   draft for that category is rejected after results have been finalized.

7. Read the latest admin draw with
   `GET /api/admin/tournament-categories/:categoryId/draws`, or the published
   draw without authentication with
   `GET /api/tournament-categories/:categoryId/draw`.

8. Read the public category leaderboard after finalizing the published draw:

   `GET /api/tournament-categories/:categoryId/leaderboard`

   The response lists players with configured ranking-point awards, ordered
   by points and placement. It is public and does not require an admin token.
   A leaderboard is unavailable until the published draw is finalized.

Round-robin and group-knockout formats are deferred.
