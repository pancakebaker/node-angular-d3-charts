import {
  ChangeDetectorRef,
  Component,
  ElementRef,
  AfterViewInit,
  NgZone,
  OnDestroy,
  OnInit,
  PLATFORM_ID,
  ViewChild,
  inject,
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService, ChartQuery, WeatherChartResponse, WeatherChartRow } from '../../services/api.service';
import * as d3 from 'd3';
import { Subscription } from 'rxjs';

type SourceKey = 'openMeteo' | 'bom';
type DemoLocation = ChartQuery & { id: string; label: string };

@Component({
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.css'],
})
export class PieChartComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartEl!: ElementRef<HTMLDivElement>;
  @ViewChild('legend', { static: true }) legendEl!: ElementRef<HTMLDivElement>;

  readonly demoLocations: DemoLocation[] = [
    { id: 'sydney', label: 'Sydney', lat: -33.8688, lon: 151.2093, bomSearch: 'Sydney', days: 7 },
    { id: 'melbourne', label: 'Melbourne', lat: -37.8136, lon: 144.9631, bomSearch: 'Melbourne', days: 7 },
    { id: 'brisbane', label: 'Brisbane', lat: -27.4698, lon: 153.0251, bomSearch: 'Brisbane', days: 7 },
    { id: 'perth', label: 'Perth', lat: -31.9523, lon: 115.8613, bomSearch: 'Perth', days: 7 },
  ];

  selectedLocation = this.demoLocations[0];
  days = 7;
  title = 'Temperature Share by Day';
  dateRangeText = '';
  rows: WeatherChartRow[] = [];
  isLoading = false;
  errorMessage = '';

  private sub?: Subscription;
  private viewReady = false;
  private readonly width = 900;
  private readonly height = 420;
  private readonly platformId = inject(PLATFORM_ID);

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) {}

  ngOnInit(): void {
    this.loadChart();
  }

  ngAfterViewInit(): void {
    this.viewReady = true;
    this.scheduleRender();
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  refresh(): void {
    this.loadChart();
  }

  setLocation(locationId: string): void {
    const nextLocation = this.demoLocations.find((location) => location.id === locationId);
    if (!nextLocation) return;

    this.selectedLocation = nextLocation;
    this.loadChart();
  }

  setDays(value: string): void {
    const nextDays = Number(value);
    if (!Number.isInteger(nextDays) || nextDays < 1 || nextDays > 16) return;

    this.days = nextDays;
    this.loadChart();
  }

  private loadChart(): void {
    this.sub?.unsubscribe();
    this.isLoading = true;
    this.errorMessage = '';
    this.rows = [];
    this.dateRangeText = '';
    this.clearChart();

    const query: ChartQuery = { ...this.selectedLocation, days: this.days };

    this.sub = this.api.getPieChart(query).subscribe({
      next: (res: WeatherChartResponse) => {
        this.title = res.title;
        this.rows = res.data ?? [];
        this.dateRangeText = this.buildDateRangeTextFromRows(this.rows);
        this.isLoading = false;
        this.cdr.detectChanges();

        this.scheduleRender();
      },
      error: () => {
        this.isLoading = false;
        this.errorMessage = 'Chart data is unavailable. Check that the backend is running, then try again.';
        this.clearChart();
        this.cdr.detectChanges();
      },
    });
  }

  private clearChart(): void {
    if (!isPlatformBrowser(this.platformId) || !this.chartEl || !this.legendEl) return;

    d3.select(this.chartEl.nativeElement).selectAll('*').remove();
    d3.select(this.legendEl.nativeElement).selectAll('*').remove();
  }

  private scheduleRender(): void {
    if (!this.viewReady || !isPlatformBrowser(this.platformId) || this.rows.length === 0) return;

    this.zone.runOutsideAngular(() => {
      queueMicrotask(() => requestAnimationFrame(() => this.renderNestedDonut(this.rows)));
    });
  }

  private renderNestedDonut(rows: WeatherChartRow[]): void {
    this.clearChart();

    const width = this.width;
    const height = this.height;
    const cx = width / 2;
    const cy = height / 2;

    const svg = d3
      .select(this.chartEl.nativeElement)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`);

    const defs = this.appendPieDefs(svg);
    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);
    const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));
    const days = ordered.map((r) => r.date);

    const dayBase = d3
      .scaleOrdinal<string, string>()
      .domain(days)
      .range(d3.schemeTableau10.concat(d3.schemeSet3));

    const colorFor = (date: string, source: SourceKey): string => {
      const base = d3.color(dayBase(date))!;
      return (source === 'openMeteo' ? base.darker(0.45) : base.brighter(0.75)).formatHex();
    };

    const fillFor = (date: string, source: SourceKey): string => {
      const base = colorFor(date, source);
      const gradientId = this.pieGradientId(date, source);
      this.addRadialSliceGradient(defs, gradientId, base, source);
      return `url(#${gradientId})`;
    };

    const innerData = ordered
      .filter((r) => Number.isFinite(r.openMeteo as number))
      .map((r) => ({ date: r.date, value: r.openMeteo as number }));

    const outerData = ordered
      .filter((r) => Number.isFinite(r.bom as number))
      .map((r) => ({ date: r.date, value: r.bom as number }));

    if (innerData.length === 0 && outerData.length === 0) return;

    const outerRadius = Math.min(width, height) / 2 - 18;
    const innerOuterRadius = outerRadius * 0.62;
    const innerInnerRadius = outerRadius * 0.35;
    const outerInnerRadius = outerRadius * 0.68;

    const pie = d3
      .pie<{ date: string; value: number }>()
      .value((d) => d.value)
      .sort((a, b) => a.date.localeCompare(b.date));

    const arcInner = d3
      .arc<d3.PieArcDatum<{ date: string; value: number }>>()
      .innerRadius(innerInnerRadius)
      .outerRadius(innerOuterRadius)
      .padAngle(0.01)
      .cornerRadius(4);

    const arcOuter = d3
      .arc<d3.PieArcDatum<{ date: string; value: number }>>()
      .innerRadius(outerInnerRadius)
      .outerRadius(outerRadius)
      .padAngle(0.01)
      .cornerRadius(5);

    const allSlices = () => g.selectAll<SVGPathElement, unknown>('path.slice');

    const highlightDate = (date: string) => {
      allSlices().style('opacity', 0.22).attr('filter', 'none');
      g.selectAll<SVGPathElement, unknown>(`path.slice[data-date="${date}"]`)
        .style('opacity', 1)
        .attr('filter', 'url(#sliceGlow)');
    };

    const resetHighlight = () => {
      allSlices().style('opacity', 1).attr('filter', 'url(#sliceShadow)');
    };

    g.append('circle').attr('class', 'donut-halo').attr('r', outerRadius + 10);

    g.append('g')
      .attr('class', 'ring ring-inner')
      .selectAll<SVGPathElement, d3.PieArcDatum<{ date: string; value: number }>>('path')
      .data(pie(innerData))
      .enter()
      .append('path')
      .attr('class', 'slice')
      .attr('data-date', (d) => d.data.date)
      .attr('d', arcInner)
      .attr('fill', (d) => fillFor(d.data.date, 'openMeteo'))
      .attr('stroke', 'rgba(255,255,255,0.8)')
      .attr('stroke-width', 1)
      .attr('filter', 'url(#sliceShadow)')
      .on('mouseenter', (_event, d) => highlightDate(d.data.date))
      .on('mouseleave', resetHighlight);

    g.append('g')
      .attr('class', 'ring ring-outer')
      .selectAll<SVGPathElement, d3.PieArcDatum<{ date: string; value: number }>>('path')
      .data(pie(outerData))
      .enter()
      .append('path')
      .attr('class', 'slice')
      .attr('data-date', (d) => d.data.date)
      .attr('d', arcOuter)
      .attr('fill', (d) => fillFor(d.data.date, 'bom'))
      .attr('stroke', 'rgba(255,255,255,0.86)')
      .attr('stroke-width', 1)
      .attr('filter', 'url(#sliceShadow)')
      .on('mouseenter', (_event, d) => highlightDate(d.data.date))
      .on('mouseleave', resetHighlight);

    const labelArc = d3
      .arc<d3.PieArcDatum<{ date: string; value: number }>>()
      .innerRadius(outerRadius * 0.86)
      .outerRadius(outerRadius * 0.86);

    g.append('g')
      .selectAll('text')
      .data(pie(outerData))
      .enter()
      .append('text')
      .attr('class', 'slice-label')
      .attr('transform', (d) => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .text((d) => {
        const day = this.dateToDayLabel(d.data.date);
        const om = ordered.find((r) => r.date === d.data.date)?.openMeteo;
        const bom = ordered.find((r) => r.date === d.data.date)?.bom;
        const omTxt = Number.isFinite(om as number) ? (om as number).toFixed(1) : 'n/a';
        const bomTxt = Number.isFinite(bom as number) ? (bom as number).toFixed(1) : 'n/a';
        return `${day} OM:${omTxt} BoM:${bomTxt}`;
      });

    g.append('circle').attr('class', 'donut-center').attr('r', innerInnerRadius - 12);

    g.append('text')
      .attr('class', 'center-title')
      .attr('text-anchor', 'middle')
      .text('Temp (°C)');

    g.append('text')
      .attr('class', 'center-subtitle')
      .attr('text-anchor', 'middle')
      .attr('y', 18)
      .text('Open-Meteo / BoM');

    this.renderLegend();
  }

  private appendPieDefs(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>) {
    const defs = svg.append('defs');

    defs
      .append('filter')
      .attr('id', 'sliceShadow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '140%')
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 4)
      .attr('stdDeviation', 3)
      .attr('flood-color', '#0f172a')
      .attr('flood-opacity', 0.16);

    defs
      .append('filter')
      .attr('id', 'sliceGlow')
      .attr('x', '-30%')
      .attr('y', '-30%')
      .attr('width', '160%')
      .attr('height', '160%')
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('stdDeviation', 6)
      .attr('flood-color', '#14b8a6')
      .attr('flood-opacity', 0.42);

    return defs;
  }

  private addRadialSliceGradient(
    defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
    id: string,
    baseHex: string,
    source: SourceKey
  ): void {
    if (!defs.select(`#${id}`).empty()) return;

    const base = d3.color(baseHex)!;
    const inner = source === 'openMeteo' ? base.brighter(1.25).formatHex() : base.brighter(1.55).formatHex();
    const outer = source === 'openMeteo' ? base.darker(0.45).formatHex() : base.darker(0.2).formatHex();

    defs
      .append('radialGradient')
      .attr('id', id)
      .attr('cx', '35%')
      .attr('cy', '28%')
      .attr('r', '76%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#ffffff', opacity: 0.82 },
        { offset: '22%', color: inner, opacity: 1 },
        { offset: '100%', color: outer, opacity: 1 },
      ])
      .enter()
      .append('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', (d) => d.color)
      .attr('stop-opacity', (d) => d.opacity);
  }

  private pieGradientId(date: string, source: SourceKey): string {
    return `sliceGradient-${source}-${date.replace(/[^a-zA-Z0-9]/g, '')}`;
  }

  private renderLegend(): void {
    const legend = d3.select(this.legendEl.nativeElement);
    const legendItems = [
      { swatch: 'radial-gradient(circle at 30% 20%, #ffffff 0%, #22d3ee 32%, #2563eb 100%)', label: 'Inner ring: Open-Meteo' },
      { swatch: 'radial-gradient(circle at 30% 20%, #ffffff 0%, #bef264 32%, #16a34a 100%)', label: 'Outer ring: BoM' },
    ];

    const row = legend.append('div').attr('class', 'legend-row');

    const item = row
      .selectAll('div.legend-item')
      .data(legendItems)
      .enter()
      .append('div')
      .attr('class', 'legend-item');

    item.append('span').attr('class', 'legend-swatch').style('background', (d) => d.swatch);
    item.append('span').text((d) => d.label);
  }

  private dateToDayLabel(dateStr: string): string {
    const dt = this.parseYyyyMmDd(dateStr);
    if (!dt) return dateStr;
    return dt.toLocaleDateString(undefined, { weekday: 'short' });
  }

  private buildDateRangeTextFromRows(rows: WeatherChartRow[]): string {
    const dates = rows
      .map((r) => this.parseYyyyMmDd(r.date))
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length === 0) return '';

    const start = dates[0].toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });
    const end = dates[dates.length - 1].toLocaleDateString(undefined, {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    });

    return `Showing ${start} to ${end}`;
  }

  private parseYyyyMmDd(s: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
}
