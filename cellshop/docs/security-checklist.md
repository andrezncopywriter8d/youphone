# CELLSHOP Security Checklist

## Ativo no sistema

- Sessão com cookie HTTP-only, SameSite Strict e expiração de 8 horas.
- JWT com `issuer`, `audience` e `AUTH_SECRET` obrigatório com 32+ caracteres.
- Revalidação de usuário ativo no banco a cada sessão carregada.
- Rate limit de login por IP + e-mail: 5 falhas bloqueiam novas tentativas por 15 minutos.
- Login sem credenciais preenchidas no HTML.
- Headers HTTP de segurança:
  - Content-Security-Policy
  - X-Frame-Options
  - X-Content-Type-Options
  - Referrer-Policy
  - Permissions-Policy
  - Cross-Origin-Opener-Policy
  - Cross-Origin-Resource-Policy
  - Strict-Transport-Security em produção
- Bloqueio de requisições com `x-middleware-subrequest`.
- RLS habilitado e forçado em todas as tabelas principais do Supabase.
- Permissões revogadas para `anon` e `authenticated` nas tabelas Prisma.
- Validação de regras críticas no servidor: permissões de perfil, desconto máximo, disponibilidade de estoque, soma de pagamentos e estorno auditável.

## Fazer no painel Supabase/no-code antes de produção

- Rotacionar a senha do banco que foi compartilhada no chat.
- Usar uma conexão pooled em `DATABASE_URL` e uma direta somente em `DIRECT_URL`.
- Rodar o Security Advisor do Supabase e resolver alertas.
- Manter RLS ligado em novas tabelas.
- Não expor `service_role` no frontend.
- Desativar a Data API se o sistema continuar usando apenas Prisma pelo servidor.
- Ativar backups/PITR conforme criticidade da loja.
- Ativar 2FA nas contas de administradores do Supabase.
- Publicar atrás de HTTPS com domínio próprio.
- Se tiver alto volume, usar rate limit persistente em Redis/Upstash ou WAF.
