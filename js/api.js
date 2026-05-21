/* ══════════════════════════════════════════════
   api.js — Firestore + data.ny.gov API + hot/cold cache
   Exposes: API_CFG, HOT_CFG, fetchFromFirestore, saveToFirestore,
            fetchWinningNumbers, fetchHotNumbers, fetchHotNumbersBackground,
            fetchWinningNumbersForCompare, cacheWinning, getCachedWinning,
            storeHotColdCache, getBallType
   ══════════════════════════════════════════════ */

/* ══ Firestore 읽기 함수 ══
   우선순위:
   1. localStorage 캐시 (가장 빠름)
   2. Firestore (빠름)
   3. data.ny.gov 직접 API (fallback)
══ */
function fetchFromFirestore(collection, gameId, callback) {
    if (!_firestore) { callback(null); return; }
    try {
        _firestore.collection(collection).doc(gameId).get()
            .then(function(doc) {
                if (doc.exists) {
                    console.log('[Firebase] Firestore HIT:', collection, gameId);
                    callback(doc.data());
                } else {
                    console.log('[Firebase] Firestore MISS:', collection, gameId);
                    callback(null);
                }
            })
            .catch(function(e) {
                console.log('[Firebase] Firestore 오류:', e.message);
                callback(null);
            });
    } catch(e) {
        console.log('[Firebase] fetchFromFirestore 예외:', e.message);
        callback(null);
    }
}

/* Firestore에 데이터 저장 (Cloud Functions 대신 임시로 앱에서 저장) */
function saveToFirestore(collection, gameId, data) {
    if (!_firestore) return;
    try {
        data.updatedAt = new Date().toISOString();
        _firestore.collection(collection).doc(gameId).set(data)
            .then(function() {
                console.log('[Firebase] Firestore SAVE:', collection, gameId);
            })
            .catch(function(e) {
                console.log('[Firebase] Firestore 저장 오류:', e.message);
            });
    } catch(e) {}
}

