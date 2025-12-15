# Build stage
FROM node:22-alpine AS builder
WORKDIR /app

ARG DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy"
ARG TEST_DATABASE_URL="postgresql://dummy:dummy@localhost:5432/dummy_test"
ENV DATABASE_URL=$DATABASE_URL
ENV TEST_DATABASE_URL=$TEST_DATABASE_URL

COPY package*.json ./

RUN npm ci

COPY . .

RUN npx prisma generate

RUN npm run build

# Production stage
FROM node:22-alpine AS runner
WORKDIR /app

ENV NODE_ENV=production

COPY --chown=node:node package*.json ./

# Copy node_modules from builder (includes Prisma engines), then remove devDependencies
COPY --chown=node:node --from=builder /app/node_modules ./node_modules
RUN npm prune --production

COPY --chown=node:node --from=builder /app/dist ./dist

COPY --chown=node:node --from=builder /app/prisma/generated ./prisma/generated

USER node

EXPOSE 8000

CMD ["node", "dist/index.mjs"]