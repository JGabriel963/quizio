---
id: "029"
title: Atribuir quiz 1/2 — Criar, compartilhar e acompanhar a atribuição
status: done # draft | approved | planned | in-progress | done
contexts: [game, reports, library, quiz]
created: 2026-10-19
---

# 029 — Atribuir quiz 1/2 — Criar, compartilhar e acompanhar a atribuição

## Contexto e problema

Hoje o único jeito de jogar um quiz do Quizio é **ao vivo**: o anfitrião abre o lobby numa tela grande, todos entram ao mesmo tempo e a tela dele conduz a partida (specs 008 a 014). Isso não serve para quem quer mandar um quiz como **tarefa**: uma turma que responde em casa, uma equipe que faz um treinamento quando puder, um grupo espalhado em fusos diferentes.

No Kahoot, isso é **Atribuir** (`Assignment`, chamado de "Challenge" na API; kahoot-reference §8.1): o criador escolhe até quando o quiz fica aberto, compartilha um link ou um PIN, e cada participante joga **no próprio ritmo**, sem anfitrião, até o prazo. Enquanto está aberta, a atribuição já aparece em **Relatórios** e vai juntando os resultados.

O usuário mandou as capturas do fluxo em 2026-10-19:

- na **biblioteca**, ao passar o mouse numa linha, os botões **"Atribuir"** e **"Organizar ao vivo"**;
- o diálogo **"Configurar atividade"**: "Crie uma atividade e a compartilhe com os participantes na próxima etapa", a **data de término** ("Em 3 dias", "quinta-feira, 22 de outubro de 2026 às 12:00") com **Editar**, que abre um calendário e a hora; **"Mais opções"**, que abre quatro chaves: **Gerador de apelido**, **Personagens**, **Timer da pergunta** e **Ordem aleatória de respostas**; e **"Criar uma tarefa"**;
- o diálogo **"Compartilhe com os participantes"**: a atividade com o prazo e o número de participantes, **"Compart."**, **"Adicionar participantes"** (com **"Atribuir a grupos"** e **"Atribuir por e-mail"**, pagos no Kahoot), **"Copiar link"** e **"Ou entre com o PIN: 04352236"**;
- a **tela do participante** ao abrir o link: "Atividade por {criador}", "Aberto por 2 dias", "0 participantes", o campo do apelido, "Ok, vamos lá!" e "Não use seu nome verdadeiro";
- o **relatório** da atribuição aberta: "Atribuição" com "Termina: em 3 dias", datas de início e de término, "Organizado por"; o anel de participantes com **"Convide mais participantes!"** e **"Compartilhar atividade atribuída"**; o **código QR** com "Baixar", o **PIN** e a **URL** com "Copiar"; **"Alterar prazo"** e **"Encerrar agora"**; **"Jogue este kahoot"**; e os cartões Perguntas difíceis, Ajuda necessária e Não concluiu;
- os diálogos **"Alterar o prazo"** (data e horário) e **"Encerrar este kahoot atribuído?"**.

O jogo do participante numa atribuição é diferente do ao vivo (sem tela do anfitrião, cada um no seu ritmo) e o usuário vai mandar capturas dele depois. Por decisão do usuário (2026-10-19), a atribuição é entregue em duas etapas: **esta spec prepara tudo até a porta do jogo** (criar, compartilhar, acompanhar, alterar o prazo, encerrar); a **029-2/2** liga o jogo (entrar com apelido, responder, pontuar e terminar com a posição no ranking).

## Objetivo

O criador atribui um quiz publicado com um prazo e as opções que quiser, recebe o link, o PIN e o QR para mandar aos participantes, e acompanha a atribuição em Relatórios, onde pode mudar o prazo ou encerrá-la. Quem abre o link ou digita o PIN já chega à tela da atividade, que avisa que o jogo chega em breve.

## Personas

- **Criador (`Creator`)** — atribui o quiz, compartilha e acompanha. Não conduz nada: a atribuição corre sozinha até o prazo.
- **Participante (`Participant`)** — recebe o link ou o PIN e abre a atividade no celular ou no computador, sem conta. Nesta etapa só vê a tela de espera.

## Histórias de usuário

- **HU-01** — Como criador, quero atribuir um quiz com um prazo, para que as pessoas joguem quando puderem, sem eu precisar apresentar.
- **HU-02** — Como criador, quero escolher as opções da atribuição (personagens, timer, ordem das respostas), para adaptar o jogo ao grupo.
- **HU-03** — Como criador, quero copiar o link, mostrar o PIN, baixar o QR e compartilhar nas redes, para fazer a atividade chegar aos participantes.
- **HU-04** — Como criador, quero ver a atribuição aberta em Relatórios, com quanto tempo falta e os meios de compartilhar de novo, para acompanhar a tarefa.
- **HU-05** — Como criador, quero alterar o prazo de uma atribuição aberta, para dar mais tempo (ou menos) ao grupo.
- **HU-06** — Como criador, quero encerrar uma atribuição antes do prazo, para fechar a entrada quando todos já tiverem jogado.
- **HU-07** — Como participante, quero abrir o link ou digitar o PIN e ver de quem é a atividade e até quando ela fica aberta, para saber que cheguei ao lugar certo.

## Regras de negócio

