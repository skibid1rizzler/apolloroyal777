window.addEventListener('DOMContentLoaded', () => {
  const MAX_SCORE = 1000;
  let score = 1000;
  let bestScore = 1000;

  const byId = (id) => document.getElementById(id);

  const cvs = byId('fxCanvas');
  const ctx = cvs ? cvs.getContext('2d') : null;

  function resizeCanvas() {
    if (!cvs) return;
    cvs.width = window.innerWidth;
    cvs.height = window.innerHeight;
  }
  resizeCanvas();
  window.addEventListener('resize', resizeCanvas);

  class Particle {
    constructor(x, y, type) {
      this.x = x;
      this.y = y;
      this.type = type;
      const speed = type === 'explosion' ? 11 : type === 'coin' ? 3.6 : 4.3;
      this.vx = (Math.random() - 0.5) * speed * 2;
      this.vy = (Math.random() - 0.5) * speed - (type === 'coin' ? 3.5 : 0);
      this.life = 1;
      this.decay = type === 'explosion' ? 0.024 : 0.017;
      this.size = type === 'explosion' ? Math.random() * 8 + 3 : Math.random() * 4 + 2;
      this.gravity = type === 'coin' ? 0.16 : 0.08;
      const palettes = {
        gold: ['#FFD700', '#FFA500', '#FFE066'],
        red: ['#FF3333', '#D00000', '#FF7777'],
        explosion: ['#FFD700', '#FF6600', '#FFFFFF', '#FF3333'],
        coin: ['#FFD700', '#FFE066', '#B8860B'],
        green: ['#00FF88', '#66FFB8', '#00CC66']
      };
      const arr = palettes[type] || palettes.gold;
      this.color = arr[Math.floor(Math.random() * arr.length)];
    }

    step() {
      this.x += this.vx;
      this.y += this.vy;
      this.vy += this.gravity;
      this.vx *= 0.97;
      this.life -= this.decay;
      this.size *= 0.997;
    }

    draw() {
      if (!ctx) return;
      ctx.save();
      ctx.globalAlpha = Math.max(0, this.life);
      ctx.fillStyle = this.color;
      ctx.shadowColor = this.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  let particles = [];

  function burst(x, y, count, type) {
    for (let i = 0; i < count; i++) particles.push(new Particle(x, y, type));
  }

  function screenCenter() {
    return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  }

  function reelCenter(i) {
    const reel = byId('reel' + i);
    if (!reel) return screenCenter();
    const r = reel.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  function fxLoop() {
    if (!ctx || !cvs) return;
    ctx.clearRect(0, 0, cvs.width, cvs.height);
    particles = particles.filter((p) => {
      p.step();
      if (p.life > 0) {
        p.draw();
        return true;
      }
      return false;
    });
    requestAnimationFrame(fxLoop);
  }
  fxLoop();

  let aCtx = null;
  function ac() {
    if (!aCtx) aCtx = new (window.AudioContext || window.webkitAudioContext)();
    return aCtx;
  }
  function tone(freq, dur, type = 'sine', vol = 0.12) {
    try {
      const a = ac();
      const o = a.createOscillator();
      const g = a.createGain();
      o.connect(g);
      g.connect(a.destination);
      o.type = type;
      o.frequency.value = freq;
      g.gain.setValueAtTime(vol, a.currentTime);
      g.gain.exponentialRampToValueAtTime(0.001, a.currentTime + dur);
      o.start();
      o.stop(a.currentTime + dur);
    } catch (e) {}
  }
  const snd = {
    click() { tone(220, 0.06, 'square', 0.08); },
    reel() { tone(100 + Math.random() * 40, 0.05, 'sawtooth', 0.04); },
    win() { [440, 554, 659, 880].forEach((f, i) => setTimeout(() => tone(f, 0.23, 'sine', 0.15), i * 70)); },
    jp() { [330, 440, 550, 660, 880].forEach((f, i) => setTimeout(() => tone(f, 0.3, 'triangle', 0.16), i * 60)); },
    lose() { tone(150, 0.32, 'sawtooth', 0.1); setTimeout(() => tone(95, 0.3, 'sawtooth', 0.08), 160); },
    bonus() { [660, 880, 1100].forEach((f, i) => setTimeout(() => tone(f, 0.15, 'sine', 0.12), i * 70)); },
    card() { tone(390, 0.08, 'sine', 0.09); },
    coin() { tone(700, 0.14, 'sine', 0.13); }
  };

  function refreshAllBals(flash) {
    const pct = Math.min(100, (score / MAX_SCORE) * 100).toFixed(1) + '%';
    ['menu', 'slots', 'bj', 'cf', 'crash', 'dice'].forEach((pfx) => {
      const val = byId(pfx + 'Bal');
      const fill = byId(pfx + 'BalFill');
      if (val) {
        val.textContent = score;
        if (flash) {
          val.classList.remove('flash');
          void val.offsetWidth;
          val.classList.add('flash');
        }
      }
      if (fill) fill.style.width = pct;
    });
    const menuBest = byId('menuBest');
    const stBest = byId('stBest');
    if (menuBest) menuBest.textContent = bestScore;
    if (stBest) stBest.textContent = bestScore;
  }

  function setScore(next, flash) {
    score = Math.max(0, next);
    if (score > bestScore) bestScore = score;
    refreshAllBals(flash);
    if (score <= 0) setTimeout(showGameOver, 600);
  }

  function showJPBanner(title, sub) {
    byId('jpTitle').textContent = title || 'JACKPOT!';
    byId('jpSub').textContent = sub || 'Тройное совпадение';
    const b = byId('jpBanner');
    b.classList.add('show');
    setTimeout(() => b.classList.remove('show'), 2500);
  }

  function jpFlash() {
    const f = byId('jpFlash');
    let n = 0;
    const iv = setInterval(() => {
      f.classList.toggle('on');
      if (++n > 8) {
        clearInterval(iv);
        f.classList.remove('on');
      }
    }, 100);
  }

  function showGameOver() {
    const c = screenCenter();
    burst(c.x, c.y, 70, 'red');
    byId('gameOver').classList.add('show');
    snd.lose();
  }

  function gotoScreen(id) {
    document.querySelectorAll('.screen').forEach((s) => s.classList.remove('active'));
    const target = byId(id);
    if (target) target.classList.add('active');
    window.scrollTo({ top: 0, behavior: 'smooth' });
    snd.click();
  }

  function scrollToVIP() {
    const vipSection = byId('vipSection');
    if (vipSection) {
      vipSection.scrollIntoView({ behavior: 'smooth' });
    }
    snd.click();
  }

  const PHOTO_SYMBOLS = [
    { key: 'apollo_1', title: 'APOLLO I', src: 'images/symbols/bar.jpg', mult: 3 },
    { key: 'apollo_2', title: 'APOLLO II', src: 'images/symbols/bell.jpg', mult: 2 },
    { key: 'apollo_3', title: 'APOLLO III', src: 'images/symbols/cherry.jpg', mult: 2 },
    { key: 'apollo_4', title: 'APOLLO IV', src: 'images/symbols/diamond.jpg', mult: 2 },
    { key: 'apollo_5', title: 'APOLLO V', src: 'images/symbols/lemon.jpg', mult: 2 },
    { key: 'apollo_6', title: 'APOLLO VI', src: 'images/symbols/seven.jpg', mult: 2 },
    { key: 'apollo_7', title: 'APOLLO VII', src: 'images/symbols/star.jpg', mult: 2 },
    { key: 'apollo_8', title: 'APOLLO VIII', src: 'images/symbols/watermelon.jpg', mult: 2 }
  ];

  const ptGrid = byId('ptGrid');
  if (ptGrid) {
    ptGrid.innerHTML = '';
    PHOTO_SYMBOLS.forEach((s) => {
      const d = document.createElement('div');
      d.className = 'pt-item';
      d.innerHTML = `<img class="pt-img" src="${s.src}" alt="${s.title}"><div class="pt-val">x${s.mult}</div><div style="font-size:7px;">${s.title}</div>`;
      ptGrid.appendChild(d);
    });
  }

  const STRIP_N = 24;
  const SPIN_DUR = [850, 1150, 1450];

  const strips = [null, null, null];
  const curIdx = [0, 0, 0];

  let slotBet = 50;
  let slotSpinning = false;
  let freeSpins = 0;
  let stSpins = 0;
  let stWins = 0;
  let stJP = 0;
  let bonusCooldown = false;
  let bonusEnd = 0;
  let bonusTimer = null;

  function updateFSCount() {
    byId('fsCount').textContent = freeSpins;
    byId('fsBadge').className = 'fs-badge' + (freeSpins > 0 ? ' show' : '');
    byId('spinBtnText').textContent = freeSpins > 0 ? 'FREESPIN' : 'SPIN';
  }

  function showSlotMsg(text, type) {
    const el = byId('slotMsg');
    el.className = 'msg show ' + type;
    el.textContent = text;
  }

  function buildStrip(i) {
    const el = byId('strip' + i);
    el.innerHTML = '';
    const arr = [];
    for (let j = 0; j < STRIP_N; j++) arr.push(Math.floor(Math.random() * PHOTO_SYMBOLS.length));
    arr.push(arr[0]);
    arr.forEach((idx) => {
      const c = document.createElement('div');
      c.className = 'reel-cell';
      c.innerHTML = `<img src="${PHOTO_SYMBOLS[idx].src}" alt="${PHOTO_SYMBOLS[idx].title}">`;
      el.appendChild(c);
    });
    strips[i] = { arr, el };
    el.style.top = '0px';
    curIdx[i] = 0;
  }

  function slotReset() {
    [0, 1, 2].forEach((i) => {
      byId('reel' + i).classList.remove('win');
      byId('wl' + i).classList.remove('show');
      buildStrip(i);
    });
    freeSpins = 0;
    stSpins = 0;
    stWins = 0;
    stJP = 0;
    byId('stSpins').textContent = stSpins;
    byId('stWins').textContent = stWins;
    byId('stJP').textContent = stJP;
    updateFSCount();
    showSlotMsg('КРУТИ - РИСКУЙ - ПОБЕЖДАЙ', 'idle');
    byId('slotsWin').textContent = '-';
    if (bonusTimer) clearInterval(bonusTimer);
    bonusCooldown = false;
    byId('bonusBtn').disabled = false;
    byId('bonusTimer').textContent = '';
  }

  function easeInOutCubic(t) {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  function spinReel(i, dur, target) {
    return new Promise((resolve) => {
      const el = byId('strip' + i);
      const reelHeight = byId('reel' + i)?.clientHeight || 165;
      const laps = 2 + i;
      const diff = (target - curIdx[i] + STRIP_N) % STRIP_N;
      const total = (laps * STRIP_N + diff) * reelHeight;
      const startTop = curIdx[i] * reelHeight;
      const t0 = performance.now();
      let lastSound = 0;

      function tick(now) {
        const p = Math.min((now - t0) / dur, 1);
        const cur = startTop + total * easeInOutCubic(p);
        el.style.top = -(cur % (STRIP_N * reelHeight)) + 'px';
        if (now - lastSound > 80) {
          snd.reel();
          lastSound = now;
        }
        if (p < 1) {
          requestAnimationFrame(tick);
        } else {
          el.style.top = -target * reelHeight + 'px';
          curIdx[i] = target;
          const c = reelCenter(i);
          burst(c.x, c.y, 14, 'gold');
          resolve();
        }
      }
      requestAnimationFrame(tick);
    });
  }

  function changeBet(delta) {
    slotBet = Math.max(25, Math.min(250, slotBet + delta));
    byId('betVal').textContent = slotBet;
    snd.click();
  }

  async function spin() {
    if (slotSpinning) return;

    const isFree = freeSpins > 0;
    if (!isFree) {
      if (score < slotBet) {
        showSlotMsg('NOT ENOUGH COINS', 'lose');
        return;
      }
      setScore(score - slotBet, false);
    } else {
      freeSpins--;
      updateFSCount();
      showSlotMsg('FREE FREESPIN', 'bonus');
    }

    slotSpinning = true;
    byId('spinBtn').disabled = true;
    byId('slotsWin').textContent = '-';

    stSpins++;
    byId('stSpins').textContent = stSpins;

    [0, 1, 2].forEach((i) => {
      byId('reel' + i).classList.remove('win');
      byId('wl' + i).classList.remove('show');
    });

    let targets;
    const forceWin = Math.random() < 0.27;

    if (forceWin) {
      const winSymbol = Math.floor(Math.random() * PHOTO_SYMBOLS.length);
      targets = [0, 1, 2].map((i) => {
        const idx = strips[i].arr.findIndex((s) => s === winSymbol);
        return idx >= 0 ? idx : Math.floor(Math.random() * STRIP_N);
      });
    } else {
      targets = [0, 1, 2].map(() => Math.floor(Math.random() * STRIP_N));
    }

    const res = targets.map((t, i) => strips[i].arr[t]);

    await Promise.all(targets.map((t, i) => spinReel(i, SPIN_DUR[i], t)));

    const isWin = res[0] === res[1] && res[1] === res[2];

    if (isWin) {
      const symbol = PHOTO_SYMBOLS[res[0]];
      const multiplier = isFree ? symbol.mult + 1 : symbol.mult;
      const prize = slotBet * multiplier;
      setScore(score + prize, true);
      byId('slotsWin').textContent = '+' + prize;
      stWins++;
      stJP++;
      byId('stWins').textContent = stWins;
      byId('stJP').textContent = stJP;
      [0, 1, 2].forEach((i) => {
        byId('reel' + i).classList.add('win');
        byId('wl' + i).classList.add('show');
      });
      showSlotMsg(`JACKPOT ${symbol.title} x${multiplier}`, 'win');
      snd.jp();
      jpFlash();
      showJPBanner('JACKPOT!', `${symbol.title}  x${multiplier}`);
      const c = screenCenter();
      burst(c.x, c.y, 95, 'explosion');
      for (let i = 0; i < 40; i++) particles.push(new Particle(Math.random() * window.innerWidth, -10, 'coin'));
    } else {
      showSlotMsg(isFree ? 'FREESPIN MISS' : 'ONE MORE SPIN FOR BONUS', 'lose');
      snd.lose();
      [0, 1, 2].forEach((i) => {
        const c = reelCenter(i);
        burst(c.x, c.y, 6, 'red');
      });
    }

    slotSpinning = false;
    byId('spinBtn').disabled = false;
  }

  function claimBonus() {
    if (bonusCooldown) return;
    setScore(score + 200, true);
    freeSpins += 3;
    updateFSCount();
    showSlotMsg('+200 COINS AND 3 FREESPINS', 'bonus');
    snd.bonus();

    bonusCooldown = true;
    byId('bonusBtn').disabled = true;
    bonusEnd = Date.now() + 15000;

    bonusTimer = setInterval(() => {
      const left = Math.ceil((bonusEnd - Date.now()) / 1000);
      if (left <= 0) {
        clearInterval(bonusTimer);
        bonusCooldown = false;
        byId('bonusBtn').disabled = false;
        byId('bonusTimer').textContent = '';
      } else {
        byId('bonusTimer').textContent = left + 'с';
      }
    }, 250);
  }

  const SUITS = ['♠', '♣', '♥', '♦'];
  const RANKS = ['A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K'];

  let deck = [];
  let dealerHand = [];
  let playerHand = [];
  let bjBet = 0;
  let bjPhase = 'bet';

  function makeDeck() {
    deck = [];
    for (let s = 0; s < 4; s++) {
      for (let r = 0; r < 13; r++) {
        deck.push({
          suit: SUITS[s],
          rank: RANKS[r],
          val: r < 9 ? r + 2 : r >= 9 ? 10 : 11,
          hidden: false
        });
      }
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
  }

  function drawCard() {
    return deck.pop();
  }

  function handValue(hand) {
    let total = 0;
    let aces = 0;
    hand.forEach((c) => {
      if (c.hidden) return;
      if (c.rank === 'A') {
        total += 11;
        aces++;
      } else {
        total += c.val;
      }
    });
    while (total > 21 && aces > 0) {
      total -= 10;
      aces--;
    }
    return total;
  }

  function isBlackjack(hand) {
    return hand.length === 2 && handValue(hand) === 21;
  }

  function cardEl(c) {
    const red = c.suit === '♥' || c.suit === '♦';
    const div = document.createElement('div');
    div.className = 'card ' + (c.hidden ? 'hidden' : red ? 'red-card' : 'black-card');
    if (c.hidden) {
      div.innerHTML = '🂠';
    } else {
      div.innerHTML = `<div class="card-rank">${c.rank}</div><div class="card-suit">${c.suit}</div>`;
    }
    return div;
  }

  function renderHands(showDealer) {
    const dc = byId('dealerCards');
    const pc = byId('playerCards');
    dc.innerHTML = '';
    pc.innerHTML = '';
    dealerHand.forEach((c) => dc.appendChild(cardEl(c)));
    playerHand.forEach((c) => pc.appendChild(cardEl(c)));

    const dealerVal = showDealer
      ? handValue(dealerHand)
      : handValue([dealerHand.find((c) => !c.hidden) || { rank: '?', suit: '', val: 0 }]);
    const playerVal = handValue(playerHand);

    byId('dealerScore').textContent = showDealer ? dealerVal : '?';
    const ps = byId('playerScore');
    ps.textContent = playerHand.length ? playerVal : '-';
    ps.className = 'bj-score-display' + (playerVal > 21 ? ' bust' : playerVal === 21 && playerHand.length === 2 ? ' bj' : '');
  }

  function setBjMsg(text, type) {
    const el = byId('bjMsg');
    el.className = 'bj-msg show ' + type;
    el.textContent = text;
  }

  function updateBjBet() {
    byId('bjBetShow').textContent = bjBet;
    byId('bjCurBet').textContent = bjBet;
  }

  function setBjPhase(ph) {
    bjPhase = ph;
    byId('bjDeal').disabled = ph !== 'bet';
    byId('bjHit').disabled = ph !== 'play';
    byId('bjStand').disabled = ph !== 'play';
    byId('bjDouble').disabled = ph !== 'play' || score < bjBet;
    byId('bjClear').disabled = ph === 'play';
  }

  function addBet(n) {
    if (bjPhase !== 'bet') return;
    if (bjBet + n > score) return;
    bjBet += n;
    updateBjBet();
    snd.click();
  }

function bjClear() {
  if (bjPhase === 'play') return;

 
  bjBet = 0;
  dealerHand = [];
  playerHand = [];
  bjPhase = 'bet';

  // Clear UI
  byId('dealerCards').innerHTML = '';
  byId('playerCards').innerHTML = '';
  byId('dealerScore').textContent = '—';
  byId('playerScore').textContent = '—';
  byId('bjMsg').className = 'bj-msg';

  updateBjBet();
  setBjPhase('bet');

  snd.click();
}

  function bjDeal() {
    if (bjBet <= 0) {
      setBjMsg('MAKE A BET', 'lose');
      return;
    }
    if (bjBet > score) {
      setBjMsg('NOT ENOUGH MONEY', 'lose');
      return;
    }

    makeDeck();
    dealerHand = [];
    playerHand = [];

    setScore(score - bjBet, false);

    playerHand.push(drawCard(), drawCard());
    dealerHand.push(drawCard(), { ...drawCard(), hidden: true });
    renderHands(false);
    byId('bjMsg').className = 'bj-msg';
    setBjPhase('play');
    snd.card();

    if (isBlackjack(playerHand)) setTimeout(() => bjFinish('player_bj'), 350);
  }

  function bjHit() {
    if (bjPhase !== 'play') return;
    playerHand.push(drawCard());
    renderHands(false);
    snd.card();

    const pv = handValue(playerHand);
    if (pv > 21) setTimeout(() => bjFinish('bust'), 300);
    else if (pv === 21) setTimeout(() => bjStand(), 250);
  }

  async function bjStand() {
    if (bjPhase !== 'play') return;
    setBjPhase('done');

    dealerHand.forEach((c) => (c.hidden = false));
    renderHands(true);
    await new Promise((r) => setTimeout(r, 400));

    while (handValue(dealerHand) < 17) {
      dealerHand.push(drawCard());
      renderHands(true);
      snd.card();
      await new Promise((r) => setTimeout(r, 300));
    }

    bjFinish('stand');
  }

  function bjDouble() {
    if (bjPhase !== 'play') return;
    if (score < bjBet) {
      setBjMsg('NOT ENOUGH TO DOUBLE', 'lose');
      return;
    }

    setScore(score - bjBet, false);
    bjBet *= 2;
    updateBjBet();

    playerHand.push(drawCard());
    renderHands(false);
    snd.card();

    if (handValue(playerHand) > 21) bjFinish('bust');
    else bjStand();
  }

  function bjFinish(reason) {
    dealerHand.forEach((c) => (c.hidden = false));
    renderHands(true);
    setBjPhase('done');

    const pv = handValue(playerHand);
    const dv = handValue(dealerHand);

    let result = 'lose';
    let pay = 0;

    if (reason === 'bust') {
      result = 'lose';
      pay = 0;
    } else if (reason === 'player_bj') {
      if (isBlackjack(dealerHand)) {
        result = 'push';
        pay = bjBet;
      } else {
        result = 'bj';
        pay = Math.floor(bjBet * 2.5);
      }
    } else if (dv > 21 || pv > dv) {
      result = 'win';
      pay = bjBet * 2;
    } else if (pv === dv) {
      result = 'push';
      pay = bjBet;
    }

    if (pay > 0) setScore(score + pay, true);

    if (result === 'win') setBjMsg(`ПОБЕДА +${pay}`, 'win');
    if (result === 'bj') setBjMsg(`БЛЭКДЖЕК +${pay}`, 'bj');
    if (result === 'push') setBjMsg(`НИЧЬЯ +${pay}`, 'push');
    if (result === 'lose') setBjMsg(`ПРОИГРЫШ -${bjBet}`, 'lose');

    if (result === 'win' || result === 'bj') {
      snd.win();
      const c = screenCenter();
      burst(c.x, c.y, 35, result === 'bj' ? 'explosion' : 'gold');
    } else if (result === 'lose') {
      snd.lose();
    }

    bjBet = 0;
    updateBjBet();
  }

  function bjReset() {
    bjBet = 0;
    bjPhase = 'bet';
    dealerHand = [];
    playerHand = [];
    byId('dealerCards').innerHTML = '';
    byId('playerCards').innerHTML = '';
    byId('dealerScore').textContent = '-';
    byId('playerScore').textContent = '-';
    byId('bjMsg').className = 'bj-msg';
    updateBjBet();
    setBjPhase('bet');
  }

  let cfBet = 0;
  let cfChoice = null;
  let cfFlipping = false;
  let cfStreak = 0;
  let cfBestStreak = 0;

  function updateCfBtn() {
    byId('cfTossBtn').disabled = cfFlipping || cfBet <= 0 || cfChoice === null;
  }

  function chooseSide(side) {
    if (cfFlipping) return;
    cfChoice = side;
    byId('cfHeadsBtn').classList.toggle('selected', side === 'heads');
    byId('cfTailsBtn').classList.toggle('selected', side === 'tails');
    updateCfBtn();
    snd.click();
  }

  function cfAddBet(n) {
    if (cfFlipping) return;
    if (cfBet + n > score) return;
    cfBet += n;
    byId('cfCurBet').textContent = cfBet;
    updateCfBtn();
    snd.click();
  }

  function cfToss() {
    if (cfFlipping || cfBet <= 0 || cfChoice === null) return;
    if (score < cfBet) {
      const el = byId('cfResult');
      el.textContent = 'NOT ENOUGH COINS';
      el.className = 'cf-result-text show lose';
      return;
    }

    cfFlipping = true;
    updateCfBtn();
    setScore(score - cfBet, false);

    const result = Math.random() < 0.5 ? 'heads' : 'tails';
    const wrap = byId('coinWrap');
    wrap.className = 'coin-wrap ' + (result === 'heads' ? 'flip-heads' : 'flip-tails');
    byId('cfResult').className = 'cf-result-text';

    snd.coin();

    setTimeout(() => {
      const win = result === cfChoice;
      const label = result === 'heads' ? 'ROCKET' : 'EXPLOSION';
      const el = byId('cfResult');

      if (win) {
        const payout = cfBet * 2;
        setScore(score + payout, true);
        cfStreak++;
        if (cfStreak > cfBestStreak) cfBestStreak = cfStreak;
        el.textContent = `${label} - ПОБЕДА +${payout}`;
        el.className = 'cf-result-text show win';
        snd.win();
        const c = screenCenter();
        burst(c.x, c.y, 30, 'gold');
      } else {
        cfStreak = 0;
        el.textContent = `${label} - МИМО -${cfBet}`;
        el.className = 'cf-result-text show lose';
        snd.lose();
        const c = screenCenter();
        burst(c.x, c.y, 20, 'red');
      }

      byId('cfStreak').textContent = cfStreak;
      byId('cfStreakDisp').textContent = cfStreak;
      byId('cfBestStreak').textContent = cfBestStreak;

      cfBet = 0;
      byId('cfCurBet').textContent = 0;
      cfFlipping = false;
      updateCfBtn();
      wrap.className = 'coin-wrap';
    }, 850);
  }

  function cfReset() {
    cfBet = 0;
    cfChoice = null;
    cfFlipping = false;
    cfStreak = 0;
    byId('cfCurBet').textContent = 0;
    byId('cfResult').className = 'cf-result-text';
    byId('cfHeadsBtn').classList.remove('selected');
    byId('cfTailsBtn').classList.remove('selected');
    byId('cfStreak').textContent = 0;
    byId('cfStreakDisp').textContent = 0;
    byId('cfBestStreak').textContent = cfBestStreak;
    updateCfBtn();
  }

  let crashBet = 0;
  let crashRunning = false;
  let crashCashed = false;
  let crashMul = 1;
  let crashPoint = 1.5;
  let crashBestX = 1;
  let crashStartTs = 0;
  let crashAnim = null;
  let crashHistory = [];
  let crashAutoAt = 0;

  function setCrashMsg(text) {
    byId('crashMsg').textContent = text;
  }

  function updateCrashBetView() {
    byId('crashBet').textContent = crashBet;
  }

  function updateCrashButtons() {
    byId('crashStartBtn').disabled = crashRunning;
    byId('crashCashoutBtn').disabled = !crashRunning || crashCashed;
    byId('crashClearBtn').disabled = crashRunning;
  }

  function updateCrashBestX() {
    byId('crashBestX').textContent = crashBestX.toFixed(2) + 'x';
  }
  function updateCrashAutoView() {
    byId('crashAutoDisp').textContent = crashAutoAt > 0 ? `${crashAutoAt.toFixed(2)}x` : 'OFF';
  }

  function placeRocket(progress) {
    const arena = byId('crashScreen')?.querySelector('.crash-arena');
    const rocket = byId('crashRocket');
    if (!arena || !rocket) return;
    const width = arena.clientWidth;
    const height = arena.clientHeight;
    const x = 12 + Math.pow(progress, 0.92) * (width - 168);
    const y = 6 + Math.pow(progress, 1.28) * (height - 150);
    const wobble = Math.sin(crashMul * 8.2) * (1 - progress) * 2.2;
    const tilt = -12 - progress * 24;
    const flameScale = 1 + Math.min(2.2, progress * 1.6 + crashMul * 0.04);
    const trailLen = 34 + progress * 92;
    rocket.style.setProperty('--flame-scale', flameScale.toFixed(2));
    rocket.style.setProperty('--trail-len', `${trailLen.toFixed(1)}px`);
    rocket.style.transform = `translate(${x.toFixed(2)}px, ${(-y + wobble).toFixed(2)}px) rotate(${tilt.toFixed(2)}deg)`;
  }

  function renderCrashHistory() {
    const wrap = byId('crashHistory');
    wrap.innerHTML = '';
    crashHistory.slice(0, 12).forEach((row) => {
      const d = document.createElement('div');
      d.className = 'crash-pill ' + (row.win ? 'win' : 'boom');
      d.textContent = `${row.win ? '💰' : '💥'} ${row.x.toFixed(2)}x`;
      wrap.appendChild(d);
    });
  }

  function pushCrashHistory(x, win) {
    crashHistory.unshift({ x, win });
    if (crashHistory.length > 20) crashHistory.length = 20;
    renderCrashHistory();
  }

  function genCrashPoint() {
    const r = Math.random();
    
    if (r < 0.22) return 1.25 + Math.random() * 0.65; 
    if (r < 0.68) return 1.9 + Math.random() * 2.2;   
    if (r < 0.9) return 4.1 + Math.random() * 4.2;   
    return 8.3 + Math.random() * 12.7;                
  }

  function explodeRocket() {
    const boom = byId('crashBoom');
    const rocket = byId('crashRocket');
    const arena = byId('crashScreen')?.querySelector('.crash-arena');
    if (!boom || !rocket) return;
    if (!arena) return;
    const rr = rocket.getBoundingClientRect();
    const ar = arena.getBoundingClientRect();
    const left = rr.left - ar.left + rr.width * 0.2;
    const top = rr.top - ar.top - rr.height * 0.25;
    boom.style.left = `${left}px`;
    boom.style.top = `${top}px`;
    boom.classList.add('show');
    rocket.classList.add('is-boomed');
    setTimeout(() => boom.classList.remove('show'), 550);
  }

  function crashTick(now) {
    if (!crashRunning) return;
    const t = (now - crashStartTs) / 1000;
    crashMul = 1 + t * 0.9 + t * t * 0.38;
    byId('crashMult').textContent = `${crashMul.toFixed(2)}x`;
    const progress = Math.min(1, (crashMul - 1) / Math.max(0.1, crashPoint - 1));
    placeRocket(progress);

    if (crashMul > crashBestX) {
      crashBestX = crashMul;
      updateCrashBestX();
    }
    if (crashAutoAt > 0 && !crashCashed && crashMul >= crashAutoAt) {
      crashCashout();
    }

    if (crashMul >= crashPoint) {
      crashRunning = false;
      byId('crashMult').textContent = `${crashPoint.toFixed(2)}x`;
      explodeRocket();
      if (crashCashed) {
        setCrashMsg(`LUCKY JET: CRASH AT ${crashPoint.toFixed(2)}x · CASHOUT SUCCESSFUL`);
        pushCrashHistory(crashPoint, true);
      } else {
        setCrashMsg(`💥 LUCKY JET: CRASH AT ${crashPoint.toFixed(2)}x · BET LOST`);
        snd.lose();
        pushCrashHistory(crashPoint, false);
      }
      crashBet = 0;
      updateCrashBetView();
      updateCrashButtons();
      return;
    }

    crashAnim = requestAnimationFrame(crashTick);
  }

  function crashAddBet(n) {
    if (crashRunning) return;
    if (crashBet + n > score) return;
    crashBet += n;
    updateCrashBetView();
    snd.click();
  }

  function crashClearBet() {
    if (crashRunning) return;
    crashBet = 0;
    updateCrashBetView();
    snd.click();
  }

  function crashStart() {
    if (crashRunning) return;
    if (crashBet <= 0) {
      setCrashMsg('PLACE YOUR BET FIRST');
      return;
    }
    if (score < crashBet) {
      setCrashMsg('NOT ENOUGH COINS');
      return;
    }

    setScore(score - crashBet, false);
    crashRunning = true;
    crashCashed = false;
    crashMul = 1;
    crashPoint = genCrashPoint();
    crashStartTs = performance.now();
    byId('crashMult').textContent = '1.00x';
    setCrashMsg('LUCKY JET ВЗЛЕТАЕТ... УСПЕЙ НАЖАТЬ ВЫВОД');
    placeRocket(0);
    byId('crashRocket').classList.remove('is-boomed');
    byId('crashBoom').classList.remove('show');
    updateCrashButtons();
    snd.click();
    crashAnim = requestAnimationFrame(crashTick);
  }

  function crashCashout() {
    if (!crashRunning || crashCashed) return;
    crashCashed = true;
    const payout = Math.floor(crashBet * crashMul);
    setScore(score + payout, true);
    setCrashMsg(`ВЫВОД УСПЕШЕН: +${payout} НА ${crashMul.toFixed(2)}x`);
    byId('crashCashoutBtn').disabled = true;
    snd.win();
  }
  function setCrashAuto(v) {
    crashAutoAt = Math.max(0, Number(v) || 0);
    updateCrashAutoView();
    snd.click();
  }

  function crashReset() {
    if (crashAnim) cancelAnimationFrame(crashAnim);
    crashRunning = false;
    crashCashed = false;
    crashBet = 0;
    crashMul = 1;
    crashPoint = 1.5;
    crashBestX = 1;
    crashHistory = [];
    byId('crashMult').textContent = '1.00x';
    byId('crashRocket').classList.remove('is-boomed');
    byId('crashBoom').classList.remove('show');
    setCrashMsg('Сделай ставку и запусти LUCKY JET');
    updateCrashBetView();
    updateCrashBestX();
    updateCrashAutoView();
    renderCrashHistory();
    placeRocket(0);
    updateCrashButtons();
  }

  const DICE_FACES = ['⚀', '⚁', '⚂', '⚃', '⚄', '⚅'];
  let diceBet = 0;
  let diceChoice = null;
  let diceRolling = false;
  let diceStreak = 0;
  let diceBestStreak = 0;

  function updateDiceBetView() {
    byId('diceBet').textContent = diceBet;
  }
  function updateDiceRollBtn() {
    byId('diceRollBtn').disabled = diceRolling || diceBet <= 0 || !diceChoice;
  }
  function setDiceResult(text, type) {
    const el = byId('diceResult');
    el.textContent = text;
    el.style.color = type === 'win' ? 'var(--green)' : type === 'lose' ? 'var(--red2)' : 'var(--gold2)';
  }
  function diceChoose(choice) {
    if (diceRolling) return;
    diceChoice = choice;
    byId('diceLowBtn').classList.toggle('selected', choice === 'low');
    byId('diceSevenBtn').classList.toggle('selected', choice === 'seven');
    byId('diceHighBtn').classList.toggle('selected', choice === 'high');
    updateDiceRollBtn();
    snd.click();
  }
  function diceAddBet(n) {
    if (diceRolling) return;
    if (diceBet + n > score) return;
    diceBet += n;
    updateDiceBetView();
    updateDiceRollBtn();
    snd.click();
  }
  function diceClearBet() {
    if (diceRolling) return;
    diceBet = 0;
    updateDiceBetView();
    updateDiceRollBtn();
    snd.click();
  }
  function diceOutcome(sum) {
    if (sum === 7) return 'seven';
    if (sum <= 6) return 'low';
    return 'high';
  }
  async function diceRoll() {
    if (diceRolling || !diceChoice || diceBet <= 0) return;
    if (score < diceBet) {
      setDiceResult('NOT ENOUGH COINS', 'lose');
      return;
    }
    diceRolling = true;
    updateDiceRollBtn();
    setScore(score - diceBet, false);

    for (let i = 0; i < 9; i++) {
      const a = Math.floor(Math.random() * 6) + 1;
      const b = Math.floor(Math.random() * 6) + 1;
      byId('die1').textContent = DICE_FACES[a - 1];
      byId('die2').textContent = DICE_FACES[b - 1];
      byId('diceSum').textContent = `СУММА: ${a + b}`;
      snd.reel();
      await new Promise((r) => setTimeout(r, 70 + i * 12));
    }

    const d1 = Math.floor(Math.random() * 6) + 1;
    const d2 = Math.floor(Math.random() * 6) + 1;
    const sum = d1 + d2;
    const outcome = diceOutcome(sum);
    byId('die1').textContent = DICE_FACES[d1 - 1];
    byId('die2').textContent = DICE_FACES[d2 - 1];
    byId('diceSum').textContent = `СУММА: ${sum}`;

    const win = outcome === diceChoice;
    if (win) {
      const mult = outcome === 'seven' ? 5 : 2;
      const payout = diceBet * mult;
      setScore(score + payout, true);
      diceStreak++;
      if (diceStreak > diceBestStreak) diceBestStreak = diceStreak;
      setDiceResult(`ПОБЕДА +${payout} (${mult}x)`, 'win');
      snd.win();
      const c = screenCenter();
      burst(c.x, c.y, 25, 'gold');
    } else {
      diceStreak = 0;
      setDiceResult(`МИМО -${diceBet}`, 'lose');
      snd.lose();
    }
    byId('diceStreak').textContent = diceStreak;
    byId('diceStreakDisp').textContent = diceStreak;
    byId('diceBestStreak').textContent = diceBestStreak;
    diceBet = 0;
    updateDiceBetView();
    diceRolling = false;
    updateDiceRollBtn();
  }
  function diceReset() {
    diceBet = 0;
    diceChoice = null;
    diceRolling = false;
    diceStreak = 0;
    diceBestStreak = 0;
    byId('die1').textContent = '⚀';
    byId('die2').textContent = '⚀';
    byId('diceSum').textContent = 'SUM: —';
    byId('diceStreak').textContent = '0';
    byId('diceStreakDisp').textContent = '0';
    byId('diceBestStreak').textContent = '0';
    byId('diceLowBtn').classList.remove('selected');
    byId('diceSevenBtn').classList.remove('selected');
    byId('diceHighBtn').classList.remove('selected');
    setDiceResult('Choose outcome and roll dice', 'info');
    updateDiceBetView();
    updateDiceRollBtn();
  }

  function restartGame() {
    score = MAX_SCORE;
    refreshAllBals(true);
    byId('gameOver').classList.remove('show');
    slotReset();
    bjReset();
    cfReset();
    crashReset();
    diceReset();
    snd.click();
  }

  window.gotoScreen = gotoScreen;
  window.scrollToVIP = scrollToVIP;
  window.changeBet = changeBet;
  window.spin = spin;
  window.claimBonus = claimBonus;
  window.addBet = addBet;
  window.bjDeal = bjDeal;
  window.bjHit = bjHit;
  window.bjStand = bjStand;
  window.bjDouble = bjDouble;
  window.bjClear = bjClear;
  window.chooseSide = chooseSide;
  window.cfAddBet = cfAddBet;
  window.cfToss = cfToss;
  window.crashAddBet = crashAddBet;
  window.crashClearBet = crashClearBet;
  window.crashStart = crashStart;
  window.crashCashout = crashCashout;
  window.setCrashAuto = setCrashAuto;
  window.diceChoose = diceChoose;
  window.diceAddBet = diceAddBet;
  window.diceClearBet = diceClearBet;
  window.diceRoll = diceRoll;
  window.restartGame = restartGame;

 
  function createFloatingParticles() {
    const container = byId('floatingParticles');
    if (!container) return;

    for (let i = 0; i < 50; i++) {
      const particle = document.createElement('div');
      particle.className = 'floating-particle';
      particle.style.left = Math.random() * 100 + '%';
      particle.style.top = Math.random() * 100 + '%';
      particle.style.animationDelay = Math.random() * 20 + 's';
      particle.style.animationDuration = (Math.random() * 10 + 10) + 's';
      container.appendChild(particle);
    }
  }
  createFloatingParticles();

  slotReset();
  bjReset();
  cfReset();
  crashReset();
  diceReset();
  refreshAllBals(false);

  
});
