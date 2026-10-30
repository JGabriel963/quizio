---
id: "030"
title: Atribuir quiz 2/2 — Jogar a atribuição
status: done # draft | approved | planned | in-progress | done
contexts: [game, reports]
created: 2026-10-19
---

# 030 — Atribuir quiz 2/2 — Jogar a atribuição

## Contexto e problema

A spec 029 entregou a atribuição até a porta do jogo: o criador atribui um quiz com prazo, compartilha o link e o PIN, e acompanha a atividade em Relatórios. Quem abre o link vê a tela da atividade com o apelido marcado "Em breve". Falta o principal: **jogar**.

No Kahoot, abrir uma atribuição leva ao jogo "solo" (`kahoot.it/solo/…`): cada participante joga sozinho, no próprio ritmo, sem tela de anfitrião. O usuário gravou três vídeos em 2026-10-19 (desktop, celular e dois jogadores ao mesmo tempo), de onde saem as telas desta spec:

- a **capa** da atividade (imagem, "5 perguntas", título e "Iniciar") e a tela do **apelido** ("Atividade por…", "Aberto por 2 dias", "0 participantes", "Insira um apelido", "Ok, vamos lá!", "Não use seu nome verdadeiro"); depois de entrar, "1 participante" com o apelido, e a primeira pergunta começa;
- a **pergunta**: segmentos de progresso no topo (um por pergunta), a imagem, o enunciado, as alternativas com forma, cor e texto, e a barra de tempo com os segundos que faltam;
- o **resultado**: as alternativas apagadas, menos a escolhida e a certa; uma faixa verde **"Correto"** ou vermelha **"Incorreto"**, que dá lugar aos pontos (**"+ 932"**); e a seta **→**;
- **"Pontuações"**: a classificação dos participantes da atividade com os totais, e as setas **←** e **→**;
- o **fim**: a medalha com a posição, entre confetes, a classificação, e o botão "Descobrir kahoots"; com **←**, o participante revê cada pergunta respondida.

**Não há oponentes gerados pelo computador**, ao contrário do que a referência descreve para o "jogar solo" (kahoot-reference §8.2): quem joga sozinho vê só a si mesmo no placar, e outros participantes aparecem quando jogaram a mesma atividade, como no vídeo dos dois jogadores.

## Objetivo

Quem recebe o link ou o PIN de uma atribuição entra com um apelido, sem conta, e joga o quiz inteiro no próprio ritmo, vendo a cada pergunta se acertou e quantos pontos ganhou, a classificação entre os participantes e, no fim, a sua posição. O criador vê os resultados chegarem ao relatório da atribuição.

## Personas

- **Participante (`Participant`)** — joga a atribuição no celular ou no computador, sem conta, quando puder.
- **Criador (`Creator`)** — acompanha os resultados no relatório e pode jogar a própria atividade ("Jogue este quiz").

## Histórias de usuário

- **HU-01** — Como participante, quero entrar na atividade com um apelido, para jogar sem criar conta.
- **HU-02** — Como participante, quero responder cada pergunta no meu ritmo, vendo o enunciado, a imagem e as alternativas na minha tela, para jogar sem depender de uma tela grande.
- **HU-03** — Como participante, quero saber na hora se acertei e quantos pontos ganhei, para acompanhar o meu desempenho.
- **HU-04** — Como participante, quero ver a classificação entre quem jogou a atividade, para me comparar com os outros.
- **HU-05** — Como participante, quero ver no fim a minha posição e rever as perguntas, para saber onde errei.
- **HU-06** — Como participante, quero continuar de onde parei se fechar a aba, para não perder o que já fiz.
- **HU-07** — Como criador, quero ver os resultados dos participantes no relatório da atribuição, para saber como o grupo está indo.
- **HU-08** — Como criador, quero jogar a minha própria atividade, para ver como ela fica para os participantes.

## Regras de negócio

