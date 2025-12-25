import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { BarChartComponent } from './bar-chart.component';
import { ApiService, ChartResponse } from '../../services/api.service';

describe('BarChartComponent', () => {
  let component: BarChartComponent;
  let fixture: ComponentFixture<BarChartComponent>;

  const mockResponse: ChartResponse = {
    title: 'Bar Chart',
    data: [
      { label: 'Mon', value: 12 },
      { label: 'Tue', value: 18 },
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
    const fixture = TestBed.createComponent(BarChartComponent);
    const component = fixture.componentInstance;
    expect(component).toBeTruthy();
  });

  it('ngOnInit should request bar chart data (and not crash the test env)', () => {
    // Block requestAnimationFrame so D3 render code doesn’t execute in unit test
    const originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (() => 0) as any;

    try {
      fixture.detectChanges(); // triggers ngOnInit
      expect(mockApi.getBarChart as any).toHaveBeenCalledTimes(1);

      // Optional: assert component state instead of render calls
      // expect(component.rows?.length).toBeGreaterThan(0);
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
    }
  });


  it('parseYyyyMmDd should return Date for valid yyyy-mm-dd and null for invalid', () => {
    const fixture = TestBed.createComponent(BarChartComponent);
    const component = fixture.componentInstance as any;

    const d = component.parseYyyyMmDd('2025-12-25');
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2025);
    expect(d.getMonth()).toBe(11); // zero-based
    expect(d.getDate()).toBe(25);

    expect(component.parseYyyyMmDd('2025/12/25')).toBeNull();
    expect(component.parseYyyyMmDd('not-a-date')).toBeNull();
  });

  it('buildDateRangeTextFromRows should return a human-readable range', () => {
    const fixture = TestBed.createComponent(BarChartComponent);
    const component = fixture.componentInstance as any;

    const text = component.buildDateRangeTextFromRows([
      { date: '2025-12-24', bom: 24 },
      { date: '2025-12-25', bom: 21, openMeteo: 21.8 },
    ]);

    expect(text).toContain('Showing:');
  });
});
