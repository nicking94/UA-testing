# Universal App - Monorepo

Sistema de gestión reestructurado como monorepo con backend NestJS y PostgreSQL.

## Estructura del Proyecto

```
.
├── apps/
│   ├── frontend/          # Next.js Frontend
│   └── backend/           # NestJS Backend
└── package.json           # Configuración del monorepo
```

## Requisitos Previos

- Node.js 18+
- PostgreSQL 14+
- npm 9+

## Configuración Inicial

### 1. Instalar dependencias

```bash
npm install
```

### 2. Configurar Base de Datos PostgreSQL

1. Crear una base de datos PostgreSQL:

```sql
CREATE DATABASE universal_app;
```

2. Configurar variables de entorno del backend:

```bash
cd apps/backend
cp .env.example .env
```

3. Editar `apps/backend/.env` con tus credenciales:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/universal_app?schema=public"
JWT_SECRET=tu-clave-secreta-aqui
JWT_EXPIRES_IN=7d
PORT=3001
FRONTEND_URL=http://localhost:3000
```

### 3. Ejecutar migraciones de Prisma

```bash
cd apps/backend
npm run prisma:generate
npm run prisma:migrate
```

Esto creará todas las tablas en la base de datos PostgreSQL.

### 4. (Opcional) Poblar datos iniciales

Si tienes un archivo de seed:

```bash
npm run prisma:seed
```

## Scripts Disponibles

### Desde la raíz del proyecto:

- `npm run dev` - Inicia el frontend en modo desarrollo
- `npm run dev:frontend` - Inicia solo el frontend
- `npm run dev:backend` - Inicia solo el backend
- `npm run dev:all` - Inicia frontend y backend simultáneamente
- `npm run build` - Construye ambos proyectos
- `npm run lint` - Ejecuta el linter en ambos proyectos

### Backend específico:

```bash
cd apps/backend
npm run start:dev      # Desarrollo con hot-reload
npm run build          # Compilar
npm run start:prod     # Producción
npm run prisma:studio  # Abrir Prisma Studio
npm run prisma:migrate # Ejecutar migraciones
```

### Frontend específico:

```bash
cd apps/frontend
npm run dev            # Desarrollo
npm run build          # Compilar
npm run start          # Producción
```

## Migración desde IndexedDB

El proyecto ha sido migrado de IndexedDB (Dexie) a PostgreSQL (Prisma). Todos los modelos han sido convertidos:

- ✅ Productos
- ✅ Ventas
- ✅ Clientes
- ✅ Proveedores
- ✅ Pagos
- ✅ Caja Diaria
- ✅ Presupuestos
- ✅ Gastos
- ✅ Promociones
- ✅ Listas de Precios
- ✅ Notificaciones
- ✅ Usuarios y Autenticación

## API Endpoints

El backend expone una API REST en `http://localhost:3001`:

### Autenticación

- `POST /auth/login` - Iniciar sesión
- `POST /auth/register` - Registrar usuario
- `POST /auth/validate` - Validar token

### Productos

- `GET /products` - Listar productos
- `GET /products/:id` - Obtener producto
- `POST /products` - Crear producto
- `PUT /products/:id` - Actualizar producto
- `DELETE /products/:id` - Eliminar producto

### Clientes

- `GET /customers` - Listar clientes
- `GET /customers/:id` - Obtener cliente
- `POST /customers` - Crear cliente
- `PUT /customers/:id` - Actualizar cliente

### Ventas

- `GET /sales` - Listar ventas
- `GET /sales/:id` - Obtener venta
- `POST /sales` - Crear venta
- `PUT /sales/:id` - Actualizar venta

Y muchos más endpoints para cada módulo...

## Próximos Pasos

1. **Configuración de Producción**: Configurar variables de entorno y certificados SSL en el servidor de despliegue.
2. **Migración de Datos Históricos**: Si existen datos previos en IndexedDB, utilizar el módulo de Import/Export para migrarlos a la base de datos central.
3. **Monitoreo**: Implementar logs de producción y monitoreo de base de datos.

## Notas

- El backend usa JWT para autenticación
- Todas las rutas del backend (excepto `/auth/login` y `/auth/register`) requieren autenticación
- El frontend ha sido completamente migrado de IndexedDB local a la API REST centralizada.

# UA-testing
