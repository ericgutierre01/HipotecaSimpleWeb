import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import { Observable } from 'rxjs';
import { Config } from 'src/app/services/config';

import { Hipoteca } from 'src/app/Entities/Hipoteca';
import { Pagos } from 'src/app/Entities/Pagos';
import { Usuarios, LoginViewModel } from 'src/app/Entities/Usuarios';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  // Base del API (servidor + carpeta) de config.json, con la barra final
  get url(): string { return Config.api; }

  constructor(
    private _http: HttpClient
  ) { }

  //Hipoteca
  postHipoteca(params :Hipoteca):Observable<any>{
    return this._http.post(this.url + 'Hipoteca', params, {headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  deleteHipoteca(id:number):Observable<any>{
    return this._http.post(this.url + 'Hipoteca/Delete?id='+id, id, {responseType: 'text',headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  updateHipoteca(params :Hipoteca):Observable<any>{
    return this._http.post(this.url + 'Hipoteca/Update', params ,{responseType: 'text', headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  getHipotecaById(id:number):Observable<any>{
    return this._http.get(this.url + `Hipoteca/${id}`, {headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  getMisHipotecas():Observable<any>{
    return this._http.get(this.url + 'Hipoteca',{ headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  // Cambios de tasa
  postTasa(params: { hipoId: number, tasaDesdeCuota: number, tasaValor: number }):Observable<any>{
    return this._http.post(this.url + 'Hipoteca/Tasa', params, {headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  deleteTasa(id:number):Observable<any>{
    return this._http.post(this.url + 'Hipoteca/Tasa/Delete?id='+id, id, {responseType: 'text', headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  //PagosHipoteca
  postPago(params :Pagos):Observable<any>{
    return this._http.post(this.url + 'Hipoteca/PostPagarCuota', params, {responseType: 'text', headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  deletePago(id:number):Observable<any>{
    return this._http.post(this.url + 'Hipoteca/DeletePagosCuota?id='+id, id, {responseType: 'text',headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }
 

  //Notificaciones push
  getClavePush():Observable<string>{
    return this._http.get(this.url + 'Notificaciones/ClavePublica', {responseType: 'text'});
  }

  postSuscribirPush(sub: { endpoint: string, p256dh: string, auth: string }):Observable<any>{
    return this._http.post(this.url + 'Notificaciones/Suscribir', sub, {responseType: 'text', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  postDesuscribirPush(endpoint: string):Observable<any>{
    return this._http.post(this.url + 'Notificaciones/Desuscribir', { endpoint }, {responseType: 'text', headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  getNotificaciones():Observable<any>{
    return this._http.get(this.url + 'Notificaciones/Lista', { headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  postLeerNotificacion(id: number):Observable<any>{
    return this._http.post(this.url + `Notificaciones/Leer/${id}`, {}, {responseType: 'text', headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  postLeerTodas():Observable<any>{
    return this._http.post(this.url + 'Notificaciones/LeerTodas', {}, {responseType: 'text', headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  postPruebaPush():Observable<any>{
    return this._http.post(this.url + 'Notificaciones/Prueba', {}, {responseType: 'text', headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  //Cuenta: registro, recuperar contraseña y perfil
  postRegistro(datos: { nombre: string, usuario: string, email: string, password: string }):Observable<any>{
    return this._http.post(this.url + 'Usuarios/Registro', datos, {responseType: 'text'});
  }

  postRecuperar(email: string):Observable<any>{
    return this._http.post(this.url + 'Usuarios/Recuperar', { email }, {responseType: 'text'});
  }

  postRestablecer(token: string, password: string):Observable<any>{
    return this._http.post(this.url + 'Usuarios/Restablecer', { token, password }, {responseType: 'text'});
  }

  getPerfil():Observable<any>{
    return this._http.get(this.url + 'Usuarios/Perfil', { headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  postPerfil(datos: { nombre: string, email: string }):Observable<any>{
    return this._http.post(this.url + 'Usuarios/Perfil', datos, {responseType: 'text', headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  postCambiarClave(actual: string, nueva: string):Observable<any>{
    return this._http.post(this.url + 'Usuarios/CambiarClave', { actual, nueva }, {responseType: 'text', headers: { 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  //Usuario
  postLogin(login :LoginViewModel):Observable<any>{
    return this._http.post(this.url + 'Usuarios/Login', login, {headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }
  chekIsLogin():Observable<any>{
    return this._http.get(this.url + 'Usuarios/IsLoging', {responseType: 'text', headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

}
