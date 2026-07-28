import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HipotecaDetalleComponent } from './hipoteca-detalle.component';

describe('HipotecaDetalleComponent', () => {
  let component: HipotecaDetalleComponent;
  let fixture: ComponentFixture<HipotecaDetalleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HipotecaDetalleComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HipotecaDetalleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
