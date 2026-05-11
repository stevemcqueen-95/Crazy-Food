const state = {
  coins: 0,
  perClick: 1,
  clickCount: 0,
  won: false,
  purchased: new Set(),
  burglarActive: false,
  policeCalled: false,
};

const ultimateCost = 1000000000;
const burglarStartCoins = 25000000;
const policeCost = 300000000;
const burglarStealRate = 0.12;
const burglarStealInterval = 5000;

const upgrades = [
  { id: "fries", name: "Fries", emoji: "🍟", cost: 25, multiplier: 2 },
  { id: "shake", name: "Milkshake", emoji: "🥤", cost: 120, multiplier: 3 },
  { id: "nuggets", name: "Nuggets", emoji: "🍗", cost: 500, multiplier: 4 },
  { id: "pizza", name: "Pizza Slice", emoji: "🍕", cost: 1400, multiplier: 5 },
  { id: "taco", name: "Mega Taco", emoji: "🌮", cost: 2800, multiplier: 6 },
  { id: "hotdog", name: "Hot Dog", emoji: "🌭", cost: 4200, multiplier: 7 },
  { id: "donut", name: "Glazed Donut", emoji: "🍩", cost: 6200, multiplier: 8 },
  { id: "pancakes", name: "Pancake Stack", emoji: "🥞", cost: 9000, multiplier: 9 },
  { id: "sushi", name: "Sushi Roll", emoji: "🍣", cost: 13000, multiplier: 10 },
  { id: "ramen", name: "Ramen Bowl", emoji: "🍜", cost: 18500, multiplier: 12 },
  { id: "steak", name: "Golden Steak", emoji: "🥩", cost: 26000, multiplier: 14 },
  { id: "cake", name: "Victory Cake", emoji: "🍰", cost: 36000, multiplier: 16 },
  { id: "bento", name: "Bento Box", emoji: "🍱", cost: 52000, multiplier: 18 },
  { id: "pasta", name: "Truffle Pasta", emoji: "🍝", cost: 76000, multiplier: 20 },
  { id: "fondue", name: "Cheese Fondue", emoji: "🫕", cost: 110000, multiplier: 24 },
  { id: "curry", name: "Royal Curry", emoji: "🍛", cost: 160000, multiplier: 28 },
  { id: "ultimatePrep", name: "Feast Platter", emoji: "🍽️", cost: 240000, multiplier: 32 },
];

const coinsEl = document.querySelector("#coins");
const perClickEl = document.querySelector("#perClick");
const progressBarEl = document.querySelector("#progressBar");
const progressTextEl = document.querySelector("#progressText");
const shopItemsEl = document.querySelector("#shopItems");
const eaterEl = document.querySelector("#eater");
const floatersEl = document.querySelector("#floaters");
const messageEl = document.querySelector("#message");
const ultimateButtonEl = document.querySelector("#ultimateButton");
const goalLabelEl = document.querySelector("#goalLabel");
const victoryScreenEl = document.querySelector("#victoryScreen");
const retryButtonEl = document.querySelector("#retryButton");
const burglarPanelEl = document.querySelector("#burglarPanel");
const burglarTitleEl = document.querySelector("#burglarTitle");
const burglarTextEl = document.querySelector("#burglarText");
const policeButtonEl = document.querySelector("#policeButton");
let victoryAudioContext;
let victoryMusicTimer;
let burglarTimer;
let gameAudioContext;
let backgroundMusicTimer;
let backgroundMusicStep = 0;

function formatNumber(value) {
  return Math.floor(value).toLocaleString();
}

function render() {
  if (!state.policeCalled && !state.burglarActive && state.coins >= burglarStartCoins && !state.won) {
    startBurglar();
  }

  coinsEl.textContent = formatNumber(state.coins);
  perClickEl.textContent = formatNumber(state.perClick);
  goalLabelEl.textContent = formatNumber(ultimateCost);

  const progress = Math.min(100, Math.floor((state.coins / ultimateCost) * 100));
  progressBarEl.style.width = `${progress}%`;
  progressTextEl.textContent = `${progress}%`;
  ultimateButtonEl.disabled = state.coins < ultimateCost || state.won;
  policeButtonEl.disabled = !state.burglarActive || state.coins < policeCost || state.won;

  if (state.policeCalled) {
    burglarPanelEl.className = "burglar-panel safe";
    burglarTitleEl.textContent = "Police on patrol";
    burglarTextEl.textContent = "Burglars are gone for the rest of this run.";
  } else if (state.burglarActive) {
    burglarPanelEl.className = "burglar-panel danger";
    burglarTitleEl.textContent = "Burglars are stealing";
    burglarTextEl.textContent = `They take 12% of your coins every 5 seconds. Police cost ${formatNumber(policeCost)}.`;
  } else {
    burglarPanelEl.className = "burglar-panel";
    burglarTitleEl.textContent = "Restaurant secure";
    burglarTextEl.textContent = `Burglars appear after ${formatNumber(burglarStartCoins)} coins.`;
  }

  document.querySelectorAll(".shop-item").forEach((button) => {
    const upgrade = upgrades.find((item) => item.id === button.dataset.id);
    const owned = state.purchased.has(upgrade.id);
    button.disabled = owned || state.coins < upgrade.cost || state.won;
    button.classList.toggle("owned", owned);
    const statusEl = button.querySelector(".status");
    statusEl.textContent = owned
      ? "Owned"
      : `Cost ${formatNumber(upgrade.cost)} coins · x${formatNumber(upgrade.multiplier)} per bite`;
  });
}

