# Glossário — linguagem ubíqua

Termos usados em specs (PT) e no código (EN). A definição completa e as fontes estão em [`product/kahoot-reference.md`](product/kahoot-reference.md) §2. Ao introduzir um termo numa spec, acrescente-o aqui.

**Status:** ✅ existe no código · 📝 definido, ainda não implementado

## Compartilhado

| PT | EN (código) | Definição | Status |
| --- | --- | --- | --- |
| Erro de domínio | `DomainError` | Violação de regra de negócio, com `code` estável `CONTEXTO.MOTIVO` | ✅ |
| Não encontrado | `NotFoundError` | Erro de domínio para recurso inexistente ou de outro dono; a API responde `NOT_FOUND` | ✅ |
| Relógio | `Clock` | Porta que fornece o instante atual; permite testes determinísticos | ✅ |
| Gerador de IDs | `IdGenerator` | Porta que gera identificadores | ✅ |
| Armazenamento de objetos | `ObjectStorage` | Porta para arquivos binários (R2), com upload pré-assinado, cópia e exclusão | ✅ |
| Publicador em tempo real | `RealtimePublisher` | Porta servidor → clientes | ✅ |
| Assinante em tempo real | `RealtimeSubscriber` | Porta do cliente para receber eventos | ✅ |
| Texto de pesquisa | `normalizeSearchText` | Texto sem acentos, em minúsculas e com espaços colapsados, usado para pesquisar | ✅ |
| Contagem de caracteres | `characterCount` | Conta caracteres percebidos (emoji e acentos contam como 1) para todos os limites | ✅ |
| Chave de mídia | `mediaKeyFor` / `isMediaKeyOwnedBy` | `media/{ownerId}/{id}.{ext}`: todo arquivo pertence ao prefixo do dono | ✅ |

## Identidade (Better Auth)

| PT | EN (código) | Definição | Status |
| --- | --- | --- | --- |
| Criador | `Creator` (usuário do Better Auth) | Pessoa com conta que cria e organiza quizzes (spec 001) | ✅ |
| Regras de cadastro | `sign-up-rules` (`CREATOR_NAME_LENGTH`, `PASSWORD_LENGTH`) | Nome de 2 a 50 caracteres, senha de 8 a 128, e-mail normalizado (spec 001) | ✅ |
| Cadastro aberto | `signUpEnabled` / `AUTH_SIGN_UP_ENABLED` | Configuração da instância que permite ou bloqueia a criação de novas contas (spec 001) | ✅ |

## Quiz (autoria)

