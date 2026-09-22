const STORAGE_KEY = "pokenergy-save-v2";
const LEGACY_STORAGE_KEY = "pokenergy-save-v1";

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
  { id: "rattata", name: "꼬렛", type: "normal", unlockAt: 19, ability: "몸통박치기", effect: "5초마다 자연 에너지 획득 (클릭 1회와 동일)" }
];

const starterIds = ["bulbasaur", "charmander", "squirtle"];

const defaultState = {
  energies: { grass: 0, fire: 0, water: 0, normal: 0 },
  discovered: [],
  activeTab: "nature",
  lastGain: null,
  totalClicks: 0
};

let state = loadState();

function cloneDefault() {
  return JSON.parse(JSON.stringify(defaultState));
}

function roundEnergy(value) {
  return Math.round((value + Number.EPSILON) * 1000) / 1000;
}

function formatNumber(value) {
  return Number(value.toFixed(2)).toString();
}

function migrateLegacySave() {
  try {
    const raw = localStorage.getItem(LEGACY_STORAGE_KEY);
    if (!raw) return null;
    const saved = JSON.parse(raw);
    const migrated = cloneDefault();
    migrated.energies.grass = roundEnergy((saved.energies?.grass || 0) / 10);
    migrated.energies.fire = roundEnergy((saved.energies?.fire || 0) / 10);
    migrated.energies.water = roundEnergy((saved.energies?.water || 0) / 10);
    migrated.energies.normal = 0;
    migrated.discovered = Array.isArray(saved.discovered) ? saved.discovered.filter(function (id) {
      return starterIds.includes(id);
    }) : [];
    migrated.activeTab = saved.activeTab || "nature";
    migrated.totalClicks = saved.totalClicks || 0;
    return migrated;
  } catch {
    return null;
  }
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const saved = JSON.parse(raw);
      return {
        ...cloneDefault(),
        ...saved,
        energies: { ...defaultState.energies, ...(saved.energies || {}) },
        discovered: Array.isArray(saved.discovered) ? saved.discovered : []
      };
    }

    const migrated = migrateLegacySave();
    if (migrated) {
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
  if (!hasPokemon("rattata")) return 0;
  return 1 / 5;
}

function addEnergy(type, amount) {
  state.energies[type] = roundEnergy(state.energies[type] + amount);
}

function discoverPokemon() {
  const found = [];
  pokemonData.forEach(function (pokemon) {
    if (!hasPokemon(pokemon.id) && state.energies[pokemon.type] >= pokemon.unlockAt) {
      state.discovered.push(pokemon.id);
      found.push(pokemon);
    }
  });
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

function resetGame() {
  if (!window.confirm("현재 진행도를 모두 초기화할까요?")) return;
  state = cloneDefault();
  localStorage.removeItem(LEGACY_STORAGE_KEY);
  saveState();
  render();
}

function setTab(tab) {
  state.activeTab = tab;
  saveState();
  render();
}

function renderEnergyBar() {
  let items = "";
  Object.entries(energyTypes).forEach(function (entry) {
    const type = entry[0];
    const info = entry[1];
    items += '<div class="energy-pill energy-' + type + '">' +
      '<span class="energy-icon">' + info.icon + '</span>' +
      '<span class="energy-label">' + info.name + '</span>' +
      '<strong>' + formatNumber(state.energies[type]) + '</strong>' +
      '</div>';
  });

  return '<header class="energy-bar">' +
    '<div class="brand">Pokenergy</div>' +
    '<div class="energy-list">' + items + '</div>' +
    '</header>';
}

function renderSidebar() {
  const tabs = [["nature", "자연"], ["dex", "도감"], ["settings", "설정"]];
  let html = '<nav class="sidebar">';
  tabs.forEach(function (tab) {
    html += '<button class="tab-button ' + (state.activeTab === tab[0] ? 'active' : '') +
      '" data-tab="' + tab[0] + '">' + tab[1] + '</button>';
  });
  html += '</nav>';
  return html;
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
    '<button class="nature-scene" id="nature-scene" aria-label="자연에서 에너지 획득">' +
    '<div class="sun"></div><div class="cloud cloud-a"></div><div class="cloud cloud-b"></div>' +
    '<div class="mountain mountain-back"></div><div class="mountain mountain-front"></div>' +
    '<div class="river"></div><div class="grassland"></div>' +
    '<div class="flowers flowers-a">✿ ✦ ✿</div><div class="flowers flowers-b">✦ ✿</div>' +
    pokemonHtml +
    '<div class="nature-prompt"><strong>자연 탐색</strong><span>클릭해서 에너지를 획득</span></div>' +
    '</button>' + gainHtml +
    '<div class="unlock-grid">' + unlockHtml + '</div></section>';
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

function renderSettings() {
  return '<section class="panel">' +
    '<div class="section-heading"><div><p class="eyebrow">SETTINGS</p><h1>설정</h1></div></div>' +
    '<div class="settings-card"><h2>저장</h2><p>진행도는 이 브라우저에 자동 저장됩니다.</p></div>' +
    '<div class="settings-card danger"><h2>진행도 초기화</h2><p>에너지와 발견한 포켓몬을 모두 처음 상태로 되돌립니다.</p>' +
    '<button id="reset-button">게임 초기화</button></div></section>';
}

function renderContent() {
  if (state.activeTab === "dex") return renderDex();
  if (state.activeTab === "settings") return renderSettings();
  return renderNature();
}

function render() {
  const app = document.querySelector("#app");
  app.innerHTML = renderEnergyBar() +
    '<div class="app-shell">' + renderSidebar() +
    '<main class="content">' + renderContent() + '</main></div>';

  document.querySelectorAll("[data-tab]").forEach(function (button) {
    button.addEventListener("click", function () { setTab(button.dataset.tab); });
  });

  const natureScene = document.querySelector("#nature-scene");
  if (natureScene) natureScene.addEventListener("click", function () { gatherFromNature({ auto: false }); });

  const resetButton = document.querySelector("#reset-button");
  if (resetButton) resetButton.addEventListener("click", resetGame);
}

setInterval(function () {
  if (hasPokemon("rattata")) gatherFromNature({ auto: true });
}, 5000);

render();
