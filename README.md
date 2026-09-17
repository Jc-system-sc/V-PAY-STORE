# Sistema de Ventas, Inventario y Cuentas — by Viax Studio

PWA (app instalable desde el navegador) para negocios pequeños: vendes
escaneando o por voz, controlas tu catálogo por categorías con alertas de
bajo stock, llevas la cuenta de quién te debe (fiado), cobras con tu QR
de Yape, y hasta tus propios clientes pueden armar su pedido desde su
celular — todo en tiempo real con Firebase, sin depender de nadie
externo para hacer ajustes.

## Estructura del proyecto

Cada sección de la app es su **propia página HTML con su propio CSS**,
no un solo archivo gigante. Solo comparten `css/base.css` (los
componentes visuales repetidos: botones, tarjetas, modales, carrito,
candado de PIN, etc.) y los módulos de JavaScript que de verdad usan en
común.

```
proyecto/
├── index.html            Inicio (accesos grandes + tu QR de Yape)
├── ventas.html             Vender · Listas · Resumen               🔒 clave
├── inventario.html           Categorías · Movimientos · Alertas · Registrar 🔒 clave
├── cuentas.html                 Cuentas a fiado · Resumen de deudas     🔒 clave
├── pedidos.html                    Catálogo para que tus clientes pidan solos
├── ajustes.html                       Apariencia · info · preferencias  🔒 clave
├── manifest.json          Configuración de la PWA (instalar como app)
├── sw.js                     Service worker (para que funcione como app)
├── README.md                  Este archivo
│
├── img/
│   ├── LEEME.txt                Cómo poner tu QR de Yape
│   ├── qr-yape.png                ← Aquí pones tu QR (tú lo agregas)
│   └── productos/
│       ├── LEEME.txt                Cómo poner la foto de cada producto
│       └── (tus fotos van aquí)       nombre-del-producto.jpg
│
├── icons/
│   └── LEEME.txt                Qué imágenes poner para instalar la app
│
├── css/
│   ├── base.css                  Compartido por las 6 páginas
│   ├── home.css                    Solo de index.html
│   ├── ventas.css                    Solo de ventas.html
│   ├── inventario.css                  Solo de inventario.html
│   ├── cuentas.css                       Solo de cuentas.html
│   ├── pedidos.css                         Solo de pedidos.html
│   └── ajustes.css                           Solo de ajustes.html
│
└── js/
    ├── config.js          ← EDITA ESTE con tus datos de Firebase, tu negocio y tu clave
    ├── state.js             Estado + helpers compartidos (carrito, preferencias…)
    ├── iconos.js              Íconos automáticos por categoría
    ├── pdf.js                   Reportes en PDF (Inventario y Cuentas)
    ├── audio.js                   Sonidos (beeps, pop, campanita)
    ├── voz.js                       Búsqueda por voz (solo Ventas)
    ├── ui.js                          Modales + pestañas (compartido)
    ├── pin.js                          Candado de PIN (compartido)
    ├── escaner.js                        Escáner genérico (Ventas y Inventario)
    ├── catalogo.js                        Registrar/editar productos (Inventario)
    ├── ventas.js                            Escáner principal, carrito, descuento
    ├── listas.js                               Clientes de confianza / cotizaciones
    ├── boleta.js                                 Boleta, PNG, WhatsApp, pagado/fiado
    ├── inventario.js                               Categorías, movimientos, alertas
    ├── cuentas.js                                    Cuentas a fiado, abonos, PDF
    ├── pedidos.js                                      Catálogo para clientes + carrito
    ├── resumen.js                                        Estadísticas del día (Ventas)
    ├── mas.js                                              Ajustes: resumen, preferencias
    ├── app.js                                                Selector de temas de color
    └── main-*.js       (6 archivos)     Arranca cada página y conecta Firebase
```

