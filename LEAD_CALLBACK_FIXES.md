# Cadastro, retorno, pausa e insights — atualização 021

## Publicação

1. Execute `supabase/migrations/021_lead_registration_and_callbacks.sql` inteiro no SQL Editor, no projeto CRM FUNNEL BUILDER. Pressupõe as migrações anteriores, até 020. Pode ser repetido.
2. Publique o front-end desta alteração na main/Vercel imediatamente após o SQL. A nova conclusão de ligação depende da função SQL `finish_lead_call`. Faça essa sequência sem atendimentos em andamento: o front-end antigo não envia a data no evento e a nova validação do banco rejeita esse evento.
3. Não precisa atualizar as Edge Functions `create-operator` ou `login-username`.

RLS permanece ligado. Consultores ativos podem inserir apenas com `assigned_to` igual ao próprio usuário. Administradores mantêm a gestão de todas as carteiras. O recadastro por telefone pesquisa somente a carteira selecionada.

## Regras

- Interessado, indeciso, reagendar retorno e desligou exigem data/hora e confirmação explícita. Conversão permite pós-venda opcional; sem interesse exige motivo e não agenda retorno.
- O banco salva alteração do lead e evento de contato em uma transação. Erros mantêm a ligação aberta. O identificador do atendimento evita duplicar o evento quando uma requisição é repetida.
- A restrição de data aplica-se a novas gravações. Datas de eventos históricos não são inventadas.
- A sugestão usa o horário de Brasília: mais um dia e duas horas, mantendo os minutos. Exemplo: 01/10 às 13h → 02/10 às 15h. Às 23h, a soma atravessa a meia-noite: dia 01 às 23h → dia 03 à 01h.
- O botão e a rotina de geração de leads fictícios foram removidos. Leads existentes não são apagados.
- Durante a pausa, o conteúdo operacional fica cinza e inativo para mouse e teclado; Retomar e o relógio da topbar continuam disponíveis.

## Alterar insights sem modificar código

No Supabase, abra Table Editor → `app_config` → registro cuja chave é `insight_messages`. Edite o campo JSON `value`, uma lista de objetos:

```json
[
  {"category":"motivacional","text":"Sua mensagem motivacional"},
  {"category":"tecnica","text":"Sua dica de atendimento"},
  {"category":"operacao","text":"Sua dica sobre o CRM"}
]
```

Categorias: motivacional (verde), tecnica (amarelo), operacao (azul). A sequência troca a cada 15 minutos; mensagens repetidas e entradas inválidas são ignoradas. Mantenha pelo menos duas mensagens distintas para haver rotação. A configuração é consultada novamente a cada 15 minutos; existe uma base padrão caso fique vazia ou indisponível. Somente administradores podem editar a configuração pelo aplicativo/API.

## Verificações

- Testes PostgreSQL isolados: INSERT de admin/consultor, rejeição de titular diferente e conta inativa, datas obrigatórias, falha revertendo toda a transação, repetição sem duplicação e proteção dos insights.
- Testes de calendário: exemplo solicitado, passagem de meia-noite e ano, data vazia/inválida. Testes de rotação: 15 minutos, sequência e retorno de aba em segundo plano.
- Interface local com dados simulados: bloqueio sem confirmação, limpeza da data desabilitando confirmação, erro de gravação preservando o modal e nova tentativa concluindo após sucesso.
- TypeScript e build de produção. Essas verificações não substituem a aplicação do SQL e o teste autenticado no ambiente real.

Após publicar: cadastrar um lead com consultor e outro com admin; concluir um retorno confirmado e verificar a data na carteira; testar pausa/retomar; conferir as três categorias de insights. Não reutilize a migração 020 no lugar desta.
