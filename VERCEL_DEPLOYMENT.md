# Vercel Deployment Guide

## Quick Deploy

### Option 1: Deploy via Vercel CLI (Recommended)

1. **Login to Vercel:**
   ```bash
   vercel login
   ```

2. **Link your project:**
   ```bash
   vercel link
   ```
   - Select your Vercel account/team
   - Choose to link to an existing project or create a new one

3. **Set environment variables:**
   ```bash
   vercel env add NEXTAUTH_SECRET
   vercel env add S3_ACCESS_KEY_ID
   vercel env add S3_SECRET_ACCESS_KEY
   vercel env add S3_BUCKET_NAME
   vercel env add S3_REGION
   ```
   - Or set them via Vercel Dashboard: Project → Settings → Environment Variables

4. **Deploy:**
   ```bash
   vercel --prod
   ```

### Option 2: Deploy via GitHub Integration

1. **Connect your GitHub repo:**
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New..." → "Project"
   - Import your GitHub repository

2. **Configure the project:**
   - Framework Preset: **Next.js** (auto-detected)
   - Build Command: `npm run db:push && npm run build` (already in `vercel.json`)
   - Install Command: `npm ci` (already in `vercel.json`)
   - Root Directory: `./` (default)

3. **Add Environment Variables:**
   - Go to Project → Settings → Environment Variables
   - Add the following:
     ```
     NEXTAUTH_SECRET=your-secret-here
     S3_ACCESS_KEY_ID=your-access-key
     S3_SECRET_ACCESS_KEY=your-secret-key
     S3_BUCKET_NAME=your-bucket-name
     S3_REGION=us-east-1
     ```

4. **Deploy:**
   - Click "Deploy"
   - Vercel will automatically deploy on every push to your main branch

## Environment Variables

Required environment variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `NEXTAUTH_SECRET` | Secret for NextAuth.js sessions | Generate with: `openssl rand -base64 32` |
| `S3_ACCESS_KEY_ID` | AWS S3 Access Key ID | `AKIAIOSFODNN7EXAMPLE` |
| `S3_SECRET_ACCESS_KEY` | AWS S3 Secret Access Key | `wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY` |
| `S3_BUCKET_NAME` | Your S3 bucket name | `my-media-library-bucket` |
| `S3_REGION` | AWS region for S3 bucket | `us-east-1` |

## Database Setup

The database is automatically initialized on first app start:

1. **Build time:** Database schema is created via `db:push` during build
2. **Runtime:** Database is seeded automatically on first request via `/api/init/seed`

This means:
- ✅ No build-time seeding (faster builds)
- ✅ Database seeds automatically when the app first starts
- ⚠️ Database is **ephemeral** - data is lost on each deployment (same as Amplify)

## Important Notes

### SQLite on Vercel

⚠️ **SQLite Limitations:**
- Database file is **ephemeral** - recreated on each deployment
- Data is **lost** between deployments
- This is fine for demos, but **not for production**

💡 **For Production:**
Consider migrating to:
- **Vercel Postgres** (recommended for Vercel)
- **PlanetScale** (MySQL)
- **Supabase** (PostgreSQL)
- **Neon** (PostgreSQL)

### Build Configuration

The `vercel.json` file configures:
- Build command: Runs database migrations before building
- Install command: Uses `npm ci` for faster, reliable installs
- Framework: Next.js (auto-detected, but explicit for clarity)

### Custom Domain

After deployment, you can add a custom domain:
1. Go to Project → Settings → Domains
2. Add your domain
3. Follow DNS configuration instructions

## Troubleshooting

### Build Fails

- Check that all environment variables are set
- Verify `better-sqlite3` is in `dependencies` (not `devDependencies`)
- Check build logs in Vercel Dashboard

### Database Not Seeding

- Check Vercel function logs for `/api/init/seed` errors
- Verify database directory is writable (should be automatic)
- Check that `SeedInitializer` component is in your root layout

### S3 Uploads Not Working

- Verify S3 credentials are correct
- Check S3 bucket CORS configuration
- Ensure bucket policy allows public reads (if needed)

## Local Testing

Test the production build locally:

```bash
# Build the project
npm run db:push
npm run build

# Start production server
npm start
```

## Updating Deployment

After making changes:

```bash
# Via CLI
vercel --prod

# Or push to GitHub (if connected)
git push origin main
```

