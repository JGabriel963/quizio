---
id: "033"
title: Puzzle
status: done # draft | approved | planned | in-progress | done
contexts: [quiz, game, reports]
created: 2026-10-22
---

# 033 — Puzzle

## Contexto e problema

A série de novos tipos de pergunta já entregou a Resposta curta (spec 031) e o Controle deslizante (spec 032), um tipo por vez, cada um com o editor, a partida ao vivo, a atribuição e o relatório. Falta o último tipo de "Testar conhecimento" da 016 no roadmap: o **Puzzle (`puzzle`)**.

No Quiz, o jogador reconhece a resposta certa entre as alternativas. No Puzzle, ele recebe as respostas embaralhadas e precisa **colocá-las na ordem certa**: eventos na ordem em que aconteceram, rios do maior para o menor, os passos de um processo. Ele testa se o jogador entendeu a relação entre as respostas, e não só se reconhece uma delas.

As regras vêm da referência (§4.1.6), do artigo de ajuda do Kahoot sobre os tipos de pergunta (consultado em 2026-10-22) e das capturas enviadas pelo usuário em 2026-10-22. As capturas mostram o seletor e a prévia, o editor (vazio, preenchido, arrastando, com a imagem ao lado e de fundo), o limite de tempo, a abertura da pergunta, a fase de respostas (anfitrião e celular, com e sem as perguntas nos dispositivos) e a revelação. Parte da partida vem de uma demonstração do Kahoot e parte da pré-visualização do editor, porque o tipo é pago.

## Objetivo

O criador monta uma pergunta de Puzzle com 3 ou 4 respostas, escritas na ordem certa. Na partida, as respostas chegam embaralhadas, nunca já na ordem certa. O jogador arrasta os blocos no celular até achar que estão na ordem certa e envia. O servidor só dá a resposta como certa se a ordem inteira estiver certa, e os pontos seguem a fórmula de velocidade. Na revelação, o anfitrião vê a ordem certa e quantos acertaram e quantos erraram. A atribuição e o relatório tratam o tipo como tratam o Quiz.

## Personas

- **Criador (`Creator`)** — monta o quiz no editor (kahoot-reference §1).
- **Anfitrião (`Host`)** — conduz a partida ao vivo.
- **Jogador (`Player`)** — ordena as respostas no celular, ao vivo ou numa atribuição.

## Histórias de usuário

- **HU-01** — Como criador, quero uma pergunta em que o jogador coloca as respostas em ordem, para testar sequências, cronologias e classificações.
- **HU-02** — Como criador, quero escrever as respostas já na ordem certa e trocá-las de lugar arrastando, sem me preocupar em embaralhá-las.
- **HU-03** — Como jogador, quero arrastar os blocos no celular até a ordem que acho certa e enviar.
- **HU-04** — Como anfitrião, quero mostrar na revelação a ordem certa e quantos acertaram.
- **HU-05** — Como criador, quero ver no relatório a ordem que cada um enviou.

## Regras de negócio

### Seletor e tipo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | **Puzzle (`puzzle`)** passa a ser um tipo de pergunta no grupo **"Testar conhecimento"** do seletor, depois de "Controle deslizante", com o ícone e o nome do Kahoot. A prévia do cartão mostra o exemplo "Ordene do menos ao mais populoso", com uma imagem e quatro blocos coloridos ("EUA", "Itália", "Egito" sendo arrastado, "Espanha"), e a frase **"Peça que os participantes coloquem as respostas na ordem certa."**. | kahoot-reference §4.1.6 · captura do Kahoot (2026-10-22) |
| RN-02 | O tipo aparece também em **"Tipo de pergunta"** no painel de propriedades. A troca de tipo da spec 005 (RN-14 a RN-21) vale para ele: mantém o enunciado, os pontos, a imagem e a posição. As respostas **não passam** de um tipo para o outro, nem entre Quiz e Puzzle. Até sair do editor, ele lembra o que a pergunta tinha em cada tipo. | spec 005 · decisão do usuário (2026-10-22) |

