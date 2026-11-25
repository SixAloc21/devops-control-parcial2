
#!/usr/bin/env bash
set -Eeuo pipefail

PROJECT_DIR="/home/ubuntu/devops-control-parcial2"
COMPOSE_FILE="compose.deploy.yaml"

if [ "$#" -ne 1 ]; then
  echo "Uso: deploy-ec2.sh HASH_COMMIT"
  exit 1
fi

DEPLOY_TAG="$1"

if [[ ! "$DEPLOY_TAG" =~ ^[a-f0-9]{40}$ ]]; then
  echo "ERROR: Hash de commit invalido"
  exit 1
fi

cd "$PROJECT_DIR"

echo "=================================="
echo " DEVOPS CONTROL - DEPLOY AUTOMATICO"
echo "=================================="

echo "Commit solicitado: $DEPLOY_TAG"

# Descargar informacion del repositorio como ubuntu.
sudo -u ubuntu git -C "$PROJECT_DIR" fetch origin main

# Impedir que una ejecucion antigua despliegue
# encima de un commit mas reciente.
LATEST_SHA=$(sudo -u ubuntu git -C "$PROJECT_DIR" rev-parse origin/main)

if [ "$LATEST_SHA" != "$DEPLOY_TAG" ]; then
  echo "ERROR: El commit solicitado ya no es el ultimo de main"
  exit 1
fi

# Actualizar archivos sin descartar modificaciones locales.
sudo -u ubuntu git -C "$PROJECT_DIR" merge --ff-only "$DEPLOY_TAG"

# Utilizar las imagenes exactas aprobadas por Playwright.
export DEPLOY_TAG

echo "Descargando imagenes Docker..."
docker compose -f "$COMPOSE_FILE" pull

echo "Actualizando contenedores..."
docker compose -f "$COMPOSE_FILE" up -d --no-build --remove-orphans --wait

echo "Verificando backend y frontend..."

docker compose -f "$COMPOSE_FILE" exec -T backend \
  node -e "require('http').get('http://127.0.0.1:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

curl --fail --silent --show-error \
  http://127.0.0.1:8080/health > /dev/null

echo "=================================="
echo " DEPLOY_SUCCESS"
echo " Commit: $DEPLOY_TAG"
echo "=================================="
