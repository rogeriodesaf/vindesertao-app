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
});