### Atribuir

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Uma **atribuição (`Assignment`)** é uma sessão de um quiz que **cada participante joga no próprio ritmo, sem anfitrião**, até um **prazo (`Deadline`)**. Ela é criada pelo criador dono do quiz e é só dele, como a partida ao vivo (spec 008). | kahoot-reference §1, §8.1 |
| RN-02 | Há três pontos de entrada, todos com o nome **"Atribuir"**: (a) um botão na **página do quiz**, ao lado de "Organizar ao vivo"; (b) a **linha da biblioteca**, que ao receber o mouse (ou o foco do teclado) mostra **"Atribuir"** e **"Organizar ao vivo"** no lugar da visibilidade e da data, e no celular os oferece no menu ⋮ da linha; (c) o diálogo "O quiz está pronto" (spec 006, RN-15a) ganha a opção **"Atribuir"**, logo depois de "Organizar ao vivo", com a descrição "Os participantes jogam no próprio ritmo até o prazo". | referência visual do Kahoot · decisão do usuário (2026-10-19) |
| RN-03 | "Atribuir" tem as **mesmas condições** que "Organizar ao vivo" (spec 008, RN-04, RN-05): só para um quiz **publicado** e fora da lixeira; num rascunho fica indisponível com "Salve o quiz no editor para poder jogar."; com alterações não salvas, usa a **versão jogável** e mostra o mesmo aviso de uma linha. Na linha da biblioteca, os dois botões só aparecem para quizzes publicados. | spec 008, RN-04, RN-05 |
| RN-04 | A atribuição usa a **versão jogável** e o **título** do quiz **no momento em que é criada**. Editar, salvar, mandar para a lixeira ou duplicar o quiz depois **não muda** a atribuição: para jogar a versão nova, cria-se outra. | kahoot-reference §3.6, §8.1 ("Edição posterior") · spec 006 |
| RN-05 | Um quiz pode ter **várias atribuições abertas ao mesmo tempo**, cada uma com o seu prazo, PIN e participantes. Atribuições e partidas ao vivo são **independentes**: atribuir não encerra a partida ao vivo aberta (spec 008, RN-07), e organizar ao vivo não encerra atribuições. | decisão do produto (2026-10-19) |

### Configurar atividade

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-06 | "Atribuir" abre o diálogo **"Configurar atividade"**, com o texto "Crie uma atividade e a compartilhe com os participantes na próxima etapa.", o **prazo**, **"Mais opções"** (fechado ao abrir), **"Cancelar"** e **"Criar uma tarefa"**. Cancelar, o X ou fora do diálogo fecham sem criar nada. | referência visual do Kahoot |
| RN-07 | O **prazo é obrigatório** e tem **precisão de hora** (data e hora cheia, no fuso do aparelho do criador). O padrão é **daqui a 3 dias, às 12:00**. | kahoot-reference §8.1 · referência visual do Kahoot · decisão do usuário (2026-10-19) |
| RN-08 | O prazo tem de ser **depois de agora** e **no máximo 28 dias** depois de agora. O limite de 28 dias é uma configuração da instância, documentada aqui (constituição, artigo VI): é o do Kahoot, e mantém o PIN da atribuição temporário. O servidor confere os dois limites no **seu** relógio ao criar e ao alterar o prazo, e recusa o que estiver fora deles. | kahoot-reference §8.1 · decisão do usuário (2026-10-19) |
| RN-09 | O cartão do prazo mostra **"Data de término · {tempo até o prazo}"** e a data por extenso ("quinta-feira, 22 de outubro de 2026 às 12:00"). **"Editar"** abre um calendário do mês, com a semana começando na segunda, setas para o mês anterior e o seguinte, os **dias fora dos limites (RN-08) indisponíveis**, e a escolha do **horário** em horas cheias (no dia de hoje, só as horas que ainda não passaram); **"Definir"** aplica e **"Cancelar"** volta sem mudar. | referência visual do Kahoot |
| RN-10 | O **tempo até o prazo** é dito em uma unidade, arredondada para o mais próximo: "em N dias" a partir de 1 dia, "em N horas" a partir de 1 hora, "em N minutos" abaixo disso, e "em 1 dia", "em 1 hora", "em 1 minuto" no singular. A mesma regra vale em todas as telas da atribuição (o diálogo, o compartilhamento, a lista e o relatório, e a tela do participante, que diz "Aberto por N dias"). | referência visual do Kahoot · decisão do produto (2026-10-19) |
| RN-11 | **"Mais opções"** abre quatro chaves, cada uma com o nome e a explicação das capturas: **Gerador de apelido** ("Evite apelidos inadequados e informações pessoais."), **Personagens** ("Permita que os participantes escolham um personagem e personalizem sua aparência."), **Timer da pergunta** ("Conceda mais pontos para respostas mais rápidas.") e **Ordem aleatória de respostas** ("Exiba a ordem aleatória de respostas para cada participante."). | referência visual do Kahoot · kahoot-reference §8.1 |
| RN-12 | **Gerador de apelido** aparece **desligado e indisponível, marcado "Em breve"**: o gerador ainda não existe no Quizio (roadmap, linha 023). Quando a 023 for entregue, a chave passa a funcionar aqui e na partida ao vivo. | decisão do usuário (2026-10-19) |
| RN-13 | **Personagens** (`gameCharacters`) é a opção da spec 028 levada à atribuição: ligada, os participantes ganham e trocam um personagem como na partida ao vivo; desligada, só o apelido. **Timer da pergunta** (`questionTimer`): desligado, as perguntas não têm contagem de tempo e a resposta **não perde pontos pela demora** (kahoot-reference §5.2). **Ordem aleatória de respostas** (`randomizeAnswers`): as alternativas aparecem em ordem sorteada **para cada participante**. Nesta etapa as três ficam **guardadas na atribuição**; o efeito delas no jogo é da spec 029-2/2. | kahoot-reference §5.2, §8.1 · spec 028 |
| RN-14 | Os padrões são os das capturas: Personagens **desligada**, Timer da pergunta **ligada**, Ordem aleatória de respostas **desligada**. As escolhas feitas ao criar uma atribuição **ficam guardadas para o criador** e são o ponto de partida da próxima, à parte das preferências da partida ao vivo (spec 012). | referência visual do Kahoot · decisão do produto (2026-10-19) |
| RN-15 | A atribuição **não tem** as opções que não fazem sentido sem anfitrião ou que o Kahoot não permite nela: **ordem aleatória das perguntas** (proibida em atribuições), **reprodução automática** e **travar a entrada**. **As perguntas e as alternativas aparecem sempre no dispositivo** do participante, sem chave. | kahoot-reference §6.2, §8.1 |
| RN-16 | O diálogo **não fala de limite de participantes nem de upgrade** ("Você pode convidar até 40 participantes. Faça upgrade…" do Kahoot não existe aqui). | constituição, artigo VI |
| RN-17 | **"Criar uma tarefa"** cria a atribuição e troca o diálogo pelo de **compartilhamento** (RN-21). Se o prazo passou enquanto o diálogo estava aberto, ou ficou fora dos limites, a criação é recusada, o diálogo continua aberto e o cartão do prazo diz por quê. Se a criação falhar por outro motivo, um aviso diz que não foi possível criar a atividade e nada é criado. Durante o pedido, o botão mostra que está criando e não pode ser acionado de novo. | decisão do produto (2026-10-19) |

