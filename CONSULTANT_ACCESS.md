# Atualização de consultores e supervisão

## Publicação (nesta ordem)

Esta atualização pressupõe as migrações 018 e 019 já aplicadas.

1. Execute todo o arquivo `supabase/migrations/020_usernames_and_shift_logout.sql` no SQL Editor do projeto. A migração pode ser repetida. Ela preserva contas, senhas e e-mails existentes e gera usuários a partir dos nomes.
2. Em Edge Functions, abra a função existente **create-operator**, substitua todo o `index.ts` pelo arquivo atualizado e publique. Mantenha **Verify JWT with legacy secret ligado**. A função também verifica a identidade e o perfil de administrador ativo no servidor.
3. Crie a função **login-username**, usando seu `index.ts`, publique e desligue **Verify JWT with legacy secret** em Settings; salve. Esse endpoint recebe usuários ainda não autenticados e valida a senha pelo Supabase Auth. Ele limita tentativas por usuário e não devolve o e-mail interno.
4. Só depois publique o front-end na main/Vercel. Sem a migração, o novo fluxo de encerramento do expediente não poderá concluir.

Os arquivos em `supabase/config.toml` também configuram essas opções para deploy via CLI. As variáveis padrão SUPABASE_URL, SUPABASE_ANON_KEY e SUPABASE_SERVICE_ROLE_KEY são usadas dentro das funções. Não cole tokens ou senhas no chat nem coloque a service role no front-end.

## Uso

- Novo consultor: informar nome, meta e senha inicial de pelo menos oito caracteres. O sistema gera o usuário e o mostra na lista. Não envia e-mail com senha: o administrador informa as credenciais ao consultor.
- Editar / Senha: alterar nome, usuário e meta, ou definir uma nova senha. Usuários são únicos; nomes iguais recebem um sufixo. A senha escolhida não é devolvida pelo endpoint nem exibida em notificações.
- Contas antigas: o login por e-mail continua funcionando com a senha antiga. O usuário gerado aparece na lista de consultores. Quem não sabe a senha deve solicitar redefinição ao administrador.
- Funis: todos os leads aparecem inicialmente; clique no nome do consultor para consultar sua carteira, filtros, retornos e indicadores. O administrador pode registrar orientações, reagendar e alterar classificação/conversão. As alterações recebem identificação administrativa no histórico.
- A supervisão mostra dados salvos, com atualização periódica e eventos em tempo real; não transmite a tela ou campos ainda não salvos do consultor. Abrir a supervisão não inicia expediente nem registra contatos em nome dele.
- Sair: fecha expediente, pausas e sessões de trabalho da própria conta antes de sair. Se a gravação falhar, mantém o acesso e apresenta o erro. Fechar a aba ou perder a conexão não equivale a clicar em Sair.

## Validação

Executados: TypeScript, build de produção, testes de segurança e migrações em PostgreSQL isolado (PGlite), testes dos handlers de contas com clientes simulados, filtros de leads e ordem do logout. Incluem isolamento entre operadores, restrição administrativa, colisão de usuário, redefinição, limite de tentativas e repetição segura do encerramento. O ambiente real do Supabase e o fluxo visual autenticado ainda precisam da validação abaixo após publicação.

1. Entrar com o administrador existente (se necessário usando e-mail).
2. Criar consultor de teste, copiar o usuário mostrado e entrar com a senha definida.
3. Editar seu usuário/meta; redefinir senha e conferir que a nova senha permite acesso.
4. Como administrador, selecionar uma carteira e conferir filtros/contagens; registrar orientação e verificar na conta do consultor.
5. Como consultor, iniciar expediente, entrar em pausa e clicar Sair; confirmar no painel que está offline e nos logs que expediente e pausa terminaram. Entrar e iniciar novo expediente no mesmo dia.

Referências: [configuração de Edge Functions](https://supabase.com/docs/guides/functions/function-configuration) e [redefinição administrativa de senha](https://supabase.com/docs/reference/javascript/auth-admin-updateuserbyid).
