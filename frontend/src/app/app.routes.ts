import { Routes } from '@angular/router';
import { BarChartComponent } from './pages/bar-chart/bar-chart.component';
import { PieChartComponent } from './pages/pie-chart/pie-chart.component';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'bar-chart' },
  { path: 'bar-chart', component: BarChartComponent },
  { path: 'pie-chart', component: PieChartComponent },
];
