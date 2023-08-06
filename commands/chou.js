module.exports = () => {
  return Array(10).fill().map(() => {
    const rand = Math.random();
    if (rand < 0.01) {
      return 5;
    }
    if (rand < 0.1) {
      return 4;
    }
    if (rand < 0.3) {
      return 3;
    }
    if (rand < 0.5) {
      return 2;
    }
    return 1;
  }).sort((a, b) => b - a).map(k => {
    return ' ⬛🟫🟦🟪🟨'.split('')[k];
  }).join('');
};
