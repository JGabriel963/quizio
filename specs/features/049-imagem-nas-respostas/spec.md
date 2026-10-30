---
id: "049"
title: Imagem nas respostas
status: done # draft | approved | planned | in-progress | done
contexts: [quiz, game, reports, library, media]
created: 2026-10-30
---

# 049 — Imagem nas respostas

## Contexto e problema

As respostas do Quiz e do Puzzle só aceitam texto. Muitas perguntas de escola pedem que a resposta seja uma imagem: "Qual destes é o prato típico do Piauí?", "Qual é a bandeira do Japão?", "Coloque as fases da Lua na ordem". A spec 007 deu imagem à pergunta e deixou a imagem nas alternativas para depois; a spec 048 deu formatação ao texto das respostas.

No Kahoot, uma resposta de Quiz ou de Puzzle pode ser uma **imagem no lugar do texto** (kahoot-reference §2, §4.1.1, §4.1.6; capturas do Kahoot, 2026-10-30). O ícone de imagem fica à direita da resposta vazia e no começo da barra de formatação, com a dica "Adicione imagem como resposta alternativa". A imagem entra no bloco, que ganha a cor da posição; o texto some e só volta quando a imagem é removida. Sobre a imagem ficam "Detalhes da mídia", "Recortar" e "Remover".

## Objetivo

O criador põe uma imagem como resposta de Quiz ou de Puzzle, com recorte e texto alternativo, e a resposta aparece como imagem em todas as telas em que as respostas aparecem: no editor, no telão, no celular dos jogadores, na atividade, nas páginas do quiz e nos relatórios.

## Personas

- **Criador**: põe, recorta, descreve e remove a imagem de uma resposta no editor.
- **Anfitrião**: apresenta as respostas em imagem na tela grande.
- **Jogador / participante**: vê e escolhe respostas em imagem no celular, ao vivo e na atividade.
- **Agente de IA** (spec 044): lê e põe imagens nas respostas em nome do criador.

## Histórias de usuário

- **HU-01** — Como criador, quero que uma resposta seja uma imagem, para perguntar "qual destes" sobre coisas que se reconhecem vendo.
- **HU-02** — Como criador de um Puzzle, quero ordenar imagens, para perguntas como as fases da Lua ou as etapas de um processo.
- **HU-03** — Como criador, quero recortar a imagem da resposta e descrevê-la, para mostrar só o que importa e para leitores de tela.
- **HU-04** — Como anfitrião e como jogador, quero ver as imagens das respostas, para escolher a certa.
- **HU-05** — Como criador, quero ver as imagens das respostas nos relatórios e nas páginas do quiz, para reconhecer o que cada um respondeu.
- **HU-06** — Como criador que usa um agente de IA, quero que o agente leia e ponha imagens nas respostas.

## Regras de negócio

### A resposta em imagem

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Uma resposta de **Quiz** ou de **Puzzle** pode ser uma **imagem (`AnswerImage`)** em vez de texto. Uma resposta tem **texto ou imagem, nunca os dois**. Verdadeiro ou falso, Resposta digitada e Controle deslizante não têm imagem nas respostas. | kahoot-reference §2, §4.1.1, §4.1.6 · observação do usuário (2026-10-30) |
| RN-02 | Uma resposta em imagem **conta como preenchida**: entra na contagem das respostas que a pergunta precisa (spec 004, RN-16; spec 033, RN-07) e, no Quiz, **pode ser a correta**. | kahoot-reference §2 · decisão do produto (2026-10-30) |
| RN-03 | A imagem segue a **política de mídia** da imagem da pergunta: **JPEG, PNG, GIF ou WebP de até 10 MB**, só arquivos enviados pelo dono do quiz, e conta no limite de envios por hora. Um GIF animado continua animado. | spec 007, RN-02, RN-03, RN-35a |
| RN-04 | A imagem tem dois ajustes opcionais: o **recorte** e o **texto alternativo**. Não há "Usar como fundo" numa resposta. | capturas do Kahoot (2026-10-30) · spec 007, RN-04 |

