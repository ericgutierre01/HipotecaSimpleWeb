import { NgModule, CUSTOM_ELEMENTS_SCHEMA, LOCALE_ID, DEFAULT_CURRENCY_CODE } from '@angular/core';
import { registerLocaleData } from '@angular/common';
import localeEsDo from '@angular/common/locales/es-DO';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import{HttpClientModule} from '@angular/common/http'
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import { LoginComponent } from './components/login/login.component';
import { InicioComponent } from './components/inicio/inicio.component';


import { DataService } from './services/services/data.service';
import { AsyncPipe } from '../../node_modules/@angular/common';
import { HipotecaCrearComponent } from './components/hipoteca-crear/hipoteca-crear.component';
import { HipotecaDetalleComponent } from './components/hipoteca-detalle/hipoteca-detalle.component';
import { InstalarComponent } from './components/instalar/instalar.component';
import { RecordatoriosComponent } from './components/recordatorios/recordatorios.component';
import { RegistroComponent } from './components/registro/registro.component';
import { RecuperarComponent } from './components/recuperar/recuperar.component';
import { RestablecerComponent } from './components/restablecer/restablecer.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { NotificacionesComponent } from './components/notificaciones/notificaciones.component';
import { BienvenidaComponent } from './components/bienvenida/bienvenida.component';

import { NgxMaskDirective,NgxMaskPipe, provideNgxMask } from 'ngx-mask';

// Fechas en español y moneda RD$ (es-DO usa coma para miles y punto para decimales)
registerLocaleData(localeEsDo);

@NgModule({
  declarations: [
    AppComponent,
    InicioComponent,
    LoginComponent,
    HipotecaCrearComponent,
    HipotecaDetalleComponent,
    InstalarComponent,
    RecordatoriosComponent,
    RegistroComponent,
    RecuperarComponent,
    RestablecerComponent,
    PerfilComponent,
    NotificacionesComponent,
    BienvenidaComponent,
  ],
  imports: [
    BrowserModule,
    AppRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    HttpClientModule,
    NgxMaskDirective, 
    NgxMaskPipe
  ],  
  providers: [DataService, AsyncPipe,provideNgxMask(), { provide: LOCALE_ID, useValue: 'es-DO' }, { provide: DEFAULT_CURRENCY_CODE, useValue: 'DOP' }],
  bootstrap: [AppComponent],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ]
})
export class AppModule { }
