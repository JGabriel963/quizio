---
id: "009"
title: Partida ao vivo 2/4 — Ciclo da pergunta
status: done # draft | approved | planned | in-progress | done
contexts: [game]
created: 2026-10-01
---

# 009 — Partida ao vivo 2/4: Ciclo da pergunta

## Contexto e problema

A spec 008 entregou o lobby: o anfitrião abre uma partida, os jogadores entram por PIN e apelido, e todos esperam. O botão **Iniciar** está lá, marcado "Em breve". Falta o jogo em si.

Esta etapa entrega o coração da partida: cada pergunta aparece nas duas telas, os jogadores respondem no celular, o tempo fecha e a resposta certa é revelada. Ela ainda não tem pontos nem placar (spec 010) nem pódio (spec 011): no fim, o jogador sabe se acertou cada pergunta, mas não há competição.

| Spec | Etapa |
| --- | --- |
| 008 | Lobby: PIN, entrada por apelido, travar e remover ✅ |
| **009** | **Ciclo da pergunta: iniciar, pergunta, respostas e revelação (esta spec)** |
| 010 | Pontuação, sequência e placar |
| 011 | Fim de jogo e pódio |

É a parte mais delicada do desenho, porque o servidor não tem timer (ADR 0009): o tempo é um instante guardado, a tela do anfitrião pede cada transição e o servidor confere pelo relógio dele.

A referência visual é a demonstração do Kahoot, em capturas enviadas pelo usuário em 2026-10-01: abertura da pergunta, respostas, revelação, resposta recebida, incorreto e tempo esgotado, todas com uma pergunta Quiz de quatro alternativas e seleção simples. Para múltipla escolha, Verdadeiro ou falso, seis alternativas e imagem ao centro não há captura; essas telas seguem a referência escrita (kahoot-reference §4.1, §6.4) e serão conferidas com o Kahoot antes de a partida ao vivo ser fechada.

## Objetivo

O anfitrião aciona Iniciar e conduz a partida pergunta a pergunta. Cada jogador vê os botões de cor e forma no celular, responde uma vez dentro do tempo e, na revelação, fica sabendo se acertou. Depois da última pergunta, as duas telas mostram o fim do jogo.

## Personas

- **Anfitrião (`Host`)** — conduz a partida numa tela grande.
- **Jogador (`Player`)** — responde no celular, sem conta.

## Histórias de usuário

- **HU-01** — Como anfitrião, quero iniciar a partida quando a turma estiver pronta, para começar as perguntas.
- **HU-02** — Como jogador, quero um instante para ler a pergunta antes de o tempo correr, para responder pensando.
- **HU-03** — Como jogador, quero responder tocando numa cor e forma, para não precisar ler no celular.
- **HU-04** — Como anfitrião, quero ver o tempo e quantos já responderam, para saber como a turma está indo.
- **HU-05** — Como anfitrião, quero pular o cronômetro, para não esperar quando todos já sabem a resposta.
- **HU-06** — Como jogador, quero saber se acertei, para aprender com a pergunta.
- **HU-07** — Como anfitrião, quero ver quantos escolheram cada resposta, para comentar a pergunta com a turma.
- **HU-08** — Como jogador, quero continuar no jogo se recarregar a página, para não perder a partida por um toque errado.

## Regras de negócio

### Iniciar

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | O botão **Iniciar** do lobby passa a funcionar (altera a spec 008, RN-22). Ele fica indisponível enquanto não há **ao menos um jogador**. | referência visual do Kahoot · kahoot-reference §6.3 |
| RN-02 | Iniciar muda a partida de **lobby** para **em andamento (`playing`)**. A partir daí o lobby não volta, e a ordem das perguntas é a da versão jogável com que a partida foi criada (spec 008, RN-04). | kahoot-reference §6.4 · constituição, artigo V |
| RN-03 | Com a partida em andamento, **ninguém novo entra**: o PIN, o link e o QR respondem **"Este jogo já começou."** Quem já entrou continua. A entrada tardia fica para a spec 012. | decisão do usuário (2026-10-01) |
| RN-04 | A partida começa por uma **abertura** de 3 segundos: a tela do anfitrião mostra o nome do Quizio e o título do quiz, e os jogadores veem **"Prepare-se!"**. Em seguida vem a primeira pergunta. | referência visual do Kahoot · duração: decisão do produto (2026-10-01) |
| RN-05 | Durante o jogo, o cabeçalho do anfitrião mantém o total de jogadores, a tela cheia e o botão de sair, que **encerra a partida** com a mesma confirmação do lobby (spec 008, RN-31, RN-32). | spec 008 · kahoot-reference §6.2 ("End kahoot") |

