#!/bin/bash

# =============================================================================
# Script de verificación rápida antes de desplegar
# Ejecutar en: /home/ronald/Documentos/project-hibridos/sistema-de-asistencia/server
# =============================================================================

echo "════════════════════════════════════════════════════════════════════"
echo "  🔍 VERIFICACIÓN PRE-DESPLIEGUE"
echo "════════════════════════════════════════════════════════════════════"
echo ""

# Colores
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

check() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✓${NC} $2"
        return 0
    else
        echo -e "${RED}✗${NC} $2"
        return 1
    fi
}

# 1. Verificar archivos críticos
echo -e "${BLUE}1. Verificando archivos críticos...${NC}"
test -f ".env" && check 0 ".env existe" || check 1 ".env NO existe"
test -f "main.py" && check 0 "main.py existe" || check 1 "main.py NO existe"
test -f "Dockerfile" && check 0 "Dockerfile existe" || check 1 "Dockerfile NO existe"
test -f "run.sh" && check 0 "run.sh existe" || check 1 "run.sh NO existe"
test -f "requirements.txt" && check 0 "requirements.txt existe" || check 1 "requirements.txt NO existe"
echo ""

# 2. Verificar configuración de .env
echo -e "${BLUE}2. Verificando configuración de .env...${NC}"
grep -q "DATABASE_URL" .env && check 0 "DATABASE_URL configurada" || check 1 "DATABASE_URL NO configurada"
grep -q "SECRET_KEY" .env && check 0 "SECRET_KEY configurada" || check 1 "SECRET_KEY NO configurada"
grep -q "JWT_SECRET_KEY" .env && check 0 "JWT_SECRET_KEY configurada" || check 1 "JWT_SECRET_KEY NO configurada"
echo ""

# 3. Verificar archivos de Seeds
echo -e "${BLUE}3. Verificando archivos de seeds...${NC}"
test -f "seed_roles.py" && check 0 "seed_roles.py existe" || check 1 "seed_roles.py NO existe"
test -f "seed_turnos.py" && check 0 "seed_turnos.py existe" || check 1 "seed_turnos.py NO existe"
test -f "seed_users.py" && check 0 "seed_users.py existe" || check 1 "seed_users.py NO existe"
echo ""

# 4. Verificar módulos de reconocimiento
echo -e "${BLUE}4. Verificando módulos de reconocimiento facial...${NC}"
test -f "src/recognize/reconocimiento.py" && check 0 "reconocimiento.py existe" || check 1 "reconocimiento.py NO existe"
test -f "src/recognize/detector.py" && check 0 "detector.py existe" || check 1 "detector.py NO existe"
test -f "src/recognize/memory_cleanup.py" && check 0 "memory_cleanup.py existe" || check 1 "memory_cleanup.py NO existe"
echo ""

# 5. Verificar directorios
echo -e "${BLUE}5. Verificando directorios...${NC}"
test -d "src/recognize" && check 0 "src/recognize/ existe" || check 1 "src/recognize/ NO existe"
test -d "public" && check 0 "public/ existe" || check 1 "public/ NO existe"
echo ""

# 6. Verificar Docker (si está disponible)
echo -e "${BLUE}6. Verificando Docker...${NC}"
if command -v docker &> /dev/null; then
    docker --version | grep -q "Docker" && check 0 "Docker instalado" || check 1 "Docker NO funciona"
    docker ps &> /dev/null && check 0 "Docker daemon corriendo" || check 1 "Docker daemon NO responde"
else
    check 1 "Docker NO instalado"
fi
echo ""

# 7. Información del sistema
echo -e "${BLUE}7. Información del sistema...${NC}"
MEMORY=$(free -h | awk 'NR==2 {print $7}')
echo -e "  Memoria disponible: ${YELLOW}$MEMORY${NC}"
DISK=$(df -h . | awk 'NR==2 {print $4}')
echo -e "  Espacio en disco: ${YELLOW}$DISK${NC}"
echo ""

# 8. Próximos pasos
echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}📋 PRÓXIMOS PASOS:${NC}"
echo ""
echo "1. Reconstruir la imagen Docker:"
echo -e "   ${YELLOW}docker compose -f docker-compose.yml down${NC}"
echo -e "   ${YELLOW}docker compose -f docker-compose.yml up --build${NC}"
echo ""
echo "2. Monitorear logs:"
echo -e "   ${YELLOW}docker logs sistema-asistencia-api -f${NC}"
echo ""
echo "3. Verificar que el servidor está corriendo:"
echo -e "   ${YELLOW}curl http://localhost:8000/docs${NC}"
echo ""
echo -e "${BLUE}════════════════════════════════════════════════════════════════════${NC}"
