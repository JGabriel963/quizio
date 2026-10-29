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
| Foto do perfil | `ProfilePhoto` | Foto opcional do criador, carregada no Quizio e recortada em círculo; sem ela, o ícone padrão (spec 039) | ✅ |
| Perfil | `CreatorProfile` | Página de um criador com a foto, o nome, os números e os quizzes públicos, vista por quem tem conta (spec 039) | ✅ |
| Página do quiz público | `PublicQuizPage` | A página de um quiz Público para quem não é o dono: jogar, atribuir ou duplicar (spec 039) | ✅ |
| Feedback de exclusão | `AccountDeletionFeedback` | Motivo e texto opcional de quem excluiu a conta, guardados sem ligação com ela (spec 039) | ✅ |

## Agentes de IA (MCP)

| PT | EN (código) | Definição | Status |
| --- | --- | --- | --- |
| Servidor MCP | `createQuizioMcpServer` | O endereço `/mcp` do Quizio que os agentes de IA usam, pelo Model Context Protocol, para agir na conta de uma pessoa com as mesmas regras das telas (spec 044) | ✅ |
| Agente de IA | `AgentIdentity` (quem ele representa) | O aplicativo de IA da pessoa que se conecta ao servidor MCP: ChatGPT, Claude, Codex, Cursor, VS Code, Gemini CLI ou outro compatível (spec 044) | ✅ |
| Ferramenta | `ToolDefinition` (`defineTool`) | Cada ação que o servidor MCP oferece ao agente, com nome, descrição, regras e a marca de leitura ou destrutiva (spec 044) | ✅ (60 ferramentas: quizzes, perguntas, arquivos, temas, biblioteca, conta, partida ao vivo até o lobby, atribuições, relatórios, grupos, mural e notificações) |
| Conexão de agente | `AgentConnection` | Autorização dada pela pessoa a um agente com o Permitir da tela "Conectar ao Quizio"; listada em Agentes de IA com o último uso; deixa de valer com 90 dias sem uso (spec 044) | ✅ |
| Chave de acesso | `AccessKey` | Segredo criado em Agentes de IA para agentes que só aceitam uma chave fixa; mostrado uma única vez, até 20 ativas por pessoa, vale até ser revogado (spec 044) | ✅ |
| Ação destrutiva | `ToolKind` `destructive` | Ferramenta irreversível, marcada para o agente pedir confirmação à pessoa antes de usá-la (spec 044) | ✅ |

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
| Visibilidade | `QuizVisibility` | `private` ou `public` (spec 039, que tirou o `unlisted` da spec 001); `public` = aparece no perfil do dono | ✅ |
| Bloco | `Block` | Item da lista: pergunta ou slide | 📝 |
| Pergunta | `Question` | Bloco interativo com texto (≤ 160), tipo, tempo limite e pontos | ✅ |
| Enunciado | `text` | Texto da pergunta, ≤ 160 caracteres (120 no Kahoot); pode ficar vazio no rascunho (spec 003) | ✅ |
| Pergunta em branco | `blankQuestion` | Pergunta Quiz recém-criada, sem enunciado; todo quiz novo nasce com uma (spec 003) | ✅ |
| Posição | `position` | Ordem da pergunta no quiz, que é a ordem de apresentação na partida (spec 003) | ✅ |
| Limite de perguntas | `QUIZ_MAX_QUESTIONS` | Máximo de 200 perguntas por quiz, configurável (spec 003) | ✅ |
| Editor | `Creator` (rota `/creator/:id`) | Tela cheia onde o criador monta as perguntas de um quiz (spec 003) | ✅ |
| Salvamento automático | `Autosave` | Toda alteração no editor é salva sem ação do criador; o cabeçalho mostra "Salvando…", "Salvo" ou a falha (spec 003) | ✅ (`SaveTracker`) |
| Tipo de pergunta | `QuestionType` | `quiz`, `trueFalse`, `typeAnswer`, `slider`, `pinAnswer`, `puzzle`, `poll`, `scale`, `nps`, `dropPin`, `wordCloud`, `openEnded`, `brainstorm` | ✅ (`quiz`, `trueFalse`, `typeAnswer`, `slider`, `puzzle`; demais 📝) |
| Resposta curta | `typeAnswer`, `TypeAnswerQuestion` | Tipo de pergunta em que o jogador digita a resposta; correta quando, normalizada, é igual a uma das respostas aceitas; pontua pela velocidade como o Quiz (spec 031) | ✅ |
| Respostas aceitas | `acceptedAnswers` | De 1 a 4 textos de até 20 caracteres que valem como resposta correta numa Resposta curta; a primeira é a principal (spec 031) | ✅ |
| Controle deslizante | `slider`, `SliderQuestion` | Tipo de pergunta em que o jogador arrasta um marcador numa escala de números para estimar um valor; correta quando igual à resposta, quase correta dentro da margem; pontua 80% pela precisão e 20% pela velocidade (spec 032) | ✅ |
| Mínimo, máximo e resposta do controle | `min`, `max`, `answer` | Números com até 2 casas decimais, negativos permitidos, de até 10 caracteres; a resposta fica entre o mínimo e o máximo (spec 032) | ✅ |
| Unidade | `unit` | Texto opcional de até 20 caracteres mostrado abaixo do número no controle deslizante (spec 032) | ✅ |
| Valor da etapa | `step` | Distância entre posições vizinhas da escala: faixa ÷ 100 arredondada para cima no primeiro algarismo, no mínimo 1; as posições contam a partir da resposta (spec 032) | ✅ |
| Margem de resposta | `answerMargin` | `none`, `low` (5% da faixa), `medium` (10%), `high` (20%), `maximum` (toda a escala): distância da resposta que ainda vale como quase correta (spec 032) | ✅ |
| Precisão | `precision` | De 0 a 1: 1 − distância ÷ margem; dá 80% dos pontos do controle deslizante (spec 032) | ✅ |
| Puzzle | `puzzle`, `PuzzleQuestion` | Tipo de pergunta em que o jogador põe 3 ou 4 respostas embaralhadas na ordem certa; correta só com a ordem inteira certa; pontua pela velocidade como o Quiz (spec 033) | ✅ |
| Ordem certa | `correctOrder` | A ordem das respostas preenchidas de um Puzzle, de cima para baixo no editor; respostas iguais podem trocar de lugar (spec 033) | ✅ |
| Ordem sorteada | `GameQuestion.choices` (por `shapeIndex`), `Player.choiceOrder` | A ordem em que as respostas de um Puzzle chegam na partida: uma por partida ao vivo, uma por participante na atribuição, nunca uma ordem certa (spec 033) | ✅ |
| Normalização da resposta | `normalizeTypedAnswer` | Forma usada para comparar respostas digitadas: sem diferença de maiúsculas e acentos, sem a pontuação da lista do Kahoot, com espaços colapsados, e emojis só quando não há outro texto (spec 031) | ✅ |
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
| Assistente de criação | `QuizAssistant` | Janela do editor que cria perguntas com IA a partir de um assunto ou de um PDF, para o criador revisar e adicionar; só existe com um provedor de IA configurado (spec 027) | ✅ |
| Fonte da criação | `GenerationSource` | `topic` (assunto, texto colado ou instruções) ou `pdf` (páginas escolhidas de um PDF) (spec 027) | ✅ |
| Opções da criação | `GenerationOptions` | Formato, idioma, nível de habilidade e duração; lembradas por criador (spec 027) | ✅ |
| Formato da criação | `GenerationFormat` | `quiz`, `trueFalse`, `mixed` ou, só com PDF, `extract` (spec 027) | ✅ |
| Extrair perguntas | `extract` | Transcrever as perguntas objetivas que um PDF já contém, em vez de criar novas (spec 027) | ✅ |
| Nível de habilidade | `SkillLevel` | `beginner`, `intermediate` (padrão) ou `advanced` (spec 027) | ✅ |
| Duração da criação | `questionCount` | Quantidade aproximada de perguntas pedidas: cerca de 5, 10, 20 (padrão) ou 30 (spec 027) | ✅ |
| Pergunta criada | `GeneratedQuestion` | Pergunta Quiz ou Verdadeiro ou falso devolvida pela IA, válida pelas regras do editor; fica no assistente até ser adicionada (spec 027) | ✅ |
| Feita com IA | `aiGenerated` | Marca de uma pergunta adicionada pelo assistente, mostrada com um ícone de brilho na lista; fica ao editar e ao duplicar, não vai para a partida (spec 027) | ✅ |
| Cota de criações | `GenerationQuota` | Criações com IA permitidas por criador a cada 24 horas (janela móvel), 20 por padrão, configurável, mais um teto para a instância inteira; só não contam as falhas em que o provedor não respondeu (spec 027). A spec 045 a troca por créditos | ✅ |
| Crédito de IA | `credits` (`creditsOf`) | Unidade do custo de uma criação, calculada do uso real informado pelo provedor (entrada e saída, a saída pesando mais); com os pesos padrão, uma criação curta por assunto custa cerca de 1 (spec 045) | ✅ |
| Orçamento de créditos | `AssistantSettings.creditsPerDay` | Créditos de cada criador a cada 24 horas (janela móvel), 20 por padrão, configurável; os de uma criação voltam 24 horas depois dela (spec 045) | ✅ |
| Estimativa da criação | `CreditEstimate` (`estimateGeneration`) | O máximo que uma criação pode cobrar, mostrado antes do Crie e reservado ao criar; a cobrança é o uso real, nunca acima dela (spec 045) | ✅ |
| Teto da instância | `AssistantSettings.instanceCreditsPerDay` | Créditos de todos os criadores juntos a cada 24 horas, 200 por padrão, configurável; soma o uso real e só aparece quando é atingido (spec 045) | ✅ |
| Pesos dos créditos | `CreditPricing` | Créditos por mil tokens de entrada e de saída, configuráveis pela instância conforme o preço do modelo (spec 045) | ✅ |
| Tema | `Theme` | Aparência das telas de jogo e do centro do editor: fundo, cor de destaque e tom; os prontos vêm de um catálogo próprio, gratuito (spec 042) | ✅ |
| Tema do quiz | `Quiz.themeId` | Tema escolhido no editor, salvo ao escolher e fora da versão jogável; Padrão quando não há outro (spec 042) | ✅ |
| Tom do tema | `ThemeTone` | `dark` ou `light`; num tema claro o texto sobre o fundo fica escuro (spec 042) | ✅ |
| Tema padrão | `standard` | O roxo de sempre do Quizio; vale para os quizzes e partidas de antes dos temas e para temas que saíram do catálogo (spec 042) | ✅ |
| Tema personalizado | `CustomTheme` | Tema criado por um criador em "Seus temas": nome, fundo, cor de contraste e logotipo opcional; editá-lo muda os quizzes que o usam, não as partidas já criadas (spec 043) | ✅ |
| Seus temas | — | Seção do painel "Temas" com os temas personalizados do criador e o "+" que abre "Crie seu tema" (spec 043) | ✅ |
| Cor de contraste | `accentColor` | Cor de destaque de um tema personalizado, usada nos apelidos do lobby e nos blocos do pódio; precisa deixar o texto a 4,5:1 (spec 043) | ✅ |
| Padrão de fundo | `BackgroundPattern` | Um dos 4 desenhos geométricos do Quizio para o fundo de um tema personalizado, pintado na cor do fundo escolhida (spec 043) | ✅ |
| Logotipo do tema | `logo` | Imagem opcional de um tema personalizado, mostrada nas telas do anfitrião no lugar do nome do Quizio (spec 043) | ✅ |