### Pergunta no editor

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-03 | Uma pergunta de Puzzle tem **4 campos de resposta**, cada um com **até 75 caracteres** (contados como os demais limites). Os três primeiros mostram "Adicionar resposta 1", "Adicionar resposta 2" e "Adicionar resposta 3"; o quarto, **"Adicionar resposta 4 (opcional)"**. **A ordem dos campos é a ordem certa.** | kahoot-reference §4.1.6 · artigo de ajuda do Kahoot · captura do Kahoot (2026-10-22) |
| RN-04 | Cada campo tem à esquerda a **forma e a cor da sua posição**: triângulo vermelho, losango azul, círculo amarelo e quadrado verde, nessa ordem. O campo vazio é branco; preenchido, ganha a cor da posição. Enquanto é editado, mostra **quantos caracteres ainda cabem** (de 75 para baixo). | captura do Kahoot (2026-10-22) |
| RN-05 | Cada campo tem à direita uma **alça de arrastar** (≡). Arrastar um campo para outra posição **troca a ordem certa**: o texto vai junto, e a forma e a cor ficam com a posição (o campo que chega ao primeiro lugar fica vermelho). Enquanto é arrastado, o bloco sai do lugar, um pouco deslocado, e os outros abrem espaço. A mesma troca pode ser feita pelo teclado. | captura do Kahoot (2026-10-22) · teclado: constituição, artigo IX |
| RN-06 | Embaixo do editor fica o aviso **"Adicione no mínimo 3 respostas na ordem correta. Elas serão embaralhadas automaticamente durante o jogo."**. Ao editar o enunciado de um Puzzle, aparece a dica **"Adicione a ordem esperada para ajudar os participantes a responder corretamente (por exemplo, "do menor ao maior")."**. | captura do Kahoot (2026-10-22) |
| RN-07 | Uma pergunta de Puzzle está **incompleta** quando (a) não tem enunciado ou (b) tem **menos de 3 respostas preenchidas** (só espaços não conta). O motivo (b) aparece no alerta da lista como **"Adicione no mínimo 3 respostas"**, com a regra de quando avisar da spec 004 (RN-16a). Como nos outros tipos, a pergunta continua salva e não deixa salvar a versão jogável (spec 006). | kahoot-reference §3.6, §4.1.6 · spec 004 · decisão do produto (2026-10-22), texto |
| RN-08 | Um campo vazio entre campos preenchidos **não conta**: a ordem certa é a dos campos preenchidos, de cima para baixo. Três respostas nos campos 1, 2 e 4 formam uma pergunta completa de 3 respostas. | decisão do produto (2026-10-22) |
| RN-09 | **Respostas repetidas são permitidas.** Quando duas respostas têm o mesmo texto, trocá-las de lugar não muda a ordem: mais de uma sequência vale como certa. | artigo de ajuda do Kahoot ("more than one sequence can be accepted as correct") |
| RN-10 | O **limite de tempo** do Puzzle vai de **20 segundos a 4 minutos** (20, 30, 45, 60, 90, 120, 180 ou 240 s), e a pergunta nasce com **1 minuto**. Os **pontos** são Padrão, Pontos em dobro ou Sem pontos, como no Quiz. O painel não tem "Opções de resposta". | kahoot-reference §4.1.6, §5.1 · captura do Kahoot (2026-10-22) |
| RN-11 | **"Aplicar a todas as perguntas"** com um tempo que o Puzzle não aceita (5, 10 ou 15 s) deixa as perguntas de Puzzle com **20 segundos**. Da mesma forma, uma pergunta com menos de 20 s que vira Puzzle fica com 20 s. | spec 031, RN-07 |
| RN-12 | A imagem da pergunta (spec 007) funciona como nos outros tipos: ao lado das respostas ou de fundo, com recorte e texto alternativo. De fundo, as respostas ficam no centro, mais estreitas. | spec 007 · captura do Kahoot (2026-10-22) |
| RN-13 | O item da lista mostra **"N Puzzle"**, o tempo e, na miniatura, a imagem e **quatro barras empilhadas**, uma por campo. Duplicar a pergunta ou o quiz copia as respostas na mesma ordem (spec 005, RN-21). | spec 003, RN-17 · captura do Kahoot (2026-10-22) |