### Pôr a imagem

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-05 | Há duas entradas: o **ícone de imagem à direita da resposta vazia** (fora de foco) e o **primeiro botão da barra de formatação** da resposta em foco, separado dos outros por uma linha. Os dois mostram a dica **"Adicione imagem como resposta alternativa"**. Uma resposta com texto não mostra o ícone à direita, só o botão da barra. | capturas do Kahoot (2026-10-30) |
| RN-06 | As duas entradas abrem o diálogo **"Carregar imagem"** da spec 007: arrastar, escolher ou colar um arquivo, com os limites escritos e **Fechar**. Um arquivo fora da política é recusado antes do envio, com a mensagem da spec 007. | spec 007, RN-07 a RN-10 · capturas do Kahoot (2026-10-30) |
| RN-07 | **A imagem substitui o texto**: ao terminar o envio, o texto da resposta e a formatação dele **somem**, e o campo de texto dá lugar à imagem. O texto só volta a ser digitado depois de **remover** a imagem. A marca de correta continua como estava. | observação do usuário (2026-10-30) · capturas do Kahoot |
| RN-08 | Durante o envio, o bloco da resposta mostra o **progresso** e não aceita outro envio. Se falhar, a resposta fica como estava, com a mensagem "Não foi possível enviar a imagem. Tente de novo." A imagem vai para a **resposta em que o envio começou**, mesmo que o criador mude de pergunta; **Sair** e **Salvar** esperam os envios em andamento. | spec 007, RN-11, RN-12 |
| RN-09 | Com imagem, o bloco tem a **cor da posição** (como uma resposta preenchida), a forma à esquerda, a **imagem** logo depois dela e, à direita, a marca de correta (Quiz) ou a alça ≡ (Puzzle). Sem contador nem barra de formatação. Sem recorte, a imagem aparece inteira, sem distorção, numa moldura de altura fixa. | capturas do Kahoot (2026-10-30) |
| RN-10 | Ao passar o ponteiro sobre a imagem, ou com o foco nela, aparecem as ações **"Detalhes da mídia"** (ícone de informação), **"Recortar imagem"** e **"Remover"**. | capturas do Kahoot (2026-10-30) |

### Ajustar e remover

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-11 | **"Recortar imagem"** abre o diálogo da spec 007 com três formas: **Paisagem**, **Retrato** e **Quadrado** (sem Círculo), o zoom, **Fechar** e **Salvar**, com as mesmas regras: arrastar para escolher a parte, zoom de 1 a 3 vezes, recorte que não altera o arquivo. No bloco, a imagem aparece na forma recortada. | capturas do Kahoot (2026-10-30) · spec 007, RN-18 a RN-22 |
| RN-12 | **"Detalhes da mídia"** abre o diálogo **"Adicionar detalhes da mídia"** da spec 007, só com o **texto alternativo** (até 1000 caracteres), **Fechar** e **Adicionar**. | spec 007, RN-28 a RN-30 · decisão do usuário (2026-10-30) |
| RN-13 | **"Remover"** tira a imagem na hora, sem confirmação, com o recorte e o texto alternativo. A resposta fica **vazia**, com o campo de texto de volta, e deixa de ser correta, como uma resposta apagada (spec 004, RN-06). | capturas do Kahoot · spec 004, RN-06 · spec 007, RN-16 |
| RN-14 | Pôr, recortar, descrever e remover são **salvos automaticamente**, com o estado do cabeçalho, como as outras edições da resposta. | spec 003, RN-20 a RN-23 · spec 007, RN-05 |

### No Puzzle

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-15 | Mover uma resposta do Puzzle (arrastando ou pelo teclado) leva a **imagem com os ajustes**, como leva o texto. | spec 033, RN-05 · spec 048, RN-11 |
| RN-16 | Uma resposta em imagem **nunca é igual a outra resposta**: duas respostas só trocam de lugar sem errar a ordem quando têm o mesmo texto (spec 033, RN-09). | decisão do produto (2026-10-30) |

