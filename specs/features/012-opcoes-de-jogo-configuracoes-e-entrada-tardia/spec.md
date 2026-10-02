---
id: "012"
title: Opções de jogo 1/3 — Configurações, entrada durante o jogo, perguntas no celular e ordem aleatória
status: done # draft | approved | planned | in-progress | done
contexts: [game]
created: 2026-10-02
---

# 012 — Opções de jogo 1/3: Configurações, entrada durante o jogo, perguntas no celular e ordem aleatória

## Contexto e problema

A partida ao vivo está completa (specs 008 a 011), mas o anfitrião não tem como ajustá-la: toda partida é igual. Três faltas aparecem logo que se joga com um grupo de verdade:

- quem chega atrasado encontra "Este jogo já começou." e fica de fora;
- as perguntas e as alternativas saem sempre na mesma ordem, e quem joga o mesmo quiz de novo decora as posições;
- o celular mostra só cores e formas, e quem não enxerga bem a tela do anfitrião (sala grande, jogo à distância) não consegue ler a pergunta;
- numa pergunta de múltipla escolha, o celular só deixa enviar uma alternativa (em aberto desde a spec 009).

No Kahoot, tudo isso fica num painel de **Configurações**, aberto pela engrenagem do cabeçalho, no lobby e durante o jogo. O cabeçalho também mostra o endereço e o PIN o jogo inteiro, justamente para quem chega depois.

O que estava previsto como "robustez e opções de jogo" passa a ser entregue em três etapas:

| Spec | Etapa |
| --- | --- |
| **012** | **Painel de configurações, entrada durante o jogo, perguntas nos dispositivos, múltipla escolha no celular e ordem aleatória (esta spec)** |
| 013 | Robustez: encerrar antes indo ao pódio, anfitrião ou jogador que cai |
| 014 | Reprodução automática, gerador e filtro de apelidos, música |

A referência visual são as capturas de um jogo de verdade no Kahoot, enviadas pelo usuário em 2026-10-02: o painel "Configurações", o cabeçalho com o PIN, o celular com as perguntas ligadas (abertura da pergunta, Quiz com imagem, Verdadeiro ou falso) e desligadas, e a tela de múltipla escolha com os marcadores e o botão de enviar.

## Objetivo

O anfitrião abre as Configurações pelo cabeçalho, no lobby ou durante o jogo, e decide se a entrada está bloqueada, se as perguntas aparecem nos celulares e se perguntas e alternativas saem em ordem aleatória. Enquanto a entrada não estiver bloqueada, quem chega atrasado entra pelo PIN que fica no cabeçalho. Numa pergunta de múltipla escolha, o jogador marca várias alternativas e envia.

## Personas

- **Anfitrião (`Host`)** — ajusta a partida ao grupo e ao lugar em que está jogando.
- **Jogador (`Player`)** — entra mesmo atrasado e, se o anfitrião quiser, lê a pergunta no próprio celular.

## Histórias de usuário

- **HU-01** — Como anfitrião, quero um painel de configurações no cabeçalho, para ajustar a partida sem sair dela.
- **HU-02** — Como anfitrião, quero que as minhas configurações valham para as próximas partidas, para não refazê-las toda vez.
- **HU-03** — Como jogador, quero entrar numa partida que já começou, para não ficar de fora por chegar atrasado.
- **HU-04** — Como anfitrião, quero bloquear a entrada a qualquer momento, para decidir até quando aceito gente nova.
- **HU-05** — Como jogador, quero ler a pergunta e as alternativas no celular, para jogar mesmo sem enxergar bem a tela do anfitrião.
- **HU-06** — Como anfitrião, quero perguntas e alternativas em ordem aleatória, para o mesmo quiz render mais de uma partida.
- **HU-07** — Como jogador, quero marcar mais de uma alternativa numa pergunta de múltipla escolha, para poder acertar a resposta inteira.

## Regras de negócio

