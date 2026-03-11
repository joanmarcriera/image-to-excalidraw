FROM node:22-alpine

WORKDIR /app

ENV NODE_ENV=production
ENV HOST=0.0.0.0
ENV PORT=3000

COPY package.json ./
COPY server.mjs ./
COPY lib ./lib
COPY public ./public
COPY examples ./examples

EXPOSE 3000

CMD ["npm", "start"]
