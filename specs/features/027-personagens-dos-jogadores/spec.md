---
id: "027"
title: Personagens dos jogadores
status: planned # draft | approved | planned | in-progress | done
contexts: [game]
created: 2026-10-15
---

# 027 — Personagens dos jogadores

## Contexto e problema

Desde a spec 008, o jogador é só um apelido: o cartão do lobby, a tela de espera, o rodapé do celular, o placar e o pódio mostram texto e nada mais. A divergência "Sem avatar" foi registrada nas specs 008 a 011 para entregar a partida em etapas, e os avatares ficaram na linha de Extras do roadmap.

No Kahoot, quem entra recebe um **personagem** e pode trocá-lo, com um **acessório**, enquanto espera. O personagem aparece ao lado do apelido na tela do anfitrião e no rodapé do celular (capturas enviadas pelo usuário em 2026-10-15). É o que dá cara à sala de espera: os jogadores se reconhecem na tela do anfitrião antes de saber o próprio apelido de cor, e se divertem trocando de chapéu enquanto o jogo não começa.

## Objetivo

Todo jogador tem um avatar, sorteado ao entrar e personalizável enquanto espera, que aparece junto do apelido no lobby, durante o jogo e no pódio. O anfitrião pode desligar os personagens no painel de configurações.

## Personas

- **Jogador**: escolhe o personagem e o acessório no celular, sem conta.
- **Anfitrião**: vê os avatares na tela compartilhada e decide se a partida tem personagens.

## Histórias de usuário

- **HU-01** — Como jogador, quero já ter um personagem ao entrar, para aparecer na tela sem precisar fazer nada.
- **HU-02** — Como jogador, quero trocar o personagem e pôr um acessório enquanto espero, para me reconhecer na tela do anfitrião.
- **HU-03** — Como anfitrião, quero ver o avatar de cada jogador no lobby, no placar e no pódio, para a sala ficar mais viva.
- **HU-04** — Como anfitrião, quero poder desligar os personagens, para uma partida mais sóbria (uma aula formal, uma apresentação).
- **HU-05** — Como jogador que volta para outra partida no mesmo aparelho, quero começar com o avatar que escolhi da última vez.

## Regras de negócio

### Avatar e catálogo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | O **avatar (`Avatar`)** de um jogador é um **personagem (`character`)** e, opcionalmente, um **acessório (`accessory`)** desenhado sobre ele. | referência visual do Kahoot (capturas de 2026-10-15) · kahoot-reference §6.2 (`gameCharacters`) |
| RN-02 | Personagens e acessórios vêm de um **catálogo fixo** do Quizio, igual para todas as partidas: pelo menos **24 personagens** (rostos de bichos e criaturas) e **24 acessórios** (chapéus, óculos, capacetes, enfeites de cabeça). Cada item tem um nome em português ("Coala", "Capacete viking"). | referência visual do Kahoot (o Kahoot tem ~33 personagens e ~48 acessórios) · decisão do produto (2026-10-15) |
| RN-03 | A arte vem de um **conjunto de ilustrações com licença livre**, nunca dos desenhos do Kahoot, e a licença fica registrada no repositório. Todo acessório do catálogo combina com todo personagem (fica no lugar certo da cabeça). | decisão do usuário (2026-10-15) |
| RN-04 | O acessório é opcional: a grade de acessórios começa com **"Nenhum"**. | decisão do produto (2026-10-15) |
| RN-05 | Avatares **podem se repetir** na partida: dois jogadores podem ter o mesmo personagem e o mesmo acessório. O que identifica o jogador continua sendo o apelido (spec 008, RN-42). | decisão do produto (2026-10-15) |
| RN-06 | O servidor só aceita avatares do catálogo. Um personagem ou acessório desconhecido é recusado e o avatar do jogador não muda. | constituição, artigo V |

