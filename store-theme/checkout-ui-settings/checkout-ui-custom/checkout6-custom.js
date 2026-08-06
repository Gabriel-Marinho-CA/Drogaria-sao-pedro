// WARNING: THE USAGE OF CUSTOM SCRIPTS IS NOT SUPPORTED. VTEX IS NOT LIABLE FOR ANY DAMAGES THIS MAY CAUSE. THIS MAY BREAK YOUR STORE AND STOP SALES. IN CASE OF ERRORS, PLEASE DELETE THE CONTENT OF THIS SCRIPT.

/* ==========================================================================
   Rodape do checkout - acordeao dos menus no mobile
   Markup: footer.html | Estilos: checkout6-custom.css

   O estado do acordeao vive no aria-expanded do proprio <button>, e o CSS
   reage a ele (`[aria-expanded="true"] + .dsp-footer__links`). Por isso este
   script so alterna o atributo: nada de classe de estado paralela.

   Como o gatilho e um <button> de verdade, foco e teclado (Enter/Espaco)
   funcionam nativamente - nao ha handler de teclado aqui.
   ========================================================================== */

(function () {
    'use strict';

    var TOGGLE = '.dsp-footer__col-toggle';
    var DESKTOP_MIN_WIDTH = 980; // mesmo breakpoint do CSS

    // O checkout pode rodar em navegador sem Element.closest
    function closest(el, selector) {
        if (!el || el.nodeType !== 1) return null;
        if (el.closest) return el.closest(selector);
        var node = el;
        while (node && node.nodeType === 1) {
            if (node.matches && node.matches(selector)) return node;
            node = node.parentElement;
        }
        return null;
    }

    // Delegado no document: funciona mesmo que o rodape entre no DOM depois
    // e sobrevive a re-render do checkout sem reanexar handler.
    document.addEventListener('click', function (e) {
        var btn = closest(e.target, TOGGLE);
        if (!btn) return;

        // no desktop o botao e apenas o titulo da coluna
        if (window.innerWidth >= DESKTOP_MIN_WIDTH) return;

        btn.setAttribute(
            'aria-expanded',
            btn.getAttribute('aria-expanded') === 'true' ? 'false' : 'true'
        );
    });
})();

/* ==========================================================================
   Prateleiras de recomendacao no carrinho (/cart)
   Figma desktop: node 1-5470 | Figma mobile: node 1-11363
   Estilos: checkout6-custom.css (secao "Prateleiras de recomendacao")

   Duas vitrines montadas por Web Components (custom elements em light DOM,
   para que o CSS acima continue valendo - shadow DOM isolaria os estilos):

     <dsp-showcase source="whoboughtalsobought">  Quem comprou, comprou tambem
     <dsp-showcase source="similars">             Produtos similares
       └─ <dsp-product-card>  o card do Figma

   Os produtos vem do crossselling do catalogo, semeado pelos itens que ja
   estao no carrinho:
     /api/catalog_system/pub/products/crossselling/whoboughtalsobought/{id}
     /api/catalog_system/pub/products/crossselling/similars/{id}

   O carrossel e o Swiper, carregado do CDN sob demanda (o checkout nao
   empacota nada disso). Se o CDN falhar, o CSS deixa a faixa como scroll
   horizontal nativo - a prateleira continua utilizavel.

   Wishlist (o coracao do Figma) foi deixada de fora de proposito.
   ========================================================================== */

