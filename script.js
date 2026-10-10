// ===== View Transitions: تغييرات القوائم (عرض المزيد / البحث / المفضلة) بتتحرك بسلاسة، وإذا المتصفح ما بيدعمها بتشتغل عادي =====
window.o2VT = function (fn) {
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!document.startViewTransition || reduce || window.o2VT.busy || window.__o2IntroPlaying) { fn(); return; }
    window.o2VT.busy = true;
    var done = function () { window.o2VT.busy = false; };
    var t = document.startViewTransition(fn);
    t.finished.then(done, done);
};

// ===== "ناقصك X نقطة" + شريط التقدم: بينحسبوا من رصيدك الحالي =====
function o2UpdateLockMeters(points) {
    var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };
    var have = Math.max(0, points);
    document.querySelectorAll('[data-lock-cost]').forEach(function (meter) {
        var cost = +meter.dataset.lockCost;
        var need = Math.max(0, cost - have), pct = Math.min(100, have / cost * 100);
        var q = function (s) { return meter.querySelector(s); };
        q('[data-lock-need]').textContent = fmt(need);
        q('[data-lock-text]').textContent = fmt(Math.min(have, cost)) + ' / ' + fmt(cost);
        var bar = q('[data-lock-bar]'); bar.setAttribute('aria-valuenow', Math.round(have)); bar.setAttribute('aria-valuemax', cost);
        bar.querySelector('.meter-fill').style.setProperty('--p', pct + '%');
        // locked until the balance reaches the cost, then the card turns back into a normal one
        var card = meter.closest('.reward-card');
        if (card) {
            var locked = have < cost;
            card.classList.toggle('is-locked', locked);
            var btn = card.querySelector('.rw-btn'); if (btn) btn.disabled = locked;
        }
    });
}

// Keep the cards in sync with the real balance whenever the points counter settles (earn / spend / wheel / saved balance)
(function () {
    var el = document.getElementById('points-counter'); if (!el) return;
    var t;
    new MutationObserver(function () {
        clearTimeout(t);
        t = setTimeout(function () {
            var v = (window.O2Loyalty && typeof O2Loyalty.balance === 'function') ? O2Loyalty.balance() : parseInt(el.textContent.replace(/[^\d]/g, ''), 10);
            if (!isNaN(v)) o2UpdateLockMeters(v);
        }, 350);
    }).observe(el, { childList: true, characterData: true, subtree: true });
})();



function openMenuVideoModal(videoSourceUrl) {
    const modal = document.getElementById('globalMenuVideoModal');
    const wrapper = document.getElementById('globalVideoWrapper');
    
    if (modal && wrapper) {
        // فحص نوع الرابط إذا كان ملف محلي MP4 أو رابط خارجي متوافق لتحديد طريقة العرض
        if (videoSourceUrl.endsWith('.mp4') || !videoSourceUrl.includes('iframe')) {
            wrapper.innerHTML = `
                <div class="w-full relative bg-black" style="padding-bottom: 177.778%; height: 0;">
                    <video id="activeMenuVideo" class="absolute inset-0 w-full h-full object-cover" controls playsinline autoplay>
                        <source src="${videoSourceUrl}" type="video/mp4">
                        متصفحك لا يدعم تشغيل الفيديو.
                    </video>
                </div>
            `;
            
            // التعامل مع قيود التشغيل التلقائي بالمتصفحات لملفات mp4 المباشرة
            setTimeout(() => {
                const videoEl = document.getElementById('activeMenuVideo');
                if (videoEl) {
                    videoEl.play().catch(function() {
                        videoEl.muted = true;
                        videoEl.play();
                    });
                }
            }, 50);
        } else {
            // في حال رغبت بتضمين كود iframe لمنصات أخرى مستقبلاً
            wrapper.innerHTML = videoSourceUrl;
        }
        
        modal.classList.remove('hidden');
        document.body.style.overflow = 'hidden'; // منع تمرير خلفية الموقع
    }
}

function closeGlobalMenuModal(event) {
    if (event.target === document.getElementById('globalMenuVideoModal')) {
        forceCloseGlobalModal();
    }
}

