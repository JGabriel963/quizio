---
id: "045"
title: Créditos de IA
status: in-progress # draft | approved | planned | in-progress | done
contexts: [quiz, identity]
created: 2026-10-29
---

# 045 — Créditos de IA

## Contexto e problema

O assistente de criação (spec 027) limita o uso da IA por uma **cota de criações**: cada criador faz até 20 criações a cada 24 horas, e cada clique em Crie conta 1, qualquer que seja o tamanho. Mas o custo de uma criação no provedor varia muito. Um assunto de uma linha pedindo cerca de 5 perguntas usa poucas centenas de tokens; um PDF de 50 páginas pedindo cerca de 30 perguntas usa dezenas de vezes mais. Contar cliques é injusto com quem faz pedidos pequenos e frouxo com quem faz pedidos grandes. Pelo mesmo motivo, o teto diário da instância, que a auditoria de segurança de 2026-10-29 trouxe (200 criações de todos juntos), não acompanha o gasto real.

A auditoria (achados M2 e M3) já fechou os abusos da cota e mudou a spec 027, RN-31 e RN-33:
- a cota só volta quando o provedor não respondeu;
- cada criação tem um teto de tokens de saída;
- existe um teto da instância;
- a cota é reservada antes de o PDF ser lido;
- o uso de uma conta excluída continua contando.

Esta spec mantém tudo isso e troca a **unidade**: de criações para **créditos**, medidos pelo uso real que o provedor informa.

Ela altera a spec 027 (RN-31, RN-32 e RN-33) e a spec 039 (RN-17).

## Objetivo

Antes de criar, o criador vê quantos créditos a criação pode gastar e paga o que ela realmente usou. O orçamento diário gratuito rende muitas criações pequenas ou poucas grandes. Quem mantém a instância limita o gasto real de todos juntos e ajusta o peso dos créditos ao preço do modelo que usa.

## Personas

- **Criador (`Creator`)**: quem usa o assistente de criação no editor (kahoot-reference §1).
- **Quem mantém a instância**: quem instala e configura o Quizio e paga o provedor de IA. Não tem tela no Quizio; configura pelo ambiente da instância.

## Histórias de usuário

- **HU-01** — Como criador, quero saber antes de criar quantos créditos a criação vai gastar, para escolher as páginas e a duração dentro do que me resta.
- **HU-02** — Como criador, quero que uma criação pequena gaste pouco, para fazer várias no mesmo dia.
- **HU-03** — Como criador, quero ver quantos créditos usei e quando eles voltam, para planejar o uso.
- **HU-04** — Como quem mantém a instância, quero limitar o gasto diário real de todos os criadores e ajustar o peso dos créditos ao preço do meu modelo, para não ter surpresa na conta do provedor.

## Regras de negócio

### Créditos e orçamento

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | O **crédito de IA (`AiCredit`)** é a unidade do custo de uma criação, calculada a partir do uso que o provedor informa: os tokens de entrada (o assunto ou as páginas enviadas, mais as instruções) e os de saída (as perguntas escritas), com a saída pesando mais, como nos preços dos provedores. Com os pesos padrão, uma criação por um assunto curto com cerca de 10 perguntas custa **cerca de 1 crédito**. | decisão do usuário (2026-10-29) |
| RN-02 | Uma criação custa sempre um **número inteiro** de créditos, arredondado para cima, e **no mínimo 1**. | decisão do produto (2026-10-29) |
| RN-03 | Cada criador tem um **orçamento de créditos (`CreditBudget`)**: **20 créditos a cada 24 horas** (janela móvel), configurável pela instância. Os créditos de uma criação voltam 24 horas depois dela. Substitui a cota de criações da spec 027, RN-31. | spec 027, RN-31 · decisão do usuário (2026-10-29) |
| RN-04 | Os **pesos** que convertem o uso em créditos (crédito por mil tokens de entrada e por mil tokens de saída) são **configuráveis pela instância**, porque cada modelo tem um preço. Mudar os pesos vale para as próximas criações; as já cobradas não mudam. | constituição, artigo VI · decisão do usuário (2026-10-29) |
| RN-05 | Créditos **nunca são vendidos, comprados nem transferidos**. O orçamento é gratuito e existe só pelo custo do provedor de IA. | constituição, artigo VI |

