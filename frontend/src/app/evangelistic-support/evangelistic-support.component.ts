import { Component, computed, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { reformedKnowledgeBase, ReformedAnswer } from './reformed-knowledge-base';

@Component({
  selector: 'app-evangelistic-support',
  standalone: true,
  imports: [FormsModule],
  template: `
    <section class="page">
      <div class="page-head">
        <div>
          <h1>Apoio Evangelístico</h1>
          <p class="muted">Busque orientações simples baseadas em uma base reformada aprovada para uso em campo.</p>
        </div>
      </div>

      <section class="support-warning">
        <strong>Importante</strong>
        <span>Este recurso é apoio inicial para conversas evangelísticas. Ele não substitui a Bíblia, a liderança pastoral ou o acompanhamento de casos sensíveis.</span>
      </section>

      <div class="support-layout">
        <section class="support-chat">
          <h2>Tire uma dúvida</h2>
          <label>Digite sua pergunta
            <textarea [(ngModel)]="question" placeholder="Ex.: Como explicar salvação pela graça?"></textarea>
          </label>
          <div class="actions">
            <button type="button" (click)="search()">Buscar resposta</button>
            <button type="button" class="secondary" (click)="clear()">Limpar</button>
          </div>

          @if (searched() && results().length === 0) {
            <div class="support-empty">
              <h2>Não encontrei uma resposta aprovada para essa dúvida.</h2>
              <p class="muted">Encaminhe esta pergunta ao líder da equipe ou à liderança pastoral antes de responder em nome do projeto.</p>
            </div>
          }

          @for (answer of results(); track answer.id) {
            <article class="support-answer">
              <span>{{ answer.category }}</span>
              <h2>{{ answer.question }}</h2>
              <p>{{ answer.answer }}</p>
              <div>
                <strong>Referências</strong>
                <small>{{ answer.references.join(' | ') }}</small>
              </div>
              @if (answer.pastoralNote) {
                <div class="pastoral-note">
                  <strong>Cuidado pastoral</strong>
                  <small>{{ answer.pastoralNote }}</small>
                </div>
              }
            </article>
          }
        </section>

        <aside class="detail-card support-library">
          <h2>Perguntas frequentes</h2>
          <div class="category-filter">
            <button type="button" class="secondary" [class.selected-chip]="selectedCategory() === ''" (click)="selectCategory('')">Todas</button>
            @for (category of categories(); track category) {
              <button type="button" class="secondary" [class.selected-chip]="selectedCategory() === category" (click)="selectCategory(category)">{{ category }}</button>
            }
          </div>

          @for (item of filteredLibrary(); track item.id) {
            <button type="button" class="visit-row" (click)="useQuestion(item)">
              <strong>{{ item.question }}</strong>
              <span>{{ item.category }}</span>
            </button>
          }
        </aside>
      </div>
    </section>
  `
})
export class EvangelisticSupportComponent {
  question = '';
  searched = signal(false);
  selectedCategory = signal('');
  results = signal<ReformedAnswer[]>([]);

  categories = computed(() => Array.from(new Set(reformedKnowledgeBase.map((item) => item.category))).sort());

  filteredLibrary = computed(() => {
    const category = this.selectedCategory();
    return category ? reformedKnowledgeBase.filter((item) => item.category === category) : reformedKnowledgeBase;
  });

  search(): void {
    const terms = this.normalize(this.question).split(' ').filter((term) => term.length >= 3);
    this.searched.set(true);
    if (!terms.length) {
      this.results.set([]);
      return;
    }

    const ranked = reformedKnowledgeBase
      .map((item) => ({ item, score: this.score(item, terms) }))
      .filter((entry) => entry.score > 0)
      .sort((left, right) => right.score - left.score)
      .slice(0, 3)
      .map((entry) => entry.item);

    this.results.set(ranked);
  }

  clear(): void {
    this.question = '';
    this.searched.set(false);
    this.results.set([]);
  }

  selectCategory(category: string): void {
    this.selectedCategory.set(category);
  }

  useQuestion(answer: ReformedAnswer): void {
    this.question = answer.question;
    this.searched.set(true);
    this.results.set([answer]);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  private score(answer: ReformedAnswer, terms: string[]): number {
    const haystack = this.normalize([
      answer.category,
      answer.question,
      answer.answer,
      answer.references.join(' '),
      answer.keywords.join(' ')
    ].join(' '));
    return terms.reduce((total, term) => total + (haystack.includes(term) ? 1 : 0), 0);
  }

  private normalize(value: string): string {
    return value
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }
}
