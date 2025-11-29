// src/app/components/data-view/data-view.component.ts
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AgGridModule } from 'ag-grid-angular';
import {
  ColDef,
  GridOptions,
  GridReadyEvent,
  IDatasource,
  IGetRowsParams,
  GridApi,
  ModuleRegistry,
} from 'ag-grid-community';
import { ClientSideRowModelModule } from 'ag-grid-community';
import { InfiniteRowModelModule } from 'ag-grid-community';
import { CsvExportModule } from 'ag-grid-community';
import { TextFilterModule } from 'ag-grid-community';
import { GithubService } from '../../services/github.service';

// Register AG Grid modules
ModuleRegistry.registerModules([
  ClientSideRowModelModule,
  InfiniteRowModelModule,
  CsvExportModule,
  TextFilterModule,
]);

@Component({
  selector: 'app-data-view',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    AgGridModule,
  ],
  templateUrl: './data-view.component.html',
  styleUrls: ['./data-view.component.css'],
})
export class DataViewComponent implements OnInit {
  collections: string[] = [];
  selectedCollection: string = '';
  searchTerm: string = '';
  columnDefs: ColDef[] = [];
  gridOptions: GridOptions;
  gridApi?: GridApi;
  isLoading = false;
  totalRecords: number | undefined;
  integration: any = null;

  constructor(private githubService: GithubService) {
    this.gridOptions = {
      defaultColDef: {
        sortable: true,
        filter: 'agTextColumnFilter',
        resizable: true,
        floatingFilter: false,
        flex: 1,
        minWidth: 150,
      },
      rowModelType: 'infinite',
      cacheBlockSize: 100,
      cacheOverflowSize: 2,
      maxConcurrentDatasourceRequests: 1,
      infiniteInitialRowCount: 100,
      maxBlocksInCache: 10,
      pagination: true,
      paginationPageSize: 100,
      paginationPageSizeSelector: [50, 100, 200, 500],
      suppressMenuHide: false,
    };
  }

  ngOnInit(): void {
    this.loadIntegrationStatus();
    this.loadCollections();
  }

  loadCollections(): void {
    console.log('Loading collections...');
    this.githubService.getCollections().subscribe({
      next: (response) => {
        console.log('Collections response:', response);
        this.collections = response.collections;
        console.log('Collections loaded:', this.collections);

        if (this.collections.length > 0) {
          this.selectedCollection = this.collections[0];
          console.log('Selected collection:', this.selectedCollection);
          this.onCollectionChange();
        } else {
          console.warn('No collections found!');
        }
      },
      error: (error) => {
        console.error('Error loading collections:', error);
      },
    });
  }
  loadIntegrationStatus(): void {
    this.isLoading = true;
    this.githubService.getIntegrationStatus().subscribe({
      next: (response) => {
        console.log('Integration status response:', response);
        if (response.connected && response.integration) {
          this.integration = response.integration;
        } else {
          this.integration = null;
        }
      },
      error: (error) => {
        console.error('Error loading integration status:', error);
        this.integration = null; // Clear on error
      },
    });
  }

  onCollectionChange(): void {
    if (!this.selectedCollection) return;

    console.log('Collection changed to:', this.selectedCollection);
    this.isLoading = true;

    this.githubService.getCollectionFields(this.selectedCollection).subscribe({
      next: (response) => {
        console.log('Fields response:', response);
        console.log('Fields count:', response.fields?.length);

        if (!response.fields || response.fields.length === 0) {
          console.error('No fields returned!');
          this.isLoading = false;
          return;
        }

        this.buildColumnDefs(response.fields);
        console.log('Column defs built:', this.columnDefs.length);

        setTimeout(() => {
          if (this.gridApi) {
            console.log('Grid API available, setting up datasource');
            this.setupDataSource();
          } else {
            console.warn(
              'Grid API not available yet, will setup on grid ready'
            );
          }
          this.isLoading = false;
        }, 0);
      },
      error: (error) => {
        console.error('Error loading fields:', error);
        this.isLoading = false;
      },
    });
  }

  buildColumnDefs(fields: string[]): void {
    this.columnDefs = fields.map((field) => ({
      field: field,
      headerName: this.formatHeader(field),
      sortable: true,
      filter: 'agTextColumnFilter',
      floatingFilter: false,
      width: this.getColumnWidth(field),
      resizable: true,
      wrapHeaderText: true,
      autoHeaderHeight: true,
      cellStyle: {
        padding: '8px 12px',
        'font-size': '13px',
        'line-height': '1.5',
      },
      headerClass: 'ag-header-cell-improved',
      // Enhanced value getter for nested fields
      valueGetter: (params) => {
        if (!params.data) return null;

        // Handle nested fields like owner.login
        if (field.includes('.')) {
          const parts = field.split('.');
          let value = params.data;
          for (const part of parts) {
            if (value && typeof value === 'object') {
              value = value[part];
            } else {
              return null;
            }
          }
          return value;
        }

        return params.data[field];
      },
      // Enhanced formatter for arrays and objects
      valueFormatter: (params) => {
        const value = params.value;

        if (value === null || value === undefined) return '—';

        // Handle arrays
        if (Array.isArray(value)) {
          if (value.length === 0) return 'Empty';
          if (value.length <= 3) {
            return value
              .map((v) =>
                typeof v === 'object' ? JSON.stringify(v) : String(v)
              )
              .join(', ');
          }
          return `Array[${value.length}]`;
        }

        // Handle objects (JSON)
        if (typeof value === 'object') {
          const keys = Object.keys(value);
          if (keys.length === 0) return '{}';
          if (keys.length <= 2) {
            return keys.map((k) => `${k}: ${value[k]}`).join(', ');
          }
          return `Object{${keys.length}}`;
        }

        // Handle booleans
        if (typeof value === 'boolean') {
          return value ? 'Yes' : 'No';
        }

        // Handle long strings
        if (typeof value === 'string' && value.length > 100) {
          return value.substring(0, 97) + '...';
        }

        return value;
      },
      // Add tooltip for full value
      tooltipValueGetter: (params) => {
        const value = params.value;
        if (value === null || value === undefined) return '';
        if (typeof value === 'object') {
          return JSON.stringify(value, null, 2);
        }
        return String(value);
      },
      filterParams: {
        filterOptions: [
          'contains',
          'notContains',
          'equals',
          'notEqual',
          'startsWith',
          'endsWith',
        ],
        suppressAndOrCondition: true,
        trimInput: true,
      },
    }));
  }