### Embaralhar e corrigir

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-14 | Na partida, as respostas chegam **embaralhadas**, e a ordem sorteada **nunca é uma das ordens certas** (RN-09). Ninguém acerta só tocando em "Enviar". Uma pergunta de 3 respostas sempre tem ordens erradas para sortear, a menos que as três sejam iguais, caso em que qualquer ordem é certa e a pergunta vai na ordem do editor. | artigo de ajuda do Kahoot ("embaralhadas automaticamente") · decisão do usuário (2026-10-22), nunca na ordem certa |
| RN-15 | Na **partida ao vivo**, o sorteio é **um só para a partida**, feito quando ela começa: o anfitrião e todos os celulares partem da mesma ordem. Cada resposta recebe **a forma e a cor da posição em que foi sorteada** e fica com elas até o fim daquela pergunta, no celular e na tela do anfitrião. "Ordem aleatória de respostas" (spec 012) não muda nada: o Puzzle é sempre embaralhado. | captura do Kahoot (2026-10-22): o celular sem os textos mostra as formas na ordem da tela do anfitrião · spec 012 |
| RN-16 | A resposta é **correta** só quando a **ordem inteira** está certa: em cada posição, o texto enviado é igual ao texto da ordem certa. Não há meio acerto: uma troca entre duas respostas é uma resposta incorreta. | kahoot-reference §4.1.6 (tudo ou nada) |
| RN-17 | A correção é feita **no servidor**, quando a resposta chega. A ordem certa **nunca chega ao celular antes da revelação**, com "Mostrar perguntas nos dispositivos" ligado ou não. | constituição, artigo V · spec 009, RN-21 |
| RN-18 | Os pontos de uma resposta correta seguem a fórmula de velocidade da spec 010 (RN-01, RN-02, RN-05), com o limite de tempo da pergunta: 1000 ou 2000 pontos possíveis, 0 em "Sem pontos". A resposta conta para a sequência de acertos como no Quiz. | kahoot-reference §4.1.6 · spec 010 · captura do Kahoot (2026-10-22), "+ 835" com 58 de 60 s |

### No celular do jogador

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-19 | Na fase de respostas, o celular mostra o aviso **"Arraste os blocos para os organizar na ordem certa."**, os blocos na ordem sorteada, cada um com a sua forma, a sua cor e a alça ≡, e o botão **"Enviar"**, habilitado desde o início. | captura do Kahoot (2026-10-22) |
| RN-20 | Com **"Mostrar perguntas nos dispositivos"** ligado, os blocos têm o texto, e o celular mostra também a imagem e o enunciado, como nos outros tipos (spec 012, RN-18b). **Desligado, os blocos mostram só a forma e a cor**: o jogador ordena olhando a tela do anfitrião, onde cada resposta tem a mesma forma e a mesma cor. | captura do Kahoot (2026-10-22) · spec 012 |
| RN-21 | O jogador **arrasta** um bloco para outra posição, e os outros abrem espaço. Os blocos também podem ser movidos sem arrastar, pelo teclado ou por um leitor de tela, uma posição de cada vez. | captura do Kahoot (2026-10-22) · constituição, artigo IX |
| RN-22 | **"Enviar"** confirma a ordem em que os blocos estão, mesmo que o jogador não tenha mexido em nada. Valem as regras de qualquer resposta: uma por pergunta, sem troca e dentro do prazo (spec 009, RN-17, RN-18), e a mesma tela de espera. Se o tempo acaba sem "Enviar", o jogador fica **sem resposta**, mesmo que tenha mexido nos blocos. A resposta que não chegou por falta de conexão mostra "Sua resposta não foi enviada." e devolve os blocos na ordem em que estavam (spec 013). | spec 009 · spec 012, RN-30 · spec 013 · captura do Kahoot (2026-10-22) |
| RN-23 | Na revelação, o celular mostra **"Correto"** com a sequência e os pontos, **"Incorreto"** ou **"Tempo esgotado"**, como nos outros tipos (specs 009 e 010). Ele não mostra a ordem certa, que está na tela do anfitrião. | spec 009 · spec 010 · captura do Kahoot (2026-10-22) |

