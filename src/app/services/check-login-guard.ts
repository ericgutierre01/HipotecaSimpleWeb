import { Url } from 'src/app/Api Url/url';
import { ActivatedRouteSnapshot, CanActivateFn, RouterStateSnapshot, Router } from "@angular/router";
import Swal from 'sweetalert2'
import { inject } from '@angular/core';


export const authGuard: CanActivateFn = (
  route: ActivatedRouteSnapshot,
  state: RouterStateSnapshot,
) => {

  var router = inject(Router)

  console.log("hola")
  try {

    fetch(Url.url + 'Fortune/HipotecaSimple/Usuarios/IsLoging',
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
          console.log("hola1")
          localStorage.setItem("lastUrl", router.url);
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
          localStorage.setItem("lastUrl", router.url);
          return true;
        }
      })
      .catch(error => {
        console.log("error")
        localStorage.setItem("lastUrl", router.url);

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