### PIN, link e QR

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-18 | Cada atribuição tem um **PIN da atribuição** de **8 dígitos**, que pode começar com zero, **único entre as atribuições abertas** e diferente, pelo tamanho, do PIN de 6 dígitos da partida ao vivo (spec 008). Ele vale **até a atribuição acabar** (prazo ou "Encerrar agora"). | kahoot-reference §2 (PIN), §6.3 · referência visual do Kahoot ("04352236") |
| RN-19 | A atribuição tem um **link** que abre direto a tela da atividade (RN-46), sem digitar o PIN, e um **código QR** com esse link. | kahoot-reference §6.3, §8.1 · referência visual do Kahoot |
| RN-20 | A **entrada por PIN** (spec 008) passa a aceitar também os 8 dígitos da atribuição: um PIN de atribuição aberta leva à tela da atividade. Um PIN de 8 dígitos que não é de nenhuma atribuição aberta é **um PIN errado** como os outros, com as mesmas mensagens e o mesmo limite de tentativas por endereço (spec 008). | spec 008 · decisão do produto (2026-10-19) |

### Compartilhar

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-21 | O diálogo **"Compartilhe com os participantes"** tem uma ilustração, o texto "Envie o link, mostre o código QR ou compartilhe o PIN abaixo. Acompanhe o progresso a qualquer momento no relatório.", o **cartão da atividade** (nome, "Termina: {tempo até o prazo}" e o número de participantes) e as ações das RN-22 a RN-25. O cartão leva ao **relatório** da atribuição. | referência visual do Kahoot |
| RN-22 | **"Copiar link"** copia o link (RN-19) e confirma com um aviso "Link copiado". O ícone ao lado do PIN copia o PIN, com "PIN copiado". | referência visual do Kahoot |
| RN-23 | **"Compartilhar"** abre o compartilhamento do próprio aparelho quando ele existe (celular, alguns navegadores); senão, abre um menu com **WhatsApp**, **Telegram**, **Facebook**, **X**, **E-mail** e **Copiar link**. A mensagem compartilhada é "Jogue {nome da atividade} até {data do prazo}: {link}". | referência visual do Kahoot ("Compart.") · decisão do produto (2026-10-19) |
| RN-24 | **"Adicionar participantes"** abre um menu com **"Atribuir a grupos"** e **"Atribuir por e-mail"**, os dois marcados **"Em breve"** (grupos é uma feature futura, roadmap 020/§11.3; e-mail depende de um provedor de envio). Não há aviso de plano premium nem "Fazer upgrade". | referência visual do Kahoot · constituição, artigo VI · decisão do usuário (2026-10-19) |
| RN-25 | "Ou entre com o PIN: **{PIN}**" mostra o PIN em destaque, com o ícone de copiar (RN-22) e um ícone de ajuda que explica onde digitá-lo (o endereço da entrada por PIN do Quizio). | referência visual do Kahoot |
| RN-26 | Fechar o diálogo de compartilhamento volta à tela de onde o criador atribuiu, com um aviso "Atividade criada" e a ação **"Ver relatório"**. | decisão do produto (2026-10-19) |