function forceCloseGlobalModal() {
    const modal = document.getElementById('globalMenuVideoModal');
    const wrapper = document.getElementById('globalVideoWrapper');
    
    if (modal && wrapper) {
        wrapper.innerHTML = ""; // تفريغ الحاوية لحذف كود التشغيل فوراً وقطع الصوت تماماً
        modal.classList.add('hidden');
        document.body.style.overflow = ''; // إعادة التمرير الطبيعي للموقع
    }
}



        // Target Points (Hardcoded for demo)
        const targetPoints = 3250;
        o2UpdateLockMeters(targetPoints);
        const maxTierPoints = 5000;
        
        // 1. Animate Number Counter
        function animateValue(obj, start, end, duration) {
            if (!obj) return;
            if (end > start && obj.id === 'points-counter' && window.o2CoinBoost) window.o2CoinBoost();
            const tok = obj._av = (obj._av || 0) + 1;
            let startTimestamp = null;
            const step = (timestamp) => {
                if (tok !== obj._av) return;
                if (!startTimestamp) startTimestamp = timestamp;
                const progress = Math.min((timestamp - startTimestamp) / duration, 1);
                const easeProgress = 1 - Math.pow(1 - progress, 5);
                const currentVal = Math.round(easeProgress * (end - start) + start);
                obj.innerHTML = currentVal.toLocaleString('en-US');
                if (progress < 1) {
                    window.requestAnimationFrame(step);
                } else {
                    obj.innerHTML = end.toLocaleString('en-US');
                }
            };
            window.requestAnimationFrame(step);
        }

        // 2. Animate Progress Bar
        function animateProgressBar(current, max) {
            const progressBar = document.getElementById('tier-progress');
            const bottle = document.getElementById('o2-bottle');
            const pctEl = document.getElementById('ob-pct');
            const curEl = document.getElementById('ob-cur');
            const needEl = document.getElementById('tier-need');
            const maxEl = document.getElementById('ob-max');
            const fmt = n => Math.round(n).toLocaleString('en-US');
            const percentage = Math.max(0, Math.min((current / max) * 100, 100));

            // Slight delay before filling
            setTimeout(() => {
                // the bottle fills (or drains) with a wave on top
                bottle.classList.toggle('empty', percentage <= 0);
                progressBar.style.height = `${percentage}%`;

                // count the numbers in sync with the liquid
                const p0 = parseFloat(pctEl.dataset.v) || 0;
                const c0 = parseFloat(curEl.dataset.v) || 0;
                bottleLevel(percentage);
                const t0 = performance.now(), dur = 1600;
                maxEl.textContent = fmt(max);
                (function tick(now) {
                    const t = Math.min((now - t0) / dur, 1);
                    const e = 1 - Math.pow(1 - t, 5);
                    const c = c0 + (Math.max(0, current) - c0) * e;
                    pctEl.textContent = Math.round(p0 + (percentage - p0) * e);
                    curEl.textContent = fmt(c);
                    needEl.textContent = fmt(Math.max(0, max - c));
                    if (t < 1) requestAnimationFrame(tick);
                    else { pctEl.dataset.v = percentage; curEl.dataset.v = Math.max(0, current); }
                })(t0);
            }, 500);
        }

        // ===== Bottle: tilts with the phone + celebration when it is full =====
        const REDUCE_MOTION = !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches);
        function confettiAt(x, y, n) {
            const c = ['#e60000', '#facc15', '#fff', '#25D366'];
            for (let i = 0; i < n; i++) {
                const d = document.createElement('div'); d.className = 'cf'; d.style.cssText = `left:${x}px;top:${y}px;background:${c[i % 4]}`; document.body.appendChild(d);
                const a = Math.random() * 6.28, v = 100 + Math.random() * 220;
                d.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v + 170}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }],
                    { duration: 1300, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => d.remove();
            }
        }
        function redDrops(r) {
            for (let i = 0; i < 16; i++) {
                const d = document.createElement('div'), z = 6 + Math.random() * 6;
                d.style.cssText = `position:fixed;z-index:10001;pointer-events:none;width:${z}px;height:${z * 1.3}px;background:#e60000;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;left:${r.left + Math.random() * r.width}px;top:${r.top + r.height * .08}px`;
                document.body.appendChild(d);
                d.animate([{ transform: 'translateY(0)', opacity: 1 }, { transform: `translateY(${120 + Math.random() * 220}px)`, opacity: 0 }],
                    { duration: 900 + Math.random() * 700, delay: Math.random() * 400, easing: 'cubic-bezier(.22,1,.36,1)', fill: 'backwards' }).onfinish = () => d.remove();
            }
        }
        let bottleCelebrated = false, bottleCeleT = null;
        function bottleLevel(pct) {
            const bottle = document.getElementById('o2-bottle'), win = document.getElementById('ob-win');
            clearTimeout(bottleCeleT);
            if (pct < 100) { bottle.classList.remove('full'); win.classList.remove('show'); bottleCelebrated = false; return; }
            if (bottleCelebrated) return;
            bottleCeleT = setTimeout(() => {          // after the liquid reaches the top
                bottleCelebrated = true;
                bottle.classList.add('full');
                win.classList.add('show');
                if (!REDUCE_MOTION) {
                    bottle.classList.add('celebrate'); setTimeout(() => bottle.classList.remove('celebrate'), 2400);
                    const r = bottle.getBoundingClientRect();
                    confettiAt(r.left + r.width / 2, r.top + r.height * .3, 80);
                    setTimeout(() => confettiAt(r.left + r.width * .2, r.top + r.height * .5, 40), 350);
                    setTimeout(() => confettiAt(r.left + r.width * .8, r.top + r.height * .5, 40), 600);
                    redDrops(r);
                }
                try { navigator.vibrate && navigator.vibrate([30, 50, 30, 50, 90]); } catch (e) {}
            }, 1700);
        }

        (function bottleTilt() {
            const bottle = document.getElementById('o2-bottle'), tilt = bottle && bottle.querySelector('.ob-tilt');
            if (!tilt || REDUCE_MOTION) return;
            const clamp = (v, a) => Math.max(-a, Math.min(a, v));
            let target = 0, ang = 0, vel = 0, sensor = false, visible = true, raf = 0, t0 = performance.now(), mouseT = 0;
            const orient = () => (screen.orientation && typeof screen.orientation.angle === 'number') ? screen.orientation.angle : (window.orientation || 0);
            function wake() { if (!raf && visible) raf = requestAnimationFrame(frame); }
            function frame(now) {
                raf = 0; if (!visible) return;
                if (sensor) { vel += (target - ang) * 0.03; vel *= 0.8; ang += vel; }   // phone: soft spring = liquid slosh
                else {                                                                   // desktop: slow easing, no bounce
                    mouseT += (target - mouseT) * 0.04;
                    ang += ((mouseT + Math.sin((now - t0) / 1800) * 1.2) - ang) * 0.06;
                }
                const k = bottle.classList.contains('full') ? 0 : 1;                    // a full bottle does not slosh
                tilt.style.transform = `rotate(${(ang * k).toFixed(2)}deg)`;
                raf = requestAnimationFrame(frame);
            }
            function onOrient(e) {
                if (e.gamma == null) return;
                const o = orient(); if (o !== 0 && o !== 180) { target = 0; wake(); return; }   // أفقي: سطح السائل بيرجع مستوي (ما بيضل عالق بزاوية قديمة)
                sensor = true; target = -clamp(o === 180 ? -e.gamma : e.gamma, 40) * .9; wake();
            }
            function onMotion(e) {                                                       // a shake adds a splash
                const a = e.acceleration; if (!a || a.x == null) return;
                vel += clamp(-a.x, 14) * .12; wake();
            }
            window.addEventListener('mousemove', e => { if (!sensor) { target = (e.clientX / innerWidth - .5) * 2 * 6; wake(); } }, { passive: true });
            if ('IntersectionObserver' in window) new IntersectionObserver(es => { visible = es[0].isIntersecting; if (visible) wake(); }).observe(bottle);
            function listen() { window.addEventListener('deviceorientation', onOrient); window.addEventListener('devicemotion', onMotion); }
            const btn = document.getElementById('ob-tilt-btn');
            if (typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission === 'function') {   // iPhone: needs a tap
                btn.hidden = false;
                btn.addEventListener('click', () => {
                    DeviceOrientationEvent.requestPermission().then(r => {
                        if (r === 'granted') { listen(); btn.hidden = true; } else btn.textContent = 'ما انفعّل الإذن — فعّله من إعدادات المتصفح';
                    }).catch(() => { btn.hidden = true; });
                });
            } else listen();
            wake();
        })();

        // ===== Gold O2 logo, extruded in CSS 3D (spins faster whenever points are added) =====
        (function goldLogo() {
            const host = document.getElementById('o2-coin'); if (!host) return;
            const D = 6;
            const buildCoin = (T) => {
                let html = '';
                for (let z = -D; z <= D; z++) {
                    const bg = z === D ? T.f : z === -D ? T.k : T.s[z % 2 ? 0 : 1];   // the ridges give the sides their depth
                    html += `<i class="oc-l" style="transform:translateZ(${z}px);background:${bg}"></i>`;
                }
                host.innerHTML = html;
            };
            buildCoin({ f: 'linear-gradient(135deg,#fff7c2 0%,#f7c948 42%,#c58a12 100%)', k: 'linear-gradient(135deg,#f0c24a,#b8860b)', s: ['#8a5a0b', '#a8741a'] });
            window.o2CoinTheme = (T) => { if (T) buildCoin(T); };
            if (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) { host.style.transform = 'rotateX(-10deg) rotateY(-25deg)'; return; }
            const BASE = .9; let a = -25, sp = BASE, tg = BASE, vis = true, raf = 0, bt = 0;
            const frame = () => { raf = 0; if (!vis) return; a = (a + sp) % 360; sp += (tg - sp) * .05; host.style.transform = `rotateX(-10deg) rotateY(${a.toFixed(1)}deg)`; raf = requestAnimationFrame(frame); };
            const wake = () => { if (!raf && vis) raf = requestAnimationFrame(frame); };
            window.o2CoinBoost = () => { tg = 10; clearTimeout(bt); bt = setTimeout(() => { tg = BASE; }, 1800); wake(); };
            if ('IntersectionObserver' in window) new IntersectionObserver(es => { vis = es[0].isIntersecting; wake(); }).observe(host);
            wake();
        })();

        // ===== Daily Lucky Wheel =====
        // pts = النقاط، w = الوزن (احتمال الظهور). الأرقام الكبيرة نادرة.
        const WHEEL = [
            { pts: 10, w: 22 }, { pts: 50, w: 9 }, { pts: 5, w: 26 }, { pts: 100, w: 5 },
            { pts: 25, w: 16 }, { pts: 250, w: 1 }, { pts: 15, w: 14 }, { pts: 75, w: 7 }
        ];
        const WHEEL_KEY = 'o2_wheel_day', WHEEL_MS = (window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches) ? 800 : 5000;
        let wheelRot = 0, wheelBusy = false, wheelSession = false, wheelTimer = null;
        const todayKey = () => { const d = new Date(); return d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate(); };
        const wheelDone = () => { if (wheelSession) return true; try { return localStorage.getItem(WHEEL_KEY) === todayKey(); } catch (e) { return false; } };
        const readPoints = () => parseInt(document.getElementById('points-counter').innerText.replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d)).replace(/[٬,]/g, '')) || 0;

        function wheelSVG() {
            const n = WHEEL.length, step = 360 / n, R = 96;
            const pt = (deg, r) => { const a = deg * Math.PI / 180; return [(100 + r * Math.sin(a)).toFixed(2), (100 - r * Math.cos(a)).toFixed(2)]; };
            let o = '';
            WHEEL.forEach((s, i) => {
                const [x0, y0] = pt(i * step, R), [x1, y1] = pt((i + 1) * step, R), mid = i * step + step / 2;
                o += `<path d="M100 100 L${x0} ${y0} A${R} ${R} 0 0 1 ${x1} ${y1} Z" fill="${i % 2 ? '#1f1f1f' : '#d90000'}" stroke="#facc15" stroke-width="1"/>`;
                o += `<text x="100" y="35" transform="rotate(${mid} 100 100)" text-anchor="middle" font-size="16" font-weight="900" fill="${s.pts >= 100 ? '#fde047' : '#fff'}" font-family="Cairo,sans-serif">${s.pts}</text>`;
                o += `<text x="100" y="46" transform="rotate(${mid} 100 100)" text-anchor="middle" font-size="7" font-weight="700" fill="#ffffffcc" font-family="Cairo,sans-serif">نقطة</text>`;
            });
            o += '<circle cx="100" cy="100" r="97" fill="none" stroke="#facc15" stroke-width="3"/><circle cx="100" cy="100" r="17" fill="#111" stroke="#facc15" stroke-width="2.5"/><text x="100" y="105" text-anchor="middle" font-size="13" font-weight="900" fill="#fff" font-family="Cairo,sans-serif">O2</text>';
            return `<svg viewBox="0 0 200 200" aria-hidden="true">${o}</svg>`;
        }

        const WM = document.createElement('div');
        WM.id = 'o2-wheel'; WM.className = 'wh-modal';
        WM.innerHTML = `<div class="wh-box" data-lenis-prevent role="dialog" aria-label="عجلة الحظ اليومية"><button type="button" class="wh-x" aria-label="إغلاق">×</button>
            <h3 class="text-xl font-black">عجلة الحظ اليومية 🎡</h3><p class="text-sm text-zinc-400 mt-1">لفّة وحدة مجانية كل يوم · اربح نقاط تروح مباشرة لرصيدك</p>
            <div class="wh-stage"><div class="wh-ptr"></div><div class="wh-wheel" id="wh-wheel">${wheelSVG()}</div></div>
            <button type="button" class="wh-spin" id="wh-spin">لفّ الآن!</button><div class="wh-res" id="wh-res"></div></div>`;
        document.body.appendChild(WM);
        const whWheel = WM.querySelector('#wh-wheel'), whSpin = WM.querySelector('#wh-spin'), whRes = WM.querySelector('#wh-res');
        whWheel.style.transitionDuration = WHEEL_MS + 'ms';

        function countdown() {
            clearInterval(wheelTimer);
            const tick = () => {
                const n = new Date(), nx = new Date(n.getFullYear(), n.getMonth(), n.getDate() + 1), d = Math.max(0, nx - n);
                const p = v => String(Math.floor(v)).padStart(2, '0');
                const el = document.getElementById('wh-cd');
                if (el) el.textContent = p(d / 3600000) + ':' + p(d % 3600000 / 60000) + ':' + p(d % 60000 / 1000);
                if (d <= 0) { clearInterval(wheelTimer); wheelSession = false; syncWheelUI(); }
            };
            tick(); wheelTimer = setInterval(tick, 1000);
        }
        function syncWheelUI() {
            const done = wheelDone();
            const b = document.getElementById('wh-dash-btn'); if (b) b.classList.toggle('done', done);
            const t = document.getElementById('wh-dash-t'); if (t) t.textContent = done ? 'استخدمت لفّتك اليوم · تعال بكرة 🎁' : 'لفّ عجلة الحظ اليومية';
            const ts = document.getElementById('wh-tool-s'); if (ts) ts.textContent = done ? 'تعال بكرة للفّة جديدة' : 'لفّة مجانية كل يوم · اربح نقاط';
            whSpin.disabled = done || wheelBusy;
            whSpin.textContent = done ? 'استخدمت لفّتك اليوم' : 'لفّ الآن!';
            if (done && !wheelBusy) { if (!whRes.innerHTML) whRes.innerHTML = '<small>الدورة الجاية بعد <span id="wh-cd" dir="ltr"></span></small>'; countdown(); }
        }
        function openWheel() { WM.classList.add('open'); document.documentElement.style.overflow = 'hidden'; syncWheelUI(); }
        function closeWheel() { if (wheelBusy) return; WM.classList.remove('open'); document.documentElement.style.overflow = ''; }
        document.querySelectorAll('.js-open-wheel').forEach(b => b.addEventListener('click', openWheel));
        WM.querySelector('.wh-x').addEventListener('click', closeWheel);
        WM.addEventListener('click', e => { if (e.target === WM) closeWheel(); });
        document.addEventListener('keydown', e => { if (e.key === 'Escape') closeWheel(); });

        function wheelConfetti() {
            const r = WM.querySelector('.wh-stage').getBoundingClientRect(), x = r.left + r.width / 2, y = r.top + r.height / 2, c = ['#e60000', '#facc15', '#fff', '#25D366'];
            for (let i = 0; i < 44; i++) {
                const d = document.createElement('div'); d.className = 'cf'; d.style.cssText = `left:${x}px;top:${y}px;background:${c[i % 4]}`; document.body.appendChild(d);
                const a = Math.random() * 6.28, v = 90 + Math.random() * 190;
                d.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: `translate(${Math.cos(a) * v}px,${Math.sin(a) * v + 150}px) rotate(${Math.random() * 720}deg)`, opacity: 0 }],
                    { duration: 1200, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = () => d.remove();
            }
        }
        whSpin.addEventListener('click', () => {
            if (wheelBusy || wheelDone()) return;
            wheelBusy = true; wheelSession = true; whSpin.disabled = true; whRes.innerHTML = '';
            try { localStorage.setItem(WHEEL_KEY, todayKey()); } catch (e) {}
            if (window.O2Sound) O2Sound.spin(WHEEL_MS);
            let r = Math.random() * WHEEL.reduce((a, s) => a + s.w, 0), idx = 0;
            for (; idx < WHEEL.length; idx++) { r -= WHEEL[idx].w; if (r < 0) break; }
            const step = 360 / WHEEL.length, jitter = (Math.random() - .5) * step * .6;
            wheelRot = Math.floor(wheelRot / 360) * 360 + 360 * 6 + (360 - (idx * step + step / 2)) + jitter;
            whWheel.style.transform = `rotate(${wheelRot}deg)`;
            try { navigator.vibrate && navigator.vibrate(20); } catch (e) {}
            setTimeout(() => {
                const win = WHEEL[idx].pts, counter = document.getElementById('points-counter'), cur = readPoints();
                wheelBusy = false;
                whRes.innerHTML = `🎉 ربحت <b>${win}</b> نقطة!<small>الدورة الجاية بعد <span id="wh-cd" dir="ltr"></span></small>`;
                wheelConfetti();
                if (window.O2Loyalty) { O2Loyalty.earn(win, 'عجلة الحظ', { sound: false }); if (window.O2Sound) O2Sound.play('win'); }
                else { animateValue(counter, cur, cur + win, 1200); animateProgressBar(cur + win, maxTierPoints); }
                syncWheelUI(); countdown();
            }, WHEEL_MS + 150);
        });
        syncWheelUI();

        // 3. Navbar scroll effect
        window.addEventListener('scroll', () => {
            const nav = document.getElementById('navbar');
            if (window.scrollY > 20) {
                nav.classList.add('bg-surface-1', 'bg-opacity-90', 'backdrop-blur-md', 'shadow-lg', 'shadow-red-900/10');
            } else {
                nav.classList.remove('bg-surface-1', 'bg-opacity-90', 'backdrop-blur-md', 'shadow-lg', 'shadow-red-900/10');
            }
        });

        // 4. Modal Logic
        const modal = document.getElementById('redeemModal');
        const modalContent = document.getElementById('modalContent');
        const itemNameEl = document.getElementById('modalItemName');
        const itemCostEl = document.getElementById('modalItemCost');

        function showRedeemModal(itemName, cost) {
            if (window.O2Loyalty && O2Loyalty.balance() < cost) { O2Loyalty.deny(cost); return; }
            itemNameEl.textContent = itemName;
            itemCostEl.textContent = cost.toLocaleString();
            
            modal.classList.remove('hidden');
            // Trigger reflow
            void modal.offsetWidth;
            
            modalContent.classList.remove('scale-95', 'opacity-0');
            modalContent.classList.add('scale-100', 'opacity-100');
        }

        function closeRedeemModal() {
            modalContent.classList.remove('scale-100', 'opacity-100');
            modalContent.classList.add('scale-95', 'opacity-0');
            
            setTimeout(() => {
                modal.classList.add('hidden');
            }, 300); // match duration
        }

        function confirmRedeem() {
            const btn = modalContent.querySelector('button.bg-o2-red');
            btn.innerHTML = '<svg class="ic ic-spin" aria-hidden="true"><use href="#i-loader"/></svg> جاري التأكيد...';
            btn.classList.add('opacity-75', 'cursor-not-allowed');
            
            // Simulate API call
            setTimeout(() => {
                btn.innerHTML = '<svg class="ic" aria-hidden="true"><use href="#i-check"/></svg> تم الاستبدال بنجاح!';
                btn.classList.remove('bg-o2-red', 'hover:bg-o2-darkRed');
                btn.classList.add('bg-green-600', 'hover:bg-green-700');
                
                // Spend points: balance drops, lifetime (tier progress) stays
                const cost = parseInt(itemCostEl.innerText.replace(/,/g, ''));
                if (window.O2Loyalty) O2Loyalty.spend(cost, itemNameEl.textContent);
                else {
                    const currentPoints = parseInt(document.getElementById('points-counter').innerText.replace(/,/g, ''));
                    if (!isNaN(currentPoints) && !isNaN(cost)) {
                        animateValue(document.getElementById('points-counter'), currentPoints, currentPoints - cost, 1000);
                        o2UpdateLockMeters(currentPoints - cost);
                        animateProgressBar(currentPoints - cost, maxTierPoints);
                    }
                }

                setTimeout(() => {
                    closeRedeemModal();
                    // Reset button state
                    setTimeout(() => {
                        btn.innerHTML = 'تأكيد';
                        btn.classList.add('bg-o2-red', 'hover:bg-o2-darkRed');
                        btn.classList.remove('bg-green-600', 'hover:bg-green-700', 'opacity-75', 'cursor-not-allowed');
                    }, 300);
                }, 1500);
            }, 1500);
        }

        // Initialize on Load
        window.addEventListener('DOMContentLoaded', () => {
            // Start Number Animation
            const startCounters = () => {
                if (window.O2Loyalty) { O2Loyalty.start(); return; }
                const pointsCounter = document.getElementById('points-counter');
                animateValue(pointsCounter, 0, targetPoints, 2000); // Animate over 2 seconds

                // Start Progress Bar Animation
                animateProgressBar(targetPoints, maxTierPoints);
            };
            // Wait for the intro animation to open before counting up
            if (window.__o2IntroPlaying) {
                window.addEventListener('o2-intro-reveal', startCounters, { once: true });
            } else {
                startCounters();
            }

            // Initialize Particles.js for subtle background embers effect
            particlesJS('particles-js', {
                "particles": {
                    "number": {
                        "value": (window.innerWidth < 768 ? Math.round(80 * 0.4) : 80),
                        "density": { "enable": true, "value_area": 800 }
                    },
                    "color": { "value": "#e60000" }, // O2 Red
                    "shape": {
                        "type": "circle",
                        "stroke": { "width": 0, "color": "#000000" }
                    },
                    "opacity": {
                        "value": 0.7,
                        "random": true,
                        "anim": { "enable": true, "speed": 0.4, "opacity_min": 0.3, "sync": false }
                    },
                    "size": {
                        "value": 5,
                        "random": true,
                        "anim": { "enable": false, "speed": 40, "size_min": 0.1, "sync": false }
                    },
                    "line_linked": {
                        "enable": false, // No lines, just floating particles like embers
                    },
                    "move": {
                        "enable": true,
                        "speed": 0.6,
                        "direction": "top", // Float upwards like smoke/embers
                        "random": true,
                        "straight": false,
                        "out_mode": "out",
                        "bounce": false,
                        "attract": { "enable": false, "rotateX": 600, "rotateY": 1200 }
                    }
                },
                "interactivity": {
                    "detect_on": "canvas",
                    "events": {
                        "onhover": { "enable": true, "mode": "bubble" }, // Slight bubble on hover
                        "onclick": { "enable": false },
                        "resize": true
                    },
                    "modes": {
                        "bubble": { "distance": 200, "size": 6, "duration": 2, "opacity": 0.8, "speed": 3 }
                    }
                },
                "retina_detect": true
            });
        });

        // تسجيل Service Worker
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker Registered Successfully!', reg))
      .catch((err) => console.error('Service Worker Registration Failed:', err));
  });
}

