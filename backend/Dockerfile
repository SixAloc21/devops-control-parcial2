
# ============================================
# DEVOPS CONTROL - BACKEND
# Node.js + Express + SQLite
# ============================================

FROM node:24-bookworm-slim

WORKDIR /app

# Herramientas para compilar better-sqlite3
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
    python3 \
    make \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copiar dependencias
COPY package*.json ./

# Instalar dependencias de producción
RUN npm ci --omit=dev

# Copiar código fuente
COPY . .

# Crear directorio de SQLite persistente
RUN mkdir -p /app/data

# Configuración del backend
ENV NODE_ENV=production
ENV PORT=3000
ENV DB_PATH=/app/data/usuarios.db

EXPOSE 3000

# Ejecutar Express
CMD ["node", "server.js"]
