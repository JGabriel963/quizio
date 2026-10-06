---
id: "014"
title: Opções de jogo 3/3 — Reprodução automática
status: done # draft | approved | planned | in-progress | done
contexts: [game]
created: 2026-10-06
---

# 014 — Opções de jogo 3/3: Reprodução automática

## Contexto e problema

Hoje a partida só anda quando o anfitrião clica: **Iniciar** no lobby, **Avançar** na revelação de cada pergunta e **Avançar** de novo em cada placar. Num quiz de dez perguntas são vinte e um cliques, e o anfitrião fica preso ao computador. Quem joga junto com os amigos, ou projeta o jogo numa sala e quer circular por ela, não tem como deixar a partida correr.

No Kahoot isso é a chave **"Rep. automática"** do painel de Configurações, com a dica "Avance automaticamente pelas perguntas e participe do próximo kahoot.". O usuário jogou uma partida com ela ligada em 2026-10-06 e mandou as capturas: o lobby com a contagem ao lado de "Iniciar", a revelação e o placar com a contagem no canto de cima, e o pódio com "Próximo kahoot" e "Desativar a reprodução automática". O que ele observou:

- o jogo anda como se alguém clicasse nos botões de avançar, só que sozinho;
- a revelação das respostas e o placar ficam **5 segundos** na tela, cada um, antes de avançar;
- no lobby, a contagem é de **15 segundos** e **volta a 15 cada vez que um jogador entra**;
- a chave pode ser ligada e desligada a qualquer momento, pelo painel, durante o jogo.

O roadmap previa para a 014 também o gerador e o filtro de apelidos, a entrada em duas etapas e o som. Por decisão do usuário (2026-10-06), esta spec fica só com a reprodução automática; os outros temas viram specs próprias.

## Objetivo

Com a chave "Reprodução automática" ligada, a partida começa sozinha depois que os jogadores entram e passa sozinha pela revelação e pelo placar de cada pergunta, até o pódio. O anfitrião liga e desliga quando quiser, sem sair do jogo.

## Personas

- **Anfitrião (`Host`)** — quer jogar junto ou circular pela sala, sem ficar clicando para o jogo andar.
- **Jogador (`Player`)** — joga como sempre; para ele, só muda o ritmo.

## Histórias de usuário

- **HU-01** — Como anfitrião, quero ligar a reprodução automática no painel de configurações, para a partida andar sem os meus cliques.
- **HU-02** — Como anfitrião, quero que a partida comece sozinha depois que os jogadores entrarem, para não precisar acionar Iniciar.
- **HU-03** — Como anfitrião, quero ver quanto tempo falta para o jogo avançar, para saber quando a tela vai mudar.
- **HU-04** — Como anfitrião, quero desligar a reprodução automática no meio do jogo, para parar numa pergunta e comentar a resposta.
- **HU-05** — Como anfitrião, quero que a escolha valha para as próximas partidas, para não ligá-la toda vez.

## Regras de negócio

### A chave

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | O painel de Configurações (spec 012, RN-01 a RN-03) ganha a chave **"Reprodução automática"**, com a explicação "O jogo começa e avança pelas perguntas sozinho.". Ela fica depois de "Mostrar respostas em ordem aleatória" e antes de "Encerrar jogo" (spec 013, RN-01). | referência visual do Kahoot ("Rep. automática") |
| RN-02 | A chave pode ser ligada e desligada **no lobby e durante o jogo**, e vale na hora, como as outras (spec 012, RN-04). Se a mudança falhar, a chave volta ao que era, com o aviso. | observação do usuário no Kahoot (2026-10-06) · spec 012, RN-04 |
| RN-03 | A **reprodução automática (`autoplay`)** é uma das opções de jogo salvas para o criador (spec 012, RN-05): a próxima partida que ele organizar começa com ela como ficou. Quem nunca mexeu começa com ela **desligada**. | spec 012, RN-05, RN-07 · referência visual do Kahoot ("Suas configurações serão salvas para a próxima vez") |
| RN-04 | Com a chave desligada, **nada muda** em relação a hoje: Iniciar e Avançar são manuais. | decisão do produto (2026-10-06) |