### Entrar

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | O link da atribuição abre a **capa** da atividade: a capa do quiz (ou a imagem padrão), o número de perguntas ("5 perguntas"), o nome da atividade (spec 029, RN-28) e **"Iniciar"**, que leva à tela do apelido. O PIN de 8 dígitos (spec 029, RN-20) leva à mesma capa. | vídeo Desktop (2026-10-19) |
| RN-02 | A tela do apelido é a da spec 029 (RN-46), agora funcionando: **"Insira um apelido"**, **"Ok, vamos lá!"** e "Não use seu nome verdadeiro". Ela deixa de mostrar "Em breve". | spec 029, RN-46 · vídeo Desktop |
| RN-03 | O apelido segue as regras da partida ao vivo (spec 008): de 1 a 15 caracteres sem os espaços das pontas, e **único na atividade**, sem diferenciar maiúsculas, minúsculas e acentos. A tela do apelido mostra os apelidos de quem já entrou, **só para ver**: tocar num deles não faz nada. Um apelido em uso mostra **"Esse apelido já está em uso. Escolha outro."**, como na partida ao vivo, e a pessoa continua na tela do apelido. | spec 008 · kahoot-reference §8.1, §9 · captura do Kahoot (2026-10-20) · observação do usuário no Kahoot (2026-10-29) |
| RN-04 | Entra quem chega enquanto a atribuição está **aberta**, até o limite técnico de **200 participantes** por atividade (spec 008, RN-45), sem nenhuma menção a plano. Encerrada (prazo ou "Encerrar agora"), a capa e o apelido dão lugar a "Esta atividade foi encerrada" (spec 029, RN-47). | spec 008, RN-45 · spec 029 · constituição, artigo VI |
| RN-04a | Cada endereço de rede (IP) **cria no máximo 60 participantes por minuto** em cada atividade, como na partida ao vivo (spec 008, RN-45a), com a mesma mensagem: **"Muitas entradas por esta rede agora. Aguarde um momento e tente de novo."** Retomar um participante (RN-20) não cria ninguém e não conta. | auditoria de segurança (2026-10-29, M7) · decisão do usuário (2026-10-29) |
| RN-05 | Ao entrar, a tela mostra por um instante o número de participantes já com o apelido de quem entrou, e **a primeira pergunta começa sozinha**: não há lobby nem anfitrião. | vídeos Desktop e Mobile |
| RN-06 | Com **Personagens** ligada na atribuição (spec 029, RN-13), o participante recebe um personagem sorteado ao entrar e pode trocá-lo **antes de começar**, numa tela com o editor da spec 028 e o botão **"Começar"**; o personagem aparece no placar e na tela final. Desligada, não há personagem nem essa tela. | spec 028 · spec 029, RN-13 · decisão do produto (2026-10-19) |

### Jogar no próprio ritmo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-07 | O participante joga **todas as perguntas da versão atribuída, na ordem dela** (spec 029, RN-04), uma de cada vez. As perguntas são as mesmas para todos; com **Ordem aleatória de respostas** ligada, as alternativas de Quiz aparecem numa ordem sorteada **para cada participante**, fixa do começo ao fim (verdadeiro ou falso nunca muda de ordem, spec 012). | spec 029, RN-13 · kahoot-reference §8.1 · spec 012 |
| RN-08 | A pergunta aparece **inteira no aparelho**: os segmentos de progresso no topo (um por pergunta, preenchidos até a atual), a imagem com o seu recorte e posição (spec 007), o enunciado e as alternativas com forma, cor e texto. Múltipla escolha usa as marcações e "Enviar" (spec 012). | kahoot-reference §8.1 · spec 012 · vídeos |
| RN-09 | Com **Timer da pergunta** ligado, a pergunta tem o tempo limite do editor, contado **no servidor** a partir do momento em que ela foi mostrada ao participante, e a barra de tempo mostra os segundos que faltam. Com ele desligado, não há barra nem limite: a pergunta espera a resposta. | spec 009 · spec 029, RN-13 · kahoot-reference §5.2, §8.1 |
| RN-10 | A resposta vale como na partida ao vivo (specs 009 e 010): correta, parcialmente correta (múltipla escolha) ou incorreta, medida no servidor, uma por pergunta, sem troca. Os **pontos** seguem a fórmula da spec 010 com o tempo de resposta dessa pergunta; com o **timer desligado, a resposta correta vale os pontos cheios** da pergunta (padrão, em dobro ou sem pontos). Não há sequência de acertos exibida. | spec 010 · kahoot-reference §5.2, §5.3 |
| RN-11 | Respondida a pergunta, ou acabado o tempo, vem o **resultado**: as alternativas ficam apagadas, menos a que o participante escolheu e a certa, cada uma com a marca de certa ou errada; uma faixa **"Correto"** (verde), **"Incorreto"** (vermelha) ou **"Tempo esgotado"** (sem resposta) aparece e dá lugar aos pontos ganhos ("+ 932"; "+ 0" sem acerto). | vídeos · spec 010 |
| RN-12 | **Quem avança é o participante, menos depois do resultado**: o resultado mostra a animação (acertou ou errou e, se acertou, os pontos) e em seguida leva sozinho a **"Pontuações"** (→ antecipa); em Pontuações, **→** leva à pergunta seguinte, e depois da última, ao fim; ali nada avança sozinho. A seta **←** volta, uma a uma, aos **resultados** das perguntas já respondidas, **só para ver**: nunca a uma Pontuações anterior; o resultado já dado não muda e uma pergunta respondida não é respondida de novo. As setas só aparecem depois de responder, e cada uma só quando há para onde ir. | vídeos · decisão do usuário (2026-10-20) |
| RN-13 | O servidor é a autoridade (constituição, artigo V): a resposta, o tempo e a pergunta em que cada participante está são guardados nele. O aparelho nunca decide os pontos nem o tempo, e uma resposta a uma pergunta que não é a atual do participante é recusada. | constituição, artigo V · spec 009 |

