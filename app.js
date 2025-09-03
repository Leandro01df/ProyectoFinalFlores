// ==========================
// VARIABLES GLOBALES
// ==========================
let productos = [];
let carrito = [];
let paginaActual = 1;
const productosPorPagina = 4;

const contenedorProductos = document.getElementById("contenedor-productos");
const filtroCategoria = document.getElementById("filtroCategoria");
const ordenar = document.getElementById("ordenar");
const buscador = document.getElementById("buscador");
const panelCarrito = document.getElementById("panel-carrito");
const btnCarrito = document.getElementById("btnCarrito");
const itemsCarrito = document.getElementById("items-carrito");
const subtotalEl = document.getElementById("subtotal");
const impuestosEl = document.getElementById("impuestos");
const totalEl = document.getElementById("total");
const paginacionEl = document.getElementById("paginacion");
const vaciarCarritoBtn = document.getElementById("vaciarCarrito");
const btnComprar = document.getElementById("btnComprar");
const toggleDark = document.getElementById("toggleDark");

// ==========================
// CARGAR PRODUCTOS
// ==========================
async function cargarProductos() {
  try {
    const response = await fetch("productos.json");
    productos = await response.json();
    cargarCategorias();
    actualizarVista();
  } catch (error) {
    console.error("Error al cargar productos:", error);
    Swal.fire("Error", "No se pudieron cargar los productos", "error");
  }
}

// ==========================
// CARGAR CATEGORÍAS
// ==========================
function cargarCategorias() {
  const categorias = ["Todas", ...new Set(productos.map(p => p.categoria))];
  filtroCategoria.innerHTML = categorias.map(cat => `<option value="${cat}">${cat}</option>`).join("");
}

// ==========================
// EVENTOS
// ==========================
filtroCategoria.addEventListener("change", () => { paginaActual = 1; actualizarVista(); });
ordenar.addEventListener("change", actualizarVista);
buscador.addEventListener("input", () => { paginaActual = 1; actualizarVista(); });
btnCarrito.addEventListener("click", () => panelCarrito.classList.toggle("hidden"));
vaciarCarritoBtn.addEventListener("click", vaciarCarrito);
btnComprar.addEventListener("click", finalizarCompra);
toggleDark.addEventListener("click", () => document.body.classList.toggle("dark-mode"));

// ==========================
// MOSTRAR PRODUCTOS
// ==========================
function actualizarVista() {
  let lista = [...productos];

  // Filtrar por categoría
  const categoria = filtroCategoria.value;
  if (categoria !== "Todas") lista = lista.filter(p => p.categoria === categoria);

  // Filtrar por búsqueda
  const busqueda = buscador.value.toLowerCase();
  if (busqueda) lista = lista.filter(p => p.nombre.toLowerCase().includes(busqueda));

  // Ordenar
  const criterio = ordenar.value;
  if (criterio === "precio-asc") lista.sort((a,b)=>a.precio-b.precio);
  if (criterio === "precio-desc") lista.sort((a,b)=>b.precio-a.precio);
  if (criterio === "nombre-asc") lista.sort((a,b)=>a.nombre.localeCompare(b.nombre));
  if (criterio === "nombre-desc") lista.sort((a,b)=>b.nombre.localeCompare(a.nombre));

  mostrarProductos(lista);
  renderizarPaginacion(lista.length);
}

function mostrarProductos(lista) {
  const inicio = (paginaActual-1)*productosPorPagina;
  const fin = inicio + productosPorPagina;
  const pagina = lista.slice(inicio, fin);

  contenedorProductos.innerHTML = pagina.map(p => `
    <div class="producto">
      <img src="${p.imagen}" alt="${p.nombre}">
      <h3>${p.nombre}</h3>
      <p>$${p.precio.toLocaleString()}</p>
      <button class="btn primary" onclick="agregarAlCarrito(${p.id})">Agregar</button>
    </div>
  `).join("");
}

