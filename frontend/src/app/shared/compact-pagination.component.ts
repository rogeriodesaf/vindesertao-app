import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-compact-pagination',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (totalPages > 1) {
      <nav class="compact-pagination" aria-label="Paginação">
        <button type="button" class="secondary" [disabled]="pageIndex <= 0" aria-label="Página anterior" title="Página anterior" (click)="previous.emit()">‹</button>
        <strong>{{ pageIndex + 1 }} / {{ totalPages }}</strong>
        <button type="button" class="secondary" [disabled]="pageIndex + 1 >= totalPages" aria-label="Próxima página" title="Próxima página" (click)="next.emit()">›</button>
      </nav>
    }
  `
})
export class CompactPaginationComponent {
  @Input() pageIndex = 0;
  @Input() totalPages = 1;
  @Output() previous = new EventEmitter<void>();
  @Output() next = new EventEmitter<void>();
}
