---
id: "011"
title: Partida ao vivo 4/4 — Fim de jogo, pódio e animações
status: done # draft | approved | planned | in-progress | done
contexts: [game]
created: 2026-10-01
---

# 011 — Partida ao vivo 4/4: Fim de jogo, pódio e animações

## Contexto e problema

As specs 008 a 010 entregaram a partida inteira, menos o fim: depois da última pergunta vem um placar igual aos outros e uma tela provisória de "Fim do jogo". Ninguém é anunciado vencedor, o jogador não fica sabendo em que lugar terminou, e o anfitrião só tem "Voltar ao quiz".

Além disso, as telas do jogo trocam de estado de forma seca. No Kahoot, o jogo é cheio de animações simples: no placar, os pontos sobem e as faixas trocam de lugar; no pódio, cada lugar é apresentado por vez, com mais destaque para o primeiro. São essas microtransições que dão ao jogo o aspecto animado e gamificado.

Esta etapa fecha a partida ao vivo: o pódio com os três primeiros, a tela final de cada jogador, o que o anfitrião pode fazer depois e as animações do placar, do pódio e das telas do jogo.

| Spec | Etapa |
| --- | --- |
| 008 | Lobby ✅ |
| 009 | Ciclo da pergunta ✅ |
| 010 | Pontuação, sequência e placar ✅ |
| **011** | **Fim de jogo, pódio e animações (esta spec)** |

A referência visual são duas capturas do jogo de verdade no Kahoot, enviadas pelo usuário em 2026-10-01: o pódio do anfitrião (título do quiz no alto, os degraus 2, 1 e 3 com o apelido sobre cada um, confete) e a tela final do jogador (título do quiz, a medalha com o número do lugar, "Imbatível!", e o apelido com o total no rodapé). As animações seguem a descrição do usuário (2026-10-01) do que acontece no placar e no pódio do Kahoot.

## Objetivo

Depois da revelação da última pergunta, a tela do anfitrião anuncia os três primeiros num pódio, do terceiro para o primeiro. Cada jogador vê no celular o lugar em que terminou e o seu total. O anfitrião pode ver a classificação completa, jogar de novo ou voltar ao quiz. O placar entre as perguntas, o pódio e as trocas de tela ganham animações curtas.

## Personas

- **Anfitrião (`Host`)** — anuncia os vencedores para a turma e decide o que fazer depois.
- **Jogador (`Player`)** — fica sabendo em que lugar terminou.

## Histórias de usuário

- **HU-01** — Como anfitrião, quero mostrar um pódio com os três primeiros, para encerrar o jogo com a comemoração dos vencedores.
- **HU-02** — Como anfitrião, quero que o pódio revele do terceiro para o primeiro, para criar expectativa.
- **HU-03** — Como jogador, quero ver no celular em que lugar terminei e com quantos pontos, mesmo fora do pódio.
- **HU-04** — Como anfitrião, quero ver a classificação de todos os jogadores, para saber como cada um foi.
- **HU-05** — Como anfitrião, quero jogar o mesmo quiz de novo sem voltar à biblioteca, para emendar outra rodada.
- **HU-06** — Como jogador, quero sair da tela final e entrar em outro jogo, para continuar jogando.
- **HU-07** — Como anfitrião, quero que o placar mostre os pontos subindo e as posições trocando, para a turma ver o que mudou com a pergunta.
- **HU-08** — Como jogador, quero que o jogo responda com pequenas animações, para ele parecer vivo e divertido.

## Regras de negócio

### Fim da partida

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Avançar na **revelação da última pergunta** leva direto ao **pódio (`Podium`)**: a última pergunta não tem placar. As outras perguntas continuam com o placar depois da revelação. Altera a spec 010, RN-23. | kahoot-reference §6.4 ("último bloco → PODIUM") |
| RN-02 | Ao chegar ao pódio a partida está **terminada (`finished`)** e o PIN é liberado, como na spec 009, RN-30. O pódio substitui a tela provisória de "Fim do jogo" nas duas telas. | spec 009, RN-30, RN-31 |
| RN-03 | A transição segue as regras de condução: a tela do anfitrião a pede, e o servidor a aplica uma única vez. Um pedido repetido não muda nada. | spec 009, RN-12 |
| RN-04 | Uma partida **encerrada antes do fim** (pelo anfitrião, por uma nova partida do mesmo quiz, pelo prazo ou pela exclusão do quiz) **não tem pódio**: continua valendo "Esta partida foi encerrada." para o anfitrião e "O anfitrião encerrou o jogo." para os jogadores. | spec 008, RN-32 · spec 009, RN-34 |

