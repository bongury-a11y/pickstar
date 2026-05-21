/* ══════════════════════════════════════════════
   navigation.js — screen transitions + history API + popstate
   Exposes: goHome, openGame, switchTab, openPrivacy, openTerms
   NOTE: top-level tabButtons binding requires DOM ready;
         this file must load AFTER <body> content
   ══════════════════════════════════════════════ */


/* ══ [Phase 1.4] NAVIGATION with History API (Android back button fix) ══ */
function goHome() {
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('saved-screen').classList.remove('active');
    document.getElementById('privacy-screen').classList.remove('active');
    document.getElementById('terms-screen').classList.remove('active');
    document.getElementById('home-screen').classList.add('active');
    window.scrollTo(0, 0);
}

/* [Phase 2] Privacy Policy screen */
function openPrivacy() {
    document.getElementById('home-screen').classList.remove('active');
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('saved-screen').classList.remove('active');
    document.getElementById('terms-screen').classList.remove('active');
    document.getElementById('privacy-screen').classList.add('active');
    window.scrollTo(0, 0);
    window.history.pushState({ screen: 'privacy' }, '', '#privacy');
}

/* [Phase 2] Terms of Service screen */
function openTerms() {
    document.getElementById('home-screen').classList.remove('active');
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('saved-screen').classList.remove('active');
    document.getElementById('privacy-screen').classList.remove('active');
    document.getElementById('terms-screen').classList.add('active');
    window.scrollTo(0, 0);
    window.history.pushState({ screen: 'terms' }, '', '#terms');
}

function openGame(gameId) {
    document.getElementById('home-screen').classList.remove('active');
    document.getElementById('saved-screen').classList.remove('active');
    document.getElementById('game-screen').classList.add('active');
    switchTab(gameId);
    window.scrollTo(0, 0);
    /* [Phase 1.4] push state so Android back button returns to previous screen */
    window.history.pushState({ screen: 'game', gameId: gameId }, '', '#game-' + gameId);
}

function switchTab(gameId) {
    var tabs  = document.querySelectorAll('.tab-btn');
    var cards = document.querySelectorAll('.game-card');
    for (var i = 0; i < tabs.length; i++)  tabs[i].classList.remove('active');
    for (var i = 0; i < cards.length; i++) cards[i].classList.remove('active');
    for (var i = 0; i < tabs.length; i++) {
        if (tabs[i].getAttribute('data-game') === gameId) {
            tabs[i].classList.add('active');
            tabs[i].scrollIntoView({ behavior:'smooth', block:'nearest', inline:'center' });
            break;
        }
    }
    var card = document.getElementById(gameId + '-card');
    if (card) card.classList.add('active');
    var txt = document.getElementById('topbar-draw-text');
    if (txt) txt.innerHTML = '<strong>' + getNextDraw(gameId) + '</strong>';
    /* fetch winning numbers + hot numbers once per session (unless cache expired) */
    var cached = getCachedWinning(gameId);
    if (!cached) {
        fetchedGames[gameId] = false; /* force re-fetch if cache expired */
    }
    if (!fetchedGames[gameId]) {
        fetchedGames[gameId] = true;
        fetchWinningNumbers(gameId);
    }
    if (!fetchedHot[gameId]) {
        fetchedHot[gameId] = true;
        fetchHotNumbers(gameId);
    }
}

var tabButtons = document.querySelectorAll('.tab-btn');
for (var t = 0; t < tabButtons.length; t++) {
    tabButtons[t].addEventListener('click', function() { switchTab(this.getAttribute('data-game')); });
}

/* ══ [Fix] 뒤로가기 전략 — PWA 앱 종료 방지 + 모달 처리 ══
   전략: sentinel history 유지
   - 앱 시작 시 sentinel 2개 push
   - popstate 시 모달 열려있으면 모달만 닫기
   - home 도달 시 sentinel 재push → 앱 종료 방지
   - Quick Generate 모달도 history 관리
══ */
function _hideAllScreens() {
    var ids = ['game-screen','saved-screen','privacy-screen','terms-screen'];
    for (var i = 0; i < ids.length; i++) {
        document.getElementById(ids[i]).classList.remove('active');
    }
}

function _isAnyModalOpen() {
    var qgOverlay    = document.getElementById('quick-gen-modal-overlay');
    var confirmOver  = document.getElementById('confirm-overlay');
    var ageGate      = document.getElementById('age-gate-overlay');
    if (qgOverlay    && qgOverlay.classList.contains('visible'))   return 'quick-gen';
    if (confirmOver  && confirmOver.classList.contains('visible')) return 'confirm';
    if (ageGate      && ageGate.classList.contains('visible'))     return 'age-gate';
    return null;
}

function _closeTopModal(modalName) {
    if (modalName === 'quick-gen') {
        var el = document.getElementById('quick-gen-modal-overlay');
        if (el) el.classList.remove('visible');
    } else if (modalName === 'confirm') {
        var el = document.getElementById('confirm-overlay');
        if (el) el.classList.remove('visible');
    }
    /* age-gate는 뒤로가기로 닫지 않음 */
    /* 모달 닫은 후 sentinel 재push */
    window.history.pushState({ screen: 'modal-closed' }, '', window.location.pathname);
}

window.addEventListener('popstate', function(e) {
    /* 1. 모달 열려있으면 모달만 닫기 */
    var openModal = _isAnyModalOpen();
    if (openModal) {
        _closeTopModal(openModal);
        return;
    }

    var state = e.state;

    /* 2. 각 화면별 처리 */
    if (state && state.screen === 'game') {
        _hideAllScreens();
        document.getElementById('game-screen').classList.add('active');
        if (state.gameId) switchTab(state.gameId);
        window.scrollTo(0, 0);
    } else if (state && state.screen === 'saved') {
        _hideAllScreens();
        document.getElementById('saved-screen').classList.add('active');
        renderSavedScreen();
        window.scrollTo(0, 0);
    } else if (state && state.screen === 'privacy') {
        _hideAllScreens();
        document.getElementById('privacy-screen').classList.add('active');
        window.scrollTo(0, 0);
    } else if (state && state.screen === 'terms') {
        _hideAllScreens();
        document.getElementById('terms-screen').classList.add('active');
        window.scrollTo(0, 0);
    } else {
        /* 3. home 또는 sentinel 도달
              → 홈 화면 유지 + sentinel 재push (앱 종료 방지) */
        _hideAllScreens();
        document.getElementById('home-screen').classList.add('active');
        window.scrollTo(0, 0);
        /* sentinel 재push — 다음 뒤로가기도 앱 종료 안 됨 */
        window.history.pushState({ screen: 'home' }, '', window.location.pathname);
    }
});