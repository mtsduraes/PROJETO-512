-- =====================================================================
-- Módulo de AGENDA (eventos da empresa)
-- Como usar: no Supabase, abra "SQL Editor", cole este arquivo inteiro
-- e clique em "Run". Pode rodar de novo sem problema.
-- Precisa que schema.sql e 03-estoque.sql já tenham sido rodados antes.
-- =====================================================================

create table if not exists public.eventos (
  id            uuid primary key default gen_random_uuid(),
  cliente       text not null,
  titulo        text not null default '',
  tipo          text not null default 'Casamento'
                check (tipo in ('Casamento','Aniversário','Corporativo','Buffet','Encomenda','Outro')),
  data          date not null,
  hora_inicio   time,
  hora_fim      time,
  local         text not null default '',
  convidados    integer check (convidados >= 0),
  telefone      text not null default '',
  status        text not null default 'orcamento'
                check (status in ('orcamento','confirmado','realizado','cancelado')),
  valor_total   numeric(12,2) not null default 0 check (valor_total >= 0),
  observacao    text not null default '',
  criado_por    uuid default auth.uid() references auth.users(id) on delete set null,
  criado_em     timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create index if not exists eventos_data_idx on public.eventos (data);

drop trigger if exists eventos_atualizado_em on public.eventos;
create trigger eventos_atualizado_em before update on public.eventos
  for each row execute function public.tocar_atualizado_em();

-- Pagamentos do evento são lançamentos de entrada ligados a ele.
-- O lançamento marcado como "restante" é o que ainda falta receber (mantido pelo banco).
alter table public.lancamentos
  add column if not exists evento_id uuid references public.eventos(id) on delete cascade,
  add column if not exists evento_restante boolean not null default false;

create index if not exists lancamentos_evento_idx on public.lancamentos (evento_id);

-- Saídas do estoque podem dizer para qual evento foram.
alter table public.estoque_movimentos
  add column if not exists evento_id uuid references public.eventos(id) on delete set null;

-- Recalcula o "falta receber" de um evento.
create or replace function public.recalcular_restante_evento(p_evento uuid) returns void
language plpgsql security invoker as $$
declare
  ev record;
  recebido numeric;
  falta numeric;
  cat uuid;
begin
  select * into ev from public.eventos where id = p_evento;
  if not found then return; end if;

  select coalesce(sum(valor), 0) into recebido
    from public.lancamentos
   where evento_id = p_evento and tipo = 'entrada' and not evento_restante;

  falta := ev.valor_total - recebido;

  if ev.status in ('orcamento', 'cancelado') or falta <= 0 then
    delete from public.lancamentos where evento_id = p_evento and evento_restante;
    return;
  end if;

  select id into cat from public.categorias
   where tipo = 'entrada' and nome = case when ev.tipo in ('Buffet') then 'Buffet'
                                           when ev.tipo = 'Encomenda' then 'Encomendas'
                                           else 'Eventos' end
   limit 1;

  update public.lancamentos
     set valor = falta, data = ev.data, categoria_id = cat, status = 'pendente',
         descricao = 'Falta receber: ' || ev.cliente || case when ev.titulo <> '' then ' - ' || ev.titulo else '' end
   where evento_id = p_evento and evento_restante;

  if not found then
    insert into public.lancamentos (tipo, valor, data, descricao, categoria_id, forma_pagamento, status, evento_id, evento_restante)
    values ('entrada', falta, ev.data,
            'Falta receber: ' || ev.cliente || case when ev.titulo <> '' then ' - ' || ev.titulo else '' end,
            cat, 'pix', 'pendente', p_evento, true);
  end if;
end $$;

create or replace function public.evento_depois() returns trigger
language plpgsql security invoker as $$
begin
  perform public.recalcular_restante_evento(new.id);
  return null;
end $$;

drop trigger if exists eventos_recalcular on public.eventos;
create trigger eventos_recalcular after insert or update on public.eventos
  for each row execute function public.evento_depois();

create or replace function public.pagamento_evento_depois() returns trigger
language plpgsql security invoker as $$
begin
  -- Evita repetição infinita: mudanças no próprio "restante" não recalculam.
  if tg_op <> 'DELETE' and new.evento_id is not null and not new.evento_restante then
    perform public.recalcular_restante_evento(new.evento_id);
  end if;
  if tg_op <> 'INSERT' and old.evento_id is not null and not old.evento_restante
     and (tg_op = 'DELETE' or old.evento_id is distinct from new.evento_id) then
    perform public.recalcular_restante_evento(old.evento_id);
  end if;
  return null;
end $$;

drop trigger if exists lancamentos_pagamento_evento on public.lancamentos;
create trigger lancamentos_pagamento_evento after insert or update or delete on public.lancamentos
  for each row execute function public.pagamento_evento_depois();

-- Segurança: só a equipe logada vê e mexe.
grant select, insert, update, delete on public.eventos to authenticated;
alter table public.eventos enable row level security;

drop policy if exists "equipe acessa eventos" on public.eventos;
create policy "equipe acessa eventos" on public.eventos
  for all to authenticated using (true) with check (true);

-- Conferência: deve mostrar 0 eventos.
select count(*) as eventos_cadastrados from public.eventos;
