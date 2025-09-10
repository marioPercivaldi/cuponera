# ---- Build: Node ----
FROM node:20-alpine AS build
WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
# Si usas Tailwind v4/Vite, este comando compila a /app/dist
RUN npm run build

# ---- Serve: Nginx ----
FROM nginx:1.27-alpine AS serve
# Limpio defaults y copio build
RUN rm -rf /usr/share/nginx/html/*
COPY --from=build /app/dist/ /usr/share/nginx/html/
# Copio conf custom que hace proxy al backend
COPY nginx/nginx.conf /etc/nginx/conf.d/default.conf

# Salud
HEALTHCHECK --interval=30s --timeout=5s --retries=5 CMD wget -qO- http://localhost/ || exit 1
