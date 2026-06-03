//includes iPad Mini
const isMobile = window.innerWidth < 769;

// Mobile menu toggle
const mobileMenuButton = document.getElementById('mobile-menu-button');
const mobileMenu = document.getElementById('mobile-menu');
mobileMenuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('hidden');
});

// Close mobile menu when a link is clicked
const mobileMenuLinks = mobileMenu.getElementsByTagName('a');
for (let i = 0; i < mobileMenuLinks.length; i++) {
    mobileMenuLinks[i].addEventListener('click', () => {
        mobileMenu.classList.add('hidden');
    });
}

// A reusable debounce utility
const debounce = (func, wait) => {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
};

// Handle all scroll-based animations
document.addEventListener('DOMContentLoaded', () => {
    // --- Dynamic Top Margin for About Section ---
    const aboutSection = document.getElementById('about');
    const adjustAboutSectionMargin = () => {
        if (aboutSection) {
            const marginPercentage = -0.25;
            const negativeMargin = window.innerHeight * marginPercentage;
            aboutSection.style.marginTop = `${negativeMargin}px`;
        }
    };

    // Run once on load
    adjustAboutSectionMargin();

    // --- Washi Pattern Logic ---
    const washiContainer = document.getElementById('washi-container');
    const heroSection = document.querySelector('main > section:first-of-type');

    if (washiContainer && heroSection) {
        const ROW_HEIGHT_VW = isMobile ? 20 : 5.8;

        // This function creates (or re-creates) the washi rows based on screen size
        const setupWashiRows = () => {
            washiContainer.innerHTML = ''; // Clear any old rows first

            const rowHeightPx = (window.innerWidth * ROW_HEIGHT_VW) / 100;
            const heroHeight = window.innerHeight * 0.9;
            const numRows = Math.floor(heroHeight / rowHeightPx);

            for (let i = 0; i < numRows; i++) {
                const row = document.createElement('div');
                row.classList.add('washi-row');
                washiContainer.appendChild(row);
            }
        };

        // This single listener handles the scroll animation
        window.addEventListener(
            'scroll',
            () => {
                const washiRows = document.querySelectorAll('.washi-row');
                if (washiRows.length === 0) return;

                const scrollPosition = window.scrollY;
                const staggerAmount = isMobile ? 12 : 30;

                // Dynamically calculate fade duration based on scroll position
                const minFade = 150; // Quickest duration in ms
                const maxFade = 500; // Longest duration in ms
                const scrollRange = 500; // The scroll distance over which the fade duration changes

                // Calculate how far we are into the scroll range (from 0.0 to 1.0)
                const scrollFactor = Math.min(1, scrollPosition / scrollRange);

                // Linearly interpolate the fade duration
                const fadeDuration = minFade + (maxFade - minFade) * scrollFactor;

                washiRows.forEach((row, index) => {
                    const totalRows = washiRows.length;
                    const reversedIndex = totalRows - 1 - index; // Reverse the index

                    const rowTriggerScroll = (reversedIndex - 4) * staggerAmount; // Use reversed index
                    const scrollPastTrigger = scrollPosition - rowTriggerScroll;

                    if (scrollPastTrigger > 0) {
                        let newOpacity = 1 - scrollPastTrigger / fadeDuration;
                        row.style.opacity = Math.max(0, newOpacity).toFixed(2);
                    } else {
                        row.style.opacity = 1;
                    }
                });
            },
            { passive: true }
        );

        // Run the setup once on load, and then on every debounced resize
        setupWashiRows();
        if (!isMobile) {
            window.addEventListener('resize', debounce(setupWashiRows, 250));
        }
    }

    // --- Intersection Observer Logic ---
    let menuObserver = null;
    let aboutObserver = null;

    const reversibleAnimationCallback = (entries) => {
        entries.forEach((entry) => {
            if (entry.isIntersecting) {
                entry.target.classList.add('is-visible');
            } else {
                entry.target.classList.remove('is-visible');
            }
        });
    };

    const setupIntersectionObservers = () => {
        if (menuObserver) menuObserver.disconnect();
        if (aboutObserver) aboutObserver.disconnect();

        // Observer for menu items
        const menuItems = document.querySelectorAll('.menu-card, .toppings-card');
        if (menuItems.length > 0) {
            menuObserver = new IntersectionObserver(reversibleAnimationCallback, {
                threshold: 0.1,
            });
            menuItems.forEach((item, index) => {
                item.style.transitionDelay = `${index * 150}ms`;
                menuObserver.observe(item);
            });
        }

        // Unified Observer for "About" Section, triggered by its particle container
        const aboutSectionContent = document.querySelector('.fade-in-section');
        const particleContainer = document.getElementById('particle-container'); // The new trigger

        if (aboutSectionContent && particleContainer) {
            const aboutCallback = (entries) => {
                entries.forEach((entry) => {
                    // Check if the trigger (the particle container) is on screen
                    if (entry.isIntersecting) {
                        // Animate the text container
                        aboutSectionContent.classList.add('is-visible');
                    } else {
                        aboutSectionContent.classList.remove('is-visible');
                    }
                });
            };

            // Set the trigger threshold based on viewport size
            let aboutThreshold;
            const screenWidth = window.innerWidth;

            if (screenWidth < 768) {
                // Mobile
                aboutThreshold = 0.25;
            } else if (screenWidth >= 768 && screenWidth < 1024) {
                // Tablet
                aboutThreshold = 0.6;
            } else {
                // Desktop
                aboutThreshold = 0.4;
            }

            aboutObserver = new IntersectionObserver(aboutCallback, { threshold: aboutThreshold });
            aboutObserver.observe(particleContainer);
        }
    };

    setupIntersectionObservers();
    window.addEventListener('resize', debounce(setupIntersectionObservers, 250));

    // --- Responsive Particle Effect Logic ---
    const particleContainer = document.getElementById('particle-container');
    const textContent = document.querySelector('#about .container');

    if (particleContainer && textContent) {
        const generateParticles = () => {
            particleContainer.classList.remove('particles-visible');
            setTimeout(() => {
                particleContainer.innerHTML = '';
                const fragment = document.createDocumentFragment();

                const minWidth = 320;
                const maxWidth = 1280;
                const currentWidth = Math.max(minWidth, Math.min(window.innerWidth, maxWidth));
                const scaleFactor = (currentWidth - minWidth) / (maxWidth - minWidth);

                const brightCount = Math.round(1 + 19 * scaleFactor);
                const subtleCount = Math.round(15 + 15 * scaleFactor);

                const textRect = textContent.getBoundingClientRect();
                const containerRect = particleContainer.getBoundingClientRect();
                const leftBoundary = textRect.left - containerRect.left;
                const rightBoundary = textRect.right - containerRect.left;

                const accentColors = ['#34D399', '#FB7185', '#f9c74f'];
                const colorChance = 0.15;
                const defaultColor = '#002366';

                const starburstSVG = `<svg class="particle" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></svg>`;
                const specialImagePaths = [
                    'Resources/KrikosInner.png',
                    'Resources/StellaInner.png',
                ];

                for (let i = 0; i < brightCount; i++) {
                    let particle;
                    if (i === 0) {
                        const chosenImage =
                            specialImagePaths[Math.floor(Math.random() * specialImagePaths.length)];
                        particle = document.createElement('img');
                        particle.src = chosenImage;
                        particle.alt = 'Floating decorative element';
                    } else {
                        const particleWrapper = document.createElement('div');
                        particleWrapper.innerHTML = starburstSVG;
                        particle = particleWrapper.firstChild;
                        if (Math.random() < colorChance)
                            particle.style.color =
                                accentColors[Math.floor(Math.random() * accentColors.length)];
                        else particle.style.color = defaultColor;
                    }

                    particle.classList.add('particle', 'particle-bright');
                    particle.style.width = `${Math.random() * 20 + 5}px`;
                    particle.style.height = particle.style.width;
                    particle.style.opacity = `0.7`;
                    particle.style.top = `${Math.random() * 100}%`;
                    particle.style.animationDuration = `${Math.random() * 8 + 4}s`;
                    particle.style.animationDelay = `${Math.random() * 2}s`;

                    if (window.innerWidth < 768) {
                        particle.style.left = `${Math.random() * 100}%`;
                    } else {
                        if (Math.random() > 0.5)
                            particle.style.left = `${Math.random() * leftBoundary}px`;
                        else
                            particle.style.left = `${rightBoundary + Math.random() * (containerRect.width - rightBoundary)}px`;
                    }
                    fragment.appendChild(particle);
                }

                for (let i = 0; i < subtleCount; i++) {
                    const particleWrapper = document.createElement('div');
                    particleWrapper.innerHTML = starburstSVG;
                    const particle = particleWrapper.firstChild;
                    particle.classList.add('particle-subtle');
                    particle.style.width = `${Math.random() * 12 + 4}px`;
                    particle.style.height = particle.style.width;
                    particle.style.opacity = `0.3`;
                    particle.style.top = `${Math.random() * 100}%`;
                    particle.style.left = `${Math.random() * 100}%`;
                    particle.style.animationDuration = `${Math.random() * 10 + 8}s`;
                    particle.style.animationDelay = `${Math.random() * 3}s`;
                    if (Math.random() < colorChance)
                        particle.style.color =
                            accentColors[Math.floor(Math.random() * accentColors.length)];
                    else particle.style.color = defaultColor;
                    fragment.appendChild(particle);
                }
                particleContainer.appendChild(fragment);

                particleContainer.classList.add('particles-visible');
            }, 500);
        };

        generateParticles();
        window.addEventListener('resize', debounce(generateParticles, 250));
    }

    // --- Dynamic JSON Menu Logic ---
    const menuTitle = document.getElementById('menu-title');
    const menuDesc = document.getElementById('menu-desc');
    const menuGrid = document.getElementById('menu-grid');

    const firstBtn = document.getElementById('first-menu-btn');
    const prevBtn = document.getElementById('prev-menu-btn');
    const nextBtn = document.getElementById('next-menu-btn');
    const lastBtn = document.getElementById('last-menu-btn');
    const seasonText = document.getElementById('season-text');

    let menuData = [];
    let currentMenuIndex = 0;

    // Fetch the JSON data
    fetch('menu.json')
        .then((response) => response.json())
        .then((data) => {
            menuData = data;

            // Find the index of the "active" menu to show by default
            const activeIndex = menuData.findIndex((menu) => menu.isActive);
            currentMenuIndex = activeIndex !== -1 ? activeIndex : 0;

            renderMenu(currentMenuIndex);
        })
        .catch((error) => {
            console.error('Error loading menu data:', error);
            menuTitle.textContent = 'Menu Unavailable';
            menuDesc.textContent = 'Please check back later.';
            seasonText.classList.add('hidden');
        });

    // Render function
    function renderMenu(index) {
        if (!menuData || menuData.length === 0) return;

        const menu = menuData[index];

        // Update text content
        menuTitle.textContent = menu.title;
        menuDesc.textContent = menu.description;
        seasonText.textContent = menu.season || 'Seasonal Offering';

        // Clear current grid
        menuGrid.innerHTML = '';

        // Generate Drink Cards
        menu.drinks.forEach((drink) => {
            const card = document.createElement('div');
            card.className = 'bg-[#FDFBF5] rounded-lg shadow-md p-6 menu-card flex flex-col';

            // Only render the pairing span if it exists
            const pairingHTML = drink.pairing
                ? `<span class="mt-2 opacity-70">${drink.pairing}</span>`
                : '';

            card.innerHTML = `
        <h3 class="text-2xl text-contrast-blue mb-2">${drink.name}</h3>
        <p class="opacity-70 flex-grow">${drink.ingredients}</p>
        ${pairingHTML}
        `;
            menuGrid.appendChild(card);
        });

        // Generate Add-on/Topping Cards
        menu.addons.forEach(addon => {
          const card = document.createElement('div');
          card.className = 'md:col-span-2 lg:col-span-4 bg-white/50 rounded-lg border-2 border-dashed border-brand-blue/20 p-6 text-center toppings-card';

          // Format items array into a bulleted string
          const itemsFormatted = Array.isArray(addon.items)
          ? addon.items.join(' &bull; ')
          : addon.items;

          // Only render the subtitle HTML if the field exists in the JSON
          const subtitleHTML = addon.subtitle
          ? `<p class="text-sm italic text-brand-blue opacity-70 mb-3">${addon.subtitle}</p>`
          : '';

          // We remove mb-3 from the h4 and conditionally handle the spacing
          const titleMargin = addon.subtitle ? 'mb-1' : 'mb-3';

          card.innerHTML = `
          <h4 class="text-3xl text-contrast-blue ${titleMargin}">${addon.title}</h4>
          ${subtitleHTML}
          <p class="opacity-70">${itemsFormatted}</p>
          `;
          menuGrid.appendChild(card);
        });

        // Update button states
        const isFirst = index === 0;
        const isLast = index === menuData.length - 1;

        firstBtn.disabled = isFirst;
        prevBtn.disabled = isFirst;
        nextBtn.disabled = isLast;
        lastBtn.disabled = isLast;

        // Re-run the Intersection Observer from your existing script
        // so the new cards get their slide-up animations
        if (typeof setupIntersectionObservers === 'function') {
            setupIntersectionObservers();
        }
    }

    // Button Listeners
    firstBtn.addEventListener('click', () => {
        currentMenuIndex = 0;
        renderMenu(currentMenuIndex);
    });

    prevBtn.addEventListener('click', () => {
        if (currentMenuIndex > 0) {
            currentMenuIndex--;
            renderMenu(currentMenuIndex);
        }
    });

    nextBtn.addEventListener('click', () => {
        if (currentMenuIndex < menuData.length - 1) {
            currentMenuIndex++;
            renderMenu(currentMenuIndex);
        }
    });

    lastBtn.addEventListener('click', () => {
        currentMenuIndex = menuData.length - 1;
        renderMenu(currentMenuIndex);
    });
});
