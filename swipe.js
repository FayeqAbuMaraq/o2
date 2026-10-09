/* swipe.js — "شو آكل؟" المطوّر: فلتر مزاج/ميزانية، سحب (يمين = إعجاب، يسار = تخطي، فوق = للسلة)،
   تراجع، شريط تقدم، نتيجة بمجموع السعر والنقاط وإضافة الكل، وزر "مفاجئني" بعجلة اختيار */
(function () {
    var GROUPS = [['all', '🍽️', 'الكل'], ['sandwiches', '🍔', 'غربي'], ['italian', '🍕', 'إيطالي'], ['shawarma', '🌯', 'شاورما'], ['sweet', '🍰', 'حلويات ومشاريب']];
    var SECTION_GROUP = { sandwiches: 'sandwiches', italian: 'italian', shawarma: 'shawarma', 'bar-sweets-drinks': 'sweet', cakes: 'sweet' };
    var EMOJI = { sandwiches: '🍔', italian: '🍕', shawarma: '🌯', 'bar-sweets-drinks': '🥤', cakes: '🍰' };
    var BUDGETS = [[0, 'أي ميزانية'], [20, 'لحد 20 ₪'], [30, 'لحد 30 ₪'], [40, 'لحد 40 ₪']];
    var MOODS = [['any', '✨', 'أي شي'], ['hot', '🌶️', 'حار'], ['veg', '🌱', 'نباتي']];

    var U = function () { return window.O2UI; };
    var esc = function (s) { return String(s).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); };
    var snd = function (n) { if (window.O2Sound) O2Sound.play(n); };
    var pts = function (p) { return window.O2cart ? O2cart.pts(p) : Math.round(p * 10); };
    var shuffle = function (a) { a = a.slice(); for (var i = a.length - 1; i > 0; i--) { var j = Math.random() * (i + 1) | 0, t = a[i]; a[i] = a[j]; a[j] = t; } return a; };

    function info(c) {
        var sec = c.closest('.menu-section'), id = sec ? sec.id : '';
        var im = c.querySelector('.cake-img,.meal-img'), src = im ? (im.dataset.src || im.getAttribute('src') || '') : '';
        if (!src || src.indexOf('data:') === 0 || /placehold\.co/.test(src)) src = '';
        var ing = c.querySelector('.meal-ingredients');
        return { c: c, name: c._d.name, price: c._d.price, group: SECTION_GROUP[id] || 'all', emoji: EMOJI[id] || '🍽️', img: src,
            ing: ing ? ing.textContent.trim() : '', hot: !!c.querySelector('.mtag.hot'), veg: !!c.querySelector('.mtag.veg'), top: !!c.querySelector('.mtag.top') };
    }
    function pool() { return [].slice.call(document.querySelectorAll('#menu .meal-card')).filter(function (c) { return c._d && c._d.price; }).map(info); }
    function filtered(f) {
        return pool().filter(function (i) {
            return (f.g === 'all' || i.group === f.g) && (!f.b || i.price <= f.b) && (f.m === 'any' || (f.m === 'hot' && i.hot) || (f.m === 'veg' && i.veg));
        });
    }
    function inCart(i) { return !!i.c.querySelector('.stepper'); }
    function addCard(i) {
        var b = i.c.querySelector('.add-btn');
        if (b) b.click(); else { var p = i.c.querySelector('.stepper [data-a="plus"]'); if (p) p.click(); }
    }
    function removeOne(i) { var m = i.c.querySelector('.stepper [data-a="minus"]'); if (m) m.click(); }
    function thumb(i) { return i.img ? '<img src="' + esc(i.img) + '" alt="">' : i.emoji; }

    function open() {
        var f = { g: 'all', b: 0, m: 'any' };
        U().openM('<div id="sw-root"></div>');
        setup(f);
    }
    function root() { return document.getElementById('sw-root'); }

    /* ---------- 1) الإعداد ---------- */
    function setup(f) {
        var r = root(); if (!r) return;
        var chips = function (arr, key, getV, label) {
            return '<div class="sw-chips">' + arr.map(function (a) { var v = getV(a); return '<button type="button" class="sw-chip' + (f[key] === v ? ' on' : '') + '" data-k="' + key + '" data-v="' + v + '">' + label(a) + '</button>'; }).join('') + '</div>';
        };
        r.innerHTML = '<h3 class="text-xl font-black text-center">شو آكل؟ 🔥</h3><p class="text-center text-zinc-400 text-sm">قلّي مزاجك ونختار لك</p>' +
            '<div class="sw-lbl">شو بتشتهي؟</div>' + chips(GROUPS, 'g', function (a) { return a[0]; }, function (a) { return a[1] + ' ' + a[2]; }) +
            '<div class="sw-lbl">الميزانية</div>' + chips(BUDGETS, 'b', function (a) { return a[0]; }, function (a) { return a[1]; }) +
            '<div class="sw-lbl">المزاج</div>' + chips(MOODS, 'm', function (a) { return a[0]; }, function (a) { return a[1] + ' ' + a[2]; }) +
            '<div class="sw-count" id="sw-count"></div><button type="button" id="sw-go" class="sw-main">ابدأ السحب</button><button type="button" id="sw-rand" class="sw-sec">🎲 مفاجئني بصنف</button>';
        var n = filtered(f).length, c = document.getElementById('sw-count');
        c.textContent = n ? n + ' صنف مطابق' : 'ما في أصناف مطابقة — جرّب تغيّر الفلتر';
        document.getElementById('sw-go').disabled = !n; document.getElementById('sw-rand').disabled = !n;
        r.onclick = function (e) {
            var b = e.target.closest('.sw-chip');
            if (b) { var k = b.dataset.k, v = b.dataset.v; f[k] = k === 'b' ? +v : v; setup(f); return; }
            if (e.target.closest('#sw-go')) deck(f);
            else if (e.target.closest('#sw-rand')) surprise(f);
        };
    }

    /* ---------- 2) السحب ---------- */
    function deck(f) {
        var r = root(); if (!r) return;
        var cards = shuffle(filtered(f)).slice(0, 10), idx = 0, liked = [], hist = [];
        function cardHTML(i, back) {
            var tags = (i.top ? '<span>🔥 الأكثر طلباً</span>' : '') + (i.hot ? '<span>🌶️ حار</span>' : '') + (i.veg ? '<span>🌱 نباتي</span>' : '');
            return '<div class="sw-card' + (back ? ' back' : '') + '"><span class="sw-stamp" data-s="y" style="right:14px;color:#25D366">أعجبني</span><span class="sw-stamp" data-s="n" style="left:14px;color:#e60000">تخطي</span><span class="sw-stamp cart" data-s="c">🛒 للسلة</span>' +
                (tags ? '<div class="sw-tags">' + tags + '</div>' : '') +
                (i.img ? '<img src="' + esc(i.img) + '" alt="">' : '<div class="sw-ph">' + i.emoji + '</div>') +
                '<div class="in"><div class="flex justify-between font-black text-lg"><span>' + esc(i.name) + '</span><span class="text-o2-red">' + i.price + ' ₪</span></div>' +
                '<p class="text-yellow-400 text-xs font-bold mt-1">★ تكسب ' + pts(i.price) + ' نقطة</p>' +
                '<p class="text-zinc-400 text-sm mt-1" style="display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden">' + esc(i.ing) + '</p></div></div>';
        }
        function render() {
            if (!root()) return;
            if (idx >= cards.length) return result(f, liked);
            r.onclick = null;
            r.innerHTML = '<div class="flex items-center justify-between"><h3 class="text-lg font-black">شو آكل؟ 🔥</h3><button type="button" id="sw-back" class="text-xs text-zinc-400 underline">تغيير الفلتر</button></div>' +
                '<div class="sw-prog"><i style="width:' + (idx / cards.length * 100) + '%"></i></div><div class="sw-cnt">' + (idx + 1) + ' / ' + cards.length + '</div>' +
                '<div class="sw-wrap">' + (cards[idx + 1] ? cardHTML(cards[idx + 1], 1) : '') + cardHTML(cards[idx]) + '</div>' +
                '<div class="sw-btns"><button type="button" id="sw-n" aria-label="تخطي">✕</button><button type="button" id="sw-u" aria-label="تراجع"' + (hist.length ? '' : ' disabled') + '>↩</button><button type="button" id="sw-c" aria-label="للسلة">🛒</button><button type="button" id="sw-y" aria-label="أعجبني">❤</button></div>' +
                '<p class="sw-hint">يمين = أعجبني · يسار = تخطي · فوق = أضف للسلة</p>';
            document.getElementById('sw-back').onclick = function () { setup(f); };
            var all = r.querySelectorAll('.sw-card'), el = all[all.length - 1], x0 = null, y0 = 0, dx = 0, dy = 0, done = false;
            function stamps() {
                var cartMode = dy < -50 && Math.abs(dx) < 70;
                el.querySelector('[data-s=y]').style.opacity = cartMode ? 0 : Math.max(0, dx / 90);
                el.querySelector('[data-s=n]').style.opacity = cartMode ? 0 : Math.max(0, -dx / 90);
                el.querySelector('[data-s=c]').style.opacity = cartMode ? Math.min(1, -dy / 110) : 0;
            }
            el.onpointerdown = function (e) { x0 = e.clientX; y0 = e.clientY; el.classList.add('drag'); try { el.setPointerCapture(e.pointerId); } catch (x) {} };
            el.onpointermove = function (e) {
                if (x0 === null) return; dx = e.clientX - x0; dy = Math.min(0, e.clientY - y0);
                el.style.transform = 'translate(' + dx + 'px,' + dy + 'px) rotate(' + dx / 18 + 'deg)'; stamps();
            };
            el.onpointerup = function () {
                if (x0 === null) return; x0 = null; el.classList.remove('drag');
                if (dy < -110 && Math.abs(dx) < 80) go('cart'); else if (dx > 90) go('like'); else if (dx < -90) go('skip');
                else { dx = dy = 0; el.style.transform = ''; stamps(); }
            };
            function go(a) {
                if (done) return; done = true;
                var i = cards[idx], rec = { i: i, a: a, fav: false };
                el.classList.remove('drag');
                el.style.transform = a === 'cart' ? 'translateY(-520px) scale(.6)' : 'translateX(' + (a === 'like' ? 600 : -600) + 'px) rotate(' + (a === 'like' ? 30 : -30) + 'deg)';
                el.style.opacity = '0'; U().vib();
                if (a !== 'skip') {
                    liked.push(i);
                    if (a === 'like' && !i.c.classList.contains('is-fav')) { var fb = i.c.querySelector('.fav-btn'); if (fb) { fb.click(); rec.fav = true; } }
                    if (a === 'cart') { addCard(i); snd('add'); }
                } else snd('tick');
                hist.push(rec); idx++; setTimeout(render, 260);
            }
            document.getElementById('sw-y').onclick = function () { go('like'); };
            document.getElementById('sw-n').onclick = function () { go('skip'); };
            document.getElementById('sw-c').onclick = function () { go('cart'); };
            document.getElementById('sw-u').onclick = function () {
                var h = hist.pop(); if (!h) return;
                idx--; if (h.a !== 'skip') liked.pop();
                if (h.fav) { var fb = h.i.c.querySelector('.fav-btn'); if (fb) fb.click(); }
                if (h.a === 'cart') removeOne(h.i);
                render();
            };
        }
        render();
    }

    /* ---------- 3) النتيجة ---------- */
    function result(f, liked) {
        var r = root(); if (!r) return;
        function html() {
            var total = liked.reduce(function (s, i) { return s + i.price; }, 0);
            if (!liked.length) return '<p class="text-center py-10 text-zinc-400">ما اخترت شي! جرّب جولة ثانية</p><button type="button" id="sw-again" class="sw-main">جولة جديدة 🔄</button>';
            return '<h4 class="font-black my-2 text-center text-lg">اخترنا لك ❤</h4>' +
                liked.map(function (i, k) {
                    return '<div class="sw-row"><div class="th">' + thumb(i) + '</div><div class="nm">' + esc(i.name) + '<small>' + i.price + ' ₪ · ★ ' + pts(i.price) + ' نقطة</small></div><button type="button" class="add-btn' + (inCart(i) ? ' ok' : '') + '" data-i="' + k + '">' + (inCart(i) ? '✓' : '+') + '</button></div>';
                }).join('') +
                '<div class="sw-total"><span>المجموع</span><span>' + total + ' ₪ · ★ ' + pts(total) + '</span></div>' +
                '<button type="button" id="sw-all" class="sw-main">أضف الكل للسلة 🛒</button><button type="button" id="sw-again" class="sw-sec">جولة جديدة 🔄</button>';
        }
        r.innerHTML = html();
        if (liked.length) { U().confetti(window.innerWidth / 2, 220); snd('win'); }
        r.onclick = function (e) {
            var b = e.target.closest('.add-btn[data-i]');
            if (b) { var i = liked[b.dataset.i]; if (!inCart(i)) addCard(i); b.textContent = '✓'; b.classList.add('ok'); return; }
            if (e.target.closest('#sw-all')) {
                liked.forEach(function (i) { if (!inCart(i)) addCard(i); });
                r.innerHTML = html(); snd('win');
            } else if (e.target.closest('#sw-again')) setup(f);
        };
    }

    /* ---------- 4) مفاجئني ---------- */
    function surprise(f) {
        var r = root(); if (!r) return;
        var list = filtered(f); if (!list.length) return;
        var final = list[Math.random() * list.length | 0], n = 0, total = 16;
        r.onclick = null;
        r.innerHTML = '<div class="sw-slot spin"><h3 class="text-xl font-black">جاري الاختيار… 🎲</h3><div class="ph" id="sw-ph">❔</div><div class="nm" id="sw-nm"></div></div>';
        function step() {
            var ph = document.getElementById('sw-ph'); if (!ph) return;
            var i = n >= total ? final : list[Math.random() * list.length | 0];
            ph.innerHTML = thumb(i); document.getElementById('sw-nm').textContent = i.name; snd('tick');
            n++;
            if (n <= total) setTimeout(step, 60 + n * n * 1.6); else setTimeout(reveal, 250);
        }
        function reveal() {
            if (!root()) return;
            r.innerHTML = '<div class="sw-slot"><h3 class="text-xl font-black">اخترنا لك 🎉</h3><div class="ph">' + thumb(final) + '</div><div class="nm">' + esc(final.name) + '</div>' +
                '<div class="font-black text-o2-red text-lg mt-1">' + final.price + ' ₪</div><p class="text-yellow-400 text-xs font-bold">★ تكسب ' + pts(final.price) + ' نقطة</p>' +
                '<p class="text-zinc-400 text-sm mt-2">' + esc(final.ing) + '</p></div>' +
                '<button type="button" id="sw-add" class="sw-main">' + (inCart(final) ? '✓ بالسلة — زيد واحد' : 'أضف للسلة 🛒') + '</button><button type="button" id="sw-more" class="sw-sec">🎲 جرّب غيره</button><button type="button" id="sw-back" class="sw-sec">رجوع</button>';
            U().confetti(window.innerWidth / 2, 240); snd('win');
            r.onclick = function (e) {
                if (e.target.closest('#sw-add')) { addCard(final); e.target.closest('#sw-add').textContent = '✓ انضافت للسلة'; }
                else if (e.target.closest('#sw-more')) surprise(f);
                else if (e.target.closest('#sw-back')) setup(f);
            };
        }
        step();
    }

    window.O2Swipe = { open: open };
})();
