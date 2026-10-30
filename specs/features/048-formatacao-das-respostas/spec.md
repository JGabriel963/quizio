---
id: "048"
title: Formatação das respostas
status: done # draft | approved | planned | in-progress | done
contexts: [quiz, game, reports, library]
created: 2026-10-30
---

# 048 — Formatação das respostas

## Contexto e problema

A spec 047 deu ao enunciado uma barra de formatação, com negrito, itálico, subscrito, sobrescrito e um diálogo de símbolos. As respostas continuam texto simples, inteiras em negrito: uma alternativa não consegue escrever "H₂O", "x²", "10⁻³ m" ou "*Homo sapiens*", e não há como destacar a palavra que faz a diferença entre duas alternativas parecidas.

No Kahoot, a mesma barra aparece acima da **resposta** em foco, no Quiz e no Puzzle, com o texto sem marca em Montserrat Regular (peso normal) e o contador de caracteres no canto do bloco (capturas do Kahoot, 2026-10-30). A spec 047 deixou as respostas para esta spec, que reaproveita o que ela definiu: as marcas, a barra, o diálogo, o colar e a leitura e escrita pelos agentes.

## Objetivo

O criador formata trechos das respostas de perguntas Quiz e Puzzle como já formata o enunciado. As respostas aparecem com essa formatação em todas as telas em que são mostradas, do editor ao relatório, também no celular dos jogadores.

## Personas

- **Criador**: formata as respostas no editor, no computador ou no celular.
- **Anfitrião**: apresenta as respostas formatadas na tela grande.
- **Jogador / participante**: vê as respostas formatadas no celular, ao vivo (com "perguntas nos dispositivos") e na atividade.
- **Agente de IA** (spec 044): lê e escreve respostas formatadas em nome do criador.

## Histórias de usuário

- **HU-01** — Como criador, quero escrever expoentes e índices nas respostas (x², H₂O), para fazer perguntas de matemática, física e química com alternativas corretas na forma.
- **HU-02** — Como criador, quero deixar trechos de uma resposta em negrito ou itálico, para destacar o que diferencia as alternativas ou escrever um nome científico.
- **HU-03** — Como criador, quero inserir símbolos que não estão no teclado nas respostas (π, √, €, Ω).
- **HU-04** — Como criador, quero colar uma resposta já formatada de outro lugar sem perder as quatro marcas.
- **HU-05** — Como criador de um Puzzle, quero formatar os itens e reordená-los sem perder a formatação.
- **HU-06** — Como anfitrião e como jogador, quero ver as respostas com a formatação que o criador escolheu, para ler "x²" e não "x2".
- **HU-07** — Como criador, quero ver as respostas formatadas nos relatórios e nas páginas do quiz.
- **HU-08** — Como criador que usa um agente de IA, quero que o agente leia e escreva respostas formatadas.

## Regras de negócio

### Barra de formatação

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Com uma **resposta de Quiz ou de Puzzle** em foco, a **barra de formatação** da spec 047 flutua junto dessa resposta, centralizada nela, com **Negrito (B)**, **Itálico (I)**, **Subscrito (X₂)**, **Sobrescrito (X²)**, um separador e **Símbolos (Ω)**. Há uma barra só, junto do campo em foco: ao passar para outra resposta ou para o enunciado, ela vai junto. Fora de foco, não aparece. Usar a barra não tira o foco da resposta. | capturas do Kahoot do Quiz e do Puzzle (2026-10-30) · spec 047, RN-01 · decisão do usuário (2026-10-30) |
| RN-01a | A barra fica **logo acima** da resposta quando ela está na **primeira linha** das respostas, e **logo abaixo** nas outras linhas, para não cobrir a resposta de cima. Com as respostas em duas colunas, a primeira linha são as respostas 1 e 2; em uma coluna (no celular ou com o editor estreito, e sempre no Puzzle), só a resposta 1. Abaixo, a barra pode cobrir a resposta de baixo ou o botão "Adicionar mais respostas" enquanto o campo tem o foco. | capturas do Kahoot (2026-10-30) · detalhe do usuário (2026-10-30) |
| RN-02 | A barra funciona como no enunciado: as dicas com o nome de cada botão, as quatro **marcas (`TextMark`)** por trecho, negrito e itálico combinados entre si e com subscrito ou sobrescrito, **subscrito e sobrescrito que se excluem**, o botão aceso, os atalhos **Ctrl+B**, **Ctrl+I**, **Ctrl+,** e **Ctrl+.** (⌘ no Mac), e desfazer e refazer. | spec 047, RN-02 a RN-06 |
| RN-03 | **Cada resposta tem o próprio desfazer.** Desfazer numa resposta desfaz o que foi feito nela, nunca numa outra resposta ou no enunciado. | spec 047, RN-06 · decisão do produto (2026-10-30) |