### A atribuição em Relatórios

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-27 | **Toda atribuição é um relatório desde que é criada**, aberta ou não: ela aparece na lista de Relatórios e no cartão "Relatórios mais recentes" da página inicial. Altera a spec 015, RN-01 e RN-02, que só faziam relatório de uma partida ao vivo iniciada e acabada. As regras de renomear, lixeira e "não encontrado" para outros criadores (spec 015, RN-03, RN-45 a RN-53) valem para ela, com a exceção da RN-41. | kahoot-reference §8.1 ("Relatório"), §10 · referência visual do Kahoot |
| RN-28 | O **nome** do relatório de uma atribuição começa igual ao **título do quiz no momento em que ela foi criada** (RN-04), e o nome da atividade em todas as telas (o compartilhamento, a tela do participante) é esse nome. Renomear o relatório renomeia a atividade. | spec 015, RN-45 · decisão do produto (2026-10-19) |
| RN-29 | Na lista, a linha de uma atribuição diz **"Atribuição"** no lugar de "Ao vivo". **Aberta**, ela mostra **"Termina: {tempo até o prazo}"** no lugar da data de término e "—" no percentual enquanto não houver resultados; **acabada**, mostra a data e a hora em que acabou, como as outras. | referência visual do Kahoot · spec 015, RN-24 |
| RN-30 | A lista mostra **primeiro as atribuições abertas**, da que termina antes para a que termina depois, e em seguida os relatórios acabados, do que acabou mais recentemente para o mais antigo (spec 015, RN-23). | decisão do produto (2026-10-19) |
| RN-31 | No relatório de uma atribuição, o cabeçalho tem, à direita, **"Atribuição"** com o troféu e, enquanto aberta, a etiqueta **"Termina: {tempo até o prazo}"**; abaixo, **"Data de início"** (quando foi criada), **"Data de término"** (o prazo, ou o momento em que foi encerrada) e **"Organizado por {nome do criador}"**. Acabada, a etiqueta vira **"Encerrada"**. | referência visual do Kahoot |
| RN-32 | O **Resumo de uma atribuição aberta** tem, no primeiro cartão: o **número de participantes** num anel ("1 participante"), **"Convide mais participantes!"** com o texto "Convide participantes compartilhando a URL ou o PIN. Eles podem participar deste quiz até o prazo estipulado." e o botão **"Compartilhar atividade atribuída"**, que abre o diálogo de compartilhamento (RN-21); ao lado, o **código QR** com **"Baixar"** (uma imagem do QR), o **PIN do jogo** com **"Copiar"** e a **URL** com **"Copiar"**. | referência visual do Kahoot |
| RN-33 | Ao lado, o cartão de controle tem **"Alterar prazo"** (RN-36) e **"Encerrar agora"** (RN-39), e abaixo dele o cartão **"Jogue este quiz"**, marcado **"Em breve"** nesta etapa: na 029-2/2 ele abre a atividade para o próprio criador jogar. | referência visual do Kahoot · decisão do usuário (2026-10-19) |
| RN-34 | Abaixo vêm os cartões **"Perguntas difíceis"**, **"Ajuda necessária"** e **"Não concluiu"** da spec 015 (RN-37 a RN-39), com as mesmas regras sobre os resultados que existirem. Sem participantes, cada um mostra o seu estado vazio. As abas **Participantes (N)** e **Perguntas (N)** existem desde a criação; Perguntas lista as perguntas da versão atribuída, com "—" nos percentuais enquanto ninguém as respondeu. | referência visual do Kahoot · spec 015 |
| RN-35 | Quando a atribuição **acaba**, o primeiro cartão do Resumo e os cartões de controle saem, e o relatório fica como o de uma partida acabada (spec 015): o percentual geral e os totais. Como as respostas chegam na 029-2/2, as contas da atribuição (o que é uma pergunta dela, quem não concluiu) são fechadas lá; nesta etapa, sem participantes, todo número aparece como "—" ou 0. | spec 015 · decisão do produto (2026-10-19) |

### Alterar prazo e encerrar

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-36 | **"Alterar prazo"** abre o diálogo **"Alterar o prazo"**: "Os participantes devem completar o quiz atribuído até:", **Data** e **Horário**, com os valores atuais, **"Cancelar"** e **"Salvar"**. As escolhas seguem a RN-08 e a RN-09, contadas a partir de agora. | referência visual do Kahoot · kahoot-reference §8.1 |
| RN-37 | O novo prazo pode ser **mais cedo ou mais tarde** que o atual, desde que dentro dos limites. Ao salvar, todas as telas da atribuição passam a contar até ele (o relatório, a lista, o cartão da página inicial e a tela do participante, na próxima vez que ela consultar o servidor). | kahoot-reference §8.1 |
| RN-38 | Só uma atribuição **aberta** tem o prazo alterado: uma que acabou (pelo prazo ou por "Encerrar agora") **não reabre**. O servidor recusa a alteração de uma atribuição acabada, e a tela diz que ela já foi encerrada. | kahoot-reference §8.1 ("antes de expirar") · decisão do produto (2026-10-19) |
| RN-39 | **"Encerrar agora"** pede confirmação: **"Encerrar este quiz atribuído?"**, "O link e o PIN não estarão mais disponíveis, e os jogadores não poderão entrar ou jogar este quiz atribuído.", **"Cancelar"** e **"Encerrar agora"** (destrutivo). Confirmado, a atribuição **acaba naquele instante**, e é irreversível. | referência visual do Kahoot · kahoot-reference §8.1 |
| RN-40 | Uma atribuição **acaba** quando o prazo chega ou quando é encerrada, o que vier primeiro, pelo relógio do servidor. Ninguém precisa estar com a tela aberta: quem consultar a atribuição depois do prazo já a vê acabada. A partir daí o link e o PIN levam à tela "Esta atividade foi encerrada" (RN-47). | kahoot-reference §6.3, §8.1 · decisão do produto (2026-10-19) |
| RN-41 | Uma atribuição **aberta não vai para a lixeira**: "Mover para a lixeira" fica indisponível nela, com "Encerre a atribuição para mover o relatório para a lixeira." | decisão do produto (2026-10-19) |
| RN-42 | **Excluir o quiz definitivamente encerra as atribuições abertas dele**, como encerra as partidas ao vivo abertas (spec 015, RN-05); os relatórios ficam. Mandar o quiz para a lixeira **não** as encerra. | spec 015, RN-05 · decisão do produto (2026-10-19) |
| RN-43 | Se alterar o prazo ou encerrar falhar, o que estava antes continua valendo e um aviso diz que não foi possível. | decisão do produto (2026-10-19) |

