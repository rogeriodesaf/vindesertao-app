import { VisitsComponent } from './visits.component';

describe('VisitsComponent map lifecycle', () => {
  let component: VisitsComponent;

  beforeEach(() => {
    sessionStorage.clear();
    component = new (VisitsComponent as any)(
      {},
      {},
      {},
      { run: (callback: () => unknown) => callback() },
      {},
      {},
      {},
      {}
    );
  });

  it('desmonta o Leaflet e fecha overlays ao voltar para Cadastro no mobile', () => {
    const map = {
      off: jasmine.createSpy('off'),
      remove: jasmine.createSpy('remove')
    };
    (component as any).map = map;
    component.mobileViewport.set(true);
    component.mobileView.set('map');
    component.locationActionsOpen.set(true);
    component.visitDetails.set({ personName: 'Teste', city: 'Sertão', wantsVisits: true });
    component.photoViewer.set({ src: 'foto', alt: 'Foto', title: 'Teste' });

    component.showMobileView('form');

    expect(map.off).toHaveBeenCalled();
    expect(map.remove).toHaveBeenCalled();
    expect((component as any).map).toBeUndefined();
    expect(component.shouldMountMap()).toBeFalse();
    expect(component.locationActionsOpen()).toBeFalse();
    expect(component.visitDetails()).toBeNull();
    expect(component.photoViewer()).toBeNull();
  });

  it('destrói o Leaflet e reinicia referências ao encerrar o componente', () => {
    const map = {
      off: jasmine.createSpy('off'),
      remove: jasmine.createSpy('remove')
    };
    (component as any).map = map;
    (component as any).marker = {};
    (component as any).userLocationMarker = {};

    component.ngOnDestroy();

    expect(map.off).toHaveBeenCalled();
    expect(map.remove).toHaveBeenCalled();
    expect((component as any).map).toBeUndefined();
    expect((component as any).marker).toBeUndefined();
    expect((component as any).userLocationMarker).toBeUndefined();
  });

  it('oculta o badge e orienta a primeira sincronização quando o histórico não foi baixado', () => {
    component.visitHistoryState.set('not-downloaded');

    expect(component.visitHistoryBadge()).toBe('');
    expect(component.visitHistoryEmptyMessage()).toContain('sincronize uma vez');
  });

  it('exibe zero somente depois que uma fonte de dados foi carregada', () => {
    component.visits.set([]);
    component.visitHistoryState.set('cached');

    expect(component.visitHistoryBadge()).toBe('0 visita(s)');
    expect(component.visitHistoryEmptyMessage()).toBe('Nenhuma visita encontrada.');
  });

  it('usa o estado informativo sem erro quando API e cache estão indisponíveis', async () => {
    (component as any).offlineMapCache = {
      loadVisitsSnapshot: () => Promise.resolve({ items: [], available: false })
    };
    spyOn<any>(component, 'renderMarkers');

    (component as any).loadCachedVisits();
    await Promise.resolve();

    expect(component.visitHistoryState()).toBe('not-downloaded');
    expect(component.error()).toBe('');
  });

  it('inicia uma nova ficha em Rio Tinto e aplica a máscara de telefone', () => {
    expect((component as any).blankVisit().city).toBe('Rio Tinto');

    component.form = (component as any).blankVisit();
    component.updatePhone('83999999999');

    expect(component.form.phone).toBe('(83) 99999-9999');
  });
});
