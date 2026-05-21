/* ══════════════════════════════════════════════
   games.js — 9 game generators (Powerball, Mega, ...)
   Exposes: generatePowerball, generateMega, generateLotto, etc.
   ══════════════════════════════════════════════ */


/* ══ GENERATORS ══ */
function generatePowerball() {
    if (navigator && navigator.vibrate) { navigator.vibrate(30); }
    var sets = [];
    for (var i = 0; i < 5; i++) {
        var main = getRandomNumbers(1,69,5); var pb = getRandomNumber(1,26); var set = [];
        for (var j = 0; j < main.length; j++) set.push({number:main[j],bonus:false});
        set.push({number:pb,bonus:true}); sets.push(set);
    }
    displayResults('powerball', sets, 'ball-bonus');
}
function generateMega() {
    if (navigator && navigator.vibrate) { navigator.vibrate(30); }
    var sets = [];
    for (var i = 0; i < 5; i++) {
        var main = getRandomNumbers(1,70,5); var mb = getRandomNumber(1,25); var set = [];
        for (var j = 0; j < main.length; j++) set.push({number:main[j],bonus:false});
        set.push({number:mb,bonus:true}); sets.push(set);
    }
    displayResults('mega', sets, 'ball-bonus-gold');
}
function generateLotto() {
    if (navigator && navigator.vibrate) { navigator.vibrate(30); }
    var sets = [];
    for (var i = 0; i < 5; i++) {
        var main = getRandomNumbers(1,59,6); var bb = getRandomNumber(1,59); var set = [];
        for (var j = 0; j < main.length; j++) set.push({number:main[j],bonus:false});
        set.push({number:bb,bonus:true}); sets.push(set);
    }
    displayResults('lotto', sets, 'ball-bonus-green');
}
function generateMillionaire() {
    if (navigator && navigator.vibrate) { navigator.vibrate(30); }
    var sets = [];
    for (var i = 0; i < 5; i++) {
        var main = getRandomNumbers(1,58,5); var mb = getRandomNumber(1,5); var set = [];
        for (var j = 0; j < main.length; j++) set.push({number:main[j],bonus:false});
        set.push({number:mb,bonus:true}); sets.push(set);
    }
    displayResults('millionaire', sets, 'ball-bonus-gold');
}
function generateQuickDraw() {
    if (navigator && navigator.vibrate) { navigator.vibrate(30); }
    var sets = [];
    for (var i = 0; i < 5; i++) {
        var nums = getRandomNumbers(1,80,10); var set = [];
        for (var j = 0; j < nums.length; j++) set.push({number:nums[j],bonus:false});
        sets.push(set);
    }
    displayResults('quickdraw', sets);
}
function generateTake5() {
    if (navigator && navigator.vibrate) { navigator.vibrate(30); }
    var sets = [];
    for (var i = 0; i < 5; i++) {
        var nums = getRandomNumbers(1,39,5); var set = [];
        for (var j = 0; j < nums.length; j++) set.push({number:nums[j],bonus:false});
        sets.push(set);
    }
    displayResults('take5', sets);
}
function generatePick10() {
    if (navigator && navigator.vibrate) { navigator.vibrate(30); }
    var sets = [];
    for (var i = 0; i < 5; i++) {
        var nums = getRandomNumbers(1,80,10); var set = [];
        for (var j = 0; j < nums.length; j++) set.push({number:nums[j],bonus:false});
        sets.push(set);
    }
    displayResults('pick10', sets);
}
function generateWin4() {
    if (navigator && navigator.vibrate) { navigator.vibrate(30); }
    var sets = [];
    for (var i = 0; i < 5; i++) {
        var set = [];
        for (var k = 0; k < 4; k++) set.push({number:getRandomNumber(0,9),bonus:false,zero:true});
        sets.push(set);
    }
    displayResults('win4', sets);
}
function generateNumbers() {
    if (navigator && navigator.vibrate) { navigator.vibrate(30); }
    var sets = [];
    for (var i = 0; i < 5; i++) {
        var set = [];
        for (var k = 0; k < 3; k++) set.push({number:getRandomNumber(0,9),bonus:false,zero:true});
        sets.push(set);
    }
    displayResults('numbers', sets);
}