/* ══ WINNING NUMBERS API ══
   Sources: data.ny.gov SODA API (all free, no auth required)
   POWERBALL  (d6yy-54nr): "Winning Numbers" = "n1 n2 n3 n4 n5 pb"
   MEGA       (5xaw-6ayf): "Winning Numbers" = 5 main, "Mega Ball" separate
   NY LOTTO   (6nbc-h7bj): "Winning Numbers" = 6 main, "Bonus #" separate
   MILLIONAIRE(a4w9-a3tp): auto-scan for bonus ball in 1-5 range
   QUICK DRAW (7sqk-ycpk): "Winning Numbers" = space-separated 10 numbers
   TAKE 5     (dg63-4siq): "Evening Winning Numbers" / "Midday Winning Numbers"
   PICK 10    (bycu-cw7c): "Winning Numbers" — space-separated
   WIN 4      (hj4u-8nyt): auto-scan for 4-digit string
   NUMBERS    (hsys-3def): auto-scan for 3-digit string
══ */
var API_CFG = {
    powerball: {
        url: 'https://data.ny.gov/resource/d6yy-54nr.json?$limit=1&$order=draw_date+DESC',
        parse: function(r) {
            var raw = r.winning_numbers ? r.winning_numbers.trim() : '';
            var tokens = raw.split(' ');
            var balls = [];
            for (var i = 0; i < tokens.length - 1; i++) {
                if (tokens[i].trim()) balls.push({ n: parseInt(tokens[i], 10), bonus: false });
            }
            var pb = tokens[tokens.length - 1];
            if (pb && pb.trim()) balls.push({ n: parseInt(pb, 10), bonus: true });
            return { balls: balls, bonusClass: 'ball-w-bonus', date: r.draw_date };
        }
    },
    mega: {
        url: 'https://data.ny.gov/resource/5xaw-6ayf.json?$limit=1&$order=draw_date+DESC',
        parse: function(r) {
            var raw = r.winning_numbers ? r.winning_numbers.trim() : '';
            var tokens = raw.split(' ');
            var balls = [];
            for (var i = 0; i < tokens.length; i++) {
                if (tokens[i].trim()) balls.push({ n: parseInt(tokens[i], 10), bonus: false });
            }
            var mb = r.mega_ball || r.megaball || '';
            if (mb) balls.push({ n: parseInt(mb, 10), bonus: true });
            return { balls: balls, bonusClass: 'ball-w-bonus-gold', date: r.draw_date };
        }
    },
    lotto: {
        url: 'https://data.ny.gov/resource/6nbc-h7bj.json?$limit=1&$order=draw_date+DESC',
        parse: function(r) {
            var raw = r.winning_numbers ? r.winning_numbers.trim() : '';
            var tokens = raw.split(' ');
            var balls = [];
            for (var i = 0; i < tokens.length; i++) {
                if (tokens[i].trim()) balls.push({ n: parseInt(tokens[i], 10), bonus: false });
            }
            var bn = r['bonus_'] || r.bonus || r['bonus_number'] || '';
            if (bn) balls.push({ n: parseInt(bn, 10), bonus: true });
            return { balls: balls, bonusClass: 'ball-w-bonus-green', date: r.draw_date };
        }
    },
    millionaire: {
        url: 'https://data.ny.gov/resource/a4w9-a3tp.json?$limit=1&$order=draw_date+DESC',
        parse: function(r) {
            var raw = r.winning_numbers ? r.winning_numbers.trim() : '';
            var tokens = raw.split(' ');
            var balls = [];
            for (var i = 0; i < tokens.length; i++) {
                var t = tokens[i].trim();
                if (t) balls.push({ n: parseInt(t, 10), bonus: false });
            }
            var mbRaw = r.millionaire_ball   || r.millionaire_ball_
                     || r.millionaire_ball_number
                     || r.life_ball          || r.life_ball_
                     || r.mega_ball          || r.mega_ball_
                     || r.bonus_ball         || r.bonus_ball_
                     || r.bonus_             || r.bonus
                     || r.multiplier         || r.powerball
                     || '';
            if (!mbRaw) {
                var keys = Object.keys(r);
                for (var k = 0; k < keys.length; k++) {
                    var key = keys[k];
                    if (key === 'draw_date' || key === 'winning_numbers' || key.charAt(0) === ':') continue;
                    var candidate = parseInt(r[key], 10);
                    if (!isNaN(candidate) && candidate >= 1 && candidate <= 5) { mbRaw = r[key]; break; }
                }
            }
            if (mbRaw) balls.push({ n: parseInt(mbRaw, 10), bonus: true });
            return { balls: balls, bonusClass: 'ball-w-bonus-gold', date: r.draw_date };
        }
    },
    quickdraw: {
        url: 'https://data.ny.gov/resource/7sqk-ycpk.json?$limit=1&$order=draw_date+DESC',
        parse: function(r) {
            var raw = r.winning_numbers ? r.winning_numbers.trim() : '';
            var tokens = raw.split(' ');
            var balls = [];
            for (var i = 0; i < tokens.length; i++) {
                if (tokens[i].trim()) balls.push({ n: parseInt(tokens[i], 10), bonus: false });
            }
            return { balls: balls, bonusClass: '', date: r.draw_date };
        }
    },
    take5: {
        url: 'https://data.ny.gov/resource/dg63-4siq.json?$limit=1&$order=draw_date+DESC',
        parse: function(r) {
            var raw = r.evening_winning_numbers || r.midday_winning_numbers || '';
            raw = raw.trim();
            var tokens = raw.split(' ');
            var balls = [];
            for (var i = 0; i < tokens.length; i++) {
                var t = tokens[i].trim();
                if (t) balls.push({ n: parseInt(t, 10), bonus: false });
            }
            return { balls: balls, bonusClass: '', date: r.draw_date };
        }
    },
    pick10: {
        url: 'https://data.ny.gov/resource/bycu-cw7c.json?$limit=1&$order=draw_date+DESC',
        parse: function(r) {
            var raw = r.winning_numbers ? r.winning_numbers.trim() : '';
            var tokens = raw.split(' ');
            var balls = [];
            for (var i = 0; i < tokens.length; i++) {
                if (tokens[i].trim()) balls.push({ n: parseInt(tokens[i], 10), bonus: false });
            }
            return { balls: balls, bonusClass: '', date: r.draw_date };
        }
    },
    win4: {
        url: 'https://data.ny.gov/resource/hj4u-8nyt.json?$limit=1&$order=draw_date+DESC',
        parse: function(r) {
            var eveningRaw = r.evening_win_4_ || r.evening_win_4 || r.evening_win_4_number || '';
            var middayRaw  = r.midday_win_4_  || r.midday_win_4 || r.midday_win_4_number  || '';
            if (!eveningRaw || !middayRaw) {
                var keys = Object.keys(r);
                for (var k = 0; k < keys.length; k++) {
                    var key = keys[k];
                    if (key === 'draw_date' || key.charAt(0) === ':') continue;
                    var val = (r[key] || '').toString().replace(/\s/g, '');
                    if (/^\d{3,4}$/.test(val)) {
                        if (!eveningRaw && key.indexOf('evening') !== -1) eveningRaw = val;
                        else if (!middayRaw && key.indexOf('midday') !== -1) middayRaw = val;
                        else if (!eveningRaw) eveningRaw = val;
                    }
                }
            }
            var raw = (eveningRaw || middayRaw || '').toString().replace(/\s/g, '');
            var balls = [];
            for (var i = 0; i < raw.length; i++) { balls.push({ n: raw[i], bonus: false, zero: true }); }
            return { balls: balls, bonusClass: '', date: r.draw_date };
        }
    },
    numbers: {
        url: 'https://data.ny.gov/resource/hsys-3def.json?$limit=1&$order=draw_date+DESC',
        parse: function(r) {
            var eveningRaw = r.evening_daily_ || r.evening_daily || r.evening_numbers_winning_numbers || '';
            var middayRaw  = r.midday_daily_  || r.midday_daily  || r.midday_numbers_winning_numbers  || '';
            if (!eveningRaw || !middayRaw) {
                var keys = Object.keys(r);
                for (var k = 0; k < keys.length; k++) {
                    var key = keys[k];
                    if (key === 'draw_date' || key.charAt(0) === ':') continue;
                    if (key.indexOf('win') !== -1) continue;
                    var val = (r[key] || '').toString().replace(/\s/g, '');
                    if (/^\d{3}$/.test(val)) {
                        if (!eveningRaw && key.indexOf('evening') !== -1) eveningRaw = val;
                        else if (!middayRaw && key.indexOf('midday') !== -1) middayRaw = val;
                        else if (!eveningRaw) eveningRaw = val;
                    }
                }
            }
            var raw = (eveningRaw || middayRaw || '').toString().replace(/\s/g, '');
            var balls = [];
            for (var i = 0; i < raw.length; i++) { balls.push({ n: raw[i], bonus: false, zero: true }); }
            return { balls: balls, bonusClass: '', date: r.draw_date };
        }
    }
};



