# Chofer Reciclaje (mobile)

Aplicación móvil web para choferes del MVP de logística de reciclaje. Corre con Ionic React sobre Vite y luego puede empaquetarse con Capacitor.

## Requisitos

- Node.js 20+
- Backend FastAPI disponible en `http://localhost:8000`

## Variables de entorno

Copia `.env.example` a `.env` si necesitas apuntar a otra API.

```bash
cp .env.example .env
```

Variable disponible:

- `VITE_API_URL` — base de la API, por defecto `http://localhost:8000`

## Ejecutar

```bash
npm install
npm run dev
```

La app queda en `http://localhost:5174` con `host: true` y `strictPort: true`.

## Build y tests

```bash
npm test
npm run build
```

## Flujo principal

- Login chofer (`chofer@demo.cl / chofer123`)
- Ruta activa del día con caché persistente
- Registro de pesajes offline-first usando `@capacitor/preferences`
- Sincronización por lotes a `POST /weighings/batch`
- Página de pesajes pendientes y reintento manual

## Probar offline

1. Inicia sesión y entra a una ruta.
2. Abre DevTools del navegador.
3. En la pestaña **Network**, cambia el throttling a **Offline**.
4. Registra un pesaje: quedará en cola local y la parada se marcará optimistamente como visitada.
5. Vuelve a poner la red en **Online**.
6. Espera el sync automático o pulsa **Sincronizar ahora** en la pantalla de pendientes.

## Decisión sobre “Omitir parada” offline

En este MVP, **omitir parada requiere conexión**. El pesaje sí funciona 100% offline. Esto simplifica el flujo y evita inconsistencias de estado mientras el requisito crítico se concentra en no perder pesajes.

## Capacitor / nativo

No se ejecutó `cap add ios` ni `cap add android` en este trabajo.

Cuando quieras generar plataformas nativas:

```bash
npm run build
npx cap add ios
npx cap add android
npx cap sync
```

Luego podrás abrir los proyectos con:

```bash
npx cap open ios
npx cap open android
```
