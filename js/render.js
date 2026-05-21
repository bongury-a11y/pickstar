/* ══════════════════════════════════════════════
   render.js — winning balls, generated balls, hot/cold rendering, share
   Exposes: renderWinningBalls, displayResults, getRandomNumbers,
            shareSet, showToast, getTopNumbers, getColdNumbers, renderHot/ColdBalls
   ══════════════════════════════════════════════ */

function formatDrawDate(iso) {
    if (!iso) return '';
    var d = new Date(iso);
    var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
}

function renderWinningBalls(gameId, balls, bonusClass) {
    var container = document.getElementById(gameId + '-winning-balls');
    if (!container) return;
    var row = document.createElement('div');
    row.className = 'winning-balls';
    var addedSep = false;
    for (var i = 0; i < balls.length; i++) {
        var item = balls[i];
        if (item.bonus && !addedSep) {
            var sep = document.createElement('div');
            sep.className = 'ball-sep'; sep.textContent = '+';
            row.appendChild(sep); addedSep = true;
        }
        var ball = document.createElement('div');
        var wClass = 'ball-w ';
        if (item.bonus)     wClass += bonusClass;
        else if (item.zero) wClass += 'ball-w-zero';
        else                wClass += 'ball-w-main';
        ball.className = wClass;
        ball.textContent = item.n;
        row.appendChild(ball);
    }
    container.innerHTML = '';
    container.appendChild(row);
}

function makeOfficialSiteHTML(url, label) {
    return '<a href="' + url + '" target="_blank" rel="noopener" '
         + 'style="display:inline-flex;align-items:center;gap:8px;'
         + 'background:var(--surface2);border:1px solid var(--border);'
         + 'border-radius:8px;padding:10px 14px;color:var(--gold);'
         + 'font-size:13px;font-weight:600;text-decoration:none;'
         + 'transition:border-color 0.2s;" '
         + 'onmouseover="this.style.borderColor=\'rgba(212,168,67,0.5)\'" '
         + 'onmouseout="this.style.borderColor=\'var(--border)\'">'
         + '<span style="font-size:15px">&#x1F517;</span>'
         + 'View ' + label + ' at nylottery.ny.gov'
         + '<span style="font-size:11px;opacity:0.6">&#x2197;</span>'
         + '</a>';
}


function getTopNumbers(freq, topN) {
    var arr = [];
    var keys = Object.keys(freq);
    for (var i = 0; i < keys.length; i++) {
        arr.push({ n: parseInt(keys[i], 10), count: freq[keys[i]] });
    }
    arr.sort(function(a, b) { return b.count - a.count || a.n - b.n; });
    return arr.slice(0, topN);
}

/* Cold Numbers: lowest frequency first — no extra API call, reuses same freq data */
function getColdNumbers(freq, topN) {
    var arr = [];
    var keys = Object.keys(freq);
    for (var i = 0; i < keys.length; i++) {
        arr.push({ n: parseInt(keys[i], 10), count: freq[keys[i]] });
    }
    arr.sort(function(a, b) { return a.count - b.count || a.n - b.n; });
    return arr.slice(0, topN);
}

function renderHotBalls(gameId, topNums, isDigit) {
    var container = document.getElementById(gameId + '-hot-balls');
    if (!container) return;
    if (!topNums || topNums.length === 0) {
        container.innerHTML = '<div class="winning-error">No data</div>';
        return;
    }
    container.innerHTML = '';
    for (var i = 0; i < topNums.length; i++) {
        var item = topNums[i];
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;display:inline-flex;flex-direction:column;align-items:center;gap:3px;';
        var ball = document.createElement('div');
        ball.className = 'ball-hot' + (isDigit ? ' ball-hot-zero' : '');
        ball.textContent = item.n;
        var rank = document.createElement('div');
        rank.className = 'ball-hot-rank';
        rank.textContent = i + 1;
        ball.appendChild(rank);
        var cnt = document.createElement('div');
        cnt.style.cssText = 'font-size:10px;color:var(--muted);font-weight:500;';
        cnt.textContent = item.count + 'x';
        wrap.appendChild(ball);
        wrap.appendChild(cnt);
        container.appendChild(wrap);
    }
}

function renderColdBalls(gameId, coldNums, isDigit) {
    var container = document.getElementById(gameId + '-cold-balls');
    if (!container) return;
    if (!coldNums || coldNums.length === 0) {
        container.innerHTML = '<div class="winning-error">No data</div>';
        return;
    }
    container.innerHTML = '';
    for (var i = 0; i < coldNums.length; i++) {
        var item = coldNums[i];
        var wrap = document.createElement('div');
        wrap.style.cssText = 'position:relative;display:inline-flex;flex-direction:column;align-items:center;gap:3px;';
        var ball = document.createElement('div');
        ball.className = 'ball-cold' + (isDigit ? ' ball-cold-zero' : '');
        ball.textContent = item.n;
        var rank = document.createElement('div');
        rank.className = 'ball-cold-rank';
        rank.textContent = i + 1;
        ball.appendChild(rank);
        var cnt = document.createElement('div');
        cnt.style.cssText = 'font-size:10px;color:var(--muted);font-weight:500;';
        cnt.textContent = item.count + 'x';
        wrap.appendChild(ball);
        wrap.appendChild(cnt);
        container.appendChild(wrap);
    }
}


