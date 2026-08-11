/* ==========================================================================
   GreenLeaf Organics – script.js
   ========================================================================== */

/* ---------- Cart state (localStorage) ---------- */
let cart = JSON.parse(localStorage.getItem('gl_cart') || '[]');
function saveCart() { localStorage.setItem('gl_cart', JSON.stringify(cart)); }

/* ---------- Boot ---------- */
document.addEventListener('DOMContentLoaded', () => {
  buildCartUI();
  renderCartDrawer();
  updateCartBadge();
  initNav();
  setActiveNav();
  initAddToCart();
  initProductModals();
  initProductFilter();
  initGalleryLightbox();
  initContactForm();
});

/* ==========================================================
   HEADER CART ICON + SLIDE DRAWER + PRODUCT MODAL (injected)
   ========================================================== */
function buildCartUI() {
  /* --- Cart icon button in header --- */
  const headerInner = document.querySelector('.header-inner');
  if (headerInner && !document.getElementById('cart-btn')) {
    const btn = document.createElement('button');
    btn.id        = 'cart-btn';
    btn.className = 'cart-btn';
    btn.setAttribute('aria-label', 'Open shopping cart');
    btn.innerHTML =
      `<svg width="24" height="24" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" stroke-width="2"
            stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
         <circle cx="9"  cy="21" r="1"/>
         <circle cx="20" cy="21" r="1"/>
         <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
       </svg>
       <span class="cart-badge" id="cart-badge" aria-label="items in cart">0</span>`;
    btn.addEventListener('click', openCart);
    headerInner.appendChild(btn);
  }

  /* --- Drawer + product modal + toast (once per page) --- */
  if (document.getElementById('cart-drawer')) return;

  document.body.insertAdjacentHTML('beforeend', `
    <!-- dark overlay -->
    <div id="cart-overlay" class="cart-overlay"></div>

    <!-- slide-in cart drawer -->
    <aside id="cart-drawer" class="cart-drawer"
           role="dialog" aria-modal="true" aria-label="Shopping cart" aria-hidden="true">
      <div class="cart-header">
        <h2>🛒 Your Cart</h2>
        <button id="cart-close" class="cart-close" aria-label="Close cart">&times;</button>
      </div>
      <div id="cart-items" class="cart-items"></div>
      <div class="cart-footer">
        <div class="cart-total-row">
          <span>Subtotal</span><span id="cart-subtotal">$0.00</span>
        </div>
        <div class="cart-total-row cart-total-main">
          <span>Total</span><span id="cart-total">$0.00</span>
        </div>
        <p class="cart-delivery-note" id="cart-delivery-note">🚚 Free delivery on orders over $50</p>
        <a href="cart.html" class="btn btn-outline"
           style="width:100%;text-align:center;display:block;margin-top:0.5rem"
           onclick="closeCart()">View Full Cart</a>
        <button class="btn btn-primary" id="checkout-btn"
                style="width:100%;margin-top:0.75rem">Proceed to Checkout</button>
        <button class="btn btn-outline" id="clear-cart-btn"
                style="width:100%;margin-top:0.5rem">Clear Cart</button>
      </div>
    </aside>

    <!-- product detail modal -->
    <div id="product-modal" class="product-modal-overlay"
         role="dialog" aria-modal="true" aria-label="Product details" aria-hidden="true">
      <div class="product-modal-content">
        <button id="product-modal-close" class="product-modal-close" aria-label="Close">&times;</button>
        <div id="product-modal-body"></div>
      </div>
    </div>

    <!-- toast -->
    <div id="cart-toast" class="cart-toast" role="status" aria-live="polite"></div>
  `);

  document.getElementById('cart-close').addEventListener('click', closeCart);
  document.getElementById('cart-overlay').addEventListener('click', closeCart);
  document.getElementById('clear-cart-btn').addEventListener('click', () => { clearCart(); });
  document.getElementById('checkout-btn').addEventListener('click', () => {
    window.location.href = 'cart.html';
  });
  document.getElementById('product-modal-close').addEventListener('click', closeProductModal);
  document.getElementById('product-modal').addEventListener('click', e => {
    if (e.target === document.getElementById('product-modal')) closeProductModal();
  });
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') { closeCart(); closeProductModal(); }
  });
}

