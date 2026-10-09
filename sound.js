/* sound.js — أصوات خفيفة جداً (مولّدة بالكود، بدون ملفات) + زر كتم */
(function () {
    var KEY = 'o2_muted', muted = false, ctx = null, master = null;
    try { muted = localStorage.getItem(KEY) === '1'; } catch (e) {}

    function ensure() {
        if (ctx) return ctx;
        var AC = window.AudioContext || window.webkitAudioContext;
        if (!AC) return null;
        try {
            ctx = new AC();
            master = ctx.createGain(); master.gain.value = 0.55;
            var comp = ctx.createDynamicsCompressor();
            master.connect(comp); comp.connect(ctx.destination);
        } catch (e) { ctx = null; }
        return ctx;
    }
    function ready() {
        if (muted) return null;
        var c = ensure(); if (!c) return null;
        if (c.state === 'suspended') c.resume().catch(function () {});
        return c;
    }
    function tone(f, t0, d, type, vol, to) {
        var o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type || 'sine';
        o.frequency.setValueAtTime(f, t0);
        if (to) o.frequency.exponentialRampToValueAtTime(to, t0 + d);
        g.gain.setValueAtTime(0.0001, t0);
        g.gain.exponentialRampToValueAtTime(vol, t0 + 0.01);
        g.gain.exponentialRampToValueAtTime(0.0001, t0 + d);
        o.connect(g); g.connect(master);
        o.start(t0); o.stop(t0 + d + 0.03);
    }
    function sparkle(t0, n, vol) {
        for (var i = 0; i < n; i++) tone(1800 + Math.random() * 1600, t0 + i * 0.07 + Math.random() * 0.03, 0.12, 'triangle', vol);
    }

    var SOUNDS = {
        click: function (t) { tone(700, t, 0.05, 'triangle', 0.05, 420); },
        tick:  function (t) { tone(1200, t, 0.03, 'square', 0.025); },
        add:   function (t) { tone(520, t, 0.07, 'sine', 0.08); tone(780, t + 0.06, 0.1, 'sine', 0.08); },
        coin:  function (t) { tone(988, t, 0.08, 'square', 0.035); tone(1319, t + 0.07, 0.22, 'square', 0.035); },
        spend: function (t) { tone(660, t, 0.09, 'sine', 0.07, 440); tone(440, t + 0.09, 0.16, 'sine', 0.06, 300); },
        deny:  function (t) { tone(190, t, 0.12, 'sawtooth', 0.045); tone(160, t + 0.14, 0.16, 'sawtooth', 0.045); },
        win:   function (t) {
            [523, 659, 784, 1047].forEach(function (f, i) { tone(f, t + i * 0.09, i === 3 ? 0.4 : 0.14, 'triangle', 0.08); });
            sparkle(t + 0.3, 4, 0.025);
        },
        full:  function (t) { tone(300, t, 0.7, 'sine', 0.06, 1200); sparkle(t + 0.45, 7, 0.03); },
        levelup: function (t) {
            [523, 659, 784].forEach(function (f, i) { tone(f, t + i * 0.12, 0.2, 'triangle', 0.09); });
            tone(1047, t + 0.4, 0.7, 'triangle', 0.1); tone(784, t + 0.4, 0.7, 'sine', 0.06); tone(1319, t + 0.55, 0.6, 'triangle', 0.07);
            sparkle(t + 0.6, 8, 0.03);
        }
    };

    function play(name) {
        var c = ready(); if (!c || !SOUNDS[name]) return;
        try { SOUNDS[name](c.currentTime + 0.005); } catch (e) {}
    }
    // تكّات العجلة: بتبطّئ مع الوقت
    function spin(ms) {
        var c = ready(); if (!c) return;
        var t = 0, iv = 0.05, end = ms / 1000 - 0.25, now = c.currentTime + 0.02;
        while (t < end) { tone(1100 + Math.random() * 200, now + t, 0.03, 'square', 0.022); iv = Math.min(iv * 1.055, 0.5); t += iv; }
    }

    function paint() {
        var b = document.getElementById('snd-btn'); if (!b) return;
        b.classList.toggle('muted', muted);
        b.setAttribute('aria-pressed', muted ? 'true' : 'false');
        b.setAttribute('aria-label', muted ? 'تشغيل الصوت' : 'كتم الصوت');
        var u = document.getElementById('snd-ico'); if (u) u.setAttribute('href', muted ? '#i-volume-x' : '#i-volume-2');
    }
    function toggle() {
        muted = !muted;
        try { localStorage.setItem(KEY, muted ? '1' : '0'); } catch (e) {}
        paint();
        if (!muted) play('click');
    }

    window.O2Sound = { play: play, spin: spin, toggle: toggle, isMuted: function () { return muted; } };

    document.addEventListener('DOMContentLoaded', function () {
        var b = document.getElementById('snd-btn');
        if (b) b.addEventListener('click', toggle);
        paint();
    });
    // أول لمسة بتفتح الصوت (سياسة المتصفحات)
    ['pointerdown', 'keydown', 'touchstart'].forEach(function (ev) {
        window.addEventListener(ev, function () { if (!muted) ready(); }, { once: true, passive: true });
    });
    // نقرة خفيفة على الأزرار (حقيقية فقط)
    document.addEventListener('click', function (e) {
        if (muted || !e.isTrusted) return;
        var t = e.target; if (!t || !t.closest) return;
        if (t.closest('[data-nosound],#snd-btn,.sw-card')) return;
        if (t.closest('.add-btn,.stepper button[data-a="plus"]')) play('add');
        else if (t.closest('button,a,.o2-tool,.cat-chip,select')) play('click');
    }, true);
})();
