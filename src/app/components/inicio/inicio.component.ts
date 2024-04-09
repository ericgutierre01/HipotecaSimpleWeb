import { Component, OnInit } from '@angular/core';
import { Hipoteca } from 'src/app/Entities/Hipoteca';
import { DataService } from 'src/app/services/services/data.service';
import { Router } from '@angular/router';
import Swal from 'sweetalert2'

@Component({
  selector: 'app-inicio',
  templateUrl: './inicio.component.html',
  styleUrls: ['./inicio.component.css'],
  
})
export class InicioComponent implements OnInit{

  loading = false;
  hipotecas: Hipoteca[] = [];
  

  constructor(private _dataservice: DataService,
    private _router: Router

  ) { }

  ngOnInit(): void {
    this.getHipotecas()
  }


  crearPrestamo() {
    this._router.navigateByUrl(`/HipotecaCrear`)
  }


  getHipotecas() {
    this.loading = true;
    this._dataservice.getMisHipotecas().subscribe(
      (res) => {
        this.loading = false;
        this.hipotecas = res;

      },
      (err) => {
        this.loading = false;
        console.error(err.error);
        Swal.fire({
          position: 'center',
          icon: 'error',
          title: err.error,
          showConfirmButton: false,
          timer: 1500,
        });

      }
    );
  }

  borrarHipoteca(id:any) {
    try {
        Swal.fire({
          title: "Esta seguro que desea borrar esta hipoteca?",
          showDenyButton: true,
          showCancelButton: false,
          confirmButtonText: "si borrar",
          denyButtonText: `Cancelar`
        }).then((resultConfirm) => {
          /* Read more about isConfirmed, isDenied below */
          if (resultConfirm.isConfirmed) {
            this.loading = true;
            this._dataservice.deleteHipoteca(id).subscribe(
              (res) => {
                this.loading = false;
                Swal.fire({
                  position: 'top-end',
                  icon: 'success',
                  title: 'Hipoteca borrada correctamente!',
                  showConfirmButton: false,
                  timer: 1500
                }).then(() => {
                  window.location.reload();
                });
              },
              (err) => {
                this.loading = false;
                console.error(err.error);
                Swal.fire({
                  position: 'center',
                  icon: 'error',
                  title: err.error,
                  showConfirmButton: false,
                  timer: 1500,
                });

              }
            );
          } 
          else{

          }
        });

    }
    catch (error) {
      this.loading = false;
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: error as string,
        showConfirmButton: true,
      });
      console.log(TypeError);
    }
  }

}
