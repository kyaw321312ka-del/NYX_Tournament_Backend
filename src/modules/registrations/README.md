# Tournament registrations

All registration endpoints except `GET /api/registrations/statuses` require a
bearer access token.

## Singles

Category eligibility is determined by the category code: `MS` is one male
player, `WS` one female player, `MD` two male players, `WD` two female players,
and `XD` one male and one female player. Both accounts must be email-verified.
New account registration accepts `male` or `female`; legacy gender values other
than those are not eligible for these categories.

`POST /api/registrations` creates a pending singles registration for the
authenticated user:

```json
{
  "tournamentCategoryId": 5
}
```

Doubles and mixed-doubles registrations must use partner invitations instead
of being submitted directly.

## Partner invitations

- `POST /api/registrations/partner-invitations` sends an invitation by email.
- `GET /api/registrations/partner-invitations/received?page=1&pageSize=20`
  lists pending invitations received by the authenticated user.
- `GET /api/registrations/partner-invitations/sent?page=1&pageSize=20`
  lists pending invitations sent by the authenticated user.
- `POST /api/registrations/partner-invitations/:id/accept` accepts an
  invitation and creates a pending registration containing both players.
- `POST /api/registrations/partner-invitations/:id/decline` declines an
  invitation (invited player only).
- `POST /api/registrations/partner-invitations/:id/cancel` cancels an
  invitation (inviter only).

Invitation request:

```json
{
  "tournamentCategoryId": 5,
  "partnerEmail": "partner@example.com"
}
```

Both accounts must exist and have verified email addresses. Invitations expire
after 48 hours. The tournament must be published, the category open, and
neither player may already be registered or have another pending partner
invitation in the category.

Invitations use the existing `tournament_partner_invitations` table. Category
row locking serializes registration attempts. A player may have at most one
pending or confirmed registration per category; rejected and cancelled
registrations do not block re-entry. A composite foreign key ensures each
registration member's category matches its registration.

For local Bruno testing, configure `ADMIN_EMAIL` for an existing admin account
and run `npm run seed:registration-tournament`. This creates or reuses the
published `NYX Registration Test Open 2027` tournament with open singles,
doubles, and mixed-doubles categories, and prints their IDs.

Apply the database migration with `npx prisma migrate deploy`.

To audit existing duplicate active memberships, run:

```sql
SELECT registration.tournamentCategoryId, member.user_id, COUNT(*) AS registrations
FROM tournament_registration_members AS member
JOIN tournament_registrations AS registration
  ON registration.id = member.registration_id
JOIN tournament_registration_statuses AS status
  ON status.id = registration.statusId
WHERE status.name IN ('pending', 'confirmed')
GROUP BY registration.tournamentCategoryId, member.user_id
HAVING COUNT(*) > 1;
```

Existing registration history is preserved. New registration and invitation
acceptance requests check pending/confirmed registrations while holding a lock
on the category row, so concurrent requests cannot claim the same category
place.