### Painel de configurações

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | O cabeçalho da tela do anfitrião ganha o botão **Configurações** (engrenagem), ao lado da tela cheia, **no lobby e durante o jogo**. No pódio ele não aparece: a partida já terminou. Altera a spec 008 (divergência "sem configurações no cabeçalho"). | referência visual do Kahoot · kahoot-reference §6.1 |
| RN-02 | O botão abre o painel **"Configurações"** na lateral, por cima da tela, sem parar o jogo: os prazos continuam correndo e a tela continua avançando. O X, Esc ou um clique fora o fecham. | referência visual do Kahoot |
| RN-03 | O painel tem quatro chaves, cada uma com uma linha de explicação: **"Mostrar perguntas nos dispositivos"**, **"Bloquear jogo"**, **"Mostrar perguntas em ordem aleatória"** e **"Mostrar respostas em ordem aleatória"**. Só aparecem opções que funcionam. | referência visual do Kahoot · decisão do produto (2026-10-02) |
| RN-04 | Mudar uma chave vale **na hora**, sem botão de salvar. Se a mudança falhar, a chave volta ao que era, com um aviso. | decisão do produto (2026-10-02) |
| RN-05 | As **opções de jogo (`GameOptions`)** de mostrar perguntas e de ordem aleatória ficam **salvas para o criador**: a próxima partida que ele organizar, de qualquer quiz, começa com elas. O painel diz, no rodapé: "Suas configurações serão salvas para a próxima vez." | kahoot-reference §6.1 ("ficam salvas") · referência visual do Kahoot |
| RN-06 | **"Bloquear jogo" não é salvo**: vale só para aquela partida, e toda partida nova começa desbloqueada. | spec 008, RN-23 · decisão do produto (2026-10-02) |
| RN-07 | Um criador que nunca mexeu nas configurações começa com as três opções salvas **desligadas**. | kahoot-reference §6.2 ("desligado por padrão ao vivo") |

### Bloquear o jogo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-08 | "Bloquear jogo" é a **entrada bloqueada** da spec 008 (RN-23 a RN-26): a chave do painel e o cadeado do lobby mostram o mesmo estado e mudam juntos. | spec 008 · referência visual do Kahoot |
| RN-09 | O bloqueio pode ser ligado e desligado **durante o jogo**, pelo painel. | kahoot-reference §6.2 ("Lock game joining") |

### Entrada durante o jogo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-10 | Com a partida em andamento e a entrada **não bloqueada**, quem chega **entra**, por PIN, link ou QR, com as mesmas regras do lobby: apelido único, limite de jogadores, apelido removido bloqueado. Altera a spec 009, RN-03: "Este jogo já começou." deixa de existir. | kahoot-reference §6.3, §9 ("entrada tardia") · decisão do usuário (2026-10-02) |
| RN-11 | Durante o jogo, o cabeçalho do anfitrião mostra **"Entre em {endereço}"** com o **PIN**, à esquerda, e um botão de **QR code** que o expande como no lobby (spec 008, RN-15). No pódio não mostra: o PIN já está livre. | referência visual do Kahoot |
| RN-12 | Com a entrada bloqueada, o cabeçalho troca o endereço e o PIN por um cadeado e **"Jogo bloqueado"**, e quem tenta entrar vê a mensagem da spec 008, RN-25. | spec 008, RN-25, RN-26 |
| RN-13 | Quem entra **antes de as respostas da pergunta abrirem** (na abertura da partida ou da pergunta) joga essa pergunta. Quem entra **da fase de respostas em diante** vê **"Você entrou! Aguarde a próxima pergunta."** e joga a partir da seguinte. | decisão do usuário (2026-10-02) · detalhe: decisão do produto (2026-10-02) |
| RN-14 | Quem entra no meio começa com **0 pontos**. As perguntas que perdeu contam como **sem resposta**: não rendem pontos nem sequência, e não aparecem para ele como "Tempo esgotado". | kahoot-reference §9 · spec 010, RN-03, RN-10 |
| RN-15 | Quem entra no meio entra na **classificação** na hora, no último lugar entre os de mesmo total (a ordem de entrada desempata, spec 010, RN-19), e conta no total de jogadores do cabeçalho. | spec 010, RN-19 |
| RN-16 | A fase de respostas fecha quando **todos os que podem responder aquela pergunta** responderam: quem entrou depois de as respostas abrirem não é esperado. Precisa a spec 009, RN-10. | spec 009, RN-10 · decisão do produto (2026-10-02) |
| RN-17 | Quem entra durante a **última pergunta**, depois de as respostas abrirem, espera e vai ao fim de jogo com os demais, com 0 pontos. Numa partida **terminada** ninguém entra: o PIN não é mais reconhecido (spec 011, RN-02). | spec 011, RN-02 |

