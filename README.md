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
make up          # Postgres + API + panel web + app móvil (datos demo se siembran solos)
make test        # tests del backend
```

Docs interactivas de la API: http://localhost:8000/docs

Cada parte es un servicio de Compose separado: `db`, `api`, `web` y `mobile`. Docker Desktop muestra sus consolas y logs individualmente:

```bash
docker compose logs -f web
docker compose logs -f mobile
docker compose exec api bash
docker compose exec web sh
docker compose exec mobile sh
```

Los frontends usan hot reload. Cambios en `web/` o `mobile/` se reflejan dentro de sus contenedores sin reconstruirlos.

## Dev Container (entorno replicable)

Alternativa a instalar Python/Node en tu máquina: `.devcontainer/` agrega un contenedor de trabajo (Python 3.12 + Node 22) al stack de Compose.

1. VS Code → *Dev Containers: Reopen in Container* (o `npx @devcontainers/cli up --workspace-folder .`).
2. `post-create.sh` crea el venv del backend. Los servicios de aplicación siguen siendo `db`, `api`, `web` y `mobile`, administrados por Compose.
3. Dentro del contenedor: `make test-local` para correr tests y builds. Para levantar toda la aplicación usa `make up`; no inicies procesos duplicados con `make dev-*`.

`DATABASE_URL` ya apunta al servicio `db` del contenedor.

## CI

[`.github/workflows/ci.yml`](.github/workflows/ci.yml) corre en cada PR y push a `main`: pytest del backend, build del panel web, tests + build de la app móvil y un smoke test de `docker compose` (API + Postgres, health y login).

## Producción (Oracle Cloud ARM64)

[`docker-compose.prod.yml`](docker-compose.prod.yml) ejecuta imágenes inmutables de GHCR: API, panel web y app de choferes. No monta código local, no expone la base de datos y solo [Caddy](Caddyfile) abre los puertos 80/443.

Los nombres DNS deben apuntar a la IP pública de la VM antes del primer deploy:

- `APP_DOMAIN` — panel admin: `https://<dominio>`.
- `driver.APP_DOMAIN` — app de choferes.
- `api.APP_DOMAIN` — API y OpenAPI.

En la VM, copia `.env.production.example` a `.env`, completa sus valores con secretos aleatorios y protégelo:

```bash
install -d -m 700 /opt/recycling-logistics
cp .env.production.example /opt/recycling-logistics/.env
chmod 600 /opt/recycling-logistics/.env
```

No subas `.env` al repositorio. Caddy obtiene y renueva certificados Let's Encrypt automáticamente cuando DNS, puertos 80/443 y firewall de Oracle Cloud están configurados.

El workflow [`ci.yml`](.github/workflows/ci.yml) valida cada pull request y puede publicar imágenes ARM64 seleccionadas en GHCR mediante ejecución manual. El workflow [`deploy.yml`](.github/workflows/deploy.yml) solo despliega imágenes ya publicadas y también se ejecuta manualmente; no se activa con un `push`.

Para publicar imágenes desde **Actions → CI and image build → Run workflow**, elige `api`, `web`, `mobile` o `all`; usa canal `test` o `release`, una versión y la URL pública de la API. Cada imagen tiene un tag inmutable:

```text
ghcr.io/dungeoneaters/recycling-logistics-api:test-2026.10.09.1
ghcr.io/dungeoneaters/recycling-logistics-web:release-v0.1.0
ghcr.io/dungeoneaters/recycling-logistics-mobile:sha-<commit>
```

Cuando Oracle Cloud esté provisionado, despliega desde **Actions → Deploy published images → Run workflow**, indicando ambiente (`test` o `production`), tag existente y componente. Producción debe usar `release-*` o `sha-*`, nunca `latest`.

Configura estos **GitHub Secrets** en cada GitHub Environment (`test` y `production`):

| Secret | Uso |
|---|---|
| `SERVER_HOST` | IP o host DNS de la VM |
| `SERVER_USER` | Usuario SSH de la VM |
| `SSH_PRIVATE_KEY` | Clave privada SSH exclusiva de despliegue |
| `SSH_KNOWN_HOSTS` | Salida de `ssh-keyscan -H <host>` verificada fuera del pipeline |
| `GHCR_USERNAME` | Usuario u organización con acceso de lectura al paquete GHCR |
| `GHCR_PULL_TOKEN` | PAT de mínimo alcance `read:packages` para que la VM descargue imágenes privadas |

Configura la variable `DEPLOY_PATH` en cada Environment (`/opt/recycling-logistics/test` o `/opt/recycling-logistics/production`). El dominio se configura solo en el `.env` de cada stack de la VM.

Docker Compose con una réplica por servicio reinicia el contenedor al desplegarlo; Caddy mantiene TLS, pero no garantiza cero downtime para solicitudes que lleguen durante ese reinicio. Cero downtime requiere dos réplicas de API/frontend y un orquestador o balanceador externo.

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
