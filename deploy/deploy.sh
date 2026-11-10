#!/usr/bin/env bash
# Full build + restart. Safe to re-run any time (idempotent).
# Usage:
#   bash deploy/deploy.sh            # normal deploy
#   SEED=1 bash deploy/deploy.sh     # first deploy (also seeds DB)
set -euo pipefail

cd "$(dirname "$0")/.."
APP_DIR="$(pwd)"
cd "$APP_DIR"

echo "==> App dir: $APP_DIR"

# ---------- 0. Secrets / env files ----------
if [ ! -f deploy/.env ]; then
  echo "==> Creating deploy/.env with generated MySQL passwords"
  ROOT_PW="$(openssl rand -hex 14)"
  DB_PW="$(openssl rand -hex 14)"
  printf 'MYSQL_ROOT_PASSWORD=%s\nMYSQL_PASSWORD=%s\n' "$ROOT_PW" "$DB_PW" > deploy/.env
  chmod 600 deploy/.env
fi

if [ ! -f server/.env ]; then
  echo "==> server/.env missing — creating from production example"
  cp server/.env.production.example server/.env
  # Inject real MySQL password from deploy/.env
  DB_PW="$(grep '^MYSQL_PASSWORD=' deploy/.env | cut -d= -f2)"
  sed -i "s|logistics:CHANGE_ME@|logistics:${DB_PW}@|" server/.env
  # Generate JWT secrets
  ACCESS_PW="$(openssl rand -hex 32)"
  REFRESH_PW="$(openssl rand -hex 32)"
  sed -i "s|^JWT_ACCESS_SECRET=.*|JWT_ACCESS_SECRET=${ACCESS_PW}|" server/.env
  sed -i "s|^JWT_REFRESH_SECRET=.*|JWT_REFRESH_SECRET=${REFRESH_PW}|" server/.env
  chmod 600 server/.env
  echo "==> server/.env created (DB password + JWT secrets auto-generated)"
fi

# ---------- 1. Dependencies (builds FIRST — MySQL ke pehle, RAM bachane ke liye) ----------
echo "==> npm ci (workspaces)"
npm ci

# ---------- 2. API build ----------
echo "==> Building API (tsup + prisma generate)"
npm run db:generate -w server
npm run build -w server

# ---------- 3. Website build (production URLs) ----------
export NEXT_PUBLIC_API_URL="${NEXT_PUBLIC_API_URL:-https://rudrianlogistics.com/api/v1}"
export NEXT_PUBLIC_SOCKET_URL="${NEXT_PUBLIC_SOCKET_URL:-https://rudrianlogistics.com}"
echo "==> Building Website (NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL)"
NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}" npm run build -w website

# ---------- 4. Main ERP build (production URLs) ----------
export VITE_API_BASE_URL="${VITE_API_BASE_URL:-https://rudrianlogistics.com/api/v1}"
export VITE_SOCKET_URL="${VITE_SOCKET_URL:-https://rudrianlogistics.com}"
echo "==> Building Main ERP (VITE_API_BASE_URL=$VITE_API_BASE_URL)"
npm run build -w erp-web

echo "==> Publishing ERP dist -> /var/www/admin.rudrianlogistics.com"
mkdir -p /var/www/admin.rudrianlogistics.com
find /var/www/admin.rudrianlogistics.com -mindepth 1 -delete
cp -r "Main ERP/dist/." /var/www/admin.rudrianlogistics.com/
chown -R www-data:www-data /var/www/admin.rudrianlogistics.com || true

# ---------- 5. Data layer (MySQL + Redis) ----------
echo "==> Starting MySQL + Redis (Docker)"
docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env up -d

echo "==> Waiting for MySQL..."
for i in $(seq 1 60); do
  if docker exec logistics-mysql mysqladmin ping -h localhost --silent >/dev/null 2>&1; then
    echo "MySQL is up"
    break
  fi
  [ "$i" = 60 ] && { echo "MySQL did not come up in time"; exit 1; }
  sleep 2
done

# ---------- 6. DB migrate + seed ----------
echo "==> Prisma migrate deploy"
npm run db:deploy -w server

if [ "${SEED:-0}" = "1" ]; then
  echo "==> Seeding DB (SEED=1)"
  npm run db:seed -w server
else
  echo "==> Skipping seed (run with SEED=1 on first deploy)"
fi

# ---------- 7. PM2 ----------
echo "==> Starting apps under PM2"
command -v pm2 >/dev/null 2>&1 || npm install -g pm2
if pm2 describe api >/dev/null 2>&1; then
  pm2 reload ecosystem.config.js --update-env
else
  pm2 start ecosystem.config.js
fi
pm2 save

if ! systemctl is-enabled pm2-root >/dev/null 2>&1; then
  echo "==> Enabling PM2 startup on boot"
  pm2 startup systemd -u root --hp /root >/tmp/pm2-startup.txt 2>&1 || true
  STARTUP_CMD="$(sed -n 's/^sudo //p' /tmp/pm2-startup.txt | tail -1)"
  if [ -n "$STARTUP_CMD" ]; then
    bash -c "$STARTUP_CMD" || true
  fi
fi

# ---------- 8. Daily DB backup cron ----------
if ! crontab -l 2>/dev/null | grep -q "logistics-backup"; then
  echo "==> Installing daily mysqldump cron"
  cat >/usr/local/bin/logistics-backup.sh <<'BKP'
#!/usr/bin/env bash
set -euo pipefail
mkdir -p /var/backups/logistics-erp
TS="$(date +%F_%H%M)"
docker exec logistics-mysql sh -c 'exec mysqldump -u"$MYSQL_USER" -p"$MYSQL_PASSWORD" "$MYSQL_DATABASE"' \
  | gzip > "/var/backups/logistics-erp/db_$TS.sql.gz"
find /var/backups/logistics-erp -name 'db_*.sql.gz' -mtime +7 -delete
BKP
  chmod +x /usr/local/bin/logistics-backup.sh
  (crontab -l 2>/dev/null; echo "0 3 * * * /usr/local/bin/logistics-backup.sh # logistics-backup") | crontab -
fi

echo ""
echo "============================================"
echo " DEPLOY DONE"
echo "  API     : pm2 logs api"
echo "  Website : pm2 logs website"
echo "  Health  : curl http://127.0.0.1:4000/api/v1/health"
echo "  (Nginx + SSL: see setup.sh next-steps)"
echo "============================================"