### Na tela do anfitrião

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-24 | Na **abertura** da pergunta, o anfitrião vê o ícone e o nome **"Puzzle"**, como nos outros tipos (spec 009, RN-07). | spec 009, RN-07 · captura do Kahoot (2026-10-22) |
| RN-25 | Na **fase de respostas**, o anfitrião vê o enunciado, a imagem, o tempo restante e o total de respostas, como nos outros tipos, e, no lugar das alternativas, **as respostas na ordem sorteada**, empilhadas, cada uma com a sua forma, a sua cor e o texto. | captura do Kahoot (2026-10-22) |
| RN-26 | Na **revelação**, as respostas aparecem **na ordem certa**, cada uma com a forma e a cor que teve na partida (RN-15) e a marca ✓. Ao lado, duas barras: **quantos acertaram** (verde, com ✓) e **quantos erraram** (vermelha, com ✗). Quem não respondeu não entra em nenhuma das duas. | captura do Kahoot (2026-10-22) · "quem não respondeu": decisão do produto (2026-10-22) |
| RN-27 | Como nos outros tipos, o botão **"Mostrar mídia"** mostra a imagem no lugar da revelação, e "Ocultar mídia" volta a ela. | spec 031, RN-25 · captura do Kahoot (2026-10-22) |

### Atribuição e relatório

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-28 | Numa **atribuição** (spec 030), a pergunta aparece inteira no aparelho, com o enunciado, a imagem e os blocos com o texto, que se arrastam como na RN-21, e o "Enviar". **Cada participante recebe o seu próprio sorteio**, feito quando ele entra, e a ordem sorteada nunca é uma ordem certa (RN-14). O Timer da pergunta funciona como nos outros tipos; sem ele, a resposta correta vale os pontos cheios. | spec 030 · spec 031, RN-34 · decisão do produto (2026-10-22), sorteio por participante |
| RN-29 | No **resultado** da atribuição, o participante vê **"Correto"** ou **"Incorreto"**, **a ordem que enviou** e **"A ordem certa é:"** com as respostas na ordem certa. | spec 030 · spec 031, RN-35 · decisão do produto (2026-10-22) |
| RN-30 | No **relatório**, a pergunta aparece com o tipo "Puzzle", e as contas são as de sempre: só a ordem inteira certa conta como acerto. | spec 015, RN-11 |
| RN-31 | No **detalhe da pergunta**, no lugar das alternativas, o relatório mostra **a ordem certa** e a lista das **ordens enviadas**, cada uma com quantos a enviaram e a marca de certo ou errado: a certa primeiro, depois as outras, da mais enviada para a menos enviada. No **detalhe do participante**, cada pergunta deste tipo mostra a ordem que ele enviou. | spec 015, RN-42, RN-44 · spec 031, RN-37 · decisão do produto (2026-10-22) |

### Textos e acessibilidade

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-32 | Todos os textos são em português do Brasil. A cor nunca é o único sinal: cada bloco tem a sua forma, e correto e incorreto têm marca e texto. Cada bloco do celular e do editor tem um nome para leitores de tela com a posição atual ("Amazonas, posição 2 de 4"), e mover um bloco anuncia a nova posição. | constituição, artigos VIII e IX |

## Critérios de aceite

### Editor

#### CA-01 — Seletor com Puzzle

- **Dado** um quiz aberto no editor
- **Quando** o criador aciona "Adicionar"
- **Então** o grupo "Testar conhecimento" mostra "Quiz", "Verdadeiro ou falso", "Resposta curta", "Controle deslizante" e "Puzzle"
- **E** passar o mouse sobre "Puzzle" mostra a prévia com "Peça que os participantes coloquem as respostas na ordem certa."

#### CA-02 — Pergunta nova

- **Dado** o seletor aberto
- **Quando** o criador escolhe "Puzzle"
- **Então** a nova pergunta aparece como "N Puzzle", com os campos de "Adicionar resposta 1" a "Adicionar resposta 4 (opcional)", brancos, com o triângulo, o losango, o círculo e o quadrado à esquerda
- **E** com 1 minuto, pontos "Padrão" e o aviso "Adicione no mínimo 3 respostas na ordem correta. Elas serão embaralhadas automaticamente durante o jogo."
- **E** o painel não mostra "Opções de resposta"

#### CA-03 — Preencher

- **Dado** uma pergunta de Puzzle nova
- **Quando** o criador escreve "Nilo" no primeiro campo e "A" no segundo
- **Então** o primeiro campo fica vermelho e o segundo azul, e o segundo mostra que ainda cabem 74 caracteres
- **E** nenhum campo aceita um 76º caractere

#### CA-04 — Arrastar para mudar a ordem certa