Cada página carga **solo** los módulos que necesita. `pedidos.html`
(pensada para tus clientes) no carga el candado de PIN, porque debe
quedar libre para cualquiera.

---

## 1. Crea tu base de datos en Firebase (paso a paso)

### 1.1 Crea el proyecto
1. Entra a **[console.firebase.google.com](https://console.firebase.google.com)**
   con tu cuenta de Google.
2. **"Agregar proyecto"** → ponle un nombre → sigue los pasos (puedes
   desactivar Google Analytics, no lo necesitas) → **Crear proyecto**.

### 1.2 Registra la app web
1. En la pantalla principal del proyecto, haz clic en el ícono **`</>`**
   (Web) para agregar una app.
2. Ponle un apodo (ej. "app-ventas") — **no** marques "Firebase Hosting".
3. Haz clic en **Registrar app**. Te va a mostrar un bloque de código
   llamado `firebaseConfig` con algo así:

   ```js
   const firebaseConfig = {
     apiKey: "AIzaSy...",
     authDomain: "tu-proyecto.firebaseapp.com",
     projectId: "tu-proyecto",
     storageBucket: "tu-proyecto.appspot.com",
     messagingSenderId: "123456789",
     appId: "1:123456789:web:abcabc"
   };
   ```

4. **Copia esos 6 valores** y pégalos en `js/config.js`, reemplazando los
   que dicen `"TU_API_KEY"`, `"TU_PROYECTO"`, etc. Guarda el archivo.

### 1.3 Activa Firestore (la base de datos)
1. En el menú de la izquierda: **Compilación → Firestore Database**.
2. **Crear base de datos**.
3. Elige **Modo de producción** y la ubicación del servidor más cercana
   a tu país (ej. `southamerica-east1` para Sudamérica).
4. **Habilitar**. Espera unos segundos a que se cree.

### 1.4 Configura las reglas de seguridad
Firestore, por defecto en "modo de producción", **bloquea todo**. Tienes
que decirle explícitamente qué puede leer y escribir cualquier persona
que abra tu app — y en este caso eso incluye a **tus propios clientes**,
porque `pedidos.html` (el catálogo) también escribe en Firestore cuando
alguien envía un pedido.

En el menú lateral: **Firestore Database → pestaña "Reglas"**.

**Mientras pruebas** (rápido, pero deja la base abierta a cualquiera que
tenga el link — ok para probar en casa, no para operar en serio):

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read, write: if true;
    }
  }
}
```

**Antes de operar en serio**, como esta app no tiene un login de por
medio, una alternativa simple y razonable es solo permitir lectura y
escritura a las 6 colecciones que usa el sistema:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /productos/{id} {
      allow read: if true;
      allow write: if request.resource.data.size() < 20;
    }
    match /categorias/{id} {
      allow read, write: if true;
    }
    match /ventas/{id} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false; // las ventas no se editan ni se borran
    }
    match /listas/{id} {
      // Ojo: acá también escriben tus clientes desde pedidos.html
      allow read, write: if true;
    }
    match /cuentas/{id} {
      allow read, write: if true;
    }
    match /movimientosInventario/{id} {
      allow read: if true;
      allow create: if true;
      allow update, delete: if false;
    }
  }
}
```

Después de pegar las reglas, haz clic en **Publicar**.

### 1.5 Las colecciones se crean solas
No necesitas crear nada más a mano. El sistema usa **6 colecciones**, y
Firebase las crea automáticamente la primera vez que guardas algo:

| Colección              | Qué guarda                                          |
|-------------------------|------------------------------------------------------|
| `productos`             | Tu catálogo (nombre, EAN, categoría, precio, stock)   |
| `categorias`             | Los nombres de categoría que vas creando               |
| `ventas`                  | Historial de ventas confirmadas (pagadas o fiadas)      |
| `listas`                    | Pedidos/cotizaciones — de confianza o de `pedidos.html`  |
| `cuentas`                     | Cuentas a fiado: saldo y movimientos por cliente           |
| `movimientosInventario`         | Entradas (compras) y salidas de stock                        |