/* ══ 핫/콜드 번호 캐시 (생성 구슬 색상용) ══ */
var hotNumCache  = {};  /* { gameId: [n1,n2,...] } */
var coldNumCache = {};  /* { gameId: [n1,n2,...] } */

function storeHotColdCache(gameId, freq, topN) {
    var arr = [];
    var keys = Object.keys(freq);
    for (var i = 0; i < keys.length; i++) {
        arr.push({ n: parseInt(keys[i], 10), count: freq[keys[i]] });
    }
    /* 핫: 빈도 높은 순 */
    arr.sort(function(a, b) { return b.count - a.count || a.n - b.n; });
    hotNumCache[gameId]  = arr.slice(0, topN).map(function(x){ return x.n; });
    /* 콜드: 빈도 낮은 순 */
    arr.sort(function(a, b) { return a.count - b.count || a.n - b.n; });
    coldNumCache[gameId] = arr.slice(0, topN).map(function(x){ return x.n; });
}

function getBallType(gameId, number) {
    var hot  = hotNumCache[gameId]  || [];
    var cold = coldNumCache[gameId] || [];
    var num = parseInt(number, 10);
    if (hot.indexOf(num)  !== -1) return 'hot';
    if (cold.indexOf(num) !== -1) return 'cold';
    return 'normal';
}

/* ══ [Phase 1.5] winningCache with TTL (6-hour expiration) ══ */
var winningCache = {};  /* { gameId: { balls:[], timestamp:ms, ttl:ms } } */

function cacheWinning(gameId, balls) {
    winningCache[gameId] = {
        balls: balls,
        timestamp: Date.now(),
        ttl: 6 * 3600000  /* 6 hours */
    };
}

function getCachedWinning(gameId) {
    var cached = winningCache[gameId];
    if (!cached) return null;
    if (Date.now() - cached.timestamp > cached.ttl) {
        delete winningCache[gameId];  /* expire stale entry */
        return null;
    }
    return cached.balls;
}

