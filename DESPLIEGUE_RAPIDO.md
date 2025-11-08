# 🚀 DESPLIEGUE HTTPS - VERSIÓN CORTA

> **TL;DR**: Solo 1 comando en tu máquina local. Punto. El resto es automático.

---

## 📝 Lo Único que Tienes que Hacer

```bash
cd /home/ronald/Documentos/project-hibridos/sistema-de-asistencia

git add -A
git commit -m "🔧 Arreglar nginx DNS y health checks para HTTPS"
git push origin main
```

---

## ⏳ Qué Sucede Después (Automático)

| Paso | Quién                   | Qué Hace                   | Tiempo    |
| ---- | ----------------------- | -------------------------- | --------- |
| 1    | GitHub Actions          | 🧪 Ejecuta tests           | ~2 min    |
| 2    | GitHub Actions          | 🔨 Build Docker            | ~3 min    |
| 3    | GitHub Actions          | 🚀 Conecta a tu EC2        | Inmediato |
| 4    | EC2 (deploy-aws-ec2.sh) | 🔐 Genera certificados SSL | ~1 min    |
| 5    | EC2 (deploy-aws-ec2.sh) | 🐳 Inicia contenedores     | ~1 min    |

**Total: ~7-10 minutos**

---

## ✅ Verificar que Funcionó

### Opción 1: En tu navegador

```
https://18.225.34.130/docs
```

(Aceptar advertencia de certificado auto-firmado)

### Opción 2: Con curl

```bash
curl -k https://18.225.34.130/docs
```

### Opción 3: Ver GitHub Actions

https://github.com/2004Style/sistema-de-asistencia/actions

---

## 🎉 ¡Listo!

Si ves la UI de Swagger en `https://18.225.34.130/docs` significa que:

- ✅ Nginx está corriendo
- ✅ Certificados SSL están activos
- ✅ API está conectada
- ✅ HTTPS funciona

---

## 🆘 Si Algo Falla

```bash
# Conectar a EC2
ssh -i ~/.ssh/tu-clave.pem deploy@18.225.34.130

# Ver logs del último deployment
cat /var/log/deploy/deploy_*.log | tail -100

# Ver estado actual
cd ~/app/sistema-de-asistencia/server
docker compose -f docker-compose-production.yml ps
docker compose -f docker-compose-production.yml logs --tail 50
```

---

**¿Preguntas?** Ver `GUIA_DESPLIEGUE_COMPLETO.md` para detalles.
