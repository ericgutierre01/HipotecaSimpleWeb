using Microsoft.EntityFrameworkCore;
using HipotecaSimple.Data.Entities;

namespace HipotecaSimple.Data
{
    public class ApiContext : DbContext
    {
        public ApiContext(DbContextOptions<ApiContext> options) : base(options)
        {
        }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            //modelBuilder.Entity<Factura>().Ignore(t => t.FactDetalle);
            base.OnModelCreating(modelBuilder);

        }

        public DbSet<Usuarios> Usuarios { get; set; }
        public DbSet<Hipotecas> Hipotecas { get; set; }
        public DbSet<Pagos> Pagos { get; set; }
    }
}

