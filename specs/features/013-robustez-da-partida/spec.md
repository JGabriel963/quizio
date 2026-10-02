---
id: "013"
title: Opções de jogo 2/3 — Robustez da partida
status: done # draft | approved | planned | in-progress | done
contexts: [game]
created: 2026-10-02
---

# 013 — Opções de jogo 2/3: Robustez da partida

## Contexto e problema

A partida ao vivo funciona enquanto todo mundo tem internet. Numa sala de verdade, isso não dura o jogo inteiro: o Wi-Fi do anfitrião oscila, um celular entra no elevador, alguém bloqueia a tela. Hoje, quando isso acontece, ninguém fica sabendo:

- a tela do anfitrião é quem faz o jogo avançar (ADR 0009). Se ela perde a conexão, o jogo para onde está, a tela não diz nada e o anfitrião fica olhando para um cronômetro que chegou a zero;
- os jogadores continuam vendo a última tela que receberam, sem saber se o problema é do celular deles ou do anfitrião;
- um jogador sem conexão toca numa resposta e não tem como saber se ela chegou.

Falta também o botão que o Kahoot oferece para acabar com a partida sem sair da tela: **"Encerrar agora"**, no painel de Configurações.

A referência são as capturas de um jogo de verdade no Kahoot, enviadas pelo usuário em 2026-10-02: o fim do painel "Configurações" com "Encerrar kahoot — Encerrar agora", o diálogo "Conexão perdida. Não atualize a página!" na tela do anfitrião e a barra "Conexão perdida — O apresentador se desconectou", com "Sair", no celular do jogador. O usuário também observou, jogando, que o Kahoot **não deixa remover um jogador depois que o jogo começa** e que, ao encerrar, **todos os jogadores voltam à entrada do PIN**.

Esta é a segunda das três etapas de "robustez e opções de jogo":

| Spec | Etapa |
| --- | --- |
| 012 | Painel de configurações, entrada durante o jogo, perguntas nos dispositivos, múltipla escolha no celular e ordem aleatória ✅ |
| **013** | **Robustez: "Encerrar agora", anfitrião que perde a conexão, jogador que perde a conexão (esta spec)** |
| 014 | Reprodução automática, gerador e filtro de apelidos, música |

## Objetivo

Quando a conexão de alguém cai, todas as telas dizem o que está acontecendo e o jogo continua de onde parou assim que a conexão volta, sem ninguém precisar recarregar a página. O anfitrião encerra a partida pelo painel de Configurações quando quiser.

## Personas

- **Anfitrião (`Host`)** — conduz o jogo numa rede que pode falhar e precisa saber quando a tela dele deixou de falar com o servidor.
- **Jogador (`Player`)** — precisa saber se o jogo parou por causa dele ou do anfitrião, e voltar sem perder os pontos.

## Histórias de usuário

- **HU-01** — Como anfitrião, quero encerrar a partida pelo painel de Configurações, para acabar com o jogo sem procurar o botão de sair.
- **HU-02** — Como anfitrião, quero ser avisado quando a minha tela perde a conexão, para não achar que o jogo travou.
- **HU-03** — Como anfitrião, quero que o jogo continue de onde parou quando a conexão volta, para não precisar recomeçar a partida.
- **HU-04** — Como jogador, quero saber quando o anfitrião se desconectou, para entender por que o jogo não anda.
- **HU-05** — Como jogador, quero ser avisado quando o meu celular perde a conexão e voltar sozinho ao jogo, para não perder os meus pontos.
- **HU-06** — Como jogador, quero saber quando a minha resposta não foi enviada, para tentar de novo enquanto der tempo.

## Regras de negócio

