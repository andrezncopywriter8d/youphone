# Prompt final — CELLSHOP

Continue o projeto CELLSHOP a partir do estado atual. Não recrie o projeto, não redesenhe telas já aprovadas e não repita análises ou explicações longas. Primeiro inspecione o código e o banco existentes; preserve tudo que já funciona e corrija somente o necessário.

Objetivo desta execução: entregar um MVP realmente utilizável para uma loja de iPhones, com frontend, backend, PostgreSQL/Prisma, autenticação e regras de negócio reais. Não use dados hardcoded, localStorage como banco, botões sem ação, telas “em breve” ou funcionalidades simuladas.

Prioridade obrigatória, nesta ordem:

1. Autenticação e permissões básicas (ADMIN, GERENTE e VENDEDOR).
2. Catálogo e estoque: cada iPhone é uma unidade individual (`InventoryUnit`) identificada por código interno, IMEI e serial; acessórios usam estoque por quantidade.
3. Cadastro expresso de aparelho, com validação e bloqueio de IMEI/serial duplicados no banco.
4. Consulta de estoque por código interno, IMEI, serial, modelo e status.
5. PDV funcional: carrinho, cliente opcional, desconto conforme permissão, pagamento único ou dividido e troca de aparelho.
6. Finalização da venda em uma única transação ACID: criar venda, itens e pagamentos; marcar unidades como `SOLD`; gerar movimentos de estoque, financeiro e auditoria. Em qualquer falha, fazer rollback total.
7. Cancelamento sem apagar a venda: exigir motivo e permissão, estornar financeiro, devolver estoque quando aplicável e registrar auditoria.
8. Etiqueta simples e imprimível com nome do produto, código interno, IMEI/serial, preço e código de barras. Deixe o editor visual avançado para depois do MVP.
9. Clientes, financeiro básico e dashboard alimentados apenas por dados reais do banco.

Regras críticas:

- IMEI 1 é único; IMEI 2 e serial são únicos quando informados; código interno é único e nunca reutilizado.
- Antes de concluir uma venda, revalide no servidor que a unidade está `AVAILABLE` e impeça venda concorrente do mesmo aparelho.
- Valores monetários devem usar decimal/inteiro adequado, nunca `float`.
- Não apague vendas, movimentações financeiras ou auditoria; use status e reversões.
- Autorização e validação devem existir no servidor, não apenas na interface.
- Interface em pt-BR, BRL, datas DD/MM/YYYY e timezone `America/Fortaleza`.
- Preserve a linguagem visual atual mostrada na referência: premium, limpa, poucos menus, sidebar escura, cards discretos e poucos cliques. Não copie marcas de terceiros.

Modo econômico de execução:

- Trabalhe diretamente no código; não gaste saída reescrevendo requisitos.
- Não crie dezenas de páginas superficiais. Termine um fluxo completo antes de iniciar outro.
- Reutilize componentes e dependências já existentes.
- Evite bibliotecas novas quando a solução atual for suficiente.
- Não faça perguntas sobre detalhes pequenos: adote uma decisão técnica sensata.
- Não implemente agora recursos secundários como multi-loja avançado, fiscal/NF-e, integrações externas, BI avançado, editor complexo de etiquetas ou customização extensa.
- Se o limite desta execução se aproximar, finalize o fluxo em andamento, rode as verificações e pare em estado funcional; não deixe código quebrado.

Antes de editar, identifique silenciosamente o que já existe e qual é a primeira lacuna da lista de prioridades. Depois implemente em ordem, incluindo schema/migration, backend, interface, validações e testes essenciais. Corrija erros encontrados no caminho apenas quando afetarem o fluxo atual.

Ao terminar, rode lint, typecheck, testes relevantes e build. Entregue somente um resumo curto contendo: funcionalidades concluídas, verificações executadas, eventuais pendências reais e comandos exatos para iniciar o sistema. Não mostre código inteiro na resposta.

Critério de pronto: o usuário consegue fazer login, cadastrar e localizar um iPhone, imprimir sua etiqueta, cadastrar um cliente, concluir uma venda real, ver o aparelho mudar para vendido, consultar o lançamento financeiro e cancelar a venda com estoque e auditoria consistentes.
