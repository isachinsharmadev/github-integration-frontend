// src/app/services/github.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class GithubService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Integration methods
  getIntegrationStatus(): Observable<any> {
    return this.http.get(`${this.apiUrl}/github/status`);
  }

  initiateAuth(): void {
    window.location.href = `${this.apiUrl}/github/auth`;
  }

  removeIntegration(): Observable<any> {
    return this.http.delete(`${this.apiUrl}/github/integration`);
  }

  resyncIntegration(): Observable<any> {
    return this.http.post(`${this.apiUrl}/github/resync`, {});
  }

  // Data methods
  getCollections(): Observable<any> {
    return this.http.get(`${this.apiUrl}/data/collections`);
  }

  getCollectionFields(collectionName: string): Observable<any> {
    return this.http.get(
      `${this.apiUrl}/data/collection/${collectionName}/fields`
    );
  }

  getCollectionData(
    collectionName: string,
    page: number = 1,
    pageSize: number = 100,
    sortField?: string,
    sortOrder?: string,
    search?: string,
    filters?: any
  ): Observable<any> {
    // Build request body with all parameters
    const body = {
      page,
      pageSize,
      sortField: sortField || undefined,
      sortOrder: sortOrder || 'asc',
      search: search || '',
      filters: filters || {},
    };

    // Use POST method to send filters in request body
    return this.http.post(
      `${this.apiUrl}/data/collection/${collectionName}`,
      body
    );
  }
}
