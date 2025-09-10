# frontend/Dockerfile
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci || npm i
COPY frontend/ ./
RUN npm run build

FROM nginx:1.27-alpine AS serve
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist/ /usr/share/nginx/html/
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD wget -qO- http://localhost/ || exit 1
