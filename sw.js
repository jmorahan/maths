const version = 'v7';

self.addEventListener('install', (event) => {
  console.log('installing service worker version ' + version);
  event.waitUntil(
    caches.open(version).then((cache) => {
      return Promise.all([
        '/maths/',
        '/maths/maths.webmanifest',
        '/maths/index.html',
        '/maths/script.js',
        '/maths/style.css',
        '/maths/PatrickHand-Regular.ttf',
        '/maths/correct.opus',
        '/maths/wrong.opus',
        '/maths/levelup.opus',
        '/maths/record.opus',
        '/maths/icons/icon-32.png',
        '/maths/icons/icon-128.png',
        '/maths/icons/icon-512.png',
      ].map(url => {
        fetch(url + '?version=' + version).then(function(response) {
          if (!response.ok) {
            throw new TypeError('bad response status');
          }
          return cache.put(url, response);
        });
      }));
    })
  );
});


self.addEventListener('fetch', (e) => {
  e.respondWith(
    caches.match(e.request).then((r) => {
      return r || fetch(e.request).then((response) => {
        return caches.open(version).then((cache) => {
          cache.put(e.request, response.clone());
          return response;
        });
      });
    })
  );
});

self.addEventListener('activate', (e) => {
  e.waitUntil(
    caches.keys().then((keyList) => {
      return Promise.all(keyList.map((key) => {
        if (version.indexOf(key) === -1) {
          return caches.delete(key);
        }
      }));
    })
  );
});
