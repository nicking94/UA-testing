# Guía de Migración y Configuración

## Configuración de PostgreSQL

### 1. Instalar PostgreSQL

Si no tienes PostgreSQL instalado:

**Windows:**
- Descarga desde: https://www.postgresql.org/download/windows/
- O usa un instalador como: https://www.enterprisedb.com/downloads/postgres-postgresql-downloads

**macOS:**
```bash
brew install postgresql@14
brew services start postgresql@14
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install postgresql postgresql-contrib
sudo systemctl start postgresql
```

### 2. Crear la Base de Datos

Conecta a PostgreSQL y crea la base de datos:

```bash
# Conectarse a PostgreSQL (puede requerir contraseña)
psql -U postgres

# O si tienes un usuario diferente:
psql -U tu_usuario
```

Luego ejecuta:

```sql
CREATE DATABASE universal_app;
\q
```

### 3. Configurar Variables de Entorno

Crea un archivo `.env` en `apps/backend/` basado en `.env.example`:

```env
# Database - Ajusta según tu configuración
DATABASE_URL="postgresql://usuario:contraseña@localhost:5432/universal_app?schema=public"

# JWT - Cambia por una clave secreta segura
JWT_SECRET=tu-clave-secreta-muy-segura-aqui
JWT_EXPIRES_IN=7d

# Server
PORT=3001
FRONTEND_URL=http://localhost:3000

# Environment
NODE_ENV=development
```

**Importante:** 
- Reemplaza `usuario` y `contraseña` con tus credenciales de PostgreSQL
- Cambia `JWT_SECRET` por una clave secreta fuerte (puedes generar una con: `openssl rand -base64 32`)

### 4. Ejecutar Migraciones

Una vez configurado el `.env`, ejecuta las migraciones:

```bash
cd apps/backend

# Generar el cliente de Prisma (si no lo has hecho)
npm run prisma:generate

# Crear y aplicar la migración inicial
npm run prisma:migrate

# Cuando te pida un nombre para la migración, usa: "init"
```

Esto creará todas las tablas en tu base de datos PostgreSQL.

### 5. (Opcional) Abrir Prisma Studio

Para ver y editar datos directamente:

```bash
npm run prisma:studio
```

Esto abrirá una interfaz web en `http://localhost:5555`

## Verificar la Instalación

### Probar el Backend

```bash
# Desde la raíz del proyecto
npm run dev:backend
```

El backend debería iniciar en `http://localhost:3001`

### Probar un Endpoint

```bash
# Probar el endpoint de salud (si lo creas)
curl http://localhost:3001

# O probar el login (requiere un usuario creado)
curl -X POST http://localhost:3001/auth/register \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"admin123"}'
```

## Solución de Problemas

### Error: "relation does not exist"
- Asegúrate de haber ejecutado las migraciones: `npm run prisma:migrate`

### Error: "password authentication failed"
- Verifica las credenciales en tu archivo `.env`
- Asegúrate de que el usuario de PostgreSQL tenga permisos

### Error: "database does not exist"
- Crea la base de datos: `CREATE DATABASE universal_app;`

### Error de conexión
- Verifica que PostgreSQL esté corriendo: `pg_isready` o `sudo systemctl status postgresql`
- Verifica el puerto (por defecto es 5432)
- Verifica el firewall si estás en un servidor remoto

## Próximos Pasos

1. **Crear un usuario inicial**: Usa el endpoint `/auth/register` o Prisma Studio
2. **Migrar datos existentes**: Si tienes datos en IndexedDB, necesitarás crear un script de migración
3. **Configurar el frontend**: Actualizar el frontend para usar la API REST en lugar de IndexedDB