### Mostrar perguntas nos dispositivos

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-18 | **"Mostrar perguntas nos dispositivos"** é uma chave só: ligada, o celular mostra a pergunta **e** os textos das respostas; desligada, nenhum dos dois. Altera a spec 009, RN-14 e RN-15. | kahoot-reference §6.2 (`showQuestionsOnDevices`) · observação do usuário no Kahoot (2026-10-02) |
| RN-18a | Ligada, na **abertura da pergunta** o celular mostra o **enunciado** em destaque e a barra do tempo de leitura, no lugar de "Pergunta 3" e "Preparar…". | referência visual do Kahoot (captura de 2026-10-02) |
| RN-18b | Ligada, na **fase de respostas** o celular mostra, de cima para baixo: a **imagem da pergunta**, se houver, com o recorte e o texto alternativo; o **enunciado** numa faixa; os botões, cada um com a **forma pequena no canto** e o **texto da alternativa** ao centro; e uma **barra de tempo** com os segundos que restam. No Verdadeiro ou falso, os botões dizem "Verdadeiro" e "Falso". | referência visual do Kahoot (capturas de 2026-10-02) |
| RN-19 | Desligado, o celular continua como na spec 009: só cor e forma. | spec 009, RN-14 |
| RN-20 | O celular **nunca** mostra qual alternativa é a certa, com a opção ligada ou não. A imagem aparece no celular só com a opção ligada, e do mesmo jeito para as duas posições do editor (ao centro e como fundo). Altera a spec 009, RN-28. | spec 009, RN-21, RN-26 · constituição, artigo V · posição da imagem: decisão do produto (2026-10-02) |
| RN-21 | A opção pode mudar **durante o jogo** e vale a partir da **próxima fase** que os celulares mostrarem. | kahoot-reference §6.1 ("durante o jogo") · decisão do produto (2026-10-02) |

### Ordem aleatória

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-22 | Com **"Mostrar perguntas em ordem aleatória"** ligado, a ordem das perguntas é sorteada **ao iniciar** a partida e vale para ela inteira, igual em todas as telas. "Pergunta 1 de 10" segue a ordem sorteada. | kahoot-reference §6.2 (`randomizeQuestions`) |
| RN-23 | Com **"Mostrar respostas em ordem aleatória"** ligado, a posição das alternativas de cada pergunta (e, com ela, a cor e a forma) é sorteada **ao iniciar** a partida e vale para ela inteira, igual na tela do anfitrião e em todos os celulares. Altera a spec 009, RN-14 (cor e forma da posição no editor). | kahoot-reference §6.2, §6.5 ("para toda a sessão") |
| RN-24 | O **Verdadeiro ou falso não é embaralhado**: "Verdadeiro" continua azul, à esquerda. | decisão do produto (2026-10-02) |
| RN-25 | As duas chaves de ordem aleatória só podem ser mudadas **no lobby**. Durante o jogo aparecem desabilitadas, com a explicação "Só antes de iniciar a partida." | decisão do produto (2026-10-02) |
| RN-26 | Recarregar qualquer tela mantém a ordem sorteada. **"Jogar novamente"** sorteia de novo. | spec 009, RN-32 · spec 011, RN-15 |
| RN-27 | A ordem sorteada não muda o quiz nem o que o editor mostra. | spec 008, RN-08 |

