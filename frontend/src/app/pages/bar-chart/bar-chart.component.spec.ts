import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';

import { BarChartComponent } from './bar-chart.component';
import { ApiService, WeatherChartResponse } from '../../services/api.service';

describe('BarChartComponent', () => {
  let component: BarChartComponent;
  let fixture: ComponentFixture<BarChartComponent>;

  const mockResponse: WeatherChartResponse = {
    title: 'Daily Max Temperature (°C) • Sydney',
    data: [
      { date: '2026-05-20', openMeteo: 21.5, bom: 22.1 },
      { date: '2026-05-21', openMeteo: 23.2, bom: 24 },
    ],
  };

  const mockApi: Partial<ApiService> = {
    getBarChart: vi.fn(() => of(mockResponse)),
  };

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BarChartComponent],
      providers: [{ provide: ApiService, useValue: mockApi }],
    }).compileComponents();

    vi.clearAllMocks();
    fixture = TestBed.createComponent(BarChartComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('ngOnInit should request bar chart data and expose weather rows', () => {
    const originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (() => 0) as any;

    try {
      fixture.detectChanges();
      expect(mockApi.getBarChart as any).toHaveBeenCalledTimes(1);
      expect(component.rows.length).toBe(2);
      expect(component.dateRangeText).toContain('Showing');
      expect(component.isLoading).toBe(false);
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
    }
  });

  it('shows an error state when the chart API fails', () => {
    (mockApi.getBarChart as any).mockReturnValueOnce(throwError(() => new Error('offline')));

    fixture.detectChanges();

    expect(component.errorMessage).toContain('Chart data is unavailable');
    expect(component.isLoading).toBe(false);
  });

  it('parseYyyyMmDd should return Date for valid yyyy-mm-dd and null for invalid', () => {
    const c = component as any;

    const d = c.parseYyyyMmDd('2026-05-20');
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2026);
    expect(d.getMonth()).toBe(4);
    expect(d.getDate()).toBe(20);

    expect(c.parseYyyyMmDd('2026/05/20')).toBeNull();
    expect(c.parseYyyyMmDd('not-a-date')).toBeNull();
  });

  it('buildDateRangeTextFromRows should return a human-readable range', () => {
    const c = component as any;

    const text = c.buildDateRangeTextFromRows([
      { date: '2026-05-20', bom: 24 },
      { date: '2026-05-21', bom: 21, openMeteo: 21.8 },
    ]);

    expect(text).toContain('Showing');
  });
});
