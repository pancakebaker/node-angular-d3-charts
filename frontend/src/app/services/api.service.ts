import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export type ChartQuery = {
  lat: number;
  lon: number;
  bomSearch: string;
  days: number;
};

export type WeatherChartRow = {
  date: string;
  openMeteo?: number | null;
  bom?: number | null;
};

export type WeatherChartResponse = {
  title: string;
  data: WeatherChartRow[];
  meta?: {
    unit: string;
    sources: string[];
  };
};

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getBarChart(query?: Partial<ChartQuery>): Observable<WeatherChartResponse> {
    return this.http.get<WeatherChartResponse>(`${this.base}/api/barchart`, {
      params: this.toParams(query),
    });
  }

  getPieChart(query?: Partial<ChartQuery>): Observable<WeatherChartResponse> {
    return this.http.get<WeatherChartResponse>(`${this.base}/api/piechart`, {
      params: this.toParams(query),
    });
  }

  private toParams(query?: Partial<ChartQuery>): Record<string, string> {
    if (!query) return {};

    return Object.fromEntries(
      Object.entries(query)
        .filter((entry): entry is [string, string | number] => entry[1] !== undefined)
        .map(([key, value]) => [key, String(value)])
    );
  }
}
