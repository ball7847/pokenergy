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
  { id: "rattata", name: "꼬렛", type: "normal", unlockAt: 19, ability: "몸통박치기", effect: "초당 1회 자동으로 자연 탐색" },
  { id: "caterpie", name: "캐터피", type: "bug", unlockType: "grass", unlockAt: 10, ability: "인분", effect: "자연에서 10% 확률로 벌레 에너지 +0.1" },
  { id: "mankey", name: "망키", type: "fighting", unlockMode: "explorations", unlockAt: 560, ability: "할퀴기", effect: "초당 1회 자동으로 자연 탐색" },
  { id: "pidgey", name: "구구", type: "flying", unlockType: "bug", unlockAt: 10, ability: "바람일으키기", effect: "자연에서 비행 에너지 획득량 +0.1" },
  { id: "spearow", name: "깨비참", type: "flying", unlockType: "normal", unlockAt: 210, ability: "쪼기", effect: "자연에서 10% 확률로 비행 에너지 +0.1" },
  { id: "weedle", name: "뿔충이", type: "bug", unlockType: "bug", unlockAt: 13, ability: "벌레의 알림", effect: "자연에서 벌레 에너지 획득량 +0.1" },
  { id: "eevee", name: "이브이", type: "normal", unlockMode: "allEnergies", unlockTypes: ["grass", "water", "fire"], unlockAt: 133, ability: "적응력", effect: "자연에서 풀, 물, 불꽃 에너지를 획득합니다." },
  { id: "combee", name: "세꿀버리", type: "bug", unlockMode: "building", unlockBuilding: "prettyFlowerbed", ability: "꿀모으기", effect: "자연에서 벌레 에너지와 비행 에너지 획득량 +0.1" }
];

const starterIds = ["bulbasaur", "charmander", "squirtle"];

