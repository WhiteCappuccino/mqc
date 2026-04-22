FROM node:24-alpine AS base
WORKDIR /app
COPY package*.json ./
RUN npm install

FROM base AS build
WORKDIR /app
COPY . .
RUN npx prisma generate && npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
COPY package*.json ./
RUN npm install --omit=dev
COPY --from=build /app/dist ./dist
COPY --from=build /app/prisma ./prisma
COPY --from=build /app/node_modules/.prisma ./node_modules/.prisma
COPY docker-entrypoint.sh .
RUN chmod +x docker-entrypoint.sh

EXPOSE 3000
ENTRYPOINT ["./docker-entrypoint.sh"]
