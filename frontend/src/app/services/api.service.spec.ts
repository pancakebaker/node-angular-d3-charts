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
    const mockResponse = { title: 'Bar', data: [{ label: 'A', value: 1 }] };

    service.getBarChart().subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/barchart`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });

  it('getPieChart() should GET /api/piechart', () => {
    const mockResponse = { title: 'Pie', data: [{ label: 'B', value: 2 }] };

    service.getPieChart().subscribe(res => {
      expect(res).toEqual(mockResponse);
    });

    const req = httpMock.expectOne(`${environment.apiBaseUrl}/api/piechart`);
    expect(req.request.method).toBe('GET');
    req.flush(mockResponse);
  });
});
