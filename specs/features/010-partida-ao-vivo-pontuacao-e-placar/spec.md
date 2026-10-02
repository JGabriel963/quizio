---
id: "010"
title: Partida ao vivo 3/4 — Pontuação e placar
status: done # draft | approved | planned | in-progress | done
contexts: [game]
created: 2026-10-01
---

# 010 — Partida ao vivo 3/4: Pontuação e placar

## Contexto e problema

A spec 009 entregou o ciclo da pergunta: o anfitrião conduz, os jogadores respondem e cada um fica sabendo se acertou. Mas ainda não há competição: ninguém ganha pontos, e entre uma pergunta e outra não se sabe quem está na frente.

Esta etapa entrega o que faz do quiz um jogo: pontos por acerto e por velocidade, a sequência de acertos e o placar entre as perguntas.

| Spec | Etapa |
| --- | --- |
| 008 | Lobby ✅ |
| 009 | Ciclo da pergunta ✅ |
| **010** | **Pontuação, sequência e placar (esta spec)** |
| 011 | Fim de jogo e pódio |

A referência visual são as capturas de um jogo de verdade no Kahoot, enviadas pelo usuário em 2026-10-01: o resultado no celular com "+ 639", "Sequência de respostas" e "Você está no pódio!", o total de pontos no rodapé, e o placar do anfitrião entre as perguntas.

## Objetivo

Cada resposta correta rende pontos, mais para quem responde mais rápido. Na revelação, o jogador vê quanto ganhou, a sua sequência de acertos e a sua posição. Depois de cada pergunta, a tela do anfitrião mostra o placar com os cinco primeiros.

## Personas

- **Anfitrião (`Host`)** — mostra o placar para a turma entre as perguntas.
- **Jogador (`Player`)** — acompanha os próprios pontos e a posição no celular.

## Histórias de usuário

- **HU-01** — Como jogador, quero ganhar mais pontos quando respondo rápido, para que a velocidade conte.
- **HU-02** — Como jogador, quero ver quantos pontos ganhei em cada pergunta e o meu total, para acompanhar o meu jogo.
- **HU-03** — Como jogador, quero ver a minha sequência de acertos, para me animar a mantê-la.
- **HU-04** — Como jogador, quero saber em que posição estou, para saber quanto falta para subir.
- **HU-05** — Como anfitrião, quero mostrar o placar depois de cada pergunta, para a turma ver quem está na frente.
- **HU-06** — Como criador, quero que "Pontos em dobro" e "Sem pontos" valham na partida, para dar peso diferente às perguntas.

## Regras de negócio

### Pontos de uma resposta

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Uma resposta **correta** rende `arredondar((1 − (tempo de resposta ÷ limite de tempo) ÷ 2) × pontos possíveis)`. Os pontos possíveis são **1000** na pergunta padrão e **2000** em "Pontos em dobro". | kahoot-reference §5.2, §5.3 |
| RN-02 | Uma resposta correta em **menos de 0,5 segundo** rende sempre o máximo de pontos. | kahoot-reference §5.3 |
| RN-03 | Uma resposta **incorreta**, ou a falta de resposta, rende **0**. Ninguém perde pontos. | kahoot-reference §5.3 |
| RN-04 | Numa pergunta **"Sem pontos"**, toda resposta rende 0. A correção continua valendo: o jogador vê se acertou, e o acerto conta para a sequência (RN-10). | kahoot-reference §5.2 · sequência: decisão do produto (2026-10-01) |
| RN-05 | O tempo de resposta é o medido no servidor (spec 009, RN-18). Uma resposta aceita dentro da tolerância de latência conta como dada no fim do tempo: metade dos pontos possíveis. | spec 009, RN-18 · kahoot-reference §5.3 |
| RN-06 | Numa pergunta de **múltipla escolha**, os pontos são **por alternativa correta marcada**: cada uma vale os pontos possíveis, reduzidos pelo mesmo fator de tempo, e o total é arredondado uma vez. Marcar qualquer alternativa errada rende 0. Enquanto o celular envia uma alternativa só (spec 009, RN-16), uma resposta parcialmente correta rende o mesmo que uma pergunta comum. | kahoot-reference §5.4 |
| RN-07 | Os pontos são calculados **no servidor, quando a resposta chega**, e guardados com ela. Não mudam depois, e o dispositivo nunca os calcula nem os informa. | constituição, artigo V |
| RN-08 | O **total** de um jogador é a soma dos pontos das respostas dele. Todo jogador começa com 0. | kahoot-reference §5.7 |
| RN-09 | Pontos, total e posição **só são divulgados a partir da revelação** da pergunta. Durante a fase de respostas e a espera, nenhuma tela mostra quanto uma resposta rendeu. | constituição, artigo V · spec 009, RN-21 |

