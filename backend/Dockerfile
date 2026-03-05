FROM node:22-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --omit=dev

COPY src ./src

ENV NODE_ENV=production
ENV BACKEND_PORT=5007
EXPOSE 5007

CMD ["npm", "run", "start"]

