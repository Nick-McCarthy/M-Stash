# AWS Amplify Deployment Guide

## Database Setup

This project uses SQLite with an ephemeral filesystem on AWS Amplify. The database is recreated on each deployment.

### Automatic Setup

The build process automatically:
1. Creates the database directory
2. Runs migrations (`db:push`) to create all tables
3. Seeds tags and genres (`db:seed:tags-genres`)

### Demo Data

**Currently seeded:**
- ✅ Tags (10 tags: female-lead, revenge, magic, etc.)
- ✅ Genres (10 genres: Action, Adventure, Comedy, etc.)

**NOT automatically seeded:**
- Movies
- TV Shows
- Comics
- Ebooks
- Users (created via `/setup` page)

### Adding Demo Media

If you want demo media content (movies, TV shows, comics, ebooks) to be available on deployment, you have two options:

1. **Create a comprehensive seed script** that includes sample media data
2. **Manually upload content** after deployment using the settings pages

### Important Notes

⚠️ **SQLite Limitations on Amplify:**
- Database file is **ephemeral** - recreated on each deployment
- Data is **lost** between deployments
- This is fine for demos, but not for production

💡 **For Production:**
Consider migrating to:
- AWS RDS (PostgreSQL/MySQL)
- DynamoDB
- Or use S3 + Lambda for a serverless database solution

### Build Process

The `amplify.yml` file configures the build to:
1. Install dependencies
2. Create database directory
3. Run migrations
4. Seed tags/genres
5. Build Next.js app

The `postbuild` script in `package.json` also runs migrations and seeding as a backup.

### Customizing Demo Data

To customize the demo data, edit `scripts/seed-all.ts`:
- Update placeholder URLs with your actual S3/media URLs
- Add more movies, TV shows, comics, or ebooks
- Modify tags and genres
- Change the demo user credentials