### Sequência de acertos

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-10 | A **sequência de acertos (`AnswerStreak`)** de um jogador é o número de perguntas seguidas em que a resposta dele foi correta ou parcialmente correta. Uma resposta incorreta, ou a falta de resposta, zera a sequência. | kahoot-reference §5.5 · parcialmente correta: decisão do produto (2026-10-01) |
| RN-11 | A sequência **não dá pontos**: é só exibida. | kahoot-reference §5.5 |

### Resultado no celular

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-12 | Na revelação, quem acertou vê **"Correto"** (ou "Parcialmente correto"), a **sequência** ("Sequência de respostas" com o número) e os pontos ganhos na pergunta (**"+ 639"**). Altera a spec 009, RN-25. | referência visual do Kahoot |
| RN-13 | Quem errou continua vendo "Incorreto" com "Boa tentativa!", e quem não respondeu, "Tempo esgotado" com "Ainda não acabou!", sem pontos e sem sequência. | spec 009, RN-25 |
| RN-14 | Numa pergunta "Sem pontos", quem acertou vê "Correto" e a sequência, sem a faixa de pontos. | decisão do produto (2026-10-01) |
| RN-15 | Abaixo do resultado, o jogador vê a **posição** dele depois da pergunta: **"Você está no pódio!"** se está entre os três primeiros; senão, **"Você está em 5º lugar"** e a distância para quem está logo à frente (**"120 pontos atrás de Bia"**). | referência visual do Kahoot · texto fora do pódio: kahoot-reference §6.4 (não confirmado) |
| RN-16 | O rodapé do celular mostra o **total de pontos** do jogador ao lado do apelido, durante todo o jogo. O total só muda na revelação (RN-09). | referência visual do Kahoot |

### Placar

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-17 | Cada pergunta ganha uma quarta fase, o **placar (`scoreboard`)**, depois da revelação: Avançar na revelação leva ao placar, e Avançar no placar leva à abertura da pergunta seguinte. Altera a spec 009, RN-06 e RN-11. | kahoot-reference §6.4 · referência visual do Kahoot |
| RN-18 | O placar mostra os **cinco primeiros** jogadores, com apelido e total de pontos, do maior para o menor. O primeiro aparece em destaque. | kahoot-reference §6.4 · referência visual do Kahoot |
| RN-19 | Jogadores com o **mesmo total** ficam na ordem em que entraram na partida, e cada um tem a sua posição (não há posição dividida). | decisão do produto (2026-10-01) |
| RN-20 | Quem **subiu de posição** em relação ao placar da pergunta anterior leva uma seta para cima. No placar da primeira pergunta ninguém leva seta. | referência visual do Kahoot |
| RN-21 | O placar **não tem tempo**: fica até o anfitrião avançar. Durante o placar, o celular continua mostrando o resultado da pergunta. | referência visual do Kahoot |
| RN-22 | O placar aparece depois de **toda** pergunta, inclusive das "Sem pontos". | kahoot-reference §6.4 |
| RN-23 | Depois da **última pergunta** também há placar, e Avançar nele termina a partida (spec 009, RN-30). É provisório: a spec 011 põe o pódio no lugar. | decisão do produto (2026-10-01) |
| RN-24 | O placar segue as regras de condução da spec 009: a tela do anfitrião pede a transição, o servidor a aplica uma única vez (RN-12), e recarregar a tela mostra o placar de novo (RN-32). | spec 009, RN-12, RN-32 |

