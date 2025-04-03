# Deployment Guide for CleanSight

This document outlines several ways to deploy CleanSight to production environments.

## Option 1: Vercel (Recommended for Hobby Projects)

Vercel provides a simple, zero-configuration deployment option with a generous free tier.

1. Fork or clone this repository
2. Sign up for a [Vercel account](https://vercel.com/signup) if you don't have one
3. Install the Vercel CLI: `npm i -g vercel`
4. From the project directory, run: `vercel`
5. Follow the prompts to deploy

Alternatively, use the "Deploy with Vercel" button in the README.

**Pros:**
- Zero configuration
- Free tier available
- Automatic HTTPS
- Global CDN

**Cons:**
- Limited customization for advanced use cases
- May require upgrade for high traffic

## Option 2: Docker (Recommended for Self-Hosting)

Deploy using Docker for more control and flexibility:

```bash
# Clone the repository
git clone https://github.com/your-username/cleansight.git
cd cleansight

# Build and start the Docker container
docker-compose up -d
```

For manual Docker deployment:

```bash
# Build the image
docker build -t cleansight .

# Run the container
docker run -d -p 80:8080 --name cleansight cleansight
```

**Pros:**
- Full control over infrastructure
- Predictable running environment
- Easy horizontal scaling
- Suitable for private networks

**Cons:**
- Requires server management
- Manual SSL setup needed

## Option 3: Cloud Run / App Engine (Recommended for Production)

For a managed container solution with automatic scaling:

### Google Cloud Run

1. Install the [Google Cloud SDK](https://cloud.google.com/sdk/docs/install)
2. Authenticate: `gcloud auth login`
3. Set your project: `gcloud config set project YOUR_PROJECT_ID`
4. Build and deploy:

```bash
# Build the container
gcloud builds submit --tag gcr.io/YOUR_PROJECT_ID/cleansight

# Deploy to Cloud Run
gcloud run deploy cleansight \
  --image gcr.io/YOUR_PROJECT_ID/cleansight \
  --platform managed \
  --allow-unauthenticated \
  --region us-central1
```

**Pros:**
- Auto-scaling
- Pay only for what you use
- Managed SSL
- Zero server management

**Cons:**
- Cloud vendor lock-in
- Potential cold start issues

## Environment Variables

The following environment variables can be configured:

| Variable | Description | Default |
|----------|-------------|---------|
| PORT | Port the server listens on | 3333 locally, 8080 in Docker |
| NODE_ENV | Environment mode | development |
| CACHE_TTL | Cache TTL in seconds | 3600 (1 hour) |
| RATE_LIMIT_WINDOW | Rate limit window in ms | 900000 (15 minutes) |
| RATE_LIMIT_MAX | Max requests per window | 100 |

## Monitoring & Logs

CleanSight uses Winston for logging. In production, you can:

1. Forward logs to a service like Datadog, LogDNA, or Papertrail
2. Use Docker's logging driver
3. Monitor application metrics with Prometheus/Grafana

## Performance Tuning

For high-traffic instances:

1. Increase the cache TTL
2. Implement a Redis cache instead of in-memory cache
3. Deploy behind a CDN like Cloudflare
4. Use horizontal scaling with a load balancer