### Múltipla escolha no celular

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-28 | Numa pergunta de **múltipla escolha**, o celular mostra o aviso **"Selecione uma ou mais respostas!"**, e cada botão ganha um **marcador** redondo no canto. Tocar num botão **marca ou desmarca** a alternativa, sem enviar. Altera a spec 009, RN-16. | referência visual do Kahoot (captura de 2026-10-02) · kahoot-reference §6.4 |
| RN-29 | O botão **"Enviar"**, abaixo das alternativas, envia de uma vez todas as marcadas. Sem nenhuma marcada, ele fica desabilitado. Depois de enviar não dá para trocar (spec 009, RN-17). | referência visual do Kahoot · spec 009, RN-17 |
| RN-30 | Se o tempo acaba com alternativas **marcadas e não enviadas**, o jogador fica **sem resposta** naquela pergunta. | decisão do produto (2026-10-02) |
| RN-31 | Nas perguntas de **seleção simples** e de **Verdadeiro ou falso** nada muda: um toque é a resposta. | spec 009, RN-15 · decisão do usuário (2026-10-01) |
| RN-32 | A correção e os pontos seguem o que já vale: correta, parcialmente correta ou incorreta (spec 009, RN-24), e pontos por alternativa correta marcada (spec 010, RN-06). O marcador e o "Enviar" existem com as perguntas nos dispositivos ligadas ou não. | spec 009, RN-24 · spec 010, RN-06 |

## Critérios de aceite

### Painel de configurações

#### CA-01 — Abrir no lobby e durante o jogo

- **Dado** a tela do anfitrião no lobby, e depois numa fase de respostas
- **Quando** o anfitrião aciona Configurações no cabeçalho
- **Então** o painel "Configurações" abre com as quatro chaves e o aviso de que as configurações serão salvas

#### CA-02 — O jogo não para

- **Dado** a fase de respostas com 20 segundos e o painel aberto
- **Quando** o tempo acaba
- **Então** a revelação aparece atrás do painel, sem esperar que ele feche

#### CA-03 — Sem configurações no pódio

- **Dado** uma partida terminada
- **Quando** o anfitrião olha o cabeçalho
- **Então** não há o botão Configurações

#### CA-04 — Salvas para a próxima vez

- **Dado** um criador que ligou "Mostrar perguntas nos dispositivos" e "Mostrar respostas em ordem aleatória" numa partida
- **Quando** ele organiza uma partida de outro quiz
- **Então** o painel dela já abre com as duas ligadas

#### CA-05 — Primeira vez

- **Dado** um criador que nunca mexeu nas configurações
- **Quando** ele abre o painel de uma partida nova
- **Então** as quatro chaves estão desligadas

#### CA-06 — Bloqueio não é salvo

- **Dado** uma partida em que o anfitrião bloqueou a entrada
- **Quando** ele organiza outra partida
- **Então** a nova começa desbloqueada

#### CA-07 — Falha ao mudar

- **Dado** o painel aberto e o servidor fora de alcance
- **Quando** o anfitrião liga uma chave
- **Então** ela volta a desligada, e um aviso diz que não foi possível salvar

#### CA-08 — Só o dono

- **Dado** uma partida de outro criador
- **Quando** alguém tenta mudar as opções dela
- **Então** a partida não existe para ele, e nada muda

### Bloquear e entrar durante o jogo

#### CA-09 — Cadeado e chave são o mesmo

- **Dado** o lobby com a entrada liberada
- **Quando** o anfitrião liga "Bloquear jogo" no painel
- **Então** o cadeado do lobby aparece fechado, e a área do PIN mostra "Jogo bloqueado: ninguém mais pode entrar"

#### CA-10 — PIN no cabeçalho durante o jogo

- **Dado** uma partida em andamento, com a entrada liberada
- **Quando** o anfitrião olha o cabeçalho
- **Então** vê "Entre em {endereço}" com o PIN, e o botão que expande o QR code

#### CA-11 — Entrar antes de as respostas abrirem

- **Dado** uma partida na abertura da pergunta 2
- **Quando** "Caio" entra pelo PIN
- **Então** ele vê a abertura da pergunta 2 e, em seguida, os botões de resposta
- **E** o total de jogadores no cabeçalho do anfitrião aumenta em um

#### CA-12 — Entrar com as respostas abertas