| PT | EN (código) | Definição | Status |
| --- | --- | --- | --- |
| Kahoot / Quiz | `Quiz` | Conteúdo jogável: metadados e lista ordenada de blocos. Chamado de "quiz" na interface do Quizio | ✅ (dados básicos; blocos 📝) |
| Dados do quiz | `QuizDetails` | Título, descrição e visibilidade validados juntos (spec 001) | ✅ |
| Dono | `ownerId` | Criador a quem o quiz pertence; único que pode vê-lo e alterá-lo (spec 001) | ✅ |
| Título | `title` | Nome do quiz, ≤ 95 caracteres; opcional no rascunho, exibido como "Quiz sem título" (spec 001) | ✅ |
| Descrição | `description` | Texto opcional do quiz, ≤ 500 caracteres (spec 001) | ✅ |
| Capa | `coverImageKey` / `coverImageUrl` | Imagem opcional do quiz, segue a política de mídia (spec 001) | ✅ |
| Alteração de capa | `CoverChange` | `keep`, `set` (nova chave) ou `remove` ao editar os dados (spec 001) | ✅ |
| Última modificação | `updatedAt` | Instante da criação ou da última alteração dos dados do quiz (spec 001) | ✅ |
| Rascunho | `status: "draft"` | Quiz que nunca foi salvo como versão jogável (spec 006) | ✅ |
| Visibilidade | `QuizVisibility` | `private`, `unlisted` (spec 001); `public` com a descoberta pública | ✅ (`public` 📝) |
| Bloco | `Block` | Item da lista: pergunta ou slide | 📝 |
| Pergunta | `Question` | Bloco interativo com texto (≤ 160), tipo, tempo limite e pontos | ✅ |
| Enunciado | `text` | Texto da pergunta, ≤ 160 caracteres (120 no Kahoot); pode ficar vazio no rascunho (spec 003) | ✅ |
| Pergunta em branco | `blankQuestion` | Pergunta Quiz recém-criada, sem enunciado; todo quiz novo nasce com uma (spec 003) | ✅ |
| Posição | `position` | Ordem da pergunta no quiz, que é a ordem de apresentação na partida (spec 003) | ✅ |
| Limite de perguntas | `QUIZ_MAX_QUESTIONS` | Máximo de 200 perguntas por quiz, configurável (spec 003) | ✅ |
| Editor | `Creator` (rota `/creator/:id`) | Tela cheia onde o criador monta as perguntas de um quiz (spec 003) | ✅ |
| Salvamento automático | `Autosave` | Toda alteração no editor é salva sem ação do criador; o cabeçalho mostra "Salvando…", "Salvo" ou a falha (spec 003) | ✅ (`SaveTracker`) |
| Tipo de pergunta | `QuestionType` | `quiz`, `trueFalse`, `typeAnswer`, `slider`, `pinAnswer`, `puzzle`, `poll`, `scale`, `nps`, `dropPin`, `wordCloud`, `openEnded`, `brainstorm` | ✅ (`quiz`, `trueFalse`; demais 📝) |
| Verdadeiro ou falso | `trueFalse`, `TrueFalseQuestion` | Tipo de pergunta com duas alternativas fixas, "Verdadeiro" (azul, losango) e "Falso" (vermelho, triângulo), e exatamente uma correta; desmarcar a correta marca a outra (spec 005) | ✅ |
| Seletor de tipo | `QuestionTypePicker` | Escolha do tipo ao adicionar uma pergunta; mostra só os tipos já entregues (spec 005) | ✅ |
| Troca de tipo | `QuestionChange` `kind: "type"`, `changeQuestionType` | Mudar o tipo de uma pergunta existente: mantém enunciado, tempo, pontos e posição, e substitui as respostas pelas do novo tipo (spec 005) | ✅ |
| Respostas lembradas | `RememberedContents`, `typeChangeFor` | O que a pergunta tinha em cada tipo, guardado só enquanto o criador está no editor, para desfazer uma troca de tipo; não é salvo (spec 005) | ✅ |
| Conteúdo do tipo | `QuestionContent`, `questionContent` | A parte da pergunta que é própria do tipo: alternativas e seleção no Quiz, a correta no Verdadeiro ou falso (ADR 0008, spec 005) | ✅ |
| Slide | `Slide` | Bloco só de conteúdo, com layout; sem resposta nem pontos | 📝 |
| Alternativa | `Choice` (`AnswerOption` na UI) | Opção de resposta (texto ≤ 75 ou imagem) com flag de correta; 4 ou 6 espaços em posições fixas, id = posição (spec 004) | ✅ (texto; imagem 📝) |
| Resposta correta | `correct` | Marca da alternativa certa; alternativa vazia nunca é correta (spec 004) | ✅ |
| Respostas extras | `extraChoices` | Espaços 5 e 6, mostrados e removidos juntos (spec 004) | ✅ |
| Pontos da pergunta | `QuestionPoints` | `standard`, `double` ou `noPoints` (spec 004) | ✅ |
| Mudança de pergunta | `QuestionChange`, `applyQuestionChange` | Uma edição de pergunta, aplicada com as regras do core no servidor e no cliente, com aviso opcional (`QuestionChangeNotice`) (spec 004) | ✅ |
| Pergunta incompleta | `questionIssues`, `QuestionIssue` | Sem enunciado, com menos de 2 respostas ou sem correta; continua salva, com alerta na lista (spec 004) | ✅ |
| Forma da alternativa | `AnswerShape` | Triângulo, losango, círculo, quadrado, pentágono e triângulo invertido — sempre com a cor correspondente | ✅ (UI) |
| Opções de resposta | `SelectionMode` | `single` (seleção simples) ou `multiple` (múltipla escolha) (spec 004) | ✅ |
| Tempo limite | `timeLimitSeconds`, `TIME_LIMITS_SECONDS` | Janela de resposta: 5, 10, 15, 20, 30, 45, 60, 90, 120, 180 ou 240 s; padrão 20 s (spec 004) | ✅ |
| Tempo de leitura | `ReadTime` | Pergunta exibida sem alternativas antes da resposta (≥ 5 s) | 📝 |
| Pontos da pergunta | `PointsMultiplier` | `standard` (1000), `double` (2000), `noPoints` (0) | ✅ |
| Versão jogável | `QuizVersion`, `newQuizVersion` (tabela `quiz_version`) | Cópia congelada da lista de perguntas, criada pelo Salvar do editor e numerada a partir de 1; é o que uma partida usa (spec 006) | ✅ |
| Publicado | `status: "published"`, `publishedVersion`, `publishedAt` | Quiz que tem uma versão jogável; não volta a rascunho (spec 006) | ✅ |
| Salvar (versão jogável) | `publishQuiz` | Ação do editor que confere título e perguntas e congela a versão jogável; diferente do salvamento automático (spec 006) | ✅ |
| Alterações não salvas | `hasUnpublishedChanges`, `sameQuestionLists` | Quiz publicado cuja lista de perguntas atual difere, em ordem ou conteúdo, da versão jogável (spec 006) | ✅ |
| Descartar alterações | `discardQuizChanges` | Fazer a lista de perguntas voltar a ser a da versão jogável (spec 006) | ✅ |
| Estado de publicação | `QuizPublishState`, `quizPublishState` | O que o selo de status mostra: `draft` ("Rascunho"), `published` ("Publicado") ou `unpublishedChanges` ("Alterações não salvas") (spec 006) | ✅ |
| Perguntas incompletas | `incompleteQuestions`, `missingAnswerCount` | Lista, na ordem do quiz, das perguntas que impedem o Salvar, com os motivos de cada uma (spec 006) | ✅ |
| Toques finais | `withFinishingTouches` (`details` do `publishQuiz`) | Título e descrição pedidos pelo Salvar quando o quiz ainda não tem título (spec 006) | ✅ |
| Imagem da pergunta | `QuestionImage` | Imagem opcional de uma pergunta de qualquer tipo, segue a política de mídia; faz parte da versão jogável (spec 007) | ✅ |
| Posição da imagem | `placement` | `media` (ao centro, na área de mídia; padrão) ou `background` (fundo da pergunta inteira) (spec 007) | ✅ |
| Recorte | `ImageCrop` | Enquadramento da imagem ao centro: forma `landscape` (3:2), `portrait` (2:3), `square` ou `circle`, com zoom e posição; não altera o arquivo (spec 007) | ✅ |
| Texto alternativo | `altText` | Descrição opcional da imagem para leitores de tela, até 1000 caracteres (spec 007) | ✅ |
| Imagens em uso | `imageKeysOf`, `releaseUnusedImages` | Os arquivos de imagem de um quiz: um só é apagado quando nenhuma pergunta viva e nenhuma versão guardada o usa (spec 007) | ✅ |

