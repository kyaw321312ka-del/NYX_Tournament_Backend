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
`closing_soon`, or `closed`), scoring rules, and optional `pointTiers`.
Scoring defaults to best of three games, first to 21, a two-point winning
margin, and a 30-point cap. Set `pointsToWin` to `15` and `maxPoints` to `21`
for the configurable 15-point format. `pointTiers` configures the ranking
points awarded for final placements; placements without a tier receive no
points. Administrators supply the points; the backend does not hardcode
placement awards.
The shared category catalog is returned by `GET /api/auth/categories`; use its
`categoryCode`, `name`, and `pairingType` as `categoryCode`, `categoryName`,
and `pairingType`. Tournament categories store tournament-specific settings
and refer to that shared catalog.

To restrict a tournament category by age, include an `ageGroup` object on the
category. The shared `age_groups` table stores only `id`, `name`, and the
inclusive maximum `age`. The player's age is calculated on the date they
register; categories without an age group remain unrestricted. For example:

```json
{
  "categoryCode": "MS",
  "categoryName": "Men's Singles",
  "pairingType": "singles",
  "entryFee": 2500,
  "matchFormat": "Best of 3 games",
  "pointsToWin": 21,
  "winningMargin": 2,
  "maxPoints": 30,
  "gamesToWin": 2,
  "pointTiers": [
    { "position": 1, "label": "Champion", "points": 300 }
  ],
  "ageGroup": {
    "name": "U12",
    "age": 12
  },
  "drawConfiguration": {
    "drawFormat": "SINGLE_ELIMINATION",
    "seedingMethod": "MANUAL",
    "thirdPlaceMatch": false
  }
}
```

A player must have a birthday on their profile and be no older than the
group's maximum age when they register or accept a doubles invitation.

For the manual single-elimination draw workflow, including confirmed entrant
selection, position assignment, and publishing, see
[Tournament draws](../draws/README.md). Round robin and group knockout are
deferred.

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

## Age groups

Age groups have public read endpoints and admin-only write endpoints:

| Method | Path | Access | Purpose |
| --- | --- | --- | --- |
| `GET` | `/api/age-groups` | Public | List age groups, sorted by maximum age |
| `GET` | `/api/age-groups/:id` | Public | Get one age group |
| `POST` | `/api/age-groups` | Admin | Create an age group |
| `PUT` | `/api/age-groups/:id` | Admin | Update name or maximum age |
| `DELETE` | `/api/age-groups/:id` | Admin | Delete an unused age group |

Create or update body:

```json
{
  "name": "U12",
  "age": 12
}
```

Updates require at least one field. A name and maximum-age pair must be unique.
An age group cannot be deleted while any tournament category references it.

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