### Fases de uma pergunta

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-06 | Cada pergunta passa por três fases, nesta ordem: **abertura (`intro`)**, **respostas (`answering`)** e **revelação (`results`)**. | kahoot-reference §6.4 |
| RN-07 | Na **abertura**, o anfitrião vê o tipo da pergunta ("Quiz" ou "Verdadeiro ou falso"), o enunciado, a posição ("2/10") e uma barra de progresso; as alternativas ainda não aparecem. O jogador vê **"Pergunta 2"**, uma contagem regressiva e **"Preparar…"**. | referência visual do Kahoot · kahoot-reference §5.1 (tempo de leitura) |
| RN-08 | A abertura dura **5 segundos** e não conta no tempo de resposta. | kahoot-reference §5.1 |
| RN-09 | Na fase de **respostas**, o anfitrião vê o enunciado, a imagem da pergunta (RN-28), as alternativas com cor, forma e texto, o **tempo restante** em segundos e o **total de respostas recebidas**. | referência visual do Kahoot · kahoot-reference §6.4 |
| RN-10 | A fase de respostas dura o **limite de tempo da pergunta** (spec 004) e termina no primeiro destes acontecimentos: (a) o tempo acaba; (b) **todos os jogadores da partida responderam**; (c) o anfitrião aciona **"Pular o cronômetro"**. | kahoot-reference §6.4 · referência visual do Kahoot |
| RN-11 | Na **revelação**, o anfitrião vê a distribuição das respostas e a correta em destaque (RN-22), e o botão **Avançar**. Avançar leva à abertura da pergunta seguinte ou, depois da última, ao fim do jogo (RN-30). Não há tempo: a revelação fica até o anfitrião avançar. | referência visual do Kahoot · kahoot-reference §6.4 |
| RN-12 | **Quem conduz é a tela do anfitrião**: ela pede cada transição (fim da abertura, fim do tempo, pular, avançar). O servidor confere, pelo próprio relógio, se a transição cabe, e a aplica **uma única vez**, mesmo que o pedido chegue repetido ou de duas abas. | ADR 0009 · constituição, artigo V |
| RN-13 | Se a tela do anfitrião estiver fechada quando um tempo acabar, a partida **espera** na fase em que está; ao reabrir, a tela retoma de onde o servidor parou. O prazo das respostas não se estende: ele vale mesmo sem a tela do anfitrião (RN-18). | ADR 0009 |