### Começar sozinho, no lobby

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-05 | Com a chave ligada e **ao menos um jogador** no lobby, corre uma contagem de **15 segundos**. No fim dela a partida inicia, como se o anfitrião tivesse acionado Iniciar (spec 009, RN-01, RN-02). | observação do usuário no Kahoot (2026-10-06) · kahoot-reference §6.1 ("Autoplay") |
| RN-06 | **Cada jogador que entra reinicia a contagem em 15 segundos.** | observação do usuário no Kahoot (2026-10-06) |
| RN-07 | Sem jogadores não há contagem. Se o **último jogador é removido** durante a contagem, ela para e some; o próximo que entrar começa outra de 15 segundos. Remover um jogador com outros ainda no lobby não mexe na contagem. | spec 009, RN-01 · decisão do produto (2026-10-06) |
| RN-08 | **Ligar a chave** com jogadores já no lobby começa a contagem de 15 segundos naquele momento. **Desligar** durante a contagem a cancela, e a partida volta a esperar por Iniciar. | decisão do produto (2026-10-06) |
| RN-09 | A contagem aparece **ao lado do botão Iniciar**, em segundos. O botão continua funcionando: o anfitrião pode iniciar antes de a contagem acabar. | referência visual do Kahoot |
| RN-10 | **Bloquear o jogo** não para a contagem: sem ninguém novo entrando, ela vai até o fim. | decisão do produto (2026-10-06) |

### Avançar sozinho, durante o jogo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-11 | Com a chave ligada, a **revelação** de cada pergunta fica **5 segundos** na tela e avança sozinha: para o placar ou, na última pergunta, para o pódio (spec 011, RN-01). Altera a spec 009, RN-11 ("a revelação fica até o anfitrião avançar"). | observação do usuário no Kahoot (2026-10-06) |
| RN-12 | O **placar** de cada pergunta fica **5 segundos** na tela e avança sozinho para a abertura da pergunta seguinte. | observação do usuário no Kahoot (2026-10-06) |
| RN-13 | Nas duas telas, a contagem aparece **no canto de cima à direita, no lugar do botão Avançar**, em segundos. | referência visual do Kahoot |
| RN-14 | As outras fases **não mudam**: a abertura da partida, a abertura da pergunta e as respostas já têm o seu tempo (spec 009), e "Pular o cronômetro" continua disponível nas respostas. | spec 009, RN-06 a RN-10 |
| RN-15 | **Ligar a chave** no meio de uma revelação ou de um placar começa a contagem de 5 segundos naquele momento. **Desligar** durante a contagem a cancela, e o botão Avançar volta ao lugar. | decisão do produto (2026-10-06) |
| RN-16 | O **pódio não muda**: a revelação dos três primeiros já acontece sozinha (spec 011), e a tela fica nele, com "Jogar novamente", "Classificação" e "Voltar ao quiz". Nenhuma partida nova começa sozinha. | decisão do produto (2026-10-06) |

### Condução

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-17 | As contagens são do **servidor**, como os outros prazos da partida: recarregar a tela do anfitrião mostra a contagem de onde ela está, e não do começo. | constituição, artigo V · spec 009, RN-32 |
| RN-18 | Um avanço automático é um avanço como os outros: acontece **uma única vez**, e não soma ao clique do anfitrião nem a outro pedido igual (spec 009, RN-12). | spec 009, RN-12 |
| RN-19 | Quem faz o jogo andar continua sendo **a tela do anfitrião** (ADR 0009). Se ela está sem conexão ou fechada, a contagem corre mas nada avança; quando ela volta, o que já venceu avança na hora (spec 013, RN-10, RN-11). No lobby, o mesmo: a partida inicia quando a tela voltar. | spec 013, RN-10, RN-11 · ADR 0009 |
| RN-20 | **Para o jogador nada muda**: o celular mostra as mesmas telas, e acompanha as mudanças de fase como hoje. A contagem aparece só na tela do anfitrião. | decisão do produto (2026-10-06) |
| RN-21 | As animações do placar (spec 011) cabem nos 5 segundos e **não seguram o avanço**: nada espera por elas. | spec 011, RN-25, RN-26 |

### Apresentação

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-22 | A contagem é lida por leitores de tela como um **cronômetro**, com o que ela conta ("Inicia em", "Avança em"). Com movimento reduzido, o número troca sem animação. | constituição, artigo VIII · spec 011, RN-27 |

## Critérios de aceite

### A chave

#### CA-01 — A chave no painel

- **Dado** o anfitrião no lobby de uma partida, sem nunca ter mexido nas configurações
- **Quando** ele abre as Configurações
- **Então** vê "Reprodução automática", desligada, depois de "Mostrar respostas em ordem aleatória" e antes de "Encerrar jogo"

#### CA-02 — Salva para a próxima partida

- **Dado** que o anfitrião ligou a reprodução automática numa partida
- **Quando** ele organiza uma partida de outro quiz
- **Então** a chave já aparece ligada

#### CA-03 — Falha ao salvar

- **Dado** o painel aberto, com a chave desligada
- **Quando** o anfitrião liga a chave e a mudança não chega ao servidor
- **Então** a chave volta a desligada, com o aviso "Não foi possível salvar a configuração. Tente novamente."

#### CA-04 — Desligada, nada muda

- **Dado** uma partida com a chave desligada e um jogador no lobby
- **Quando** passam 30 segundos
- **Então** a partida continua no lobby, sem contagem
- **E** na revelação de uma pergunta, o botão Avançar está lá e a tela não avança sozinha

