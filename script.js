/* ==========================================================================
   GreenLeaf Organics - Main JavaScript
   ICT726 Web Development Assignment
   ========================================================================== */

/* --------------------------------------------------------------------------
   Cart state — persisted in localStorage so it survives page navigation
   -------------------------------------------------------------------------- */
let cart = JSON.parse(localStorage.getItem('gl_cart') || '[]');

function saveCart() {
  localStorage.setItem('gl_cart', JSON.stringify(cart));
}

/* --------------------------------------------------------------------------
   Boot
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  setActiveNav();
  injectCartUI();       // cart icon in header + drawer in body
  renderCartDrawer();   // populate drawer from saved state
  initAddToCart();      // wire up all "Add to Cart" buttons
  initProductModals();  // product detail modal on card click
  initProductFilter();
  initGalleryLightbox();
  initContactForm();
});

/* --------------------------------------------------------------------------
   Navigation: mobile hamburger toggle
   -------------------------------------------------------------------------- */
function initNav() {
  const toggle = document.querySelector('.nav-toggle');
  const nav    = document.querySelector('.site-nav');
  if (!toggle || !nav) return;

  toggle.addEventListener('click', () => {
    const isOpen = nav.classList.toggle('open');
    toggle.setAttribute('aria-expanded', isOpen);
  });

  nav.querySelectorAll('a').forEach(link =>
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );
}

/* --------------------------------------------------------------------------
   Active nav link
   -------------------------------------------------------------------------- */
function setActiveNav() {
  const page = location.pathname.split('/').pop() || 'index.html';
  document.querySelectorAll('.nav-list a').forEach(link => {
    const href = link.getAttribute('href');
    if (href === page || (page === '' && href === 'index.html')) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });
}

/* ==========================================================================
   CART SYSTEM
   ========================================================================== */

/* --------------------------------------------------------------------------
   Inject cart icon button into header nav + cart drawer into body
   -------------------------------------------------------------------------- */
function injectCartUI() {
  // --- Cart icon in nav ---
  const nav = document.querySelector('.header-inner');
  if (nav && !document.getElementById('cart-btn')) {
    const btn = document.createElement('button');
    btn.id = 'cart-btn';
    btn.className = 'cart-btn';
    btn.setAttribute('aria-label', 'Open shopping cart');
    btn.innerHTML = `
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor"
           stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
        <circle cx="9" cy="21" r="1"/><circle cx="20" cy="21" r="1"/>
        <path d="M1 1h4l2.68 13.39a2 2 0 0 0 2 1.61h9.72a2 2 0 0 0 2-1.61L23 6H6"/>
      </svg>
      <span class="cart-badge" id="cart-badge">0</span>`;
    btn.addEventListener('click', openCart);
    nav.appendChild(btn);
  }

  // --- Cart drawer ---
  if (!document.getElementById('cart-drawer')) {
    document.body.insertAdjacentHTML('beforeend', `
      <div id="cart-overlay" class="cart-overlay" aria-hidden="true"></div>
      <aside id="cart-drawer" class="cart-drawer" role="dialog"
             aria-modal="true" aria-label="Shopping cart" aria-hidden="true">
        <div class="cart-header">
          <h2>🛒 Your Cart</h2>
          <button id="cart-close" class="cart-close" aria-label="Close cart">&times;</button>
        </div>
        <div id="cart-items" class="cart-items"></div>
        <div class="cart-footer">
          <div class="cart-total-row">
            <span>Subtotal</span>
            <span id="cart-subtotal">$0.00</span>
          </div>
          <div class="cart-total-row cart-total-main">
            <span>Total</span>
            <span id="cart-total">$0.00</span>
          </div>
          <p class="cart-delivery-note">🚚 Free delivery on orders over $50</p>
          <a href="cart.html" class="btn btn-outline" style="width:100%;margin-top:0.5rem;text-align:center;display:block"
             onclick="closeCart()">View Full Cart</a>
          <button class="btn btn-primary" style="width:100%;margin-top:0.75rem"
                  id="checkout-btn">Proceed to Checkout</button>
          <button class="btn btn-outline" style="width:100%;margin-top:0.75rem"
                  id="clear-cart-btn">Clear Cart</button>
        </div>
      </aside>

      <!-- Product Detail Modal -->
      <div id="product-modal" class="product-modal-overlay" aria-hidden="true" role="dialog"
           aria-modal="true" aria-label="Product details">
        <div class="product-modal-content">
          <button class="product-modal-close" id="product-modal-close" aria-label="Close">&times;</button>
          <div id="product-modal-body"></div>
        </div>
      </div>

      <!-- Toast notification -->
      <div id="cart-toast" class="cart-toast" aria-live="polite" aria-atomic="true"></div>
    `);

    document.getElementById('cart-close').addEventListener('click', closeCart);
    document.getElementById('cart-overlay').addEventListener('click', closeCart);
    document.getElementById('clear-cart-btn').addEventListener('click', clearCart);
    document.getElementById('checkout-btn').addEventListener('click', handleCheckout);
    document.getElementById('product-modal-close').addEventListener('click', closeProductModal);
    document.getElementById('product-modal').addEventListener('click', e => {
      if (e.target.id === 'product-modal') closeProductModal();
    });
    document.addEventListener('keydown', e => {
      if (e.key === 'Escape') { closeCart(); closeProductModal(); }
    });
  }

  updateCartBadge();
}

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

