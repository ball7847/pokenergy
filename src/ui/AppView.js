import { TYPE_LABELS } from '../data/types.js';
import { formatNumber } from '../utils/format.js';

const TAB_LABELS = {
  portal: '포탈',
  pokemon: '포켓몬',
  dex: '도감',
  settings: '설정',
};

export class AppView {
  constructor({ root, game, store, pokemonData, energyTypes }) {
    Object.assign(this, { root, game, store, pokemonData, energyTypes });
    this.unsubscribe = null;
    this.activeTab = 'portal';
    this.dexOnlyDiscovered = false;
    this.selectedPokemonId = null;
    this.lastSaveNotice = '';
  }

  mount() {
    this.root.innerHTML = this.template();
    this.bindEvents();
    this.unsubscribe = this.store.subscribe(state => this.render(state));
    this.render(this.store.getState());
  }

  template() {
    return `
      <div class="game-shell">
        <header class="energy-bar" data-view="energy-bar" aria-label="타입 에너지"></header>

        <aside class="side-nav" aria-label="게임 메뉴">
          <div class="brand-mark" title="Pokenergy">P</div>
          ${Object.entries(TAB_LABELS).map(([id, label]) => `
            <button class="nav-button ${id === this.activeTab ? 'active' : ''}" data-tab="${id}" type="button">
              <span class="nav-icon">${this.tabIcon(id)}</span>
              <span>${label}</span>
            </button>`).join('')}
        </aside>

        <main class="tab-stage">
          <section class="tab-panel" data-panel="portal"></section>
          <section class="tab-panel" data-panel="pokemon" hidden></section>
          <section class="tab-panel" data-panel="dex" hidden></section>
          <section class="tab-panel" data-panel="settings" hidden></section>
        </main>
      </div>
      <div class="modal-backdrop" data-view="dex-modal" hidden></div>
    `;
  }

  tabIcon(id) {
    return { portal: '◉', pokemon: '◆', dex: '▦', settings: '⚙' }[id] ?? '•';
  }

  bindEvents() {
    this.root.addEventListener('click', event => {
      const tabButton = event.target.closest('[data-tab]');
      if (tabButton) {
        this.activeTab = tabButton.dataset.tab;
        this.render(this.store.getState());
        return;
      }

      const summonButton = event.target.closest('[data-action="summon"]');
      if (summonButton) {
        this.game.summon();
        return;
      }

      const saveButton = event.target.closest('[data-action="save"]');
      if (saveButton) {
        this.game.save();
        this.lastSaveNotice = `저장 완료 · ${this.formatDateTime(Date.now())}`;
        this.render(this.store.getState());
        return;
      }

      const loadButton = event.target.closest('[data-action="load"]');
      if (loadButton) {
        const loaded = this.game.load();
        this.lastSaveNotice = loaded ? '저장 데이터를 불러왔습니다.' : '저장 데이터가 없습니다.';
        this.render(this.store.getState());
        return;
      }

      const resetButton = event.target.closest('[data-action="reset"]');
      if (resetButton) {
        if (window.confirm('모든 진행 상황을 삭제하고 처음부터 시작할까요? 이 작업은 되돌릴 수 없습니다.')) {
          this.game.reset();
          this.activeTab = 'portal';
          this.selectedPokemonId = null;
          this.lastSaveNotice = '게임을 초기화했습니다.';
        }
        return;
      }

      const dexCard = event.target.closest('[data-dex-id]');
      if (dexCard && !dexCard.disabled) {
        this.selectedPokemonId = dexCard.dataset.dexId;
        this.renderDexModal(this.store.getState());
        return;
      }

      if (event.target.closest('[data-action="close-dex-modal"]') || event.target.matches('[data-view="dex-modal"]')) {
        this.selectedPokemonId = null;
        this.renderDexModal(this.store.getState());
      }
    });

    this.root.addEventListener('input', event => {
      const type = event.target.dataset.energyInput;
      if (type) this.game.setPortalInput(type, event.target.value);
    });

    this.root.addEventListener('change', event => {
      if (event.target.matches('[data-action="dex-filter"]')) {
        this.dexOnlyDiscovered = event.target.checked;
        this.render(this.store.getState());
      }
    });
  }

  render(state) {
    this.renderEnergyBar(state);
    this.renderNavigation();
    this.renderActivePanel(state);
    this.renderDexModal(state);
  }