## Game (partida ao vivo)

| PT | EN (código) | Definição | Status |
| --- | --- | --- | --- |
| Partida ao vivo | `Game` | Instância de apresentação de um quiz: usa a versão jogável e o título do momento em que é criada; no máximo uma aberta por quiz (spec 008) | ✅ |
| Modo de jogo | `GameMode` | `classic`, `team`, … | 📝 |
| PIN do jogo | `GamePin` | Código de 6 dígitos, sem zero à esquerda, único entre as partidas abertas; vale até a partida ser encerrada ou completar 8 horas (spec 008) | ✅ |
| Opções de jogo | `GameOptions` | O que o anfitrião ajusta no painel de Configurações: mostrar perguntas nos dispositivos, perguntas e respostas em ordem aleatória; salvas por criador (spec 012). A reprodução automática chega na spec 014; gerador de apelidos e música, em specs próprias | ✅ |
| Reprodução automática | `GameOptions.autoplay`, `Game.autoplaySince` | Opção de jogo: a partida começa sozinha 15 s depois da última entrada no lobby, e a revelação e o placar avançam sozinhos em 5 s. A tela do anfitrião continua sendo quem pede cada avanço (spec 014) | ✅ |
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
| Avatar | `Avatar` | Personagem e acessório opcional do jogador, sorteado ao entrar (ou o último que o navegador escolheu) e trocável enquanto ele espera para jogar; aparece ao lado do apelido (spec 028) | ✅ (`Avatar`, `drawAvatar`, `changePlayerAvatar`) |
| Personagem | `character` | Rosto de bicho ou criatura do catálogo fixo do Quizio; parte obrigatória do avatar (spec 028) | ✅ (`CHARACTER_IDS`) |
| Acessório | `accessory` | Chapéu, óculos ou enfeite do catálogo, desenhado sobre o personagem; opcional ("Nenhum") (spec 028) | ✅ (`ACCESSORY_IDS`) |
| Personagens dos jogadores | `GameOptions.gameCharacters` | Opção de jogo, ligada por padrão e salva para o criador: desligada, as telas mostram só o apelido e ninguém troca de avatar; os avatares continuam guardados (spec 028) | ✅ |
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
| Correção | `Correctness` | `correct`, `partiallyCorrect` (múltipla escolha: parte das certas, nenhuma errada), `wrong`; sem resposta é `timeout` (`PlayerResult`, spec 009). `almostCorrect` (controle deslizante: dentro da margem, conta como acerto, spec 032) | ✅ |
| Pontuação da resposta | `AnswerScore` | Pontos pela fórmula de velocidade; cheia abaixo de 0,5 s; por alternativa correta marcada na múltipla escolha; gravada com a resposta (spec 010) | ✅ (`calculateAnswerScore`, `answerPoints`) |
| Sequência de acertos | `AnswerStreak` | Perguntas seguidas com resposta correta ou parcialmente correta; zera com erro ou sem resposta; apenas exibida, não dá pontos (spec 010) | ✅ (`streakAfter`) |
| Total de pontos | `totalScore` | Soma dos pontos das respostas de um jogador na partida; divulgado só a partir da revelação (spec 010) | ✅ |
| Posição | `rank` | Lugar do jogador pelo total de pontos; empate pela ordem de entrada na partida (spec 010) | ✅ (`rankPlayers`) |
| Distribuição de respostas | `AnswerDistribution` | Quantos escolheram cada alternativa; divulgada só na revelação (spec 009) | ✅ |
| Placar | `Scoreboard` | Fase depois da revelação de cada pergunta: os cinco primeiros, com apelido e total, e a seta em quem subiu de posição (spec 010) | ✅ (`scoreboardOf`) |
| Pódio | `Podium` | Tela do fim da partida: os três primeiros da classificação final, revelados do 3º para o 1º; não é uma fase, é a leitura de uma partida terminada (spec 011) | ✅ (`HostGameView.final`, `podiumRevealRemainingMs`) |
| Classificação final | `finalStandings` | Todos os jogadores da partida terminada, pelo total de pontos, com o empate pela ordem de entrada; não muda mais (spec 011) | ✅ (`final.standings`) |
| Jogar novamente | `playAgain` | Ação do pódio: cria uma partida nova do mesmo quiz, com outro PIN e sem jogadores (spec 011) | ✅ (`game.host`, `usePlayAgain`) |
| Revisar respostas | `reviewTypedAnswers`, `openAnswerReview`, `AnswerReview` | Na revelação de uma Resposta curta, o anfitrião marca respostas enviadas como corretas ou incorretas; a correção e os pontos de quem as enviou são refeitos, e a partida vai direto ao placar. Só enquanto a revelação está na tela (spec 031) | ✅ |
| Respostas parecidas | `isSimilarAnswer` | Respostas erradas a até 2 letras de diferença de uma correta, com ao menos 4 caracteres; aparecem primeiro na revisão (spec 031) | ✅ |
| Tema da partida | `Game.themeId` | Tema copiado do quiz quando a partida ou a atribuição é criada; não muda depois (spec 042) | ✅ |
| Equipe | `Team` | Grupo de jogadores; pontuação = média dos membros | 📝 |

