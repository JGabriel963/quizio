---
id: "032"
title: Controle deslizante
status: done # draft | approved | planned | in-progress | done
contexts: [quiz, game, reports]
created: 2026-10-21
---

# 032 — Controle deslizante

## Contexto e problema

A série de novos tipos de pergunta começou com a Resposta curta (spec 031). A segunda é o **Controle deslizante (`slider`)**. O jogador não escolhe nem digita: ele **arrasta um marcador numa escala de números** para estimar um valor, como um ano, uma altura ou uma quantidade.

O tipo traz duas coisas que o Quizio ainda não tem:

- **Uma resposta pode estar perto do certo.** A **margem de resposta** define o quão perto basta. Quem acerta o número exato está "Correto"; quem chega perto está **"Quase correto"**.
- **Os pontos dependem principalmente da precisão.** Só uma parte vem da velocidade.

As regras vêm de três fontes:

- a referência (§4.1.4, §5.1, §5.6);
- o artigo de ajuda do Kahoot sobre os tipos de pergunta;
- as capturas enviadas pelo usuário em 2026-10-21: o seletor, o editor com os limites, a margem e a etapa, os casos de erro, e uma demonstração da partida (anfitrião e celular).

Os números da margem e da etapa foram deduzidos das capturas, e todos os exemplos batem com as contas desta spec. Parte da partida vem de uma demonstração do Kahoot, porque o tipo é pago. Quando houver capturas de uma partida real, a spec é revista.

## Objetivo

**No editor**, o criador monta uma pergunta com:

- um mínimo, um máximo e a resposta certa (com decimais e negativos);
- uma unidade opcional;
- uma margem de resposta.

O editor mostra a etapa e a faixa aceita enquanto ele edita.

**Na partida**, cada jogador arrasta o marcador no celular e envia. O servidor classifica a resposta como correta, quase correta ou incorreta e dá pontos pela precisão e pela velocidade. O anfitrião vê a distribuição das respostas na escala.

**A atribuição e o relatório** tratam o tipo como tratam os outros.

## Personas

- **Criador (`Creator`)**: monta o quiz no editor (kahoot-reference §1).
- **Anfitrião (`Host`)**: conduz a partida ao vivo e mostra a distribuição das respostas.
- **Jogador (`Player`)**: arrasta o marcador no celular, ao vivo ou numa atribuição.

## Histórias de usuário

- **HU-01**: Como criador, quero uma pergunta em que o jogador estima um número numa escala, para perguntar sobre anos, medidas e quantidades.
- **HU-02**: Como criador, quero dizer o quão perto basta (a margem), para que uma estimativa razoável também renda pontos.
- **HU-03**: Como criador, quero ver, enquanto edito, a etapa da escala e a faixa de respostas aceitas, para saber o que os jogadores vão poder escolher.
- **HU-04**: Como jogador, quero arrastar o marcador no celular, ajustar com precisão e enviar.
- **HU-05**: Como jogador, quero ganhar mais pontos quanto mais perto eu chegar.
- **HU-06**: Como anfitrião, quero ver na revelação onde os jogadores responderam e quantos acertaram.
- **HU-07**: Como criador, quero ver no relatório o valor que cada um enviou.

## Regras de negócio

### Seletor e tipo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | **Controle deslizante (`slider`)** passa a ser um tipo de pergunta no grupo **"Testar conhecimento"** do seletor, depois de "Resposta curta", com o ícone e o nome do Kahoot. A prévia do cartão mostra o exemplo "Qual é a altura do Monte Everest?" com o marcador em "8.849 m" e a frase **"Deixe os participantes adivinharem o número no controle deslizante."**. | kahoot-reference §4.1.4 · captura do Kahoot (2026-10-21) |
| RN-02 | O tipo aparece também em **"Tipo de pergunta"** no painel de propriedades. A troca de tipo da spec 005 (RN-14 a RN-21) vale para ele: mantém o enunciado, os pontos, a imagem e a posição. Até sair do editor, ele lembra o que a pergunta tinha em cada tipo. | spec 005 · decisão do produto (2026-10-21) |