- **Dado** os campos "Nilo", "Amazonas", "Yangtzé" e "Mississipi"
- **Quando** o criador arrasta "Yangtzé" para o primeiro lugar
- **Então** a ordem fica "Yangtzé", "Nilo", "Amazonas", "Mississipi", com "Yangtzé" vermelho, "Nilo" azul, "Amazonas" amarelo e "Mississipi" verde
- **E** ao recarregar, a ordem continua essa

#### CA-05 — Mudar a ordem pelo teclado

- **Dado** os campos do CA-04
- **Quando** o criador põe o foco na alça de "Mississipi" e o move uma posição para cima pelo teclado
- **Então** "Mississipi" fica no terceiro lugar e "Yangtzé" no quarto

#### CA-06 — Mínimo de 3 respostas

- **Dado** uma pergunta de Puzzle com enunciado, "Nilo" e "Amazonas"
- **Quando** o criador olha a lista
- **Então** o item tem o alerta "Adicione no mínimo 3 respostas"
- **Quando** ele escreve "Yangtzé" no quarto campo, deixando o terceiro vazio
- **Então** o alerta some, e a ordem certa é "Nilo", "Amazonas", "Yangtzé"

#### CA-07 — Tempos do Puzzle

- **Dado** uma pergunta de Puzzle
- **Quando** o criador abre "Limite de tempo"
- **Então** as opções são 20 segundos, 30 segundos, 45 segundos, 1 minuto, 1 minuto 30 segundos, 2 minutos, 3 minutos e 4 minutos

#### CA-08 — Aplicar 10 s a todas

- **Dado** um quiz com uma pergunta Quiz e um Puzzle de 1 minuto
- **Quando** o criador escolhe 10 s na pergunta Quiz e aciona "Aplicar a todas as perguntas"
- **Então** a pergunta Quiz fica com 10 s e o Puzzle com 20 s

#### CA-09 — Trocar de tipo e voltar

- **Dado** uma pergunta Quiz em 10 s, com alternativas escritas
- **Quando** o criador troca para "Puzzle"
- **Então** a pergunta tem os quatro campos vazios, o mesmo enunciado e 20 s
- **Quando** ele escreve "Nilo", troca para Quiz e volta para Puzzle, sem recarregar
- **Então** as alternativas voltaram no Quiz, e "Nilo" voltou no Puzzle

#### CA-10 — Duplicar

- **Dado** um Puzzle com "Nilo", "Amazonas" e "Yangtzé"
- **Quando** o criador o duplica
- **Então** a cópia tem as mesmas três respostas, na mesma ordem, e mudar a cópia não muda a original

### Embaralhar e corrigir

#### CA-11 — Nunca sai na ordem certa

- **Dado** um Puzzle de 3 respostas diferentes
- **Quando** se começam muitas partidas com ele
- **Então** nenhuma delas começa a pergunta com as respostas na ordem certa

#### CA-12 — Respostas repetidas

- **Dado** um Puzzle com "1", "1" e "2", nessa ordem
- **Quando** a partida sorteia a ordem
- **Então** ela é "1", "2", "1" ou "2", "1", "1"
- **E** um jogador que envia os dois "1" nas primeiras posições, em qualquer das duas ordens, acerta

#### CA-13 — Tudo ou nada

- **Dado** um Puzzle com a ordem certa "Nilo", "Amazonas", "Yangtzé", "Mississipi"
- **Quando** um jogador envia "Nilo", "Amazonas", "Mississipi", "Yangtzé"
- **Então** a resposta é incorreta e rende 0 pontos
- **Quando** outro envia a ordem certa com 58 dos 60 s restantes
- **Então** a resposta é correta e rende os pontos da fórmula de velocidade

### Partida ao vivo

#### CA-14 — A ordem certa não vaza

- **Dado** uma partida com "Mostrar perguntas nos dispositivos" ligado, na fase de respostas de um Puzzle
- **Quando** se olha tudo o que o celular de um jogador recebeu até ali
- **Então** a ordem certa não está nos dados, só a ordem sorteada

#### CA-15 — Mesma ordem no anfitrião e no celular

- **Dado** a fase de respostas de um Puzzle, com a ordem sorteada "Yangtzé", "Mississipi", "Nilo", "Amazonas"
- **Quando** o anfitrião e um jogador olham as suas telas
- **Então** o anfitrião vê as quatro respostas nessa ordem, com o triângulo vermelho em "Yangtzé", o losango azul em "Mississipi", o círculo amarelo em "Nilo" e o quadrado verde em "Amazonas"
- **E** o celular vê os blocos na mesma ordem, com as mesmas formas e cores, "Arraste os blocos para os organizar na ordem certa." e "Enviar" habilitado

