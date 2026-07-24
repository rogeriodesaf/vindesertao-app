import { Component, computed, inject, signal } from '@angular/core';
import { AuthService } from '../core/auth.service';

interface MissionaryLesson {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  youtubeId: string;
}

const MISSIONARY_LESSONS: readonly MissionaryLesson[] = [
  {
    id: 1,
    title: 'A Realidade do Pecado',
    description: 'Entenda a condição espiritual do ser humano diante de Deus.',
    videoUrl: 'https://www.youtube.com/watch?v=f_beaxX24Bk',
    youtubeId: 'f_beaxX24Bk'
  },
  {
    id: 2,
    title: 'Todos Pecaram e Carecem da Glória de Deus',
    description: 'Compreenda por que toda a humanidade necessita da salvação.',
    videoUrl: 'https://www.youtube.com/watch?v=S41to9FMrVM',
    youtubeId: 'S41to9FMrVM'
  },
  {
    id: 3,
    title: 'Arrependimento e Fé',
    description: 'Conheça a resposta bíblica ao chamado do Evangelho.',
    videoUrl: 'https://www.youtube.com/watch?v=qf2MJGiT5dk',
    youtubeId: 'qf2MJGiT5dk'
  },
  {
    id: 4,
    title: 'O que é o Evangelho?',
    description: 'Aprenda a essência da mensagem que transforma vidas.',
    videoUrl: 'https://www.youtube.com/watch?v=uAkNCohxO3Q',
    youtubeId: 'uAkNCohxO3Q'
  },
  {
    id: 5,
    title: 'A Parte Mais Doce das Boas Novas',
    description: 'Descubra a esperança e a graça oferecidas em Cristo.',
    videoUrl: 'https://www.youtube.com/watch?v=E1099q8wGmI',
    youtubeId: 'E1099q8wGmI'
  },
  {
    id: 6,
    title: 'Missão Cristã: Pregue a Palavra',
    description: 'Entenda a responsabilidade e o privilégio de anunciar o Evangelho.',
    videoUrl: 'https://www.youtube.com/watch?v=rX4X2ifKMWA',
    youtubeId: 'rX4X2ifKMWA'
  }
];