### Pergunta no editor

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-03 | Uma pergunta de Controle deslizante tem um **mínimo (`min`)**, um **máximo (`max`)**, uma **resposta (`answer`)**, uma **unidade (`unit`)** opcional e uma **margem de resposta (`answerMargin`)**. | kahoot-reference §4.1.4 |
| RN-04 | Mínimo, máximo e resposta são **números com até 2 casas decimais**, que podem ser **negativos**. Cada campo aceita **até 10 caracteres** (contando o sinal e a vírgula). O criador pode digitar o separador decimal como **vírgula ou ponto**: "2000.03" e "2000,03" são o mesmo número. O campo não aceita letras, um segundo separador nem uma terceira casa decimal. Os números aparecem no formato brasileiro, com vírgula decimal e ponto de milhar: "−100,3", "2.000,03". | kahoot-reference §4.1.4 · captura do Kahoot (2026-10-21) · decisão do produto (2026-10-21) |
| RN-05 | A **unidade** tem **até 20 caracteres**, contados como os demais limites (caracteres percebidos), e aparece abaixo do número em todas as telas ("600 / anos"). Sem unidade, só o número aparece. | kahoot-reference §4.1.4 · captura do Kahoot (2026-10-21) |
| RN-06 | A pergunta nasce com **mínimo 0, máximo 50 e sem resposta**, e os campos Mínimo e Máximo e a **Margem de resposta ficam desabilitados até haver resposta**. Sobre o meio da escala fica o botão **"Adicionar resposta"**, que abre o balão da resposta vazio, para digitar. Deixá-lo vazio volta ao botão. **A primeira resposta traz a sua faixa**: 50 de largura, a partir do múltiplo de 20 logo abaixo da resposta (600 → 580 a 630; 430 → 420 a 470; 10 → 0 a 50). Depois disso, mudar a resposta não mexe na faixa: uma resposta fora dela mostra o erro (RN-16). | captura do Kahoot e testes do usuário (2026-10-21), regra deduzida dos três exemplos |
| RN-07 | A área das respostas é uma **escala de marcas** com o campo **"Mínimo"** à esquerda e o campo **"Máximo"** à direita. A resposta fica num **balão azul flutuante com uma seta para baixo**, sobre a escala, com o número e a unidade; ela **só se muda digitando** no balão (não se arrasta). **Passar o mouse sobre uma marca** a escurece e mostra o seu número logo abaixo, sem demora. No balão, **"Adicionar unidade"** abre a unidade para edição. | captura do Kahoot e pedido do usuário (2026-10-21) |
| RN-08 | A **margem de resposta** fica no painel de propriedades, com cinco opções. A pergunta nasce com **Médio**. Cada opção tem esta explicação no menu: **Nenhuma**: "Aceitar apenas a resposta correta."; **Baixa**: "Aceitar respostas próximas da correta com uma margem baixa."; **Médio**: "Aceitar respostas próximas da correta com uma margem média."; **Alto**: "Aceitar respostas próximas da correta com uma margem alta."; **Máxima**: "Quanto mais próxima a resposta for da correta, mais pontos são dados.". | kahoot-reference §4.1.4 · captura do Kahoot (2026-10-21) |
| RN-09 | O **valor da etapa (`step`)** é a distância entre duas posições vizinhas da escala. Ele é calculado a partir da faixa (máximo − mínimo) e não é editável. A conta é **faixa ÷ 100, arredondada para cima no primeiro algarismo significativo, e nunca menor que 1**. Exemplos: faixa 50 → 1; faixa 540 → 6; faixa 800 → 8; faixa 2100,33 → 30. | captura do Kahoot (2026-10-21), deduzido dos exemplos |
| RN-10 | As **posições** que o jogador pode escolher são contadas **a partir da resposta**: resposta ± 1 etapa, ± 2 etapas, e assim por diante, sem sair da faixa. O mínimo e o máximo só são posições quando caem nessa conta. A resposta é sempre uma posição, e as **pontas da escala** são a primeira e a última posição. Exemplos: faixa 100 a 900, etapa 8 e resposta 600 dão 104, 112, …, 600, …, 896. Faixa 100 a 640, etapa 6 e resposta 600 dão 102, 108, …, 600, …, 636. | demonstração do Kahoot examinada no navegador (2026-10-21): pontas 104 e 896 · decisão do produto (2026-10-21) |
| RN-11 | A **margem** é a distância máxima da resposta que ainda vale. **Nenhuma:** 0. **Baixa:** 5% da faixa. **Médio:** 10% da faixa. **Alto:** 20% da faixa. **Máxima:** a distância da resposta até a ponta da faixa mais longe dela, ou seja, toda a escala vale. A faixa aceita é resposta − margem até resposta + margem, cortada pelo mínimo e pelo máximo. Exemplos com faixa 100 a 900 e resposta 600: Baixa, 560 a 640; Médio, 520 a 680; Alto, 440 a 760; Máxima, 100 a 900. Com faixa 100 a 640, Médio dá 546 a 640. | captura do Kahoot (2026-10-21), deduzido dos exemplos |
| RN-12 | Com uma resposta definida, o editor mostra abaixo da escala **"Margem de resposta: X a Y"** (fora na margem Nenhuma) e **"Valor da etapa: N"**. Os dois têm um "?" com uma explicação curta. Na escala, as marcas dentro da margem ficam **azuis sobre uma faixa azul-clara**. Os números da margem aparecem arredondados ao inteiro mais próximo quando a conta dá decimais; a classificação usa o valor exato (RN-19). | captura do Kahoot (2026-10-21) |
| RN-13 | O **limite de tempo** do Controle deslizante vai de **10 segundos a 4 minutos** (10, 15, 20, 30, 45, 60, 90, 120, 180 ou 240 s), e a pergunta nasce com **20 segundos**. Os **pontos** são Padrão, Pontos em dobro ou Sem pontos, como no Quiz. O painel não tem "Opções de resposta". | kahoot-reference §4.1.4, §5.1 · captura do Kahoot (2026-10-21) · decisão do produto (2026-10-21) |
| RN-14 | **"Aplicar a todas as perguntas"** com 5 s deixa as perguntas de Controle deslizante com **10 segundos**, o menor tempo delas. Do mesmo jeito, uma pergunta com 5 s que vira Controle deslizante fica com 10 s. Esta regra segue a mesma lógica da spec 031, RN-07. | spec 031, RN-07 · decisão do produto (2026-10-21) |
| RN-15 | A imagem da pergunta (spec 007) funciona como nos outros tipos: ao centro ou de fundo, com recorte e texto alternativo. | spec 007 · captura do Kahoot (2026-10-21) |
| RN-16 | Uma pergunta de Controle deslizante está **incompleta** em quatro casos. **(a)** Não tem enunciado. **(b)** Não tem resposta: aparece "Resposta ausente" na lista. **(c)** O mínimo ou o máximo está vazio, ou o mínimo não é menor que o máximo: aparece "Intervalo inválido" na lista e **"Insira um valor máximo maior."** junto ao Máximo. **(d)** A resposta está fora da faixa: aparece "Resposta fora do intervalo" na lista. Junto ao campo, a mensagem é **"Insira um valor máximo maior."** (resposta acima do máximo) ou **"Insira um valor mínimo menor."** (resposta abaixo do mínimo). O campo com problema fica com **contorno vermelho**. Esses erros de faixa aparecem **na hora**, também numa pergunta recém-criada, porque falam de números que o criador acabou de digitar (como no Kahoot); "Resposta ausente" segue a regra de quando avisar da spec 004 (RN-16a). Como nos outros tipos, a pergunta continua salva e impede salvar a versão jogável (spec 006). Mudar o mínimo ou o máximo **nunca move a resposta**; ela só fica fora da faixa. | captura do Kahoot (2026-10-21) · kahoot-reference §6 · spec 004, RN-15, RN-16a · decisão do produto (2026-10-21), textos da lista |
| RN-17 | O item da lista mostra **"N Controle deslizante"** e o tempo. A miniatura mostra uma **escala com o marcador** quando há resposta e só a escala quando não há. Duplicar a pergunta ou o quiz copia mínimo, máximo, resposta, unidade e margem (spec 005, RN-21). | spec 003, RN-17 · spec 005, RN-21 · captura do Kahoot (2026-10-21) |
| RN-18 | Quando uma pergunta **vira** Controle deslizante, ela perde as alternativas ou as respostas aceitas do tipo anterior e fica como uma pergunta nova do tipo (RN-06), com margem Médio. Quando **deixa** de ser, perde a escala. Os valores não são convertidos de um tipo para o outro (spec 005, fora de escopo). | spec 005, RN-16 |

