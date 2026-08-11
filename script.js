/* ==========================================================================
   GreenLeaf Organics - Main JavaScript
   ICT726 Web Development Assignment
   ========================================================================== */

/* --------------------------------------------------------------------------
   Utility: run code after DOM is ready
   -------------------------------------------------------------------------- */
document.addEventListener('DOMContentLoaded', () => {
  initNav();
  initProductFilter();
  initGalleryLightbox();
  initContactForm();
  setActiveNav();
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

  // Close nav when a link is clicked (mobile UX)
  nav.querySelectorAll('a').forEach(link =>
    link.addEventListener('click', () => {
      nav.classList.remove('open');
      toggle.setAttribute('aria-expanded', 'false');
    })
  );
}

/* --------------------------------------------------------------------------
   Active nav link: highlight current page
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

/* --------------------------------------------------------------------------
   Products Page: category filter
   -------------------------------------------------------------------------- */
function initProductFilter() {
  const filterBtns = document.querySelectorAll('.filter-btn');
  const products   = document.querySelectorAll('.product-card');
  if (!filterBtns.length) return;

  filterBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      // Update active button
      filterBtns.forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const category = btn.dataset.filter;

      // Show/hide products with a smooth transition
      products.forEach(card => {
        const match = category === 'all' || card.dataset.category === category;
        card.classList.toggle('hidden', !match);
      });
    });
  });
}

/* --------------------------------------------------------------------------
   Gallery Page: lightbox / modal
   -------------------------------------------------------------------------- */
function initGalleryLightbox() {
  const lightbox    = document.getElementById('lightbox');
  const lbImg       = document.getElementById('lightbox-img');
  const lbCaption   = document.getElementById('lightbox-caption');
  const lbClose     = document.getElementById('lightbox-close');
  const galleryItems = document.querySelectorAll('.gallery-item');

  if (!lightbox) return;

  // Open lightbox on thumbnail click
  galleryItems.forEach(item => {
    item.addEventListener('click', () => {
      const img     = item.querySelector('img');
      lbImg.src     = img.src;
      lbImg.alt     = img.alt;
      lbCaption.textContent = img.alt;
      lightbox.classList.add('open');
      lightbox.setAttribute('aria-hidden', 'false');
      lbClose.focus();
    });
  });

  // Close on button click
  lbClose.addEventListener('click', closeLightbox);

  // Close on backdrop click
  lightbox.addEventListener('click', e => {
    if (e.target === lightbox) closeLightbox();
  });

  // Close on Escape key
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeLightbox();
  });

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

  // Real-time validation on blur/input
  Object.values(fields).forEach(({ el, validate, msg }) => {
    if (!el) return;
    const errEl = document.getElementById(el.id + '-error');

    el.addEventListener('blur',  () => validateField(el, validate, errEl, msg));
    el.addEventListener('input', () => {
      if (el.classList.contains('invalid'))
        validateField(el, validate, errEl, msg);
    });
  });

  // Form submit
  form.addEventListener('submit', e => {
    e.preventDefault(); // No server-side submission

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

/* Helper: validate a single field, toggle classes and error message */
function validateField(el, validate, errEl, msg) {
  const valid = validate(el.value);
  el.classList.toggle('valid',   valid);
  el.classList.toggle('invalid', !valid);
  if (errEl) {
    errEl.textContent = msg;
    errEl.classList.toggle('visible', !valid);
  }
  return valid;
}
