---
id: "031"
title: Resposta curta
status: done # draft | approved | planned | in-progress | done
contexts: [quiz, game, reports]
created: 2026-10-21
---

# 031 — Resposta curta

## Contexto e problema

O Quizio tem dois tipos de pergunta, Quiz e Verdadeiro ou falso (specs 004 e 005). Nos dois o jogador escolhe entre alternativas, e quem não sabe pode chutar. O Kahoot tem outros onze tipos, todos pagos no plano gratuito (kahoot-reference §13). Pela constituição (artigo VI), o Quizio terá todos.

Esta é a primeira spec da série de novos tipos, entregues **um por vez**, cada um com o editor, a partida ao vivo, a atribuição e o relatório. A **Resposta curta (`typeAnswer`)** abre a série porque é a mais próxima do que já existe: pontua como o Quiz, pela velocidade, e o que muda é a resposta, que o jogador **digita** em vez de escolher. Ela testa a lembrança sem pistas.

As regras vêm da referência (§4.1.3), do artigo de ajuda do Kahoot sobre os tipos de pergunta e das capturas enviadas pelo usuário em 2026-10-21: o seletor, o editor com respostas aceitas, a partida (anfitrião e celular), a revelação e a revisão das respostas pelo anfitrião. Parte das capturas da partida vem de demonstrações do Kahoot, porque o tipo é pago. Quando houver capturas de uma partida real, a spec é revista.

## Objetivo

O criador monta uma pergunta de Resposta curta com até quatro respostas aceitas. Na partida, os jogadores digitam a resposta no celular, e o servidor a compara sem levar em conta maiúsculas, acentos, espaços extras e pontuação. Na revelação, o anfitrião vê as respostas corretas e pode aceitar como certa uma resposta que o jogo considerou errada, e os pontos são refeitos na hora. A atribuição e o relatório tratam o tipo como tratam o Quiz.

## Personas

- **Criador (`Creator`)** — monta o quiz no editor (kahoot-reference §1).
- **Anfitrião (`Host`)** — conduz a partida ao vivo e revisa as respostas digitadas.
- **Jogador (`Player`)** — digita a resposta no celular, ao vivo ou numa atribuição.

## Histórias de usuário

- **HU-01** — Como criador, quero uma pergunta em que o jogador digita a resposta, para testar se ele lembra sem ver alternativas.
- **HU-02** — Como criador, quero aceitar mais de uma forma de escrever a resposta, para não punir quem escreveu "Colosseum" em vez de "The Colosseum".
- **HU-03** — Como jogador, quero digitar a resposta no celular e enviar, sem perder pontos por maiúsculas, acentos ou pontuação.
- **HU-04** — Como anfitrião, quero ver na revelação quais eram as respostas corretas e quantos acertaram cada uma.
- **HU-05** — Como anfitrião, quero aceitar uma resposta que o jogo considerou errada (um erro de digitação, um sinônimo), para dar os pontos a quem mereceu.
- **HU-06** — Como criador, quero ver no relatório o que cada um digitou.

## Regras de negócio

### Seletor e tipo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | **Resposta curta (`typeAnswer`)** passa a ser um tipo de pergunta, no grupo **"Testar conhecimento"** do seletor de tipo, depois de "Verdadeiro ou falso", com o ícone e o nome do Kahoot. Passar o mouse sobre o cartão mostra a prévia do tipo: o exemplo "Qual é o rio mais extenso do mundo?" com uma resposta digitada e a frase **"Peça aos participantes para digitarem uma resposta curta."**. A prévia vale para os cartões já existentes, cada um com o seu exemplo e a sua frase. | kahoot-reference §4.1.3 · captura do Kahoot (2026-10-21) |
| RN-02 | O tipo aparece também em **"Tipo de pergunta"** no painel de propriedades, e a troca de tipo da spec 005 (RN-14 a RN-21) vale para ele: mantém o enunciado, os pontos, a imagem e a posição, e o editor lembra, até sair, as respostas que a pergunta tinha em cada tipo. | spec 005 · decisão do produto (2026-10-21) |