### Correção e pontos

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-19 | A resposta enviada é classificada pela distância até a resposta certa. **Correta (`correct`):** igual à resposta. **Quase correta (`almostCorrect`):** diferente, mas a uma distância **menor ou igual à margem** (RN-11). **Incorreta:** fora da margem. Na margem Nenhuma, só a resposta exata pontua. Na Máxima, qualquer valor da escala é ao menos quase correto. | kahoot-reference §2 (Correção), §4.1.4 |
| RN-20 | A **precisão (`precision`)** vai de 0 a 1. Ela vale **1 − distância ÷ margem**: 1 na resposta exata e 0 na borda da margem. Na margem Nenhuma, a resposta exata tem precisão 1. | kahoot-reference §4.1.4 · decisão do produto (2026-10-21) |
| RN-21 | Os pontos de uma resposta correta ou quase correta são `arredondar(pontos possíveis × (0,8 × precisão + 0,2 × fator de velocidade))`. **80% vêm da precisão e 20% da velocidade.** O fator de velocidade é o da spec 010: `1 − (tempo de resposta ÷ limite de tempo) ÷ 2`, ou 1 se a resposta chegou em menos de 0,5 s (RN-01, RN-02, RN-05). Os pontos possíveis são 1000, 2000 ou 0 em "Sem pontos". Uma resposta incorreta rende 0. Exemplos com 1000 pontos possíveis: a resposta exata enviada no instante rende 1000; a resposta exata no fim do tempo rende 900; na borda da margem, no instante, rende 200. | kahoot-reference §4.1.4, §5.6 · decisão do produto (2026-10-21), a fórmula exata do Kahoot não é confirmada |
| RN-22 | A resposta **quase correta conta como acerto**: mantém a sequência de acertos (spec 010) e entra como certa na precisão dos relatórios (spec 015). | kahoot-reference §5.6 |
| RN-23 | A classificação e os pontos são calculados **no servidor**, quando a resposta chega. O servidor só aceita **uma das posições da escala** (RN-10). A **resposta certa e a margem nunca chegam ao celular antes da revelação**, com "Mostrar perguntas nos dispositivos" ligado ou não. O celular recebe só o mínimo e o máximo (para os botões), a primeira e a última posição, a etapa, a unidade e a posição inicial. Como as posições são contadas a partir da resposta, elas dizem que a resposta é uma delas; isso não revela qual. | constituição, artigo V · spec 009, RN-21 |