function fetchWinningNumbers(gameId) {
    var cfg = API_CFG[gameId];
    if (!cfg) return;
    var ballsEl = document.getElementById(gameId + '-winning-balls');
    var dateEl  = document.getElementById(gameId + '-winning-date');

    if (cfg.useOfficialSite) {
        if (dateEl) dateEl.textContent = '';
        if (ballsEl) ballsEl.innerHTML = makeOfficialSiteHTML(cfg.officialUrl, cfg.officialLabel);
        return;
    }

    /* 우선순위 1: localStorage 캐시 */
    var cached = loadDailyCache(gameId, 'winning');
    if (cached && cached.balls) {
        if (dateEl) dateEl.textContent = cached.date || '';
        renderWinningBalls(gameId, cached.balls, cached.bonusClass);
        cacheWinning(gameId, cached.balls);
        console.log('[Cache] winning localStorage HIT:', gameId);
        return;
    }

    if (ballsEl) ballsEl.innerHTML = '<div class="winning-loading"><span class="spin"></span>Loading...</div>';

    /* 우선순위 2: Firestore */
    fetchFromFirestore('lottery', gameId, function(fsData) {
        if (fsData && fsData.balls && fsData.balls.length > 0) {
            var dateStr = fsData.date || '';
            if (dateEl) dateEl.textContent = dateStr;
            renderWinningBalls(gameId, fsData.balls, fsData.bonusClass || '');
            cacheWinning(gameId, fsData.balls);
            saveDailyCache(gameId, 'winning', {
                balls: fsData.balls,
                bonusClass: fsData.bonusClass || '',
                date: dateStr
            });
            console.log('[Firebase] winning Firestore HIT:', gameId);
            return;
        }

        /* 우선순위 3: data.ny.gov 직접 API (fallback) */
        fetch(cfg.url)
            .then(function(resp) { return resp.json(); })
            .then(function(data) {
                if (!data || data.length === 0) {
                    if (ballsEl) ballsEl.innerHTML = '<div class="winning-error">No data available</div>';
                    return;
                }
                var parsed = cfg.parse(data[0]);
                var dateStr = formatDrawDate(parsed.date);
                if (dateEl) dateEl.textContent = dateStr;
                renderWinningBalls(gameId, parsed.balls, parsed.bonusClass);
                cacheWinning(gameId, parsed.balls);
                /* localStorage 저장 */
                saveDailyCache(gameId, 'winning', {
                    balls: parsed.balls,
                    bonusClass: parsed.bonusClass,
                    date: dateStr
                });
                /* Firestore 저장 (다음 사용자를 위해) */
                saveToFirestore('lottery', gameId, {
                    balls: parsed.balls,
                    bonusClass: parsed.bonusClass,
                    date: dateStr
                });
                console.log('[API] winning API fallback SAVE:', gameId);
            })
            .catch(function() {
                if (ballsEl) ballsEl.innerHTML = '<div class="winning-error">Could not load — check nylottery.ny.gov</div>';
            });
    });
}

var fetchedGames = {};
var fetchedHot   = {};