### O campo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-04 | Continuam valendo as regras das respostas: até **75 caracteres**, espaços nas pontas ignorados ao salvar e texto só com espaços contando como vazio (spec 004, RN-04; spec 033, RN-03); Enter não quebra linha e as quebras de um texto colado viram espaços; o texto quebra linha e o bloco cresce para mostrar a resposta inteira; o contador de caracteres restantes aparece no canto do bloco com o campo em foco. | specs 004 e 033 · correção de 2026-10-30 |
| RN-05 | **A formatação não conta no limite.** O contador e o limite contam só os caracteres. | spec 047, RN-08 · capturas do Kahoot (o contador mostra −4 com 79 caracteres formatados, de 75) |
| RN-06 | **Nada passa de 75 caracteres.** O que for digitado, colado ou inserido pelo diálogo além do limite não entra, e o contador nunca fica negativo. | spec 047, RN-07 e RN-14 · decisão do usuário (2026-10-30, "a mesma lógica do enunciado") |
| RN-07 | **Colar** um texto formatado numa resposta mantém o negrito, o itálico, o subscrito e o sobrescrito dele e descarta o resto da formatação de origem. | spec 047, RN-09 |
| RN-08 | Uma resposta vazia (ou só com espaços) não tem formatação e continua vazia: não pode ser correta (spec 004, RN-06) e não conta entre as respostas preenchidas (spec 033, RN-07). A formatação de espaços cortados nas pontas some com eles. | spec 004, RN-06 · spec 033, RN-07 · spec 047, RN-10 |

### Símbolos

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-09 | **Símbolos (Ω)** abre o mesmo diálogo **"Insira um símbolo" (`SymbolDialog`)**, com as mesmas abas e regras. O símbolo escolhido entra **na resposta que estava em foco**, no lugar do cursor ou da seleção, com as marcas do ponto em que entrou; o diálogo fecha e o foco volta a essa resposta. Cancelar, Esc ou um clique fora devolvem o foco à resposta, com o cursor e a seleção de antes. | spec 047, RN-11 a RN-17 |
| RN-10 | Cada símbolo conta **1 caractere**. Se não cabe (a resposta está no limite e nada está selecionado), escolhê-lo não muda a resposta. | spec 047, RN-14 |

### Puzzle

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-11 | **A formatação acompanha o texto do item do Puzzle.** Arrastar uma resposta para outra posição, ou movê-la pelo teclado, leva a formatação junto com o texto; a forma e a cor continuam com a posição. | spec 033, RN-05 |
| RN-12 | **O que é certo não depende da formatação.** No Puzzle, a ordem certa continua comparando **só os textos** (spec 033, RN-09 e RN-16): duas respostas com o mesmo texto e formatações diferentes podem trocar de lugar sem errar a ordem. No Quiz, a correta continua sendo a resposta marcada. | spec 033, RN-09 e RN-16 · decisão do produto (2026-10-30) |

### A formatação faz parte da pergunta

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-13 | A **formatação (`TextFormatting`)** de cada resposta é salva automaticamente como o texto, com o mesmo estado no cabeçalho, também quando só a formatação mudou. | spec 004, RN-05 · spec 047, RN-18 |
| RN-14 | A formatação das respostas **entra na versão jogável**: mudar só a formatação mostra "Alterações não salvas" e só chega às partidas novas depois de **Salvar**; "Descartar alterações" devolve a formatação da versão salva. | spec 006 · spec 047, RN-19 |
| RN-15 | A formatação **é copiada com as respostas**: ao duplicar a pergunta ou o quiz, no "Duplicar" e no "Duplique para editar" de um quiz compartilhado ou público. Na **troca de tipo**, as respostas que o editor guarda na sessão voltam com a formatação quando a pergunta volta ao tipo. | spec 004, RN-18 · spec 005, RN-17 e RN-21 · spec 047, RN-20 |
| RN-16 | Uma **partida ao vivo** ou uma **atividade** copia as respostas com a formatação quando as copia hoje. Mudanças feitas depois no quiz não chegam a ela. | specs 009, 029 e 033 · spec 047, RN-21 |
| RN-17 | Quizzes, partidas, atividades e relatórios que já existem **não têm formatação nas respostas** e mostram o mesmo texto de antes, agora com o peso normal da RN-18. | spec 047, RN-22 |

