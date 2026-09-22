const STORAGE_KEY = "pokenergy-save-v3";
const LEGACY_STORAGE_KEYS = ["pokenergy-save-v2", "pokenergy-save-v1"];

const energyTypes = {
  grass: { name: "풀", icon: "🌿" },
  fire: { name: "불꽃", icon: "🔥" },
  water: { name: "물", icon: "💧" },
  normal: { name: "노말", icon: "⚪" }
};

const randomNatureTypes = ["grass", "fire", "water"];

const pokemonData = [
  { id: "bulbasaur", name: "이상해씨", type: "grass", unlockAt: 1, ability: "심록 I", effect: "자연에서 풀 에너지 획득량 +0.1 · 클릭마다 노말 에너지 +0.1" },
  { id: "charmander", name: "파이리", type: "fire", unlockAt: 4, ability: "맹화 I", effect: "자연에서 불꽃 에너지 획득량 +0.1 · 클릭마다 노말 에너지 +0.1" },
  { id: "squirtle", name: "꼬부기", type: "water", unlockAt: 7, ability: "급류 I", effect: "자연에서 물 에너지 획득량 +0.1 · 클릭마다 노말 에너지 +0.1" },
  { id: "rattata", name: "꼬렛", type: "normal", unlockAt: 19, ability: "몸통박치기", effect: "5초마다 자동으로 자연 탐색" }
];

const starterIds = ["bulbasaur", "charmander", "squirtle"];

const buildingData = {
  greenMeadow: {
    id: "greenMeadow",
    name: "초록 풀숲",
    description: "매초 풀 에너지 +0.1",
    cost: { grass: 50, water: 25 },
    production: { grass: 0.1 }
  }
};

const defaultState = {
  energies: { grass: 0, fire: 0, water: 0, normal: 0 },
  discovered: [],
  activeTab: "nature",
  lastGain: null,
  totalClicks: 0,
  gameStartedAt: Date.now(),
  logs: [],
  unlocks: { village: false, greenMeadow: false },
  buildings: { greenMeadow: false }
};

let state = loadState();
checkVillageUnlock(false);

function cloneDefault() {
  return JSON.parse(JSON.stringify(defaultState));
}