### No celular do jogador

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-24 | Na fase de respostas, o celular mostra o **controle deslizante**, e o marcador começa na **posição mais perto do meio da faixa**. Se houver duas posições igualmente perto, vale a menor. O marcador mostra o número e a unidade. A escala aparece **ampliada**: só um trecho das marcas fica visível, e ela corre sob o marcador quando o jogador arrasta. O controle fica **no meio do espaço livre** da tela; com as perguntas nos dispositivos, o enunciado fica no topo, sem a etiqueta por cima. A etiqueta é como a do anfitrião, com a **seta para baixo**, e as marcas dos **números redondos** (múltiplos de 10 etapas, como 560 e 640) ficam mais escuras, com o número embaixo. | captura do Kahoot (2026-10-21) · decisão do produto (2026-10-21) |
| RN-25 | Abaixo da escala há dois botões com os limites, **"‹ mínimo"** e **"máximo ›"**, que movem o marcador **uma posição** para cada lado. **Segurar** o botão faz o marcador continuar andando até a ponta, ou até o jogador soltar. Pelo teclado, as **setas** movem uma posição e **Page Up/Page Down** movem dez posições. Na primeira vez que a pergunta aparece, uma **mão animada** mostra o gesto de arrastar e some quando o jogador toca na escala. | kahoot-reference §4.1.4 · captura do Kahoot (2026-10-21) · usuário (2026-10-21), segurar o botão |
| RN-26 | O botão **"Enviar"** confirma o valor onde o marcador está. Valem as regras de qualquer resposta: uma por pergunta, sem troca e dentro do prazo (spec 009, RN-17, RN-18), e a mesma tela de espera. Se o tempo acaba sem "Enviar", o jogador fica **sem resposta**, mesmo que tenha movido o marcador. | spec 009 · captura do Kahoot (2026-10-21) |
| RN-27 | O controle aparece com **"Mostrar perguntas nos dispositivos"** ligado ou desligado, porque não há como responder sem ele. Ligado, o celular mostra também a imagem e o enunciado, como nos outros tipos (spec 012, RN-18b). | spec 012 · spec 031, RN-18 |
| RN-28 | Na revelação, o celular mostra **"Correto"**, **"Quase correto"**, **"Incorreto"** ou **"Tempo esgotado"**, com a sequência e os pontos, como nos outros tipos (specs 009 e 010). Quem respondeu vê também **o valor que enviou** e **a resposta certa**, com a unidade. | decisão do produto (2026-10-21): não há captura do resultado no celular |

