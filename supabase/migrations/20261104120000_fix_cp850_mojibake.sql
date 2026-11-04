-- Reparacion puntual de mojibake CP850 en produccion (utlnsksjiypdtasupqhh).
--
-- Sintoma: en la UI aparecen recuadros y letras raras en acentos:
--   "Guardería"   se ve  "GUARDER[]ÍA"
--   "Luis Arévalo" se ve "Luis Ar[]@valo"
--   "Cumpleaños"  se ve  "Cumplea[]ños"
--
-- No es un problema de fuentes. El texto se guardo doble-codificado:
-- bytes UTF-8 leidos con la pagina de codigos de consola CP850.
--   "í" (C3 AD) -> chr(9500) || chr(161)
--   "é" (C3 A9) -> chr(9500) || chr(174)
--   "ñ" (C3 B1) -> chr(9500) || chr(9618)
-- Origen: el dump/restauracion de docs/migracion-produccion.md paso por
-- PowerShell, que decodifico la salida UTF-8 con la codepage de consola.
--
-- Uso (el proyecto vinculado ya es produccion):
--   npx supabase db query --remote -f supabase/migrations/20261104120000_fix_cp850_mojibake.sql
-- Tambien se puede pegar completo en el SQL Editor del dashboard.
--
-- El script es idempotente y seguro:
--   * solo toca filas que contienen chr(9500) o chr(9516) (nunca aparecen en texto legitimo);
--   * solo escribe si la reversion produce UTF-8 valido;
--   * todo ocurre en una transaccion y termina borrando la funcion auxiliar.
-- Ejecutarlo en una base ya correcta no modifica ninguna fila.

-- PRE-CHECK opcional (ejecutar aparte, solo lectura), debe devolver las 14 filas corruptas:
--   select 'daycares' t, name v from public.daycares
--    where position(chr(9500) in name) > 0 or position(chr(9516) in name) > 0
--   union all select 'children', full_name from public.children
--    where position(chr(9500) in full_name) > 0 or position(chr(9516) in full_name) > 0
--   union all select 'users', full_name from public.users
--    where position(chr(9500) in full_name) > 0 or position(chr(9516) in full_name) > 0
--   union all select 'posts.author', author_name from public.posts
--    where position(chr(9500) in author_name) > 0 or position(chr(9516) in author_name) > 0
--   union all select 'posts.body', body from public.posts
--    where position(chr(9500) in body) > 0 or position(chr(9516) in body) > 0;
--
-- POST-CHECK: la verificacion final de este script debe devolver 0 en todas las filas.

begin;

-- Reversion: cada caracter se vuelve a su byte CP850 y el resultado se decodifica como UTF-8.
-- El arreglo contiene el code point Unicode de los bytes CP850 128..255, en orden.
create or replace function public._fix_cp850_mojibake(txt text)
returns text language plpgsql immutable as $fn$
declare
  cp850 int[] := array[
    199,252,233,226,228,224,229,231,234,235,232,239,238,236,196,197,
    201,230,198,244,246,242,251,249,255,214,220,248,163,216,215,402,
    225,237,243,250,241,209,170,186,191,174,172,189,188,161,171,187,
    9617,9618,9619,9474,9508,193,194,192,169,9571,9553,9559,9565,162,165,9488,
    9492,9524,9516,9500,9472,9532,227,195,9562,9556,9577,9574,9568,9552,9580,164,
    240,208,202,203,200,305,205,206,207,9496,9484,9608,9604,166,204,9600,
    211,223,212,210,245,213,181,254,222,218,219,217,253,221,175,180,
    173,177,8215,190,182,167,247,184,176,168,183,185,179,178,9632,160];
  b bytea := ''::bytea;
  i int; cp int; pos int; byte int;
begin
  if txt is null then return null; end if;
  for i in 1 .. char_length(txt) loop
    cp := ascii(substr(txt, i, 1));
    if cp < 128 then
      byte := cp;
    else
      pos := array_position(cp850, cp);
      if pos is null then return null; end if;
      byte := 127 + pos;
    end if;
    b := b || set_byte('\x00'::bytea, 0, byte);
  end loop;
  begin
    return convert_from(b, 'UTF8');
  exception when others then
    return null;
  end;
end $fn$;

