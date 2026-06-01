export const ClaimStatus = {
  Pending: 'PENDING',
  InReview: 'IN_REVIEW',
  Finished: 'FINISHED',
  Canceled: 'CANCELED',
} as const;

export type ClaimStatus = (typeof ClaimStatus)[keyof typeof ClaimStatus];