  renderEnergyBar(state) {
    const production = this.game.productionSystem.getProduction(state);
    const bar = this.root.querySelector('[data-view="energy-bar"]');
    bar.innerHTML = this.energyTypes.map(type => `
      <article class="energy-item type-${type}" title="${TYPE_LABELS[type]}에너지">
        <span class="energy-name">${TYPE_LABELS[type]}</span>
        <strong>${formatNumber(state.resources.energy[type] ?? 0)}</strong>
        <small>+${formatNumber(production[type] ?? 0)}/s</small>
      </article>
    `).join('');
  }

  renderNavigation() {
    for (const button of this.root.querySelectorAll('[data-tab]')) {
      button.classList.toggle('active', button.dataset.tab === this.activeTab);
    }
    for (const panel of this.root.querySelectorAll('[data-panel]')) {
      panel.hidden = panel.dataset.panel !== this.activeTab;
    }
  }

  renderActivePanel(state) {
    const panel = this.root.querySelector(`[data-panel="${this.activeTab}"]`);
    if (!panel) return;

    if (this.activeTab === 'portal') panel.innerHTML = this.portalTemplate(state);
    if (this.activeTab === 'pokemon') panel.innerHTML = this.pokemonTemplate(state);
    if (this.activeTab === 'dex') panel.innerHTML = this.dexTemplate(state);
    if (this.activeTab === 'settings') panel.innerHTML = this.settingsTemplate(state);
  }

  portalTemplate(state) {
    const validation = this.game.portalSystem.validate(state);
    const candidates = this.game.portalSystem.getCandidates(state);
    const cooldown = Math.max(0, state.portal.cooldownUntil - Date.now()) / 1000;
    const usedTypes = this.energyTypes.filter(type => (state.portal.input[type] ?? 0) > 0).length;
    const totalInput = Object.values(state.portal.input).reduce((sum, value) => sum + (Number(value) || 0), 0);
    const disabled = !validation.ok;

    return `
      <div class="portal-layout">
        <section class="portal-column portal-input-panel">
          <div class="section-heading">
            <div><span class="eyebrow">PORTAL INPUT</span><h1>투입 에너지</h1></div>
            <span class="limit-badge">${usedTypes} / ${state.unlocks.maxEnergyTypes} 타입</span>
          </div>
          <div class="portal-input-list">
            ${this.energyTypes.map(type => `
              <label class="portal-input-row type-${type}">
                <span class="type-dot"></span>
                <span class="input-type-name">${TYPE_LABELS[type]}</span>
                <input type="number" min="0" step="1" inputmode="numeric" data-energy-input="${type}" value="${state.portal.input[type] ?? 0}">
                <small>/ ${formatNumber(state.resources.energy[type] ?? 0)}</small>
              </label>
            `).join('')}
          </div>
          <div class="input-footer">
            <span>총 투입량</span><strong>${formatNumber(totalInput)}</strong>
          </div>
        </section>

        <section class="portal-center">
          <div class="portal-visual ${cooldown > 0 ? 'cooling' : ''}">
            <div class="portal-ring ring-outer"></div>
            <div class="portal-ring ring-mid"></div>
            <div class="portal-core"></div>
          </div>
          <button class="activate-button" data-action="summon" type="button" ${disabled ? 'disabled' : ''}>포탈 활성화</button>
          <div class="cooldown-text ${cooldown > 0 ? 'active' : ''}">
            ${cooldown > 0 ? `재활성화까지 ${cooldown.toFixed(1)}초` : '포탈 사용 가능'}
          </div>
          <div class="portal-status">${this.portalStatusText(validation, candidates)}</div>
        </section>

        <section class="portal-column log-panel">
          <div class="section-heading log-heading">
            <div><span class="eyebrow">RECORD</span><h1>기록</h1></div>
            <span class="record-count">${state.logs.length}</span>
          </div>
          <div class="record-list">
            ${state.logs.length ? state.logs.map(log => `
              <article class="record-entry ${log.kind === 'important' ? 'important' : 'general'}">
                <time>${this.formatDateTime(log.at)}</time>
                <div class="record-kind">${log.kind === 'important' ? '중요' : '일반'}</div>
                <p>${this.escapeHtml(log.message)}</p>
              </article>
            `).join('') : '<div class="empty-state">아직 기록이 없습니다.</div>'}
          </div>
        </section>
      </div>
    `;
  }

