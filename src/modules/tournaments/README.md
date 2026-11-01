# Tournament API

All tournament routes are mounted at `/api/tournaments`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | List published tournaments; an authenticated owner also sees their drafts |
| `GET` | `/:id` | Get a published tournament; an authenticated owner may also view their draft |
| `POST` | `/` | Create a draft tournament (bearer token required) |
| `PUT` | `/:id` | Update an owned draft (bearer token required) |
| `POST` | `/:id/publish` | Publish an owned draft (bearer token required) |
| `DELETE` | `/:id` | Delete an owned tournament (bearer token required) |

Creation accepts `title`, `startDate`, and `endDate`. Optional fields are
`entryFee`, `bannerUrl`, `description`, `rankingPointsPool`, `venues`, `rules`,
and `categories`. A category accepts `pairingType` (`singles`, `doubles`, or
`mixed_doubles`), `entryStatus` (`open`, `closing_soon`, or `closed`), and
optional `pointTiers`.

List queries accept `page` (default `1`) and `pageSize` (default `20`, maximum
`100`). Apply migrations with `npm exec prisma -- migrate deploy`.
