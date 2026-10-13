/* referral.js — دعوة الأصدقاء
   - كل مستخدم إله كود دعوة ورابط (?ref=CODE) بيشاركه
   - لما صديق يكمل التسجيل عن طريق الرابط، المُحيل بياخد REWARD نقطة هدية تلقائياً
   ملاحظة مهمة: الموقع حالياً واجهة بدون سيرفر، فتأكيد "صديق سجّل" لازم يجي من الخلفية.
   لما تجهّز الـ API: حط عنوانه بـ ENDPOINT. الموقع بيسأله عن تسجيلات الكود بتاعك (GET ?code=XXXX → {registered:[{id,name}]})
   وكل تسجيل جديد بيضيف النقاط مرة وحدة بس (بنمنع التكرار بالـ id). برضو بتقدر تنادي O2Referral.registered(name, id) مباشرة. */
(function () {
    'use strict';
    var REWARD = 500, KEY = 'o2.referral.v1', BY_KEY = 'o2.referral.by', ENDPOINT = '';
    var $ = function (id) { return document.getElementById(id); };
    var store = {
        get: function (k, d) { try { var v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch (e) { return d; } },
        set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} }
    };
    var fmt = function (n) { return Math.round(n).toLocaleString('en-US'); };

    function newCode() { var c = '', A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; for (var i = 0; i < 6; i++) c += A[Math.random() * A.length | 0]; return c; }
    var data = store.get(KEY, null);
    if (!data || !data.code) { data = { code: newCode(), friends: [], earned: 0 }; store.set(KEY, data); }

    function link() { return location.href.split('#')[0].split('?')[0] + '?ref=' + data.code; }
    function say(t, err) { var m = $('inv-msg'); if (!m) return; m.textContent = t || ''; m.classList.toggle('err', !!err); }

    function render() {
        var l = $('inv-link'); if (l) l.value = link();
        var n = $('inv-n'), p = $('inv-pts'); if (n) n.textContent = fmt(data.friends.length); if (p) p.textContent = fmt(data.earned);
        var wa = $('inv-wa'); if (wa) wa.href = 'https://wa.me/?text=' + encodeURIComponent('انضم لبرنامج مكافآت O2 واجمع نقاط مع كل طلب: ' + link());
        var ul = $('inv-list'); if (!ul) return;
        ul.hidden = !data.friends.length;
        ul.innerHTML = data.friends.slice(-3).reverse().map(function (f) {
            var s = document.createElement('span'); s.textContent = f.name || 'صديق';
            return '<li><span class="inv-av">' + (s.textContent.charAt(0) || '؟') + '</span><span class="inv-nm"></span><b>+' + fmt(REWARD) + '</b></li>';
        }).join('');
        [].forEach.call(ul.querySelectorAll('.inv-nm'), function (e, i) { e.textContent = data.friends.slice(-3).reverse()[i].name || 'صديق'; });
    }

    // تسجيل صديق جديد → نقاط للمُحيل (مرة وحدة لكل id)
    function registered(name, id) {
        id = String(id || Math.random().toString(36).slice(2, 10));
        if (data.friends.some(function (f) { return f.id === id; })) return false;
        data.friends.push({ id: id, name: String(name || 'صديق').slice(0, 24), t: Date.now() });
        data.earned += REWARD; store.set(KEY, data);
        if (window.O2Loyalty) O2Loyalty.earn(REWARD, 'دعوة صديق');
        render(); say('سجّل ' + (name || 'صديقك') + ' عن طريق رابطك — ضفنا ' + fmt(REWARD) + ' نقطة لحسابك');
        try { var b = $('inv-n'); if (b && window.O2UI) { var r = b.getBoundingClientRect(); O2UI.confetti(r.left + r.width / 2, r.top); O2UI.vib([15, 30, 15]); } } catch (e) {}
        return true;
    }
    function poll() {
        if (!ENDPOINT) return;
        fetch(ENDPOINT + '?code=' + encodeURIComponent(data.code)).then(function (r) { return r.json(); }).then(function (j) {
            (j && j.registered || []).forEach(function (f) { registered(f.name, f.id); });
        }).catch(function () {});
    }

    function copy() {
        var url = link(), ok = function () { say('تم نسخ الرابط — جاهز للمشاركة'); };
        if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(url).then(ok, function () { window.prompt('انسخ الرابط:', url); });
        else { var i = $('inv-link'); if (i) { i.select(); try { document.execCommand('copy'); ok(); } catch (e) { window.prompt('انسخ الرابط:', url); } } }
    }
    function share() {
        var d = { title: 'مكافآت O2', text: 'انضم لبرنامج مكافآت O2 واجمع نقاط مع كل طلب', url: link() };
        if (navigator.share) navigator.share(d).catch(function () {}); else copy();
    }

    // الصديق اللي جاي من رابط دعوة: بنحفظ كود اللي دعاه، وبنعرض ترحيب صغير
    function friendSide() {
        var m = /[?&]ref=([A-Za-z0-9]{4,12})/.exec(location.search); if (!m) return;
        var code = m[1].toUpperCase(); if (code === data.code) return;
        if (!store.get(BY_KEY, null)) store.set(BY_KEY, { code: code, t: Date.now() });
        var sec = $('invite'); if (!sec) return;
        var b = document.createElement('div'); b.className = 'inv-welcome'; b.setAttribute('role', 'status');
        b.textContent = 'وصلت عن طريق دعوة صديق. أكمل تسجيلك بالبرنامج وصديقك رح ياخد نقاط الدعوة تلقائياً.';
        sec.insertBefore(b, sec.firstChild);
    }

    function init() {
        render(); friendSide(); poll();
        var c = $('inv-copy'), s = $('inv-share'), sim = $('inv-sim'), l = $('inv-link');
        if (c) c.addEventListener('click', copy);
        if (s) s.addEventListener('click', share);
        if (l) l.addEventListener('focus', function () { l.select(); });
        if (sim && window.O2_DEMO !== false) { sim.hidden = false; sim.addEventListener('click', function () { registered(['سارة', 'محمد', 'ليلى', 'يوسف', 'نور'][data.friends.length % 5]); }); }
    }
    window.O2Referral = { registered: registered, code: function () { return data.code; }, reward: REWARD };
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
