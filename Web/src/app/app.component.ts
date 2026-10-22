import { Component } from '@angular/core';
import { NavigationEnd, Router } from '@angular/router';
import { filter } from 'rxjs';
import { DataService } from './services/services/data.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  title = 'HipotecaSimpleWeb';

  // Al abrir la app desde una notificación push, la url trae ?noti=ID: se marca como leída en la campana
  constructor(router: Router, dataservice: DataService) {
    router.events.pipe(filter(e => e instanceof NavigationEnd)).subscribe(() => {
      const id = Number(router.parseUrl(router.url).queryParams['noti']);
      if (id > 0 && localStorage.getItem('token')) dataservice.postLeerNotificacion(id).subscribe({ error: () => { } });
    });
  }
}