### Onde as respostas aparecem

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-18 | Em todas as telas da RN-19, o **texto sem marca das respostas tem peso normal**, e só os trechos em negrito ficam em negrito, como no enunciado e no editor do Kahoot, onde a resposta é Montserrat Regular. Hoje as respostas aparecem inteiras em negrito; esta spec muda isso também nos quizzes que já existem e nas telas da partida. | decisão do usuário (2026-10-30) · capturas do Kahoot (Montserrat 16 px, peso 400) · spec 047, RN-24 |
| RN-19 | As respostas de Quiz e de Puzzle aparecem **com a formatação** em todo lugar em que são mostradas: no **editor** (os campos e o bloco do Puzzle que segue o ponteiro ao arrastar); na **página do quiz** e em "Mostrar respostas", também nas páginas do quiz compartilhado e do quiz público; na **tela do anfitrião** (respostas e revelação do Quiz; blocos na ordem sorteada e ordem certa do Puzzle); no **celular** com "perguntas nos dispositivos" ligada (as respostas do Quiz e os blocos do Puzzle); na **atividade** (a pergunta e o resultado, com a ordem enviada e "A ordem certa é:"); e nos **relatórios** (as respostas no detalhe da pergunta, as respostas de cada participante no detalhe da pergunta e no detalhe do participante, e as ordens enviadas no Puzzle). | specs 004, 006, 009, 012, 015, 030, 033, 037 e 039 |
| RN-20 | Subscrito e sobrescrito aparecem **menores, abaixo ou acima da linha**, sem afastar as linhas da resposta, e continuam legíveis no celular e nos blocos do Puzzle. | spec 047, RN-26 |
| RN-21 | Onde uma resposta serve de nome para leitores de tela (os botões de resposta, a alça "Mover …" do Puzzle, a contagem de respostas da revelação), vale o texto sem formatação. | spec 047, RN-27 |

### Agentes de IA

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-22 | O agente de IA (spec 044) **lê as respostas com a formatação** marcada, como lê o enunciado: ao ler um quiz, uma pergunta ou o detalhe de um relatório. | spec 047, RN-28 · decisão do usuário (2026-10-30) |
| RN-23 | O agente **escreve respostas com as quatro marcas** ao adicionar ou mudar perguntas Quiz e Puzzle. A resposta enviada substitui a anterior inteira, com a formatação que veio; sem marcas, a resposta fica sem formatação. O limite conta só os caracteres (RN-05). | spec 047, RN-29 |
| RN-24 | Uma marcação que não seja uma das quatro é **recusada**, com a explicação de quais existem. Respostas com os sinais que a marcação usa, como "x < 3", continuam aceitas como texto. | spec 047, RN-30 |

## Critérios de aceite

### CA-01 — A barra acompanha a resposta em foco

- **Dado** o editor aberto num computador, numa pergunta Quiz com as respostas em duas colunas, com o foco fora das respostas
- **Então** não há barra de formatação sobre as respostas
- **Quando** o criador clica na resposta 2
- **Então** a barra aparece centralizada logo acima da resposta 2, que está na primeira linha, com B, I, X₂, X², o separador e Ω, sem imagem e sem f(x)
- **Quando** ele clica na resposta 3
- **Então** a barra passa para logo abaixo da resposta 3, e só ela está à vista
- **Quando** ele clica em B
- **Então** a resposta 3 continua em foco
- **Quando** ele clica fora das respostas e do enunciado
- **Então** a barra some

### CA-02 — Negrito num trecho da resposta

- **Dado** a resposta 1 "Capital do Brasil"
- **Quando** o criador seleciona "Brasil" e clica em B
- **Então** "Brasil" aparece em negrito e o resto em peso normal, e B fica aceso com o cursor dentro de "Brasil"
- **E** o cabeçalho mostra "Salvando…" e depois "Salvo"
- **Quando** ele recarrega a página
- **Então** "Brasil" continua em negrito e o resto em peso normal

### CA-03 — Subscrito e sobrescrito numa resposta

- **Dado** a resposta 1 vazia
- **Quando** o criador digita "H", clica em X₂, digita "2", clica em X₂ e digita "O"
- **Então** a resposta mostra "H₂O", com o "2" menor e abaixo da linha
- **Quando** ele seleciona o "2" e aperta Ctrl+. (⌘ no Mac)
- **Então** o "2" passa a sobrescrito e deixa de ser subscrito

