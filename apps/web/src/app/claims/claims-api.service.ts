import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from './api-config';
import type { ApiErrorResponse, ClaimDetail, ClaimStatus, ClaimSummary } from './claims-api.types';

@Injectable({ providedIn: 'root' })
export class ClaimsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/claims`;

  getClaims(): Observable<ClaimSummary[]> {
    return this.http.get<ClaimSummary[]>(this.baseUrl);
  }

  getClaim(id: string): Observable<ClaimDetail> {
    return this.http.get<ClaimDetail>(`${this.baseUrl}/${id}`);
  }

  updateClaimStatus(id: string, status: ClaimStatus): Observable<ClaimDetail> {
    return this.http.patch<ClaimDetail>(`${this.baseUrl}/${id}/status`, { status });
  }

  getErrorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse && isApiErrorResponse(error.error)) {
      return error.error.message;
    }

    if (error instanceof Error) {
      return error.message;
    }

    return 'Unexpected error. Please try again.';
  }
}

function isApiErrorResponse(value: unknown): value is ApiErrorResponse {
  if (typeof value !== 'object' || value === null) {
    return false;
  }

  const response = value as Record<string, unknown>;

  return typeof response['statusCode'] === 'number' && typeof response['error'] === 'string' && typeof response['message'] === 'string';
}
