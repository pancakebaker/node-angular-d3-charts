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
type SourceDatum = { key: SourceKey; value: number | null | undefined };
type DemoLocation = ChartQuery & { id: string; label: string };

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css'],
})
export class BarChartComponent implements OnInit, AfterViewInit, OnDestroy {
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
  title = 'Daily Max Temperature';
  dateRangeText = '';
  rows: WeatherChartRow[] = [];
  isLoading = false;
  errorMessage = '';

  private sub?: Subscription;
  private viewReady = false;
  private readonly width = 900;
  private readonly height = 420;
  private readonly margin = { top: 20, right: 20, bottom: 70, left: 60 };
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

    this.sub = this.api.getBarChart(query).subscribe({
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
      queueMicrotask(() => requestAnimationFrame(() => this.render(this.rows)));
    });
  }

  private render(data: WeatherChartRow[]): void {
    this.clearChart();

    const innerWidth = this.width - this.margin.left - this.margin.right;
    const innerHeight = this.height - this.margin.top - this.margin.bottom;
    const sourceFill: Record<SourceKey, string> = {
      openMeteo: 'url(#barGradientOpenMeteo)',
      bom: 'url(#barGradientBom)',
    };
    const legendFill: Record<SourceKey, string> = {
      openMeteo: 'linear-gradient(180deg, #22d3ee 0%, #2563eb 100%)',
      bom: 'linear-gradient(180deg, #bef264 0%, #16a34a 100%)',
    };

    const svg = d3
      .select(this.chartEl.nativeElement)
      .append('svg')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`);

    this.appendBarDefs(svg);

    const g = svg
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    const tooltip = d3
      .select(this.chartEl.nativeElement)
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('opacity', 0);

    const dates = Array.from(new Set(data.map((d) => d.date)));
    const x0 = d3.scaleBand<string>().domain(dates).range([0, innerWidth]).padding(0.2);
    const x1 = d3
      .scaleBand<SourceKey>()
      .domain(['openMeteo', 'bom'])
      .range([0, x0.bandwidth()])
      .paddingInner(0.04)
      .paddingOuter(0);
    const y = d3
      .scaleLinear()
      .domain([0, d3.max(data, (d) => Math.max(d.openMeteo ?? 0, d.bom ?? 0)) ?? 0])
      .nice()
      .range([innerHeight, 0]);

    const color = d3
      .scaleOrdinal<SourceKey, string>()
      .domain(['openMeteo', 'bom'])
      .range([sourceFill.openMeteo, sourceFill.bom]);

    g.append('rect')
      .attr('class', 'plot-bg')
      .attr('x', -10)
      .attr('y', -10)
      .attr('width', innerWidth + 20)
      .attr('height', innerHeight + 20)
      .attr('rx', 16);

    g.append('g')
      .attr('class', 'grid-lines')
      .call(d3.axisLeft(y).tickSize(-innerWidth).tickFormat(() => ''));

    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(d3.axisBottom(x0).tickFormat((d) => this.dateToDayLabel(d)))
      .selectAll('text')
      .attr('transform', 'translate(-6,8) rotate(-20)')
      .style('text-anchor', 'end');

    g.append('g').call(d3.axisLeft(y)).selectAll('path,line').attr('stroke', '#475569');
    g.selectAll('.domain, .tick line').attr('stroke', '#cbd5e1');
    g.selectAll('.tick text').attr('fill', '#475569');

    const temps: number[] = [];
    for (const row of data) {
      if (Number.isFinite(row.openMeteo as number)) temps.push(row.openMeteo as number);
      if (Number.isFinite(row.bom as number)) temps.push(row.bom as number);
    }
    const avgTemp = temps.length ? d3.mean(temps)! : null;

    const dayGroups = g
      .selectAll<SVGGElement, WeatherChartRow>('g.day')
      .data(data)
      .enter()
      .append('g')
      .attr('class', 'day')
      .attr('transform', (d) => `translate(${x0(d.date) ?? 0},0)`);

    const barOverlapPx = 1;

    dayGroups
      .selectAll<SVGRectElement, SourceDatum>('rect')
      .data((d): SourceDatum[] => [
        { key: 'openMeteo', value: d.openMeteo },
        { key: 'bom', value: d.bom },
      ])
      .enter()
      .append('rect')
      .attr('class', 'bar')
      .attr('x', (d) => {
        const baseX = x1(d.key) ?? 0;
        return d.key === 'bom' ? baseX - barOverlapPx : baseX;
      })
      .attr('y', (d) => y(d.value ?? 0))
      .attr('width', (d) => x1.bandwidth() + (d.key === 'bom' ? barOverlapPx : 0))
      .attr('height', (d) => innerHeight - y(d.value ?? 0))
      .attr('fill', (d) => color(d.key))
      .attr('fill-opacity', (d) => (d.key === 'bom' ? 0.92 : 1))
      .attr('rx', 8)
      .attr('ry', 8)
      .attr('stroke', 'rgba(255,255,255,0.8)')
      .attr('stroke-width', 1)
      .attr('filter', 'url(#barSoftShadow)')
      .on('mouseenter', (event, d) => {
        if (!Number.isFinite(d.value)) return;

        const hovered = event.currentTarget as SVGRectElement;
        const parent = hovered.parentNode as SVGGElement;
        const isAboveAvg = avgTemp !== null && (d.value as number) > avgTemp;

        d3.select(parent).selectAll<SVGRectElement, unknown>('rect.bar').style('opacity', 0.28);
        d3.select(hovered).style('opacity', 1).attr('filter', 'url(#barGlow)');

        tooltip
          .style('opacity', 1)
          .html(
            `<div class="tt-title">${d.key === 'openMeteo' ? 'Open-Meteo' : 'BoM'}</div>` +
              `<div class="tt-value">${(d.value as number).toFixed(1)} °C</div>` +
              `<div class="tt-sub">${isAboveAvg ? 'Above average' : 'Below average'}</div>`
          );
      })
      .on('mousemove', (event) => {
        const [mx, my] = d3.pointer(event, this.chartEl.nativeElement);
        const node = tooltip.node() as HTMLDivElement | null;

        let left = mx + 12;
        let top = my - 12;

        if (node) {
          left = Math.min(left, this.chartEl.nativeElement.clientWidth - node.offsetWidth - 8);
          top = Math.max(top, node.offsetHeight + 8);
        }

        tooltip.style('left', `${left}px`).style('top', `${top}px`);
      })
      .on('mouseleave', (event) => {
        const hovered = event.currentTarget as SVGRectElement;
        const parent = hovered.parentNode as SVGGElement;

        d3.select(parent).selectAll<SVGRectElement, unknown>('rect.bar').style('opacity', 1);
        d3.select(hovered).attr('filter', 'url(#barSoftShadow)');
        tooltip.style('opacity', 0);
      });

    if (avgTemp !== null && Number.isFinite(avgTemp)) {
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', y(avgTemp))
        .attr('y2', y(avgTemp))
        .attr('stroke', 'url(#avgLineGradient)')
        .attr('stroke-width', 3)
        .attr('stroke-dasharray', '8,5')
        .attr('opacity', 0.95)
        .attr('pointer-events', 'none');

      g.append('text')
        .attr('x', innerWidth - 6)
        .attr('y', y(avgTemp) - 8)
        .attr('text-anchor', 'end')
        .style('font-size', '12px')
        .style('fill', '#7c3aed')
        .style('font-weight', '700')
        .text(`Average ${avgTemp.toFixed(1)} °C`);

      dayGroups
        .selectAll<SVGTextElement, SourceDatum>('text.above-avg')
        .data((d): SourceDatum[] => [
          { key: 'openMeteo', value: d.openMeteo },
          { key: 'bom', value: d.bom },
        ])
        .enter()
        .append('text')
        .attr('class', 'above-avg')
        .filter((d) => Number.isFinite(d.value) && (d.value as number) > avgTemp)
        .attr('x', (d) => (x1(d.key) ?? 0) + x1.bandwidth() / 2)
        .attr('y', (d) => y(d.value as number) - 7)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '700')
        .style('fill', (d) => (d.key === 'openMeteo' ? '#1d4ed8' : '#166534'))
        .style('pointer-events', 'none')
        .text((d) => `${(d.value as number).toFixed(1)} °C`);
    }

    this.renderLegend(legendFill, '#a855f7', avgTemp);
  }

  private appendBarDefs(svg: d3.Selection<SVGSVGElement, unknown, null, undefined>): void {
    const defs = svg.append('defs');

    this.addLinearGradient(defs, 'barGradientOpenMeteo', [
      ['0%', '#2563eb'],
      ['58%', '#3b82f6'],
      ['100%', '#22d3ee'],
    ]);
    this.addLinearGradient(defs, 'barGradientBom', [
      ['0%', '#15803d'],
      ['62%', '#22c55e'],
      ['100%', '#bef264'],
    ]);

    defs
      .append('linearGradient')
      .attr('id', 'avgLineGradient')
      .attr('x1', '0%')
      .attr('x2', '100%')
      .selectAll('stop')
      .data([
        { offset: '0%', color: '#f97316' },
        { offset: '50%', color: '#a855f7' },
        { offset: '100%', color: '#06b6d4' },
      ])
      .enter()
      .append('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', (d) => d.color);

    defs
      .append('filter')
      .attr('id', 'barSoftShadow')
      .attr('x', '-20%')
      .attr('y', '-20%')
      .attr('width', '140%')
      .attr('height', '150%')
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 6)
      .attr('stdDeviation', 4)
      .attr('flood-color', '#0f172a')
      .attr('flood-opacity', 0.16);

    defs
      .append('filter')
      .attr('id', 'barGlow')
      .attr('x', '-35%')
      .attr('y', '-35%')
      .attr('width', '170%')
      .attr('height', '180%')
      .append('feDropShadow')
      .attr('dx', 0)
      .attr('dy', 0)
      .attr('stdDeviation', 5)
      .attr('flood-color', '#14b8a6')
      .attr('flood-opacity', 0.45);
  }

  private addLinearGradient(
    defs: d3.Selection<SVGDefsElement, unknown, null, undefined>,
    id: string,
    stops: Array<[string, string]>
  ): void {
    defs
      .append('linearGradient')
      .attr('id', id)
      .attr('x1', '0%')
      .attr('y1', '100%')
      .attr('x2', '0%')
      .attr('y2', '0%')
      .selectAll('stop')
      .data(stops.map(([offset, color]) => ({ offset, color })))
      .enter()
      .append('stop')
      .attr('offset', (d) => d.offset)
      .attr('stop-color', (d) => d.color);
  }

  private renderLegend(
    color: Record<SourceKey, string>,
    avgLineColor: string,
    avgTemp: number | null
  ): void {
    const legend = d3.select(this.legendEl.nativeElement);

    type LegendItem =
      | { type: 'bar'; key: SourceKey; label: string }
      | { type: 'avg'; label: string };

    const legendItems: LegendItem[] = [
      { type: 'bar', key: 'openMeteo', label: 'Open-Meteo' },
      { type: 'bar', key: 'bom', label: 'BoM' },
      ...(avgTemp !== null ? ([{ type: 'avg', label: `Average (${avgTemp.toFixed(1)} °C)` }] as LegendItem[]) : []),
    ];

    const row = legend.append('div').attr('class', 'legend-row');

    const item = row
      .selectAll('div.legend-item')
      .data(legendItems)
      .enter()
      .append('div')
      .attr('class', 'legend-item');

    item.each(function (d) {
      const el = d3.select(this);

      if (d.type === 'bar') {
        el.append('span').attr('class', 'legend-swatch').style('background', color[d.key]);
      } else {
        el.append('span').attr('class', 'legend-line').style('border-top-color', avgLineColor);
      }
    });

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