### Classificação final

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-05 | A **classificação final** é a de depois da última pergunta: todos os jogadores da partida, pelo total de pontos, com o empate resolvido pela ordem de entrada. Cada jogador tem o seu lugar, sem lugar dividido. | spec 010, RN-08, RN-19 |
| RN-06 | Quem **não pontuou** entra na classificação com 0. Quem foi **removido** não entra. | spec 008, RN-27 · spec 010, RN-08 |
| RN-07 | A classificação de uma partida terminada **não muda mais** e continua disponível: reabrir a tela do anfitrião mostra o pódio de novo, e o prazo de 8 horas não o apaga. | spec 009, RN-31 · decisão do produto (2026-10-01) |

### Pódio (anfitrião)

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-08 | O pódio mostra o **título do quiz** e os **três primeiros** da classificação final, cada um no seu degrau (2º à esquerda, 1º ao centro e mais alto, 3º à direita), com a medalha do lugar, o **apelido** e o **total de pontos**. | kahoot-reference §6.6 · referência visual do Kahoot |
| RN-09 | Com **menos de três jogadores**, os degraus sem jogador ficam vazios. | referência visual do Kahoot (pódio com dois jogadores) |
| RN-10 | Os lugares são **apresentados um por vez**: o 3º aos 2 segundos, o 2º aos 4 e o 1º aos 7, contados do instante em que a partida terminou. O 1º tem **mais suspense e mais destaque** (RN-33). | kahoot-reference §6.4 ("Top 3 com animação") · descrição do usuário (2026-10-01) · tempos: decisão do produto (2026-10-01) |
| RN-11 | A revelação é contada pelo relógio do servidor: **recarregar** durante a revelação continua de onde ela está, e depois dela mostra o pódio completo, sem repetir a animação. | spec 009, RN-32 |
| RN-12 | No pódio, o cabeçalho mantém a tela cheia, e o botão de **sair** leva à página do quiz **sem pedir confirmação**, porque a partida já terminou. | decisão do produto (2026-10-01) |

### Depois do pódio (anfitrião)

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-13 | Terminada a revelação, a tela oferece três ações: **Classificação**, **Jogar novamente** e **Voltar ao quiz**. | kahoot-reference §6.6 · decisão do produto (2026-10-01) |
| RN-14 | **Classificação** mostra **todos** os jogadores, do primeiro ao último, com lugar, apelido e total de pontos, numa lista que rola. Dela se volta ao pódio. | decisão do produto (2026-10-01) |
| RN-15 | **Jogar novamente** cria uma **partida nova** do mesmo quiz e leva ao lobby dela, com outro PIN e sem jogadores. Vale tudo o que vale para "Organizar ao vivo": usa a versão jogável do momento, e os jogadores entram de novo pelo PIN novo. A partida terminada continua com o seu pódio. | spec 008, RN-04, RN-07 · kahoot-reference §6.6 ("Play again") |
| RN-16 | Se o quiz **não pode mais ser organizado** (foi para a lixeira ou foi excluído), "Jogar novamente" avisa "Este quiz não pode mais ser jogado." e a tela continua no pódio. | spec 008, RN-02 |
| RN-17 | **Voltar ao quiz** leva à página do quiz. | spec 009, RN-30 |

