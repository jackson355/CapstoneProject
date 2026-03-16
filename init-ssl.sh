#!/bin/bash
# Run this ONCE on a fresh EC2 to get the SSL certificate.
# After this, use: docker compose up -d

set -e

DOMAIN="project.megapixel.sg"
EMAIL="jackson@megapixel.sg"   # <-- change this to your email

echo "==> Step 1: Starting nginx with HTTP-only config..."
# Temporarily disable the HTTPS config
mv nginx/conf.d/app.conf nginx/conf.d/app.conf.disabled
docker compose up -d nginx

echo "==> Step 2: Requesting SSL certificate for $DOMAIN..."
docker compose run --rm --entrypoint certbot certbot certonly \
  --webroot \
  -w /var/www/certbot \
  -d "$DOMAIN" \
  --email "$EMAIL" \
  --agree-tos \
  --no-eff-email

echo "==> Step 3: Restoring HTTPS nginx config..."
mv nginx/conf.d/app.conf.disabled nginx/conf.d/app.conf
rm nginx/conf.d/app.init.conf

echo "==> Step 4: Starting all services..."
docker compose up -d

echo "==> Done! Visit https://$DOMAIN"