### Para o participante (nesta etapa)

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-44 | O participante **não precisa de conta** para abrir a atividade. | kahoot-reference §1, §8.1 |
| RN-45 | A tela da atividade é uma **tela de jogo** (escura, mobile-first), como a entrada da partida ao vivo, e funciona em telas largas. | constituição, artigo VIII · spec 008 |
| RN-46 | **Aberta**, a tela mostra **"Atividade por {nome do criador}"**, **"Aberto por {tempo até o prazo}"**, o nome da atividade, o **número de participantes**, o campo **"Insira um apelido"**, o botão **"Ok, vamos lá!"** e "Não use seu nome verdadeiro". Nesta etapa o campo e o botão estão **indisponíveis, marcados "Em breve"**, e a tela diz que a atividade estará disponível para jogar em breve. Na 029-2/2 eles passam a funcionar. | referência visual do Kahoot · decisão do usuário (2026-10-19) |
| RN-47 | **Acabada**, a tela diz **"Esta atividade foi encerrada"**, com o nome da atividade e o caminho para a entrada por PIN. Um link de atribuição que nunca existiu, ou que foi excluída definitivamente, leva à entrada por PIN dizendo que a atividade não foi encontrada. | kahoot-reference §8.1 ("End now") · decisão do produto (2026-10-19) |
| RN-48 | A tela não mostra nada do quiz além do nome da atividade: nenhuma pergunta, nem o número delas. | constituição, artigo V · decisão do produto (2026-10-19) |

### Apresentação

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-49 | Os diálogos e o relatório são da área do criador (tema claro) e funcionam em telas estreitas: o calendário e os diálogos cabem na largura do celular, sem rolagem horizontal. | spec 002 · constituição, artigo VIII |
| RN-50 | Datas e horas aparecem no fuso do aparelho de quem vê, no formato longo nos diálogos ("quinta-feira, 22 de outubro de 2026 às 12:00") e no curto no relatório ("22 de out. de 2026, 12:00", spec 015, RN-56). | referência visual do Kahoot · spec 015, RN-56 |
| RN-51 | Todo "Em breve" desta spec (Gerador de apelido, Atribuir a grupos, Atribuir por e-mail, Jogue este quiz, o apelido da tela do participante) segue a spec 002, RN-05: visível, não acionável e anunciado como indisponível. | spec 002, RN-05 |

## Critérios de aceite

### Atribuir

#### CA-01 — Atribuir pela página do quiz

- **Dado** um quiz publicado do criador
- **Quando** ele aciona "Atribuir" na página do quiz
- **Então** vê "Configurar atividade" com a data de término daqui a 3 dias às 12:00, "Em 3 dias", e "Mais opções" fechado

#### CA-02 — Atribuir pela linha da biblioteca

- **Dado** a biblioteca com um quiz publicado e um rascunho
- **Quando** o criador passa o mouse pela linha do quiz publicado
- **Então** a linha mostra "Atribuir" e "Organizar ao vivo"
- **E** a linha do rascunho não mostra nenhum dos dois
- **E** numa tela estreita, os dois estão no menu ⋮ da linha do quiz publicado

#### CA-03 — Atribuir pelo "O quiz está pronto"

- **Dado** o diálogo "O quiz está pronto", logo depois de salvar
- **Quando** o criador escolhe "Atribuir"
- **Então** vê "Configurar atividade" daquele quiz

#### CA-04 — Rascunho não é atribuído

- **Dado** um quiz que nunca foi salvo
- **Quando** o criador abre a página dele
- **Então** "Atribuir" está indisponível, com "Salve o quiz no editor para poder jogar."
- **E** uma tentativa direta de criar a atribuição é recusada

#### CA-05 — Quiz na lixeira não é atribuído

- **Dado** um quiz publicado na lixeira
- **Quando** o criador o abre
- **Então** não há "Atribuir", e uma tentativa direta é recusada

#### CA-06 — Cancelar não cria nada

- **Dado** "Configurar atividade" aberto
- **Quando** o criador aciona "Cancelar" (ou o X)
- **Então** o diálogo fecha e nenhuma atribuição aparece em Relatórios

### Prazo

#### CA-07 — Escolher outro prazo

- **Dado** "Configurar atividade" aberto
- **Quando** o criador aciona "Editar", escolhe o dia 30 e o horário 18:00 e aciona "Definir"
- **Então** o cartão mostra a data por extenso do dia 30 às 18:00 e o tempo até ela

#### CA-08 — Dias fora dos limites

- **Dado** o calendário aberto
- **Então** os dias anteriores a hoje e os que ficam a mais de 28 dias estão indisponíveis
- **E** no dia de hoje só aparecem as horas cheias que ainda não passaram

#### CA-09 — Prazo vencido enquanto o diálogo estava aberto

- **Dado** o prazo definido para a próxima hora cheia, e o diálogo aberto até essa hora passar
- **Quando** o criador aciona "Criar uma tarefa"
- **Então** a atribuição não é criada, o diálogo continua aberto e o cartão do prazo diz que ele já passou