### Responder

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-14 | Na fase de respostas, o dispositivo do jogador mostra **um botão por alternativa preenchida**, só com a cor e a forma, sem o texto e sem o enunciado. Cada alternativa mantém a cor e a forma da sua posição no editor (spec 004, RN-01). | referência visual do Kahoot · kahoot-reference §4.1.1 |
| RN-15 | Num **Quiz de seleção simples** e num **Verdadeiro ou falso**, tocar num botão **envia a resposta** na hora. No Verdadeiro ou falso os botões são "Verdadeiro" (azul, losango) e "Falso" (vermelho, triângulo); como no Kahoot, o celular mostra só a cor e a forma, e o nome fica para leitores de tela. | kahoot-reference §4.1.1, §4.1.2 · spec 005, RN-06 |
| RN-16 | Num **Quiz de múltipla escolha**, por enquanto, o toque também **envia a resposta** na hora, com a alternativa tocada: não há botão Enviar. Como o jogador escolhe mais de uma alternativa fica para decidir depois (ver Perguntas em aberto). | decisão do usuário (2026-10-01) |
| RN-17 | Cada jogador envia **uma resposta por pergunta**, e ela **não pode ser trocada**. | kahoot-reference §6.4 |
| RN-18 | Uma resposta só vale se chegar ao servidor **durante a fase de respostas e até o fim do limite de tempo**, com meio segundo de tolerância para a latência. O **tempo de resposta** é medido no servidor, do instante em que as respostas abriram até o recebimento; o dispositivo nunca informa o próprio tempo. | constituição, artigo V · ADR 0009 · tolerância: decisão do produto (2026-10-01) |
| RN-19 | Depois de enviar, o jogador vê uma **tela de espera** com uma frase ("Resposta recebida!", "Será que acertou?", "A competitividade está no ar?") e não fica sabendo se acertou até a revelação. | referência visual do Kahoot |
| RN-20 | Uma resposta que chega fora do prazo é recusada, e o jogador vê **"Tempo esgotado"** e espera a revelação. | kahoot-reference §5.3 (`TIMEOUT`) |
| RN-21 | **A resposta correta não chega ao dispositivo de nenhum jogador antes da revelação**, e a contagem por alternativa não é divulgada durante a fase de respostas: só o total de respostas. | constituição, artigo V |

### Revelação

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-22 | A tela do anfitrião mostra **uma barra por alternativa**, com a cor, a forma e o **número de jogadores** que a escolheram. As corretas levam a marca de certo, mesmo com zero escolhas; as erradas ficam esmaecidas, com a marca de errado. O enunciado e as alternativas continuam à vista. | referência visual do Kahoot · kahoot-reference §6.4 |
| RN-23 | Na múltipla escolha, cada alternativa marcada por um jogador conta uma vez na barra dela. | kahoot-reference §6.4 |
| RN-24 | A **correção (`Correctness`)** de uma resposta é: **correta** (seleção simples ou Verdadeiro ou falso: escolheu a certa; múltipla escolha: marcou todas as certas e nenhuma errada), **parcialmente correta** (múltipla escolha: marcou ao menos uma certa, não todas, e nenhuma errada), **incorreta** (escolheu ou marcou alguma errada) ou **sem resposta**. | kahoot-reference §4.1.1 |
| RN-25 | Na revelação, o jogador vê **"Correto"**, **"Parcialmente correto"**, **"Incorreto"** com **"Boa tentativa!"**, ou **"Tempo esgotado"** com **"Ainda não acabou!"**, conforme a correção. Pontos, sequência e posição chegam na spec 010. | referência visual do Kahoot · "Parcialmente correto": decisão do produto (2026-10-01) |
| RN-26 | O dispositivo do jogador **não mostra qual era a alternativa certa**: só o resultado dele. A certa está na tela do anfitrião. | kahoot-reference §6.4 |

### Conteúdo da pergunta na partida

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-27 | Com **seis alternativas**, a tela do anfitrião e o dispositivo do jogador as mostram em três linhas de duas. Só aparecem as alternativas **preenchidas**. | kahoot-reference §4.1.1 · spec 004, RN-01, RN-03 |
| RN-28 | A **imagem da pergunta** aparece na tela do anfitrião nas fases de respostas e de revelação: ao centro, com o recorte, ou como fundo da tela, conforme a posição escolhida no editor, e com o texto alternativo (spec 007, RN-14, RN-23, RN-31). O dispositivo do jogador não mostra a imagem. | spec 007 · referência visual do Kahoot (imagem de fundo na revelação) |
| RN-29 | A partida usa as perguntas, as imagens e os limites de tempo da **versão jogável com que foi criada**; editar o quiz durante o jogo não muda nada nele. | spec 008, RN-04 |

### Fim das perguntas

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-30 | Avançar depois da revelação da **última pergunta** termina a partida: ela passa a **terminada (`finished`)**, e o PIN é liberado. A tela do anfitrião mostra **"Fim do jogo"**, o título do quiz e **Voltar ao quiz**; os jogadores veem **"Fim do jogo"** e "Obrigado por jogar!". Esta tela é provisória: a spec 011 a substitui pelo pódio. | decisão do usuário (2026-10-01) |
| RN-31 | Uma partida terminada não aceita respostas nem transições. Reabrir a tela do anfitrião mostra o fim do jogo. | constituição, artigo V |

