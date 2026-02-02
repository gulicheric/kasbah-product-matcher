# Railway Deployment Guide

## Quick Deploy

1. Visit [railway.app](https://railway.app)
2. Sign in with GitHub
3. Click "Deploy from GitHub repo"
4. Select `gulicheric/kasbah-product-matcher`
5. Railway will auto-detect it as a Node.js app

## Required Environment Variables

Set these in Railway dashboard under Variables:

```
OPENAI_API_KEY=your_openai_api_key
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment
PINECONE_INDEX_NAME=your_pinecone_index_name
FIREBASE_PROJECT_ID=your_firebase_project_id
FIREBASE_PRIVATE_KEY=your_firebase_private_key
FIREBASE_CLIENT_EMAIL=your_firebase_client_email
FIREBASE_DATABASE_URL=your_firebase_database_url
REDIS_URL=your_redis_url
GEOHASH_PRECISION=6
DEBUG_MODE=false
```

## After Deployment

1. Railway will provide a public URL (e.g., `https://kasbah-product-matcher-production.up.railway.app`)
2. Test the health endpoint: `GET https://your-railway-url/health`
3. Update the production environment variable in your main Kasbah app from `http://localhost:8080` to your Railway URL

## Health Check

The service includes a health check endpoint at `/health` that Railway uses for monitoring.

## Auto-Deploy

Once connected, Railway will automatically redeploy whenever you push to the `main` branch.