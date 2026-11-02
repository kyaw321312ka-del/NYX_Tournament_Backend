# Tournament registrations

All registration endpoints except `GET /api/registrations/statuses` require a
bearer access token.

## Singles

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

Apply the database migration with `npx prisma migrate deploy`.