/* ══ HOT NUMBERS CONFIG ══ */
var HOT_CFG = {
    powerball: {
        url: 'https://data.ny.gov/resource/d6yy-54nr.json?$limit=100&$order=draw_date+DESC',
        extract: function(r) {
            var raw = r.winning_numbers ? r.winning_numbers.trim() : '';
            var tokens = raw.split(' ');
            var nums = [];
            for (var i = 0; i < tokens.length - 1; i++) {
                var n = parseInt(tokens[i], 10); if (!isNaN(n)) nums.push(n);
            }
            return nums;
        },
        top: 5, isDigit: false
    },
    mega: {
        url: 'https://data.ny.gov/resource/5xaw-6ayf.json?$limit=100&$order=draw_date+DESC',
        extract: function(r) {
            var raw = r.winning_numbers ? r.winning_numbers.trim() : '';
            var tokens = raw.split(' ');
            var nums = [];
            for (var i = 0; i < tokens.length; i++) {
                var n = parseInt(tokens[i], 10); if (!isNaN(n)) nums.push(n);
            }
            return nums;
        },
        top: 5, isDigit: false
    },
    lotto: {
        url: 'https://data.ny.gov/resource/6nbc-h7bj.json?$limit=100&$order=draw_date+DESC',
        extract: function(r) {
            var raw = r.winning_numbers ? r.winning_numbers.trim() : '';
            var tokens = raw.split(' ');
            var nums = [];
            for (var i = 0; i < tokens.length; i++) {
                var n = parseInt(tokens[i], 10); if (!isNaN(n)) nums.push(n);
            }
            return nums;
        },
        top: 6, isDigit: false
    },
    millionaire: {
        url: 'https://data.ny.gov/resource/a4w9-a3tp.json?$limit=100&$order=draw_date+DESC',
        extract: function(r) {
            var raw = r.winning_numbers ? r.winning_numbers.trim() : '';
            var tokens = raw.split(' ');
            var nums = [];
            for (var i = 0; i < tokens.length; i++) {
                var n = parseInt(tokens[i], 10); if (!isNaN(n)) nums.push(n);
            }
            return nums;
        },
        top: 5, isDigit: false
    },
    quickdraw: {
        url: 'https://data.ny.gov/resource/7sqk-ycpk.json?$limit=50&$order=draw_date+DESC',
        extract: function(r) {
            var raw = r.winning_numbers ? r.winning_numbers.trim() : '';
            var tokens = raw.split(' ');
            var nums = [];
            for (var i = 0; i < tokens.length; i++) {
                var n = parseInt(tokens[i], 10); if (!isNaN(n)) nums.push(n);
            }
            return nums;
        },
        top: 5, isDigit: false
    },
    take5: {
        url: 'https://data.ny.gov/resource/dg63-4siq.json?$limit=100&$order=draw_date+DESC',
        extract: function(r) {
            var raw = (r.evening_winning_numbers || r.midday_winning_numbers || '').trim();
            var tokens = raw.split(' ');
            var nums = [];
            for (var i = 0; i < tokens.length; i++) {
                var n = parseInt(tokens[i], 10); if (!isNaN(n)) nums.push(n);
            }
            return nums;
        },
        top: 5, isDigit: false
    },
    pick10: {
        url: 'https://data.ny.gov/resource/bycu-cw7c.json?$limit=50&$order=draw_date+DESC',
        extract: function(r) {
            var raw = r.winning_numbers ? r.winning_numbers.trim() : '';
            var tokens = raw.split(' ');
            var nums = [];
            for (var i = 0; i < tokens.length; i++) {
                var n = parseInt(tokens[i], 10); if (!isNaN(n)) nums.push(n);
            }
            return nums;
        },
        top: 5, isDigit: false
    },
    win4: {
        url: 'https://data.ny.gov/resource/hj4u-8nyt.json?$limit=100&$order=draw_date+DESC',
        extract: function(r) {
            var nums = [];
            var keys = Object.keys(r);
            for (var k = 0; k < keys.length; k++) {
                var key = keys[k];
                if (key === 'draw_date' || key.charAt(0) === ':') continue;
                var val = (r[key] || '').toString().replace(/\s/g, '');
                if (/^\d{3,4}$/.test(val)) {
                    for (var i = 0; i < val.length; i++) { nums.push(parseInt(val[i], 10)); }
                }
            }
            return nums;
        },
        top: 4, isDigit: true
    },
    numbers: {
        url: 'https://data.ny.gov/resource/hsys-3def.json?$limit=100&$order=draw_date+DESC',
        extract: function(r) {
            var nums = [];
            var keys = Object.keys(r);
            for (var k = 0; k < keys.length; k++) {
                var key = keys[k];
                if (key === 'draw_date' || key.charAt(0) === ':') continue;
                if (key.indexOf('win') !== -1) continue;
                var val = (r[key] || '').toString().replace(/\s/g, '');
                if (/^\d{3}$/.test(val)) {
                    for (var i = 0; i < val.length; i++) { nums.push(parseInt(val[i], 10)); }
                }
            }
            return nums;
        },
        top: 3, isDigit: true
    }
};