### A imagem faz parte da pergunta

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-17 | A imagem das respostas e seus ajustes **entram na versão jogável**: mudar uma delas mostra "Alterações não salvas", e "Descartar alterações" traz de volta o que estava salvo. A versão jogável nunca perde uma imagem. | spec 006 · spec 007, RN-35, RN-36 |
| RN-18 | **Duplicar** a pergunta ou o quiz, o "Duplicar" e o "Duplique para editar" de um quiz compartilhado ou público copiam as imagens das respostas com os ajustes; as cópias são independentes. Na **troca de tipo**, entre Quiz e Puzzle, as respostas que o editor guarda na sessão voltam com as imagens. | spec 007, RN-33 · spec 005, RN-17 · spec 037 · spec 039 |
| RN-19 | As imagens das respostas **são do quiz**, como as das perguntas: um arquivo só é apagado quando nenhuma pergunta viva e nenhuma versão o usa, e excluir o quiz definitivamente apaga todas. | spec 007, RN-36, RN-37 |
| RN-20 | Uma **partida** ou uma **atividade** copia as respostas com as imagens e os ajustes quando começa; mudanças feitas depois no quiz não chegam a ela. | specs 009 e 029 |
| RN-21 | O **assistente de criação** continua criando só respostas de texto. | spec 027 · decisão do produto (2026-10-30) |

### Onde as imagens aparecem

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-22 | Na **tela do anfitrião**, as respostas em imagem aparecem no bloco, recortadas, no lugar do texto, logo depois da forma e com a **altura inteira do bloco**: nas respostas e na revelação do Quiz, e nos blocos do Puzzle na ordem sorteada e na ordem certa. A tela do anfitrião é a mesma com "Mostrar perguntas nos dispositivos" ligada ou não. | capturas do Kahoot (2026-10-30) |
| RN-23 | No **celular**, a imagem aparece **onde hoje vai o texto**: com "Mostrar perguntas nos dispositivos" ligada e sempre na **atividade**, cada botão mostra a sua imagem, centralizada, com a cor da posição em volta e sem a forma. Desligada, o botão mostra só a forma e a cor, como hoje. A imagem nunca chega ao celular antes de as respostas abrirem. | capturas do Kahoot da partida ao vivo e da atividade (2026-10-30) · spec 012, RN-18 · decisão do usuário (2026-10-30) |
| RN-24 | No **resultado da atividade**, nas **páginas do quiz** ("Mostrar respostas", quiz compartilhado e quiz público) e nos **relatórios** (respostas do detalhe da pergunta, o que cada participante escolheu e as ordens do Puzzle), a resposta em imagem aparece como uma **miniatura** recortada no lugar do texto. | specs 015, 030, 037 e 039 · decisão do produto (2026-10-30) |
| RN-25 | Para leitores de tela, a resposta em imagem tem o nome do **texto alternativo**; sem ele, **"Imagem da resposta N"**. | spec 007, RN-31 · decisão do produto (2026-10-30) |

### Agentes de IA

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-26 | O agente **lê** as respostas em imagem: o endereço da imagem, o recorte e o texto alternativo, no lugar do texto. | spec 044 · decisão do usuário (2026-10-30) |
| RN-27 | O agente **põe** uma imagem numa resposta de Quiz ou de Puzzle, como faz com a imagem da pergunta: um arquivo enviado ou um link, com recorte e texto alternativo opcionais. Uma resposta com **texto e imagem ao mesmo tempo** é recusada. | spec 044, RN-21 · decisão do usuário (2026-10-30) |

## Critérios de aceite

### CA-01 — As duas entradas

