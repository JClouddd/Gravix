importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.0/firebase-messaging-compat.js');

const firebaseConfig = {
  apiKey: "AIzaSyBCfYLKI6_lqPP76sVI2Pgq5Idb7PhmTxk",
  authDomain: "antigravity-hub-jcloud.firebaseapp.com",
  projectId: "antigravity-hub-jcloud",
  storageBucket: "antigravity-hub-jcloud.firebasestorage.app",
  messagingSenderId: "426017291723",
  appId: "1:426017291723:web:f3cb5e26db812e291a8a4e"
};

firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);

  const notificationTitle = payload.notification?.title || 'Gravix Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: '/icon512_rounded.png', // Assuming there's a default icon in PWA
    data: payload.data
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
