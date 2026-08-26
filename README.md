# Funil Amigo

Você vai criar um CRM de gerenciamento de vendas com as seguintes especificações:

## ARQUITETURA GERAL

- Stack: React + TypeScript (ou JavaScript)

- Autenticação: Painel de login para operadores/vendedores

- Design: Inspirado no layout do Funil de Vendas (sidebar esquerda, painel central, métricas direita)

## 1. PAINEL DE LOGIN

- Formulário simples com email/CPF e senha

- Redirecionar para dashboard após login bem-sucedido

- Botão "Lembrar-me" (opcional)

- Mensagens de erro claras

## 2. LAYOUT PRINCIPAL (Dashboard)

### Sidebar Esquerda (Menu de Métricas do Operador)

- **META DO DIA**: Mostrar numero de contatos que precisa fazer (definido pelo admin)

- **CONTATOS REALIZADOS**: Contador de contatos já feitos hoje

- **MATRÍCULAS/CONVERSÕES**: Total de conversões fechadas

- **CONVERSAS INICIADAS**: Quantidade de conversas iniciadas

- **NEGOCIAÇÕES**: Quantas negociações em andamento

- **RITMO ATUAL**: Quanto contatos por hora (exemplo: 8.6/h)

- **INSIGHTS MOTIVACIONAIS**: Mensagens dinâmicas como:

  - "Falta pouco para bater a meta!"

  - "Não desista, você consegue!"

  - "Você está no caminho certo!"

  (Mudar conforme progresso)

- **Gráfico de progressão do dia**: Linha simples mostrando evolução temporal

### Painel Central (Gerenciamento de Lead)

- **Cabeçalho**: Mostrar "BEM VINDO, [NOME DO OPERADOR]"

- **Lead Atual em Atendimento**: 

  - Nome do lead

  - Telefone

  - Profissão/Setor

  - Badge "Lead novo" se aplicável

  

- **Etapas de Atendimento** (OBRIGATÓRIO passar por todas em ordem):

  1. **LIGAÇÃO NORMAL** - Botões: "NÃO ATENDEU" | "ATENDEU" (com timer em andamento)

  2. **LIGAÇÃO WhatsApp** - Botão "ENVIAR" para WhatsApp

  3. **MENSAGEM WhatsApp** - Botão "ENVIAR MENSAGEM"

  

- **Timer de Etapa**: Mostra tempo decorrido da etapa atual

- **Protocolo de Contato**: Mostrar qual etapa o lead está e dicas rápidas

- **Botão "Próximo Lead"**: Disponível apenas após completar todas as 3 etapas

- **Dica Rápida**: Caixa de sugestão ("Apresente-se, confirme o interesse...")

### Painel Direito (Oportunidades & Prioridades)

- **SEUS LEADS PRIORITÁRIOS** (Top 5-10):

  - Tabela com colunas: TOP | NOME | HORÁRIO DE RETORNO | STATUS

  - Status em cores: "Quente" (vermelho), "Morno" (amarelo), "Frio" (cinza)

  - Exemplo de dados:

    - 1. Matheus | 10:30 | Quente

    - 2. Felipe | 14:30 | Quente

    - etc.

  - Link "VER TODOS (38)" para expandir

- **FILA DE OPORTUNIDADES**:

  - Total de leads disponíveis (ex: 3.450 LEADS)

  - Leads em nutrição (ex: 2.760)

  - Leads nutridos hoje (ex: 150)

  - Leads para reativar (ex: 3.262)

- **TIMING DO PRÓXIMO LEAD**:

  - Mostrar em quanto tempo o próximo lead estará disponível (ex: 00:03)

  - Badge "AUTOMÁTICO" se a atribuição é automática

## 3. TOPBAR (Barra Superior)

- Logo do CRM à esquerda

- Título "FUNIL DE VENDAS" ao lado do logo

- Horário atual (relógio digital)

- **Botões à direita**:

  - "Cadastrar lead" (azul)

  - "Motivos de pausa" (laranja) - Dropdown para selecionar pausa pré-definida pelo admin

  - "Finalizar expediente" (vermelho)

## 4. SISTEMA DE PAUSAS

- Dropdown com opções de pausa pré-definidas (ex: "Almoço", "Café", "Banheiro", "Reunião")

- Operador seleciona pausa → Sistema registra hora de início

- Admin pode justificar/editar pausas após

- Pausas contam no relatório diário

## 5. ALERTAS E NOTIFICAÇÕES

Sistema deve notificar e piscar alertas (visual + sonoro) quando:

- ⚠️ Operador está demorando muito em uma etapa (ex: >5 min em ligação)

- ⚠️ Atrasando meta de hora (ex: deveria ter 8 contatos, tem 6)

- ⚠️ Demorando muito para ir pro próximo lead (ex: >2 min após completar etapas)

- Alertas aparecem como toast ou badge piscante na topbar

## 6. DADOS & COMPORTAMENTO

- Ao completar as 3 etapas → Lead é salvo e próximo é carregado automaticamente

- Cada interação registra timestamp

- Contador atualiza em tempo real

- Ritmo é calculado automaticamente (contatos / tempo trabalhado)

- Meta é comparada continuamente com progresso

## 7. RESPONSIVIDADE

- Design mobile-friendly (sidebar pode colapsar em mobile)

- Tabelas scrolláveis em telas pequenas

## 8. CORES & DESIGN

- Verde para ações positivas (botão ATENDEU, conversões)

- Vermelho para alertas/urgência

- Cinza neutro para informações

- Fonte clara, sem poluição visual

- Inspiração visual: Screenshot anexado do CRM Funil de Vendas

## 9. FEEDBACK VISUAL

- Animação suave ao trocar de lead

- Transição de cores ao atingir metas

- Confetti ou animação de sucesso ao bater meta diária (opcional)

- Loading state ao buscar próximo lead

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://crmfunnelbuilder.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/31b9d4eb-168c-433e-bbe8-c6aa65fd494f).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
