import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { ClaimDetailComponent } from './claim-detail.component';
import { ClaimsApiService } from './claims-api.service';
import type { ClaimDetail } from './claims-api.types';

const pendingClaim = {
  id: 'claim-1',
  title: 'Front bumper claim',
  description: 'Customer reported vehicle front bumper damage after a parking incident.',
  status: 'PENDING',
  totalAmount: 0,
  damages: [],
  createdAt: '2026-06-01T10:00:00.000Z',
  updatedAt: '2026-06-01T10:00:00.000Z',
} satisfies ClaimDetail;

const claimWithDamage = {
  ...pendingClaim,
  totalAmount: 100,
  damages: [
    {
      id: 'damage-1',
      part: 'Front bumper',
      severity: 'MID',
      imageUrl: 'https://example.com/front-bumper.jpg',
      price: 100,
      score: 7,
    },
  ],
} satisfies ClaimDetail;

describe('ClaimDetailComponent', () => {
  let fixture: ComponentFixture<ClaimDetailComponent>;
  let component: ClaimDetailComponent;
  let claimsApi: jasmine.SpyObj<ClaimsApiService>;

  beforeEach(async () => {
    claimsApi = jasmine.createSpyObj<ClaimsApiService>('ClaimsApiService', [
      'getClaims',
      'getClaim',
      'updateClaimStatus',
      'createDamage',
      'updateDamage',
      'deleteDamage',
      'getErrorMessage',
    ]);
    claimsApi.getClaim.and.returnValue(of(pendingClaim));
    claimsApi.getErrorMessage.and.returnValue('Backend error');

    await TestBed.configureTestingModule({
      imports: [ClaimDetailComponent],
      providers: [
        provideRouter([]),
        {
          provide: ActivatedRoute,
          useValue: {
            snapshot: {
              paramMap: convertToParamMap({ id: 'claim-1' }),
            },
          },
        },
        { provide: ClaimsApiService, useValue: claimsApi },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClaimDetailComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('keeps the damage form invalid when required fields are missing', () => {
    component.damageForm.reset({
      part: '',
      severity: 'MID',
      imageUrl: '',
      price: 0,
      score: 1,
    });

    expect(component.damageForm.invalid).toBeTrue();
  });

  it('derives total from damages after successful add, update, and delete responses', () => {
    claimsApi.createDamage.and.returnValue(of(claimWithDamage));
    component.damageForm.setValue({
      part: 'Front bumper',
      severity: 'MID',
      imageUrl: 'https://example.com/front-bumper.jpg',
      price: 100,
      score: 7,
    });

    component.addDamage();

    expect(component.derivedTotal()).toBe(100);
    expect(claimsApi.createDamage).toHaveBeenCalledWith('claim-1', {
      part: 'Front bumper',
      severity: 'MID',
      imageUrl: 'https://example.com/front-bumper.jpg',
      price: 100,
      score: 7,
    });

    claimsApi.updateDamage.and.returnValue(of({ ...claimWithDamage, totalAmount: 125, damages: [{ ...claimWithDamage.damages[0], price: 125 }] }));

    component.updateDamagePrice('damage-1', '125');

    expect(component.derivedTotal()).toBe(125);

    claimsApi.deleteDamage.and.returnValue(of({ ...pendingClaim, damages: [], totalAmount: 0 }));

    component.deleteDamage('damage-1');

    expect(component.derivedTotal()).toBe(0);
  });

  it('hides damage controls when the claim is not PENDING', () => {
    component.claim.set({ ...claimWithDamage, status: 'IN_REVIEW' });
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(component.canManageDamages()).toBeFalse();
    expect(nativeElement.querySelector('.damage-form')).toBeNull();
    expect(nativeElement.textContent).toContain('Damage changes are available only while claim is PENDING.');
  });
});
