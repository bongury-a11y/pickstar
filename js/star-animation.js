/* ══════════════════════════════════════════════
   star-animation.js — twinkling stars + shooting stars
   Exposes: initStarAnimation()
   Called by main.js inside window.load handler
   ══════════════════════════════════════════════ */

function initStarAnimation() {
        var canvas = document.getElementById('star-canvas');
        if (!canvas) return;
        var STAR_COUNT = 110;
        var reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

        /* 별 생성 */
        for (var i = 0; i < STAR_COUNT; i++) {
            var star = document.createElement('div');
            star.className = 'star';
            var size     = (Math.random() * 1.8 + 0.6).toFixed(2);  /* 0.6~2.4px */
            var x        = (Math.random() * 100).toFixed(2);
            var y        = (Math.random() * 100).toFixed(2);
            var dur      = (Math.random() * 3 + 2).toFixed(2);       /* 2~5s */
            var delay    = (Math.random() * 6).toFixed(2);           /* 0~6s */
            var minOp    = (Math.random() * 0.15 + 0.05).toFixed(2); /* 0.05~0.2 */
            var maxOp    = (Math.random() * 0.5 + 0.35).toFixed(2);  /* 0.35~0.85 */
            star.style.cssText = [
                'width:'    + size + 'px',
                'height:'   + size + 'px',
                'left:'     + x + '%',
                'top:'      + y + '%',
                '--s-min:'  + minOp,
                '--s-max:'  + maxOp,
                'animation-duration:'        + dur + 's',
                'animation-delay:-'          + delay + 's',
                'opacity:'  + minOp,
            ].join(';');
            /* 밝은 별 일부는 glow 효과 */
            if (Math.random() > 0.75) {
                star.style.boxShadow = '0 0 ' + (parseFloat(size)*2) + 'px rgba(255,255,255,0.6)';
            }
            canvas.appendChild(star);
        }

        /* 유성 생성 함수 */
        function launchShootingStar() {
            if (reduced) return;
            var s = document.createElement('div');
            s.className = 'shooting-star';
            var startX = (Math.random() * 70 + 5).toFixed(1);
            var startY = (Math.random() * 40 + 5).toFixed(1);
            var dur    = (Math.random() * 0.8 + 0.6).toFixed(2);  /* 0.6~1.4s */
            s.style.cssText = 'left:' + startX + '%;top:' + startY + '%;animation-duration:' + dur + 's;';
            canvas.appendChild(s);
            setTimeout(function() {
                if (s.parentNode) s.parentNode.removeChild(s);
            }, parseFloat(dur) * 1000 + 100);
        }

        /* 유성: 처음 1.5초 뒤 첫 등장, 이후 15~30초마다 */
        if (!reduced) {
            setTimeout(function() {
                launchShootingStar();
                setInterval(function() {
                    launchShootingStar();
                }, Math.random() * 15000 + 15000);
            }, 1500);
        }
}