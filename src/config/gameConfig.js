export const GAME_CONFIG = Object.freeze({
  saveKey: 'pokenergy_save',
  saveVersion: 7,
  autosaveMs: 10_000,
  tickMs: 100,
  maxTickSeconds: 2,

  portal: {
    baseCooldownSeconds: 10,
    overloadedCooldownSeconds: 30,
    overloadAtSummons: 100,
    minCooldownSeconds: 1,
    startingMaxEnergyTypes: 1,
  },

  story: {
    introLineDelayMs: 1_500,
  },

});