const buildingData = {
  greenMeadow: {
    id: "greenMeadow",
    name: "초록 풀숲",
    description: "매초 풀 에너지 +0.2",
    cost: { grass: 25, water: 15 },
    production: { grass: 0.2 }
  },
  campfire: {
    id: "campfire",
    name: "모닥불",
    description: "매초 불꽃 에너지 +0.2",
    cost: { grass: 25, fire: 25 },
    production: { fire: 0.2 }
  },
  moistMeadow: {
    id: "moistMeadow",
    name: "촉촉한 풀숲",
    description: "매초 풀 에너지 +0.2 및 물 에너지 +0.2",
    cost: { grass: 25, water: 25 },
    production: { grass: 0.2, water: 0.2 }
  },
  shadeMeadow: {
    id: "shadeMeadow",
    name: "나무그늘의 풀숲",
    description: "매초 풀 +0.3, 물 +0.3, 벌레 +0.1, 비행 +0.1",
    cost: { grass: 600, water: 600, bug: 60, flying: 30 },
    production: { grass: 0.3, water: 0.3, bug: 0.1, flying: 0.1 }
  },
  prettyFlowerbed: {
    id: "prettyFlowerbed",
    name: "예쁜 꽃밭",
    description: "벌레 에너지와 비행 에너지 획득 확률 +10%",
    cost: { grass: 300, water: 300, normal: 1000 },
    production: {}
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
  unlocks: {
    village: false,
    expandedVillage: false,
    greenMeadow: false,
    additionalGreenMeadow: false,
    campfire: false,
    moistMeadow: false,
    shadeMeadow: false,
    prettyFlowerbed: false
  },
  buildings: {
    greenMeadow: 0,
    campfire: 0,
    moistMeadow: 0,
    shadeMeadow: 0,
    prettyFlowerbed: 0
  },
  buildCounts: {
    greenMeadow: 0,
    campfire: 0,
    moistMeadow: 0,
    shadeMeadow: 0,
    prettyFlowerbed: 0
  },
  seenEnergies: []
};

let state = loadState();
checkVillageUnlock(false);
checkVillageGrowth(false);

let lastRenderedLogSignature = getLatestLogSignature();
let recordScrollState = {
  activeTab: state.activeTab,
  scrollTop: 0,
  userScrolled: false
};

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

function getLatestLogSignature() {
  if (!state || !state.logs || !state.logs.length) return "";
  const last = state.logs[state.logs.length - 1];
  return String(last.elapsed) + "|" + last.message;
}

function normalizeBuildingCount(value) {
  if (typeof value === "number") return Math.max(0, Math.floor(value));
  return value ? 1 : 0;
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

  const savedBuildings = saved.buildings || {};
  Object.keys(migrated.buildings).forEach(function (id) {
    migrated.buildings[id] = normalizeBuildingCount(savedBuildings[id]);
  });

  const savedBuildCounts = saved.buildCounts || {};
  Object.keys(migrated.buildCounts).forEach(function (id) {
    const currentCount = migrated.buildings[id];
    migrated.buildCounts[id] = Math.max(
      normalizeBuildingCount(savedBuildCounts[id]),
      currentCount
    );
  });

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
  return getAutoExplorerCount();
}

function getPassiveProduction(type) {
  let amount = 0;

  amount += (state.buildings.greenMeadow || 0) * (buildingData.greenMeadow.production[type] || 0);
  amount += (state.buildings.moistMeadow || 0) * (buildingData.moistMeadow.production[type] || 0);
  amount += (state.buildings.shadeMeadow || 0) * (buildingData.shadeMeadow.production[type] || 0);
  amount += (state.buildings.campfire || 0) * (buildingData.campfire.production[type] || 0);

  return roundEnergy(amount);
}
function getFixedAutoExplorationProduction(type) {
  const autoExplorations = getAutoExplorationsPerSecond();
  if (autoExplorations <= 0) return 0;

  if (type === "normal") {
    return roundEnergy(getNormalGainPerClick() * autoExplorations);
  }

  if (hasPokemon("eevee") && randomNatureTypes.includes(type)) {
    return roundEnergy(getNatureGain(type) * autoExplorations);
  }

  return 0;
}

function getDisplayedProductionPerSecond(type) {
  return roundEnergy(
    getPassiveProduction(type) +
    getFixedAutoExplorationProduction(type)
  );
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
  state.unlocks.campfire = true;

  if (writeLog) {
    addLog("포켓몬이 5마리 모여 작은 마을을 이뤘다!");
    addLog("마을에 초록 풀숲을 만들 수 있다!");
    addLog("마을에 모닥불을 만들 수 있다!");
  }

  saveState();
  return true;
}

function checkVillageGrowth(writeLog = true) {
  if (state.unlocks.expandedVillage || state.discovered.length < 10) return false;

  state.unlocks.expandedVillage = true;
  state.unlocks.additionalGreenMeadow = true;
  state.unlocks.shadeMeadow = true;
  state.unlocks.prettyFlowerbed = true;

  if (writeLog) {
    addLog("포켓몬이 10마리 모여 마을이 커졌다!");
    addLog("초록 풀숲을 추가로 건설할 수 있다!");
    addLog("초록 풀숲을 나무그늘의 풀숲으로 업그레이드할 수 있다!");
    addLog("마을에 예쁜 꽃밭을 만들 수 있다!");
  }

  saveState();
  return true;
}
function discoverPokemon() {
  const found = [];

  pokemonData.forEach(function (pokemon) {
    if (pokemon.unlockMode === "building") return;

    const unlockType = pokemon.unlockType || pokemon.type;
    let conditionMet = false;

    if (pokemon.unlockMode === "explorations") {
      conditionMet = state.totalClicks >= pokemon.unlockAt;
    } else if (pokemon.unlockMode === "allEnergies") {
      conditionMet = pokemon.unlockTypes.every(function (type) {
        return state.energies[type] >= pokemon.unlockAt;
      });
    } else {
      conditionMet = state.energies[unlockType] >= pokemon.unlockAt;
    }
    if (!hasPokemon(pokemon.id) && conditionMet) {
      state.discovered.push(pokemon.id);
      found.push(pokemon);
      addLog("어디선가 " + withParticle(pokemon.name, "이/가") + " 나타났다!");
    }
  });

  checkVillageUnlock(true);
  checkVillageGrowth(true);
  return found;
}

function gatherFromNature(options) {
  const isAuto = options && options.auto;
  const normalAmount = getNormalGainPerClick();
  const elementalGains = {};
  let primaryType = null;
  let primaryAmount = 0;

  if (hasPokemon("eevee")) {
    randomNatureTypes.forEach(function (type) {
      const amount = getNatureGain(type);
      elementalGains[type] = amount;
      addEnergy(type, amount);
    });
    primaryType = "grass";
    primaryAmount = elementalGains.grass;
  } else {
    const type = randomNatureTypes[Math.floor(Math.random() * randomNatureTypes.length)];
    const amount = getNatureGain(type);
    elementalGains[type] = amount;
    addEnergy(type, amount);
    primaryType = type;
    primaryAmount = amount;
  }

  if (normalAmount > 0) addEnergy("normal", normalAmount);

  const flowerbedChanceBonus = (state.buildings.prettyFlowerbed || 0) * 0.1;

  let bugAmount = 0;
  const bugChance = (hasPokemon("caterpie") ? 0.1 : 0) + flowerbedChanceBonus;
  if (bugChance > 0 && Math.random() < Math.min(1, bugChance)) {
    bugAmount = 0.1 +
      (hasPokemon("weedle") ? 0.1 : 0) +
      (hasPokemon("combee") ? 0.1 : 0);
    bugAmount = roundEnergy(bugAmount);
    addEnergy("bug", bugAmount);
  }

  let flyingAmount = 0;
  const flyingChance = (hasPokemon("spearow") ? 0.1 : 0) + flowerbedChanceBonus;
  if (flyingChance > 0 && Math.random() < Math.min(1, flyingChance)) {
    flyingAmount = 0.1 +
      (hasPokemon("pidgey") ? 0.1 : 0) +
      (hasPokemon("combee") ? 0.1 : 0);
    flyingAmount = roundEnergy(flyingAmount);
    addEnergy("flying", flyingAmount);
  }

  state.totalClicks += 1;

  const logSignatureBeforeDiscovery = getLatestLogSignature();
  const discoveredNow = discoverPokemon();
  const structuralChange = discoveredNow.length > 0 || getLatestLogSignature() !== logSignatureBeforeDiscovery;
  state.lastGain = {
    type: primaryType,
    amount: primaryAmount,
    elementalGains: elementalGains,
    normalAmount: normalAmount,
    bugAmount: bugAmount,
    flyingAmount: flyingAmount,
    auto: Boolean(isAuto),
    pokemon: discoveredNow.map(function (pokemon) { return pokemon.name; })
  };

  saveState();
  if (isAuto && !structuralChange) {
    updateLiveUI();
  } else {
    render();
  }
}
function canAfford(cost) {
  return Object.entries(cost).every(function (entry) {
    return state.energies[entry[0]] >= entry[1];
  });
}

function scaleCost(cost, exponent) {
  const multiplier = Math.pow(10, exponent);
  const scaled = {};
  Object.entries(cost).forEach(function (entry) {
    scaled[entry[0]] = roundEnergy(entry[1] * multiplier);
  });
  return scaled;
}

function getNextCost(buildingId) {
  return scaleCost(buildingData[buildingId].cost, state.buildCounts[buildingId] || 0);
}

function spendCost(cost) {
  Object.entries(cost).forEach(function (entry) {
    addEnergy(entry[0], -entry[1]);
  });
}

function buildGreenMeadow() {
  const currentPurchases = state.buildCounts.greenMeadow || 0;
  if (!state.unlocks.greenMeadow) return;
  if (currentPurchases >= 1 && !state.unlocks.additionalGreenMeadow) return;

  const cost = getNextCost("greenMeadow");
  if (!canAfford(cost)) return;

  spendCost(cost);
  state.buildings.greenMeadow += 1;
  state.buildCounts.greenMeadow += 1;

  if (!state.unlocks.moistMeadow) {
    state.unlocks.moistMeadow = true;
    addLog("마을에 초록 풀숲이 생겼다!");
    addLog("초록 풀숲을 촉촉한 풀숲으로 업그레이드할 수 있다!");
  } else {
    addLog("마을에 초록 풀숲이 하나 더 생겼다!");
  }

  saveState();
  render();
}

function buildCampfire() {
  if (!state.unlocks.campfire || state.buildings.campfire > 0) return;

  const cost = getNextCost("campfire");
  if (!canAfford(cost)) return;

  spendCost(cost);
  state.buildings.campfire += 1;
  state.buildCounts.campfire += 1;
  addLog("마을에 모닥불이 생겼다!");
  saveState();
  render();
}

function upgradeGreenMeadow(targetId) {
  if (state.buildings.greenMeadow <= 0) return;
  if (!state.unlocks[targetId]) return;

  const cost = getNextCost(targetId);
  if (!canAfford(cost)) return;

  spendCost(cost);
  state.buildings.greenMeadow -= 1;
  state.buildings[targetId] += 1;
  state.buildCounts[targetId] += 1;

  if (targetId === "moistMeadow") {
    addLog("초록 풀숲이 촉촉한 풀숲으로 바뀌었다!");
  } else if (targetId === "shadeMeadow") {
    addLog("초록 풀숲이 나무그늘의 풀숲으로 바뀌었다!");
  }

  saveState();
  render();
}

function buildPrettyFlowerbed() {
  if (!state.unlocks.prettyFlowerbed || state.buildings.prettyFlowerbed > 0) return;

  const cost = getNextCost("prettyFlowerbed");
  if (!canAfford(cost)) return;

  spendCost(cost);
  state.buildings.prettyFlowerbed += 1;
  state.buildCounts.prettyFlowerbed += 1;
  addLog("마을에 예쁜 꽃밭이 생겼다!");

  if (!hasPokemon("combee")) {
    const combee = pokemonData.find(function (pokemon) { return pokemon.id === "combee"; });
    state.discovered.push("combee");
    addLog("어디선가 " + withParticle(combee.name, "이/가") + " 나타났다!");
  }

  checkVillageGrowth(true);
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

  const previousTab = state.activeTab;
  state.activeTab = tab;

  if (previousTab !== tab) {
    recordScrollState.activeTab = tab;
    recordScrollState.userScrolled = false;
    recordScrollState.scrollTop = 0;
  }

  saveState();
  render();
}

function renderEnergyBar() {
  let items = "";

  Object.entries(energyTypes).forEach(function (entry) {
    const type = entry[0];
    const info = entry[1];
    if (!state.seenEnergies.includes(type)) return;
    const production = getDisplayedProductionPerSecond(type);
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

  return state.logs.map(function (entry) {
    return '<div class="log-entry"><span class="log-time">[' + formatElapsed(entry.elapsed) + ']</span> ' +
      '<span class="log-message">' + entry.message.replace(/\n/g, "<br>") + '</span></div>';
  }).join("");
}

function renderNature() {
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

    const elementalEntries = Object.entries(state.lastGain.elementalGains || { [state.lastGain.type]: state.lastGain.amount });
    const elementalText = elementalEntries.map(function (entry) {
      return energyTypes[entry[0]].icon + ' ' + energyTypes[entry[0]].name + ' +' + formatNumber(entry[1]);
    }).join(' · ');

    gainHtml = '<div class="gain-message ' + state.lastGain.type + '">' +
      autoText + elementalText + normalText + bugText + flyingText + discovery + '</div>';
  }

  let unlockHtml = "";
  pokemonData.filter(function (pokemon) {
    return !hasPokemon(pokemon.id);
  }).forEach(function (pokemon) {
    const unlocked = false;
    const unlockType = pokemon.unlockType || pokemon.type;
    const current = pokemon.unlockMode === "explorations"
      ? state.totalClicks
      : pokemon.unlockMode === "allEnergies"
        ? Math.min.apply(null, pokemon.unlockTypes.map(function (type) { return state.energies[type]; }))
        : pokemon.unlockMode === "building"
          ? (state.buildings[pokemon.unlockBuilding] || 0)
          : state.energies[unlockType];
    const progress = pokemon.unlockMode === "building"
      ? (current > 0 ? 100 : 0)
      : Math.min(100, (current / pokemon.unlockAt) * 100);

    unlockHtml += '<article class="unlock-card">' +
      '<div class="unlock-card-top"><span>' + energyTypes[pokemon.type].icon + ' ' + pokemon.name + '</span>' +
      '<span>' + (pokemon.unlockMode === "explorations"
        ? current + ' / ' + pokemon.unlockAt
        : pokemon.unlockMode === "allEnergies"
          ? '각 ' + pokemon.unlockAt
          : pokemon.unlockMode === "building"
            ? '건설 시 출현'
            : formatNumber(current) + ' / ' + pokemon.unlockAt) + '</span></div>' +
      '<div class="progress-track"><div class="progress-fill" style="width:' + progress + '%"></div></div>' +
      '<p><strong>[' + pokemon.ability + ']</strong> ' +
      (pokemon.unlockMode === "explorations"
        ? '총 자연 탐색 ' + pokemon.unlockAt + '회에 출현'
        : pokemon.unlockMode === "allEnergies"
          ? '풀, 물, 불꽃 에너지가 각각 ' + pokemon.unlockAt + ' 이상일 때 출현'
          : pokemon.unlockMode === "building"
            ? buildingData[pokemon.unlockBuilding].name + ' 건설 시 출현'
            : energyTypes[pokemon.unlockType || pokemon.type].name + ' 에너지 ' + pokemon.unlockAt + '에 출현') +
      '</p></article>';
  });

  const autoPerSecond = getAutoExplorationsPerSecond();
  const autoRateText = autoPerSecond > 0
    ? '<span class="auto-rate">(+' + formatNumber(autoPerSecond) + '/s)</span>'
    : "";

  return '<section class="panel nature-panel">' +
    '<div class="section-heading"><div><p class="eyebrow">STARTING AREA</p><h1>' + (state.unlocks.village ? '마을' : '아무것도 없는 자연') + '</h1></div>' +
    '<div class="click-counter">자연 탐색 ' + state.totalClicks + '회 ' + autoRateText + '</div></div>' +
    '<div class="nature-layout">' +
      '<div class="nature-main">' +
        '<button class="nature-scene" id="nature-scene" aria-label="자연에서 에너지 획득">' +
          '<div class="sun"></div><div class="cloud cloud-a"></div><div class="cloud cloud-b"></div>' +
          '<div class="mountain mountain-back"></div><div class="mountain mountain-front"></div>' +
          '<div class="river"></div><div class="grassland"></div>' +
          '<div class="flowers flowers-a">✿ ✦ ✿</div><div class="flowers flowers-b">✦ ✿</div>' +
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
          : pokemon.unlockMode === "allEnergies"
            ? '풀, 물, 불꽃 에너지가 각각 ' + pokemon.unlockAt + ' 이상일 때 출현'
            : pokemon.unlockMode === "building"
              ? buildingData[pokemon.unlockBuilding].name + ' 건설 시 출현'
              : energyTypes[pokemon.unlockType || pokemon.type].name + ' 에너지 ' + pokemon.unlockAt + '에 출현') +
      '</p></div></article>';
  });

  return '<section class="panel">' +
    '<div class="section-heading"><div><p class="eyebrow">POKÉDEX</p><h1>도감</h1></div>' +
    '<div class="click-counter">' + state.discovered.length + ' / ' + pokemonData.length + ' 발견</div></div>' +
    '<div class="dex-grid">' + cards + '</div></section>';
}

