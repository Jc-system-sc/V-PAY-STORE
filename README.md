# Sistema de Ventas, Inventario y Cuentas — by Viax Studio

PWA (app instalable desde el navegador) para negocios pequeños: vendes
escaneando o por voz, controlas tu catálogo por categorías con alertas de
bajo stock, llevas la cuenta de quién te debe (fiado y cervezas por
cajas), cobras con tu QR de Yape, y hasta tus propios clientes pueden
armar su pedido desde su celular — todo en tiempo real con Firebase, sin
depender de nadie externo para hacer ajustes.

## Estructura del proyecto

Cada sección de la app es su **propia página HTML con su propio CSS**,
no un solo archivo gigante. Solo comparten `css/base.css` (los
componentes visuales repetidos: botones, tarjetas, modales, carrito,
etc., para que las 7 páginas se vean consistentes) y los módulos de
JavaScript que de verdad usan en común.

```
proyecto/
├── index.html            Inicio (accesos grandes + los 2 apartados especiales)
├── ventas.html             Vender · Listas · Resumen (+ tarjeta de cobro Yape)
├── inventario.html           Categorías · Movimientos · Alertas · Registrar   🔒 PIN
├── cuentas.html                 Cuentas a fiado · Resumen de deudas             🔒 PIN
├── cervezas.html                   Cuentas de cerveza por cajas · Resumen        🔒 PIN
├── pedidos.html                       Catálogo para que tus clientes pidan solos
├── ajustes.html                          Apariencia · info del sistema · ayuda
├── manifest.json          Configuración de la PWA (instalar como app)
├── sw.js                     Service worker (para que funcione como app)
├── README.md                  Este archivo
│
├── img/
│   ├── LEEME.txt                Cómo poner tu QR de Yape
│   └── qr-yape.png                ← Aquí pones tu QR (tú lo agregas)
│
├── icons/
│   └── LEEME.txt                Qué imágenes poner para instalar la app
│
├── css/
│   ├── base.css                  Compartido por las 7 páginas
│   ├── home.css                    Solo de index.html
│   ├── ventas.css                    Solo de ventas.html
│   ├── inventario.css                  Solo de inventario.html
│   ├── cuentas.css                       Solo de cuentas.html
│   ├── cervezas.css                        Solo de cervezas.html
│   ├── pedidos.css                           Solo de pedidos.html
│   └── ajustes.css                             Solo de ajustes.html
│
└── js/
    ├── config.js          ← EDITA ESTE con tus datos de Firebase, tu negocio y tus PIN
    ├── state.js             Estado + helpers compartidos (carrito, formatos…)
    ├── iconos.js              Íconos automáticos por categoría
    ├── pdf.js                   Reportes en PDF (Inventario, Cuentas, Cervezas)
    ├── audio.js                   Sonidos (beeps, pop, campanita)
    ├── voz.js                       Búsqueda por voz (solo Ventas)
    ├── ui.js                          Modales + pestañas (compartido)
    ├── pin.js                          Candado de PIN (Inventario, Cuentas, Cervezas)
    ├── escaner.js                       Escáner genérico (Ventas y Inventario)
    ├── catalogo.js                        Registrar/editar productos (Inventario)
    ├── ventas.js                            Escáner principal, carrito, descuento
    ├── listas.js                               Clientes de confianza / cotizaciones
    ├── boleta.js                                 Boleta, PNG, WhatsApp, pagado/fiado
    ├── inventario.js                               Categorías, movimientos, alertas
    ├── cuentas.js                                    Cuentas a fiado, abonos, PDF
    ├── cervezas.js                                     Cuentas de cerveza por cajas
    ├── pedidos.js                                        Catálogo para clientes + carrito
    ├── resumen.js                                          Estadísticas del día (Ventas)
    ├── mas.js                                                Info del sistema (Ajustes)
    ├── app.js                                                  Selector de temas de color
    └── main-*.js       (7 archivos)     Arranca cada página y conecta Firebase
```

