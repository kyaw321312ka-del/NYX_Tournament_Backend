# Contact & Support

The site-wide contact record can be read publicly:

`GET /api/contact-support`

Admins can create, replace, or delete the singleton record:

- `POST /api/admin/contact-support`
- `PUT /api/admin/contact-support`
- `DELETE /api/admin/contact-support`

Create and update require all four fields:

```json
{
  "phone": "+95 9 123 456 789",
  "website": "www.nyxbadminton.com",
  "email": "support@nyxbadminton.com",
  "address": "73 rd St, Between 102nd & 103rd, Chanmyathazi, Mandalay"
}
```

Admin write routes require an admin bearer token. A deleted singleton returns
404 to public reads until it is recreated. Seed the supplied default values in
development with `npm run seed:contact-support`.