### CA-04 — Atalhos e desfazer por resposta

- **Dado** a resposta 1 "água" e a resposta 2 "gelo", ambas sem formatação
- **Quando** o criador seleciona "água", aperta Ctrl+B, vai à resposta 2, seleciona "gelo" e aperta Ctrl+I
- **Então** "água" fica em negrito e "gelo" em itálico
- **Quando** ele aperta Ctrl+Z na resposta 2
- **Então** "gelo" volta sem itálico e "água" continua em negrito

### CA-05 — O contador conta só os caracteres

- **Dado** a resposta 1 "Texto normal, texto em negrito" (30 caracteres), com "texto em negrito" em negrito
- **Quando** o campo está em foco
- **Então** o canto do bloco mostra 45 (75 − 30)
- **E** pôr ou tirar negrito de qualquer trecho não muda o contador

### CA-06 — Limite de 75 caracteres

- **Dado** a resposta 1 com 75 caracteres, parte deles em negrito
- **Quando** o criador digita mais uma letra
- **Então** a resposta não muda e o contador mostra 0
- **Quando** ele aplica sobrescrito a um trecho
- **Então** a formatação é aplicada e o contador continua em 0
- **Dado** a resposta 2 vazia
- **Quando** ele cola um texto de 90 caracteres
- **Então** entram só os 75 primeiros, e o contador mostra 0, nunca um número negativo

### CA-07 — Colar texto formatado numa resposta

- **Dado** um texto copiado de um documento, com "CO" seguido de um "2" em subscrito, uma palavra em vermelho, uma sublinhada e uma quebra de linha
- **Quando** o criador cola na resposta 1 vazia
- **Então** o "2" mantém o subscrito
- **E** a palavra vermelha e a sublinhada entram como texto sem formatação, e a quebra de linha vira espaço

### CA-08 — Inserir um símbolo numa resposta

- **Dado** a resposta 3 "C = 2 × r", com o cursor entre o "2" e o "×"
- **Quando** o criador clica em Ω, vai à aba Matemática e clica em π
- **Então** o diálogo fecha, a resposta 3 fica "C = 2π × r", o cursor fica logo depois do π e o foco está na resposta 3
- **E** o enunciado e as outras respostas não mudam
- **Dado** a resposta 4 com 75 caracteres e nada selecionado
- **Quando** ele insere "€" pela aba Moeda
- **Então** o diálogo fecha e a resposta 4 não muda

### CA-09 — Resposta só com espaços

- **Dado** a resposta 2 com três espaços em negrito
- **Quando** o criador sai do campo
- **Então** a resposta 2 fica vazia, sem formatação, e não pode ser marcada como correta

### CA-10 — Puzzle: a formatação vai com o texto

- **Dado** um Puzzle com "H₂O" (o "2" em subscrito) na posição 1 e "CO₂" na posição 2
- **Quando** o criador arrasta "CO₂" para a posição 1, ou o sobe pelo teclado na alça ≡
- **Então** a posição 1 (triângulo vermelho) mostra "CO₂" e a posição 2 (losango azul) mostra "H₂O", ambos com o "2" em subscrito
- **E** depois de recarregar a página, a ordem e a formatação continuam assim
- **E** com a resposta 1 em foco a barra fica acima dela, e com a resposta 2 em foco, abaixo

### CA-11 — Puzzle: a ordem certa compara só os textos

- **Dado** um Puzzle com as respostas "Sol", "Lua" e "Sol", a primeira "Sol" em negrito e a segunda sem formatação
- **Quando** um jogador envia a ordem com as duas "Sol" trocadas de lugar
- **Então** a resposta conta como correta

### CA-12 — Formatação das respostas e versão jogável

- **Dado** um quiz salvo sem alterações pendentes
- **Quando** o criador só deixa uma palavra da resposta 2 da pergunta 1 em itálico
- **Então** o editor mostra "Alterações não salvas"
- **E** uma partida iniciada antes de Salvar mostra a resposta sem o itálico
- **Quando** ele escolhe "Descartar alterações"
- **Então** a palavra volta a ficar sem itálico
- **Quando** ele faz a mesma mudança e Salva
- **Então** uma partida nova mostra a palavra em itálico

### CA-13 — Cópias e troca de tipo mantêm a formatação