#### CA-10 — O servidor confere os limites

- **Dado** um pedido de criação com o prazo no passado, ou a mais de 28 dias
- **Quando** ele chega ao servidor
- **Então** é recusado e nada é criado

#### CA-11 — Tempo até o prazo

- **Dado** atribuições com prazo daqui a 2 dias e 22 horas, daqui a 5 horas e daqui a 40 minutos
- **Então** as telas dizem "em 3 dias", "em 5 horas" e "em 40 minutos"

### Mais opções

#### CA-12 — As chaves e os padrões

- **Dado** um criador que nunca atribuiu
- **Quando** ele abre "Mais opções"
- **Então** vê Gerador de apelido desligado, indisponível e marcado "Em breve"; Personagens desligada; Timer da pergunta ligada; Ordem aleatória de respostas desligada; cada uma com a sua explicação
- **E** não há ordem aleatória das perguntas, reprodução automática nem travar

#### CA-13 — As escolhas ficam guardadas na atribuição

- **Dado** "Mais opções" com Personagens ligada e Timer da pergunta desligada
- **Quando** o criador cria a atribuição
- **Então** a atribuição guarda Personagens ligada, Timer da pergunta desligada e Ordem aleatória de respostas desligada

#### CA-14 — As escolhas ficam para a próxima

- **Dado** que o criador criou uma atribuição com Ordem aleatória de respostas ligada
- **Quando** ele atribui outro quiz
- **Então** "Mais opções" já vem com Ordem aleatória de respostas ligada
- **E** as configurações da partida ao vivo dele não mudaram

#### CA-15 — Sem limite nem upgrade

- **Dado** "Configurar atividade" aberto
- **Então** não há texto sobre limite de participantes nem "Faça upgrade"

### Compartilhar

#### CA-16 — Depois de criar

- **Dado** "Configurar atividade" do quiz "Capitais" com o prazo em 3 dias
- **Quando** o criador aciona "Criar uma tarefa"
- **Então** vê "Compartilhe com os participantes" com o cartão "Capitais", "Termina: em 3 dias" e 0 participantes, "Compartilhar", "Adicionar participantes", "Copiar link" e "Ou entre com o PIN:" com um PIN de 8 dígitos

#### CA-17 — Copiar o link e o PIN

- **Dado** o diálogo de compartilhamento
- **Quando** o criador aciona "Copiar link" e depois o ícone ao lado do PIN
- **Então** a área de transferência recebe o link da atividade e depois o PIN, cada um com o seu aviso

#### CA-18 — Compartilhar sem o compartilhamento do aparelho

- **Dado** um navegador sem compartilhamento próprio
- **Quando** o criador aciona "Compartilhar"
- **Então** vê WhatsApp, Telegram, Facebook, X, E-mail e Copiar link
- **E** escolher WhatsApp abre o WhatsApp com a mensagem "Jogue Capitais até {data}: {link}"

#### CA-19 — Grupos e e-mail em breve

- **Dado** o diálogo de compartilhamento
- **Quando** o criador aciona "Adicionar participantes"
- **Então** vê "Atribuir a grupos" e "Atribuir por e-mail" marcados "Em breve" e não acionáveis
- **E** não há aviso de plano premium nem "Fazer upgrade"

#### CA-20 — Fechar o compartilhamento

- **Dado** o diálogo de compartilhamento aberto a partir da biblioteca
- **Quando** o criador o fecha
- **Então** continua na biblioteca e vê "Atividade criada" com "Ver relatório", que abre o relatório da atribuição

### Vários e independentes

#### CA-21 — Duas atribuições do mesmo quiz

- **Dado** uma atribuição aberta do quiz "Capitais"
- **Quando** o criador atribui "Capitais" de novo, com outro prazo
- **Então** as duas ficam abertas, cada uma com o seu PIN e o seu prazo

#### CA-22 — Ao vivo e atribuição não se encerram

- **Dado** uma partida ao vivo aberta de "Capitais"
- **Quando** o criador atribui "Capitais"
- **Então** a partida ao vivo continua aberta
- **E** organizar ao vivo de novo não encerra a atribuição

#### CA-23 — Editar o quiz não muda a atribuição

- **Dado** uma atribuição aberta de "Capitais" com 5 perguntas
- **Quando** o criador acrescenta uma pergunta, salva e renomeia o quiz para "Capitais do mundo"
- **Então** o relatório da atribuição continua "Capitais", com "Perguntas (5)"

### Relatórios

#### CA-24 — A atribuição aparece aberta em Relatórios

- **Dado** uma atribuição recém-criada de "Capitais", com prazo em 3 dias
- **Quando** o criador abre Relatórios
- **Então** ela está no topo, com "Atribuição", "Termina: em 3 dias", 0 participantes e "—" no percentual
- **E** aparece também em "Relatórios mais recentes" na página inicial

#### CA-25 — Ordem da lista

- **Dado** duas atribuições abertas, uma terminando em 2 dias e outra em 5, e uma partida ao vivo acabada ontem
- **Quando** o criador abre Relatórios
- **Então** a ordem é: a que termina em 2 dias, a que termina em 5, a partida de ontem

#### CA-26 — O relatório aberto

- **Dado** o relatório de uma atribuição aberta
- **Então** o cabeçalho mostra "Atribuição", "Termina: em 3 dias", a data de início, a data de término e "Organizado por {criador}"
- **E** o Resumo mostra o anel com 0 participantes, "Convide mais participantes!", "Compartilhar atividade atribuída", o QR com "Baixar", o PIN e a URL com "Copiar", "Alterar prazo", "Encerrar agora" e "Jogue este quiz" marcado "Em breve"
- **E** os cartões Perguntas difíceis, Ajuda necessária e Não concluiu mostram os seus estados vazios