### Tela final do jogador

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-18 | Enquanto o pódio é revelado na tela do anfitrião (RN-10), o celular mostra uma **espera**: "Rufar dos tambores…". Terminada a revelação, mostra a **tela final**. | kahoot-reference §6.4 · decisão do produto (2026-10-01) |
| RN-19 | A tela final mostra o **título do quiz**, o **lugar** do jogador na classificação final e, no rodapé, o apelido e o **total de pontos**. | referência visual do Kahoot |
| RN-20 | Quem ficou entre os **três primeiros** vê a **medalha** com o número do lugar e uma frase: **"Imbatível!"** no 1º, **"Por pouco!"** no 2º e **"No pódio!"** no 3º. | referência visual do Kahoot ("Imbatível!") · demais frases: decisão do produto (2026-10-01) |
| RN-21 | Quem ficou **do 4º lugar em diante** vê **"Você ficou em 5º lugar"** (com o seu lugar) e "Obrigado por jogar!", sem medalha. | decisão do produto (2026-10-01) |
| RN-22 | A tela final tem a ação **Entrar em outro jogo**, que leva à entrada do PIN. | decisão do produto (2026-10-01) |
| RN-23 | **Recarregar** a tela final mostra a tela final de novo, enquanto o navegador guardar a entrada do jogador naquela partida. Digitar o PIN de novo não leva a ela: o PIN já está livre. | spec 009, RN-30 (ajuste de 2026-10-01), RN-32 |
| RN-24 | Lugar e pontos **não viajam em eventos**: cada celular consulta o próprio resultado, como na revelação. | spec 010, RN-09 · ADR 0009 |

### Animações

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-25 | As animações são **só apresentação**: não mudam o estado da partida, os prazos nem o que o servidor divulga, e **nada espera por elas**. "Avançar" fica disponível desde que o placar abre; acioná-lo no meio da animação avança na hora. | constituição, artigo V · decisão do produto (2026-10-01) |
| RN-26 | Cada animação é **curta**: até cerca de 1 segundo por movimento, e a sequência inteira do placar em até cerca de 3 segundos. | decisão do produto (2026-10-01) |
| RN-27 | Com a preferência do aparelho por **movimento reduzido**, as telas mostram o estado final sem movimento. O pódio continua apresentando um lugar por vez (RN-10), sem animar a entrada. | constituição, artigo VIII · decisão do produto (2026-10-01) |
| RN-28 | O **placar abre como estava antes da pergunta**: os jogadores, a ordem e os totais do placar anterior. No placar da primeira pergunta, todos partem de 0. Em seguida ele anima até o estado novo, que é sempre o placar da spec 010. Altera a spec 010 (divergência "Sem animação de troca de posições"). | descrição do usuário (2026-10-01) |
| RN-29 | **Pontos subindo**: o total de quem pontuou na pergunta conta do valor antigo até o novo. Quem não mudou de lugar tem só essa animação. | descrição do usuário (2026-10-01) |
| RN-30 | **Troca de posições**: depois da contagem, as faixas deslizam para os lugares novos. A seta de quem subiu (spec 010, RN-20) aparece quando a faixa chega. | descrição do usuário (2026-10-01) |
| RN-31 | **Quem entra nos cinco primeiros** tem a faixa subindo de baixo da lista até o lugar novo, com os pontos subindo junto. **Quem sai** dos cinco desce e some. | descrição do usuário (2026-10-01) |
| RN-32 | Se **nada mudou** (ninguém pontuou, ou pergunta "Sem pontos"), o placar aparece parado. Recarregar o placar repete a animação e termina no mesmo estado. | decisão do produto (2026-10-01) |
| RN-33 | No **pódio**, cada lugar entra com animação: o apelido sobe no degrau e os pontos contam de 0 até o total. O **1º lugar** entra depois de uma pausa maior, com uma entrada maior que a dos outros, brilho no degrau e **confete**, que só aparece com ele. | descrição do usuário (2026-10-01) · referência visual do Kahoot |
| RN-34 | Na **tela final do jogador**, a medalha (ou o lugar) entra com um salto, e o 1º lugar leva confete. | referência visual do Kahoot |
| RN-35 | **Microtransições nas telas que já existem**: (a) o conteúdo de cada fase entra com uma transição curta, nas duas telas; (b) na revelação do anfitrião, as barras da distribuição crescem do zero; (c) no resultado do celular, o sinal de certo ou errado entra com um salto, "+ N" conta de 0 até os pontos, e o total do rodapé conta até o valor novo; (d) no lobby, cada apelido que entra aparece com um salto. | descrição do usuário (2026-10-01) · lista: decisão do produto (2026-10-01) |

## Critérios de aceite

### Fim da partida

#### CA-01 — Da última revelação ao pódio

- **Dado** a revelação da última pergunta de uma partida de 3 perguntas
- **Quando** o anfitrião aciona Avançar
- **Então** a tela dele mostra o pódio, sem passar pelo placar
- **E** a partida está terminada, e o PIN dela deixa de ser reconhecido