- **Dado** uma pergunta Quiz com a resposta 1 "H₂O" (o "2" em subscrito) e a resposta 2 com "não" em negrito
- **Quando** o criador duplica a pergunta e duplica o quiz
- **Então** a cópia da pergunta e a pergunta no quiz copiado mostram as respostas com a mesma formatação
- **E** o "Duplicar" de um quiz compartilhado ou público com essa pergunta também mantém a formatação
- **Quando** ele troca o tipo da pergunta para Verdadeiro ou falso e volta para Quiz sem sair do editor
- **Então** as respostas voltam com a mesma formatação

### CA-14 — Tela do anfitrião

- **Dado** uma partida ao vivo com uma pergunta Quiz cuja resposta 1 é "x²" e a resposta 2 tem "não" em negrito
- **Quando** a pergunta passa às respostas e à revelação
- **Então** a tela do anfitrião mostra "x²" com o expoente acima da linha e "não" em negrito, e o resto das respostas em peso normal

### CA-15 — Celular do jogador

- **Dado** a mesma partida com "perguntas nos dispositivos" ligada
- **Quando** a pergunta passa às respostas
- **Então** os botões de resposta do celular mostram "x²" com o expoente legível e "não" em negrito
- **Dado** a mesma partida com a opção desligada
- **Então** o celular continua só com as formas e as cores, como hoje (spec 012)

### CA-16 — Puzzle na partida

- **Dado** uma partida com um Puzzle de respostas formatadas e "perguntas nos dispositivos" ligada
- **Quando** a pergunta passa às respostas e à revelação
- **Então** os blocos no celular, ao arrastar e parados, as respostas na ordem sorteada no anfitrião e a ordem certa na revelação mostram a formatação

### CA-17 — A partida já criada não muda

- **Dado** uma partida ao vivo em andamento e uma atividade aberta do mesmo quiz
- **Quando** o criador deixa um trecho de uma resposta em negrito e Salva
- **Então** a partida e a atividade continuam mostrando a resposta como era quando foram criadas

### CA-18 — Atividade

- **Dado** uma atividade de um quiz com respostas formatadas, com um Quiz e um Puzzle
- **Quando** o participante responde cada pergunta e vê o resultado
- **Então** as respostas da pergunta, a ordem enviada e "A ordem certa é:" mostram a formatação

### CA-19 — Relatórios

- **Dado** o relatório de uma partida com a resposta "x²" escolhida por um participante
- **Quando** o criador abre o detalhe da pergunta e o detalhe desse participante
- **Então** as respostas aparecem com o expoente acima da linha, também na lista do que cada participante respondeu
- **E** no detalhe de um Puzzle, as ordens enviadas mostram a formatação das respostas

### CA-20 — Páginas do quiz

- **Dado** um quiz com respostas formatadas
- **Quando** o criador abre a página do quiz e "Mostrar respostas", a página do quiz compartilhado num grupo e a página do quiz público no perfil
- **Então** as respostas aparecem com a formatação

### CA-21 — Quizzes que já existem

- **Dado** um quiz criado antes desta feature, com a resposta "Brasília"
- **Quando** o criador abre o editor e o anfitrião apresenta uma partida dele
- **Então** a resposta aparece com o mesmo texto, sem formatação, em peso normal, no editor e na tela do anfitrião
- **E** o editor não mostra "Alterações não salvas"

### CA-22 — Editor no celular

- **Dado** o editor aberto num celular
- **Quando** o criador toca na resposta 1
- **Então** a barra aparece acima da resposta 1, inteira na tela
- **Quando** ele toca na resposta 2, que no celular está na segunda linha
- **Então** a barra aparece abaixo da resposta 2, inteira na tela
- **Quando** ele toca em Ω e escolhe um símbolo
- **Então** o símbolo entra na resposta 2

### CA-23 — O agente lê e escreve respostas formatadas

- **Dado** um quiz com a resposta "x²" e um agente conectado
- **Quando** o agente lê o quiz
- **Então** a resposta indica que o "2" está em sobrescrito, em vez de mostrar só "x2"
- **Quando** o agente adiciona uma pergunta Quiz com a resposta "H₂O" marcada com o "2" em subscrito e um Puzzle com um item em itálico
- **Então** o editor mostra o "2" em subscrito e o item em itálico, com a marca de IA
- **Quando** o agente muda essa resposta para um texto sem marcação
- **Então** a resposta fica sem formatação