### Estimativa e cobrança

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-06 | Antes do Crie, o assistente mostra a **estimativa da criação (`CreditEstimate`)**: **"Esta criação usa até N créditos"**. Ela é calculada a partir da fonte (o tamanho do texto do assunto ou o número de páginas escolhidas) e da Duração pedida, e se atualiza ao mudar a fonte, as páginas ou as opções. É o **máximo** que a criação pode cobrar. | decisão do usuário (2026-10-29) |
| RN-07 | O **teto de saída** de cada criação acompanha a Duração pedida (cerca de 5, 10, 20 ou 30 perguntas, ou até 30 na extração), para que a estimativa seja um máximo realista e não o de um caso extremo. | auditoria de segurança (2026-10-29) · decisão do produto (2026-10-29) |
| RN-08 | Ao clicar em Crie, a estimativa é **reservada** no orçamento do criador **antes de o PDF ser lido**. Se a estimativa passa do que resta, Crie fica indisponível com **"Esta criação precisa de até N créditos e restam M. Escolha menos páginas ou menos perguntas."** O servidor confere de novo ao reservar, porque o saldo pode ter mudado em outra aba. | decisão do usuário (2026-10-29) · spec 027, RN-31 |
| RN-09 | Quando o provedor responde, a criação cobra os créditos do **uso real**, **nunca mais que a estimativa**, e a diferença volta ao saldo na hora. O resultado diz quanto foi usado: **"Esta criação usou N créditos."** | decisão do usuário (2026-10-29) |
| RN-10 | **Falhas** (mantém a spec 027, RN-33). Nada é cobrado quando o provedor não respondeu (fora do ar, limite de uso, chave ou pedido recusado, falha do lado dele) ou quando o PDF se revela inválido. Quando o provedor respondeu fora do formato, cobra-se o uso que ele informou. Quando a resposta não chega no tempo limite, cobra-se a estimativa inteira, porque o uso não é conhecido. | spec 027, RN-33 · auditoria de segurança (2026-10-29) |
| RN-11 | Uma criação que o criador **abandona** (fecha ou volta durante a espera) continua no servidor e é cobrada como as outras, pelo uso real. | spec 027, RN-33 |
| RN-12 | **Extrair perguntas** (spec 027, RN-17) é cobrado como qualquer outra criação. | spec 027, RN-17 |

### Teto da instância

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-13 | O **teto da instância (`InstanceCreditCeiling`)** limita o gasto de todos os criadores juntos a **200 créditos a cada 24 horas** (janela móvel), configurável. Ele soma o **uso real**, inclusive a parte que passou da estimativa de alguma criação. Substitui o teto em criações da spec 027, RN-31. | auditoria de segurança (2026-10-29) · decisão do usuário (2026-10-29) |
| RN-14 | Uma criação só começa se a estimativa cabe no que resta do teto. Senão, Crie responde **"As criações com IA desta instância acabaram por hoje. Tente de novo mais tarde."** e nada é reservado. O teto **não aparece** em nenhuma tela enquanto não é atingido. | decisão do usuário (2026-10-29) |
| RN-15 | Os créditos gastos por uma **conta excluída** continuam contando no teto da instância até saírem da janela, sem vínculo com a pessoa. | auditoria de segurança (2026-10-29) |

### Onde aparece

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-16 | O painel lateral do assistente mostra **"Restam N créditos"** no lugar de "Restam N criações". Com o orçamento esgotado, Crie fica indisponível e o assistente diz **"Você usou os 20 créditos das últimas 24 horas. Os próximos voltam às HH:MM."** (a hora em que voltam os da criação mais antiga da janela). | spec 027, RN-32 |
| RN-17 | Em Configurações, **Acesso à IA** mostra **"{usados} de {orçamento} créditos nas últimas 24 horas"**, com a barra de progresso, e, quando há créditos gastos na janela, **"Os próximos créditos voltam {em quanto tempo}"**. Com o orçamento esgotado: **"Você usou todos os créditos das últimas 24 horas."** | spec 039, RN-17 |
| RN-18 | **Na troca**, cada criação já registrada nas últimas 24 horas vale **1 crédito**. Como o orçamento padrão continua 20, ninguém ganha nem perde nesse dia. | decisão do produto (2026-10-29) |
| RN-19 | Os **agentes de IA** (spec 044) continuam sem gastar créditos: eles escrevem as próprias perguntas, sem usar o provedor da instância. | spec 044 |
| RN-20 | Todos os textos das telas desta feature são em português do Brasil. | constituição, artigo IX |

## Critérios de aceite

### CA-01 — A estimativa aparece antes de criar

- **Dado** o assistente aberto com a fonte Assunto e "Sistema solar" no campo
- **Quando** o criador olha o painel antes de clicar em Crie
- **Então** vê "Esta criação usa até N créditos", com N a estimativa para esse texto e a Duração escolhida

### CA-02 — A estimativa acompanha a Duração e as páginas

- **Dado** a estimativa de uma criação com Duração "cerca de 10"
- **Quando** o criador muda a Duração para "cerca de 30"
- **Então** a estimativa aumenta
- **E**, com a fonte PDF, escolher 30 páginas em vez de 5 dá uma estimativa maior