- **Dado** uma partida na fase de respostas da pergunta 2
- **Quando** "Caio" entra pelo PIN
- **Então** ele vê "Você entrou! Aguarde a próxima pergunta.", sem botões de resposta
- **E** na pergunta 3 ele joga normalmente

#### CA-13 — Quem entrou tarde não segura a pergunta

- **Dado** uma partida com dois jogadores na fase de respostas, e "Caio" que entra nesse momento
- **Quando** os dois jogadores que já estavam respondem
- **Então** a revelação aparece, sem esperar por Caio

#### CA-14 — Pontos e lugar de quem entrou tarde

- **Dado** "Caio", que entrou na pergunta 3 de uma partida em que Ana tem 1800 pontos e Bia tem 0
- **Quando** o placar da pergunta 2 aparece
- **Então** Caio está na classificação com 0 pontos, depois de Bia
- **E** o celular dele mostra o total 0, sem "Tempo esgotado" pelas perguntas que perdeu

#### CA-15 — Bloqueada durante o jogo

- **Dado** uma partida em andamento com "Bloquear jogo" ligado
- **Quando** alguém tenta entrar pelo PIN
- **Então** vê "Este jogo está bloqueado. Peça ao anfitrião para desbloquear."
- **E** o cabeçalho do anfitrião mostra o cadeado e "Jogo bloqueado" no lugar do PIN

#### CA-16 — Desbloquear durante o jogo

- **Dado** uma partida em andamento bloqueada
- **Quando** o anfitrião desliga "Bloquear jogo"
- **Então** o cabeçalho volta a mostrar o endereço e o mesmo PIN, e quem tenta entrar consegue

#### CA-17 — Apelido em uso e partida cheia

- **Dado** uma partida em andamento com a jogadora "Ana"
- **Quando** alguém tenta entrar como "ana"
- **Então** vê "Esse apelido já está em uso. Escolha outro."

#### CA-18 — Entrar na última pergunta

- **Dado** a fase de respostas da última pergunta
- **Quando** "Caio" entra
- **Então** ele espera e, no fim, vê a tela final com 0 pontos e o último lugar

#### CA-19 — Partida terminada

- **Dado** uma partida no pódio
- **Quando** alguém digita o PIN dela
- **Então** vê "Não foi possível reconhecer o PIN do jogo. Verifique-o e tente de novo."

### Mostrar perguntas nos dispositivos

#### CA-20 — Ligado

- **Dado** uma partida com "Mostrar perguntas nos dispositivos" ligado
- **Quando** a fase de respostas de uma pergunta Quiz abre
- **Então** o celular mostra o enunciado e, em cada botão, a forma no canto e o texto da alternativa, com a barra de tempo embaixo
- **E** a tela do anfitrião continua igual

#### CA-21 — Desligado

- **Dado** uma partida com a opção desligada
- **Quando** a fase de respostas abre
- **Então** o celular mostra só cor e forma, sem enunciado e sem textos

#### CA-22 — Verdadeiro ou falso

- **Dado** a opção ligada e uma pergunta de Verdadeiro ou falso
- **Quando** a fase de respostas abre
- **Então** os dois botões mostram "Verdadeiro" e "Falso"

#### CA-22a — Abertura da pergunta

- **Dado** a opção ligada
- **Quando** a abertura da pergunta aparece
- **Então** o celular mostra o enunciado e a barra do tempo de leitura, sem os botões

#### CA-22b — Imagem no celular

- **Dado** a opção ligada e uma pergunta com imagem
- **Quando** a fase de respostas abre
- **Então** o celular mostra a imagem, com o recorte do editor, acima do enunciado
- **E** com a opção desligada o celular não mostra a imagem

#### CA-22c — Tempo no celular

- **Dado** a opção ligada e uma pergunta de 30 segundos
- **Quando** passam 2 segundos da fase de respostas
- **Então** a barra de tempo do celular mostra 28

#### CA-23 — A certa não vaza

- **Dado** a opção ligada, na fase de respostas
- **Quando** se examina tudo o que o celular recebe
- **Então** há o enunciado, a imagem e os textos das alternativas, e nada que diga qual é a certa