- **Dado** uma pergunta Quiz com a resposta 1 vazia e a resposta 2 com "Teste"
- **Então** a resposta 1 mostra o ícone de imagem à direita, e a resposta 2 não
- **Quando** o criador põe o ponteiro sobre o ícone
- **Então** aparece a dica "Adicione imagem como resposta alternativa"
- **Quando** ele clica na resposta 2
- **Então** a barra mostra, antes de B, o botão de imagem com a mesma dica

### CA-02 — Pôr uma imagem numa resposta vazia

- **Dado** a resposta 1 vazia
- **Quando** o criador clica no ícone de imagem e envia um PNG de 2 MB
- **Então** o diálogo fecha, o bloco ganha a cor vermelha da posição e mostra a imagem inteira, e o campo de texto some
- **E** o cabeçalho mostra "Salvando…" e depois "Salvo", e depois de recarregar a imagem continua lá
- **E** a pergunta deixa de apontar a resposta 1 como faltando

### CA-03 — A imagem substitui o texto

- **Dado** a resposta 2 com "Arroz" em negrito, marcada como correta
- **Quando** o criador põe uma imagem pela barra da resposta 2
- **Então** o texto "Arroz" some, a imagem aparece e a resposta continua correta
- **Quando** ele remove a imagem
- **Então** a resposta fica vazia, sem "Arroz", com o campo de texto e o texto de exemplo de volta, e deixa de ser correta

### CA-04 — Arquivo recusado e falha no envio

- **Dado** a resposta 1 vazia
- **Quando** o criador escolhe um PDF ou uma imagem de 12 MB
- **Então** aparece "Use uma imagem JPEG, PNG, GIF ou WebP de até 10 MB." e a resposta continua vazia
- **Quando** um envio falha no meio
- **Então** aparece "Não foi possível enviar a imagem. Tente de novo." e a resposta fica como estava

### CA-05 — O envio vai para a resposta em que começou

- **Dado** um envio em andamento na resposta 3 da pergunta 1
- **Quando** o criador seleciona a pergunta 2 antes de o envio terminar
- **Então** a imagem entra na resposta 3 da pergunta 1, e a pergunta 2 não muda
- **E** "Salvar" espera o envio terminar

### CA-06 — Ações sobre a imagem

- **Dado** a resposta 1 com imagem
- **Quando** o criador põe o ponteiro sobre a imagem
- **Então** aparecem "Detalhes da mídia", "Recortar imagem" e "Remover"

### CA-07 — Recortar

- **Dado** a resposta 1 com imagem
- **Quando** o criador abre "Recortar imagem"
- **Então** vê Paisagem, Retrato e Quadrado, sem Círculo, o zoom, Fechar e Salvar
- **Quando** ele escolhe Quadrado, aproxima e salva
- **Então** o bloco mostra a parte escolhida, quadrada, e depois de recarregar continua assim
- **Quando** ele abre de novo e fecha sem salvar
- **Então** o recorte continua o mesmo

### CA-08 — Texto alternativo

- **Dado** a resposta 1 com imagem
- **Quando** o criador abre "Detalhes da mídia", escreve "Arroz de cuxá" e clica em Adicionar
- **Então** o diálogo tem só o campo do texto alternativo, com o limite de 1000 caracteres, sem "Fonte dos créditos"
- **E** um leitor de tela anuncia a resposta como "Arroz de cuxá"
- **Dado** a resposta 2 com imagem sem texto alternativo
- **Então** ela é anunciada como "Imagem da resposta 2"

### CA-09 — Uma pergunta só de imagens

- **Dado** uma pergunta Quiz com enunciado e as quatro respostas em imagem, a primeira correta
- **Quando** o criador Salva
- **Então** o quiz é publicado, sem aviso de pergunta incompleta

### CA-10 — Puzzle com imagens

- **Dado** um Puzzle com imagens nas respostas 1 e 2 e "Ar" na 3
- **Então** cada bloco com imagem mostra a imagem e a alça ≡, e o Puzzle está completo
- **Quando** o criador sobe a resposta 2 com ↑ na alça
- **Então** a imagem dela vai para a posição 1 com o recorte e o texto alternativo, e a posição 2 mostra a imagem que estava na 1