## Critérios de aceite

### Pontos

#### CA-01 — Fórmula por velocidade

- **Dado** uma pergunta padrão de 20 segundos
- **Quando** um jogador responde certo aos 5 segundos, e outro aos 12 segundos
- **Então** o primeiro ganha 875 pontos e o segundo, 700

#### CA-02 — Exemplo oficial

- **Dado** uma pergunta padrão de 30 segundos
- **Quando** um jogador responde certo aos 2 segundos
- **Então** ganha 967 pontos

#### CA-03 — Resposta muito rápida

- **Dado** uma pergunta padrão de 20 segundos
- **Quando** um jogador responde certo aos 0,3 segundo
- **Então** ganha 1000 pontos

#### CA-04 — No último instante

- **Dado** uma pergunta padrão de 20 segundos
- **Quando** um jogador responde certo aos 19,9 segundos, e outro aos 20,3 segundos, dentro da tolerância
- **Então** o primeiro ganha 503 pontos e o segundo, 500

#### CA-05 — Pontos em dobro

- **Dado** uma pergunta de 20 segundos com "Pontos em dobro"
- **Quando** um jogador responde certo aos 5 segundos
- **Então** ganha 1750 pontos

#### CA-06 — Sem pontos

- **Dado** uma pergunta "Sem pontos"
- **Quando** um jogador responde certo
- **Então** ganha 0 pontos, vê "Correto" sem a faixa de pontos, e a sequência dele aumenta

#### CA-07 — Errou ou não respondeu

- **Dado** uma pergunta padrão
- **Quando** um jogador responde errado no primeiro segundo, e outro não responde
- **Então** os dois ganham 0, e o total de cada um não muda

#### CA-08 — Múltipla escolha

- **Dado** uma pergunta de múltipla escolha de 30 segundos, com três alternativas corretas e uma errada
- **Quando** chegam, aos 8 segundos, uma resposta com as três corretas, uma com duas corretas e uma com duas corretas e a errada
- **Então** elas rendem 2600, 1733 e 0 pontos

#### CA-09 — Pontos não mudam depois

- **Dado** uma resposta que rendeu 875 pontos
- **Quando** a partida avança para as perguntas seguintes
- **Então** essa resposta continua valendo 875, e o total do jogador é a soma das respostas dele

#### CA-10 — Nada vaza antes da revelação

- **Dado** a fase de respostas, com um jogador que já respondeu
- **Quando** se examina tudo o que os dispositivos recebem
- **Então** não há pontos da resposta, nem total ou posição que já a inclua

### Sequência

#### CA-11 — Sequência cresce e zera

- **Dado** um jogador que acertou as perguntas 1 e 2
- **Quando** ele acerta a 3, erra a 4 e acerta a 5
- **Então** a sequência dele é 3 depois da pergunta 3, 0 depois da 4 e 1 depois da 5

#### CA-12 — Sem resposta zera

- **Dado** um jogador com sequência 2
- **Quando** ele não responde a pergunta seguinte
- **Então** a sequência dele volta a 0

#### CA-13 — Sequência não dá pontos

- **Dado** dois jogadores que respondem certo no mesmo instante, um com sequência 4 e outro com sequência 0
- **Quando** os pontos são calculados
- **Então** os dois ganham os mesmos pontos

### Resultado no celular

#### CA-14 — Acertou

- **Dado** um jogador que acertou as duas primeiras perguntas e ganhou 639 pontos na segunda
- **Quando** a revelação da segunda aparece
- **Então** ele vê "Correto", "Sequência de respostas" com 2, e "+ 639"
- **E** o rodapé mostra o novo total dele

#### CA-15 — Errou

