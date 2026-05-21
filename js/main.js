/* ══════════════════════════════════════════════
   main.js — entry point: window.load handler
   Wires Age Gate, clock, preload, confirm modal, iOS card,
   service worker, online/offline, PWA install prompt,
   and calls initStarAnimation() + initQuickGen()
   ══════════════════════════════════════════════ */

/* ══ INIT ══ */
window.addEventListener('load', function() {
    /* [Fix] PWA 앱 종료 방지 sentinel history 초기화
       sentinel 2개를 미리 push해서
       뒤로가기를 2번 눌러도 앱이 닫히지 않음 */
    window.history.replaceState({ screen: 'sentinel' }, '', window.location.pathname);
    window.history.pushState({ screen: 'home' }, '', window.location.pathname);


    /* ── PickStar 별 반짝임 애니메이션 (star-animation.js) ── */
    initStarAnimation();

    /* [Phase 2] Age Gate initialization — runs before anything else */
    var ageGateOverlay = document.getElementById('age-gate-overlay');
    var ageBlocked     = document.getElementById('age-blocked');
    var ageYesBtn      = document.getElementById('age-gate-yes-btn');
    var ageNoBtn       = document.getElementById('age-gate-no-btn');

    if (!safeGetItem('lp_age_verified')) {
        if (ageGateOverlay) ageGateOverlay.classList.add('visible');
    }
    if (ageYesBtn) {
        ageYesBtn.addEventListener('click', function() {
            safeSetItem('lp_age_verified', '1');
            if (ageGateOverlay) ageGateOverlay.classList.remove('visible');
        });
    }
    if (ageNoBtn) {
        ageNoBtn.addEventListener('click', function() {
            if (ageGateOverlay) ageGateOverlay.classList.remove('visible');
            if (ageBlocked) ageBlocked.classList.add('visible');
        });
    }

    /* [캐시] 구 날짜 캐시 삭제 */
    clearOldDailyCache();

    updateClock();
    updateNextDraws();
    updateSavedCountBadges();
    setInterval(updateClock, 1000);
    setInterval(updateNextDraws, 60000);


    /* [캐시] 앱 시작 시 백그라운드 프리로드
       — 9개 게임 데이터를 미리 가져와 캐시에 저장
       — 사용자가 탭 클릭 시 즉시 표시 가능 */
    setTimeout(function() {
        var PRELOAD_GAMES = ['powerball','mega','lotto','millionaire','take5','pick10','win4','numbers','quickdraw'];
        var idx = 0;
        function preloadNext() {
            if (idx >= PRELOAD_GAMES.length) {
                console.log('[Cache] 프리로드 완료');
                return;
            }
            var gId = PRELOAD_GAMES[idx++];
            /* 이미 캐시 있으면 스킵 */
            var wCached = loadDailyCache(gId, 'winning');
            var hCached = loadDailyCache(gId, 'hot');
            if (!wCached) fetchWinningNumbersForCompare(gId);
            if (!hCached) fetchHotNumbersBackground(gId);
            /* 1.5초 간격으로 순차 호출 (서버 부하 분산) */
            setTimeout(preloadNext, 1500);
        }
        preloadNext();
    }, 2000); /* 앱 UI 로드 후 2초 뒤 시작 */

    /* [Phase 1.3] Custom confirm modal wiring */
    var confirmOverlay = document.getElementById('confirm-overlay');
    var confirmOkBtn   = document.getElementById('confirm-ok-btn');
    var confirmCancel  = document.getElementById('confirm-cancel-btn');

    if (confirmOkBtn) {
        confirmOkBtn.addEventListener('click', function() {
            setSavedNumbers([]);
            updateSavedCountBadges();
            renderSavedScreen();
            if (confirmOverlay) confirmOverlay.classList.remove('visible');
            showToast('🗑️ All numbers cleared');
        });
    }
    if (confirmCancel) {
        confirmCancel.addEventListener('click', function() {
            if (confirmOverlay) confirmOverlay.classList.remove('visible');
        });
    }
    /* Close modal on overlay background tap */
    if (confirmOverlay) {
        confirmOverlay.addEventListener('click', function(e) {
            if (e.target === confirmOverlay) confirmOverlay.classList.remove('visible');
        });
    }

    /* ── Quick Generate (quick-gen.js) ── */
    initQuickGen();

    /* ── Phase 3: iOS 홈화면 추가 안내 카드 ── */
    var iosCard    = document.getElementById('ios-install-card');
    var iosDismiss = document.getElementById('ios-install-dismiss');
    var isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
    var isStandalone = window.matchMedia('(display-mode: standalone)').matches
                    || window.navigator.standalone === true;
    if (isIOS && !isStandalone && !safeGetItem('lp_ios_dismissed')) {
        if (iosCard) iosCard.classList.add('visible');
    }
    if (iosDismiss) {
        iosDismiss.addEventListener('click', function() {
            if (iosCard) iosCard.classList.remove('visible');
            safeSetItem('lp_ios_dismissed', '1');
        });
    }

    /* ── Service Worker registration ── */
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('./service-worker.js')
            .then(function(reg) {
                console.log('[SW] Registered. Scope:', reg.scope);
            })
            .catch(function(err) {
                console.log('[SW] Registration failed:', err);
            });
    }

    /* ── Offline / Online detection ── */
    var offlineBanner = document.getElementById('offline-banner');
    function updateOnlineStatus() {
        if (!navigator.onLine) {
            offlineBanner.classList.add('visible');
        } else {
            offlineBanner.classList.remove('visible');
        }
    }
    window.addEventListener('online',  updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);
    updateOnlineStatus();

    /* ── PWA Install prompt ── */
    var deferredPrompt = null;
    var installBanner  = document.getElementById('install-banner');
    var installBtn     = document.getElementById('install-btn');
    var installDismiss = document.getElementById('install-dismiss');

    window.addEventListener('beforeinstallprompt', function(e) {
        e.preventDefault();
        deferredPrompt = e;
        /* [Phase 1.3] use safeGetItem */
        if (!safeGetItem('lp_install_dismissed')) {
            installBanner.classList.add('visible');
        }
    });

    if (installBtn) {
        installBtn.addEventListener('click', function() {
            if (!deferredPrompt) return;
            deferredPrompt.prompt();
            deferredPrompt.userChoice.then(function(choice) {
                deferredPrompt = null;
                installBanner.classList.remove('visible');
                if (choice.outcome === 'accepted') {
                    showToast('🎉 PickStar installed!');
                }
            });
        });
    }

    if (installDismiss) {
        installDismiss.addEventListener('click', function() {
            installBanner.classList.remove('visible');
            /* [Phase 1.3] use safeSetItem */
            safeSetItem('lp_install_dismissed', '1');
        });
    }

    if (window.matchMedia('(display-mode: standalone)').matches) {
        if (installBanner) installBanner.classList.remove('visible');
    }
});
