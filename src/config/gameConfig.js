export const GAME_CONFIG = Object.freeze({
  saveKey: 'pokenergy_save',
  saveVersion: 3,
  autosaveMs: 10_000,
  tickMs: 100,
  maxTickSeconds: 2,

  portal: {
    baseCooldownSeconds: 60,
    minCooldownSeconds: 1,
    startingMaxEnergyTypes: 1,
  },

  story: {
    introLineDelayMs: 3_000,
  },

  // 아직 미확정인 기획값은 한 곳에 격리한다.
  prototypeRules: {
    dualTypeBaseProductionMode: 'split', // split = 각 타입에 0.5/s씩. 추후 확정 예정.
  },
});
