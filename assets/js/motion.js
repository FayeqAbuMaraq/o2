/* motion.js — تمرير ناعم (Lenis) + انتقالات بين الأقسام */
(function () {
    var REDUCE = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
    var lenis = null, root = document.documentElement;
    var ease = function (t) { return t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2; };

    if (window.Lenis && !REDUCE) {
        lenis = new Lenis({ lerp: .1, smoothWheel: true });
        window.o2Lenis = lenis;
        (function raf(t) { lenis.raf(t); requestAnimationFrame(raf); })(performance.now());
        // المودالات والإنترو بتقفل التمرير عن طريق overflow:hidden — بنوقف Lenis معها
        var sync = function () { if (root.style.overflow === 'hidden') lenis.stop(); else lenis.start(); };
        new MutationObserver(sync).observe(root, { attributes: true, attributeFilter: ['style'] });
        sync();
    }

    /* ---------- شريط الانتقال العلوي ---------- */
    var sweepEl = document.createElement('div'); sweepEl.id = 'nav-sweep'; sweepEl.setAttribute('aria-hidden', 'true'); document.body.appendChild(sweepEl);
    var sweepT;
    function sweep(sec) {
        if (REDUCE) return;
        clearTimeout(sweepT);
        sweepEl.style.transition = 'none'; sweepEl.style.opacity = '1'; sweepEl.style.transform = 'scaleX(0)'; void sweepEl.offsetWidth;
        sweepEl.style.transition = 'transform ' + sec + 's cubic-bezier(.22,1,.36,1)'; sweepEl.style.transform = 'scaleX(1)';
        sweepT = setTimeout(function () { sweepEl.style.transition = 'opacity .4s'; sweepEl.style.opacity = '0'; }, sec * 1000 + 80);
    }

    /* ---------- التمرير للعنصر ---------- */
    function yOf(el) {
        var m = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
        return el.getBoundingClientRect().top + window.scrollY - m;
    }
    function goTo(el) {
        var y = yOf(el), d = Math.min(1.8, Math.max(.9, Math.abs(y - window.scrollY) / 2200));
        sweep(d);
        lenis.scrollTo(y, { duration: d, easing: ease });
    }
    if (lenis) {
        document.addEventListener('click', function (e) {
            var a = e.target.closest && e.target.closest('a[href^="#"]'); if (!a) return;
            var h = a.getAttribute('href'); if (!h || h.length < 2) return;
            var t = document.querySelector(h); if (!t) return;
            e.preventDefault(); goTo(t);
            try { history.replaceState(null, '', h); } catch (x) {}
        });
        // scrollIntoView العمودي (زر "اطلب الآن" و"عرض أقل") يمرّ من Lenis. شريط الأقسام الأفقي يبقى طبيعي
        var orig = Element.prototype.scrollIntoView;
        Element.prototype.scrollIntoView = function (o) {
            if (o && typeof o === 'object' && !o.inline && (!o.block || o.block === 'start')) { goTo(this); return; }
            return orig.apply(this, arguments);
        };
    }

    /* ---------- خطوط الفصل بين الأقسام ---------- */
    ['rewards', 'menu', 'how', 'feedback'].forEach(function (id) {
        var s = document.getElementById(id); if (!s || !s.parentNode) return;
        var l = document.createElement('div'); l.className = 'sec-line'; l.setAttribute('aria-hidden', 'true');
        s.parentNode.insertBefore(l, s);
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { l.classList.add('in'); io.disconnect(); } }, { threshold: 1 });
            io.observe(l);
        } else l.classList.add('in');
    });
})();
