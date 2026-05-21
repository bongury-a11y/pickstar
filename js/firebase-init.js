/* ══════════════════════════════════════════════
   firebase-init.js — Firebase init + global handles
   Exposes: window._firestore, window._firebaseApp
   ══════════════════════════════════════════════ */

/* ══ Firebase 초기화 ══ */
var _firebaseApp = null;
var _firestore   = null;

(function() {
    var firebaseConfig = {
        apiKey:            "AIzaSyDngpv_LRNyczrv1nJi9DO7dcjc4IFwXhg",
        authDomain:        "pickstar-app.firebaseapp.com",
        projectId:         "pickstar-app",
        storageBucket:     "pickstar-app.firebasestorage.app",
        messagingSenderId: "800244730497",
        appId:             "1:800244730497:web:2a20b3a8af3a1a05871b80"
    };
    try {
        _firebaseApp = firebase.initializeApp(firebaseConfig);
        _firestore   = firebase.firestore();
        console.log('[Firebase] 초기화 완료');
    } catch(e) {
        console.log('[Firebase] 초기화 실패 — API fallback 사용:', e.message);
    }
})();