### Pergunta no editor

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-03 | Uma pergunta de Resposta curta tem **de 1 a 4 respostas aceitas (`acceptedAnswers`)**, cada uma com **até 20 caracteres**, contados como os demais limites (caracteres percebidos). A primeira é a **resposta principal**; as outras são as **"Outras respostas aceitas"**. | kahoot-reference §4.1.3 · artigo de ajuda do Kahoot |
| RN-04 | A pergunta nasce com **um campo de resposta vazio** (o principal) e o botão **"Adicionar outras respostas aceitas"**. Acionado, ele mostra o título **"Outras respostas aceitas"** e um campo novo; **"Adicionar mais"** acrescenta outro campo, um por vez, até completar 4 (então some). Esvaziar e sair de um campo extra o remove; o principal fica sempre. | captura do Kahoot (2026-10-21) |
| RN-05 | Os campos têm cores fixas por posição: **azul** (principal), **amarelo**, **verde** e **turquesa**. Cada campo mostra, enquanto é editado, **quantos caracteres ainda cabem** (de 20 para baixo). Não há marca de correta: toda resposta aceita é correta. | captura do Kahoot (2026-10-21) |
| RN-06 | O **limite de tempo** da Resposta curta vai de **20 segundos a 4 minutos** (20, 30, 45, 60, 90, 120, 180 ou 240 s), e a pergunta nasce com **30 segundos**. Os **pontos** são Padrão, Pontos em dobro ou Sem pontos, como no Quiz. O painel não tem "Opções de resposta". | kahoot-reference §4.1.3, §5.1 · captura do Kahoot (2026-10-21), padrão de 30 s |
| RN-07 | **"Aplicar a todas as perguntas"** com um tempo que a Resposta curta não aceita (5, 10 ou 15 s) deixa as perguntas de Resposta curta com **20 segundos**, o menor tempo delas. Da mesma forma, trocar para Resposta curta uma pergunta com menos de 20 s a deixa com 20 s. | decisão do produto (2026-10-21) |
| RN-08 | A imagem da pergunta (spec 007) funciona como nos outros tipos: ao centro ou de fundo, com recorte e texto alternativo. | spec 007 · captura do Kahoot (2026-10-21) |
| RN-09 | Uma pergunta de Resposta curta está **incompleta** quando (a) não tem enunciado, ou (b) não tem **nenhuma resposta aceita que valha**: todas estão vazias ou ficam vazias depois da normalização (RN-13), como "?!". O motivo (b) aparece no alerta da lista como **"Resposta aceita ausente"**, e junto ao campo principal o balão **"Adicione uma resposta aceita"**, com a regra de quando avisar da spec 004 (RN-16a). Como nos outros tipos, a pergunta continua salva e impede salvar a versão jogável (spec 006). | kahoot-reference §3.6 · spec 004, RN-15, RN-16a · decisão do produto (2026-10-21), textos |
| RN-10 | Respostas aceitas que ficam iguais depois da normalização são permitidas e contam como uma. | decisão do produto (2026-10-21) |
| RN-11 | O item da lista mostra **"N Resposta curta"**, o tempo e, na miniatura, uma barra por resposta aceita. Duplicar a pergunta ou o quiz copia as respostas aceitas (spec 005, RN-21). | spec 003, RN-17 · spec 005, RN-21 · captura do Kahoot (2026-10-21) |
| RN-12 | Indo para Resposta curta, a pergunta perde as alternativas do tipo anterior e ganha um campo principal vazio; indo para outro tipo, perde as respostas aceitas. As respostas não são convertidas de um tipo para o outro (spec 005, fora de escopo). | spec 005, RN-16 |

