#!/usr/bin/env bash
# Run ON THE VPS as root — one-time server base setup.
# Usage: bash deploy/setup.sh [git-repo-url]
set -euo pipefail

REPO_URL="${1:-}"
APP_DIR="/var/www/logistics-erp"

echo "==> [1/6] Base packages"
export DEBIAN_FRONTEND=noninteractive
apt-get update -y
apt-get install -y curl git ufw ca-certificates gnupg lsb-release jq openssl

echo "==> [2/6] Node.js 22 LTS"
if ! command -v node >/dev/null 2>&1 || [ "$(node -v | sed 's/^v//' | cut -d. -f1)" -lt 20 ]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "==> [3/6] Docker Engine + Compose plugin"
if ! command -v docker >/dev/null 2>&1; then
  curl -fsSL https://get.docker.com | sh
fi
docker compose version

echo "==> [4/6] Nginx + Certbot"
apt-get install -y nginx certbot python3-certbot-nginx

echo "==> [5/6] Firewall (UFW)"
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status verbose

echo "==> [6/6] Directories + repo"
mkdir -p /var/www/certbot /var/www/admin.rudrianlogistics.com
if [ -n "$REPO_URL" ]; then
  if [ -d "$APP_DIR/.git" ]; then
    git -C "$APP_DIR" pull --ff-only
  else
    git clone "$REPO_URL" "$APP_DIR"
  fi
  echo "Repo cloned to $APP_DIR"
else
  echo "NOTE: repo URL nahi diya — baad me clone karna hoga:"
  echo "  git clone <repo-url> $APP_DIR"
fi

cat <<'EOF'

============================================
 Base setup DONE. Next steps:
 1. cd /var/www/logistics-erp   (ya repo clone karo)
 2. First deploy:  SEED=1 bash deploy/deploy.sh
 3. DNS A records set karo (@, www, admin -> server IP)
 4. SSL: certbot --nginx -d rudrianlogistics.com -d www.rudrianlogistics.com
          certbot --nginx -d admin.rudrianlogistics.com
============================================
EOF
