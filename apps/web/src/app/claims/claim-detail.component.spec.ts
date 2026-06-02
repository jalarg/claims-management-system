import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

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
    expect(nativeElement.textContent).toContain('Damage changes are available only while claim is pending.');
  });

  it('uses the damage image URL as the initial thumbnail source', () => {
    component.claim.set(claimWithDamage);
    fixture.detectChanges();

    expect(getDamageThumbnail().src).toBe('https://example.com/front-bumper.jpg');
  });

  it('uses the default fallback image when the damage thumbnail fails to load', () => {
    component.claim.set(claimWithDamage);
    fixture.detectChanges();

    const thumbnail = getDamageThumbnail();

    thumbnail.dispatchEvent(new Event('error'));

    expect(thumbnail.src.endsWith(component.fallbackDamageImageUrl)).toBeTrue();
  });

  it('does not loop if the default fallback image fails to load', () => {
    component.claim.set(claimWithDamage);
    fixture.detectChanges();

    const thumbnail = getDamageThumbnail();
    thumbnail.src = component.fallbackDamageImageUrl;

    thumbnail.dispatchEvent(new Event('error'));

    expect(thumbnail.src.endsWith(component.fallbackDamageImageUrl)).toBeTrue();
  });

  it('keeps valid damage image thumbnails linked to the original image URL', () => {
    component.claim.set(claimWithDamage);
    fixture.detectChanges();

    const link = getDamageImageLink();

    expect(link.href).toBe('https://example.com/front-bumper.jpg');
    expect(link.target).toBe('_blank');
    expect(link.rel).toBe('noopener noreferrer');
  });

  it('shows the fallback image without a link when the local damage image URL is invalid', () => {
    component.claim.set({
      ...claimWithDamage,
      damages: [{ ...claimWithDamage.damages[0], imageUrl: '' }],
    });
    fixture.detectChanges();

    expect(getDamageThumbnail().src.endsWith(component.fallbackDamageImageUrl)).toBeTrue();
    expect(getDamageImageLinkOrNull()).toBeNull();
  });

  it('opens the cancel modal and does not call the API when rejected', async () => {
    component.transitionError.set('Existing error');

    const transition = component.transitionTo('CANCELED');
    fixture.detectChanges();

    expect(getDialog()?.textContent).toContain('Cancel claim');
    expect(getDialog()?.textContent).toContain('Cancel this claim? This action cannot be undone.');

    getDialogButton('Keep claim').click();
    await transition;
    fixture.detectChanges();

    expect(getDialog()).toBeNull();
    expect(claimsApi.updateClaimStatus).not.toHaveBeenCalled();
    expect(component.isSaving()).toBeFalse();
    expect(component.transitionError()).toBe('Existing error');
    expect(component.claim()).toEqual(pendingClaim);
  });

  it('calls the API when cancel modal is confirmed', async () => {
    const canceledClaim = { ...pendingClaim, status: 'CANCELED' } satisfies ClaimDetail;
    claimsApi.updateClaimStatus.and.returnValue(of(canceledClaim));

    const transition = component.transitionTo('CANCELED');
    fixture.detectChanges();

    getDialogButton('Cancel claim').click();
    await transition;

    expect(claimsApi.updateClaimStatus).toHaveBeenCalledOnceWith('claim-1', 'CANCELED');
    expect(component.claim()).toEqual(canceledClaim);
    expect(component.isSaving()).toBeFalse();
  });

  it('opens the finish modal and does not call the API when rejected', async () => {
    component.claim.set({ ...claimWithDamage, status: 'IN_REVIEW' });

    const transition = component.transitionTo('FINISHED');
    fixture.detectChanges();

    expect(getDialog()?.textContent).toContain('Finish claim');
    expect(getDialog()?.textContent).toContain('Finish this claim? Damage changes will no longer be available.');

    getDialogButton('Keep editing').click();
    await transition;
    fixture.detectChanges();

    expect(getDialog()).toBeNull();
    expect(claimsApi.updateClaimStatus).not.toHaveBeenCalled();
    expect(component.isSaving()).toBeFalse();
  });

  it('does not ask for confirmation before starting review', async () => {
    const inReviewClaim = { ...pendingClaim, status: 'IN_REVIEW' } satisfies ClaimDetail;
    claimsApi.updateClaimStatus.and.returnValue(of(inReviewClaim));

    await component.transitionTo('IN_REVIEW');
    fixture.detectChanges();

    expect(getDialog()).toBeNull();
    expect(claimsApi.updateClaimStatus).toHaveBeenCalledOnceWith('claim-1', 'IN_REVIEW');
    expect(component.claim()).toEqual(inReviewClaim);
    expect(component.isSaving()).toBeFalse();
  });

  it('keeps backend transition errors visible when the API rejects', async () => {
    component.claim.set({ ...claimWithDamage, status: 'IN_REVIEW' });
    claimsApi.updateClaimStatus.and.returnValue(throwError(() => new Error('Rejected')));

    const transition = component.transitionTo('FINISHED');
    fixture.detectChanges();

    getDialogButton('Finish claim').click();
    await transition;

    expect(claimsApi.updateClaimStatus).toHaveBeenCalledOnceWith('claim-1', 'FINISHED');
    expect(component.transitionError()).toBe('Backend error');
    expect(component.isSaving()).toBeFalse();
  });

  it('does not show status transition actions for terminal states', () => {
    component.claim.set({ ...pendingClaim, status: 'FINISHED' });

    expect(component.availableTransitionActions()).toEqual([]);

    component.claim.set({ ...pendingClaim, status: 'CANCELED' });

    expect(component.availableTransitionActions()).toEqual([]);
  });

  function getDialog(): HTMLElement | null {
    return (fixture.nativeElement as HTMLElement).querySelector('[role="dialog"]');
  }

  function getDamageThumbnail(): HTMLImageElement {
    const thumbnail = (fixture.nativeElement as HTMLElement).querySelector('.damage-thumb');

    if (!(thumbnail instanceof HTMLImageElement)) {
      throw new Error('Damage thumbnail not found');
    }

    return thumbnail;
  }

  function getDamageImageLink(): HTMLAnchorElement {
    const link = getDamageImageLinkOrNull();

    if (!link) {
      throw new Error('Damage image link not found');
    }

    return link;
  }

  function getDamageImageLinkOrNull(): HTMLAnchorElement | null {
    const link = (fixture.nativeElement as HTMLElement).querySelector('.image-link');

    if (link !== null && !(link instanceof HTMLAnchorElement)) {
      throw new Error('Damage image link is not an anchor');
    }

    return link;
  }

  function getDialogButton(label: string): HTMLButtonElement {
    const dialog = getDialog();

    if (!dialog) {
      throw new Error('Dialog not found');
    }

    const buttons = Array.from(dialog.querySelectorAll('button'));
    const button = buttons.find(
      (candidate): candidate is HTMLButtonElement =>
        candidate instanceof HTMLButtonElement &&
        candidate.textContent?.trim() === label,
    );

    if (!button) {
      throw new Error(`Dialog button not found: ${label}`);
    }

    return button;
  }
});
