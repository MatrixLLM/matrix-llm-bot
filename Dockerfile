FROM node:lts-slim

WORKDIR /src/

COPY package*.json ./
RUN ["npm", "ci"]

COPY app/ ./app
COPY tsconfig.json .
CMD ["npm", "start"]