### CA-03 — Cobra o uso real, arredondado para cima

- **Dado** um criador com 20 créditos e uma criação com estimativa de 4
- **Quando** a criação termina com um uso real equivalente a 1,3 crédito
- **Então** são cobrados 2 créditos e o painel mostra "Restam 18 créditos"
- **E** o resultado diz "Esta criação usou 2 créditos."

### CA-04 — Nunca cobra mais que a estimativa

- **Dado** uma criação com estimativa de 3
- **Quando** o uso real equivale a 5 créditos
- **Então** o criador paga 3
- **E** o teto da instância conta 5

### CA-05 — Saldo insuficiente

- **Dado** um criador com 4 créditos e uma criação de PDF com estimativa de 9
- **Quando** ele olha o botão Crie
- **Então** Crie está indisponível com "Esta criação precisa de até 9 créditos e restam 4. Escolha menos páginas ou menos perguntas."
- **E**, ao escolher menos páginas até a estimativa caber, Crie volta a ficar disponível

### CA-06 — O servidor confere o saldo

- **Dado** um criador com 5 créditos e o assistente aberto em duas abas, cada uma com uma criação de estimativa 4
- **Quando** ele clica em Crie nas duas ao mesmo tempo
- **Então** só uma criação começa
- **E** a outra mostra a mensagem de saldo insuficiente, sem cobrar nada

### CA-07 — Provedor sem resposta não cobra

- **Dado** o provedor de IA fora do ar
- **Quando** o criador clica em Crie
- **Então** vê "Não foi possível criar as perguntas agora. Tente de novo."
- **E** o saldo continua o mesmo

### CA-08 — PDF inválido não cobra

- **Dado** um PDF que o servidor não consegue abrir
- **Quando** o criador clica em Crie
- **Então** vê "Não foi possível abrir esse PDF."
- **E** o saldo continua o mesmo

### CA-09 — Tempo esgotado cobra a estimativa

- **Dado** uma criação com estimativa de 6
- **Quando** o provedor não responde dentro do tempo limite
- **Então** o criador vê a mensagem de falha
- **E** 6 créditos são cobrados

### CA-10 — Resposta fora do formato cobra o uso informado

- **Dado** uma criação com estimativa de 6
- **Quando** o provedor responde fora do formato, informando um uso equivalente a 2 créditos
- **Então** o criador vê a mensagem de falha
- **E** 2 créditos são cobrados

### CA-11 — Criação abandonada é cobrada pelo uso real

- **Dado** uma criação em andamento com estimativa de 6
- **Quando** o criador fecha o assistente antes do fim e o provedor termina com um uso equivalente a 3 créditos
- **Então** ao reabrir o assistente o painel mostra 3 créditos a menos

### CA-12 — Os créditos voltam em 24 horas

- **Dado** uma criação de 3 créditos ontem às 10:00
- **Quando** passam das 10:00 de hoje
- **Então** o saldo do criador sobe 3 créditos

### CA-13 — Orçamento esgotado

- **Dado** um criador que gastou os 20 créditos, o mais antigo às 09:30 de ontem
- **Quando** ele abre o assistente hoje antes das 09:30
- **Então** Crie está indisponível com "Você usou os 20 créditos das últimas 24 horas. Os próximos voltam às 09:30."

### CA-14 — Teto da instância atingido

- **Dado** o teto da instância de 200 créditos, com 198 gastos por todos nas últimas 24 horas
- **Quando** um criador com saldo clica em Crie numa criação de estimativa 4
- **Então** vê "As criações com IA desta instância acabaram por hoje. Tente de novo mais tarde."
- **E** nada é reservado

### CA-15 — O teto não aparece antes de ser atingido

- **Dado** o teto da instância longe de ser atingido
- **Quando** o criador abre o assistente e Acesso à IA
- **Então** nenhuma tela menciona o teto da instância

### CA-16 — Conta excluída continua contando

- **Dado** um criador que gastou 10 créditos e excluiu a conta
- **Quando** outro criador tenta criar nas mesmas 24 horas
- **Então** o teto da instância ainda conta os 10 créditos até saírem da janela

### CA-17 — Pesos configurados pela instância

- **Dado** a instância com os pesos dobrados
- **Quando** o criador prepara uma criação igual a uma anterior
- **Então** a estimativa e a cobrança dobram
- **E** as criações já cobradas não mudam

### CA-18 — Acesso à IA em créditos

- **Dado** um criador que gastou 7 créditos nas últimas 24 horas
- **Quando** ele abre Configurações › Acesso à IA
- **Então** vê "7 de 20 créditos nas últimas 24 horas", com a barra, e quando os próximos créditos voltam

### CA-19 — Troca de cota para créditos

