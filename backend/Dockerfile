FROM node:20-alpine AS build

RUN apk update && apk add --no-cache \
    build-base \
    gcc \
    autoconf \
    automake \
    zlib-dev \
    libpng-dev \
    vips-dev \
    git \
    > /dev/null

WORKDIR /opt/app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
ENV NODE_ENV=production
RUN npm run build && npm prune --omit=dev

FROM node:20-alpine AS production

RUN apk add --no-cache vips-dev > /dev/null

WORKDIR /opt/app
ENV NODE_ENV=production
COPY --from=build /opt/app ./
EXPOSE 1337
CMD ["npm", "run", "start"]
