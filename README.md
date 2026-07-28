<div align="center">

# 🏠 Hipoteca Simple

**Gestiona tus hipotecas y visualiza tu tabla de amortización — con simulación de pagos extra para saber cuánto tiempo e intereses ahorras.**

![.NET](https://img.shields.io/badge/.NET-7.0-512BD4?logo=dotnet&logoColor=white)
![Angular](https://img.shields.io/badge/Angular-16-DD0031?logo=angular&logoColor=white)
![Bootstrap](https://img.shields.io/badge/Bootstrap-5.3-7952B3?logo=bootstrap&logoColor=white)
![SQL Server](https://img.shields.io/badge/SQL%20Server-EF%20Core-CC2927?logo=microsoftsqlserver&logoColor=white)
![Responsive](https://img.shields.io/badge/UI-Responsive%20%2F%20Mobile-2ea44f)

</div>

---

## ✨ Características

- 🔐 **Login** con autenticación por token (Bearer).
- 📋 **Listado de hipotecas** con alta y baja.
- ➕ **Crear hipoteca**: monto, interés, plazo, seguros, banco y día de pago; cálculo de cuota en vivo.
- 📊 **Tabla de amortización** completa (cuota, interés, capital, saldo pendiente).
- 💸 **Pagos extra / anticipados** con dos estrategias:
  - **Reducir tiempo** → terminas antes de plazo.
  - **Reducir cuota** → pagas menos cada mes.
- 📈 **Resumen inteligente**: total a pagar, intereses, **interés ahorrado** y **tiempo ahorrado**.
- 📅 **Fecha de vencimiento** de cada cuota (a partir de la creación y el día de pago).
- 📱 **100% responsive / app-like en móvil**:
  - La tabla de amortización se convierte en **tarjetas** apiladas.
  - Cuotas pagadas **minimizadas** (tap para expandir), con distintivo de **pago extra**.
  - **Cuota actual** resaltada con salto automático y botón de pago directo.

---

## 🧱 Estructura del proyecto

```
HipotecaSimple/
├── Api/                      → Backend (ASP.NET Core Web API + EF Core)
│   └── HipotecaSimple/
│       ├── Controllers/      → Usuarios, Hipoteca
│       ├── Data/             → DbContext y entidades
│       ├── Program.cs
│       └── appsettings.example.json
└── Web/                      → Frontend (Angular 16 + Bootstrap 5)
    └── src/app/
        ├── components/       → login, inicio, hipoteca-crear, hipoteca-detalle, nav
        ├── services/         → data.service, guard de sesión
        └── Api Url/url.example.ts
```

---

## 🛠️ Stack tecnológico

| Capa | Tecnologías |
|------|-------------|
| **Frontend** | Angular 16 · Bootstrap 5.3 · ngx-mask · SweetAlert2 · Font Awesome |
| **Backend**  | ASP.NET Core (.NET 7) · Entity Framework Core · JWT Bearer · Swagger |
| **Base de datos** | SQL Server |

---

## 🚀 Puesta en marcha

### Requisitos
- [Node.js](https://nodejs.org/) 18+ y npm
- [.NET SDK 7.0](https://dotnet.microsoft.com/download)
- SQL Server (local o remoto)

### 1) Clonar
```bash
git clone https://github.com/ericgutierre01/HipotecaSimpleWeb.git
cd HipotecaSimpleWeb
```

### 2) Configurar los secretos (obligatorio)
Por seguridad, la URL del servidor y la cadena de conexión **no** están en el repo. Copia las plantillas y complétalas con tus valores:

```bash
# Backend: cadena de conexión a tu SQL Server
cp "Api/HipotecaSimple/appsettings.example.json" "Api/HipotecaSimple/appsettings.json"

# Frontend: URL de tu API
cp "Web/src/app/Api Url/url.example.ts" "Web/src/app/Api Url/url.ts"
```

Luego edita:
- `Api/HipotecaSimple/appsettings.json` → `ConnectionStrings.defaultConnection`
- `Web/src/app/Api Url/url.ts` → `url` (ej. `http://localhost:5282/`)

> 💡 Estos dos archivos están en `.gitignore`, así que tus credenciales nunca se subirán.

### 3) Backend (API)
```bash
cd Api/HipotecaSimple
dotnet restore
dotnet run
```
API en `https://localhost:7124` · documentación Swagger en `/swagger`.

### 4) Frontend (Web)
```bash
cd Web
npm install
npm start
```
App en `http://localhost:4200`.

---

## 🔒 Seguridad

- `appsettings.json` (credenciales de BD) y `url.ts` (URL del servidor) están **ignorados por git**; en el repo solo viven sus plantillas `*.example`.
- Nunca subas esos archivos reales ni los publiques en issues/capturas.

---

## 📄 Licencia

Proyecto personal. Todos los derechos reservados salvo indicación contraria.
