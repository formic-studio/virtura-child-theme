const BUTTON_SELECTOR = '.btn';
const WAVE_POINT_COUNT = 11;
const WAVE_MIN = 87;
const WAVE_MAX = 99;

const hashString = (value) => {
  let hash = 2166136261;

  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  return hash >>> 0;
};

const createRandom = (seed) => {
  let value = seed || 1;

  return () => {
    value += 0x6d2b79f5;

    let next = value;

    next = Math.imul(next ^ (next >>> 15), next | 1);
    next ^= next + Math.imul(next ^ (next >>> 7), next | 61);

    return ((next ^ (next >>> 14)) >>> 0) / 4294967296;
  };
};

const getWaveValue = (random) => (
  `${(WAVE_MIN + random() * (WAVE_MAX - WAVE_MIN)).toFixed(2)}%`
);

const setButtonWave = (button, index) => {
  const seed = hashString([
    index,
    button.textContent?.trim() || '',
    button.className || '',
  ].join('|'));
  const random = createRandom(seed);

  for (let point = 1; point <= WAVE_POINT_COUNT; point += 1) {
    button.style.setProperty(`--btn-wave-${point}`, getWaveValue(random));
    button.style.setProperty(`--btn-wave-alt-${point}`, getWaveValue(random));
  }

  button.style.setProperty(
    '--btn-wave-duration',
    `${(1.05 + random() * 0.45).toFixed(2)}s`,
  );
  button.style.setProperty(
    '--btn-wave-delay',
    `${(-0.1 - random() * 0.35).toFixed(2)}s`,
  );
};

export const initButtonHover = () => {
  document
    .querySelectorAll(BUTTON_SELECTOR)
    .forEach((button, index) => setButtonWave(button, index));
};
