# Painel de Caixa

Painel web para controlar o fluxo de caixa da empresa de gastronomia e eventos.
Funciona no celular e no notebook pelo navegador (e pode ser adicionado à tela inicial como um app).

## O que já faz

- **Início:** saldo em caixa hoje, quanto falta receber e pagar, resumo do mês (entradas, saídas e resultado),
  de onde veio e para onde foi o dinheiro por categoria, e gráfico dos últimos 6 meses.
- **Lançamentos:** lista do mês com busca e filtros (tipo, situação, categoria), edição, exclusão e botão para baixar planilha (abre no Excel).
- **Boletos:** contas a pagar com leitura automática da linha digitável (valor, vencimento e conferência dos dígitos),
  foto/PDF anexado, botão para copiar o código, separação por vencidos / hoje / 7 dias e "marcar como pago".
  Cada boleto entra sozinho no "Falta pagar" do caixa e vira uma saída paga quando é quitado.
- **Estoque:** itens com grupo, unidade, local e estoque mínimo; entradas (com opção de lançar a compra no caixa),
  saídas e contagem; histórico com "desfazer"; avisos de estoque baixo e validade; lista de compras para o WhatsApp
  e valor guardado em mercadoria (preço médio).
- **Agenda:** eventos com cliente, tipo, horário, local, convidados e WhatsApp; situação (orçamento, confirmado,
  realizado, cancelado); calendário do mês e lista. O valor fechado e o sinal entram no caixa, e o que falta receber
  aparece sozinho no "Falta receber" na data do evento. Saídas do estoque podem ser ligadas a um evento.
  Mostra junto os compromissos do Google Agenda (só leitura) e tem botão para mandar cada evento para o Google.
- **Tema claro e escuro**, com botão no topo de todas as telas.
- **Categorias:** criar, renomear, desativar e reativar categorias de entrada e saída.
- **Login** por e-mail e senha para a equipe (até 4 pessoas no plano grátis, com folga).

## Tecnologias

| Parte | Ferramenta | Custo |
|---|---|---|
| Site | [Next.js](https://nextjs.org) + Tailwind CSS | grátis |
| Banco de dados e login | [Supabase](https://supabase.com) | plano grátis |
| Hospedagem | [Vercel](https://vercel.com) | plano grátis |

## Testar no computador (modo demonstração)

Sem configurar nada, o painel abre em **modo demonstração**, com dados de exemplo guardados só no navegador.

```bash
npm install
npm run dev
# abra http://localhost:3000
```

## Colocar no ar de verdade

1. **Supabase:** crie um projeto grátis. No menu *SQL Editor*, cole todo o conteúdo de
   [`supabase/schema.sql`](supabase/schema.sql) e clique em *Run*. Depois faça o mesmo com
   [`supabase/02-boletos.sql`](supabase/02-boletos.sql) [`supabase/03-estoque.sql`](supabase/03-estoque.sql) e
   [`supabase/04-agenda.sql`](supabase/04-agenda.sql), nesta ordem.
2. Ainda no Supabase, em *Authentication > Sign In / Providers*, desligue **"Allow new users to sign up"**
   (assim ninguém de fora cria conta) e, em *Authentication > Users*, clique em **Add user** para cada pessoa da equipe.
3. Em *Project Settings > API*, copie a **Project URL** e a chave **anon public**.
4. **Vercel:** importe este repositório do GitHub e, em *Environment Variables*, cadastre
   `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com os valores do passo 3. Clique em *Deploy*.

5. **Google Agenda (opcional):** no Google Agenda do computador, abra *Configurações*, clique na agenda,
   vá em *Integrar agenda* e copie o **Endereço secreto no formato iCal**. Na Vercel, cadastre a variável
   `GOOGLE_AGENDA_ICAL_URL` com esse link e faça um *Redeploy*. Para juntar mais de uma agenda, cole os links separados por espaço. O link fica só no servidor e só quem está logado vê os compromissos.

Para rodar localmente conectado ao Supabase, copie `.env.example` para `.env.local` e preencha os mesmos valores.

## Dica de uso

Para o saldo começar certo, faça um primeiro lançamento de **entrada** chamado "Saldo inicial"
com o valor que existe hoje no caixa/conta, na categoria "Outras entradas".

## Organização do código

```
supabase/schema.sql        tabelas, segurança e resumos do banco
src/lib/dados.ts           todas as leituras e gravações (Supabase ou modo demonstração)
src/lib/types.ts           tipos de dados (lançamento, categoria, boleto…)
src/lib/boleto.ts          leitura e conferência da linha digitável
src/app/page.tsx           tela Início
src/app/lancamentos/       tela Lançamentos
src/app/boletos/           tela Boletos
src/app/estoque/           tela Estoque
src/app/agenda/            tela Agenda
src/app/api/google-agenda/ leitura do Google Agenda (roda no servidor)
src/app/categorias/        tela Categorias
src/app/login/             tela de login
src/components/            peças reutilizáveis (formulário, gráficos, menu…)
```

## Próximos passos

Os quatro módulos combinados (caixa, boletos, estoque e agenda) estão prontos. Novas telas entram
do mesmo jeito: uma tela nova e um arquivo SQL novo no Supabase, sem mexer no que já existe.
