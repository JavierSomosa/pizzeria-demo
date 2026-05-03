/**
 * admin.js – Admin panel logic for Pizzería Demo
 * Credentials: admin / pizza1234
 */
(async () => {
  'use strict';

  await DataStore.init();

  // ── Auth ─────────────────────────────────────────────────────
  const ADMIN_USER = 'admin';
  const ADMIN_PASS = 'pizza1234';
  const SESSION_KEY = 'pdemo_admin_session';

  const $ = id => document.getElementById(id);
  const loginPage   = $('login-page');
  const app         = $('app');
  const loginForm   = $('login-form');
  const loginError  = $('login-error');

  function isLoggedIn() {
    return sessionStorage.getItem(SESSION_KEY) === 'true';
  }
  function login() { sessionStorage.setItem(SESSION_KEY, 'true'); showApp(); }
  function logout() { sessionStorage.removeItem(SESSION_KEY); location.reload(); }

  loginForm.addEventListener('submit', e => {
    e.preventDefault();
    const u = $('l-user').value.trim();
    const p = $('l-pass').value;
    if (u === ADMIN_USER && p === ADMIN_PASS) {
      loginError.textContent = '';
      login();
    } else {
      loginError.textContent = '❌ Usuario o contraseña incorrectos.';
    }
  });

  $('logout-btn').addEventListener('click', logout);

  function showApp() {
    loginPage.style.display = 'none';
    app.classList.add('visible');
    renderView('products');
  }

  if (isLoggedIn()) showApp();

  // ── Navigation ───────────────────────────────────────────────
  let currentView = 'products';

  document.querySelectorAll('.nav-item[data-view]').forEach(item => {
    item.addEventListener('click', () => renderView(item.dataset.view));
  });

  async function renderView(view) {
    currentView = view;
    document.querySelectorAll('.nav-item[data-view]').forEach(i => i.classList.remove('active'));
    const navEl = $('nav-' + view);
    if (navEl) navEl.classList.add('active');

    const titles = { products: '🍕 Productos', orders: '📦 Pedidos', settings: '⚙️ Configuración' };
    $('view-title').textContent = titles[view] || '';

    const renderFns = { products: renderProductsView, orders: renderOrdersView, settings: renderSettingsView };
    if (renderFns[view]) await renderFns[view]();
  }

  // ── Modal helpers ────────────────────────────────────────────
  const modalOverlay = $('admin-modal-overlay');
  const modalTitle   = $('admin-modal-title');
  const modalBody    = $('admin-modal-body');
  const modalFooter  = $('admin-modal-footer');

  function openModal(title, bodyHTML, footerHTML) {
    modalTitle.textContent = title;
    modalBody.innerHTML    = bodyHTML;
    modalFooter.innerHTML  = footerHTML;
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModal() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  $('close-admin-modal').addEventListener('click', closeModal);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModal(); });

  // ── Helper: format price ─────────────────────────────────────
  function fmt(n) { return '$' + Number(n).toLocaleString('es-AR'); }

  const CATEGORIES = [
    { value: 'pizzas',    label: '🍕 Pizzas' },
    { value: 'empanadas', label: '🥟 Empanadas' },
    { value: 'bebidas',   label: '🥤 Bebidas' },
    { value: 'promos',    label: '🔥 Promos' },
  ];
  const catLabel = v => (CATEGORIES.find(c => c.value === v) || {}).label || v;

  // ─────────────────────────────────────────────────────────────
  // VIEW: PRODUCTS
  // ─────────────────────────────────────────────────────────────
  async function renderProductsView() {
    const products = await DataStore.getProducts();

    // Top bar
    $('top-bar-actions').innerHTML = `
      <button class="btn btn-primary" id="add-product-btn">+ Agregar producto</button>`;
    $('add-product-btn').addEventListener('click', () => openProductModal(null));

    // Stats
    const total     = products.length;
    const available = products.filter(p => p.available).length;
    const soldout   = total - available;

    // Content
    $('content-area').innerHTML = `
      <div class="stat-cards">
        <div class="stat-card"><div class="stat-icon">📦</div><div class="stat-val">${total}</div><div class="stat-label">Total productos</div></div>
        <div class="stat-card"><div class="stat-icon">✅</div><div class="stat-val">${available}</div><div class="stat-label">Disponibles</div></div>
        <div class="stat-card"><div class="stat-icon">🚫</div><div class="stat-val">${soldout}</div><div class="stat-label">Agotados</div></div>
      </div>
      <div class="table-wrap">
        <table class="admin-table" id="products-table">
          <thead>
            <tr>
              <th>Foto</th>
              <th>Nombre</th>
              <th>Categoría</th>
              <th>Precio</th>
              <th>Estado</th>
              <th>Acciones</th>
            </tr>
          </thead>
          <tbody id="products-tbody"></tbody>
        </table>
      </div>`;

    renderProductsTable(products);
  }

  // Recibe products como parámetro para evitar una segunda llamada a la DB
  function renderProductsTable(products) {
    const tbody = $('products-tbody');
    if (!tbody) return;

    if (products.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" style="text-align:center;padding:40px;color:#aaa">No hay productos. ¡Agregá uno!</td></tr>`;
      return;
    }

    tbody.innerHTML = products.map(p => `
      <tr data-id="${p.id}">
        <td>
          <img class="product-thumb" src="${p.image}" alt="${p.name}"
               onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'48\\' height=\\'48\\'><rect fill=\\'%23ffeedd\\' width=\\'48\\' height=\\'48\\'/><text x=\\'50%25\\' y=\\'55%25\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-size=\\'24\\'>🍕</text></svg>'" />
        </td>
        <td style="font-weight:600">${p.name}</td>
        <td><span class="badge badge-cat">${catLabel(p.category)}</span></td>
        <td style="font-weight:700;color:var(--primary)">${fmt(p.price)}</td>
        <td>
          <button class="toggle-avail ${p.available ? 'available' : 'soldout'}" data-id="${p.id}">
            ${p.available ? '✅ Disponible' : '🚫 Agotado'}
          </button>
        </td>
        <td>
          <div class="actions-cell">
            <button class="btn btn-ghost btn-sm edit-btn" data-id="${p.id}">✏️ Editar</button>
            <button class="btn btn-danger btn-sm delete-btn" data-id="${p.id}">🗑 Borrar</button>
          </div>
        </td>
      </tr>
    `).join('');

    tbody.querySelectorAll('.toggle-avail').forEach(btn => {
      btn.addEventListener('click', async () => {
        const p = products.find(x => x.id === +btn.dataset.id);
        if (!p) return;
        await DataStore.updateProduct(p.id, { available: !p.available });
        await renderProductsView();
      });
    });
    tbody.querySelectorAll('.edit-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const p = products.find(x => x.id === +btn.dataset.id);
        if (p) openProductModal(p);
      });
    });
    tbody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', async () => {
        if (!confirm('¿Seguro que querés borrar este producto?')) return;
        await DataStore.deleteProduct(+btn.dataset.id);
        await renderProductsView();
      });
    });
  }

  function openProductModal(product) {
    const isEdit = !!product;
    const catOptions = CATEGORIES.map(c =>
      `<option value="${c.value}" ${product && product.category === c.value ? 'selected' : ''}>${c.label}</option>`
    ).join('');

    const body = `
      <div class="form-row">
        <div class="form-group">
          <label for="p-name">Nombre *</label>
          <input id="p-name" type="text" value="${isEdit ? product.name : ''}" placeholder="Ej: Margherita" required />
        </div>
        <div class="form-group">
          <label for="p-price">Precio *</label>
          <input id="p-price" type="number" min="0" value="${isEdit ? product.price : ''}" placeholder="1200" required />
        </div>
      </div>
      <div class="form-group">
        <label for="p-desc">Descripción</label>
        <textarea id="p-desc" rows="2" placeholder="Describí el producto...">${isEdit ? product.description : ''}</textarea>
      </div>
      <div class="form-row">
        <div class="form-group">
          <label for="p-cat">Categoría</label>
          <select id="p-cat">${catOptions}</select>
        </div>
        <div class="form-group">
          <label>Foto del producto</label>
          <div class="img-upload-area" id="img-upload-area" tabindex="0" role="button" aria-label="Subir foto">
            <img id="img-preview" src="${isEdit && product.image ? product.image : ''}"
                 style="${isEdit && product.image ? 'display:block' : 'display:none'}"
                 alt="Vista previa" />
            <div class="img-upload-placeholder" id="img-placeholder"
                 style="${isEdit && product.image ? 'display:none' : 'display:flex'}">
              <span style="font-size:1.6rem">📷</span>
              <span>Subir foto</span>
              <span style="font-size:.75rem;opacity:.6">JPG, PNG, WebP · máx. 2 MB</span>
            </div>
          </div>
          <input type="file" id="p-image-file" accept="image/*" style="display:none" />
          <input type="hidden" id="p-image" value="${isEdit ? product.image : ''}" />
          <span id="img-upload-error" style="display:none;color:#C0392B;font-size:.8rem;margin-top:4px"></span>
        </div>
      </div>
      <div class="form-group">
        <label>Disponibilidad</label>
        <div class="avail-toggle-row">
          <label class="switch">
            <input type="checkbox" id="p-available" ${!isEdit || product.available ? 'checked' : ''} />
            <span class="slider"></span>
          </label>
          <span id="avail-label">${!isEdit || product.available ? 'Disponible' : 'Agotado'}</span>
        </div>
      </div>`;

    const footer = `
      <button class="btn btn-ghost" id="cancel-product-modal">Cancelar</button>
      <button class="btn btn-primary" id="save-product-btn">${isEdit ? 'Guardar cambios' : 'Agregar producto'}</button>`;

    openModal(isEdit ? '✏️ Editar producto' : '➕ Agregar producto', body, footer);

    // Live avail label
    $('p-available').addEventListener('change', () => {
      $('avail-label').textContent = $('p-available').checked ? 'Disponible' : 'Agotado';
    });

    // ── Image upload → base64 ────────────────────────────────
    const uploadArea  = $('img-upload-area');
    const fileInput   = $('p-image-file');
    const imgPreview  = $('img-preview');
    const imgHolder   = $('p-image');
    const placeholder = $('img-placeholder');
    const uploadErr   = $('img-upload-error');

    function triggerUpload() { fileInput.click(); }
    uploadArea.addEventListener('click', triggerUpload);
    uploadArea.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') triggerUpload(); });

    fileInput.addEventListener('change', () => {
      const file = fileInput.files[0];
      if (!file) return;
      if (file.size > 2 * 1024 * 1024) {
        uploadErr.textContent = '⚠️ La imagen supera los 2 MB. Elegí una más pequeña.';
        uploadErr.style.display = 'block';
        fileInput.value = '';
        return;
      }
      uploadErr.style.display = 'none';
      const reader = new FileReader();
      reader.onload = ev => {
        const base64 = ev.target.result;
        imgHolder.value       = base64;
        imgPreview.src        = base64;
        imgPreview.style.display   = 'block';
        placeholder.style.display  = 'none';
      };
      reader.readAsDataURL(file);
    });

    $('cancel-product-modal').addEventListener('click', closeModal);

    $('save-product-btn').addEventListener('click', async () => {
      const name  = $('p-name').value.trim();
      const price = parseFloat($('p-price').value);
      if (!name || isNaN(price) || price < 0) {
        alert('Nombre y precio son obligatorios.');
        return;
      }
      const data = {
        name,
        price,
        description: $('p-desc').value.trim(),
        category:    $('p-cat').value,
        image:       $('p-image').value.trim() || 'assets/images/pizza_margherita.png',
        available:   $('p-available').checked,
      };
      if (isEdit) await DataStore.updateProduct(product.id, data);
      else        await DataStore.addProduct(data);
      closeModal();
      await renderProductsView();
    });
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW: ORDERS
  // ─────────────────────────────────────────────────────────────
  async function renderOrdersView() {
    $('top-bar-actions').innerHTML = '';
    const orders = await DataStore.getOrders();

    let html;
    if (orders.length === 0) {
      html = `<div class="empty-state"><div class="empty-icon">📭</div><p>Todavía no hay pedidos registrados.</p></div>`;
    } else {
      html = `<div class="orders-list">` + orders.map(o => `
        <div class="order-card">
          <div class="order-card-header">
            <div>
              <div class="order-card-title">👤 ${o.name}</div>
              <div class="order-card-date">📅 ${o.date}</div>
            </div>
            <div class="order-card-total">${fmt(o.total)}</div>
          </div>
          <div class="order-items-list">
            ${(o.items || []).map(i => `<div>• ${i.qty}× ${i.name} — ${fmt(i.price * i.qty)}</div>`).join('')}
          </div>
          <div class="order-meta">
            <span>📞 ${o.phone}</span>
            <span>📍 ${o.address}</span>
            <span>💳 ${o.payment}</span>
            ${o.notes ? `<span>📝 ${o.notes}</span>` : ''}
          </div>
        </div>
      `).join('') + `</div>`;
    }
    $('content-area').innerHTML = html;
  }

  // ─────────────────────────────────────────────────────────────
  // VIEW: SETTINGS
  // ─────────────────────────────────────────────────────────────
  function renderSettingsView() {
    $('top-bar-actions').innerHTML = '';
    const s = DataStore.getSettings();

    $('content-area').innerHTML = `
      <!-- Delivery -->
      <div class="settings-section">
        <h3>📦 Información de envíos</h3>
        <div class="form-group">
          <label for="s-whatsapp">Número de WhatsApp</label>
          <input id="s-whatsapp" type="text" value="${s.whatsapp}" placeholder="+5491100000000" />
        </div>
        <div class="form-group">
          <label for="s-zones">Zonas de envío</label>
          <textarea id="s-zones" rows="2">${s.delivery.zones}</textarea>
        </div>
        <div class="form-row">
          <div class="form-group">
            <label for="s-min">Pedido mínimo ($)</label>
            <input id="s-min" type="number" value="${s.delivery.minOrder}" min="0" />
          </div>
          <div class="form-group">
            <label for="s-time">Tiempo estimado</label>
            <input id="s-time" type="text" value="${s.delivery.estimatedTime}" placeholder="30 – 45 minutos" />
          </div>
        </div>
        <div class="form-group">
          <label for="s-address">Dirección del local</label>
          <input id="s-address" type="text" value="${s.address}" placeholder="Av. Ejemplo 123" />
        </div>
        <button class="btn btn-primary" id="save-delivery-btn">💾 Guardar cambios</button>
      </div>

      <!-- Hours -->
      <div class="settings-section">
        <h3>🕐 Horarios de atención</h3>
        <div id="hours-rows">
          ${s.hours.map((h, i) => hoursRowHTML(i, h.day, h.time)).join('')}
        </div>
        <button class="btn btn-ghost btn-sm add-hours-row" id="add-hour-btn">+ Agregar horario</button>
        <br/><br/>
        <button class="btn btn-primary" id="save-hours-btn">💾 Guardar horarios</button>
      </div>`;

    bindSettingsEvents();
  }

  function hoursRowHTML(idx, day, time) {
    return `
      <div class="hours-row" data-idx="${idx}">
        <input type="text" class="h-day" value="${day}" placeholder="Ej: Lunes a Viernes" />
        <input type="text" class="h-time" value="${time}" placeholder="Ej: 18:00 – 23:00" />
        <button class="remove-hour-btn" data-idx="${idx}">🗑</button>
      </div>`;
  }

  function bindSettingsEvents() {
    // Add hour row
    $('add-hour-btn').addEventListener('click', () => {
      const container = $('hours-rows');
      const idx = container.querySelectorAll('.hours-row').length;
      container.insertAdjacentHTML('beforeend', hoursRowHTML(idx, '', ''));
      bindRemoveHours();
    });

    bindRemoveHours();

    // Save delivery
    $('save-delivery-btn').addEventListener('click', () => {
      const s = DataStore.getSettings();
      s.whatsapp        = $('s-whatsapp').value.trim();
      s.address         = $('s-address').value.trim();
      s.delivery.zones  = $('s-zones').value.trim();
      s.delivery.minOrder   = parseFloat($('s-min').value) || 0;
      s.delivery.estimatedTime = $('s-time').value.trim();
      DataStore.saveSettings(s);
      showNotif('✅ Configuración de envíos guardada.');
    });

    // Save hours
    $('save-hours-btn').addEventListener('click', () => {
      const rows = document.querySelectorAll('#hours-rows .hours-row');
      const hours = [];
      rows.forEach(row => {
        const day  = row.querySelector('.h-day').value.trim();
        const time = row.querySelector('.h-time').value.trim();
        if (day && time) hours.push({ day, time });
      });
      const s = DataStore.getSettings();
      s.hours = hours;
      DataStore.saveSettings(s);
      showNotif('✅ Horarios guardados.');
    });
  }

  function bindRemoveHours() {
    document.querySelectorAll('.remove-hour-btn').forEach(btn => {
      btn.onclick = () => btn.closest('.hours-row').remove();
    });
  }

  // ── Notification (inline) ────────────────────────────────────
  function showNotif(msg) {
    let notif = document.querySelector('.admin-notif');
    if (!notif) {
      notif = document.createElement('div');
      notif.className = 'admin-notif';
      notif.style.cssText = 'position:fixed;bottom:24px;right:24px;background:#1a0800;color:#fff;padding:14px 20px;border-radius:10px;font-size:.9rem;font-weight:600;z-index:9999;border-left:4px solid #27ae60;box-shadow:0 4px 20px rgba(0,0,0,.3);transition:opacity .3s';
      document.body.appendChild(notif);
    }
    notif.textContent = msg;
    notif.style.opacity = '1';
    clearTimeout(notif._timer);
    notif._timer = setTimeout(() => { notif.style.opacity = '0'; }, 3000);
  }

})();
