#!/bin/bash
# Script para commit + deploy automático
cd "$(dirname "$0")"
git add -A
git commit -m "${1:-Atualização do Checklist GERAL}"
git push origin main
vercel --prod --yes
echo "Deploy concluído!"