function startBurglar() {
  state.burglarActive = true;
  messageEl.textContent = "Burglars showed up. They will steal coins every 5 seconds.";

  if (burglarTimer) return;
  burglarTimer = window.setInterval(() => {
    if (!state.burglarActive || state.won) return;

    const stolen = Math.max(1, Math.floor(state.coins * burglarStealRate));
    state.coins = Math.max(0, state.coins - stolen);
    showFloater(`-${formatNumber(stolen)}`);
    messageEl.textContent = `A burglar stole ${formatNumber(stolen)} coins.`;
    render();
  }, burglarStealInterval);
}

function stopBurglar() {
  if (burglarTimer) {
    window.clearInterval(burglarTimer);
    burglarTimer = null;
  }

  state.burglarActive = false;
}

function getGameAudioContext() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return null;

  if (!gameAudioContext) {
    gameAudioContext = new AudioContextClass();
  }

  if (gameAudioContext.state === "suspended") {
    gameAudioContext.resume();
  }

  return gameAudioContext;
}

function playTone(context, destination, frequency, startTime, duration, type = "sine", volume = 0.18) {
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, startTime);
  gain.gain.setValueAtTime(0.0001, startTime);
  gain.gain.exponentialRampToValueAtTime(volume, startTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);
  oscillator.connect(gain);
  gain.connect(destination);
  oscillator.start(startTime);
  oscillator.stop(startTime + duration + 0.02);
}

function startBackgroundMusic() {
  if (backgroundMusicTimer || state.won) return;

  const context = getGameAudioContext();
  if (!context) return;

  const master = context.createGain();
  master.gain.value = 0.055;
  master.connect(context.destination);

  const melody = [261.63, 329.63, 392, 329.63, 349.23, 440, 392, 329.63];
  const bass = [130.81, 130.81, 174.61, 174.61, 196, 196, 174.61, 174.61];

  function playBeat() {
    if (!gameAudioContext || state.won) return;

    const now = gameAudioContext.currentTime;
    const index = backgroundMusicStep % melody.length;
    playTone(gameAudioContext, master, melody[index], now, 0.24, "triangle", 0.22);

    if (backgroundMusicStep % 2 === 0) {
      playTone(gameAudioContext, master, bass[index], now, 0.32, "sine", 0.16);
    }

    backgroundMusicStep += 1;
  }

  playBeat();
  backgroundMusicTimer = window.setInterval(playBeat, 360);
}

function stopBackgroundMusic() {
  if (backgroundMusicTimer) {
    window.clearInterval(backgroundMusicTimer);
    backgroundMusicTimer = null;
  }
}

function playBiteSound() {
  const context = getGameAudioContext();
  if (!context) return;

  const now = context.currentTime;
  const master = context.createGain();
  master.gain.value = 0.18;
  master.connect(context.destination);

  playTone(context, master, 145, now, 0.08, "square", 0.5);
  playTone(context, master, 92, now + 0.08, 0.1, "sawtooth", 0.36);
  playTone(context, master, 210, now + 0.16, 0.06, "triangle", 0.2);
}

function playMoneySound() {
  const context = getGameAudioContext();
  if (!context) return;

  const now = context.currentTime;
  const master = context.createGain();
  master.gain.value = 0.16;
  master.connect(context.destination);

  [987.77, 1318.51, 1567.98].forEach((frequency, index) => {
    playTone(context, master, frequency, now + index * 0.055, 0.16, "triangle", 0.34);
  });

  [1760, 2217.46].forEach((frequency, index) => {
    playTone(context, master, frequency, now + 0.22 + index * 0.05, 0.12, "sine", 0.22);
  });
}