@Component({
  selector: 'app-missionary-training',
  standalone: true,
  template: `
    <section class="page training-page">
      <header class="page-head training-head">
        <div>
          <span class="eyebrow">Formação para o campo</span>
          <h1>Treinamento Missionário</h1>
          <p class="muted">Avance pelas aulas na sequência e prepare-se para anunciar o Evangelho.</p>
        </div>
        <button type="button" class="continue-button" [disabled]="!currentLesson()" (click)="continueTraining()">
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"></path></svg>
          {{ currentLesson() ? 'Continuar treinamento' : 'Treinamento concluído' }}
        </button>
      </header>

      <section class="detail-card progress-card" aria-label="Progresso do treinamento">
        <div class="progress-copy">
          <div>
            <strong>{{ progressPercentage() }}%</strong>
            <span>{{ completedCount() }} de {{ lessons.length }} aulas concluídas</span>
          </div>
          <span>{{ progressMessage() }}</span>
        </div>
        <div class="progress-track" role="progressbar" aria-label="Progresso" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="progressPercentage()">
          <span [style.width.%]="progressPercentage()"></span>
        </div>
      </section>

      <section class="training-timeline" aria-label="Trilha de aulas">
        @for (lesson of lessons; track lesson.id) {
          <article class="lesson-step" [class.current]="isCurrent(lesson)" [class.completed]="isCompleted(lesson.id)">
            <div class="timeline-marker" aria-hidden="true">
              @if (isCompleted(lesson.id)) {
                <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>
              } @else {
                <span>{{ lesson.id }}</span>
              }
            </div>

            <div class="lesson-card">
              <a class="lesson-thumbnail" [href]="lesson.videoUrl" target="_blank" rel="noopener noreferrer"
                (click)="setLastWatched(lesson.id)" [attr.aria-label]="'Assistir à aula ' + lesson.id + ': ' + lesson.title">
                <img [src]="thumbnailUrl(lesson)" [alt]="'Thumbnail da aula ' + lesson.id + ': ' + lesson.title" loading="lazy">
                <span class="play-badge" aria-hidden="true">
                  <svg viewBox="0 0 24 24"><path d="m9 7 8 5-8 5V7Z"></path></svg>
                </span>
              </a>

              <div class="lesson-content">
                <div class="lesson-heading">
                  <div>
                    <span class="lesson-number">Aula {{ lesson.id }}</span>
                    <h2>{{ lesson.title }}</h2>
                  </div>
                  <span class="lesson-status">{{ isCompleted(lesson.id) ? 'Concluída' : isCurrent(lesson) ? 'Aula atual' : 'Pendente' }}</span>
                </div>
                <p>{{ lesson.description }}</p>
                <div class="lesson-actions">
                  <a class="button watch-button" [href]="lesson.videoUrl" target="_blank" rel="noopener noreferrer"
                    (click)="setLastWatched(lesson.id)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m8 5 11 7-11 7V5Z"></path></svg>
                    Assistir
                  </a>
                  <button type="button" class="secondary completion-button" [class.marked]="isCompleted(lesson.id)"
                    (click)="toggleCompleted(lesson.id)">
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>
                    {{ isCompleted(lesson.id) ? 'Concluída' : 'Marcar como concluída' }}
                  </button>
                </div>
                <a class="video-link" [href]="lesson.videoUrl" target="_blank" rel="noopener noreferrer" (click)="setLastWatched(lesson.id)">
                  {{ lesson.videoUrl }}
                </a>
              </div>
            </div>
          </article>
        }
      </section>
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .training-page { width: min(1080px, 100%); margin: 0 auto; padding-bottom: 40px; }
    .training-head { align-items: end; }
    .training-head > div { min-width: 0; display: grid; gap: 6px; }
    .training-head p { max-width: 670px; margin: 0; line-height: 1.55; }
    .eyebrow, .lesson-number {
      color: var(--color-accent);
      font-size: 12px;
      font-weight: 850;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    .continue-button, .watch-button, .completion-button { gap: 8px; font-weight: 750; }
    .continue-button { min-height: 46px; white-space: nowrap; }
    button:disabled { cursor: default; opacity: .7; }
    svg {
      width: 19px;
      height: 19px;
      flex: 0 0 auto;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .progress-card {
      gap: 12px;
      border-left: 5px solid var(--color-accent);
      background: linear-gradient(115deg, color-mix(in srgb, var(--color-primary) 9%, transparent), transparent 55%), var(--panel);
    }
    .progress-copy, .progress-copy > div { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
    .progress-copy > div { justify-content: flex-start; }
    .progress-copy strong { color: var(--color-primary-readable); font-size: 28px; }
    .progress-copy span { color: var(--muted); font-size: 13px; }
    .progress-track { height: 10px; overflow: hidden; border-radius: 999px; background: var(--color-hover); }
    .progress-track span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
      transition: width 220ms ease;
    }
    .training-timeline { position: relative; display: grid; gap: 18px; }
    .training-timeline::before {
      content: '';
      position: absolute;
      top: 28px;
      bottom: 28px;
      left: 23px;
      width: 2px;
      background: var(--line);
    }
    .lesson-step {
      position: relative;
      display: grid;
      grid-template-columns: 48px minmax(0, 1fr);
      gap: 16px;
      align-items: start;
      min-width: 0;
    }
    .timeline-marker {
      z-index: 1;
      width: 48px;
      height: 48px;
      display: grid;
      place-items: center;
      border: 2px solid var(--line);
      border-radius: 999px;
      background: var(--color-surface);
      color: var(--muted);
      font-weight: 850;
      box-shadow: 0 0 0 6px var(--color-background);
    }
    .timeline-marker svg { width: 22px; height: 22px; }
    .lesson-step.current .timeline-marker {
      border-color: var(--color-accent);
      background: var(--color-warning-surface);
      color: var(--color-warning);
    }
    .lesson-step.completed .timeline-marker { border-color: var(--color-success); background: var(--color-success); color: #fff; }
    .lesson-card {
      min-width: 0;
      display: grid;
      grid-template-columns: minmax(220px, 34%) minmax(0, 1fr);
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 12px;
      background: var(--panel);
      box-shadow: 0 8px 24px color-mix(in srgb, var(--color-background) 55%, transparent);
      transition: border-color 160ms ease, box-shadow 160ms ease, transform 160ms ease;
    }
    .lesson-step.current .lesson-card {
      border-color: var(--color-accent);
      box-shadow: 0 12px 30px color-mix(in srgb, var(--color-accent) 18%, transparent);
      transform: translateY(-1px);
    }
    .lesson-step.completed .lesson-card { border-color: color-mix(in srgb, var(--color-success) 55%, var(--line)); }
    .lesson-thumbnail { position: relative; min-height: 190px; overflow: hidden; background: var(--color-hover); }
    .lesson-thumbnail img {
      width: 100%;
      height: 100%;
      display: block;
      object-fit: cover;
      transition: transform 180ms ease;
    }
    .lesson-thumbnail:hover img { transform: scale(1.035); }
    .lesson-thumbnail::after {
      content: '';
      position: absolute;
      inset: 0;
      background: linear-gradient(180deg, transparent 40%, rgba(17, 24, 39, .42));
    }
    .play-badge {
      position: absolute;
      z-index: 1;
      left: 50%;
      top: 50%;
      width: 50px;
      height: 50px;
      display: grid;
      place-items: center;
      border: 2px solid rgba(255, 255, 255, .88);
      border-radius: 999px;
      background: rgba(22, 58, 70, .88);
      color: #fff;
      box-shadow: 0 8px 24px rgba(17, 24, 39, .3);
      transform: translate(-50%, -50%);
    }
    .play-badge svg, .watch-button svg { margin-left: 2px; fill: currentColor; stroke: none; }
    .lesson-content { min-width: 0; display: grid; align-content: center; gap: 12px; padding: 18px; }
    .lesson-heading { min-width: 0; display: flex; align-items: start; justify-content: space-between; gap: 12px; }
    .lesson-heading > div { min-width: 0; display: grid; gap: 4px; }
    .lesson-heading h2 { font-size: 19px; line-height: 1.28; }
    .lesson-status {
      flex: 0 0 auto;
      padding: 5px 9px;
      border: 1px solid var(--line);
      border-radius: 999px;
      background: var(--color-hover);
      color: var(--muted);
      font-size: 11px;
      font-weight: 800;
    }
    .current .lesson-status {
      border-color: color-mix(in srgb, var(--color-accent) 50%, var(--line));
      background: var(--color-warning-surface);
      color: var(--color-warning);
    }
    .completed .lesson-status {
      border-color: color-mix(in srgb, var(--color-success) 50%, var(--line));
      background: var(--color-success-surface);
      color: var(--color-success);
    }
    .lesson-content p { margin: 0; color: var(--muted); line-height: 1.5; }
    .lesson-actions { display: flex; gap: 9px; flex-wrap: wrap; }
    .watch-button { min-height: 40px; }
    .completion-button.marked {
      border-color: color-mix(in srgb, var(--color-success) 55%, var(--line));
      background: var(--color-success-surface);
      color: var(--color-success);
    }
    .video-link {
      min-width: 0;
      overflow: hidden;
      color: var(--color-primary-readable);
      font-size: 12px;
      text-decoration: underline;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    @media (max-width: 760px) {
      .training-head { align-items: stretch; flex-direction: column; }
      .continue-button { align-self: stretch; }
      .lesson-card { grid-template-columns: 1fr; }
      .lesson-thumbnail { min-height: 0; aspect-ratio: 16 / 9; }
    }
    @media (max-width: 520px) {
      .training-page { gap: 15px; padding: 16px 12px 34px; }
      .progress-copy { align-items: start; flex-direction: column; }
      .training-timeline { gap: 14px; }
      .training-timeline::before { left: 17px; }
      .lesson-step { grid-template-columns: 36px minmax(0, 1fr); gap: 10px; }
      .timeline-marker {
        width: 36px;
        height: 36px;
        box-shadow: 0 0 0 4px var(--color-background);
        font-size: 12px;
      }
      .timeline-marker svg { width: 18px; height: 18px; }
      .lesson-content { gap: 10px; padding: 14px; }
      .lesson-heading { display: grid; }
      .lesson-status { width: max-content; }
      .lesson-actions { display: grid; grid-template-columns: 1fr; }
      .lesson-actions .button, .lesson-actions button { width: 100%; }
    }
    @media (prefers-reduced-motion: reduce) {
      .progress-track span, .lesson-card, .lesson-thumbnail img { transition: none; }
    }
  `]
})
export class MissionaryTrainingComponent {
  private readonly auth = inject(AuthService);
  readonly lessons = MISSIONARY_LESSONS;
  readonly completedLessonIds = signal<number[]>(this.readProgress());
  readonly completedCount = computed(() => this.completedLessonIds().length);
  readonly progressPercentage = computed(() => Math.round((this.completedCount() / this.lessons.length) * 100));
  readonly currentLesson = computed(() => this.lessons.find((lesson) => !this.isCompleted(lesson.id)) ?? null);
  readonly progressMessage = computed(() => {
    if (this.completedCount() === this.lessons.length) {
      return 'Trilha concluída. Você está pronto para revisar as aulas quando quiser.';
    }
    if (this.completedCount() === 0) {
      return 'Comece pela primeira aula e avance no seu ritmo.';
    }
    return 'Continue avançando: sua próxima aula já está destacada.';
  });