### Encerrar agora

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | O painel de Configurações (spec 012, RN-01 a RN-03) ganha, depois das chaves e antes do rodapé, a linha **"Encerrar jogo"** com o botão **"Encerrar agora"**. Ela aparece sempre que o painel aparece: no lobby e durante o jogo. | referência visual do Kahoot ("Encerrar kahoot — Encerrar agora") |
| RN-02 | "Encerrar agora" faz **o mesmo que o botão de sair** do cabeçalho: abre a confirmação "Encerrar o jogo?" (spec 008, RN-31) e, confirmado, encerra a partida e leva o anfitrião à página do quiz. Cancelar volta ao painel, com o jogo como estava. | spec 008, RN-31 · spec 009, RN-05 |
| RN-03 | Uma partida encerrada no meio **continua sem pódio**: os jogadores voltam à entrada do PIN com "O anfitrião encerrou o jogo." e a tela do anfitrião, se reaberta, diz "Esta partida foi encerrada." Confirma a spec 011, RN-04; o que o roadmap previa ("encerrar antes indo ao pódio") deixa de valer. | observação do usuário no Kahoot (2026-10-02) · decisão do produto (2026-10-02) |

### Anfitrião sem conexão: a tela do anfitrião

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-04 | A tela do anfitrião está **sem conexão (`connectionLost`)** quando não consegue falar com o servidor: o navegador avisa que está sem rede, ou os pedidos da tela ao servidor falham por falta de resposta. Uma resposta de erro do servidor (partida encerrada, fase que ainda não venceu) não é falta de conexão. | decisão do produto (2026-10-02) |
| RN-05 | Sem conexão, a tela mostra por cima de tudo o diálogo **"Conexão perdida"**, com a tela do jogo escurecida atrás. O texto diz: "Vamos tentar reconectar automaticamente. O jogo continua de onde parou assim que a conexão voltar." e, abaixo, "Se não reconectar, verifique a sua internet e clique em Reconectar." | referência visual do Kahoot |
| RN-06 | A tela **tenta de novo sozinha** a cada 5 segundos e mostra a contagem: "Tentando novamente em {n} segundos…". Durante a tentativa, mostra "Reconectando…". | referência visual do Kahoot ("Tentando novamente em 4 segundos…") |
| RN-07 | O botão **"Reconectar"** tenta na hora, sem esperar a contagem. | referência visual do Kahoot |
| RN-08 | O diálogo **não pode ser fechado** pelo anfitrião (sem X, Esc ou clique fora) e, enquanto está aberto, os controles da tela (Avançar, Pular, Configurações, sair) não respondem. Ele fecha sozinho quando a conexão volta. | referência visual do Kahoot |
| RN-09 | O aviso vale **no lobby, durante o jogo e no pódio**. Numa partida já encerrada não há aviso. | decisão do produto (2026-10-02) |
| RN-10 | Enquanto o anfitrião está sem conexão, **o jogo não avança** de fase, mas **os prazos continuam correndo no servidor**: uma resposta enviada dentro do tempo da pergunta é aceita e pontuada normalmente, mesmo sem o anfitrião. | ADR 0009 · spec 009, RN-32 |
| RN-11 | Quando a conexão volta, a tela mostra **a fase em que a partida está**, com o tempo que resta de verdade. Se o prazo da fase venceu durante a queda, a tela avança como avançaria sem a queda: por exemplo, uma pergunta cujo tempo acabou vai direto para os resultados, com as respostas que chegaram. | spec 009, RN-32 |
| RN-12 | **Recarregar ou reabrir** a tela do anfitrião durante a queda não encerra a partida (spec 008, RN-33): com a conexão de volta, a tela abre na fase em que a partida está. | spec 008, RN-33 |
| RN-13 | Se a partida **foi encerrada durante a queda** (prazo de 8 horas, nova partida do mesmo quiz), a tela mostra "Esta partida foi encerrada." ao reconectar. | spec 008, RN-11, RN-32 |