function renderVillage() {
  function costHtml(cost) {
    return Object.entries(cost).map(function (entry) {
      const info = energyTypes[entry[0]];
      return '<span>' + info.icon + ' ' + info.name + ' ' + formatNumber(entry[1]) + '</span>';
    }).join('');
  }

  function countSuffix(count) {
    return count > 1 ? '(' + count + ')' : '';
  }

  const cards = [];

  if (state.unlocks.greenMeadow || state.buildings.greenMeadow > 0) {
    const count = state.buildings.greenMeadow;
    const nextCost = getNextCost("greenMeadow");
    const canBuildMore = (state.buildCounts.greenMeadow === 0) || state.unlocks.additionalGreenMeadow;

    let actions = '';
    if (canBuildMore) {
      actions += '<div class="building-cost">' + costHtml(nextCost) + '</div>' +
        '<button class="build-action green-action" id="build-green-meadow" ' + (canAfford(nextCost) ? '' : 'disabled') + '>' +
          (count > 0 ? '초록 풀숲 추가 건설' : '초록 풀숲 건설') +
        '</button>';
    }

    if (count > 0 && state.unlocks.moistMeadow) {
      const moistCost = getNextCost("moistMeadow");
      actions += '<div class="upgrade-box"><strong>촉촉한 풀숲으로 업그레이드</strong>' +
        '<div class="building-cost">' + costHtml(moistCost) + '</div>' +
        '<button class="build-action water-action" id="upgrade-moist-meadow" ' + (canAfford(moistCost) ? '' : 'disabled') + '>1개 업그레이드</button></div>';
    }

    if (count > 0 && state.unlocks.shadeMeadow) {
      const shadeCost = getNextCost("shadeMeadow");
      actions += '<div class="upgrade-box"><strong>나무그늘의 풀숲으로 업그레이드</strong>' +
        '<div class="building-cost">' + costHtml(shadeCost) + '</div>' +
        '<button class="build-action shade-action" id="upgrade-shade-meadow" ' + (canAfford(shadeCost) ? '' : 'disabled') + '>1개 업그레이드</button></div>';
    }

    cards.push(
      '<article class="building-card ' + (count > 0 ? 'built' : '') + '">' +
        '<div class="building-visual meadow-visual">🌿</div>' +
        '<div class="building-body">' +
          '<div class="building-title-row"><h2>초록 풀숲' + countSuffix(count) + '</h2><span>' + (count > 0 ? '보유 ' + count + '개' : '건설 가능') + '</span></div>' +
          '<p>개당 매초 풀 에너지 +0.2</p>' +
          (count > 0 ? '<div class="built-status">총 🌿 풀 +' + formatNumber(count * 0.2) + '/s</div>' : '') +
          actions +
        '</div>' +
      '</article>'
    );
  }

  const moistCount = state.buildings.moistMeadow || 0;
  if (moistCount > 0) {
    cards.push(
      '<article class="building-card built">' +
        '<div class="building-visual moist-meadow-visual">🌿💧</div>' +
        '<div class="building-body">' +
          '<div class="building-title-row"><h2>촉촉한 풀숲' + countSuffix(moistCount) + '</h2><span>보유 ' + moistCount + '개</span></div>' +
          '<p>개당 매초 풀 +0.2, 물 +0.2</p>' +
          '<div class="built-status">총 🌿 풀 +' + formatNumber(moistCount * 0.2) + '/s · 💧 물 +' + formatNumber(moistCount * 0.2) + '/s</div>' +
        '</div>' +
      '</article>'
    );
  }

  const shadeCount = state.buildings.shadeMeadow || 0;
  if (shadeCount > 0) {
    cards.push(
      '<article class="building-card built">' +
        '<div class="building-visual shade-meadow-visual">🌳</div>' +
        '<div class="building-body">' +
          '<div class="building-title-row"><h2>나무그늘의 풀숲' + countSuffix(shadeCount) + '</h2><span>보유 ' + shadeCount + '개</span></div>' +
          '<p>개당 매초 풀 +0.3, 물 +0.3, 벌레 +0.1, 비행 +0.1</p>' +
          '<div class="built-status">총 🌿 풀 +' + formatNumber(shadeCount * 0.3) + '/s · 💧 물 +' + formatNumber(shadeCount * 0.3) + '/s · 🐛 벌레 +' + formatNumber(shadeCount * 0.1) + '/s · 🪽 비행 +' + formatNumber(shadeCount * 0.1) + '/s</div>' +
        '</div>' +
      '</article>'
    );
  }

  if (state.unlocks.campfire || state.buildings.campfire > 0) {
    const count = state.buildings.campfire || 0;
    const cost = getNextCost("campfire");
    cards.push(
      '<article class="building-card ' + (count > 0 ? 'built' : '') + '">' +
        '<div class="building-visual campfire-visual">🔥</div>' +
        '<div class="building-body">' +
          '<div class="building-title-row"><h2>모닥불' + countSuffix(count) + '</h2><span>' + (count > 0 ? '건설 완료' : '건설 가능') + '</span></div>' +
          '<p>매초 불꽃 에너지 +0.2</p>' +
          (count > 0
            ? '<div class="built-status fire-status">총 🔥 불꽃 +' + formatNumber(count * 0.2) + '/s</div>'
            : '<div class="building-cost">' + costHtml(cost) + '</div><button class="build-action fire-action" id="build-campfire" ' + (canAfford(cost) ? '' : 'disabled') + '>모닥불 건설</button>') +
        '</div>' +
      '</article>'
    );
  }

  if (state.unlocks.prettyFlowerbed || state.buildings.prettyFlowerbed > 0) {
    const count = state.buildings.prettyFlowerbed || 0;
    const cost = getNextCost("prettyFlowerbed");
    cards.push(
      '<article class="building-card ' + (count > 0 ? 'built' : '') + '">' +
        '<div class="building-visual flowerbed-visual">🌸</div>' +
        '<div class="building-body">' +
          '<div class="building-title-row"><h2>예쁜 꽃밭' + countSuffix(count) + '</h2><span>' + (count > 0 ? '건설 완료' : '건설 가능') + '</span></div>' +
          '<p>벌레 에너지와 비행 에너지 획득 확률 +10%</p>' +
          (count > 0
            ? '<div class="built-status flower-status">🐛 벌레 / 🪽 비행 획득 확률 +10%</div>'
            : '<div class="building-cost">' + costHtml(cost) + '</div><button class="build-action flower-action" id="build-pretty-flowerbed" ' + (canAfford(cost) ? '' : 'disabled') + '>예쁜 꽃밭 건설</button>') +
        '</div>' +
      '</article>'
    );
  }

  return '<section class="panel village-panel">' +
    '<div class="section-heading"><div><p class="eyebrow">VILLAGE</p><h1>마을</h1></div></div>' +
    '<div class="village-intro"><h2>보금자리</h2><p>같은 보금자리는 수량을 합쳐 표시하며, 생산량도 합산됩니다.</p></div>' +
    '<div class="building-grid">' + cards.join('') + '</div>' +
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

function updateLiveUI() {
  const energyBar = document.querySelector(".energy-bar");
  if (energyBar) {
    const temp = document.createElement("div");
    temp.innerHTML = renderEnergyBar();
    const freshEnergyBar = temp.firstElementChild;
    if (freshEnergyBar) energyBar.innerHTML = freshEnergyBar.innerHTML;
  }

  if (state.activeTab === "nature") {
    const temp = document.createElement("div");
    temp.innerHTML = renderNature();

    const freshCounter = temp.querySelector(".click-counter");
    const liveCounter = document.querySelector(".click-counter");
    if (freshCounter && liveCounter) liveCounter.innerHTML = freshCounter.innerHTML;

    const freshGain = temp.querySelector(".gain-message");
    const liveGain = document.querySelector(".gain-message");
    if (freshGain && liveGain) liveGain.outerHTML = freshGain.outerHTML;

    const freshUnlocks = temp.querySelector(".unlock-grid");
    const liveUnlocks = document.querySelector(".unlock-grid");
    if (freshUnlocks && liveUnlocks) liveUnlocks.innerHTML = freshUnlocks.innerHTML;
  } else if (state.activeTab === "village") {
    const temp = document.createElement("div");
    temp.innerHTML = renderVillage();
    const freshGrid = temp.querySelector(".building-grid");
    const liveGrid = document.querySelector(".building-grid");
    if (freshGrid && liveGrid) {
      liveGrid.innerHTML = freshGrid.innerHTML;
      bindBuildingButtons();
    }
  }
}

function bindBuildingButtons() {
  bindBuildingButtons();
}

function render() {
  const app = document.querySelector("#app");
  const oldRecordList = document.querySelector(".record-list");

  if (oldRecordList && state.activeTab === "nature") {
    recordScrollState.scrollTop = oldRecordList.scrollTop;
  }

  const latestSignature = getLatestLogSignature();
  const hasNewLog = latestSignature !== lastRenderedLogSignature;
  const returnedToNature = state.activeTab === "nature" && recordScrollState.activeTab !== "nature";

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

  const buildCampfireButton = document.querySelector("#build-campfire");
  if (buildCampfireButton) buildCampfireButton.addEventListener("click", buildCampfire);

  const upgradeMoistButton = document.querySelector("#upgrade-moist-meadow");
  if (upgradeMoistButton) upgradeMoistButton.addEventListener("click", function () { upgradeGreenMeadow("moistMeadow"); });

  const upgradeShadeButton = document.querySelector("#upgrade-shade-meadow");
  if (upgradeShadeButton) upgradeShadeButton.addEventListener("click", function () { upgradeGreenMeadow("shadeMeadow"); });

  const buildFlowerbedButton = document.querySelector("#build-pretty-flowerbed");
  if (buildFlowerbedButton) buildFlowerbedButton.addEventListener("click", buildPrettyFlowerbed);

  const resetButton = document.querySelector("#reset-button");
  if (resetButton) resetButton.addEventListener("click", resetGame);

  const newRecordList = document.querySelector(".record-list");
  if (newRecordList) {
    const shouldSnapToBottom =
      hasNewLog ||
      returnedToNature ||
      !recordScrollState.userScrolled;

    if (shouldSnapToBottom) {
      newRecordList.scrollTop = newRecordList.scrollHeight;
      recordScrollState.scrollTop = newRecordList.scrollTop;
      recordScrollState.userScrolled = false;
    } else {
      newRecordList.scrollTop = recordScrollState.scrollTop;
    }

    newRecordList.addEventListener("scroll", function () {
      recordScrollState.scrollTop = newRecordList.scrollTop;
      const distanceFromBottom =
        newRecordList.scrollHeight - newRecordList.clientHeight - newRecordList.scrollTop;
      recordScrollState.userScrolled = distanceFromBottom > 2;
    });
  }

  recordScrollState.activeTab = state.activeTab;
  lastRenderedLogSignature = latestSignature;
}
setInterval(function () {
  const count = getAutoExplorerCount();
  for (let i = 0; i < count; i += 1) {
    gatherFromNature({ auto: true });
  }
}, 1000);

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
    const logSignatureBeforeDiscovery = getLatestLogSignature();
    const discoveredNow = discoverPokemon();
    const structuralChange = discoveredNow.length > 0 || getLatestLogSignature() !== logSignatureBeforeDiscovery;
    saveState();

    if (structuralChange) {
      render();
    } else {
      updateLiveUI();
    }
  }
}, 1000);

render();
