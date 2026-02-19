const CACHE_NAME = 'v1'; // 6- إضافة version للكاش
const urlsToCache = [
    './',
    './index.html',
    './style.css',
    './script.js'
];

// 3- تخزين كل الملفات في Cache عند أول تحميل (install)
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => {
                console.log('تم فتح الكاش وإضافة الملفات');
                return cache.addAll(urlsToCache);
            })
    );
});

// 7- حذف الكاش القديم عند تحديث النسخة (activate)
self.addEventListener('activate', event => {
    const cacheWhitelist = [CACHE_NAME];
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    if (cacheWhitelist.indexOf(cacheName) === -1) {
                        console.log('تم حذف الكاش القديم:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// 4 و 5 - استراتيجية Cache First ودعم العمل بدون إنترنت
self.addEventListener('fetch', event => {
    event.respondWith(
        caches.match(event.request)
            .then(response => {
                // إذا الملف موجود في الكاش يرجع من الكاش
                if (response) {
                    return response;
                }

                // استنساخ الطلب للشبكة
                const fetchRequest = event.request.clone();

                // إذا غير موجود يجلبه من الإنترنت
                return fetch(fetchRequest).then(
                    function(networkResponse) {
                        // التأكد من أن الاستجابة صحيحة
                        if (!networkResponse || networkResponse.status !== 200 || networkResponse.type !== 'basic') {
                            return networkResponse;
                        }

                        // استنساخ الاستجابة لتخزينها في الكاش
                        const responseToCache = networkResponse.clone();

                        caches.open(CACHE_NAME)
                            .then(cache => {
                                // يخزنه في الكاش للمرات القادمة
                                cache.put(event.request, responseToCache);
                            });

                        return networkResponse;
                    }
                ).catch(() => {
                    // 8- إذا المستخدم Offline والملف غير موجود يرجع index.html كـ fallback
                    if (event.request.mode === 'navigate' || event.request.headers.get('accept').includes('text/html')) {
                        return caches.match('./index.html');
                    }
                });
            })
    );
});
