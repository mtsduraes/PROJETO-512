-- =====================================================================
-- Painel de Caixa - estrutura do banco de dados (Supabase / PostgreSQL)
-- Como usar: no painel do Supabase, abra "SQL Editor", cole este arquivo
-- inteiro e clique em "Run". Pode rodar de novo sem problema.
-- =====================================================================

-- Categorias (ex.: Eventos, Ingredientes). "tipo" diz se é de entrada ou saída.
create table if not exists public.categorias (
  id          uuid primary key default gen_random_uuid(),
  nome        text not null,
  tipo        text not null check (tipo in ('entrada', 'saida')),
  ativa       boolean not null default true,
  criado_em   timestamptz not null default now(),
  unique (nome, tipo)
);

-- Lançamentos do caixa.
create table if not exists public.lancamentos (
  id               uuid primary key default gen_random_uuid(),
  tipo             text not null check (tipo in ('entrada', 'saida')),
  valor            numeric(12,2) not null check (valor > 0),
  data             date not null default current_date,
  descricao        text not null default '',
  categoria_id     uuid references public.categorias(id) on delete set null,
  forma_pagamento  text not null default 'pix'
                   check (forma_pagamento in ('pix','dinheiro','cartao_credito','cartao_debito','boleto','transferencia','outro')),
  status           text not null default 'pago' check (status in ('pago', 'pendente')),
  criado_por       uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em        timestamptz not null default now(),
  atualizado_em    timestamptz not null default now()
);

create index if not exists lancamentos_data_idx on public.lancamentos (data);

-- Atualiza "atualizado_em" automaticamente em cada edição.
create or replace function public.tocar_atualizado_em() returns trigger
language plpgsql as $$
begin
  new.atualizado_em := now();
  return new;
end $$;

drop trigger if exists lancamentos_atualizado_em on public.lancamentos;
create trigger lancamentos_atualizado_em before update on public.lancamentos
  for each row execute function public.tocar_atualizado_em();

-- ---------------------------------------------------------------------
-- Segurança: só quem está logado vê e mexe nos dados.
-- (Os usuários são cadastrados manualmente no Supabase, então só a equipe entra.)
-- ---------------------------------------------------------------------
-- Permissões explícitas (alguns projetos novos do Supabase não liberam sozinhos).
grant usage on schema public to authenticated;
grant select, insert, update, delete on public.categorias  to authenticated;
grant select, insert, update, delete on public.lancamentos to authenticated;

alter table public.categorias  enable row level security;
alter table public.lancamentos enable row level security;

drop policy if exists "equipe acessa categorias" on public.categorias;
create policy "equipe acessa categorias" on public.categorias
  for all to authenticated using (true) with check (true);

drop policy if exists "equipe acessa lancamentos" on public.lancamentos;
create policy "equipe acessa lancamentos" on public.lancamentos
  for all to authenticated using (true) with check (true);

-- ---------------------------------------------------------------------
-- Resumos calculados no banco (rápidos mesmo com muitos lançamentos).
-- ---------------------------------------------------------------------

-- Saldo atual (só o que já foi pago/recebido) e o que está pendente.
create or replace function public.resumo_saldo()
returns table (saldo numeric, a_receber numeric, a_pagar numeric)
language sql stable security invoker as $$
  select
    coalesce(sum(case when status = 'pago' and tipo = 'entrada' then valor
                      when status = 'pago' and tipo = 'saida'   then -valor end), 0),
    coalesce(sum(case when status = 'pendente' and tipo = 'entrada' then valor end), 0),
    coalesce(sum(case when status = 'pendente' and tipo = 'saida'   then valor end), 0)
  from public.lancamentos;
$$;

-- Entradas e saídas pagas por mês, nos últimos N meses (incluindo o atual).
create or replace function public.resumo_mensal(meses int default 6)
returns table (mes text, entradas numeric, saidas numeric)
language sql stable security invoker as $$
  with m as (
    select generate_series(
      date_trunc('month', current_date) - make_interval(months => meses - 1),
      date_trunc('month', current_date),
      interval '1 month')::date as inicio
  )
  select to_char(m.inicio, 'YYYY-MM'),
         coalesce(sum(l.valor) filter (where l.tipo = 'entrada'), 0),
         coalesce(sum(l.valor) filter (where l.tipo = 'saida'), 0)
  from m
  left join public.lancamentos l
    on l.status = 'pago'
   and l.data >= m.inicio and l.data < (m.inicio + interval '1 month')
  group by m.inicio
  order by m.inicio;
$$;

grant execute on function public.resumo_saldo()      to authenticated;
grant execute on function public.resumo_mensal(int)  to authenticated;

-- ---------------------------------------------------------------------
-- Categorias iniciais (podem ser editadas no próprio painel).
-- ---------------------------------------------------------------------
insert into public.categorias (nome, tipo) values
  ('Eventos', 'entrada'),
  ('Buffet', 'entrada'),
  ('Encomendas', 'entrada'),
  ('Outras entradas', 'entrada'),
  ('Ingredientes', 'saida'),
  ('Bebidas', 'saida'),
  ('Equipe', 'saida'),
  ('Aluguel de material', 'saida'),
  ('Transporte', 'saida'),
  ('Contas fixas', 'saida'),
  ('Outras saídas', 'saida')
on conflict (nome, tipo) do nothing;