/* ══ UTILS ══ */
function getRandomNumbers(min, max, count) {
    var numbers = [];
    while (numbers.length < count) {
        var num = Math.floor(Math.random() * (max - min + 1)) + min;
        if (numbers.indexOf(num) === -1) numbers.push(num);
    }
    return numbers.sort(function(a, b) { return a - b; });
}
function getRandomNumber(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }

/* ══ RENDER GENERATED NUMBERS ══ */
function displayResults(gameId, sets, bonusClass) {
    var container = document.getElementById(gameId + '-results');
    container.innerHTML = '';
    var bClass = bonusClass || 'ball-bonus';
    for (var i = 0; i < sets.length; i++) {
        var set = sets[i];
        var setDiv = document.createElement('div');
        setDiv.className = 'result-set';
        setDiv.style.animationDelay = (i * 0.05) + 's';
        var label = document.createElement('div');
        label.className = 'set-label';
        label.textContent = 'Set ' + (i + 1);
        setDiv.appendChild(label);
        var row = document.createElement('div');
        row.className = 'balls-row';
        var addedSep = false;
        for (var j = 0; j < set.length; j++) {
            var item = set[j];
            if (item.bonus && !addedSep) {
                var sep = document.createElement('div');
                sep.className = 'ball-sep'; sep.textContent = '+';
                row.appendChild(sep); addedSep = true;
            }
            var ball = document.createElement('div');
            if (item.bonus) {
                ball.className = 'ball ' + bClass;
            } else {
                /* zero(digit) 공도 핫/콜드 색상 체크 — Win4/Numbers 포함 */
                var ballType = getBallType(gameId, item.number);
                if (ballType === 'hot')       ball.className = 'ball ball-hot-tint';
                else if (ballType === 'cold') ball.className = 'ball ball-cold-tint';
                else if (item.zero)           ball.className = 'ball ball-zero';
                else                          ball.className = 'ball ball-main';
            }
            ball.textContent = item.number;
            row.appendChild(ball);
        }
        setDiv.appendChild(row);
        /* Action buttons row */
        var btnRow = document.createElement('div');
        btnRow.style.cssText = 'display:flex;align-items:center;flex-wrap:wrap;';
        /* Save button */
        var saveBtn = document.createElement('button');
        saveBtn.className = 'save-btn';
        saveBtn.innerHTML = '&#11088; Save';
        (function(gId, s, btn) {
            btn.addEventListener('click', function() {
                saveNumbers(gId, s);
                btn.className = 'save-btn saved';
                btn.innerHTML = '&#9989; Saved!';
            });
        })(gameId, set, saveBtn);
        btnRow.appendChild(saveBtn);
        /* Share button */
        var shareBtn = document.createElement('button');
        shareBtn.className = 'share-btn';
        shareBtn.innerHTML = '&#128257; Share';
        (function(gId, s, btn) {
            btn.addEventListener('click', function() { shareSet(gId, s, btn); });
        })(gameId, set, shareBtn);
        btnRow.appendChild(shareBtn);
        setDiv.appendChild(btnRow);
        container.appendChild(setDiv);
    }
}


/* ══ SHARE ══ */
var GAME_EMOJI = {
    powerball:'⚡', mega:'✨', lotto:'🎱', millionaire:'💎',
    quickdraw:'🎰', take5:'🎯', pick10:'🔟', win4:'4️⃣', numbers:'🔢'
};

function formatSetText(gameId, set) {
    var gameName = GAME_LABELS[gameId] || gameId;
    var emoji    = GAME_EMOJI[gameId]  || '🎲';
    var mainNums = [];
    var bonusNum = null;
    for (var i = 0; i < set.length; i++) {
        if (set[i].bonus) bonusNum = set[i].number;
        else mainNums.push(set[i].number);
    }
    var line = mainNums.join('  ');
    if (bonusNum !== null) line += '  +  ' + bonusNum;
    return emoji + ' ' + gameName + '\n'
         + line + '\n'
         + '⭐ Generated with PickStar';
}

function showToast(msg) {
    var old = document.getElementById('lp-toast');
    if (old) old.parentNode.removeChild(old);
    var t = document.createElement('div');
    t.id = 'lp-toast';
    t.className = 'toast';
    t.textContent = msg;
    document.body.appendChild(t);
    setTimeout(function() {
        if (t.parentNode) t.parentNode.removeChild(t);
    }, 2200);
}

function shareSet(gameId, set, btn) {
    var text = formatSetText(gameId, set);
    if (navigator.share) {
        navigator.share({ title: 'My PickStar Numbers', text: text }).catch(function() {});
        return;
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(text).then(function() {
            btn.className = 'share-btn copied';
            btn.innerHTML = '&#9989; Copied!';
            showToast('📋 Copied to clipboard!');
            setTimeout(function() {
                btn.className = 'share-btn';
                btn.innerHTML = '&#128257; Share';
            }, 2000);
        }).catch(function() { showToast('Could not copy — try manually'); });
        return;
    }
    try {
        var ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:-9999px;';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
        btn.className = 'share-btn copied';
        btn.innerHTML = '&#9989; Copied!';
        showToast('📋 Copied to clipboard!');
        setTimeout(function() {
            btn.className = 'share-btn';
            btn.innerHTML = '&#128257; Share';
        }, 2000);
    } catch(e) {
        showToast('Copy not supported — select text manually');
    }
}