let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
  
  // قم إظهار زر التثبيت الخاص بك (مثلاً عنصر بأيدي #install-btn)
  const installBtn = document.getElementById('install-btn');
  if (installBtn) {
    installBtn.style.display = 'block';
    installBtn.addEventListener('click', () => {
      deferredPrompt.prompt();
      deferredPrompt.userChoice.then((choiceResult) => {
        if (choiceResult.outcome === 'accepted') {
          console.log('User accepted the install prompt');
        }
        deferredPrompt = null;
      });
    });
  }
});
        document.addEventListener('DOMContentLoaded', function () {
            
            // 1. القائمة الجانبية للشاشات الصغيرة
            const mobileBtn = document.getElementById('mobile-menu-btn');
            const mobileMenu = document.getElementById('mobile-menu');
            const mobileLinks = document.querySelectorAll('.mobile-link');

            if (mobileBtn && mobileMenu) {
                mobileBtn.addEventListener('click', () => {
                    mobileMenu.classList.toggle('hidden');
                });

                mobileLinks.forEach(link => {
                    link.addEventListener('click', () => {
                        mobileMenu.classList.add('hidden');
                    });
                });
            }

            // 2. التحكم في فتح وإغلاق البطاقات (Accordion)
            const accordionBtns = document.querySelectorAll('.accordion-btn');
            
            accordionBtns.forEach(btn => {
                btn.addEventListener('click', function () {
                    const content = this.nextElementSibling;
                    const isExpanded = content.classList.contains('expanded');
                    
                    if (isExpanded) {
                        content.classList.remove('expanded');
                        this.classList.remove('expanded-btn');
                    } else {
                        content.classList.add('expanded');
                        this.classList.add('expanded-btn');
                        
                        // تحميل الصورة Lazy loading عند الفتح لأول مرة
                        const img = content.querySelector('.meal-img');
                        if (img && img.dataset.src && (!img.src || img.src.startsWith('data:'))) {
                            img.src = img.dataset.src;
                        }
                    }
                });
            });

            // 3. تقليل طول الصفحة: إظهار 3 أصناف فقط في كل قسم مع زر "عرض المزيد"
            const sections = document.querySelectorAll('.menu-section');

            sections.forEach(section => {
                if (section.querySelector('[data-cake-carousel]')) return; // قسم الكيك (كاروسيل): كل الأصناف ظاهرة
                const cards = Array.from(section.querySelectorAll('.meal-card'));
                const showMoreBtn = section.querySelector('.show-more-btn');
                const showMoreWrapper = section.querySelector('.show-more-wrapper');
                let isExpanded = false;

                function updateItemsVisibility() {
                    cards.forEach((card, index) => {
                        if (index < 3 || isExpanded) {
                            card.style.display = '';
                        } else {
                            card.style.display = 'none';
                        }
                    });

                    if (cards.length <= 3) {
                        if (showMoreWrapper) showMoreWrapper.style.display = 'none';
                    } else {
                        if (showMoreWrapper) showMoreWrapper.style.display = 'block';
                    }
                }

                updateItemsVisibility();

                if (showMoreBtn) {
                    showMoreBtn.addEventListener('click', function () {
                        isExpanded = !isExpanded;
                        o2VT(() => {
                        const btnText = this.querySelector('.btn-text');
                        const btnIcon = this.querySelector('.btn-icon');

                        if (isExpanded) {
                            cards.forEach(card => card.style.display = '');
                            if (btnText) btnText.textContent = 'عرض أقل';
                            if (btnIcon) btnIcon.style.transform = 'rotate(180deg)';
                        } else {
                            cards.forEach((card, index) => {
                                card.style.display = index < 3 ? '' : 'none';
                            });
                            if (btnText) btnText.textContent = 'عرض المزيد من الأصناف';
                            if (btnIcon) btnIcon.style.transform = 'rotate(0deg)';
                        }
                        });
                    if (!isExpanded) section.scrollIntoView({ behavior: 'smooth', block: 'start' });   // التمرير السلس عند التقليص
                    });
                }
            });

            // 4. تفعيل شريط البحث المباشر
            const searchInput = document.getElementById('menu-search-input');
            const clearSearchBtn = document.getElementById('clear-search-btn');
            const noResultsMsg = document.getElementById('no-search-results');

            if (searchInput) {
                searchInput.addEventListener('input', function () {
                    const __q = this;
                    o2VT(() => {
                    const query = __q.value.trim().toLowerCase();

                    if (query.length > 0) {
                        clearSearchBtn.classList.remove('hidden');
                        let totalMatches = 0;

                        sections.forEach(section => {
                            const cards = section.querySelectorAll('.meal-card');
                            const showMoreWrapper = section.querySelector('.show-more-wrapper');
                            let sectionMatches = 0;

                            cards.forEach(card => {
                                const title = card.querySelector('.meal-title')?.textContent.toLowerCase() || '';
                                const ingredients = card.querySelector('.meal-ingredients')?.textContent.toLowerCase() || '';

                                if (title.includes(query) || ingredients.includes(query)) {
                                    card.style.display = '';
                                    sectionMatches++;
                                    totalMatches++;
                                } else {
                                    card.style.display = 'none';
                                }
                            });

                            // إخفاء زر "عرض المزيد" أثناء البحث وإخفاء القسم كلياً إذا لم يعثر على نتائج
                            if (showMoreWrapper) showMoreWrapper.style.display = 'none';
                            section.style.display = sectionMatches > 0 ? 'block' : 'none';
                        });

                        noResultsMsg.classList.toggle('hidden', totalMatches > 0);

                    } else {
                        // إعادة الحالة الطبيعية عند مسح البحث
                        clearSearchBtn.classList.add('hidden');
                        noResultsMsg.classList.add('hidden');

                        sections.forEach(section => {
                            section.style.display = 'block';
                            const cards = section.querySelectorAll('.meal-card');
                            const showMoreBtn = section.querySelector('.show-more-btn');
                            const showMoreWrapper = section.querySelector('.show-more-wrapper');
                            const isCarousel = !!section.querySelector('[data-cake-carousel]');
                            
                            // إعادة تعيين العرض لأول 3 عناصر (إلا قسم الكاروسيل)
                            cards.forEach((card, index) => {
                                card.style.display = (isCarousel || index < 3) ? '' : 'none';
                            });

                            if (showMoreWrapper) {
                                showMoreWrapper.style.display = cards.length > 3 ? 'block' : 'none';
                            }
                            if (showMoreBtn) {
                                const btnText = showMoreBtn.querySelector('.btn-text');
                                const btnIcon = showMoreBtn.querySelector('.btn-icon');
                                if (btnText) btnText.textContent = 'عرض المزيد من الأصناف';
                                if (btnIcon) btnIcon.style.transform = 'rotate(0deg)';
                            }
                        });
                    }
                    });
                });

                // زر مسح حقل البحث
                if (clearSearchBtn) {
                    clearSearchBtn.addEventListener('click', function () {
                        searchInput.value = '';
                        searchInput.dispatchEvent(new Event('input'));
                        searchInput.focus();
                    });
                }
            }
        });

    // Highlight the nav item of the section the user is currently viewing
    (function () {
        var ids = ['home', 'rewards', 'menu', 'how'];
        var links = document.querySelectorAll('[data-spy]');
        var current = null, locked = false, lockTimer = null;

        function setActive(id) {
            if (id === current) return;
            current = id;
            links.forEach(function (a) { a.classList.toggle('active', a.getAttribute('data-spy') === id); });
        }

        function detect() {
            if (locked) return;
            var probe = 80 + (window.innerHeight - 80) * 0.3;   // a line a bit below the top bar
            var active = ids[0];
            ids.forEach(function (id) {
                var el = document.getElementById(id);
                if (el && el.getBoundingClientRect().top <= probe) active = id;
            });
            if (window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4) active = ids[ids.length - 1];
            setActive(active);
        }

        // when a nav item is tapped, activate it right away and ignore the in-between sections while scrolling
        links.forEach(function (a) {
            a.addEventListener('click', function () {
                locked = true;
                setActive(a.getAttribute('data-spy'));
            });
        });
        window.addEventListener('scroll', function () {
            if (locked) {
                clearTimeout(lockTimer);
                lockTimer = setTimeout(function () { locked = false; detect(); }, 140);
            } else {
                detect();
            }
        }, { passive: true });
        window.addEventListener('resize', detect);
        window.addEventListener('load', detect);
        detect();
    })();

    (function () {
        var WHATSAPP_NUMBER = '972569000400';     // رقم الواتساب بصيغة دولية بدون + (مثال: 970599123456). إذا ترك فارغاً يفتح واتساب لاختيار جهة الاتصال
        var POINTS_PER_SHEKEL = 10;
        var $ = function (s, r) { return (r || document).querySelector(s); };
        var store = {
            get: function (k, d) { try { return JSON.parse(localStorage.getItem(k)) || d; } catch (e) { return d; } },
            set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
        };
        var cart = store.get('o2_cart', []), favs = store.get('o2_favs', []);
        var esc = function (s) { return String(s).replace(/[&<>"]/g, function (c) { return {'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]; }); };
        var toastT; function toast(m) { var t = $('#o2-toast'); t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 1800); }

        // ---- build action row on every card ----
        var cards = [].slice.call(document.querySelectorAll('#menu .meal-card'));
        cards.forEach(function (card) {
            var sec = card.closest('.menu-section');
            var title = $('.meal-title', card).textContent.trim();
            var nums = ($('.accordion-btn span.text-o2red, .cake-price', card).textContent.match(/\d+(\.\d+)?/g) || []).map(Number).sort(function (a, b) { return a - b; });
            var sizes = nums.length === 2 ? [{ l: 'صغير', p: nums[0] }, { l: 'كبير', p: nums[1] }] : null;
            card._d = { id: sec.id + '|' + title, name: sizes ? title.replace(/\s*\(.*\)\s*$/, '') : title, price: nums.length === 1 ? nums[0] : null, sizes: sizes, si: 0 };
            var row = document.createElement('div'); row.className = 'meal-actions';
            row.innerHTML = '<button class="fav-btn" aria-label="المفضلة"><svg class="ic ic-fill" aria-hidden="true"><use href="#i-heart"/></svg></button>' +
                (sizes ? '<select class="size-sel">' + sizes.map(function (s, i) { return '<option value="' + i + '">' + s.l + ' · ' + s.p + ' ₪</option>'; }).join('') + '</select>' : '') +
                '<span class="pts-chip"></span><span class="add-wrap"></span>';
            card.appendChild(row);
            refreshCard(card);
        });
        function cur(card) { var d = card._d; return d.sizes ? d.sizes[d.si].p : d.price; }
        function keyOf(card) { return card._d.id + '#' + card._d.si; }
        function find(k) { return cart.filter(function (i) { return i.key === k; })[0]; }
        function refreshCard(card) {
            var d = card._d, p = cur(card), it = find(keyOf(card));
            $('.pts-chip', card).innerHTML = p ? '<svg class="ic ic-fill" aria-hidden="true"><use href="#i-star"/></svg> تكسب ' + Math.round(p * POINTS_PER_SHEKEL) + ' نقطة' : 'السعر عند الطلب';
            $('.pts-chip', card).classList.toggle('muted', !p);
            $('.add-wrap', card).innerHTML = it ? '<div class="stepper"><button data-a="plus">+</button><b>' + it.qty + '</b><button data-a="minus">−</button></div>' : '<button class="add-btn" data-a="add" aria-label="أضف للسلة"><svg class="ic" aria-hidden="true"><use href="#i-plus"/></svg></button>';
            var on = favs.indexOf(d.id) > -1;
            $('.fav-btn', card).classList.toggle('on', on); card.classList.toggle('is-fav', on);
        }
        function refreshAll() { cards.forEach(refreshCard); renderCart(); updateFavUI(); }

        // ---- cart ----
        function totals() { var t = 0, c = 0; cart.forEach(function (i) { t += (i.price || 0) * i.qty; c += i.qty; }); return { t: t, c: c }; }
        function renderCart() {
            store.set('o2_cart', cart);
            var T = totals();
            $('#fab-total').textContent = T.t + ' ₪'; $('#fab-count').textContent = T.c;
            $('#cart-fab').classList.toggle('show', T.c > 0);
            $('#c-total').textContent = T.t + ' ₪'; $('#c-pts').textContent = Math.round(T.t * POINTS_PER_SHEKEL);
            $('#cart-list').innerHTML = cart.length ? cart.map(function (i) {
                return '<div class="cart-row"><div class="nm">' + esc(i.name) + (i.size ? ' (' + i.size + ')' : '') + '<small>' + (i.price ? i.price + ' ₪' : 'السعر عند الطلب') + '</small></div><div class="stepper" data-k="' + esc(i.key) + '"><button data-a="plus">+</button><b>' + i.qty + '</b><button data-a="minus">−</button></div></div>';
            }).join('') : '<p class="text-center text-zinc-400 py-8">السلة فاضية</p>';
        }
        function change(k, card, delta) {
            var it = find(k);
            if (!it && card && delta > 0) { var d = card._d; cart.push({ key: k, name: d.name, size: d.sizes ? d.sizes[d.si].l : '', price: cur(card), qty: 1 }); toast('تمت إضافة ' + d.name + ' للسلة'); var f = $('#cart-fab'); f.classList.remove('bump'); void f.offsetWidth; f.classList.add('bump'); }
            else if (it) { it.qty += delta; if (it.qty <= 0) cart.splice(cart.indexOf(it), 1); it.qty = Math.min(it.qty, 20); }
            cards.forEach(refreshCard); renderCart();
        }
        function sheet(open) { $('#cart-sheet').classList.toggle('open', open); $('#cart-overlay').classList.toggle('open', open); document.documentElement.style.overflow = open ? 'hidden' : ''; }
        $('#cart-fab').onclick = function () { sheet(true); };
        $('#cart-close').onclick = $('#cart-overlay').onclick = function () { sheet(false); };
        $('#cart-clear').onclick = function () { cart = []; refreshAll(); };
        window.O2cart = {
            pts: function (p) { return Math.round(p * POINTS_PER_SHEKEL); },
            add: function (name, price) { var k = 'custom|' + name, it = find(k); if (it) it.qty++; else cart.push({ key: k, name: name, size: '', price: price, qty: 1 }); cards.forEach(refreshCard); renderCart(); toast('تمت إضافة برجرك للسلة'); }
        };
        $('#cart-list').addEventListener('click', function (e) {
            var b = e.target.closest('button[data-a]'); if (!b) return;
            change(b.parentNode.getAttribute('data-k'), null, b.dataset.a === 'plus' ? 1 : -1);
        });
        $('#c-name').value = store.get('o2_name', ''); $('#c-note').value = store.get('o2_note', '');
        $('#c-send').onclick = function () {
            if (!cart.length) return toast('السلة فاضية');
            var T = totals(), n = $('#c-name').value.trim(), note = $('#c-note').value.trim();
            store.set('o2_name', n); store.set('o2_note', note);
            var m = 'طلب جديد من موقع O2\n' + (n ? 'الاسم: ' + n + '\n' : '') + 'نوع الطلب: ' + $('#c-type').value + '\n' + (note ? 'العنوان/ملاحظات: ' + note + '\n' : '') + '------------\n' +
                cart.map(function (i) { return i.qty + '× ' + i.name + (i.size ? ' (' + i.size + ')' : '') + ' — ' + (i.price ? i.price * i.qty + ' ₪' : 'السعر عند التأكيد'); }).join('\n') +
                '\n------------\nالمجموع: ' + T.t + ' ₪\nالنقاط المتوقعة: ' + Math.round(T.t * POINTS_PER_SHEKEL);
            window.open('https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(m), '_blank');
        };

        // ---- opening hours ----
        var OPEN_AT = '12:00', CLOSE_AT = '00:00';   // عدّل أوقات الدوام هنا (24 ساعة)
        function mins(t) { var a = t.split(':'); return +a[0] * 60 + +a[1]; }
        function hoursUI() {
            var n = new Date(), m = n.getHours() * 60 + n.getMinutes(), o = mins(OPEN_AT), c = mins(CLOSE_AT) || 1440;
            var open = o < c ? (m >= o && m < c) : (m >= o || m < c);
            var el = $('#hours'); el.className = 'hours ' + (open ? 'open' : 'closed');
            $('span', el).textContent = open ? 'مفتوح الآن · حتى ' + CLOSE_AT : 'مغلق الآن · يفتح الساعة ' + OPEN_AT;
            $('#c-closed').style.display = open ? 'none' : 'block';
        }
        hoursUI(); setInterval(hoursUI, 60000);

        // ---- card clicks ----
        $('#menu').addEventListener('click', function (e) {
            var card = e.target.closest('.meal-card'); if (!card || !card._d) return;
            var b = e.target.closest('[data-a]'), f = e.target.closest('.fav-btn');
            if (f) { var id = card._d.id, i = favs.indexOf(id); i > -1 ? favs.splice(i, 1) : favs.push(id); store.set('o2_favs', favs); refreshCard(card); updateFavUI(); }
            else if (b) change(keyOf(card), card, b.dataset.a === 'minus' ? -1 : 1);
        });
        $('#menu').addEventListener('change', function (e) {
            if (!e.target.classList.contains('size-sel')) return;
            var card = e.target.closest('.meal-card'); card._d.si = +e.target.value; refreshCard(card);
        });

        // ---- favourites filter ----
        var menu = $('#menu'), favChip = $('#fav-chip');
        function updateFavUI() {
            $('#fav-count').textContent = favs.length;
            document.querySelectorAll('#menu .menu-section').forEach(function (s) { s.classList.toggle('no-fav', !s.querySelector('.meal-card.is-fav')); });
            menu.classList.toggle('fav-none', favs.length === 0);
        }
        favChip.onclick = function () {
            var on = !menu.classList.contains('fav-mode');
            if (on) { var s = $('#menu-search-input'); if (s && s.value) { s.value = ''; s.dispatchEvent(new Event('input')); } }
            o2VT(function () { menu.classList.toggle('fav-mode', on); favChip.classList.toggle('active', on); updateFavUI(); });
        };
        var si = $('#menu-search-input');
        if (si) si.addEventListener('input', function () { menu.classList.remove('fav-mode'); favChip.classList.remove('active'); });

        // ---- category bar highlight ----
        var chips = [].slice.call(document.querySelectorAll('.cat-chip[data-cat]')), curCat = null;
        chips.forEach(function (c) { c.addEventListener('click', function () { menu.classList.remove('fav-mode'); favChip.classList.remove('active'); }); });
        function spy() {
            var probe = 200, act = null;
            document.querySelectorAll('#menu .menu-section').forEach(function (s) { var r = s.getBoundingClientRect(); if (r.top <= probe && r.bottom > probe) act = s.id; });
            if (act === curCat) return; curCat = act;
            chips.forEach(function (c) { var on = c.dataset.cat === act; c.classList.toggle('active', on && !menu.classList.contains('fav-mode')); if (on) c.scrollIntoView({ inline: 'center', block: 'nearest', behavior: 'smooth' }); });
        }
        window.addEventListener('scroll', spy, { passive: true });
        updateFavUI(); renderCart(); spy();
    })();

    (function () {
        var $ = function (s, r) { return (r || document).querySelector(s); };
        var vib = function (n) { try { navigator.vibrate && navigator.vibrate(n || 15); } catch (e) {} };
        function confetti(x, y) { var c = ['#e60000', '#facc15', '#fff', '#25D366']; for (var i = 0; i < 26; i++) { var d = document.createElement('div'); d.className = 'cf'; d.style.cssText = 'left:' + x + 'px;top:' + y + 'px;background:' + c[i % 4]; document.body.appendChild(d); var a = Math.random() * 6.28, v = 80 + Math.random() * 160; d.animate([{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * v + 'px,' + (Math.sin(a) * v + 140) + 'px) rotate(' + Math.random() * 720 + 'deg)', opacity: 0 }], { duration: 1100, easing: 'cubic-bezier(.22,1,.36,1)' }).onfinish = (function (el) { return function () { el.remove(); }; })(d); } }
        document.addEventListener('click', function (e) { if (e.target.closest('.add-btn,.fav-btn,.stepper button')) { vib(); } });

        // ---- modal ----
        var M = document.createElement('div'); M.id = 'o2-modal'; M.innerHTML = '<div class="box" data-lenis-prevent></div>'; document.body.appendChild(M);
        var box = $('.box', M);
        function openM(html) { box.innerHTML = '<div class="flex justify-end"><button id="m-x" class="text-2xl text-zinc-400" aria-label="إغلاق">×</button></div>' + html; M.classList.add('open'); document.documentElement.style.overflow = 'hidden'; $('#m-x').onclick = closeM; }
        function closeM() { M.classList.remove('open'); document.documentElement.style.overflow = ''; }
        M.addEventListener('click', function (e) { if (e.target === M) closeM(); });

        // ---- what should I eat (swipe): see swipe.js ----
        window.O2UI = { $: $, openM: openM, closeM: closeM, vib: vib, confetti: confetti };
        $('#open-swipe').onclick = function () { window.O2Swipe && O2Swipe.open(); };

                // ---- scroll reveal: نظام واحد لكل الموقع (تتابع + easing موحّد) ----
        (function () {
            var sel = '[data-reveal],.reward-card,#how .grid > div,#menu .o2-tool,#menu .meal-card:not(.cake-card),.fb-box,#menu .menu-section';
            var els = [].slice.call(document.querySelectorAll(sel));
            els.forEach(function (el) { if (!el.hasAttribute('data-reveal')) el.setAttribute('data-reveal', ''); });
            if (!('IntersectionObserver' in window)) { els.forEach(function (el) { el.classList.add('in'); }); return; }
            var io = new IntersectionObserver(function (es) {
                var n = 0;
                es.filter(function (e) { return e.isIntersecting; })
                  .sort(function (a, b) { return a.boundingClientRect.top - b.boundingClientRect.top || a.boundingClientRect.left - b.boundingClientRect.left; })
                  .forEach(function (e) {
                      var el = e.target; io.unobserve(el);
                      var base = parseFloat(el.style.getPropertyValue('--i')) || 0;
                      el.style.setProperty('--i', base + Math.min(n++, 5));
                      el.classList.add('in');
                      // بعد ما يخلص التتابع بنشيل الـ reveal عشان hover والترانزشن الأصلية للكرت ترجع
                      setTimeout(function () { el.removeAttribute('data-reveal'); el.style.removeProperty('--i'); }, 700 + (base + 5) * 80 + 150);
                  });
            }, { threshold: .08, rootMargin: '0px 0px -4% 0px' });
            var started = false;
            function boot() { if (started) return; started = true; els.forEach(function (el) { io.observe(el); }); }
            if (window.__o2IntroPlaying) { window.addEventListener('o2-intro-reveal', boot, { once: true }); setTimeout(boot, 14000); } else boot();
        })();

    })();

    if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) { var hv = document.getElementById('hero-video'); if (hv) hv.remove(); }

    (function () {
        var v = document.getElementById('hero-bg'); if (!v) return;
        v.muted = true; var p = v.play(); if (p && p.catch) p.catch(function () {});
        if ('IntersectionObserver' in window) new IntersectionObserver(function (es) { es[0].isIntersecting ? v.play().catch(function () {}) : v.pause(); }).observe(v);
    })();

    (function () {
        // ===== وسوم الأصناف — عدّل القوائم حسب منيوك (الاسم لازم يطابق عنوان الكرت) =====
        var TOP = ['بيغ ماك','كاليزوني دجاج', 'شاورما نابلسي'];   // 🔥 الأكثر طلباً (أمثلة — غيّرها)
        var NEW = ['كنافة دبي', 'كريب دبي'];                                // ✨ جديد (أمثلة — غيّرها)
        // 🌶️ حار: تلقائياً من الاسم أو المكونات (زينجر， هالبينو，    شطة...)
        var HOT = /باربيكيو|هالبينو|هلابينو|سبايسي/;
        // 🌱 نباتي: أصناف القسم الإيطالي اللي ما فيها لحوم/دجاج/تونة
        var MEAT = /لحم|دجاج|سلامي|تونة|مرتديلا|ستيك|بيف|هام|لانشون|سجق|نقانق|مدخن|جمبري|بيبروني|بروستد/;
        document.querySelectorAll('#menu .meal-card').forEach(function (card) {
            var t = (card.querySelector('.meal-title') || {}).textContent || '', ing = (card.querySelector('.meal-ingredients') || {}).textContent || '';
            t = t.trim(); var sec = card.closest('.menu-section'), tags = [];
            if (TOP.indexOf(t) > -1) tags.push(['top', '🔥 الأكثر طلباً']);
            if (NEW.indexOf(t) > -1) tags.push(['new', '✨ جديد']);
            if (HOT.test(t + ' ' + ing)) tags.push(['hot', '🌶️ حار']);
            if (sec && sec.id === 'italian' && !MEAT.test(t + ' ' + ing)) tags.push(['veg', '🌱 نباتي']);
            if (!tags.length) return;
            var box = document.createElement('div'); box.className = 'mtags ';
            box.innerHTML = tags.map(function (g) { return '<span class="mtag  h-fit block ' + g[0] + '">' + g[1] + '</span>'; }).join('');
            card.insertBefore(box, card.firstChild);
        });
        // // ===== صورة دائرية صغيرة على الكرت وهو مسكّر (بتتحمّل لما الكرت يقرب من الشاشة) =====
        // var thumbIO = 'IntersectionObserver' in window ? new IntersectionObserver(function (es) {
        //     es.forEach(function (e) { if (e.isIntersecting) { thumbIO.unobserve(e.target); e.target.src = e.target.dataset.src; } });
        // }, { rootMargin: '250px' }) : null;
        // document.querySelectorAll('#menu .meal-card').forEach(function (card) {
        //     var big = card.querySelector('.meal-img'), icon = card.querySelector('.accordion-btn > div > .ic');
        //     if (!big || !big.dataset.src || !icon) return;
        //     var th = document.createElement('span'); th.className = 'mthumb';
        //     var im = document.createElement('img'); im.alt = ''; im.decoding = 'async'; im.dataset.src = big.dataset.src;
        //     im.onload = function () { im.classList.add('ok'); };
        //     im.onerror = function () { if (th.parentNode) th.parentNode.replaceChild(icon, th); };      // لو الصورة ما اشتغلت بيرجع الأيقونة القديمة
        //     th.appendChild(im); icon.parentNode.replaceChild(th, icon);
        //     if (thumbIO) thumbIO.observe(im); else im.src = im.dataset.src;
        // });


        // ===== رأيك يهمنا =====
        // لما تجهّز الداتا بيز: حطّ رابط الـ API هون (مثال: '/api/feedback'). السيرفر لازم يعرف المستخدم من جلسته (الكوكي/التوكن)
        // ويربط الرسالة فيه، وما نعتمد على أي هوية بيبعتها المتصفح. لحد هالوقت الرسائل بتنحفظ على جهاز الزبون بس.
        var FEEDBACK_ENDPOINT = '';
        var $ = function (id) { return document.getElementById(id); };
        var rate = 0, msg = $('fb-msg'), err = $('fb-err'), btn = $('fb-send'), ok = $('fb-ok');
        $('fb-rate').addEventListener('click', function (e) {
            var b = e.target.closest('button'); if (!b) return; rate = +b.dataset.v;
            [].forEach.call(this.children, function (x) { x.classList.toggle('on', x === b); });
        });
        msg.addEventListener('input', function () { $('fb-cnt').textContent = msg.value.length + ' / 500'; err.textContent = ''; ok.hidden = true; });
        function queueLocally(p) {
            try { var q = JSON.parse(localStorage.getItem('o2_feedback_queue')) || []; q.push(p); localStorage.setItem('o2_feedback_queue', JSON.stringify(q.slice(-20))); } catch (e) {}
        }
        function sendFeedback(p) {
            if (!FEEDBACK_ENDPOINT) { queueLocally(p); return Promise.resolve(); }
            return fetch(FEEDBACK_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify(p) })
                .then(function (r) { if (!r.ok) throw new Error(r.status); });
        }
        btn.addEventListener('click', function () {
            var text = msg.value.trim();
            if (text.length < 3) { err.textContent = 'اكتب رسالتك أول 🙂'; msg.focus(); return; }
            var label = btn.innerHTML; btn.disabled = true; btn.textContent = 'جاري الإرسال...'; err.textContent = '';
            sendFeedback({ message: text, rating: rate || null, createdAt: new Date().toISOString() }).then(function () {
                ok.hidden = false; msg.value = ''; $('fb-cnt').textContent = '0 / 500'; rate = 0;
                [].forEach.call($('fb-rate').children, function (x) { x.classList.remove('on'); });
            }).catch(function () { err.textContent = 'ما قدرنا نرسل رسالتك، جرّب مرة ثانية.'; })
              .then(function () { btn.disabled = false; btn.innerHTML = label; });
        });
    })();

(function () {
    const AUTO_DELAY = 3500;   // كل قديش يتحرك تلقائي (بالميلي ثانية)
    const RESUME_DELAY = 5000; // بعد قديش يرجع يشتغل لما المستخدم يوقف اللمس
 
    document.querySelectorAll('[data-cake-carousel]').forEach(function (root) {
        const track = root.querySelector('[data-cake-track]');
        const progress = root.querySelector('[data-cake-progress]');
        const section = root.closest('section');
        const prevBtn = section.querySelector('[data-cake-prev]');
        const nextBtn = section.querySelector('[data-cake-next]');
 
        const isRTL = () => getComputedStyle(track).direction === 'rtl';
        const step = () => {
            const card = track.querySelector('.cake-card');
            return card.getBoundingClientRect().width + parseFloat(getComputedStyle(track).columnGap || 20);
        };
        const atEnd = () => Math.abs(track.scrollLeft) + track.clientWidth >= track.scrollWidth - 8;
 
        // dir: +1 = التالي (باتجاه نهاية القائمة)، -1 = السابق
        function move(dir) {
            const sign = isRTL() ? -1 : 1;
            track.scrollBy({ left: sign * dir * step(), behavior: 'smooth' });
        }
        function next() { atEnd() ? track.scrollTo({ left: 0, behavior: 'smooth' }) : move(1); }
        function prev() { Math.abs(track.scrollLeft) < 8 ? track.scrollTo({ left: isRTL() ? -track.scrollWidth : track.scrollWidth, behavior: 'smooth' }) : move(-1); }
 
        // ---------- التمرير التلقائي ----------
        let timer = null, resumeTimer = null, visible = false;
        function start() { stop(); timer = setInterval(next, AUTO_DELAY); }
        function stop() { clearInterval(timer); timer = null; }
        function pauseThenResume() {
            stop(); clearTimeout(resumeTimer);
            resumeTimer = setTimeout(function () { if (visible) start(); }, RESUME_DELAY);
        }
 
        // يشتغل بس لما القسم ظاهر على الشاشة
        new IntersectionObserver(function (entries) {
            visible = entries[0].isIntersecting;
            visible ? start() : stop();
        }, { threshold: 0.3 }).observe(root);
 
        // يوقف لما المستخدم يتفاعل
        root.addEventListener('mouseenter', stop);
        root.addEventListener('mouseleave', function () { if (visible) start(); });
        ['touchstart', 'pointerdown', 'wheel'].forEach(function (ev) {
            track.addEventListener(ev, pauseThenResume, { passive: true });
        });
 
        // ---------- الأزرار ----------
        if (nextBtn) nextBtn.addEventListener('click', function () { next(); pauseThenResume(); });
        if (prevBtn) prevBtn.addEventListener('click', function () { prev(); pauseThenResume(); });
 
        // ---------- شريط التقدّم ----------
        function updateProgress() {
            const max = track.scrollWidth - track.clientWidth;
            const pct = max > 0 ? (Math.abs(track.scrollLeft) / max) * 100 : 100;
            progress.style.width = Math.max(8, pct) + '%';
        }
        track.addEventListener('scroll', updateProgress, { passive: true });
        updateProgress();

        // ---------- تأثير 3D على الموبايل فقط ----------
        const mobileMQ = window.matchMedia('(max-width: 767px)');
        const cardsEls = Array.from(track.querySelectorAll('.cake-card'));
        let ticking = false;
        function apply3D() {
            ticking = false;
            if (!mobileMQ.matches) {            // ديسكتوب: رجّع كل شي طبيعي
                cardsEls.forEach(function (c) { c.style.transform = ''; c.style.opacity = ''; c.style.zIndex = ''; c.classList.remove('is-center'); });
                return;
            }
            const tr = track.getBoundingClientRect();
            const mid = tr.left + tr.width / 2;
            cardsEls.forEach(function (c) {
                const r = c.getBoundingClientRect();
                const d = ((r.left + r.width / 2) - mid) / (r.width + 12);   // 0 = بالنص، ±1 = الكارد اللي جنبه
                const a = Math.min(Math.abs(d), 1);
                const lift = a * 34;                                         // الجنبين ينزلوا لتحت
                const scale = 1.04 - a * 0.16;                               // الأوسط أكبر شوي
                const rot = Math.max(-1, Math.min(1, d)) * -16;              // الجنبين يميلوا باتجاه النص
                c.style.transform = 'perspective(900px) translateY(' + lift + 'px) scale(' + scale + ') rotateY(' + rot + 'deg)';
                c.style.opacity = String(1 - a * 0.4);
                c.style.zIndex = String(Math.round((1 - a) * 10));
                c.classList.toggle('is-center', a < 0.25);
            });
        }
        function request3D() { if (!ticking) { ticking = true; requestAnimationFrame(apply3D); } }
        track.addEventListener('scroll', request3D, { passive: true });
        window.addEventListener('resize', request3D);
        if (mobileMQ.addEventListener) mobileMQ.addEventListener('change', request3D);
        apply3D();
    });
})();


// ===== الزجاجة المجتمعية (وجبة معلّقة) + بطاقة من O2 =====
// ملاحظة: لسا ما في قاعدة بيانات، فالأرقام محفوظة بمتصفح الزبون (localStorage).
// لما تنبني القاعدة: بدّل Community.read / Community.donate (تحت) بطلبات API، وخلّي الهدية بالرسالة تنفتح بتوكن موقّع من السيرفر.
(function () {
    'use strict';
    var $ = function (s, r) { return (r || document).querySelector(s); };
    var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };
    var reduce = window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches;
    var store = {
        get: function (k, d) { try { var v = JSON.parse(localStorage.getItem(k)); return v == null ? d : v; } catch (e) { return d; } },
        set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    };
    var toastT;
    function toast(m) { var t = document.getElementById('o2-toast'); if (!t) return; t.textContent = m; t.classList.add('show'); clearTimeout(toastT); toastT = setTimeout(function () { t.classList.remove('show'); }, 2200); }
    function vib(n) { try { navigator.vibrate && navigator.vibrate(n || 15); } catch (e) {} }
    function sound(n) { try { window.O2Sound && O2Sound.play(n); } catch (e) {} }
    function confetti(x, y) { try { window.O2UI && O2UI.confetti(x, y); } catch (e) {} }

    // ---- النقاط: بنستخدم نظام الولاء الموجود، وإذا مش موجود بنعدّل العدّاد مباشرة ----
    function balance() {
        if (window.O2Loyalty && typeof O2Loyalty.balance === 'function') return O2Loyalty.balance();
        var c = document.getElementById('points-counter');
        return c ? (parseInt(c.textContent.replace(/[^\d]/g, ''), 10) || 0) : 0;
    }
    function shift(delta) {   // احتياطي بدون O2Loyalty
        var c = document.getElementById('points-counter'); if (!c) return;
        var cur = balance();
        try { animateValue(c, cur, cur + delta, 1000); o2UpdateLockMeters(cur + delta); animateProgressBar(cur + delta, maxTierPoints); } catch (e) { c.textContent = fmt(cur + delta); }
    }
    function spend(n, label) { if (window.O2Loyalty && typeof O2Loyalty.spend === 'function') O2Loyalty.spend(n, label); else shift(-n); }
    function earn(n, label) { if (window.O2Loyalty && typeof O2Loyalty.earn === 'function') O2Loyalty.earn(n, label); else shift(n); }

    function tween(el, from, to, ms, f) {
        if (!el) return;
        if (reduce || from === to) { el.textContent = f(to); return; }
        var t0 = performance.now();
        (function step(now) {
            var k = Math.min((now - t0) / ms, 1), e = 1 - Math.pow(1 - k, 4);
            el.textContent = f(from + (to - from) * e);
            if (k < 1) requestAnimationFrame(step);
        })(t0);
    }

    /* ================= 1) الزجاجة المجتمعية ================= */
    var cm = $('#community');
    if (cm) (function () {
        var MEAL = 500, CAP = 10000, SEED = 6200, KEY = 'o2.community.v1';   // SEED = رقم تجريبي ابتدائي لحد ما تنبني القاعدة
        var Community = {
            read: function () { var d = store.get(KEY, null); if (!d) { d = { total: SEED, mine: 0, last: null }; store.set(KEY, d); } return d; },
            donate: function (pts) { var d = this.read(); d.total += pts; d.mine += pts; d.last = { pts: pts, t: Date.now() }; store.set(KEY, d); return d; }
        };
        var bottle = $('#cb-bottle'), fill = $('#cb-fill'), pctEl = $('#cb-pct'), mealsEl = $('#cb-meals'), curEl = $('#cb-cur'), mineEl = $('#cb-mine'),
            giveBtn = $('#cb-give'), amtEl = $('#cb-amt'), msgEl = $('#cb-msg'), winEl = $('#cb-win'), lastEl = $('#cb-last');
        var chosen = 100, level = 0, mealsShown = 0, curShown = 0, mineShown = 0;
        $('#cb-cap').textContent = fmt(CAP);

        function pctOf(t) { return (t % CAP) / CAP * 100; }
        function setLevel(p) {
            bottle.classList.toggle('empty', p <= 0.5);
            fill.style.height = p + '%';
            tween(pctEl, level, p, 1600, function (v) { return Math.round(v); });
            level = p;
        }
        function ago(ts) {
            var m = Math.floor((Date.now() - ts) / 60000);
            return m < 1 ? 'هلأ' : m < 60 ? 'قبل ' + m + ' دقيقة' : m < 1440 ? 'قبل ' + Math.floor(m / 60) + ' ساعة' : 'قبل ' + Math.floor(m / 1440) + ' يوم';
        }
        function stats(d, keepCur) {
            var meals = Math.floor(d.total / MEAL), cur = d.total % CAP;
            tween(mealsEl, mealsShown, meals, 1200, fmt); mealsShown = meals;
            if (!keepCur) { tween(curEl, curShown, cur, 1200, fmt); curShown = cur; }
            tween(mineEl, mineShown, d.mine, 1200, fmt); mineShown = d.mine;
            if (d.last) { lastEl.hidden = false; lastEl.textContent = 'آخر تبرّع منك: ' + fmt(d.last.pts) + ' نقطة · ' + ago(d.last.t); }
        }
        function say(t, err) { msgEl.textContent = t; msgEl.classList.toggle('err', !!err); }

        // أول ما القسم يظهر عالشاشة، الزجاجة بتمتلي من الصفر للمستوى الحالي
        var first = Community.read();
        function reveal() { stats(first); setLevel(pctOf(first.total)); }
        if ('IntersectionObserver' in window) {
            var io = new IntersectionObserver(function (es) { if (es[0].isIntersecting) { io.disconnect(); reveal(); } }, { threshold: .25 });
            io.observe(cm);
        } else reveal();

        var chips = [].slice.call(document.querySelectorAll('.cb-chip'));
        chips.forEach(function (c) {
            c.addEventListener('click', function () {
                chosen = +c.dataset.v;
                chips.forEach(function (x) { x.setAttribute('aria-pressed', x === c ? 'true' : 'false'); });
                amtEl.textContent = fmt(chosen); say(''); vib(8);
            });
        });

        giveBtn.addEventListener('click', function (e) {
            if (balance() < chosen) { say('رصيدك ما بيكفي لهالمبلغ — جرّب مبلغ أقل', true); vib([10, 40, 10]); return; }
            spend(chosen, 'تبرّع للزجاجة المجتمعية');
            var before = Community.read().total, d = Community.donate(chosen);
            var filled = Math.floor(d.total / CAP) > Math.floor(before / CAP);
            vib([15, 30, 15]); sound('win'); confetti(e.clientX, e.clientY);
            if (filled) {
                setLevel(100); bottle.classList.add('celebrate'); stats(d, true);
                winEl.textContent = '🎉 امتلأت الزجاجة! O2 رح تجهّز وتوزّع ' + (CAP / MEAL) + ' وجبة مجانية';
                winEl.classList.add('show');
                setTimeout(function () { bottle.classList.remove('celebrate'); var now = Community.read(); setLevel(pctOf(now.total)); stats(now); }, 2800);   // نقرأ الرقم الحالي مش القديم، لو حدا تبرّع وقت الاحتفال
                setTimeout(function () { winEl.classList.remove('show'); }, 8000);
            } else { setLevel(pctOf(d.total)); stats(d); }
            say('شكرًا إلك 💛 ضفت ' + fmt(chosen) + ' نقطة للزجاجة');
        });
    })();

    /* ================= 2) بطاقة من O2 (كلمة حلوة + هدية نقاط لصاحبك) ================= */
    var GIFTS = [0, 25, 50, 100], DAILY_CAP = 3;

    function enc(o) {
        var b = new TextEncoder().encode(JSON.stringify(o)), s = '';
        b.forEach(function (x) { s += String.fromCharCode(x); });
        return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    }
    function dec(t) {
        t = t.replace(/-/g, '+').replace(/_/g, '/'); while (t.length % 4) t += '=';
        var s = atob(t), a = new Uint8Array(s.length);
        for (var i = 0; i < s.length; i++) a[i] = s.charCodeAt(i);
        return JSON.parse(new TextDecoder().decode(a));
    }
    function readHash() {
        var m = /^#card=([A-Za-z0-9_-]{8,1500})$/.exec(location.hash); if (!m) return null;
        var o; try { o = dec(m[1]); } catch (e) { return null; }
        if (!o || typeof o.m !== 'string' || !o.m.trim()) return null;
        var g = +o.g; if (GIFTS.indexOf(g) < 0) g = 0;
        return { id: String(o.i || '').replace(/[^a-z0-9]/gi, '').slice(0, 12) || 'x', m: o.m.slice(0, 140), f: String(o.f || '').slice(0, 24), t: String(o.t || '').slice(0, 24), g: g };
    }

    // ---- شكل البطاقة (كل النصوص بتنحط بـ textContent، يعني ما في خطر كود مزروع بالرابط) ----
    function node(tag, cls, text) { var n = document.createElement(tag); if (cls) n.className = cls; if (text != null) n.textContent = text; return n; }
    function cardShell() {
        var card = node('div', 'gc-card'), top = node('div', 'gc-top'), logo = node('span', 'gc-logo');
        var img = node('img'); img.src = 'o2.png'; img.alt = ''; img.onerror = function () { img.remove(); logo.textContent = 'O2'; };
        logo.appendChild(img);
        var brand = node('span', 'gc-brand'); brand.appendChild(document.createTextNode('O')); brand.appendChild(node('span', null, '2')); brand.appendChild(document.createTextNode(' REWARDS'));
        top.appendChild(logo); top.appendChild(brand);
        var body = node('div', 'gc-body'); card.appendChild(top); card.appendChild(body);
        return { card: card, body: body };
    }
    function fillMessage(body, b) {
        body.textContent = '';
        if (b.t) body.appendChild(node('p', 'gc-to', 'إلى ' + b.t + '،'));
        body.appendChild(node('p', 'gc-text', b.m));
        body.appendChild(node('p', 'gc-from', b.f ? '— ' + b.f : '— من صديق إلك 💛'));
        if (b.g) body.appendChild(node('span', 'gc-gift', '🎁 هدية: ' + b.g + ' نقطة'));
    }

    // ---- المُرسِل ----
    function openSend() {
        if (!window.O2UI) return;
        var gift = 0;
        O2UI.openM('<h3 class="text-xl font-black text-center">ابعت بطاقة لصاحبك 💌</h3>' +
            '<p class="bm-sub">اكتب كلمة حلوة وبنجهّزها بطاقة من O2، وبتوصل لصاحبك برابط واتساب.</p>' +
            '<label class="bm-lbl">لمين؟ <small>(اختياري)</small><input id="bm-to" class="bm-in" maxlength="24" placeholder="اسم صاحبك" autocomplete="off"></label>' +
            '<label class="bm-lbl">رسالتك<textarea id="bm-msg" class="bm-in" rows="3" maxlength="140" placeholder="اكتب رسالتك هون..."></textarea><span class="bm-count"><b id="bm-n">0</b>/140</span></label>' +
            '<label class="bm-lbl">من؟ <small>(اختياري)</small><input id="bm-from" class="bm-in" maxlength="24" placeholder="اسمك" autocomplete="off"></label>' +
            '<div class="bm-lbl">هدية نقاط <small>(بتنخصم من رصيدك)</small></div>' +
            '<div class="bm-gifts" id="bm-gifts">' + GIFTS.map(function (g) { return '<button type="button" data-g="' + g + '" aria-pressed="' + (g === 0) + '">' + (g ? '+' + g + ' نقطة' : 'بدون هدية') + '</button>'; }).join('') + '</div>' +
            '<div class="bm-err" id="bm-err" aria-live="polite"></div>' +
            '<button type="button" class="bm-go" id="bm-go">جهّز البطاقة 💌</button>');
        var msgIn = $('#bm-msg'), nEl = $('#bm-n'), go = $('#bm-go'), err = $('#bm-err');
        msgIn.addEventListener('input', function () { nEl.textContent = msgIn.value.length; err.textContent = ''; });
        var gbs = [].slice.call(document.querySelectorAll('#bm-gifts button'));
        gbs.forEach(function (b) {
            b.addEventListener('click', function () {
                gift = +b.dataset.g; err.textContent = '';
                gbs.forEach(function (x) { x.setAttribute('aria-pressed', x === b ? 'true' : 'false'); });
                go.textContent = gift ? 'جهّز البطاقة (−' + gift + ' نقطة) 💌' : 'جهّز البطاقة 💌'; vib(8);
            });
        });
        go.addEventListener('click', function () {
            var m = msgIn.value.trim().replace(/\s+/g, ' ');
            if (m.length < 3) { err.textContent = 'اكتب رسالة (3 أحرف عالأقل)'; return; }
            if (gift > balance()) { err.textContent = 'رصيدك ما بيكفي لهالهدية'; return; }
            var o = { i: Math.random().toString(36).slice(2, 10), m: m.slice(0, 140), f: $('#bm-from').value.trim().slice(0, 24), t: $('#bm-to').value.trim().slice(0, 24), g: gift };
            if (gift) spend(gift, 'هدية بطاقة O2');
            showResult(location.href.split('#')[0] + '#card=' + enc(o), o);
        });
    }
    function showResult(link, o) {
        var text = '💌 وصلتك بطاقة من O2!\nافتحها من هون: ' + link;
        O2UI.openM('<div class="bm-done"><h3>البطاقة جاهزة ✨</h3><div id="gc-prev" class="gc-prev"></div>' +
            '<p>ابعتها لصاحبك، وهيك بتظهر إله لما يفتح الرابط.' + (o.g ? '<br>هديتك (' + o.g + ' نقطة) بتنتقل إله لما يفتحها.' : '') + '</p>' +
            '<a class="bm-wa" target="_blank" rel="noopener" href="https://wa.me/?text=' + encodeURIComponent(text) + '">ابعتها عبر واتساب</a>' +
            '<button type="button" class="bm-copy" id="bm-copy">نسخ الرابط</button></div>');
        var s = cardShell(); fillMessage(s.body, o); $('#gc-prev').appendChild(s.card);
        vib([15, 30, 15]); sound('win');
        $('#bm-copy').addEventListener('click', function () {
            var done = function () { toast('انسخ الرابط ✓'); };
            if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(link).then(done, function () { window.prompt('انسخ الرابط:', link); });
            else window.prompt('انسخ الرابط:', link);
        });
    }

    // ---- المستقبِل ----
    var viewOpen = false;
    function showCard(b) {
        if (viewOpen) return; viewOpen = true;
        var view = node('div', 'gc-view'), stage = node('div', 'gc-stage'), shell = cardShell();
        view.setAttribute('role', 'dialog'); view.setAttribute('aria-modal', 'true'); view.setAttribute('aria-label', 'بطاقة من O2'); view.setAttribute('data-lenis-prevent', '');
        var x = node('button', 'gc-x', '×'); x.type = 'button'; x.setAttribute('aria-label', 'إغلاق');
        view.appendChild(x); stage.appendChild(shell.card); view.appendChild(stage); document.body.appendChild(view);
        var prevOverflow = document.documentElement.style.overflow;
        document.documentElement.style.overflow = 'hidden';
        function close() {
            view.remove(); viewOpen = false; document.documentElement.style.overflow = prevOverflow;
            document.removeEventListener('keydown', onKey);
            try { history.replaceState(null, '', location.pathname + location.search); } catch (e) {}
        }
        function onKey(e) { if (e.key === 'Escape') close(); }
        document.addEventListener('keydown', onKey); x.addEventListener('click', close);

        // الحالة المغلقة
        shell.body.appendChild(node('p', 'gc-hello', b.f ? 'وصلتك بطاقة من ' + b.f + ' 💌' : 'وصلتك بطاقة 💌'));
        shell.body.appendChild(node('p', 'gc-tip', b.g ? 'وفيها هدية نقاط 🎁' : 'كلمة حلوة من صاحبك'));
        var openBtn = node('button', 'gc-open', 'افتح البطاقة'); openBtn.type = 'button'; shell.body.appendChild(openBtn); openBtn.focus();

        openBtn.addEventListener('click', function (e) {
            fillMessage(shell.body, b); shell.card.classList.add('is-open');
            var note = node('p', 'gc-note'); note.setAttribute('aria-live', 'polite');
            var acts = node('div', 'gc-acts'), claim = node('button', 'gc-claim'); claim.type = 'button'; claim.hidden = true;
            var reply = node('button', 'gc-reply', 'ابعت بطاقة ردّ 💌'); reply.type = 'button';
            acts.appendChild(claim); acts.appendChild(reply); shell.body.appendChild(note); shell.body.appendChild(acts);
            vib([20, 40, 20]); sound('win'); confetti(e.clientX, e.clientY);
            if (b.g) {
                var claimed = store.get('o2.cards.claimed', []), day = new Date().toISOString().slice(0, 10), dd = store.get('o2.cards.day', { d: day, n: 0 });
                if (dd.d !== day) dd = { d: day, n: 0 };
                if (claimed.indexOf(b.id) > -1) note.textContent = 'استلمت هدية هالبطاقة قبل 💛';
                else if (dd.n >= DAILY_CAP) note.textContent = 'وصلت الحد اليومي لاستلام الهدايا (' + DAILY_CAP + ')، الرسالة إلك بس الهدية بكرا.';
                else {
                    claim.hidden = false; claim.textContent = 'استلم هديتك +' + b.g + ' نقطة 🎁';
                    claim.addEventListener('click', function (ev) {
                        claimed.push(b.id); store.set('o2.cards.claimed', claimed.slice(-50)); dd.n++; store.set('o2.cards.day', dd);
                        earn(b.g, 'بطاقة من O2'); claim.hidden = true;
                        note.textContent = 'تمام! ضفنا ' + b.g + ' نقطة لرصيدك 🎉'; confetti(ev.clientX, ev.clientY); vib([15, 30, 15]); sound('win');
                    });
                }
            }
            reply.addEventListener('click', function () { close(); openSend(); });
        });
    }

    var sendBtn = $('#open-card');
    if (sendBtn) sendBtn.addEventListener('click', openSend);

    var launched = false;
    function launch() { if (launched) return; var b = readHash(); if (!b) return; launched = true; showCard(b); }
    if (readHash()) {
        if (window.__o2IntroPlaying) { window.addEventListener('o2-intro-reveal', function () { setTimeout(launch, 700); }, { once: true }); setTimeout(launch, 14000); }
        else setTimeout(launch, 500);
    }
    window.addEventListener('hashchange', function () { var b = readHash(); if (b) { launched = true; showCard(b); } });
})();