- **Dado** um jogador que errou a pergunta
- **Quando** a revelação aparece
- **Então** ele vê "Incorreto" e "Boa tentativa!", sem pontos e sem sequência
- **E** o total no rodapé não muda

#### CA-16 — No pódio

- **Dado** um jogador em 2º lugar depois da pergunta
- **Quando** a revelação aparece
- **Então** ele vê "Você está no pódio!"

#### CA-17 — Fora do pódio

- **Dado** um jogador em 5º lugar com 1500 pontos, e a jogadora Bia em 4º com 1620
- **Quando** a revelação aparece
- **Então** ele vê "Você está em 5º lugar" e "120 pontos atrás de Bia"

#### CA-18 — Total no rodapé

- **Dado** um jogador com 1354 pontos, na fase de respostas da pergunta seguinte
- **Quando** ele responde
- **Então** o rodapé continua mostrando 1354 até a revelação

#### CA-19 — Recarregar na revelação

- **Dado** um jogador que vê "Correto" e "+ 701"
- **Quando** ele recarrega a página
- **Então** vê de novo o resultado, os pontos, a sequência, a posição e o total

### Placar

#### CA-20 — Depois da revelação vem o placar

- **Dado** a revelação da pergunta 1 de uma partida de 3 perguntas
- **Quando** o anfitrião aciona Avançar
- **Então** a tela dele mostra o placar, e os celulares continuam mostrando o resultado
- **E** Avançar no placar leva à abertura da pergunta 2

#### CA-21 — Cinco primeiros

- **Dado** uma partida com sete jogadores com totais diferentes
- **Quando** o placar aparece
- **Então** mostra os cinco de maior total, do maior para o menor, com apelido e pontos, e o primeiro em destaque

#### CA-22 — Menos de cinco jogadores

- **Dado** uma partida com dois jogadores, um com 639 pontos e outro com 0
- **Quando** o placar aparece
- **Então** mostra os dois, o de 639 em primeiro

#### CA-23 — Empate

- **Dado** dois jogadores com o mesmo total
- **Quando** o placar aparece
- **Então** quem entrou primeiro na partida fica à frente

#### CA-24 — Quem subiu

- **Dado** um jogador em 2º lugar depois da pergunta 1
- **Quando** ele passa para 1º depois da pergunta 2
- **Então** o placar da pergunta 2 mostra a seta para cima ao lado dele, e não ao lado de quem desceu

#### CA-25 — Primeiro placar sem setas

- **Dado** o placar da pergunta 1
- **Quando** o anfitrião olha a tela
- **Então** ninguém leva seta

#### CA-26 — Placar não avança sozinho

- **Dado** o placar na tela
- **Quando** passam dois minutos sem o anfitrião avançar
- **Então** o placar continua na tela

#### CA-27 — Avançar duas vezes

- **Dado** a revelação da pergunta 1
- **Quando** o pedido de avançar chega duas vezes seguidas
- **Então** a partida está no placar da pergunta 1, não na abertura da pergunta 2

#### CA-28 — Recarregar no placar

- **Dado** o placar da pergunta 2 na tela
- **Quando** o anfitrião recarrega a página
- **Então** vê o mesmo placar, com as mesmas setas

#### CA-29 — Placar da última pergunta

- **Dado** a revelação da última pergunta
- **Quando** o anfitrião aciona Avançar, e depois Avançar de novo
- **Então** vê o placar final e, em seguida, "Fim do jogo"

#### CA-30 — Placar numa pergunta sem pontos

- **Dado** uma pergunta "Sem pontos" depois de duas perguntas com pontos
- **Quando** o anfitrião avança da revelação
- **Então** o placar aparece com os mesmos totais e a mesma ordem de antes, sem setas

#### CA-31 — Partida do exemplo

- **Dado** três perguntas de 20 segundos, a terceira em dobro, com Ana e Beto
- **Quando** Ana acerta aos 4, 10 e 16 segundos, e Beto acerta aos 0,4 segundo, erra e acerta aos 2 segundos
- **Então** o placar final mostra Beto com 2900 e Ana com 2850
- **E** a sequência de Ana é 3 e a de Beto é 1