### Anfitrião sem conexão: o celular do jogador

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-14 | O anfitrião conta como **ausente (`hostAway`)** quando a tela dele fica **10 segundos** sem dar sinal ao servidor, seja por queda de conexão, seja por ter fechado a aba. Ele deixa de estar ausente no primeiro sinal que a tela der. | decisão do produto (2026-10-02) |
| RN-15 | Com o anfitrião ausente, o celular de cada jogador mostra, na parte de baixo, a barra **"Conexão perdida"** com **"O anfitrião se desconectou"**, um indicador de espera e o botão **"Sair"**. A tela atrás fica escurecida. | referência visual do Kahoot ("O apresentador se desconectou") |
| RN-16 | A barra **some sozinha** quando o anfitrião volta, e o celular mostra a fase em que a partida está. | decisão do produto (2026-10-02) |
| RN-17 | A barra **não impede de responder**: se as respostas da pergunta ainda estão abertas, o jogador responde e a resposta vale (RN-10). | decisão do produto (2026-10-02) · ADR 0009 |
| RN-18 | **"Sair"** leva o jogador à entrada do PIN, **sem tirá-lo da partida**: ele continua na lista e no placar, e a entrada do PIN oferece "Voltar como {apelido}" enquanto a partida estiver aberta (spec 008, RN-44a). | spec 008, RN-44a |
| RN-19 | O aviso vale **no lobby e durante o jogo**. Numa partida terminada (tela final do jogador) ou encerrada não há aviso. | decisão do produto (2026-10-02) |

### Jogador sem conexão

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-20 | O celular do jogador está **sem conexão** nas mesmas condições da RN-04. Ele mostra a mesma barra da RN-15, com **"Conexão perdida"** e **"Tentando reconectar…"**, e o botão "Sair" (RN-18). | decisão do produto (2026-10-02) |
| RN-21 | O aviso do próprio celular **tem prioridade** sobre o do anfitrião: sem conexão, o celular não tem como saber do anfitrião. | decisão do produto (2026-10-02) |
| RN-22 | O celular **volta sozinho**: tenta de novo a cada 5 segundos e, com a conexão de volta, mostra a fase em que a partida está, como **o mesmo jogador**, com os mesmos pontos (spec 009, RN-32; spec 008, RN-46). | kahoot-reference §9 ("retomar como o mesmo jogador") |
| RN-23 | Uma resposta que **não chegou ao servidor** não aparece como enviada: o celular avisa **"Sua resposta não foi enviada."** e volta a mostrar as alternativas, para o jogador tentar de novo enquanto as respostas estiverem abertas. | decisão do produto (2026-10-02) |
| RN-24 | Uma pergunta **não respondida por causa da queda** conta como sem resposta: 0 pontos e a sequência zerada, como qualquer pergunta sem resposta (spec 010). | kahoot-reference §9 ("contem como sem resposta") |
| RN-25 | A pergunta **continua esperando** por quem caiu: as respostas só fecham antes do tempo quando todos os jogadores que podem responder responderam (spec 009; spec 012, entrada durante o jogo). Quem está sem conexão segura a pergunta até o tempo acabar. | decisão do produto (2026-10-02) |
| RN-26 | Para o anfitrião, **nada muda** quando um jogador cai: ele continua na lista do lobby, no total de jogadores, no placar e no pódio. | spec 008 ("fora de escopo: saber se um jogador fechou a aba") |
| RN-27 | Se o jogador **foi removido** (no lobby) ou a partida **foi encerrada** durante a queda, ao voltar ele vê a entrada do PIN com a mensagem correspondente. Se a partida **terminou**, vê a tela final com o lugar e o total. | spec 008, RN-46 · spec 011 |

### Apresentação

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-28 | O diálogo do anfitrião e a barra do jogador **entram e saem com animação** curta (o diálogo cresce a partir do centro, a barra sobe da borda de baixo), e o indicador de espera gira. Com movimento reduzido, aparecem e somem sem animação e o indicador fica parado. | spec 011 (animações) · constituição, artigo VIII |
| RN-29 | Os avisos são **anunciados** por leitores de tela quando aparecem: o diálogo do anfitrião como alerta, a barra do jogador como aviso. O foco do teclado vai para "Reconectar" no diálogo. | constituição, artigo VIII |

## Critérios de aceite