#### CA-24 — Mudar no meio

- **Dado** a fase de respostas da pergunta 1, com a opção desligada
- **Quando** o anfitrião a liga
- **Então** na abertura da pergunta 2 os celulares já mostram o enunciado

#### CA-25 — Textos longos no celular

- **Dado** a opção ligada e uma pergunta com enunciado de 120 caracteres e seis alternativas de 75
- **Quando** a fase de respostas abre num celular
- **Então** tudo cabe na tela sem rolagem horizontal, e cada botão continua ao alcance do toque

### Ordem aleatória

#### CA-26 — Perguntas embaralhadas

- **Dado** um quiz de dez perguntas e "Mostrar perguntas em ordem aleatória" ligado
- **Quando** o anfitrião inicia a partida
- **Então** as dez perguntas são jogadas, cada uma uma vez, na ordem sorteada, e a numeração vai de 1 a 10

#### CA-27 — Respostas embaralhadas e iguais em todas as telas

- **Dado** "Mostrar respostas em ordem aleatória" ligado e uma pergunta de quatro alternativas
- **Quando** a fase de respostas abre
- **Então** as quatro alternativas aparecem nas posições sorteadas
- **E** a alternativa que está no triângulo vermelho na tela do anfitrião é a mesma do triângulo vermelho em todos os celulares

#### CA-28 — A correção acompanha a alternativa

- **Dado** as respostas embaralhadas, com a alternativa certa no quadrado verde
- **Quando** um jogador toca no quadrado verde
- **Então** a resposta dele é correta, e a revelação marca o quadrado verde

#### CA-29 — Verdadeiro ou falso fica como está

- **Dado** as respostas em ordem aleatória e uma pergunta de Verdadeiro ou falso
- **Quando** a fase de respostas abre
- **Então** "Verdadeiro" é o losango azul, à esquerda, e "Falso" o triângulo vermelho

#### CA-30 — Recarregar mantém a ordem

- **Dado** uma partida com perguntas e respostas embaralhadas, na pergunta 3
- **Quando** o anfitrião e um jogador recarregam a página
- **Então** veem a mesma pergunta, com as alternativas nas mesmas posições

#### CA-31 — Só antes de iniciar

- **Dado** uma partida em andamento
- **Quando** o anfitrião abre o painel
- **Então** as duas chaves de ordem aleatória estão desabilitadas, com "Só antes de iniciar a partida."

#### CA-32 — Jogar novamente sorteia de novo

- **Dado** uma partida terminada, jogada com as perguntas embaralhadas
- **Quando** o anfitrião aciona "Jogar novamente" e inicia
- **Então** a nova partida tem um sorteio próprio, com as chaves como estavam

#### CA-33 — Desligado, a ordem é a do editor

- **Dado** as duas chaves desligadas
- **Quando** a partida é jogada
- **Então** as perguntas e as alternativas saem na ordem do editor, como na spec 009

### Múltipla escolha no celular

#### CA-34 — Marcar e desmarcar

- **Dado** uma pergunta de múltipla escolha na fase de respostas
- **Quando** o jogador toca em duas alternativas e toca de novo na primeira
- **Então** só a segunda fica marcada, nada foi enviado, e o total de respostas do anfitrião não mudou

#### CA-35 — Enviar

- **Dado** duas alternativas marcadas
- **Quando** o jogador aciona "Enviar"
- **Então** a resposta vai com as duas, e ele vê a tela de espera

#### CA-36 — Nada marcado

- **Dado** uma pergunta de múltipla escolha sem nenhuma alternativa marcada
- **Quando** o jogador olha o botão "Enviar"
- **Então** ele está desabilitado

#### CA-37 — Todas as certas

- **Dado** uma pergunta de múltipla escolha de 30 segundos com três alternativas certas e uma errada
- **Quando** um jogador envia as três certas aos 8 segundos, outro envia duas certas, e um terceiro envia duas certas e a errada
- **Então** eles veem "Correto" com 2600 pontos, "Parcialmente correto" com 1733 e "Incorreto" sem pontos