## Game (partida ao vivo)

| PT | EN (código) | Definição | Status |
| --- | --- | --- | --- |
| Partida ao vivo | `Game` | Instância de apresentação de um quiz: usa a versão jogável e o título do momento em que é criada; no máximo uma aberta por quiz (spec 008) | ✅ |
| Modo de jogo | `GameMode` | `classic`, `team`, … | 📝 |
| PIN do jogo | `GamePin` | Código de 6 dígitos, sem zero à esquerda, único entre as partidas abertas; vale até a partida ser encerrada ou completar 8 horas (spec 008) | ✅ |
| Opções de jogo | `GameOptions` | O que o anfitrião ajusta no painel de Configurações: mostrar perguntas nos dispositivos, perguntas e respostas em ordem aleatória; salvas por criador (spec 012). Gerador de apelidos, reprodução automática e música chegam na spec 014 | ✅ |
| Entrada durante o jogo | `lateJoin` | Entrar numa partida em andamento, enquanto a entrada não está bloqueada: 0 pontos, jogando a partir da próxima pergunta cujas respostas ainda não abriram (spec 012). O jogador guarda a primeira pergunta que pode responder (`Player.firstQuestionIndex`); enquanto a pergunta em curso é anterior a ela, o celular espera (`sittingOut`) | ✅ |
| Preferências do anfitrião | `HostPreferences` | As opções de jogo que o criador deixou na última partida; a próxima começa com elas. O bloqueio não entra (spec 012) | ✅ |
| Lobby | `Lobby` | Sala de espera antes do início: PIN, QR, link, lista e total de jogadores (spec 008) | ✅ |
| Organizar ao vivo | `hostGame` (`game.host`) | Ação do dono de um quiz publicado que cria a partida e abre o lobby (spec 008) | ✅ |
| Link de entrada | `joinLink` | Endereço `/join/{PIN}`, também contido no QR code, que leva o jogador direto à etapa do apelido (spec 008) | ✅ |
| Entrada bloqueada | `locked` | Estado da partida em que ninguém novo entra; quem já entrou permanece (spec 008) | ✅ |
| Remover participante | `removePlayer` | O anfitrião tira um jogador da partida; o apelido removido fica bloqueado nela (spec 008) | ✅ |
| Encerrar o jogo | `endGame`, `GameEndReason` | Fecha a partida: o PIN deixa de funcionar e os jogadores são avisados (spec 008) | ✅ |
| Conexão perdida | `isConnectionFailure`, `useConnectionWatch` | A tela (do anfitrião ou do jogador) não consegue falar com o servidor; ela avisa e tenta de novo sozinha a cada 5 s. Uma resposta de erro do servidor não é falta de conexão (spec 013) | ✅ |
| Anfitrião ausente | `isHostAway`, `Game.hostSeenAt`, `hostIdleMs` | A tela do anfitrião está há 10 s sem dar sinal ao servidor (queda ou aba fechada); os celulares avisam "O anfitrião se desconectou". O jogo não avança, mas os prazos correm e as respostas valem (spec 013) | ✅ |
| Limite de jogadores | `GAME_MAX_PLAYERS` | Máximo de 200 jogadores por partida, técnico e configurável (spec 008) | ✅ |
| Jogador | `Player` | Participante anônimo identificado por apelido na partida; pertence ao navegador em que entrou (spec 008) | ✅ |
| Apelido | `Nickname` | Nome do jogador na partida: 1 a 15 caracteres, único sem diferenciar maiúsculas e acentos, fixo depois de entrar (spec 008) | ✅ |
| Anfitrião | `Host` | Criador que conduz a partida; é o dono do quiz (spec 008) | ✅ |
| Estado da partida | `GameStatus` | `lobby` → `playing` → `finished`, ou `ended` quando é encerrada antes do fim (specs 008 e 009) | ✅ |
| Iniciar | `startGame` | Passa a partida do lobby para em andamento; exige ao menos um jogador, fecha a entrada e copia as perguntas da versão jogável (spec 009) | ✅ |
| Andamento | `GameProgress` | Onde a partida está: pergunta, fase e desde quando. O prazo da fase é esse instante mais a duração dela (spec 009) | ✅ |
| Pergunta da partida | `GameQuestion` | A pergunta como a partida a usa, copiada ao iniciar: só as alternativas preenchidas, cada uma com a posição de cor e forma (spec 009) | ✅ |
| Palco público | `PublicStage` | A parte de uma fase que todo aparelho pode saber: número da pergunta, fase, duração e formas das alternativas; nunca a correta (spec 009). Com "Mostrar perguntas nos dispositivos", leva também o enunciado, a imagem e os textos das alternativas (spec 012) | ✅ |
| Fase | `GamePhase` | `gameIntro` (abertura da partida, 3 s) → `questionIntro` (5 s de leitura) → `answering` (limite de tempo da pergunta) → `results` → `scoreboard` (placar, até o anfitrião avançar; a última pergunta não tem, vai direto ao pódio) | ✅ |
| Avançar de fase | `advanceGame`, `StageRef` | Pedido da tela do anfitrião para a fase seguinte, dizendo de que fase parte; o servidor confere o prazo e aplica uma única vez (spec 009) | ✅ |
| Pular o cronômetro | `advanceGame` com `skip` | O anfitrião fecha a fase de respostas antes do tempo (spec 009) | ✅ |
| Resposta | `Answer` | Envio de um jogador para uma pergunta: uma por pergunta, sem troca, aceita só dentro do prazo (spec 009) | ✅ |
| Tempo de resposta | `ResponseTime` | Instante do envio − abertura das respostas, medido no servidor | ✅ (`responseTimeMs`) |
| Correção | `Correctness` | `correct`, `partiallyCorrect` (múltipla escolha: parte das certas, nenhuma errada), `wrong`; sem resposta é `timeout` (`PlayerResult`, spec 009). `almostCorrect` chega com outros tipos | ✅ |
| Pontuação da resposta | `AnswerScore` | Pontos pela fórmula de velocidade; cheia abaixo de 0,5 s; por alternativa correta marcada na múltipla escolha; gravada com a resposta (spec 010) | ✅ (`calculateAnswerScore`, `answerPoints`) |
| Sequência de acertos | `AnswerStreak` | Perguntas seguidas com resposta correta ou parcialmente correta; zera com erro ou sem resposta; apenas exibida, não dá pontos (spec 010) | ✅ (`streakAfter`) |
| Total de pontos | `totalScore` | Soma dos pontos das respostas de um jogador na partida; divulgado só a partir da revelação (spec 010) | ✅ |
| Posição | `rank` | Lugar do jogador pelo total de pontos; empate pela ordem de entrada na partida (spec 010) | ✅ (`rankPlayers`) |
| Distribuição de respostas | `AnswerDistribution` | Quantos escolheram cada alternativa; divulgada só na revelação (spec 009) | ✅ |
| Placar | `Scoreboard` | Fase depois da revelação de cada pergunta: os cinco primeiros, com apelido e total, e a seta em quem subiu de posição (spec 010) | ✅ (`scoreboardOf`) |
| Pódio | `Podium` | Tela do fim da partida: os três primeiros da classificação final, revelados do 3º para o 1º; não é uma fase, é a leitura de uma partida terminada (spec 011) | ✅ (`HostGameView.final`, `podiumRevealRemainingMs`) |
| Classificação final | `finalStandings` | Todos os jogadores da partida terminada, pelo total de pontos, com o empate pela ordem de entrada; não muda mais (spec 011) | ✅ (`final.standings`) |
| Jogar novamente | `playAgain` | Ação do pódio: cria uma partida nova do mesmo quiz, com outro PIN e sem jogadores (spec 011) | ✅ (`game.host`, `usePlayAgain`) |
| Equipe | `Team` | Grupo de jogadores; pontuação = média dos membros | 📝 |