### Encerrar agora

#### CA-01 — A linha aparece no painel

- **Dado** o anfitrião no lobby ou numa pergunta em andamento
- **Quando** ele abre as Configurações
- **Então** vê, depois das chaves, "Encerrar jogo" com o botão "Encerrar agora"

#### CA-02 — Encerrar pelo painel durante o jogo

- **Dado** uma partida na segunda pergunta, com os jogadores "ANA" e "BIA"
- **Quando** o anfitrião aciona "Encerrar agora" e confirma em "Encerrar"
- **Então** ele vai para a página do quiz
- **E** os celulares de "ANA" e "BIA" voltam à entrada do PIN com "O anfitrião encerrou o jogo."
- **E** o PIN deixa de ser reconhecido

#### CA-03 — Desistir de encerrar

- **Dado** a confirmação "Encerrar o jogo?" aberta a partir do painel
- **Quando** o anfitrião aciona "Cancelar"
- **Então** a partida continua aberta, na mesma fase

#### CA-04 — Encerrada no meio não tem pódio

- **Dado** uma partida encerrada por "Encerrar agora" na segunda pergunta
- **Quando** o anfitrião reabre o endereço da partida
- **Então** vê "Esta partida foi encerrada." e "Voltar ao quiz", sem pódio

### Anfitrião sem conexão: a tela do anfitrião

#### CA-05 — Aviso de conexão perdida

- **Dado** a tela do anfitrião numa pergunta em andamento
- **Quando** a tela deixa de conseguir falar com o servidor
- **Então** aparece o diálogo "Conexão perdida", por cima da tela escurecida, com o texto de reconexão, "Tentando novamente em 5 segundos…" e o botão "Reconectar"

#### CA-06 — Contagem e nova tentativa

- **Dado** o diálogo "Conexão perdida" aberto, ainda sem conexão
- **Quando** passam 5 segundos
- **Então** a tela tenta de novo, mostra "Reconectando…" e, sem resposta, recomeça a contagem de 5 segundos

#### CA-07 — Reconectar na hora

- **Dado** o diálogo aberto, com a contagem em 4 segundos, e a conexão já de volta
- **Quando** o anfitrião aciona "Reconectar"
- **Então** o diálogo fecha sem esperar a contagem e a tela mostra a fase em que a partida está

#### CA-08 — Volta sozinha

- **Dado** o diálogo aberto
- **Quando** a conexão volta e a tentativa seguinte tem resposta
- **Então** o diálogo fecha sozinho, sem o anfitrião tocar em nada

#### CA-09 — O diálogo não fecha à mão

- **Dado** o diálogo "Conexão perdida" aberto
- **Quando** o anfitrião pressiona Esc ou clica fora dele
- **Então** o diálogo continua aberto
- **E** "Avançar" e "Configurações" não respondem

#### CA-10 — Erro do servidor não é queda

- **Dado** a tela do anfitrião com conexão
- **Quando** um pedido para avançar é recusado porque o prazo da fase ainda não venceu
- **Então** o diálogo "Conexão perdida" não aparece

#### CA-11 — O prazo corre durante a queda

- **Dado** uma pergunta de 20 segundos com 15 segundos restantes
- **Quando** o anfitrião fica 8 segundos sem conexão e volta
- **Então** a tela mostra a mesma pergunta com cerca de 7 segundos restantes

#### CA-12 — Respostas durante a queda valem

- **Dado** uma pergunta aberta, com o anfitrião sem conexão
- **Quando** "ANA" responde certo dentro do tempo e o anfitrião volta antes de o tempo acabar
- **Então** a tela do anfitrião mostra 1 resposta
- **E** nos resultados "ANA" recebe os pontos da resposta

#### CA-13 — Prazo vencido durante a queda

- **Dado** uma pergunta aberta com 5 segundos restantes
- **Quando** o anfitrião fica 30 segundos sem conexão e volta
- **Então** a tela vai para os resultados da pergunta, com as respostas que chegaram dentro do tempo
- **E** o jogo segue dali normalmente