### CA-24 — Agente: marcação desconhecida, sinais comuns e limite

- **Dado** um agente conectado
- **Quando** ele envia uma resposta com um trecho sublinhado
- **Então** o pedido é recusado com a explicação de que as marcas são negrito, itálico, subscrito e sobrescrito, e nada é salvo
- **Quando** ele envia a resposta "x < 3"
- **Então** a resposta é salva com esse texto, sem formatação
- **Quando** ele envia uma resposta de 75 caracteres com metade em negrito
- **Então** é aceita
- **Quando** ele envia uma de 76 caracteres
- **Então** é recusada por passar do limite, como hoje

## Experiência (telas e estados)

- **Barra de formatação**: a mesma do enunciado (spec 047), um retângulo cinza-claro de cantos arredondados, centralizado na resposta em foco, por cima do resto do editor e sem empurrar nada. Na primeira linha das respostas, ele fica logo acima da resposta, sobre a área da imagem; nas outras linhas, logo abaixo, sobre a resposta de baixo ou o botão "Adicionar mais respostas".
- **Resposta no editor**: o bloco de hoje, branco enquanto vazio e com a cor da posição quando preenchido, agora com o texto em **Montserrat Regular (peso normal)**, os trechos em negrito em negrito, e o texto quebrando linha. O contador de caracteres restantes fica no canto superior direito do bloco enquanto o campo está em foco, e nunca fica negativo.
- **Puzzle no editor**: os quatro campos com a forma à esquerda e a alça ≡ à direita, como hoje, com a mesma barra sobre o campo em foco. O bloco que segue o ponteiro ao arrastar mostra a formatação.
- **Diálogo "Insira um símbolo"**: o mesmo da spec 047; o símbolo vai para a resposta que tinha o foco.
- **Telas de jogo, páginas do quiz e relatórios**: as respostas como hoje, com o texto em peso normal e a formatação aplicada; expoentes e índices menores, acima ou abaixo da linha.
- **Estados**: a barra e o diálogo não carregam nada do servidor. Salvar segue o estado do cabeçalho do editor (spec 003): uma falha mantém o texto e a formatação na tela e tenta de novo.

## Divergências intencionais do Kahoot

- **Sem o botão de imagem nem f(x) na barra**: o Kahoot tem os dois na barra das respostas; aqui ficam fora, como as fórmulas no enunciado.
- **Nada passa de 75 caracteres** (RN-06): o Kahoot deixa digitar e colar além do limite e mostra quantos passaram (−4, num selo vermelho, mesmo fora de foco). O Quizio corta no limite, como no enunciado.
- **Peso normal também nas telas da partida** (RN-18): as capturas mostram o editor do Kahoot, com a resposta em Montserrat Regular; nas telas de jogo, não foi confirmado.
- **Atalhos de teclado e agentes de IA** (RN-02, RN-22 a RN-24): como no enunciado.

## Fora de escopo

- **Imagem nas respostas** (o botão de imagem da barra do Kahoot).
- **Fórmulas (f(x))**.
- Formatação na **Resposta digitada** (as respostas aceitas e o que o jogador digita), no **Controle deslizante** (números e unidade) e no **Verdadeiro ou falso** (textos fixos).
- O assistente de criação ("Crie", spec 027) criar respostas com formatação: continua criando respostas sem formatação.
- Outras formatações: sublinhado, cor, tamanho, fonte, links e quebras de linha.

## Perguntas em aberto

Nenhuma.

## Changelog

- 2026-10-30 — spec criada, a partir das capturas da barra de formatação nas respostas do Kahoot e das decisões do usuário: a mesma lógica do enunciado, respostas de Quiz e de Puzzle, texto sem marca em peso normal em todas as telas.
- 2026-10-30 — capturas do usuário confirmam a barra nas respostas do Puzzle do Kahoot e a resposta em Montserrat Regular (16 px, peso 400) no editor; a formatação no Puzzle deixou de ser divergência.
- 2026-10-30 — spec aprovada pelo usuário.
- 2026-10-30 — detalhe do usuário, com capturas do Kahoot: a barra fica abaixo das respostas que não estão na primeira linha (RN-01a; CA-01, CA-10 e CA-22 ajustados).
- 2026-10-30 — implementada (tarefas T01 a T23): testes de unidade, componentes, repositórios, API, MCP e E2E verdes. O CA-16 (Puzzle na partida) ficou coberto nos testes de componente do anfitrião e do celular; o E2E confere o Quiz na partida.