### 1.6 ¿Necesito crear índices?
No. Ninguna consulta combina un filtro por rango con un orden en un
campo distinto (eso es lo único que obliga a crear un índice manual). Si
alguna vez Firestore te muestra un error con un link que dice "crear
índice", solo haz clic en ese link.

---

## 2. Publícalo con HTTPS (obligatorio para cámara y voz)

La cámara y el micrófono del navegador solo funcionan en `https://` o en
`http://localhost`. Dos formas gratis y rápidas de publicarlo:

- **Netlify** (más fácil): entra a [app.netlify.com/drop](https://app.netlify.com/drop)
  y arrastra la carpeta completa del proyecto. Listo, te da un link.
- **GitHub Pages**: sube la carpeta a un repositorio de GitHub → Settings
  → Pages → elige la rama → guardar.

## 3. Instálalo como app (PWA)

1. Agrega tus imágenes en `icons/` (lee `icons/LEEME.txt`), tu QR en
   `img/` (lee `img/LEEME.txt`), y las fotos de tus productos en
   `img/productos/` (lee `img/productos/LEEME.txt`).
2. Si quieres que el nombre de la app instalada sea el de tu negocio,
   edita también `"name"` y `"short_name"` en `manifest.json`.
3. Publica el sitio (paso 2) y ábrelo desde el celular.
4. Android/Chrome: aparece "Instalar aplicación". iPhone/Safari: botón
   compartir → "Agregar a pantalla de inicio".

Si luego cambias código, sube el número en `CACHE_VERSION` dentro de
`sw.js` (de `"sistema-v8"` a `"sistema-v9"`, etc.) para que los
celulares con la app ya instalada descarguen la versión nueva.

**Tip para `pedidos.html`:** como es de acceso libre (sin clave), puedes
instalarlo aparte en la tablet que dejas al alcance de los clientes, o
mandarles el link directo por WhatsApp desde Ajustes.

---

## 4. Cómo está organizado por dentro

**Inicio** muestra tu QR de Yape arriba de todo (para cobrar) y, debajo,
los accesos a cada sección — cada uno con una insignia en vivo (bajo
stock, deudas, pedidos nuevos).

### Ventas 🔒 — *Vender · Listas · Resumen*
- **Vender:** escanea con la cámara, busca por texto o por voz, o agrega
  un "producto libre". Al confirmar, eliges **Pagada** o **Fiado** — si
  es fiado, se carga sola a la cuenta del cliente.
- **Listas:** arma el pedido de un cliente de confianza y conviértelo en
  venta con un toque. Aquí también aparecen, marcados con una etiqueta
  **"Pedido web"**, los pedidos que tus clientes mandan solos desde
  `pedidos.html` — los revisas, tocas **"Convertir a venta"**, y al
  **confirmar la venta el stock se descuenta solo**, igual que cualquier
  otra venta.
- **Resumen:** ventas del día, cierre de caja, más vendidos y clientes
  frecuentes.

### Inventario 🔒 — *Categorías · Movimientos · Alertas · Registrar*
- **Categorías:** tus productos agrupados con un ícono automático.
  Puedes **eliminar una categoría** desde su detalle (sus productos se
  mueven solos a "Sin categoría"). Buscador, orden (A-Z, precio, stock),
  y reporte en PDF del catálogo valorizado.
- **Movimientos:** entradas (compras) y salidas (ventas o ajustes),
  filtrable por fecha, con reporte en PDF.
- **Alertas:** productos con bajo stock, con botón directo para
  reponer.
- **Registrar:** formulario para dar de alta productos. Al escribir el
  nombre, se arma sola la ruta donde debe ir su foto (ver sección 6).

El stock se descuenta solo con cada venta (pagada o fiada) y aumenta
solo cuando registras una compra en "Movimientos".

### Cuentas 🔒 — *Cuentas · Resumen*
- **Cuentas:** lista de clientes con fiado abierto, cada una con su
  historial, un botón para **registrar un abono**, y **descargar el
  estado de cuenta en PDF**.
- **Resumen:** cuánto te deben en total y el ranking de mayores deudas.

### Catálogo — *para tus clientes, sin clave*
Una vitrina para que tus clientes arme su pedido desde su celular: arriba
hay chips de categoría que **filtran** la grilla (no navegan a otra
pantalla), los productos se ven en tarjetas chicas de 3 por fila —cada
una con su foto, precio y un botón "+" para agregar—, y al fondo hay una
barra con el carrito. Al enviarlo, se guarda como una lista pendiente —
la misma colección que usa Ventas → Listas.

### Ajustes 🔒
- **De un vistazo:** 3 tarjetitas con los números clave (bajo stock,
  deudas, pedidos nuevos), cada una enlazada directo a su sección.
- **Comparte tu catálogo:** copia el link de `pedidos.html` o mándalo
  por WhatsApp con un botón.
- **Preferencias:** interruptores para activar/desactivar los sonidos y
  la vibración al escanear.
- **Apariencia:** 5 temas de color — el que elijas se aplica en toda la
  app.
- Información general del sistema y la guía rápida.

---

## 5. La clave de acceso (Ventas, Inventario, Cuentas, Ajustes)

Estas cuatro páginas piden una clave de 4 dígitos antes de mostrar nada
— es la misma clave para las cuatro, así solo tienes que recordar una.
Se configura en `js/config.js`, campo `NEGOCIO.pin`. **`pedidos.html` es
la única página sin clave**, porque es la que usan tus clientes.

**Importante:** esto no es un login de verdad — la clave vive en el
propio código — pero alcanza para que un cliente o un curioso no entre
por accidente. Una vez que la ingresas correctamente, queda desbloqueada
para el resto de esa visita (no te la vuelve a pedir cada vez que
cambias de página mientras trabajas), pero se pide de nuevo si cierras
el navegador o abres una pestaña nueva.

## 6. Fotos de tus productos (automático, sin URLs)

Ya no hace falta escribir ningún link. Cuando registras o editas un
producto en Inventario, el sistema arma solo la ruta que debe tener su
foto, a partir del nombre — por ejemplo, "Inca Kola 500ml" te muestra:

```
img/productos/inca-kola-500ml.jpg
```

Solo tienes que guardar la foto con ese nombre exacto dentro de
`img/productos/` (ver `img/productos/LEEME.txt`). Aparece sola en el
Catálogo. Si todavía no subiste la foto, se ve el ícono de la categoría
en su lugar — nunca una imagen rota.

## 7. Tu QR de Yape

Ve a `img/LEEME.txt` para el paso a paso. En resumen: guarda tu código QR
como `img/qr-yape.png`, y escribe tu nombre en `NEGOCIO.propietaria`
dentro de `js/config.js`. Aparece arriba de todo en Inicio.

## Notas importantes

- **Voz:** funciona bien en Chrome/Android. En iPhone (Safari) puede no
  estar disponible — si el navegador no la soporta, el botón de
  micrófono simplemente no aparece.
- **Vibración:** no todos los celulares la soportan; si no está
  disponible, simplemente no pasa nada (no rompe nada más). Se puede
  apagar desde Ajustes → Preferencias.
- **WhatsApp:** el botón abre el chat con el resumen en texto; la imagen
  de la boleta la adjuntas tú, ya descargada.
- **Linterna:** no todos los celulares la exponen al navegador. Si no
  está disponible, el botón se queda oculto.
- **Sin internet:** si Firebase no está configurado o no hay conexión,
  cada página avisa con una notificación.
- **Los PDF** se generan en el propio celular (no se sube nada a
  servidores externos), con la librería jsPDF cargada desde una CDN.