### Pontuações

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-14 | **"Pontuações"** depois de uma pergunta mostra a classificação dos participantes da atividade pelos **pontos de cada um até essa pergunta**, como na partida ao vivo: quem está à frente aparece com o que tinha naquele ponto, e quem ainda não chegou nela, com o que fez até agora. O empate fica com quem entrou primeiro (spec 010). O **fim** mostra os totais de agora (RN-19). Quem joga sozinho vê só a si mesmo. Não há jogadores virtuais. | vídeo jogadores-ao-mesmo-tempo · decisão do usuário (2026-10-21) |
| RN-15 | O placar mostra os **cinco primeiros** e, se quem vê estiver fora deles, a **linha dele** com a posição. A linha de quem vê fica destacada; os totais contam até o valor atual e quem subiu de posição desde o placar anterior ganha a seta de subida, como no placar ao vivo (spec 011). | spec 010, spec 011 · vídeo jogadores-ao-mesmo-tempo |

### Fim

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-16 | Depois da última pergunta, o **fim** mostra o cabeçalho da atividade ("Atividade por…", "Aberto por…"), a **medalha com a posição** do participante, entre confetes, e a **classificação** (RN-15), com o total de cada um. As animações seguem a spec 011 e respeitam a preferência por menos movimento. | vídeos · spec 011 |
| RN-17 | No fim, **←** permite rever, uma a uma, cada pergunta com o resultado dela (RN-11), do fim para o começo, e **→** volta ao fim. É só leitura. | vídeo Mobile |
| RN-18 | O botão do fim é **"Entrar em outro jogo"**, que leva à entrada por PIN do Quizio, no lugar do "Descobrir kahoots" do Kahoot. | decisão do usuário (2026-10-19) |
| RN-19 | A posição e os totais do fim são os de **agora**: se outros participantes jogarem depois, quem voltar à atividade no mesmo aparelho vê a classificação atualizada. | decisão do produto (2026-10-19) |