  getColumnWidth(field: string): number {
    const field_lower = field.toLowerCase();

    if (field_lower.includes('url') || field_lower.includes('html')) return 280;
    if (field_lower.includes('id') || field_lower.includes('count')) return 120;
    if (field_lower.includes('date') || field_lower.includes('time'))
      return 180;
    if (field_lower.includes('boolean') || field_lower.includes('archived'))
      return 100;
    if (field_lower.includes('description')) return 250;
    if (field_lower.includes('name') || field_lower === 'full_name') return 200;

    return 160;
  }

  formatHeader(field: string): string {
    return field
      .replace(/([A-Z])/g, ' $1')
      .replace(/_/g, ' ')
      .split('.')
      .map((part) => part.trim())
      .filter((part) => part.length > 0)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(' > ');
  }

  setupDataSource(): void {
    console.log('=== Setting up data source ===');
    console.log('Collection:', this.selectedCollection);
    console.log('Grid API ready:', !!this.gridApi);
    console.log('Column defs:', this.columnDefs.length);

    if (!this.gridApi) {
      console.warn('Grid API not available!');
      return;
    }

    const dataSource: IDatasource = {
      getRows: (params: IGetRowsParams) => {
        console.log('[getRows] Called with:', {
          startRow: params.startRow,
          endRow: params.endRow,
          sortModel: params.sortModel,
          filterModel: Object.keys(params.filterModel || {}),
        });

        const page = Math.floor(params.startRow / 100) + 1;
        const sortModel =
          params.sortModel && params.sortModel.length > 0
            ? params.sortModel[0]
            : undefined;
        const filterModel = params.filterModel || {};

        // Extract filters from ag-Grid filterModel
        // ag-Grid filterModel structure: { fieldName: { filterType: "text", type: "contains", filter: "value" } }
        const filters: any = {};
        Object.keys(filterModel).forEach((key) => {
          const filter = (filterModel as any)[key];
          if (filter) {
            // Extract the filter value - could be nested in filter.filter or just filter.filter
            const filterValue = filter.filter || filter.value;
            if (filterValue) {
              filters[key] = {
                type: filter.type || 'contains',
                filter: filterValue,
              };
            }
          }
        });

        console.log('[getRows] Filters extracted:', filters);
        console.log('[getRows] Making API call for page:', page);

        this.githubService
          .getCollectionData(
            this.selectedCollection,
            page,
            100,
            sortModel?.colId,
            sortModel?.sort,
            this.searchTerm,
            filters
          )
          .subscribe({
            next: (response) => {
              console.log('[getRows] Response received:', {
                dataLength: response.data?.length,
                total: response.total,
                page: response.page,
              });

              this.totalRecords = response.total;

              const rowsThisPage = response.data;
              let lastRow = -1;

              if (response.data.length < 100) {
                lastRow = params.startRow + response.data.length;
              }

              console.log('[getRows] Calling successCallback with:', {
                rowsCount: rowsThisPage.length,
                lastRow,
              });

              params.successCallback(rowsThisPage, lastRow);
            },
            error: (error) => {
              console.error('[getRows] Error:', error);
              params.failCallback();
            },
          });
      },
    };

    console.log('Setting gridOption datasource');
    this.gridApi.setGridOption('datasource', dataSource);
    console.log('Datasource set successfully');
  }

  onGridReady(params: GridReadyEvent): void {
    console.log('Grid ready event fired');
    this.gridApi = params.api;
    console.log('Grid API set:', !!this.gridApi);
    console.log('Selected collection:', this.selectedCollection);
    console.log('Column defs available:', this.columnDefs.length);

    if (this.selectedCollection && this.columnDefs.length > 0) {
      console.log('Re-setting up datasource after grid ready');
      this.setupDataSource();
    } else {
      console.warn('Cannot setup datasource - collection or columns missing');
    }
  }

  onSearch(): void {
    console.log('Search triggered:', this.searchTerm);
    if (this.gridApi) {
      this.gridApi.refreshInfiniteCache();
    }
  }

  onClearSearch(): void {
    this.searchTerm = '';
    console.log('Search cleared');
    if (this.gridApi) {
      this.gridApi.refreshInfiniteCache();
    }
  }

  exportToCsv(): void {
    if (this.gridApi) {
      this.gridApi.exportDataAsCsv();
    }
  }
}
