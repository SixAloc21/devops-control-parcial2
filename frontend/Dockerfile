
# ============================================
# DEVOPS CONTROL - FRONTEND
# React + Vite + Nginx
# ============================================

# ETAPA 1: Compilar React
FROM node:24-alpine AS build

WORKDIR /app

COPY package*.json ./

RUN npm ci

COPY . .

RUN npm run build

# ============================================
# ETAPA 2: Servir React con Nginx
# ============================================

FROM nginx:stable-alpine

COPY --from=build /app/dist /usr/share/nginx/html

COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
