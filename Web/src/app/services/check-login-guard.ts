import { Config } from 'src/app/services/config';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot, Router } from "@angular/router";
import Swal from 'sweetalert2'
import { inject } from '@angular/core';


// lastUrl = página que el usuario quería abrir cuando se le pidió iniciar sesión; el login la usa una vez
export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {

  var router = inject(Router)

  // Quien nunca ha iniciado sesión ve la presentación de la app, no un "Sesión vencida"
  if (!localStorage.getItem("token")) {
    // Si venía a una página concreta (p. ej. desde una notificación), al entrar lo llevamos ahí
    if (state.url !== '/') localStorage.setItem("lastUrl", state.url);
    else localStorage.removeItem("lastUrl");
    router.navigateByUrl('/Bienvenido');
    return false;
  }

  try {

    fetch(Config.api + 'Usuarios/IsLoging',
      {
        method: 'Get',
        headers:
        {
          "Content-Type": "application/json",
          'Authorization': `Bearer ${localStorage.getItem("token")}`
        },
      })
      .then(async res => {
        if (res.status != 200) {
          localStorage.setItem("lastUrl", state.url);
          Swal.fire({
            position: 'top-end',
            icon: 'error',
            title: "Sesión vencida",
            showConfirmButton: false,
            timer: 1500
          });
          router.navigateByUrl('/Login');
          return false;
        }
        else {
          return true;
        }
      })
      .catch(error => {
        localStorage.setItem("lastUrl", state.url);

        Swal.fire({
          position: 'top-end',
          icon: 'error',
          title: "Sesión vencida",
          showConfirmButton: false,
          timer: 1500
        });
        router.navigateByUrl('/Login');
        return false;

      });

  } catch (error) {
    return true;
  }
  return true;
};