## Atribuição (assignment)

| PT | EN (código) | Definição | Status |
| --- | --- | --- | --- |
| Atribuição | `Assignment` | Sessão de um quiz que cada participante joga no próprio ritmo, sem anfitrião, até o prazo; usa a versão jogável e o título do momento em que é criada; várias por quiz, independentes da partida ao vivo; é um relatório desde que é criada (spec 029) | ✅ |
| Prazo | `Assignment.deadline` | Data e hora cheia em que a atribuição acaba; obrigatório, depois de agora e até 28 dias à frente (configuração da instância); pode ser alterado enquanto ela está aberta (spec 029) | ✅ |
| PIN da atribuição | `AssignmentPin` | Código de 8 dígitos, que pode começar com zero, único entre as atribuições abertas; vale até a atribuição acabar (spec 029) | ✅ |
| Encerrar agora (atribuição) | `endAssignment` | Acaba a atribuição na hora, de forma irreversível: o link e o PIN deixam de levar ao jogo (spec 029) | ✅ |
| Opções da atribuição | `AssignmentOptions` | Personagens (`gameCharacters`), Timer da pergunta (`questionTimer`) e Ordem aleatória de respostas (`randomizeAnswers`), guardadas na atribuição e lembradas para o criador à parte das da partida ao vivo; Gerador de apelido "Em breve" (spec 029) | ✅ |
| Timer da pergunta | `AssignmentOptions.questionTimer` | Ligado, as perguntas da atribuição têm tempo e a resposta mais rápida vale mais; desligado, não há contagem nem redução por tempo (spec 029; efeito na spec 030) | ✅ |
| Jogar a atribuição | `AssignmentPlay` | O participante joga sozinho, no próprio ritmo, todas as perguntas da atividade, avançando com as setas; sem anfitrião e sem jogadores virtuais (spec 030) | ✅ |
| Andamento do participante | `ParticipantProgress` | Em que pergunta e em que tela cada participante de uma atribuição está, e desde quando a pergunta foi mostrada a ele; guardado no servidor (spec 030) | ✅ |
| Capa da atividade | `AssignmentCover` | A primeira tela do link: capa do quiz, número de perguntas, nome e "Iniciar" (spec 030) | ✅ |
| Pontuações (atribuição) | `assignmentScoreboard` | Classificação dos participantes da atribuição pelo total atual de cada um: os cinco primeiros e a linha de quem vê (spec 030) | ✅ |
| Tela da atividade | `AssignmentLanding` | O que o participante vê ao abrir o link ou digitar o PIN: de quem é, até quando fica aberta, quantos participantes; ou "Esta atividade foi encerrada" (spec 029) | ✅ |