### CA-11 — Ordem do Puzzle com imagens

- **Dado** um Puzzle com duas respostas em imagem e uma de texto
- **Quando** um jogador envia a ordem com as duas imagens trocadas
- **Então** a resposta conta como errada

### CA-12 — Versão jogável, descartar e cópias

- **Dado** um quiz salvo sem alterações pendentes
- **Quando** o criador põe uma imagem numa resposta
- **Então** o editor mostra "Alterações não salvas", e uma partida iniciada antes de Salvar mostra a resposta antiga
- **Quando** ele escolhe "Descartar alterações"
- **Então** a resposta volta a ser como estava
- **Dado** uma pergunta com uma resposta em imagem
- **Quando** o criador duplica a pergunta e remove a imagem da cópia
- **Então** a original continua com a imagem
- **Quando** ele troca o tipo de Quiz para Verdadeiro ou falso e volta para Quiz sem sair do editor
- **Então** a resposta volta com a imagem

### CA-13 — Telão

- **Dado** uma partida ao vivo com uma pergunta Quiz de quatro respostas em imagem, uma delas recortada em Quadrado
- **Quando** a pergunta passa às respostas e à revelação
- **Então** a tela do anfitrião mostra as quatro imagens nos blocos, a recortada em Quadrado, e na revelação a correta marcada

### CA-14 — Celular

- **Dado** a mesma partida com "Mostrar perguntas nos dispositivos" ligada
- **Quando** a pergunta passa às respostas
- **Então** cada botão do celular mostra a sua imagem, e tocar nela envia a resposta
- **Dado** a opção desligada
- **Então** os botões mostram só a forma e a cor
- **E** nenhuma imagem de resposta chega ao celular durante a abertura da pergunta

### CA-15 — Puzzle na partida

- **Dado** uma partida com um Puzzle de respostas em imagem e "Mostrar perguntas nos dispositivos" ligada
- **Quando** a pergunta passa às respostas e à revelação
- **Então** os blocos do celular e do telão mostram as imagens, e a ordem certa da revelação também

### CA-16 — A partida já criada não muda

- **Dado** uma partida ao vivo em andamento e uma atividade aberta do mesmo quiz
- **Quando** o criador remove a imagem de uma resposta e Salva
- **Então** a partida e a atividade continuam mostrando a imagem

### CA-17 — Atividade

- **Dado** uma atividade com uma pergunta Quiz de respostas em imagem
- **Quando** o participante responde e vê o resultado
- **Então** a pergunta mostra as imagens nos botões e o resultado mostra a miniatura da que ele escolheu e da certa

### CA-18 — Páginas do quiz e relatórios

- **Dado** um quiz com respostas em imagem e uma partida dele já jogada
- **Quando** o criador abre "Mostrar respostas" na página do quiz, a página do quiz compartilhado e a do quiz público
- **Então** as respostas em imagem aparecem como miniaturas
- **Quando** ele abre o detalhe da pergunta e o detalhe de um participante no relatório
- **Então** as respostas, o que cada um escolheu e as ordens do Puzzle mostram as miniaturas

### CA-19 — Arquivos que ninguém usa

- **Dado** uma resposta em imagem num quiz publicado
- **Quando** o criador remove a imagem e Salva
- **Então** o arquivo é apagado, porque nenhuma pergunta viva e nenhuma versão o usa
- **Dado** a mesma imagem ainda na versão jogável, com a remoção não salva
- **Então** o arquivo continua guardado

### CA-20 — O agente lê e põe imagens

