export const GAME_CONFIG = Object.freeze({
  saveKey: 'pokenergy_save',
  saveVersion: 8,
  autosaveMs: 10_000,
  tickMs: 100,
  maxTickSeconds: 2,

  portal: {
    cooldownTiers: [
      { minSummons: 0, seconds: 2.5 },
      { minSummons: 50, seconds: 5 },
      { minSummons: 100, seconds: 10 },
    ],
    minCooldownSeconds: 1,
    startingMaxEnergyTypes: 1,
  },

  story: {
    introLineDelayMs: 1_500,
  },

});
