import { NgModule, CUSTOM_ELEMENTS_SCHEMA  } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';

import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import{HttpClientModule} from '@angular/common/http'
import {FormsModule, ReactiveFormsModule} from '@angular/forms';

import { LoginComponent } from './components/login/login.component';
import { InicioComponent } from './components/inicio/inicio.component';
import { NavComponent } from './components/nav/nav.component';


import { DataService } from './services/services/data.service';
import { AsyncPipe } from '../../node_modules/@angular/common';
import { HipotecaCrearComponent } from './components/hipoteca-crear/hipoteca-crear.component';
import { HipotecaDetalleComponent } from './components/hipoteca-detalle/hipoteca-detalle.component';

import { NgxMaskDirective,NgxMaskPipe, provideNgxMask } from 'ngx-mask';

@NgModule({
  declarations: [
    AppComponent,
    InicioComponent,
    NavComponent,
    LoginComponent,
    HipotecaCrearComponent,
    HipotecaDetalleComponent,
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
  providers: [DataService, AsyncPipe,provideNgxMask()],
  bootstrap: [AppComponent],
  schemas: [ CUSTOM_ELEMENTS_SCHEMA ]
})
export class AppModule { }
