# Reserva de Salas

Gestión multiempresa de locales de eventos: cada empresa administra sus locales, y cada local tiene sus propios catálogos, precios y reservas. El acceso es con usuario y contraseña.

## Stack

- **Frontend:** React + Vite
- **Backend:** Node.js + Express
- **Base de datos:** SQLite

## Roles

| Rol | Puede |
|-----|-------|
| `superadmin` | Crear empresas junto con su administrador |
| `admin` | Gestionar los usuarios y locales de su empresa, además de operar la app |
| `usuario` | Operar reservas y catálogos en todos los locales de su empresa |

## Funcionalidades

- Empresas con varios locales, cada uno con catálogos y precios propios
- Reservas con detección de conflictos de horario, pagos y adjuntos
- Paquetes, paquetes promocionales, colores de decoración y disposiciones de contrato por local
- Contratos, cotizaciones y reportes con los datos de marca del local activo
- Proyecciones anuales por local

## Requisitos

- Node.js 18 o superior
- npm

## Instalación

```bash
npm run install:all
```

## Desarrollo

Inicia backend y frontend a la vez:

```bash
npm run dev
```

- Frontend: http://localhost:5173
- API: http://localhost:3001

## Primer acceso

Al arrancar por primera vez se crea el superadministrador y, si la base ya tenía datos, se migran a la empresa "Los Jazmines" con un administrador inicial.

| Usuario | Contraseña | Rol |
|---------|-----------|-----|
| `superadmin` | `superadmin123` | superadmin |
| `admin` | `admin123` | admin de la empresa migrada |

Cambia ambas contraseñas apenas ingreses. Para definir las credenciales del superadministrador desde el inicio:

```bash
SUPERADMIN_USER=mi.usuario SUPERADMIN_PASSWORD=una-clave-larga npm run dev
```

## API

Todas las rutas exigen la cookie de sesión. Las rutas de operación además usan la cabecera `X-Local-Id` para elegir el local activo (si se omite, se usa el primero de la empresa).

| Método | Ruta | Descripción |
|--------|------|-------------|
| POST | `/api/auth/login` | Iniciar sesión |
| POST | `/api/auth/logout` | Cerrar sesión |
| GET | `/api/auth/me` | Sesión actual y locales disponibles |
| GET/POST/PUT/DELETE | `/api/companies` | Empresas y su administrador (solo superadmin) |
| GET/POST/PUT/DELETE | `/api/users` | Usuarios de la empresa (solo admin) |
| GET/POST/PUT/DELETE | `/api/locals` | Locales de la empresa (admin para escribir) |
| GET | `/api/venue` | Datos del local activo |
| GET/POST/PUT/DELETE | `/api/bookings` | Reservas del local activo |
| GET | `/api/packages`, `/api/promotional-packages`, `/api/decoration-colors`, … | Catálogos del local activo |

## Estructura

```
reserva-salas/
├── client/          # React (UI)
├── server/          # Express + SQLite
└── package.json     # Scripts raíz
```