Cada página carga **solo** los módulos que necesita — por ejemplo,
`ajustes.html` no carga nada relacionado a la cámara o al carrito, y
`pedidos.html` (pensada para tus clientes) no carga el candado de PIN
porque debe quedar libre para cualquiera.

---

## 1. Crea tu base de datos en Firebase (paso a paso)

### 1.1 Crea el proyecto
1. Entra a **[console.firebase.google.com](https://console.firebase.google.com)**
   con tu cuenta de Google.
2. **"Agregar proyecto"** → ponle un nombre (ej. el nombre de tu negocio) →
   sigue los pasos (puedes desactivar Google Analytics, no lo necesitas) →
   **Crear proyecto**.

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
3. Elige **Modo de producción** (más seguro; las reglas las ponemos en
   el siguiente paso) y la ubicación del servidor más cercana a tu país
   (ej. `southamerica-east1` para Sudamérica).
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
escritura a las 7 colecciones que usa el sistema (evita que alguien
cree colecciones raras o borre cosas fuera de esas 7), y limitar el
tamaño de lo que se puede escribir:

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
    match /cuentasCerveza/{id} {
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

Esto ya evita accidentes comunes (que se borre el historial de ventas o
de movimientos), aunque para una protección real necesitarías agregar
un login — si más adelante quieres eso, es un paso aparte que se puede
sumar sin romper nada de lo que ya tienes.

Después de pegar las reglas, haz clic en **Publicar**.

### 1.5 Las colecciones se crean solas
No necesitas crear nada más a mano en Firestore. El sistema usa
**7 colecciones**, y Firebase las crea automáticamente la primera vez que
guardas algo desde la app:

| Colección              | Qué guarda                                          |
|-------------------------|------------------------------------------------------|
| `productos`             | Tu catálogo (nombre, EAN, categoría, precio, stock, imagen) |
| `categorias`             | Los nombres de categoría que vas creando               |
| `ventas`                  | Historial de ventas confirmadas (pagadas o fiadas)      |
| `listas`                    | Pedidos/cotizaciones — de confianza o de `pedidos.html`  |
| `cuentas`                     | Cuentas a fiado: saldo y movimientos por cliente           |
| `cuentasCerveza`               | Cuentas de cerveza por cajas: pedidos, entregas y pagos      |
| `movimientosInventario`          | Entradas (compras) y salidas de stock                          |

### 1.6 ¿Necesito crear índices?
No. Ninguna consulta que hace el sistema combina un filtro por rango con
un orden en un campo distinto (eso es lo único que obliga a crear un
índice manual en Firestore). Si en el futuro modificas una consulta y
Firestore te muestra un error con un link que dice "crear índice", solo
haz clic en ese link — te lleva directo a crearlo con un clic.

---

## 2. Publícalo con HTTPS (obligatorio para cámara y voz)

La cámara (escáner) y el micrófono (búsqueda por voz) del navegador solo
funcionan en `https://` o en `http://localhost`. Dos formas gratis y
rápidas de publicarlo:

- **Netlify** (más fácil): entra a [app.netlify.com/drop](https://app.netlify.com/drop)
  y arrastra la carpeta completa del proyecto. Listo, te da un link.
- **GitHub Pages**: sube la carpeta a un repositorio de GitHub → Settings
  → Pages → elige la rama → guardar.

## 3. Instálalo como app (PWA)

1. Agrega tus imágenes en `icons/` (lee `icons/LEEME.txt`) y tu QR en
   `img/` (lee `img/LEEME.txt`).
2. Si quieres que el nombre de la app instalada sea el de tu negocio,
   edita también `"name"` y `"short_name"` en `manifest.json`.
3. Publica el sitio (paso 2) y ábrelo desde el celular.
4. Android/Chrome: aparece "Instalar aplicación". iPhone/Safari: botón
   compartir → "Agregar a pantalla de inicio".

Si luego cambias código, sube el número en `CACHE_VERSION` dentro de
`sw.js` (de `"sistema-v6"` a `"sistema-v7"`, etc.) para que los
celulares con la app ya instalada descarguen la versión nueva.

**Tip para `pedidos.html`:** como es de acceso libre (sin PIN), puedes
instalarlo aparte en la tablet o celular que dejas al alcance de los
clientes, o mandarles el link directo por WhatsApp.

---

## 4. Cómo está organizado por dentro

**Inicio** tiene los accesos grandes de gestión (Ventas, Inventario,
Cuentas, Ajustes) y, debajo, dos banners **especiales**: Cervezas y
Catálogo — se ven distinto a propósito, para diferenciarlos del resto.

### Ventas — *Vender · Listas · Resumen*
- **Vender:** escanea con la cámara, busca por texto o por voz, o agrega
  un "producto libre" (sin código). Al confirmar, eliges si la venta es
  **Pagada** o **Fiado** — si es fiado, se carga sola a la cuenta del
  cliente (se crea la cuenta si no existía).
- **Listas:** arma el pedido de un cliente de confianza con anticipación
  y conviértelo en venta con un toque cuando llegue. Aquí también
  aparecen los pedidos que tus clientes mandan solos desde `pedidos.html`.
- **Resumen:** ventas del día, cierre de caja, más vendidos y clientes
  frecuentes.

### Inventario 🔒 — *Categorías · Movimientos · Alertas · Registrar*
- **Categorías:** tus productos agrupados en botones grandes con un
  ícono elegido automáticamente según el nombre de la categoría. Puedes
  **eliminar una categoría** desde su detalle (si tenía productos, se
  mueven solos a "Sin categoría", nunca quedan huérfanos). Buscador y
  orden (A-Z, precio, stock), y reporte en PDF del catálogo valorizado.
- **Movimientos:** historial de entradas (compras) y salidas (ventas o
  ajustes/mermas), filtrable por rango de fechas, con reporte en PDF.
- **Alertas:** productos con bajo stock, con un botón directo para
  registrar la compra.
- **Registrar:** formulario para dar de alta productos — incluye una
  **URL de imagen opcional**, que es la que se muestra en el catálogo
  para clientes.

El stock se descuenta solo con cada venta (pagada o fiada) y aumenta solo
cuando registras una compra en "Movimientos".

### Cuentas 🔒 — *Cuentas · Resumen*
- **Cuentas:** lista de clientes con fiado abierto, cada una con su
  historial completo, un botón para **registrar un abono**, y un botón
  para **descargar el estado de cuenta en PDF**.
- **Resumen:** cuánto te deben en total y el ranking de mayores deudas.

### Cervezas 🔒 — *apartado especial: Cuentas · Resumen*
Para el caso típico de "pidió una caja de 12, se lleva 3 hoy y paga lo
que puede": cada cuenta lleva **dos números totalmente independientes**:
- **Cuántas cervezas le faltan por llevarse** (no tiene que ver con la plata).
- **Cuánto dinero le falta pagar** (no tiene que ver con las cervezas).

Con **"Nuevo pedido"** registras todo de una vez: cuántas pidió, el
precio, cuántas se lleva ahora mismo (opcional) y cuánto paga ahora mismo
(opcional). Después, desde el detalle de cada cuenta, dos botones
sueltos — **"Registrar entrega"** y **"Registrar pago"** — para las
visitas siguientes, cada uno independiente del otro. También tiene su
reporte en PDF con el historial completo.

### Catálogo — *apartado especial, para tus clientes*
Una vitrina para que tus propios clientes arme su pedido desde su
celular, sin que nadie los atienda: arriba hay chips de categoría que
**filtran** la grilla de productos (no navegan a otra pantalla), cada
producto se ve como una tarjeta con imagen, precio y stock, y al fondo
hay una barra con su carrito. Al enviarlo, se guarda automáticamente
como una lista pendiente — la misma colección que usa Ventas → Listas —
así que aparece ahí para que la conviertas en venta. Esta página **no
pide PIN**, porque es la única pensada para que la abra cualquiera.

### Ajustes
Apariencia (5 temas de color — el que elijas se aplica en toda la app,
no solo aquí), información general del sistema y la guía rápida.

---

## 5. El candado de PIN (Inventario, Cuentas, Cervezas)

Estas tres páginas piden una clave de 4 dígitos antes de mostrar nada.
Se configura en `js/config.js`: `pinInventario`, `pinCuentas` y
`pinCervezas` (puedes poner la misma en las tres, o una distinta en cada
una). **Importante:** esto no es un login de verdad — la clave vive en
el propio código, así que alguien con conocimientos técnicos podría
saltárselo — pero alcanza para que un cliente o un curioso no entre por
accidente. Además, a propósito **nunca se recuerda**: si sales de la
página (cambias de pestaña, mandas la app al fondo) y vuelves, se pide
de nuevo.

## 5.1 Inicio como panel — todo conectado de un vistazo

Los accesos de Inicio ya no son solo botones: cada uno muestra una
insignia con datos reales, en vivo:

- **Ventas** — cuántos pedidos nuevos de clientes están esperando (los
  que llegan solos desde el Catálogo, o los que armaste tú en Listas).
- **Inventario** — cuántos productos están en bajo stock.
- **Cuentas** — cuántas cuentas tienen deuda pendiente.
- **Cervezas** — cuántas cuentas tienen cervezas o dinero pendiente.

Lo mismo pasa en **Ajustes → "De un vistazo"**: 4 tarjetitas con los
mismos números, cada una enlazada directo a su sección (la de "Bajo
stock" te lleva directo a Inventario → Alertas, no a la pantalla por
defecto).

Y en **Ventas → Listas**, los pedidos que llegan solos desde el
Catálogo de clientes aparecen marcados con una etiqueta "Pedido web",
para que los distingas de los que armaste tú mismo.

## 5.2 Comparte tu catálogo con un link

En **Ajustes → "Comparte tu catálogo"** tienes el link directo a
`pedidos.html` listo para copiar o mandar por WhatsApp. Envíaselo a tus
clientes por su grupo de WhatsApp, o pégalo en tu estado — ellos arman
su pedido solos y te aparece en Ventas → Listas.

## 6. Tu QR de Yape

Ve a `img/LEEME.txt` para el paso a paso. En resumen: guarda tu código QR
como `img/qr-yape.png`, y escribe tu nombre en `NEGOCIO.propietaria`
dentro de `js/config.js`. Aparece automáticamente en Inicio, arriba de
todo. Si todavía no subiste la imagen, se ve un aviso en su lugar — no es
un error, es solo un recordatorio.

## Notas importantes

- **Voz:** funciona bien en Chrome/Android. En iPhone (Safari) puede no
  estar disponible — si el navegador no la soporta, el botón de
  micrófono simplemente no aparece.
- **Imágenes de producto:** son una URL (un link a una imagen ya
  subida a algún lado), no un archivo que subas desde el celular — este
  proyecto no tiene un servidor de imágenes propio. Si el link no carga,
  se ve automáticamente el ícono de la categoría en su lugar, nunca una
  imagen rota.
- **WhatsApp:** el botón abre el chat con el resumen en texto; la imagen
  de la boleta la adjuntas tú, ya descargada (WhatsApp no deja adjuntar
  archivos automáticamente desde un link).
- **Linterna:** no todos los celulares la exponen al navegador. Si no
  está disponible, el botón se queda oculto.
- **Sin internet:** si Firebase no está configurado o no hay conexión,
  cada página avisa con una notificación — Inicio no necesita conexión
  para mostrar sus accesos, y el Catálogo de clientes usa mensajes
  simples ("no se pudo cargar"), sin mencionar tecnicismos como
  "Firebase" que no le dirían nada a un cliente.
- **Los PDF** se generan en el propio celular (no se sube nada a
  servidores externos), con la librería jsPDF cargada desde una CDN.
