/* ==========================================================================
   ICONOS.JS
   Íconos SVG de línea (sin emojis) reutilizados en toda la app: uno por
   cada tipo de categoría de inventario, elegido automáticamente según el
   nombre que el usuario escribió (no hay que configurar nada a mano).
   ========================================================================== */

const RUTAS_ICONO = {
  lacteos: '<path d="M8 2h8l1 4-1 2v12a2 2 0 0 1-2 2H10a2 2 0 0 1-2-2V8L7 6Z"/><path d="M8 2 12 5l4-3"/>',
  bebidas: '<path d="M7 3h10l-1 5H8L7 3Z"/><path d="M8 8l1 12a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2l1-12"/><path d="M12 11v4"/>',
  panaderia: '<path d="M4 12c0-4 3-8 8-8s8 4 8 8-3 6-8 6-8-2-8-6Z"/><path d="M8 12h.01M12 12h.01M16 12h.01"/>',
  snacks: '<circle cx="12" cy="9" r="5"/><path d="M9 6 7 4M15 6l2-2M12 14v7"/>',
  limpieza: '<path d="M9 2h3v3H9z"/><path d="M8 5h5l2 3v12a2 2 0 0 1-2 2H9a2 2 0 0 1-2-2V8Z"/><path d="M15 6l3-1"/>',
  higiene: '<path d="M12 3s6 6.5 6 11a6 6 0 0 1-12 0c0-4.5 6-11 6-11Z"/>',
  abarrotes: '<path d="M7 8c0-3 2-5 5-5s5 2 5 5c2 1 3 3 3 6 0 5-4 7-8 7s-8-2-8-7c0-3 1-5 3-6Z"/><path d="M9 12h6"/>',
  cigarros: '<rect x="2" y="10" width="16" height="5" rx="1"/><path d="M18 10v5M21 11v3"/><path d="M6 10v5"/>',
  congelados: '<path d="M12 2v20M4.5 6.5l15 11M19.5 6.5l-15 11"/>',
  verduras: '<path d="M12 21c-5-1-8-5-8-10a9 9 0 0 1 9-9c0 5-1 9-5 12"/><path d="M12 21c0-6 2-11 7-14"/>',
  carnes: '<path d="M14 4c3 0 5 2 5 5 0 2-1 3-2 4l-6 6c-1.5 1.5-4 1.5-5.5 0s-1.5-4 0-5.5l6-6c1-1 2-2 4-2Z"/><circle cx="7" cy="17" r="2"/>',
  mascotas: '<circle cx="7" cy="8" r="2"/><circle cx="12" cy="6" r="2"/><circle cx="17" cy="8" r="2"/><path d="M8 15c0-2 2-4 4-4s4 2 4 4-2 4-4 4-4-2-4-4Z"/>',
  bebes: '<path d="M9 3h4v3H9z"/><path d="M8 6h6v3a3 3 0 0 1-1.5 5.2V21a1 1 0 0 1-1 1h-1a1 1 0 0 1-1-1v-6.8A3 3 0 0 1 8 9Z"/>',
  papeleria: '<path d="M4 20l1-4L16 5l3 3L8 19l-4 1Z"/><path d="M14 7l3 3"/>',
  licores: '<path d="M9 2h6v4l3 5v9a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2v-9l3-5Z"/><path d="M7 13h10"/>',
  otros: '<path d="M20 7 12 3 4 7v10l8 4 8-4V7Z"/><path d="M4 7l8 4 8-4M12 11v10"/>'
};

const REGLAS_CATEGORIA = [
  { patron: /l[aá]cte|leche|queso|yogur|mantequill/i, icono: "lacteos" },
  { patron: /gaseosa|bebida|jugo|n[eé]ctar|agua|refresco/i, icono: "bebidas" },
  { patron: /cerveza|licor|vino|pisco|whisky|ron\b/i, icono: "licores" },
  { patron: /pan|panader|reposter|torta/i, icono: "panaderia" },
  { patron: /snack|golosina|dulce|chocolate|galleta|caramelo/i, icono: "snacks" },
  { patron: /limpieza|detergente|lej[ií]a|desinfect/i, icono: "limpieza" },
  { patron: /higiene|cuidado personal|jab[oó]n|shampoo|champ[uú]|papel higi/i, icono: "higiene" },
  { patron: /abarrote|grano|arroz|az[uú]car|aceite|fideo|menestra|harina|sal\b/i, icono: "abarrotes" },
  { patron: /cigarro|tabaco/i, icono: "cigarros" },
  { patron: /congelado|helado/i, icono: "congelados" },
  { patron: /verdura|fruta|hortaliza/i, icono: "verduras" },
  { patron: /carne|pollo|pescado|embutido|res\b/i, icono: "carnes" },
  { patron: /mascota|perro|gato/i, icono: "mascotas" },
  { patron: /beb[eé]|pa[ñn]al/i, icono: "bebes" },
  { patron: /papeler|[uú]til escolar|cuaderno/i, icono: "papeleria" }
];

/** Elige automáticamente un ícono según el texto de la categoría (sin configuración manual) */
function claveIconoCategoria(nombreCategoria) {
  const texto = String(nombreCategoria || "");
  const regla = REGLAS_CATEGORIA.find((r) => r.patron.test(texto));
  return regla ? regla.icono : "otros";
}

/** Devuelve el <svg>…</svg> completo para una categoría dada */
function svgIconoCategoria(nombreCategoria, tamano = 22) {
  const clave = claveIconoCategoria(nombreCategoria);
  return `<svg width="${tamano}" height="${tamano}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round">${RUTAS_ICONO[clave]}</svg>`;
}