### Continuidade

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-32 | **Recarregar** qualquer tela mostra a fase em que a partida está: o anfitrião vê a fase atual com o tempo que resta de verdade; o jogador vê os botões se ainda pode responder, a espera se já respondeu, ou o resultado na revelação. | ADR 0009 · spec 008, RN-19, RN-44 |
| RN-33 | Um evento perdido não deixa uma tela para trás: as duas telas consultam o servidor ao reconectar, ao voltar o foco e periodicamente, como no lobby. | ADR 0009 |
| RN-34 | O prazo de 8 horas (spec 008, RN-11) e o encerramento pelo anfitrião valem durante o jogo: os jogadores veem "O anfitrião encerrou o jogo." | spec 008, RN-11, RN-32 |

## Critérios de aceite

### Iniciar

#### CA-01 — Iniciar com jogadores

- **Dado** o lobby com dois jogadores
- **Quando** o anfitrião aciona Iniciar
- **Então** a tela dele mostra o título do quiz, e os jogadores veem "Prepare-se!"
- **E** em seguida as duas telas mostram a abertura da pergunta 1

#### CA-02 — Iniciar sem jogadores

- **Dado** o lobby vazio
- **Quando** o anfitrião olha o botão Iniciar
- **Então** ele está indisponível
- **E** uma tentativa direta de iniciar é recusada

#### CA-03 — Só o dono inicia

- **Dado** uma partida no lobby
- **Quando** outro criador tenta iniciá-la
- **Então** a resposta é a mesma de uma partida que não existe

#### CA-04 — Entrar depois de iniciada

- **Dado** uma partida em andamento
- **Quando** alguém digita o PIN ou abre o link de entrada
- **Então** vê "Este jogo já começou." e não entra

#### CA-05 — Iniciar duas vezes

- **Dado** uma partida que acabou de ser iniciada
- **Quando** o pedido de iniciar chega de novo
- **Então** a partida continua na mesma fase, sem voltar ao começo

### Abertura da pergunta

#### CA-06 — Abertura no anfitrião

- **Dado** uma partida de 10 perguntas, na abertura da pergunta 2
- **Quando** o anfitrião olha a tela
- **Então** vê o tipo da pergunta, o enunciado e "2/10", sem as alternativas

#### CA-07 — Abertura no jogador

- **Dado** a abertura da pergunta 2
- **Quando** o jogador olha o celular
- **Então** vê "Pergunta 2", a contagem regressiva e "Preparar…", sem botões de resposta

#### CA-08 — Respostas abrem depois da abertura

- **Dado** a abertura da pergunta 1
- **Quando** passam 5 segundos
- **Então** a tela do anfitrião mostra as alternativas e o tempo, e o celular mostra os botões

#### CA-09 — Abrir as respostas antes da hora

- **Dado** a abertura de uma pergunta, iniciada há 2 segundos
- **Quando** chega um pedido para abrir as respostas
- **Então** ele é recusado, e a pergunta continua na abertura

### Responder

#### CA-10 — Seleção simples

- **Dado** a fase de respostas de um Quiz de seleção simples com quatro alternativas
- **Quando** o jogador toca no botão vermelho de triângulo
- **Então** vê a tela de espera, sem saber se acertou
- **E** o total de respostas na tela do anfitrião aumenta em 1

#### CA-11 — Só cor e forma no celular

- **Dado** a fase de respostas de um Quiz
- **Quando** o jogador olha o celular
- **Então** vê os botões com cor e forma, sem o enunciado e sem o texto das alternativas

#### CA-12 — Alternativas vazias não aparecem

- **Dado** um Quiz com as alternativas 1, 2 e 4 preenchidas e a 3 vazia
- **Quando** as respostas abrem
- **Então** as duas telas mostram três alternativas: vermelha, azul e verde, cada uma com a sua forma