update public.daycares set name = public._fix_cp850_mojibake(name)
 where (position(chr(9500) in name) > 0 or position(chr(9516) in name) > 0)
   and public._fix_cp850_mojibake(name) is not null;

update public.rooms set name = public._fix_cp850_mojibake(name)
 where (position(chr(9500) in name) > 0 or position(chr(9516) in name) > 0)
   and public._fix_cp850_mojibake(name) is not null;

update public.children set full_name = public._fix_cp850_mojibake(full_name)
 where (position(chr(9500) in full_name) > 0 or position(chr(9516) in full_name) > 0)
   and public._fix_cp850_mojibake(full_name) is not null;

update public.children set medical_notes = public._fix_cp850_mojibake(medical_notes)
 where medical_notes is not null
   and (position(chr(9500) in medical_notes) > 0 or position(chr(9516) in medical_notes) > 0)
   and public._fix_cp850_mojibake(medical_notes) is not null;

update public.users set full_name = public._fix_cp850_mojibake(full_name)
 where (position(chr(9500) in full_name) > 0 or position(chr(9516) in full_name) > 0)
   and public._fix_cp850_mojibake(full_name) is not null;

update public.posts set author_name = public._fix_cp850_mojibake(author_name)
 where (position(chr(9500) in author_name) > 0 or position(chr(9516) in author_name) > 0)
   and public._fix_cp850_mojibake(author_name) is not null;

update public.posts set body = public._fix_cp850_mojibake(body)
 where body is not null
   and (position(chr(9500) in body) > 0 or position(chr(9516) in body) > 0)
   and public._fix_cp850_mojibake(body) is not null;

update public.invitations set full_name = public._fix_cp850_mojibake(full_name)
 where (position(chr(9500) in full_name) > 0 or position(chr(9516) in full_name) > 0)
   and public._fix_cp850_mojibake(full_name) is not null;

update public.invitations set email = public._fix_cp850_mojibake(email)
 where (position(chr(9500) in email) > 0 or position(chr(9516) in email) > 0)
   and public._fix_cp850_mojibake(email) is not null;

-- Metadatos de Auth: el trigger handle_new_user copia full_name desde aqui.
update auth.users
   set raw_user_meta_data = jsonb_set(
         raw_user_meta_data, '{full_name}',
         to_jsonb(public._fix_cp850_mojibake(raw_user_meta_data ->> 'full_name')))
 where raw_user_meta_data ->> 'full_name' is not null
   and (position(chr(9500) in raw_user_meta_data ->> 'full_name') > 0
        or position(chr(9516) in raw_user_meta_data ->> 'full_name') > 0)
   and public._fix_cp850_mojibake(raw_user_meta_data ->> 'full_name') is not null;

update auth.identities
   set identity_data = jsonb_set(
         identity_data, '{full_name}',
         to_jsonb(public._fix_cp850_mojibake(identity_data ->> 'full_name')))
 where identity_data ->> 'full_name' is not null
   and (position(chr(9500) in identity_data ->> 'full_name') > 0
        or position(chr(9516) in identity_data ->> 'full_name') > 0)
   and public._fix_cp850_mojibake(identity_data ->> 'full_name') is not null;

-- Verificacion: todas las filas deben quedar en 0.
select 'daycares.name' as columna, count(*) as pendientes from public.daycares
 where position(chr(9500) in name) > 0 or position(chr(9516) in name) > 0
union all select 'children.full_name', count(*) from public.children
 where position(chr(9500) in full_name) > 0 or position(chr(9516) in full_name) > 0
union all select 'users.full_name', count(*) from public.users
 where position(chr(9500) in full_name) > 0 or position(chr(9516) in full_name) > 0
union all select 'posts.author_name', count(*) from public.posts
 where position(chr(9500) in author_name) > 0 or position(chr(9516) in author_name) > 0
union all select 'posts.body', count(*) from public.posts
 where position(chr(9500) in body) > 0 or position(chr(9516) in body) > 0
union all select 'invitations.full_name', count(*) from public.invitations
 where position(chr(9500) in full_name) > 0 or position(chr(9516) in full_name) > 0
union all select 'auth.users.meta', count(*) from auth.users
 where position(chr(9500) in raw_user_meta_data::text) > 0
    or position(chr(9516) in raw_user_meta_data::text) > 0;

drop function public._fix_cp850_mojibake(text);

commit;