### Começar sozinho

#### CA-05 — Contagem com o primeiro jogador

- **Dado** uma partida com a chave ligada e o lobby vazio
- **Quando** "ANA" entra
- **Então** aparece a contagem de 15 segundos ao lado de Iniciar
- **E** sem ninguém mais entrar, 15 segundos depois a partida inicia e as duas telas mostram a abertura da partida

#### CA-06 — Lobby vazio não conta

- **Dado** uma partida com a chave ligada e o lobby vazio
- **Quando** passam 30 segundos
- **Então** não há contagem e a partida continua no lobby

#### CA-07 — Quem entra reinicia a contagem

- **Dado** a contagem em 6 segundos, com "ANA" no lobby
- **Quando** "BIA" entra
- **Então** a contagem volta a 15 segundos
- **E** a partida inicia 15 segundos depois da entrada de "BIA"

#### CA-08 — Iniciar antes do fim

- **Dado** a contagem em 9 segundos
- **Quando** o anfitrião aciona Iniciar
- **Então** a partida inicia na hora, uma vez só

#### CA-09 — Último jogador removido

- **Dado** a contagem em 8 segundos, com "ANA" sozinha no lobby
- **Quando** o anfitrião remove "ANA"
- **Então** a contagem some e a partida não inicia
- **E** quando "BIA" entra, a contagem começa em 15 segundos

#### CA-10 — Remover um entre vários

- **Dado** a contagem em 8 segundos, com "ANA" e "BIA" no lobby
- **Quando** o anfitrião remove "BIA"
- **Então** a contagem continua de onde estava

#### CA-11 — Ligar com jogadores no lobby

- **Dado** uma partida com a chave desligada e "ANA" no lobby há um minuto
- **Quando** o anfitrião liga a reprodução automática
- **Então** a contagem começa em 15 segundos

#### CA-12 — Desligar durante a contagem

- **Dado** a contagem em 5 segundos
- **Quando** o anfitrião desliga a reprodução automática
- **Então** a contagem some
- **E** 10 segundos depois a partida continua no lobby

#### CA-13 — Bloqueado, a contagem continua

- **Dado** a contagem em 12 segundos
- **Quando** o anfitrião bloqueia o jogo
- **Então** a contagem continua, e a partida inicia quando ela acaba

#### CA-14 — Recarregar no meio da contagem

- **Dado** a contagem em 10 segundos
- **Quando** o anfitrião recarrega a página, o que leva 2 segundos
- **Então** a contagem aparece em cerca de 8 segundos, e não em 15

### Avançar sozinho

#### CA-15 — A revelação avança em 5 segundos

- **Dado** uma partida com a chave ligada, na revelação da primeira de três perguntas
- **Quando** passam 5 segundos
- **Então** a tela mostra o placar, sem ninguém clicar
- **E** durante esses 5 segundos, a contagem aparece no canto de cima à direita, no lugar de Avançar

#### CA-16 — O placar avança em 5 segundos

- **Dado** o placar da primeira pergunta, com a chave ligada
- **Quando** passam 5 segundos
- **Então** as duas telas mostram a abertura da segunda pergunta

#### CA-17 — Da última revelação ao pódio

- **Dado** a revelação da última pergunta, com a chave ligada
- **Quando** passam 5 segundos
- **Então** a tela mostra o pódio, e os celulares a espera do fim do jogo

#### CA-18 — Uma partida inteira sem cliques

- **Dado** uma partida de duas perguntas com a chave ligada e "ANA" no lobby
- **Quando** "ANA" responde cada pergunta e o anfitrião não toca em nada
- **Então** a partida passa pelo lobby, pelas duas perguntas, com revelação e placar, e chega ao pódio

#### CA-19 — As respostas não mudam

- **Dado** uma pergunta de 20 segundos com a chave ligada, e dois jogadores
- **Quando** só um responde
- **Então** as respostas continuam abertas até os 20 segundos
- **E** "Pular o cronômetro" continua disponível

#### CA-20 — Desligar na revelação

- **Dado** a revelação de uma pergunta, com a contagem em 3 segundos
- **Quando** o anfitrião desliga a reprodução automática
- **Então** a contagem some, o botão Avançar volta e a tela não avança sozinha

#### CA-21 — Ligar na revelação

- **Dado** a revelação de uma pergunta aberta há 40 segundos, com a chave desligada
- **Quando** o anfitrião liga a reprodução automática
- **Então** a contagem começa em 5 segundos, e a tela avança quando ela acaba

#### CA-22 — O pódio fica

- **Dado** o pódio de uma partida jogada com a chave ligada
- **Quando** passam 30 segundos depois de o primeiro lugar aparecer
- **Então** a tela continua no pódio, com "Jogar novamente", e nenhuma partida nova foi aberta

