import {
  Component, ElementRef, OnDestroy, OnInit, ViewChild,
  ChangeDetectorRef, NgZone, inject, PLATFORM_ID
} from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { ApiService } from '../../services/api.service';
import * as d3 from 'd3';
import { Subscription } from 'rxjs';

type SourceKey = 'openMeteo' | 'bom';
type PieRow = { date: string; openMeteo?: number; bom?: number };

type Slice = {
  date: string;          // YYYY-MM-DD
  dayLabel: string;      // Mon/Tue...
  source: SourceKey;
  value: number;
};

@Component({
  selector: 'app-pie-chart',
  templateUrl: './pie-chart.component.html',
  styleUrls: ['./pie-chart.component.css']
})
export class PieChartComponent implements OnInit, OnDestroy {
  @ViewChild('chart', { static: true }) chartEl!: ElementRef<HTMLDivElement>;
  @ViewChild('legend', { static: true }) legendEl!: ElementRef<HTMLDivElement>;

  title = 'Pie Chart';
  dateRangeText = '';
  private sub?: Subscription;

  private width = 900;
  private height = 420;

  private platformId = inject(PLATFORM_ID);

  constructor(
    private api: ApiService,
    private cdr: ChangeDetectorRef,
    private zone: NgZone
  ) { }

  ngOnInit(): void {
    this.sub = this.api.getPieChart().subscribe((res: any) => {
      this.title = res.title;
      const rows: PieRow[] = res.data ?? [];

      if (!isPlatformBrowser(this.platformId)) return;

      this.zone.runOutsideAngular(() => {
        queueMicrotask(() => requestAnimationFrame(() => this.renderNestedDonut(rows)));
      });
    });
  }

  ngOnDestroy(): void {
    this.sub?.unsubscribe();
  }