### Voltar e acabar

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-20 | O aparelho guarda quem o participante é na atividade, e **só esse navegador o continua**. Voltar ao link ou ao PIN nele pergunta **"Você é {apelido}?"** ("Um jogador com esse apelido já começou o jogo. Se foi você, continue jogando de onde parou ou comece a jogar com um apelido diferente."): "Sim" leva aonde ele estava (à pergunta, ao resultado, a Pontuações ou ao fim) e "Não" esquece o participante nesse navegador e vai ao apelido, para entrar como outro; quem já jogou continua no placar. Em outro navegador, ou depois de limpar os dados do navegador, o participante não é retomado: a pessoa entra com outro apelido. Como no Kahoot, o apelido não é uma porta de entrada, e quem conhece o apelido de alguém não joga por ele. | kahoot-reference §8.1, §9 · spec 008, RN-44a · decisão do usuário (2026-10-20) · observação do usuário no Kahoot e auditoria de segurança (2026-10-29, M5) |
| RN-21 | O tempo de uma pergunta **corre desde que ela apareceu**, com o aparelho aberto ou não. Quem **abandona** a partida no meio de uma pergunta que não respondeu e volta (RN-20) **continua essa pergunta com o tempo que sobrava**; se o tempo acabou enquanto estava fora, vê o resultado ("Tempo esgotado") e a pergunta conta como não respondida, como para quem estava no aparelho quando o tempo acabou. Se já a respondeu, segue para a próxima tela. Com o timer desligado, a pergunta o espera. **Diverge do Kahoot**, que recomeça a pergunta com o tempo inteiro: assim, sair e voltar (ou recarregar a página) não dá mais tempo para responder nem mais pontos pela velocidade. | captura do Kahoot · decisão do usuário (2026-10-20) · auditoria de segurança (2026-10-29, M6) · decisão do usuário (2026-10-30) |
| RN-22 | Quem terminou não joga de novo a mesma atividade: voltar e dizer "Sim" leva direto ao fim (RN-16), **sem ← para rever as perguntas**; a revisão é de quem acabou de terminar. | kahoot-reference §8.1 · captura do Kahoot (2026-10-20) |
| RN-23 | Quando a atribuição **acaba** (prazo ou "Encerrar agora", spec 029) com o participante no meio, as respostas seguintes são recusadas e o aparelho mostra o fim com o que ele fez, com o aviso "Esta atividade foi encerrada". As perguntas que faltavam contam como não respondidas. | spec 029, RN-39, RN-40 · decisão do produto (2026-10-19) |
| RN-24 | Sem conexão, a resposta não enviada mostra "Sua resposta não foi enviada." e devolve as alternativas, como na partida ao vivo (spec 013), enquanto o tempo da pergunta não acabou. | spec 013 |

### O relatório

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-25 | O relatório da atribuição (spec 029, RN-27 a RN-35) passa a ter os participantes e as respostas: o número de participantes no Resumo, as abas Participantes e Perguntas, os cartões Perguntas difíceis, Ajuda necessária e **Não concluiu**, com as regras da spec 015. | spec 015 · spec 029, RN-34, RN-35 · captura do relatório (2026-10-19) |
| RN-26 | Numa atribuição, as perguntas de **cada participante são todas as da atividade**: a que ele ainda não respondeu conta como **não respondida** (e não acertada), mesmo com a atividade aberta. "Não concluiu" lista quem tem pergunta sem resposta, com quantas, como o Kahoot mostra ("John 5"). | spec 015, RN-12, RN-19 · captura do relatório do Kahoot (2026-10-19) |
| RN-27 | A **classificação** do relatório é a do jogo (RN-14), e o **tempo** da atribuição é o de quem respondeu (a média dos tempos de resposta por pergunta, spec 015); a duração da partida (spec 015, RN-21) não se aplica e não aparece. | spec 015 · decisão do produto (2026-10-19) |
| RN-28 | O relatório aberto **se atualiza sozinho** enquanto a atribuição está aberta, em até 30 segundos, sem recarregar a página. | kahoot-reference §8.1 ("acompanhamento em tempo real") · decisão do produto (2026-10-19) |
| RN-29 | **"Jogue este quiz"** (spec 029, RN-33) deixa de ser "Em breve": abre a capa da atividade numa nova aba, e o criador joga como qualquer participante, com um apelido; ele aparece no placar e no relatório. | decisão do usuário (2026-10-19) |

### Apresentação

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-30 | As telas do participante são telas de jogo (escuras, mobile-first) e funcionam com o mesmo arranjo no computador, como nos vídeos. Cor nunca é o único sinal: alternativas têm forma, e certo e errado têm marca e texto. | constituição, artigo VIII |

## Critérios de aceite

### Entrar

#### CA-01 — Do link à primeira pergunta

- **Dado** uma atribuição aberta de "Capitais", de 5 perguntas, criada por Ana
- **Quando** alguém sem conta abre o link, vê a capa com "5 perguntas" e "Capitais", aciona "Iniciar", digita "John" e aciona "Ok, vamos lá!"
- **Então** a tela mostra "1 participante" com "John" e, em seguida, a primeira pergunta com o enunciado, a imagem e as alternativas com texto

#### CA-02 — Pelo PIN

- **Dado** a mesma atribuição com o PIN 04352236
- **Quando** alguém digita 04352236 na entrada por PIN
- **Então** chega à capa da atividade

#### CA-03 — Apelido em uso

- **Dado** que "John" já entrou na atividade
- **Quando** alguém, noutro navegador, digita "john" na tela do apelido e aciona "Ok, vamos lá!"
- **Então** vê "Esse apelido já está em uso. Escolha outro." e continua na tela do apelido
- **E** tocar em "John" na lista de quem entrou não faz nada

