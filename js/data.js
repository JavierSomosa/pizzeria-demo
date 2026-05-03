/**
 * DataStore – Capa de datos para Pizzería Demo
 *
 * Productos y pedidos → Supabase
 * Settings (configuración del local) → localStorage (sin cambios)
 *
 * Todas las funciones de DB son async/await.
 * Se expone como window.DataStore para compatibilidad con app.js y admin.js.
 */
const DataStore = (() => {
  'use strict';

  // ── Cliente Supabase ─────────────────────────────────────────
  const client = supabase.createClient(
    window.SUPABASE_URL,
    window.SUPABASE_ANON_KEY
  );

  // ── Mappers: columnas DB (español) ↔ objetos JS (inglés) ────
  function mapProduct(row) {
    return {
      id:          row.id,
      name:        row.nombre,
      description: row.descripcion || '',
      price:       Number(row.precio),
      category:    row.categoria,
      image:       row.imagen_url  || '',
      available:   row.disponible,
    };
  }

  function mapOrder(row) {
    return {
      id:      row.id,
      date:    new Date(row.created_at).toLocaleString('es-AR'),
      items:   row.items,
      total:   Number(row.total),
      estado:  row.estado,
      name:    row.nombre    || '',
      phone:   row.telefono  || '',
      address: row.direccion || '',
      payment: row.pago      || '',
      notes:   row.notas     || '',
    };
  }

  // ── Productos por defecto (se insertan si la tabla está vacía) ─
  const DEFAULT_PRODUCTS = [
    { name: 'Margherita',              description: 'Salsa de tomate artesanal, mozzarella fresca y albahaca. El clásico italiano que nunca falla.',           price: 1200, category: 'pizzas',    image: 'assets/images/pizza_margherita.png', available: true },
    { name: 'Pepperoni',               description: 'Cargada con pepperoni importado sobre una base de mozzarella derretida y salsa especial.',                 price: 1500, category: 'pizzas',    image: 'assets/images/pizza_pepperoni.png',  available: true },
    { name: 'Cuatro Quesos',           description: 'Mozzarella, provolone, parmesano y azul. Una explosión de sabor para los amantes del queso.',             price: 1600, category: 'pizzas',    image: 'assets/images/pizza_margherita.png', available: true },
    { name: 'Napolitana',              description: 'Salsa de tomate, mozzarella, rodajas de tomate fresco, orégano y ajo. Un hit de la casa.',                 price: 1350, category: 'pizzas',    image: 'assets/images/pizza_pepperoni.png',  available: true },
    { name: 'Empanada de Carne',       description: 'Rellena de carne picada jugosa, cebolla, huevo y aceitunas. Receta de la abuela.',                         price: 380,  category: 'empanadas', image: 'assets/images/empanadas.png',         available: true },
    { name: 'Empanada de Pollo',       description: 'Pollo tierno desmenuzado con morrón, cebolla caramelizada y especias criollas.',                           price: 380,  category: 'empanadas', image: 'assets/images/empanadas.png',         available: true },
    { name: 'Empanada de Jamón y Queso', description: 'Jamón cocido y queso cremoso fundido. Sencilla, irresistible y siempre disponible.',                    price: 350,  category: 'empanadas', image: 'assets/images/empanadas.png',         available: true },
    { name: 'Coca-Cola 1.5L',          description: 'La bebida perfecta para acompañar tu pizza. Bien fresquita.',                                              price: 650,  category: 'bebidas',   image: 'assets/images/bebida.png',            available: true },
    { name: 'Sprite 1.5L',             description: 'Refrescante y burbujeante. Ideal para cortar la grasa y disfrutar más.',                                   price: 650,  category: 'bebidas',   image: 'assets/images/bebida.png',            available: true },
    { name: 'Agua Mineral 500ml',      description: 'Agua mineral sin gas. La opción liviana para el que cuida la línea.',                                      price: 300,  category: 'bebidas',   image: 'assets/images/bebida.png',            available: true },
    { name: 'Combo Familiar',          description: '2 pizzas grandes + 12 empanadas + 2 Coca-Cola 1.5L. ¡Para toda la familia!',                               price: 5200, category: 'promos',    image: 'assets/images/promo_combo.png',       available: true },
    { name: 'Promo Pareja',            description: '1 pizza grande + 6 empanadas + 1 bebida 1.5L. Perfecta para compartir.',                                   price: 2800, category: 'promos',    image: 'assets/images/promo_combo.png',       available: true },
  ];

  // ── Settings (localStorage — sin cambios) ───────────────────
  const SETTINGS_KEY = 'pdemo_settings';
  const DEFAULT_SETTINGS = {
    whatsapp: '+5491123722551',
    address:  'Av. Siempre Viva 123, Buenos Aires',
    delivery: {
      zones:         'Hacemos envíos en un radio de 5 km desde el local. Consultá tu zona por WhatsApp.',
      minOrder:      1500,
      estimatedTime: '30 – 45 minutos',
    },
    hours: [
      { day: 'Lunes a Jueves',   time: '18:00 – 23:00' },
      { day: 'Viernes y Sábado', time: '18:00 – 00:30' },
      { day: 'Domingo',          time: '18:00 – 23:00' },
    ],
  };

  // ── Init ──────────────────────────────────────────────────────
  async function init() {
    // Settings: inicializar en localStorage si no existen
    if (!localStorage.getItem(SETTINGS_KEY)) {
      localStorage.setItem(SETTINGS_KEY, JSON.stringify(DEFAULT_SETTINGS));
    }

    // Sembrar productos por defecto si la tabla está vacía
    const { count, error } = await client
      .from('productos')
      .select('*', { count: 'exact', head: true });

    if (error) {
      console.error('[DataStore] init – error al verificar productos:', error.message);
      return;
    }

    if (count === 0) {
      const rows = DEFAULT_PRODUCTS.map(p => ({
        nombre:      p.name,
        descripcion: p.description,
        precio:      p.price,
        categoria:   p.category,
        imagen_url:  p.image,
        disponible:  p.available,
      }));
      const { error: insErr } = await client.from('productos').insert(rows);
      if (insErr) console.error('[DataStore] init – error al insertar defaults:', insErr.message);
    }
  }

  // ── Productos ─────────────────────────────────────────────────
  async function getProducts() {
    const { data, error } = await client
      .from('productos')
      .select('*')
      .order('id');
    if (error) { console.error('[DataStore] getProducts:', error.message); return []; }
    return data.map(mapProduct);
  }

  async function addProduct(product) {
    const { data, error } = await client
      .from('productos')
      .insert({
        nombre:      product.name,
        descripcion: product.description || '',
        precio:      product.price,
        categoria:   product.category,
        imagen_url:  product.image || '',
        disponible:  product.available !== false,
      })
      .select()
      .single();
    if (error) { console.error('[DataStore] addProduct:', error.message); throw error; }
    return mapProduct(data);
  }

  async function updateProduct(id, data) {
    const patch = {};
    if (data.name        !== undefined) patch.nombre      = data.name;
    if (data.description !== undefined) patch.descripcion = data.description;
    if (data.price       !== undefined) patch.precio      = data.price;
    if (data.category    !== undefined) patch.categoria   = data.category;
    if (data.image       !== undefined) patch.imagen_url  = data.image;
    if (data.available   !== undefined) patch.disponible  = data.available;

    const { error } = await client.from('productos').update(patch).eq('id', id);
    if (error) { console.error('[DataStore] updateProduct:', error.message); throw error; }
  }

  async function deleteProduct(id) {
    const { error } = await client.from('productos').delete().eq('id', id);
    if (error) { console.error('[DataStore] deleteProduct:', error.message); throw error; }
  }

  // ── Settings (localStorage) ───────────────────────────────────
  function getSettings() {
    return JSON.parse(localStorage.getItem(SETTINGS_KEY)) || DEFAULT_SETTINGS;
  }
  function saveSettings(settings) {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }

  // ── Pedidos ───────────────────────────────────────────────────
  async function getOrders() {
    const { data, error } = await client
      .from('pedidos')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) { console.error('[DataStore] getOrders:', error.message); return []; }
    return data.map(mapOrder);
  }

  async function addOrder(order) {
    const { data, error } = await client
      .from('pedidos')
      .insert({
        items:     order.items,
        total:     order.total,
        estado:    'nuevo',
        nombre:    order.name,
        telefono:  order.phone,
        direccion: order.address,
        pago:      order.payment,
        notas:     order.notes || '',
      })
      .select()
      .single();
    if (error) { console.error('[DataStore] addOrder:', error.message); throw error; }
    return mapOrder(data);
  }

  // ── API pública ───────────────────────────────────────────────
  return {
    init,
    getProducts, addProduct, updateProduct, deleteProduct,
    getSettings, saveSettings,
    getOrders,   addOrder,
  };
})();
