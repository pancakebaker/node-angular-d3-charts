
describe('weatherAggregate.service daily cache', () => {
  beforeEach(() => {
    jest.resetModules();
  });

  it('caches upstream results for same day/key', async () => {
    jest.doMock('../src/services/openMeteo.service', () => ({
      getForecast: jest.fn(async () => ({ daily: { time: [], temperature_2m_max: [] } })),
    }));

    jest.doMock('../src/services/bom.service', () => ({
      searchLocation: jest.fn(async () => ({ geohash: 'abc123', name: 'Sydney' })),
      getDaily: jest.fn(async () => ({ data: [] })),
      getThreeHourlyBestEffort: jest.fn(async () => ({ json: { data: [] }, modifiedGeohash: 'abc12' })),
    }));

    const svc = require('../src/services/weatherAggregate.service');
    const open = require('../src/services/openMeteo.service');
    const bom = require('../src/services/bom.service');

    const args = { lat: -33.86, lon: 151.20, days: 7, bomSearch: 'Sydney' };

    await svc.getCombined(args);
    await svc.getCombined(args);

    expect(open.getForecast).toHaveBeenCalledTimes(1);
    expect(bom.searchLocation).toHaveBeenCalledTimes(1);
    expect(bom.getDaily).toHaveBeenCalledTimes(1);
    expect(bom.getThreeHourlyBestEffort).toHaveBeenCalledTimes(1);
  });
});