/* ---------- Cart open / close ---------- */
function openCart() {
  document.getElementById('cart-drawer').classList.add('open');
  document.getElementById('cart-drawer').setAttribute('aria-hidden', 'false');
  document.getElementById('cart-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}
function closeCart() {
  document.getElementById('cart-drawer').classList.remove('open');
  document.getElementById('cart-drawer').setAttribute('aria-hidden', 'true');
  document.getElementById('cart-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* ---------- Add to Cart buttons ---------- */
function initAddToCart() {
  document.querySelectorAll('.btn-add-to-cart').forEach(btn => {
    if (btn.dataset.bound) return;
    btn.dataset.bound = '1';
    btn.addEventListener('click', e => {
      e.stopPropagation();
      const card = btn.closest('.product-card');
      if (!card) return;
      addToCart({
        id:    card.dataset.id,
        name:  card.querySelector('h3').textContent.trim(),
        price: parseFloat(card.dataset.price),
        img:   card.querySelector('img').src,
        unit:  card.dataset.unit || ''
      });
      btn.textContent = '✓ Added!';
      btn.disabled = true;
      setTimeout(() => { btn.textContent = 'Add to Cart'; btn.disabled = false; }, 1500);
    });
  });
}

function addToCart(product) {
  const existing = cart.find(i => i.id === product.id);
  existing ? existing.qty++ : cart.push({ ...product, qty: 1 });
  saveCart();
  renderCartDrawer();
  updateCartBadge();
  showToast(`${product.name} added to cart 🛒`);
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart(); renderCartDrawer(); updateCartBadge();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  else { saveCart(); renderCartDrawer(); updateCartBadge(); }
}

function clearCart() {
  cart = []; saveCart(); renderCartDrawer(); updateCartBadge();
}

/* ---------- Render cart drawer ---------- */
function renderCartDrawer() {
  const container = document.getElementById('cart-items');
  const totalEl   = document.getElementById('cart-total');
  const subEl     = document.getElementById('cart-subtotal');
  const noteEl    = document.getElementById('cart-delivery-note');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <span style="font-size:3rem">🛒</span>
        <p>Your cart is empty</p>
        <a href="products.html" class="btn btn-primary" style="margin-top:1rem" onclick="closeCart()">Shop Now</a>
      </div>`;
    if (totalEl) totalEl.textContent = '$0.00';
    if (subEl)   subEl.textContent   = '$0.00';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item">
      <img src="${item.img}" alt="${item.name}" class="cart-item-img" />
      <div class="cart-item-info">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-price">$${item.price.toFixed(2)} ${item.unit}</p>
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQty('${item.id}',-1)" aria-label="Decrease">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}',1)"  aria-label="Increase">+</button>
        </div>
      </div>
      <div class="cart-item-right">
        <p class="cart-item-total">$${(item.price * item.qty).toFixed(2)}</p>
        <button class="cart-remove" onclick="removeFromCart('${item.id}')" aria-label="Remove">🗑</button>
      </div>
    </div>`).join('');

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = subtotal >= 50 ? 0 : 5.99;
  if (subEl)   subEl.textContent   = `$${subtotal.toFixed(2)}`;
  if (totalEl) totalEl.textContent = `$${(subtotal + delivery).toFixed(2)}`;
  if (noteEl)  noteEl.textContent  = delivery === 0
    ? '✅ Free delivery applied!'
    : `🚚 Add $${(50 - subtotal).toFixed(2)} more for free delivery`;
}

/* ---------- Badge ---------- */
function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const total = cart.reduce((s, i) => s + i.qty, 0);
  badge.textContent    = total;
  badge.style.display  = total > 0 ? 'flex' : 'none';
}

/* ---------- Toast ---------- */
function showToast(msg) {
  const t = document.getElementById('cart-toast');
  if (!t) return;
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), 2500);
}

/* ==========================================================
   PRODUCT DETAIL MODAL
   ========================================================== */
function initProductModals() {
  document.querySelectorAll('.product-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', e => {
      if (e.target.closest('.btn-add-to-cart')) return;
      openProductModal(card);
    });
  });
}

