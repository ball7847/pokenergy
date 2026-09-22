const STORAGE_KEY = "pokenergy-save-v3";
const LEGACY_STORAGE_KEYS = ["pokenergy-save-v2", "pokenergy-save-v1"];

const energyTypes = {
  grass: { name: "풀", icon: "🌿" },
  fire: { name: "불꽃", icon: "🔥" },
  water: { name: "물", icon: "💧" },
  normal: { name: "노말", icon: "⚪" },
  bug: { name: "벌레", icon: "🐛" },
  flying: { name: "비행", icon: "🪽" },
  fighting: { name: "격투", icon: "🥊" }
};

const randomNatureTypes = ["grass", "fire", "water"];

const pokemonData = [
  { id: "bulbasaur", name: "이상해씨", type: "grass", unlockAt: 1, ability: "심록 I", effect: "자연에서 풀 에너지 획득량 +0.1 · 클릭마다 노말 에너지 +0.1" },
  { id: "charmander", name: "파이리", type: "fire", unlockAt: 4, ability: "맹화 I", effect: "자연에서 불꽃 에너지 획득량 +0.1 · 클릭마다 노말 에너지 +0.1" },
  { id: "squirtle", name: "꼬부기", type: "water", unlockAt: 7, ability: "급류 I", effect: "자연에서 물 에너지 획득량 +0.1 · 클릭마다 노말 에너지 +0.1" },
  { id: "rattata", name: "꼬렛", type: "normal", unlockAt: 19, ability: "몸통박치기", effect: "3초마다 자동으로 자연 탐색" },
  { id: "caterpie", name: "캐터피", type: "bug", unlockType: "grass", unlockAt: 10, ability: "인분", effect: "자연에서 10% 확률로 벌레 에너지 +0.1" },
  { id: "mankey", name: "망키", type: "fighting", unlockMode: "explorations", unlockAt: 560, ability: "할퀴기", effect: "3초마다 자동으로 자연 탐색" },
  { id: "pidgey", name: "구구", type: "flying", unlockType: "bug", unlockAt: 10, ability: "쪼기", effect: "자연에서 10% 확률로 비행 에너지 +0.1" }
];

const starterIds = ["bulbasaur", "charmander", "squirtle"];

const buildingData = {
  greenMeadow: {
    id: "greenMeadow",
    name: "초록 풀숲",
    description: "매초 풀 에너지 +0.1",
    cost: { grass: 25, water: 15 },
    production: { grass: 0.1 }
  }
};

