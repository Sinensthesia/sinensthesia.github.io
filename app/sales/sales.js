// Native currency formatter
const fmt = (n) => new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

// Accurate cent rounding
const roundToCent = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// Default Configuration
let CONFIG = {
};

const App = {
    state: {
        sales: JSON.parse(localStorage.getItem('salesData_v8')) || [],
        cart: [],
        builder: { cat: null, sub: null, tea: null, adds: new Set(), tops: new Set(), globalAdds: new Set() },
        payType: 'Cash',
    },

    async init() {
        const savedConfig = localStorage.getItem('appConfig_v1');
        if (savedConfig) {
            try { CONFIG = JSON.parse(savedConfig); } catch (e) { console.error("Invalid local config"); }
        } else {
            try {
                const response = await fetch('./config.json');
                if (response.ok) CONFIG = await response.json();
            } catch (e) { console.log("Using default config"); }
        }

        this.renderCategories();
        this.renderPayments();
        this.updateHistory();

        setInterval(() => {
            if (!document.getElementById('retroToggle').checked) {
                document.getElementById('sessionClock').innerText = new Date().toLocaleString([], { month: 'numeric', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' });
            }
        }, 1000);
    },

    openSettings() {
        document.getElementById('configEditor').value = JSON.stringify(CONFIG, null, 2);
        document.getElementById('settingsModal').classList.remove('hidden');
    },

    closeSettings() {
        document.getElementById('settingsModal').classList.add('hidden');
    },

    saveConfig() {
        try {
            const newConfig = JSON.parse(document.getElementById('configEditor').value);
            CONFIG = newConfig;
            localStorage.setItem('appConfig_v1', JSON.stringify(CONFIG));

            this.state.builder = { cat: null, sub: null, tea: null, adds: new Set(), tops: new Set(), globalAdds: new Set() };
            this.renderCategories();
            this.renderPayments();

            document.getElementById('subCatWrapper').classList.add('hidden');
            document.getElementById('beverageModifiersWrapper').classList.add('hidden');
            document.getElementById('globalModifiersWrapper').classList.add('hidden');

            this.closeSettings();
        } catch (e) {
            alert("Invalid JSON format. Please check your syntax and try again.");
        }
    },

    resetConfig() {
        if(confirm("Are you sure you want to reset to the default configuration? This will clear your custom JSON edits.")) {
            localStorage.removeItem('appConfig_v1');
            location.reload();
        }
    },

    toggleRetroMode() {
        const isRetro = document.getElementById('retroToggle').checked;
        const clock = document.getElementById('sessionClock');
        const dateInput = document.getElementById('retroDateInput');
        if (isRetro) {
            clock.classList.add('hidden');
            dateInput.classList.remove('hidden');
            if (!dateInput.value) {
                const today = new Date();
                const offset = today.getTimezoneOffset() * 60000;
                dateInput.value = new Date(today.getTime() - offset).toISOString().split('T')[0];
            }
        } else {
            clock.classList.remove('hidden');
            dateInput.classList.add('hidden');
        }
    },

    renderCategories() {
        const container = document.getElementById('categoryContainer');
        container.innerHTML = '';
        Object.keys(CONFIG.categories).forEach((cat) => {
            const theme = CONFIG.themes[cat];
            const active = this.state.builder.cat === cat;
            const btn = document.createElement('button');
            btn.className = `pill-btn px-3 lg:px-4 py-1.5 text-[10px] lg:text-xs rounded-full ${active ? `active bg-${theme.main} text-white ring-2 ring-${theme.ring}` : `bg-${theme.bg} text-${theme.text} hover:opacity-80`}`;
            btn.textContent = cat;
            btn.onclick = () => {
                this.state.builder.cat = cat;
                this.state.builder.sub = CONFIG.categories[cat][0];
                this.state.builder.tea = null;
                this.state.builder.adds.clear();
                this.state.builder.tops.clear();
                this.state.builder.globalAdds.clear();
                this.renderCategories();
                this.renderSubCategories();
            };
            container.appendChild(btn);
        });
    },

    renderSubCategories() {
        const cat = this.state.builder.cat;
        const subs = CONFIG.categories[cat] || [];
        const theme = CONFIG.themes[cat];
        const wrap = document.getElementById('subCatWrapper');
        const container = document.getElementById('subCategoryContainer');

        wrap.classList.toggle('hidden', subs.length === 0);
        container.innerHTML = '';

        subs.forEach((sub, i) => {
            const active = this.state.builder.sub === sub;
            const btn = document.createElement('button');
            const shade = theme.shades[i % theme.shades.length];
            btn.className = `pill-btn px-3 py-1.5 text-[10px] lg:text-xs rounded-full ${active ? `active ${shade} text-white ring-2 ring-${theme.ring}` : `bg-${theme.bg} text-${theme.text} border-transparent`}`;
            btn.textContent = sub;
            btn.onclick = () => {
                this.state.builder.sub = sub;
                this.state.builder.tea = null;
                this.state.builder.adds.clear();
                this.state.builder.tops.clear();
                this.renderSubCategories();
            };
            container.appendChild(btn);
        });

        document.getElementById('beverageModifiersWrapper').classList.toggle('hidden', cat !== 'Beverage');
        document.getElementById('teaTypeWrapper').classList.toggle('hidden', this.state.builder.sub !== 'Tea');
        document.getElementById('globalModifiersWrapper').classList.toggle('hidden', !cat || cat === 'Expense');

        this.renderModifiers();
        this.syncBuilderName();
    },

    renderModifiers() {
        this.renderPills('teaTypes', 'teaTypeContainer', 'tea', false);
        this.renderPills('additions', 'additionsContainer', 'adds', true);
        this.renderPills('toppings', 'toppingsContainer', 'tops', true);
        if (CONFIG.modifiers.global) this.renderPills('global', 'globalContainer', 'globalAdds', true);
    },

    renderPills(configKey, elementId, stateKey, isSet) {
        const container = document.getElementById(elementId);
        container.innerHTML = '';
        (CONFIG.modifiers[configKey] || []).forEach((item) => {
            const active = isSet ? this.state.builder[stateKey].has(item) : this.state.builder[stateKey] === item;
            const btn = document.createElement('button');
            let colorClass = 'bg-gray-100 text-gray-500';
            if (active) {
                if (configKey === 'teaTypes') {
                    const teaColor = CONFIG.themes.Tea[item] || 'blue';
                    colorClass = `bg-${teaColor}-600 text-white border-${teaColor}-700 ring-2 ring-${teaColor}-200`;
                } else {
                    colorClass = 'bg-brand-blue text-white border-brand-blue ring-2 ring-blue-200';
                }
            }
            btn.className = `text-left px-2 lg:px-3 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-bold border transition ${colorClass}`;
            btn.textContent = item;
            btn.onclick = () => {
                if (isSet) {
                    this.state.builder[stateKey].has(item) ? this.state.builder[stateKey].delete(item) : this.state.builder[stateKey].add(item);
                } else {
                    this.state.builder[stateKey] = item;
                }
                this.renderModifiers();
                this.syncBuilderName();
            };
            container.appendChild(btn);
        });
    },

    adjQty(v) {
        const input = document.getElementById('qtyInput');
        input.value = Math.max(1, parseInt(input.value) + v);
    },

    adjPrice(v) {
        const input = document.getElementById('unitPriceInput');
        let current = parseFloat(input.value) || 0;
        // Prevents the price display from going into negative numbers
        input.value = Math.max(0, current + v).toFixed(2);
    },

    syncBuilderName() {
        const b = this.state.builder;
        let finalName = '';
        let price = 0;

        if (b.cat) {
            const addsArray = [...b.adds];
            const topsArray = [...b.tops];
            const globalArray = [...b.globalAdds];
            const flavors = addsArray.filter((a) => !a.toLowerCase().includes('milk'));
            const milks = addsArray.filter((a) => a.toLowerCase().includes('milk'));

            let coreParts = [];
            if (b.tea) coreParts.push(b.tea);
            if (b.sub) coreParts.push(b.sub);
            let coreName = coreParts.join(' ');

            let prefix = flavors.length > 0 ? flavors.join(' & ') + ' ' : '';
            let suffixes = [...milks, ...topsArray, ...globalArray];
            let suffix = suffixes.length > 0 ? ' w/ ' + suffixes.join(', ') : '';
            finalName = prefix + coreName + suffix;

            if (b.cat === 'Beverage') {
                price = CONFIG.defaultPrices.subCategories[b.sub] || 0;
                if (b.adds.size > 0) price += CONFIG.defaultPrices.modifiers.additions || 0;
                if (b.tops.size > 0) price += CONFIG.defaultPrices.modifiers.toppings || 0;
            } else if (CONFIG.defaultPrices.categories[b.cat] !== undefined) {
                price = CONFIG.defaultPrices.categories[b.cat];
            }

            [...b.globalAdds].forEach(addon => {
                price += (CONFIG.defaultPrices.modifiers.global[addon] || 0);
            });
        }

        document.getElementById('itemInput').value = finalName.trim();
        document.getElementById('unitPriceInput').value = price.toFixed(2);
    },

    addToCart() {
        if (!this.state.builder.cat) return;
        let rawPrice = parseFloat(document.getElementById('unitPriceInput').value) || 0;
        if (this.state.builder.cat === 'Expense') rawPrice = -Math.abs(rawPrice);

        let computedSubCategory = this.state.builder.sub || '';
        if (this.state.builder.cat === 'Beverage' && this.state.builder.sub === 'Tea') {
            if (this.state.builder.adds.size === 0 && this.state.builder.tops.size === 0) computedSubCategory = 'Brewed tea';
            else if ([...this.state.builder.adds].some((a) => a.toLowerCase().includes('milk'))) computedSubCategory = 'Latte';
        }

        const item = {
            id: Date.now(),
            name: document.getElementById('itemInput').value || computedSubCategory,
            unitPrice: rawPrice,
            qty: parseInt(document.getElementById('qtyInput').value),
            category: this.state.builder.cat,
            subCategory: computedSubCategory,
            theme: CONFIG.themes[this.state.builder.cat],
        };

        this.state.cart.push(item);
        this.renderCart();
        document.getElementById('qtyInput').value = 1;
    },

    renderCart() {
        const list = document.getElementById('cartList');
        const empty = document.getElementById('cartEmpty');
        list.querySelectorAll('.cart-item').forEach((e) => e.remove());

        let subtotal = 0;
        let taxableSubtotal = 0;

        this.state.cart.forEach((item) => {
            const lineTotal = item.unitPrice * item.qty;
            subtotal += lineTotal;
            if (item.category !== 'Expense') taxableSubtotal += lineTotal;

            const div = document.createElement('div');
            div.className = 'cart-item bg-white border border-gray-100 p-2 lg:p-3 rounded-xl flex justify-between items-center shadow-sm hover:border-gray-300 transition';
            div.innerHTML = `
            <div class="flex flex-col min-w-0 pr-2">
            <div class="flex items-center gap-1.5 flex-wrap">
            <span class="bg-${item.theme.bg} text-${item.theme.text} text-[8px] lg:text-[9px] font-black px-1.5 py-0.5 rounded uppercase flex-shrink-0">${item.category}</span>
            <span class="text-[11px] lg:text-xs font-bold text-gray-800 truncate">${item.name}</span>
            </div>
            <span class="text-[9px] lg:text-[10px] text-gray-400 mt-1">${item.qty} units @ ${fmt(item.unitPrice)}</span>
            </div>
            <div class="flex items-center gap-2 lg:gap-3 flex-shrink-0">
            <span class="text-xs lg:text-sm font-black ${item.unitPrice < 0 ? 'text-red-600' : 'text-brand-blue'}">${fmt(item.unitPrice * item.qty)}</span>
            <button onclick="App.removeFromCart(${item.id})" class="text-gray-300 hover:text-red-500 text-lg font-bold">&times;</button>
            </div>`;
            list.appendChild(div);
        });

        const disc = parseFloat(document.getElementById('discountInput').value) || 0;
        const tip = parseFloat(document.getElementById('tipInput').value) || 0;

        let finalSubtotal = subtotal;
        if (subtotal > 0) finalSubtotal = Math.max(0, subtotal - disc);

        // Calculate dynamic tax for active cart panel
        const finalTaxable = taxableSubtotal > 0 ? Math.max(0, taxableSubtotal - disc) : 0;
        const taxAmount = roundToCent(finalTaxable - (finalTaxable / (1 + CONFIG.taxRate)));
        const finalTotal = roundToCent(finalSubtotal + tip);

        empty.classList.toggle('hidden', this.state.cart.length > 0);
        document.getElementById('cartSubtotalText').innerText = fmt(subtotal);
        if (document.getElementById('cartTaxText')) document.getElementById('cartTaxText').innerText = fmt(taxAmount);
        document.getElementById('cartTotalText').innerText = fmt(finalTotal);
        document.getElementById('cartTotalText').className = finalTotal < 0 ? 'text-xl lg:text-2xl font-black text-red-600' : 'text-xl lg:text-2xl font-black text-gray-800';
        document.getElementById('cartCount').innerText = this.state.cart.length;
        document.getElementById('checkoutBtn').disabled = this.state.cart.length === 0;
    },

    removeFromCart(id) {
        this.state.cart = this.state.cart.filter((item) => item.id !== id);
        this.renderCart();
    },

    renderPayments() {
        const container = document.getElementById('paymentTypeContainer');
        container.innerHTML = '';
        const map = { Cash: 'green', Venmo: 'blue', Zelle: 'purple', CC: 'yellow', MB: 'gray' };

        CONFIG.payments.forEach((p) => {
            const color = map[p] || 'gray';
            const active = this.state.payType === p;
            const btn = document.createElement('button');
            btn.className = `px-2 lg:px-3 py-1 lg:py-1.5 rounded-lg text-[9px] lg:text-[10px] font-black border transition ${active ? `bg-${color}-600 text-white border-${color}-700 ring-2 ring-${color}-200` : `bg-${color}-50 text-${color}-700 border-${color}-100`}`;
            btn.textContent = p;
            btn.onclick = () => {
                this.state.payType = p;
                this.renderPayments();
            };
            container.appendChild(btn);
        });
    },

    checkout() {
        let subtotal = 0;
        let taxableSubtotal = 0;

        this.state.cart.forEach((item) => {
            const lineTotal = item.unitPrice * item.qty;
            subtotal += lineTotal;
            if (item.category !== 'Expense') taxableSubtotal += lineTotal;
        });

            const discount = parseFloat(document.getElementById('discountInput').value) || 0;
            const tip = parseFloat(document.getElementById('tipInput').value) || 0;

            let finalSubtotal = subtotal;
            if (subtotal > 0) finalSubtotal = Math.max(0, subtotal - discount);

            const orderTotal = roundToCent(finalSubtotal + tip);
        const finalTaxable = taxableSubtotal > 0 ? Math.max(0, taxableSubtotal - discount) : 0;
        const tax = roundToCent(finalTaxable - (finalTaxable / (1 + CONFIG.taxRate)));

        let fee = 0;
        const feeConfig = CONFIG.fees[this.state.payType];
        if (orderTotal > 0 && feeConfig) {
            fee = roundToCent((orderTotal * feeConfig.percent) + feeConfig.fixed);
        }

        const isRetro = document.getElementById('retroToggle').checked;
        let ts = '';
        if (isRetro) {
            const val = document.getElementById('retroDateInput').value;
            ts = new Date(val + 'T12:00:00').toLocaleDateString([], { month: 'numeric', day: 'numeric', year: '2-digit' });
        } else {
            ts = new Date().toLocaleString([], { month: 'numeric', day: 'numeric', year: '2-digit', hour: '2-digit', minute: '2-digit' });
        }

        const order = {
            id: Date.now(),
            timestamp: ts,
            items: [...this.state.cart],
            subtotal,
            discount,
            tip,
            total: orderTotal,
            payment: this.state.payType,
            fee,
            tax,
        };

        this.state.sales.push(order);
        this.state.cart = [];
        document.getElementById('discountInput').value = '0';
        document.getElementById('tipInput').value = '0';
        this.save();
        this.renderCart();
        this.updateHistory();
    },

    editOrder(id) {
        if (this.state.cart.length > 0) {
            if (!confirm("Editing this order will replace your current active cart. Continue?")) return;
        }

        const orderIndex = this.state.sales.findIndex((o) => o.id === id);
        if (orderIndex === -1) return;

        const order = this.state.sales[orderIndex];

        this.state.cart = [...order.items];
        this.state.payType = order.payment;
        document.getElementById('discountInput').value = (order.discount || 0).toFixed(2);
        document.getElementById('tipInput').value = (order.tip || 0).toFixed(2);

        this.state.sales.splice(orderIndex, 1);

        this.save();
        this.renderCart();
        this.renderPayments();
        this.updateHistory();
    },

    deleteOrder(id) {
        this.state.sales = this.state.sales.filter((o) => o.id !== id);
        this.save();
        this.updateHistory();
    },

    updateHistory() {
        const body = document.getElementById('salesTableBody');
        body.innerHTML = '';

        let s = { gross: 0, cashGroup: 0, venmoGroup: 0, zelle: 0, fees: 0, venmoFees: 0, ccFees: 0, tax: 0, exactCash: 0, mb: 0, exactVenmo: 0, cc: 0, expenses: 0, tips: 0 };
        const payColors = { Cash: 'green', Venmo: 'blue', Zelle: 'purple', CC: 'yellow', MB: 'gray' };

        [...this.state.sales].reverse().forEach((order, orderIndex) => {
            s.gross += order.total;
            s.tax += order.tax;
            s.fees += order.fee;
            s.tips += order.tip || 0;
            if (order.payment === 'Cash') { s.cashGroup += order.total; s.exactCash += order.total; }
            else if (order.payment === 'MB') { s.cashGroup += order.total; s.mb += order.total; }
            else if (order.payment === 'Venmo') { s.venmoGroup += order.total; s.exactVenmo += order.total; s.venmoFees += order.fee; }
            else if (order.payment === 'CC') { s.venmoGroup += order.total; s.cc += order.total; s.ccFees += order.fee; }
            else if (order.payment === 'Zelle') { s.zelle += order.total; }

            s.expenses += Math.abs(order.items.filter((i) => i.category === 'Expense').reduce((sum, i) => sum + i.unitPrice * i.qty, 0));

            const pColor = payColors[order.payment] || 'gray';
            const netAmt = roundToCent(order.total - order.fee - order.tax);
            const rowspan = order.items.length;

            const rowBg = orderIndex % 2 === 0 ? 'bg-white' : 'bg-cream';

            order.items.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.className = `${rowBg} hover:brightness-95 transition border-b border-gray-100`;

                const catTheme = CONFIG.themes[item.category] || { bg: 'gray-100', text: 'gray-700' };
                let html = '';

                if (index === 0) {
                    html += `<td class="p-2 lg:p-3 text-[9px] lg:text-[10px] text-gray-500 font-mono align-top border-r border-gray-100" rowspan="${rowspan}">${order.timestamp}</td>`;
                }

                html += `
                <td class="p-2 lg:p-3 w-full align-top">
                <div class="text-[11px] lg:text-xs font-bold text-gray-800">${item.name}</div>
                <div class="mt-1"><span class="text-[8px] uppercase font-bold bg-${catTheme.bg} text-${catTheme.text} px-1.5 py-0.5 rounded">${item.category}</span></div>
                </td>
                <td class="p-2 lg:p-3 text-center font-bold text-xs align-top">${item.qty}</td>
                <td class="p-2 lg:p-3 text-right font-mono text-xs text-gray-500 align-top">${fmt(item.unitPrice)}</td>
                `;

                if (index === 0) {
                    const discountText = order.discount > 0 ? '-' + order.discount.toFixed(2) : '—';
                    const tipText = order.tip > 0 ? '+' + order.tip.toFixed(2) : '—';
                    const taxText = order.tax > 0 ? fmt(order.tax) : '—';

                    html += `
                    <td class="p-2 lg:p-3 text-center align-top border-l border-gray-100" rowspan="${rowspan}"><span class="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-${pColor}-200 bg-${pColor}-50 text-${pColor}-700">${order.payment}</span></td>
                    <td class="p-2 lg:p-3 text-right font-mono text-xs text-red-500 align-top" rowspan="${rowspan}">${discountText}</td>
                    <td class="p-2 lg:p-3 text-right font-mono text-xs text-green-600 align-top" rowspan="${rowspan}">${tipText}</td>
                    <td class="p-2 lg:p-3 text-right font-mono text-xs text-yellow-600 align-top" rowspan="${rowspan}">${taxText}</td>
                    <td class="p-2 lg:p-3 text-right font-mono text-xs font-black align-top" rowspan="${rowspan}">${fmt(order.total)}</td>
                    <td class="p-2 lg:p-3 text-right font-mono text-xs font-black text-brand-blue align-top" rowspan="${rowspan}">${fmt(netAmt)}</td>
                    <td class="p-2 lg:p-3 align-top" rowspan="${rowspan}">
                    <div class="flex justify-end items-center gap-3">
                    <button onclick="App.editOrder(${order.id})" class="text-blue-400 hover:text-brand-blue transition" title="Edit Order">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button onclick="App.deleteOrder(${order.id})" class="text-gray-300 hover:text-red-500 font-bold text-lg transition" title="Delete Order">&times;</button>
                    </div>
                    </td>`;
                }

                tr.innerHTML = html;
                body.appendChild(tr);
            });
        });

        document.getElementById('cashTotalDisplay').innerText = fmt(s.cashGroup);
        document.getElementById('venmoTotalDisplay').innerText = fmt(s.venmoGroup);
        document.getElementById('zelleTotalDisplay').innerText = fmt(s.zelle);
        document.getElementById('grandTotalDisplay').innerText = fmt(s.gross);
        document.getElementById('netTotalDisplay').innerText = fmt(roundToCent(s.gross - s.fees - s.tax));
        document.getElementById('cashBreakdown').innerText = `Cash: ${fmt(s.exactCash)}`;
        document.getElementById('mbBreakdown').innerText = `MarketBucks: ${fmt(s.mb)}`;
        document.getElementById('venmoBreakdown').innerText = `Venmo: ${fmt(s.exactVenmo)}`;
        document.getElementById('venmoFeeBreakdown').innerText = `Fee: ${fmt(s.venmoFees)}`;
        document.getElementById('ccBreakdown').innerText = `Credit Card: ${fmt(s.cc)}`;
        document.getElementById('ccFeeBreakdown').innerText = `Fee: ${fmt(s.ccFees)}`;
        document.getElementById('taxBreakdown').innerText = `Tax: ${fmt(s.tax)}`;
        document.getElementById('feeBreakdown').innerText = `Total Fees: ${fmt(s.fees)}`;
        document.getElementById('netVenmoFee').innerText = `- Venmo: ${fmt(s.venmoFees)}`;
        document.getElementById('netCcFee').innerText = `- CC: ${fmt(s.ccFees)}`;
        document.getElementById('expenseBreakdown').innerText = `Expenses: -${fmt(s.expenses)}`;
    },

    save() { localStorage.setItem('salesData_v8', JSON.stringify(this.state.sales)); },

    clearData() {
        if (confirm('Clear all session data?')) {
            this.state.sales = [];
            this.save();
            this.updateHistory();
        }
    },

    exportToCSV() {
        let csv = 'Order ID,Date/Time,Category,Subcategory,Item Name,Item Gross Price,Item Qty,Item Line Total,Order Subtotal,Order Discount,Order Tip,Order Gross Total,Order Net Total,Order Tax,Order Fees,Payment Method\n';

        this.state.sales.forEach((o) => {
            const ts = o.timestamp.replace(/,/g, '');
            const net = o.total - o.tax - o.fee;

            o.items.forEach((item, index) => {
                const isFirst = index === 0;
                csv += `${o.id},${ts},${item.category},${item.subCategory || 'Unknown'},"${item.name}",${item.unitPrice.toFixed(2)},${item.qty},${(item.unitPrice * item.qty).toFixed(2)},${isFirst ? o.subtotal.toFixed(2) : ''},${isFirst ? o.discount.toFixed(2) : ''},${isFirst ? (o.tip || 0).toFixed(2) : ''},${isFirst ? o.total.toFixed(2) : ''},${isFirst ? net.toFixed(2) : ''},${isFirst ? o.tax.toFixed(2) : ''},${isFirst ? o.fee.toFixed(2) : ''},${isFirst ? o.payment : ''}\n`;
            });
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const rawTitle = document.getElementById('reportTitle').value.trim() || 'sales_report';
        a.href = url;
        a.download = `${rawTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${new Date().toISOString().split('T')[0]}.csv`;
        a.click();
    },

    importCSV(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const content = e.target.result;
            const lines = content.split(/\r?\n/).filter((line) => line.trim() !== '');
            const ordersMap = new Map();

            const parseCSVRow = (str) => {
                let result = [];
                let inQuotes = false;
                let current = '';
                for (let i = 0; i < str.length; i++) {
                    const c = str[i];
                    if (c === '"') { inQuotes = !inQuotes; }
                    else if (c === ',' && !inQuotes) { result.push(current.trim()); current = ''; }
                    else { current += c; }
                }
                result.push(current.trim());
                return result.map(v => v.replace(/^"|"$/g, ''));
            };

            for (let i = 1; i < lines.length; i++) {
                const row = parseCSVRow(lines[i]);
                if (row.length < 10) continue;

                const orderId = parseInt(row[0], 10);
                if (!orderId || isNaN(orderId)) continue;

                if (!ordersMap.has(orderId)) {
                    ordersMap.set(orderId, {
                        id: orderId,
                        timestamp: row[1],
                        subtotal: parseFloat(row[8]) || 0,
                                  discount: parseFloat(row[9]) || 0,
                                  tip: parseFloat(row[10]) || 0,
                                  total: parseFloat(row[11]) || 0,
                                  payment: row[15] || 'Unknown',
                                  fee: parseFloat(row[14]) || 0,
                                  tax: parseFloat(row[13]) || 0,
                                  items: [],
                    });
                } else {
                    const existing = ordersMap.get(orderId);
                    if (row[11] && !isNaN(parseFloat(row[11]))) {
                        existing.subtotal = parseFloat(row[8]) || 0;
                        existing.discount = parseFloat(row[9]) || 0;
                        existing.tip = parseFloat(row[10]) || 0;
                        existing.total = parseFloat(row[11]) || 0;
                        existing.tax = parseFloat(row[13]) || 0;
                        existing.fee = parseFloat(row[14]) || 0;
                        existing.payment = row[15] || existing.payment;
                    }
                }

                ordersMap.get(orderId).items.push({
                    name: row[4],
                    unitPrice: parseFloat(row[5]) || 0,
                                                  qty: parseInt(row[6]) || 1,
                                                  category: row[2],
                                                  subCategory: row[3] === 'Unknown' ? '' : row[3],
                                                  theme: CONFIG.themes[row[2]] || { bg: 'gray-100', text: 'gray-700' },
                });
            }

            const imported = Array.from(ordersMap.values());
            if (imported.length > 0 && confirm(`Import ${imported.length} orders?`)) {
                const existingIds = new Set(this.state.sales.map((s) => s.id));

                this.state.sales = [
                    ...this.state.sales,
                    ...imported.filter((o) => !existingIds.has(o.id)),
                ];
                this.save();
                this.updateHistory();
            }
        };
        reader.readAsText(file);
    }
};

window.App = App;
App.init();
