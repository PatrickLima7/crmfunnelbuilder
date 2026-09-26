# Carteira, retornos e prioridade de novos leads

## Regras implementadas

- Total na carteira: todos os leads atribuídos ao operador, inclusive convertidos.
- Retornos pendentes: leads abertos com retorno marcado para hoje ou dias anteriores.
  Inclui horários de hoje que ainda não chegaram. Comparação pelo calendário de Brasília.
- Retornos futuros: leads abertos com retorno a partir de amanhã, em Brasília.
- Convertidos: somente `status = converted`. Não entram nos retornos comerciais pendentes/futuros.
  Inativos e blacklist também ficam fora dos retornos e das temperaturas; continuam em Todos.
- Filtros e contadores usam o mesmo predicado e respeitam a busca. Um lead morno agendado
  aparece em Morno e no filtro de retorno correspondente. Todos exibe cada lead uma única vez.
- Novo lead usa somente `status = novo`; `pending` é carteira comum. Novos leads aparecem
  com prioridade **Super quente**, derivada do estado, sem alterar o enum de temperaturas do banco.
- Primeiro contato: aba Novo lead selecionada inicialmente, prioridade na fila, aviso após
  um minuto de espera e atualização por Realtime/polling de 15 segundos com a tela aberta.
  Isso auxilia o atendimento rápido; não garante atendimento humano dentro de um minuto.
- Manual e recadastro manual entram como novos. Recadastro pelo mesmo telefone exato
  atualiza o registro, preserva o primeiro cadastro e limpa retorno antigo. A deduplicação
  não normaliza números em formatos diferentes e ainda não resolve cadastros simultâneos.
- CSV tem opção explícita **Marcar esta lista como Novos leads**, desmarcada por padrão.
  A opção vale para toda a lista. A prévia mostra a classificação escolhida.
- Novas entradas com origem `manual`, `instagram`, `facebook`, `linkedin` ou `site`
  e estado inicial `pending` passam para `novo` pelo trigger 019. Integrações de campanha
  com outras origens devem enviar `status = novo` explicitamente e preencher `assigned_to`
  para que o operador receba o lead. Não foi criada uma integração externa com campanhas.
- CSVs antigos comprovados pelo histórico de importação automática deixam Novo lead.
  Registros sem evidência suficiente não são reclassificados em massa.
- Reativar blacklist volta para carteira comum; não equivale a recadastro manual.

## Como a temperatura é determinada

As regras são explícitas, não um modelo de IA:

| Classificação | Regra |
|---|---|
| Super quente | Novo lead, até ser classificado ou ter o contato registrado |
| Quente | Interesse real; a conversão fica separada em Convertidos |
| Morno | Indeciso, pedido de retorno, nutrição; pode ser definido manualmente |
| Frio | Sem resposta, desligamento, número inválido ou pouco interesse |

CSV sem temperatura recebe Frio. Cadastro manual mantém a temperatura selecionada,
mas exibe Super quente enquanto for novo. Temperaturas podem ser ajustadas pelo operador;
classificar um novo lead manualmente o tira do estado Novo. Agendamentos não escondem
leads dos filtros de temperatura. O seletor de data e hora usa Brasília, inclusive ao
converter para timestamps UTC no banco.

## Aplicação

Execute as migrações 018 e 019 após conferir a estrutura existente. O arquivo entregue
`02_APLICAR_CORRECOES_SUPABASE.sql` combina ambas numa transação, com verificação de tabelas.
Ele não apaga leads, mas altera permissões, funções, publicação Realtime e a classificação
dos CSVs antigos identificados. Confira a contagem pelo arquivo `01_CONFERIR_ANTES.sql`.

O SQL sozinho não publica filtros nem os novos botões. Publique também a Edge Function
`create-operator` da revisão anterior e o front-end atualizado. Evite importar CSVs com
o front-end antigo no intervalo, pois ele marca todos como novos.

## Testes

- TypeScript e build de produção.
- Testes de categorias: hoje/futuro/atrasado, virada do dia/mês em Brasília, temperatura
  com retorno, convertidos/inativos, estado pending, opt-in CSV e conversão de horário.
- PostgreSQL isolado: migrações repetidas, reclassificação do CSV antigo, preservação de
  recadastro e CSV explícito, entrada de campanha/manual, além dos testes de segurança 018.
- Supabase remoto, autenticação real e integração de campanhas ainda não foram testados.

Comandos: `npm run typecheck`, `npm run build`, `npm run test:security`, `npm run test:leads`.