### Avatar ao entrar

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-07 | Ao entrar (pelo PIN, pelo link ou pelo QR, no lobby ou com o jogo em andamento), o jogador recebe um **avatar sorteado**: um personagem e um acessório quaisquer do catálogo. Ele não precisa escolher nada para jogar. | referência visual do Kahoot (o jogador entra com coala e capacete viking sem ter escolhido) |
| RN-08 | O navegador **lembra o último avatar** que o jogador escolheu. Ao entrar em outra partida nesse navegador, ele começa com esse avatar em vez do sorteio. Se o item lembrado saiu do catálogo, vale o sorteio. | decisão do produto (2026-10-15) |
| RN-09 | Recarregar a página, "Voltar como {apelido}" ou abrir de novo o link da partida mantém o avatar do jogador, como mantém o apelido (spec 008, RN-44 e RN-44a). | spec 008, RN-44 |

### Trocar o avatar

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-10 | Na **tela de espera** (spec 008, RN-43), o avatar aparece grande, num cartão acima do apelido, com um **botão de lápis** no canto ("Editar avatar"). | referência visual do Kahoot |
| RN-11 | O lápis abre o **editor de avatar**: o avatar em destaque no alto, as abas **"Personagem"** e **"Acessório"**, uma grade que rola com os itens da aba e o botão **"Pronto"**. Cada acessório aparece numa cabeça neutra, para mostrar onde fica. O item atual fica com contorno. | referência visual do Kahoot |
| RN-12 | Tocar num item **troca o avatar na hora**: o destaque do editor, o rodapé do celular e o cartão do lobby na tela do anfitrião mudam, sem esperar o "Pronto". "Pronto" só fecha o editor. | referência visual do Kahoot (a tela do anfitrião já mostra o capacete de astronauta com o editor aberto) |
| RN-13 | O avatar pode ser trocado **enquanto o jogador espera para jogar**: no lobby, e, para quem entrou com o jogo em andamento, enquanto aguarda a primeira pergunta que pode responder (spec 012, RN-13). Quando a pergunta dele começa, o editor fecha e o lápis some; dali em diante o avatar fica fixo até o fim da partida. | decisão do produto (2026-10-15) |
| RN-14 | Uma troca pedida fora desse período é recusada e o avatar não muda. Se uma troca falhar (recusa ou falta de conexão), o celular volta ao avatar que o servidor tem e avisa "Não foi possível trocar o avatar." | constituição, artigo V · spec 013 |
| RN-15 | Cada troca bem-sucedida passa a ser o avatar lembrado pelo navegador (RN-08). | decisão do produto (2026-10-15) |

### Onde o avatar aparece

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-16 | **Lobby do anfitrião**: o cartão de cada jogador mostra o avatar à esquerda do apelido. | referência visual do Kahoot |
| RN-17 | **Rodapé do celular** (spec 010, RN-16): o avatar pequeno à esquerda do apelido e do total, em todas as telas do jogador que têm rodapé, da espera à tela final. | referência visual do Kahoot |
| RN-18 | **Placar** (spec 010, RN-18): cada uma das cinco linhas mostra o avatar ao lado do apelido. | decisão do usuário (2026-10-15) |
| RN-19 | **Pódio** (spec 011, RN-08): cada degrau mostra o avatar do jogador acima do apelido, e o avatar entra junto com o apelido na revelação (spec 011, RN-33). A **classificação** completa (spec 011, RN-14) também mostra o avatar ao lado do apelido. | decisão do usuário (2026-10-15) |
| RN-20 | O avatar nunca substitui o apelido: em todo lugar onde aparece, o apelido continua escrito ao lado. Para leitores de tela, o avatar ao lado do apelido é decorativo; no editor, cada item é anunciado pelo nome. | constituição, artigo VIII · decisão do produto (2026-10-15) |
| RN-21 | **Microanimações**: no lobby, quando um jogador troca de avatar, o avatar do cartão dele muda com um salto curto; no editor, o avatar em destaque faz o mesmo a cada troca. Com movimento reduzido, a troca é imediata. | memória do produto ("telas do jogo têm microanimações") · spec 011, RN-35 |