  isCompleted(lessonId: number): boolean {
    return this.completedLessonIds().includes(lessonId);
  }

  isCurrent(lesson: MissionaryLesson): boolean {
    return this.currentLesson()?.id === lesson.id;
  }

  thumbnailUrl(lesson: MissionaryLesson): string {
    return `https://img.youtube.com/vi/${lesson.youtubeId}/hqdefault.jpg`;
  }

  continueTraining(): void {
    const lesson = this.currentLesson();
    if (lesson) {
      this.openLesson(lesson);
    }
  }

  setLastWatched(lessonId: number): void {
    localStorage.setItem(`${this.storageKey()}.lastWatched`, String(lessonId));
  }

  toggleCompleted(lessonId: number): void {
    const completed = new Set(this.completedLessonIds());
    if (completed.has(lessonId)) {
      completed.delete(lessonId);
    } else {
      completed.add(lessonId);
    }
    const nextProgress = this.lessons.map((lesson) => lesson.id).filter((id) => completed.has(id));
    this.completedLessonIds.set(nextProgress);
    localStorage.setItem(this.storageKey(), JSON.stringify(nextProgress));
  }

  private openLesson(lesson: MissionaryLesson): void {
    this.setLastWatched(lesson.id);
    window.open(lesson.videoUrl, '_blank', 'noopener,noreferrer');
  }

  private readProgress(): number[] {
    try {
      const stored = JSON.parse(localStorage.getItem(this.storageKey()) || '[]');
      if (!Array.isArray(stored)) {
        return [];
      }
      const validIds = new Set(this.lessons.map((lesson) => lesson.id));
      return stored.filter((id): id is number => typeof id === 'number' && validIds.has(id));
    } catch {
      return [];
    }
  }

  private storageKey(): string {
    return `vinde.missionaryTraining.completed.${this.auth.user()?.id ?? 'anonymous'}`;
  }
}
