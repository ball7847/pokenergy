import { TYPE_LABELS } from '../data/types.js';
import { formatEnergyNumber, formatNumber } from './format.js';

function energyName(type) {
  return `${TYPE_LABELS[type] ?? type}에너지`;
}

function pokemonName(id, pokemonData) {
  return pokemonData.find(p => p.id === id)?.name ?? id;
}

export function conditionToText(condition, pokemonData = []) {
  switch (condition.type) {
    case 'energy_min':
      return `${energyName(condition.energy)} ${formatEnergyNumber(condition.value)} 이상`;
    case 'energy_exact':
      return `${energyName(condition.energy)} 정확히 ${formatEnergyNumber(condition.value)}`;
    case 'total_energy_min':
      return `총 투입 에너지 ${formatEnergyNumber(condition.value)} 이상`;
    case 'pokemon_count_min':
      return `${pokemonName(condition.pokemon, pokemonData)} ${formatNumber(condition.value)}마리 이상`;
    case 'pokemon_discovered':
      return `${pokemonName(condition.pokemon, pokemonData)} 발견`;
    case 'type_pokemon_count_min':
      return `${TYPE_LABELS[condition.energy] ?? condition.energy}타입 포켓몬 총 ${formatNumber(condition.value)}마리 이상`;
    case 'type_discovered_count_min':
      return `${TYPE_LABELS[condition.energy] ?? condition.energy}타입 포켓몬 ${formatNumber(condition.value)}종 이상 발견`;
    case 'energy_type_count': {
      const mode = condition.mode ?? 'exact';
      const suffix = mode === 'min' ? '종 이상' : mode === 'max' ? '종 이하' : '종';
      return `투입 에너지 종류 ${formatNumber(condition.value)}${suffix}`;
    }
    case 'energy_not_used':
      return `${energyName(condition.energy)} 미투입`;
    case 'energy_ratio': {
      const numerator = energyName(condition.numerator);
      const denominator = energyName(condition.denominator);
      const min = condition.min;
      const max = condition.max;
      if (Number.isFinite(min) && Number.isFinite(max) && min === max) {
        return `${numerator}가 ${denominator}의 ${formatEnergyNumber(min)}배`;
      }
      if (Number.isFinite(min) && Number.isFinite(max)) {
        return `${numerator}/${denominator} 비율 ${formatEnergyNumber(min)}~${formatEnergyNumber(max)}`;
      }
      if (Number.isFinite(min)) return `${numerator}/${denominator} 비율 ${formatEnergyNumber(min)} 이상`;
      if (Number.isFinite(max)) return `${numerator}/${denominator} 비율 ${formatEnergyNumber(max)} 이하`;
      return `${numerator}/${denominator} 비율 조건`;
    }
    case 'total_discovered_min':
      return `도감 ${formatNumber(condition.value)}종 이상 발견`;
    default:
      return condition.label ?? condition.type;
  }
}

export function pokemonConditionsToText(pokemon, pokemonData = []) {
  if (pokemon.conditionGroups?.length) {
    return pokemon.conditionGroups
      .map(group => group.map(condition => conditionToText(condition, pokemonData)).join(' + '))
      .join(' OR ');
  }

  const conditions = pokemon.conditions ?? [];
  if (!conditions.length) return '조건 없음';
  const separator = pokemon.conditionMode === 'any' ? ' OR ' : ' + ';
  return conditions.map(condition => conditionToText(condition, pokemonData)).join(separator);
}