### Chave "Personagens dos jogadores"

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-22 | O painel de Configurações (spec 012, RN-03) ganha a chave **"Personagens dos jogadores"**, com a explicação "Os jogadores escolhem um personagem e um acessório.". Ela fica depois de "Reprodução automática" (spec 014, RN-01) e antes de "Encerrar jogo". | kahoot-reference §6.2 (`gameCharacters`) · decisão do usuário (2026-10-15) |
| RN-23 | A chave é uma das **opções de jogo salvas para o criador** (spec 012, RN-05). Quem nunca mexeu começa com ela **ligada**. | decisão do usuário (2026-10-15) |
| RN-24 | A chave pode ser mudada **no lobby e durante o jogo**, e vale na hora, como as outras (spec 012, RN-04). | spec 012, RN-04 · spec 014, RN-02 |
| RN-25 | **Desligada**, nenhuma tela mostra avatares: o lobby, o placar, o pódio e a classificação voltam a ter só o apelido, e a tela de espera mostra o apelido sem cartão e sem lápis, como na spec 008. Um editor aberto fecha. | decisão do produto (2026-10-15) |
| RN-26 | Desligar não apaga nada: cada jogador continua tendo o seu avatar (quem entra com a chave desligada também recebe um, RN-07), e religar mostra de novo os avatares de todos. | decisão do produto (2026-10-15) |

## Critérios de aceite

### CA-01 — Avatar sorteado ao entrar

- **Dado** uma partida no lobby, com "Personagens dos jogadores" ligada, e um navegador que nunca escolheu avatar
- **Quando** o jogador entra com o apelido "Ana"
- **Então** a tela de espera mostra um avatar do catálogo num cartão acima de "Ana", com o lápis no canto
- **E** a tela do anfitrião mostra o mesmo avatar no cartão de "Ana"

### CA-02 — Avatar lembrado na partida seguinte

- **Dado** um jogador que, numa partida anterior nesse navegador, escolheu o personagem "Coala" com o acessório "Cartola"
- **Quando** ele entra em outra partida
- **Então** começa com "Coala" e "Cartola", e não com um sorteio

### CA-03 — Avatar lembrado que saiu do catálogo

- **Dado** um navegador que lembra um personagem que não existe mais no catálogo
- **Quando** o jogador entra numa partida
- **Então** recebe um avatar sorteado, sem erro

### CA-04 — Abrir o editor

- **Dado** um jogador na tela de espera
- **Quando** toca no lápis
- **Então** vê o avatar em destaque, as abas "Personagem" e "Acessório", a grade da aba "Personagem" com o personagem atual contornado e o botão "Pronto"

### CA-05 — Trocar o personagem na hora

- **Dado** o editor aberto e o anfitrião vendo o lobby
- **Quando** o jogador toca em "Tigre"
- **Então** o destaque do editor e o rodapé do celular mostram o tigre, com o acessório que já tinha
- **E** o cartão dele na tela do anfitrião passa a mostrar o tigre, sem o jogador tocar em "Pronto"

### CA-06 — Trocar e tirar o acessório

- **Dado** o editor aberto na aba "Acessório", com o jogador usando "Capacete viking"
- **Quando** toca em "Cartola" e depois em "Nenhum"
- **Então** o avatar passa a usar a cartola e, em seguida, fica sem acessório, no celular e na tela do anfitrião

### CA-07 — Acessórios numa cabeça neutra

- **Dado** o editor na aba "Acessório"
- **Então** cada acessório aparece sobre uma cabeça neutra, e o primeiro item da grade é "Nenhum"

### CA-08 — Pronto fecha o editor

- **Dado** o editor aberto depois de trocas
- **Quando** o jogador toca em "Pronto"
- **Então** volta à tela de espera, com o avatar novo no cartão

### CA-09 — Avatar mantido ao recarregar

- **Dado** um jogador no lobby com o avatar que escolheu
- **Quando** recarrega a página, ou sai e usa "Voltar como {apelido}"
- **Então** volta à tela de espera com o mesmo avatar

