document.addEventListener('DOMContentLoaded', function() {
    // Check if the page is in an iframe
    if (window.self !== window.top) {
        document.body.classList.add('is-embedded');
    }
    function debounce(func, wait) {
        let timeout;
        return function() {
            const context = this, args = arguments;
            clearTimeout(timeout);
            timeout = setTimeout(() => func.apply(context, args), wait);
        };
    }

    const calendarEl = document.getElementById('calendar');
    const BRAND_DEFAULT_LOGO = '../Resources/Web/Icon/Blue/Sinensthesia-Logo-Teacup-Icon-RGB.png';

    function buildLegend() {
        fetch('./events.json')
        .then(response => response.json())
        .then(data => {
            const marketsContainer = document.getElementById('legend-markets');
            const eventsContainer = document.getElementById('legend-events');
            const cancelledContainer = document.getElementById('legend-cancelled');
            let marketsHtml = '', eventsHtml = '', cancelledHtml = '';
            const dayNames = ['Sundays', 'Mondays', 'Tuesdays', 'Wednesdays', 'Thursdays', 'Fridays', 'Saturdays'];

            data.forEach(event => {
                let dateString = '', isRecurringMarket = false;
                if (event.daysOfWeek && event.daysOfWeek.length > 0) {
                    dateString = event.daysOfWeek.map(num => dayNames[num]).join(', ');
                    isRecurringMarket = true;
                } else if (event.start && event.end) {
                    dateString = `${event.start} to ${event.end}`;
                } else if (event.start) {
                    dateString = `${event.start}`;
                }

                let locationHtml = '';
                if (event.location) {
                    const mapQuery = encodeURIComponent(event.location);
                    const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;
                    locationHtml = event.cancelled
                    ? `<span class="legend-location">📍 ${event.location}</span>`
                    : `<a href="${mapsUrl}" target="_blank" class="legend-location">📍 ${event.location}</a>`;
                }

                const finalLegendImageUrl = event.image || BRAND_DEFAULT_LOGO;
                const titleStyle = event.cancelled ? 'text-decoration: line-through; opacity: 0.6;' : '';
                const cancelledBadge = event.cancelled ? `<span style="color: #b30000; font-weight: bold; font-size: 0.85em;">CANCELLED</span>` : '';

                const itemHtml = `
                <li class="legend-item" style="${event.cancelled ? 'opacity: 0.8;' : ''}">
                <img src="${finalLegendImageUrl}" alt="${event.title}" class="legend-logo" style="${event.cancelled ? 'filter: grayscale(100%);' : ''}">
                <div class="legend-text">
                <span class="legend-title" style="${titleStyle}">${event.title}</span>
                ${cancelledBadge}
                <span class="legend-dates">${dateString}</span>
                ${locationHtml}
                </div>
                </li>
                `;

                if (event.cancelled) cancelledHtml += itemHtml;
                else if (isRecurringMarket) marketsHtml += itemHtml;
                else eventsHtml += itemHtml;
            });

                marketsContainer.innerHTML = marketsHtml || `<span class="legend-empty">No recurring markets scheduled.</span>`;
                eventsContainer.innerHTML = eventsHtml || `<span class="legend-empty">No special events scheduled.</span>`;
                cancelledContainer.innerHTML = cancelledHtml || `<span class="legend-empty">No cancellations.</span>`;
        });
    }
    buildLegend();
    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        // Use 'auto' height on mobile (width < 900)
        // Use '100%' on desktop (but only if NOT embedded)
        height: window.innerWidth < 900 ? 'auto' : (window.self !== window.top ? 'auto' : '100%'),

        // Ensure the grid cells expand to fill the available space
        expandRows: true,
        buttonText: {
            today: "☀️"
        },
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: ''
        },
        events: function(fetchInfo, successCallback, failureCallback) {
            fetch('./events.json').then(r => r.json()).then(data => {
                const processedEvents = [], cancellationsMap = {};
                data.forEach(e => { if (e.cancelled && e.start) cancellationsMap[`${e.start}|${e.title}`] = true; if (e.cancelled) processedEvents.push(e); });
                data.forEach(e => {
                    if (e.cancelled) return;
                    if (e.daysOfWeek) {
                        let cur = new Date((e.startRecur || e.start || '2025-01-01') + 'T00:00:00');
                        let end = new Date((e.endRecur || e.end || '2030-12-31') + 'T00:00:00');
                        while (cur <= end) {
                            if (e.daysOfWeek.includes(cur.getDay())) {
                                let ds = cur.toISOString().split('T')[0];
                                if (!cancellationsMap[`${ds}|${e.title}`]) processedEvents.push({...e, start: ds, end: null, daysOfWeek: undefined});
                            }
                            cur.setDate(cur.getDate() + 1);
                        }
                    } else if (e.start && e.end) {
                        let cur = new Date(e.start + 'T00:00:00'), end = new Date(e.end + 'T00:00:00');
                        while (cur <= end) {
                            let ds = cur.toISOString().split('T')[0];
                            if (!cancellationsMap[`${ds}|${e.title}`]) processedEvents.push({...e, start: ds, end: null});
                            cur.setDate(cur.getDate() + 1);
                        }
                    } else if (!cancellationsMap[`${e.start}|${e.title}`]) processedEvents.push(e);
                });
                successCallback(processedEvents);
            });
        },

        eventContent: function(arg) {
            const finalImageUrl = arg.event.extendedProps.image || BRAND_DEFAULT_LOGO;
            const isCancelled = arg.event.extendedProps.cancelled;

            if (isCancelled) {
                return {
                    html: `<div style="display: flex; justify-content: center; align-items: center; position: relative; height: 100%;">
                    <img src="${finalImageUrl}" style="max-width: 95%; max-height: 65px; object-fit: contain; opacity: 0.3; filter: grayscale(100%);">
                    <div style="position: absolute; width: 80%; height: 2px; background-color: #b30000; transform: rotate(-15deg);"></div>
                    <div style="position: absolute; color: #b30000; font-weight: 900; font-size: 0.65em; background: rgba(255,255,255,0.9); padding: 1px 4px; border-radius: 2px; text-transform: uppercase;">Canceled</div>
                    </div>`
                };
            } else {
                return {
                    html: `<div style="display: flex; justify-content: center; align-items: center; height: 100%;">
                    <img src="${finalImageUrl}" style="max-width: 95%; max-height: 65px; object-fit: contain;">
                    </div>`
                };
            }
        },
        eventClick: function(info) { if (info.event.url) { info.jsEvent.preventDefault(); window.open(info.event.url, "_blank"); } }
    });

    calendar.render();

    const particleContainer = document.getElementById('particle-container');
    const textContent = document.querySelector('.layout-wrapper');
    if(particleContainer && textContent) {
        const generateParticles = () => {
            particleContainer.classList.remove('particles-visible');
            setTimeout(() => {
                particleContainer.innerHTML = '';
                const fragment = document.createDocumentFragment();
                const currentWidth = Math.max(320, Math.min(window.innerWidth, 1280));
                const scaleFactor = (currentWidth - 320) / 960;
                const brightCount = Math.round(1 + 19 * scaleFactor), subtleCount = Math.round(15 + 15 * scaleFactor);
                const textRect = textContent.getBoundingClientRect(), containerRect = particleContainer.getBoundingClientRect();
                const leftBoundary = textRect.left - containerRect.left, rightBoundary = textRect.right - containerRect.left;
                const accentColors = ['#34D399', '#FB7185', '#f9c74f'], starburstSVG = `<svg class="particle" fill="currentColor" viewBox="0 0 24 24"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></svg>`;
                const specialImagePaths = ['../Resources/KrikosInner.png', '../Resources/StellaInner.png'];

                for(let i = 0; i < brightCount; i++) {
                    let p = (i === 0) ? document.createElement('img') : document.createElement('div');
                    if (i === 0) p.src = specialImagePaths[Math.floor(Math.random() * 2)];
                    else { p.innerHTML = starburstSVG; p = p.firstChild; p.style.color = (Math.random() < 0.15) ? accentColors[Math.floor(Math.random() * 3)] : '#002366'; }
                    p.classList.add('particle', 'particle-bright');
                    p.style.width = `${Math.random() * 20 + 5}px`; p.style.height = p.style.width;
                    p.style.top = `${Math.random() * 100}%`;
                    p.style.animationDuration = `${Math.random() * 8 + 4}s`;
                    if (window.innerWidth < 768) p.style.left = `${Math.random() * 100}%`;
                    else p.style.left = (Math.random() > 0.5) ? `${Math.random() * leftBoundary}px` : `${rightBoundary + (Math.random() * (containerRect.width - rightBoundary))}px`;
                    fragment.appendChild(p);
                }
                for(let i = 0; i < subtleCount; i++) {
                    let p = document.createElement('div'); p.innerHTML = starburstSVG; p = p.firstChild;
                    p.classList.add('particle-subtle'); p.style.width = `${Math.random() * 12 + 4}px`; p.style.height = p.style.width;
                    p.style.top = `${Math.random() * 100}%`; p.style.left = `${Math.random() * 100}%`;
                    p.style.animationDuration = `${Math.random() * 10 + 8}s`;
                    p.style.color = (Math.random() < 0.15) ? accentColors[Math.floor(Math.random() * 3)] : '#002366';
                    fragment.appendChild(p);
                }
                particleContainer.appendChild(fragment); particleContainer.classList.add('particles-visible');
            }, 500);
        };
        generateParticles(); window.addEventListener('resize', debounce(generateParticles, 250));
    }
});