/* --------------------------------------------------------------------------
   Add to Cart — wire up all buttons on the page
   -------------------------------------------------------------------------- */
function initAddToCart() {
  document.querySelectorAll('.btn-add-to-cart, [aria-label^="Add "]').forEach(btn => {
    // avoid double-binding
    if (btn.dataset.cartBound) return;
    btn.dataset.cartBound = '1';

    btn.addEventListener('click', e => {
      e.stopPropagation(); // don't open product modal
      const card = btn.closest('.product-card');
      if (!card) return;

      const id    = card.dataset.id;
      const name  = card.querySelector('h3').textContent.trim();
      const price = parseFloat(card.dataset.price);
      const img   = card.querySelector('img').src;
      const unit  = card.dataset.unit || '';

      addToCart({ id, name, price, img, unit });

      // Button feedback
      btn.textContent = '✓ Added!';
      btn.disabled = true;
      setTimeout(() => { btn.textContent = 'Add to Cart'; btn.disabled = false; }, 1500);
    });
  });
}

function addToCart(product) {
  const existing = cart.find(i => i.id === product.id);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }
  saveCart();
  renderCartDrawer();
  updateCartBadge();
  showToast(`${product.name} added to cart 🛒`);
}

function removeFromCart(id) {
  cart = cart.filter(i => i.id !== id);
  saveCart();
  renderCartDrawer();
  updateCartBadge();
}

function changeQty(id, delta) {
  const item = cart.find(i => i.id === id);
  if (!item) return;
  item.qty += delta;
  if (item.qty <= 0) removeFromCart(id);
  else { saveCart(); renderCartDrawer(); updateCartBadge(); }
}

function clearCart() {
  cart = [];
  saveCart();
  renderCartDrawer();
  updateCartBadge();
}

/* --------------------------------------------------------------------------
   Render cart drawer contents
   -------------------------------------------------------------------------- */