- **Dado** um quiz com uma resposta em imagem com o texto alternativo "Arroz de cuxá"
- **Quando** o agente lê o quiz
- **Então** a resposta vem com o endereço da imagem e o texto alternativo, sem texto
- **Quando** o agente põe, pelo link de uma imagem pública, a imagem da resposta 2 de uma pergunta Quiz
- **Então** o editor mostra a resposta 2 em imagem, com a marca de IA na pergunta
- **Quando** o agente envia uma resposta com texto e imagem ao mesmo tempo
- **Então** o pedido é recusado e nada muda

## Experiência (telas e estados)

- **Resposta vazia fora de foco**: o bloco branco de hoje, com o texto de exemplo e o ícone de imagem à direita.
- **Resposta em foco**: a barra de formatação com o botão de imagem primeiro, uma linha, e depois B, I, X₂, X², a linha e Ω. A dica "Adicione imagem como resposta alternativa" aparece num balão roxo abaixo do botão, como nas capturas.
- **Enviando**: o bloco mostra a barra de progresso no lugar do texto.
- **Resposta em imagem**: o bloco com a cor da posição, a forma à esquerda, a imagem numa moldura de altura fixa com faixas da cor da posição, mais escura, onde a imagem não preenche, e a marca de correta ou a alça à direita. Com o ponteiro ou o foco sobre a imagem, os botões redondos de informação e de recorte e o botão branco "Remover" aparecem no rodapé dela.
- **Diálogos**: "Carregar imagem", "Recortar imagem" (Paisagem, Retrato, Quadrado) e "Adicionar detalhes da mídia" iguais aos da imagem da pergunta (spec 007), com as formas do recorte das respostas.
- **Telas de jogo**: no telão, a imagem fica logo depois da forma, com a altura inteira do bloco, e o resto do bloco na cor da posição. No celular, com as perguntas nos dispositivos e na atividade, cada botão mostra a imagem centralizada, inteira, com a cor da posição em volta e sem a forma; sem as perguntas nos dispositivos, os botões grandes de forma e cor de sempre.
- **Miniaturas**: nas páginas do quiz, nos relatórios e no resultado da atividade, uma miniatura pequena no lugar do texto, com o texto alternativo como nome.

## Divergências intencionais do Kahoot

- **Sem a biblioteca de imagens** (Getty Images, Unsplash, Criador de imagens, GIFs): o botão abre direto o envio de arquivo, como na imagem da pergunta (spec 007).
- **Sem "Fonte dos créditos"** nos detalhes da mídia, como na spec 007: no Kahoot ela serve à biblioteca.
- **Formatos e tamanho** da política de mídia do Quizio (10 MB), e não os do Kahoot (§4.1).
- **Agentes de IA põem imagens nas respostas** (RN-27): o Kahoot não tem agentes.

## Fora de escopo

- Vídeo ou GIF da biblioteca nas respostas.
- Imagem nas respostas de Verdadeiro ou falso, Resposta digitada e Controle deslizante.
- "Usar como fundo" numa resposta.
- O assistente de criação criar respostas em imagem.
- Mostrar a imagem das respostas na miniatura da lista de perguntas do editor.

## Perguntas em aberto

Nenhuma.

## Changelog

- 2026-10-30 — spec criada, a partir das capturas do Kahoot e das observações do usuário (a imagem substitui o texto, que só volta ao remover; vale para Quiz e Puzzle). Decisões do usuário: no celular a imagem aparece onde hoje vai o texto; sem "Fonte dos créditos"; agentes leem e põem imagens nas respostas.
- 2026-10-30 — capturas do Kahoot da partida: o telão mostra as imagens do mesmo jeito com ou sem as perguntas nos dispositivos, com a altura inteira do bloco (RN-22); no celular, sem a opção só formas e cores, e com ela (e na atividade) a imagem centralizada no botão, sem a forma (RN-23). O comportamento no celular deixou de ser divergência.
- 2026-10-30 — spec aprovada pelo usuário.
- 2026-10-30 — implementada (tarefas T01 a T20): testes de unidade, componentes, repositórios, API, MCP e E2E verdes.
