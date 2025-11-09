# 🧪 Scripts de Testing

Esta carpeta contiene los scripts para ejecutar las pruebas del sistema.

## 📋 Scripts Disponibles

### 1. `run_integration_tests.sh`

Script para ejecutar pruebas de integración (152 tests completos).

**Uso:**

```bash
# Desde la carpeta server/
./tests/run_integration_tests.sh [comando]

# Comandos disponibles:
./tests/run_integration_tests.sh all        # Todos los tests (152)
./tests/run_integration_tests.sh summary    # Resumen rápido (por defecto)
./tests/run_integration_tests.sh report     # Reporte detallado
./tests/run_integration_tests.sh <modulo>   # Tests de un módulo específico
./tests/run_integration_tests.sh auth       # Tests de autenticación
./tests/run_integration_tests.sh coverage   # Tests con cobertura
./tests/run_integration_tests.sh help       # Ayuda completa
```

**Módulos disponibles:**

- general
- users
- roles_and_health
- turnos
- horarios
- asistencias
- justificaciones
- notificaciones
- reportes

### 2. `run_unit_tests.sh`

Script para ejecutar pruebas unitarias por servicio.

**Uso:**

```bash
# Desde la carpeta server/
./tests/run_unit_tests.sh [comando]

# Comandos disponibles:
./tests/run_unit_tests.sh all           # Todos los tests unitarios
./tests/run_unit_tests.sh <servicio>    # Tests de un servicio específico
./tests/run_unit_tests.sh report        # Reporte de status
./tests/run_unit_tests.sh coverage      # Tests con cobertura
./tests/run_unit_tests.sh parallel      # Tests en paralelo
./tests/run_unit_tests.sh help          # Ayuda completa
```

**Servicios disponibles:**

- asistencias
- email
- horarios
- justificaciones
- notificaciones
- reportes
- roles
- turnos
- users

## 🚀 Ejemplos de Uso Rápido

```bash
# Resumen ejecutivo de tests de integración
./tests/run_integration_tests.sh

# Tests unitarios del servicio de usuarios
./tests/run_unit_tests.sh users

# Reporte completo de integración
./tests/run_integration_tests.sh report

# Tests con cobertura
./tests/run_unit_tests.sh coverage
```

## 📊 Requisitos

- Python 3.9+
- Entorno virtual activado: `source venv/bin/activate`
- Dependencias instaladas: `pip install -r requirements.txt`

## 💡 Notas

- Los tests de integración validan autenticación JWT y control de acceso por roles
- Los tests unitarios verifican la lógica de negocio de cada servicio
- Se recomienda ejecutar `summary` primero para un overview rápido
