// src/app/app.routes.ts
import { Routes } from '@angular/router';
import { IntegrationComponent } from './components/integration/integration.component';
import { DataViewComponent } from './components/data-view/data-view.component';

export const routes: Routes = [
  { path: '', component: IntegrationComponent },
  { path: 'data', component: DataViewComponent },
  { path: '**', redirectTo: '' },
];