### Na tela do anfitrião

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-29 | Na **abertura** da pergunta, o anfitrião vê o ícone e o nome **"Controle deslizante"**, como nos outros tipos (spec 009, RN-07). | spec 009, RN-07 · captura do Kahoot (2026-10-21) |
| RN-30 | Na **fase de respostas**, o anfitrião vê o enunciado, a imagem, o tempo restante e o total de respostas, como nos outros tipos. No lugar das alternativas aparece uma **escala pequena** com a primeira e a última posição nas pontas (104 e 896) e um marcador **"?"** que passeia pela escala. O "?" é só decoração e não diz nada sobre as respostas. | captura do Kahoot (2026-10-21) |
| RN-31 | Na **revelação**, a imagem dá lugar a um **cartão branco**, no meio da altura da tela, com a **distribuição das respostas**: **uma coluna por posição da escala** (RN-10). O cartão vai **até as bordas da tela**, abre com a **resposta no meio** e se **arrasta para os lados** (mouse, toque ou roda), **sem barra de rolagem** na página; nenhuma ponta da escala passa do meio da tela, e ao soltar ele encaixa na coluna mais próxima. Cada coluna sem respostas é um **ponto** (verde na resposta, azul dentro da margem, cinza fora dela); cada coluna com respostas é uma **barra** de altura proporcional (verde, azul ou cinza), que nunca passa da altura do cartão. Atrás das colunas da margem há uma **faixa azul-clara** até logo abaixo dos pontos. **A cada 10 posições, contadas a partir da resposta**, o ponto fica mais escuro e o número aparece embaixo (470, 480, 490…). Uma **etiqueta com seta fica fixa no meio** e mostra a coluna que está ali, mudando enquanto o cartão desliza: o **número, a unidade e quantos jogadores** responderam ali (👤 0), **verde** na resposta, **azul** na margem e **vermelha** fora dela; fora da margem, o ponto ou a barra sob a etiqueta também fica vermelho. Ao abrir, ela está na resposta, que tem um **✓ flutuando logo acima da sua barra ou do seu ponto**. Clicar ou tocar numa coluna a traz para o meio (o fim de um arrasto não conta), e **passar o mouse** mostra o número da coluna, pequeno, logo acima da bolinha ou da barra. | demonstração do Kahoot examinada no navegador e capturas do usuário (2026-10-21) |
| RN-32 | Como nos outros tipos, o botão **"Mostrar mídia"** mostra a imagem no lugar da distribuição, e "Ocultar mídia" volta a ela. | spec 031, RN-25 |

### Atribuição e relatório

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-33 | Numa **atribuição** (spec 030), a pergunta aparece inteira no aparelho, com o controle e o "Enviar" das RN-24 a RN-26. O Timer da pergunta funciona como nos outros tipos; sem ele, o fator de velocidade é 1 e só a precisão diminui os pontos. "Ordem aleatória de respostas" não se aplica a este tipo. | spec 030 · spec 031, RN-34 |
| RN-34 | No **resultado** da atribuição, o participante vê **"Correto"**, **"Quase correto"** ou **"Incorreto"**, o valor que enviou e **"A resposta correta é:"** com o número, a unidade e a faixa da margem. | spec 030 · decisão do produto (2026-10-21) |
| RN-35 | No **relatório**, a pergunta aparece com o tipo "Controle deslizante", e as contas são as de sempre, com a quase correta contando como certa (RN-22). | spec 015, RN-11 |
| RN-36 | No **detalhe da pergunta**, no lugar das alternativas, o relatório mostra a **resposta certa** com a unidade e a margem, a **média dos valores enviados** e a lista dos **valores enviados**. Cada valor aparece com quantos o enviaram e a marca de correto, quase correto ou incorreto, em ordem do mais perto ao mais longe da resposta. No **detalhe do participante**, cada pergunta deste tipo mostra o valor que ele enviou. | spec 015 · spec 031, RN-37 · decisão do produto (2026-10-21) |

### Textos e acessibilidade

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-37 | Todos os textos são em português do Brasil, e os números seguem o formato brasileiro (RN-04). A cor nunca é o único sinal: correto, quase correto e incorreto têm marca e texto. O controle do celular é um controle deslizante acessível, com nome, valor atual com a unidade, mínimo e máximo anunciados para leitores de tela. | constituição, artigos VIII e IX |

## Critérios de aceite

### Editor

#### CA-01 — Seletor com Controle deslizante

- **Dado** o editor aberto
- **Quando** o criador abre "Adicionar" e passa o mouse sobre "Controle deslizante"
- **Então** o cartão aparece em "Testar conhecimento", depois de "Resposta curta"
- **E** a prévia mostra o exemplo do Everest e a frase "Deixe os participantes adivinharem o número no controle deslizante."

#### CA-02 — Pergunta nova

- **Dado** o criador escolheu "Controle deslizante"
- **Então** a pergunta aparece com Mínimo 0 e Máximo 50 desabilitados, a Margem de resposta desabilitada, o botão "Adicionar resposta" e 20 segundos
- **E** a lista a mostra incompleta com "Resposta ausente"

#### CA-03 — Adicionar a resposta

- **Dado** uma pergunta nova
- **Quando** o criador clica em "Adicionar resposta" e digita 600 no balão
- **Então** a faixa vira 580 a 630, e os campos e a margem ficam habilitados
- **E** com 430 seria 420 a 470, e com 10, 0 a 50
- **E** se depois ele troca a resposta para 600 numa faixa de 0 a 50, a faixa fica e o Máximo mostra "Insira um valor máximo maior."

