import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { authGuard } from './services/check-login-guard';
import { InicioComponent } from './components/inicio/inicio.component';
import { LoginComponent } from './components/login/login.component';
import { HipotecaCrearComponent } from './components/hipoteca-crear/hipoteca-crear.component';
import { HipotecaDetalleComponent } from './components/hipoteca-detalle/hipoteca-detalle.component';


const routes: Routes = [
  {path: 'Login', component: LoginComponent},
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
