/* ══════════════════════════════════════════════
   saved.js — My Numbers save/load/compare/render
   Exposes: getSavedNumbers, saveNumbers, deleteSaved, clearAllSaved,
            updateSavedCountBadges, renderSavedScreen, openSaved, compareSet
   ══════════════════════════════════════════════ */


function getSavedNumbers() {
    try {
        var raw = safeGetItem('luckyPick_saved');
        return raw ? JSON.parse(raw) : [];
    } catch(e) { return []; }
}

function setSavedNumbers(arr) {
    var ok = safeSetItem('luckyPick_saved', JSON.stringify(arr));
    if (!ok) showToast('⚠️ Saved in memory only (private mode)');
}

function saveNumbers(gameId, set) {
    var arr = getSavedNumbers();
    var now = new Date();
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    var dateStr = months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear()
                + ' ' + formatTime12(now);
    arr.unshift({ id: now.getTime(), gameId: gameId, date: dateStr, set: set });
    if (arr.length > 50) arr = arr.slice(0, 50);
    setSavedNumbers(arr);
    updateSavedCountBadges();
}

function deleteSaved(id) {
    var arr = getSavedNumbers().filter(function(e){ return e.id !== id; });
    setSavedNumbers(arr);
    updateSavedCountBadges();
    renderSavedScreen();
}

/* [Phase 1.3] clearAllSaved uses custom modal instead of window.confirm */
function clearAllSaved() {
    var overlay = document.getElementById('confirm-overlay');
    if (overlay) {
        overlay.classList.add('visible');
        window.history.pushState({ screen: 'modal', modal: 'confirm' }, '', window.location.pathname);
    }
}

function formatTime12(d) {
    var h = d.getHours(), m = d.getMinutes();
    var ampm = h >= 12 ? 'PM' : 'AM';
    return (h%12||12) + ':' + (m<10?'0':'')+m + ' ' + ampm;
}

function updateSavedCountBadges() {
    var count = getSavedNumbers().length;
    var badges = [
        document.getElementById('home-saved-count'),
        document.getElementById('saved-count-badge')
    ];
    for (var i = 0; i < badges.length; i++) {
        if (!badges[i]) continue;
        if (count > 0) {
            badges[i].textContent = count;
            badges[i].style.display = 'inline-flex';
        } else {
            badges[i].style.display = 'none';
        }
    }
    var clearBtn = document.getElementById('clear-all-btn');
    if (clearBtn) clearBtn.style.display = count > 0 ? 'inline-flex' : 'none';
}

/* ══ COMPARE SAVED SET vs WINNING ══ */
function compareSet(savedSet, winningBalls) {
    var savedMain  = [];
    var savedBonus = null;
    for (var i = 0; i < savedSet.length; i++) {
        if (savedSet[i].bonus) savedBonus = savedSet[i].number;
        else savedMain.push(savedSet[i].number);
    }
    var winMain  = [];
    var winBonus = null;
    for (var i = 0; i < winningBalls.length; i++) {
        if (winningBalls[i].bonus) winBonus = parseInt(winningBalls[i].n, 10);
        else winMain.push(parseInt(winningBalls[i].n, 10));
    }
    var mainMatches = 0;
    var matchedNums = [];
    for (var i = 0; i < savedMain.length; i++) {
        if (winMain.indexOf(savedMain[i]) !== -1) { mainMatches++; matchedNums.push(savedMain[i]); }
    }
    var bonusMatch = (savedBonus !== null && winBonus !== null && savedBonus === winBonus);
    if (bonusMatch) matchedNums.push(savedBonus);
    return { mainMatches: mainMatches, bonusMatch: bonusMatch, matchedNums: matchedNums,
             total: mainMatches + (bonusMatch ? 1 : 0) };
}

function matchLabel(result, gameId) {
    var t = result.total;
    if (t === 0) return { cls:'match-0', text:'No matches' };
    if (result.bonusMatch && result.mainMatches === 0) return { cls:'match-1', text:'Bonus ball only' };
    var label = result.mainMatches + ' number' + (result.mainMatches > 1 ? 's' : '') + ' matched';
    if (result.bonusMatch) label += ' + bonus ball!';
    if (t <= 2) return { cls:'match-2', text:label };
    if (t === 3) return { cls:'match-3', text:'🎉 ' + label };
    return { cls:'match-5', text:'🏆 ' + label + ' — Check ticket!' };
}

