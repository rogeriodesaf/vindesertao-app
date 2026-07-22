import { ApplicationRef, Injectable, OnDestroy, inject, signal } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { filter, first } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class AtualizacaoAppService implements OnDestroy {
  private readonly appRef = inject(ApplicationRef);
  private readonly swUpdate = inject(SwUpdate);
  private readonly intervaloChecagemMs = 15 * 60 * 1000;
  private intervalo: number | null = null;

  readonly novaVersaoDisponivel = signal(false);
  readonly atualizando = signal(false);

  constructor() {
    if (!this.swUpdate.isEnabled) return;

    this.swUpdate.versionUpdates
      .pipe(filter((evento): evento is VersionReadyEvent => evento.type === 'VERSION_READY'))
      .subscribe(() => this.novaVersaoDisponivel.set(true));

    this.swUpdate.unrecoverable.subscribe(() => window.location.reload());

    this.appRef.isStable.pipe(
      filter(estavel => estavel),
      first()
    ).subscribe(() => {
      this.checarAtualizacao();
      this.intervalo = window.setInterval(() => this.checarAtualizacao(), this.intervaloChecagemMs);
    });

    window.addEventListener('focus', this.checarAoReabrir);
    window.addEventListener('online', this.checarAoReabrir);
    document.addEventListener('visibilitychange', this.checarQuandoVisivel);
  }

  ngOnDestroy(): void {
    if (this.intervalo !== null) window.clearInterval(this.intervalo);
    window.removeEventListener('focus', this.checarAoReabrir);
    window.removeEventListener('online', this.checarAoReabrir);
    document.removeEventListener('visibilitychange', this.checarQuandoVisivel);
  }

  atualizarAgora(): void {
    if (!this.swUpdate.isEnabled || this.atualizando()) return;
    this.atualizando.set(true);
    window.location.reload();
  }

  private readonly checarAoReabrir = () => this.checarAtualizacao();

  private readonly checarQuandoVisivel = () => {
    if (document.visibilityState === 'visible') this.checarAtualizacao();
  };

  private checarAtualizacao(): void {
    if (this.swUpdate.isEnabled) this.swUpdate.checkForUpdate().catch(() => undefined);
  }
}
