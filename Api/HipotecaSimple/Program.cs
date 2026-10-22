using System.Text;
using HipotecaSimple.Data;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.Tokens;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddControllers();
builder.Services.AddSwaggerGen();

builder.Services.AddCors(options =>
{
    options.AddPolicy("AllowAllHeaders",
    builder =>
    {
        builder.AllowAnyOrigin()
               .AllowAnyHeader()
               .AllowAnyMethod();
    });
});

builder.Services.AddDbContext<ApiContext>(opcions => opcions.UseSqlServer(builder.Configuration.GetConnectionString("defaultConnection")), ServiceLifetime.Transient);

// Correos: recuperar contraseña y aprobación de registros
builder.Services.AddSingleton<HipotecaSimple.Services.Correo>();

// Recordatorios de pago por notificación push
builder.Services.AddHostedService<HipotecaSimple.Services.RecordatoriosService>();


var key = Encoding.ASCII.GetBytes("Rb2_R1hOETT3GJtkXmHHipotecaSimplesLD5NtIqVxpUjFz_i0x_gSPXrD");
builder.Services.AddAuthentication().AddJwtBearer(x =>
{
    x.RequireHttpsMetadata = false;
    x.SaveToken = true;
    x.TokenValidationParameters = new TokenValidationParameters
    {
        ValidateIssuerSigningKey = true,
        IssuerSigningKey = new SymmetricSecurityKey(key),
        ValidateIssuer = false,
        ValidateAudience = false,

    };
});



var app = builder.Build();

// En local imita el prefijo que IIS pone en producción, para que el Web use las mismas rutas
if (app.Environment.IsDevelopment()) app.UsePathBase("/Fortune/HipotecaSimple");

app.UseSwagger();
if (app.Environment.IsDevelopment())
{
    app.UseSwaggerUI(c => c.SwaggerEndpoint("/swagger/v1/swagger.json", "HipotecaSimple v1.1"));
}

app.UseSwaggerUI(c => c.SwaggerEndpoint("/Fortune/HipotecaSimple/swagger/v1/swagger.json", "HipotecaSimple v1.1"));

//app.UseMiddleware<CustomMiddleware>();
app.UseHttpsRedirection();

// CORS antes de autorizar: así un 401 (sesión vencida) también lleva la cabecera y el navegador puede leerlo
app.UseCors("AllowAllHeaders");
app.UseAuthorization();
app.MapControllers();


app.Run();