#### CA-02 — As outras perguntas mantêm o placar

- **Dado** a revelação da pergunta 1 de uma partida de 3 perguntas
- **Quando** o anfitrião aciona Avançar
- **Então** vê o placar, como na spec 010

#### CA-03 — Partida de uma pergunta

- **Dado** uma partida com uma única pergunta, na revelação
- **Quando** o anfitrião aciona Avançar
- **Então** vê o pódio

#### CA-04 — Avançar duas vezes

- **Dado** a revelação da última pergunta
- **Quando** o pedido de avançar chega duas vezes seguidas
- **Então** a partida termina uma vez só, e o pódio é o mesmo

#### CA-05 — Encerrada no meio não tem pódio

- **Dado** uma partida na pergunta 2 de 3
- **Quando** o anfitrião encerra a partida
- **Então** vai para a página do quiz, e os jogadores veem "O anfitrião encerrou o jogo."
- **E** reabrir a tela do anfitrião mostra "Esta partida foi encerrada.", sem pódio

### Pódio

#### CA-06 — Os três primeiros

- **Dado** uma partida terminada com sete jogadores de totais diferentes
- **Quando** a revelação do pódio termina
- **Então** a tela mostra o título do quiz e os três de maior total, cada um no degrau do seu lugar, com apelido e pontos
- **E** os outros quatro não aparecem no pódio

#### CA-07 — Revelação em ordem

- **Dado** uma partida que acabou de terminar, com três jogadores ou mais
- **Quando** passam 2, 4 e 7 segundos
- **Então** aparecem, nessa ordem, o 3º, o 2º e o 1º lugar
- **E** antes dos 2 segundos nenhum apelido aparece

#### CA-08 — Dois jogadores

- **Dado** uma partida terminada com dois jogadores
- **Quando** a revelação termina
- **Então** o pódio mostra o 1º e o 2º, e o degrau do 3º fica vazio

#### CA-09 — Um jogador

- **Dado** uma partida terminada com um jogador
- **Quando** a revelação termina
- **Então** o pódio mostra só o 1º lugar

#### CA-10 — Empate

- **Dado** dois jogadores com o mesmo total, o maior da partida
- **Quando** o pódio aparece
- **Então** quem entrou primeiro na partida fica em 1º, e o outro em 2º

#### CA-11 — Ninguém pontuou

- **Dado** uma partida terminada em que os três jogadores erraram tudo
- **Quando** o pódio aparece
- **Então** os três estão no pódio com 0 pontos, na ordem em que entraram

#### CA-12 — Jogador removido

- **Dado** uma partida em que o jogador de maior total foi removido antes do fim
- **Quando** o pódio aparece
- **Então** ele não está no pódio nem na classificação, e o 1º lugar é o seguinte

#### CA-13 — Recarregar o pódio

- **Dado** o pódio completo na tela
- **Quando** o anfitrião recarrega a página, ou a reabre no dia seguinte
- **Então** vê o pódio completo, com os mesmos lugares, sem a revelação de novo

#### CA-14 — Partida do exemplo

- **Dado** a partida do exemplo da spec 010 (CA-31): Ana e Beto, três perguntas
- **Quando** o anfitrião avança da última revelação
- **Então** o pódio mostra Beto em 1º com 2900 e Ana em 2º com 2850

### Depois do pódio

#### CA-15 — Ações depois da revelação

- **Dado** o pódio durante a revelação
- **Quando** o 1º lugar aparece, aos 7 segundos
- **Então** a tela passa a oferecer "Classificação", "Jogar novamente" e "Voltar ao quiz"

#### CA-16 — Classificação completa

- **Dado** uma partida terminada com sete jogadores
- **Quando** o anfitrião aciona "Classificação"
- **Então** vê os sete, do 1º ao 7º, com lugar, apelido e pontos
- **E** consegue voltar ao pódio

#### CA-17 — Jogar novamente

- **Dado** o pódio de uma partida terminada
- **Quando** o anfitrião aciona "Jogar novamente"
- **Então** vê o lobby de uma partida nova do mesmo quiz, com outro PIN e nenhum jogador
- **E** a partida terminada continua mostrando o seu pódio a quem a reabre

#### CA-18 — Jogar novamente com o quiz na lixeira

