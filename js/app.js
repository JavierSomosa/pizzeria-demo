/**
 * app.js – Public site logic for Pizzería Demo
 */
(async () => {
  'use strict';

  await DataStore.init();

  // ── State ───────────────────────────────────────────────────
  let cart = [];          // [{product, qty}]
  let products = [];      // caché local — se actualiza en renderMenu()
  let activeCategory = 'all';

  // ── DOM refs ────────────────────────────────────────────────
  const $ = id => document.getElementById(id);
  const productsGrid   = $('products-grid');
  const categoryTabs   = $('category-tabs');
  const cartBtn        = $('cart-btn');
  const cartCount      = $('cart-count');
  const cartOverlay    = $('cart-overlay');
  const cartDrawer     = $('cart-drawer');
  const closeCartBtn   = $('close-cart');
  const cartItemsEl    = $('cart-items');
  const cartFooter     = $('cart-footer');
  const cartSubtotal   = $('cart-subtotal');
  const cartTotal      = $('cart-total');
  const checkoutBtn    = $('checkout-btn');
  const modalOverlay   = $('modal-overlay');
  const closeModal     = $('close-modal');
  const checkoutForm   = $('checkout-form');
  const whatsappBtn    = $('whatsapp-btn');
  const modalOrderItems = $('modal-order-items');
  const modalTotal     = $('modal-total');
  const hamburger      = $('hamburger');
  const navLinks       = $('nav-links');

  // ── Navbar ──────────────────────────────────────────────────
  hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
  });
  document.addEventListener('click', e => {
    if (!e.target.closest('#navbar')) navLinks.classList.remove('open');
  });

  // ── Menu rendering ──────────────────────────────────────────
  async function renderMenu() {
    products = await DataStore.getProducts();
    const filtered = activeCategory === 'all'
      ? products
      : products.filter(p => p.category === activeCategory);

    if (filtered.length === 0) {
      productsGrid.innerHTML = `<div style="text-align:center;color:var(--text-muted);padding:60px;grid-column:1/-1">
        <div style="font-size:3rem">😔</div><p style="margin-top:12px;font-size:1rem">No hay productos en esta categoría.</p>
      </div>`;
      return;
    }

    productsGrid.innerHTML = filtered.map(p => `
      <article class="product-card" data-id="${p.id}">
        <div class="card-img">
          <img src="${p.image}" alt="${p.name}" loading="lazy"
               onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'300\\' height=\\'200\\'><rect fill=\\'%23ffeedd\\' width=\\'300\\' height=\\'200\\'/><text x=\\'50%25\\' y=\\'50%25\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-size=\\'48\\'>🍕</text></svg>'" />
          ${!p.available ? '<div class="badge-soldout">Agotado</div>' : ''}
        </div>
        <div class="card-body">
          <div class="card-name">${p.name}</div>
          <div class="card-desc">${p.description}</div>
          <div class="card-footer">
            <div class="card-price">${formatPrice(p.price)}</div>
            <button class="add-btn" data-id="${p.id}" ${!p.available ? 'disabled' : ''}>
              + Agregar
            </button>
          </div>
        </div>
      </article>
    `).join('');

    // bind add buttons
    productsGrid.querySelectorAll('.add-btn').forEach(btn => {
      btn.addEventListener('click', () => addToCart(+btn.dataset.id, btn));
    });
  }

  // ── Category tabs ───────────────────────────────────────────
  categoryTabs.addEventListener('click', e => {
    const tab = e.target.closest('.cat-tab');
    if (!tab) return;
    categoryTabs.querySelectorAll('.cat-tab').forEach(t => t.classList.remove('active'));
    tab.classList.add('active');
    activeCategory = tab.dataset.cat;
    renderMenu();
  });

  // ── Cart ────────────────────────────────────────────────────
  function addToCart(id, btn) {
    const product = products.find(p => p.id === id);
    if (!product || !product.available) return;
    const existing = cart.find(c => c.product.id === id);
    if (existing) {
      existing.qty += 1;
    } else {
      cart.push({ product, qty: 1 });
    }
    updateCartUI();

    // Visual confirmation on the button — no drawer opening
    if (btn) {
      const original = btn.innerHTML;
      btn.innerHTML = '✔ Agregado!';
      btn.style.background = '#27ae60';
      btn.disabled = true;
      setTimeout(() => {
        btn.innerHTML = original;
        btn.style.background = '';
        btn.disabled = false;
      }, 1000);
    }
  }

  function removeFromCart(id) {
    cart = cart.filter(c => c.product.id !== id);
    updateCartUI();
  }

  function changeQty(id, delta) {
    const item = cart.find(c => c.product.id === id);
    if (!item) return;
    item.qty += delta;
    if (item.qty <= 0) removeFromCart(id);
    else updateCartUI();
  }

  function getTotal() {
    return cart.reduce((sum, c) => sum + c.product.price * c.qty, 0);
  }
  function getCount() {
    return cart.reduce((sum, c) => sum + c.qty, 0);
  }

  function updateCartUI() {
    const count = getCount();
    const total = getTotal();

    // badge
    cartCount.textContent = count;
    cartCount.classList.toggle('show', count > 0);

    if (count === 0) {
      cartItemsEl.innerHTML = `
        <div class="cart-empty">
          <div class="empty-icon">🍕</div>
          <p>Tu carrito está vacío.<br>¡Agregá algo rico!</p>
        </div>`;
      cartFooter.style.display = 'none';
      return;
    }

    cartFooter.style.display = 'block';
    cartSubtotal.textContent = formatPrice(total);
    cartTotal.textContent    = formatPrice(total);

    cartItemsEl.innerHTML = cart.map(({ product: p, qty }) => `
      <div class="cart-item" data-id="${p.id}">
        <img class="cart-item-img" src="${p.image}" alt="${p.name}"
             onerror="this.src='data:image/svg+xml,<svg xmlns=\\'http://www.w3.org/2000/svg\\' width=\\'64\\' height=\\'64\\'><rect fill=\\'%23ffeedd\\' width=\\'64\\' height=\\'64\\'/><text x=\\'50%25\\' y=\\'55%25\\' dominant-baseline=\\'middle\\' text-anchor=\\'middle\\' font-size=\\'32\\'>🍕</text></svg>'" />
        <div class="cart-item-info">
          <div class="cart-item-name">${p.name}</div>
          <div class="cart-item-price">${formatPrice(p.price)} c/u</div>
          <div class="cart-item-controls">
            <button class="qty-btn" data-action="dec" data-id="${p.id}">−</button>
            <span class="qty-val">${qty}</span>
            <button class="qty-btn" data-action="inc" data-id="${p.id}">+</button>
          </div>
        </div>
        <div class="cart-item-subtotal">${formatPrice(p.price * qty)}</div>
        <button class="remove-btn" data-remove="${p.id}" aria-label="Eliminar">🗑</button>
      </div>
    `).join('');

    cartItemsEl.querySelectorAll('.qty-btn').forEach(btn => {
      btn.addEventListener('click', () => changeQty(+btn.dataset.id, btn.dataset.action === 'inc' ? 1 : -1));
    });
    cartItemsEl.querySelectorAll('.remove-btn').forEach(btn => {
      btn.addEventListener('click', () => removeFromCart(+btn.dataset.remove));
    });
  }

  // ── Cart open / close ────────────────────────────────────────
  function openCart() {
    cartOverlay.classList.add('open');
    cartDrawer.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeCart() {
    cartOverlay.classList.remove('open');
    cartDrawer.classList.remove('open');
    document.body.style.overflow = '';
  }

  cartBtn.addEventListener('click', openCart);
  closeCartBtn.addEventListener('click', closeCart);
  cartOverlay.addEventListener('click', closeCart);

  // ── Checkout ─────────────────────────────────────────────────
  checkoutBtn.addEventListener('click', () => {
    if (cart.length === 0) return;
    closeCart();
    openModal();
  });

  function openModal() {
    // populate summary
    modalOrderItems.innerHTML = cart.map(({ product: p, qty }) => `
      <div class="order-summary-item">
        <span>${qty}× ${p.name}</span>
        <span>${formatPrice(p.price * qty)}</span>
      </div>
    `).join('');
    modalTotal.textContent = formatPrice(getTotal());
    modalOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  }
  function closeModalFn() {
    modalOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
  closeModal.addEventListener('click', closeModalFn);
  modalOverlay.addEventListener('click', e => { if (e.target === modalOverlay) closeModalFn(); });

  // ── WhatsApp message ─────────────────────────────────────────
  checkoutForm.addEventListener('submit', async e => {
    e.preventDefault();
    const name    = $('c-name').value.trim();
    const phone   = $('c-phone').value.trim();
    const street  = $('c-street').value.trim();
    const number  = $('c-number').value.trim();
    const floor   = $('c-floor').value.trim();
    const unit    = $('c-unit').value.trim();
    const payment = $('c-payment').value;
    const notes   = $('c-notes').value.trim();

    // ── Validation ───────────────────────────────────────────
    let valid = true;

    function fieldError(inputId, errorId, msg) {
      const input = $(inputId);
      const err   = $(errorId);
      input.style.borderColor = 'var(--primary)';
      input.style.background  = '#fff5f5';
      err.textContent = msg;
      err.style.display = 'block';
      input.addEventListener('input', () => {
        input.style.borderColor = '';
        input.style.background  = '';
        err.style.display = 'none';
      }, { once: true });
      valid = false;
    }

    if (!name)   fieldError('c-name',  'err-name',  '⚠️ Ingresá tu nombre completo.');
    if (!phone)  fieldError('c-phone', 'err-phone', '⚠️ Ingresá tu número de teléfono.');

    // Address: validate calle and número separately, share the err-address span
    if (!street && !number) {
      // Show error on street input as the primary one
      const err = $('err-address');
      $('c-street').style.borderColor = 'var(--primary)';
      $('c-street').style.background  = '#fff5f5';
      $('c-number').style.borderColor = 'var(--primary)';
      $('c-number').style.background  = '#fff5f5';
      err.textContent = '⚠️ Ingresá la calle y el número.';
      err.style.display = 'block';
      [$('c-street'), $('c-number')].forEach(el => el.addEventListener('input', () => {
        el.style.borderColor = ''; el.style.background = '';
        if ($('c-street').value.trim() && $('c-number').value.trim()) err.style.display = 'none';
      }, { once: true }));
      valid = false;
    } else if (!street) {
      fieldError('c-street', 'err-address', '⚠️ Ingresá el nombre de la calle.');
    } else if (!number) {
      fieldError('c-number', 'err-address', '⚠️ Ingresá el número de la calle.');
    } else if (!/\d/.test(number)) {
      fieldError('c-number', 'err-address', '⚠️ El número debe contener dígitos (ej: 1234).');
    }

    if (!payment) fieldError('c-payment', 'err-payment', '⚠️ Seleccioná una forma de pago.');

    if (!valid) return;

    // Build formatted address string
    const address = [
      `${street} ${number}`,
      floor  ? `Piso ${floor}`  : null,
      unit   ? `Depto ${unit}`  : null,
    ].filter(Boolean).join(', ');

    const settings = DataStore.getSettings();
    const itemsText = cart.map(({ product: p, qty }) =>
      `  • ${qty}× ${p.name} — ${formatPrice(p.price * qty)}`
    ).join('\n');

    const msg = [
      '🍕 *NUEVO PEDIDO – Pizzería Demo*',
      '',
      '👤 *Nombre:* ' + name,
      '📞 *Teléfono:* ' + phone,
      '📍 *Dirección:* ' + address,
      '💳 *Pago:* ' + payment,
      notes ? '📝 *Notas:* ' + notes : '',
      '',
      '🛒 *Detalle del pedido:*',
      itemsText,
      '',
      `💰 *TOTAL: ${formatPrice(getTotal())}*`,
      '',
      '¡Gracias por tu pedido! Te confirmo a la brevedad 🙌',
    ].filter(l => l !== null && l !== undefined).join('\n');

    // Save order
    const order = await DataStore.addOrder({
      name, phone, address, payment, notes,
      items: cart.map(c => ({ name: c.product.name, qty: c.qty, price: c.product.price })),
      total: getTotal(),
    });

    const waUrl = `https://wa.me/${settings.whatsapp.replace(/\D/g, '')}?text=${encodeURIComponent(msg)}`;
    window.open(waUrl, '_blank');

    // Reset
    cart = [];
    updateCartUI();
    checkoutForm.reset();
    closeModalFn();
    showToast('✅ ¡Pedido enviado! Revisá WhatsApp.', 'success');
  });

  // ── Delivery section ──────────────────────────────────────────
  function renderDelivery() {
    const { delivery, whatsapp } = DataStore.getSettings();
    const deliveryGrid = $('delivery-grid');
    deliveryGrid.innerHTML = `
      <div class="delivery-card">
        <div class="delivery-icon">🗺️</div>
        <h3>Zona de envíos</h3>
        <p>${delivery.zones}</p>
      </div>
      <div class="delivery-card">
        <div class="delivery-icon">💰</div>
        <h3>Pedido mínimo</h3>
        <p>Monto mínimo para delivery: <strong>${formatPrice(delivery.minOrder)}</strong></p>
      </div>
      <div class="delivery-card">
        <div class="delivery-icon">⏱️</div>
        <h3>Tiempo estimado</h3>
        <p>Tu pedido llega en aproximadamente <strong>${delivery.estimatedTime}</strong></p>
      </div>
      <div class="delivery-card">
        <div class="delivery-icon">📲</div>
        <h3>¿Cómo pedís?</h3>
        <p>Hacé tu pedido por este sitio y lo enviamos a <strong>WhatsApp</strong> al instante.</p>
      </div>
    `;
  }

  // ── Hours section ─────────────────────────────────────────────
  function renderHours() {
    const { hours, address } = DataStore.getSettings();
    const hoursTable = $('hours-table');
    hoursTable.innerHTML = hours.map(h => `
      <tr>
        <td>${h.day}</td>
        <td>${h.time}</td>
      </tr>
    `).join('');
    $('location-address').textContent = address;
  }

  // ── Toast ─────────────────────────────────────────────────────
  function showToast(msg, type = '') {
    const container = $('toast-container');
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = msg;
    container.appendChild(toast);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => toast.classList.add('show'));
    });
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  }

  // ── Helpers ───────────────────────────────────────────────────
  function formatPrice(n) {
    return '$' + Number(n).toLocaleString('es-AR');
  }

  // ── Init ──────────────────────────────────────────────────────
  await renderMenu();
  renderDelivery();
  renderHours();
  updateCartUI();

})();
