import { ChangeDetectionStrategy, Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `<div class="list-empty-state" role="status"><span aria-hidden="true">⌕</span><strong>{{ message }}</strong></div>`
})
export class EmptyStateComponent { @Input() message = 'Nenhum registro encontrado.'; }
