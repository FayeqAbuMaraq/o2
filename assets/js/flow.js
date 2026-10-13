/* flow.js — تدفّق النقاط
   لما النقاط تزيد (O2Loyalty.earn / هدايا الترقية) بتطلع كرات ضوء صغيرة ناعمة من نقطة التقدم نفسها (النقطة المضيئة على شريط المستويات)
   وبتطير بقوس هادي لجوّا الزجاجة. بتشتغل بإحداثيات حيّة، فبتضبط حتى لو تغيّر التخطيط أو تحرّكت الصفحة. */
(function () {
    'use strict';
    var REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var $ = function (id) { return document.getElementById(id); };
    var layer = null, drops = [], raf = 0, last = { bottle: 0, src: 0 };

    function ensureLayer() {
        if (layer) return layer;
        layer = document.createElement('div'); layer.id = 'o2-fx'; layer.setAttribute('aria-hidden', 'true');
        document.body.appendChild(layer); return layer;
    }
    function css(name) { return getComputedStyle(document.documentElement).getPropertyValue(name).trim(); }
    function source() { return document.querySelector('#tier-road .tr-link.active .tr-spark') || document.querySelector('#tier-road .tr-node.cur') || document.querySelector('#tier-road .tr-node') || $('o2-coin'); }

    /* هدف القطرات: الشريط السفلي لحرف O (دايماً مغمور بالسائل) */
    function target(j) {
        var b = $('o2-bottle'); if (!b) return null;
        var r = b.getBoundingClientRect();
        return { x: r.left + r.width * (0.18 + j.a * 0.32), y: r.top + r.height * 0.84 };
    }

    function ripple(x, y, c) {
        var L = ensureLayer(), e = document.createElement('i');
        e.className = 'o2-rip'; e.style.left = x + 'px'; e.style.top = y + 'px'; e.style.setProperty('--d1', c);
        L.appendChild(e); setTimeout(function () { e.remove(); }, 750);
    }
    function pulse(el, cls, key) {
        var now = performance.now(); if (now - last[key] < 220) return; last[key] = now;
        if (!el) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls);
        setTimeout(function () { el.classList.remove(cls); }, 600);
    }
    function hit(p, c) { if (p) ripple(p.x, p.y, c); pulse($('o2-bottle'), 'splash', 'bottle'); }

    function frame(now) {
        raf = 0;
        var sx = window.scrollX || 0, sy = window.scrollY || 0, keep = [];
        for (var i = 0; i < drops.length; i++) {
            var d = drops[i], t = (now - d.t0) / d.dur;
            if (t < 0) { keep.push(d); continue; }
            var tp = target(d.j);
            if (!tp) { d.el.remove(); continue; }
            if (t >= 1) { hit(tp, d.c); d.el.remove(); continue; }
            var p0x = d.x0 - sx, p0y = d.y0 - sy;
            var mx = (p0x + tp.x) / 2, my = (p0y + tp.y) / 2, dx = tp.x - p0x, dy = tp.y - p0y, len = Math.sqrt(dx * dx + dy * dy) || 1;
            var cx = mx + (-dy / len) * d.bend, cy = my + (dx / len) * d.bend;               // قوس جانبي ناعم
            var e = t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2, u = 1 - e;             // تسارع وتباطؤ هادي
            var x = u * u * p0x + 2 * u * e * cx + e * e * tp.x, y = u * u * p0y + 2 * u * e * cy + e * e * tp.y;
            var s = t < .18 ? t / .18 : t > .8 ? 1 - (t - .8) / .2 * .7 : 1;
            d.el.style.opacity = String(Math.min(1, t / .12) * (t > .88 ? (1 - t) / .12 : 1));
            d.el.style.transform = 'translate(' + x.toFixed(1) + 'px,' + y.toFixed(1) + 'px) scale(' + (0.4 + 0.6 * s).toFixed(2) + ')';
            keep.push(d);
        }
        drops = keep;
        if (drops.length) raf = requestAnimationFrame(frame);
    }
    function spawn(c1, c2) {
        var n = source(); if (!n) return;
        var r = n.getBoundingClientRect(), L = ensureLayer(), el = document.createElement('i');
        el.className = 'o2-drop'; el.style.setProperty('--d1', c1); el.style.setProperty('--d2', c2); el.style.opacity = '0';
        L.appendChild(el);
        drops.push({ el: el, c: c1, x0: r.left + r.width / 2 + (window.scrollX || 0), y0: r.top + r.height / 2 + (window.scrollY || 0),
            t0: performance.now(), dur: 1150 + Math.random() * 450, bend: (Math.random() < .5 ? -1 : 1) * (30 + Math.random() * 50), j: { a: Math.random() } });
        if (!raf) raf = requestAnimationFrame(frame);
    }

    function pour(n) {
        n = Math.max(0, +n || 0);
        var src = source(); if (!src) return;
        var c1 = css('--liq-1') || '#fde047', c2 = css('--liq-2') || '#f5b301';
        var r = src.getBoundingClientRect();
        if (!(r.bottom > -40 && r.top < window.innerHeight + 40)) return;      // المسار مش ظاهر بالشاشة؟ ما في داعي نرسم
        if (REDUCE) { hit(target({ a: .4 }), c1); return; }
        if (window.O2Sound) O2Sound.play('pour');
        pulse(src.closest ? (src.closest('.tr-link') || src) : src, 'flow-hit', 'src');
        var count = Math.max(5, Math.min(14, Math.round(5 + Math.sqrt(n) * 0.28)));
        for (var i = 0; i < count; i++) setTimeout(function () { spawn(c1, c2); }, i * 80);
    }

    window.O2Flow = { pour: pour };
})();
