/* ══════════════════════════════════════════════
   storage.js — safe localStorage + daily cache
   Exposes: safeGetItem/Set/Remove, GAME_LABELS,
            getTodayKeyET, saveDailyCache, loadDailyCache, clearOldDailyCache
   ══════════════════════════════════════════════ */

/* ══ MY NUMBERS — STORAGE ══ */
var GAME_LABELS = {
    powerball:'Powerball', mega:'Mega Millions', lotto:'NY Lotto',
    millionaire:'Millionaire for Life', quickdraw:'Quick Draw',
    take5:'Take 5', pick10:'Pick 10', win4:'Win 4', numbers:'Numbers'
};

/* ══ [Phase 1.3] Safe localStorage wrappers ══
   Handles Safari private mode and quota-exceeded errors gracefully.
   Falls back to in-memory storage so app stays functional. */
var _memStorage = {};

function safeGetItem(key) {
    try {
        return localStorage.getItem(key);
    } catch(e) {
        console.log('[Storage] Read failed, using memory fallback');
        return _memStorage[key] !== undefined ? _memStorage[key] : null;
    }
}

function safeSetItem(key, value) {
    try {
        localStorage.setItem(key, value);
        return true;
    } catch(e) {
        console.log('[Storage] Write failed (private mode / quota?), using memory fallback');
        _memStorage[key] = value;
        return false;
    }
}

function safeRemoveItem(key) {
    try {
        localStorage.removeItem(key);
        return true;
    } catch(e) {
        console.log('[Storage] Remove failed, clearing memory fallback');
        delete _memStorage[key];
        return false;
    }
}


/* ══ 날짜 기반 localStorage 캐시 ══
   ET 날짜 기준으로 하루 1회만 API 호출.
   키 형식: ps_cache_YYYY-MM-DD_gameId_type
   type: 'winning' | 'hot'
   앱 시작 시 어제 캐시 자동 삭제.
══ */
function getTodayKeyET() {
    var et = getETTime();
    var y = et.getFullYear();
    var m = et.getMonth() + 1;
    var d = et.getDate();
    return y + '-' + (m < 10 ? '0' : '') + m + '-' + (d < 10 ? '0' : '') + d;
}

function getDailyCacheKey(gameId, type) {
    return 'ps_cache_' + getTodayKeyET() + '_' + gameId + '_' + type;
}

function saveDailyCache(gameId, type, data) {
    try {
        safeSetItem(getDailyCacheKey(gameId, type), JSON.stringify(data));
        return true;
    } catch(e) { return false; }
}

function loadDailyCache(gameId, type) {
    try {
        var raw = safeGetItem(getDailyCacheKey(gameId, type));
        return raw ? JSON.parse(raw) : null;
    } catch(e) { return null; }
}

function clearOldDailyCache() {
    var today = getTodayKeyET();
    try {
        var keys = [];
        for (var i = 0; i < localStorage.length; i++) {
            var k = localStorage.key(i);
            if (k && k.indexOf('ps_cache_') === 0 && k.indexOf(today) === -1) {
                keys.push(k);
            }
        }
        for (var j = 0; j < keys.length; j++) { safeRemoveItem(keys[j]); }
        if (keys.length > 0) console.log('[Cache] 구 캐시 삭제:', keys.length + '개');
    } catch(e) {}
}