#### CA-04 — Etapa e margem calculadas

- **Dado** mínimo 100, máximo 900 e resposta 600
- **Quando** o criador escolhe as margens Baixa, Médio, Alto e Máxima, uma de cada vez
- **Então** o editor mostra "Valor da etapa: 8"
- **E** mostra as margens 560 a 640, 520 a 680, 440 a 760 e 100 a 900
- **E** na margem Nenhuma o editor mostra só "Valor da etapa: 8"

#### CA-05 — Etapa arredondada no primeiro algarismo

- **Dado** mínimo −100,3 e máximo 2000,03
- **Quando** o criador põe a resposta em 600 com margem Médio
- **Então** o editor mostra "Valor da etapa: 30" e "Margem de resposta: 390 a 810"
- **E**, com mínimo 100 e máximo 640, mostra "Valor da etapa: 6" e "Margem de resposta: 546 a 640"

#### CA-06 — Vírgula ou ponto

- **Dado** o campo Máximo
- **Quando** o criador digita "2000.03"
- **Então** o valor fica 2.000,03
- **E** digitar "2000,031" ou "12a" não é aceito pelo campo
- **E** o campo não passa de 10 caracteres

#### CA-07 — Resposta fora da faixa

- **Dado** mínimo 100 e resposta 600
- **Quando** o criador muda o máximo para 200
- **Então** a resposta continua 600
- **E** o Máximo fica com contorno vermelho e "Insira um valor máximo maior."
- **E** a lista mostra a pergunta incompleta com "Resposta fora do intervalo"
- **E** salvar a versão jogável é impedido

#### CA-08 — Mínimo não menor que o máximo

- **Dado** uma pergunta com resposta
- **Quando** o criador põe o mínimo igual ao máximo, ou deixa um dos dois vazio
- **Então** a pergunta fica incompleta com "Intervalo inválido"

#### CA-09 — O número de cada marca

- **Dado** mínimo 0, máximo 50 e resposta 25
- **Quando** o criador passa o mouse sobre uma marca
- **Então** a marca escurece e o número dela aparece logo abaixo, sem demora
- **E** a resposta só muda digitando no balão

#### CA-10 — Unidade

- **Dado** uma pergunta com resposta
- **Quando** o criador aciona "Adicionar unidade" e escreve "anos"
- **Então** o marcador mostra "anos" abaixo do número
- **E** a unidade não passa de 20 caracteres

#### CA-11 — Tempos do Controle deslizante

- **Dado** uma pergunta de Controle deslizante
- **Quando** o criador abre "Limite de tempo"
- **Então** as opções vão de 10 segundos a 4 minutos, sem 5 segundos

#### CA-12 — Aplicar 5 s a todas

- **Dado** um quiz com uma pergunta Quiz e uma de Controle deslizante
- **Quando** o criador aplica 5 segundos a todas as perguntas
- **Então** a pergunta Quiz fica com 5 s e a de Controle deslizante com 10 s

#### CA-13 — Trocar de tipo e voltar

- **Dado** uma pergunta de Controle deslizante com faixa 100 a 900, resposta 600, unidade "anos" e margem Alto
- **Quando** o criador a troca para Quiz e volta para Controle deslizante, sem sair do editor
- **Então** a faixa, a resposta, a unidade e a margem voltam como estavam

#### CA-14 — Duplicar

- **Dado** uma pergunta de Controle deslizante completa
- **Quando** o criador a duplica
- **Então** a cópia tem a mesma faixa, resposta, unidade e margem

### Correção e pontos

#### CA-15 — Posições a partir da resposta

- **Dado** uma pergunta com faixa 100 a 640, resposta 600 e margem Nenhuma
- **Quando** um jogador leva o marcador até 600 e envia
- **Então** a resposta é "Correto"
- **E** as pontas da escala são 102 e 636
- **E** um valor fora das posições da escala, como 601 ou 100, é recusado pelo servidor

#### CA-16 — Quase correto

- **Dado** faixa 100 a 900, resposta 600 e margem Médio (520 a 680)
- **Quando** um jogador envia 680
- **Então** a resposta é "Quase correto"
- **E** conta para a sequência de acertos
- **E** quem envia 688 fica com "Incorreto" e 0 pontos

#### CA-17 — Pontos pela precisão e pela velocidade

- **Dado** uma pergunta padrão (1000 pontos) com resposta 600 e margem Médio de 80
- **Quando** um jogador envia 600 em menos de 0,5 s
- **Então** ele ganha 1000 pontos
- **E** se envia 600 no fim do tempo, ganha 900
- **E** se envia 640 (precisão 0,5) em menos de 0,5 s, ganha 600

