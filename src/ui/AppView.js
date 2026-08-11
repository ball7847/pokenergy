import { TYPE_LABELS } from '../data/types.js';
import { formatNumber } from '../utils/format.js';

export class AppView {
  constructor({ root, game, store, pokemonData, energyTypes }) {
    Object.assign(this, { root, game, store, pokemonData, energyTypes });
    this.unsubscribe = null;
  }

  mount() {
    this.root.innerHTML = this.template();
    this.bindEvents();
    this.unsubscribe = this.store.subscribe(state => this.render(state));
    this.render(this.store.getState());
  }

  template() {
    return `
      <header><div><h1>Pokenergy</h1><p>확장형 시스템 프로토타입</p></div><div class="actions"><button data-action="save">저장</button><button data-action="load">불러오기</button></div></header>
      <main>
        <section class="panel"><h2>타입 에너지</h2><div class="energy-grid" data-view="energies"></div></section>
        <section class="panel"><h2>포탈</h2><div class="portal-grid" data-view="portal-inputs"></div><div class="portal-summary" data-view="portal-summary"></div><button class="primary" data-action="summon">포탈 활성화</button><div class="candidates" data-view="candidates"></div></section>
        <section class="panel"><h2>포켓몬</h2><div class="dex" data-view="dex"></div></section>
        <section class="panel"><h2>로그</h2><div class="logs" data-view="logs"></div></section>
      </main>`;
  }

  bindEvents() {
    this.root.addEventListener('input', event => {
      const type = event.target.dataset.energyInput;
      if (type) this.game.setPortalInput(type, event.target.value);
    });
    this.root.querySelector('[data-action="summon"]').addEventListener('click', () => this.game.summon());
    this.root.querySelector('[data-action="save"]').addEventListener('click', () => this.game.save());
    this.root.querySelector('[data-action="load"]').addEventListener('click', () => this.game.load());

    this.root.querySelector('[data-view="portal-inputs"]').innerHTML = this.energyTypes.map(type => `
      <label><span>${TYPE_LABELS[type]}</span><input type="number" min="0" step="1" data-energy-input="${type}" value="0"></label>`).join('');
  }

  render(state) {
    const production = this.game.productionSystem.getProduction(state);
    this.root.querySelector('[data-view="energies"]').innerHTML = this.energyTypes.map(type => `
      <article class="energy"><span>${TYPE_LABELS[type]}</span><strong>${formatNumber(state.resources.energy[type])}</strong><small>+${formatNumber(production[type])}/s</small></article>`).join('');

    for (const input of this.root.querySelectorAll('[data-energy-input]')) {
      if (document.activeElement !== input) input.value = state.portal.input[input.dataset.energyInput] ?? 0;
    }

    const candidates = this.game.portalSystem.getCandidates(state);
    const usedTypes = this.energyTypes.filter(type => state.portal.input[type] > 0).length;
    const total = Object.values(state.portal.input).reduce((sum, value) => sum + value, 0);
    const cooldown = Math.max(0, state.portal.cooldownUntil - Date.now()) / 1000;
    this.root.querySelector('[data-view="portal-summary"]').innerHTML = `
      <span>사용 타입 ${usedTypes}/${state.unlocks.maxEnergyTypes}</span><span>총 투입 ${formatNumber(total)}</span><span>후보 ${candidates.length}종</span><span>각 확률 ${candidates.length ? (100 / candidates.length).toFixed(2) + '%' : '-'}</span><span>${cooldown > 0 ? `쿨타임 ${cooldown.toFixed(1)}초` : '사용 가능'}</span>`;

    this.root.querySelector('[data-view="candidates"]').innerHTML = candidates.length
      ? candidates.map(p => `<span>${p.name} ${(100 / candidates.length).toFixed(2)}%</span>`).join('')
      : '<span class="muted">후보 없음</span>';

    this.root.querySelector('[data-view="dex"]').innerHTML = this.pokemonData.map(p => {
      const found = Boolean(state.pokemon.discovered[p.id]);
      return `<article class="pokemon ${found ? '' : 'hidden-mon'}"><div><strong>${found ? p.name : '???'}</strong><b>×${formatNumber(state.pokemon.counts[p.id] ?? 0)}</b></div><small>${p.types.map(t => TYPE_LABELS[t]).join(' / ')}</small>${found && p.effects?.length ? `<p>${p.effects.map(e => e.label ?? e.type).join('<br>')}</p>` : ''}</article>`;
    }).join('');

    this.root.querySelector('[data-view="logs"]').innerHTML = state.logs.map(log => `<div>${new Date(log.at).toLocaleTimeString('ko-KR')} · ${log.message}</div>`).join('');
  }
}
