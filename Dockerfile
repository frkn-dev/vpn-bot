FROM node:22-alpine AS builder

WORKDIR /app

COPY package*.json ./
COPY prisma ./prisma 
RUN npm install --include=dev

COPY . .

RUN npx prisma generate 

RUN npm run build

FROM node:22-alpine

WORKDIR /app

COPY --from=builder /app/package*.json ./
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/dist ./dist

COPY prisma ./prisma

CMD ["node", "dist/index.js"]
