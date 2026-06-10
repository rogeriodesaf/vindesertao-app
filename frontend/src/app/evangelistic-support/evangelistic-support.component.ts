import { Component, computed, signal } from '@angular/core';
import { reformedKnowledgeBase } from './reformed-knowledge-base';

@Component({
  selector: 'app-evangelistic-support',
  standalone: true,
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Apoio Evangelístico</h1>
          <p class="muted">Consulte perguntas e respostas simples baseadas em uma base reformada aprovada para uso em campo.</p>
        </div>
      </div>

      <section class="support-warning">
        <strong>Importante</strong>
        <span>Este recurso é apoio inicial para conversas evangelísticas. Ele não substitui a Bíblia, a liderança pastoral ou o acompanhamento de casos sensíveis.</span>
      </section>

      <section class="detail-card support-library">
        <h2>Perguntas frequentes</h2>
        <div class="category-filter">
          <button type="button" class="secondary" [class.selected-chip]="selectedCategory() === ''" (click)="selectCategory('')">Todas</button>
          @for (category of categories(); track category) {
            <button type="button" class="secondary" [class.selected-chip]="selectedCategory() === category" (click)="selectCategory(category)">{{ category }}</button>
          }
        </div>

        @for (item of filteredLibrary(); track item.id) {
          <article class="support-answer">
            <span>{{ item.category }}</span>
            <h2>{{ item.question }}</h2>
            <p>{{ item.answer }}</p>
            <div>
              <strong>Referências</strong>
              <small>{{ item.references.join(' | ') }}</small>
            </div>
            @if (item.pastoralNote) {
              <div class="pastoral-note">
                <strong>Cuidado pastoral</strong>
                <small>{{ item.pastoralNote }}</small>
              </div>
            }
          </article>
        }
      </section>
    </section>
  `
})
export class EvangelisticSupportComponent {
  selectedCategory = signal('');

  categories = computed(() => Array.from(new Set(reformedKnowledgeBase.map((item) => item.category))).sort());

  filteredLibrary = computed(() => {
    const category = this.selectedCategory();
    return category ? reformedKnowledgeBase.filter((item) => item.category === category) : reformedKnowledgeBase;
  });

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }
}