- **Dado** o pódio de uma partida cujo quiz foi movido para a lixeira
- **Quando** o anfitrião aciona "Jogar novamente"
- **Então** vê "Este quiz não pode mais ser jogado." e continua no pódio

#### CA-19 — Sair sem confirmação

- **Dado** o pódio na tela
- **Quando** o anfitrião aciona sair, ou "Voltar ao quiz"
- **Então** vai para a página do quiz, sem a pergunta "Encerrar o jogo?"

### Tela final do jogador

#### CA-20 — Espera e depois o resultado

- **Dado** um jogador na revelação da última pergunta
- **Quando** o anfitrião avança para o pódio
- **Então** o celular mostra "Rufar dos tambores…" e, quando a revelação do pódio termina, a tela final

#### CA-21 — Primeiro lugar

- **Dado** o jogador que terminou em 1º com 3127 pontos
- **Quando** a tela final aparece
- **Então** ele vê o título do quiz, a medalha com o número 1 e "Imbatível!"
- **E** o rodapé mostra o apelido dele e 3127

#### CA-22 — Segundo e terceiro

- **Dado** os jogadores que terminaram em 2º e em 3º
- **Quando** a tela final aparece
- **Então** veem a medalha com o seu número e, respectivamente, "Por pouco!" e "No pódio!"

#### CA-23 — Fora do pódio

- **Dado** o jogador que terminou em 5º
- **Quando** a tela final aparece
- **Então** ele vê "Você ficou em 5º lugar" e "Obrigado por jogar!", sem medalha, e o total no rodapé

#### CA-24 — Recarregar a tela final

- **Dado** um jogador na tela final
- **Quando** ele recarrega a página
- **Então** vê a tela final de novo, com o mesmo lugar e o mesmo total, sem a espera

#### CA-25 — Entrar em outro jogo

- **Dado** um jogador na tela final
- **Quando** ele aciona "Entrar em outro jogo"
- **Então** vê a entrada do PIN, sem mensagem de erro

#### CA-26 — Quem perdeu o aviso

- **Dado** um jogador cujo celular não recebeu o aviso do fim da partida
- **Quando** o celular consulta o servidor de novo
- **Então** ele vê a tela final

#### CA-27 — Jogador removido

- **Dado** um jogador removido durante a partida
- **Quando** a partida termina
- **Então** ele continua vendo que foi removido, sem tela final

### Animações

#### CA-28 — Pontos sobem no placar

- **Dado** Ana em 1º com 639 pontos, que ganha 701 na pergunta 2 e continua em 1º
- **Quando** o placar da pergunta 2 abre
- **Então** a faixa dela começa mostrando 639 e termina mostrando 1340, sem sair do lugar

#### CA-29 — Troca de posições

- **Dado** Bia em 2º depois da pergunta 1, que passa a 1º com a pergunta 2
- **Quando** o placar da pergunta 2 abre
- **Então** a faixa dela começa em 2º, sobe para 1º, e a seta aparece ao lado dela no fim

#### CA-30 — Entra nos cinco primeiros

- **Dado** sete jogadores, com Gil em 6º depois da pergunta 1, que passa a 4º com a pergunta 2
- **Quando** o placar da pergunta 2 abre
- **Então** ele começa sem Gil, a faixa de Gil sobe de baixo da lista até o 4º lugar, e quem estava em 5º sai da lista
- **E** no fim o placar mostra exatamente os cinco primeiros da pergunta 2

#### CA-31 — Primeiro placar

- **Dado** a revelação da pergunta 1
- **Quando** o placar abre
- **Então** os totais contam de 0 até os pontos de cada um, e ninguém leva seta

#### CA-32 — Nada mudou

- **Dado** uma pergunta em que ninguém pontuou
- **Quando** o placar abre
- **Então** aparece parado, com os mesmos totais e a mesma ordem

#### CA-33 — Avançar durante a animação

- **Dado** o placar no meio da contagem dos pontos
- **Quando** o anfitrião aciona Avançar
- **Então** a abertura da pergunta seguinte aparece na hora

#### CA-34 — Recarregar o placar

- **Dado** o placar da pergunta 2 na tela
- **Quando** o anfitrião recarrega a página
- **Então** a animação se repete e termina no mesmo placar, com as mesmas setas

#### CA-35 — Destaque do primeiro lugar

