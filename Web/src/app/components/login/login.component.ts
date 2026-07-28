import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import Swal from 'sweetalert2'
import { DataService } from 'src/app/services/services/data.service';
import { LoginViewModel } from 'src/app/Entities/Usuarios';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  loginViewModel = new LoginViewModel;
  loading = false;

  constructor
    (
      private restApi: DataService,
      private router: Router
    ) { }

  ngOnInit(): void {
    this.loading = true;
    this.restApi.chekIsLogin().subscribe(
      res => {
        this.loading = false;
        this.router.navigateByUrl('/');
      }, err => {
        this.loading = false;
        //console.log(err)
        var usuario = localStorage.getItem('usuario');
        if (usuario) {
          (<HTMLInputElement>document.getElementById('user')).value = usuario;
          (<HTMLInputElement>document.getElementById('pass')).focus();

          if(err.error == "[object ProgressEvent]"){
            Swal.fire({
              position: 'top-end',
              icon: 'error',
              title: "Sesion Vencida :(",
              showConfirmButton: false,
              timer: 1500
            })
          }
        }
        else {
          (<HTMLInputElement>document.getElementById('user')).focus();
        }
      }
    )

  }

  nextFocus(event: any, next: string) {
    if (event.keyCode == 13) {
      if (next == "login")
        this.login();
      else
        (<HTMLInputElement>document.getElementById(next)).focus();
    }
  }

  login() {
    this.loginViewModel.user = String((<HTMLInputElement>document.getElementById('user')).value);
    this.loginViewModel.password = String((<HTMLInputElement>document.getElementById('pass')).value);
    this.loading = true;
    this.restApi.postLogin(this.loginViewModel).subscribe(
      res => {
        localStorage.setItem('token', res.token);
        localStorage.setItem('nombre', res.usuNombre);
        localStorage.setItem('usuario', res.usuSesion);
        var fechaExpi = new Date();
        fechaExpi.setMinutes(fechaExpi.getMinutes() + 5);
        localStorage.setItem("fechaExp", fechaExpi.toString());
        if(localStorage.getItem("lastUrl") != null){
          this.router.navigateByUrl(localStorage.getItem("lastUrl")!);  
        }else{
           this.router.navigateByUrl('/');       
        }

      }, err => {
        this.loading = false;
        console.log(err)
        Swal.fire({
          position: 'top-end',
          icon: 'error',
          title: err.error,
          showConfirmButton: false,
          timer: 1500
        })
      }
    )
  }

}