function playVictoryMusic() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) return;

  stopBackgroundMusic();
  stopVictoryMusic();
  victoryAudioContext = new AudioContextClass();
  const master = victoryAudioContext.createGain();
  master.gain.value = 0.08;
  master.connect(victoryAudioContext.destination);

  const melody = [523.25, 659.25, 783.99, 1046.5, 783.99, 880, 987.77, 1046.5];
  let step = 0;

  function playNote() {
    if (!victoryAudioContext) return;

    const now = victoryAudioContext.currentTime;
    const oscillator = victoryAudioContext.createOscillator();
    const gain = victoryAudioContext.createGain();
    oscillator.type = "triangle";
    oscillator.frequency.value = melody[step % melody.length];
    gain.gain.setValueAtTime(0.0001, now);
    gain.gain.exponentialRampToValueAtTime(0.9, now + 0.03);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + 0.34);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.start(now);
    oscillator.stop(now + 0.36);
    step += 1;
  }

  playNote();
  victoryMusicTimer = window.setInterval(playNote, 380);
  window.setTimeout(stopVictoryMusic, 60000);
}

function stopVictoryMusic() {
  if (victoryMusicTimer) {
    window.clearInterval(victoryMusicTimer);
    victoryMusicTimer = null;
  }

  if (victoryAudioContext) {
    victoryAudioContext.close();
    victoryAudioContext = null;
  }
}

function showFloater(text) {
  const floater = document.createElement("span");
  floater.className = "floater";
  floater.textContent = text;
  floater.style.marginLeft = `${Math.round((Math.random() - 0.5) * 110)}px`;
  floatersEl.appendChild(floater);
  window.setTimeout(() => floater.remove(), 820);
}

function chomp() {
  if (state.won) return;

  startBackgroundMusic();
  playBiteSound();
  state.clickCount += 1;
  if (state.clickCount % 10 === 0) {
    playMoneySound();
  }
  state.coins += state.perClick;
  eaterEl.classList.add("eating");
  window.setTimeout(() => eaterEl.classList.remove("eating"), 135);
  showFloater(`+${formatNumber(state.perClick)}`);
  messageEl.textContent = "Chomp! Keep feeding him to stack coins.";
  render();
}

function buyUpgrade(upgrade) {
  if (state.coins < upgrade.cost || state.won || state.purchased.has(upgrade.id)) return;

  state.coins -= upgrade.cost;
  state.perClick *= upgrade.multiplier;
  state.purchased.add(upgrade.id);
  messageEl.textContent = `${upgrade.name} bought. Every bite now earns ${formatNumber(state.perClick)} coins.`;
  render();
}

function buyUltimate() {
  if (state.coins < ultimateCost || state.won) return;

  state.coins -= ultimateCost;
  state.won = true;
  stopBurglar();
  document.body.classList.add("win");
  victoryScreenEl.classList.add("show");
  victoryScreenEl.setAttribute("aria-hidden", "false");
  messageEl.textContent = "You bought the Ultimate Food Item. Crazy Food is conquered.";
  eaterEl.setAttribute("aria-label", "Winner holding the ultimate food item");
  playVictoryMusic();
  render();
}

function callPolice() {
  if (!state.burglarActive || state.coins < policeCost || state.won) return;

  state.coins -= policeCost;
  state.policeCalled = true;
  stopBurglar();
  messageEl.textContent = "Police arrived. The burglars will not steal any more coins.";
  render();
}

function retryGame() {
  state.coins = 0;
  state.perClick = 1;
  state.clickCount = 0;
  state.won = false;
  state.purchased.clear();
  state.burglarActive = false;
  state.policeCalled = false;
  stopBurglar();
  stopVictoryMusic();
  stopBackgroundMusic();
  backgroundMusicStep = 0;
  document.body.classList.remove("win");
  victoryScreenEl.classList.remove("show");
  victoryScreenEl.setAttribute("aria-hidden", "true");
  eaterEl.setAttribute("aria-label", "Feed the hungry burger fan");
  messageEl.textContent = "Click the eater to chomp burgers and earn coins.";
  render();
}

function buildShop() {
  upgrades.forEach((upgrade) => {
    const button = document.createElement("button");
    button.className = "shop-item";
    button.type = "button";
    button.dataset.id = upgrade.id;
    button.innerHTML = `
      <span class="food-emoji" aria-hidden="true">${upgrade.emoji}</span>
      <span>
        <strong>${upgrade.name}</strong>
        <small class="status">Cost ${formatNumber(upgrade.cost)} coins · x${formatNumber(upgrade.multiplier)} per bite</small>
      </span>
    `;
    button.addEventListener("click", () => buyUpgrade(upgrade));
    shopItemsEl.appendChild(button);
  });
}

buildShop();
eaterEl.addEventListener("click", chomp);
document.addEventListener("pointerdown", startBackgroundMusic, { once: true });
ultimateButtonEl.addEventListener("click", buyUltimate);
retryButtonEl.addEventListener("click", retryGame);
policeButtonEl.addEventListener("click", callPolice);
render();
