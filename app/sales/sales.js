// Native currency formatter
const fmt = (n) =>
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(n || 0);

// Accurate cent rounding
const roundToCent = (num) => Math.round((num + Number.EPSILON) * 100) / 100;

// Default Configuration mapped to the new builder logic
let CONFIG = {};

const App = {
    state: {
        sales: JSON.parse(localStorage.getItem('salesData_v8')) || [],
        cart: [],
        builder: {
            cat: null,
            sub: null,
            tea: null,
            adds: new Set(),
            tops: new Set(),
            globalAdds: new Set(),
        },
        payType: 'Cash',
    },

    async init() {
        const savedConfig = localStorage.getItem('appConfig_v1');
        if (savedConfig) {
            try {
                CONFIG = JSON.parse(savedConfig);
            } catch (e) {
                console.error('Invalid local config');
            }
        } else {
            try {
                const response = await fetch('./config.json');
                if (response.ok) CONFIG = await response.json();
            } catch (e) {
                console.log('Using default config');
            }
        }

        this.renderCategories();
        this.renderPayments();
        this.updateHistory();

        setInterval(() => {
            if (!document.getElementById('retroToggle').checked) {
                document.getElementById('sessionClock').innerText = new Date().toLocaleString([], {
                    month: 'numeric',
                    day: 'numeric',
                    year: '2-digit',
                    hour: '2-digit',
                    minute: '2-digit',
                });
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

            this.state.builder = {
                cat: null,
                sub: null,
                tea: null,
                adds: new Set(),
                tops: new Set(),
                globalAdds: new Set(),
            };
            this.renderCategories();
            this.renderPayments();

            document.getElementById('subCatWrapper').classList.add('hidden');
            document.getElementById('beverageModifiersWrapper').classList.add('hidden');
            document.getElementById('globalModifiersWrapper').classList.add('hidden');

            this.closeSettings();
        } catch (e) {
            alert('Invalid JSON format. Please check your syntax and try again.');
        }
    },

    resetConfig() {
        if (
            confirm(
                'Are you sure you want to reset to the default configuration? This will clear your custom JSON ssedits.'
            )
        ) {
            localStorage.removeItem('appConfig_v1');
            location.reload();
        }
    },

    toggleRetroMode() {
        const isRetro = document.getElementById('retroToggle').checked;
        const clock = document.getElementById('sessionClock');
        const dateInput = document.getElementById('retroDateInput');
        const overrideBtn = document.getElementById('retroOverrideBtn'); // Grab the new button

        if (isRetro) {
            clock.classList.add('hidden');
            dateInput.classList.remove('hidden');
            if (overrideBtn) overrideBtn.classList.remove('hidden'); // Show button

            if (!dateInput.value) {
                const today = new Date();
                const offset = today.getTimezoneOffset() * 60000;
                dateInput.value = new Date(today.getTime() - offset).toISOString().split('T')[0];
            }
        } else {
            clock.classList.remove('hidden');
            dateInput.classList.add('hidden');
            if (overrideBtn) overrideBtn.classList.add('hidden'); // Hide button
        }
    },

    overrideOrderDates() {
        const dateVal = document.getElementById('retroDateInput').value;

        if (!dateVal) return alert('Please select a date first.');
        if (this.state.sales.length === 0) return alert('There are no existing orders to update.');

        if (
            confirm(
                `Overwrite ALL existing orders to ${dateVal} (removing times)? This cannot be undone.`
            )
        ) {
            // String manipulation is much faster and avoids timezone bugs
            const [y, m, d] = dateVal.split('-');
            const cleanDate = `${parseInt(m)}/${parseInt(d)}/${y.slice(2)}`;

            this.state.sales.forEach((order) => (order.timestamp = cleanDate));

            this.save();
            this.updateHistory();
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

        document
            .getElementById('beverageModifiersWrapper')
            .classList.toggle('hidden', cat !== 'Beverage');
        document
            .getElementById('teaTypeWrapper')
            .classList.toggle('hidden', this.state.builder.sub !== 'Tea');
        document
            .getElementById('globalModifiersWrapper')
            .classList.toggle('hidden', !cat || cat === 'Expense');

        this.renderModifiers();
        this.syncBuilderName();
    },

    renderModifiers() {
        this.renderPills('teaTypes', 'teaTypeContainer', 'tea', false);
        this.renderPills('additions', 'additionsContainer', 'adds', true);
        this.renderPills('toppings', 'toppingsContainer', 'tops', true);
        if (CONFIG.modifiers.global)
            this.renderPills('global', 'globalContainer', 'globalAdds', true);
    },

    renderPills(configKey, elementId, stateKey, isSet) {
        const container = document.getElementById(elementId);
        container.innerHTML = '';
        (CONFIG.modifiers[configKey] || []).forEach((item) => {
            const active = isSet
                ? this.state.builder[stateKey].has(item)
                : this.state.builder[stateKey] === item;
            const btn = document.createElement('button');
            let colorClass = 'bg-gray-100 text-gray-500';
            if (active) {
                if (configKey === 'teaTypes') {
                    const teaColor = CONFIG.themes.Beverage[item] || 'blue'; // Using Beverage theme for teas
                    colorClass = `bg-${teaColor}-600 text-white border-${teaColor}-700 ring-2 ring-${teaColor}-200`;
                } else {
                    colorClass = 'bg-brand-blue text-white border-brand-blue ring-2 ring-blue-200';
                }
            }
            btn.className = `text-left px-2 lg:px-3 py-1.5 rounded-lg text-[9px] lg:text-[10px] font-bold border transition ${colorClass}`;
            btn.textContent = item;
            btn.onclick = () => {
                if (isSet) {
                    this.state.builder[stateKey].has(item)
                        ? this.state.builder[stateKey].delete(item)
                        : this.state.builder[stateKey].add(item);
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

            [...b.globalAdds].forEach((addon) => {
                price += CONFIG.defaultPrices.modifiers.global[addon] || 0;
            });
        }

        document.getElementById('itemInput').value = finalName.trim();
        document.getElementById('unitPriceInput').value = price.toFixed(2);
    },

    addToCart() {
        if (!this.state.builder.cat) return;
        let rawPrice = parseFloat(document.getElementById('unitPriceInput').value) || 0;

        // Requirement 1: Expenses subtract from Gross.
        // Force expense prices to be negative.
        if (this.state.builder.cat === 'Expense') rawPrice = -Math.abs(rawPrice);

        let computedSubCategory = this.state.builder.sub || '';
        if (this.state.builder.cat === 'Beverage' && this.state.builder.sub === 'Tea') {
            if (this.state.builder.adds.size === 0 && this.state.builder.tops.size === 0)
                computedSubCategory = 'Brewed tea';
            else if ([...this.state.builder.adds].some((a) => a.toLowerCase().includes('milk')))
                computedSubCategory = 'Latte';
        }

        const item = {
            id: Date.now(),
            name: document.getElementById('itemInput').value || computedSubCategory,
            unitPrice: rawPrice,
            qty: parseInt(document.getElementById('qtyInput').value),
            category: this.state.builder.cat,
            subCategory: computedSubCategory,
            theme: CONFIG.themes[this.state.builder.cat] || { bg: 'gray-100', text: 'gray-700' },
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
            div.className =
                'cart-item bg-white border border-gray-100 p-2 lg:p-3 rounded-xl flex justify-between items-center shadow-sm hover:border-gray-300 transition';
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

        // TAX INCLUSIVE MATH: Extract tax backwards out of the subtotal
        const finalTaxable = taxableSubtotal > 0 ? Math.max(0, taxableSubtotal - disc) : 0;
        const taxAmount = roundToCent(finalTaxable - finalTaxable / (1 + CONFIG.taxRate));

        // Final total does NOT add tax again (it's already in the subtotal)
        const finalTotal = roundToCent(finalSubtotal + tip);

        empty.classList.toggle('hidden', this.state.cart.length > 0);
        document.getElementById('cartSubtotalText').innerText = fmt(subtotal);
        if (document.getElementById('cartTaxText'))
            document.getElementById('cartTaxText').innerText = fmt(taxAmount);

        const totalElem = document.getElementById('cartTotalText');
        totalElem.innerText = fmt(finalTotal);
        totalElem.className =
            finalTotal < 0
                ? 'text-xl lg:text-2xl font-black text-red-600'
                : 'text-xl lg:text-2xl font-black text-gray-800';

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

        // TAX INCLUSIVE MATH: Extract tax backwards
        const finalTaxable = taxableSubtotal > 0 ? Math.max(0, taxableSubtotal - discount) : 0;
        const tax = roundToCent(finalTaxable - finalTaxable / (1 + CONFIG.taxRate));

        // Final total does NOT add tax again
        const orderTotal = roundToCent(finalSubtotal + tip);

        let fee = 0;
        const feeConfig = CONFIG.fees[this.state.payType];
        if (orderTotal > 0 && feeConfig) {
            fee = roundToCent(orderTotal * feeConfig.percent + feeConfig.fixed);
        }

        const isRetro = document.getElementById('retroToggle').checked;
        let ts = '';
        if (isRetro) {
            const val = document.getElementById('retroDateInput').value;
            const [y, m, d] = val.split('-');
            ts = `${parseInt(m)}/${parseInt(d)}/${y.slice(2)}`;
        } else {
            ts = new Date().toLocaleString([], {
                month: 'numeric',
                day: 'numeric',
                year: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
            });
        }

        // Get the multiplier value (default to 1 if empty/invalid)
        const massCount = parseInt(document.getElementById('massOrderCount').value) || 1;

        // Loop through the creation process based on the massCount
        for (let i = 0; i < massCount; i++) {
            const order = {
                id: Date.now() + i, // Add 'i' to ensure unique IDs for mass additions
                timestamp: ts,
                items: JSON.parse(JSON.stringify(this.state.cart)), // Deep copy the cart
                subtotal,
                discount,
                tip,
                total: orderTotal,
                payment: this.state.payType,
                fee,
                tax,
            };

            this.state.sales.push(order);
        }

        // Reset the cart and inputs
        this.state.cart = [];
        document.getElementById('discountInput').value = '0';
        document.getElementById('tipInput').value = '0';
        document.getElementById('massOrderCount').value = '1'; // Reset mass count to 1 for safety

        this.save();
        this.renderCart();
        this.updateHistory();
    },

    launchVenmoLink() {
        // 1. Ensure there are items in the cart to pay for
        if (this.state.cart.length === 0) {
            return alert('Your cart is empty.');
        }

        // 2. Set your Venmo business/personal handle here (without the '@')
        const venmoHandle = 'YOUR_VENMO_HANDLE_HERE';

        // 3. Automatically select 'Venmo' as the payment type in the UI
        this.state.payType = 'Venmo';
        this.renderPayments();

        // 4. Calculate the total matching your exact checkout math
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

        // 5. Generate a clean text summary of the items for the Venmo receipt note
        const itemSummary = this.state.cart.map((item) => `${item.qty}x ${item.name}`).join(', ');
        const noteText = encodeURIComponent(`Order: ${itemSummary}`);

        // 6. Build the official universal deep link URI
        const venmoUrl = `venmo://paycharge?txn=pay&recipients=${venmoHandle}&amount=${orderTotal.toFixed(2)}&note=${noteText}`;

        // 7. Fire the link to open the app
        window.location.href = venmoUrl;
    },

    editOrder(id) {
        if (this.state.cart.length > 0) {
            if (!confirm('Editing this order will replace your current active cart. Continue?'))
                return;
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

        // prettier-ignore
        let s = {
            collected: 0, gross: 0, cashGroup: 0, venmoGroup: 0, zelle: 0,
            fees: 0, venmoFees: 0, ccFees: 0, tax: 0,
            exactCash: 0, mb: 0, exactVenmo: 0, cc: 0,
            expenses: 0, tips: 0,
            cashTips: 0, venmoTips: 0, zelleTips: 0, ccTips: 0, mbTips: 0,
            cashExpenses: 0, venmoExpenses: 0, zelleExpenses: 0, ccExpenses: 0, mbExpenses: 0,
            cashNet: 0, venmoNet: 0, zelleNet: 0, ccNet: 0, mbNet: 0,
            cashTax: 0, venmoTax: 0, zelleTax: 0, ccTax: 0, mbTax: 0,
            cashCount: 0, venmoCount: 0, zelleCount: 0, ccCount: 0, mbCount: 0,
            cashGross: 0, mbGross: 0, venmoGross: 0, ccGross: 0, zelleGross: 0
        };

        const payColors = {
            Cash: 'green',
            Venmo: 'blue',
            Zelle: 'fuchsia',
            CC: 'yellow',
            MB: 'slate',
        };

        [...this.state.sales].reverse().forEach((order, orderIndex) => {
            const orderExpense = Math.abs(
                order.items
                    .filter((i) => i.category === 'Expense')
                    .reduce((sum, i) => sum + i.unitPrice * i.qty, 0)
            );
            const orderTip = order.tip || 0;

            // Raw collected revenue (ignoring internal accounting)
            s.collected += order.total + orderExpense;
            s.expenses += orderExpense;
            s.tax += order.tax;
            s.fees += order.fee;
            s.tips += orderTip;

            // Category Net: order.total implicitly accounts for tips (added) and expenses (subtracted)
            const orderNet = roundToCent(order.total - order.tax - order.fee);

            // Category Gross: back out the tips and add back the absolute value of the expenses
            const orderGross = roundToCent(order.total + orderExpense - orderTip);

            // prettier-ignore
            // Payment Buckets
            if (order.payment === 'Cash') {
                s.cashGroup += order.total; s.exactCash += order.total; s.cashTips += orderTip; s.cashExpenses += orderExpense;
                s.cashNet += orderNet; s.cashTax += order.tax; s.cashCount++;
                s.cashGross += orderGross;
            } else if (order.payment === 'MB') {
                s.cashGroup += order.total; s.mb += order.total; s.mbTips += orderTip; s.mbExpenses += orderExpense;
                s.mbNet += orderNet; s.mbTax += order.tax; s.mbCount++;
                s.mbGross += orderGross;
            } else if (order.payment === 'Venmo') {
                s.venmoGroup += order.total; s.exactVenmo += order.total; s.venmoFees += order.fee; s.venmoTips += orderTip; s.venmoExpenses += orderExpense;
                s.venmoNet += orderNet; s.venmoTax += order.tax; s.venmoCount++;
                s.venmoGross += orderGross;
            } else if (order.payment === 'CC') {
                s.venmoGroup += order.total; s.cc += order.total; s.ccFees += order.fee; s.ccTips += orderTip; s.ccExpenses += orderExpense;
                s.ccNet += orderNet; s.ccTax += order.tax; s.ccCount++;
                s.ccGross += orderGross;
            } else if (order.payment === 'Zelle') {
                s.zelle += order.total; s.zelleTips += orderTip; s.zelleExpenses += orderExpense;
                s.zelleNet += orderNet; s.zelleTax += order.tax; s.zelleCount++;
                s.zelleGross += orderGross;
            }

            const pColor = payColors[order.payment];

            const rowBg = orderIndex % 2 === 0 ? `bg-${pColor}-50` : `bg-${pColor}-100`;

            // True net per order deducts tax and fees (Tips are kept by owner)
            const netAmt = roundToCent(order.total - order.fee - order.tax);
            const rowspan = order.items.length;

            order.items.forEach((item, index) => {
                const tr = document.createElement('tr');
                tr.className = `${rowBg} hover:brightness-95 transition border-b border-gray-100`;
                const catTheme = CONFIG.themes[item.category] || {
                    bg: 'gray-100',
                    text: 'gray-700',
                };
                let html = '';

                if (index === 0)
                    html += `<td class="p-2 lg:p-3 text-[9px] lg:text-[10px] text-gray-600 font-mono align-top border-r border-gray-200" rowspan="${rowspan}">${order.timestamp}</td>`;

                html += `
                <td class="p-2 lg:p-3 w-full align-top">
                <div class="text-[11px] lg:text-xs font-bold ${item.category === 'Expense' ? 'text-red-500' : 'text-gray-800'}">${item.name}</div>
                <div class="mt-1 flex items-center gap-1.5 flex-wrap">
                <span class="text-[8px] uppercase font-bold bg-${catTheme.bg} text-${catTheme.text} px-1.5 py-0.5 rounded">${item.category}</span>
                ${index === 0 ? `<span class="text-[8px] font-black uppercase px-2 py-0.5 rounded-full border border-${pColor}-200 bg-white text-${pColor}-700 shadow-sm">${order.payment}</span>` : ''}
                </div>
                </td>
                <td class="p-2 lg:p-3 text-center font-bold text-xs align-top">${item.qty}</td>
                <td class="p-2 lg:p-3 text-right font-mono text-xs ${item.category === 'Expense' ? 'text-red-500' : 'text-gray-500'} align-top">${fmt(item.unitPrice)}</td>
                `;

                if (index === 0) {
                    const discountText = order.discount > 0 ? '-' + order.discount.toFixed(2) : '—';
                    const tipText = order.tip > 0 ? '+' + order.tip.toFixed(2) : '—';
                    const taxText = order.tax > 0 ? fmt(order.tax) : '—';
                    const feeText = order.fee > 0 ? fmt(order.fee) : '—';

                    html += `
                    <td class="p-2 lg:p-3 text-right font-mono text-xs text-red-500 align-top border-l border-gray-200" rowspan="${rowspan}">${discountText}</td>
                    <td class="p-2 lg:p-3 text-right font-mono text-xs text-green-600 align-top" rowspan="${rowspan}">${tipText}</td>
                    <td class="p-2 lg:p-3 text-right font-mono text-xs text-yellow-600 align-top" rowspan="${rowspan}">${taxText}</td>
                    <td class="p-2 lg:p-3 text-right font-mono text-xs text-orange-500 align-top" rowspan="${rowspan}">${feeText}</td>
                    <td class="p-2 lg:p-3 text-right font-mono text-xs font-black align-top ${order.total < 0 ? 'text-red-600' : ''}" rowspan="${rowspan}">${fmt(order.total)}</td>
                    <td class="p-2 lg:p-3 text-right font-mono text-xs font-black text-brand-blue align-top ${netAmt < 0 ? 'text-red-600' : ''}" rowspan="${rowspan}">${fmt(netAmt)}</td>
                    <td class="p-2 lg:p-3 align-top" rowspan="${rowspan}">
                    <div class="flex justify-end items-center gap-3">
                    <button onclick="App.editOrder(${order.id})" class="text-blue-400 hover:text-brand-blue transition" title="Edit Order">
                    <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"></path></svg>
                    </button>
                    <button onclick="App.deleteOrder(${order.id})" class="text-gray-400 hover:text-red-500 font-bold text-lg transition" title="Delete Order">&times;</button>
                    </div>
                    </td>`;
                }
                tr.innerHTML = html;
                body.appendChild(tr);
            });
        });
        // TAX INCLUSIVE MATH: True Gross is total collected MINUS tips
        s.gross = s.collected - s.tips;

        // OWNER TAKE HOME (NET): All money collected MINUS money owed out
        s.takeHome = s.collected - s.tax - s.fees - s.expenses;

        // NET TAXABLE: Business Profit (Gross Sales - Fees - Expenses)
        s.netTaxable = s.gross - s.fees - s.expenses;

        document.getElementById('cashTotalDisplay').innerText = fmt(s.cashGroup);
        document.getElementById('venmoTotalDisplay').innerText = fmt(s.venmoGroup);
        document.getElementById('zelleTotalDisplay').innerText = fmt(s.zelle);
        document.getElementById('tipTotalDisplay').innerText = fmt(s.tips);
        document.getElementById('grandTotalDisplay').innerText = fmt(s.gross);
        document.getElementById('netTotalDisplay').innerText = fmt(s.takeHome);

        // --- TOOLTIP BREAKDOWNS ---
        const nestedCountClass =
            'text-gray-400 text-[10px] pl-2 border-l border-gray-600 mt-1 mb-0.5';
        const nestedTipClass =
            'text-green-400 text-[10px] pl-2 border-l border-gray-600 mt-1 mb-0.5';
        const nestedTaxClass =
            'text-yellow-400 text-[10px] pl-2 border-l border-gray-600 mt-1 mb-0.5';
        const nestedExpClass =
            'text-orange-400 text-[10px] pl-2 border-l border-gray-600 mt-1 mb-0.5';
        const nestedFeeClass = 'text-red-400 text-[10px] pl-2 border-l border-gray-600 mt-1 mb-0.5';

        // Clean text classes for flush text elements inside parent cards
        const flushTip = nestedTipClass.replace('pl-2 border-l border-gray-600', '');
        const flushTax = nestedTaxClass.replace('pl-2 border-l border-gray-600', '');
        const flushFee = nestedFeeClass.replace('pl-2 border-l border-gray-600', '');
        const flushExp = nestedExpClass.replace('pl-2 border-l border-gray-600', '');

        // 1. CASH+ PILL DROPDOWN
        const cashElem = document.getElementById('cashTooltip');
        if (cashElem) {
            cashElem.innerHTML = `
            <div>Cash Gross: ${fmt(s.cashGross)} / Net: ${fmt(s.cashNet)}
            <div class="${nestedCountClass}">Orders: ${s.cashCount}</div>
            <div class="${nestedTipClass}">Tips: ${fmt(s.cashTips)}</div>
            <div class="${nestedTaxClass}">Tax: ${fmt(s.cashTax)}</div>
            ${s.cashExpenses > 0 ? `<div class="${nestedExpClass}">Expenses: -${fmt(s.cashExpenses)}</div>` : ''}
            </div>
            <div class="border-t border-gray-600 my-1"></div>
            <div>MarketBucks Gross: ${fmt(s.mbGross)} / Net: ${fmt(s.mbNet)}
            <div class="${nestedCountClass}">Orders: ${s.mbCount}</div>
            <div class="${nestedTipClass}">Tips: ${fmt(s.mbTips)}</div>
            <div class="${nestedTaxClass}">Tax: ${fmt(s.mbTax)}</div>
            ${s.mbExpenses > 0 ? `<div class="${nestedExpClass}">Expenses: -${fmt(s.mbExpenses)}</div>` : ''}
            </div>
            `;
        }

        // 2. VENMO+ PILL DROPDOWN
        const venmoElem = document.getElementById('venmoTooltip');
        if (venmoElem) {
            venmoElem.innerHTML = `
            <div>Venmo Gross: ${fmt(s.venmoGross)} / Net: ${fmt(s.venmoNet)}
            <div class="${nestedCountClass}">Orders: ${s.venmoCount}</div>
            <div class="${nestedTipClass}">Tips: ${fmt(s.venmoTips)}</div>
            <div class="${nestedTaxClass}">Tax: ${fmt(s.venmoTax)}</div>
            <div class="${nestedFeeClass}">Fees: -${fmt(s.venmoFees)}</div>
            ${s.venmoExpenses > 0 ? `<div class="${nestedExpClass}">Expenses: -${fmt(s.venmoExpenses)}</div>` : ''}
            </div>
            <div class="border-t border-gray-600 my-1"></div>
            <div>Credit Card Gross: ${fmt(s.ccGross)} / Net: ${fmt(s.ccNet)}
            <div class="${nestedCountClass}">Orders: ${s.ccCount}</div>
            <div class="${nestedTipClass}">Tips: ${fmt(s.ccTips)}</div>
            <div class="${nestedTaxClass}">Tax: ${fmt(s.ccTax)}</div>
            <div class="${nestedFeeClass}">Fees: -${fmt(s.ccFees)}</div>
            ${s.ccExpenses > 0 ? `<div class="${nestedExpClass}">Expenses: -${fmt(s.ccExpenses)}</div>` : ''}
            </div>
            `;
        }

        // 3. ZELLE PILL DROPDOWN
        const zelleElem = document.getElementById('zelleTooltip');
        if (zelleElem) {
            zelleElem.innerHTML = `
            <div>Zelle Gross: ${fmt(s.zelleGross)} / Net: ${fmt(s.zelleNet)}
            <div class="${nestedCountClass}">Orders: ${s.zelleCount}</div>
            <div class="${nestedTipClass}">Tips: ${fmt(s.zelleTips)}</div>
            <div class="${nestedTaxClass}">Tax: ${fmt(s.zelleTax)}</div>
            ${s.zelleExpenses > 0 ? `<div class="${nestedExpClass}">Expenses: -${fmt(s.zelleExpenses)}</div>` : ''}
            </div>
            `;
        }

        // 4. TIPS PILL DROPDOWN
        const tipElem = document.getElementById('tipTooltip');
        if (tipElem) {
            tipElem.innerHTML = `
            <div class="text-gray-300 text-[10px] mb-1 uppercase tracking-wider">Tips Collected</div>
            <div>Cash: ${fmt(s.cashTips)}</div>
            <div>Venmo: ${fmt(s.venmoTips)}</div>
            <div>Credit Card: ${fmt(s.ccTips)}</div>
            <div>Zelle: ${fmt(s.zelleTips)}</div>
            `;
        }

        // 5. GROSS PILL DROPDOWN
        const grossElem = document.getElementById('grossTooltip');
        if (grossElem) {
            grossElem.innerHTML = `
            <div class="text-gray-300 text-[10px] mb-1 uppercase tracking-wider">Gross Revenue</div>
            <div>Sales: ${fmt(s.gross)}</div>
            <div class="${flushTip}">Tips Collected: ${fmt(s.tips)}</div>
            <div class="border-t border-gray-600 mt-2 pt-1"></div>
            <div class="text-green-300 mt-1 font-bold">Total Collected: ${fmt(s.collected)}</div>
            `;
        }

        // 6. NET PILL DROPDOWN
        const netElem = document.getElementById('netTooltip');
        if (netElem) {
            netElem.innerHTML = `
            <div class="text-gray-300 text-[10px] mb-1 uppercase tracking-wider">Net (Take Home)</div>
            <div class="${flushTip}">Collected (w/ Tips): ${fmt(s.collected)}</div>
            <div class="${flushTax}">Tax Owed: -${fmt(s.tax)}</div>
            <div class="${flushFee}">Total Fees: -${fmt(s.fees)}</div>
            ${s.expenses > 0 ? `<div class="${flushExp}">Expenses: -${fmt(s.expenses)}</div>` : ''}
            <div class="border-t border-gray-600 mt-2 pt-1"></div>
            <div class="text-blue-300 mt-1 font-bold">Net Taxable: ${fmt(s.netTaxable)}</div>
            `;
        }
    },
    save() {
        localStorage.setItem('salesData_v8', JSON.stringify(this.state.sales));
    },

    clearData() {
        if (confirm('Clear all session data?')) {
            this.state.sales = [];
            this.save();
            this.updateHistory();
        }
    },

    exportToCSV() {
        if (this.state.sales.length === 0) return alert('No data to export.');

        let csv =
            'Order ID,Date/Time,Category,Subcategory,Item Name,Item Gross Price,Item Qty,Item Line Total,Order Subtotal,Order Discount,Order Tip,Order Gross Total,Order Net Total,Order Tax,Order Fees,Payment Method\n';

        this.state.sales.forEach((o) => {
            const ts = o.timestamp.replace(/,/g, '');

            const orderExpense = Math.abs(
                o.items
                    .filter((i) => i.category === 'Expense')
                    .reduce((sum, i) => sum + i.unitPrice * i.qty, 0)
            );
            const orderTip = o.tip || 0;

            // FIX FLAW #3: Align with your live accounting definitions
            // Gross sales is raw item sales (ignoring tip entirely)
            const orderGross = roundToCent(o.total + orderExpense - orderTip);
            // Net income tracks the total cash intake minus business operations friction
            const net = roundToCent(orderGross - o.fee);

            o.items.forEach((item, index) => {
                const isFirst = index === 0;
                csv += `${o.id},${ts},${item.category},${item.subCategory || 'Unknown'},"${item.name}",${item.unitPrice.toFixed(2)},${item.qty},${(item.unitPrice * item.qty).toFixed(2)},${isFirst ? o.subtotal.toFixed(2) : ''},${isFirst ? o.discount.toFixed(2) : ''},${isFirst ? orderTip.toFixed(2) : ''},${isFirst ? orderGross.toFixed(2) : ''},${isFirst ? net.toFixed(2) : ''},${isFirst ? o.tax.toFixed(2) : ''},${isFirst ? o.fee.toFixed(2) : ''},${isFirst ? o.payment : ''}\n`;
            });
        });

        let exportDateString = new Date().toISOString().split('T')[0];
        const isRetro = document.getElementById('retroToggle').checked;

        // FIX FLAW #2: Parse your custom "M/D/YY" or "M/D/YY, HH:MM" strings safely without browser engines breaking
        if (isRetro && this.state.sales.length > 0) {
            try {
                // Grab the oldest transaction stamp
                const rawStamp = this.state.sales[0].timestamp.split(',')[0].trim(); // Extracts "6/25/26"
                const [m, d, y] = rawStamp.split('/');
                const fullYear = y.length === 2 ? '20' + y : y;
                // Pad single digits so it outputs clean standard ISO: YYYY-MM-DD
                exportDateString = `${fullYear}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`;
            } catch (e) {
                console.error('Date fallback triggered', e);
            }
        }

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        const rawTitle = document.getElementById('reportTitle').value.trim() || 'sales_report';

        a.href = url;
        a.download = `${rawTitle.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_${exportDateString}.csv`;
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
                    if (c === '"') {
                        inQuotes = !inQuotes;
                    } else if (c === ',' && !inQuotes) {
                        result.push(current.trim());
                        current = '';
                    } else {
                        current += c;
                    }
                }
                result.push(current.trim());
                return result.map((v) => v.replace(/^"|"$/g, ''));
            };

            for (let i = 1; i < lines.length; i++) {
                const row = parseCSVRow(lines[i]);
                if (row.length < 10) continue;

                const orderId = parseInt(row[0], 10);
                if (!orderId || isNaN(orderId)) continue;

                // Safely recalculate the true receipt total (Subtotal - Discount + Tip)
                const impSubtotal = parseFloat(row[8]) || 0;
                const impDiscount = parseFloat(row[9]) || 0;
                const impTip = parseFloat(row[10]) || 0;

                let impFinalSubtotal = impSubtotal;
                if (impSubtotal > 0) impFinalSubtotal = Math.max(0, impSubtotal - impDiscount);
                const trueOrderTotal = impFinalSubtotal + impTip;

                if (!ordersMap.has(orderId)) {
                    ordersMap.set(orderId, {
                        id: orderId,
                        timestamp: row[1],
                        subtotal: impSubtotal,
                        discount: impDiscount,
                        tip: impTip,
                        total: trueOrderTotal,
                        payment: row[15] || 'Unknown',
                        fee: parseFloat(row[14]) || 0,
                        tax: parseFloat(row[13]) || 0,
                        items: [],
                    });
                } else {
                    const existing = ordersMap.get(orderId);
                    // If this row has an order subtotal (meaning it's the master row for the order)
                    if (row[8] && row[8].trim() !== '') {
                        existing.subtotal = impSubtotal;
                        existing.discount = impDiscount;
                        existing.tip = impTip;
                        existing.total = trueOrderTotal;
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
    },
};

window.App = App;
App.init();