- **Dado** um criador com 3 criações registradas nas últimas 24 horas antes da troca
- **Quando** ele abre o assistente depois da troca
- **Então** vê "Restam 17 créditos"

### CA-20 — A extração é cobrada

- **Dado** um PDF com perguntas e a opção Extrair perguntas
- **Quando** o criador extrai as perguntas
- **Então** a extração mostra a estimativa antes e cobra o uso real depois, como as outras criações

### CA-21 — Agentes de IA não gastam créditos

- **Dado** um agente conectado (spec 044) que adiciona perguntas a um quiz
- **Quando** o criador abre o assistente
- **Então** o saldo de créditos é o mesmo de antes

## Experiência (telas e estados)

**Painel lateral do assistente.** No lugar de "Restam N criações", **"Restam N créditos"**. Logo acima do Crie (ou ao lado dele, na barra da fonte), a estimativa: **"Esta criação usa até N créditos"**. Ela aparece quando há algo para criar (um assunto escrito ou páginas escolhidas) e se atualiza ao mudar a fonte, as páginas ou as opções. No celular, a estimativa fica junto do botão Crie fixo embaixo.

**Saldo insuficiente.** Crie fica indisponível, e no lugar da estimativa aparece "Esta criação precisa de até N créditos e restam M. Escolha menos páginas ou menos perguntas.". Na tela de páginas do PDF, a estimativa acompanha a seleção, para o criador ver quando ela passa a caber.

**Resultado.** Na faixa verde "Suas perguntas estão prontas! Revise-as antes de prosseguir.", acrescenta-se **"Esta criação usou N créditos."**, e o painel mostra o saldo novo.

**Orçamento esgotado.** Como hoje (spec 027), no lugar da grade, sem perder o que foi escrito: "Você usou os 20 créditos das últimas 24 horas. Os próximos voltam às HH:MM."

**Teto da instância.** Só aparece quando atingido, como mensagem no lugar da grade: "As criações com IA desta instância acabaram por hoje. Tente de novo mais tarde."

**Configurações › Acesso à IA.** O mesmo cartão de hoje, em créditos: "{usados} de {orçamento} créditos nas últimas 24 horas", a barra e "Os próximos créditos voltam {em quanto tempo}".

## Divergências intencionais do Kahoot

- **Créditos gratuitos.** O Kahoot vende créditos de IA. No Quizio, os créditos são um orçamento diário gratuito que existe só pelo custo do provedor, e nunca são vendidos (constituição, artigo VI). Como o Kahoot calcula o custo de uma criação em créditos é **(não confirmado)**; o Quizio usa o uso real informado pelo provedor.

## Fora de escopo

- Comprar, vender ou transferir créditos.
- Orçamento diferente por criador, ou uma tela de administração para quem mantém a instância.
- Mostrar o custo em dinheiro.
- Histórico detalhado das criações e dos créditos de cada uma.
- Avisar quem mantém a instância quando o teto se aproxima.
- Créditos para os agentes de IA (spec 044), que não usam o provedor da instância.

## Perguntas em aberto

- [ ] **Valores padrão e pesos.** 20 créditos por criador, 200 da instância e os pesos que fazem "uma criação por assunto com cerca de 10 perguntas ≈ 1 crédito" dependem do custo real no provedor escolhido. Medir antes de implementar (a mesma pergunta em aberto da spec 027, sobre os valores da cota).
- [ ] **Inteiro ou décimos.** Com créditos inteiros (RN-02), uma criação bem pequena custa 1 mesmo usando menos. Décimos ("0,4 crédito") seriam mais justos e mais difíceis de ler. Decidido inteiro pela simplicidade; rever depois de medir.
- [ ] **Estimativa do PDF.** Um PDF escaneado vai ao modelo como imagem e pode usar mais tokens por página que um PDF de texto. Se a estimativa por página não bastar, o criador paga só a estimativa (RN-09), mas o teto da instância conta o uso real (RN-13). Ver no plano se vale estimar pelo tipo de página.

## Changelog

- 2026-10-29 — spec criada depois da auditoria de segurança (achados M2 e M3). Decisões do usuário: escala em que uma criação típica vale cerca de 1 crédito, recusar a criação quando a estimativa passa do saldo, e o teto da instância só aparece quando é atingido.
- 2026-10-29 — implementada (T01 a T14; ADR 0024). Sem mudar as regras:
  - a estimativa aparece abaixo do campo do assunto e no rodapé da tela de páginas, junto do Crie; o saldo segue no painel lateral, que no celular começa recolhido;
  - `get_account` (spec 044) passou a dizer `creditsPerDay`, `creditsUsed` e `creditsLeft`;
  - as variáveis antigas valem como reserva das novas.

  Falta calibrar as constantes e os pesos com o provedor real (perguntas em aberto).