## Experiência (telas e estados)

As telas seguem as capturas do jogo de verdade, no tema escuro do Quizio.

- **Resultado (jogador), acertou**: "Correto" e o sinal de certo; "Sequência de respostas" com o número num círculo laranja; a faixa escura com "+ 639"; e, embaixo, a posição ("Você está no pódio!").
- **Resultado (jogador), errou ou tempo esgotado**: como na spec 009, com a posição embaixo da faixa.
- **Rodapé do celular**: o apelido e, ao lado, o total de pontos numa etiqueta.
- **Placar (anfitrião)**: "Avançar" à direita, no lugar em que fica na revelação; ao centro, uma lista de até cinco faixas com apelido à esquerda e pontos à direita. A primeira é branca; as outras, roxas. Quem subiu leva uma seta para cima depois dos pontos. Não mostra o enunciado nem as alternativas.
- **Estados novos**: placar; e a revelação do celular com pontos, sequência e posição.

## Divergências intencionais do Kahoot

- **Sem avatar** no placar e no resultado (spec 008).
- **Sem a seta de voltar** ao lado de Avançar no placar (spec 009).
- **Sem mensagens de celebração** no placar (jogador em sequência, quem subiu três posições): só a seta de quem subiu.
- **Sem animação** de troca de posições no placar.
- **Placar depois da última pergunta** (RN-23): no Kahoot a última pergunta vai direto para o pódio. Aqui o placar final faz esse papel até a spec 011.
- **Sequência conta em pergunta "Sem pontos"** (RN-04) e **com resposta parcialmente correta** (RN-10): o Kahoot não documenta esses casos.
- **Empate pela ordem de entrada** (RN-19): o Kahoot não documenta o desempate.

## Fora de escopo

- Pódio, tela final do jogador e menu final do anfitrião (spec 011).
- Como o jogador escolhe mais de uma alternativa na múltipla escolha (em aberto na spec 009).
- Bônus de pontos por sequência, modo Precisão e modo equipe.
- Relatórios com os pontos por jogador e por pergunta (spec 015).
- Avatares, reações e mensagens de celebração.

## Perguntas em aberto

- [ ] **Posição fora do pódio** (RN-15) — as capturas só mostram "Você está no pódio!". O texto para quem está do 4º lugar em diante ("Você está em 5º lugar", "120 pontos atrás de Bia") é uma proposta.
- [ ] **Desempate** (RN-19) — ordem de entrada na partida. A alternativa é quem respondeu mais rápido no total.
- [ ] **Placar depois da última pergunta** (RN-23) — proposto para o jogo não acabar sem mostrar quem ganhou. A spec 011 decide se ele fica antes do pódio.
- [ ] **"Sem pontos" e a sequência** (RN-04, RN-14) — o acerto conta para a sequência, e o celular não mostra a faixa de pontos.

## Changelog

- 2026-10-01 — spec criada, com as capturas de um jogo de verdade no Kahoot enviadas pelo usuário. Decisões tomadas sem consulta prévia, listadas nas perguntas em aberto: texto da posição fora do pódio (RN-15), desempate pela ordem de entrada (RN-19), placar depois da última pergunta (RN-23), sequência em pergunta sem pontos e com resposta parcialmente correta (RN-04, RN-10).
- 2026-10-01 — aprovada pelo usuário, com as decisões em aberto mantidas como propostas.
- 2026-10-01 — implementada. Sem mudança de regra. Um ajuste de texto: os pontos aparecem sem separador de milhar ("+ 1750"), como nas capturas do Kahoot.
- 2026-10-01 — alterada pela spec 011: a última pergunta não tem mais placar (RN-23, CA-29), a revelação dela leva direto ao pódio; e o placar passa a ser animado (deixa de valer a divergência "Sem animação de troca de posições").
