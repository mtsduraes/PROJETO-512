-- =====================================================================
-- Módulo de ESTOQUE
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo inteiro
-- e clique em "Run". Pode rodar de novo sem problema.
-- Precisa que o schema.sql (fluxo de caixa) já tenha sido rodado antes.
-- =====================================================================

create table if not exists public.estoque_itens (
  id            uuid primary key default gen_random_uuid(),
  nome          text not null,
  grupo         text not null default 'Ingredientes'
                check (grupo in ('Ingredientes','Bebidas','Descartáveis','Limpeza','Material de evento','Outros')),
  unidade       text not null default 'un'
                check (unidade in ('un','kg','g','L','ml','cx','pct','dz','fardo')),
  local         text not null default '',
  minimo        numeric(12,3) not null default 0 check (minimo >= 0),
  -- Os três campos abaixo são calculados a partir das movimentações (não edite à mão).
  quantidade    numeric(12,3) not null default 0,
  custo_medio   numeric(12,4) not null default 0,
  validade      date,
  ativo         boolean not null default true,
  criado_em     timestamptz not null default now(),
  unique (nome)
);

create table if not exists public.estoque_movimentos (
  id               uuid primary key default gen_random_uuid(),
  item_id          uuid not null references public.estoque_itens(id) on delete cascade,
  tipo             text not null check (tipo in ('entrada','saida','ajuste')),
  -- entrada/saída: quanto entrou ou saiu; ajuste: quanto tem de verdade depois da contagem
  quantidade       numeric(12,3) not null check (quantidade >= 0),
  custo_unitario   numeric(12,4) check (custo_unitario >= 0),
  validade         date,
  motivo           text not null default '',
  data             date not null default current_date,
  lancar_no_caixa  boolean not null default false,
  lancamento_id    uuid references public.lancamentos(id) on delete set null,
  criado_por       uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em        timestamptz not null default now()
);

create index if not exists estoque_movimentos_item_idx on public.estoque_movimentos (item_id, data, criado_em);

-- Recalcula quantidade, custo médio e validade de um item refazendo o histórico em ordem.
create or replace function public.recalcular_item_estoque(p_item uuid) returns void
language plpgsql security invoker as $$
declare
  m record;
  qtd numeric := 0;
  custo numeric := 0;
  val date := null;
begin
  for m in
    select tipo, quantidade, custo_unitario, validade
    from public.estoque_movimentos where item_id = p_item
    order by data, criado_em
  loop
    if m.tipo = 'entrada' then
      if m.custo_unitario is not null and qtd + m.quantidade > 0 then
        custo := (greatest(qtd, 0) * custo + m.quantidade * m.custo_unitario) / (greatest(qtd, 0) + m.quantidade);
      end if;
      qtd := qtd + m.quantidade;
      if m.validade is not null then val := m.validade; end if;
    elsif m.tipo = 'saida' then
      qtd := qtd - m.quantidade;
    else
      qtd := m.quantidade;
    end if;
  end loop;
  update public.estoque_itens
     set quantidade = qtd, custo_medio = round(custo, 4), validade = case when qtd > 0 then val end
   where id = p_item;
end $$;

create or replace function public.movimento_estoque_depois() returns trigger
language plpgsql security invoker as $$
begin
  perform public.recalcular_item_estoque(coalesce(new.item_id, old.item_id));
  if tg_op = 'UPDATE' and new.item_id <> old.item_id then
    perform public.recalcular_item_estoque(old.item_id);
  end if;
  return null;
end $$;

drop trigger if exists estoque_movimentos_recalcular on public.estoque_movimentos;
create trigger estoque_movimentos_recalcular after insert or update or delete on public.estoque_movimentos
  for each row execute function public.movimento_estoque_depois();

-- Compra com "lançar no caixa": cria a saída paga no fluxo de caixa automaticamente.
create or replace function public.movimento_estoque_caixa() returns trigger
language plpgsql security invoker as $$
declare
  it record;
  cat uuid;
  novo uuid;
begin
  if new.tipo = 'entrada' and new.lancar_no_caixa and coalesce(new.custo_unitario, 0) > 0 and new.lancamento_id is null then
    select nome, grupo into it from public.estoque_itens where id = new.item_id;
    select id into cat from public.categorias
      where tipo = 'saida' and nome = case it.grupo when 'Ingredientes' then 'Ingredientes'
                                                    when 'Bebidas' then 'Bebidas'
                                                    when 'Material de evento' then 'Aluguel de material'
                                                    else 'Outras saídas' end
      limit 1;
    insert into public.lancamentos (tipo, valor, data, descricao, categoria_id, forma_pagamento, status)
    values ('saida', round(new.quantidade * new.custo_unitario, 2), new.data,
            'Compra estoque: ' || it.nome || case when new.motivo <> '' then ' - ' || new.motivo else '' end,
            cat, 'pix', 'pago')
    returning id into novo;
    new.lancamento_id := novo;
  end if;
  return new;
end $$;

drop trigger if exists estoque_movimentos_caixa on public.estoque_movimentos;
create trigger estoque_movimentos_caixa before insert on public.estoque_movimentos
  for each row execute function public.movimento_estoque_caixa();

-- Segurança: só a equipe logada vê e mexe.
grant select, insert, update, delete on public.estoque_itens      to authenticated;
grant select, insert, update, delete on public.estoque_movimentos to authenticated;
alter table public.estoque_itens      enable row level security;
alter table public.estoque_movimentos enable row level security;

drop policy if exists "equipe acessa estoque" on public.estoque_itens;
create policy "equipe acessa estoque" on public.estoque_itens
  for all to authenticated using (true) with check (true);

drop policy if exists "equipe acessa movimentos" on public.estoque_movimentos;
create policy "equipe acessa movimentos" on public.estoque_movimentos
  for all to authenticated using (true) with check (true);

-- Conferência: deve mostrar 0 itens.
select count(*) as itens_no_estoque from public.estoque_itens;