const defaultState = {
  energies: { grass: 0, fire: 0, water: 0, normal: 0, bug: 0, flying: 0, fighting: 0 },
  discovered: [],
  activeTab: "nature",
  lastGain: null,
  totalClicks: 0,
  gameStartedAt: Date.now(),
  logs: [],
  unlocks: { village: false, greenMeadow: false },
  buildings: { greenMeadow: false },
  seenEnergies: []
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

function getFinalConsonantIndex(word) {
  if (!word) return -1;
  const lastChar = word.charCodeAt(word.length - 1);
  if (lastChar < 0xac00 || lastChar > 0xd7a3) return -1;
  return (lastChar - 0xac00) % 28;
}

function withParticle(word, pair) {
  const jong = getFinalConsonantIndex(word);
  const hasBatchim = jong > 0;

  if (pair === "이/가") return word + (hasBatchim ? "이" : "가");
  if (pair === "은/는") return word + (hasBatchim ? "은" : "는");
  if (pair === "을/를") return word + (hasBatchim ? "을" : "를");
  if (pair === "과/와") return word + (hasBatchim ? "과" : "와");
  if (pair === "으로/로") {
    const hasRieulBatchim = jong === 8;
    return word + (hasBatchim && !hasRieulBatchim ? "으로" : "로");
  }

  return word;
}

function normalizeKoreanParticles(message) {
  let result = message;
  pokemonData.forEach(function (pokemon) {
    result = result.replace(
      new RegExp("어디선가 " + pokemon.name + "(?:이|가)? 나타났다!", "g"),
      "어디선가 " + withParticle(pokemon.name, "이/가") + " 나타났다!"
    );
  });
  return result;
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
  migrated.logs = Array.isArray(saved.logs)
    ? saved.logs.map(function (entry) {
        return { ...entry, message: normalizeKoreanParticles(entry.message || "") };
      })
    : [];
  migrated.unlocks = { ...migrated.unlocks, ...(saved.unlocks || {}) };
  migrated.buildings = { ...migrated.buildings, ...(saved.buildings || {}) };
  migrated.seenEnergies = Array.isArray(saved.seenEnergies) ? saved.seenEnergies : [];
  Object.entries(migrated.energies).forEach(function (entry) {
    if (entry[1] > 0 && !migrated.seenEnergies.includes(entry[0])) migrated.seenEnergies.push(entry[0]);
  });

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

function getAutoExplorerCount() {
  let count = 0;
  if (hasPokemon("rattata")) count += 1;
  if (hasPokemon("mankey")) count += 1;
  return count;
}

function getAutoExplorationsPerSecond() {
  return getAutoExplorerCount() / 3;
}

function getPassiveProduction(type) {
  let amount = 0;
  if (state.buildings.greenMeadow && type === "grass") amount += buildingData.greenMeadow.production.grass;
  return roundEnergy(amount);
}

function addEnergy(type, amount) {
  state.energies[type] = roundEnergy(state.energies[type] + amount);
  if (amount > 0 && !state.seenEnergies.includes(type)) {
    state.seenEnergies.push(type);
  }
}

function checkVillageUnlock(writeLog = true) {
  if (state.unlocks.village || state.discovered.length < 5) return false;

  state.unlocks.village = true;
  state.unlocks.greenMeadow = true;

  if (writeLog) {
    addLog("포켓몬이 모여 마을을 이루었다!\n▶ 마을 탭 해금");
    addLog("마을에 초록 풀숲을 만들 수 있다!");
  }

  saveState();
  return true;
}

function discoverPokemon() {
  const found = [];

  pokemonData.forEach(function (pokemon) {
    const unlockType = pokemon.unlockType || pokemon.type;
    const conditionMet = pokemon.unlockMode === "explorations"
      ? state.totalClicks >= pokemon.unlockAt
      : state.energies[unlockType] >= pokemon.unlockAt;
    if (!hasPokemon(pokemon.id) && conditionMet) {
      state.discovered.push(pokemon.id);
      found.push(pokemon);
      addLog("어디선가 " + withParticle(pokemon.name, "이/가") + " 나타났다!");
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

  let bugAmount = 0;
  if (hasPokemon("caterpie") && Math.random() < 0.1) {
    bugAmount = 0.1;
    addEnergy("bug", bugAmount);
  }

  let flyingAmount = 0;
  if (hasPokemon("pidgey") && Math.random() < 0.1) {
    flyingAmount = 0.1;
    addEnergy("flying", flyingAmount);
  }

  state.totalClicks += 1;

  const discoveredNow = discoverPokemon();
  state.lastGain = {
    type: type,
    amount: amount,
    normalAmount: normalAmount,
    bugAmount: bugAmount,
    flyingAmount: flyingAmount,
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
    if (!state.seenEnergies.includes(type)) return;
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
      '<span class="log-message">' + entry.message.replace(/\n/g, "<br>") + '</span></div>';
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
      ? '<span class="discovery"> · ' + state.lastGain.pokemon.map(function (name) { return withParticle(name, "이/가"); }).join(", ") + ' 나타났다!</span>'
      : "";
    const normalText = state.lastGain.normalAmount > 0
      ? ' · ⚪ 노말 +' + formatNumber(state.lastGain.normalAmount)
      : "";
    const bugText = state.lastGain.bugAmount > 0
      ? ' · 🐛 벌레 +' + formatNumber(state.lastGain.bugAmount)
      : "";
    const flyingText = state.lastGain.flyingAmount > 0
      ? ' · 🪽 비행 +' + formatNumber(state.lastGain.flyingAmount)
      : "";
    const autoText = state.lastGain.auto ? '<span class="auto-label">자동</span>' : "";

    gainHtml = '<div class="gain-message ' + state.lastGain.type + '">' +
      autoText +
      energyTypes[state.lastGain.type].icon + ' ' +
      energyTypes[state.lastGain.type].name + ' +' + formatNumber(state.lastGain.amount) +
      normalText + bugText + flyingText + discovery + '</div>';
  }

  let unlockHtml = "";
  pokemonData.filter(function (pokemon) {
    return !hasPokemon(pokemon.id);
  }).forEach(function (pokemon) {
    const unlocked = false;
    const unlockType = pokemon.unlockType || pokemon.type;
    const current = pokemon.unlockMode === "explorations" ? state.totalClicks : state.energies[unlockType];
    const progress = Math.min(100, (current / pokemon.unlockAt) * 100);

    unlockHtml += '<article class="unlock-card">' +
      '<div class="unlock-card-top"><span>' + energyTypes[pokemon.type].icon + ' ' + pokemon.name + '</span>' +
      '<span>' + (pokemon.unlockMode === "explorations" ? current + ' / ' + pokemon.unlockAt : formatNumber(current) + ' / ' + pokemon.unlockAt) + '</span></div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + progress + '%"></div></div>' +
      '<p><strong>[' + pokemon.ability + ']</strong> ' +
      (pokemon.unlockMode === "explorations"
        ? '총 자연 탐색 ' + pokemon.unlockAt + '회에 출현'
        : energyTypes[pokemon.unlockType || pokemon.type].name + ' 에너지 ' + pokemon.unlockAt + '에 출현') +
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
      (unlocked
        ? pokemon.effect
        : pokemon.unlockMode === "explorations"
          ? '총 자연 탐색 ' + pokemon.unlockAt + '회에 출현'
          : energyTypes[pokemon.unlockType || pokemon.type].name + ' 에너지 ' + pokemon.unlockAt + '에 출현') +
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
          '<div class="building-cost"><span>🌿 풀 25</span><span>💧 물 15</span></div>' +
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
  const count = getAutoExplorerCount();
  for (let i = 0; i < count; i += 1) {
    gatherFromNature({ auto: true });
  }
}, 3000);

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