#### CA-13 — Seis alternativas

- **Dado** um Quiz com seis alternativas preenchidas
- **Quando** as respostas abrem
- **Então** as duas telas mostram as seis, em três linhas de duas

#### CA-14 — Verdadeiro ou falso

- **Dado** a fase de respostas de um Verdadeiro ou falso
- **Quando** o jogador olha o celular
- **Então** vê dois botões só com cor e forma: o azul com losango (Verdadeiro) e o vermelho com triângulo (Falso)
- **E** tocar num deles envia a resposta

#### CA-15 — Múltipla escolha

- **Dado** a fase de respostas de um Quiz de múltipla escolha
- **Quando** o jogador toca numa alternativa
- **Então** a resposta é enviada com essa alternativa, e ele vê a tela de espera
- **E** não há botão Enviar

#### CA-16 — Uma resposta por pergunta

- **Dado** um jogador que já respondeu a pergunta atual
- **Quando** chega outra resposta dele para a mesma pergunta
- **Então** ela é recusada, e a primeira continua valendo

#### CA-17 — Resposta fora do prazo

- **Dado** uma pergunta de 20 segundos cujas respostas abriram há 21 segundos
- **Quando** chega a resposta de um jogador
- **Então** ela é recusada, e o jogador vê "Tempo esgotado"

#### CA-18 — Tolerância de latência

- **Dado** uma pergunta de 20 segundos cujas respostas abriram há 20,3 segundos
- **Quando** chega a resposta de um jogador
- **Então** ela é aceita

#### CA-19 — Tempo medido no servidor

- **Dado** as respostas abertas no instante T
- **Quando** a resposta de um jogador chega ao servidor em T + 4,2 segundos
- **Então** o tempo de resposta guardado é 4,2 segundos, sem depender de nada que o dispositivo informe

#### CA-20 — Resposta de quem não é da partida

- **Dado** a fase de respostas
- **Quando** chega uma resposta com um segredo que não confere, ou de um jogador removido
- **Então** ela é recusada

#### CA-21 — Alternativa que não existe

- **Dado** a fase de respostas de um Quiz com três alternativas preenchidas
- **Quando** chega uma resposta para a alternativa vazia, ou para uma que não é da pergunta
- **Então** ela é recusada

#### CA-22 — A correta não vaza

- **Dado** a fase de respostas
- **Quando** se examina tudo o que o dispositivo de um jogador recebe
- **Então** não há indicação de qual alternativa é a correta, nem de quantos escolheram cada uma

### Fim do tempo

#### CA-23 — O tempo acaba

- **Dado** uma pergunta de 20 segundos na fase de respostas
- **Quando** passam os 20 segundos
- **Então** a tela do anfitrião mostra a revelação

#### CA-24 — Todos responderam

- **Dado** uma partida com dois jogadores, na fase de respostas com 15 segundos restantes
- **Quando** o segundo jogador responde
- **Então** a revelação aparece nas duas telas sem esperar o tempo

#### CA-25 — Pular o cronômetro

- **Dado** a fase de respostas com 15 segundos restantes e um jogador sem responder
- **Quando** o anfitrião aciona "Pular o cronômetro"
- **Então** a revelação aparece, e o jogador que não respondeu vê "Tempo esgotado"

#### CA-26 — Fechar antes da hora sem pular

- **Dado** a fase de respostas com 15 segundos restantes
- **Quando** chega um pedido de fim de tempo que não é o de pular
- **Então** ele é recusado, e a fase continua

#### CA-27 — Anfitrião fora durante o tempo

- **Dado** uma pergunta de 20 segundos na fase de respostas e a tela do anfitrião fechada
- **Quando** o anfitrião reabre a tela depois de 30 segundos
- **Então** vê a revelação
- **E** uma resposta enviada aos 25 segundos foi recusada

### Revelação

#### CA-28 — Distribuição das respostas

- **Dado** uma pergunta em que três jogadores escolheram a alternativa 3, a correta, e um escolheu a 1
- **Quando** a revelação aparece
- **Então** a tela do anfitrião mostra as barras com 1, 0, 3 e 0, a alternativa 3 com a marca de certo e as outras esmaecidas

