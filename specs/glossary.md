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
| Pergunta | `Question` | Bloco interativo com texto (≤ 120), tipo, tempo limite e pontos | 📝 |
| Tipo de pergunta | `QuestionType` | `quiz`, `trueFalse`, `typeAnswer`, `slider`, `pinAnswer`, `puzzle`, `poll`, `scale`, `nps`, `dropPin`, `wordCloud`, `openEnded`, `brainstorm` | 📝 |
| Slide | `Slide` | Bloco só de conteúdo, com layout; sem resposta nem pontos | 📝 |
| Alternativa | `AnswerOption` | Opção de resposta (texto ≤ 75 ou imagem) com flag de correta | 📝 (UI ✅) |
| Forma da alternativa | `AnswerShape` | Triângulo, losango, círculo, quadrado — sempre com a cor correspondente | ✅ (UI) |
| Modo de seleção | `SelectionMode` | `single` ou `multi` | 📝 |
| Tempo limite | `TimeLimit` | Janela de resposta, 5–240 s conforme o tipo | 📝 |
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
| Biblioteca | `Library` / `listLibrary` | Quizzes do usuário por seção, com pesquisa; depois favoritos, compartilhados e pastas | ✅ (seções da spec 001) |
| Seção da biblioteca | `LibrarySection` | `recent`, `drafts`, `trash` (spec 001) | ✅ |
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
