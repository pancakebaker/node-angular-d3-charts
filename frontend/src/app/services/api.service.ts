import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../environments/environment';
import { Observable } from 'rxjs';

export type ChartItem = { label: string; value: number; };
export type ChartResponse = { title: string; data: ChartItem[] };

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private base = environment.apiBaseUrl;

  constructor(private http: HttpClient) {}

  getBarChart(): Observable<ChartResponse> {
    return this.http.get<ChartResponse>(`${this.base}/api/barchart`);
  }

  getPieChart(): Observable<ChartResponse> {
    return this.http.get<ChartResponse>(`${this.base}/api/piechart`);
  }
}