### Condução

#### CA-23 — Recarregar na revelação

- **Dado** a revelação com a contagem em 4 segundos
- **Quando** o anfitrião recarrega a página, o que leva 2 segundos
- **Então** a contagem aparece em cerca de 2 segundos e a tela avança quando ela acaba

#### CA-24 — Avanço uma vez só

- **Dado** a revelação com a contagem acabando, em duas abas do anfitrião
- **Quando** as duas pedem o avanço ao mesmo tempo
- **Então** a partida vai para o placar da mesma pergunta, e não pula uma fase

#### CA-25 — Anfitrião sem conexão

- **Dado** a revelação com a chave ligada
- **Quando** a tela do anfitrião fica 20 segundos sem conexão e volta
- **Então** a partida não avançou durante a queda
- **E** na volta, a tela vai para o placar na hora

#### CA-26 — Anfitrião sem conexão no lobby

- **Dado** a contagem do lobby em 10 segundos
- **Quando** a tela do anfitrião fica 30 segundos sem conexão e volta
- **Então** a partida inicia quando a tela volta

#### CA-27 — O celular não mostra contagem

- **Dado** "ANA" numa partida com a chave ligada
- **Quando** a tela do anfitrião mostra a revelação com a contagem
- **Então** o celular de "ANA" mostra o resultado dela, como hoje, sem contagem

### Apresentação

#### CA-28 — Leitores de tela

- **Dado** a tela do anfitrião usada com leitor de tela
- **Quando** a contagem aparece no lobby e na revelação
- **Então** ela é anunciada como cronômetro, com "Inicia em" no lobby e "Avança em" na revelação e no placar

## Experiência (telas e estados)

- **Painel de Configurações**: a quinta chave, "Reprodução automática", com o ícone de reproduzir e a explicação numa linha, no mesmo formato das outras. Abaixo dela, "Encerrar jogo".
- **Lobby**: o grupo do cadeado e do botão Iniciar ganha, à direita, o número da contagem em destaque, como na captura do Kahoot ("Iniciar 8"). Sem jogadores, ou com a chave desligada, o grupo fica como hoje.
- **Revelação e placar**: no canto de cima à direita, onde fica "Avançar", aparece um bloco escuro com o número da contagem. O resto das telas não muda.
- **Pódio**: como hoje.
- **Estados**: desligada (tudo como hoje); lobby sem jogadores; lobby contando; revelação contando; placar contando; e a volta de cada um depois de recarregar.

## Divergências intencionais do Kahoot

- **Sem "Próximo kahoot" no pódio** (RN-16): no Kahoot, depois do pódio uma contagem começa outro kahoot sozinha, com o botão "Desativar a reprodução automática". Aqui uma partida nova tem outro PIN e não leva os jogadores junto, então começá-la sozinha abriria um lobby vazio. O pódio fica, com "Jogar novamente".
- **O nome por extenso** (RN-01): "Reprodução automática", e não "Rep. automática".
- **A contagem sobrevive a recarregar** (RN-17): como os outros prazos do Quizio, ela é do servidor.
- **Iniciar continua clicável durante a contagem** (RN-09): na captura do Kahoot o botão também está lá; se ele funciona durante a contagem não foi testado.

## Fora de escopo

- Começar outra partida sozinho depois do pódio, e levar os jogadores para ela ("Próximo kahoot").
- Gerador e filtro de apelidos, entrada em duas etapas, música e efeitos sonoros: specs próprias, a escrever.
- Mudar os tempos da reprodução automática (15 e 5 segundos são fixos).
- Pausar o jogo: desligar a chave segura a revelação e o placar, mas as respostas continuam com o tempo delas.

## Perguntas em aberto

Nenhuma. Resolvidas em 2026-10-06, como proposto:

- [x] **A contagem toma o lugar de "Avançar"** (RN-13); para segurar a tela, o anfitrião desliga a chave.
- [x] **Remover um jogador não reinicia a contagem do lobby** (RN-07).
- [x] **Ligar a chave no meio de uma revelação conta 5 segundos a partir dali** (RN-15).
- [x] **Explicação da chave**: "O jogo começa e avança pelas perguntas sozinho." (RN-01).

## Changelog

- 2026-10-06 — spec criada, com as capturas e o relato de uma partida com "Rep. automática" ligada no Kahoot, enviados pelo usuário. Decisões do usuário: a 014 fica só com a reprodução automática, e o pódio não começa outra partida sozinho.
- 2026-10-06 — spec aprovada pelo usuário; perguntas em aberto resolvidas como proposto.
- 2026-10-06 — implementação: o E2E ficou num cenário curto, por pedido do usuário; a partida inteira sem cliques (CA-18) é coberta pelos testes de caso de uso e de componente e foi conferida uma vez num navegador de verdade.
- 2026-10-06 — spec entregue.
