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
| Rascunho | `status: "draft"` | Quiz ainda não salvo como versão jogável | ✅ |
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
| Seletor de tipo | `QuestionTypePicker` | Escolha do tipo ao adicionar uma pergunta; mostra só os tipos já entregues (spec 005) | 📝 |
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
| Versão | `QuizVersion` / snapshot | Cópia imutável do quiz usada por uma partida | 📝 |

## Game (partida ao vivo)

| PT | EN (código) | Definição | Status |
| --- | --- | --- | --- |
| Partida ao vivo | `GameSession` | Instância de apresentação de um quiz | 📝 |
| Modo de jogo | `GameMode` | `classic`, `team`, … | 📝 |
| PIN do jogo | `GamePin` | Código numérico temporário para entrar na partida | 📝 |
| Opções de jogo | `GameOptions` | Randomizar perguntas/alternativas, mostrar no dispositivo, gerador de apelidos, autoplay… | 📝 |
| Lobby | `Lobby` | Sala de espera antes do início | 📝 |
| Jogador | `Player` | Participante anônimo identificado por apelido na partida | 📝 |
| Apelido | `Nickname` | Nome do jogador na partida | 📝 |
| Anfitrião | `Host` | Usuário que conduz a partida | 📝 |
| Fase da pergunta | `QuestionPhase` | `intro` → `answering` → `results` → `scoreboard` | 📝 |
| Resposta | `Answer` | Envio de um jogador para uma pergunta (`received` / `timeout`) | 📝 |
| Tempo de resposta | `ResponseTime` | Instante do envio − abertura das respostas, medido no servidor | ✅ (`responseTimeMs`) |
| Correção | `Correctness` | `correct`, `wrong`, `partiallyCorrect`, `almostCorrect` | 📝 |
| Pontuação da resposta | `AnswerScore` | Pontos pela fórmula de velocidade; cheia abaixo de 0,5 s | ✅ (`calculateAnswerScore`) |
| Sequência de acertos | `AnswerStreak` | Acertos consecutivos; apenas exibida, não dá pontos | 📝 |
| Distribuição de respostas | `AnswerDistribution` | Quantos escolheram cada alternativa | 📝 |
| Placar | `Scoreboard` | Top 5 entre perguntas | 📝 |
| Pódio | `Podium` | Top 3 ao final | 📝 |
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
