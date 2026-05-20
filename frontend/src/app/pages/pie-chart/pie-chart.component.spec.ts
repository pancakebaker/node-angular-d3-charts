import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { PieChartComponent } from './pie-chart.component';
import { ApiService, WeatherChartResponse } from '../../services/api.service';

describe('PieChartComponent', () => {
  let component: PieChartComponent;
  let fixture: ComponentFixture<PieChartComponent>;

  const mockResponse: WeatherChartResponse = {
    title: 'Temperature Share by Day • Sydney',
    data: [
      { date: '2026-05-20', openMeteo: 21.5, bom: 22.1 },
      { date: '2026-05-21', openMeteo: 23.2, bom: 24 },
    ],
    meta: { unit: '°C', sources: ['open-meteo', 'bom'] },
  };

  const mockApi: Partial<ApiService> = {
    getPieChart: vi.fn(() => of(mockResponse)),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PieChartComponent],
      providers: [{ provide: ApiService, useValue: mockApi }],
    }).compileComponents();

    vi.clearAllMocks();
    fixture = TestBed.createComponent(PieChartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should request pie chart data and expose weather rows', () => {
    const originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (() => 0) as any;

    try {
      fixture.detectChanges();
      expect(mockApi.getPieChart).toHaveBeenCalledTimes(1);
      expect(component.rows.length).toBe(2);
      expect(component.dateRangeText).toContain('Showing');
      expect(component.isLoading).toBe(false);
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
    }
  });

  it('shows an error state when the chart API fails', () => {
    (mockApi.getPieChart as any).mockReturnValueOnce(throwError(() => new Error('offline')));

    fixture.detectChanges();

    expect(component.errorMessage).toContain('Chart data is unavailable');
    expect(component.isLoading).toBe(false);
  });

  it('parseYyyyMmDd should return Date for valid yyyy-mm-dd and null for invalid', () => {
    const c = component as any;

    const d = c.parseYyyyMmDd('2026-05-20');
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2026);

    expect(c.parseYyyyMmDd('not-a-date')).toBeNull();
  });
});