#### CA-14 — Queda no lobby

- **Dado** o anfitrião no lobby, sem conexão, e "ANA" entra pelo PIN nesse intervalo
- **Quando** a conexão volta
- **Então** o diálogo fecha e "ANA" aparece na lista

#### CA-15 — Queda no pódio

- **Dado** o anfitrião no pódio, com o terceiro lugar já revelado
- **Quando** ele fica sem conexão por 10 segundos e volta
- **Então** viu o diálogo durante a queda e, na volta, o pódio aparece com os três lugares revelados

#### CA-16 — Recarregar durante a queda

- **Dado** o anfitrião sem conexão numa pergunta
- **Quando** ele recarrega a página depois de a conexão voltar
- **Então** a tela abre na fase em que a partida está, e a partida não foi encerrada

#### CA-17 — Partida encerrada durante a queda

- **Dado** o anfitrião sem conexão e a partida passa do prazo de 8 horas
- **Quando** a conexão volta
- **Então** a tela mostra "Esta partida foi encerrada.", sem o diálogo

### Anfitrião sem conexão: o celular do jogador

#### CA-18 — Aviso de anfitrião ausente

- **Dado** "ANA" numa partida em andamento
- **Quando** a tela do anfitrião fica 10 segundos sem dar sinal
- **Então** o celular de "ANA" mostra, embaixo, "Conexão perdida", "O anfitrião se desconectou" e o botão "Sair", com a tela escurecida atrás

#### CA-19 — Antes dos 10 segundos não há aviso

- **Dado** "ANA" numa partida em andamento
- **Quando** a tela do anfitrião fica 4 segundos sem dar sinal e volta
- **Então** o celular de "ANA" não mostra a barra

#### CA-20 — O anfitrião volta

- **Dado** o celular de "ANA" com a barra "O anfitrião se desconectou"
- **Quando** a tela do anfitrião volta a dar sinal
- **Então** a barra some sozinha e o celular mostra a fase em que a partida está

#### CA-21 — Fechar a aba conta como ausência

- **Dado** "ANA" numa partida em andamento
- **Quando** o anfitrião fecha a aba da partida
- **Então** depois de 10 segundos o celular de "ANA" mostra a barra
- **E** quando o anfitrião reabre a partida, a barra some

#### CA-22 — Responder com o anfitrião ausente

- **Dado** uma pergunta aberta e o celular de "ANA" com a barra "O anfitrião se desconectou"
- **Quando** "ANA" toca numa alternativa
- **Então** a resposta é enviada e o celular mostra a espera pelo resultado, ainda com a barra

#### CA-23 — Sair e voltar

- **Dado** o celular de "ANA", com 900 pontos, mostrando a barra
- **Quando** ela aciona "Sair"
- **Então** vai para a entrada do PIN, que oferece "Voltar como ANA"
- **E** ao voltar, com o anfitrião de volta, ela continua com 900 pontos

#### CA-24 — Aviso no lobby do jogador

- **Dado** "ANA" na tela de espera do lobby
- **Quando** a tela do anfitrião fica 10 segundos sem dar sinal
- **Então** o celular mostra a barra "O anfitrião se desconectou"

#### CA-25 — Sem aviso depois do fim

- **Dado** "ANA" na tela final de uma partida terminada
- **Quando** o anfitrião fecha a aba
- **Então** o celular não mostra a barra

### Jogador sem conexão

#### CA-26 — Aviso no celular

- **Dado** "ANA" numa partida em andamento
- **Quando** o celular dela deixa de conseguir falar com o servidor
- **Então** aparece a barra "Conexão perdida" com "Tentando reconectar…" e "Sair"

#### CA-27 — Prioridade sobre o aviso do anfitrião

- **Dado** o anfitrião ausente e o celular de "ANA" sem conexão
- **Quando** a barra aparece
- **Então** ela diz "Tentando reconectar…", e não "O anfitrião se desconectou"