### Comparação da resposta

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-13 | A resposta digitada e cada resposta aceita passam pela mesma **normalização (`normalizeTypedAnswer`)** antes de comparar: (a) maiúsculas e minúsculas são iguais; (b) **acentos e cedilha são ignorados** ("Sao Paulo" = "São Paulo"); (c) estes sinais são ignorados: `` ~ ` ! @ # $ % ^ & * ( ) { } [ ] ; : " ' < , . > ? / \ | - _ + = ``; (d) espaços seguidos contam como um, e os do começo e do fim não contam; (e) **emojis só contam se não houver outro texto**: numa resposta com letras ou números, eles são ignorados. | kahoot-reference §4.1.3 · artigo de ajuda do Kahoot · acentos: decisão do usuário (2026-10-21) |
| RN-14 | A resposta é **correta** quando, normalizada, é **igual** a alguma resposta aceita normalizada; senão é **incorreta**. Não há "parcialmente correta": uma letra a mais ou a menos é errada, e só o anfitrião pode aceitá-la (RN-27). | kahoot-reference §4.1.3 |
| RN-15 | A comparação é feita **no servidor**, quando a resposta chega. As respostas aceitas **nunca chegam ao celular antes da revelação**, com "Mostrar perguntas nos dispositivos" ligado ou não. | constituição, artigo V · spec 009, RN-21 |
| RN-16 | Os pontos de uma resposta correta seguem a fórmula de velocidade da spec 010 (RN-01, RN-02, RN-05), com o limite de tempo da pergunta: 1000 ou 2000 pontos possíveis, 0 em "Sem pontos". A resposta conta para a sequência de acertos como no Quiz. | kahoot-reference §4.1.3 · spec 010 |

### No celular do jogador

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-17 | Na fase de respostas, o celular mostra um **campo de texto** azul, "Digite sua resposta aqui", com o contador do que ainda cabe (de 20 para baixo), e o botão **"Enviar"**, desabilitado enquanto o campo está vazio ou só com espaços. Enter também envia. O campo não aceita mais de 20 caracteres. | kahoot-reference §4.1.3 · captura do Kahoot (2026-10-21) |
| RN-18 | O campo aparece com **"Mostrar perguntas nos dispositivos"** ligado ou desligado, porque não há como responder sem ele. Ligado, o celular mostra também a imagem e o enunciado, como nos outros tipos (spec 012, RN-18b); desligado, só o campo e o botão. | spec 012, RN-18 · captura do Kahoot (2026-10-21) · decisão do produto (2026-10-21) |
| RN-19 | Enviada a resposta, valem as regras de qualquer resposta: uma por pergunta, sem troca, dentro do prazo (spec 009, RN-17, RN-18), e a mesma tela de espera. Se o tempo acaba com texto digitado e não enviado, o jogador fica **sem resposta** (como a múltipla escolha marcada e não enviada, spec 012, RN-30). A resposta sem conexão mostra "Sua resposta não foi enviada." e devolve o campo com o texto (spec 013). | spec 009 · spec 012, RN-30 · spec 013 |
| RN-20 | Na revelação, o celular mostra o resultado como nos outros tipos: **"Correto"** com a sequência e os pontos, **"Incorreto"** ou **"Tempo esgotado"** (specs 009 e 010). Ele **não mostra as respostas aceitas**; elas estão na tela do anfitrião. | spec 009, RN-25, RN-26 · spec 010, RN-12 · captura do Kahoot (2026-10-21) |

### Na tela do anfitrião

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-21 | Na **abertura** da pergunta, o anfitrião vê o ícone e o nome **"Resposta curta"**, como nos outros tipos (spec 009, RN-07). | spec 009, RN-07 · captura do Kahoot (2026-10-21) |
| RN-22 | Na **fase de respostas**, o anfitrião vê o enunciado, a imagem, o tempo restante e o total de respostas, como nos outros tipos, e, no lugar das alternativas, a faixa azul **"Jogadores, digitem a resposta!"**. | captura do Kahoot (2026-10-21) |
| RN-23 | A **revelação** começa com uma animação: as respostas enviadas aparecem espalhadas na tela, uma etiqueta colorida por resposta (as corretas e as erradas, cada forma normalizada uma vez); em seguida **as erradas saem**, e as corretas se reúnem sob o título **"As respostas corretas são:"**, cada uma com **quantos jogadores** a enviaram e a marca de certo. São corretas as respostas aceitas do editor (mesmo com 0) e as que o anfitrião aceitou. | captura do Kahoot (2026-10-21, segunda leva) · decisão do usuário (2026-10-21) |
| RN-23a | Na animação entram no máximo **12 etiquetas**: todas as corretas e, entre as erradas, as mais enviadas. Recarregar a tela ou chegar depois da animação mostra direto as corretas, sem repeti-la. | decisão do produto (2026-10-21) |
| RN-24 | Na contagem, cada resposta enviada entra na etiqueta da resposta aceita a que é igual depois da normalização: "colosseum" e "Colosseum!" contam juntas em "Colosseum". As etiquetas mostram o texto como o criador o escreveu. | decisão do produto (2026-10-21) |
| RN-25 | Na revelação, a imagem da pergunta fica escondida para dar lugar às respostas, e o botão **"Mostrar mídia"** a mostra (e "Ocultar mídia" volta às respostas). | captura do Kahoot (2026-10-21) |

### Revisar respostas (partida ao vivo)

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-26 | Na revelação de uma pergunta de Resposta curta, o anfitrião tem o botão **"Revisar respostas"**, abaixo de Avançar. Ele existe **só enquanto aquela revelação está na tela**: depois de avançar, a correção daquela pergunta não muda mais. Vale também na última pergunta, antes do pódio. | artigo de ajuda do Kahoot ("accept other submitted answers") · captura do Kahoot (2026-10-21) · decisão do usuário (2026-10-21) |
| RN-27 | A revisão mostra o aviso **"Clique nas respostas para marcá-las como corretas ou incorretas"** e duas faixas. Em **"Respostas corretas"** ficam as respostas aceitas do editor e as que o anfitrião aceitou. Em **"Respostas incorretas"** ficam as demais respostas enviadas, **todas**, sem o limite da RN-23a; as **parecidas com uma correta (RN-28)** vêm primeiro, num quadro **"Parecidas com as respostas corretas"**, quando há alguma. Cada resposta aparece uma vez por forma normalizada, com o texto como o primeiro jogador a escreveu, e com quantos a enviaram. | captura do Kahoot (2026-10-21) |
| RN-28 | Uma resposta errada é **parecida** com uma correta quando, normalizadas, a diferença entre elas é de **até 2 letras** (uma letra a mais, a menos ou trocada conta 1), e a resposta tem ao menos 4 caracteres. | captura do Kahoot (2026-10-21) · decisão do produto (2026-10-21), critério |
| RN-29 | Clicar numa resposta enviada a **marca** (contorno e ✓) e a passa para a outra faixa; o lugar que ela ocupava fica vazio, e clicar de novo a devolve. As **respostas aceitas do editor não mudam de faixa**: continuam corretas. **"Enviar"** fica desabilitado até haver uma mudança e aplica todas de uma vez; **"Cancelar"** fecha sem mudar nada e volta à revelação. | captura do Kahoot (2026-10-21, segunda leva) · decisão do produto (2026-10-21) |
| RN-30 | Ao enviar a revisão, a correção de **cada jogador** que enviou aquela resposta muda, e os **pontos são refeitos** com a fórmula de velocidade e o tempo de resposta que o servidor mediu quando ela chegou (RN-16). Marcada como incorreta, rende 0. Totais, sequências, posições e o placar seguem a correção nova. Altera a spec 010, RN-07, que dizia que os pontos não mudam depois. | artigo de ajuda do Kahoot ("so that they are awarded points") · decisão do produto (2026-10-21) |
| RN-30a | **Enviar a revisão avança a partida**: vai direto ao **placar** (ou, na última pergunta, ao **pódio**), já com os pontos refeitos, sem voltar à revelação nem repetir a animação. Como avançou, a revisão daquela pergunta não pode ser reaberta. | decisão do usuário (2026-10-21) |
| RN-31 | Durante o placar, o celular de quem teve a resposta revisada mostra **"Sua resposta foi marcada como correta"**, com a sequência e os pontos, ou **"Sua resposta foi marcada como incorreta"**, no lugar do resultado anterior. | captura do Kahoot (2026-10-21) · "incorreta": decisão do produto (2026-10-21) |
| RN-32 | Com a **reprodução automática** ligada (spec 014), a revelação conta os 5 s de sempre, e o anfitrião pode abrir a revisão nesse tempo: **a contagem para enquanto a revisão está aberta**. Cancelar volta à revelação com a contagem recomeçando dos 5 s; Enviar avança (RN-30a). Sem abrir a revisão, a partida segue sozinha. | spec 014 · decisão do usuário (2026-10-21) |
| RN-33 | Só o anfitrião da partida revisa, e só respostas que chegaram: quem não respondeu continua "sem resposta". | constituição, artigo V |

### Atribuição e relatório

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-34 | Numa **atribuição** (spec 030), a pergunta aparece inteira no aparelho, com o campo e o "Enviar" da RN-17, e o Timer da pergunta funciona como nos outros tipos (sem ele, a resposta correta vale os pontos cheios). "Ordem aleatória de respostas" não se aplica. | spec 030, RN-08 a RN-10 |
| RN-35 | No **resultado** da atribuição, o participante vê **"Correto"** ou **"Incorreto"**, **o que ele digitou**, com a marca de certo ou errado, e **"As respostas corretas são:"** com as respostas aceitas. Não há revisão na atribuição. | spec 030, RN-11 · decisão do produto (2026-10-21) |
| RN-36 | No **relatório**, a pergunta aparece com o tipo "Resposta curta", e as contas são as de sempre: correta é a resposta marcada como correta pelo servidor ou pela revisão do anfitrião. | spec 015, RN-11 |
| RN-37 | No **detalhe da pergunta**, no lugar das alternativas, o relatório lista **as respostas enviadas**, agrupadas pela forma normalizada, com o texto, quantos a enviaram e a marca de certo ou errado: as corretas primeiro, incluindo as respostas aceitas que ninguém enviou (com 0). No **detalhe do participante**, a linha da pergunta mostra o que ele digitou. | spec 015, RN-42, RN-44 · kahoot-reference §4.1.3 (relatório com as respostas erradas) · decisão do produto (2026-10-21) |

### Textos e acessibilidade

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-38 | Todos os textos são em português do Brasil. As cores das respostas aceitas e das etiquetas nunca são o único sinal: correta e incorreta têm marca e texto, e o campo do celular tem rótulo para leitores de tela. | constituição, artigos VIII e IX |

## Critérios de aceite

### Editor

#### CA-01 — Seletor com Resposta curta

- **Dado** um quiz aberto no editor
- **Quando** o criador aciona "Adicionar"
- **Então** o grupo "Testar conhecimento" mostra "Quiz", "Verdadeiro ou falso" e "Resposta curta"
- **E** passar o mouse sobre "Resposta curta" mostra a prévia com "Peça aos participantes para digitarem uma resposta curta."

#### CA-02 — Pergunta nova

- **Dado** o seletor aberto
- **Quando** o criador escolhe "Resposta curta"
- **Então** a nova pergunta aparece como "N Resposta curta", com um campo azul vazio, "Adicionar outras respostas aceitas", 30 segundos e pontos "Padrão"
- **E** o painel não mostra "Opções de resposta"

#### CA-03 — Outras respostas aceitas

- **Dado** uma pergunta de Resposta curta com "Pedro" no campo principal
- **Quando** o criador aciona "Adicionar outras respostas aceitas", escreve "Jesus", aciona "Adicionar mais" duas vezes e escreve "Exemplo 3" e "Exemplo 4"
- **Então** aparecem "Outras respostas aceitas" e os campos amarelo, verde e turquesa com esses textos, e "Adicionar mais" some
- **E** ao recarregar, as quatro respostas continuam lá, na mesma ordem

#### CA-04 — Limite de 20 caracteres

- **Dado** um campo de resposta aceita com "Jesus"
- **Quando** o criador olha o campo
- **Então** vê que ainda cabem 15 caracteres
- **E** não consegue escrever um 21º caractere

#### CA-05 — Campo extra vazio some

- **Dado** uma pergunta com "Pedro" e o campo amarelo com "Jesus"
- **Quando** o criador apaga "Jesus" e sai do campo
- **Então** o campo amarelo deixa de existir, e o principal continua

#### CA-06 — Pergunta incompleta

- **Dado** uma pergunta de Resposta curta com enunciado e o campo principal vazio
- **Quando** o criador olha a lista
- **Então** o item tem o alerta "Resposta aceita ausente"
- **Quando** ele escreve "?!" no campo principal
- **Então** o alerta continua
- **Quando** ele troca para "Pedro"
- **Então** o alerta some

#### CA-07 — Tempos da Resposta curta

- **Dado** uma pergunta de Resposta curta
- **Quando** o criador abre "Limite de tempo"
- **Então** as opções começam em 20 segundos e vão até 4 minutos

#### CA-08 — Aplicar 10 s a todas

- **Dado** um quiz com uma pergunta Quiz e uma Resposta curta em 30 s
- **Quando** o criador escolhe 10 s na pergunta Quiz e aciona "Aplicar a todas as perguntas"
- **Então** a pergunta Quiz fica com 10 s e a Resposta curta com 20 s

#### CA-09 — Trocar de tipo e voltar

- **Dado** uma pergunta Quiz em 10 s, com alternativas escritas
- **Quando** o criador troca para "Resposta curta"
- **Então** a pergunta tem um campo principal vazio, o mesmo enunciado e 20 s
- **Quando** ele escreve "Pedro", troca para Quiz e de volta para Resposta curta, sem recarregar
- **Então** as alternativas do Quiz voltaram no Quiz, e "Pedro" volta na Resposta curta

#### CA-10 — Duplicar

- **Dado** uma pergunta de Resposta curta com "Pedro" e "Jesus"
- **Quando** o criador a duplica
- **Então** a cópia tem as mesmas duas respostas aceitas, e alterar a cópia não muda a original

### Comparação

#### CA-11 — Normalização

- **Dado** uma pergunta com a resposta aceita "São Paulo"
- **Quando** jogadores enviam "sao paulo", "  SÃO   PAULO! ", "São-Paulo" e "São Paulo 🏙️"
- **Então** as quatro respostas são corretas
- **E** "São Paulos" é incorreta

#### CA-12 — Só emojis

- **Dado** uma pergunta com a resposta aceita "🍕"
- **Quando** um jogador envia "🍕" e outro envia "pizza"
- **Então** a primeira é correta e a segunda incorreta

#### CA-13 — Qualquer resposta aceita vale

- **Dado** uma pergunta com "The Colosseum", "Colosseum" e "Colosseum in Rome"
- **Quando** um jogador envia "colosseum in rome"
- **Então** a resposta é correta e rende pontos pela fórmula de velocidade

### Partida ao vivo

#### CA-14 — Respostas aceitas não vazam

- **Dado** uma partida com "Mostrar perguntas nos dispositivos" ligado, na fase de respostas de uma Resposta curta
- **Quando** se olha tudo o que o celular de um jogador recebeu até ali
- **Então** nenhuma resposta aceita está nos dados

#### CA-15 — Campo e Enviar no celular

- **Dado** um jogador na fase de respostas de uma Resposta curta
- **Quando** ele olha o celular
- **Então** vê "Digite sua resposta aqui", o contador em 20 e "Enviar" desabilitado
- **Quando** ele digita "the coloseum"
- **Então** o contador mostra 8 e "Enviar" fica habilitado
- **Quando** ele aciona "Enviar"
- **Então** vê a tela de espera e não pode mudar a resposta

#### CA-16 — Com as perguntas nos dispositivos desligado

- **Dado** a opção "Mostrar perguntas nos dispositivos" desligada
- **Quando** começa a fase de respostas de uma Resposta curta
- **Então** o celular mostra o campo e "Enviar", sem enunciado nem imagem

#### CA-17 — Digitou e não enviou

- **Dado** um jogador com "Pedro" digitado e não enviado
- **Quando** o tempo acaba
- **Então** ele vê "Tempo esgotado" na revelação e fica sem resposta

#### CA-18 — Tela do anfitrião durante as respostas

- **Dado** a fase de respostas de uma Resposta curta
- **Quando** o anfitrião olha a tela
- **Então** vê o enunciado, a imagem, o tempo, o total de respostas e "Jogadores, digitem a resposta!", sem alternativas

#### CA-19 — Revelação

- **Dado** uma pergunta com "The Colosseum", "Colosseum" e "Colosseum in Rome", e três jogadores que enviaram "colosseum", "COLOSSEUM" e "the coloseum"
- **Quando** a revelação aparece
- **Então** o anfitrião vê primeiro as etiquetas "The Colosseum", "Colosseum", "Colosseum in Rome" e "the coloseum" espalhadas
- **E** em seguida "the coloseum" sai, e ficam "As respostas corretas são:" com "The Colosseum" (0), "Colosseum" (2) e "Colosseum in Rome" (0)
- **E** os dois primeiros jogadores veem "Correto" com os pontos, e o terceiro "Incorreto"
- **E** os celulares não mostram as respostas aceitas

#### CA-19a — Muitas respostas diferentes

- **Dado** uma pergunta com uma resposta aceita e 30 respostas erradas diferentes, a mais enviada por 5 jogadores
- **Quando** a revelação aparece
- **Então** a animação mostra 12 etiquetas: a correta e as 11 erradas mais enviadas
- **Quando** o anfitrião recarrega a tela
- **Então** vê direto "As respostas corretas são:", sem a animação

#### CA-20 — Mostrar mídia

- **Dado** a revelação de uma Resposta curta com imagem
- **Quando** o anfitrião aciona "Mostrar mídia"
- **Então** a imagem aparece no lugar das respostas, e "Ocultar mídia" volta a elas

### Revisar respostas

#### CA-21 — Abrir a revisão

- **Dado** a revelação do CA-19
- **Quando** o anfitrião aciona "Revisar respostas"
- **Então** vê as três respostas aceitas em "Respostas corretas", e "the coloseum" (1) em "Respostas incorretas", dentro de "Parecidas com as respostas corretas"
- **E** "Enviar" está desabilitado

#### CA-22 — Aceitar uma resposta

- **Dado** a revisão do CA-21
- **Quando** o anfitrião clica em "the coloseum"
- **Então** ela ganha o contorno e o ✓ e passa para "Respostas corretas", deixando o lugar vazio, e "Enviar" fica habilitado
- **Quando** ele aciona "Enviar"
- **Então** a tela vai direto ao placar, sem voltar à revelação, e o total do terceiro jogador inclui os pontos que a fórmula de velocidade dá ao tempo em que a resposta chegou
- **E** o celular dele mostra "Sua resposta foi marcada como correta", com a sequência e esses pontos

#### CA-23 — Desfazer a marcação

- **Dado** a revisão aberta, sem nada mudado
- **Quando** o anfitrião clica em "Pedra" (vai para as corretas) e clica de novo (volta para as incorretas)
- **Então** "Pedra" volta ao lugar de antes, e "Enviar" volta a ficar desabilitado

#### CA-23a — Revisão na última pergunta

- **Dado** a revelação da última pergunta, de Resposta curta
- **Quando** o anfitrião aceita uma resposta na revisão e envia
- **Então** a tela vai direto ao pódio, que já conta os pontos refeitos

#### CA-24 — Cancelar

- **Dado** a revisão aberta com uma resposta trocada de faixa
- **Quando** o anfitrião aciona "Cancelar"
- **Então** volta à revelação, e nada muda nas respostas, nos pontos e nos celulares

#### CA-25 — Respostas do editor não mudam de faixa

- **Dado** a revisão aberta
- **Quando** o anfitrião clica em "Colosseum"
- **Então** ela continua em "Respostas corretas"

#### CA-26 — Respostas não parecidas

- **Dado** uma pergunta com a resposta aceita "Pedro" e jogadores que enviaram "Pedra" e "Paulo"
- **Quando** o anfitrião abre a revisão
- **Então** "Pedra" está em "Parecidas com as respostas corretas", e "Paulo" está em "Respostas incorretas", fora do quadro

#### CA-27 — Depois de avançar, não revisa mais

- **Dado** a revelação de uma Resposta curta
- **Quando** o anfitrião avança para o placar
- **Então** "Revisar respostas" não está mais disponível, e um pedido de revisão daquela pergunta que chegue ao servidor é recusado

#### CA-28 — Revisão com reprodução automática

- **Dado** a reprodução automática ligada, na revelação de uma Resposta curta
- **Quando** o anfitrião abre a revisão antes dos 5 s e espera mais de 5 s
- **Então** a partida não avança
- **Quando** ele cancela
- **Então** volta à revelação, e a contagem recomeça dos 5 s
- **Quando** ele não abre a revisão
- **Então** a partida avança sozinha ao fim dos 5 s, como nos outros tipos

#### CA-29 — Só o anfitrião revisa

- **Dado** uma partida em andamento
- **Quando** chega ao servidor um pedido de revisão de quem não é o anfitrião
- **Então** o pedido é recusado e nada muda

### Atribuição e relatório

#### CA-30 — Resposta curta na atribuição

- **Dado** uma atribuição com Timer da pergunta ligado e uma Resposta curta com "Pedro"
- **Quando** o participante digita "pedro" e envia
- **Então** o resultado mostra "Correto", o que ele digitou com a marca de certo, os pontos e "As respostas corretas são:" com "Pedro"

#### CA-31 — Relatório

- **Dado** a partida do CA-22, depois do pódio
- **Quando** o criador abre o detalhe da pergunta no relatório
- **Então** vê "Colosseum" (2) e "the coloseum" (1) como corretas, "The Colosseum" e "Colosseum in Rome" com 0, e o percentual de acertos de 100%
- **E** o detalhe do terceiro jogador mostra "the coloseum" como correta

## Experiência (telas e estados)

- **Seletor de tipo**: o cartão "Resposta curta", com o ícone de um celular com um "T" e um teclado, entra depois de "Verdadeiro ou falso". Ao passar o mouse sobre um cartão, aparece ao lado a prévia: um quadro com um exemplo do tipo e, abaixo, o nome e a frase que o explica.
- **Centro do editor**: abaixo do enunciado e da área de mídia, o campo principal, largo e azul, com o texto grande; o contador de caracteres aparece no canto enquanto ele é editado. Abaixo, o botão escuro "Adicionar outras respostas aceitas". Depois dele, o título "Outras respostas aceitas" e os campos extras lado a lado (empilhados no celular), com "Adicionar mais" ao lado do último.
- **Painel de propriedades**: Tipo de pergunta, Limite de tempo (de 20 s a 4 min, com "Aplicar a todas as perguntas") e Pontos.
- **Lista**: "N Resposta curta", o tempo, a miniatura da imagem e uma barra por resposta aceita.
- **Celular, fase de respostas**: o campo azul ocupa a largura, com o contador no canto e "Enviar" logo abaixo; com as perguntas nos dispositivos ligado, a imagem fica no alto e o enunciado acima do campo. O teclado do celular não pode cobrir o campo nem o botão.
- **Anfitrião, fase de respostas**: o enunciado no alto, a imagem ao centro, o tempo à esquerda, as respostas à direita e a faixa "Jogadores, digitem a resposta!" embaixo.
- **Anfitrião, revelação**: as etiquetas coloridas entram espalhadas e levemente inclinadas, as erradas saem e as corretas crescem e se reúnem sob "As respostas corretas são:", cada uma com a contagem e o ✓ num selo no canto; à direita, Avançar e "Revisar respostas"; embaixo, "Mostrar mídia" quando há imagem. Com movimento reduzido, a tela mostra direto as corretas.
- **Revisão**: cobre a revelação com o enunciado, o aviso, a faixa "Respostas corretas" (✓ verde) e a faixa "Respostas incorretas" (✗ vermelho), com o quadro branco "Parecidas com as respostas corretas" quando há alguma. Cada resposta é uma etiqueta pequena com a contagem no canto; a marcada ganha contorno e ✓, e o lugar de onde saiu fica como um retângulo branco vazio. "Enviar" e "Cancelar" no canto superior direito.
- **Estados**: enviar a revisão mostra o botão ocupado; se falhar, a revisão continua aberta com "Não foi possível revisar as respostas." e nada muda. A falta de conexão segue a spec 013.

## Divergências intencionais do Kahoot

- **Acentos são ignorados** na comparação (RN-13 b). O Kahoot só ignora maiúsculas, espaços e pontuação. Em português, digitar no celular sem acento é comum e não deveria custar a pergunta.
- **Revisão para todos** (RN-26). No Kahoot, aceitar outras respostas exige assinatura (conta escolar com EDU).
- **Enviar a revisão vai direto ao placar** (RN-30a). No Kahoot, a tela volta à revelação com as corretas atualizadas e o anfitrião ainda precisa avançar; no Quizio isso poupa um passo.
- **No máximo 12 etiquetas na animação da revelação** (RN-23a): o Kahoot não documenta um limite, e com muitos jogadores a tela ficaria ilegível.
- **Critério de "parecidas"** (RN-28) é nosso: o Kahoot não documenta como agrupa.
- **Tempo ajustado para 20 s** ao aplicar a todas ou trocar de tipo (RN-07): o comportamento do Kahoot não está documentado.

## Fora de escopo

- **Revelação de imagem** (3×3, 5×5, 8×8), que aparece no painel da Resposta curta no Kahoot: vale para outros tipos e fica para uma spec própria (roadmap 022).
- Revisar respostas depois da partida, no relatório, ou numa atribuição.
- O assistente de IA ("Crie") criar perguntas de Resposta curta (spec 027 continua com Quiz e Verdadeiro ou falso).
- Vídeo na pergunta e texto para leitura em voz alta.
- Filtro de palavrões nas respostas digitadas.
- Os outros tipos novos, cada um com a sua spec.

## Perguntas em aberto

- [ ] **Critério de "parecidas"** (RN-28) — adotada a diferença de até 2 letras a partir de 4 caracteres. Revisar depois de usar com respostas reais.
- [ ] **Revisão e reprodução automática** (RN-32) — adotado parar a contagem enquanto a revisão está aberta. O Kahoot não documenta; revisar se aparecer uma captura.
- [ ] **Capturas de uma partida real** — parte das capturas é de demonstrações do Kahoot. Revisar a spec quando houver capturas de uma partida com pessoas.

## Changelog

- 2026-10-21 — spec criada a partir das capturas do Kahoot e do artigo de ajuda sobre os tipos de pergunta. Decisões do usuário: a revisão entra nesta spec (RN-26 a RN-33), a revelação mostra só as corretas (RN-23), acentos são ignorados (RN-13) e a revelação de imagem fica fora. Decisões tomadas sem consulta prévia: RN-07, RN-09 (textos), RN-10, RN-18, RN-24, RN-28, RN-29 (respostas do editor fixas), RN-31 ("incorreta"), RN-32, RN-35 e RN-37.
- 2026-10-21 — revisão com a segunda leva de capturas do Kahoot. A revelação passa a abrir com todas as respostas enviadas, e as erradas saem deixando as corretas (RN-23, no lugar de mostrar só as corretas), com até 12 etiquetas (RN-23a, CA-19a). Na revisão, a resposta marcada ganha contorno e ✓ e deixa o lugar vazio (RN-29). Por decisão do usuário, enviar a revisão vai direto ao placar ou ao pódio, sem repetir a animação (RN-30a, CA-22, CA-23a), e a reprodução automática para enquanto a revisão está aberta (RN-32, CA-28).
- 2026-10-21 — implementada (tarefas T01 a T29). Sem mudança de regra. Dois ajustes de detalhe: os sinais ignorados contam como espaço, para "São-Paulo" valer como "São Paulo" (CA-11); e a posição de uma resposta aceita que não existe é recusada com `QUIZ.ACCEPTED_ANSWER_NOT_FOUND`. A spec 010 (RN-07) e os ADRs 0008 e 0009 foram atualizados.
