-- =====================================================================
-- Módulo de BOLETOS (contas que a empresa paga)
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo inteiro
-- e clique em "Run". Pode rodar de novo sem problema.
-- Precisa que o schema.sql (fluxo de caixa) já tenha sido rodado antes.
-- =====================================================================

create table if not exists public.boletos (
  id               uuid primary key default gen_random_uuid(),
  fornecedor       text not null,
  descricao        text not null default '',
  valor            numeric(12,2) not null check (valor > 0),
  vencimento       date not null,
  linha_digitavel  text not null default '',
  categoria_id     uuid references public.categorias(id) on delete set null,
  status           text not null default 'a_pagar' check (status in ('a_pagar', 'pago')),
  pago_em          date,
  anexo_path       text,
  observacao       text not null default '',
  criado_por       uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

create index if not exists boletos_vencimento_idx on public.boletos (vencimento);

-- Cada boleto tem um lançamento "espelho" no caixa (a pagar -> pago).
alter table public.lancamentos
  add column if not exists boleto_id uuid unique references public.boletos(id) on delete cascade;

drop trigger if exists boletos_atualizado_em on public.boletos;
create trigger boletos_atualizado_em before update on public.boletos
  for each row execute function public.tocar_atualizado_em();

-- Mantém o lançamento do caixa sempre igual ao boleto.
create or replace function public.sincronizar_boleto_caixa() returns trigger
language plpgsql security invoker as $$
declare
  texto text := 'Boleto: ' || new.fornecedor || case when new.descricao <> '' then ' - ' || new.descricao else '' end;
begin
  if tg_op = 'INSERT' then
    insert into public.lancamentos (tipo, valor, data, descricao, categoria_id, forma_pagamento, status, boleto_id)
    values ('saida', new.valor,
            case when new.status = 'pago' then coalesce(new.pago_em, current_date) else new.vencimento end,
            texto, new.categoria_id, 'boleto',
            case when new.status = 'pago' then 'pago' else 'pendente' end,
            new.id);
  else
    update public.lancamentos set
      valor        = new.valor,
      data         = case when new.status = 'pago' then coalesce(new.pago_em, current_date) else new.vencimento end,
      descricao    = texto,
      categoria_id = new.categoria_id,
      status       = case when new.status = 'pago' then 'pago' else 'pendente' end
    where boleto_id = new.id;
  end if;
  return new;
end $$;

drop trigger if exists boletos_sincronizar_caixa on public.boletos;
create trigger boletos_sincronizar_caixa after insert or update on public.boletos
  for each row execute function public.sincronizar_boleto_caixa();

-- Segurança: só a equipe logada vê e mexe.
grant select, insert, update, delete on public.boletos to authenticated;
alter table public.boletos enable row level security;

drop policy if exists "equipe acessa boletos" on public.boletos;
create policy "equipe acessa boletos" on public.boletos
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- Pasta privada para guardar foto/PDF dos boletos.
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('boletos', 'boletos', false, 10485760,
        array['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic'])
on conflict (id) do nothing;

drop policy if exists "equipe le anexos de boletos" on storage.objects;
create policy "equipe le anexos de boletos" on storage.objects
  for select to authenticated using (bucket_id = 'boletos');

drop policy if exists "equipe envia anexos de boletos" on storage.objects;
create policy "equipe envia anexos de boletos" on storage.objects
  for insert to authenticated with check (bucket_id = 'boletos');

drop policy if exists "equipe apaga anexos de boletos" on storage.objects;
create policy "equipe apaga anexos de boletos" on storage.objects
  for delete to authenticated using (bucket_id = 'boletos');

-- Conferência: deve mostrar a tabela boletos com 0 linhas.
select count(*) as boletos_cadastrados from public.boletos;