- **Dado** o pódio em revelação
- **Quando** aparecem o 3º e o 2º lugar, e depois o 1º
- **Então** os pontos de cada um contam de 0 até o total, e o confete só aparece com o 1º

#### CA-36 — Movimento reduzido

- **Dado** um aparelho com a preferência por movimento reduzido
- **Quando** o placar e o pódio aparecem
- **Então** o placar mostra direto o estado novo, e o pódio apresenta cada lugar no seu tempo, sem movimento e sem confete

#### CA-37 — Resultado no celular

- **Dado** um jogador com 639 pontos que ganha 701 na pergunta
- **Quando** a revelação aparece
- **Então** "+ 701" e o total do rodapé terminam a contagem em 701 e em 1340

#### CA-38 — Animação não segura o jogo

- **Dado** qualquer tela com uma animação em curso
- **Quando** a fase muda
- **Então** a tela mostra a fase nova, sem esperar a animação terminar

## Experiência (telas e estados)

As telas seguem as capturas do jogo de verdade, no tema escuro do Quizio.

- **Pódio (anfitrião)**: o título do quiz num cartão no alto; ao centro, três degraus roxos lado a lado, o do meio mais alto, cada um com a medalha do lugar (ouro, prata, bronze) na frente. Sobre cada degrau, o apelido numa etiqueta e, abaixo dele, os pontos. Os degraus ficam à vista desde o início; os jogadores sobem do 3º para o 1º, cada um com os pontos contando. O 1º entra depois de uma pausa maior, com brilho no degrau e confete.
- **Ações do anfitrião**: aparecem embaixo do pódio depois da revelação: "Classificação", "Jogar novamente" (a principal) e "Voltar ao quiz".
- **Classificação (anfitrião)**: lista no mesmo estilo do placar, com o número do lugar à esquerda, o apelido e os pontos; o primeiro em destaque; rola quando não cabe. "Voltar ao pódio" no alto.
- **Espera (jogador)**: "Rufar dos tambores…" ao centro, com o rodapé de sempre.
- **Tela final (jogador), no pódio**: o título do quiz numa etiqueta; a medalha grande com o número do lugar; a frase embaixo; "Entrar em outro jogo"; e o rodapé com o apelido e o total.
- **Tela final (jogador), fora do pódio**: o título do quiz, "Você ficou em 5º lugar", "Obrigado por jogar!", a mesma ação e o mesmo rodapé.
- **Placar (anfitrião), animado**: abre como estava antes da pergunta; os pontos sobem; as faixas deslizam para os lugares novos; quem entra nos cinco sobe de baixo, quem sai desce e some; a seta aparece no fim.
- **Microtransições**: cada fase entra com uma transição curta; as barras da revelação crescem; no celular, o sinal de certo ou errado salta, "+ N" e o total contam; no lobby, cada apelido novo salta ao aparecer.
- **Estados novos**: placar em animação, pódio em revelação, pódio completo, classificação, criando a nova partida, falha ao jogar novamente; no jogador, espera do pódio e tela final.

## Divergências intencionais do Kahoot

- **Sem avatar** sobre os degraus: só o apelido e os pontos (spec 008).
- **Sem música e sem efeitos sonoros**: as animações são só visuais; música é da spec 014.
- **Sem mensagens de celebração no placar** (jogador em sequência, quem subiu três posições): continuam fora, como na spec 010.
- **Todo jogador vê o seu lugar** (RN-21): no Kahoot, do 6º em diante o celular mostra só a pontuação.
- **Classificação completa na tela do anfitrião** (RN-14): no Kahoot ela só existe no relatório. Aqui ela cobre essa falta até a spec 015.
- **"Jogar novamente" sem fantasmas** (RN-15): é uma partida nova, sem os jogadores da anterior.
- **Sem "Obter feedback"** e sem acesso ao relatório no menu final.
- **Sem "Conquistas"** na tela final do jogador (spec 008).

## Fora de escopo

- Encerrar antes do fim indo direto ao pódio ("End kahoot"): spec 013. Hoje, encerrar no meio não tem pódio (RN-04).
- Relatório da partida, pesquisa de feedback e compartilhamento do pódio (spec 015).
- Fantasmas e levar os jogadores automaticamente para a nova partida.
- Avatares, música, efeitos sonoros, reações e conquistas.
- Animação de personagens no pódio: não há avatar.
- Como o jogador escolhe mais de uma alternativa na múltipla escolha (em aberto na spec 009).

