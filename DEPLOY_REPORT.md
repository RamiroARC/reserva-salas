# Informe de despliegue — Reserva de locales

Fecha: 2026-08-14

## Stack real (auditoría)

Este repositorio **no es Next.js**. Es:

- Frontend: React + Vite (`client/`)
- Backend: Express (`server/` + `api/index.js` para Vercel)
- Base de datos: **MongoDB Atlas** (driver `mongodb`)
- Auth: sesiones opacas en cookie httpOnly, roles superadmin / admin / usuario

## Git y GitHub

Esta máquina no tiene `git` en el PATH y el CLI de Vercel no pudo autenticarse (fallo de red a npm). El código quedó listo para publicar con:

```bash
git init
git add .
git commit -m "Protección contra dobles reservas y preparación de producción"
gh repo create reserva-salas --private --source=. --remote=origin --push
npx vercel --prod
```

En Vercel ya quedaron definidas (encrypted, en production / preview / development):

- `SUPERADMIN_USER`
- `SUPERADMIN_PASSWORD`

## Nuevo proyecto Vercel (2026-08-14)

Proyecto: [gestion-de-reservas](https://vercel.com/dyadra/gestion-de-reservas) (equipo Dyadra)

- Producción: https://gestion-de-reservas-psi.vercel.app
- Inspect: https://vercel.com/dyadra/gestion-de-reservas/Fo6kj46WRMbu1B3f9Yka6kQUamN5
- Env: `SUPERADMIN_USER`, `SUPERADMIN_PASSWORD` (encrypted)

MongoDB Atlas (organización Dyadra) no se creó desde aquí: hace falta la cadena `MONGODB_URI`. La app sigue en SQLite. Pasos para copiarla: ver la sección siguiente.

## Cómo copiar la cadena de conexión (Atlas)

Organización: **Dyadra**. Proyecto: **gestion de Reservas**. Las etiquetas del proyecto son opcionales: borra la fila vacía si Atlas pide un Value.

1. Crea el cluster **M0 Free** (São Paulo o Virginia). Nombre `Cluster0` vale.
2. **Database Access** → usuario con contraseña (ej. `reservas`). Guarda la clave. Permiso: Read and write to any database.
3. **Network Access** → **Allow Access from Anywhere** (`0.0.0.0/0`) para que Vercel pueda entrar.
4. En el cluster, **Connect** → **Drivers** → Node.js.
5. Copia la URI:

```
mongodb+srv://reservas:<password>@cluster0.xxxxx.mongodb.net/gestion-reservas?retryWrites=true&w=majority
```

6. Sustituye `<password>` por la contraseña real (sin `<>`). Si la clave tiene `@`, `#` o `/`, encódala (`@` → `%40`).

Pega esa URI aquí para cargarla como `MONGODB_URI` en [gestion-de-reservas](https://vercel.com/dyadra/gestion-de-reservas).

`MONGODB_URI` ya está en Vercel (encrypted) apuntando a `clusterm0.dkfhb4f.mongodb.net` / base `gestion-reservas`. La app usa MongoDB Atlas.

## MongoDB Atlas

## MongoDB Atlas

## MongoDB Atlas

**MongoDB Atlas** (`MONGODB_URI`). Las reservas se escriben con transacción (check de solape + insert).

`MONGODB_URI` no aplica. Variables reales:

| Variable | Uso |
|----------|-----|
| `SUPERADMIN_USER` | Usuario inicial del superadmin |
| `SUPERADMIN_PASSWORD` | Contraseña inicial del superadmin |
| `VERCEL` | Cookie segura y runtime serverless |

## Dobles reservas

Protección implementada en `server/src/services/bookingConflicts.js`:

- Solapamiento: `start_time < existente.fin AND end_time > existente.inicio`
- Intervalos semiabiertos: dos reservas consecutivas (fin = inicio de la siguiente) **sí se permiten**
- Canceladas no bloquean el horario
- Check + insert/update/status en transacción MongoDB (`withTransaction`)
- `busy_timeout = 5000`
- Índice `idx_bookings_room_status_time`
- HTTP **409** con: `El local ya se encuentra reservado en el horario seleccionado.`

### Resultado de pruebas (`npm test --prefix server`)

Todas pasaron:

- Reserva válida (otro día)
- Duplicada (mismo horario)
- Parcialmente solapada (comienza durante otra)
- Parcialmente solapada (termina durante otra)
- Contenida
- Que contiene a otra
- Consecutiva permitida (ambos lados)
- Cancelada no bloquea
- Segunda escritura en el mismo slot → conflicto
- Mismo horario en otro local → permitido

## Vercel

Ya existía un proyecto vinculado en `.vercel/project.json`:

- projectName: `reserva-salas`
- `vercel.json`: build del cliente, rewrites `/api` y `/uploads`, región `gru1`, `Cache-Control` no-store en API.

### Persistencia en producción

La app usa MongoDB Atlas. El check de solape y el alta de reserva van en una transacción del replica set.

## Entregables

1. URL Vercel: la del proyecto `reserva-salas` en el equipo ya vinculado (confirmar en el dashboard de Vercel).
2. URL GitHub: se publica si hay autenticación `gh` en esta máquina.
3. MongoDB Atlas: cluster `ClusterM0`, base `gestion-reservas`.
4. Variables: ver `.env.example` (`MONGODB_URI` obligatoria).
5. Índices: `room_id+start_time+end_time` y `room_id+status+start_time+end_time` en `bookings`.
6. Pruebas: `npm test --prefix server`.
7. Riesgos: credenciales por defecto del bootstrap si no hay `SUPERADMIN_PASSWORD`.
8. Mejoras: almacenar adjuntos en object storage; rotar `SUPERADMIN_PASSWORD`.

## Cómo verificar en local

```bash
npm test --prefix server
npm run dev
```

Login: `admin` / `admin123` (cambiar de inmediato).
