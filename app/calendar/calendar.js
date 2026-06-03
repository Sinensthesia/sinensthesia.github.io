document.addEventListener('DOMContentLoaded', function () {
    // Check if the page is in an iframe
    if (window.self !== window.top) {
        document.body.classList.add('is-embedded');
    }

    const calendarEl = document.getElementById('calendar');
    const BRAND_DEFAULT_LOGO =
    '../../Resources/Web/Icon/Blue/Sinensthesia-Logo-Teacup-Icon-RGB.png';

    function buildLegend() {
        fetch('./events.json')
        .then((response) => response.json())
        .then((data) => {
            const marketsContainer = document.getElementById('legend-markets');
            const eventsContainer = document.getElementById('legend-events');
            const cancelledContainer = document.getElementById('legend-cancelled');

            let marketsHtml = '',
            eventsHtml = '',
            cancelledHtml = '';
            const dayNames = [
                'Sundays',
                'Mondays',
                'Tuesdays',
                'Wednesdays',
                'Thursdays',
                'Fridays',
                'Saturdays',
            ];

            const now = new Date();
            data.forEach((event) => {
                // Filter out past cancellations
                if (event.cancelled && event.start) {
                    const eventDate = new Date(event.start);
                    if (eventDate < now) {
                        return;
                    }
                }

                let dateString = '',
                isRecurringMarket = false;
                if (event.daysOfWeek && event.daysOfWeek.length > 0) {
                    dateString = event.daysOfWeek.map((num) => dayNames[num]).join(', ');
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
                const titleStyle = event.cancelled
                ? 'text-decoration: line-through; opacity: 0.6;'
                : '';
                const cancelledBadge = event.cancelled
                ? `<span style="color: #b30000; font-weight: bold; font-size: 0.85em;">CANCELLED</span>`
                : '';

                // Make the image a link if a URL is provided
                const imageMarkup = event.url
                ? `<a href="${event.url}" target="_blank" style="flex-shrink: 0; display: flex;"><img src="${finalLegendImageUrl}" alt="${event.title}" class="legend-logo" style="${event.cancelled ? 'filter: grayscale(100%);' : ''}"></a>`
                : `<img src="${finalLegendImageUrl}" alt="${event.title}" class="legend-logo" style="${event.cancelled ? 'filter: grayscale(100%);' : ''}">`;

                const itemHtml = `
                <li class="legend-item" style="${event.cancelled ? 'opacity: 0.8;' : ''}">
                ${imageMarkup}
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

                marketsContainer.innerHTML =
                marketsHtml ||
                `<span class="legend-empty">No recurring markets scheduled.</span>`;
                eventsContainer.innerHTML =
                eventsHtml || `<span class="legend-empty">No special events scheduled.</span>`;
                cancelledContainer.innerHTML =
                cancelledHtml || `<span class="legend-empty">No upcoming cancellations.</span>`;
        });
    }

    buildLegend();

    const calendar = new FullCalendar.Calendar(calendarEl, {
        initialView: 'dayGridMonth',
        height: 'auto',
        fixedWeekCount: true,
        aspectRatio: 1.35,
        expandRows: true,

        buttonText: { today: '☀️' },
        headerToolbar: {
            left: 'prev,next today',
            center: 'title',
            right: '',
        },
        events: function (fetchInfo, successCallback, failureCallback) {
            fetch('./events.json')
            .then((r) => r.json())
            .then((data) => {
                const processedEvents = [],
                cancellationsMap = {};
                data.forEach((e) => {
                    if (e.cancelled && e.start)
                        cancellationsMap[`${e.start}|${e.title}`] = true;
                    // Strip URL to remove link behavior in the calendar grid
                    if (e.cancelled) processedEvents.push({ ...e, url: '' });
                });
                data.forEach((e) => {
                    if (e.cancelled) return;
                    if (e.daysOfWeek) {
                        let cur = new Date(
                            (e.startRecur || e.start || '2025-01-01') + 'T00:00:00'
                        );
                        let end = new Date((e.endRecur || e.end || '2030-12-31') + 'T00:00:00');
                        while (cur <= end) {
                            if (e.daysOfWeek.includes(cur.getDay())) {
                                let ds = cur.toISOString().split('T')[0];
                                if (!cancellationsMap[`${ds}|${e.title}`])
                                    // Strip URL
                                    processedEvents.push({
                                        ...e,
                                        start: ds,
                                        end: null,
                                        daysOfWeek: undefined,
                                        url: ''
                                    });
                            }
                            cur.setDate(cur.getDate() + 1);
                        }
                    } else if (e.start && e.end) {
                        let cur = new Date(e.start + 'T00:00:00'),
                             end = new Date(e.end + 'T00:00:00');
                             while (cur <= end) {
                                 let ds = cur.toISOString().split('T')[0];
                                 if (!cancellationsMap[`${ds}|${e.title}`])
                                     // Strip URL
                                     processedEvents.push({ ...e, start: ds, end: null, url: '' });
                                     cur.setDate(cur.getDate() + 1);
                             }
                    } else if (!cancellationsMap[`${e.start}|${e.title}`])
                        // Strip URL
                        processedEvents.push({ ...e, url: '' });
                });
                successCallback(processedEvents);
            });
        },

        eventContent: function (arg) {
            const finalImageUrl = arg.event.extendedProps.image || BRAND_DEFAULT_LOGO;
            const isCancelled = arg.event.extendedProps.cancelled;

            if (isCancelled) {
                return {
                    html: `<div style="display: flex; justify-content: center; align-items: center; position: relative; height: 100%; width: 100%;">
                    <img src="${finalImageUrl}" style="max-width: 90%; max-height: 100px; object-fit: contain; opacity: 0.3; filter: grayscale(100%);">
                    <div style="position: absolute; width: 80%; height: 3px; background-color: #b30000; transform: rotate(-15deg);"></div>
                    <div style="position: absolute; color: #b30000; font-weight: 900; font-size: 0.7em; background: rgba(255,255,255,0.9); padding: 1px 4px; border-radius: 2px; text-transform: uppercase;">Cancelled</div>
                    </div>`,
                };
            } else {
                return {
                    html: `<div style="display: flex; justify-content: center; align-items: center; height: 100%; width: 100%;">
                    <img src="${finalImageUrl}" style="max-width: 90%; max-height: 100px; object-fit: contain;">
                    </div>`,
                };
            }
        }
    });

    calendar.render();

    // Call the external particles utility with calendar-specific overrides
    if (typeof initParticles === 'function') {
        initParticles({
            containerId: 'particle-container',
            textSelector: '#scatter-particles',
            imagePaths: [
                '../../Resources/KrikosInner.png',
                '../../Resources/StellaInner.png'
            ]
        });
    } else {
        console.warn('initParticles is not defined. Ensure utilities/particles.js is loaded.');
    }
});