/* ══ RENDER MY NUMBERS SCREEN ══ */
function renderSavedScreen() {
    var list = document.getElementById('saved-list');
    if (!list) return;
    var arr = getSavedNumbers();
    list.innerHTML = '';

    if (arr.length === 0) {
        list.innerHTML = '<div class="saved-empty">'
            + '<div class="saved-empty-icon">⭐</div>'
            + '<h3>No saved numbers yet</h3>'
            + '<p>Generate numbers on any game screen,<br>then tap <strong>⭐ Save this set</strong> to save your picks here.</p>'
            + '</div>';
        return;
    }

    for (var i = 0; i < arr.length; i++) {
        var entry = arr[i];
        var card = document.createElement('div');
        card.className = 'saved-card';
        var header = document.createElement('div');
        header.className = 'saved-card-header';
        var meta = document.createElement('div');
        meta.className = 'saved-card-meta';
        var gameTag = document.createElement('span');
        gameTag.className = 'saved-game-tag';
        gameTag.textContent = GAME_LABELS[entry.gameId] || entry.gameId;
        var dateSpan = document.createElement('span');
        dateSpan.className = 'saved-date';
        dateSpan.textContent = 'Saved ' + entry.date;
        meta.appendChild(gameTag);
        meta.appendChild(dateSpan);
        var delBtn = document.createElement('button');
        delBtn.className = 'delete-btn'; delBtn.setAttribute('aria-label', 'Delete saved numbers');
        delBtn.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>';
        delBtn.title = 'Delete this set';
        (function(eid){ delBtn.addEventListener('click', function(){ deleteSaved(eid); }); })(entry.id);
        header.appendChild(meta);
        header.appendChild(delBtn);
        card.appendChild(header);

        var body = document.createElement('div');
        body.className = 'saved-card-body';
        var ballsRow = document.createElement('div');
        ballsRow.className = 'saved-balls-row';

        /* [Phase 1.5] use getCachedWinning to respect TTL */
        var winning = getCachedWinning(entry.gameId) || null;
        var compResult = winning ? compareSet(entry.set, winning) : null;

        var addedSep = false;
        for (var j = 0; j < entry.set.length; j++) {
            var item = entry.set[j];
            if (item.bonus && !addedSep) {
                var sep = document.createElement('div');
                sep.className = 'ball-sep'; sep.textContent = '+';
                ballsRow.appendChild(sep); addedSep = true;
            }
            var ball = document.createElement('div');
            var bClass = item.bonus ? 'ball-w ball-w-bonus' : (item.zero ? 'ball-w ball-w-zero' : 'ball-w ball-w-main');
            if (compResult && compResult.matchedNums.indexOf(item.number) !== -1) {
                bClass += ' ball-matched';
            }
            ball.className = bClass;
            ball.textContent = item.number;
            ballsRow.appendChild(ball);
        }
        body.appendChild(ballsRow);

        var matchDiv = document.createElement('div');
        if (!winning) {
            matchDiv.className = 'match-loading';
            matchDiv.textContent = 'Loading latest results for comparison…';
        } else {
            var ml = matchLabel(compResult, entry.gameId);
            matchDiv.className = 'match-result ' + ml.cls;
            matchDiv.innerHTML = ml.text;
        }
        body.appendChild(matchDiv);
        card.appendChild(body);
        list.appendChild(card);
    }
}

/* ══ NAVIGATION — MY NUMBERS ══ */
function openSaved() {
    document.getElementById('home-screen').classList.remove('active');
    document.getElementById('game-screen').classList.remove('active');
    document.getElementById('saved-screen').classList.add('active');
    window.scrollTo(0, 0);
    /* [Phase 1.4] push state for back button */
    window.history.pushState({ screen: 'saved' }, '', '#saved');
    renderSavedScreen();
    var arr = getSavedNumbers();
    var seenGames = {};
    for (var i = 0; i < arr.length; i++) {
        var gId = arr[i].gameId;
        if (!seenGames[gId]) {
            seenGames[gId] = true;
            /* [Phase 1.5] only fetch if cache is empty or expired */
            if (!getCachedWinning(gId) && API_CFG[gId] && !API_CFG[gId].useOfficialSite) {
                fetchWinningNumbersForCompare(gId);
            }
        }
    }
}

/* Lean fetch just for comparison (doesn't touch DOM winning balls/date) */