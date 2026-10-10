const CACHE_NAME = 'o2-rewards-v2';
const ASSETS_TO_CACHE = [
  './',
  './index.html',
  './manifest.json',
  './assets/css/styles.css',
  './assets/css/tailwind.css',
  './assets/css/loyalty.css',
  './assets/js/sound.js',
  './assets/js/script.js',
  './assets/js/loyalty.js',
  './assets/js/swipe.js',
  './assets/js/motion.js',
  './assets/media/icon-192.png',
  './assets/media/icon-512.png'
];

// تثبيت الـ Service Worker وتخزين الملفات
self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      console.log('[Service Worker] Caching app assets');
      // كل ملف لحاله: لو ملف ناقص (مثلاً أيقونة) ما يفشل التثبيت كله
      return Promise.all(ASSETS_TO_CACHE.map((url) => cache.add(url).catch(() => console.warn('[Service Worker] skip', url))));
    })
  );
  self.skipWaiting();
});

// التفعيل وتحديث الكاش القديم
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys.map((key) => {
          if (key !== CACHE_NAME) {
            return caches.delete(key);
          }
        })
      );
    })
  );
  self.clients.claim();
});

// استرجاع البيانات من الكاش عند انقطاع الإنترنت
self.addEventListener('fetch', (event) => {
  event.respondWith(
    caches.match(event.request).then((cachedResponse) => {
      return cachedResponse || fetch(event.request);
    })
  );
});