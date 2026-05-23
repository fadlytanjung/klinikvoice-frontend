# 06 — Frontend Deployment `[SPEC]`

> Vite SPA → static assets served by nginx. No Node runtime in production.

## 1. Dockerfile (static build + nginx)

```dockerfile
# frontend/Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
ARG VITE_API_BASE_URL
ARG VITE_APP_ENV
ARG VITE_GOOGLE_CLIENT_ID
RUN npm run build           # → /app/dist (static)

FROM nginx:1.27-alpine AS runtime
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 8080
```

> `VITE_*` values are baked at **build time** (Vite inlines them). Per-env images
> are built with the right `--build-arg`s; there is no runtime env injection.

## 2. nginx.conf

```nginx
server {
  listen 8080;
  root /usr/share/nginx/html;

  # SPA history fallback — every unknown path serves index.html.
  location / {
    try_files $uri $uri/ /index.html;
  }

  # Long-cache fingerprinted assets; never cache index.html.
  location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable";
  }
  location = /index.html {
    add_header Cache-Control "no-cache";
  }
}
```

> API calls go to `VITE_API_BASE_URL` (cross-origin → backend must allow CORS
> from the app origin). If a same-origin setup is preferred, add an
> `location /api/ { proxy_pass ...; }` block and leave `VITE_API_BASE_URL` empty.

## 3. Cloud Run

```bash
gcloud run deploy klinikvoice-frontend \
  --image=asia-southeast1-docker.pkg.dev/$PROJECT_ID/klinikvoice/frontend:$SHA \
  --region=asia-southeast1 \
  --min-instances=0 --max-instances=5 \
  --memory=256Mi --cpu=1 \
  --port=8080 \
  --allow-unauthenticated
```

No env vars / secrets at deploy — config is baked into the image at build
(§1). Rebuild to change `VITE_*`.
