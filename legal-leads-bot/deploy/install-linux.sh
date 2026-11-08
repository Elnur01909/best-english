#!/usr/bin/env bash
# Legal Leads Bot — Linux serverdə (Oracle Cloud Always Free, VPS) 24 saat işləmə.
# İstifadə:  bash deploy/install-linux.sh
# Nə edir: virtual mühit + asılılıqlar → interaktiv setup (token, çat, Claude açarı) → systemd xidməti.
set -euo pipefail
cd "$(dirname "$0")/.."
APP_DIR="$(pwd)"

if ! command -v python3 >/dev/null; then
  echo "python3 tapılmadı. Ubuntu/Debian: sudo apt-get install -y python3 python3-venv" >&2
  exit 1
fi

python3 -m venv .venv
.venv/bin/pip install --disable-pip-version-check -q -r requirements.txt

if ! grep -qE '^TELEGRAM_CHAT_ID=.+' .env 2>/dev/null; then
  .venv/bin/python -m leadsbot setup
fi

sudo tee /etc/systemd/system/leadsbot.service >/dev/null <<UNIT
[Unit]
Description=Legal Leads Telegram bot
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=$(id -un)
WorkingDirectory=${APP_DIR}
ExecStart=${APP_DIR}/.venv/bin/python -m leadsbot serve
Restart=always
RestartSec=15

[Install]
WantedBy=multi-user.target
UNIT

sudo systemctl daemon-reload
sudo systemctl enable --now leadsbot
echo
echo "Hazırdır. Status:   sudo systemctl status leadsbot"
echo "Loglar:            journalctl -u leadsbot -f   (və ya data/leadsbot.log)"
echo "Yeniləmədən sonra: sudo systemctl restart leadsbot"
