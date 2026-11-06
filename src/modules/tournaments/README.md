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

Creation accepts `title`, `startDate`, and `endDate`. Optional tournament
fields are `bannerUrl`, `description`, `rankingPointsPool`, `venues`, `rules`,
and `categories`. Set `entryFee` on each category (it defaults to `0`), allowing
singles and doubles events to have different prices. A category also accepts
`pairingType` (`singles`, `doubles`, or `mixed_doubles`), `entryStatus` (`open`,
`closing_soon`, or `closed`), and optional `pointTiers`.

Create or update a tournament with its banner in the same request by sending
`multipart/form-data` to `POST /api/tournaments` or `PUT
/api/tournaments/:id`. Include a `tournament` text field containing the JSON
request body, and optionally include a `banner` file field. JPEG, PNG, and WebP
files up to 10 MB are accepted. The file is stored in
`uploads/tournament-banners`, and `bannerUrl` is set to its public URL under
`/uploads/tournament-banners/`. Existing JSON requests without a file remain
supported. Only draft tournaments can be edited.

In Bruno, choose **Body → Multipart Form**, add `tournament` as a text field
containing the same JSON object used by the JSON API, then add `banner` as a
file field. The `banner` field is optional. Do not manually set the multipart
`Content-Type` header.

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