function renderCartDrawer() {
  const container = document.getElementById('cart-items');
  const totalEl   = document.getElementById('cart-total');
  const subEl     = document.getElementById('cart-subtotal');
  if (!container) return;

  if (cart.length === 0) {
    container.innerHTML = `
      <div class="cart-empty">
        <span style="font-size:3rem">🛒</span>
        <p>Your cart is empty</p>
        <a href="products.html" class="btn btn-primary" style="margin-top:1rem"
           onclick="closeCart()">Shop Now</a>
      </div>`;
    totalEl.textContent = '$0.00';
    subEl.textContent   = '$0.00';
    return;
  }

  container.innerHTML = cart.map(item => `
    <div class="cart-item" data-id="${item.id}">
      <img src="${item.img}" alt="${item.name}" class="cart-item-img" />
      <div class="cart-item-info">
        <p class="cart-item-name">${item.name}</p>
        <p class="cart-item-price">$${item.price.toFixed(2)} ${item.unit}</p>
        <div class="qty-controls">
          <button class="qty-btn" onclick="changeQty('${item.id}', -1)" aria-label="Decrease quantity">−</button>
          <span class="qty-value">${item.qty}</span>
          <button class="qty-btn" onclick="changeQty('${item.id}', 1)"  aria-label="Increase quantity">+</button>
        </div>
      </div>
      <div class="cart-item-right">
        <p class="cart-item-total">$${(item.price * item.qty).toFixed(2)}</p>
        <button class="cart-remove" onclick="removeFromCart('${item.id}')" aria-label="Remove ${item.name}">🗑</button>
      </div>
    </div>`).join('');

  const subtotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const delivery = subtotal >= 50 ? 0 : 5.99;
  subEl.textContent = `$${subtotal.toFixed(2)}`;
  totalEl.textContent = `$${(subtotal + delivery).toFixed(2)}`;

  // Update delivery note
  const note = document.querySelector('.cart-delivery-note');
  if (note) note.textContent = delivery === 0
    ? '✅ Free delivery applied!'
    : `🚚 Add $${(50 - subtotal).toFixed(2)} more for free delivery`;
}

/* --------------------------------------------------------------------------
   Cart badge count
   -------------------------------------------------------------------------- */
function updateCartBadge() {
  const badge = document.getElementById('cart-badge');
  if (!badge) return;
  const total = cart.reduce((s, i) => s + i.qty, 0);
  badge.textContent = total;
  badge.style.display = total > 0 ? 'flex' : 'none';
}

/* --------------------------------------------------------------------------
   Toast notification
   -------------------------------------------------------------------------- */
function showToast(msg) {
  const toast = document.getElementById('cart-toast');
  if (!toast) return;
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 2500);
}

/* --------------------------------------------------------------------------
   Checkout (demo)
   -------------------------------------------------------------------------- */
function handleCheckout() {
  if (cart.length === 0) return;
  closeCart();
  showToast('🎉 Order placed! Thank you for shopping with GreenLeaf.');
  clearCart();
}

/* ==========================================================================
   PRODUCT DETAIL MODAL
   ========================================================================== */
function initProductModals() {
  document.querySelectorAll('.product-card').forEach(card => {
    card.style.cursor = 'pointer';
    card.addEventListener('click', e => {
      // Don't open modal if clicking the Add to Cart button
      if (e.target.closest('.btn-add-to-cart') || e.target.closest('[aria-label^="Add "]')) return;
      openProductModal(card);
    });
  });
}

function openProductModal(card) {
  const name     = card.querySelector('h3').textContent;
  const price    = card.dataset.price;
  const unit     = card.dataset.unit || '';
  const img      = card.querySelector('img').src;
  const alt      = card.querySelector('img').alt;
  const desc     = card.querySelector('.product-desc')?.textContent || '';
  const badge    = card.querySelector('.product-category-badge')?.textContent || '';
  const id       = card.dataset.id;
  const details  = card.dataset.details || '';

  document.getElementById('product-modal-body').innerHTML = `
    <div class="pmodal-grid">
      <div class="pmodal-img-wrap">
        <img src="${img}" alt="${alt}" />
      </div>
      <div class="pmodal-info">
        <span class="product-category-badge">${badge}</span>
        <h2>${name}</h2>
        <p class="pmodal-price">$${parseFloat(price).toFixed(2)} <span>${unit}</span></p>
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
        <button class="btn btn-primary pmodal-add-btn" style="width:100%;margin-top:1rem"
                data-id="${id}">Add to Cart 🛒</button>
      </div>
    </div>`;

  // Qty controls inside modal
  let qty = 1;
  document.getElementById('modal-qty-dec').addEventListener('click', () => {
    if (qty > 1) { qty--; document.getElementById('modal-qty').textContent = qty; }
  });
  document.getElementById('modal-qty-inc').addEventListener('click', () => {
    qty++; document.getElementById('modal-qty').textContent = qty;
  });

  document.querySelector('.pmodal-add-btn').addEventListener('click', () => {
    for (let i = 0; i < qty; i++) {
      addToCart({ id, name, price: parseFloat(price), img, unit });
    }
    closeProductModal();
  });

  document.getElementById('product-modal').setAttribute('aria-hidden', 'false');
  document.getElementById('product-modal').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProductModal() {
  const modal = document.getElementById('product-modal');
  if (!modal) return;
  modal.setAttribute('aria-hidden', 'true');
  modal.classList.remove('open');
  document.body.style.overflow = '';
}

/* --------------------------------------------------------------------------
   Products Page: category filter
   -------------------------------------------------------------------------- */
function initProductFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const products   = document.querySelectorAll('.product-card');
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      filterBtns.forEach(b => { b.classList.remove('active'); b.setAttribute('aria-pressed','false'); });
      btn.classList.add('active');
      btn.setAttribute('aria-pressed', 'true');
      const category = btn.dataset.filter;
      products.forEach(card => {
        card.classList.toggle('hidden', !(category === 'all' || card.dataset.category === category));
      });
    });
  });
}