(function () {
    'use strict';

    if (!window.customElements || !window.HTMLElement) return;

    /* ---------- Configuracao ---------- */

    var SWIPER_JS = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.js';
    var SWIPER_CSS = 'https://cdn.jsdelivr.net/npm/swiper@11/swiper-bundle.min.css';

    // Titulos das prateleiras (o arquivo e UTF-8, como o footer.html)
    var SHELVES = [
        {
            source: 'whoboughtalsobought',
            heading: 'Quem comprou, comprou também'
        },
        {
            source: 'similars',
            heading: 'Produtos similares'
        }
    ];

    var MAX_SEEDS = 3;      // itens do carrinho usados como semente
    var MAX_PRODUCTS = 12;  // cards por prateleira

    /* ---------- Estado do modulo ----------
       O checkout re-renderiza o carrinho a cada mudanca do orderForm e leva
       nossa marcacao junto. Guardar o resultado das APIs aqui evita refazer
       as chamadas a cada remontagem. */

    var cache = {};      // source -> array de produtos normalizados
    var pending = {};    // source -> callbacks aguardando a primeira resposta
    var container = null;

    /* ---------- Utilitarios ---------- */

    function getJSON(url, cb) {
        var xhr = new XMLHttpRequest();
        xhr.open('GET', url, true);
        xhr.setRequestHeader('Accept', 'application/json');
        xhr.onreadystatechange = function () {
            if (xhr.readyState !== 4) return;
            if (xhr.status >= 200 && xhr.status < 300) {
                try {
                    cb(JSON.parse(xhr.responseText));
                } catch (e) {
                    cb(null);
                }
            } else {
                cb(null);
            }
        };
        xhr.send();
    }

    var swiperCallbacks = [];
    var swiperRequested = false;

    // Carrega o Swiper uma unica vez; entrega null se o CDN nao responder.
    function withSwiper(cb) {
        if (window.Swiper) return cb(window.Swiper);
        swiperCallbacks.push(cb);
        if (swiperRequested) return;
        swiperRequested = true;

        if (!document.querySelector('link[href="' + SWIPER_CSS + '"]')) {
            var link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = SWIPER_CSS;
            document.head.appendChild(link);
        }

        var script = document.createElement('script');
        script.src = SWIPER_JS;
        script.async = true;
        script.onload = function () { flushSwiper(window.Swiper || null); };
        script.onerror = function () { flushSwiper(null); };
        document.head.appendChild(script);
    }

    function flushSwiper(Swiper) {
        var list = swiperCallbacks;
        swiperCallbacks = [];
        for (var i = 0; i < list.length; i++) list[i](Swiper);
    }

    // R$ 1.234,56 quebrado em partes, porque o layout usa corpos diferentes
    // para os centavos.
    function money(value) {
        var parts = (Math.round(value * 100) / 100).toFixed(2).split('.');
        return {
            integer: parts[0].replace(/\B(?=(\d{3})+(?!\d))/g, '.'),
            cents: parts[1]
        };
    }

    function moneyText(value) {
        var m = money(value);
        return 'R$ ' + m.integer + ',' + m.cents;
    }

    // O redimensionamento do VTEX vive no proprio caminho do arquivo:
    // /arquivos/ids/{id}-{largura}-{altura}/nome.jpg
    function resize(url, width, height) {
        if (!url) return '';
        return url.replace(
            /(\/arquivos\/ids\/\d+)(-\d+-\d+)?/,
            '$1-' + width + '-' + height
        );
    }

    function escapeHtml(text) {
        return String(text == null ? '' : text)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    /* ---------- Leitura do produto do catalogo ---------- */

    // Primeiro SKU com estoque; sem nenhum, devolve o primeiro so para o card
    // aparecer com "Saiba mais".
    function pickSku(product) {
        var items = product.items || [];
        var i, j, sellers, offer;

        for (i = 0; i < items.length; i++) {
            sellers = items[i].sellers || [];
            for (j = 0; j < sellers.length; j++) {
                offer = sellers[j].commertialOffer || {};
                if (offer.AvailableQuantity > 0) {
                    return { item: items[i], seller: sellers[j], offer: offer };
                }
            }
        }

        if (items[0] && items[0].sellers && items[0].sellers[0]) {
            return {
                item: items[0],
                seller: items[0].sellers[0],
                offer: items[0].sellers[0].commertialOffer || {}
            };
        }
        return null;
    }

    function paramValue(params, names) {
        params = params || [];
        for (var i = 0; i < params.length; i++) {
            var name = (params[i].Name || params[i].name || '').toLowerCase();
            for (var j = 0; j < names.length; j++) {
                if (name === names[j].toLowerCase()) {
                    return params[i].Value !== undefined ? params[i].Value : params[i].value;
                }
            }
        }
        return null;
    }

    /* Tarja de promocao do card ("50% OFF NA 2a UNIDADE" + "Leve 2 itens por").

       O formato do teaser muda conforme a promocao cadastrada, entao a
       leitura e defensiva: o nome sempre vira tarja, mas o bloco "Leve N
       itens por" so aparece quando da para calcular o preco por unidade.
       A conta assume desconto sobre todas as unidades a partir da quantidade
       minima (comportamento do "Leve mais por menos"); promocoes que
       descontam apenas a unidade extra cairao na tarja sem o calculo. */
    function readTeaser(offer, price) {
        var teasers = offer.Teasers || offer.teasers || [];
        if (!teasers.length) return null;

        var teaser = teasers[0];
        var conditions = teaser.Conditions || teaser.conditions || {};
        var effects = teaser.Effects || teaser.effects || {};
        var effectParams = effects.Parameters || effects.parameters;

        var minQty = conditions.MinimumQuantity || conditions.minimumQuantity ||
            parseFloat(paramValue(conditions.Parameters || conditions.parameters,
                ['MinimumQuantity', 'Quantity'])) || 0;

        var percent = parseFloat(paramValue(effectParams, ['PercentualDiscount', 'Discount']));
        var nominal = parseFloat(paramValue(effectParams, ['NominalDiscount']));

        var unitPrice = null;
        if (!isNaN(percent) && percent > 0 && percent < 100) {
            unitPrice = price * (1 - percent / 100);
        } else if (!isNaN(nominal) && nominal > 0 && nominal < price) {
            unitPrice = price - nominal;
        }

        return {
            name: teaser['<Name>'] || teaser.Name || teaser.name || '',
            minQty: minQty >= 2 ? Math.round(minQty) : 0,
            unitPrice: unitPrice
        };
    }

    function normalize(product) {
        var sku = pickSku(product);
        if (!sku) return null;

        var offer = sku.offer;
        var price = offer.Price || 0;
        if (!price) return null;

        var listPrice = offer.ListPrice || 0;
        var images = sku.item.images || [];

        return {
            productId: String(product.productId),
            name: product.productName || '',
            link: product.linkText ? '/' + product.linkText + '/p' : (product.link || '#'),
            image: resize(images[0] ? images[0].imageUrl : '', 189, 153),
            skuId: sku.item.itemId,
            sellerId: sku.seller.sellerId || '1',
            available: offer.AvailableQuantity > 0,
            price: price,
            listPrice: listPrice,
            discount: listPrice > price ? Math.round((1 - price / listPrice) * 100) : 0,
            teaser: readTeaser(offer, price)
        };
    }

    /* ---------- orderForm: sementes e adicao ao carrinho ---------- */

    // O vtexjs entra na pagina depois do nosso script, entao vale esperar por
    // ele antes de desistir - sem orderForm nao ha semente para o crossselling.
    function getOrderForm(cb, attempt) {
        attempt = attempt || 0;

        if (!window.vtexjs || !window.vtexjs.checkout) {
            if (attempt > 33) return cb(null); // ~10s
            window.setTimeout(function () { getOrderForm(cb, attempt + 1); }, 300);
            return;
        }

        var orderForm = window.vtexjs.checkout.orderForm;
        if (orderForm && orderForm.items) return cb(orderForm);

        var request = window.vtexjs.checkout.getOrderForm();
        if (!request || !request.done) return cb(null);
        request.done(function (loaded) { cb(loaded); });
        if (request.fail) request.fail(function () { cb(null); });
    }

    function seedsFrom(orderForm) {
        var items = (orderForm && orderForm.items) || [];
        var seeds = [];
        var inCart = {};

        for (var i = 0; i < items.length; i++) {
            var id = String(items[i].productId);
            if (inCart[id]) continue;
            inCart[id] = true;
            if (seeds.length < MAX_SEEDS) seeds.push(id);
        }
        return { seeds: seeds, inCart: inCart };
    }

    /* ---------- Busca das prateleiras ---------- */

    function fetchShelf(source, cb) {
        if (cache[source]) return cb(cache[source]);
        if (pending[source]) return pending[source].push(cb);
        pending[source] = [cb];

        getOrderForm(function (orderForm) {
            var context = seedsFrom(orderForm);
            var sc = orderForm && orderForm.salesChannel
                ? '?sc=' + encodeURIComponent(orderForm.salesChannel)
                : '';

            if (!context.seeds.length) return resolve(source, []);

            var products = [];
            var seen = {};
            var remaining = context.seeds.length;

            context.seeds.forEach(function (seed) {
                var url = '/api/catalog_system/pub/products/crossselling/' +
                    source + '/' + encodeURIComponent(seed) + sc;

                getJSON(url, function (list) {
                    (list || []).forEach(function (raw) {
                        var id = String(raw.productId);
                        // fora: o que ja esta no carrinho e repetido entre sementes
                        if (seen[id] || context.inCart[id]) return;
                        seen[id] = true;

                        var product = normalize(raw);
                        if (product) products.push(product);
                    });

                    if (--remaining === 0) {
                        resolve(source, products.slice(0, MAX_PRODUCTS));
                    }
                });
            });
        });
    }

    function resolve(source, products) {
        cache[source] = products;
        var waiting = pending[source] || [];
        delete pending[source];
        for (var i = 0; i < waiting.length; i++) waiting[i](products);
    }

    /* ==========================================================
       <dsp-product-card>
       Recebe o produto normalizado pela propriedade `.product`.
       ========================================================== */

    class DspProductCard extends HTMLElement {
        set product(value) {
            this._product = value;
            if (this.isConnected) this.render();
        }

        get product() {
            return this._product || null;
        }

        connectedCallback() {
            if (this._product && !this._rendered) this.render();
            this.addEventListener('click', this);
        }

        disconnectedCallback() {
            this.removeEventListener('click', this);
        }

        handleEvent(event) {
            var button = event.target.closest && event.target.closest('.dsp-card__buy');
            if (!button || button.tagName === 'A') return;
            event.preventDefault();
            this.addToCart(button);
        }

        render() {
            var p = this._product;
            if (!p) return;

            this._rendered = true;
            this.className = 'dsp-card';
            this.innerHTML =
                this.teaserRibbon(p) +
                '<a class="dsp-card__image" href="' + escapeHtml(p.link) + '">' +
                (p.image
                    ? '<img src="' + escapeHtml(p.image) + '" alt="" loading="lazy">'
                    : '') +
                '</a>' +
                '<a class="dsp-card__name" href="' + escapeHtml(p.link) + '">' +
                escapeHtml(p.name) +
                '</a>' +
                this.prices(p) +
                this.button(p);
        }

        teaserRibbon(p) {
            var name = p.teaser && p.teaser.name;
            return '<div class="dsp-card__top">' +
                (name ? '<span class="dsp-card__ribbon">' + escapeHtml(name) + '</span>' : '') +
                '</div>';
        }

        // Preco grande, com centavos menores (o layout usa dois corpos).
        priceTag(value, modifier) {
            var m = money(value);
            return '<p class="dsp-card__price' + (modifier || '') + '">' +
                '<span class="dsp-card__currency">R$</span>' +
                '<strong class="dsp-card__integer">' + m.integer + '</strong>' +
                '<span class="dsp-card__cents">,' + m.cents + '</span>' +
                '</p>';
        }

        prices(p) {
            var teaser = p.teaser;

            // Variante "Leve N itens por" - so quando o teaser deu o preco/un
            if (teaser && teaser.minQty && teaser.unitPrice) {
                return '<div class="dsp-card__prices dsp-card__prices--teaser">' +
                    '<p class="dsp-card__teaser-label">Leve ' + teaser.minQty + ' itens por</p>' +
                    this.priceTag(teaser.unitPrice, ' dsp-card__price--teaser') +
                    '<p class="dsp-card__unit">ou ' + moneyText(p.price) + '/un</p>' +
                    '</div>';
            }

            var head = '';
            if (p.listPrice > p.price) {
                head += '<p class="dsp-card__list-price">' + moneyText(p.listPrice) + '</p>';
            }
            if (p.discount > 0) {
                // acima de 50% o selo vira vermelho, como no Figma
                head += '<span class="dsp-card__discount' +
                    (p.discount >= 50 ? ' dsp-card__discount--high' : '') + '">' +
                    p.discount + '% OFF</span>';
            }

            return '<div class="dsp-card__prices">' +
                (head ? '<div class="dsp-card__prices-head">' + head + '</div>' : '') +
                this.priceTag(p.price) +
                '</div>';
        }

        button(p) {
            if (!p.available) {
                return '<a class="dsp-card__buy dsp-card__buy--link" href="' +
                    escapeHtml(p.link) + '">Saiba mais</a>';
            }
            return '<button type="button" class="dsp-card__buy">' +
                '<i class="dsp-card__basket" aria-hidden="true"></i>Adicionar</button>';
        }

        addToCart(button) {
            var p = this._product;
            if (!p || button.disabled) return;

            var item = { id: p.skuId, quantity: 1, seller: p.sellerId };

            // Sem vtexjs (checkout fora do ar / pagina antiga): cai no fluxo
            // classico de adicao por URL.
            if (!window.vtexjs || !window.vtexjs.checkout) {
                window.location.href = '/checkout/cart/add?sku=' +
                    encodeURIComponent(p.skuId) + '&qty=1&seller=' +
                    encodeURIComponent(p.sellerId) + '&redirect=true';
                return;
            }

            var card = this;
            button.disabled = true;
            card.classList.add('dsp-card--loading');

            var request = window.vtexjs.checkout.addToCart([item], null);
            request.done(function () {
                card.classList.remove('dsp-card--loading');
                card.classList.add('dsp-card--added');
                button.innerHTML = 'Adicionado';
            });
            if (request.fail) {
                request.fail(function () {
                    card.classList.remove('dsp-card--loading');
                    button.disabled = false;
                });
            }
        }
    }

    customElements.define('dsp-product-card', DspProductCard);

    /* ==========================================================
       <dsp-showcase source="..." heading="...">
       Titulo + carrossel. Busca sozinho os produtos da sua fonte
       e se remove do DOM quando nao ha o que mostrar.
       ========================================================== */

    class DspShowcase extends HTMLElement {
        connectedCallback() {
            if (this._mounted) return;
            this._mounted = true;

            var source = this.getAttribute('source') || '';
            var heading = this.getAttribute('heading') || '';
            var self = this;

            this.className = 'dsp-showcase';
            this.innerHTML =
                '<h2 class="dsp-showcase__title">' + escapeHtml(heading) + '</h2>' +
                '<div class="dsp-showcase__carousel swiper">' +
                '<div class="dsp-showcase__track swiper-wrapper"></div>' +
                '<div class="dsp-showcase__dots swiper-pagination"></div>' +
                '</div>';

            fetchShelf(source, function (products) {
                if (!self.isConnected) return;
                if (!products.length) return self.remove();
                self.fill(products);
            });
        }

        disconnectedCallback() {
            if (this._swiper) {
                this._swiper.destroy(true, true);
                this._swiper = null;
            }
            this._mounted = false;
        }

        fill(products) {
            var track = this.querySelector('.swiper-wrapper');
            var self = this;

            products.forEach(function (product) {
                var slide = document.createElement('div');
                slide.className = 'dsp-showcase__slide swiper-slide';

                var card = document.createElement('dsp-product-card');
                card.product = product;

                slide.appendChild(card);
                track.appendChild(slide);
            });

            withSwiper(function (Swiper) {
                if (!self.isConnected) return;

                // Sem Swiper a faixa vira scroll horizontal nativo (CSS).
                if (!Swiper) return self.classList.add('dsp-showcase--plain');

                self._swiper = new Swiper(self.querySelector('.swiper'), {
                    slidesPerView: 2.2,
                    spaceBetween: 2,
                    watchOverflow: true,
                    pagination: {
                        el: self.querySelector('.swiper-pagination'),
                        clickable: true
                    },
                    breakpoints: {
                        480: { slidesPerView: 3 },
                        640: { slidesPerView: 4 },
                        980: { slidesPerView: 5 },
                        1200: { slidesPerView: 6 }
                    }
                });
            });
        }
    }

    customElements.define('dsp-showcase', DspShowcase);

    /* ---------- Montagem na pagina do carrinho ---------- */

    function isCartStep() {
        return (window.location.hash || '').indexOf('/cart') !== -1;
    }

    // A ancora e o bloco do carrinho: a secao entra logo depois dele. A lista
    // cobre as variacoes de markup do checkout6 entre versoes.
    var ANCHORS = ['.cart-template', '.cart-template-holder', '#cart-template-holder', '.cart'];

    function findAnchor() {
        for (var i = 0; i < ANCHORS.length; i++) {
            var el = document.querySelector(ANCHORS[i]);
            if (el) return el;
        }
        return null;
    }

    function build() {
        var wrap = document.createElement('section');
        wrap.className = 'dsp-shelves';

        SHELVES.forEach(function (shelf) {
            var showcase = document.createElement('dsp-showcase');
            showcase.setAttribute('source', shelf.source);
            showcase.setAttribute('heading', shelf.heading);
            wrap.appendChild(showcase);
        });

        return wrap;
    }

    // O carrinho e re-renderizado pelo knockout a cada mudanca do orderForm e
    // pode levar nossa secao junto - por isso a remontagem e idempotente e
    // parte do resultado ja cacheado.
    function sync() {
        if (!isCartStep()) {
            if (container && container.parentNode) container.parentNode.removeChild(container);
            container = null;
            return;
        }

        if (container && document.body.contains(container)) return;

        var anchor = findAnchor();
        if (!anchor) return;

        container = build();
        anchor.parentNode.insertBefore(container, anchor.nextSibling);
    }

    var syncTimer = null;
    function scheduleSync() {
        if (syncTimer) return;
        syncTimer = window.setTimeout(function () {
            syncTimer = null;
            sync();
        }, 200);
    }

    window.addEventListener('hashchange', scheduleSync);
    window.addEventListener('load', scheduleSync);

    if (window.MutationObserver) {
        new MutationObserver(scheduleSync).observe(document.documentElement, {
            childList: true,
            subtree: true
        });
    }

    scheduleSync();
})();
