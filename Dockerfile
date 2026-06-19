FROM node:22-alpine AS builder
WORKDIR /app
COPY admin-svc/package.json admin-svc/package-lock.json* ./
RUN npm ci
COPY admin-svc/ .
RUN npm run build

FROM node:22-alpine AS runner
WORKDIR /app
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
EXPOSE 3005
CMD ["node", "dist/index.js"]
