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

// Handle all scroll-based animations
document.addEventListener('DOMContentLoaded', () => {
    // Generate and animate washi pattern rows
    const washiContainer = document.getElementById('washi-container');
    if (washiContainer) {
        // This logic could also be refactored to be responsive, but is okay for now.
        const rowHeightVw = 6;
        const rowHeightPx = (window.innerWidth * rowHeightVw) / 100;
        const heroHeight = window.innerHeight * 0.9;
        const numRows = Math.ceil(heroHeight / rowHeightPx) + 2;

        for (let i = 0; i < numRows; i++) {
            const row = document.createElement('div');
            row.classList.add('washi-row');
            washiContainer.appendChild(row);
        }

        const washiRows = document.querySelectorAll('.washi-row');
        if (washiRows.length > 0) {
            window.addEventListener('scroll', () => {
                const scrollPosition = window.scrollY;
                const staggerAmount = 25;
                const fadeDuration = 250;

                washiRows.forEach((row, index) => {
                    const rowTriggerScroll = index * staggerAmount;
                    const scrollPastTrigger = scrollPosition - rowTriggerScroll;

                    if (scrollPastTrigger > 0) {
                        let newOpacity = 1 - (scrollPastTrigger / fadeDuration);
                        row.style.opacity = Math.max(0, newOpacity).toFixed(2);
                    } else {
                        row.style.opacity = 1;
                    }
                });
            }, { passive: true });
        }
    }

    // --- Intersection Observer Logic ---
    const isMobile = window.innerWidth < 768;

    // Observer for menu items (always reversible)
    const menuItems = document.querySelectorAll('.menu-card, .toppings-card');
    if (menuItems.length > 0) {
        const menuObserver = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    entry.target.classList.add('is-visible');
                } else {
                    entry.target.classList.remove('is-visible');
                }
            });
        }, { threshold: 0.1 });

        menuItems.forEach((item, index) => {
            item.style.transitionDelay = `${index * 150}ms`;
            menuObserver.observe(item);
        });
    }

    // Conditional, Reversible Observer for "About" Section
    const aboutSectionContent = document.querySelector('.fade-in-section');
    if (aboutSectionContent) {
        if (isMobile) {
            // On mobile, the "About" section triggers its own animation
            const aboutObserver = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                    } else {
                        entry.target.classList.remove('is-visible');
                    }
                });
            }, { threshold: 0.90 });
            aboutObserver.observe(aboutSectionContent);
        } else {
            // On desktop, the "Menu" section triggers the "About" section's animation
            const menuSection = document.getElementById('menu');
            if (menuSection) {
                const menuTriggerObserver = new IntersectionObserver((entries) => {
                    entries.forEach(entry => {
                        if (entry.isIntersecting) {
                            aboutSectionContent.classList.add('is-visible');
                        } else {
                            aboutSectionContent.classList.remove('is-visible');
                        }
                    });
                }, { threshold: 0.1 }); // Trigger when menu appears
                menuTriggerObserver.observe(menuSection);
            }
        }
    }


    // --- Responsive Particle Effect Logic ---
    const particleContainer = document.getElementById('particle-container');
    const textContent = document.querySelector('#about .container');

    if(particleContainer && textContent) {

        function debounce(func, wait) {
            let timeout;
            return function executedFunction(...args) {
                const later = () => {
                    clearTimeout(timeout);
                    func(...args);
                };
                clearTimeout(timeout);
                timeout = setTimeout(later, wait);
            };
        }

        const generateParticles = () => {
            // Start fade-out
            particleContainer.classList.remove('particles-visible');

            // Wait for fade-out to finish, then regenerate
            setTimeout(() => {
                particleContainer.innerHTML = ''; // Clear existing particles
                const fragment = document.createDocumentFragment();

                // --- Particle Count Scaling Logic ---
                const minWidth = 320;
                const maxWidth = 1280;
                const currentWidth = Math.max(minWidth, Math.min(window.innerWidth, maxWidth));
                const scaleFactor = (currentWidth - minWidth) / (maxWidth - minWidth); // 0.0 to 1.0

                const brightCount = Math.round(1 + 19 * scaleFactor); // Scales from 1 to 20
                const subtleCount = Math.round(15 + 15 * scaleFactor); // Scales from 15 to 30
                // ---

                const textRect = textContent.getBoundingClientRect();
                const containerRect = particleContainer.getBoundingClientRect();
                const leftBoundary = textRect.left - containerRect.left;
                const rightBoundary = textRect.right - containerRect.left;

                const accentColors = ['#34D399', '#FB7185', '#f9c74f'];
                const colorChance = 0.15;
                const defaultColor = '#002366';

                const starburstSVG = `<svg class="particle" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></svg>`;
                const specialImagePaths = ['Resources/KrikosInner.png', 'Resources/StellaInner.png'];

                for(let i = 0; i < brightCount; i++) {
                    let particle;
                    if (i === 0) {
                        const chosenImage = specialImagePaths[Math.floor(Math.random() * specialImagePaths.length)];
                        particle = document.createElement('img');
                        particle.src = chosenImage;
                        particle.alt = 'Floating decorative element';
                    } else {
                        const particleWrapper = document.createElement('div');
                        particleWrapper.innerHTML = starburstSVG;
                        particle = particleWrapper.firstChild;
                        if (Math.random() < colorChance) particle.style.color = accentColors[Math.floor(Math.random() * accentColors.length)]; else particle.style.color = defaultColor;
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
                        if (Math.random() > 0.5) particle.style.left = `${Math.random() * leftBoundary}px`; else particle.style.left = `${rightBoundary + (Math.random() * (containerRect.width - rightBoundary))}px`;
                    }
                    fragment.appendChild(particle);
                }

                for(let i = 0; i < subtleCount; i++) {
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
                    if (Math.random() < colorChance) particle.style.color = accentColors[Math.floor(Math.random() * accentColors.length)]; else particle.style.color = defaultColor;
                    fragment.appendChild(particle);
                }
                particleContainer.appendChild(fragment);

                // Start fade-in
                particleContainer.classList.add('particles-visible');
            }, 500); // Wait 500ms for fade-out CSS transition to complete
        };

        // Initial generation and setup resize listener
        generateParticles();
        window.addEventListener('resize', debounce(generateParticles, 250));
    }
});