#### CA-16 — Sem as perguntas nos dispositivos

- **Dado** a opção "Mostrar perguntas nos dispositivos" desligada
- **Quando** começa a fase de respostas de um Puzzle
- **Então** os blocos do celular mostram só a forma e a cor, sem texto, sem enunciado e sem imagem

#### CA-17 — Arrastar e enviar

- **Dado** o celular do CA-15
- **Quando** o jogador arrasta "Nilo" para o primeiro lugar
- **Então** os blocos ficam "Nilo", "Yangtzé", "Mississipi", "Amazonas", e cada um mantém a sua forma e a sua cor
- **Quando** ele aciona "Enviar"
- **Então** vê a tela de espera e não pode mudar a resposta

#### CA-18 — Mexeu e não enviou

- **Dado** um jogador que mudou a ordem dos blocos e não enviou
- **Quando** o tempo acaba
- **Então** ele vê "Tempo esgotado" na revelação e fica sem resposta

#### CA-19 — Revelação

- **Dado** a ordem certa "Nilo", "Amazonas", "Yangtzé", "Mississipi", a ordem sorteada do CA-15, 3 jogadores que acertaram, 2 que erraram e 1 que não respondeu
- **Quando** a revelação aparece
- **Então** o anfitrião vê "Nilo" (círculo amarelo), "Amazonas" (quadrado verde), "Yangtzé" (triângulo vermelho) e "Mississipi" (losango azul), nessa ordem, cada um com ✓
- **E** a barra verde mostra 3 e a vermelha 2
- **E** os celulares mostram "Correto" com os pontos, "Incorreto" ou "Tempo esgotado", sem a ordem certa

#### CA-20 — Mostrar mídia

- **Dado** a revelação de um Puzzle com imagem
- **Quando** o anfitrião aciona "Mostrar mídia"
- **Então** a imagem aparece no lugar da revelação, e "Ocultar mídia" volta a ela

### Atribuição e relatório

#### CA-21 — Puzzle na atribuição

- **Dado** uma atribuição com um Puzzle e dois participantes
- **Quando** cada um abre a pergunta
- **Então** cada um vê os blocos com o texto, numa ordem sorteada que não é a certa
- **Quando** um deles põe os blocos na ordem certa e envia
- **Então** o resultado mostra "Correto", a ordem que ele enviou, os pontos e "A ordem certa é:" com as respostas

#### CA-22 — Relatório

- **Dado** a partida do CA-19, depois do pódio, em que os 2 jogadores que erraram enviaram a mesma ordem
- **Quando** o criador abre o detalhe da pergunta
- **Então** vê a ordem certa, a ordem certa com 3 e a ✓, e a ordem errada com 2 e a ✗, e 50% de acertos (3 dos 6 jogadores, contando quem não respondeu)
- **E** o detalhe de um dos jogadores que erraram mostra a ordem que ele enviou, como incorreta

## Experiência (telas e estados)