#### CA-29 — Correta sem nenhuma escolha

- **Dado** uma pergunta em que ninguém escolheu a alternativa correta
- **Quando** a revelação aparece
- **Então** a correta leva a marca de certo, com 0 na barra

#### CA-30 — Resultado no celular

- **Dado** a revelação de uma pergunta de seleção simples
- **Quando** os jogadores olham o celular
- **Então** quem escolheu a correta vê "Correto", quem escolheu outra vê "Incorreto", e quem não respondeu vê "Tempo esgotado" e "Ainda não acabou!"
- **E** nenhum deles vê qual era a alternativa correta

#### CA-31 — Correção da múltipla escolha

- **Dado** uma pergunta de múltipla escolha com as alternativas 1 e 2 corretas
- **Quando** a revelação aparece
- **Então** quem marcou 1 e 2 vê "Correto", quem marcou só a 1 vê "Parcialmente correto", e quem marcou 1 e 3 vê "Incorreto"
- **E** a barra da alternativa 1 conta os três

#### CA-32 — Verdadeiro ou falso na revelação

- **Dado** um Verdadeiro ou falso cuja resposta é "Falso"
- **Quando** a revelação aparece
- **Então** a tela do anfitrião mostra duas barras, com "Falso" marcada como certa

#### CA-33 — Imagem na partida

- **Dado** uma pergunta com imagem ao centro, recortada em Quadrado, e outra com imagem de fundo
- **Quando** cada uma está na fase de respostas e na revelação
- **Então** a primeira aparece ao centro com o recorte, e a segunda cobre o fundo da tela do anfitrião
- **E** o dispositivo do jogador não mostra imagem

### Avançar e fim

#### CA-34 — Avançar para a próxima

- **Dado** a revelação da pergunta 1 de uma partida de 3 perguntas
- **Quando** o anfitrião aciona Avançar
- **Então** as duas telas mostram a abertura da pergunta 2

#### CA-35 — Avançar duas vezes

- **Dado** a revelação da pergunta 1
- **Quando** o pedido de avançar chega duas vezes seguidas
- **Então** a partida está na pergunta 2, não na 3

#### CA-36 — Fim do jogo

- **Dado** a revelação da última pergunta
- **Quando** o anfitrião aciona Avançar
- **Então** a tela dele mostra "Fim do jogo", o título do quiz e "Voltar ao quiz"
- **E** os jogadores veem "Fim do jogo" e "Obrigado por jogar!"
- **E** o PIN deixa de ser reconhecido

#### CA-37 — Partida terminada não muda

- **Dado** uma partida terminada
- **Quando** chega uma resposta, ou um pedido de avançar
- **Então** ele é recusado

#### CA-38 — Editar o quiz durante o jogo

- **Dado** uma partida em andamento na pergunta 1
- **Quando** o criador muda o enunciado da pergunta 2 e salva uma nova versão
- **Então** a partida mostra a pergunta 2 como era quando a partida foi criada

### Continuidade

#### CA-39 — Jogador recarrega durante as respostas

- **Dado** um jogador que ainda não respondeu, na fase de respostas
- **Quando** ele recarrega a página
- **Então** vê os botões de novo e pode responder
- **E** se já tinha respondido, vê a tela de espera

#### CA-40 — Jogador recarrega na revelação

- **Dado** um jogador que acertou, na revelação
- **Quando** ele recarrega a página
- **Então** vê "Correto"

#### CA-41 — Anfitrião recarrega durante as respostas

- **Dado** uma pergunta de 20 segundos, com 12 segundos restantes
- **Quando** o anfitrião recarrega a página
- **Então** vê a fase de respostas com cerca de 12 segundos, e não 20

#### CA-42 — Encerrar durante o jogo

- **Dado** uma partida em andamento
- **Quando** o anfitrião aciona sair e confirma em Encerrar
- **Então** vai para a página do quiz, e os jogadores veem a entrada do PIN com "O anfitrião encerrou o jogo."

