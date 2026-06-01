export type ClaimStatus = 'PENDING' | 'IN_REVIEW' | 'FINISHED' | 'CANCELED';

export type DamageSeverity = 'LOW' | 'MID' | 'HIGH';

export interface Damage {
  id: string;
  part: string;
  severity: DamageSeverity;
  imageUrl: string;
  price: number;
  score: number;
}

export interface ClaimSummary {
  id: string;
  title: string;
  description: string;
  status: ClaimStatus;
  totalAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface ClaimDetail extends ClaimSummary {
  damages: Damage[];
}

export interface CreateDamageRequest {
  part: string;
  severity: DamageSeverity;
  imageUrl: string;
  price: number;
  score: number;
}

export interface UpdateDamageRequest {
  price?: number;
}

export interface ApiErrorResponse {
  statusCode: number;
  error: string;
  message: string;
  details?: readonly {
    field: string;
    message: string;
  }[];
}
