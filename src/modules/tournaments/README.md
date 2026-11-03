# Tournament API

All tournament routes are mounted at `/api/tournaments`.

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/` | List published tournaments; an authenticated owner also sees their drafts |
| `GET` | `/:id` | Get a published tournament; an authenticated owner may also view their draft |
| `POST` | `/` | Create a draft tournament (bearer token required) |
| `PUT` | `/:id` | Update an owned draft (bearer token required) |
| `PUT` | `/:id/banner` | Upload or replace an owned draft's banner (bearer token required) |
| `POST` | `/:id/publish` | Publish an owned draft (bearer token required) |
| `DELETE` | `/:id` | Delete an owned tournament (bearer token required) |

Creation accepts `title`, `startDate`, and `endDate`. Optional fields are
`entryFee`, `bannerUrl`, `description`, `rankingPointsPool`, `venues`, `rules`,
and `categories`. A category accepts `pairingType` (`singles`, `doubles`, or
`mixed_doubles`), `entryStatus` (`open`, `closing_soon`, or `closed`), and
optional `pointTiers`.

Upload or replace a banner with `PUT /api/tournaments/:id/banner`. Send
`multipart/form-data` with a `banner` file field. JPEG, PNG, and WebP files up
to 10 MB are accepted. The file is stored in `uploads/tournament-banners`, and
the tournament's `bannerUrl` is set to its public URL under
`/uploads/tournament-banners/`. Only draft tournaments can be edited.

List queries accept `page` (default `1`) and `pageSize` (default `20`, maximum
`100`). Apply migrations with `npm exec prisma -- migrate deploy`.

## Player profile images

Authenticated players can upload or replace their profile image with
`PUT /api/users/me/profile-image`. Send `multipart/form-data` with a
`profileImage` file field. JPEG, PNG, and WebP files up to 5 MB are accepted.
The image is stored locally in `uploads/player-profiles`, and the user's
`profileImageUrl` contains its public URL under `/uploads/player-profiles/`.

Identity documents can be uploaded separately with
`PUT /api/users/me/identity-documents`. Send `multipart/form-data` with one or
both file fields, `frontIdImg` and `backIdImg`. JPEG, PNG, and WebP files up to
10 MB each are accepted. They are stored privately in
`uploads/identity-documents`; only generated filenames are stored in the
existing user columns. These files are not served from a public static route.
