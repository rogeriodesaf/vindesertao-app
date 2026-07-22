import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-form-section',
  standalone: true,
  template: `
    <section class="form-section" [class.form-section-open]="open" [class.form-section-error]="error">
      <button type="button" class="form-section-header" [attr.aria-expanded]="open" [attr.aria-controls]="sectionId" (click)="toggle.emit()">
        <span class="form-section-icon" [attr.data-tone]="tone" aria-hidden="true">
          @switch (icon) {
            @case ('person') { <svg viewBox="0 0 24 24"><path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8c0-3.3 3.1-6 7-6s7 2.7 7 6"></path></svg> }
            @case ('location') { <svg viewBox="0 0 24 24"><path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z"></path><circle cx="12" cy="10" r="2.5"></circle></svg> }
            @case ('photo') { <svg viewBox="0 0 24 24"><path d="M4 7h3l1.5-2h7L17 7h3v12H4V7Z"></path><circle cx="12" cy="13" r="3.5"></circle></svg> }
            @case ('info') { <svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9"></circle><path d="M12 11v6m0-10h.01"></path></svg> }
            @case ('groups') { <svg viewBox="0 0 24 24"><circle cx="9" cy="8" r="3"></circle><circle cx="17" cy="9" r="2"></circle><path d="M3 20c0-4 2.7-7 6-7s6 3 6 7m0-6c3 0 5 2.4 5 5"></path></svg> }
          }
        </span>
        <span class="form-section-heading"><strong>{{ title }}</strong><small>{{ subtitle }}</small></span>
        @if (badge) { <span class="form-section-badge">{{ badge }}</span> }
        <svg class="form-section-chevron" viewBox="0 0 24 24" aria-hidden="true"><path d="m8 10 4 4 4-4"></path></svg>
      </button>
      <div class="form-section-collapse" [class.open]="open">
        <div class="form-section-content" [id]="sectionId"><ng-content /></div>
      </div>
    </section>
  `
})
export class FormSectionComponent {
  @Input({ required: true }) title = '';
  @Input() subtitle = '';
  @Input() icon: 'person' | 'location' | 'photo' | 'info' | 'groups' = 'info';
  @Input() tone: 'cyan' | 'green' | 'purple' | 'orange' | 'blue' = 'cyan';
  @Input() sectionId = '';
  @Input() badge = '';
  @Input() open = false;
  @Input() error = false;
  @Output() toggle = new EventEmitter<void>();
}
