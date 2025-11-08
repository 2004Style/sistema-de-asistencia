#!/bin/bash
# Alembic Migrations Helper Script
# Simplifies common Alembic operations

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Activate virtual environment if it exists
if [ -f "venv/bin/activate" ]; then
    source venv/bin/activate
fi

# Check if alembic is installed
if ! command -v alembic &> /dev/null; then
    echo -e "${RED}✗ Alembic not found. Install it with: pip install alembic${NC}"
    exit 1
fi

# Functions
show_help() {
    echo -e "${BLUE}Alembic Migrations Helper${NC}"
    echo ""
    echo "Usage: $0 <command> [args]"
    echo ""
    echo "Commands:"
    echo -e "  ${GREEN}status${NC}              Show current migration status"
    echo -e "  ${GREEN}upgrade${NC}             Apply all pending migrations (upgrade head)"
    echo -e "  ${GREEN}upgrade <rev>${NC}       Apply migrations up to specific revision"
    echo -e "  ${GREEN}downgrade${NC}           Undo one migration (downgrade -1)"
    echo -e "  ${GREEN}downgrade <rev>${NC}     Undo migrations to specific revision"
    echo -e "  ${GREEN}generate <msg>${NC}      Generate new migration (autogenerate)"
    echo -e "  ${GREEN}history${NC}             Show all migrations"
    echo -e "  ${GREEN}current${NC}             Show current revision"
    echo -e "  ${GREEN}heads${NC}               Show all branch heads"
    echo -e "  ${GREEN}branches${NC}            Show migration branches"
    echo ""
    echo "Examples:"
    echo "  $0 status"
    echo "  $0 generate add email_verified to users"
    echo "  $0 upgrade"
    echo "  $0 downgrade -1"
    echo ""
}

# Commands
case "${1,,}" in
    status)
        echo -e "${BLUE}=== Migration Status ===${NC}"
        echo -e "${YELLOW}Current revision:${NC}"
        alembic current
        echo ""
        echo -e "${YELLOW}Pending migrations:${NC}"
        alembic upgrade head --sql 2>/dev/null | tail -20 || echo "All migrations applied"
        ;;
    
    upgrade)
        if [ -z "$2" ]; then
            echo -e "${BLUE}Upgrading to head...${NC}"
            alembic upgrade head
        else
            echo -e "${BLUE}Upgrading to revision: $2${NC}"
            alembic upgrade "$2"
        fi
        echo -e "${GREEN}✓ Done${NC}"
        ;;
    
    downgrade)
        if [ -z "$2" ]; then
            echo -e "${BLUE}Downgrading one revision...${NC}"
            alembic downgrade -1
        else
            echo -e "${BLUE}Downgrading to revision: $2${NC}"
            alembic downgrade "$2"
        fi
        echo -e "${GREEN}✓ Done${NC}"
        ;;
    
    generate)
        if [ -z "$2" ]; then
            echo -e "${RED}✗ Specify a migration message${NC}"
            echo "Usage: $0 generate <message>"
            exit 1
        fi
        echo -e "${BLUE}Generating migration: $2${NC}"
        alembic revision --autogenerate -m "$2"
        echo -e "${GREEN}✓ Migration generated${NC}"
        ;;
    
    history)
        echo -e "${BLUE}=== Migration History ===${NC}"
        alembic history
        ;;
    
    current)
        echo -e "${BLUE}=== Current Revision ===${NC}"
        alembic current
        ;;
    
    heads)
        echo -e "${BLUE}=== Branch Heads ===${NC}"
        alembic heads
        ;;
    
    branches)
        echo -e "${BLUE}=== Migration Branches ===${NC}"
        alembic branches
        ;;
    
    help|--help|-h|"")
        show_help
        ;;
    
    *)
        echo -e "${RED}✗ Unknown command: $1${NC}"
        echo ""
        show_help
        exit 1
        ;;
esac