#### CA-28 — Volta sozinho como o mesmo jogador

- **Dado** "ANA" com 900 pontos e o celular sem conexão durante a pergunta 2
- **Quando** a conexão volta durante a pergunta 3
- **Então** a barra some sem ela tocar em nada, o celular mostra a pergunta 3 e o total de 900 pontos

#### CA-29 — Resposta que não foi enviada

- **Dado** uma pergunta aberta e o celular de "ANA" sem conexão
- **Quando** ela toca numa alternativa
- **Então** o celular avisa "Sua resposta não foi enviada." e volta a mostrar as alternativas
- **E** a tela do anfitrião não conta a resposta

#### CA-30 — Tentar de novo dentro do tempo

- **Dado** que a resposta de "ANA" não foi enviada e a conexão voltou, com a pergunta ainda aberta
- **Quando** ela toca de novo na alternativa
- **Então** a resposta é enviada e conta, com os pontos do momento em que chegou

#### CA-31 — Pergunta perdida

- **Dado** "ANA" com sequência de 2 e o celular sem conexão durante toda a pergunta 3
- **Quando** os resultados da pergunta 3 saem e a conexão volta
- **Então** o celular mostra a pergunta como sem resposta, com 0 pontos, e a sequência zerada

#### CA-32 — A pergunta espera por quem caiu

- **Dado** uma pergunta de 20 segundos com "ANA" e "BIA", e o celular de "BIA" sem conexão
- **Quando** "ANA" responde aos 3 segundos
- **Então** as respostas continuam abertas até o tempo acabar

#### CA-33 — Nada muda para o anfitrião

- **Dado** uma partida com "ANA" e "BIA"
- **Quando** o celular de "BIA" fica sem conexão
- **Então** a tela do anfitrião continua mostrando 2 jogadores
- **E** "BIA" aparece na classificação final, com os pontos que tinha

#### CA-34 — Encerrada durante a queda

- **Dado** o celular de "ANA" sem conexão
- **Quando** o anfitrião encerra a partida e a conexão de "ANA" volta
- **Então** o celular vai para a entrada do PIN com "O anfitrião encerrou o jogo."

#### CA-35 — Terminada durante a queda

- **Dado** o celular de "ANA" sem conexão na última pergunta
- **Quando** a partida termina e a conexão volta
- **Então** o celular mostra a tela final, com o lugar e o total de "ANA"

### Apresentação

#### CA-36 — Movimento reduzido

- **Dado** um aparelho com a preferência de movimento reduzido
- **Quando** o diálogo do anfitrião ou a barra do jogador aparece
- **Então** aparece sem animação de entrada, e o indicador de espera não gira

#### CA-37 — Leitores de tela e teclado

- **Dado** a tela do anfitrião usada com leitor de tela
- **Quando** o diálogo "Conexão perdida" abre
- **Então** ele é anunciado como alerta e o foco vai para "Reconectar"
- **E** no celular, a barra é anunciada quando aparece

## Experiência (telas e estados)

- **Painel de Configurações**: abaixo das quatro chaves, separada por uma linha, a linha "Encerrar jogo" com o botão azul "Encerrar agora" à direita, como no Kahoot. O rodapé "Suas configurações serão salvas para a próxima vez." continua por último. A confirmação é a mesma do botão de sair.
- **Anfitrião sem conexão**: a tela do jogo escurece e, no centro, um diálogo branco com o título "Conexão perdida", o texto de reconexão, uma ilustração ou ícone de conexão, a linha "Tentando novamente em {n} segundos…" (ou "Reconectando…") e o botão azul "Reconectar". O cabeçalho e o jogo ficam visíveis atrás, sem responder.
- **Jogador com o anfitrião ausente**: a tela em que ele estava (espera, alternativas, resultado) escurece e, na parte de baixo, uma barra escura com o indicador de espera, "Conexão perdida" em destaque, "O anfitrião se desconectou" abaixo e o botão branco "Sair" à direita. As alternativas, se abertas, continuam tocáveis.
- **Jogador sem conexão**: a mesma barra, com "Tentando reconectar…" no lugar da segunda linha.
- **Resposta não enviada**: aviso curto "Sua resposta não foi enviada." e as alternativas de volta.
- **Estados**: conexão perdida (anfitrião), reconectando (anfitrião), anfitrião ausente (jogador), sem conexão (jogador), resposta não enviada (jogador); e os que já existem para a volta: fase atual, partida encerrada, removido, tela final.