### CA-10 — Avatar fixo depois que o jogo começa

- **Dado** um jogador no lobby com o editor aberto
- **Quando** o anfitrião inicia a partida
- **Então** o editor fecha, e nas telas seguintes não há lápis
- **E** um pedido de troca enviado depois disso é recusado e o avatar não muda

### CA-11 — Quem entra no meio troca enquanto espera

- **Dado** uma partida em andamento e um jogador que entrou durante a fase de respostas e vê "Você entrou! Aguarde a próxima pergunta."
- **Então** vê o avatar com o lápis e pode trocá-lo
- **Quando** a abertura da pergunta seguinte começa
- **Então** o editor fecha e o lápis some

### CA-12 — Item fora do catálogo

- **Dado** um jogador no lobby
- **Quando** um pedido de troca chega ao servidor com um personagem ou acessório que não está no catálogo
- **Então** o pedido é recusado e o avatar continua o mesmo

### CA-13 — Troca que falha

- **Dado** o editor aberto e o celular sem conexão
- **Quando** o jogador toca num personagem
- **Então** o celular volta ao avatar anterior e mostra "Não foi possível trocar o avatar."

### CA-14 — Avatares podem se repetir

- **Dado** dois jogadores no lobby
- **Quando** os dois escolhem o mesmo personagem e o mesmo acessório
- **Então** as duas trocas são aceitas e os dois cartões mostram o mesmo avatar, cada um com o seu apelido

### CA-15 — Rodapé do celular

- **Dado** um jogador com avatar, numa partida com personagens ligados
- **Quando** está na espera, numa pergunta, no resultado ou na tela final
- **Então** o rodapé mostra o avatar pequeno à esquerda do apelido e do total

### CA-16 — Placar

- **Dado** o placar de uma pergunta com cinco jogadores ou mais
- **Então** cada linha mostra o avatar do jogador ao lado do apelido e do total

### CA-17 — Pódio e classificação

- **Dado** uma partida terminada com três jogadores ou mais
- **Quando** o pódio revela os lugares
- **Então** cada degrau mostra o avatar acima do apelido, entrando junto com ele
- **E** a classificação completa mostra o avatar de cada jogador ao lado do apelido

### CA-18 — A chave no painel

- **Dado** um criador que nunca mexeu nas configurações
- **Quando** abre o painel de Configurações no lobby
- **Então** vê "Personagens dos jogadores", **ligada**, com a explicação, depois de "Reprodução automática" e antes de "Encerrar jogo"

### CA-19 — Desligar os personagens

- **Dado** um lobby com jogadores, um deles com o editor aberto
- **Quando** o anfitrião desliga "Personagens dos jogadores"
- **Então** os cartões do lobby mostram só o apelido
- **E** no celular o editor fecha e a tela de espera mostra o apelido sem cartão e sem lápis

### CA-20 — Religar os personagens

- **Dado** uma partida com os personagens desligados, em que entrou um jogador novo
- **Quando** o anfitrião religa a chave
- **Então** todos os jogadores, inclusive o novo, aparecem com avatar

### CA-21 — Desligar durante o jogo

- **Dado** uma partida em andamento com personagens ligados
- **Quando** o anfitrião desliga a chave
- **Então** o placar, o pódio, a classificação e o rodapé dos celulares mostram só o apelido a partir dali

### CA-22 — Chave salva para o criador

- **Dado** um criador que desligou "Personagens dos jogadores" numa partida
- **Quando** organiza outra partida, de qualquer quiz
- **Então** a nova partida começa com a chave desligada

### CA-23 — Movimento reduzido

- **Dado** um aparelho com movimento reduzido
- **Quando** um jogador troca de avatar
- **Então** o cartão do lobby e o destaque do editor mudam sem animação

## Experiência (telas e estados)

