<!doctype html>
<html lang="en">
    <head>
        <meta charset="UTF-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        <title>Sinensthesia | App Portal</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link
            href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;600;700&family=Inter:wght@400;500;600&display=swap"
            rel="stylesheet"
        />
        <style>
            body {
                font-family: 'Inter', sans-serif;
                background-color: #fdfbf5;
                color: #1e2a4a;
            }
            h1,
            h2 {
                font-family: 'Cormorant Garamond', serif;
            }
            .bg-brand-blue {
                background-color: #002366;
            }
            .text-brand-blue {
                color: #0505af;
            }

            /* Particle & Animation Styles from your style.css */
            #particle-container {
                position: absolute;
                inset: 0;
                z-index: 0;
                pointer-events: none;
            }
            .particle {
                position: absolute;
                animation: float-bright infinite ease-in-out;
            }
            @keyframes float-bright {
                0%,
                100% {
                    transform: translateY(0px) rotate(0deg);
                    opacity: 0.7;
                }
                50% {
                    transform: translateY(-15px) rotate(180deg);
                    opacity: 0.3;
                }
            }

            .app-card {
                transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
                border: 2px solid transparent;
            }
            .app-card:hover {
                transform: translateY(-10px);
                border-color: rgba(5, 5, 175, 0.2);
                box-shadow: 0 20px 25px -5px rgba(0, 35, 102, 0.1);
            }
        </style>
    </head>
    <body class="min-h-screen flex items-center justify-center p-6 overflow-hidden">
        <div id="particle-container"></div>

        <div class="relative z-10 max-w-4xl w-full text-center">
            <div class="mb-12">
                <img
                    src="https://sinensthesia.com/Resources/Web/Icon/Blue/Sinensthesia-Logo-Teacup-Icon-RGB.png"
                    alt="Logo"
                    class="h-32 w-32 mx-auto mb-4"
                />
                <h1 class="text-5xl md:text-6xl text-brand-blue mb-2">Vibe Codium</h1>
                <p class="text-lg opacity-60 tracking-widest uppercase">Select a tool to begin</p>
            </div>

            <div class="grid grid-cols-1 md:grid-cols-3 gap-8">
                <a href="calendar/" class="app-card bg-white p-8 rounded-3xl shadow-sm group">
                    <div
                        class="h-16 w-16 bg-[#F6F4EE] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-blue group-hover:text-white transition-colors"
                    >
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
                            ></path>
                        </svg>
                    </div>
                    <h2 class="text-3xl text-brand-blue mb-2">Calendar</h2>
                    <p class="text-sm opacity-60">Market dates & event schedules</p>
                </a>

                <a href="invoice/" class="app-card bg-white p-8 rounded-3xl shadow-sm group">
                    <div
                        class="h-16 w-16 bg-[#F6F4EE] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-blue group-hover:text-white transition-colors"
                    >
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                            ></path>
                        </svg>
                    </div>
                    <h2 class="text-3xl text-brand-blue mb-2">Invoices</h2>
                    <p class="text-sm opacity-60">Catering billing & client statements</p>
                </a>

                <a href="sales/" class="app-card bg-white p-8 rounded-3xl shadow-sm group">
                    <div
                        class="h-16 w-16 bg-[#F6F4EE] rounded-2xl flex items-center justify-center mx-auto mb-6 group-hover:bg-brand-blue group-hover:text-white transition-colors"
                    >
                        <svg class="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path
                                stroke-linecap="round"
                                stroke-linejoin="round"
                                stroke-width="1.5"
                                d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                            ></path>
                        </svg>
                    </div>
                    <h2 class="text-3xl text-brand-blue mb-2">Sales</h2>
                    <p class="text-sm opacity-60">Revenue tracking & seasonal analytics</p>
                </a>
            </div>
        </div>

        <script>
            // Simplified particle generator
            const container = document.getElementById('particle-container');
            const starburstSVG = `<svg class="particle" fill="#002366" viewBox="0 0 24 24" width="15" height="15"><path d="M12 2L9.5 9.5 2 12l7.5 2.5L12 22l2.5-7.5L22 12l-7.5-2.5z"/></svg>`;

            for (let i = 0; i < 15; i++) {
                const div = document.createElement('div');
                div.innerHTML = starburstSVG;
                const p = div.firstChild;
                p.style.left = Math.random() * 100 + '%';
                p.style.top = Math.random() * 100 + '%';
                p.style.animationDuration = Math.random() * 5 + 3 + 's';
                p.style.animationDelay = Math.random() * 2 + 's';
                p.style.opacity = Math.random() * 0.4;
                container.appendChild(p);
            }
        </script>
    </body>
</html>