  portalStatusText(validation, candidates) {
    if (validation.ok) {
      return `후보 ${candidates.length}종 · 각 ${(100 / candidates.length).toFixed(2)}%`;
    }
    const text = {
      cooldown: '포탈이 재활성화되는 중입니다.',
      empty_input: '에너지를 1개 이상 투입하세요.',
      too_many_types: '현재 동시에 투입할 수 있는 에너지 타입 수를 초과했습니다.',
      insufficient_energy: '보유한 에너지가 부족합니다.',
      no_candidates: '현재 조건에 반응하는 포켓몬이 없습니다.',
    };
    return text[validation.reason] ?? '포탈을 활성화할 수 없습니다.';
  }

  pokemonTemplate(state) {
    const living = this.pokemonData
      .filter(p => (state.pokemon.counts[p.id] ?? 0) > 0)
      .sort((a, b) => (a.dex ?? 99999) - (b.dex ?? 99999));
    const totalIndividuals = living.reduce((sum, p) => sum + (state.pokemon.counts[p.id] ?? 0), 0);

    return `
      <div class="content-page">
        <div class="page-heading">
          <div><span class="eyebrow">INHABITANTS</span><h1>포켓몬</h1><p>현재 이 행성에 살고 있는 포켓몬입니다.</p></div>
          <div class="page-stat"><span>총 개체 수</span><strong>${formatNumber(totalIndividuals)}</strong></div>
        </div>
        <div class="pokemon-list">
          ${living.map(p => `
            <article class="resident-card">
              ${this.pokemonSprite(p, true)}
              <div class="resident-info">
                <small>No.${String(p.dex ?? 0).padStart(4, '0')}</small>
                <strong>${p.name}</strong>
                <div class="type-tags">${p.types.map(t => `<span class="type-tag type-${t}">${TYPE_LABELS[t]}</span>`).join('')}</div>
              </div>
              <div class="resident-count"><span>현재</span><strong>×${formatNumber(state.pokemon.counts[p.id] ?? 0)}</strong></div>
            </article>
          `).join('')}
        </div>
      </div>
    `;
  }