  private renderNestedDonut(rows: PieRow[]) {
    d3.select(this.chartEl.nativeElement).selectAll('*').remove();

    const width = this.width;
    const height = this.height;
    const cx = width / 2;
    const cy = height / 2;

    const svg = d3
      .select(this.chartEl.nativeElement)
      .append('svg')
      .attr('viewBox', `0 0 ${width} ${height}`);

    const g = svg.append('g').attr('transform', `translate(${cx},${cy})`);

    // Keep a stable day order
    const ordered = [...rows].sort((a, b) => a.date.localeCompare(b.date));

    const days = ordered.map(r => r.date);

    // Base color per day; same day uses same hue across rings
    const dayBase = d3
      .scaleOrdinal<string, string>()
      .domain(days)
      .range(d3.schemeTableau10.concat((d3.schemeSet3 as any)));

    const colorFor = (date: string, source: 'openMeteo' | 'bom') => {
      const base = d3.color(dayBase(date))!;
      return (source === 'openMeteo' ? base.darker(0.4) : base.brighter(0.8)).formatHex();
    };

    // Values per ring
    const innerData = ordered
      .filter(r => Number.isFinite(r.openMeteo as number))
      .map(r => ({ date: r.date, value: r.openMeteo as number }));

    const outerData = ordered
      .filter(r => Number.isFinite(r.bom as number))
      .map(r => ({ date: r.date, value: r.bom as number }));

    // Radii
    const outerRadius = Math.min(width, height) / 2 - 18;
    const innerOuterRadius = outerRadius * 0.62;
    const innerInnerRadius = outerRadius * 0.35;

    const outerInnerRadius = outerRadius * 0.68;

    const pie = d3
      .pie<{ date: string; value: number }>()
      .value(d => d.value)
      .sort((a, b) => a.date.localeCompare(b.date));

    // Arcs
    const arcInner = d3
      .arc<d3.PieArcDatum<{ date: string; value: number }>>()
      .innerRadius(innerInnerRadius)
      .outerRadius(innerOuterRadius);

    const arcOuter = d3
      .arc<d3.PieArcDatum<{ date: string; value: number }>>()
      .innerRadius(outerInnerRadius)
      .outerRadius(outerRadius);

    // helper: all slices in both rings
    const allSlices = () => g.selectAll<SVGPathElement, any>('path.slice');

    // Draw inner ring (Open-Meteo)
    const innerRing = g.append('g').attr('class', 'ring ring-inner');

    innerRing
      .selectAll<SVGPathElement, d3.PieArcDatum<{ date: string; value: number }>>('path')
      .data(pie(innerData))
      .enter()
      .append('path')
      .attr('class', 'slice')
      .attr('data-date', d => d.data.date)
      .attr('d', arcInner as any)
      .attr('fill', d => colorFor(d.data.date, 'openMeteo'))
      // ✅ hover: dim all slices except same day (same date)
      .on('mouseenter', (event, d) => {
        const date = d.data.date;

        // dim everything
        allSlices()
          .interrupt()
          .transition()
          .duration(120)
          .style('opacity', 0.2);

        // restore same-day group (inner + outer)
        g.selectAll<SVGPathElement, any>(`path.slice[data-date="${date}"]`)
          .interrupt()
          .transition()
          .duration(120)
          .style('opacity', 1);
      })

      .on('mouseleave', () => {
        // restore all slices
        allSlices()
          .interrupt()
          .transition()
          .duration(120)
          .style('opacity', 1);
      });

    // Draw outer ring (BoM)
    const outerRing = g.append('g').attr('class', 'ring ring-outer');

    outerRing
      .selectAll<SVGPathElement, d3.PieArcDatum<{ date: string; value: number }>>('path')
      .data(pie(outerData))
      .enter()
      .append('path')
      .attr('class', 'slice')
      .attr('data-date', d => d.data.date)
      .attr('d', arcOuter as any)
      .attr('fill', d => colorFor(d.data.date, 'bom'))

      // ✅ hover: dim all slices except same day (same date)
      .on('mouseenter', (event, d) => {
        const date = d.data.date;

        // dim everything
        allSlices()
          .interrupt()
          .transition()
          .duration(120)
          .style('opacity', 0.2);

        // restore same-day group (inner + outer)
        g.selectAll<SVGPathElement, any>(`path.slice[data-date="${date}"]`)
          .interrupt()
          .transition()
          .duration(120)
          .style('opacity', 1);
      })

      .on('mouseleave', () => {
        // restore all slices
        allSlices()
          .interrupt()
          .transition()
          .duration(120)
          .style('opacity', 1);
      });

    // Labels on outer ring (day + temps)
    const labelArc = d3
      .arc<d3.PieArcDatum<{ date: string; value: number }>>()
      .innerRadius(outerRadius * 0.84)
      .outerRadius(outerRadius * 0.84);

    g.append('g')
      .selectAll('text')
      .data(pie(outerData))
      .enter()
      .append('text')
      .attr('transform', d => `translate(${labelArc.centroid(d)})`)
      .attr('text-anchor', 'middle')
      .style('font-size', '11px')
      .style('font-weight', '600')
      .text(d => {
        const day = this.dateToDayLabel(d.data.date);
        const om = ordered.find(r => r.date === d.data.date)?.openMeteo;
        const bom = ordered.find(r => r.date === d.data.date)?.bom;
        const omTxt = Number.isFinite(om as number) ? (om as number).toFixed(1) : '—';
        const bomTxt = Number.isFinite(bom as number) ? (bom as number).toFixed(1) : '—';
        return `${day}  OM:${omTxt}  BoM:${bomTxt}`;
      });

    // Small center label
    g.append('text')
      .attr('text-anchor', 'middle')
      .style('font-size', '12px')
      .style('font-weight', '700')
      .text('Temp (°C)');

    g.append('text')
      .attr('text-anchor', 'middle')
      .attr('y', 16)
      .style('font-size', '11px')
      .style('opacity', 0.75)
      .text('Inner: Open-Meteo • Outer: BoM');
  }

  private dateToDayLabel(dateStr: string): string {
    const dt = this.parseYyyyMmDd(dateStr);
    if (!dt) return dateStr;
    return dt.toLocaleDateString(undefined, { weekday: 'short' });
  }

  private parseYyyyMmDd(s: string): Date | null {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(s);
    if (!m) return null;
    const dt = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    return Number.isNaN(dt.getTime()) ? null : dt;
  }
}
