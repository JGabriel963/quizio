# Glossário — linguagem ubíqua

Termos usados em specs (PT) e no código (EN). A definição completa e as fontes estão em [`product/kahoot-reference.md`](product/kahoot-reference.md) §2. Ao introduzir um termo numa spec, acrescente-o aqui.

**Status:** ✅ existe no código · 📝 definido, ainda não implementado

## Compartilhado

| PT | EN (código) | Definição | Status |
| --- | --- | --- | --- |
| Erro de domínio | `DomainError` | Violação de regra de negócio, com `code` estável `CONTEXTO.MOTIVO` | ✅ |
| Relógio | `Clock` | Porta que fornece o instante atual; permite testes determinísticos | ✅ |
| Gerador de IDs | `IdGenerator` | Porta que gera identificadores | ✅ |
| Armazenamento de objetos | `ObjectStorage` | Porta para arquivos binários (R2) | ✅ |
| Publicador em tempo real | `RealtimePublisher` | Porta servidor → clientes | ✅ |
| Assinante em tempo real | `RealtimeSubscriber` | Porta do cliente para receber eventos | ✅ |

## Quiz (autoria)

| PT | EN (código) | Definição | Status |
| --- | --- | --- | --- |
| Kahoot / Quiz | `Quiz` | Conteúdo jogável: metadados e lista ordenada de blocos. Chamado de "quiz" na interface do Quizio | 📝 |
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
| Rascunho | `Draft` | Quiz ainda não salvo como versão jogável | 📝 |
| Visibilidade | `Visibility` | `private`, `unlisted`, `public` | 📝 |
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
| Biblioteca | `Library` | Quizzes do usuário: recentes, rascunhos, favoritos, compartilhados, pastas, lixeira | 📝 |
| Pasta | `Folder` | Organização de quizzes | 📝 |
| Favorito | `Favorite` | Marcação para acesso rápido | 📝 |
| Lixeira | `Trash` | Quizzes excluídos, restauráveis | 📝 |
| Relatório | `Report` | Resultado consolidado de uma partida | 📝 |
| Pergunta difícil | `DifficultQuestion` | Acertada por menos de 35% dos participantes | 📝 |
| Mídia | `Media` | Arquivo enviado pelo usuário (imagem) | ✅ |
| Política de mídia | `MediaPolicy` | Tipos aceitos (JPEG, PNG, GIF, WebP) e tamanho máximo (10 MB) | ✅ |
| Upload pré-assinado | `PresignedUpload` | URL temporária para o navegador enviar direto ao storage | ✅ |
