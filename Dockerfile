# Single-image build: compiles the web app and serves it from the API process
# on one port. This is a prototype container (documented as not production-
# hardened) that demonstrates the app is deployable as one artifact.
FROM node:20-bookworm-slim AS build
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages/shared/package.json packages/shared/
COPY apps/server/package.json apps/server/
COPY apps/web/package.json apps/web/
RUN npm install
COPY . .
RUN npm run build

FROM node:20-bookworm-slim AS runtime
WORKDIR /app
ENV NODE_ENV=production \
    SERVE_WEB=1 \
    PORT=4000 \
    DB_PATH=/app/data/data.db
COPY --from=build /app ./
EXPOSE 4000
# Seed a fresh demo DB on first boot, then serve API + web on :4000.
CMD ["sh", "-c", "mkdir -p /app/data && npm run seed && npm run start -w @platform/server"]