## Grupos (groups)

| PT | EN (código) | Definição | Status |
| --- | --- | --- | --- |
| Grupo | `Group` | Espaço de um administrador e seus membros para reunir publicações, quizzes compartilhados e atividades; visível só para os membros; nome de 1 a 20 caracteres (spec 034) | ✅ |
| Papel no grupo | `GroupRole` | `admin` (o criador, único por grupo) ou `member` (quem entrou pelo convite) (spec 034) | ✅ |
| Membro do grupo | `GroupMember` | Usuário com conta que pertence ao grupo; o administrador também conta como membro (spec 034) | ✅ |
| Link de convite | `Group.inviteCode` / `groupInviteLink` | Link com um código secreto, um válido por grupo, sem prazo e para quantas pessoas o abrirem; só o administrador o vê (spec 034) | ✅ |
| Redefinir link | `resetGroupInvite` | Troca o código do convite: o link anterior deixa de funcionar e quem já entrou continua (spec 034) | ✅ |
| Aceitar convite | `acceptGroupInvite` | Torna membro quem abriu um link válido com sessão; repetir não duplica (spec 034) | ✅ |
| Remover membro | `removeGroupMember` | O administrador tira um membro do grupo; não bloqueia a volta pelo link (spec 034) | ✅ |
| Sair do grupo | `leaveGroup` | O membro deixa o grupo; o administrador não pode (spec 034) | ✅ |
| Excluir grupo | `deleteGroup` | Exclusão definitiva do grupo para todos, só pelo administrador (spec 034) | ✅ |
| Grupos recentes | `listRecentGroups` / `group_visit` | Os 5 grupos que o usuário abriu por último (spec 034) | ✅ |
| Configurar seu grupo | `GroupSetup` / `groupSetupOf` | Cartão do administrador com os passos Convidar membros, Atribuir e Criar publicação; some com "Pular configuração" (spec 034) | ✅ |
| Configurações do grupo | `GroupSettings` | Tela do administrador para mudar o nome, a descrição e as permissões dos membros (spec 035) | ✅ |
| Descrição do grupo | `Group.description` | Texto opcional de até 500 caracteres, mostrado em "Informações do grupo" (spec 035) | ✅ |
| Permissões dos membros | `GroupPermissions` (`membersCanInvite`, `membersCanSeeMembers`, `membersCanShare`, `membersCanAssign`) | As quatro chaves do grupo; valem só para os membros; padrão do Kahoot: as três primeiras ligadas e criar atividades desligada (spec 035) | ✅ |
| Mural | `GroupFeed` | A aba Atividade do grupo: as publicações, das mais novas para as mais antigas (spec 038; publicações de texto na 036) | ✅ |
| Publicação | `GroupPost` | Item do mural, de quem o fez; na spec 038, uma atribuição feita no grupo, com uma mensagem opcional de até 500 caracteres; perde o anexo quando a atribuição acaba ("compartilhou um arquivo") | ✅ |
| Curtida | `GroupPostLike` | Uma por membro e publicação; "Curtir" / "Curtida" (spec 038) | ✅ |
| Atribuição do grupo | `GroupAssignment` | Uma atribuição (spec 029) publicada num grupo, no máximo uma vez por grupo; aparece no mural e na aba Atribuições enquanto está aberta (spec 038) | ✅ |
| Atribuir a grupos | `assignToGroups` | Publicar uma atribuição já criada em um ou mais grupos onde a pessoa pode atribuir, pelo diálogo de compartilhar (spec 038) | ✅ |
| Criar publicação | `createGroupPost` | O diálogo de publicar no mural: texto de até 500 caracteres e no máximo um anexo; aberto por "Publicar algo" e pelos botões "Criar publicação" (spec 036) | ✅ |
| Anexo da publicação | `GroupPostAttachment` | O único anexo de uma publicação: imagem (até 10 MB), PDF (até 20 MB) ou atividade atribuída; apagado com a publicação (spec 036) | ✅ |
| Excluir publicação | `deleteGroupPost` | Tira a publicação, com as curtidas, do mural e da aba; a atribuição continua; de quem atribuiu e do administrador (spec 038) | ✅ |
| Compartilhar com o grupo | `shareQuizzesInGroup` | Pôr um ou vários quizzes jogáveis da própria pessoa no grupo, cada um uma vez por grupo, sempre com uma publicação ("compartilhou um kahoot" ou "compartilhou múltiplos kahoots"); do administrador, e dos membros com a chave (spec 037) | ✅ |
| Quiz compartilhado | `SharedQuiz` | Um quiz no grupo, na aba Compartilhado; acompanha a última versão salva pelo dono; os membros veem, jogam, atribuem e duplicam, sem editar (spec 037) | ✅ |
| Remover do grupo | `unshareQuiz` | Tirar um quiz compartilhado da aba; a publicação "compartilhou um kahoot" fica sem o anexo; de quem compartilhou e do administrador (spec 037) | ✅ |
| Duplique para editar | `duplicateSharedQuiz` | O Editar de um quiz compartilhado: o membro não edita o original, duplica para a própria biblioteca (spec 037) | ✅ |
| Relatório somente para leitura | `ReportView.readOnly` | O administrador do grupo vê o relatório de uma atribuição publicada ali por outra pessoa, sem nenhuma ação (spec 038) | ✅ |
| Notificação | `Notification` | Aviso no sino para uma pessoa sobre o que outra fez num grupo; lida ou não lida (spec 040) | ✅ |
| Página da publicação | `GroupPostPage` | Uma publicação do mural com endereço próprio, aberta pela notificação (spec 040) | ✅ |

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
| Relatório | `Report` | Resultado de uma partida ao vivo que foi iniciada e já acabou, do criador que a organizou; independente do quiz (spec 015). Uma atribuição é relatório desde que é criada, aberta ou não (spec 029) | ✅ |
| Participante | `Participant` | No relatório, o jogador que estava na partida quando ela foi iniciada ou que entrou durante o jogo; removidos no lobby não contam (spec 015) | ✅ |
| Pergunta jogada | `playedQuestion` | Pergunta que chegou à revelação; as únicas que entram nas contas do relatório (spec 015) | ✅ |
| Percentual geral | `overallAccuracy` | Respostas corretas da partida sobre as respostas possíveis, somadas as perguntas de cada participante (spec 015) | ✅ |
| Ajuda necessária | `needsHelp` | Participantes que acertaram menos de 35% das perguntas deles no jogo inteiro (spec 015) | ✅ |
| Não concluiu | `didNotFinish` | Participantes com ao menos uma pergunta sem resposta (spec 015) | ✅ |
| Nome do relatório | `Report.name` | Começa igual ao título do quiz na partida; renomear muda só o relatório (spec 015) | ✅ |
| Lixeira de relatórios | `Report.trashedAt` | Relatórios excluídos, restauráveis; a exclusão definitiva apaga a partida e as respostas (spec 015) | ✅ |
| Pergunta difícil | `DifficultQuestion` | Pergunta jogada acertada por menos de 35% dos participantes que podiam respondê-la (spec 015) | ✅ |
| Mídia | `Media` | Arquivo enviado pelo usuário (imagem) | ✅ |
| Política de mídia | `MediaPolicy` | Tipos aceitos (JPEG, PNG, GIF, WebP) e tamanho máximo (10 MB) | ✅ |
| Upload pré-assinado | `PresignedUpload` | URL temporária para o navegador enviar direto ao storage | ✅ |
