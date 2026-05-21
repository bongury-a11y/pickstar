/* ══════════════════════════════════════════════
   time-helpers.js — ET time + draw schedule
   Exposes: getETTime, GAMES, getNextDraw, updateClock, updateNextDraws
   ══════════════════════════════════════════════ */

/* ══ [Phase 1.1] ET TIME ZONE HELPER ══
   Always compute Eastern Time regardless of user's device timezone.
   Handles both EST (UTC-5) and EDT (UTC-4) automatically via DST detection. */
function getETTime() {
    var now = new Date();
    var utcMs = now.getTime() + (now.getTimezoneOffset() * 60000);
    /* DST detection: if current offset is less than the max offset (winter), it's DST */
    var jan = new Date(now.getFullYear(), 0, 1);
    var jul = new Date(now.getFullYear(), 6, 1);
    var stdOffset = Math.max(jan.getTimezoneOffset(), jul.getTimezoneOffset());
    var isDST = now.getTimezoneOffset() < stdOffset;
    var etOffsetMs = isDST ? (-4 * 3600000) : (-5 * 3600000); /* EDT = -4, EST = -5 */
    return new Date(utcMs + etOffsetMs);
}

/* ══ DRAW SCHEDULE ══ */
var GAMES = {
    powerball:   { days:[1,3,6], hour:22, min:59 },
    mega:        { days:[2,5],   hour:23, min:0  },
    lotto:       { days:[3,6],   hour:23, min:21 },
    millionaire: { days:[1,4],   hour:21, min:0  },
    quickdraw:   { days:[0,1,2,3,4,5,6], hour:2,  min:0  },
    take5:       { days:[0,1,2,3,4,5,6], hour:22, min:30 },
    pick10:      { days:[0,1,2,3,4,5,6], hour:22, min:30 },
    win4:        { days:[0,1,2,3,4,5,6], hour:22, min:30 },
    numbers:     { days:[0,1,2,3,4,5,6], hour:22, min:30 }
};
var DAY_FULL = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];

/* [Phase 1.1] getNextDraw now uses ET time instead of local device time */
function getNextDraw(gameId) {
    var g = GAMES[gameId]; if (!g) return '';
    var now = getETTime(); /* FIX: was new Date() — used device local time */
    var dow = now.getDay();
    var h = now.getHours(), m = now.getMinutes();
    if (gameId === 'quickdraw') {
        var active = (h >= 4) && !(h === 2 && m > 0) && h < 26; /* 4AM-2AM ET window */
        if (active) return 'Next draw in ~' + (4 - (m % 4)) + ' min ET';
        return 'Opens at 4:00 AM ET';
    }
    for (var offset = 0; offset <= 7; offset++) {
        var checkDay = (dow + offset) % 7;
        for (var di = 0; di < g.days.length; di++) {
            if (g.days[di] === checkDay) {
                if (offset === 0 && (h > g.hour || (h === g.hour && m >= g.min))) continue;
                var label = offset === 0 ? 'Today' : (offset === 1 ? 'Tomorrow' : DAY_FULL[checkDay]);
                var hh = g.hour > 12 ? g.hour - 12 : (g.hour === 0 ? 12 : g.hour);
                var ap = g.hour >= 12 ? 'PM' : 'AM';
                var mm = g.min < 10 ? '0' + g.min : '' + g.min;
                return 'Next: ' + label + '\n@ ' + hh + ':' + mm + ' ' + ap + ' ET';
            }
        }
    }
    return '';
}

function updateNextDraws() {
    var ids = ['powerball','mega','lotto','millionaire','quickdraw','take5','pick10','win4','numbers'];
    for (var i = 0; i < ids.length; i++) {
        /* update game screen next-draw label */
        var el = document.getElementById(ids[i] + '-next');
        if (el) el.textContent = getNextDraw(ids[i]);
        /* update home screen tile next-draw label */
        var hel = document.getElementById('home-' + ids[i] + '-next');
        if (hel) hel.textContent = getNextDraw(ids[i]);
    }
}

/* ══ [Phase 1.1] LIVE CLOCK — shows ET time ══ */
function updateClock() {
    var et = getETTime(); /* FIX: was new Date() — used device local time */
    var h = et.getHours(), m = et.getMinutes(), s = et.getSeconds();
    var ampm = h >= 12 ? 'PM' : 'AM';
    var h12 = h % 12 || 12;
    function pad(n) { return n < 10 ? '0' + n : '' + n; }
    var el = document.getElementById('live-time');
    var del = document.getElementById('live-date');
    if (el) el.textContent = h12 + ':' + pad(m) + ':' + pad(s) + ' ' + ampm + ' ET';
    if (del) del.textContent = (et.getMonth()+1) + '/' + et.getDate() + '/' + et.getFullYear();
}