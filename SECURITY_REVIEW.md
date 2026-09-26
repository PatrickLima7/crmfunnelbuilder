# Revisão técnica — 26/09/2026

## Estrutura

CRM React 19 / TypeScript / TanStack Start, com Supabase Auth, PostgreSQL, RLS e Realtime.
O administrador gerencia consultores, metas, roteiros, mídias, cursos, leads e relatórios.
Operadores atendem uma fila de leads, registram contatos e retornos e controlam pausas/expediente.
O navegador acessa diretamente o Supabase: a autorização efetiva precisa existir no banco.

## Correções nesta revisão

- **Crítica:** o trigger de cadastro aceitava `role` de metadados controlados pelo usuário.
  Agora cria somente operadores inativos; ativação exige administrador.
- **Crítica:** removida a política que permitia recriar o próprio perfil com papel de administrador.
- **Alta:** a RPC de distribuição não verificava o chamador. Agora exige administrador ativo,
  executa com privilégios do chamador/RLS e não pode ser executada por anônimos.
- **Alta:** leads sem responsável eram selecionáveis pela política pública. Agora operadores
  consultam apenas seus leads e o acesso anônimo às tabelas do CRM foi revogado.
- **Alta:** contas inativas continuavam operando por API. Políticas restritivas verificam
  o estado da conta no banco, inclusive para sessões que já existiam.
- Logs de expediente ficam restritos ao próprio operador e aos administradores.
- Cadastro de consultores usa Edge Function que valida o JWT e o administrador no banco.
  Não troca a sessão do administrador, não inventa IDs sem conta Auth e usa senha aleatória
  criptograficamente segura. Falha ao configurar perfil tenta desfazer a criação da conta.
- Migração 017 agora cria `profiles.active`, coluna usada mas ausente na sequência anterior.
- Criada a coluna `contact_events.motivo_desinteresse`, usada pelo atendimento.
- Retornos futuros não entram antecipadamente em nenhuma etapa da fila automática.
- Interesse não conta mais como venda; atualização de conversões não depende de efeito colateral
  dentro do setter React. Removida escrita silenciosa em tabela `conversions` inexistente
  nas migrações; a conversão continua registrada no lead e no evento de contato.
- Geração de leads de teste usa origem aceita pelo banco; contador inclui status `novo`.
- Alterar/excluir um lead sem permissão ou já removido não produz mais falso sucesso.
- CSV de leads/relatórios escapa aspas, delimitadores e fórmulas de planilhas.
- Dependência `js-yaml` atualizada; arquivos npm/Bun sincronizados e instalação npm reparada.

## Implantação necessária

1. Confira quais migrações já foram aplicadas no projeto Supabase. Aplique as pendentes
   em ordem. Se 001–017 já estiverem aplicadas, execute somente 018. Para banco novo,
   use toda a sequência incluindo a 017 corrigida. Faça backup antes de alterar produção.
2. Revise as contas que já têm `role = 'admin'`: a correção impede novas promoções indevidas,
   mas não determina quais administradores existentes são legítimos.
3. Publique `supabase/functions/create-operator/index.ts` com o nome `create-operator`.
   A função usa `SUPABASE_URL` e `SUPABASE_SERVICE_ROLE_KEY` exclusivamente no ambiente
   da Edge Function. Não coloque a chave privilegiada no front-end ou no chat.
   Exemplo com CLI autenticada: `supabase functions deploy create-operator --project-ref SEU_PROJECT_REF`.
   Mantenha a validação de JWT habilitada; o handler também valida a sessão no Auth.
4. Só então publique o front-end. Configure as duas variáveis públicas de `.env.example`.
   O novo cadastro depende da função; sem ela o formulário informa falha e não cria conta parcial.
5. Valide em homologação login/admin/operador inativo, cadastro de consultor, atribuição de
   leads, atendimento/conversão, retorno futuro, pausas, encerramento e relatórios.

Novos cadastros diretos começam inativos. Contas existentes mantêm seu estado. O primeiro
administrador deve ser provisionado por um responsável pelo banco. A criação administrativa
mantém o fluxo de senha inicial exibida ao administrador e confirma o e-mail por decisão
administrativa; ainda não implementa convite e troca obrigatória da senha inicial.

## Verificação e limites

- `npm run typecheck`: passou.
- Compilação Vite de produção com Node 24: passou. Requer Node >=22.12.
- `npm run test:security`: migrações em PostgreSQL isolado (PGlite), ataques de promoção de
  privilégios, acesso anônimo, isolamento de operadores, distribuição administrativa,
  bloqueio de inativos, testes do handler de criação e proteção CSV.
- `npm audit`: zero vulnerabilidades conhecidas após a atualização, na data desta revisão.
- ESLint global ainda falha: há problemas de formatação preexistentes e, na análise de `src`
  sem a regra de formatação, 77 erros e 10 avisos, incluindo `any` e dependências de hooks.
  Não foi realizada uma reformatação geral ou uma reescrita de tipagem.
- PGlite reproduz PostgreSQL/RLS com uma estrutura Auth de teste. Não testa o serviço
  Supabase Auth real, Realtime, publicação da Edge Function nem as políticas já existentes
  no seu projeto. Nenhuma migração foi executada no banco remoto.
- Ainda há gravações de atendimento/expediente que não tratam todos os erros nem são
  atômicas, contadores mantidos no navegador e consultas sujeitas ao limite de resultados
  da API. Relatórios e totais com volume grande precisam de validação/paginação.
- Exclusão de consultores ainda é um fluxo separado do Supabase Auth, com dependências
  de chaves estrangeiras; prefira desativar até revisar esse fluxo de ponta a ponta.
- Integração efetiva com WhatsApp e entregas de mensagens não foi demonstrada pelos testes.

Esta é uma revisão do repositório e correção inicial, não uma certificação de segurança
ou de todas as funcionalidades em produção.

Referências: [RLS](https://supabase.com/docs/guides/database/postgres/row-level-security),
[funções](https://supabase.com/docs/guides/database/functions),
[Admin createUser](https://supabase.com/docs/reference/javascript/auth-admin-createuser).