function roundEnergy(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function formatNumber(value) {
  return Number(value.toFixed(2)).toString();
}

function pad2(value) {
  return String(value).padStart(2, "0");
}

function formatElapsed(totalSeconds) {
  const seconds = Math.max(0, Math.floor(totalSeconds));
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (days > 0) return pad2(days) + ":" + pad2(hours) + ":" + pad2(minutes) + ":" + pad2(secs);
  if (hours > 0) return pad2(hours) + ":" + pad2(minutes) + ":" + pad2(secs);
  return pad2(minutes) + ":" + pad2(secs);
}

function getElapsedSeconds() {
  return Math.floor((Date.now() - state.gameStartedAt) / 1000);
}

function addLog(message) {
  state.logs.push({
    elapsed: getElapsedSeconds(),
    message: message
  });
  if (state.logs.length > 200) state.logs = state.logs.slice(-200);
}

function migrateSave(saved) {
  const migrated = cloneDefault();

  if (saved.energies) {
    migrated.energies = { ...migrated.energies, ...saved.energies };
  }
  migrated.discovered = Array.isArray(saved.discovered) ? saved.discovered : [];
  migrated.activeTab = saved.activeTab || "nature";
  migrated.lastGain = saved.lastGain || null;
  migrated.totalClicks = saved.totalClicks || 0;
  migrated.gameStartedAt = saved.gameStartedAt || Date.now();
  migrated.logs = Array.isArray(saved.logs) ? saved.logs : [];
  migrated.unlocks = { ...migrated.unlocks, ...(saved.unlocks || {}) };
  migrated.buildings = { ...migrated.buildings, ...(saved.buildings || {}) };

  return migrated;
}

function migrateV1Save(saved) {
  const migrated = cloneDefault();
  migrated.energies.grass = roundEnergy((saved.energies?.grass || 0) / 10);
  migrated.energies.fire = roundEnergy((saved.energies?.fire || 0) / 10);
  migrated.energies.water = roundEnergy((saved.energies?.water || 0) / 10);
  migrated.energies.normal = 0;
  migrated.discovered = Array.isArray(saved.discovered)
    ? saved.discovered.filter(function (id) { return starterIds.includes(id); })
    : [];
  migrated.activeTab = saved.activeTab || "nature";
  migrated.totalClicks = saved.totalClicks || 0;
  return migrated;
}

function loadState() {
  try {
    const current = localStorage.getItem(STORAGE_KEY);
    if (current) return migrateSave(JSON.parse(current));

    for (const key of LEGACY_STORAGE_KEYS) {
      const raw = localStorage.getItem(key);
      if (!raw) continue;
      const saved = JSON.parse(raw);
      const migrated = key === "pokenergy-save-v1" ? migrateV1Save(saved) : migrateSave(saved);
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      return migrated;
    }

    return cloneDefault();
  } catch {
    return cloneDefault();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function hasPokemon(id) {
  return state.discovered.includes(id);
}

function getNatureGain(type) {
  if (type === "grass") return 0.1 + (hasPokemon("bulbasaur") ? 0.1 : 0);
  if (type === "fire") return 0.1 + (hasPokemon("charmander") ? 0.1 : 0);
  if (type === "water") return 0.1 + (hasPokemon("squirtle") ? 0.1 : 0);
  return 0;
}

function getNormalGainPerClick() {
  let amount = 0;
  if (hasPokemon("bulbasaur")) amount += 0.1;
  if (hasPokemon("charmander")) amount += 0.1;
  if (hasPokemon("squirtle")) amount += 0.1;
  return roundEnergy(amount);
}

function getAutoExplorationsPerSecond() {
  return hasPokemon("rattata") ? 0.2 : 0;
}

function getPassiveProduction(type) {
  let amount = 0;
  if (state.buildings.greenMeadow && type === "grass") amount += buildingData.greenMeadow.production.grass;
  return roundEnergy(amount);
}

function addEnergy(type, amount) {
  state.energies[type] = roundEnergy(state.energies[type] + amount);
}

function checkVillageUnlock(writeLog = true) {
  if (state.unlocks.village || state.discovered.length < 5) return false;

  state.unlocks.village = true;
  state.unlocks.greenMeadow = true;

  if (writeLog) {
    addLog("포켓몬이 모여 마을을 이루었다!");
    addLog("마을에 초록 풀숲을 만들 수 있다!");
  }

  saveState();
  return true;
}

function discoverPokemon() {
  const found = [];

  pokemonData.forEach(function (pokemon) {
    if (!hasPokemon(pokemon.id) && state.energies[pokemon.type] >= pokemon.unlockAt) {
      state.discovered.push(pokemon.id);
      found.push(pokemon);
      addLog("어디선가 " + pokemon.name + "가 나타났다!");
    }
  });

  checkVillageUnlock(true);
  return found;
}

function gatherFromNature(options) {
  const isAuto = options && options.auto;
  const type = randomNatureTypes[Math.floor(Math.random() * randomNatureTypes.length)];
  const amount = getNatureGain(type);
  const normalAmount = getNormalGainPerClick();

  addEnergy(type, amount);
  if (normalAmount > 0) addEnergy("normal", normalAmount);
  state.totalClicks += 1;

  const discoveredNow = discoverPokemon();
  state.lastGain = {
    type: type,
    amount: amount,
    normalAmount: normalAmount,
    auto: Boolean(isAuto),
    pokemon: discoveredNow.map(function (pokemon) { return pokemon.name; })
  };

  saveState();
  render();
}

function canAfford(cost) {
  return Object.entries(cost).every(function (entry) {
    return state.energies[entry[0]] >= entry[1];
  });
}

function buildGreenMeadow() {
  const building = buildingData.greenMeadow;
  if (!state.unlocks.greenMeadow || state.buildings.greenMeadow || !canAfford(building.cost)) return;

  Object.entries(building.cost).forEach(function (entry) {
    addEnergy(entry[0], -entry[1]);
  });

  state.buildings.greenMeadow = true;
  addLog("마을에 초록 풀숲이 생겼다!");
  saveState();
  render();
}

function resetGame() {
  if (!window.confirm("현재 진행도를 모두 초기화할까요?")) return;

  state = cloneDefault();
  state.gameStartedAt = Date.now();

  localStorage.removeItem(STORAGE_KEY);
  LEGACY_STORAGE_KEYS.forEach(function (key) { localStorage.removeItem(key); });

  saveState();
  render();
}

function setTab(tab) {
  if (tab === "village" && !state.unlocks.village) return;
  state.activeTab = tab;
  saveState();
  render();
}

function renderEnergyBar() {
  let items = "";

  Object.entries(energyTypes).forEach(function (entry) {
    const type = entry[0];
    const info = entry[1];
    const production = getPassiveProduction(type);
    const productionText = production > 0
      ? '<span class="energy-production">(+' + formatNumber(production) + '/s)</span>'
      : "";

    items += '<div class="energy-pill energy-' + type + '">' +
      '<span class="energy-icon">' + info.icon + '</span>' +
      '<span class="energy-label">' + info.name + '</span>' +
      '<strong>' + formatNumber(state.energies[type]) + '</strong>' +
      productionText +
      '</div>';
  });

  return '<header class="energy-bar">' +
    '<div class="brand">Pokenergy</div>' +
    '<div class="energy-list">' + items + '</div>' +
    '</header>';
}

function renderSidebar() {
  const tabs = [["nature", "자연"], ["dex", "도감"]];
  if (state.unlocks.village) tabs.push(["village", "마을"]);
  tabs.push(["settings", "설정"]);

  let html = '<nav class="sidebar">';
  tabs.forEach(function (tab) {
    html += '<button class="tab-button ' + (state.activeTab === tab[0] ? 'active' : '') +
      '" data-tab="' + tab[0] + '">' + tab[1] + '</button>';
  });
  html += '</nav>';
  return html;
}

function renderLogs() {
  if (!state.logs.length) {
    return '<div class="log-empty">아직 특별한 기록이 없습니다.</div>';
  }

  return state.logs.slice().reverse().map(function (entry) {
    return '<div class="log-entry"><span class="log-time">[' + formatElapsed(entry.elapsed) + ']</span> ' +
      '<span>' + entry.message + '</span></div>';
  }).join("");
}

function renderNature() {
  const visiblePokemon = pokemonData.filter(function (pokemon) {
    return hasPokemon(pokemon.id);
  });

  let pokemonHtml = "";
  if (visiblePokemon.length) {
    pokemonHtml = '<div class="pokemon-meadow">';
    visiblePokemon.forEach(function (pokemon) {
      pokemonHtml += '<div class="pokemon-token type-' + pokemon.type + '">' +
        '<span class="pokemon-dot"></span><strong>' + pokemon.name + '</strong></div>';
    });
    pokemonHtml += '</div>';
  }

  let gainHtml = '<div class="gain-message muted">자연을 눌러 에너지를 모아보세요.</div>';
  if (state.lastGain) {
    const discovery = state.lastGain.pokemon.length
      ? '<span class="discovery"> · ' + state.lastGain.pokemon.join(", ") + '가 나타났다!</span>'
      : "";
    const normalText = state.lastGain.normalAmount > 0
      ? ' · ⚪ 노말 +' + formatNumber(state.lastGain.normalAmount)
      : "";
    const autoText = state.lastGain.auto ? '<span class="auto-label">자동</span>' : "";

    gainHtml = '<div class="gain-message ' + state.lastGain.type + '">' +
      autoText +
      energyTypes[state.lastGain.type].icon + ' ' +
      energyTypes[state.lastGain.type].name + ' +' + formatNumber(state.lastGain.amount) +
      normalText + discovery + '</div>';
  }

  let unlockHtml = "";
  pokemonData.forEach(function (pokemon) {
    const unlocked = hasPokemon(pokemon.id);
    const current = state.energies[pokemon.type];
    const progress = Math.min(100, (current / pokemon.unlockAt) * 100);

    unlockHtml += '<article class="unlock-card ' + (unlocked ? 'unlocked' : '') + '">' +
      '<div class="unlock-card-top"><span>' + energyTypes[pokemon.type].icon + ' ' + pokemon.name + '</span>' +
      '<span>' + (unlocked ? '발견' : formatNumber(current) + ' / ' + pokemon.unlockAt) + '</span></div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + progress + '%"></div></div>' +
      '<p><strong>[' + pokemon.ability + ']</strong> ' +
      (unlocked ? pokemon.effect : energyTypes[pokemon.type].name + ' 에너지 ' + pokemon.unlockAt + '에 출현') +
      '</p></article>';
  });

  const autoPerSecond = getAutoExplorationsPerSecond();
  const autoRateText = autoPerSecond > 0
    ? '<span class="auto-rate">(+' + formatNumber(autoPerSecond) + '/s)</span>'
    : "";

  return '<section class="panel nature-panel">' +
    '<div class="section-heading"><div><p class="eyebrow">STARTING AREA</p><h1>아무것도 없는 자연</h1></div>' +
    '<div class="click-counter">자연 탐색 ' + state.totalClicks + '회 ' + autoRateText + '</div></div>' +
    '<div class="nature-layout">' +
      '<div class="nature-main">' +
        '<button class="nature-scene" id="nature-scene" aria-label="자연에서 에너지 획득">' +
          '<div class="sun"></div><div class="cloud cloud-a"></div><div class="cloud cloud-b"></div>' +
          '<div class="mountain mountain-back"></div><div class="mountain mountain-front"></div>' +
          '<div class="river"></div><div class="grassland"></div>' +
          '<div class="flowers flowers-a">✿ ✦ ✿</div><div class="flowers flowers-b">✦ ✿</div>' +
          pokemonHtml +
          '<div class="nature-prompt"><strong>자연 탐색</strong><span>클릭해서 에너지를 획득</span></div>' +
        '</button>' +
        gainHtml +
      '</div>' +
      '<aside class="record-panel"><div class="record-title">기록</div><div class="record-list">' + renderLogs() + '</div></aside>' +
    '</div>' +
    '<div class="unlock-grid">' + unlockHtml + '</div>' +
    '</section>';
}

function renderDex() {
  let cards = "";

  pokemonData.forEach(function (pokemon) {
    const unlocked = hasPokemon(pokemon.id);
    cards += '<article class="dex-card ' + (unlocked ? '' : 'locked') + '">' +
      '<div class="dex-number">' + (unlocked ? energyTypes[pokemon.type].icon : '?') + '</div>' +
      '<div><h2>' + (unlocked ? pokemon.name : '미발견 포켓몬') + '</h2>' +
      '<p><strong>[' + pokemon.ability + ']</strong> ' +
      (unlocked ? pokemon.effect : energyTypes[pokemon.type].name + ' 에너지 ' + pokemon.unlockAt + '에 출현') +
      '</p></div></article>';
  });

  return '<section class="panel">' +
    '<div class="section-heading"><div><p class="eyebrow">POKÉDEX</p><h1>도감</h1></div>' +
    '<div class="click-counter">' + state.discovered.length + ' / ' + pokemonData.length + ' 발견</div></div>' +
    '<div class="dex-grid">' + cards + '</div></section>';
}

function renderVillage() {
  const building = buildingData.greenMeadow;
  const built = state.buildings.greenMeadow;
  const affordable = canAfford(building.cost);

  return '<section class="panel village-panel">' +
    '<div class="section-heading"><div><p class="eyebrow">VILLAGE</p><h1>마을</h1></div></div>' +
    '<div class="village-intro"><h2>보금자리</h2><p>포켓몬들이 살아갈 장소를 만들어 마을의 에너지 생산을 늘립니다.</p></div>' +
    '<div class="building-grid">' +
      '<article class="building-card ' + (built ? 'built' : '') + '">' +
        '<div class="building-visual meadow-visual">🌿</div>' +
        '<div class="building-body">' +
          '<div class="building-title-row"><h2>' + building.name + '</h2><span>' + (built ? '건설 완료' : '건설 가능') + '</span></div>' +
          '<p>' + building.description + '</p>' +
          '<div class="building-cost"><span>🌿 풀 50</span><span>💧 물 25</span></div>' +
          (built
            ? '<div class="built-status">매초 🌿 풀 에너지 +0.1 생산 중</div>'
            : '<button id="build-green-meadow" ' + (affordable ? '' : 'disabled') + '>' +
                (affordable ? '초록 풀숲 건설' : '에너지가 부족합니다') +
              '</button>') +
        '</div>' +
      '</article>' +
    '</div>' +
    '</section>';
}

function renderSettings() {
  return '<section class="panel">' +
    '<div class="section-heading"><div><p class="eyebrow">SETTINGS</p><h1>설정</h1></div></div>' +
    '<div class="settings-card"><h2>저장</h2><p>진행도와 기록은 이 브라우저에 자동 저장됩니다.</p></div>' +
    '<div class="settings-card danger"><h2>진행도 초기화</h2><p>에너지, 포켓몬, 건물, 기록과 게임 시작 시간을 모두 초기화합니다.</p>' +
    '<button id="reset-button">게임 초기화</button></div></section>';
}

function renderContent() {
  if (state.activeTab === "dex") return renderDex();
  if (state.activeTab === "village" && state.unlocks.village) return renderVillage();
  if (state.activeTab === "settings") return renderSettings();
  return renderNature();
}

function render() {
  const app = document.querySelector("#app");

  if (!state.unlocks.village && state.activeTab === "village") state.activeTab = "nature";

  app.innerHTML = renderEnergyBar() +
    '<div class="app-shell">' + renderSidebar() +
    '<main class="content">' + renderContent() + '</main></div>';

  document.querySelectorAll("[data-tab]").forEach(function (button) {
    button.addEventListener("click", function () { setTab(button.dataset.tab); });
  });

  const natureScene = document.querySelector("#nature-scene");
  if (natureScene) {
    natureScene.addEventListener("click", function () { gatherFromNature({ auto: false }); });
  }

  const buildGreenMeadowButton = document.querySelector("#build-green-meadow");
  if (buildGreenMeadowButton) buildGreenMeadowButton.addEventListener("click", buildGreenMeadow);

  const resetButton = document.querySelector("#reset-button");
  if (resetButton) resetButton.addEventListener("click", resetGame);
}

setInterval(function () {
  if (hasPokemon("rattata")) gatherFromNature({ auto: true });
}, 5000);

setInterval(function () {
  let changed = false;

  Object.keys(energyTypes).forEach(function (type) {
    const production = getPassiveProduction(type);
    if (production > 0) {
      addEnergy(type, production);
      changed = true;
    }
  });

  if (changed) {
    discoverPokemon();
    saveState();
    render();
  }
}, 1000);

render();