/* --------------------------------------------------------------------------
   Gallery Page: lightbox
   -------------------------------------------------------------------------- */
function initGalleryLightbox() {
  const lightbox     = document.getElementById('lightbox');
  const lbImg        = document.getElementById('lightbox-img');
  const lbCaption    = document.getElementById('lightbox-caption');
  const lbClose      = document.getElementById('lightbox-close');
  const galleryItems = document.querySelectorAll('.gallery-item');
  if (!lightbox) return;

  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const img = item.querySelector('img');
      lbImg.src = img.src; lbImg.alt = img.alt;
      lbCaption.textContent = img.alt;
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      lbClose.focus();
    });
    item.addEventListener('keydown', e => { if (e.key === 'Enter') item.click(); });
  });

  lbClose.addEventListener('click', closeLightbox);
  lightbox.addEventListener('click', e => { if (e.target === lightbox) closeLightbox(); });

  function closeLightbox() {
    lightbox.classList.remove('open');
    lightbox.setAttribute('aria-hidden', 'true');
  }
}

/* --------------------------------------------------------------------------
   Contact Page: form validation
   -------------------------------------------------------------------------- */
function initContactForm() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  const fields = {
    name:    { el: form.querySelector('#name'),    validate: v => v.trim().length >= 2,  msg: 'Please enter your full name (at least 2 characters).' },
    email:   { el: form.querySelector('#email'),   validate: v => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v), msg: 'Please enter a valid email address.' },
    inquiry: { el: form.querySelector('#inquiry'), validate: v => v !== '',              msg: 'Please select an inquiry type.' },
    message: { el: form.querySelector('#message'), validate: v => v.trim().length >= 10, msg: 'Message must be at least 10 characters.' },
  };

  Object.values(fields).forEach(({ el, validate, msg }) => {
    if (!el) return;
    const errEl = document.getElementById(el.id + '-error');
    el.addEventListener('blur',  () => validateField(el, validate, errEl, msg));
    el.addEventListener('input', () => {
      if (el.classList.contains('invalid')) validateField(el, validate, errEl, msg);
    });
  });

  form.addEventListener('submit', e => {
    e.preventDefault();
    let allValid = true;
    Object.values(fields).forEach(({ el, validate, msg }) => {
      if (!el) return;
      const errEl = document.getElementById(el.id + '-error');
      if (!validateField(el, validate, errEl, msg)) allValid = false;
    });
    if (allValid) {
      form.style.display = 'none';
      document.getElementById('form-success').classList.add('visible');
    }
  });
}

function validateField(el, validate, errEl, msg) {
  const valid = validate(el.value);
  el.classList.toggle('valid', valid);
  el.classList.toggle('invalid', !valid);
  if (errEl) { errEl.textContent = msg; errEl.classList.toggle('visible', !valid); }
  return valid;
}
