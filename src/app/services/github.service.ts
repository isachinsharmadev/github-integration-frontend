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
    let params = new HttpParams()
      .set('page', page.toString())
      .set('pageSize', pageSize.toString());

    if (sortField) {
      params = params.set('sortField', sortField);
    }
    if (sortOrder) {
      params = params.set('sortOrder', sortOrder);
    }
    if (search) {
      params = params.set('search', search);
    }
    if (filters) {
      params = params.set('filters', JSON.stringify(filters));
    }

    return this.http.get(`${this.apiUrl}/data/collection/${collectionName}`, {
      params,
    });
  }
}
