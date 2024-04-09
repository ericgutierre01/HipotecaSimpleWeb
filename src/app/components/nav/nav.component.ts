import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router'
import { Location } from '@angular/common';
import Swal from 'sweetalert2'

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.css']
})
export class NavComponent implements OnInit {
  constructor(
    private router: Router,
    private location: Location
  ) { }

  cliNombre = '';
  bottonBack = "";
  ngOnInit(): void {
    this.cliNombre = `${localStorage.getItem("nombre")}`;
    if (this.router.url == "/") {
      this.bottonBack = `fa-solid fa-bars`;
    }
    else {
      this.bottonBack = `fa-solid fa-arrow-left`;
    }
  }
  openMenu() {
    (<HTMLOptionElement>document.getElementById('menu_btn')).click();
  }

  CerrarSesion() {
    Swal.fire({
      title: `Está seguro que desea guardar cerrar sesión`,
      showDenyButton: true,
      showCancelButton: false,
      showCloseButton: false,
      confirmButtonText: 'Cerrar Sesión',
      denyButtonText: "Cancelar"
    }).then((result) => {
      /* Read more about isConfirmed, isDenied below */
      if (result.isConfirmed) {
        localStorage.removeItem("token");
        window.location.reload();
      }
    })
  }


  getUrl() {
    var id = "0";
    //console.log(this.router.url)
    if (this.router.url.includes("/HipotecaEditar/") ||
      this.router.url.includes("/HipotecaDetalle/"))
      id = this.router.url.split("/")[2]

    //console.log(id);
    switch (this.router.url) {
      case "/HipotecaCrear":
        this.router.navigateByUrl('/');
        break;
      case "/HipotecaEditar/" + id:
        this.router.navigateByUrl('/HipotecaDetalle');
        break;
      case "/HipotecaDetalle/" + id:
        this.router.navigateByUrl('/');
        break;

      case "/PrestamosDetalle/" + id:
        this.location.back();
        break;
      case "/":
        this.openMenu();
        break;

      default:
        this.router.navigateByUrl('/');
        break;
    }
  }
}
