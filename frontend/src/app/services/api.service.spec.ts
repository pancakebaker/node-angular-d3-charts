import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';

import { ApiService } from './api.service';
import { environment } from '../../environments/environment';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        // These are also provided globally via src/test-providers.ts,
        // but keeping them here makes the spec runnable in isolation.
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    });

    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('getBarChart() should GET /api/barchart', () => {
    const mockResponse = {
      title: 'Bar',
      data: [{ date: '2026-05-20', openMeteo: 21.5, bom: 22.1 }],
    };

    service.getBarChart({ lat: -33.8688, lon: 151.2093, bomSearch: 'Sydney', days: 7 }).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne((request) => request.url === `${environment.apiBaseUrl}/api/barchart`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('bomSearch')).toBe('Sydney');
    expect(req.request.params.get('days')).toBe('7');
    req.flush(mockResponse);
  });

  it('getPieChart() should GET /api/piechart', () => {
    const mockResponse = {
      title: 'Pie',
      data: [{ date: '2026-05-20', openMeteo: 21.5, bom: 22.1 }],
      meta: { unit: '°C', sources: ['open-meteo', 'bom'] },
    };

    service.getPieChart({ lat: -33.8688, lon: 151.2093, bomSearch: 'Sydney', days: 7 }).subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne((request) => request.url === `${environment.apiBaseUrl}/api/piechart`);
    expect(req.request.method).toBe('GET');
    expect(req.request.params.get('lat')).toBe('-33.8688');
    expect(req.request.params.get('lon')).toBe('151.2093');
    req.flush(mockResponse);
  });
});
