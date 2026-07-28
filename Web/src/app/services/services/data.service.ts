import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import { Observable } from 'rxjs';
import { Url } from 'src/app/Api Url/url';

import { Hipoteca } from 'src/app/Entities/Hipoteca';
import { Pagos } from 'src/app/Entities/Pagos';
import { Usuarios, LoginViewModel } from 'src/app/Entities/Usuarios';

@Injectable({
  providedIn: 'root'
})
export class DataService {
  public url : string;

  constructor(
    private _http: HttpClient
  ) { 
    this.url = Url.url; 
  }

  //Hipoteca
  postHipoteca(params :Hipoteca):Observable<any>{
    return this._http.post(this.url + 'Fortune/HipotecaSimple/Hipoteca', params, {headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  deleteHipoteca(id:number):Observable<any>{
    return this._http.post(this.url + 'Fortune/HipotecaSimple/Hipoteca/Delete?id='+id, id, {responseType: 'text',headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  updateHipoteca(params :Hipoteca):Observable<any>{
    return this._http.post(this.url + 'Fortune/HipotecaSimple/Hipoteca/Update', params ,{responseType: 'text', headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  getHipotecaById(id:number):Observable<any>{
    return this._http.get(this.url + `Fortune/HipotecaSimple/Hipoteca/${id}`, {headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  getMisHipotecas():Observable<any>{
    return this._http.get(this.url + 'Fortune/HipotecaSimple/Hipoteca',{ headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  //PagosHipoteca
  postPago(params :Pagos):Observable<any>{
    return this._http.post(this.url + 'Fortune/HipotecaSimple/Hipoteca/PostPagarCuota', params, {responseType: 'text', headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

  deletePago(id:number):Observable<any>{
    return this._http.post(this.url + 'Fortune/HipotecaSimple/Hipoteca/DeletePagosCuota?id='+id, id, {responseType: 'text',headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }
 

  //Usuario
  postLogin(login :LoginViewModel):Observable<any>{
    return this._http.post(this.url + 'Fortune/HipotecaSimple/Usuarios/Login', login, {headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }
  chekIsLogin():Observable<any>{
    return this._http.get(this.url + 'Fortune/HipotecaSimple/Usuarios/IsLoging', {responseType: 'text', headers: { 'Content-Type': ' application/json-patch+json', 'Authorization': `Bearer ${localStorage.getItem("token")}` }});
  }

}