#### CA-04 — Atividade cheia ou encerrada

- **Dado** uma atribuição com 200 participantes, ou uma encerrada
- **Quando** alguém tenta entrar
- **Então** é recusado com o motivo, e na encerrada vê "Esta atividade foi encerrada"

#### CA-04a — Muitas entradas pela mesma rede

- **Dado** uma atividade aberta em que 60 participantes entraram, no último minuto, pelo mesmo endereço de rede
- **Quando** mais alguém dessa rede escolhe um apelido livre e aciona "Ok, vamos lá!"
- **Então** vê "Muitas entradas por esta rede agora. Aguarde um momento e tente de novo." e continua na tela do apelido

#### CA-05 — Personagem antes de começar

- **Dado** uma atribuição com Personagens ligada
- **Quando** o participante entra
- **Então** vê o personagem sorteado, pode trocá-lo e aciona "Começar" para ir à primeira pergunta
- **E** com Personagens desligada essa tela não aparece

### Jogar

#### CA-06 — Responder certo

- **Dado** a primeira pergunta com timer de 20 s, respondida certo em 2 s
- **Então** as outras alternativas ficam apagadas, aparece "Correto" e depois "+ 950" (os pontos da fórmula da spec 010 para 2 s de 20)
- **E** a seta → aparece

#### CA-07 — Responder errado

- **Dado** uma pergunta respondida com uma alternativa errada
- **Então** aparece "Incorreto" e "+ 0", com a escolhida marcada como errada e a certa como certa

#### CA-08 — Tempo esgotado

- **Dado** uma pergunta de 10 s sem resposta
- **Quando** os 10 s passam
- **Então** aparece "Tempo esgotado", a certa fica marcada, e uma resposta enviada depois é recusada

#### CA-09 — Timer desligado

- **Dado** uma atribuição com Timer da pergunta desligado
- **Então** a pergunta não tem barra de tempo e espera a resposta
- **E** uma resposta certa a uma pergunta de pontos padrão vale 1000, demore o que demorar

#### CA-10 — O participante avança

- **Dado** o resultado da primeira pergunta
- **Quando** a animação do resultado termina
- **Então** o participante vê Pontuações sem acionar nada (→ no resultado antecipa)
- **E** em Pontuações, sem acionar nada, a tela não muda; → leva à segunda pergunta

#### CA-11 — Voltar só para ver

- **Dado** Pontuações depois da segunda pergunta
- **Quando** o participante aciona ←, e de novo ←
- **Então** vê o resultado da segunda pergunta e depois o da primeira, como estavam, sem poder responder de novo
- **E** nunca a Pontuações da primeira pergunta

#### CA-12 — O servidor manda

- **Dado** um participante na segunda pergunta
- **Quando** chega uma resposta para a primeira ou para a terceira
- **Então** ela é recusada e nada muda

#### CA-13 — Ordem das respostas por participante

- **Dado** uma atribuição com Ordem aleatória de respostas ligada
- **Então** dois participantes podem ver as alternativas de uma pergunta Quiz em ordens diferentes, cada um sempre na mesma ordem, inclusive depois de recarregar
- **E** verdadeiro ou falso nunca muda de ordem

### Pontuações

#### CA-14 — Sozinho

- **Dado** John, o único participante, com 932 pontos depois da primeira pergunta
- **Então** Pontuações mostra só "1 John 932"

#### CA-15 — Com outros participantes

- **Dado** que claude terminou a atividade com 3710 pontos e John está na segunda pergunta com 1858
- **Quando** John vê Pontuações
- **Então** vê "1 claude 3710" e "2 John 1858", com a sua linha destacada

#### CA-16 — Muitos participantes

- **Dado** 12 participantes e John em 9º
- **Então** Pontuações mostra os cinco primeiros e a linha "9 John"

### Fim

#### CA-17 — A posição no fim

- **Dado** John na última pergunta, com claude à frente
- **Quando** John aciona → depois de Pontuações
- **Então** vê "Atividade por Ana", a medalha "2", a classificação com claude e John, e "Entrar em outro jogo", que leva à entrada por PIN

#### CA-18 — Rever as perguntas

- **Dado** o fim
- **Quando** o participante aciona ← repetidas vezes
- **Então** vê o resultado de cada pergunta, da última para a primeira, só para ler

### Voltar e acabar

#### CA-19 — Voltar no mesmo navegador

