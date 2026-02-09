FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .

# Debug: verify which env files exist and what got baked in
RUN echo "=== ENV FILES IN BUILD ===" && ls -la .env* 2>/dev/null || echo "No .env files found"
RUN echo "=== NEXT_PUBLIC_API_BASE_URL ===" && echo "$NEXT_PUBLIC_API_BASE_URL" && echo "(empty means fallback to /api - this is correct)"

RUN npm run build

EXPOSE 3000
CMD ["npm", "start"]