#### CA-43 — Duas abas do anfitrião

- **Dado** a mesma partida aberta em duas abas do anfitrião
- **Quando** o tempo de uma pergunta acaba
- **Então** a partida passa para a revelação uma única vez, e as duas abas a mostram

#### CA-44 — No celular

- **Dado** a fase de respostas num celular
- **Quando** o jogador olha a tela
- **Então** os botões ocupam a tela, sem rolagem, e cada um tem um nome para leitores de tela ("Triângulo vermelho", "Losango azul")

## Experiência (telas e estados)

As telas seguem as da demonstração do Kahoot, no tema escuro do Quizio.

- **Abertura da partida**: o nome do Quizio grande e o título do quiz na tela do anfitrião; no celular, "Prepare-se!" com um indicador de carregamento.
- **Abertura da pergunta (anfitrião)**: o tipo no topo, com o ícone das quatro cores; o enunciado numa faixa branca ao centro; "2/10" numa cápsula embaixo; uma barra que se enche nos 5 segundos.
- **Abertura da pergunta (jogador)**: o número da pergunta num círculo e o tipo numa cápsula no topo; "Pergunta 2", a contagem num círculo e "Preparar…".
- **Respostas (anfitrião)**: o enunciado na faixa branca do topo; "Pular o cronômetro" à direita; o tempo restante num círculo à esquerda e o total de respostas num círculo à direita, com "respostas"; a imagem ao centro, quando há; as alternativas na base, em faixas de cor com forma e texto. Com imagem de fundo, ela cobre a tela atrás de tudo.
- **Respostas (jogador)**: os botões de cor ocupando a tela, em duas colunas, com a forma grande no centro.
- **Espera (jogador)**: um indicador de carregamento e a frase.
- **Revelação (anfitrião)**: o enunciado no topo, "Avançar" à direita; as barras ao centro, cada uma com a etiqueta de forma e número; as alternativas na base, a correta viva com o sinal de certo e as outras esmaecidas com o sinal de errado.
- **Revelação (jogador)**: "Correto" com o sinal de certo em verde; "Incorreto" ou "Tempo esgotado" com o sinal de errado em vermelho; no tempo esgotado, a faixa "Ainda não acabou!".
- **Fim do jogo**: o título do quiz e "Fim do jogo" nas duas telas; "Voltar ao quiz" na do anfitrião.
- **Estados**: abertura da partida, abertura da pergunta, respostas, espera, tempo esgotado, revelação, fim; e os do lobby que continuam valendo (encerrada, não encontrada, falha ao carregar).

## Divergências intencionais do Kahoot

- **Sem pontos, sequência, placar e pódio**: chegam nas specs 010 e 011. Por isso a revelação no celular não mostra "+ 620" nem "Você está no pódio!", e depois da última pergunta vem uma tela simples de fim.
- **Sem entrada tardia** (RN-03): no Kahoot dá para entrar com o jogo em andamento. Aqui isso chega na spec 012, e por isso o cabeçalho não mostra o PIN durante o jogo.
- **Tempo de leitura fixo em 5 segundos** (RN-08): o Kahoot aumenta esse tempo em perguntas longas.
- **Sem a seta de voltar** ao lado de Avançar.
- **Sem avatar** na revelação do jogador (spec 008).
- **Sem som e sem opções de jogo** (spec 012): sem embaralhar perguntas e respostas, sem avanço automático e sem enunciado no celular.
- **"Parcialmente correto"** (RN-25): texto proposto, sem captura do Kahoot.

## Fora de escopo

- Pontuação, sequência de acertos, resultado com pontos e placar (spec 010).
- Pódio, tela final do jogador e menu final do anfitrião (spec 011).
- Entrada tardia, reconexão por apelido em outro aparelho, opções de jogo, música (spec 012).
- Remover participante durante o jogo.
- Relatórios (spec 013): esta etapa guarda as respostas, mas não as mostra depois do jogo.
- Tipos de pergunta além de Quiz e Verdadeiro ou falso.
- Vídeo e imagem nas alternativas.