## Divergências intencionais do Kahoot

- **Recarregar não encerra a partida** (RN-12): o diálogo do Kahoot diz "Não atualize esta página nem clique para retornar, pois isso encerrará o kahoot". Aqui a partida vive no servidor (spec 008, RN-33), então o aviso não proíbe recarregar; o título é só "Conexão perdida".
- **As respostas valem com o anfitrião ausente** (RN-10, RN-17): no Kahoot o jogo passa pela tela do apresentador, e sem ela nada é registrado. Aqui o servidor mede o tempo e recebe as respostas, então quem responde dentro do prazo pontua.
- **"Anfitrião" no lugar de "apresentador"** (RN-15): o termo do glossário.
- **"Encerrar agora" pede confirmação** (RN-02): a mesma do botão de sair, para um clique no painel não acabar com o jogo. Se o Kahoot confirma, não foi observado.
- **Sem pódio ao encerrar no meio** (RN-03): igual ao que o usuário observou no Kahoot; diverge só do que o roadmap previa.

## Fora de escopo

- **Remover jogador durante o jogo**: o Kahoot não oferece depois que o jogo começa (observação do usuário, 2026-10-02). A remoção continua só no lobby (spec 008).
- **Trocar de aparelho mantendo os pontos**: como no Kahoot, em outro aparelho ou navegador o jogador entra com um apelido novo e começa do zero (decisão do produto, 2026-10-02).
- **Pódio ao encerrar antes do fim** (decisão do produto, 2026-10-02).
- Mostrar ao anfitrião quais jogadores estão sem conexão, e fechar as respostas sem esperar por eles (decisão do produto, 2026-10-02).
- Pausar o jogo de propósito: a queda do anfitrião não é uma pausa, os prazos correm (RN-10).
- Reprodução automática, gerador e filtro de apelidos, entrada em duas etapas, música e efeitos sonoros (spec 014).

## Perguntas em aberto

Nenhuma. Resolvidas em 2026-10-02, como proposto:

- [x] **10 segundos para o anfitrião contar como ausente** (RN-14).
- [x] **Responder com o anfitrião ausente vale** (RN-17).
- [x] **"Encerrar agora" pede a confirmação "Encerrar o jogo?"** (RN-02).
- [x] **Organizar de novo com um jogo em andamento** continua como está: a partida nova encerra a anterior sem perguntar (spec 008, RN-07). Não entra nesta spec.

## Changelog

- 2026-10-02 — spec criada. Em relação ao que o roadmap previa para a 013, saíram "encerrar indo ao pódio", "trocar de aparelho" e "remover jogador durante o jogo", depois de o usuário observar o Kahoot e decidir segui-lo; entraram o botão "Encerrar agora" no painel e os avisos de conexão perdida das capturas.
- 2026-10-02 — spec aprovada pelo usuário; perguntas em aberto resolvidas como proposto.
- 2026-10-02 — implementação: a barra do jogador fica na borda de baixo, por cima do apelido, para não cobrir as alternativas nem o "Enviar"; enquanto ela está aberta, o aviso "Sua resposta não foi enviada." aparece no alto da tela (RN-15, RN-23).
- 2026-10-02 — decisão do usuário durante a implementação: uma ação que o anfitrião pede (travar, mudar uma opção, remover, encerrar) e que falha por falta de conexão continua mostrando o aviso da própria ação (spec 012, RN-04), além de abrir o diálogo "Conexão perdida". Só o avanço automático de fase não avisa.
- 2026-10-02 — spec entregue.
