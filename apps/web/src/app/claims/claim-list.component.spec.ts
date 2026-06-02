import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, Subject, throwError } from 'rxjs';

import { ClaimListComponent } from './claim-list.component';
import { ClaimsApiService } from './claims-api.service';
import type { ClaimSummary } from './claims-api.types';

const claims = [
  {
    id: 'claim-1',
    title: 'Front bumper claim',
    description: 'Customer reported front bumper damage.',
    status: 'PENDING',
    totalAmount: 125,
    createdAt: '2026-06-01T10:00:00.000Z',
    updatedAt: '2026-06-01T10:00:00.000Z',
  },
  {
    id: 'claim-2',
    title: 'Rear door claim',
    description: 'Rear passenger door paint damage.',
    status: 'IN_REVIEW',
    totalAmount: 1621.5,
    createdAt: '2026-06-01T11:00:00.000Z',
    updatedAt: '2026-06-01T11:00:00.000Z',
  },
  {
    id: 'claim-3',
    title: 'Mirror claim',
    description: 'Side mirror inspection pending.',
    status: 'FINISHED',
    totalAmount: 0,
    createdAt: '2026-06-01T12:00:00.000Z',
    updatedAt: '2026-06-01T12:00:00.000Z',
  },
] satisfies ClaimSummary[];

describe('ClaimListComponent', () => {
  let fixture: ComponentFixture<ClaimListComponent>;
  let claimsApi: jasmine.SpyObj<ClaimsApiService>;

  beforeEach(async () => {
    claimsApi = jasmine.createSpyObj<ClaimsApiService>('ClaimsApiService', [
      'getClaims',
      'getErrorMessage',
    ]);
    claimsApi.getErrorMessage.and.returnValue('Backend error');

    await TestBed.configureTestingModule({
      imports: [ClaimListComponent],
      providers: [
        provideRouter([]),
        { provide: ClaimsApiService, useValue: claimsApi },
      ],
    }).compileComponents();
  });

  it('renders claim list column headers', () => {
    createComponentWithClaims(claims);

    expect(getText()).toContain('Claim');
    expect(getText()).toContain('Status');
    expect(getText()).toContain('Total Amount');
  });

  it('loads all claims by default without a status filter', () => {
    createComponentWithClaims(claims);

    expect(claimsApi.getClaims.calls.first().args).toEqual([]);
    expect(getStatusSelect().value).toBe('');
  });

  it('selecting Pending loads claims with PENDING status', () => {
    createComponentWithClaims(claims);

    selectStatus('PENDING');

    expect(claimsApi.getClaims.calls.mostRecent().args).toEqual(['PENDING']);
  });

  it('selecting In review loads claims with IN_REVIEW status', () => {
    createComponentWithClaims(claims);

    selectStatus('IN_REVIEW');

    expect(claimsApi.getClaims.calls.mostRecent().args).toEqual(['IN_REVIEW']);
  });

  it('selecting Finished loads claims with FINISHED status', () => {
    createComponentWithClaims(claims);

    selectStatus('FINISHED');

    expect(claimsApi.getClaims.calls.mostRecent().args).toEqual(['FINISHED']);
  });

  it('selecting Canceled loads claims with CANCELED status', () => {
    createComponentWithClaims(claims);

    selectStatus('CANCELED');

    expect(claimsApi.getClaims.calls.mostRecent().args).toEqual(['CANCELED']);
  });

  it('selecting All loads claims without a status filter', () => {
    createComponentWithClaims(claims);
    selectStatus('PENDING');

    selectStatus('');

    expect(claimsApi.getClaims.calls.mostRecent().args).toEqual([]);
  });

  it('renders formatted total amounts', () => {
    createComponentWithClaims(claims);

    expect(getText()).toContain('$125.00');
    expect(getText()).toContain('$1,621.50');
    expect(getText()).toContain('$0.00');
  });

  it('keeps claim rows linked to detail pages', () => {
    createComponentWithClaims(claims);

    const links = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('.claim-link'),
    );

    expect(links.length).toBe(3);
    expect(links[0].getAttribute('href')).toBe('/claims/claim-1');
    expect(links[1].getAttribute('href')).toBe('/claims/claim-2');
    expect(links[2].getAttribute('href')).toBe('/claims/claim-3');
  });

  it('calculates total listed amount from displayed claims', () => {
    createComponentWithClaims(claims);

    expect(getText()).toContain('Total listed amount: $1,746.50');
  });

  it('shows filtered empty-state message when no claims match the selected status', () => {
    claimsApi.getClaims.and.returnValues(of(claims), of([]));
    createComponent();

    selectStatus('PENDING');

    expect(getText()).toContain('No claims found for this status.');
  });

  it('keeps loading behavior while claims are pending', () => {
    const claims$ = new Subject<ClaimSummary[]>();
    claimsApi.getClaims.and.returnValue(claims$);

    createComponent();

    expect(getText()).toContain('Loading claims...');
    expect((fixture.nativeElement as HTMLElement).querySelector('table')).toBeNull();
  });

  it('keeps error behavior when loading fails', () => {
    claimsApi.getClaims.and.returnValue(throwError(() => new Error('Rejected')));

    createComponent();

    const alert = (fixture.nativeElement as HTMLElement).querySelector('[role="alert"]');

    expect(alert?.textContent).toContain('Backend error');
  });

  function createComponentWithClaims(claimSummaries: ClaimSummary[]): void {
    claimsApi.getClaims.and.returnValue(of(claimSummaries));
    createComponent();
  }

  function createComponent(): void {
    fixture = TestBed.createComponent(ClaimListComponent);
    fixture.detectChanges();
  }

  function getStatusSelect(): HTMLSelectElement {
    const select = (fixture.nativeElement as HTMLElement).querySelector('select');

    if (!(select instanceof HTMLSelectElement)) {
      throw new Error('Status filter select not found');
    }

    return select;
  }

  function selectStatus(status: string): void {
    const select = getStatusSelect();

    select.value = status;
    select.dispatchEvent(new Event('change'));
    fixture.detectChanges();
  }

  function getText(): string {
    return (fixture.nativeElement as HTMLElement).textContent ?? '';
  }
});
