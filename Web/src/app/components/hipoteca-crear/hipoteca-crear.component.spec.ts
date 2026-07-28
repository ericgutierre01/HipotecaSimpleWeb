import { ComponentFixture, TestBed } from '@angular/core/testing';

import { HipotecaCrearComponent } from './hipoteca-crear.component';

describe('HipotecaCrearComponent', () => {
  let component: HipotecaCrearComponent;
  let fixture: ComponentFixture<HipotecaCrearComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ HipotecaCrearComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(HipotecaCrearComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