- **Dado** John na terceira pergunta, de 20 segundos, que fecha a aba aos 5 segundos sem responder
- **Quando** abre o link de novo no mesmo navegador 5 segundos depois e responde "Sim" a "Você é John?"
- **Então** vê a terceira pergunta de novo, com os 10 segundos que sobravam

#### CA-19a — Voltar depois que o tempo acabou

- **Dado** John na terceira pergunta, de 20 segundos, que fecha a aba sem responder
- **Quando** abre o link de novo no mesmo navegador 1 minuto depois e responde "Sim" a "Você é John?"
- **Então** vê o resultado "Tempo esgotado", e a terceira pergunta conta como não respondida

#### CA-20 — Outro participante no mesmo navegador

- **Dado** John, que jogou nesse navegador
- **Quando** abre o link e responde "Não" a "Você é John?"
- **Então** vai ao apelido e entra como outra pessoa, e John continua em Pontuações

#### CA-20a — Outro navegador não retoma

- **Dado** John, que começou a atividade no celular
- **Quando** abre o link no computador
- **Então** vê a capa e só entra com outro apelido, sem "Você é John?"

#### CA-21 — Quem terminou não joga de novo

- **Dado** John, que chegou ao fim
- **Quando** abre o link de novo no mesmo navegador e responde "Sim" a "Você é John?"
- **Então** vê o fim, com a classificação de agora, sem ← para rever as perguntas

#### CA-22 — Encerrada no meio

- **Dado** John na segunda de cinco perguntas
- **Quando** o criador aciona "Encerrar agora" e John responde
- **Então** a resposta é recusada e John vê o fim com "Esta atividade foi encerrada"
- **E** no relatório, John tem 4 perguntas não respondidas

### Relatório

#### CA-23 — Resultados no relatório

- **Dado** John, que respondeu 3 de 5 perguntas, 2 certas
- **Quando** o criador abre o relatório da atribuição aberta
- **Então** vê 1 participante; em Participantes, John com 40% e 2 não respondidas; em Não concluiu, "John 2"

#### CA-24 — O relatório se atualiza

- **Dado** o relatório da atribuição aberto no computador do criador
- **Quando** um participante responde uma pergunta
- **Então** em até 30 segundos o relatório mostra a resposta, sem recarregar

#### CA-25 — O criador joga

- **Dado** o relatório de uma atribuição aberta
- **Quando** o criador aciona "Jogue este quiz"
- **Então** a capa da atividade abre numa nova aba, ele joga com um apelido e aparece no relatório como participante

### Apresentação

#### CA-26 — No celular

- **Dado** um celular de 375 px de largura
- **Então** a capa, o apelido, a pergunta, o resultado, Pontuações e o fim cabem sem rolagem horizontal, e as alternativas mostram forma e texto

## Experiência (telas e estados)

- **Capa**: capa do quiz, "N perguntas", nome da atividade, "Iniciar". Encerrada: "Esta atividade foi encerrada".
- **Apelido**: cabeçalho "Atividade por… · Aberto por…", número de participantes, campo e "Ok, vamos lá!", "Não use seu nome verdadeiro"; erro do apelido na faixa vermelha de baixo (spec 008). Depois de entrar, o apelido em destaque por um instante.
- **Personagem** (com Personagens ligada): o editor da spec 028 e "Começar".
- **Pergunta**: progresso no topo, imagem, enunciado, alternativas, barra de tempo com os segundos (com o timer ligado).
- **Resultado**: alternativas apagadas menos a escolhida e a certa, faixa "Correto"/"Incorreto"/"Tempo esgotado" e depois "+ N", setas ← →.
- **Pontuações**: título, os cinco primeiros e a linha de quem vê, destacada, setas ← →.
- **Fim**: cabeçalho da atividade, medalha com a posição e confetes, classificação, "Entrar em outro jogo"; ← para rever.
- **Estados**: carregando, sem conexão (spec 013), resposta não enviada, atividade encerrada.
- **Relatório da atribuição**: as mesmas telas da spec 015, com os números chegando sozinhos; "Jogue este quiz" funcionando.

## Divergências intencionais do Kahoot