#### CA-27 — Compartilhar de novo pelo relatório

- **Dado** o relatório de uma atribuição aberta
- **Quando** o criador aciona "Compartilhar atividade atribuída"
- **Então** vê o diálogo de compartilhamento com o mesmo link e o mesmo PIN

#### CA-28 — Baixar o QR

- **Dado** o relatório de uma atribuição aberta
- **Quando** o criador aciona "Baixar" no QR
- **Então** o navegador baixa uma imagem do QR, que abre a tela da atividade

#### CA-29 — Atribuição de outro criador

- **Dado** o endereço do relatório da atribuição de outro criador
- **Quando** o criador o abre
- **Então** vê "não encontrado", como para um endereço que nunca existiu

#### CA-30 — Renomear renomeia a atividade

- **Dado** uma atribuição aberta "Capitais"
- **Quando** o criador renomeia o relatório para "Capitais — Turma A"
- **Então** o diálogo de compartilhamento e a tela do participante passam a dizer "Capitais — Turma A"

### Alterar prazo

#### CA-31 — Dar mais tempo

- **Dado** uma atribuição aberta com prazo em 3 dias
- **Quando** o criador aciona "Alterar prazo", escolhe uma data daqui a 10 dias às 9:00 e salva
- **Então** o relatório mostra a nova data de término e "Termina: em 10 dias"
- **E** a linha da lista também

#### CA-32 — Prazo fora dos limites

- **Dado** o diálogo "Alterar o prazo"
- **Então** não é possível escolher um momento passado nem um a mais de 28 dias de agora
- **E** um pedido direto com um desses prazos é recusado pelo servidor e o prazo anterior continua

#### CA-33 — Atribuição acabada não reabre

- **Dado** uma atribuição cujo prazo passou
- **Quando** o criador abre o relatório dela
- **Então** não há "Alterar prazo" nem "Encerrar agora", e a etiqueta diz "Encerrada"
- **E** um pedido direto de alterar o prazo é recusado

### Encerrar

#### CA-34 — Encerrar agora

- **Dado** uma atribuição aberta
- **Quando** o criador aciona "Encerrar agora" e confirma
- **Então** o relatório mostra "Encerrada", com a data de término no instante do encerramento
- **E** o link e o PIN levam a "Esta atividade foi encerrada"

#### CA-35 — Cancelar o encerramento

- **Dado** a confirmação "Encerrar este quiz atribuído?"
- **Quando** o criador aciona "Cancelar"
- **Então** a atribuição continua aberta

#### CA-36 — O prazo encerra sozinho

- **Dado** uma atribuição com prazo às 12:00 e ninguém com a tela aberta
- **Quando** o criador abre Relatórios às 12:05
- **Então** ela aparece acabada, com a data de término às 12:00, abaixo das atribuições abertas

#### CA-37 — Atribuição aberta não vai para a lixeira

- **Dado** uma atribuição aberta
- **Quando** o criador abre o menu da linha dela em Relatórios
- **Então** "Mover para a lixeira" está indisponível, com "Encerre a atribuição para mover o relatório para a lixeira."
- **E** depois de encerrá-la, ela pode ir para a lixeira

#### CA-38 — Excluir o quiz encerra as atribuições

- **Dado** um quiz na lixeira com uma atribuição aberta
- **Quando** o criador exclui o quiz definitivamente
- **Então** a atribuição acaba e o relatório dela continua em Relatórios
- **E** enquanto o quiz estava só na lixeira, a atribuição continuava aberta

### Participante

#### CA-39 — Abrir o link

- **Dado** uma atribuição aberta de "Capitais", criada por Ana, com prazo em 2 dias
- **Quando** alguém sem conta abre o link no celular
- **Então** vê "Atividade por Ana", "Aberto por 2 dias", "Capitais", "0 participantes" e "Não use seu nome verdadeiro"
- **E** o campo do apelido e "Ok, vamos lá!" estão marcados "Em breve" e não podem ser usados
- **E** nenhuma pergunta do quiz aparece

#### CA-40 — Entrar pelo PIN

- **Dado** a mesma atribuição, com o PIN 04352236
- **Quando** alguém digita 04352236 na entrada por PIN
- **Então** chega à mesma tela da atividade

#### CA-41 — PIN de 8 dígitos errado

- **Dado** nenhuma atribuição aberta com o PIN 11112222
- **Quando** alguém o digita
- **Então** vê a mensagem de PIN errado da spec 008, e a tentativa conta no limite por endereço

#### CA-42 — Atividade encerrada

- **Dado** uma atribuição encerrada
- **Quando** alguém abre o link ou digita o PIN dela
- **Então** vê "Esta atividade foi encerrada", com o nome dela e o caminho para a entrada por PIN

## Experiência (telas e estados)

