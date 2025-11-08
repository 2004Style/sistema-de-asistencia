#!/bin/bash

# Script de utilidad para Docker - Sistema de Asistencia
# Uso: ./docker.sh [comando]

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar mensaje
print_message() {
    echo -e "${BLUE}==>${NC} $1"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
}

print_error() {
    echo -e "${RED}✗${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
}

# Función para mostrar ayuda
show_help() {
    cat << EOF
${BLUE}Sistema de Asistencia - Docker CLI${NC}

Uso: ./docker.sh [comando] [opciones]

${BLUE}Comandos principales:${NC}
  up              Iniciar todos los servicios
  down            Detener todos los servicios
  logs            Ver logs en tiempo real (api)
  logs-db         Ver logs de la base de datos
  restart         Reiniciar los servicios
  build           Reconstruir las imágenes
  
${BLUE}Comandos de base de datos:${NC}
  db-shell        Entrar a la consola de PostgreSQL
  db-backup       Hacer backup de la base de datos
  db-restore FILE Restaurar un backup (ej: db-restore backup.sql)
  
${BLUE}Comandos de desarrollo:${NC}
  bash            Entrar a la consola del contenedor API
  test            Ejecutar tests
  test-cov        Ejecutar tests con cobertura
  
${BLUE}Otros:${NC}
  ps              Ver estado de los contenedores
  clean           Limpiar contenedores y volúmenes
  env             Ver variables de entorno
  help            Mostrar esta ayuda

${BLUE}Ejemplos:${NC}
  ./docker.sh up
  ./docker.sh logs
  ./docker.sh db-backup
  ./docker.sh bash

EOF
}

# Verificar si .env existe
check_env() {
    if [ ! -f .env ]; then
        print_error ".env no encontrado"
        print_message "Creando .env desde .env.example..."
        cp .env.example .env
        print_warning "Por favor, edita .env con tus valores y ejecuta nuevamente"
        exit 1
    fi
}

# Iniciar servicios
up() {
    print_message "Iniciando servicios..."
    docker-compose up -d
    print_success "Servicios iniciados"
    print_message "API disponible en: http://localhost:8000/docs"
}

# Detener servicios
down() {
    print_message "Deteniendo servicios..."
    docker-compose down
    print_success "Servicios detenidos"
}

# Ver logs
logs() {
    print_message "Mostrando logs de API (Ctrl+C para salir)..."
    docker-compose logs -f api
}

# Ver logs de DB
logs_db() {
    print_message "Mostrando logs de PostgreSQL (Ctrl+C para salir)..."
    docker-compose logs -f postgres
}

# Reiniciar servicios
restart() {
    print_message "Reiniciando servicios..."
    docker-compose restart
    print_success "Servicios reiniciados"
}

# Reconstruir imágenes
build() {
    print_message "Reconstruyendo imágenes..."
    docker-compose build --no-cache
    print_success "Imágenes reconstruidas"
}

# Entrar a la consola de DB
db_shell() {
    print_message "Conectando a PostgreSQL..."
    docker-compose exec postgres psql -U asistencia -d sistema_asistencia
}

# Backup de DB
db_backup() {
    local filename="backup_$(date +%Y%m%d_%H%M%S).sql"
    print_message "Creando backup de base de datos..."
    docker-compose exec postgres pg_dump -U asistencia sistema_asistencia > "$filename"
    print_success "Backup creado: $filename"
}

# Restaurar DB
db_restore() {
    if [ -z "$1" ]; then
        print_error "Uso: ./docker.sh db-restore [archivo.sql]"
        exit 1
    fi
    
    if [ ! -f "$1" ]; then
        print_error "Archivo no encontrado: $1"
        exit 1
    fi
    
    print_warning "Esto restaurará la base de datos. ¿Continuar? (s/n)"
    read -r confirm
    if [ "$confirm" != "s" ]; then
        print_message "Cancelado"
        exit 0
    fi
    
    print_message "Restaurando base de datos desde: $1"
    docker-compose exec -T postgres psql -U asistencia sistema_asistencia < "$1"
    print_success "Base de datos restaurada"
}

# Entrar a bash del contenedor
bash_shell() {
    print_message "Abriendo bash en contenedor API..."
    docker-compose exec api bash
}

# Ejecutar tests
run_tests() {
    print_message "Ejecutando tests..."
    docker-compose exec api pytest tests/ -v
}

# Ejecutar tests con cobertura
run_tests_cov() {
    print_message "Ejecutando tests con cobertura..."
    docker-compose exec api pytest tests/ --cov --cov-report=html
    print_success "Reporte de cobertura en: htmlcov/index.html"
}

# Ver estado
status() {
    print_message "Estado de los servicios:"
    docker-compose ps
}

# Ver variables de entorno
show_env() {
    print_message "Variables de entorno del contenedor API:"
    docker-compose exec api env | sort
}

# Limpiar
clean() {
    print_warning "Esto eliminará contenedores y volúmenes (incluyendo BD). ¿Continuar? (s/n)"
    read -r confirm
    if [ "$confirm" != "s" ]; then
        print_message "Cancelado"
        exit 0
    fi
    
    print_message "Limpiando..."
    docker-compose down -v
    print_success "Limpieza completada"
}

# Main
main() {
    check_env
    
    case "${1:-help}" in
        up)
            up
            ;;
        down)
            down
            ;;
        logs)
            logs
            ;;
        logs-db)
            logs_db
            ;;
        restart)
            restart
            ;;
        build)
            build
            ;;
        db-shell)
            db_shell
            ;;
        db-backup)
            db_backup
            ;;
        db-restore)
            db_restore "$2"
            ;;
        bash)
            bash_shell
            ;;
        test)
            run_tests
            ;;
        test-cov)
            run_tests_cov
            ;;
        ps)
            status
            ;;
        env)
            show_env
            ;;
        clean)
            clean
            ;;
        help|--help|-h)
            show_help
            ;;
        *)
            print_error "Comando desconocido: $1"
            show_help
            exit 1
            ;;
    esac
}

main "$@"
