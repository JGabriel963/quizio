---
id: "047"
title: Formatação do enunciado
status: done # draft | approved | planned | in-progress | done
contexts: [quiz, game, reports, library]
created: 2026-10-30
---

# 047 — Formatação do enunciado

## Contexto e problema

O enunciado (`text`) é hoje um texto simples: tudo o que o criador escreve aparece igual, inteiro em negrito, no editor e nas telas de jogo (spec 003, RN-10). Isso não serve para muitas perguntas de escola: "Quanto é 2² + 2²?", "Qual é a fórmula da água, H₂O?", o nome científico de uma espécie em itálico ou a palavra que precisa de destaque ("Qual destas **não** é uma capital?").

No Kahoot, o enunciado tem uma **barra de formatação** que aparece acima do campo quando ele está em foco, com negrito, itálico, subscrito, sobrescrito, um diálogo de símbolos e um editor de fórmulas (capturas do Kahoot, 2026-10-30). As specs 033 e anteriores deixaram essa barra fora de escopo.

Esta spec traz a barra para o **enunciado**, sem as fórmulas (f(x)). As respostas ganham a mesma barra numa spec seguinte, que reaproveita o que esta definir.

## Objetivo

O criador formata trechos do enunciado com negrito, itálico, subscrito e sobrescrito e insere símbolos que não estão no teclado. O enunciado aparece com essa formatação em todas as telas em que é mostrado, do editor ao relatório, também no celular dos jogadores.

## Personas

- **Criador**: formata o enunciado no editor, no computador ou no celular.
- **Anfitrião**: apresenta a pergunta formatada na tela grande.
- **Jogador / participante**: vê o enunciado formatado no celular, ao vivo (com "perguntas nos dispositivos") e na atividade.
- **Agente de IA** (spec 044): lê e escreve enunciados formatados em nome do criador.

## Histórias de usuário

- **HU-01** — Como criador, quero deixar trechos do enunciado em negrito ou itálico, para destacar o que importa na pergunta.
- **HU-02** — Como criador, quero escrever expoentes e índices (x², H₂O), para fazer perguntas de matemática, física e química.
- **HU-03** — Como criador, quero inserir símbolos que não estão no teclado (π, √, €, Ω, ç maiúsculo), para escrever a pergunta como ela deve ser.
- **HU-04** — Como criador, quero colar um texto já formatado de outro lugar sem perder o negrito, o itálico, os expoentes e os índices.
- **HU-05** — Como anfitrião, quero que a pergunta apareça na tela grande com a formatação que o criador escolheu.
- **HU-06** — Como jogador, quero ver o enunciado formatado no celular, para ler "2²" e não "22".
- **HU-07** — Como criador, quero ver a formatação nos relatórios e nas páginas do quiz, para reconhecer cada pergunta.
- **HU-08** — Como criador que usa um agente de IA, quero que o agente leia e escreva enunciados formatados, para ele não confundir "2²" com "22" e poder criar perguntas com expoentes.

## Regras de negócio

### Barra de formatação

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Com o enunciado em foco, uma **barra de formatação (`FormattingToolbar`)** flutua logo acima do campo, centralizada, com os botões **Negrito (B)**, **Itálico (I)**, **Subscrito (X₂)** e **Sobrescrito (X²)**, um separador e **Símbolos (Ω)**. Fora de foco, a barra não aparece. Usar a barra não tira o foco do campo. | capturas do Kahoot (2026-10-30) · decisão do usuário (2026-10-30) |
| RN-02 | Cada botão mostra uma **dica com o nome** ao receber o ponteiro ou o foco: "Negrito", "Itálico", "Subscrito", "Sobrescrito" e "Símbolos". | captura do Kahoot ("Símbolos") · decisão do produto (2026-10-30) |
| RN-03 | A formatação vale **por trecho**, com quatro **marcas (`TextMark`)**: negrito (`bold`), itálico (`italic`), subscrito (`subscript`) e sobrescrito (`superscript`). Com um trecho selecionado, o botão aplica a marca ao trecho, ou a tira se o trecho inteiro já a tem. Sem seleção, o botão liga ou desliga a marca para o que for digitado a seguir. | capturas do Kahoot |
| RN-04 | Negrito e itálico **se combinam** entre si e com subscrito ou sobrescrito. **Subscrito e sobrescrito se excluem**: ligar um num trecho tira o outro desse trecho. | captura do Kahoot ("texto em itálico e negrito") · decisão do produto (2026-10-30) |
| RN-05 | Um botão fica **aceso** (fundo escuro, símbolo claro) quando o cursor está num trecho com aquela marca, ou quando o trecho selecionado inteiro a tem, ou quando a marca está ligada para o que for digitado a seguir. | capturas do Kahoot |
| RN-06 | Atalhos de teclado: **Ctrl+B** (negrito), **Ctrl+I** (itálico), **Ctrl+,** (subscrito) e **Ctrl+.** (sobrescrito), com ⌘ no lugar de Ctrl no Mac. **Desfazer** e **refazer** do campo também desfazem e refazem a formatação. | decisão do produto (2026-10-30) |