## Library, Reports, Media

| PT | EN (código) | Definição | Status |
| --- | --- | --- | --- |
| Página inicial | `Home` | Painel de entrada do criador em `/`: saudação, quizzes mais recentes e cartões do que vem a seguir (spec 002) | ✅ |
| Navegação principal | `MainNav` | Navegação comum às telas do criador: Início, Biblioteca, Relatórios, Descobrir, Grupos (spec 002) | ✅ |
| Em breve | `comingSoon` | Marcação de um ponto de entrada de feature ainda não entregue: visível, sem link e anunciado como indisponível (spec 002) | ✅ |
| Biblioteca | `Library` / `listLibrary` | Quizzes do usuário por seção, com pesquisa; depois favoritos, compartilhados e pastas | ✅ (seções da spec 001) |
| Seção da biblioteca | `LibrarySection` | `recent`, `drafts`, `trash` (spec 001); exibidas como abas desde a spec 002 | ✅ |
| Item da biblioteca | `LibraryItem` / `LibraryQuizRecord` | Projeção de leitura de um quiz na listagem (spec 001) | ✅ |
| Lixeira | `trashedAt` | Quizzes excluídos, restauráveis; no Quizio inclui rascunhos (spec 001) | ✅ |
| Mover para a lixeira | `moveQuizToTrash` | Excluir de forma reversível (spec 001) | ✅ |
| Restaurar | `restoreQuiz` | Devolver um quiz da lixeira à biblioteca (spec 001) | ✅ |
| Excluir definitivamente | `deleteQuizPermanently` | Remover de forma irreversível um quiz da lixeira, com sua capa (spec 001) | ✅ |
| Duplicar | `duplicateQuiz` | Criar um rascunho independente com os dados e uma cópia da capa de outro quiz (spec 001) | ✅ |
| Pasta | `Folder` | Organização de quizzes | 📝 |
| Favorito | `Favorite` | Marcação para acesso rápido | 📝 |
| Relatório | `Report` | Resultado consolidado de uma partida | 📝 |
| Pergunta difícil | `DifficultQuestion` | Acertada por menos de 35% dos participantes | 📝 |
| Mídia | `Media` | Arquivo enviado pelo usuário (imagem) | ✅ |
| Política de mídia | `MediaPolicy` | Tipos aceitos (JPEG, PNG, GIF, WebP) e tamanho máximo (10 MB) | ✅ |
| Upload pré-assinado | `PresignedUpload` | URL temporária para o navegador enviar direto ao storage | ✅ |
