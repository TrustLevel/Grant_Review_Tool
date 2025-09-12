FROM node:18-alpine

WORKDIR /app

COPY package*.json ./

RUN npm ci --only=production

COPY src/ ./src/

# App Runner expects PORT env var
ENV PORT=8000
EXPOSE $PORT

USER node

CMD ["npm", "start"]