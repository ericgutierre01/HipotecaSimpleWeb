// Dirección del API. Se lee al arrancar de config.json (junto a index.html), así que para cambiar
// de servidor basta con editar ese archivo en el servidor: no hay que volver a compilar.
export const Config = { api: '' };

export async function cargarConfig(): Promise<void> {
  const r = await fetch('config.json', { cache: 'no-store' });
  if (!r.ok) throw new Error('No se encontró config.json junto a index.html');
  const c = await r.json();
  const servidor = String(c.servidor ?? '').trim().replace(/\/+$/, '');
  const carpeta = String(c.carpeta ?? '').trim().replace(/^\/+|\/+$/g, '');
  if (!/^https?:\/\/[^/]+$/.test(servidor)) throw new Error('config.json: "servidor" debe ser como https://midominio.com');
  Config.api = `${servidor}/${carpeta ? carpeta + '/' : ''}`;
}