// ==========================
// PAGINACIÓN
// ==========================
function renderizarPaginacion(totalProductos) {
  const totalPaginas = Math.ceil(totalProductos / productosPorPagina);
  paginacionEl.innerHTML = `
    <button ${paginaActual===1?'disabled':''} onclick="cambiarPagina(-1)">Anterior</button>
    <span>Página ${paginaActual} de ${totalPaginas}</span>
    <button ${paginaActual===totalPaginas?'disabled':''} onclick="cambiarPagina(1)">Siguiente</button>
  `;
}

function cambiarPagina(delta) {
  paginaActual += delta;
  actualizarVista();
}

// ==========================
// CARRITO
// ==========================
function agregarAlCarrito(id) {
  const producto = productos.find(p => p.id === id);
  if (!producto) return;

  const item = carrito.find(i => i.id === id);
  if (item) {
    if (item.cantidad < producto.stock) item.cantidad++;
    else return Swal.fire("Stock insuficiente", "No hay más unidades disponibles", "warning");
  } else carrito.push({...producto, cantidad:1});

  actualizarCarrito();
  actualizarContador();
  Swal.fire("Producto agregado", `${producto.nombre} se añadió al carrito`, "success");
}

function actualizarCarrito() {
  itemsCarrito.innerHTML = carrito.map(item => `
    <div class="item-carrito">
      <span>${item.nombre} x${item.cantidad}</span>
      <span>$${(item.precio*item.cantidad).toLocaleString()}</span>
      <button class="btn danger" onclick="eliminarDelCarrito(${item.id})">X</button>
    </div>
  `).join("");

  const subtotal = carrito.reduce((acc,i)=>acc+i.precio*i.cantidad,0);
  const impuestos = subtotal*0.21;
  const total = subtotal+impuestos;

  subtotalEl.textContent = `Subtotal: $${subtotal.toLocaleString()}`;
  impuestosEl.textContent = `Impuestos (21%): $${impuestos.toLocaleString()}`;
  totalEl.textContent = `Total: $${total.toLocaleString()}`;
}

function actualizarContador() {
  document.getElementById("contador").textContent = carrito.reduce((acc,i)=>acc+i.cantidad,0);
}

function eliminarDelCarrito(id) {
  carrito = carrito.filter(i=>i.id!==id);
  actualizarCarrito();
  actualizarContador();
}

function vaciarCarrito() {
  carrito = [];
  actualizarCarrito();
  actualizarContador();
}

// ==========================
// FINALIZAR COMPRA
// ==========================
function finalizarCompra() {
  if (carrito.length===0) return Swal.fire("Carrito vacío", "Agrega productos antes de comprar", "info");

  const cliente = { nombre:"Jose Gonzalez", email:"josegonzalez@gmail.com", direccion:"Calle 13, texas, Estados Unidos" };
  generarPDF(cliente, carrito);
  Swal.fire("Compra finalizada", "Se generó el comprobante de compra en PDF", "success");
  vaciarCarrito();
}

// ==========================
// GENERAR PDF
// ==========================
function generarPDF(cliente, carrito) {
  const { jsPDF } = window.jspdf;
  const doc = new jsPDF();

  doc.setFontSize(16);
  doc.text("Comprobante de Compra", 10, 10);
  doc.setFontSize(12);
  doc.text(`Cliente: ${cliente.nombre}`, 10, 20);
  doc.text(`Email: ${cliente.email}`, 10, 28);
  doc.text(`Dirección: ${cliente.direccion}`, 10, 36);
  doc.text("Productos:", 10, 46);

  let y = 56;
  carrito.forEach(item=>{
    doc.text(`${item.nombre} x${item.cantidad} - $${(item.precio*item.cantidad).toLocaleString()}`, 10, y);
    y+=8;
  });

  const total = carrito.reduce((acc,i)=>acc+i.precio*i.cantidad,0);
  doc.text(`Total: $${total.toLocaleString()}`, 10, y+8);

  doc.save("comprobante_compra.pdf");
}

// ==========================
// INICIALIZACIÓN
// ==========================
document.addEventListener("DOMContentLoaded", () => {
  cargarProductos();
  actualizarContador();
});
