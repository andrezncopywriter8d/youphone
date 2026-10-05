# CELLSHOP

Sistema web para gestão de lojas de iPhones, com estoque individual por IMEI, clientes, PDV, pagamento dividido, financeiro, cancelamento auditável e etiquetas imprimíveis.

## Requisitos

- Node.js 20.9 ou superior
- pnpm 10 ou superior
- Docker Desktop (recomendado) ou PostgreSQL 16

## Primeira execução

```bash
cp .env.example .env
docker compose up -d
pnpm install
pnpm db:generate
pnpm db:migrate --name init
pnpm db:seed
pnpm dev
```

Abra [http://localhost:3000](http://localhost:3000).

Credenciais locais iniciais:

- E-mail: `admin@cellshop.com.br`
- Senha: `Cellshop@2026`

Troque a senha e `AUTH_SECRET` antes de produção.

## Conectar ao Supabase

O sistema usa Prisma com PostgreSQL, então o Supabase funciona como banco real sem mudar a camada de dados da aplicação.

No painel do Supabase, abra `Project Settings > Database > Connection string` e configure:

```bash
DATABASE_URL="postgresql://postgres.PROJECT_REF:PASSWORD@aws-0-REGION.pooler.supabase.com:6543/postgres?pgbouncer=true&connection_limit=1&schema=public"
DIRECT_URL="postgresql://postgres:PASSWORD@db.PROJECT_REF.supabase.co:5432/postgres?schema=public"
AUTH_SECRET="gere-uma-chave-longa-e-aleatoria"
```

Use `DATABASE_URL` com pooler para o app e `DIRECT_URL` direta para migrations. Depois execute:

```bash
pnpm db:generate
pnpm db:deploy
pnpm db:seed
```

Credenciais iniciais criadas pelo seed:

- E-mail: `admin@cellshop.com.br`
- Senha: `Cellshop@2026`

## Verificações

```bash
pnpm lint
pnpm typecheck
pnpm build
```

## Regras implementadas

- IMEI, serial e código interno possuem unicidade no PostgreSQL.
- Venda revalida e bloqueia estoque dentro de transação serializável.
- Pagamentos devem fechar exatamente o valor líquido da venda.
- Descontos são limitados por perfil no servidor.
- Cancelamento não apaga a venda: gera reversão financeira, movimento de estoque e auditoria.
- Valores monetários usam `Decimal(12,2)`.
- Sessão de autenticação é armazenada em cookie HTTP-only assinado.
