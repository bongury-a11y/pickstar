/* ══════════════════════════════════════════════
   quick-gen.js — Quick Generate (9 games at once)
   Exposes: initQuickGen()
   Called by main.js inside window.load handler
   ══════════════════════════════════════════════ */

function initQuickGen() {
    var _quickGenResults = null;

    function quickGenerateAll() {
        var results = [];
        var GAME_CONFIGS = [
            { id:'powerball',   label:'Powerball',           fn: function() {
                var m = getRandomNumbers(1,69,5); var b = getRandomNumber(1,26);
                var set = []; for(var i=0;i<m.length;i++) set.push({number:m[i],bonus:false});
                set.push({number:b,bonus:true}); return set; }, bonusClass:'ball-bonus' },
            { id:'mega',        label:'Mega Millions',       fn: function() {
                var m = getRandomNumbers(1,70,5); var b = getRandomNumber(1,25);
                var set = []; for(var i=0;i<m.length;i++) set.push({number:m[i],bonus:false});
                set.push({number:b,bonus:true}); return set; }, bonusClass:'ball-bonus' },
            { id:'lotto',       label:'NY Lotto',            fn: function() {
                var m = getRandomNumbers(1,59,6); var b = getRandomNumber(1,59);
                var set = []; for(var i=0;i<m.length;i++) set.push({number:m[i],bonus:false});
                set.push({number:b,bonus:true}); return set; }, bonusClass:'ball-bonus' },
            { id:'millionaire', label:'Millionaire for Life',fn: function() {
                var m = getRandomNumbers(1,58,5); var b = getRandomNumber(1,5);
                var set = []; for(var i=0;i<m.length;i++) set.push({number:m[i],bonus:false});
                set.push({number:b,bonus:true}); return set; }, bonusClass:'ball-bonus' },
            { id:'quickdraw',   label:'Quick Draw',          fn: function() {
                var m = getRandomNumbers(1,80,10);
                var set = []; for(var i=0;i<m.length;i++) set.push({number:m[i],bonus:false});
                return set; }, bonusClass:'' },
            { id:'take5',       label:'Take 5',              fn: function() {
                var m = getRandomNumbers(1,39,5);
                var set = []; for(var i=0;i<m.length;i++) set.push({number:m[i],bonus:false});
                return set; }, bonusClass:'' },
            { id:'pick10',      label:'Pick 10',             fn: function() {
                var m = getRandomNumbers(1,80,10);
                var set = []; for(var i=0;i<m.length;i++) set.push({number:m[i],bonus:false});
                return set; }, bonusClass:'' },
            { id:'win4',        label:'Win 4',               fn: function() {
                var set = []; for(var k=0;k<4;k++) set.push({number:getRandomNumber(0,9),bonus:false,zero:true});
                return set; }, bonusClass:'' },
            { id:'numbers',     label:'Numbers',             fn: function() {
                var set = []; for(var k=0;k<3;k++) set.push({number:getRandomNumber(0,9),bonus:false,zero:true});
                return set; }, bonusClass:'' },
        ];
        for (var i = 0; i < GAME_CONFIGS.length; i++) {
            var cfg = GAME_CONFIGS[i];
            results.push({ id: cfg.id, label: cfg.label, set: cfg.fn(), bonusClass: cfg.bonusClass });
        }
        return results;
    }

    function buildQGBalls(set, bonusClass, gameId) {
        var row = document.createElement('div');
        row.className = 'qg-balls-row';
        var addedSep = false;
        for (var i = 0; i < set.length; i++) {
            var item = set[i];
            if (item.bonus && !addedSep) {
                var sep = document.createElement('div');
                sep.className = 'ball-sep'; sep.textContent = '+';
                row.appendChild(sep); addedSep = true;
            }
            var ball = document.createElement('div');
            ball.style.cssText = 'width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:11px;flex:none;flex-shrink:0;';
            if (item.bonus) {
                ball.style.background = 'linear-gradient(145deg,#78350f,#b45309)';
                ball.style.color = '#fde68a';
                ball.style.border = '1px solid rgba(212,168,67,0.4)';
            } else if (item.zero) {
                ball.style.background = 'linear-gradient(145deg,#1f2937,#374151)';
                ball.style.color = '#d1d5db';
                ball.style.border = '1px solid rgba(255,255,255,0.12)';
            } else {
                /* zero(digit) 공도 핫/콜드 체크 — Win4/Numbers 포함 */
                var bType = getBallType(gameId, item.number);
                if (bType === 'hot') {
                    ball.style.background = 'linear-gradient(145deg,#7f1d1d,#b91c1c)';
                    ball.style.color = '#fca5a5';
                    ball.style.border = '1px solid rgba(239,68,68,0.4)';
                } else if (bType === 'cold') {
                    ball.style.background = 'linear-gradient(145deg,#1e3a5f,#1d4ed8)';
                    ball.style.color = '#bfdbfe';
                    ball.style.border = '1px solid rgba(96,165,250,0.45)';
                } else if (item.zero) {
                    ball.style.background = 'linear-gradient(145deg,#1f2937,#374151)';
                    ball.style.color = '#d1d5db';
                    ball.style.border = '1px solid rgba(255,255,255,0.12)';
                } else {
                    ball.style.background = 'linear-gradient(145deg,#1f2937,#374151)';
                    ball.style.color = '#d1d5db';
                    ball.style.border = '1px solid rgba(255,255,255,0.12)';
                }
            }
            ball.textContent = item.number;
            row.appendChild(ball);
        }
        return row;
    }

    function openQuickGenModal() {
        var body = document.getElementById('quick-gen-modal-body');
        var overlay = document.getElementById('quick-gen-modal-overlay');
        if (!body || !overlay || !_quickGenResults) return;
        body.innerHTML = '';
        for (var i = 0; i < _quickGenResults.length; i++) {
            var g = _quickGenResults[i];
            var row = document.createElement('div');
            row.className = 'qg-game-row';
            var top = document.createElement('div');
            top.className = 'qg-game-row-top';
            var name = document.createElement('span');
            name.className = 'qg-game-name';
            name.textContent = g.label;
            var saveBtn = document.createElement('button');
            saveBtn.className = 'qg-save-btn';
            saveBtn.innerHTML = '&#11088; Save';
            (function(gId, gSet, btn) {
                btn.addEventListener('click', function() {
                    saveNumbers(gId, gSet);
                    btn.className = 'qg-save-btn saved';
                    btn.innerHTML = '&#9989; Saved!';
                    showToast('⭐ ' + GAME_LABELS[gId] + ' saved!');
                });
            })(g.id, g.set, saveBtn);
            top.appendChild(name);
            top.appendChild(saveBtn);
            var balls = buildQGBalls(g.set, g.bonusClass, g.id);
            row.appendChild(top);
            row.appendChild(balls);
            body.appendChild(row);
        }
        overlay.classList.add('visible');
        if (navigator && navigator.vibrate) { navigator.vibrate(30); }
        /* 모달 열릴 때 history에 추가 → 뒤로가기로 닫힘 */
        window.history.pushState({ screen: 'modal', modal: 'quick-gen' }, '', window.location.pathname);
    }

    function saveFromQuickGen(gameId, set) {
        saveNumbers(gameId, set);
    }

    /* 버튼 + 카드 초기화 */
    var qgBtn      = document.getElementById('quick-gen-btn');
    var qgCard     = document.getElementById('quick-gen-card');
    var qgViewBtn  = document.getElementById('quick-gen-view-btn');
    var qgCardTime = document.getElementById('quick-gen-card-time');
    var qgOverlay  = document.getElementById('quick-gen-modal-overlay');
    var qgClose    = document.getElementById('quick-gen-modal-close');

    if (qgBtn) {
        qgBtn.addEventListener('click', function() {
            _quickGenResults = quickGenerateAll();
            /* 카드 표시 */
            var now = new Date();
            if (qgCardTime) qgCardTime.textContent = formatTime12(now);
            if (qgCard) qgCard.classList.add('visible');
            showToast('⚡ All 9 games generated!');
            if (navigator && navigator.vibrate) { navigator.vibrate(30); }
        });
    }
    if (qgViewBtn) {
        qgViewBtn.addEventListener('click', function() { openQuickGenModal(); });
    }
    if (qgClose) {
        qgClose.addEventListener('click', function() {
            if (qgOverlay) qgOverlay.classList.remove('visible');
        });
    }
    if (qgOverlay) {
        qgOverlay.addEventListener('click', function(e) {
            if (e.target === qgOverlay) qgOverlay.classList.remove('visible');
        });
    }
}