#### CA-18 — Margem Máxima

- **Dado** faixa 100 a 900, resposta 600 e margem Máxima
- **Quando** um jogador envia 100, a ponta mais longe da resposta
- **Então** a resposta é "Quase correto"
- **E** ela rende só a parte da velocidade (no máximo 200 pontos)

#### CA-19 — Sem pontos e em dobro

- **Dado** a mesma resposta exata enviada no instante
- **Então** ela rende 0 em "Sem pontos" e 2000 em "Pontos em dobro"

### Partida ao vivo

#### CA-20 — A resposta não vaza

- **Dado** uma partida na fase de respostas de um Controle deslizante
- **Então** nem o celular nem os eventos recebem a resposta certa ou a margem
- **E** o celular recebe só o mínimo, o máximo, a primeira e a última posição, a etapa, a unidade e a posição inicial

#### CA-21 — Controle no celular

- **Dado** um jogador na fase de respostas, com faixa 100 a 900, etapa 8 e resposta 600
- **Então** o marcador começa na posição mais perto de 500
- **E** os botões "‹ 100" e "900 ›" movem o marcador uma posição
- **E** segurar "900 ›" faz o marcador andar até 896, a última posição, a não ser que o jogador solte antes
- **E** as setas do teclado movem uma posição, e Page Up/Down movem dez
- **E** "Enviar" envia o valor do marcador

#### CA-22 — Moveu e não enviou

- **Dado** um jogador que moveu o marcador e não tocou em "Enviar"
- **Quando** o tempo acaba
- **Então** ele fica sem resposta, com "Tempo esgotado"

#### CA-23 — Tela do anfitrião durante as respostas

- **Dado** a fase de respostas
- **Então** o anfitrião vê a escala pequena com o mínimo, o máximo e o "?" em movimento, além do tempo e do total de respostas

#### CA-24 — Revelação

- **Dado** respostas enviadas dentro e fora da margem
- **Quando** a revelação começa
- **Então** a tela do anfitrião mostra uma coluna por posição, centrada na resposta, com barras azuis na margem, cinza fora dela e pontos nas colunas vazias
- **E** a coluna da resposta certa é verde, com a etiqueta do número, da unidade e de quantos acertaram em cheio
- **Quando** o anfitrião arrasta a faixa até a ponta e escolhe uma coluna fora da margem
- **Então** a etiqueta dela fica vermelha, com o número e quantos responderam ali
- **E** na ponta aparece o número da última posição
- **E** o celular de cada jogador mostra o resultado, o valor que ele enviou, a resposta certa e os pontos

### Atribuição e relatório

#### CA-25 — Controle deslizante na atribuição

- **Dado** uma atribuição sem Timer da pergunta
- **Quando** o participante envia a resposta exata
- **Então** ganha os pontos cheios
- **E** o resultado mostra "Correto", o valor enviado e "A resposta correta é:" com a margem

#### CA-26 — Relatório

- **Dado** uma partida encerrada com um Controle deslizante
- **Quando** o criador abre o detalhe da pergunta
- **Então** vê a resposta certa, a margem e a média dos valores enviados
- **E** vê os valores enviados com quantos os enviaram e a marca de cada um
- **E** a precisão da pergunta conta corretas e quase corretas como acertos

## Experiência (telas e estados)

- **Editor, pergunta nova:** a escala com Mínimo 0 e Máximo 50 e o botão "Adicionar resposta" no meio. O alerta de incompleta aparece na lista.
- **Editor, com resposta:** o marcador azul com o número (e a unidade, se houver). As marcas da margem ficam azuis. Abaixo da escala ficam "Margem de resposta" e "Valor da etapa".
- **Editor, com erro:** o campo culpado fica com contorno vermelho e a mensagem abaixo da escala. O marcador fica onde estava.
- **Celular, respondendo:** o marcador grande com o número, a escala ampliada, os botões dos limites, "Enviar" e, na primeira vez, a mão animada. Depois de enviar, a espera de sempre.
- **Celular, revelação:** o resultado, o valor enviado e a resposta certa.
- **Anfitrião, respondendo:** a escala pequena com o "?".
- **Anfitrião, revelação:** a distribuição com a barra verde da resposta certa, mais "Mostrar mídia".
- **Relatório:** a resposta e a margem, a média e a lista dos valores enviados.

## Divergências intencionais do Kahoot

