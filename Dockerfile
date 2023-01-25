FROM node:lts-slim

WORKDIR /app

COPY package*.json ./
RUN ["npm", "ci"]

COPY app/ .
COPY tsconfig.json .
CMD ["npm", "start"]
