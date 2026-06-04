// utilities/particles.js

/**
 * Initializes the floating particle effect.
 * @param {Object} options - Configuration options for the particles.
 */
function initParticles(options = {}) {
    // Allows you to override paths/IDs if a specific page requires it,
    // otherwise it falls back to these defaults.
    const {
        containerId = 'particle-container',
        priorityContentId = '#about .container',
        imagePaths = ['Resources/KrikosInner.png', 'Resources/StellaInner.png']
    } = options;

    const container = document.getElementById(containerId);
    if (!container) return;

    const priorityContent = document.querySelector(priorityContentId);

    // --- 1. Inject CSS Styles Dynamically ---
    const injectStyles = () => {
        // Prevent duplicate injections if initialized multiple times
        if (document.getElementById('particle-styles')) return;

        const styleSheet = document.createElement('style');
        styleSheet.id = 'particle-styles';
        styleSheet.innerHTML = `
        #${containerId} {
        opacity: 0;
        transition: opacity 0.5s ease-in-out;
        top: -15vh;
        position: absolute;
        width: 100%;
        height: 100%;
        pointer-events: none; /* Prevents particles from blocking clicks */
        z-index: 0;
        }
        #${containerId}.particles-visible {
        opacity: 1;
        transition: opacity 2.2s ease-in-out;
        }
        @keyframes float-bright {
            0% { transform: translateY(0px) rotate(0deg); opacity: 0.7; }
            50% { transform: translateY(-15px) rotate(180deg); opacity: 0.3; }
            100% { transform: translateY(0px) rotate(360deg); opacity: 0.7; }
        }
        @keyframes float-subtle {
            0% { transform: translateY(0px) rotate(0deg); opacity: 0.3; }
            50% { transform: translateY(-20px) rotate(180deg); opacity: 0.1; }
            100% { transform: translateY(0px) rotate(360deg); opacity: 0.3; }
        }
        .particle {
            position: absolute;
            animation-timing-function: ease-in-out;
            animation-iteration-count: infinite;
        }
        .particle-bright { animation-name: float-bright; }
        .particle-subtle { animation-name: float-subtle; }
        `;
        document.head.appendChild(styleSheet);
    };

    // --- 2. Localized debounce so this utility is 100% standalone ---
    const debounce = (func, wait) => {
        let timeout;
        return (...args) => {
            clearTimeout(timeout);
            timeout = setTimeout(() => func(...args), wait);
        };
    };

    // --- 3. Particle Generation Logic ---
    const generateParticles = () => {
        // Fade out
        container.classList.remove('particles-visible');

        setTimeout(() => {
            container.innerHTML = '';
            const fragment = document.createDocumentFragment();

            const scaleFactor = (Math.max(320, Math.min(window.innerWidth, 1280)) - 320) / 960;
            const brightCount = Math.round(1 + 19 * scaleFactor);
            const subtleCount = Math.round(15 + 15 * scaleFactor);

            // Safely calculate boundaries ONLY if the text container exists on this page
            let boundaries = { left: 0, right: 0, width: container.getBoundingClientRect().width };
            if (priorityContent) {
                const prioRect = priorityContent.getBoundingClientRect();
                const containerRect = container.getBoundingClientRect();
                boundaries = {
                    left: prioRect.left - containerRect.left,
                    right: prioRect.right - containerRect.left,
                    width: containerRect.width
                };
            }

            const accentColors = ['#34D399', '#FB7185', '#f9c74f'];
            const starburstSVG = `<svg class="particle" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></svg>`;

            // Helper to create individual particles
            const createParticle = (isBright, index) => {
                let el;
                if (isBright && index === 0 && imagePaths.length > 0) {
                    el = document.createElement('img');
                    el.src = imagePaths[Math.floor(Math.random() * imagePaths.length)];
                    el.alt = 'Decorative';
                } else {
                    const wrapper = document.createElement('div');
                    wrapper.innerHTML = starburstSVG;
                    el = wrapper.firstChild;
                    el.style.color = Math.random() < 0.15
                    ? accentColors[Math.floor(Math.random() * accentColors.length)]
                    : '#002366';
                }

                const size = isBright ? (Math.random() * 20 + 5) : (Math.random() * 12 + 4);

                el.classList.add('particle');
                if (isBright) el.classList.add('particle-bright');
                else el.classList.add('particle-subtle');

                Object.assign(el.style, {
                    width: `${size}px`,
                    height: `${size}px`,
                    opacity: isBright ? '0.7' : '0.3',
                    top: `${Math.random() * 100}%`,
                              animationDuration: `${Math.random() * (isBright ? 8 : 10) + (isBright ? 4 : 8)}s`,
                              animationDelay: `${Math.random() * (isBright ? 2 : 3)}s`
                });

                // Dynamic Positioning Logic
                // If on mobile, or subtle, or if there is no container to avoid, scatter randomly!
                if ((window.innerWidth < 769) || !isBright || !priorityContent) {
                    el.style.left = `${Math.random() * 100}%`;
                } else {
                    el.style.left = Math.random() > 0.5
                    ? `${Math.random() * boundaries.left}px`
                    : `${boundaries.right + Math.random() * (boundaries.width - boundaries.right)}px`;
                }
                return el;
            };

            for (let i = 0; i < brightCount; i++) fragment.appendChild(createParticle(true, i));
            for (let i = 0; i < subtleCount; i++) fragment.appendChild(createParticle(false, i));

            container.appendChild(fragment);

            // Fade back in AFTER generation is complete
            container.classList.add('particles-visible');
        }, 500);
    };

    // --- 4. Initialize & Setup Listeners ---
    injectStyles();
    generateParticles();

    // Resize listener with mobile vertical scroll protection
    let particleLastWidth = window.innerWidth;
    window.addEventListener('resize', debounce(() => {
        if (window.innerWidth !== particleLastWidth) {
            particleLastWidth = window.innerWidth;
            generateParticles();
        }
    }, 250));
}
