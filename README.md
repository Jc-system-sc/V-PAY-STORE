# Sistema de Ventas, Inventario y Cuentas — by Viax Studio

PWA (app instalable desde el navegador) para negocios pequeños: vendes
escaneando o por voz, controlas tu catálogo por categorías con alertas de
bajo stock, llevas la cuenta de quién te debe (fiado), y cobras con tu
QR de Yape — todo en tiempo real con Firebase, sin depender de nadie
externo para hacer ajustes.

## Estructura del proyecto

Cada sección de la app es su **propia página HTML con su propio CSS**,
no un solo archivo gigante. Solo comparten `css/base.css` (los
componentes visuales repetidos: botones, tarjetas, modales, etc., para
que las 5 páginas se vean consistentes) y los módulos de JavaScript que
de verdad usan en común (por ejemplo, el carrito de compra o la conexión
a Firebase).

```
proyecto/
├── index.html            Inicio (los 4 accesos grandes)
├── ventas.html             Vender · Listas · Resumen (+ tarjeta de cobro Yape)
├── inventario.html           Categorías · Movimientos · Alertas · Registrar
├── cuentas.html                 Cuentas a fiado · Resumen de deudas
├── ajustes.html                   Apariencia · info del sistema · ayuda
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
│   ├── base.css                  Compartido por las 5 páginas
│   ├── home.css                    Solo de index.html
│   ├── ventas.css                    Solo de ventas.html
│   ├── inventario.css                  Solo de inventario.html
│   ├── cuentas.css                       Solo de cuentas.html
│   └── ajustes.css                         Solo de ajustes.html
│
└── js/
    ├── config.js          ← EDITA ESTE con tus datos de Firebase y tu negocio
    ├── state.js             Estado + helpers compartidos (carrito, formatos…)
    ├── iconos.js              Íconos automáticos por categoría (Inventario)
    ├── pdf.js                   Reportes en PDF (Inventario y Cuentas)
    ├── audio.js                   Sonidos (beeps, pop, campanita)
    ├── voz.js                       Búsqueda por voz (solo Ventas)
    ├── ui.js                          Modales + pestañas (compartido)
    ├── escaner.js                       Escáner genérico (Ventas y Inventario)
    ├── catalogo.js                        Registrar/editar productos (Inventario)
    ├── ventas.js                            Escáner principal, carrito, descuento
    ├── listas.js                               Clientes de confianza / cotizaciones
    ├── boleta.js                                 Boleta, PNG, WhatsApp, pagado/fiado
    ├── inventario.js                               Categorías, movimientos, alertas
    ├── cuentas.js                                    Cuentas a fiado, abonos, PDF
    ├── resumen.js                                      Estadísticas del día (Ventas)
    ├── mas.js                                            Info del sistema (Ajustes)
    ├── app.js                                              Selector de temas de color
    └── main-*.js       (5 archivos)     Arranca cada página y conecta Firebase
```

Cada página carga **solo** los módulos que necesita — por ejemplo,
`ajustes.html` no carga nada relacionado a la cámara o al carrito.

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
que abra tu app.

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
escritura a las 6 colecciones que usa el sistema (evita que alguien
cree colecciones raras o borre cosas fuera de esas 6), y limitar el
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

Esto ya evita accidentes comunes (que se borre el historial de ventas o
de movimientos), aunque para una protección real necesitarías agregar
un login — si más adelante quieres eso, es un paso aparte que se puede
sumar sin romper nada de lo que ya tienes.

Después de pegar las reglas, haz clic en **Publicar**.

### 1.5 Las colecciones se crean solas
No necesitas crear nada más a mano en Firestore. El sistema usa
**6 colecciones**, y Firebase las crea automáticamente la primera vez que
guardas algo desde la app:

| Colección              | Qué guarda                                          |
|-------------------------|------------------------------------------------------|
| `productos`             | Tu catálogo (nombre, EAN, categoría, precio, stock)   |
| `categorias`             | Los nombres de categoría que vas creando               |
| `ventas`                  | Historial de ventas confirmadas (pagadas o fiadas)      |
| `listas`                    | Pedidos/cotizaciones de clientes de confianza             |
| `cuentas`                     | Cuentas a fiado: saldo y movimientos por cliente           |
| `movimientosInventario`        | Entradas (compras) y salidas de stock                        |

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
`sw.js` (de `"sistema-v4"` a `"sistema-v5"`, etc.) para que los
celulares con la app ya instalada descarguen la versión nueva.

---

## 4. Cómo está organizado por dentro

**Inicio** tiene 4 accesos grandes: cada uno abre su propia página, con
su propia barra de pestañas abajo y una flecha para volver a Inicio.

### Ventas — *Vender · Listas · Resumen*
- **Vender:** escanea con la cámara, busca por texto o por voz, o agrega
  un "producto libre" (sin código). Al confirmar, eliges si la venta es
  **Pagada** o **Fiado** — si es fiado, se carga sola a la cuenta del
  cliente (se crea la cuenta si no existía). Debajo del carrito hay una
  tarjeta **"Cobrar con Yape"** con tu QR, para que el cliente escanee y
  pague ahí mismo.
- **Listas:** arma el pedido de un cliente de confianza con anticipación
  y conviértelo en venta con un toque cuando llegue.
- **Resumen:** ventas del día, cierre de caja, más vendidos y clientes
  frecuentes.

### Inventario — *Categorías · Movimientos · Alertas · Registrar*
- **Categorías:** tus productos agrupados en botones grandes con un
  ícono elegido automáticamente según el nombre de la categoría. Tiene
  buscador propio para todo el inventario; al entrar a una categoría hay
  buscador y orden (A-Z, precio, stock) solo para esa categoría, y un
  reporte en PDF del catálogo completo, valorizado.
- **Movimientos:** historial de entradas (compras) y salidas (ventas o
  ajustes/mermas), filtrable por rango de fechas, con reporte en PDF.
- **Alertas:** productos con bajo stock, con un botón directo para
  registrar la compra.
- **Registrar:** formulario para dar de alta productos.

El stock se descuenta solo con cada venta (pagada o fiada) y aumenta solo
cuando registras una compra en "Movimientos".

### Cuentas — *Cuentas · Resumen*
- **Cuentas:** lista de clientes con fiado abierto, cada una con su
  historial completo, un botón para **registrar un abono**, y un botón
  para **descargar el estado de cuenta en PDF**.
- **Resumen:** cuánto te deben en total y el ranking de mayores deudas.

### Ajustes
Apariencia (5 temas de color — el que elijas se aplica en toda la app,
no solo aquí), información general del sistema y la guía rápida.

---

## 5. Tu QR de Yape

Ve a `img/LEEME.txt` para el paso a paso. En resumen: guarda tu código QR
como `img/qr-yape.png`, y escribe tu nombre en `NEGOCIO.propietaria`
dentro de `js/config.js`. Aparece automáticamente en Ventas → Vender.
Si todavía no subiste la imagen, se ve un aviso en su lugar — no es un
error, es solo un recordatorio.

## Notas importantes

- **Voz:** funciona bien en Chrome/Android. En iPhone (Safari) puede no
  estar disponible — si el navegador no la soporta, el botón de
  micrófono simplemente no aparece.
- **WhatsApp:** el botón abre el chat con el resumen en texto; la imagen
  de la boleta la adjuntas tú, ya descargada (WhatsApp no deja adjuntar
  archivos automáticamente desde un link).
- **Linterna:** no todos los celulares la exponen al navegador. Si no
  está disponible, el botón se queda oculto.
- **Sin internet:** si Firebase no está configurado o no hay conexión,
  cada página avisa con una notificación (excepto Inicio, que no
  necesita conexión para mostrar sus accesos).
- **Los PDF** se generan en el propio celular (no se sube nada a
  servidores externos), con la librería jsPDF cargada desde una CDN.