function fetchHotNumbers(gameId) {
    var cfg = HOT_CFG[gameId];
    if (!cfg) return;
    var container     = document.getElementById(gameId + '-hot-balls');
    var coldContainer = document.getElementById(gameId + '-cold-balls');
    if (cfg.useOfficialSite) {
        if (container)     container.innerHTML     = makeOfficialSiteHTML(cfg.officialUrl, cfg.officialLabel);
        if (coldContainer) coldContainer.innerHTML = makeOfficialSiteHTML(cfg.officialUrl, cfg.officialLabel);
        return;
    }

    /* 우선순위 1: localStorage 캐시 */
    var cachedHot = loadDailyCache(gameId, 'hot');
    if (cachedHot && cachedHot.top && cachedHot.cold) {
        renderHotBalls(gameId, cachedHot.top, cfg.isDigit);
        renderColdBalls(gameId, cachedHot.cold, cfg.isDigit);
        if (!cachedHot.freq) {
            hotNumCache[gameId]  = cachedHot.top.map(function(x){ return x.n; });
            coldNumCache[gameId] = cachedHot.cold.map(function(x){ return x.n; });
        } else {
            storeHotColdCache(gameId, cachedHot.freq, cfg.top);
        }
        console.log('[Cache] hot localStorage HIT:', gameId);
        return;
    }

    if (container)     container.innerHTML     = '<div class="winning-loading"><span class="spin"></span>Loading...</div>';
    if (coldContainer) coldContainer.innerHTML = '<div class="winning-loading"><span class="spin"></span>Loading...</div>';

    /* 우선순위 2: Firestore */
    fetchFromFirestore('hotcold', gameId, function(fsData) {
        if (fsData && fsData.top && fsData.cold) {
            renderHotBalls(gameId, fsData.top, cfg.isDigit);
            renderColdBalls(gameId, fsData.cold, cfg.isDigit);
            hotNumCache[gameId]  = fsData.top.map(function(x){ return x.n; });
            coldNumCache[gameId] = fsData.cold.map(function(x){ return x.n; });
            saveDailyCache(gameId, 'hot', { top: fsData.top, cold: fsData.cold });
            console.log('[Firebase] hot Firestore HIT:', gameId);
            return;
        }

        /* 우선순위 3: data.ny.gov 직접 API (fallback) */
        fetch(cfg.url)
        .then(function(resp) { return resp.json(); })
        .then(function(data) {
            if (!data || data.length === 0) {
                if (container)     container.innerHTML     = '<div class="winning-error">No data</div>';
                if (coldContainer) coldContainer.innerHTML = '<div class="winning-error">No data</div>';
                return;
            }
            /* Build frequency map once — reused for both hot and cold */
            var freq = {};
            for (var i = 0; i < data.length; i++) {
                var nums = cfg.extract(data[i]);
                for (var j = 0; j < nums.length; j++) {
                    var key = nums[j];
                    freq[key] = (freq[key] || 0) + 1;
                }
            }
            var top  = getTopNumbers(freq, cfg.top);
            var cold = getColdNumbers(freq, cfg.top);
            renderHotBalls(gameId, top, cfg.isDigit);
            renderColdBalls(gameId, cold, cfg.isDigit);
            /* 생성 구슬 색상용 캐시 저장 */
            storeHotColdCache(gameId, freq, cfg.top);
            /* localStorage 저장 */
            saveDailyCache(gameId, 'hot', { top: top, cold: cold });
            /* Firestore 저장 (다음 사용자를 위해) */
            saveToFirestore('hotcold', gameId, { top: top, cold: cold });
            console.log('[API] hot API fallback SAVE:', gameId);
        })
        .catch(function() {
            if (container)     container.innerHTML     = '<div class="winning-error">Could not load</div>';
            if (coldContainer) coldContainer.innerHTML = '<div class="winning-error">Could not load</div>';
        });
    }); /* Firestore callback 닫기 */
}


/* 백그라운드 핫/콜드 프리로드 — DOM 업데이트 없이 캐시만 저장 */
function fetchHotNumbersBackground(gameId) {
    var cfg = HOT_CFG[gameId];
    if (!cfg || cfg.useOfficialSite) return;
    if (loadDailyCache(gameId, 'hot')) return; /* 이미 캐시 있으면 스킵 */
    fetch(cfg.url)
        .then(function(resp) { return resp.json(); })
        .then(function(data) {
            if (!data || data.length === 0) return;
            var freq = {};
            for (var i = 0; i < data.length; i++) {
                var nums = cfg.extract(data[i]);
                for (var j = 0; j < nums.length; j++) {
                    var key = nums[j];
                    freq[key] = (freq[key] || 0) + 1;
                }
            }
            var top  = getTopNumbers(freq, cfg.top);
            var cold = getColdNumbers(freq, cfg.top);
            storeHotColdCache(gameId, freq, cfg.top);
            saveDailyCache(gameId, 'hot', { top: top, cold: cold });
            console.log('[Cache] 백그라운드 hot 저장:', gameId);
        })
        .catch(function(){});
}

/* Lean fetch for comparison (used by saved.js) */
function fetchWinningNumbersForCompare(gameId) {
    var cfg = API_CFG[gameId];
    if (!cfg || cfg.useOfficialSite) return;
    fetch(cfg.url)
        .then(function(resp) { return resp.json(); })
        .then(function(data) {
            if (!data || data.length === 0) return;
            var parsed = cfg.parse(data[0]);
            /* [Phase 1.5] cache with TTL */
            cacheWinning(gameId, parsed.balls);
            if (document.getElementById('saved-screen').classList.contains('active')) {
                renderSavedScreen();
            }
        })
        .catch(function(){});
}