- **"Entrar em outro jogo"** no lugar de "Descobrir kahoots" (RN-18): o Descobrir não existe no Quizio.
- **Sem limite de 40 participantes** (RN-04): o limite é técnico, 200, como na partida ao vivo.
- **Pontuações com os cinco primeiros e a linha de quem vê** (RN-15): o vídeo só tem dois jogadores; o tamanho do placar segue o da partida ao vivo.
- **Personagem antes de começar** (RN-06): a tela do Kahoot para isso não está nos vídeos; o Quizio reaproveita o editor da spec 028.
- **Música e o botão de som**, presentes nos vídeos, ficam para a spec de música (roadmap 025).

## Fora de escopo

- Música, efeitos sonoros e o botão de configurações do jogador (roadmap 025).
- Gerador de apelido (roadmap 023) e identificador do jogador.
- Jogar de novo a mesma atividade para melhorar a pontuação.
- Temas e fundos de tela (o "praia" do Kahoot).
- Atribuir a grupos e por e-mail.
- Exportar o relatório (roadmap 026).

## Perguntas em aberto

- [ ] **Capa antes do apelido (RN-01)** — no vídeo do desktop ela aparece; no do celular, o vídeo já começa no apelido. Fica nos dois?
- [ ] **Tamanho do placar (RN-15)** — os cinco primeiros mais a linha de quem vê, como ao vivo, ou todos os participantes, com rolagem?

## Changelog

- 2026-10-19 — spec criada a partir dos vídeos do Kahoot enviados pelo usuário (desktop, celular e dois jogadores ao mesmo tempo). Decisões do usuário: sem jogadores virtuais; o placar mostra o total atual de todos os participantes; o tempo da pergunta continua correndo fora da aba; "Entrar em outro jogo" no fim; "Jogue este quiz" faz o criador jogar como participante que conta.
- 2026-10-19 — spec aprovada pelo usuário. As duas perguntas em aberto ficam com as escolhas da spec (capa antes do apelido nos dois tamanhos de tela; os cinco primeiros mais a linha de quem vê), ajustáveis na implementação.
- 2026-10-19 — implementada (T01–T21). Sem mudança de regra. Na implementação: a tela da pergunta recebe também a duração dela, para a barra de tempo; a tela de espera "Em breve" da spec 029 deu lugar à capa e ao apelido.
- 2026-10-20 — por decisão do usuário, a partir do Kahoot: depois da animação do resultado, Pontuações vem sozinha; ← volta só aos resultados das perguntas respondidas, nunca a uma Pontuações anterior (RN-12, CA-10, CA-11).
- 2026-10-20 — por decisão do usuário, a partir do Kahoot: voltar pergunta "Você é {apelido}?" e o participante se retoma pelo apelido, em qualquer navegador; quem abandonou recomeça a pergunta que não respondeu, com o tempo inteiro; quem terminou volta ao fim sem rever as perguntas; a tela do apelido lista quem já entrou (RN-03, RN-20 a RN-22, CA-03, CA-19 a CA-21).
- 2026-10-21 — por decisão do usuário, a partir do Kahoot: Pontuações mostra os pontos de cada um até a pergunta que ela segue, não o total atual; a seta de subida compara com a pergunta anterior (RN-14).
- 2026-10-29 — por decisão do usuário, depois da auditoria de segurança (achado M7): cada rede cria no máximo 60 participantes por minuto numa atividade (RN-04a, CA-04a), como na partida ao vivo (spec 008, RN-45a). Remover participantes da atividade continua fora e virou um item do roadmap.
- 2026-10-29 — por decisão do usuário, depois de observar o Kahoot e da auditoria de segurança (achado M5): só o navegador que guardou o participante o continua (RN-20, CA-19 a CA-21). A lista de quem entrou fica só para ver, e um apelido em uso mostra "Esse apelido já está em uso. Escolha outro." (RN-03, CA-03). Antes, o apelido bastava para retomar em qualquer navegador, e o servidor entregava o segredo do participante a quem dissesse "Sim": dava para responder no lugar de outra pessoa. Em troca, quem muda de aparelho ou limpa o navegador entra de novo com outro apelido.
- 2026-10-30 — por decisão do usuário, depois da auditoria de segurança (achado M6): quem volta a uma pergunta que não respondeu continua com o tempo que sobrava, e uma pergunta cujo tempo acabou enquanto estava fora conta como não respondida (RN-21, CA-19, CA-19a). Antes, voltar recomeçava a pergunta com o tempo inteiro, como no Kahoot: recarregar a página dava mais tempo para responder e mais pontos pela velocidade, quantas vezes se quisesse.
