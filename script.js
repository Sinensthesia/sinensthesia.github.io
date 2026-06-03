// ==========================================
// UTILITIES
// ==========================================
const isMobile = window.innerWidth < 769;

const debounce = (func, wait) => {
  let timeout;
  return (...args) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
};

// ==========================================
// MAIN INITIALIZATION
// ==========================================
document.addEventListener('DOMContentLoaded', () => {

  // --- 1. Mobile Menu Toggle ---
  const initMobileMenu = () => {
    const btn = document.getElementById('mobile-menu-button');
    const menu = document.getElementById('mobile-menu');

    if (!btn || !menu) return;

    btn.addEventListener('click', () => menu.classList.toggle('hidden'));

    // Close menu on link click
    menu.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => menu.classList.add('hidden'));
    });
  };

  // --- 2. Dynamic About Section Margin ---
  const adjustAboutSectionMargin = () => {
    const aboutSection = document.getElementById('about');
    const heroSection = document.getElementById('hero');
    const heroCard = document.querySelector('#hero .relative.z-10');

    if (!aboutSection || !heroSection || !heroCard) return;

    const spaceBelowCard = heroSection.getBoundingClientRect().bottom - heroCard.getBoundingClientRect().bottom;
    const desiredPullUp = window.innerHeight * 0.25;
    const maxSafePullUp = Math.max(0, spaceBelowCard - 40);

    aboutSection.style.marginTop = `-${Math.min(desiredPullUp, maxSafePullUp)}px`;
  };

  // --- 3. Washi Pattern & Scroll Animations ---
  const initScrollAnimations = () => {
    const washiContainer = document.getElementById('washi-container');
    const heroSection = document.querySelector('main > section:first-of-type');
    const aboutSectionContent = document.querySelector('.fade-in-section');

    // Cached variables for scroll performance
    let washiRows = [];

    const setupWashiRows = () => {
      if (!washiContainer) return;
      washiContainer.innerHTML = '';

      // DYNAMIC EVALUATION: Check mobile state exactly when calculating
      const isCurrentlyMobile = window.innerWidth < 769;
      const ROW_HEIGHT_VW = isCurrentlyMobile ? 20 : 5.8;

      const rowHeightPx = (window.innerWidth * ROW_HEIGHT_VW) / 100;
      const numRows = Math.floor((window.innerHeight * 0.9) / rowHeightPx);

      const fragment = document.createDocumentFragment();
      for (let i = 0; i < numRows; i++) {
        const row = document.createElement('div');
        row.className = 'washi-row';
        fragment.appendChild(row);
      }
      washiContainer.appendChild(fragment);

      // Cache the rows AFTER creating them
      washiRows = Array.from(washiContainer.querySelectorAll('.washi-row'));
    };

    if (washiContainer && heroSection) {
      setupWashiRows();

      // Always listen for resize (so DevTools tweaking works),
      // but only trigger if the width actually changed (ignores mobile vertical scroll glitches)
      let lastWidth = window.innerWidth;
      window.addEventListener('resize', debounce(() => {
        if (window.innerWidth !== lastWidth) {
          lastWidth = window.innerWidth;
          setupWashiRows();
        }
      }, 250));
    }

    // Optimized Scroll Listener
    window.addEventListener('scroll', () => {
      const scrollPosition = window.scrollY;

      // Washi Fade Logic
      if (washiRows.length > 0) {
        // Check width dynamically for stagger timing
        const staggerAmount = window.innerWidth < 769 ? 12 : 30;
        const fadeDuration = 150 + (350 * Math.min(1, scrollPosition / 500)); // Min 150, Max 500

        washiRows.forEach((row, index) => {
          const reversedIndex = washiRows.length - 1 - index;
          const scrollPastTrigger = scrollPosition - ((reversedIndex - 4) * staggerAmount);

          row.style.opacity = scrollPastTrigger > 0
          ? Math.max(0, 1 - scrollPastTrigger / fadeDuration).toFixed(2)
          : 1;
        });
      }

      // Text Sync Logic (Particles toggle removed!)
      if (aboutSectionContent) {
        const isPastThreshold = scrollPosition > (window.innerHeight * 0.15);
        aboutSectionContent.classList.toggle('is-visible', isPastThreshold);
      }
    }, { passive: true });
  };

  // --- 4. Intersection Observers (Menu Cascading) ---
  let menuObserver = null;

  const setupIntersectionObservers = () => {
    if (menuObserver) menuObserver.disconnect();

    const menuItems = document.querySelectorAll('.menu-card, .toppings-card');
    if (!menuItems.length) return;

    menuObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        const el = entry.target;
        el.style.transitionDelay = entry.isIntersecting ? (el.dataset.delay || '0ms') : '0ms';
        el.classList.toggle('is-visible', entry.isIntersecting);
      });
    }, { threshold: 0.15 });

    menuItems.forEach((item, index) => {
      item.dataset.delay = `${(index % 4) * 75}ms`;
      menuObserver.observe(item);
    });
  };

  // --- 5. JSON Menu & Rendering ---
  const initMenu = () => {
    const grid = document.getElementById('menu-grid');
    if (!grid) return; // Exit early if not on a page with a menu

    const els = {
      title: document.getElementById('menu-title'),
                          desc: document.getElementById('menu-desc'),
                          season: document.getElementById('season-text')
    };

    let menuData = [];
    let currentIndex = 0;

    const renderMenu = (index) => {
      if (!menuData.length) return;
      const menu = menuData[index];

      if (els.title) els.title.textContent = menu.title;
      if (els.desc) els.desc.textContent = menu.description;
      if (els.season) els.season.textContent = menu.season || 'Seasonal Offering';

      grid.innerHTML = '';
      const fragment = document.createDocumentFragment();

      // Render Drinks
      menu.drinks.forEach(drink => {
        const card = document.createElement('div');
        card.className = 'bg-[#FDFBF5] rounded-lg shadow-md p-6 menu-card flex flex-col';
        card.innerHTML = `
        <h3 class="text-2xl text-contrast-blue mb-2">${drink.name}</h3>
        <p class="opacity-70 flex-grow">${drink.ingredients}</p>
        ${drink.pairing ? `<span class="mt-2 opacity-70">${drink.pairing}</span>` : ''}
        `;
        fragment.appendChild(card);
      });

      // Render Add-ons
      menu.addons.forEach(addon => {
        const card = document.createElement('div');
        card.className = 'md:col-span-2 lg:col-span-4 bg-white/50 rounded-lg border-2 border-dashed border-brand-blue/20 p-6 text-center toppings-card';
        card.innerHTML = `
        <h4 class="text-3xl text-contrast-blue ${addon.subtitle ? 'mb-1' : 'mb-3'}">${addon.title}</h4>
        ${addon.subtitle ? `<p class="text-sm italic text-brand-blue opacity-70 mb-3">${addon.subtitle}</p>` : ''}
        <p class="opacity-70">${Array.isArray(addon.items) ? addon.items.join(' &bull; ') : addon.items}</p>
        `;
        fragment.appendChild(card);
      });

      grid.appendChild(fragment);

      // Update Navigation Buttons
      const updateBtn = (id, disabledState) => {
        const btn = document.getElementById(id);
        if (btn) btn.disabled = disabledState;
      };
        updateBtn('first-menu-btn', index === 0);
        updateBtn('prev-menu-btn', index === 0);
        updateBtn('next-menu-btn', index === menuData.length - 1);
        updateBtn('last-menu-btn', index === menuData.length - 1);

        setupIntersectionObservers();
    };

    // Fetch Data
    fetch('menu.json')
    .then(res => res.json())
    .then(data => {
      menuData = data;
      currentIndex = Math.max(0, menuData.findIndex(m => m.isActive));
      renderMenu(currentIndex);
    })
    .catch(err => {
      console.error('Menu Error:', err);
      if (els.title) els.title.textContent = 'Menu Unavailable';
      if (els.desc) els.desc.textContent = 'Please check back later.';
      if (els.season) els.season.classList.add('hidden');
    });

      // Setup Button Listeners
      const bindNavButton = (id, action) => {
        const btn = document.getElementById(id);
        if (btn) btn.addEventListener('click', action);
      };

        bindNavButton('first-menu-btn', () => renderMenu(currentIndex = 0));
        bindNavButton('prev-menu-btn', () => { if (currentIndex > 0) renderMenu(--currentIndex); });
        bindNavButton('next-menu-btn', () => { if (currentIndex < menuData.length - 1) renderMenu(++currentIndex); });
        bindNavButton('last-menu-btn', () => renderMenu(currentIndex = menuData.length - 1));
  };

  // ==========================================
  // EXECUTE ALL MODULES
  // ==========================================
  initMobileMenu();
  adjustAboutSectionMargin();
  window.addEventListener('resize', debounce(adjustAboutSectionMargin, 250));
  initScrollAnimations();
  setupIntersectionObservers();
  window.addEventListener('resize', debounce(setupIntersectionObservers, 250));
  initMenu();

  // Check if the particles utility has been loaded, then trigger it
  if (typeof initParticles === 'function') {
    initParticles();
  }
});
