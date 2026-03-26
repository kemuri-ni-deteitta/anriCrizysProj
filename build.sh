#!/bin/bash
set -e

PYTHON_VERSION="3.10.11"
PYTHON_SHORT="310"
EMBED_DIR="backend/python-embed"

echo "=== Шаг 1: Скачиваем портативный Python для Windows ==="
rm -rf "$EMBED_DIR"
mkdir -p "$EMBED_DIR"
wget -q "https://www.python.org/ftp/python/${PYTHON_VERSION}/python-${PYTHON_VERSION}-embed-amd64.zip" -O /tmp/python-embed.zip
unzip -q /tmp/python-embed.zip -d "$EMBED_DIR"

echo "=== Шаг 2: Настраиваем site-packages ==="
mkdir -p "$EMBED_DIR/Lib/site-packages"
# Включаем поддержку site-packages в портативном Python
sed -i 's/#import site/import site/' "$EMBED_DIR/python${PYTHON_SHORT}._pth"
echo "Lib\\site-packages" >> "$EMBED_DIR/python${PYTHON_SHORT}._pth"

echo "=== Шаг 3: Устанавливаем зависимости для Windows ==="
pip install \
  --platform win_amd64 \
  --target "$EMBED_DIR/Lib/site-packages" \
  --implementation cp \
  --python-version ${PYTHON_SHORT} \
  --only-binary=:all: \
  -r backend/requirements.txt

echo "=== Шаг 4: Собираем Electron установщик ==="
cd frontend
npm run package:win

echo ""
echo "=== Готово! Установщик в папке frontend/dist/ ==="
