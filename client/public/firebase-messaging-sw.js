/* eslint-disable no-undef */
// Service Worker לקבלת התראות push כשהאפליקציה סגורה או ברקע.
// חייב לשבת ב-public בשם הזה בדיוק (firebase-messaging-sw.js).

importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCstYGVEgPDlBefAL2wqzxGXrcEfkbWGtE',
  authDomain: 'doc-ca356.firebaseapp.com',
  projectId: 'doc-ca356',
  storageBucket: 'doc-ca356.firebasestorage.app',
  messagingSenderId: '1004182299951',
  appId: '1:1004182299951:web:4636a791b6d0df96a02dda',
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = payload.notification?.title || 'התראה חדשה';
  const options = {
    body: payload.notification?.body || '',
    icon: '/logo192.png',
    badge: '/logo192.png',
    dir: 'rtl',
    lang: 'he',
    data: payload.data || {},
  };
  self.registration.showNotification(title, options);
});

// לחיצה על התראה - פתיחת האפליקציה
self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const targetUrl = event.notification.data?.url || '/';
  event.waitUntil(
    clients.matchAll({ type: 'window', includeUncontrolled: true }).then((windowClients) => {
      for (const client of windowClients) {
        if ('focus' in client) {
          client.focus();
          return;
        }
      }
      if (clients.openWindow) {
        return clients.openWindow(targetUrl);
      }
    })
  );
});
