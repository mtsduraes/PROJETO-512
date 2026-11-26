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
   [`supabase/02-boletos.sql`](supabase/02-boletos.sql) e com [`supabase/03-estoque.sql`](supabase/03-estoque.sql).
2. Ainda no Supabase, em *Authentication > Sign In / Providers*, desligue **"Allow new users to sign up"**
   (assim ninguém de fora cria conta) e, em *Authentication > Users*, clique em **Add user** para cada pessoa da equipe.
3. Em *Project Settings > API*, copie a **Project URL** e a chave **anon public**.
4. **Vercel:** importe este repositório do GitHub e, em *Environment Variables*, cadastre
   `NEXT_PUBLIC_SUPABASE_URL` e `NEXT_PUBLIC_SUPABASE_ANON_KEY` com os valores do passo 3. Clique em *Deploy*.

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
src/app/categorias/        tela Categorias
src/app/login/             tela de login
src/components/            peças reutilizáveis (formulário, gráficos, menu…)
```

## Próximos módulos planejados

Agenda (integrada ao Google Agenda). Cada um entra como uma nova tela
e novas tabelas no Supabase, sem mexer no que já existe.
