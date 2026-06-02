import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { API_BASE_URL } from './api-config';
import type {
  ApiErrorResponse,
  ClaimDetail,
  ClaimStatus,
  ClaimSummary,
  CreateDamageRequest,
  UpdateDamageRequest,
} from './claims-api.types';

@Injectable({ providedIn: 'root' })
export class ClaimsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = `${API_BASE_URL}/claims`;

  getClaims(status?: ClaimStatus): Observable<ClaimSummary[]> {
    const options = status ? { params: { status } } : {};

    return this.http.get<ClaimSummary[]>(this.baseUrl, options);
  }

  getClaim(id: string): Observable<ClaimDetail> {
    return this.http.get<ClaimDetail>(`${this.baseUrl}/${id}`);
  }

  updateClaimStatus(id: string, status: ClaimStatus): Observable<ClaimDetail> {
    return this.http.patch<ClaimDetail>(`${this.baseUrl}/${id}/status`, { status });
  }

  createDamage(claimId: string, damage: CreateDamageRequest): Observable<ClaimDetail> {
    return this.http.post<ClaimDetail>(`${this.baseUrl}/${claimId}/damages`, damage);
  }

  updateDamage(claimId: string, damageId: string, changes: UpdateDamageRequest): Observable<ClaimDetail> {
    return this.http.patch<ClaimDetail>(`${this.baseUrl}/${claimId}/damages/${damageId}`, changes);
  }

  deleteDamage(claimId: string, damageId: string): Observable<ClaimDetail> {
    return this.http.delete<ClaimDetail>(`${this.baseUrl}/${claimId}/damages/${damageId}`);
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
