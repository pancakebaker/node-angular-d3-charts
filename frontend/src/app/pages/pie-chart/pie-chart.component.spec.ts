import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { PieChartComponent } from './pie-chart.component';
import { ApiService, ChartResponse } from '../../services/api.service';

describe('PieChartComponent', () => {
  let component: PieChartComponent;
  let fixture: ComponentFixture<PieChartComponent>;

  const mockResponse: ChartResponse = {
    title: 'Pie Chart',
    data: [
      { label: 'A', value: 40 },
      { label: 'B', value: 60 },
    ],
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

  it('ngOnInit should request pie chart data (and not crash the test env)', () => {
    const originalRaf = globalThis.requestAnimationFrame;
    globalThis.requestAnimationFrame = (() => 0) as any;

    try {
      fixture.detectChanges(); // triggers ngOnInit
      expect(mockApi.getPieChart).toHaveBeenCalledTimes(1);
    } finally {
      globalThis.requestAnimationFrame = originalRaf;
    }
  });

  it('parseYyyyMmDd should return Date for valid yyyy-mm-dd and null for invalid', () => {
    const c = component as any;

    const d = c.parseYyyyMmDd('2025-12-25');
    expect(d).toBeInstanceOf(Date);
    expect(d.getFullYear()).toBe(2025);

    expect(c.parseYyyyMmDd('not-a-date')).toBeNull();
  });

});