#### CA-38 — Tempo acaba sem enviar

- **Dado** um jogador com duas alternativas marcadas
- **Quando** o tempo acaba sem ele acionar "Enviar"
- **Então** ele vê "Tempo esgotado", e a resposta dele não conta na distribuição

#### CA-39 — Seleção simples continua num toque

- **Dado** uma pergunta de seleção simples
- **Quando** o jogador toca numa alternativa
- **Então** a resposta é enviada na hora, sem marcador e sem "Enviar"

## Experiência (telas e estados)

As telas seguem as capturas do Kahoot, no tema escuro do Quizio.

- **Cabeçalho do anfitrião, no lobby**: como hoje, mais a engrenagem de Configurações antes da tela cheia.
- **Cabeçalho do anfitrião, durante o jogo**: à esquerda, depois do botão de sair, o ícone de QR code e "Entre em **{endereço}**" seguido do **PIN** em destaque; ao centro, o nome do Quizio; à direita, o total de jogadores, a engrenagem e a tela cheia. Em telas estreitas, o endereço some e fica o PIN. Bloqueado, o trecho vira um cadeado com "Jogo bloqueado".
- **Painel "Configurações"**: claro, como os diálogos do jogo, preso à direita, com rolagem própria. No alto, o título e o X. Cada opção é uma linha com ícone, nome, uma frase de explicação e a chave à direita:
  - **Mostrar perguntas nos dispositivos** — "Perguntas e respostas são exibidas nos dispositivos dos participantes."
  - **Bloquear jogo** — "Bloqueie o jogo para impedir que outros participantes entrem."
  - **Mostrar perguntas em ordem aleatória** — "As perguntas saem numa ordem sorteada a cada partida."
  - **Mostrar respostas em ordem aleatória** — "As alternativas trocam de posição a cada partida."
  - No rodapé: "Suas configurações serão salvas para a próxima vez."
- **Celular com as perguntas, abertura**: o enunciado num cartão claro ao centro, grande, e a barra do tempo de leitura embaixo.
- **Celular com as perguntas, respostas**: a imagem no alto, se houver; o enunciado numa faixa clara; os botões em duas colunas, baixos, com a forma pequena no canto de cima e o texto ao centro, que quebra em linhas; e, no pé, a barra de tempo com os segundos.
- **Celular, múltipla escolha**: o aviso "Selecione uma ou mais respostas!" no alto; em cada botão, um marcador redondo no canto, vazio ou com o sinal de certo; e o botão verde "Enviar" abaixo das alternativas.
- **Celular de quem entrou no meio**: "Você entrou! Aguarde a próxima pergunta.", com o apelido e o total 0 no rodapé.
- **Estados novos**: painel aberto, chave salvando, falha ao salvar, chave desabilitada durante o jogo; cabeçalho com PIN, cabeçalho bloqueado, QR expandido durante o jogo; no jogador, espera de quem entrou no meio, abertura com o enunciado, botões com texto, imagem e barra de tempo, alternativas marcadas e "Enviar" desabilitado.

## Divergências intencionais do Kahoot

- **Só quatro opções no painel** (RN-03): o Kahoot tem mais de quinze. As que não funcionam ainda não aparecem, nem como "Em breve".
- **Ordem aleatória só antes de iniciar** (RN-25): o Kahoot deixa mudar durante o jogo. Aqui o sorteio é feito uma vez, ao iniciar, para todas as telas concordarem e um recarregamento não mudar nada.
- **Verdadeiro ou falso não embaralha** (RN-24): o Kahoot não documenta o caso.
- **Sem remover jogador durante o jogo**: continua só no lobby; o caso de quem atrapalha no meio do jogo fica para a spec 013.

## Fora de escopo

- Encerrar antes indo ao pódio, anfitrião ou jogador que cai, trocar de aparelho, remover jogador durante o jogo (spec 013).
- Reprodução automática, gerador e filtro de apelidos, entrada em duas etapas, música e efeitos sonoros (spec 014).
- Personagens, temas, reações (Extras) e conversa de equipe (modo equipe).
- Idioma da interface, aumentar o contraste e tempo ilimitado.