## Perguntas em aberto

- [ ] **Telas sem captura** — múltipla escolha, seis alternativas e imagem ao centro seguem a referência escrita. O Verdadeiro ou falso foi conferido com as capturas de um jogo de verdade (2026-10-01).
- [ ] **Tolerância de meio segundo** (RN-18) e **abertura de 3 segundos** (RN-04) — valores propostos, fáceis de ajustar.
- [ ] **Organizar de novo com um jogo em andamento** — pela spec 008, RN-07, abrir uma nova partida do mesmo quiz encerra a que está aberta, agora também no meio do jogo. A alternativa é pedir confirmação ou oferecer "Voltar à partida".
- [ ] **Múltipla escolha no celular** — o usuário pediu para tirar o botão Enviar (2026-10-01): um toque envia a resposta. Numa pergunta com mais de uma correta, o jogador só escolhe uma, e acertar uma delas aparece como "Parcialmente correto" (RN-24). Falta decidir como ele escolhe mais de uma, ou como essa resposta é corrigida.
- [x] **Jogador que abandona** — aceito pelo usuário em 2026-10-01: quem fecha a aba continua contando para "todos responderam" (RN-10), e o anfitrião usa "Pular o cronômetro" quando o total de respostas parar. A spec 012 decide se a presença entra na conta.

## Changelog

- 2026-10-01 — spec criada, com as capturas da demonstração do Kahoot enviadas pelo usuário. Decisões do usuário: sem entrada depois de iniciada (fica para a spec 012); tela simples de fim de jogo, sem pontos nem pódio nesta etapa; múltipla escolha, Verdadeiro ou falso, seis alternativas e imagem seguem a referência escrita, para conferir depois. Decisões tomadas sem consulta prévia: abertura da partida de 3 segundos (RN-04); tempo de leitura fixo de 5 segundos (RN-08); tolerância de meio segundo (RN-18); a fase de respostas fecha quando todos respondem (RN-10); só alternativas preenchidas aparecem (RN-14); texto "Parcialmente correto" (RN-25); o dispositivo não mostra a alternativa certa (RN-26); sem PIN no cabeçalho durante o jogo.
- 2026-10-01 — aprovada pelo usuário, depois de entender que um jogador que abandona impede o fechamento antecipado por "todos responderam": o caminho nesta etapa é o botão "Pular o cronômetro" (RN-10, CA-25), como no Kahoot. As demais perguntas em aberto seguem com o valor proposto.
- 2026-10-01 — implementada. Ajustes decididos na implementação, sem mudar regra: o jogador que recarrega depois da última pergunta continua vendo "Fim do jogo" (RN-30), mas digitar o PIN de novo começa do zero, porque o PIN já está livre para outra partida; iniciar uma partida cuja versão jogável não tem mais perguntas é recusado, como um quiz que não pode ser jogado; a tela do anfitrião também não recebe a alternativa correta antes da revelação (RN-21), por ser projetada. As perguntas em aberto continuam abertas.
- 2026-10-01 — a pedido do usuário, depois de ver a tela: sem botão Enviar. Um toque é a resposta em qualquer pergunta, e a tela de espera aparece em seguida (RN-16, CA-15). A múltipla escolha no celular fica como pergunta em aberto.
- 2026-10-01 — capturas de um jogo de verdade no Kahoot, enviadas pelo usuário. Ajustes: os botões do Verdadeiro ou falso no celular mostram só cor e forma (RN-15, CA-14); "Incorreto" ganha a faixa "Boa tentativa!" (RN-25). De layout, sem mudar regra: enunciado num cartão ao centro com a ação à direita, total de respostas num círculo com a etiqueta, tipo da pergunta numa cápsula clara no celular. Ficam para as próximas specs o que as capturas mostram de pontos, sequência e placar (010) e de pódio (011); avatares e o PIN no cabeçalho durante o jogo continuam fora.
- 2026-10-01 — alterada pela spec 011: a tela provisória de "Fim do jogo" (RN-30, CA-36) deu lugar ao pódio no anfitrião e à tela final no celular.
