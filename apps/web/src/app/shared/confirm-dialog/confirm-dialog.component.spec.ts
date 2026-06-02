import { ComponentFixture, TestBed } from "@angular/core/testing";

import { ConfirmDialogComponent } from "./confirm-dialog.component";
import { ConfirmDialogService } from "./confirm-dialog.service";

describe("ConfirmDialogComponent", () => {
  let fixture: ComponentFixture<ConfirmDialogComponent>;
  let service: ConfirmDialogService;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmDialogComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmDialogComponent);
    service = TestBed.inject(ConfirmDialogService);
    fixture.detectChanges();
  });

  it("renders title, message, and buttons", () => {
    void service.confirm({
      title: "Cancel claim",
      message: "Cancel this claim? This action cannot be undone.",
      confirmLabel: "Cancel claim",
      cancelLabel: "Keep claim",
      variant: "danger",
    });
    fixture.detectChanges();

    const nativeElement = fixture.nativeElement as HTMLElement;

    expect(nativeElement.querySelector('[role="dialog"]')).not.toBeNull();
    expect(nativeElement.textContent).toContain("Cancel claim");
    expect(nativeElement.textContent).toContain(
      "Cancel this claim? This action cannot be undone.",
    );
    expect(nativeElement.textContent).toContain("Keep claim");
  });

  it("resolves false on cancel", async () => {
    const result = service.confirm({
      title: "Cancel claim",
      message: "Cancel this claim? This action cannot be undone.",
      confirmLabel: "Cancel claim",
      cancelLabel: "Keep claim",
      variant: "danger",
    });
    fixture.detectChanges();

    getButton("Keep claim").click();
    fixture.detectChanges();

    await expectAsync(result).toBeResolvedTo(false);
    expect(fixture.nativeElement.textContent).not.toContain("Keep claim");
  });

  it("resolves true on confirm", async () => {
    const result = service.confirm({
      title: "Finish claim",
      message: "Finish this claim? Damage changes will no longer be available.",
      confirmLabel: "Finish claim",
      cancelLabel: "Keep editing",
      variant: "default",
    });
    fixture.detectChanges();

    getButton("Finish claim").click();
    fixture.detectChanges();

    await expectAsync(result).toBeResolvedTo(true);
    expect(fixture.nativeElement.textContent).not.toContain("Finish claim");
  });

  function getButton(label: string): HTMLButtonElement {
    const buttons = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll("button"),
    );
    const button = buttons.find(
      (candidate): candidate is HTMLButtonElement =>
        candidate instanceof HTMLButtonElement &&
        candidate.textContent?.trim() === label,
    );

    if (!button) {
      throw new Error(`Button not found: ${label}`);
    }

    return button;
  }
});
