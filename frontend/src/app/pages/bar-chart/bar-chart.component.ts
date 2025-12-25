import {
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  ChangeDetectorRef,
  NgZone,
  inject,
  PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService, ChartItem } from '../../services/api.service';
import * as d3 from 'd3';
import { Subscription } from 'rxjs';

type SourceKey = 'openMeteo' | 'bom';

type BarRow = {
  date: string;         // YYYY-MM-DD
  openMeteo?: number;
  bom?: number;
};

type SourceDatum = { key: SourceKey; value: number | null | undefined };

@Component({
  selector: 'app-bar-chart',
  templateUrl: './bar-chart.component.html',
  styleUrls: ['./bar-chart.component.css'],
})
export class BarChartComponent implements OnInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartEl!: ElementRef<HTMLDivElement>;
  @ViewChild('legend', { static: true }) legendEl!: ElementRef<HTMLDivElement>;

  title = 'Bar Chart';
  dateRangeText = '';
  private sub?: Subscription;

  private width = 900;
  private height = 420;
  private margin = { top: 20, right: 20, bottom: 70, left: 60 };

  private platformId = inject(PLATFORM_ID);

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) { }

  ngOnInit(): void {
    this.sub = this.api.getBarChart().subscribe((res: any) => {
      this.title = res.title;

      // ✅ backend should now return BarRow[]: [{ date, openMeteo, bom }]
      const rows: BarRow[] = res.data ?? [];

      // ✅ date range from rows[].date
      this.dateRangeText = this.buildDateRangeTextFromRows(rows);
      this.cdr.detectChanges();

      // ✅ SSR guard
      if (!isPlatformBrowser(this.platformId)) return;

      // ✅ render grouped bars using BarRow shape
      this.zone.runOutsideAngular(() => {
        queueMicrotask(() =>
          requestAnimationFrame(() => this.render(rows))
        );
      });
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private render(data: BarRow[]) {
    d3.select(this.chartEl.nativeElement).selectAll('svg').remove();

    const innerWidth = this.width - this.margin.left - this.margin.right;
    const innerHeight = this.height - this.margin.top - this.margin.bottom;

    const COLORS = {
      openMeteo: '#2563EB',   // blue-600
      bom: '#16A34A',   // green-600
      avgLine: '#7C3AED',   // violet-600  ← NEW
      axis: '#374151',   // gray-700
    };

    const svg = d3
      .select(this.chartEl.nativeElement)
      .append('svg')
      .attr('viewBox', `0 0 ${this.width} ${this.height}`);

    const g = svg
      .append('g')
      .attr('transform', `translate(${this.margin.left},${this.margin.top})`);

    // ---- Tooltip ----
    d3.select(this.chartEl.nativeElement).selectAll('.chart-tooltip').remove();

    const tooltip = d3
      .select(this.chartEl.nativeElement)
      .append('div')
      .attr('class', 'chart-tooltip')
      .style('position', 'absolute')
      .style('pointer-events', 'none')
      .style('opacity', 0)
      .style('background', '#000')
      .style('color', '#fff')
      .style('border-radius', '10px')
      .style('padding', '8px 10px')
      .style('z-index', '20')
      .style('font-size', '12px')
      .style('line-height', '1.35')
      .style('box-shadow', '0 6px 16px rgba(0,0,0,0.35)');


    // Day labels
    // Unique date keys (YYYY-MM-DD)
    const dates = Array.from(new Set(data.map(d => d.date)));

    const x0 = d3.scaleBand<string>()
      .domain(dates)
      .range([0, innerWidth])
      .padding(0.2);

    const x1 = d3
      .scaleBand<SourceKey>()
      .domain(['openMeteo', 'bom'])
      .range([0, x0.bandwidth()])
      .paddingInner(0)
      .paddingOuter(0);

    const y = d3
      .scaleLinear()
      .domain([
        0,
        d3.max(data, d => Math.max(d.openMeteo ?? 0, d.bom ?? 0)) ?? 0
      ])
      .nice()
      .range([innerHeight, 0]);

    const color = d3
      .scaleOrdinal<SourceKey, string>()
      .domain(['openMeteo', 'bom'])
      .range([COLORS.openMeteo, COLORS.bom]);

    // X axis
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(
        d3.axisBottom(x0).tickFormat((d) => this.dateToDayLabel(d)) // show "Mon", "Tue", ...
      )
      .selectAll('text')
      .attr('transform', 'translate(-6,8) rotate(-20)')
      .style('text-anchor', 'end');

    // Y axis
    g.append('g')
      .call(d3.axisLeft(y))
      .selectAll('path,line')
      .attr('stroke', COLORS.axis);

    g.selectAll('.domain, .tick line')
      .attr('stroke', COLORS.axis);

    g.selectAll('.tick text')
      .attr('fill', COLORS.axis);

    // ---- Average temperature (compute BEFORE bars so tooltip can use it) ----
    const temps: number[] = [];
    for (const row of data) {
      if (Number.isFinite(row.openMeteo as number)) temps.push(row.openMeteo as number);
      if (Number.isFinite(row.bom as number)) temps.push(row.bom as number);
    }
    const avgTemp = temps.length ? d3.mean(temps)! : null;

    // Bars
    const dayGroups = g
      .selectAll<SVGGElement, BarRow>('g.day')
      .data(data as BarRow[])
      .enter()
      .append('g')
      .attr('class', 'day')
      .attr('transform', (d) => `translate(${x0(d.date) ?? 0},0)`);

    const BAR_OVERLAP_PX = 2;

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
        return d.key === 'bom' ? baseX - BAR_OVERLAP_PX : baseX;
      })
      .attr('y', (d) => y(d.value ?? 0))
      .attr('width', (d) =>
        x1.bandwidth() + (d.key === 'bom' ? BAR_OVERLAP_PX : 0)
      )
      .attr('height', (d) => innerHeight - y(d.value ?? 0))
      .attr('fill', (d) => color(d.key))
      .attr('fill-opacity', (d) => (d.key === 'bom' ? 0.9 : 1))

      // ---- TOOLTIP EVENTS ----
      .on('mouseenter', (event, d) => {
        if (!Number.isFinite(d.value)) return;

        const hovered = event.currentTarget as SVGRectElement;
        const parent = hovered.parentNode as SVGGElement; // <-- the g.day

        // dim only the bars inside the same day group
        d3.select(parent)
          .selectAll<SVGRectElement, any>('rect.bar')
          .interrupt()
          .transition()
          .duration(120)
          .style('opacity', 0.25);

        // keep hovered bar fully visible
        d3.select(hovered)
          .interrupt()
          .transition()
          .duration(120)
          .style('opacity', 1);

        // ---- your existing tooltip code ----
        const isAboveAvg = avgTemp !== null && (d.value as number) > avgTemp;

        tooltip
          .style('opacity', 1)
          .html(`
      <div class="tt-title">
        ${d.key === 'openMeteo' ? 'Open-Meteo' : 'BoM'}
      </div>
      <div class="tt-value">
        ${isAboveAvg ? '▲' : '▼'}
        ${(d.value as number).toFixed(1)}°C
      </div>
      <div class="tt-sub">
        ${isAboveAvg ? 'Above average' : 'Below average'}
      </div>
    `);
      })
      .on('mousemove', (event) => {
        const [mx, my] = d3.pointer(event, this.chartEl.nativeElement);
        const node = tooltip.node() as HTMLDivElement | null;

        let left = mx + 12;
        let top = my - 12;

        if (node) {
          const w = node.offsetWidth;
          const h = node.offsetHeight;
          left = Math.min(left, this.chartEl.nativeElement.clientWidth - w - 8);
          top = Math.max(top, h + 8);
        }

        tooltip.style('left', `${left}px`).style('top', `${top}px`);
      })
      .on('mouseleave', (event) => {
        const hovered = event.currentTarget as SVGRectElement;
        const parent = hovered.parentNode as SVGGElement;

        // restore only the bars inside the same day group
        d3.select(parent)
          .selectAll<SVGRectElement, any>('rect.bar')
          .interrupt()
          .transition()
          .duration(120)
          .style('opacity', 1);

        tooltip.style('opacity', 0);
      });

    if (avgTemp !== null && Number.isFinite(avgTemp)) {
      // dashed line
      g.append('line')
        .attr('x1', 0)
        .attr('x2', innerWidth)
        .attr('y1', y(avgTemp))
        .attr('y2', y(avgTemp))
        .attr('stroke', COLORS.avgLine)
        .attr('stroke-width', 2.5)
        .attr('stroke-dasharray', '8,5')
        .attr('opacity', 0.9)
        .attr('pointer-events', 'none');


      // label
      g.append('text')
        .attr('x', innerWidth - 6)
        .attr('y', y(avgTemp) - 8)
        .attr('text-anchor', 'end')
        .style('font-size', '12px')
        .style('fill', COLORS.avgLine)
        .style('font-weight', '600');

    }

    // ---- Value labels for bars ABOVE average ----
    if (avgTemp !== null && Number.isFinite(avgTemp)) {
      dayGroups
        .selectAll<SVGTextElement, SourceDatum>('text.above-avg')
        .data((d): SourceDatum[] => [
          { key: 'openMeteo', value: d.openMeteo },
          { key: 'bom', value: d.bom },
        ])
        .enter()
        .append('text')
        .attr('class', 'above-avg')
        .filter(d => Number.isFinite(d.value) && (d.value as number) > avgTemp)
        .attr('x', d => (x1(d.key) ?? 0) + x1.bandwidth() / 2)
        .attr('y', d => y(d.value as number) - 6)
        .attr('text-anchor', 'middle')
        .style('font-size', '11px')
        .style('font-weight', '600')
        .style('fill', d => d.key === 'openMeteo' ? '#1E40AF' : '#166534')
        .style('pointer-events', 'none')
        .text(d => `${(d.value as number).toFixed(1)}°C`);
    }

    // ---- Legend BELOW chart (HTML) ----
    d3.select(this.legendEl.nativeElement).selectAll('*').remove();

    const legend = d3.select(this.legendEl.nativeElement);

    type LegendItem =
      | { type: 'bar'; key: SourceKey; label: string }
      | { type: 'avg'; label: string };

    const legendItems: LegendItem[] = [
      { type: 'bar', key: 'openMeteo', label: 'Open-Meteo' },
      { type: 'bar', key: 'bom', label: 'BoM' },
      ...(avgTemp !== null
        ? ([{ type: 'avg', label: `Average (${avgTemp.toFixed(1)}°C)` }] as LegendItem[])
        : []),
    ];

    const row = legend
      .append('div')
      .style('display', 'flex')
      .style('gap', '20px')
      .style('align-items', 'center')
      .style('justify-content', 'center')
      .style('flex-wrap', 'wrap');

    const item = row
      .selectAll('div.legend-item')
      .data(legendItems)
      .enter()
      .append('div')
      .attr('class', 'legend-item')
      .style('display', 'flex')
      .style('align-items', 'center')
      .style('gap', '8px');

    // swatch
    item.each(function (d) {
      const el = d3.select(this);

      if (d.type === 'bar') {
        // colored square for bars
        el.append('span')
          .style('display', 'inline-block')
          .style('width', '12px')
          .style('height', '12px')
          .style('background', color(d.key))
          .style('border-radius', '2px');
      } else {
        // dashed line for average
        el.append('span')
          .style('display', 'inline-block')
          .style('width', '18px')
          .style('height', '0')
          .style('border-top', `2.5px dashed ${COLORS.avgLine}`);
      }
    });

    // label text
    item.append('span')
      .text(d => d.label)
      .style('font-size', '12px')
      .style('color', COLORS.axis)
      .style('font-weight', d => d.type === 'avg' ? '600' : '500');


  }

  // helpers (same as before)
  private dateToDayLabel(dateStr: string): string {
    const dt = this.parseYyyyMmDd(dateStr);
    if (!dt) return dateStr;
    return dt.toLocaleDateString(undefined, { weekday: 'short' });
  }

  private buildDateRangeTextFromRows(rows: BarRow[]): string {
    const dates = rows
      .map(r => this.parseYyyyMmDd(r.date))
      .filter((d): d is Date => !!d)
      .sort((a, b) => a.getTime() - b.getTime());

    if (dates.length === 0) return '';

    const start = dates[0].toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });
    const end = dates[dates.length - 1].toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: '2-digit' });

    return `Showing: ${start} - ${end}`;
  }

  private parseYyyyMmDd(s: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const y = Number(m[1]);
    const mo = Number(m[2]) - 1;
    const d = Number(m[3]);
    const dt = new Date(y, mo, d);
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
}