- **Tela de espera (celular)**: o avatar grande num cartão, com o lápis branco no canto superior direito; abaixo, o apelido em destaque e "Pronto! Está vendo seu apelido na tela?". No rodapé, o avatar pequeno, o apelido e o total. Com personagens desligados, é a tela da spec 008.
- **Editor de avatar (celular)**: um painel branco sobre o fundo do jogo, com o avatar do jogador espiando por cima dele; no alto do painel, as abas "Personagem" e "Acessório" lado a lado; uma grade de quadrados cinza-claros com os itens (cinco por linha no celular largo, menos nos estreitos), o atual com contorno escuro; "Pronto" fixo no rodapé do painel. A grade rola dentro do painel.
- **Cartão do lobby (anfitrião)**: o avatar à esquerda, num quadrado da cor do cartão, e o apelido à direita.
- **Placar, pódio e classificação**: o avatar pequeno ao lado do apelido; no pódio, maior, acima do apelido no degrau.
- **Estados**: avatar sorteado; editor aberto em cada aba; troca em andamento (o item tocado já aparece escolhido); troca que falhou; editor fechado pelo início da pergunta; personagens desligados no lobby, no jogo e no pódio.

## Divergências intencionais do Kahoot

- **Arte própria do Quizio** (RN-03): os desenhos do Kahoot são protegidos. O catálogo usa um conjunto de ilustrações com licença livre, com pelo menos 24 personagens e 24 acessórios; os itens não são os mesmos do Kahoot.
- **Avatar de rosto, sem corpo**: o Kahoot mostra, na tela de espera, o personagem de corpo inteiro (camiseta, calça, luvas e tênis). Aqui o cartão mostra o rosto com o acessório, como no lobby e na grade, a menos que o conjunto escolhido tenha corpo.
- **"Nenhum" acessório** (RN-04): nas capturas do Kahoot não há como ficar sem acessório.
- **Avatar lembrado entre partidas** (RN-08): decisão do produto, para quem joga várias partidas seguidas no mesmo aparelho.
- **Sem animação de personagens no pódio**: o Kahoot faz os personagens dançarem. Aqui o avatar entra com o apelido, sem animação própria.
- **Sem "Conquistas", sem "Reagir" e sem troca de idioma** na tela do jogador, como na spec 008.

## Fora de escopo

- Avatares nos relatórios (lista de participantes e detalhe).
- Avatar na tela de revelação do anfitrião e no "Voltar como {apelido}" da entrada do PIN.
- Personagens ou acessórios desbloqueados por conquistas, sazonais ou enviados pelo criador.
- Cores de fundo, roupas e outras partes do avatar além de personagem e acessório.
- Animação dos personagens (dança no pódio, reação a acerto ou erro).
- Reações dos jogadores durante a partida.

## Perguntas em aberto

- [ ] Qual conjunto de ilustrações usar — decidido no plano, entre os conjuntos com licença livre que tenham rostos de bichos e acessórios combináveis; se nenhum tiver acessórios que sirvam em todos os rostos, a spec volta ao usuário.
- [ ] O cartão da tela de espera mostra o corpo inteiro? — só se o conjunto escolhido tiver corpo; senão, o rosto (divergência acima).

## Changelog

- 2026-10-15 — spec criada, com as capturas do Kahoot enviadas pelo usuário (tela de espera com o avatar e o lápis, editor nas abas Personagem e Acessório, cartão do lobby na tela do anfitrião mudando junto com o editor). Decisões do usuário: arte de um conjunto com licença livre; avatar no lobby, no rodapé do celular, no placar, no pódio e na classificação; chave "Personagens dos jogadores" no painel, ligada por padrão e salva para o criador. Decisões tomadas sem consulta prévia: avatar sorteado ao entrar (RN-07), lembrado pelo navegador (RN-08), acessório "Nenhum" (RN-04), avatares repetidos permitidos (RN-05), troca só enquanto o jogador espera para jogar (RN-13), chave desligada sem apagar avatares (RN-26). Número 027 em vez de 016: a linha 016 do roadmap é "Mais tipos", e o número é só o nome da pasta (roadmap, 2026-10-06).
