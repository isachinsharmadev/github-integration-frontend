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
} from 'ag-grid-community';
import { GithubService } from '../../services/github.service';

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

  constructor(private githubService: GithubService) {
    this.gridOptions = {
      defaultColDef: {
        sortable: true,
        filter: true,
        resizable: true,
        floatingFilter: true,
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
      suppressMenuHide: true,
    };
  }

  ngOnInit(): void {
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

  onCollectionChange(): void {
    if (!this.selectedCollection) return;

    console.log('Collection changed to:', this.selectedCollection);
    this.isLoading = true;

    // Clear existing data first
    if (this.gridApi) {
      this.gridApi.setGridOption('datasource', undefined);
    }

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

        // Small delay to ensure grid is ready
        setTimeout(() => {
          this.setupDataSource();
          this.isLoading = false;
        }, 100);
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
      floatingFilter: true,
      valueFormatter: (params) => {
        if (params.value === null || params.value === undefined) return '';
        if (typeof params.value === 'object')
          return JSON.stringify(params.value);
        return params.value;
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

  formatHeader(field: string): string {
    return field
      .split('.')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' > ');
  }

  setupDataSource(): void {
    console.log('Setting up data source for:', this.selectedCollection);

    const dataSource: IDatasource = {
      getRows: (params: IGetRowsParams) => {
        console.log(
          'Getting rows - startRow:',
          params.startRow,
          'endRow:',
          params.endRow
        );

        const page = Math.floor(params.startRow / 100) + 1;
        const sortModel = params.sortModel[0];
        const filterModel = params.filterModel;

        console.log('Page:', page, 'Sort:', sortModel, 'Filters:', filterModel);

        // Extract filters
        const filters: any = {};
        Object.keys(filterModel).forEach((key) => {
          const filter = filterModel[key];
          if (filter.filter) {
            filters[key] = filter.filter;
          }
        });

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
              console.log('Data response:', response);
              console.log('Rows received:', response.data?.length);
              console.log('Total:', response.total);

              const rowsThisPage = response.data;
              let lastRow = -1;

              if (response.data.length < 100) {
                lastRow = params.startRow + response.data.length;
              }

              params.successCallback(rowsThisPage, lastRow);
            },
            error: (error) => {
              console.error('Error loading data:', error);
              params.failCallback();
            },
          });
      },
    };

    if (this.gridApi) {
      console.log('Setting datasource on grid API');
      this.gridApi.setGridOption('datasource', dataSource);
    } else {
      console.warn('Grid API not ready yet!');
    }
  }

  onGridReady(params: GridReadyEvent): void {
    console.log('Grid ready event fired');
    this.gridApi = params.api;

    console.log('Grid API set:', !!this.gridApi);
    console.log('Selected collection:', this.selectedCollection);

    if (this.selectedCollection) {
      console.log('Re-setting up datasource after grid ready');
      this.setupDataSource();
    }
  }

  onSearch(): void {
    if (this.gridApi) {
      this.setupDataSource();
    }
  }

  onClearSearch(): void {
    this.searchTerm = '';
    this.onSearch();
  }

  exportToCsv(): void {
    if (this.gridApi) {
      this.gridApi.exportDataAsCsv();
    }
  }
}
