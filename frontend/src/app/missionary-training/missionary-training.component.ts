import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { AuthService } from '../core/auth.service';

interface MissionaryLesson {
  id: number;
  title: string;
  description: string;
  videoUrl: string;
  youtubeId: string;
}

// Fonte estática isolada para permitir a futura substituição por dados da API.
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
          <p class="muted">Assista às aulas sem sair do aplicativo e avance pela trilha no seu ritmo.</p>
        </div>
        <div class="progress-summary" aria-label="Progresso do treinamento">
          <strong>{{ progressPercentage() }}%</strong>
          <span>{{ completedCount() }} de {{ lessons.length }} concluídas</span>
        </div>
      </header>

      <section class="player-card" aria-labelledby="selected-lesson-title">
        <div class="video-frame">
          <iframe
            [src]="embedUrl()"
            [title]="'Aula ' + selectedLesson().id + ': ' + selectedLesson().title"
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerpolicy="strict-origin-when-cross-origin"
            allowfullscreen
          ></iframe>
        </div>

        <div class="selected-lesson-content">
          <div class="lesson-heading">
            <div>
              <span class="lesson-number">Aula {{ selectedLesson().id }}</span>
              <h2 id="selected-lesson-title">{{ selectedLesson().title }}</h2>
            </div>
            <span class="lesson-status" [class.completed]="isCompleted(selectedLesson().id)">
              {{ isCompleted(selectedLesson().id) ? 'Concluída' : 'Em andamento' }}
            </span>
          </div>
          <p>{{ selectedLesson().description }}</p>
          <button
            type="button"
            class="completion-button"
            [class.completed]="isCompleted(selectedLesson().id)"
            (click)="toggleCompleted(selectedLesson().id)"
          >
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m5 12 4 4L19 6"></path></svg>
            {{ isCompleted(selectedLesson().id) ? 'Aula concluída' : 'Marcar como concluída' }}
          </button>
        </div>
      </section>

      <section class="progress-card" aria-label="Percentual concluído">
        <div class="progress-track" role="progressbar" aria-label="Progresso" aria-valuemin="0" aria-valuemax="100" [attr.aria-valuenow]="progressPercentage()">
          <span [style.width.%]="progressPercentage()"></span>
        </div>
        <span>{{ progressMessage() }}</span>
      </section>

      <section class="lesson-list-section" aria-labelledby="lesson-list-title">
        <div class="list-heading">
          <div>
            <span class="eyebrow">Sequência de estudos</span>
            <h2 id="lesson-list-title">Todas as aulas</h2>
          </div>
          @if (nextIncompleteLesson(); as nextLesson) {
            <button type="button" class="secondary next-button" (click)="selectLesson(nextLesson)">
              Ir para a próxima pendente
            </button>
          }
        </div>

        <div class="lesson-list">
          @for (lesson of lessons; track lesson.id) {
            <button
              type="button"
              class="lesson-item"
              [class.selected]="selectedLesson().id === lesson.id"
              [class.completed]="isCompleted(lesson.id)"
              [attr.aria-current]="selectedLesson().id === lesson.id ? 'true' : null"
              (click)="selectLesson(lesson)"
            >
              <span class="sequence-marker" aria-hidden="true">
                @if (isCompleted(lesson.id)) {
                  <svg viewBox="0 0 24 24"><path d="m5 12 4 4L19 6"></path></svg>
                } @else {
                  {{ lesson.id }}
                }
              </span>
              <img [src]="thumbnailUrl(lesson)" alt="" loading="lazy">
              <span class="lesson-copy">
                <small>Aula {{ lesson.id }}</small>
                <strong>{{ lesson.title }}</strong>
                <span>{{ lesson.description }}</span>
              </span>
              <span class="item-state">
                {{ isCompleted(lesson.id) ? 'Concluída' : selectedLesson().id === lesson.id ? 'Reproduzindo' : 'Assistir' }}
              </span>
            </button>
          }
        </div>
      </section>
    </section>
  `,
  styles: [`
    :host { display: block; min-width: 0; }
    .training-page { width: min(1040px, 100%); margin: 0 auto; padding-bottom: 42px; }
    .training-head { align-items: end; }
    .training-head > div:first-child { min-width: 0; display: grid; gap: 6px; }
    .training-head p { max-width: 680px; margin: 0; line-height: 1.55; }
    .eyebrow, .lesson-number {
      color: var(--color-accent);
      font-size: 12px;
      font-weight: 850;
      letter-spacing: .08em;
      text-transform: uppercase;
    }
    svg {
      width: 20px;
      height: 20px;
      flex: 0 0 auto;
      fill: none;
      stroke: currentColor;
      stroke-width: 2;
      stroke-linecap: round;
      stroke-linejoin: round;
    }
    .progress-summary {
      flex: 0 0 auto;
      display: grid;
      justify-items: end;
      gap: 2px;
      padding: 10px 14px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--panel);
    }
    .progress-summary strong { color: var(--color-primary-readable); font-size: 25px; line-height: 1; }
    .progress-summary span { color: var(--muted); font-size: 12px; }
    .player-card {
      min-width: 0;
      overflow: hidden;
      border: 1px solid var(--line);
      border-radius: 14px;
      background: var(--panel);
      box-shadow: var(--shadow);
    }
    .video-frame { width: 100%; aspect-ratio: 16 / 9; background: #0b1115; }
    .video-frame iframe { width: 100%; height: 100%; display: block; border: 0; }
    .selected-lesson-content { display: grid; gap: 13px; padding: 20px; }
    .lesson-heading { min-width: 0; display: flex; align-items: start; justify-content: space-between; gap: 14px; }
    .lesson-heading > div { min-width: 0; display: grid; gap: 4px; }
    .lesson-heading h2 { font-size: 22px; line-height: 1.28; }
    .selected-lesson-content p { margin: 0; color: var(--muted); line-height: 1.55; }
    .lesson-status, .item-state {
      flex: 0 0 auto;
      padding: 5px 9px;
      border: 1px solid color-mix(in srgb, var(--color-accent) 45%, var(--line));
      border-radius: 999px;
      background: var(--color-warning-surface);
      color: var(--color-warning);
      font-size: 11px;
      font-weight: 800;
    }
    .lesson-status.completed {
      border-color: color-mix(in srgb, var(--color-success) 48%, var(--line));
      background: var(--color-success-surface);
      color: var(--color-success);
    }
    .completion-button { width: max-content; min-height: 44px; gap: 8px; font-weight: 780; }
    .completion-button.completed {
      border: 1px solid color-mix(in srgb, var(--color-success) 55%, var(--line));
      background: var(--color-success-surface);
      color: var(--color-success);
    }
    .progress-card { display: grid; grid-template-columns: minmax(0, 1fr) auto; align-items: center; gap: 14px; }
    .progress-card > span { color: var(--muted); font-size: 13px; }
    .progress-track { height: 10px; overflow: hidden; border-radius: 999px; background: var(--color-hover); }
    .progress-track span {
      display: block;
      height: 100%;
      border-radius: inherit;
      background: linear-gradient(90deg, var(--color-primary), var(--color-accent));
      transition: width 220ms ease;
    }
    .lesson-list-section { display: grid; gap: 12px; }
    .list-heading { display: flex; align-items: end; justify-content: space-between; gap: 12px; }
    .list-heading > div { display: grid; gap: 4px; }
    .next-button { min-height: 38px; font-weight: 700; }
    .lesson-list { display: grid; gap: 9px; }
    .lesson-item {
      width: 100%;
      min-width: 0;
      min-height: 96px;
      display: grid;
      grid-template-columns: 38px 126px minmax(0, 1fr) auto;
      align-items: center;
      gap: 13px;
      padding: 10px;
      border: 1px solid var(--line);
      border-radius: 10px;
      background: var(--panel);
      color: var(--text);
      text-align: left;
      box-shadow: none;
    }
    .lesson-item:hover { border-color: var(--color-primary); background: var(--color-hover); }
    .lesson-item.selected {
      border-color: var(--color-accent);
      background: color-mix(in srgb, var(--color-warning-surface) 64%, var(--panel));
      box-shadow: 0 8px 20px color-mix(in srgb, var(--color-accent) 14%, transparent);
    }
    .lesson-item.completed { border-left: 4px solid var(--color-success); }
    .sequence-marker {
      width: 34px;
      height: 34px;
      display: grid;
      place-items: center;
      border: 2px solid var(--line);
      border-radius: 999px;
      color: var(--muted);
      font-size: 12px;
      font-weight: 850;
    }
    .completed .sequence-marker { border-color: var(--color-success); background: var(--color-success); color: #fff; }
    .sequence-marker svg { width: 18px; height: 18px; }
    .lesson-item img { width: 126px; aspect-ratio: 16 / 9; display: block; object-fit: cover; border-radius: 7px; }
    .lesson-copy { min-width: 0; display: grid; gap: 3px; }
    .lesson-copy small { color: var(--color-accent); font-size: 11px; font-weight: 850; text-transform: uppercase; }
    .lesson-copy strong { overflow: hidden; color: var(--text); font-size: 15px; text-overflow: ellipsis; white-space: nowrap; }
    .lesson-copy > span { overflow: hidden; color: var(--muted); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
    .lesson-item.completed .item-state {
      border-color: color-mix(in srgb, var(--color-success) 48%, var(--line));
      background: var(--color-success-surface);
      color: var(--color-success);
    }
    @media (max-width: 700px) {
      .training-head { align-items: stretch; }
      .progress-summary { justify-items: start; }
      .progress-card { grid-template-columns: 1fr; }
      .lesson-item { grid-template-columns: 34px 94px minmax(0, 1fr); }
      .lesson-item img { width: 94px; }
      .item-state { grid-column: 3; width: max-content; }
    }
    @media (max-width: 520px) {
      .training-page { gap: 15px; padding: 16px 12px 34px; }
      .selected-lesson-content { gap: 11px; padding: 15px; }
      .lesson-heading { display: grid; }
      .lesson-status { width: max-content; }
      .completion-button { width: 100%; }
      .list-heading { align-items: stretch; flex-direction: column; }
      .next-button { width: 100%; }
      .lesson-item { min-height: 88px; grid-template-columns: 30px 78px minmax(0, 1fr); gap: 9px; padding: 8px; }
      .sequence-marker { width: 30px; height: 30px; }
      .lesson-item img { width: 78px; }
      .lesson-copy > span { display: none; }
      .lesson-copy strong { white-space: normal; }
      .item-state { grid-column: 3; padding: 3px 7px; }
    }
    @media (prefers-reduced-motion: reduce) {
      .progress-track span { transition: none; }
    }
  `]
})
export class MissionaryTrainingComponent {
  private readonly auth = inject(AuthService);
  private readonly sanitizer = inject(DomSanitizer);
  readonly lessons = MISSIONARY_LESSONS;
  readonly completedLessonIds = signal<number[]>(this.readProgress());
  readonly selectedLessonId = signal(this.readInitialLessonId());

  readonly completedCount = computed(() => this.completedLessonIds().length);
  readonly progressPercentage = computed(() => Math.round((this.completedCount() / this.lessons.length) * 100));
  readonly selectedLesson = computed(() =>
    this.lessons.find((lesson) => lesson.id === this.selectedLessonId()) ?? this.lessons[0]
  );
  readonly nextIncompleteLesson = computed(() =>
    this.lessons.find((lesson) => !this.isCompleted(lesson.id)) ?? null
  );
  readonly embedUrl = computed<SafeResourceUrl>(() =>
    this.sanitizer.bypassSecurityTrustResourceUrl(
      `https://www.youtube-nocookie.com/embed/${this.selectedLesson().youtubeId}?rel=0&modestbranding=1`
    )
  );
  readonly progressMessage = computed(() => {
    if (this.completedCount() === this.lessons.length) {
      return 'Trilha concluída. Você pode rever qualquer aula.';
    }
    return 'Seu progresso é salvo automaticamente neste dispositivo.';
  });

  isCompleted(lessonId: number): boolean {
    return this.completedLessonIds().includes(lessonId);
  }

  thumbnailUrl(lesson: MissionaryLesson): string {
    return `https://img.youtube.com/vi/${lesson.youtubeId}/mqdefault.jpg`;
  }

  selectLesson(lesson: MissionaryLesson): void {
    this.selectedLessonId.set(lesson.id);
    localStorage.setItem(this.lastWatchedStorageKey(), String(lesson.id));
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
    localStorage.setItem(this.progressStorageKey(), JSON.stringify(nextProgress));
  }

  private readProgress(): number[] {
    try {
      const stored = JSON.parse(localStorage.getItem(this.progressStorageKey()) || '[]');
      if (!Array.isArray(stored)) {
        return [];
      }
      const validIds = new Set(this.lessons.map((lesson) => lesson.id));
      return stored.filter((id): id is number => typeof id === 'number' && validIds.has(id));
    } catch {
      return [];
    }
  }

  private readInitialLessonId(): number {
    const storedId = Number(localStorage.getItem(this.lastWatchedStorageKey()));
    if (this.lessons.some((lesson) => lesson.id === storedId)) {
      return storedId;
    }
    return this.lessons.find((lesson) => !this.isCompleted(lesson.id))?.id ?? this.lessons[0].id;
  }

  private progressStorageKey(): string {
    return `vinde.missionaryTraining.completed.${this.auth.user()?.id ?? 'anonymous'}`;
  }

  private lastWatchedStorageKey(): string {
    return `${this.progressStorageKey()}.lastWatched`;
  }
}