### O campo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-07 | Continuam valendo as regras do enunciado (spec 003, RN-10): até **160 caracteres**, Enter não quebra linha, as quebras de um texto colado viram espaços, os espaços nas pontas são ignorados ao salvar e o contador de caracteres restantes aparece com o campo em foco. | spec 003, RN-10 |
| RN-08 | **A formatação não conta no limite.** O contador e o limite contam só os caracteres: um caractere em negrito, em itálico, subscrito ou sobrescrito conta 1, como qualquer outro. | capturas do Kahoot (o contador mostra 62 com 58 caracteres formatados, de 120) |
| RN-09 | **Colar** um texto formatado mantém o negrito, o itálico, o subscrito e o sobrescrito dele. Todo o resto da formatação de origem (cor, tamanho, fonte, sublinhado, links, listas, imagens) é descartado, e o que passar do limite é cortado, como hoje. | decisão do usuário (2026-10-30) |
| RN-10 | Um enunciado vazio (ou só com espaços) não tem formatação. A formatação de espaços cortados nas pontas some com eles. | spec 003, RN-10 · decisão do produto (2026-10-30) |

### Símbolos

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-11 | **Símbolos (Ω)** abre o diálogo **"Insira um símbolo" (`SymbolDialog`)**, com cinco abas: **Caracteres especiais** (a aberta ao abrir), **Moeda**, **Matemática**, **Grego** e **Outro**. Cada aba é uma grade de símbolos, que rola quando não cabe. Embaixo, **Cancelar**. | capturas do Kahoot |
| RN-12 | Escolher um símbolo **o insere no lugar do cursor** (no lugar do trecho selecionado, se houver), **fecha o diálogo** e devolve o foco ao campo com o cursor logo depois do símbolo. O símbolo recebe as marcas do ponto em que entrou, como uma letra digitada ali. | decisão do usuário (2026-10-30) · capturas do Kahoot (só Cancelar) |
| RN-13 | **Cancelar**, Esc ou um clique fora fecham o diálogo sem mudar o enunciado e devolvem o foco ao campo, com o cursor e a seleção de antes. | decisão do produto (2026-10-30) |
| RN-14 | Cada símbolo conta **1 caractere**. Se o símbolo não cabe (o campo está no limite e nada está selecionado), escolhê-lo não muda o enunciado. | RN-08 · decisão do produto (2026-10-30) |
| RN-15 | O conteúdo das abas: **Caracteres especiais**, as letras acentuadas e especiais do latim, maiúsculas e minúsculas (À, Ç, Ñ, Ø, ß, Ā, Ą, Č…); **Moeda**, os símbolos de moeda ($, £, €, ¥, ₹, ₩, ₽, ₺, ₴, ₦…); **Matemática**, operadores e sinais (−, ÷, ×, π, ½, ≥, ≤, √, ∛, ∞, ±, ≠, ≈, ∫, ∑, ∈, ∩, ∅, ∀, ∃…); **Grego**, as 24 letras maiúsculas e as 25 minúsculas, com **σ e ς**; **Outro**, pontuação, sinais e setas (¿, ¡, &, #, @, ¶, ®, ©, colchetes, chaves, ←, →, «, », ↑, ↓…). A lista exata de cada aba segue as capturas do Kahoot e fica registrada no plano. | capturas do Kahoot · σ: decisão do produto (2026-10-30) |
| RN-16 | Só entram nas abas símbolos que o Quizio **mostra legíveis** no computador e no celular, no editor e nas telas de jogo: nenhum aparece como um quadrado vazio. | decisão do produto (2026-10-30) |
| RN-17 | O diálogo pode ser usado **só com o teclado**: Tab passa pelas abas, pela grade e por Cancelar; as setas andam entre os símbolos da grade; Enter ou Espaço insere o símbolo. | decisão do produto (2026-10-30) |

### A formatação faz parte da pergunta

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-18 | A **formatação (`TextFormatting`)** é parte do enunciado e é **salva automaticamente** como o texto, com o mesmo estado no cabeçalho ("Salvando…", "Salvo", a falha e tentar de novo), também quando só a formatação mudou. | spec 003, RN-20 a RN-23 |
| RN-19 | A formatação **entra na versão jogável**: mudar só a formatação de uma pergunta mostra "Alterações não salvas" e só chega às partidas novas depois de **Salvar**; "Descartar alterações" devolve a formatação da versão salva. | spec 006 |
| RN-20 | A formatação **é copiada com a pergunta**: ao duplicar a pergunta, ao duplicar o quiz, no "Duplicar" e no "Duplique para editar" de um quiz compartilhado ou público e ao trocar o tipo da pergunta (que mantém o enunciado). | specs 001, 003, 005, 037 e 039 |
| RN-21 | Uma **partida ao vivo** ou uma **atividade** copia o enunciado com a formatação quando a copia hoje (ao começar a partida, ao criar a atividade). Mudanças feitas depois no quiz não chegam a ela. | specs 009 e 029 |
| RN-22 | Quizzes, partidas, atividades e relatórios que já existem **não têm formatação** e mostram o mesmo texto de antes, agora com o peso normal da RN-24. | decisão do produto (2026-10-30) |
| RN-23 | A **pesquisa pelo enunciado** (aba Perguntas do relatório, spec 015, RN-43) ignora a formatação: procura no texto. | spec 015, RN-43 · decisão do produto (2026-10-30) |

### Onde o enunciado aparece

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-24 | Em todas as telas da RN-25, o **texto sem marca tem peso normal**, e só os trechos em negrito ficam em negrito, como no editor do Kahoot. Hoje o enunciado aparece inteiro em negrito; esta spec muda isso também nos quizzes que já existem. | decisão do usuário (2026-10-30) · capturas do Kahoot |
| RN-25 | O enunciado aparece **com a formatação** em todo lugar em que é mostrado: no **editor** (o campo, o começo do enunciado na lista de perguntas e o diálogo de perguntas incompletas ao Salvar); na **página do quiz** e em "Mostrar respostas", também nas páginas do quiz compartilhado e do quiz público; na **tela do anfitrião** (abertura, respostas, resultados e "Revisar respostas"); no **celular** com "perguntas nos dispositivos" ligada (abertura e respostas); na **atividade** (pergunta e resultado); e nos **relatórios** (lista da aba Perguntas, detalhe da pergunta, cartão "Perguntas difíceis" do resumo e detalhe do participante). | specs 003, 006, 009, 012, 015, 030, 031, 037 e 039 |
| RN-26 | Subscrito e sobrescrito aparecem **menores, abaixo ou acima da linha**, sem afastar as linhas do enunciado, e continuam legíveis no celular. | capturas do Kahoot |
| RN-27 | Onde o enunciado é cortado numa linha (a lista de perguntas do editor, as tabelas dos relatórios), a parte visível mantém a formatação. Onde o enunciado serve de nome para leitores de tela, vale o texto sem formatação. | decisão do produto (2026-10-30) |

### Agentes de IA

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-28 | O agente de IA (spec 044) **lê o enunciado com a formatação** marcada: ao ler um quiz, uma pergunta ou o detalhe de um relatório, ele sabe quais trechos estão em negrito, itálico, subscrito ou sobrescrito. | decisão do usuário (2026-10-30) |
| RN-29 | O agente **escreve enunciados com as quatro marcas** ao adicionar ou mudar perguntas. O enunciado enviado substitui o anterior inteiro, com a formatação que veio: enviado sem marcas, a pergunta fica sem formatação. O limite conta só os caracteres (RN-08). | decisão do usuário (2026-10-30) |
| RN-30 | Uma marcação que não seja uma das quatro é **recusada** com a explicação de quais existem. Textos com os sinais que a marcação usa, como "x < 3", continuam aceitos como texto. | decisão do produto (2026-10-30) |

## Critérios de aceite

### CA-01 — A barra aparece só com o enunciado em foco

- **Dado** o editor aberto numa pergunta, com o foco fora do enunciado
- **Então** não há barra de formatação acima do enunciado
- **Quando** o criador clica no enunciado
- **Então** a barra aparece centralizada logo acima dele, com B, I, X₂, X², o separador e Ω, sem f(x)
- **Quando** ele clica em B
- **Então** o enunciado continua em foco e a barra continua à vista
- **Quando** ele clica fora do enunciado
- **Então** a barra some

### CA-02 — Negrito num trecho selecionado

- **Dado** o enunciado "Qual destas não é uma capital?"
- **Quando** o criador seleciona "não" e clica em B
- **Então** "não" aparece em negrito e o resto em peso normal, e B fica aceso com o cursor dentro de "não"
- **E** o cabeçalho mostra "Salvando…" e depois "Salvo"
- **Quando** ele recarrega a página
- **Então** "não" continua em negrito

### CA-03 — Marca ligada para o que vem a seguir

- **Dado** o enunciado "Texto normal, " com o cursor no fim e nada selecionado
- **Quando** o criador clica em B, digita "texto em negrito", clica em B de novo e digita " fim"
- **Então** só "texto em negrito" fica em negrito
- **E** B fica aceso enquanto ele digita o trecho em negrito e apagado depois

### CA-04 — Negrito e itálico juntos

- **Dado** o enunciado com "texto em itálico e negrito" selecionado
- **Quando** o criador clica em B e em I
- **Então** o trecho aparece em negrito e itálico, e com o cursor nele os dois botões ficam acesos
- **Quando** ele seleciona o trecho de novo e clica em B
- **Então** o trecho fica só em itálico

### CA-05 — Sobrescrito para expoentes

- **Dado** o enunciado vazio
- **Quando** o criador digita "quando é 2", clica em X², digita "2", clica em X² e digita " + 2"
- **Então** o enunciado mostra "quando é 2² + 2", com o segundo "2" menor e acima da linha
- **E** com o cursor no expoente, X² fica aceso; fora dele, apagado

### CA-06 — Subscrito e sobrescrito se excluem

- **Dado** o enunciado "H2O" com o "2" em sobrescrito
- **Quando** o criador seleciona o "2" e clica em X₂
- **Então** o "2" fica em subscrito e não mais em sobrescrito, e só X₂ fica aceso
- **E** negrito ou itálico que o "2" tinha continuam

### CA-07 — Atalhos de teclado

- **Dado** o enunciado em foco com "água" selecionado
- **Quando** o criador aperta Ctrl+B e depois Ctrl+I (⌘ no Mac)
- **Então** "água" fica em negrito e itálico
- **Quando** ele seleciona um "2" e aperta Ctrl+, e depois Ctrl+.
- **Então** o "2" fica em subscrito e, em seguida, em sobrescrito

### CA-08 — Desfazer a formatação

- **Dado** o criador acabou de deixar um trecho em negrito
- **Quando** ele aperta Ctrl+Z
- **Então** o trecho volta ao peso normal
- **Quando** ele aperta Ctrl+Shift+Z (ou Ctrl+Y)
- **Então** o trecho volta a ficar em negrito

### CA-09 — O contador não conta a formatação

- **Dado** o enunciado "Texto normal, texto em negrito, texto em itálico e negrito" (58 caracteres), com dois trechos formatados
- **Quando** o campo está em foco
- **Então** o contador mostra 102 (160 − 58)
- **E** pôr ou tirar negrito de qualquer trecho não muda o contador

### CA-10 — Limite de 160 caracteres

- **Dado** o enunciado com 160 caracteres, parte deles em negrito
- **Quando** o criador digita mais uma letra
- **Então** o enunciado não muda e o contador mostra 0
- **Quando** ele aplica sobrescrito a um trecho
- **Então** a formatação é aplicada e o contador continua em 0

### CA-11 — Colar texto formatado

- **Dado** um texto copiado de um documento, com uma palavra em negrito, uma em vermelho, uma sublinhada, um link, um "2" em sobrescrito e uma quebra de linha
- **Quando** o criador cola no enunciado vazio
- **Então** a palavra em negrito e o "2" em sobrescrito mantêm a formatação
- **E** a palavra vermelha, a sublinhada e o link entram como texto sem formatação, e a quebra de linha vira espaço
- **E** se o texto passar de 160 caracteres, entra só até o limite

### CA-12 — Dicas dos botões

- **Dado** a barra à vista
- **Quando** o criador põe o ponteiro sobre Ω
- **Então** aparece a dica "Símbolos"
- **E** B, I, X₂ e X² mostram "Negrito", "Itálico", "Subscrito" e "Sobrescrito"

### CA-13 — Abrir e cancelar o diálogo de símbolos

- **Dado** o enunciado "Quanto vale ?" com o cursor antes do "?"
- **Quando** o criador clica em Ω
- **Então** abre "Insira um símbolo" com as abas Caracteres especiais (selecionada), Moeda, Matemática, Grego e Outro, a grade e Cancelar
- **Quando** ele clica em Cancelar
- **Então** o diálogo fecha, o enunciado continua "Quanto vale ?" e o foco volta ao campo com o cursor antes do "?"
- **E** o mesmo acontece com Esc e com um clique fora do diálogo

### CA-14 — Inserir um símbolo

- **Dado** o enunciado "Quanto vale ?" com o cursor antes do "?", e 147 caracteres restantes
- **Quando** o criador abre Ω, vai à aba Matemática e clica em π
- **Então** o diálogo fecha, o enunciado fica "Quanto vale π?" e o cursor fica logo depois do π
- **E** o contador mostra 146, e o enunciado é salvo

### CA-15 — O símbolo substitui a seleção e herda as marcas

- **Dado** o enunciado "Custa 10 dólares" com "dólares" selecionado
- **Quando** o criador insere "$" pela aba Moeda
- **Então** o enunciado fica "Custa 10 $"
- **Dado** o enunciado com o cursor no meio de um trecho em negrito
- **Quando** ele insere "Ω" pela aba Grego
- **Então** o "Ω" aparece em negrito

### CA-16 — Símbolo que não cabe

- **Dado** o enunciado com 160 caracteres e nada selecionado
- **Quando** o criador insere "€" pela aba Moeda
- **Então** o diálogo fecha e o enunciado não muda

### CA-17 — Abas de símbolos

- **Dado** o diálogo aberto
- **Quando** o criador abre a aba Grego
- **Então** vê as 24 letras maiúsculas (Α a Ω) e as 25 minúsculas (α a ω), com σ e ς
- **Quando** ele abre Caracteres especiais e Matemática
- **Então** a grade rola para mostrar o resto da lista
- **E** em nenhuma aba, no computador ou no celular, um símbolo aparece como um quadrado vazio

### CA-18 — Diálogo pelo teclado

- **Dado** o diálogo aberto
- **Quando** o criador usa Tab até a grade, anda com as setas até "√" e aperta Enter
- **Então** "√" é inserido no enunciado e o diálogo fecha

### CA-19 — Formatação e versão jogável

- **Dado** um quiz salvo sem alterações pendentes
- **Quando** o criador só deixa uma palavra do enunciado da pergunta 2 em itálico
- **Então** o editor mostra "Alterações não salvas"
- **E** uma partida iniciada antes de Salvar mostra a pergunta 2 sem o itálico
- **Quando** ele escolhe "Descartar alterações"
- **Então** a palavra volta a ficar sem itálico
- **Quando** ele faz a mesma mudança e Salva
- **Então** uma partida nova mostra a palavra em itálico

### CA-20 — Cópias mantêm a formatação

- **Dado** uma pergunta com "H₂O" em subscrito e "não" em negrito
- **Quando** o criador duplica a pergunta, duplica o quiz e troca o tipo da pergunta de Quiz para Verdadeiro ou falso
- **Então** a cópia da pergunta, a pergunta no quiz copiado e a pergunta com o novo tipo mostram "H₂O" e "não" com a mesma formatação
- **E** o "Duplicar" de um quiz compartilhado ou público com essa pergunta também mantém a formatação

### CA-21 — Tela do anfitrião

- **Dado** uma partida ao vivo com a pergunta "Quanto é 2² + 2²?" e outra com o "não" de "Qual destas não é uma capital?" em negrito
- **Quando** cada pergunta abre, passa às respostas e aos resultados
- **Então** a tela do anfitrião mostra o enunciado com os expoentes acima da linha e o "não" em negrito, e o resto do texto em peso normal

### CA-22 — Celular do jogador

- **Dado** a partida com "perguntas nos dispositivos" ligada e a pergunta "Qual é a fórmula da água, H₂O?"
- **Quando** a pergunta abre e passa às respostas
- **Então** o celular mostra o enunciado com o "2" em subscrito, legível
- **Dado** a mesma partida com a opção desligada
- **Então** o celular continua sem enunciado, como hoje (spec 012)

### CA-23 — A partida já criada não muda

- **Dado** uma partida ao vivo em andamento e uma atividade aberta do mesmo quiz
- **Quando** o criador deixa um trecho do enunciado em negrito e Salva
- **Então** a partida e a atividade continuam mostrando o enunciado como era quando foram criadas

### CA-24 — Atividade

- **Dado** uma atividade de um quiz com enunciados formatados
- **Quando** o participante responde uma pergunta e vê o resultado
- **Então** a pergunta e o resultado mostram o enunciado com a formatação

### CA-25 — Relatórios

- **Dado** o relatório de uma partida com a pergunta "Quanto é 2² + 2²?"
- **Quando** o criador abre a aba Perguntas, o detalhe da pergunta, o resumo (com ela entre as difíceis) e o detalhe de um participante
- **Então** todos mostram "2²" com o expoente acima da linha
- **Quando** ele pesquisa "quanto é" na aba Perguntas
- **Então** a pergunta aparece na lista

### CA-26 — Páginas do quiz e lista do editor

- **Dado** um quiz com enunciados formatados
- **Quando** o criador abre a página do quiz e "Mostrar respostas", a página do quiz compartilhado num grupo e a página do quiz público no perfil
- **Então** os enunciados aparecem com a formatação
- **E** na lista de perguntas do editor, o começo de cada enunciado aparece com a formatação

### CA-27 — Quizzes que já existem

- **Dado** um quiz criado antes desta feature, com o enunciado "Capital do Brasil?"
- **Quando** o criador abre o editor e o anfitrião apresenta uma partida dele
- **Então** o enunciado aparece com o mesmo texto, sem formatação, em peso normal
- **E** o editor não mostra "Alterações não salvas"

### CA-28 — Editor no celular

- **Dado** o editor aberto num celular
- **Quando** o criador toca no enunciado
- **Então** a barra aparece acima do campo, inteira na tela
- **Quando** ele toca em Ω
- **Então** o diálogo cabe na largura da tela, com menos colunas, e rola para mostrar o resto

### CA-29 — O agente lê a formatação

- **Dado** um quiz com a pergunta "Quanto é 2² + 2²?" e um agente conectado
- **Quando** o agente lê o quiz
- **Então** a resposta indica que os dois expoentes "2" estão em sobrescrito, em vez de mostrar só "Quanto é 22 + 22?"

### CA-30 — O agente escreve a formatação

- **Dado** um agente conectado
- **Quando** ele adiciona uma pergunta com o enunciado "Qual é a fórmula da água?" seguido de "H₂O" marcado com o "2" em subscrito e "água" em negrito
- **Então** o editor mostra a pergunta com o "2" em subscrito e "água" em negrito, com a marca de IA
- **Quando** o agente muda o enunciado dessa pergunta para um texto sem marcação
- **Então** a pergunta fica sem formatação

### CA-31 — Marcação desconhecida e sinais comuns

- **Dado** um agente conectado
- **Quando** ele envia um enunciado com um trecho sublinhado
- **Então** o pedido é recusado com a explicação de que as marcas são negrito, itálico, subscrito e sobrescrito, e nada é salvo
- **Quando** ele envia o enunciado "Para qual valor x < 3 e x > 1?"
- **Então** o enunciado é salvo com esse texto, sem formatação

### CA-32 — O limite para o agente

- **Dado** um agente conectado
- **Quando** ele envia um enunciado de 160 caracteres com metade deles em negrito
- **Então** o enunciado é aceito
- **Quando** ele envia um de 161 caracteres
- **Então** é recusado por passar do limite, como hoje

## Experiência (telas e estados)

- **Barra de formatação**: um retângulo cinza-claro de cantos arredondados, flutuando acima do enunciado e centralizado sobre ele, por cima do fundo do editor, sem empurrar o resto da tela. Os botões são letras escuras e grossas: **B**, *I*, X₂, X², uma linha vertical fina e Ω. Botão aceso: fundo cinza-escuro com o símbolo branco. Ao passar o ponteiro, o botão clareia e a dica aparece abaixo dele. Aparece ao focar o enunciado e some ao sair dele; abrir o diálogo de símbolos não a esconde de vez, porque o foco volta ao campo quando o diálogo fecha.
- **Enunciado no editor**: a mesma caixa branca de hoje, com o texto centralizado e grande, agora em **peso normal**; os trechos em negrito em negrito; o contador de caracteres restantes no canto superior direito enquanto o campo está em foco; "Comece a digitar a pergunta" quando vazio.
- **Diálogo "Insira um símbolo"**: janela branca com o título em negrito à esquerda. Abaixo, as cinco abas lado a lado; a escolhida em azul-escuro com o texto branco, as outras em cinza-claro com a sombra de botão. A grade de quadrados com bordas finas, cada um com um símbolo grande e escuro; ao passar o ponteiro, o quadrado fica cinza. Quando a lista passa da altura, a grade rola, a borda de baixo esmaece e um botão redondo azul com uma seta para baixo rola a grade. Embaixo, centralizado, o botão cinza **Cancelar**. No celular, a janela ocupa quase toda a largura e a grade tem menos colunas.
- **Telas de jogo, páginas do quiz e relatórios**: o enunciado como hoje, mas com o texto em peso normal e a formatação aplicada; expoentes e índices menores, acima ou abaixo da linha.
- **Estados**: a barra e o diálogo não carregam nada do servidor. Salvar segue o estado do cabeçalho do editor (spec 003): uma falha mantém o texto e a formatação na tela e tenta de novo.

## Divergências intencionais do Kahoot

- **Sem f(x)**: a barra não tem o botão de fórmulas, que fica para uma spec seguinte.
- **Grego com σ**: as capturas do Kahoot mostram ς e não σ entre as minúsculas; o Quizio mostra as duas.
- **Atalhos e teclado no diálogo** (RN-06, RN-17): o Kahoot não documenta atalhos nem o uso do diálogo pelo teclado.
- **Agentes de IA leem e escrevem a formatação** (RN-28 a RN-30): o Kahoot não tem agentes.
- **Limite de 160 caracteres** em vez de 120, como já era (spec 003, RN-10).

## Fora de escopo

- **Fórmulas (f(x))**: editor de equações e a fórmula nas telas.
- **Formatação nas respostas** (alternativas do Quiz, respostas aceitas, itens do Puzzle, unidade do controle deslizante): próxima spec, com a mesma barra.
- Outras formatações: sublinhado, cor, tamanho, fonte, links e quebras de linha no enunciado.
- O assistente de criação ("Crie", spec 027) criar perguntas com formatação: continua criando enunciados sem formatação.
- Importar perguntas de planilha (ainda não existe no Quizio).
- Tempo de leitura que conte os símbolos com peso maior (kahoot-reference §5.1): o tempo de leitura do Quizio continua fixo.

## Perguntas em aberto

- [x] Lista completa das abas **Caracteres especiais** e **Matemática** — as capturas mostram só o começo da rolagem. Resolvida no plano: Caracteres especiais com as letras do latim de À a ž, na ordem da captura; Matemática com os 80 símbolos visíveis e os operadores da mesma família; um teste confere a RN-16 para todas as abas.

## Changelog

- 2026-10-30 — spec criada, a partir das capturas da barra de formatação do Kahoot e das decisões do usuário: peso normal no texto sem marca, colar mantém as quatro marcas, agentes leem e escrevem a formatação, escolher um símbolo insere e fecha.
- 2026-10-30 — spec aprovada pelo usuário; a pergunta em aberto sobre as listas de símbolos foi resolvida no plano.
- 2026-10-30 — implementação: a aba Moeda ficou com 28 símbolos, sem ؋, ៛ e ﷼, que nenhuma das fontes de símbolos tem (RN-16). A pedido do usuário, a fonte do app passou a ser a Montserrat estática, como a do Kahoot, em vez da variável.
- 2026-10-30 — implementada (tarefas T01 a T29): testes de unidade, componentes, repositórios, API, MCP e E2E verdes.