## Perguntas em aberto

- [ ] **Sem placar na última pergunta** (RN-01) — segue o Kahoot e responde à pergunta em aberto da spec 010. A alternativa é manter o placar final antes do pódio.
- [ ] **Classificação completa** (RN-14) — não existe no Kahoot. A alternativa é deixar o anfitrião só com o pódio até os relatórios (spec 015).
- [ ] **"Jogar novamente"** (RN-15) — partida nova com PIN novo, e os jogadores entram de novo. A alternativa é levar os celulares da partida terminada direto para o novo lobby.
- [x] **O celular durante o pódio** (RN-18) — confirmado pelas capturas do Kahoot de 2026-10-02: "Rufar dos tambores…" com o indicador de carregamento, e o lugar só depois que o pódio termina na tela do anfitrião. Antes: — a espera "Rufar dos tambores…" é uma proposta: ainda não foi conferido o que o Kahoot mostra no celular enquanto o pódio é apresentado.
- [ ] **Tempos e frases** (RN-10, RN-18, RN-20, RN-21) — revelação aos 2, 4 e 7 segundos; "Rufar dos tambores…"; "Por pouco!", "No pódio!", "Você ficou em 5º lugar" e "Obrigado por jogar!" são propostas. Só "Imbatível!" vem das capturas.
- [ ] **Animações do placar** (RN-28 a RN-32) — escritas a partir da sua descrição: pontos subindo, depois a troca de lugares, quem entra sobe de baixo. A ordem dos movimentos e as durações (RN-26) são propostas.
- [ ] **Lista de microtransições** (RN-35) — entrada de cada fase, barras crescendo, sinal e pontos no celular, apelidos no lobby. Dá para tirar ou acrescentar.
- [ ] **Acertos no pódio** — o pódio mostra apelido e pontos. O Kahoot, ao menos no modo Precisão, mostra também "x de y" acertos; ficou de fora.

## Changelog

- 2026-10-01 — spec criada, com as capturas do pódio e da tela final de um jogo de verdade no Kahoot, enviadas pelo usuário. Decisões tomadas sem consulta prévia, listadas nas perguntas em aberto: a última pergunta vai direto ao pódio (RN-01); classificação completa para o anfitrião (RN-14); "Jogar novamente" como partida nova (RN-15); tempos da revelação e frases (RN-10, RN-18, RN-20, RN-21); sair do pódio sem confirmação (RN-12); o pódio de uma partida terminada não vence (RN-07).
- 2026-10-01 — a pedido do usuário, a spec passa a tratar das animações: placar com pontos subindo, troca de posições e entrada nos cinco primeiros (RN-28 a RN-32, altera a divergência "Sem animação" da spec 010); pódio com um lugar por vez e mais destaque para o 1º, que passa a aparecer aos 7 segundos (RN-10, RN-33); tela final do jogador (RN-34); microtransições nas telas que já existem (RN-35). Decisões tomadas sem consulta prévia: as animações nunca seguram o jogo (RN-25), durações (RN-26), movimento reduzido (RN-27), a lista de microtransições.
- 2026-10-01 — aprovada pelo usuário, com as decisões em aberto mantidas como propostas.
- 2026-10-01 — implementada. Sem mudança de regra. Ajustes decididos na implementação: quando ninguém que está no placar pontuou, a etapa da contagem é pulada e as faixas se movem logo (RN-29, RN-30); voltar da Classificação ao pódio não repete a comemoração (RN-11); um pedido de avançar repetido depois do fim recebe o pódio em vez de um erro (RN-03); os testes de ponta a ponta leem os pontos do celular com movimento reduzido, para não pegar um quadro da contagem. As perguntas em aberto continuam abertas, inclusive o que o celular mostra durante o pódio (RN-18).
- 2026-10-02 — capturas do celular num jogo de verdade no Kahoot, enviadas pelo usuário: a espera do pódio passa a dizer "Rufar dos tambores…", com o indicador de carregamento embaixo, no lugar de "Rufem os tambores…" com um tambor (RN-18, CA-20). O comportamento não muda.
- 2026-10-06 — spec 015: o pódio do anfitrião ganha "Ver relatório" (spec 015, RN-49).
