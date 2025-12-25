const { requireNumber, requireStringMin, requireIntInRange } = require('../src/helpers/validate');

describe('validate helpers', () => {
  test('requireNumber accepts numeric strings', () => {
    expect(requireNumber('1.5', 'lat')).toBe(1.5);
  });

  test('requireNumber throws with statusCode 400', () => {
    try {
      requireNumber('abc', 'lat');
      throw new Error('should have thrown');
    } catch (e) {
      expect(e.statusCode).toBe(400);
    }
  });

  test('requireStringMin enforces minimum length', () => {
    expect(requireStringMin('Sydney', 'bomSearch', 3)).toBe('Sydney');
    expect(() => requireStringMin('Sy', 'bomSearch', 3)).toThrow();
  });

  test('requireIntInRange enforces range', () => {
    expect(requireIntInRange('7', 'days', 1, 16)).toBe(7);
    expect(() => requireIntInRange('0', 'days', 1, 16)).toThrow();
  });
});