function openProductModal(card) {
  const id      = card.dataset.id    || '';
  const name    = card.querySelector('h3').textContent.trim();
  const price   = parseFloat(card.dataset.price) || 0;
  const unit    = card.dataset.unit  || '';
  const img     = card.querySelector('img').src;
  const alt     = card.querySelector('img').alt;
  const desc    = card.querySelector('.product-desc')?.textContent.trim() || '';
  const badge   = card.querySelector('.product-category-badge')?.textContent.trim() || '';
  /* data-details stores HTML-escaped text — decode it */
  const rawDetails = card.getAttribute('data-details') || '';
  const details = rawDetails
    .replace(/&lt;/g,  '<')
    .replace(/&gt;/g,  '>')
    .replace(/&amp;/g, '&');

  const body = document.getElementById('product-modal-body');
  body.innerHTML = `
    <div class="pmodal-grid">
      <div class="pmodal-img-wrap">
        <img src="${img}" alt="${alt}" />
      </div>
      <div class="pmodal-info">
        <span class="product-category-badge">${badge}</span>
        <h2>${name}</h2>
        <p class="pmodal-price">$${price.toFixed(2)} <span>${unit}</span></p>
        <p class="pmodal-desc">${desc}</p>
        ${details ? `<div class="pmodal-details">${details}</div>` : ''}
        <div class="pmodal-meta">
          <span>✅ Certified Organic</span>
          <span>🚚 Next-day delivery</span>
          <span>🌿 Locally sourced</span>
        </div>
        <div class="pmodal-qty-row">
          <button class="qty-btn" id="modal-qty-dec">−</button>
          <span class="qty-value" id="modal-qty">1</span>
          <button class="qty-btn" id="modal-qty-inc">+</button>
        </div>
        <button class="btn btn-primary" id="modal-add-btn"
                style="width:100%;margin-top:1rem">Add to Cart 🛒</button>
      </div>
    </div>`;

  let qty = 1;
  document.getElementById('modal-qty-dec').onclick = () => {
    if (qty > 1) { qty--; document.getElementById('modal-qty').textContent = qty; }
  };
  document.getElementById('modal-qty-inc').onclick = () => {
    qty++; document.getElementById('modal-qty').textContent = qty;
  };
  document.getElementById('modal-add-btn').onclick = () => {
    for (let i = 0; i < qty; i++) addToCart({ id, name, price, img, unit });
    closeProductModal();
  };

  const modal = document.getElementById('product-modal');
  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (!modal) return;
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

/* ==========================================================
   NAV
   ========================================================== */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav    = document.querySelector('.site-nav');
  if (!toggle || !nav) return;
  toggle.addEventListener('click', () => {
    const open = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', open);
  });
  nav.querySelectorAll('a').forEach(a => a.addEventListener('click', () => {
    nav.classList.remove('open');
    toggle.setAttribute('aria-expanded', 'false');
  }));
}

function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-list a').forEach(a => {
    if (a.getAttribute('href') === page || (page === '' && a.getAttribute('href') === 'index.html')) {
      a.classList.add('active');
      a.setAttribute('aria-current', 'page');
    }
  });
}

/* ==========================================================
   PRODUCT FILTER
   ========================================================== */
function initProductFilter() {
  const btns     = document.querySelectorAll('.filter-btn');
  const products = document.querySelectorAll('.product-card');
  if (!btns.length) return;
  btns.forEach(btn => btn.addEventListener('click', () => {
    btns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
    btn.classList.add('active');
    btn.setAttribute('aria-pressed','true');
    const cat = btn.dataset.filter;
    products.forEach(c => c.classList.toggle('hidden', !(cat === 'all' || c.dataset.category === cat)));
  }));
}

/* ==========================================================
   GALLERY LIGHTBOX
   ========================================================== */
function initGalleryLightbox() {
  const lb    = document.getElementById('lightbox');
  const lbImg = document.getElementById('lightbox-img');
  const lbCap = document.getElementById('lightbox-caption');
  const lbX   = document.getElementById('lightbox-close');
  if (!lb) return;

  document.querySelectorAll('.gallery-item').forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      lbImg.src = img.src; lbImg.alt = img.alt;
      lbCap.textContent = img.alt;
      lb.classList.add('open');
      lb.setAttribute('aria-hidden','false');
      lbX.focus();
    });
    item.addEventListener('keydown', e => { if (e.key === 'Enter') item.click(); });
  });

  lbX.addEventListener('click', closeLB);
  lb.addEventListener('click', e => { if (e.target === lb) closeLB(); });
  function closeLB() { lb.classList.remove('open'); lb.setAttribute('aria-hidden','true'); }
}

/* ==========================================================
   CONTACT FORM VALIDATION
   ========================================================== */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const fields = {
    name:    { el: form.querySelector('#name'),    fn: v => v.trim().length >= 2,                    msg: 'Please enter your full name (min 2 characters).' },
    email:   { el: form.querySelector('#email'),   fn: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v),   msg: 'Please enter a valid email address.' },
    inquiry: { el: form.querySelector('#inquiry'), fn: v => v !== '',                                msg: 'Please select an inquiry type.' },
    message: { el: form.querySelector('#message'), fn: v => v.trim().length >= 10,                  msg: 'Message must be at least 10 characters.' },
  };

  Object.values(fields).forEach(({ el, fn, msg }) => {
    if (!el) return;
    const err = document.getElementById(el.id + '-error');
    el.addEventListener('blur',  () => vf(el, fn, err, msg));
    el.addEventListener('input', () => { if (el.classList.contains('invalid')) vf(el, fn, err, msg); });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let ok = true;
    Object.values(fields).forEach(({ el, fn, msg }) => {
      if (!el) return;
      if (!vf(el, fn, document.getElementById(el.id + '-error'), msg)) ok = false;
    });
    if (ok) {
      form.style.display = 'none';
      document.getElementById('form-success').classList.add('visible');
    }
  });
}

function vf(el, fn, errEl, msg) {
  const valid = fn(el.value);
  el.classList.toggle('valid',   valid);
  el.classList.toggle('invalid', !valid);
  if (errEl) { errEl.textContent = msg; errEl.classList.toggle('visible', !valid); }
  return valid;
}
