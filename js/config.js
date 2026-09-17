/* ==========================================================================
   CONFIG.JS
   -----------------------------------------------------------------------
   Este es el ÚNICO archivo que necesitas editar para conectar tu propia
   base de datos de Firebase y poner los datos de tu negocio.

   Cómo conseguir los datos de Firebase (5 minutos):
   1. Entra a https://console.firebase.google.com
   2. Crea un proyecto nuevo (o usa uno existente).
   3. Dentro del proyecto: ⚙️ Configuración del proyecto > "Tus apps" >
      ícono </> (Web) > registra la app.
   4. Firebase te mostrará un bloque "firebaseConfig" — copia esos valores
      aquí abajo, reemplazando los que dicen "TU_...".
   5. En el menú lateral entra a "Firestore Database" > "Crear base de
      datos" y actívala (edición Standard).
   6. En "Reglas" de Firestore, mientras pruebas puedes usar algo simple
      como lo de abajo (¡cámbialo antes de operar en serio!):

        rules_version = '2';
        service cloud.firestore {
          match /databases/{database}/documents {
            match /{document=**} {
              allow read, write: if true;
            }
          }
        }

   (Al final de la guía que te dejamos aparte tienes el paso a paso
   completo de Firebase, con las reglas recomendadas para cuando el
   negocio ya esté operando en serio.)

   El sistema usa 6 colecciones (se crean solas, no hay que hacer nada
   manual en Firestore): productos, categorias, ventas, listas, cuentas
   (fiado) y movimientosInventario (entradas/salidas de stock).
   ========================================================================== */

const firebaseConfig = {
  apiKey: "AIzaSyAoidKmL0tHVHaWX6irhthZhTjZdkB044k",
  authDomain: "v-pay-store.firebaseapp.com",
  projectId: "v-pay-store",
  storageBucket: "v-pay-store.firebasestorage.app",
  messagingSenderId: "535662545801",
  appId: "1:535662545801:web:b8a8423c4a4eb17a7e2f58"
};


/* Datos de tu negocio: edítalos con los tuyos. */
const NEGOCIO = {
  nombre: "Mi Negocio", // aparece en el título de la pestaña, la boleta y los reportes PDF
  propietaria: "Nombre de la dueña o el dueño", // aparece debajo del QR de Yape, en Inicio
  moneda: "S/", // símbolo de moneda usado en toda la app
  whatsappCodigoPais: "51", // Perú. Cámbialo si vendes desde otro país.
  creador: "Viax Studio", // crédito mostrado en "Ajustes"

  // Clave de 4 dígitos para entrar a Ventas, Inventario, Cuentas y Ajustes
  // (todo lo que un cliente NO debería poder abrir). "Pedidos" es la única
  // página sin clave, porque es la que usan tus clientes.
  // No es una contraseña de verdad -vive en este mismo archivo- pero
  // alcanza para que un cliente o un curioso no entre por accidente.
  pin: "1234"
};
