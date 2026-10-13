/* loyalty.js — نظام النقاط والمستويات
   - النقاط المتاح صرفها (balance): بتنقص لما تصرف نقاط على مكافأة
   - النقاط التراكمية (lifetime): كل النقاط اللي كسبتها — بتحدد المستوى حتى لو صرفتها
   - 6 مستويات (فضي ← ذهبي ← بلاتيني ← ياقوتي ← ماسي ← أسطوري)، كل مستوى إله هدية وسحب (draw) — الزجاجة بتتعبى لحد المستوى التالي وبعدين بتفرغ بلون سائل جديد
   - O2_DEMO: لوحة تجربة مؤقتة (احذفها بوضع window.O2_DEMO = false أو حذف البلوك) */
(function () {
    'use strict';
    var KEY = 'o2_loyalty_v1';
    var REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

    var TIERS = [
        { id: 'silver', ord: 'المستوى الأول', perks: ['10 نقاط على كل 1 ₪ تنفقه','دخول تلقائي بسحب الأسبوع'], name: 'فضي', adj: 'الفضية', min: 0, gift: 0, icon: 'i-star',
          accent: '#cbd5e1', a: '#f8fafc', b: '#94a3b8', liq: ['#e2e8f0', '#94a3b8', '#475569'],
          coin: { f: 'linear-gradient(135deg,#ffffff 0%,#cbd5e1 42%,#64748b 100%)', k: 'linear-gradient(135deg,#cbd5e1,#64748b)', s: ['#3b4658', '#586478'] },
          draw: { name: 'سحب الفضة الأسبوعي', prize: 'مشروب مجاني', when: 'كل أسبوع' } },
        { id: 'gold', ord: 'المستوى الثاني', perks: ['أولوية بالعروض الموسمية','هدية ترقية فورية'], name: 'ذهبي', adj: 'الذهبية', min: 1000, gift: 150, icon: 'i-crown',
          accent: '#facc15', a: '#fde047', b: '#ca8a04', liq: ['#ffe066', '#f5b301', '#a86a00'],
          coin: { f: 'linear-gradient(135deg,#fff7c2 0%,#f7c948 42%,#c58a12 100%)', k: 'linear-gradient(135deg,#f0c24a,#b8860b)', s: ['#8a5a0b', '#a8741a'] },
          draw: { name: 'سحب الذهب', prize: 'ساندويتش مجاني', when: 'كل أسبوعين' } },
        { id: 'platinum', ord: 'المستوى الثالث', perks: ['مشروب مجاني بعيد ميلادك','عروض حصرية للأعضاء'], name: 'بلاتينيوم', adj: 'البلاتينية', min: 2500, gift: 300, icon: 'i-snowflake',
          accent: '#38bdf8', a: '#bae6fd', b: '#0284c7', liq: ['#bae6fd', '#38bdf8', '#0c5a85'],
          coin: { f: 'linear-gradient(135deg,#f0fbff 0%,#7dd3fc 42%,#0369a1 100%)', k: 'linear-gradient(135deg,#7dd3fc,#0369a1)', s: ['#0b4a6e', '#0e638f'] },
          draw: { name: 'سحب البلاتينيوم الشهري', prize: 'وجبة كاملة مجانية', when: 'كل شهر' } },
        { id: 'ruby', ord: 'المستوى الرابع', perks: ['أولوية بتجهيز الطلبات','دعوة لتجربة الأصناف الجديدة'], name: 'ياقوتي', adj: 'الياقوتية', min: 4500, gift: 450, icon: 'i-heart',
          accent: '#fb7185', a: '#fecdd3', b: '#be123c', liq: ['#fda4af', '#f43f5e', '#881337'],
          coin: { f: 'linear-gradient(135deg,#fff1f2 0%,#fb7185 42%,#9f1239 100%)', k: 'linear-gradient(135deg,#fb7185,#9f1239)', s: ['#6b0f2a', '#8c1b3d'] },
          draw: { name: 'سحب الياقوت', prize: 'عشاء لشخصين', when: 'كل شهر' } },
        { id: 'diamond', ord: 'المستوى الخامس', perks: ['هدية سنوية من O2','خدمة عملاء مخصّصة'], name: 'ماسي', adj: 'الماسية', min: 7500, gift: 700, icon: 'i-gem',
          accent: '#c084fc', a: '#e9d5ff', b: '#7e22ce', liq: ['#e9b8ff', '#a855f7', '#5b1a99'],
          coin: { f: 'linear-gradient(135deg,#fbf0ff 0%,#d8b4fe 42%,#7e22ce 100%)', k: 'linear-gradient(135deg,#d8b4fe,#7e22ce)', s: ['#4c1580', '#6528a3'] },
          draw: { name: 'سحب الماس الفصلي', prize: 'قسيمة مشتريات 300 ₪', when: 'كل 3 شهور' } },
        { id: 'legend', ord: 'المستوى السادس', perks: ['دعوة لفعاليات O2 الخاصة','مكانة الصفوة بالبرنامج'], name: 'أسطوري', adj: 'الأسطورية', min: 12000, gift: 1000, icon: 'i-flame',
          accent: '#fb923c', a: '#fed7aa', b: '#c2410c', liq: ['#fdba74', '#f97316', '#9a3412'],
          coin: { f: 'linear-gradient(135deg,#fff3e6 0%,#fdba74 42%,#c2410c 100%)', k: 'linear-gradient(135deg,#fdba74,#c2410c)', s: ['#7c2d0a', '#a23d10'] },
          draw: { name: 'السحب الأسطوري الكبير', prize: 'وجبات مجانية لمدة سنة', when: 'مرة كل سنة' } }
    ];

    var $ = function (id) { return document.getElementById(id); };
    var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };
    var snd = function (n) { if (window.O2Sound) O2Sound.play(n); };
    var st = load(), shownBal = 0, shownLT = 0, ltTok = 0, busy = false, started = false, timers = [], curIdx = -1, bannerT = null, needMax = null, wasOpen = false, numTok = 0;

    function load() {
        try {
            var o = JSON.parse(localStorage.getItem(KEY));
            if (o && isFinite(o.balance) && isFinite(o.lifetime)) {
                var l = Math.max(0, o.lifetime | 0);
                return { lifetime: l, balance: Math.min(Math.max(0, o.balance | 0), l),
                         gi: (o.v === 3 && isFinite(o.gi)) ? Math.min(Math.max(0, o.gi | 0), TIERS.length - 1) : info(l).i, pg: Math.max(0, o.pg | 0) };
            }
        } catch (e) {}
        return { balance: 3250, lifetime: 3250, gi: info(3250).i, pg: 0 };
    }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(Object.assign({ v: 3 }, st))); } catch (e) {} }
    function later(ms, fn) { timers.push(setTimeout(fn, ms)); }
    function clearTimers() { timers.forEach(clearTimeout); timers = []; }

    function info(l) {
        var i = 0; for (var k = 0; k < TIERS.length; k++) if (l >= TIERS[k].min) i = k;
        var t = TIERS[i], nx = TIERS[i + 1] || null, span = nx ? nx.min - t.min : 0, cur = l - t.min;
        return { i: i, t: t, nx: nx, span: span, cur: cur, pct: nx ? Math.min(100, cur / span * 100) : 100, need: nx ? nx.min - l : 0 };
    }
    function hex2rgb(h) { var n = parseInt(h.slice(1), 16); return { r: n >> 16 & 255, g: n >> 8 & 255, b: n & 255 }; }

    /* ---------- الثيم ---------- */
    function applyTheme(t) {
        var r = document.documentElement;
        r.style.setProperty('--t-accent', t.accent); r.style.setProperty('--t-a', t.a); r.style.setProperty('--t-b', t.b);
        r.style.setProperty('--liq-1', t.liq[0]); r.style.setProperty('--liq-2', t.liq[1]); r.style.setProperty('--liq-3', t.liq[2]);
        r.setAttribute('data-tier', t.id);
        var m = document.querySelector('meta[name="theme-color"]'); if (m) m.setAttribute('content', t.accent);
        if (window.o2CoinTheme) o2CoinTheme(t.coin);
        applyParticles(t);
    }
    function applyParticles(t) {
        try { var p = window.pJSDom && pJSDom[0] && pJSDom[0].pJS; if (p) { p.particles.color.rgb = hex2rgb(t.accent); p.particles.color.value = t.accent; } } catch (e) {}
    }

    /* ---------- مساعدات ---------- */
    var tt;
    function toast(m) { var t = $('o2-toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(function () { t.classList.remove('show'); }, 2000); }
    function floatDelta(n) {
        var row = $('pts-row'); if (!row) return;
        var s = document.createElement('span'); s.className = 'pt-float ' + (n > 0 ? 'up' : 'down'); s.textContent = (n > 0 ? '+' : '−') + fmt(Math.abs(n));
        row.appendChild(s); setTimeout(function () { s.remove(); }, 1600);
    }
    function banner(text, sticky) {
        var w = $('ob-win'); if (!w) return; clearTimeout(bannerT);
        w.textContent = text; w.classList.add('show');
        if (!sticky) bannerT = setTimeout(function () { w.classList.remove('show'); bannerT = null; }, 5000);
    }
    function hideBanner() { var w = $('ob-win'); clearTimeout(bannerT); bannerT = null; if (w) w.classList.remove('show'); }

    /* ---------- أرقام الزجاجة ---------- */
    function tweenNums(pct, cur, span, need, isMax) {
        var pe = $('ob-pct'), ce = $('ob-cur'), me = $('ob-max'); if (!pe) return;
        var ne0 = $('tier-need');
        var p0 = parseFloat(pe.dataset.v) || 0, c0 = parseFloat(ce.dataset.v) || 0, n0 = ne0 && ne0.dataset.v !== undefined ? parseFloat(ne0.dataset.v) : need, tok = ++numTok, t0 = performance.now();
        me.textContent = isMax ? '∞' : fmt(span);
        var dur = REDUCE ? 1 : 1300;
        (function tick(now) {
            if (tok !== numTok) return;
            var t = Math.min((now - t0) / dur, 1), e = 1 - Math.pow(1 - t, 5);
            pe.textContent = Math.round(p0 + (pct - p0) * e);
            ce.textContent = fmt(c0 + (cur - c0) * e);
            var ne = $('tier-need'); if (ne) ne.textContent = fmt(Math.max(0, n0 + (need - n0) * e));
            if (t < 1) requestAnimationFrame(tick); else { pe.dataset.v = pct; ce.dataset.v = cur; if (ne) { ne.textContent = fmt(need); ne.dataset.v = need; } }
        })(t0);
    }
    function setBottle(pct, full) {
        var b = $('o2-bottle'), f = $('tier-progress'); if (!b || !f) return;
        b.classList.toggle('empty', pct <= 0);
        f.style.height = pct + '%';
        b.classList.toggle('full', !!full);
        if (window.O2Bottle3D) O2Bottle3D.set(b, pct);
    }

    /* ---------- مسار المستويات ---------- */
    function buildRoad() {
        var r = $('tier-road'); if (!r) return;
        r.innerHTML = TIERS.map(function (t, i) {
            var node = '<button type="button" class="tr-node" data-i="' + i + '" style="--c:' + t.accent + ';--k:' + i + '" aria-label="تفاصيل مستوى ' + t.name + '"><svg class="ic" aria-hidden="true"><use href="#' + t.icon + '"/></svg><b>' + t.name + '</b><small>' + fmt(t.min) + '</small></button>';
            var link = i < TIERS.length - 1 ? '<div class="tr-link" data-l="' + i + '" style="z-index:-1;--c1:' + t.accent + ';--c2:' + TIERS[i + 1].accent + '"><i class="tr-fill"></i><i class="tr-spark"></i></div>' : '';
            return node + link;
        }).join('');
    }
    var TAP = '<span class="tr-tap"><svg class="ic" aria-hidden="true"><use href="#i-info"/></svg>اضغط على أيقونة أي مستوى لتعرف هديته وسحبه</span>';
    function updateRoad(I, noFill) {
        var r = $('tier-road'); if (!r) return;
        [].forEach.call(r.querySelectorAll('.tr-node'), function (n) {
            var i = +n.dataset.i;
            n.classList.toggle('done', i < I.i); n.classList.toggle('cur', i === I.i); n.classList.toggle('next', i === I.i + 1);
            if (i === I.i) n.setAttribute('aria-current', 'step'); else n.removeAttribute('aria-current');
        });
        [].forEach.call(r.querySelectorAll('.tr-link'), function (l) {
            var i = +l.dataset.l, p = noFill ? 0 : (i < I.i ? 100 : i === I.i ? I.pct : 0);
            l.style.setProperty('--p', p + '%');
            l.classList.toggle('active', i === I.i);        // الجزء اللي إنت فيه بيتمدد ويصير هو التركيز
        });
        perkState(I);
        var note = $('tr-note'); if (!note) return;
        note.innerHTML = I.nx
            ? (I.nx.gift ? ' ترقّى لمستوى ' + I.nx.name + ' واربح <b>+' + fmt(I.nx.gift) + '</b> نقطة هدية' : '') + '<small>المستوى بيحسب من النقاط التراكمية — صرفك للنقاط ما بنزّلك مستوى</small>' + TAP
            : ' وصلت لأعلى مستوى<small>المستوى بيحسب من النقاط التراكمية — صرفك للنقاط ما بنزّلك مستوى</small>' + TAP;
    }

    /* ---------- بالون المستوى (Tooltip) + بالون الإرشاد ---------- */
    var tip = null, tipKey = null, tipHideT = 0, hintEl = null, hintT = 0, HINT_KEY = 'o2.tierhint.v1';
    function esc(x) { return String(x).replace(/[&<>"']/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]; }); }
    function ico(id, cls) { return '<svg class="ic ' + (cls || '') + '" aria-hidden="true"><use href="#' + id + '"/></svg>'; }
    function tipEl() {
        if (tip) return tip;
        tip = document.createElement('div'); tip.id = 'tier-tip'; tip.className = 'tier-tip'; tip.setAttribute('role', 'tooltip'); tip.hidden = true;
        document.body.appendChild(tip); return tip;
    }
    function tierTipHTML(i) {
        var t = TIERS[i], I = info(st.lifetime), state = i < I.i ? 'done' : i === I.i ? 'cur' : 'lock', need = Math.max(0, t.min - st.lifetime);
        var chip = state === 'done' ? 'وصلت له' : state === 'cur' ? 'مستواك الحالي' : 'مقفل';
        var h = '<div class="tt" style="--c:' + t.accent + ';--a:' + t.a + ';--b:' + t.b + '"><div class="tt-h"><span class="tt-ic">' + ico(t.icon, 'ic-fill') + '</span><div class="tt-n"><small>' + t.ord + '</small><b>' + t.name + '</b></div><span class="tt-st ' + state + '">' + chip + '</span></div>';
        h += '<ul class="tt-l">' +
            '<li>' + ico('i-gift') + '<span>' + (t.gift ? 'هدية الترقية: <b>+' + fmt(t.gift) + '</b> نقطة فورية' : 'مستوى البداية — بدون هدية ترقية') + '</span></li>' +
            '<li>' + ico('i-ticket') + '<span>بتدخل سحب <b>' + esc(t.draw.name) + '</b> على ' + esc(t.draw.prize) + ' · ' + esc(t.draw.when) + '</span></li>' +
            t.perks.map(function (p) { return '<li>' + ico('i-check') + '<span>' + esc(p) + '</span></li>'; }).join('') + '</ul>';
        if (state === 'lock') h += '<div class="tt-f"><div class="tt-bar"><i style="width:' + Math.min(100, st.lifetime / t.min * 100).toFixed(1) + '%"></i></div><p>يبدأ من <b>' + fmt(t.min) + '</b> نقطة تراكمية — ناقصك <b>' + fmt(need) + '</b></p></div>';
        else if (state === 'cur' && I.nx) h += '<div class="tt-f"><div class="tt-bar"><i style="width:' + I.pct.toFixed(1) + '%"></i></div><p>ناقصك <b>' + fmt(I.need) + '</b> نقطة تراكمية للوصول إلى <b>' + I.nx.name + '</b></p></div>';
        else if (state === 'cur') h += '<div class="tt-f"><p>وصلت لأعلى مستوى بالبرنامج</p></div>';
        return h + '</div>';
    }
    function showTip(anchor, html, key) {
        if (!anchor) return; var t = tipEl(); clearTimeout(tipHideT); hideHint(); stopInvite();
        t.innerHTML = html; t.hidden = false; t.style.visibility = 'hidden'; t.classList.remove('show', 'below');
        var r = anchor.getBoundingClientRect(), w = t.offsetWidth, h = t.offsetHeight, vw = document.documentElement.clientWidth;
        var x = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2)), above = r.top > h + 20, y = above ? r.top - h - 12 : r.bottom + 12;
        t.style.left = x + 'px'; t.style.top = y + 'px'; t.style.setProperty('--ax', Math.max(18, Math.min(w - 18, r.left + r.width / 2 - x)) + 'px');
        t.classList.toggle('below', !above); t.style.visibility = ''; void t.offsetWidth; t.classList.add('show'); tipKey = key;
    }
    function hideTip(delay) {
        clearTimeout(tipHideT);
        tipHideT = setTimeout(function () { if (!tip) return; tip.classList.remove('show'); tipKey = null; setTimeout(function () { if (tip && !tip.classList.contains('show')) tip.hidden = true; }, 180); }, delay || 0);
    }
    function anchorOf(el) {
        var n = el.closest && el.closest('.tr-node'); if (n) return { a: n, k: 'n' + n.dataset.i, h: function () { return tierTipHTML(+n.dataset.i); } };
        return null;
    }
    function bindTips() {
        var box = $('tier-road'); if (!box) return;
        // البالون بيطلع بالضغط/اللمس بس (بدون hover): ضغطة تفتح، وضغطة تانية على نفس الأيقونة بتسكّر
        box.addEventListener('click', function (e) {
            var o = anchorOf(e.target); if (!o) return;
            if (tipKey === o.k) hideTip(0); else showTip(o.a, o.h(), o.k);
        });
        document.addEventListener('pointerdown', function (e) { if (tip && !tip.hidden && !e.target.closest('#tier-tip,#tier-road')) hideTip(0); });
        document.addEventListener('keydown', function (e) { if (e.key === 'Escape') hideTip(0); });
        window.addEventListener('scroll', function () { if (tipKey) hideTip(0); }, { passive: true });
    }
    function openTier(i) { var n = document.querySelector('#tier-road .tr-node[data-i="' + i + '"]'); if (n) showTip(n, tierTipHTML(i), 'n' + i); }

    /* طريقة تعريف المستخدم إنو أيقونة المستوى زر: (1) موجة حلقات بتمرّ على الأيقونات (2) سطر ثابت تحت المسار (3) بالون صغير بيدلّ على المستوى الحالي (بيختفي لحاله) */
    function hideHint() {
        clearTimeout(hintT); if (!hintEl) return;
        var el = hintEl; hintEl = null; el.classList.remove('show'); setTimeout(function () { el.remove(); }, 260);
    }
    function stopInvite() { var r = $('tier-road'); if (r) r.classList.remove('invite'); try { localStorage.setItem(HINT_KEY, '9'); } catch (e) {} }
    function showHint() {
        var seen = 0; try { seen = +localStorage.getItem(HINT_KEY) || 0; } catch (e) {}
        if (seen >= 3 || hintEl || (tip && !tip.hidden)) return;
        var n = document.querySelector('#tier-road .tr-node.cur') || document.querySelector('#tier-road .tr-node'); if (!n) return;
        var r = n.getBoundingClientRect(); if (r.bottom < 80 || r.top > window.innerHeight - 40) return;   // مش ظاهرة بالشاشة
        hintEl = document.createElement('div'); hintEl.className = 'tier-hint'; hintEl.setAttribute('role', 'status');
        hintEl.innerHTML = ico('i-cursor', 'ic-fill') + '<span>اضغط على أيقونة المستوى لتعرف هديته وسحبه</span>';
        document.body.appendChild(hintEl);
        var w = hintEl.offsetWidth, vw = document.documentElement.clientWidth, x = Math.max(8, Math.min(vw - w - 8, r.left + r.width / 2 - w / 2));
        hintEl.style.left = x + 'px'; hintEl.style.top = Math.max(8, r.top - hintEl.offsetHeight - 12) + 'px'; hintEl.style.setProperty('--ax', (r.left + r.width / 2 - x) + 'px');
        void hintEl.offsetWidth; hintEl.classList.add('show');
        try { localStorage.setItem(HINT_KEY, String(seen + 1)); } catch (e) {}
        hintT = setTimeout(hideHint, 6500);
    }
    function scheduleHint() {
        var r = $('tier-road'); if (!r) return;
        if (!('IntersectionObserver' in window)) { setTimeout(showHint, 2500); return; }
        var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); setTimeout(showHint, 1800); } }, { threshold: .9 });
        io.observe(r);
    }

    /* ---------- قسم الهدايا والمزايا (بيتولّد من TIERS) ---------- */
    function renderPerks() {
        var a = $('perks-instant'), d = $('perks-draws'); if (!a || !d) return;
        a.innerHTML = TIERS.map(function (t, i) {
            return '<li class="pk-row" data-i="' + i + '" style="--c:' + t.accent + '"><span class="pk-ic">' + ico(t.icon, 'ic-fill') + '</span>' +
                '<div class="pk-t"><small>' + t.ord + '</small><b>' + t.name + '</b><em>من ' + fmt(t.min) + ' نقطة تراكمية</em></div>' +
                '<div class="pk-d"><span class="pk-gift">' + ico('i-gift') + (t.gift ? '+' + fmt(t.gift) + ' نقطة فورية' : 'مستوى البداية') + '</span>' +
                '<span class="pk-perks">' + t.perks.map(esc).join(' · ') + '</span></div><span class="pk-lock">' + ico('i-lock') + '</span></li>';
        }).join('');
        d.innerHTML = TIERS.map(function (t, i) {
            var grand = i >= TIERS.length - 2;
            return '<li class="pk-row' + (grand ? ' grand' : '') + '" data-i="' + i + '" style="--c:' + t.accent + '"><span class="pk-ic">' + ico('i-ticket') + '</span>' +
                '<div class="pk-t"><small>يفتح من مستوى ' + t.name + '</small><b>' + esc(t.draw.name) + '</b>' + (grand ? '<em class="pk-badge">' + ico('i-trophy') + 'جائزة كبرى</em>' : '') + '</div>' +
                '<div class="pk-d"><span class="pk-prize">' + esc(t.draw.prize) + '</span><span class="pk-perks">' + esc(t.draw.when) + '</span></div><span class="pk-lock">' + ico('i-lock') + '</span></li>';
        }).join('');
    }
    function perkState(I) {
        var pc = $('perks-cur'); if (pc) pc.textContent = I.t.name;
        [].forEach.call(document.querySelectorAll('#perks .pk-row'), function (r) {
            var i = +r.dataset.i; r.classList.toggle('on', i <= I.i); r.classList.toggle('cur', i === I.i);
        });
    }

    /* ---------- عرض النقاط المتاح صرفها والمكافآت ---------- */
    function renderBalance(anim, delta) {
        var c = $('points-counter'); if (!c) return;
        if (anim && window.animateValue) animateValue(c, shownBal, st.balance, Math.min(1400, 500 + Math.abs(st.balance - shownBal) * 0.6));
        else c.textContent = st.balance.toLocaleString('en-US');
        shownBal = st.balance;
        tweenLT(st.lifetime, anim);
        if (delta) floatDelta(delta);
        if (delta > 0 && window.O2Flow) O2Flow.pour(delta);   // تدفّق النقاط: جزء للزجاجة وجزء للبار
        updateRewards(); updateDemo();
        if (window.o2UpdateLockMeters) o2UpdateLockMeters(st.balance);
    }
    function tweenLT(to, anim) {
        var e = $('lt-total'); if (!e) return;
        var from = shownLT; shownLT = to;
        if (!anim || REDUCE || from === to) { e.textContent = fmt(to); return; }
        var tok = ++ltTok, t0 = performance.now(), dur = Math.min(1400, 500 + Math.abs(to - from) * 0.6);
        (function tick(now) {
            if (tok !== ltTok) return;
            var t = Math.min((now - t0) / dur, 1), k = 1 - Math.pow(1 - t, 5);
            e.textContent = fmt(from + (to - from) * k);
            if (t < 1) requestAnimationFrame(tick); else e.textContent = fmt(to);
        })(t0);
        var card = $('cum-card'); if (card && to > from) { card.classList.remove('bump'); void card.offsetWidth; card.classList.add('bump'); }
    }
    function updateRewards() {
        [].forEach.call(document.querySelectorAll('.reward-card button[onclick*="showRedeemModal"]'), function (b) {
            var m = /showRedeemModal\('(.*?)',\s*(\d+)\)/.exec(b.getAttribute('onclick') || ''); if (!m) return;
            var short = st.balance < +m[2];
            b.classList.toggle('rw-short', short);
            var rb = b.closest('.reward-card').querySelector('.rw-ribbon'); if (rb) rb.style.display = short ? 'none' : '';
        });
        var card = $('reward-shawarma'); if (!card) return;
        var cost = +card.dataset.cost, open = st.balance >= cost, btn = card.querySelector('.rw-btn');
        card.classList.toggle('is-unlocked', open);
        if (open) { btn.disabled = false; btn.textContent = 'استبدال الآن'; btn.onclick = function () { window.showRedeemModal && showRedeemModal(card.dataset.name, cost); }; }
        else { btn.disabled = true; btn.textContent = 'لفك القفل اجمع المزيد'; btn.onclick = null; }
        if (open && !wasOpen && started) { toast(' انفتحت لك مكافأة ' + card.dataset.name); snd('win'); }
        wasOpen = open;
    }

    /* ---------- عرض المستوى ---------- */
    function renderTier(o) {
        o = o || {}; if (busy) return;
        var I = info(st.lifetime), changed = I.i !== curIdx;
        if (o.theme !== false || changed) applyTheme(I.t);
        curIdx = I.i;
        var set = function (id, v) { var e = $(id); if (e) e.textContent = v; };
        set('tier-cur-name', I.t.name); set('tier-badge-txt', 'العضوية ' + I.t.adj);
        var ico = $('tier-ico'); if (ico) ico.setAttribute('href', '#' + I.t.icon);
        var nw = $('tier-next-wrap');
        if (nw) { nw.style.display = I.nx ? '' : 'none'; if (I.nx) { set('tier-next-name', I.nx.name); set('tier-next-pts', '(' + fmt(I.nx.min) + ' نقطة تراكمية)'); } }
        var np = $('tier-need-p');
        if (np && needMax !== !I.nx) {
            needMax = !I.nx;
            np.innerHTML = I.nx ? 'تحتاج <span class="text-white font-bold" id="tier-need">' + fmt(I.need) + '</span> نقطة تراكمية إضافية للترقية' : ' أنت بأعلى مستوى';
        }
        var lbl = $('ob-lbl'); if (lbl) lbl.textContent = I.nx ? 'نقطة تراكمية في هذا المستوى' : 'نقطة تراكمية إجمالاً';
        setBottle(I.pct, !I.nx);
        tweenNums(I.pct, I.cur, I.span, I.need, !I.nx);
        updateRoad(I, !started);
        if (!I.nx && started) banner(' وصلت لأعلى مستوى — ' + TIERS[TIERS.length - 1].name + '!', true); else if (bannerT === null) hideBanner();
    }

    /* ---------- الترقية ---------- */
    function levelUp(oi, ni, gift) {
        busy = true;
        var oldT = TIERS[oi], nt = TIERS[ni], oldSpan = TIERS[oi + 1].min - oldT.min;
        if (REDUCE) { busy = false; renderTier({}); banner(' ترقية! وصلت لمستوى ' + nt.name + (gift ? ' · هدية +' + fmt(gift) + ' نقطة' : ''), false); claimPending(); return; }
        hideBanner();
        setBottle(100, false); tweenNums(100, oldSpan, oldSpan, 0, false);
        later(1650, function () {                         // السائل وصل لفوق
            var b = $('o2-bottle'); b.classList.add('full', 'celebrate'); snd('full');
            var r = b.getBoundingClientRect();
            if (window.confettiAt) { confettiAt(r.left + r.width / 2, r.top + r.height * .3, 70); }
            try { navigator.vibrate && navigator.vibrate([30, 50, 30]); } catch (e) {}
        });
        later(2700, function () {                         // تبديل الثيم + الاحتفال
            applyTheme(nt); curIdx = ni;
            var ring = $('tier-ring'); if (ring) { ring.classList.remove('pop'); void ring.offsetWidth; ring.classList.add('pop'); }
            var set = function (id, v) { var e = $(id); if (e) e.textContent = v; };
            set('tier-cur-name', nt.name); set('tier-badge-txt', 'العضوية ' + nt.adj);
            var ico = $('tier-ico'); if (ico) ico.setAttribute('href', '#' + nt.icon);
            banner(' مبروك! ترقّيت لمستوى ' + nt.name + (gift ? ' · هدية +' + fmt(gift) + ' نقطة' : ''), false);
            showLvl(nt, gift); snd('levelup');
            if (window.confettiAt) { var w = window.innerWidth; confettiAt(w * .3, 200, 60); setTimeout(function () { confettiAt(w * .7, 200, 60); }, 250); }
            var I = info(st.lifetime); updateRoad(I, false);
            var node = document.querySelector('#tier-road .tr-node[data-i="' + ni + '"]'); if (node) { node.classList.add('pop'); setTimeout(function () { node.classList.remove('pop'); }, 1000); }
        });
        if (gift) later(3500, claimPending);              // الهدية بتنضاف والمستخدم شايف شاشة الترقية
        later(4900, function () {                         // تفريغ الزجاجة بلون السائل الجديد
            var b = $('o2-bottle'); b.classList.remove('full', 'celebrate');
            busy = false; needMax = null; renderTier({ theme: false });
            if (st.pg) claimPending();                    // احتياط: هدية ما انضافت (ترقية وقت الأنيميشن)
        });
    }
    function showLvl(t, gift) {
        var d = document.createElement('div'); d.className = 'lvl-up';
        d.innerHTML = '<div class="lvl-card"><div class="lvl-ring"><svg class="ic ic-fill" aria-hidden="true"><use href="#' + t.icon + '"/></svg></div><small>ترقية جديدة</small><b>مستوى ' + t.name + '</b>' + (gift ? '<span class="lvl-gift"> هدية الترقية +' + fmt(gift) + ' نقطة</span>' : '') + '</div>';
        document.body.appendChild(d); void d.offsetWidth; d.classList.add('show');
        setTimeout(function () { d.classList.remove('show'); setTimeout(function () { d.remove(); }, 600); }, 2300);
    }

    /* ---------- واجهة عامة ---------- */
    function earn(n, reason, o) {
        n = Math.round(n); if (!(n > 0)) return;
        var oi = info(st.lifetime).i;
        st.lifetime += n; st.balance += n;
        var ni = info(st.lifetime).i, gift = 0;
        for (var k = st.gi + 1; k <= ni; k++) gift += TIERS[k].gift || 0;   // كل مستوى بتعدّيه بتاخد هديته مرة وحدة بس
        if (ni > st.gi) st.gi = ni;
        if (gift) st.pg = (st.pg | 0) + gift;                              // معلّقة لحد ما تنعرض، ومحفوظة لو سكّر الصفحة
        save();
        renderBalance(true, n);
        if (!o || o.sound !== false) snd('coin');
        if (busy) return;
        if (ni > oi) levelUp(oi, ni, gift); else { renderTier({ theme: false }); if (st.pg) claimPending(); }
    }
    function claimPending() {
        var g = st.pg | 0; if (!(g > 0)) return;
        st.pg = 0; st.balance += g; st.lifetime += g; save();
        renderBalance(true, g);
        toast(' هدية الترقية: +' + fmt(g) + ' نقطة'); snd('win');
        var row = $('pts-row'); if (row && window.confettiAt) { var b = row.getBoundingClientRect(); confettiAt(b.left + b.width / 2, b.top, 36); }
        if (!busy) renderTier({ theme: false });
    }
    function spend(n, reason) {
        n = Math.round(n); if (!(n > 0)) return false;
        if (n > st.balance) { deny(n); return false; }
        st.balance -= n; save(); renderBalance(true, -n); snd('spend'); return true;
    }
    function deny(cost) {
        toast('ناقصك ' + fmt(cost - st.balance) + ' نقطة من النقاط المتاح صرفها'); snd('deny');
        var row = $('pts-row'); if (row) { row.classList.remove('pts-shake'); void row.offsetWidth; row.classList.add('pts-shake'); }
    }
    function set(l, b) {
        clearTimers(); busy = false; hideBanner(); needMax = null;
        var bt = $('o2-bottle'); if (bt) bt.classList.remove('full', 'celebrate');
        st.lifetime = Math.max(0, Math.round(l)); st.balance = Math.min(Math.max(0, Math.round(b)), st.lifetime);
        st.gi = info(st.lifetime).i; st.pg = 0; save();
        renderBalance(true); renderTier({});
    }
    function start() {
        started = true; shownBal = 0; shownLT = 0; needMax = null;
        renderBalance(true); renderTier({});
        if (st.pg) later(1500, claimPending);
        var I = info(st.lifetime);
        if (!I.nx) { var b = $('o2-bottle'); if (b) b.classList.add('full'); }
        scheduleHint();
    }
    function init() {
        buildRoad(); renderPerks(); bindTips();
        try { if ((+localStorage.getItem(HINT_KEY) || 0) < 3) { var rd = $('tier-road'); if (rd) rd.classList.add('invite'); } } catch (e) {}
        var I = info(st.lifetime); applyTheme(I.t); curIdx = I.i;
        var c = $('points-counter'); if (c) c.textContent = '0';
        var set0 = function (id, v) { var e = $(id); if (e) e.textContent = v; };
        set0('tier-cur-name', I.t.name); set0('tier-badge-txt', 'العضوية ' + I.t.adj);
        var ico = $('tier-ico'); if (ico) ico.setAttribute('href', '#' + I.t.icon);
        updateRoad(I, true); updateRewards();
        if (window.o2UpdateLockMeters) o2UpdateLockMeters(st.balance);
        var lt = $('lt-total'); if (lt) lt.textContent = '0';
        buildDemo();
    }

    /* ---------- لوحة التجربة المؤقتة ---------- */
    function buildDemo() {
        if (window.O2_DEMO === false) return;
        var fab = document.createElement('button'); fab.id = 'demo-fab'; fab.className = 'demo-fab'; fab.type = 'button'; fab.setAttribute('data-nosound', ''); fab.setAttribute('aria-label', 'وضع التجربة'); fab.textContent = '';
        var p = document.createElement('div'); p.id = 'demo-panel'; p.className = 'demo-panel'; p.hidden = true; p.setAttribute('data-lenis-prevent', '');
        var btn = function (cls, act, v, t) { return '<button type="button" data-nosound class="' + cls + '" data-act="' + act + '" data-v="' + v + '">' + t + '</button>'; };
        p.innerHTML = '<div class="dp-h"><b> وضع التجربة</b><small>مؤقت — للمعاينة فقط</small><button type="button" class="dp-x" data-nosound aria-label="إغلاق">×</button></div>' +
            '<div class="dp-row"><span>اكتساب (يزيد المتاح صرفها والتراكمية)</span><div class="dp-btns">' + [100, 500, 1000, 2500].map(function (n) { return btn('up', 'earn', n, '+' + fmt(n)); }).join('') + '</div></div>' +
            '<div class="dp-row"><span>صرف (ينقص المتاح صرفها بس)</span><div class="dp-btns">' + [100, 500, 1000, 2500].map(function (n) { return btn('down', 'spend', n, '−' + fmt(n)); }).join('') + '</div></div>' +
            '<div class="dp-row"><span>قفز لمستوى</span><div class="dp-btns">' + TIERS.map(function (t, i) { return btn('', 'jump', i, t.name); }).join('') + '</div></div>' +
            '<div class="dp-row"><div class="dp-btns">' + btn('', 'near', 0, ' قبل الترقية بـ 100') + btn('', 'wheel', 0, ' تصفير عجلة اليوم') + btn('', 'reset', 0, '↺ إعادة الضبط') + '</div></div>' +
            '<div class="dp-state" id="dp-state"></div>';
        document.body.appendChild(fab); document.body.appendChild(p);
        fab.addEventListener('click', function () { p.hidden = !p.hidden; });
        p.addEventListener('click', function (e) {
            var b = e.target.closest('button'); if (!b) return;
            if (b.classList.contains('dp-x')) { p.hidden = true; return; }
            var a = b.dataset.act, v = +b.dataset.v;
            if (a === 'earn') earn(v, 'تجربة');
            else if (a === 'spend') { if (!spend(v, 'تجربة')) { /* deny already shown */ } }
            else if (a === 'jump') { var t = TIERS[v]; var nx = TIERS[v + 1]; var l = t.min + (nx ? Math.round((nx.min - t.min) * .3) : 500); set(l, l); }
            else if (a === 'near') { var I = info(st.lifetime); if (I.nx) { var l2 = I.nx.min - 100; set(l2, Math.min(st.balance, l2)); toast('+100 نقطة وتترقى'); } }
            else if (a === 'reset') set(3250, 3250);
            else if (a === 'wheel') {
                try { localStorage.removeItem('o2_wheel_day'); } catch (x) {}
                try { wheelSession = false; } catch (x) {}
                var r = $('wh-res'); if (r) r.innerHTML = '';
                if (window.syncWheelUI) syncWheelUI(); toast(' رجعت لفّة اليوم');
            }
        });
        updateDemo();
    }
    function updateDemo() {
        var s = $('dp-state'); if (!s) return;
        var I = info(st.lifetime);
        s.innerHTML = 'المتاح صرفها: <b>' + fmt(st.balance) + '</b> · التراكمية: <b>' + fmt(st.lifetime) + '</b> · ' + I.t.name;
    }

    window.O2Loyalty = { start: start, earn: earn, spend: spend, deny: deny, set: set,
        balance: function () { return st.balance; }, lifetime: function () { return st.lifetime; }, tiers: TIERS, info: info, openTier: openTier, tipHTML: tierTipHTML };

    init();
    document.addEventListener('DOMContentLoaded', function () { applyParticles(info(st.lifetime).t); });
})();