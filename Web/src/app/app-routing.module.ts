import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './services/check-login-guard';
import { InicioComponent } from './components/inicio/inicio.component';
import { LoginComponent } from './components/login/login.component';
import { HipotecaCrearComponent } from './components/hipoteca-crear/hipoteca-crear.component';
import { HipotecaDetalleComponent } from './components/hipoteca-detalle/hipoteca-detalle.component';
import { RegistroComponent } from './components/registro/registro.component';
import { RecuperarComponent } from './components/recuperar/recuperar.component';
import { RestablecerComponent } from './components/restablecer/restablecer.component';
import { PerfilComponent } from './components/perfil/perfil.component';
import { NotificacionesComponent } from './components/notificaciones/notificaciones.component';
import { BienvenidaComponent } from './components/bienvenida/bienvenida.component';


const routes: Routes = [
  {path: 'Bienvenido', component: BienvenidaComponent},
  {path: 'Login', component: LoginComponent},
  {path: 'Registro', component: RegistroComponent},
  {path: 'Recuperar', component: RecuperarComponent},
  {path: 'Restablecer', component: RestablecerComponent},
  {path: 'Perfil', component: PerfilComponent, canActivate : [ authGuard]},
  {path: 'Notificaciones', component: NotificacionesComponent, canActivate : [ authGuard]},
  {path: '', component: InicioComponent, canActivate : [ authGuard]},
  {path: 'HipotecaCrear', component: HipotecaCrearComponent, canActivate : [ authGuard]},
  {path: 'HipotecaDetalle/:id', component: HipotecaDetalleComponent, canActivate : [ authGuard]},
];

@NgModule({
  imports: [RouterModule.forRoot(routes, {useHash: true,
    scrollPositionRestoration: 'top',
  },),],
  exports: [RouterModule]
})
export class AppRoutingModule { }
