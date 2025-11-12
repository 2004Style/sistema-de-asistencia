# Herramientas de Testing - Sistema de Asistencia

## 📋 Resumen General

Este documento describe las herramientas y tecnologías utilizadas para ejecutar pruebas unitarias e integración en el sistema de asistencia.

---

## 🧪 Herramientas de Testing

### **Pytest**

Framework principal para ejecutar todas las pruebas (unitarias e integración).

- **Versión**: Especificada en `requirements.txt`
- **Uso**: Base para toda la estrategia de testing
- **Características**:
  - Soporte para fixtures y parametrización
  - Plugins extensibles
  - Reportes detallados

### **pytest-cov**

Herramienta para medir cobertura de código.

- **Uso**: Generar reportes de cobertura HTML y XML
- **Comando**: `pytest --cov=src --cov-report=html`
- **Salida**: Reportes en formato HTML, XML y terminal

### **pytest-xdist**

Plugin para ejecutar tests en paralelo.

- **Uso**: Aceleración de pruebas distribuidas
- **Comando**: `pytest -n auto`
- **Beneficio**: Reduce tiempo total de ejecución

---

## 📊 Estructura de Pruebas

### **Pruebas Unitarias** (`tests/unit/`)

Validación de servicios individuales de forma aislada.

**Servicios cubiertos:**

- `test_asistencias_service.py` - Servicio de asistencias
- `test_email_service.py` - Servicio de correo
- `test_horarios_service.py` - Servicio de horarios
- `test_justificaciones_service.py` - Servicio de justificaciones
- `test_notificaciones_service.py` - Servicio de notificaciones
- `test_reportes_service.py` - Servicio de reportes
- `test_roles_service.py` - Servicio de roles
- `test_turnos_service.py` - Servicio de turnos
- `test_users_service.py` - Servicio de usuarios

### **Pruebas de Integración** (`tests/integration/`)

Validación de flujos completos con autenticación JWT y control de acceso.

**Módulos cubiertos (152 tests):**

- `test_general_integration.py` - Tests generales
- `test_users_integration.py` - Endpoints de usuarios
- `test_roles_and_health_integration.py` - Roles y salud del sistema
- `test_turnos_integration.py` - Gestión de turnos
- `test_horarios_integration.py` - Gestión de horarios
- `test_asistencias_integration.py` - Registro de asistencias
- `test_justificaciones_integration.py` - Justificaciones
- `test_notificaciones_integration.py` - Sistema de notificaciones
- `test_reportes_integration.py` - Generación de reportes

---

## 🛠️ Scripts de Ejecución

### **`run_unit_tests.sh`**

Script unificado para pruebas unitarias con múltiples opciones.

**Comandos disponibles:**

```bash
./run_unit_tests.sh all          # Todos los tests unitarios
./run_unit_tests.sh <servicio>   # Tests de un servicio específico
./run_unit_tests.sh coverage     # Con reporte de cobertura
./run_unit_tests.sh report       # Reporte detallado por servicio
./run_unit_tests.sh parallel     # Ejecución en paralelo
./run_unit_tests.sh fast         # Solo tests rápidos
./run_unit_tests.sh clean        # Limpiar caché
./run_unit_tests.sh help         # Mostrar ayuda
```

### **`run_integration_tests.sh`**

Script especializado para pruebas de integración con validación de autenticación.

**Comandos disponibles:**

```bash
./run_integration_tests.sh all         # Todos los 152 tests
./run_integration_tests.sh summary     # Resumen rápido (por defecto)
./run_integration_tests.sh report      # Reporte completo con análisis
./run_integration_tests.sh <modulo>    # Tests de un módulo específico
./run_integration_tests.sh auth        # Tests de autenticación JWT
./run_integration_tests.sh coverage    # Con reporte de cobertura
./run_integration_tests.sh failed      # Solo tests que fallan
./run_integration_tests.sh parallel    # Ejecución en paralelo
./run_integration_tests.sh clean       # Limpiar caché
./run_integration_tests.sh help        # Mostrar ayuda
```

---

## 🔐 Características de Testing

### **Autenticación JWT**

- Validación de tokens JWT en endpoints
- Pruebas con y sin autenticación
- Verificación de autorización por roles

### **Control de Acceso (RBAC)**

- Tests de permisos por rol: **ADMINISTRADOR**, **SUPERVISOR**, **EMPLEADO**
- Validación de acceso a recursos protegidos

### **Cobertura de Código**

- Reportes HTML interactivos
- Análisis de cobertura por módulo
- Identificación de código no probado

---

## 📈 Métricas de Testing

### **Pruebas Unitarias**

- **Servicios cubiertos**: 9
- **Objetivo de cobertura**: >80%
- **Tiempo de ejecución**: ~15-30 segundos

### **Pruebas de Integración**

- **Total de tests**: 152
- **Módulos cubiertos**: 9
- **Tiempo de ejecución**: ~45-60 segundos
- **Verificación de autenticación**: ✓ Activada

---

## 🎯 Flujo Recomendado de Testing

### 1. **Antes de hacer commit:**

```bash
cd server/tests
./run_unit_tests.sh all
./run_integration_tests.sh summary
```

### 2. **Para análisis profundo:**

```bash
./run_integration_tests.sh report
./run_unit_tests.sh coverage
```

### 3. **Para ejecución rápida:**

```bash
./run_integration_tests.sh parallel
./run_unit_tests.sh fast
```

---

## 📦 Dependencias Requeridas

**En `requirements.txt`:**

```
pytest>=7.0
pytest-cov>=3.0
pytest-xdist>=2.5
```

**Instalación:**

```bash
pip install -r requirements.txt
```

---

## 🌟 Características Principales

| Característica       | Herramienta  | Versión             |
| -------------------- | ------------ | ------------------- |
| Framework de testing | Pytest       | 7.0+                |
| Cobertura de código  | pytest-cov   | 3.0+                |
| Tests en paralelo    | pytest-xdist | 2.5+                |
| Autenticación        | JWT (PyJWT)  | En requirements.txt |
| Reportes HTML        | pytest-cov   | Integrado           |

---

## 📝 Notas Importantes

- ⚠️ **Entorno Virtual**: Asegúrate de estar en un entorno virtual activado
- 🔑 **Autenticación**: Los tests de integración incluyen validación JWT obligatoria
- 🚀 **Rendimiento**: Usa `--parallel` para acelerar ejecución en máquinas multi-núcleo
- 📊 **Cobertura**: Genera reportes HTML en la carpeta `htmlcov/`
- 🧹 **Limpieza**: Usa `clean` para limpiar caché entre ejecuciones

---

**Última actualización**: 11 de noviembre de 2025