## Perguntas em aberto

- [ ] **Entrar com as respostas já abertas** (RN-13) — quem chega nesse momento espera a próxima pergunta. A alternativa é deixá-lo responder a pergunta em curso, com o tempo que resta.
- [ ] **Ordem aleatória só no lobby** (RN-25) — a alternativa é deixar mudar durante o jogo, valendo para as perguntas ainda não abertas.
- [ ] **Verdadeiro ou falso sem embaralhar** (RN-24).
- [ ] **Textos sem captura** — "Você entrou! Aguarde a próxima pergunta.", "Jogo bloqueado" no cabeçalho, "Só antes de iniciar a partida." e as frases de explicação das duas chaves de ordem aleatória são propostas.
- [x] **Imagem da pergunta no celular** (RN-20) — as capturas mostram a imagem no celular com a opção ligada; entrou.
- [x] **Múltipla escolha no celular** (RN-28 a RN-32) — decidido pela captura: marcadores e botão "Enviar". Resolve a pergunta em aberto da spec 009.
- [ ] **Marcadas e não enviadas** (RN-30) — contam como sem resposta. A alternativa é enviar sozinho o que estava marcado quando o tempo acaba.
- [ ] **Imagem de fundo no celular** (RN-20) — a imagem que no anfitrião é fundo aparece no celular como as outras, acima do enunciado.

## Changelog

- 2026-10-02 — spec criada, com as capturas do painel "Configurações" e do cabeçalho do Kahoot enviadas pelo usuário. Decisões do usuário: "robustez e opções de jogo" vira três etapas (012 a 014); entrar com o jogo em andamento é permitido, com 0 pontos e a partir da pergunta seguinte; personagens continuam em Extras; a múltipla escolha no celular espera capturas. Decisões tomadas sem consulta prévia, listadas nas perguntas em aberto: quem entra antes de as respostas abrirem joga a pergunta (RN-13); quem entrou tarde não é esperado para fechar as respostas (RN-16); ordem aleatória sorteada ao iniciar e mudada só no lobby (RN-22, RN-23, RN-25); Verdadeiro ou falso sem embaralhar (RN-24); bloqueio não salvo (RN-06); só as opções que funcionam aparecem no painel (RN-03); sem imagem no celular (RN-20).
- 2026-10-02 — mais capturas do Kahoot, enviadas pelo usuário: o celular com as perguntas ligadas e a tela de múltipla escolha. Mudanças: a chave mostra pergunta e respostas juntas (RN-18); o celular ganha o enunciado na abertura, a imagem, a forma no canto do botão e a barra de tempo (RN-18a, RN-18b), e a imagem passa a aparecer no celular com a opção ligada (RN-20); a múltipla escolha no celular entra nesta spec, com marcadores e "Enviar" (RN-28 a RN-32, CA-34 a CA-39), resolvendo a pergunta em aberto da spec 009. Decisão tomada sem consulta prévia: marcadas e não enviadas contam como sem resposta (RN-30).
- 2026-10-02 — aprovada pelo usuário, com as decisões em aberto mantidas como propostas.
- 2026-10-02 — plano aprovado pelo usuário e tarefas escritas ([plan.md](plan.md), [tasks.md](tasks.md)).
- 2026-10-02 — implementada. Detalhes decididos na implementação, sem mudar regra: na abertura da pergunta só o enunciado vai para os celulares; a imagem e os textos das alternativas vão quando as respostas abrem, como na tela do anfitrião (RN-18a, RN-18b). A espera de quem entrou no meio mostra "Você entrou!" em destaque e "Aguarde a próxima pergunta." embaixo (RN-13). Com os textos, os botões do celular ficam baixos, da altura do texto, e a lista rola para baixo se precisar (CA-25). Em telas de celular, o cabeçalho do anfitrião esconde o nome do Quizio durante o jogo para caber o PIN (RN-11). Quem entra com o jogo em andamento vai direto para a tela do jogo, sem passar pela espera do lobby.
