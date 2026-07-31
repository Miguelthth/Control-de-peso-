# Mis Apps

Una sola app instalada (un ícono) que junta **Gastos** y **Control de Peso** —
compartida entre Miguel y Cindy. **No es de SUMETEC**, vive aparte, sin
relación con el negocio.

2026-07-30: reemplaza a los proyectos separados `GASTOS PERSONALES/` (en
`G:\Mi unidad\`) y `CONTROL PESO/` (en el Escritorio) — esos quedan como
histórico, ya no se tocan. Todo el desarrollo sigue aquí.

## Arquitectura

```
MIS APPS/
├─ index.html + js/ui.js       el launcher: login (URL, usuario, PIN) + 2 botones
├─ shared/
│  ├─ sesion.js                localStorage compartido (URL, usuario, rol) entre las 3 páginas
│  ├─ api.js                   fetch al ÚNICO backend de Apps Script (Gastos + Peso)
│  └─ cifrado.js                AES-GCM + PBKDF2 (usado solo por Gastos)
├─ gastos/                     Gastos Personales -- ya NO es local: cada quien
│  └─ (index.html, js/, css/)  tiene su propia Hoja en Drive/personal/, cifrada
├─ peso/                       Control de Peso (igual que antes, ahora comparte
│  └─ (index.html, js/, css/)  el login del launcher en vez del suyo propio)
├─ apps_script/Codigo.gs       el backend, uno solo para las dos apps
└─ build.py                    genera <sub-app>/js/app.js a partir de shared/ + <sub-app>/js/
```

**Login, una vez, en el launcher** (`index.html`): URL del servidor → usuario
(validado contra la Hoja "Usuarios", solo los que estén activos) → PIN si
tiene, o "¿poner uno?" si es la primera vez. Se guarda en `localStorage`
(`ma_usuario`, `ma_rol`, `ma_url`) — Gastos y Peso solo LEEN esa sesión
(`shared/sesion.js::exigirSesion`), si no hay sesión te regresan al launcher.

**Roles:** `admin` (Miguel) puede dar de alta usuarios nuevos (botón
"+ Agregar usuario" en el launcher, solo visible para admin — pide tu PIN si
tienes uno). `normal` (Cindy, y cualquier otro que se agregue) solo ve y edita
lo suyo — nunca hay ninguna pantalla que muestre el usuario de otra persona
salvo el comparativo de Peso (ahí sí, a propósito, es el chiste del reto).

## Backend (`apps_script/Codigo.gs`)

**Standalone** (no ligado a ninguna Hoja pre-creada) — mismo patrón que ya usa
el Cotizador para su carpeta de PDFs: todo se crea solo la primera vez que la
app hace una llamada real, con el ID guardado en `PropertiesService` para no
tener que buscarlo por nombre cada vez.

```
Mi unidad/
└── MisApps/                 ← se crea sola en la raíz del Drive de Miguel
    ├── Datos                ← pestañas "Usuarios" y "Pesos"
    └── personal/
        ├── Miguel            ← su Hoja de Gastos, cifrada
        └── Cindy             ← la de ella, cifrada
```

El backend nunca ve un movimiento ni un peso en claro: Gastos viaja siempre
como blob cifrado (AES-GCM, `shared/cifrado.js`); el PIN de cuenta es aparte
y NO es cifrado real, solo evita que alguien capture sin querer en la cuenta
del otro compartiendo un mismo dispositivo — no lo trates como protección
seria.

Desplegar: ver las instrucciones dentro de `apps_script/Codigo.gs` — resumen:
script.google.com → proyecto nuevo (standalone, sin Hoja previa) → pegar
`Codigo.gs` → Implementar → Aplicación web. Nada que crear en Drive a mano.

## Build (obligatorio tras tocar `shared/` o el `js/` de cualquier sub-app)

Cada `index.html` carga `js/app.js`, generado por `python build.py` — NO los
módulos ES directo, porque `file://` (doble clic) bloquea
`<script type="module">` por CORS. `build.py` arma **tres** paquetes
(launcher, gastos, peso), cada uno con los archivos de `shared/` que necesita
más los suyos, envolviendo cada archivo en su propio IIFE (evita choques de
nombres entre helpers privados) y exponiendo cada exportación dos veces: como
`nombreArchivo.funcion` (para los `import * as x`) y como global suelta (para
los `import { funcion }`). Los archivos fuente se quedan como ES modules de
verdad -- `node --test` los sigue importando tal cual.

```
python build.py
```

**Nunca edites `js/app.js`, `gastos/js/app.js` ni `peso/js/app.js` a mano.**

## Cómo se despliega y se abre

- **GitHub Pages** (repo público `mis-apps` o el que se haya usado) sirve todo
  el sitio — el código es público, los datos NUNCA (Gastos cifrado + en Hojas
  privadas, Peso en la Hoja "Mis Apps" que solo Miguel puede abrir en Drive).
- Se abre la liga en el celular → "Añadir a pantalla de inicio" (Android:
  menú ⋮ → Instalar app; iPhone: Safari → compartir → Añadir a inicio, tiene
  que ser Safari, no Chrome, para que funcione en iOS). Un solo ícono.
- El ícono (`icon-512.png`) es un placeholder — Miguel va a mandar uno propio.

## Pruebas

```
node --test tests/*.test.js
```

Cubre `cifrado.js` (compartido), `gastos/js/calculos.js`,
`gastos/js/insights.js` y `peso/js/calculos.js` — 41 pruebas. El flujo
completo (launcher → login → Gastos con contraseña de cifrado → Peso
compartido → botón de admin) se verificó manualmente en el navegador con un
`fetch` simulado imitando `Codigo.gs` (sin backend real desplegado
todavía) — ver el historial de la sesión que armó este proyecto si hace
falta repetir esa prueba.

## Convenciones

- Cero dependencias externas.
- Todo el dinero se suma en centavos enteros; todo el peso en kg (lb es solo
  conversión de despliegue).
- Paleta compartida: índigo `#4c5fd5` / coral `#ff6b4a` — no los colores de SUMETEC.

## Pendiente

- El repo de GitHub todavía no existe -- falta que Miguel corra
  `gh auth login` para poder crearlo y subir esto.
- El backend real (Apps Script desplegado) todavía no existe -- todo lo de
  arriba se probó contra un `fetch` simulado. `icon-512.png` ya es el ícono
  real que mandó Miguel (no un placeholder).
