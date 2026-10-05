# Recycling Logistics — MVP (local)

Plataforma de logística de recolección de plásticos. Diseño, backlog y decisiones: [app-design-definitions/applications/recycling-logistics](https://github.com/JulioRom/app-design-definitions/tree/main/applications/recycling-logistics).

Monorepo temporal (se puede separar luego):

| Carpeta | Qué es | Puerto |
|---|---|---|
| `backend/` | FastAPI + PostgreSQL (Docker Compose) | API 8000, Postgres 5433 |
| `web/` | Panel admin B2B (React, Tailwind, shadcn/ui-style) | 5173 |
| `mobile/` | App de choferes (Ionic React + Capacitor), offline-first | 5174 |

## Levantar en local

```bash
make up          # Postgres + API (datos demo se siembran solos)
make web         # http://localhost:5173
make mobile      # http://localhost:5174  (usar vista móvil en DevTools)
make test        # tests del backend
```

Docs interactivas de la API: http://localhost:8000/docs

## Usuarios demo

| Rol | Email | Password |
|---|---|---|
| Admin | admin@demo.cl | admin123 |
| Chofer | chofer@demo.cl | chofer123 |
| Chofer 2 | chofer2@demo.cl | chofer123 |

## Flujo de prueba

1. Panel web → **Rutas**: elegir fecha de hoy, camión, chofer y puntos → *Optimizar* → *Crear y asignar*.
2. App móvil → login como chofer → ver ruta → registrar pesaje por parada.
3. Probar offline: DevTools → Network → Offline, registrar pesaje, volver online y ver la sincronización.
4. Panel web → **Dashboard** (progreso y kilos) y **Trazabilidad** (CSV).

## Ruteo

Sin `GOOGLE_MAPS_API_KEY` la API usa un optimizador local (vecino más cercano + 2-opt). Con la clave (variable de entorno en `docker compose`) usa Google Routes API con `optimizeWaypointOrder` y cae al optimizador local si falla. Límite: 25 paradas por ruta.

## Notas

- Zona horaria de negocio: `America/Santiago` (fechas de "hoy", reportes).
- Las tablas se crean al arrancar (`create_all`); Alembic queda pendiente para después del MVP.
- Borrado de clientes/puntos/camiones es lógico para conservar trazabilidad.
