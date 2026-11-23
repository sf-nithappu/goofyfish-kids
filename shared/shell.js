// Shell shared by the launcher and every game: parent settings, hold-to-exit home button, bedtime screen.
// Settings live in localStorage under "gk." and are read by core.js through window.GK.
(function () {
  const get = (k, d) => {
    try {
      const v = localStorage.getItem('gk.' + k);
      return v === null ? d : JSON.parse(v);
    } catch (e) {
      return d;
    }
  };
  const set = (k, v) => {
    try {
      localStorage.setItem('gk.' + k, JSON.stringify(v));
    } catch (e) {
      // storage can be blocked; settings just won't stick
    }
  };
  const TEST = new URLSearchParams(location.search).has('bot');

  const GK = {
    muted: () => !!get('mute', false),
    setMuted: (v) => set('mute', !!v),
    // Play-time timer: minutes from now, or 0 to turn it off.
    setTimer(min) {
      set('until', min ? Date.now() + min * 60000 : 0);
      GK.check();
    },
    until: () => get('until', 0),
    check() {
      const u = GK.until();
      $bye.classList.toggle('on', !TEST && !!u && Date.now() >= u);
    },
    home: () => (document.body.dataset.root ? './index.html' : '../index.html'),
  };
  window.GK = GK;

  // Press and hold something for `ms`, with `onProgress(0..1)`; a quick tap only calls `onTap`.
  function hold(el, ms, onDone, onProgress, onTap) {
    let t0 = 0, raf = 0, id = null;
    const stop = (done) => {
      cancelAnimationFrame(raf);
      el.classList.remove('holding');
      onProgress(0);
      if (!done && t0 && onTap && performance.now() - t0 < 300) {
        onTap();
      }
      t0 = 0;
      id = null;
    };
    const tick = () => {
      const k = Math.min(1, (performance.now() - t0) / ms);
      onProgress(k);
      if (k >= 1) {
        stop(true);
        onDone();
      } else {
        raf = requestAnimationFrame(tick);
      }
    };
    el.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      e.stopPropagation();
      id = e.pointerId;
      t0 = performance.now();
      el.classList.add('holding');
      raf = requestAnimationFrame(tick);
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) {
      el.addEventListener(ev, (e) => {
        if (t0 && e.pointerId === id) {
          stop(false);
        }
      });
    }
    return { stop };
  }
  GK.hold = hold;

  // Bedtime screen: a moon, stars and a sleeping figure. A parent holds the little lock to bring the games back.
  const $bye = document.createElement('div');
  $bye.id = 'bye';
  $bye.innerHTML = `
    <svg viewBox="0 0 200 200" fill="none" stroke-linecap="round" stroke-linejoin="round">
      <path d="M118 30a58 58 0 1 0 52 80a48 48 0 0 1-52-80z" fill="#fde68a" stroke="#fde68a" stroke-width="2"/>
      <g class="zz" fill="#fde68a" stroke="none"><path d="M30 40l4 9 9 4-9 4-4 9-4-9-9-4 9-4z"/></g>
      <g class="zz" fill="#fde68a" stroke="none"><path d="M60 100l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></g>
      <g class="zz" fill="#fde68a" stroke="none"><path d="M165 150l3 7 7 3-7 3-3 7-3-7-7-3 7-3z"/></g>
      <path d="M40 170h120" stroke="#8a97b8" stroke-width="3"/>
      <circle cx="70" cy="158" r="8" fill="#8a97b8" stroke="none"/>
      <path d="M80 160h60" stroke="#8a97b8" stroke-width="8"/>
    </svg>
    <button class="unlock" aria-label="Parents: hold to unlock">🔒</button>`;
  document.addEventListener('DOMContentLoaded', () => {
    document.body.appendChild($bye);
    const unlock = $bye.querySelector('.unlock');
    hold(unlock, 2000, () => {
      GK.setTimer(0);
      GK.check();
    }, () => {}, null);
    GK.check();
    setInterval(GK.check, 5000);

    if (document.body.dataset.home === 'off') {
      return;
    }
    // Home button with a progress ring. Holding it for 1.2s goes back to the launcher.
    const b = document.createElement('button');
    b.id = 'home';
    b.setAttribute('aria-label', 'Home: press and hold');
    b.innerHTML = `
      <svg class="ring" viewBox="0 0 88 88"><circle cx="44" cy="44" r="42"/></svg>
      <svg viewBox="0 0 24 24" fill="none" stroke="#141414" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 11.5 12 4l9 7.5"/><path d="M5.5 10v10h13V10"/></svg>`;
    document.body.appendChild(b);
    const ring = b.querySelector('.ring circle');
    const go = () => {
      location.href = GK.home();
    };
    hold(b, 1200, go, (k) => {
      ring.style.strokeDashoffset = String(264 * (1 - k));
    }, () => {
      b.classList.remove('shake');
      void b.offsetWidth;
      b.classList.add('shake');
    });
    // Keyboard (Mac): hold Escape to leave.
    let escT = 0;
    addEventListener('keydown', (e) => {
      if (e.code === 'Escape' && !e.repeat) {
        escT = setTimeout(go, 1200);
      }
    });
    addEventListener('keyup', (e) => {
      if (e.code === 'Escape') {
        clearTimeout(escT);
      }
    });
  });
})();