- **Biblioteca**: na linha de um quiz publicado, ao passar o mouse ou focar, "Atribuir" (contornado) e "Organizar ao vivo" (destacado) aparecem por cima da visibilidade e da data; no celular, os dois estão no menu ⋮.
- **Página do quiz**: "Atribuir" ao lado de "Organizar ao vivo", com as mesmas condições.
- **"O quiz está pronto"**: ganha a opção "Atribuir", disponível, depois de "Organizar ao vivo".
- **Configurar atividade** (diálogo): texto, cartão do prazo com "Editar", "Mais opções" recolhível com as quatro chaves, "Cancelar" e "Criar uma tarefa". O calendário abre por cima, com mês, setas, dias indisponíveis, "Tempo" (horário), "Cancelar" e "Definir". Estados: criando (botão ocupado), erro de prazo (no cartão), erro geral (aviso).
- **Compartilhe com os participantes** (diálogo): ilustração, texto, cartão da atividade, "Compartilhar", "Adicionar participantes" (menu com os dois "Em breve"), "Copiar link" em destaque e o PIN com copiar e ajuda.
- **Relatórios**: a linha da atribuição com "Atribuição" e "Termina: …"; abertas no topo.
- **Relatório da atribuição**: cabeçalho com o bloco "Atribuição" à direita; Resumo com o cartão de convite (anel, texto, botão, QR, PIN, URL), o cartão "Alterar prazo"/"Encerrar agora", o cartão "Jogue este quiz" ("Em breve") e os três cartões da spec 015; abas Participantes e Perguntas. Diálogos "Alterar o prazo" e "Encerrar este quiz atribuído?". Estados de carregando, erro com "Tentar novamente" e "não encontrado", como na spec 015.
- **Tela da atividade** (participante, escura): aberta, com o cabeçalho "Atividade por … · Aberto por …", nome, participantes, apelido e "Ok, vamos lá!" em "Em breve"; encerrada; não encontrada (volta à entrada por PIN).

## Divergências intencionais do Kahoot

- **Sem limite de participantes nem upgrade** (RN-16, RN-24): o Kahoot grátis limita a 40 e cobra por grupos e e-mail; aqui grupos e e-mail são "Em breve", sem plano.
- **Prazo obrigatório até 28 dias** (RN-07, RN-08): o Kahoot pago permite atribuição sem prazo. Por decisão do usuário, o Quizio fica com o prazo obrigatório; os 28 dias são uma configuração documentada da instância, não um plano.
- **Opções guardadas para o criador** (RN-14): o Kahoot começa sempre dos mesmos padrões; aqui as escolhas da última atribuição são o ponto de partida, como as configurações da partida ao vivo (spec 012).
- **"Gerador de apelido" em breve** (RN-12): no Kahoot funciona; aqui depende da linha 023.
- **Abertas no topo da lista** (RN-30) e **atribuição aberta não vai para a lixeira** (RN-41): comportamento do Kahoot não confirmado; decisão do produto.
- **Etapa intermediária**: o link e o PIN levam a uma tela de espera, e "Jogue este quiz" está "Em breve", até a 029-2/2.

## Fora de escopo

- **Jogar a atribuição** (029-2/2): entrar com apelido, personagem, responder no próprio ritmo, pontuação com e sem timer, ordem das respostas por participante, retomar no mesmo aparelho, não reentrar com o mesmo apelido, tela final com pontuação e posição, e o relatório com os resultados (contas da atribuição, participantes em tempo real, "Não concluiu" de quem parou no meio). Também o limite técnico de participantes.
- **"Jogue este quiz"** funcional (029-2/2).
- **Atribuir a grupos** (Grupos, roadmap 020 e kahoot-reference §11.3) e **atribuir por e-mail** (precisa de provedor de envio).
- **Gerador de apelido** (roadmap 023).
- **Identificador do jogador** (kahoot-reference §8.1).
- **Jogar solo** (roadmap 019, segunda metade).
- Atribuição sem prazo.

## Perguntas em aberto

- [ ] **"Jogue este quiz"** — na 029-2/2, o criador joga como um participante que entra no relatório, ou numa prévia que não conta? O Kahoot é (não confirmado).
- [ ] **Pasta da 029-2/2** — o roadmap a chama de "029-2"; pode virar uma pasta própria (`030-…`) ou outra seção desta spec, quando for especificada.

## Changelog

- 2026-10-19 — spec criada, com as capturas do Kahoot enviadas pelo usuário (biblioteca com "Atribuir", "Configurar atividade", "Mais opções", calendário, "Compartilhe com os participantes", "Adicionar participantes", tela do participante, relatório da atribuição, "Alterar o prazo", "Encerrar este kahoot atribuído?"). Decisões do usuário: a atribuição é entregue em duas etapas, e esta prepara tudo até a porta do jogo; o link e o PIN já levam a uma tela de espera, e "Jogue este quiz" fica "Em breve"; prazo obrigatório de até 28 dias; "Gerador de apelido" como "Em breve"; "Atribuir" na página do quiz, na linha da biblioteca e no "O quiz está pronto".
- 2026-10-19 — spec aprovada pelo usuário.
- 2026-10-19 — spec entregue (status `done`). Escolhas feitas na implementação, dentro das regras: o link da atividade é `/assignment/{id}` e o PIN de 8 dígitos leva a ele pela entrada por PIN; um PIN de atribuição encerrada mostra "Esta atividade foi encerrada" (a mais recente que teve o PIN); "Editar" troca o corpo do diálogo pelo calendário (sem um segundo diálogo por cima), e "Alterar o prazo" usa o mesmo calendário com "Salvar"; a atividade não encontrada mostra a mensagem com "Entrar com um PIN", em vez de abrir a entrada por PIN com um aviso; o cartão de convite do relatório põe o QR, o PIN e a URL abaixo do texto, e só ao lado dele em telas muito largas. "O quiz está pronto" fecha antes de abrir "Configurar atividade".
