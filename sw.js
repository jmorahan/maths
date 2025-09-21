const version = 'v17';
const slug = 'maths';
const appName = 'maths';
const cacheName = `${appName}/${version}`;

self.addEventListener('install', (event) => {
  console.log(`installing service worker version ${version}`);
  event.waitUntil((async () => {
    const cache = await caches.open(cacheName);
    const paths = [
      '',
      `${appName}.webmanifest`,
      'index.html',
      'script.js',
      'style.css',
      'PatrickHand-Regular.ttf',
      'correct.opus',
      'wrong.opus',
      'levelup.opus',
      'record.opus',
      'unlock.opus',
      'icons/icon-32.png',
      'icons/icon-128.png',
      'icons/icon-512.png',
    ];
    await Promise.all(paths.map(async (path) => {
      const response = await fetch(`/${slug}/${path}?version=${version}`);
      if (!response.ok) {
        throw new TypeError(`bad response status for ${path}`);
      }
      await cache.put(`/${slug}/${path}`, response);
    }));
  })());
});

self.addEventListener('fetch', (event) => {
  event.respondWith((async () => {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(event.request);
    if (cachedResponse) {
      return cachedResponse; // Return cached response if found
    }
    const fetchedResponse = await fetch(event.request);
    await cache.put(event.request, fetchedResponse.clone());
    return fetchedResponse;
  })());
});

self.addEventListener('activate', (event) => {
  console.log(`activating service worker version ${version}`);
  event.waitUntil((async () => {
    const keyList = await caches.keys();
    await Promise.all(keyList.map(async (key) => {
      if ((
        key.startsWith(`${appName}/`)
        || key.indexOf('/') === -1 // legacy format
      ) && key !== cacheName) {
        console.log(`deleting old cache ${key}`);
        await caches.delete(key); // Delete old caches
      }
    }));
  })());
});
