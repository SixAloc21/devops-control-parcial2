
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
echo " DEVOPS CONTROL - DEPLOY"
echo "=================================="

echo "Commit solicitado: $DEPLOY_TAG"

# Guardar el codigo local sin descartar modificaciones de EC2.
# El compose de produccion permanece separado.
sudo -u ubuntu git -C "$PROJECT_DIR" fetch origin main

# Solo desplegar un commit que pertenezca a main.
sudo -u ubuntu git -C "$PROJECT_DIR" merge-base --is-ancestor "$DEPLOY_TAG" origin/main

# Descargar las imagenes exactas del commit aprobado.
export DEPLOY_TAG

docker compose -f "$COMPOSE_FILE" pull

# Reutilizar el volumen persistente de SQLite.
docker compose -f "$COMPOSE_FILE" up -d --no-build --remove-orphans

# Comprobar el backend.
docker compose -f "$COMPOSE_FILE" exec -T backend \
  node -e "require('http').get('http://127.0.0.1:3000/health',r=>process.exit(r.statusCode===200?0:1)).on('error',()=>process.exit(1))"

# Comprobar el frontend a traves de Nginx.
curl --fail --silent --show-error \
  http://127.0.0.1:8080/health > /dev/null

echo "DEPLOY_SUCCESS"
echo "Commit: $DEPLOY_TAG"