  dexTemplate(state) {
    const sorted = [...this.pokemonData].sort((a, b) => (a.dex ?? 99999) - (b.dex ?? 99999));
    const visible = this.dexOnlyDiscovered ? sorted.filter(p => state.pokemon.discovered[p.id]) : sorted;
    const discoveredCount = sorted.filter(p => state.pokemon.discovered[p.id]).length;

    return `
      <div class="content-page">
        <div class="page-heading dex-heading">
          <div><span class="eyebrow">POKÉDEX</span><h1>도감</h1><p>${discoveredCount} / ${sorted.length}종 발견</p></div>
          <label class="toggle-control">
            <input type="checkbox" data-action="dex-filter" ${this.dexOnlyDiscovered ? 'checked' : ''}>
            <span class="toggle-track"><span></span></span>
            <b>발견한 포켓몬만 표시</b>
          </label>
        </div>
        <div class="dex-grid">
          ${visible.map(p => {
            const found = Boolean(state.pokemon.discovered[p.id]);
            return `
              <button class="dex-card ${found ? 'found' : 'unknown'}" data-dex-id="${p.id}" type="button" ${found ? '' : 'disabled'}>
                <span class="dex-number">No.${String(p.dex ?? 0).padStart(4, '0')}</span>
                ${found ? this.pokemonSprite(p, false) : '<div class="unknown-sprite">?</div>'}
                <strong>${found ? p.name : '???'}</strong>
              </button>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  settingsTemplate(state) {
    return `
      <div class="content-page settings-page">
        <div class="page-heading">
          <div><span class="eyebrow">SYSTEM</span><h1>설정</h1><p>게임 데이터와 기본 설정을 관리합니다.</p></div>
        </div>
        <div class="settings-grid">
          <section class="settings-card">
            <h2>저장 데이터</h2>
            <p>게임은 10초마다 자동 저장됩니다. 필요할 때 직접 저장하거나 저장 데이터를 다시 불러올 수 있습니다.</p>
            <div class="settings-actions">
              <button class="settings-button primary" data-action="save" type="button">지금 저장</button>
              <button class="settings-button" data-action="load" type="button">저장 불러오기</button>
            </div>
            ${this.lastSaveNotice ? `<div class="settings-notice">${this.escapeHtml(this.lastSaveNotice)}</div>` : ''}
            <dl class="save-info">
              <div><dt>게임 시작</dt><dd>${this.formatDateTime(state.meta.createdAt)}</dd></div>
              <div><dt>마지막 저장</dt><dd>${this.formatDateTime(state.meta.updatedAt)}</dd></div>
              <div><dt>세이브 버전</dt><dd>v${state.meta.saveVersion}</dd></div>
            </dl>
          </section>

          <section class="settings-card danger-card">
            <h2>게임 초기화</h2>
            <p>모든 포켓몬, 에너지, 도감, 기록을 삭제하고 메타몽 1마리부터 다시 시작합니다.</p>
            <button class="settings-button danger" data-action="reset" type="button">모든 진행 상황 초기화</button>
          </section>
        </div>
      </div>
    `;
  }

  renderDexModal(state) {
    const modal = this.root.querySelector('[data-view="dex-modal"]');
    if (!modal) return;

    const pokemon = this.pokemonData.find(p => p.id === this.selectedPokemonId);
    if (!pokemon || !state.pokemon.discovered[pokemon.id]) {
      modal.hidden = true;
      modal.innerHTML = '';
      return;
    }

    const record = state.pokemon.records[pokemon.id] ?? { discoveredAt: null, maxCount: 0 };
    const abilities = pokemon.effects?.length
      ? pokemon.effects.map(effect => `<li>${this.escapeHtml(effect.label ?? effect.type)}</li>`).join('')
      : '<li>고유 능력 없음</li>';

    modal.hidden = false;
    modal.innerHTML = `
      <section class="dex-modal" role="dialog" aria-modal="true" aria-label="${pokemon.name} 정보">
        <button class="modal-close" data-action="close-dex-modal" type="button" aria-label="닫기">×</button>
        <div class="modal-pokemon-head">
          ${this.pokemonSprite(pokemon, true)}
          <div>
            <small>No.${String(pokemon.dex ?? 0).padStart(4, '0')}</small>
            <h2>${pokemon.name}</h2>
            <div class="type-tags">${pokemon.types.map(t => `<span class="type-tag type-${t}">${TYPE_LABELS[t]}</span>`).join('')}</div>
          </div>
        </div>
        <div class="dex-detail-grid">
          <div><span>처음 발견한 날짜</span><strong>${record.discoveredAt ? this.formatDateTime(record.discoveredAt) : '이전 버전에서 발견 · 날짜 기록 없음'}</strong></div>
          <div><span>현재 개체 수</span><strong>${formatNumber(state.pokemon.counts[pokemon.id] ?? 0)}</strong></div>
          <div><span>가장 많았던 수</span><strong>${formatNumber(record.maxCount ?? 0)}</strong></div>
          <div><span>기본 생산</span><strong>${this.baseProductionText(pokemon)}</strong></div>
        </div>
        <div class="ability-box">
          <h3>능력</h3>
          <ul>${abilities}</ul>
        </div>
      </section>
    `;
  }

  baseProductionText(pokemon) {
    if (pokemon.types.length === 1) return `${TYPE_LABELS[pokemon.types[0]]}에너지 +1/s`;
    return pokemon.types.map(type => `${TYPE_LABELS[type]} +${(1 / pokemon.types.length).toFixed(1)}/s`).join(' · ') + ' (임시 규칙)';
  }

  pokemonSprite(pokemon, large) {
    const dex = pokemon.dex;
    if (!dex) return '<div class="sprite-placeholder">?</div>';
    const src = `https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${dex}.png`;
    return `<img class="pokemon-sprite ${large ? 'large' : ''}" src="${src}" alt="${pokemon.name}" loading="lazy">`;
  }

  formatDateTime(timestamp) {
    if (!timestamp) return '-';
    return new Date(timestamp).toLocaleString('ko-KR', {
      year: 'numeric', month: '2-digit', day: '2-digit',
      hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false,
    });
  }

  escapeHtml(value) {
    return String(value)
      .replaceAll('&', '&amp;')
      .replaceAll('<', '&lt;')
      .replaceAll('>', '&gt;')
      .replaceAll('"', '&quot;')
      .replaceAll("'", '&#039;');
  }
}