- **Seletor de tipo**: o cartão "Puzzle", com o ícone de um celular com blocos coloridos, entra depois de "Controle deslizante". A prévia mostra o exemplo com uma imagem à esquerda e os quatro blocos à direita, um deles deslocado como se estivesse sendo arrastado.
- **Centro do editor**: abaixo do enunciado, a área de mídia à esquerda e os quatro campos empilhados à direita. Cada campo é uma faixa larga: à esquerda, um quadrado com a forma da posição; à direita, a alça ≡. O texto fica no próprio campo, branco quando vazio e na cor da posição quando preenchido, com o contador de caracteres no canto enquanto é editado. Com a imagem de fundo, os campos ocupam o centro. O aviso das 3 respostas fica embaixo, num quadro branco. No celular, a mídia vai para cima e os campos ocupam a largura.
- **Arrastar no editor**: o bloco pego acompanha o ponteiro, um pouco deslocado para o lado e acima dos outros, e os outros abrem espaço com uma transição curta. As formas da coluna da esquerda não se movem.
- **Painel de propriedades**: Tipo de pergunta, Limite de tempo (de 20 s a 4 min, com "Aplicar a todas as perguntas") e Pontos.
- **Lista**: "N Puzzle", o tempo, a miniatura da imagem e quatro barras empilhadas à direita.
- **Celular, fase de respostas**: no alto, a imagem e o enunciado (com as perguntas nos dispositivos ligado); abaixo, o aviso "Arraste os blocos…", os blocos com a forma à esquerda, o texto e a alça ≡ à direita, e "Enviar" centralizado; embaixo, a barra do tempo. O bloco que o jogador arrasta sobe um pouco e ganha sombra; os outros abrem espaço.
- **Anfitrião, fase de respostas**: o enunciado no alto, o tempo à esquerda, a imagem ao centro, as respostas empilhadas à direita, com a forma e o texto, e o total de respostas na ponta. Com a imagem de fundo, as respostas ficam no centro.
- **Anfitrião, revelação**: as respostas na ordem certa à direita, cada uma com a forma e a cor da partida e um ✓ na ponta; à esquerda, as barras verde (acertos) e vermelha (erros), com a contagem e a marca no pé; "Mostrar mídia" embaixo das barras quando há imagem. As respostas deslizam da ordem sorteada para a ordem certa; com movimento reduzido, aparecem direto na ordem certa.
- **Estados**: enviar mostra a tela de espera de sempre. A falta de conexão segue a spec 013.

## Divergências intencionais do Kahoot

- **A ordem sorteada nunca é uma ordem certa** (RN-14). O Kahoot não documenta esse caso. Com 3 respostas, 1 sorteio em 6 sairia certo, e quem só tocasse em Enviar acertaria.
- **Tempo ajustado para 20 s** ao aplicar a todas ou trocar de tipo (RN-11), como na Resposta curta: o comportamento do Kahoot não está documentado.
- **Arrastar sem ponteiro** (RN-05, RN-21): os blocos também se movem pelo teclado e por leitores de tela. O Kahoot só mostra o arrastar.
- **Sorteio por participante na atribuição** (RN-28): o Kahoot não documenta. Como ali cada um joga com os textos à vista, não há tela do anfitrião para seguir.

## Fora de escopo

- **Imagens nas respostas** (o ícone de imagem em cada campo do Kahoot): adiado, como nas alternativas do Quiz.
- Formatação no texto das respostas e do enunciado (negrito, itálico, subscrito, sobrescrito, símbolos e fórmulas), que aparece na barra do Kahoot.
- Vídeo na pergunta e texto para leitura em voz alta.
- Meio acerto ou pontos por posição certa: o Puzzle é tudo ou nada.
- O assistente de IA ("Crie") criar perguntas de Puzzle (spec 027 continua com Quiz e Verdadeiro ou falso).
- Os tipos de "Coletar opiniões" (roadmap 017), cada um com a sua spec.

## Perguntas em aberto

- [ ] **Revelação com animação** — adotado que as respostas deslizam da ordem sorteada para a certa. A captura mostra só o fim; revisar se aparecer o vídeo.
- [ ] **Capturas de uma partida real** — parte da partida é de uma demonstração do Kahoot e parte da pré-visualização do editor. Revisar a spec quando houver capturas de uma partida com pessoas, em especial a do celular na revelação e a do relatório.

## Changelog

- 2026-10-22 — spec criada a partir das capturas do Kahoot e do artigo de ajuda sobre os tipos de pergunta. Decisões do usuário: a ordem sorteada nunca é uma ordem certa (RN-14), e as respostas não passam entre Quiz e Puzzle na troca de tipo (RN-02). Decisões tomadas sem consulta prévia: RN-07 (texto), RN-08, RN-11, RN-26 (quem não respondeu), RN-28 (sorteio por participante), RN-29, RN-31 e a animação da revelação.
- 2026-10-22 — implementada (tarefas T01 a T23). Sem mudança de regra. Detalhes que a implementação decidiu: o teclado move um bloco com ↑ e ↓ na alça, uma posição por vez, e anuncia a nova posição (RN-05, RN-21, RN-32); a resposta de 76 caracteres usa o erro das alternativas do Quiz (`QUIZ.CHOICE_TEXT_TOO_LONG`); no relatório, a pergunta de Puzzle não lista as alternativas, só a ordem certa e as ordens enviadas (RN-31). Os ADRs 0008 e 0009 foram atualizados.
