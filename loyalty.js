/* loyalty.js — نظام النقاط والمستويات
   - الرصيد (balance): بنقص لما تصرف نقاط على مكافأة
   - الإجمالي (lifetime): كل النقاط اللي كسبتها — بتحسب للمستوى حتى لو صرفتها
   - 5 مستويات، الزجاجة بتتعبى لحد المستوى التالي وبعدين بتفرغ بلون سائل جديد
   - O2_DEMO: لوحة تجربة مؤقتة (احذفها بوضع window.O2_DEMO = false أو حذف البلوك) */
(function () {
    'use strict';
    var KEY = 'o2_loyalty_v1';
    var REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);

    var TIERS = [
        { id: 'bronze', name: 'برونزي', adj: 'البرونزية', min: 0, icon: 'i-coins',
          accent: '#cd7f32', a: '#f1b27a', b: '#8a4f1a', liq: ['#f6b36a', '#cd7f32', '#7a4414'],
          coin: { f: 'linear-gradient(135deg,#ffe2c2 0%,#e0a064 42%,#8a4f1a 100%)', k: 'linear-gradient(135deg,#d99556,#7a4414)', s: ['#5c330d', '#7a4414'] } },
        { id: 'silver', name: 'فضي', adj: 'الفضية', min: 1000, icon: 'i-star',
          accent: '#cbd5e1', a: '#f8fafc', b: '#94a3b8', liq: ['#e2e8f0', '#94a3b8', '#475569'],
          coin: { f: 'linear-gradient(135deg,#ffffff 0%,#cbd5e1 42%,#64748b 100%)', k: 'linear-gradient(135deg,#cbd5e1,#64748b)', s: ['#3b4658', '#586478'] } },
        { id: 'gold', name: 'ذهبي', adj: 'الذهبية', min: 2500, icon: 'i-crown',
          accent: '#facc15', a: '#fde047', b: '#ca8a04', liq: ['#ffe066', '#f5b301', '#a86a00'],
          coin: { f: 'linear-gradient(135deg,#fff7c2 0%,#f7c948 42%,#c58a12 100%)', k: 'linear-gradient(135deg,#f0c24a,#b8860b)', s: ['#8a5a0b', '#a8741a'] } },
        { id: 'platinum', name: 'بلاتيني', adj: 'البلاتينية', min: 5000, icon: 'i-gem',
          accent: '#38bdf8', a: '#bae6fd', b: '#0284c7', liq: ['#bae6fd', '#38bdf8', '#0c5a85'],
          coin: { f: 'linear-gradient(135deg,#f0fbff 0%,#7dd3fc 42%,#0369a1 100%)', k: 'linear-gradient(135deg,#7dd3fc,#0369a1)', s: ['#0b4a6e', '#0e638f'] } },
        { id: 'diamond', name: 'ماسي', adj: 'الماسية', min: 10000, icon: 'i-flame',
          accent: '#c084fc', a: '#e9d5ff', b: '#7e22ce', liq: ['#e9b8ff', '#a855f7', '#5b1a99'],
          coin: { f: 'linear-gradient(135deg,#fbf0ff 0%,#d8b4fe 42%,#7e22ce 100%)', k: 'linear-gradient(135deg,#d8b4fe,#7e22ce)', s: ['#4c1580', '#6528a3'] } }
    ];

    var $ = function (id) { return document.getElementById(id); };
    var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };
    var snd = function (n) { if (window.O2Sound) O2Sound.play(n); };
    var st = load(), shownBal = 0, busy = false, started = false, timers = [], curIdx = -1, bannerT = null, needMax = null, wasOpen = false, numTok = 0;

    function load() {
        try {
            var o = JSON.parse(localStorage.getItem(KEY));
            if (o && isFinite(o.balance) && isFinite(o.lifetime)) {
                var l = Math.max(0, o.lifetime | 0); return { lifetime: l, balance: Math.min(Math.max(0, o.balance | 0), l) };
            }
        } catch (e) {}
        return { balance: 3250, lifetime: 3250 };
    }
    function save() { try { localStorage.setItem(KEY, JSON.stringify(st)); } catch (e) {} }
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
    }

    /* ---------- مسار المستويات ---------- */
    function buildRoad() {
        var r = $('tier-road'); if (!r) return;
        r.innerHTML = TIERS.map(function (t, i) {
            var node = '<div class="tr-node" data-i="' + i + '" style="--c:' + t.accent + '"><svg class="ic" aria-hidden="true"><use href="#' + t.icon + '"/></svg><b>' + t.name + '</b><small>' + fmt(t.min) + '</small></div>';
            var link = i < TIERS.length - 1 ? '<div class="tr-link" data-l="' + i + '" style="z-index: -1; --c1:' + t.accent + ';--c2:' + TIERS[i + 1].accent + '"><i class="tr-fill"></i><i class="tr-spark"></i></div>' : '';
            return node + link;
        }).join('');
    }
    function updateRoad(I, noFill) {
        var r = $('tier-road'); if (!r) return;
        [].forEach.call(r.querySelectorAll('.tr-node'), function (n) {
            var i = +n.dataset.i;
            n.classList.toggle('done', i < I.i); n.classList.toggle('cur', i === I.i); n.classList.toggle('next', i === I.i + 1);
        });
        [].forEach.call(r.querySelectorAll('.tr-link'), function (l) {
            var i = +l.dataset.l, p = noFill ? 0 : (i < I.i ? 100 : i === I.i ? I.pct : 0);
            l.style.setProperty('--p', p + '%');
            l.classList.toggle('active', i === I.i);
        });
        var note = $('tr-note'); if (!note) return;
        note.innerHTML = I.nx
            ? ' <small>النقاط اللي بتصرفها ما بتنقص من مستواك</small>'
            : '👑 وصلت لأعلى مستوى<small>النقاط اللي بتصرفها ما بتنقص من مستواك</small>';
    }

    /* ---------- عرض الرصيد والمكافآت ---------- */
    function renderBalance(anim, delta) {
        var c = $('points-counter'); if (!c) return;
        if (anim && window.animateValue) animateValue(c, shownBal, st.balance, Math.min(1400, 500 + Math.abs(st.balance - shownBal) * 0.6));
        else c.textContent = st.balance.toLocaleString('en-US');
        shownBal = st.balance;
        var lt = $('lt-total'); if (lt) lt.textContent = fmt(st.lifetime);
        if (delta) floatDelta(delta);
        updateRewards(); updateDemo();
        if (window.o2UpdateLockMeters) o2UpdateLockMeters(st.balance);
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
        if (open && !wasOpen && started) { toast('🎁 انفتحت لك مكافأة ' + card.dataset.name); snd('win'); }
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
        if (nw) { nw.style.display = I.nx ? '' : 'none'; if (I.nx) { set('tier-next-name', I.nx.name); set('tier-next-pts', '(' + fmt(I.nx.min) + ' نقطة)'); } }
        var np = $('tier-need-p');
        if (np && needMax !== !I.nx) {
            needMax = !I.nx;
            np.innerHTML = I.nx ? 'تحتاج <span class="text-white font-bold" id="tier-need">' + fmt(I.need) + '</span> نقطة إضافية للترقية' : '👑 أنت بأعلى مستوى';
        }
        var lbl = $('ob-lbl'); if (lbl) lbl.textContent = I.nx ? 'نقطة في هذا المستوى' : 'نقطة إجمالاً';
        setBottle(I.pct, !I.nx);
        tweenNums(I.pct, I.cur, I.span, I.need, !I.nx);
        updateRoad(I, !started);
        if (!I.nx && started) banner('👑 وصلت لأعلى مستوى — ماسي!', true); else if (bannerT === null) hideBanner();
    }

    /* ---------- الترقية ---------- */
    function levelUp(oi, ni) {
        busy = true;
        var oldT = TIERS[oi], nt = TIERS[ni], oldSpan = TIERS[oi + 1].min - oldT.min;
        if (REDUCE) { busy = false; renderTier({}); banner('🎉 ترقية! وصلت لمستوى ' + nt.name, false); return; }
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
            banner('🎉 مبروك! ترقّيت لمستوى ' + nt.name, false);
            showLvl(nt); snd('levelup');
            if (window.confettiAt) { var w = window.innerWidth; confettiAt(w * .3, 200, 60); setTimeout(function () { confettiAt(w * .7, 200, 60); }, 250); }
            var I = info(st.lifetime); updateRoad(I, false);
            var node = document.querySelector('#tier-road .tr-node[data-i="' + ni + '"]'); if (node) { node.classList.add('pop'); setTimeout(function () { node.classList.remove('pop'); }, 1000); }
        });
        later(4900, function () {                         // تفريغ الزجاجة بلون السائل الجديد
            var b = $('o2-bottle'); b.classList.remove('full', 'celebrate');
            busy = false; needMax = null; renderTier({ theme: false });
        });
    }
    function showLvl(t) {
        var d = document.createElement('div'); d.className = 'lvl-up';
        d.innerHTML = '<div class="lvl-card"><div class="lvl-ring"><svg class="ic ic-fill" aria-hidden="true"><use href="#' + t.icon + '"/></svg></div><small>ترقية جديدة</small><b>مستوى ' + t.name + '</b></div>';
        document.body.appendChild(d); void d.offsetWidth; d.classList.add('show');
        setTimeout(function () { d.classList.remove('show'); setTimeout(function () { d.remove(); }, 600); }, 2300);
    }

    /* ---------- واجهة عامة ---------- */
    function earn(n, reason, o) {
        n = Math.round(n); if (!(n > 0)) return;
        var oi = info(st.lifetime).i;
        st.lifetime += n; st.balance += n; save();
        var ni = info(st.lifetime).i;
        renderBalance(true, n);
        if (!o || o.sound !== false) snd('coin');
        if (busy) return;
        if (ni > oi) levelUp(oi, ni); else renderTier({ theme: false });
    }
    function spend(n, reason) {
        n = Math.round(n); if (!(n > 0)) return false;
        if (n > st.balance) { deny(n); return false; }
        st.balance -= n; save(); renderBalance(true, -n); snd('spend'); return true;
    }
    function deny(cost) {
        toast('رصيدك ناقص ' + fmt(cost - st.balance) + ' نقطة 🔒'); snd('deny');
        var row = $('pts-row'); if (row) { row.classList.remove('pts-shake'); void row.offsetWidth; row.classList.add('pts-shake'); }
    }
    function set(l, b) {
        clearTimers(); busy = false; hideBanner(); needMax = null;
        var bt = $('o2-bottle'); if (bt) bt.classList.remove('full', 'celebrate');
        st.lifetime = Math.max(0, Math.round(l)); st.balance = Math.min(Math.max(0, Math.round(b)), st.lifetime); save();
        renderBalance(true); renderTier({});
    }
    function start() {
        started = true; shownBal = 0; needMax = null;
        renderBalance(true); renderTier({});
        var I = info(st.lifetime);
        if (!I.nx) { var b = $('o2-bottle'); if (b) b.classList.add('full'); }
    }
    function init() {
        buildRoad();
        var I = info(st.lifetime); applyTheme(I.t); curIdx = I.i;
        var c = $('points-counter'); if (c) c.textContent = '0';
        var set0 = function (id, v) { var e = $(id); if (e) e.textContent = v; };
        set0('tier-cur-name', I.t.name); set0('tier-badge-txt', 'العضوية ' + I.t.adj);
        var ico = $('tier-ico'); if (ico) ico.setAttribute('href', '#' + I.t.icon);
        updateRoad(I, true); updateRewards();
        if (window.o2UpdateLockMeters) o2UpdateLockMeters(st.balance);
        var lt = $('lt-total'); if (lt) lt.textContent = fmt(st.lifetime);
        buildDemo();
    }

    /* ---------- لوحة التجربة المؤقتة ---------- */
    function buildDemo() {
        if (window.O2_DEMO === false) return;
        var fab = document.createElement('button'); fab.id = 'demo-fab'; fab.className = 'demo-fab'; fab.type = 'button'; fab.setAttribute('data-nosound', ''); fab.setAttribute('aria-label', 'وضع التجربة'); fab.textContent = '🧪';
        var p = document.createElement('div'); p.id = 'demo-panel'; p.className = 'demo-panel'; p.hidden = true; p.setAttribute('data-lenis-prevent', '');
        var btn = function (cls, act, v, t) { return '<button type="button" data-nosound class="' + cls + '" data-act="' + act + '" data-v="' + v + '">' + t + '</button>'; };
        p.innerHTML = '<div class="dp-h"><b>🧪 وضع التجربة</b><small>مؤقت — للمعاينة فقط</small><button type="button" class="dp-x" data-nosound aria-label="إغلاق">×</button></div>' +
            '<div class="dp-row"><span>اكتساب (يزيد الرصيد والمستوى)</span><div class="dp-btns">' + [100, 500, 1000, 2500].map(function (n) { return btn('up', 'earn', n, '+' + fmt(n)); }).join('') + '</div></div>' +
            '<div class="dp-row"><span>صرف (ينقص الرصيد فقط)</span><div class="dp-btns">' + [100, 500, 1000, 2500].map(function (n) { return btn('down', 'spend', n, '−' + fmt(n)); }).join('') + '</div></div>' +
            '<div class="dp-row"><span>قفز لمستوى</span><div class="dp-btns">' + TIERS.map(function (t, i) { return btn('', 'jump', i, t.name); }).join('') + '</div></div>' +
            '<div class="dp-row"><div class="dp-btns">' + btn('', 'near', 0, '⚡ قبل الترقية بـ 100') + btn('', 'wheel', 0, '🎡 تصفير عجلة اليوم') + btn('', 'reset', 0, '↺ إعادة الضبط') + '</div></div>' +
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
            else if (a === 'near') { var I = info(st.lifetime); if (I.nx) { var l2 = I.nx.min - 100; set(l2, Math.min(st.balance, l2)); toast('+100 نقطة وتترقى 🚀'); } }
            else if (a === 'reset') set(3250, 3250);
            else if (a === 'wheel') {
                try { localStorage.removeItem('o2_wheel_day'); } catch (x) {}
                try { wheelSession = false; } catch (x) {}
                var r = $('wh-res'); if (r) r.innerHTML = '';
                if (window.syncWheelUI) syncWheelUI(); toast('🎡 رجعت لفّة اليوم');
            }
        });
        updateDemo();
    }
    function updateDemo() {
        var s = $('dp-state'); if (!s) return;
        var I = info(st.lifetime);
        s.innerHTML = 'الرصيد: <b>' + fmt(st.balance) + '</b> · الإجمالي: <b>' + fmt(st.lifetime) + '</b> · ' + I.t.name;
    }

    window.O2Loyalty = { start: start, earn: earn, spend: spend, deny: deny, set: set,
        balance: function () { return st.balance; }, lifetime: function () { return st.lifetime; }, tiers: TIERS, info: info };

    init();
    document.addEventListener('DOMContentLoaded', function () { applyParticles(info(st.lifetime).t); });
})();