- **Nenhuma sobre as posições.** A demonstração do Kahoot mostra que as posições já são contadas a partir da resposta (pontas 104 e 896 numa faixa de 100 a 900). A spec segue isso; a única diferença é que, no celular da demonstração, o marcador começa em 500, fora das posições, e aqui ele começa na posição mais perto do meio (RN-24).
- **Fórmula dos pontos.** O Kahoot diz "80% precisão, 20% velocidade" sem publicar a fórmula. A conta da RN-21 é nossa.
- **Resultado no celular.** No Kahoot, o celular mostra o resultado e os pontos. Aqui ele mostra também o valor enviado e a resposta certa (RN-28).
- **Prévia de "8.849 m".** No exemplo do seletor, o ponto é separador de milhar, como no formato brasileiro.

## Fora de escopo

- O texto para leitura em voz alta (kahoot-reference §4.1.4), como nos outros tipos.
- Etapa escolhida pelo criador. A etapa é sempre calculada.
- Mais de 2 casas decimais e notação científica.
- O assistente de criação gerar este tipo. Ele continua gerando só Quiz e Verdadeiro ou falso (spec 027), como na spec 031.
- Revisar respostas, que é só da Resposta curta (spec 031).

## Perguntas em aberto

Nenhuma. Não há capturas de uma partida real, e o tipo é pago. A distribuição do anfitrião (RN-31) segue a demonstração do Kahoot. O resultado no celular (RN-28), o da atribuição (RN-34) e o relatório (RN-36) são decisões do produto. Se surgirem capturas reais, a spec é revista.

## Changelog

- 2026-10-21 — spec criada a partir das capturas do editor e da demonstração da partida enviadas pelo usuário, com as decisões da conversa: pontos com 80% de precisão e 20% de velocidade; quase correta conta como acerto; posições a partir da resposta; tempos de 10 a 240 s com 20 s de padrão; decimais (2 casas) e negativos.
- 2026-10-21 — os botões dos limites andam uma posição, e segurá-los faz o marcador andar até a ponta (RN-25, CA-21), conforme o usuário. Sem capturas de uma partida real, o resultado no celular, o da atribuição e o relatório ficam como decisões do produto.
- 2026-10-21 — a distribuição da revelação (RN-31, CA-24) segue o que a demonstração do Kahoot mostra no navegador: uma coluna por posição, 49 posições centradas na resposta, no lugar das 31 colunas agrupadas que eu tinha contado nas capturas.
- 2026-10-21 — conforme a demonstração do Kahoot: as posições são só as contadas a partir da resposta, e o mínimo e o máximo só entram quando caem na conta (RN-10, pontas 104 e 896). A distribuição da revelação passa a ser arrastável até as pontas, com uma etiqueta na coluna escolhida: verde, azul ou vermelha (RN-31, CA-24).
- 2026-10-21 — implementada (tarefas T01 a T23). Sem mudança de regra. O resultado da atribuição mostra a faixa da margem só quando a margem não é Nenhuma, e o anfitrião escolhe uma coluna também pelo teclado.
- 2026-10-21 — depois do teste do usuário no navegador: a resposta vem primeiro (os campos da faixa e a margem esperam por ela) e a primeira resposta traz a faixa (RN-06, CA-02, CA-03); o marcador vira um balão com seta, só se digita, e cada marca mostra o seu número ao passar o mouse (RN-07, CA-09); na revelação, passar o mouse só mostra o número pequeno, e a etiqueta muda com o clique (RN-31). Corrigido também, na Resposta curta, o texto enviado que reaparecia no campo da pergunta seguinte.
- 2026-10-21 — os erros de faixa ("Insira um valor máximo maior." / "Insira um valor mínimo menor.") aparecem na hora, também numa pergunta recém-criada, com o campo em vermelho, como no Kahoot (RN-16).
- 2026-10-21 — a revelação do anfitrião vira um cartão que se arrasta, sem barra de rolagem, com números a cada 10 posições a partir da resposta e a faixa da margem só atrás das colunas, como no Kahoot (RN-31).
- 2026-10-21 — a etiqueta da revelação fica fixa no meio e acompanha o arrasto; o cartão vai até as bordas da tela sem rolagem na página; o número ao passar o mouse e o ✓ da resposta ficam logo acima da bolinha ou da barra (RN-31).
- 2026-10-21 — fora da margem, o ponto ou a barra sob a etiqueta fica vermelho, como no Kahoot (RN-31).
- 2026-10-21 — no celular, o controle fica no meio do espaço livre, o enunciado no topo sem a etiqueta por cima, a etiqueta como a do anfitrião (seta para baixo) e números redondos sob as marcas (RN-24). Corrigido o desalinhamento da marca escolhida quando uma coluna tinha número.
