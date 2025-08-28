const CACHE_NAME = 'workouttrackr-v1';
const urlsToCache = [
  './',
  './index.html',
  './styles.css',
  './js/activity-tracker.js',
  './js/ExerciseTypeManager.js',
  './js/NotificationManager.js',
  './js/ValidationManager.js',
  './js/WorkoutDataManager.js',
  './js/UIManager.js',
  './js/ChartManager.js',
  './js/CSVManager.js',
  './js/WorkoutTrackerApp.js',
  './js/ResponsiveEnhancements.js',
  './pushup.png',
  './manifest.json'
];

// Install event - cache resources
self.addEventListener('install', event => {
  console.log('Service Worker installing...');
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Caching app shell');
        return cache.addAll(urlsToCache);
      })
  );
});

// Fetch event - serve from cache, fallback to network
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Return cached version or fetch from network
        return response || fetch(event.request);
      })
      .catch(() => {
        // If both cache and network fail, could return offline page
        if (event.request.destination === 'document') {
          return caches.match('./index.html');
        }
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', event => {
  console.log('Service Worker activating...');
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          if (cacheName !== CACHE_NAME) {
            console.log('Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});
