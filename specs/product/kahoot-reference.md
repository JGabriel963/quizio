# Referência funcional do Kahoot! para o Quizio

> Documento de pesquisa que descreve como o Kahoot! (kahoot.com, create.kahoot.it, kahoot.it) funciona, para servir de base ao modelo de domínio e ao escopo do **Quizio**, um clone pessoal **sem paywalls**.
>
> **Convenções**
> - Tudo o que está afirmado aqui foi verificado em fontes da seção 14, principalmente a central de ajuda oficial (support.kahoot.com) e o blog oficial (kahoot.com/blog).
> - **(não confirmado)** marca informação que não achei em fonte oficial: vem de fonte de terceiros, de observação comum ou de inferência. Não use esses pontos como regra rígida sem validar.
> - **(terceiros)** marca informação confirmada só em fonte não oficial (blog de professor, wiki, fórum).
> - **(derivado)** marca um valor calculado por mim a partir de uma regra oficial.
> - Pesquisa feita em setembro de 2026. O Kahoot muda a interface com frequência, e alguns artigos oficiais se contradizem. Os conflitos estão sinalizados com ⚠️.

---

## 1. Visão geral e personas

O Kahoot! é uma plataforma de aprendizagem baseada em jogos. Um criador monta um **kahoot (Kahoot)**, que é uma sequência de perguntas e slides. Esse kahoot pode ser usado de várias formas:

- **Partida ao vivo (LiveGame):** o anfitrião projeta a tela e os participantes respondem pelo celular.
- **Atribuição (Assignment):** cada participante joga no próprio ritmo até um prazo.
- **Modos de autoestudo:** jogar solo, flashcards e aprender.

A mecânica central da partida ao vivo tem quatro partes:

1. A pergunta aparece na tela compartilhada.
2. Os jogadores escolhem entre alternativas identificadas por cor e forma.
3. A pontuação premia o acerto e a rapidez.
4. Um placar é exibido entre as perguntas.

### Personas

| Persona | Code name | Descrição | Principais objetivos |
|---|---|---|---|
| Anfitrião / Criador | `Host` / `Creator` | Pessoa com conta que cria kahoots na biblioteca e os apresenta ao vivo ou atribui. No Kahoot é tipicamente professor, treinador corporativo ou apresentador. | Criar e editar conteúdo, organizar a biblioteca, configurar opções de jogo, conduzir a partida, ver relatórios. |
| Jogador / Participante | `Player` / `Participant` | Pessoa que entra em uma partida pelo kahoot.it (ou app) com PIN, link ou QR code. **Não precisa de conta** para jogar ao vivo nem para atribuições. | Entrar rápido, escolher apelido, responder, ver o próprio desempenho e a posição. |
| Co-criador | `Collaborator` | Outro usuário com quem o kahoot foi compartilhado, ou membro de um espaço de trabalho de equipe (Workspace) ou grupo (Group). | Editar o mesmo kahoot, ou duplicar e reutilizar. Em workspaces compartilhados, todos os membros editam, a menos que o kahoot esteja travado. Em grupos de workspace pessoal, o membro precisa duplicar antes de editar. |

Personas secundárias no Kahoot real, fora do escopo inicial do Quizio: administrador de organização, líder de equipe em dispositivo compartilhado e aluno menor de 16 anos (com restrições de privacidade).

---

## 2. Conceitos do domínio

| Termo PT | Code name EN | Definição |
|---|---|---|
| Kahoot | `Kahoot` | Conteúdo jogável com metadados (título, descrição, capa, idioma, visibilidade, tema, música do lobby) e uma lista ordenada de blocos. Tem `id` (UUID) e `version`, que aumenta quando é editado depois de jogado. |
| Bloco | `Block` | Item da lista de um kahoot: uma pergunta de qualquer tipo ou um slide. A API de relatórios chama de *block* e usa `blockIndex` (base 0). |
| Pergunta | `Question` | Bloco interativo com texto (até 120 caracteres), mídia opcional, tipo, tempo limite e configuração de pontos. |
| Tipo de pergunta | `QuestionType` | Enum. Na API de relatórios: `CONTENT` (slide), `SINGLE_SELECT_QUIZ`, `MULTIPLE_SELECT_QUIZ`, `TRUE_FALSE`, `TYPE_ANSWER`, `PUZZLE`, `SLIDER`, `POLL`, `DROP_PIN`, `OPEN_ENDED`, `WORD_CLOUD`, `BRAINSTORM`. Pin answer, escala e NPS existem no editor, mas não constam dessa lista. |
| Alternativa | `Choice` / `AnswerOption` | Opção de resposta com texto (até 75 caracteres) ou imagem, e a flag `correct`. |
| Slide | `Slide` | Bloco só de conteúdo, sem resposta e sem pontos. Tem layouts. |
| Tempo limite | `TimeLimit` | Tempo de resposta da pergunta, de 5 s a 240 s conforme o tipo. |
| Tempo de leitura | `ReadTime` | Período em que a pergunta aparece antes de liberar as respostas. Mínimo de 5 s, ajustado ao tamanho do texto. |
| Pontos da pergunta | `PointsMultiplier` | Padrão (1000), Pontos em dobro (2000) ou Sem pontos (0). |
| Seleção simples / múltipla | `SelectionMode` (`single` / `multi`) | Define se o jogador marca uma alternativa ou várias e confirma com "Enviar". |
| Partida ao vivo | `LiveGame` / `GameSession` | Instância de apresentação de um kahoot, com `gameSessionId`, anfitrião, horário de início, modo e jogadores. |
| Experiência / Modo de jogo | `GameMode` / `HostingExperience` | Classic, Team, Accuracy, Confidence, Lecture, Professional e outros. |
| PIN do jogo | `GamePin` | Código numérico temporário para entrar na sessão. Ao vivo vale até 8 h; em atribuição, até o prazo. |
| Link / QR de entrada | `JoinLink` / `JoinQrCode` | Formas de entrar sem digitar o PIN. Os demais requisitos de entrada continuam valendo. |
| Lobby | `Lobby` | Sala de espera antes do início. Mostra PIN, QR, lista de apelidos e música. |
| Apelido | `Nickname` | Nome do jogador na sessão. Pode vir do gerador de apelidos. |
| Identificador do jogador | `PlayerIdentifier` | Campo opcional, pedido antes do apelido, para rastrear a mesma pessoa entre várias partidas e combinar relatórios. |
| Opções de jogo | `GameOptions` / `GameSettings` | Configurações da sessão: randomização, entrada em duas etapas, autoplay, música etc. |
| Entrada em duas etapas | `TwoStepJoin` | Depois do PIN, o jogador reproduz um padrão de 4 botões mostrado na tela do anfitrião. O padrão muda a cada 7 s. |
| Gerador de apelidos | `NicknameGenerator` | Atribui um apelido amigável (adjetivo + animal). O jogador pode girar até 3 vezes. |
| Travar entrada | `LockGame` | Impede a entrada de novos jogadores. |
| Remover jogador | `KickPlayer` | O anfitrião clica no apelido para tirar o jogador. |
| Resposta enviada | `Answer` / `Submission` | Resposta de um jogador a uma pergunta. Status `RECEIVED` ou `TIMEOUT`, escolha(s), correção e pontos. |
| Tempo de resposta | `ResponseTime` | Tempo entre a liberação das respostas e o envio. É usado na fórmula de pontos. |
| Correção | `Correctness` | `CORRECT`, `WRONG`, `PARTIALLY_CORRECT` (múltipla escolha) ou `ALMOST_CORRECT` (controle deslizante). |
| Sequência de acertos | `AnswerStreak` | Número de acertos consecutivos. Desde 31/07/2020 **não dá pontos** no modo clássico; é só exibida. |
| Distribuição de respostas | `AnswerDistribution` | Gráfico na tela do anfitrião com quantos escolheram cada alternativa. |
| Placar | `Scoreboard` / `Leaderboard` | Ranking top 5 exibido entre as perguntas. |
| Pódio | `Podium` | Tela final com os 3 primeiros (medalhas). |
| Fantasmas | `Ghosts` | Simulações dos jogadores de uma partida anterior, usadas em "Jogar novamente". |
| Equipe | `Team` | Grupo de jogadores no modo equipe. A pontuação da equipe é a média dos membros. |
| Tempo de conversa | `TeamTalk` | Intervalo de 5 a 20 s para a equipe discutir antes de responder. |
| Atribuição | `Assignment` / `Challenge` | Kahoot jogado no ritmo de cada um até um prazo. Na API, o modo se chama "Challenge". |
| Prazo | `Deadline` | Data e hora de fechamento da atribuição, até 28 dias no futuro. |
| Relatório | `Report` | Registro de uma sessão (ao vivo ou atribuição) com resumo, participantes, perguntas e feedback. |
| Pergunta difícil | `DifficultQuestion` | Pergunta acertada por menos de 35% dos participantes. |
| Biblioteca | `Library` | Área do usuário com seus kahoots, rascunhos, favoritos, compartilhados, pastas e lixeira. |
| Rascunho | `Draft` | Kahoot ainda não salvo como versão jogável. |
| Pasta | `Folder` | Organização de kahoots na biblioteca. |
| Favorito | `Favorite` | Marcação de um kahoot (próprio ou público) para acesso rápido. |
| Lixeira | `Trash` | Kahoots excluídos, restauráveis até a exclusão permanente. |
| Visibilidade | `Visibility` | `private`, `public`, `unlisted` ou `organization`. |
| Tema | `Theme` | Aparência visual (fundo e cores) da partida. |
| Música do lobby | `LobbyMusic` | Faixa de fundo escolhida numa lista interna. |
| Banco de perguntas | `QuestionBank` | Busca de perguntas em outros kahoots (públicos ou da própria biblioteca) para reutilizar. |
| Margem de resposta | `AnswerMargin` | Tolerância do controle deslizante: nenhuma, baixa, média, alta ou máxima. |
| Área correta | `CorrectArea` | Região marcada na imagem de uma pergunta de marcador (pin answer). |
| Grupo | `Group` | Espaço para compartilhar uma coleção de kahoots com poucas pessoas. |
| Espaço de trabalho | `Workspace` | Biblioteca centralizada de uma equipe ou organização. |

---

## 3. Criação de kahoot (editor)

### 3.1 Metadados do kahoot

| Campo | Code name | Regras confirmadas |
|---|---|---|
| Título | `title` | Até **95 caracteres**. **Obrigatório** para salvar como versão jogável. |
| Descrição | `description` | Até **500 caracteres**. Palavras com `#` viram palavras-chave. |
| Capa | `coverImage` | Upload ou biblioteca interna de imagens. PNG, JPEG ou GIF, modo RGB, até **5 MB** e **3264×3264 px**. |
| Idioma | `language` | Ajuda a busca no Discover. A IA pode detectar o idioma pelas perguntas. |
| Visibilidade | `visibility` | **Privado** (fora da busca; só convidados; sem link de compartilhamento), **Público** (no Discover; exige plano pago), **Não listado** (fora da busca, mas quem tem o link joga) e **Organização** (só membros do workspace compartilhado). Não existe visibilidade padrão configurável. Alunos jovens ficam restritos a Privado. |
| Local de salvamento | `folderId` | Pasta pessoal ou pasta da organização. |
| Permitir duplicação | `allowDuplication` | Permite que outros copiem e modifiquem o kahoot. |
| Hospedagem como convidado | `guestHosting` | Qualquer pessoa hospeda o kahoot sem ter conta. |
| Tema | `themeId` | O criador define o tema padrão; o anfitrião pode trocar na hora de jogar. Fundos personalizados são premium no Kahoot. |
| Música do lobby | `lobbyMusic` | Escolhida numa lista interna. **Não aceita upload** de áudio. |
| Vídeo do lobby | `lobbyVideoUrl` | URL do YouTube tocando em tela cheia no lobby. Não é mais suportado para contas business/social. |
| Padrões curriculares | `standards` | Só nos planos EDU (CCSS, NGSS etc.). Fora do escopo do Quizio. |

### 3.2 Operações na lista de perguntas

- **Adicionar:** botão "Adicionar pergunta" no painel esquerdo, seguido da escolha do tipo. A interface em português agrupa os tipos em *Testar conhecimento*, *Coletar opiniões* e *Slides*. Ao adicionar, aparecem as abas **Adicionar / Procurar / Gerar / Importar**.
- **Duplicar:** ícone de duplicação no item da lista.
- **Reordenar:** arrastar e soltar no painel esquerdo.
- **Excluir:** ícone de lixeira no item.
- **Limite:** até **200 perguntas por kahoot**.
- **Tempo em massa** (desde 15/11/2025): aplica o mesmo tempo limite a todas as perguntas numa só ação.
- **Pré-visualização** (desde 29/10/2025): mostra a tela do anfitrião e a do participante lado a lado durante a edição.

### 3.3 Importar de planilha

- Aba **Importar**, opção de planilha. Arraste o arquivo ou selecione e clique em *Import*.
- **Formato:** `.xlsx` (Excel 2007 ou mais novo), até **1 MB**, usando o modelo oficial para download.
- **Só perguntas do tipo Quiz** são importadas.
- **Colunas do modelo:**

  | Coluna | Regra |
  |---|---|
  | `Question` | Texto da pergunta. |
  | `Answer 1` a `Answer 4` | Alternativas. Pelo menos 2 preenchidas. |
  | Tempo limite em segundos | Valores aceitos: **5, 10, 20, 30, 60 ou 120**. Se vazio ou inválido, vira **20 s**. |
  | Resposta(s) correta(s) | Números das alternativas separados por vírgula, ex.: `1` ou `2,3`. Pelo menos uma correta. |

  - O blog oficial confirma os cabeçalhos `Question` e `Answer 1`–`Answer 4`.
  - A existência das colunas de tempo e de resposta correta, e suas regras, estão confirmadas.
  - O **texto exato** dos cabeçalhos dessas duas colunas é **(não confirmado)**; o artigo não o cita.
- ⚠️ **Limites de caracteres:** o artigo de importação diz **95** para a pergunta e **60** para a resposta, mas o editor aceita 120 e 75. Provavelmente é um limite antigo que ficou no importador **(não confirmado qual vale hoje)**.
- **Validação:**
  - Se houver erro, uma mensagem detalha cada problema.
  - O usuário pode corrigir a planilha e reenviar, ou **pular as perguntas com erro** e seguir com as válidas.
  - As perguntas importadas entram no editor para revisão.
  - Várias planilhas podem ser importadas em sequência no mesmo kahoot.
- **Outras importações** do Kahoot, fora do MVP: PDF, sincronização com Google Slides e PowerPoint, e importação de slides (PowerPoint, Keynote, PDF).

### 3.4 Buscar e reutilizar perguntas (banco de perguntas)

- Aba **Procurar**: uma janela com barra de busca por frase.
- Uma aba alterna entre conteúdo público e **"Sua biblioteca"**.
- Cada pergunta do resultado tem um botão **Adicionar** que a copia para o kahoot atual.

### 3.5 Geração por IA (apenas descrição)

- Aba **Gerar**.
- **Entradas:** tópico livre (ex.: "Raças de cães"), PDF (cerca de 150 páginas ou 300 mil caracteres), URL de site ou artigo da Wikipedia. Opções de dificuldade e tom.
- **Tipos gerados:** Quiz, Verdadeiro ou falso, Controle deslizante e Resposta curta.
- Pode gerar uma pergunta isolada ou um kahoot completo, além de imagens a partir de descrição.
- O Kahoot avisa que o usuário deve revisar o conteúdo gerado, que pode vir impreciso.
- A quantidade de perguntas por geração é **(não confirmado)**.

### 3.6 Rascunho, publicação e validação

- **Rascunho (Draft):** kahoot ainda não salvo como jogável. Aparece na aba *Rascunhos* da biblioteca. Rascunhos **não vão para a lixeira**: quando excluídos, somem permanentemente.
- **Concluir / Salvar:** o botão "Concluído" salva a versão jogável. **Não é possível salvar como jogável sem título.**
- **Indicador de problema:** perguntas incompletas ou acima do limite de caracteres ganham um ícone de alerta (⚠️) na lista, e isso impede salvar a versão jogável.
- **Motivos de pergunta inválida** confirmados:
  - Quiz com menos de 2 alternativas.
  - Quiz sem nenhuma alternativa marcada como correta.
  - Texto de pergunta ou alternativa acima do limite.
  - Pergunta de marcador (pin answer) sem imagem.
  - Resposta curta sem nenhuma resposta aceita (mínimo 1).
  - No Kahoot, uso de recurso premium sem assinatura (ícone ⭐). **Esse caso não se aplica ao Quizio.**
- **Motivos inferidos (não confirmado):** pergunta sem texto; puzzle com menos de 3 itens; controle deslizante com mínimo ≥ máximo ou resposta fora do intervalo.
- **Versionamento:** a API de relatórios expõe `kahootIdentifier.version`, que aumenta quando o kahoot é editado depois de jogado. Atribuições criadas antes de uma edição **não são atualizadas** e é preciso criar uma nova atribuição. Recomendação para o Quizio: congelar um snapshot do kahoot em cada sessão.

---

## 4. Tipos de pergunta

**Regras comuns:**
- Pontos: **0 / 1000 / 2000** (sem pontos, padrão, dobro) nos tipos que pontuam.
- Pergunta com até **120 caracteres**.
- Mídia (imagem, YouTube ou Vimeo) na maioria dos tipos. Alternativas em imagem só em Quiz, Enquete e Puzzle: PNG/JPEG/GIF RGB, até 3264×3264 px. O artigo cita "80 MB", valor que parece estranho.
- Tempo limite em faixas. Os valores discretos conhecidos estão na seção 5.1.

**Cores e formas das alternativas** (aplicável a Quiz, Verdadeiro ou falso e Enquete):
- Cada cor sempre vem com uma forma geométrica distinta, por acessibilidade para daltônicos.
- Mapeamento **(terceiros)**: **vermelho = triângulo**, **azul = losango**, **amarelo = círculo**, **verde = quadrado**.
- Para a 5ª e a 6ª alternativa, fontes de terceiros citam turquesa/pentágono e roxo/triângulo invertido **(não confirmado)**.
- Posição na grade 2×2, na ordem 1–4: vermelho em cima à esquerda, azul em cima à direita, amarelo embaixo à esquerda, verde embaixo à direita **(não confirmado oficialmente, mas é o padrão visual amplamente reproduzido)**.

> **Nota sobre a interface em português:** "Largar marcador" aparece nos dois grupos. Em *Testar conhecimento* corresponde ao **Pin answer** (existe área correta e dá pontos). Em *Coletar opiniões* corresponde ao **Drop pin** (sem certo ou errado).

### 4.1 Grupo "Testar conhecimento"

#### 4.1.1 Quiz (`quiz`)

- **Propósito:** pergunta de múltipla escolha com respostas certas e erradas.
- **Alternativas:** mínimo 2, máximo **6**. Mais de 4 é premium no Kahoot. Pelo menos 1 correta.
- **Caracteres:** pergunta 120; alternativa 75 (ou imagem).
- **Tempo:** 5 s a 4 min.
- **Pontos:** 0 / 1000 / 2000.
- **Seleção** (dropdown "Seleção simples" / "Múltipla escolha"):
  - Marcar mais de uma alternativa correta muda automaticamente para múltipla escolha.
  - Na múltipla escolha, o jogador marca várias opções e confirma com o botão **Enviar**.
  - Múltipla escolha é premium no Kahoot.
- **Mídia:** imagem, GIF, YouTube ou Vimeo na pergunta; imagem nas alternativas.
- **No dispositivo do jogador:** botões coloridos com forma. Com "Mostrar perguntas e respostas nos dispositivos" ligado, aparecem também os textos; desligado, **só as formas coloridas**.
- **Correção:**
  - Seleção simples: correta ou errada.
  - Múltipla escolha, conforme a API de relatórios: `CORRECT` se marcou todas as corretas e nenhuma errada; `PARTIALLY_CORRECT` se marcou ao menos uma correta e nenhuma errada; `WRONG` se marcou alguma errada.
- **Pontuação:** fórmula de tempo (seção 5). Na múltipla escolha, pontos por alternativa correta marcada e **0 se marcar qualquer alternativa errada**. Há conflito sobre o valor por alternativa (seção 5.4).
- **Dá pontos:** sim.

#### 4.1.2 Verdadeiro ou falso (`true_false`)

- **Propósito:** afirmação binária.
- **Alternativas:** 2 fixas, "Verdadeiro" e "Falso", **não editáveis**. Exatamente 1 correta.
- **Caracteres:** pergunta 120.
- **Tempo:** 5 s a 4 min.
- **Pontos:** 0 / 1000 / 2000.
- **Seleção:** apenas simples.
- **Mídia:** imagem ou vídeo.
- **No dispositivo:** 2 botões coloridos com forma. As cores e formas exatas para V/F são **(não confirmado)**; o comum é azul/losango e vermelho/triângulo.
- **Pontuação:** fórmula de tempo. Errou ou não respondeu: 0.
- **Dá pontos:** sim.

#### 4.1.3 Resposta curta (`type_answer`)

- **Propósito:** testar a lembrança sem pistas; o jogador digita a resposta.
- **Respostas aceitas:** mínimo 1, máximo **4** variantes aceitas.
- **Caracteres:** pergunta 120; cada resposta aceita até **20**.
- **Tempo:** **20 s** a 4 min.
- **Pontos:** 0 / 1000 / 2000.
- **Mídia:** imagem ou vídeo.
- **Regras de comparação:**
  - Não diferencia maiúsculas de minúsculas.
  - Vários espaços contam como um só.
  - Emojis só contam se não houver outro texto.
  - A pontuação a seguir é **ignorada**: `` ~ ` ! @ # $ % ^ & * ( ) { } [ ] ; : " ' < , . > ? / \ | - _ + = ``
- **No dispositivo:** campo de texto e botão de envio.
- **Na tela de resultados:** em contas escolares, só as respostas corretas aparecem; em contas de trabalho ou pessoais, todas as respostas enviadas.
- **Pontuação:** acerto (igual a qualquer variante aceita após normalização) aplicando a fórmula de tempo. No Kahoot, contas de professor podem aceitar respostas alternativas depois, na revisão.
- **Dá pontos:** sim.

#### 4.1.4 Controle deslizante (`slider`)

- **Propósito:** estimar um valor numérico (ano, quantidade, porcentagem) numa escala.
- **Configuração:**
  - Valor mínimo, valor máximo e valor correto.
  - O passo e o número de passos se ajustam automaticamente a partir do mínimo e do máximo.
  - Unidade opcional de até **20 caracteres**; campo de resposta de até **10 caracteres**.
  - Texto para leitura em voz alta de até 120 caracteres.
- **Margem de resposta:**
  - *nenhuma:* só a resposta exata pontua.
  - *baixa, média, alta:* tolerâncias crescentes.
  - *máxima:* todas as respostas pontuam, e quanto mais perto, mais pontos.
  - O tamanho exato de cada margem é **(não confirmado)**.
- **Tempo:** **10 s** a 4 min. Uma versão anterior do artigo dizia 20 s.
- **Pontos:** 0 / 1000 / 2000.
- **No dispositivo:** um controle deslizante, operável também pelo teclado (setas e Page Up/Down).
- **Correção:** `CORRECT` (exata) ou `ALMOST_CORRECT` (dentro da margem).
- **Pontuação:** **20% pela velocidade e 80% pela precisão**. A fórmula exata que combina essas partes é **(não confirmado)**.
- **Dá pontos:** sim, de forma variável.

#### 4.1.5 Largar marcador — com resposta correta (`pin_answer`)

- **Propósito:** marcar um local numa imagem (mapa, diagrama).
- **Configuração:**
  - Imagem **obrigatória**; GIF e vídeo não são aceitos.
  - O criador clica em "Área correta" e desenha a região que conta como certa.
  - As formas e o tamanho possíveis da área são **(não confirmado)**.
- **Caracteres:** pergunta 120.
- **Tempo:** 20 s a 4 min.
- **Pontos:** 0 / 1000 / 2000.
- **No dispositivo:** o marcador fica **fixo no centro** e o jogador **arrasta a imagem** até alinhar o ponto desejado com ele.
- **Resultado:** quando o tempo acaba, os marcadores de todos os jogadores aparecem juntos na tela principal.
- **Pontuação:** acerto quando o marcador cai dentro da área correta, com a fórmula de tempo. Se há gradação por proximidade fora da área, é **(não confirmado)**.
- **Dá pontos:** sim.

#### 4.1.6 Puzzle (`puzzle`)

- **Propósito:** ordenar itens na sequência correta.
- **Itens:** mínimo **3**, máximo **4**, com até **75 caracteres** cada (ou imagem). Texto para leitura em voz alta de até 120 caracteres.
- **Tempo:** 20 s a 4 min.
- **Pontos:** 0 / 1000 / 2000.
- **Mídia:** imagem, YouTube ou Vimeo.
- **No dispositivo:** o jogador arrasta os itens para reordenar e envia **(o mecanismo de arrastar e enviar é não confirmado em detalhe)**.
- **Pontuação:** **tudo ou nada**: só pontua com a ordem inteira correta **(terceiros; o blog oficial só diz que "a precisão importa mais do que nunca")**, com a fórmula de tempo.
- **Dá pontos:** sim.

### 4.2 Grupo "Coletar opiniões"

Nenhum tipo deste grupo tem resposta certa e **nenhum dá pontos**, com uma exceção parcial no Brainstorm.

#### 4.2.1 Enquete (`poll`)

- **Propósito:** pesquisa de opinião.
- **Alternativas:** mínimo 2, máximo **6**, com até 75 caracteres ou imagem.
- **Caracteres:** pergunta 120.
- **Tempo:** 5 s a 4 min.
- **Seleção:** simples ou múltipla.
- **Mídia:** imagem ou vídeo.
- **No dispositivo:** botões coloridos com forma, como no Quiz.
- **Resultado:** gráfico de distribuição por alternativa **(o formato exato é não confirmado)**.
- **Dá pontos:** não.

#### 4.2.2 Escala (`scale`)

- **Propósito:** medir atitude ou concordância.
- **Configuração:** escala **Likert (1–5)** ou **personalizada (0–10)**. Rótulos predefinidos ou personalizados com até **20 caracteres**. Pergunta de até 120 caracteres.
- **Tempo:** **30 s** a 4 min.
- **No dispositivo:** o jogador seleciona um ponto da escala e envia.
- **Resultado:** gráfico com a distribuição das respostas na escala, também disponível no relatório.
- **Dá pontos:** não.

#### 4.2.3 Escala NPS (`nps`)

- **Propósito:** calcular o Net Promoter Score com a pergunta "qual a probabilidade de recomendar".
- **Configuração:** escala fixa de **0 a 10**. Pergunta de até 120 caracteres.
- **Tempo:** 30 s a 4 min.
- **Resultado:** detratores (0–6) em vermelho, neutros (7–8) em amarelo e promotores (9–10) em verde, mais o NPS calculado.
- **Fórmula:** a padrão do mercado, `%promotores − %detratores`. O artigo do Kahoot não mostra a fórmula e diz apenas que calcula o NPS.
- **Dá pontos:** não.

#### 4.2.4 Largar marcador — opinião (`drop_pin`)

- **Propósito:** coletar opiniões sobre uma imagem, ex.: "onde você construiria o parque?".
- **Configuração:** imagem obrigatória (sem vídeo). Pergunta de até 120 caracteres.
- **Tempo:** 20 s a 4 min.
- **No dispositivo:** igual ao pin answer, arrastando a imagem sob um marcador fixo.
- **Resultado:** todos os marcadores aparecem juntos na tela do anfitrião. Se há mapa de calor é **(não confirmado)**.
- **Dá pontos:** não; não é possível configurar pontos.

#### 4.2.5 Nuvem de palavras (`word_cloud`)

- **Propósito:** dar voz a todos e visualizar termos recorrentes.
- **Configuração:** pergunta de até 120 caracteres; cada resposta com até **20 caracteres**; **1 resposta por participante**.
- **Tempo:** 20 s a 4 min.
- **No dispositivo:** campo de texto curto.
- **Resultado:** ao fim do tempo, forma-se a nuvem; respostas repetidas por mais pessoas aparecem em **fonte maior**.
- Filtro de palavrões e ocultação de termos pelo anfitrião são **(não confirmado)**.
- **Dá pontos:** não.

#### 4.2.6 Pergunta aberta (`open_ended`)

- **Propósito:** respostas livres.
- **Configuração:** pergunta de até 120 caracteres; resposta de até **250 caracteres**. O jogador **escolhe uma palavra para destacar** na própria resposta.
- **Tempo:** ⚠️ o artigo específico diz **30 s** a 4 min; o artigo geral de tipos diz 20 s a 4 min.
- **Resultado:**
  - Ao fim do tempo, o anfitrião escolhe mostrar as respostas ou pular.
  - As respostas aparecem num mural rolável; o anfitrião clica numa para ampliar e pode **ocultar** respostas individuais.
- **Restrição:** menores de 16 anos não podem usar perguntas de texto livre, por GDPR, COPPA e FERPA.
- **Dá pontos:** não.

#### 4.2.7 Brainstorm (`brainstorm`)

- **Propósito:** coletar, agrupar e votar ideias.
- **Fase 1, envio:**
  - Cada participante envia até **5 ideias**; o criador define o número exato.
  - Cada ideia tem até **75 caracteres**.
  - Tempo de **30 s a 4 min**, padrão **120 s**.
- **Fase 2, agrupamento:** as ideias são agrupadas automaticamente por IA, e o apresentador pode ajustar arrastando.
- **Fase 3, votação:**
  - Até **180 s**.
  - Cada jogador vota em **quantas ideias quiser**.
  - As **3 ideias mais votadas rendem 1000 pontos por voto** ao autor.
  - Votar na própria ideia **não dá pontos**.
- **Atribuições:** só a fase de envio é usada.
- **Dá pontos:** sim, apenas para os autores das 3 ideias mais votadas.

### 4.3 Grupo "Slides"

- **Regras gerais:**
  - Blocos de conteúdo sem resposta, **sem tempo limite de resposta e sem pontos**.
  - Título de até **50 caracteres**; texto de até **250 caracteres** (os limites variam por layout).
  - Mídia: imagem (upload ou biblioteca), YouTube ou Vimeo.
  - **Reações** vêm ligadas por padrão em slides, com **1 reação por jogador por slide**.
  - Um kahoot com slides **não permite randomizar a ordem das perguntas**.
  - O avanço é manual pelo anfitrião **(não confirmado se o autoplay avança slides e com qual duração)**.
- **Layouts:** o blog oficial cita seis — clássico, título grande, título e texto, marcadores, citação e mídia grande. O Kahoot 360 menciona 10 variações de layout.
- **Limites de caracteres por layout** são **(não confirmado)**.

| Layout (PT) | Code name | Campos |
|---|---|---|
| Clássico | `classic` | Título, texto e mídia opcional. É o formato original. |
| Título grande | `big_title` | Cabeçalho, subcabeçalho e imagem opcional. |
| Título e texto | `title_text` | Título e texto livre mais longo. |
| Pontos principais | `bullets` | Título, lista de marcadores e imagem ou vídeo opcional. |
| Citação | `quote` | Citação em destaque (autor **não confirmado**), com ou sem imagem. |
| Mídia grande | `big_media` | Mídia (imagem ou vídeo) ocupando a maior parte, com texto opcional. |

---

## 5. Tempo e pontos

### 5.1 Tempos limite permitidos

**Faixas oficiais por tipo:**

| Tipo | Mínimo | Máximo |
|---|---|---|
| Quiz, Verdadeiro ou falso, Enquete | 5 s | 4 min (240 s) |
| Controle deslizante | 10 s | 4 min |
| Resposta curta, Puzzle, Pin answer, Drop pin, Nuvem de palavras | 20 s | 4 min |
| Pergunta aberta | 20 s ou 30 s ⚠️ | 4 min |
| Escala, NPS | 30 s | 4 min |
| Brainstorm (envio) | 30 s (padrão 120 s) | 4 min; votação até 180 s |

**Valores discretos do seletor:**
- Confirmados: **5, 10, 15, 20, 30, 60, 120 e 240 s**.
  - O de **15 s** foi adicionado em 25/11/2025; antes o seletor pulava de 10 para 20.
  - O máximo antigo era 120 s e hoje é 4 min.
  - O importador de planilha aceita 5, 10, 20, 30, 60 e 120.
- A existência de **90 s** e de outros valores intermediários é **(não confirmado)**.
- **Padrão:** 20 s na importação. O padrão no editor é **(não confirmado; provavelmente 20 s)**.

**Tempo de leitura (ReadTime):**
- Antes de liberar as respostas, a pergunta é mostrada por **no mínimo 5 s**.
- Perguntas longas ganham mais tempo, calculado a partir de uma velocidade média de leitura de 180 palavras por minuto, com peso maior para símbolos. Se o cálculo passar de 5 s, vale o calculado.
- **Esse tempo não conta no tempo de resposta.**
- Fonte: post do blog de engenharia do Kahoot (Medium), citado por busca. Um post da comunidade confirma os 5 s automáticos.

### 5.2 Configuração de pontos

| Opção (PT) | Code name | Pontos possíveis (P) |
|---|---|---|
| Padrão | `standard` | 1000 |
| Pontos em dobro | `double` | 2000 |
| Sem pontos | `noPoints` | 0 |

- **Não é possível** desligar a redução por tempo em partidas ao vivo.
- Alternativas no Kahoot:
  - Modo **Accuracy**: 1 ponto por acerto, sem velocidade.
  - Atribuição com cronômetro desligado: sem redução por tempo.

### 5.3 Fórmula oficial de pontuação (modo clássico)

Segundo o artigo oficial "How points work", para uma resposta **correta**:

```
pontos = arredondar( (1 − ((tempoResposta / tempoLimite) / 2)) × pontosPossíveis )
```

Passo a passo oficial:
1. Divida o tempo de resposta pelo tempo limite da pergunta.
2. Divida o resultado por 2.
3. Subtraia esse valor de 1.
4. Multiplique pelos pontos possíveis (1000 ou 2000).
5. **Arredonde para o inteiro mais próximo.**

**Regras especiais:**
- **Resposta correta em menos de 0,5 s:** a fórmula não é aplicada e o jogador recebe **sempre o máximo** de pontos.
- **Resposta errada ou sem resposta:** 0 pontos. O status na API é `TIMEOUT` quando não houve resposta.
- **Consequências (derivado):** respondendo correto no último instante (t = T), o jogador leva **metade** dos pontos, ou seja, 500 no padrão ou 1000 no dobro. A faixa de uma resposta correta é portanto `[P/2, P]`.
- **Desempate no arredondamento:** o artigo diz só "inteiro mais próximo". O comportamento em .5 exato é **(não confirmado)**; sugestão para o Quizio: `Math.round`, que arredonda .5 para cima.
- **Resolução de tempo:** a fórmula usa tempo contínuo. Se o Kahoot mede em milissegundos é **(não confirmado)**; sugestão: medir no servidor em ms.

**Exemplo oficial:** tempo limite de 30 s, resposta aos 2 s, pergunta padrão.
- 2 ÷ 30 = 0,0667
- 0,0667 ÷ 2 = 0,0333
- 1 − 0,0333 = 0,9667
- 1000 × 0,9667 = 966,7
- Arredondando: **967 pontos**.

**Exemplos adicionais (derivado)**, pergunta de 20 s:

| Situação | Cálculo | Pontos |
|---|---|---|
| Correta em 0,3 s, padrão | < 0,5 s, máximo | **1000** |
| Correta em 5 s, padrão | 1 − (5/20)/2 = 0,875 → 875 | **875** |
| Correta em 5 s, dobro | 0,875 × 2000 = 1750 | **1750** |
| Correta em 12 s, padrão | 1 − (12/20)/2 = 0,7 → 700 | **700** |
| Correta em 19,9 s, padrão | 1 − (19,9/20)/2 = 0,5025 → 502,5 | **503** (com arredondamento half-up) |
| Errada em 1 s | — | **0** |
| Sem resposta | — | **0** |
| Correta, "Sem pontos" | 0 × fator | **0** |

### 5.4 Múltipla escolha (multi-select)

Há ⚠️ **conflito entre fontes oficiais**:

| Fonte | Regra |
|---|---|
| "How points work" (support) | Perguntas de múltipla escolha oferecem **até 500 pontos por resposta correta**. |
| "How to let participants choose more than one answer" (support) e o blog oficial de 23/04/2020 | **Até 1000 pontos por alternativa correta marcada** (2000 com dobro), reduzidos pelo tempo. **Se o jogador marcar qualquer alternativa errada, recebe 0.** O blog observa que por isso uma pergunta de múltipla escolha vale de 2 a 4 vezes uma pergunta comum. |

**Consenso:**
- Os pontos são por **alternativa correta marcada**.
- A redução por tempo usa a mesma fórmula, contando a partir do envio pelo botão "Enviar".
- **Qualquer alternativa errada zera** a pergunta.
- Marcar só parte das corretas, sem nenhuma errada, é `PARTIALLY_CORRECT` e rende pontos só pelas corretas marcadas **(derivado da regra "por alternativa correta marcada" somada ao enum da API)**.
- Se o arredondamento é por alternativa ou no total é **(não confirmado)**.

**Exemplo (derivado)** com 1000 por alternativa: 30 s, 3 alternativas corretas e 1 errada, envio aos 8 s.
- Fator = 1 − (8/30)/2 = 0,86667.
- Marcou as 3 corretas: 3 × 1000 × 0,86667 = 2600,0 → **2600**.
- Marcou 2 corretas e nenhuma errada: 2 × 866,67 = 1733,3 → **1733** (`PARTIALLY_CORRECT`).
- Marcou 2 corretas e 1 errada: **0** (`WRONG`).
- Com a regra de 500 por alternativa, os valores caem pela metade: 1300 e 867.

**Recomendação para o Quizio:** implementar a regra mais recente e detalhada (1000 por alternativa correta, zero se marcar errada), deixando o valor-base por alternativa como constante configurável.

### 5.5 Sequência de acertos (Answer streak)

- **Regra atual (oficial):** desde **31/07/2020**, a sequência de acertos **não dá pontos** no modo clássico.
  - O Kahoot anunciou a decisão em março de 2020 e a aplicou em julho.
  - A sequência **continua existindo e sendo exibida**, como incentivo.
  - A justificativa foi que o bônus prejudicava alunos com desempenho mais baixo e distorcia o resultado do jogo, por isso deixou de ser opção configurável.
  - Durante a partida aparecem mensagens de celebração sobre jogadores em sequência e sobre quem subiu 3 ou mais posições.
- **Regra antiga (histórica, até 2020)** **(terceiros)**:
  - 2º acerto seguido: +100; 3º: +200; limite de **+500 por resposta a partir do 6º acerto seguido**.
  - Os valores do 4º (+300) e do 5º (+400) são **(derivado, não confirmado)**.
  - O bônus não dependia da velocidade.
  - Era uma opção de jogo que podia ser desligada nas versões antigas.
  - O relatório em planilha ainda tem as colunas "Score (points)" e "Score without Answer Streak Bonus", resquício desse sistema.
- **Modo Confiança (Confidence, desde 22/12/2025):** tem bônus ligado a sequências.
  - Depois de escolher a resposta, o jogador decide entre **Turbinar (Boost)** e **Jogar seguro**.
  - Resposta turbinada correta: +50 (nível 1), +75 (nível 2) ou +100 (nível 3, teto).
  - Resposta turbinada errada: −50, −75 ou −100 conforme o nível, e a sequência volta ao nível 1.
  - Jogar seguro usa a pontuação clássica.
- **Recomendação para o Quizio:**
  - Contar e exibir `streak` por jogador (acertos consecutivos; zera com erro ou sem resposta).
  - Sem bônus de pontos no modo clássico, igual ao Kahoot atual.
  - Opcionalmente, oferecer uma flag `streakBonus` com a regra antiga.

### 5.6 Outros modos de pontuação

- **Modo equipe:**
  - A pontuação da equipe é a **média** das pontuações individuais dos membros, cada uma calculada pela fórmula.
  - Durante o jogo aparecem só as pontuações das equipes; as individuais ficam no relatório.
- **Accuracy (Precisão):**
  - **1 ponto por acerto**, sem velocidade e sem dobro.
  - "Sem pontos" continua respeitado.
  - Múltipla escolha parcialmente correta e controle deslizante quase correto **contam como acerto**.
  - Opção de tempo ilimitado.
  - O pódio mostra "x de y" acertos.
- **Controle deslizante:** 20% velocidade e 80% precisão (seção 4.1.4).
- **Brainstorm:** 1000 por voto recebido pelas 3 ideias mais votadas.

### 5.7 Exemplo numérico completo de uma partida curta (derivado)

Três perguntas padrão de 20 s. Jogadores Ana e Beto.

| # | Ana | Beto |
|---|---|---|
| P1 (Quiz) | correta em 4 s → 1 − 0,1 = 0,9 → **900** (total 900; sequência 1) | correta em 0,4 s → **1000** (total 1000; sequência 1) |
| P2 (V/F) | correta em 10 s → 0,75 → **750** (total 1650; sequência 2) | errada → **0** (total 1000; sequência 0) |
| P3 (Quiz, dobro) | correta em 16 s → 0,6 × 2000 = **1200** (total 2850; sequência 3) | correta em 2 s → 0,95 × 2000 = **1900** (total 2900; sequência 1) |

Resultado: Beto em 1º com 2900 e Ana em 2º com 2850, 50 pontos atrás. A sequência 3 da Ana é exibida, mas não rende bônus.

---

## 6. Partida ao vivo (fluxo do anfitrião)

### 6.1 Início

1. O anfitrião abre um kahoot (biblioteca ou Discover) e clica em **"Organizar ao vivo" (Host live)**.
   - Requisitos: navegador suportado, tela de pelo menos 1024×768 (projetor ou compartilhamento de tela) e internet estável.
   - É possível montar uma playlist com vários kahoots **(fora do MVP)**.
2. **Escolha da experiência:**

   | Experiência | Code name | Resumo |
   |---|---|---|
   | Clássico | `classic` | Cada um joga individualmente, com pontuação por velocidade. |
   | Equipe | `team` | Times; ver seção 7. |
   | Precisão | `accuracy` | Correção vale mais do que velocidade. |
   | Confiança | `confidence` | Turbinar ou jogar seguro, com bônus e penalidade. |
   | Palestra | `lecture` | Foco em conteúdo e ritmo controlado pelo anfitrião; ver 8.5. |
   | Profissional | `professional` | Reuniões e apresentações formais. |
   | Experiências lideradas por alunos | Tallest Tower, Color Kingdoms, Treasure Trove, Chill Art | Minijogos. Fora de escopo. |
   | Classic (Large) / Team (Large) | — | Sessões de até 5000 participantes. |

3. **Configurações** pelo ícone de engrenagem no canto inferior direito.
   - Podem ser ajustadas antes de escolher a experiência, no lobby, entre perguntas e durante o jogo.
   - **Ficam salvas** para as próximas sessões.

### 6.2 Opções de jogo (GameOptions)

Lista do artigo oficial "Live game settings" (versão atual):

| Opção (EN oficial) | Code name sugerido | Grupo | Comportamento |
|---|---|---|---|
| Show questions & answers | `showQuestionsOnDevices` | Recomendadas | Mostra pergunta e alternativas no dispositivo do jogador. **Desligado por padrão ao vivo** (o jogador vê só as formas coloridas) e **ligado nas atribuições**. Gratuito. |
| Player identifier | `playerIdentifier` | Recomendadas | Pede um identificador antes do apelido, para combinar relatórios entre partidas. |
| Themes | `themeId` | Recomendadas | Tema visual da sessão. |
| Game characters | `gameCharacters` | — | Jogadores escolhem e personalizam um avatar. |
| Lobby music | `lobbyMusic` | Geral | Faixa do lobby, com opção de voltar à "Original". |
| Sound effects | `soundEffects` | Geral | Liga ou desliga os efeitos sonoros. |
| Language | `interfaceLanguage` | Geral | Idioma da interface e das instruções. Não traduz o conteúdo. |
| Increase contrast | `highContrast` | Acessibilidade | Aumenta o contraste das caixas de resposta. |
| Unlimited time | `unlimitedTime` | Acessibilidade | Sem cronômetro. Só no modo Accuracy. |
| Reactions | `reactions` | Hospedagem | Participantes reagem durante o jogo. |
| Randomize order of questions | `randomizeQuestions` | Hospedagem | Embaralha a ordem das perguntas. **Indisponível se houver slides** e em atribuições. |
| Randomize order of answers | `randomizeAnswers` | Hospedagem | Embaralha a posição das alternativas. |
| Autoplay | `autoplay` | Hospedagem | O jogo avança sozinho. **Começa automaticamente se houver ao menos 1 jogador e passarem 15 s sem novas entradas.** |
| Q&A | `audienceQA` | Hospedagem | A plateia envia perguntas durante a apresentação. |
| Allow team selection | `allowTeamSelection` | Hospedagem | Jogadores escolhem o próprio time. |
| Team Talk | `teamTalk` | Aprendizagem | Tempo de discussão da equipe antes de responder (seção 7). |
| Nickname generator | `nicknameGenerator` | Segurança e privacidade | O jogador toca em "Girar!" para ganhar um apelido. **Máximo de 3 giros.** |
| 2-Step Join | `twoStepJoin` | Segurança e privacidade | Depois do PIN, o jogador toca 4 botões no padrão exibido na tela do anfitrião. **O padrão muda a cada 7 s.** |
| Lock game joining | `locked` | Controle | Trava novas entradas (ícone de cadeado). |
| Full screen | — | Controle | Esconde a interface do navegador. |
| End kahoot | `endGame` | Controle | Encerra antes do fim e pula para os resultados e o pódio. |

**Opções da tela antiga de Game Options** (versões até cerca de 2019, por blog de terceiros), ainda úteis como referência:
- Answer streak bonus.
- Name generator.
- **Podium** (mostrar pódio).
- Randomize order of questions / answers.
- Enable 2-step join.
- **Display game PIN throughout** (manter o PIN visível durante o jogo).
- **Show minimized intro instructions** (instruções iniciais minimizadas).
- **Automatically move through questions** (avançar automaticamente).
- **Require players to rejoin after each kahoot**.
- **Friendly nickname filter:** filtro de apelidos impróprios. Hoje é sempre ativo; ver seção 9.

> **Sem paywall no Quizio:** todas as opções acima podem ficar disponíveis. Para o MVP bastam `showQuestionsOnDevices`, `randomizeQuestions`, `randomizeAnswers`, `nicknameGenerator`, `lockGame`, `autoplay`, `lobbyMusic` e `showPodium`.

### 6.3 Lobby

- **PIN do jogo:**
  - Numérico, exibido em destaque no topo do lobby.
  - Ao vivo, o PIN e o QR **valem até 8 horas**; na atribuição, até o prazo.
  - PINs são temporários e ligados a uma sessão específica.
  - **Número de dígitos: (não confirmado).** Fontes de terceiros citam 6 ou 7 dígitos, e há relatos de que já foram 6 e passaram a 7. Sugestão para o Quizio: 6 ou 7 dígitos, sem zero à esquerda e únicos entre as sessões ativas.
- **Formas de entrada:** URL `kahoot.it` com o PIN, **link direto** e **QR code**. Link e QR pulam a digitação do PIN, mas não pulam os outros requisitos (identificador, apelido, entrada em duas etapas).
- **Lista de jogadores:** os apelidos aparecem conforme entram, com contador.
  - A contagem exata exibida e o limite de nomes na tela são **(não confirmado)**.
- **Remover jogador:** clicar no apelido no lobby. No modo equipe, também é possível arrastar o apelido para outro time.
  - Se o removido pode voltar é **(não confirmado)**; em atribuições, um participante não pode reentrar com o mesmo apelido.
- **Travar:** cadeado que impede novas entradas.
- **Iniciar:** botão **Start** a qualquer momento.
  - **Jogadores ainda podem entrar com o jogo em andamento** nas experiências que permitem, desde que a entrada não esteja travada.
  - Com Autoplay, o jogo inicia sozinho após 15 s sem novas entradas, se houver ao menos 1 jogador.
- **Música do lobby** com controle de volume; vídeo de lobby opcional.
- **Limite de participantes:** depende do plano no Kahoot (seção 12). No Quizio, é um limite técnico configurável.

### 6.4 Ciclo de vida da pergunta (máquina de estados)

```
LOBBY
  └─(start)→ GAME_INTRO ─────────────────────────────┐   (não confirmado: "Prepare-se" / título do kahoot)
                                                      ▼
┌──────────── para cada bloco (na ordem, ou embaralhado) ─────────────┐
│  [slide] SLIDE ──(next do anfitrião)──────────────────────────────► │
│                                                                      │
│  [pergunta]                                                          │
│  QUESTION_INTRO (ReadTime ≥ 5 s: pergunta sem alternativas)          │
│      └→ ANSWERING (countdown = TimeLimit; alternativas liberadas)    │
│            ├─(timer = 0)──────────────┐                              │
│            ├─(todos responderam)──────┤ (não confirmado, ver nota)   │
│            └─(anfitrião pula)─────────┤                              │
│                                       ▼                              │
│      RESULTS (gráfico de distribuição + resposta correta revelada)   │
│            └─(next)→ SCOREBOARD (top 5)                              │
│                         └─(next)→ próximo bloco                      │
└──────────────────────────────────────────────────────────────────────┘
  └─(último bloco ou End kahoot)→ PODIUM (top 3) → GAME_OVER (feedback / jogar novamente / relatório)
```

**Notas sobre as transições:**
- **Encerramento antecipado quando todos respondem:** é comportamento amplamente conhecido, mas **não achei confirmação em fonte oficial (não confirmado)**. Recomendado no Quizio.
- **Pular:** o anfitrião pode avançar manualmente em cada etapa com o botão "Próximo" ou "Pular" **(o nome exato do botão é não confirmado)**. Com Autoplay, as transições são automáticas.
- **Placar após cada pergunta:** no clássico, o placar top 5 aparece automaticamente depois de cada pergunta e **não pode ser desligado** (resposta a um pedido da comunidade). Na Palestra, o placar fica oculto a menos que o anfitrião o mostre.
- **Tipos de opinião:** a etapa RESULTS mostra a visualização do tipo (nuvem, mural, escala, marcadores). Nesses tipos, a presença do SCOREBOARD é **(não confirmado)**; como não há pontos, é razoável pulá-lo.
- **Pergunta aberta:** depois do tempo, o anfitrião escolhe entre mostrar as respostas e pular.

**O que cada tela mostra em cada estado:**

| Estado | Tela do anfitrião (compartilhada) | Dispositivo do jogador |
|---|---|---|
| LOBBY | PIN, QR, link, lista de apelidos, contador, música, botões Start e Travar. | Após entrar: confirmação "Você entrou" e o apelido na tela **(texto exato não confirmado)**. |
| QUESTION_INTRO | Texto da pergunta (e mídia) com barra ou contagem de leitura. | Número da pergunta ou "Prepare-se" **(não confirmado)**; com Show Q&A ligado, também a pergunta. |
| ANSWERING | Pergunta, mídia, alternativas com cor e forma, **contador regressivo** e **número de respostas recebidas** **(contador de respostas não confirmado)**. | Botões de cor e forma; com Show Q&A ligado, também textos. Na múltipla escolha, botão Enviar. Depois de responder, tela de espera **(não confirmado)**. |
| RESULTS | **Distribuição**: quantos escolheram cada alternativa, com destaque da(s) correta(s) e porcentagens. | **Correta ou incorreta**, **pontos ganhos** na pergunta e **sequência de acertos**. Se o dispositivo mostra qual era a alternativa correta é **(não confirmado)**; há pedido na comunidade para revelar, o que sugere que não mostra. |
| SCOREBOARD | **Top 5** com apelido e pontuação, mensagens de sequência e de quem subiu 3 ou mais posições. | Pontuação total e posição. A mensagem "você está N pontos atrás de X" é **(não confirmado)**; o formato exato não foi achado em fonte oficial. |
| PODIUM | **Top 3** com animação e medalhas; em seguida, pontuação final. | Top 5 veem a **posição e ícone de medalha** (quem está no pódio); do 6º em diante veem **só a pontuação**, sem posição. |
| GAME_OVER | Opções "Obter feedback", "Jogar novamente" e acesso ao relatório. | Formulário de feedback, se enviado pelo anfitrião. |

### 6.5 Cores e formas das respostas

| Ordem | Cor | Forma | Code name |
|---|---|---|---|
| 1 | Vermelho | Triângulo | `red_triangle` |
| 2 | Azul | Losango | `blue_diamond` |
| 3 | Amarelo | Círculo | `yellow_circle` |
| 4 | Verde | Quadrado | `green_square` |
| 5 | Turquesa **(não confirmado)** | Pentágono **(não confirmado)** | `teal_pentagon` |
| 6 | Roxo **(não confirmado)** | Triângulo invertido **(não confirmado)** | `purple_inverted_triangle` |

- **Pareamento cor e forma:** o artigo oficial de acessibilidade confirma que cada cor tem uma forma geométrica distinta.
- **Mapeamento das 4 primeiras:** **(terceiros)**.
- **Ordem nas posições:** **(não confirmado)**.
- Com "Randomize order of answers", as posições são embaralhadas **para toda a sessão**. Se é igual em todos os dispositivos é **(não confirmado)**; há pedido na comunidade para randomizar por dispositivo, o que sugere que hoje não é assim.

### 6.6 Final da partida

- **Pódio:** top 3.
- **"Get feedback"** (Obter feedback): envia uma pesquisa curta de satisfação aos participantes. As respostas entram no relatório. Não disponível no app móvel.
- **"Play again"** (Jogar novamente): reinicia com **fantasmas**, simulações dos jogadores anteriores que tentam bater a pontuação passada.
- **Relatório:** acessível ao fim (seção 10).
- **Encerramento antecipado:** "End kahoot" pula direto para o pódio.

---

## 7. Modo equipe (Team mode)

- **Configurações:**
  - **Jogador contra jogador: Clássico** (individual).
  - **Equipe contra equipe, dispositivos compartilhados:** um dispositivo por equipe. Disponível para contas escolares, de ensino superior e pessoais; não para business.
  - **Equipe contra equipe, dispositivos pessoais:** cada membro no próprio aparelho.
- **Formação dos times:**
  - **Distribuição automática** em times predefinidos, com **rebalanceamento automático** quando alguém sai.
  - Com a opção "Allow team selection" (lineups personalizados), os jogadores veem nomes de time sugeridos e escolhem em qual entrar.
  - O anfitrião pode arrastar apelidos entre times no lobby.
- **Dispositivo compartilhado:**
  - Cada time indica um **líder**, que entra com o PIN, digita as respostas e cadastra o apelido de cada colega.
- **Team Talk (tempo de conversa):**
  - **Ligado por padrão.** Dá aos times um tempo para discutir antes de responder.
  - Duração de **5 a 20 s, conforme o tempo limite da pergunta**.
  - Pode ser desligado nas configurações.
  - A tabela exata de tempo limite para duração é **(não confirmado)**.
  - Se o Team Talk desconta do tempo de resposta é **(não confirmado)**; sugestão: é uma fase separada entre QUESTION_INTRO e ANSWERING.
- **Pontuação:**
  - Pontuação do time = **média** das pontuações individuais dos membros, calculadas pela fórmula clássica.
  - Placar e pódio mostram **times**; as pontuações individuais aparecem só no relatório.
  - No dispositivo compartilhado, como a média se aplica (uma resposta por time) é **(não confirmado)**.
- **Limite:** o total de membros somando todos os times não passa do limite de participantes do plano.
- **Número máximo de times e membros por time:** **(não confirmado)**.

---

## 8. Outros modos

### 8.1 Atribuir (Assign / Challenge, no ritmo do aluno)

- **Configurações:**
  - **Prazo** de até **28 dias** no futuro, com precisão de hora. Alguns planos permitem sem prazo. O prazo pode ser alterado ou removido antes de expirar.
  - Cronômetro da pergunta liga/desliga; desligado, não há redução de pontos por tempo.
  - Randomizar a ordem das respostas.
  - Identificador do jogador.
  - Gerador de apelidos (até 3 giros).
  - **A ordem das perguntas não pode ser randomizada** em atribuições.
- **Entrada:** link direto, PIN (kahoot.it ou app) ou QR code. **Não precisa de conta.**
- **Dinâmica:**
  - Cada participante avança pergunta a pergunta **no próprio ritmo**.
  - As perguntas aparecem sempre no dispositivo (Show Q&A ligado por padrão).
  - É possível pausar e retomar no **mesmo navegador e dispositivo**, se o cache não foi limpo e o prazo não passou.
  - Não é possível reentrar com o mesmo apelido.
- **Encerrar:** "End now" no relatório fecha a atribuição para novos participantes.
- **Edição posterior:** mudar o kahoot **não atualiza** atribuições existentes.
- **Relatório:** acompanhamento em tempo real com número de participantes, tempo restante, resultados individuais, perguntas difíceis, quem precisa de ajuda e quem não terminou.

### 8.2 Jogar solo (Solo)

- **Clássico solo:** o usuário joga sozinho contra **jogadores virtuais gerados por computador**. Entre as perguntas aparece um placar com esses jogadores, como numa partida ao vivo.
- **Outras variantes:** minijogos (Tallest Tower, Treasure Trove, Chill Art).
- **Sem relatórios** na web. Dá para jogar de novo para melhorar a pontuação. O app móvel salva o progresso e a maior pontuação.

### 8.3 Aprender (Learn)

- Formato de "deslizar", inspirado em redes sociais.
- O usuário responde para avançar e, ao final, vê a pontuação e pode reiniciar para repetir as que errou.
- **Sem relatórios.**

### 8.4 Flashcards

- Cartões com a pergunta na frente e a resposta no verso; toque para virar.
- **Deslizar para a direita:** marca como dominado.
- **Deslizar para a esquerda:** o cartão volta mais tarde na mesma sessão (repetição).
- **Sem relatórios.**

### 8.5 Palestra (Lecture)

> O mapeamento do botão "Palestra" da interface em português para a experiência "Lecture" é **(não confirmado)**, mas é o equivalente mais provável.

- Pensado para aulas e apresentações que misturam slides, perguntas e feedback.
- **Diferenças em relação ao clássico:**
  - Começa **sem esperar todos entrarem**, e jogadores entram depois do início.
  - O anfitrião **controla o ritmo** com o botão Próximo (teclado, espaço ou passador de slides).
  - **Placares ocultos** a menos que o anfitrião escolha mostrar; ele decide se revela o ranking final.
  - Efeitos sonoros ligados por padrão.
  - Cadeado para travar novas entradas.
  - Ênfase competitiva reduzida.
- Recursos associados: sincronizar Google Slides e PowerPoint, reações e Q&A da plateia.

---

## 9. Entrada do jogador (kahoot.it)

1. **Acessar** `kahoot.it` (ou o app) e digitar o **PIN do jogo**, depois Enter. Alternativas: abrir o **link direto** ou escanear o **QR code**, que pulam só a digitação do PIN.
2. **Identificador do jogador**, se o anfitrião ativou.
3. **Entrada em duas etapas**, se ativa: reproduzir o padrão de **4 blocos** exibido na tela do anfitrião. O padrão muda a cada 7 s, o que dificulta a entrada de quem não vê a tela.
4. **Apelido:**
   - **Digitado** pelo jogador, ou **gerado** ("Girar!"; até **3 giros**; combinações adjetivo + animal, cerca de 800 combinações de duas palavras em 2017).
   - **Filtro de apelidos:** o Kahoot mantém uma lista de palavras universalmente impróprias. Se o apelido contém uma delas, é **trocado automaticamente por algo neutro**.
   - O anfitrião ainda pode remover jogadores.
   - **Tamanho máximo:** **(não confirmado)**. Fontes de terceiros citam **15 caracteres**, com espaços contando.
   - **Apelidos duplicados na mesma sessão ao vivo:** **(não confirmado)**. Em atribuições, não é possível reentrar com o mesmo apelido.
   - Depois de entrar no lobby, o apelido fica fixo para a sessão **(terceiros)**.
5. **Entrada tardia:** permitida em experiências suportadas enquanto o jogo não estiver travado.
6. **Reconexão:**
   - Se o dispositivo desconectar, o jogador volta ao `kahoot.it` ou ao app e toca em **"Tap to rejoin game"**, escolhendo **"Resume as [apelido]"**, para retomar **como o mesmo jogador**.
   - **Se escolher um apelido novo, a pontuação anterior é zerada** (vira outro jogador).
   - O Kahoot recomenda não atualizar a página manualmente e não criar uma nova entrada quando houver opção de retomar.
   - Em atribuições, o progresso é retomado no mesmo navegador e dispositivo.
   - O que acontece com perguntas perdidas durante a queda é **(não confirmado)**; o esperado é que contem como sem resposta (0 pontos).
   - **Recomendação para o Quizio:** token de jogador por sessão guardado no `localStorage` e reconexão automática ao mesmo `playerId`.
7. **Solução de problemas:** conferir o PIN, confirmar que a sessão do anfitrião segue ativa e digitar o PIN manualmente se o link ou QR falhar.

---

## 10. Relatórios (Reports)

- **Quando são gerados:** para cada partida ao vivo e cada atribuição. **Não** para solo, Aprender ou Flashcards.
- **Exclusão:** relatórios são **independentes do kahoot**. Excluir o kahoot não apaga os relatórios, que são arquivados ou excluídos separadamente.

### 10.1 Resumo (por partida)

- Pontuação média.
- Número de participantes.
- Número de perguntas.
- **Duração** (só ao vivo).
- Modo de jogo.
- Data.
- Nome do anfitrião.
- Compartilhamento do pódio.
- Percentual geral de acertos e erros.
- **Perguntas difíceis:** acertadas por **menos de 35%** dos participantes. Com **3 ou mais**, o Kahoot oferece criar rapidamente um novo kahoot com elas para reforço.
- **Precisa de ajuda:** lista de participantes com baixo desempenho, "com base nos resultados". O **limite exato é (não confirmado)**.
- **Não terminou:** quem não completou, relevante em atribuições.

### 10.2 Por participante (aba Participants)

- Leaderboard com **% de acertos**, **perguntas não respondidas** e **pontuação final**.
- Clicar num participante mostra o resultado dele pergunta a pergunta.
- Com o identificador do jogador, relatórios de várias partidas podem ser **combinados**.

### 10.3 Por pergunta (aba Questions)

- Desempenho do grupo em cada pergunta.
- Na planilha: **contagem por alternativa** e **tempo médio de resposta**.
- Por jogador na pergunta: alternativa escolhida, correção, pontos, pontuação acumulada e tempo de resposta.

### 10.4 Feedback

- Respostas agregadas da pesquisa de feedback enviada ao final.
- As perguntas exatas da pesquisa são **(não confirmado)**.

### 10.5 Exportação

- **Download em XLSX** ou salvar no **Google Drive**; também **imprimir**.
- **Abas da planilha:**

  | Aba | Conteúdo |
  |---|---|
  | Overview | Metadados da sessão, desempenho geral (% corretas/incorretas, média) e feedback. |
  | Final Scores | Apelido, pontuação total, acertos e erros. |
  | Kahoot! Summary | Leaderboard e, por pergunta, pontos e alternativa de cada jogador. |
  | Uma aba por pergunta | *Answer Summary* (contagem por alternativa, tempo médio) e *Answer Details* (resposta, pontos, acumulado e tempo de cada jogador). |
  | Raw Data | Uma linha por par jogador × pergunta, formatada para tabela dinâmica. |

- **Colunas da Raw Data:** pergunta, alternativas, correta(s), tempo concedido, apelido, resposta, correção, pontos, pontos sem bônus de sequência, pontuação acumulada, tempo de resposta em % e em segundos.
- **API de relatórios** (planos corporativos): dados dos últimos **90 dias**.

### 10.6 Modelo de dados sugerido (baseado na API do Kahoot)

```
GameSession { id, kahootId, kahootVersion, hostUserId, mode, startedAt, endedAt, pin, options }
Participant { id (int, local à sessão), sessionId, nickname, playerIdentifier?, teamId?, joinedAt, leftAt? }
Answer      { sessionId, participantId, blockIndex, status: RECEIVED|TIMEOUT,
              choiceIndexes[] | text | number | pin{x,y} | order[],
              correctness: CORRECT|WRONG|PARTIALLY_CORRECT|ALMOST_CORRECT,
              points, responseTimeMs, streakAfter, totalScoreAfter }
```

---

## 11. Biblioteca e descoberta

### 11.1 Abas e seções da biblioteca

Estrutura observada na interface em português, confirmada em parte pelos artigos:

| Seção | Code name | Comportamento |
|---|---|---|
| Recentes | `recent` | Kahoots usados ou editados recentemente. |
| Rascunhos | `drafts` | Kahoots não salvos como jogáveis. **Excluir um rascunho apaga permanentemente**, sem passar pela lixeira. |
| Favoritos | `favorites` | Kahoots marcados. Não aceita pastas. |
| Compartilhados comigo | `sharedWithMe` | Kahoots que outros compartilharam com o usuário. Não aceita pastas. No Kahoot, **não dá para remover nem "descompartilhar"** um kahoot compartilhado. |
| Minhas pastas | `folders` | Pastas pessoais: criar, renomear, mover, duplicar e excluir. Pastas da organização existem em workspaces de equipe. **Subpastas: (não confirmado)**; o artigo não descreve aninhamento, mas há navegação com "voltar". |
| Lixeira | `trash` | Kahoots, cursos e histórias excluídos. **Sem expiração automática**: ficam até exclusão permanente. **Restaurar** volta ao local original. Exclusão permanente é irreversível. |
| Histórias / Cursos | `stories` / `courses` | Outros tipos de conteúdo do Kahoot. **Fora de escopo.** |

### 11.2 Compartilhamento e coedição

- **Por link:** só para kahoots públicos ou não listados. Kahoots privados não geram link.
- **Com usuários ou grupos:** busca por e-mail ou nome de grupo. O kahoot aparece na aba "Compartilhados comigo" do destinatário.
- **Coedição em workspace:** todos os membros podem editar os kahoots, exceto os **travados** por dono, admin ou criador. Em grupos de workspace pessoal, o membro **duplica antes de editar**.
- **Duplicar:** kahoots públicos podem ser duplicados por qualquer um, se a opção de duplicação estiver permitida.
- **Edição simultânea em tempo real:** **(não confirmado)**.

### 11.3 Grupos

- Espaço para compartilhar uma **coleção curada** de kahoots com poucas pessoas.
- Membros adicionam kahoots e atribuem conteúdo.
- Há ranking do grupo.
- **Só o admin cria o link de convite.**
- Menores de 16 anos não criam nem entram em grupos.
- **Grupo × Workspace:** o workspace é uma biblioteca central única da equipe; o grupo é uma coleção direcionada.

### 11.4 Descoberta pública (Discover)

- Busca por tópico, disciplina ou criador, ou pelo nome de usuário.
- **Filtros:** gratuito ou premium, disciplina, série, papel do criador, idioma.
- **Ordenação:** "Mais relevantes", "Mais jogados", "Maior qualidade".
- Canais de parceiros verificados.
- É possível denunciar conteúdo impróprio.
- Kahoots públicos podem ser duplicados.

---

## 12. Limites do plano grátis do Kahoot que o Quizio NÃO terá

No Quizio tudo fica disponível. Os limites técnicos serão configurações da instância, não planos.

1. **Participantes por sessão:**
   - Kahoot! Go (grátis): **10** (uso pessoal e ensino superior) e **40** (professor K-12), ao vivo e em atribuições.
   - Contas business grátis: **3** jogadores com conteúdo próprio.
   - Planos pagos vão de 50 a 5000.
2. **Tipos de pergunta premium:** Resposta curta, Puzzle, Controle deslizante, Pin answer, Enquete, Escala, NPS, Drop pin, Nuvem de palavras, Pergunta aberta e Brainstorm. **No grátis ficam só Quiz e Verdadeiro ou falso.**
3. **Slides** e layouts de slide avançados.
4. **Mais de 4 alternativas** (5–6) em Quiz e Enquete.
5. **Múltipla escolha** (multi-select).
6. **Imagens de fundo e temas personalizados**; biblioteca premium de imagens.
7. **Visibilidade pública** exige plano pago.
8. **Atribuições sem prazo.**
9. **Seleção de times (lineups personalizados)** e parte das configurações do modo equipe.
10. **Relatórios avançados**, combinação de relatórios e API de relatórios.
11. **Ferramentas de IA** (geração de perguntas e imagens) além da cota gratuita **(cota: não confirmado)**.
12. **Sincronização de Google Slides / PowerPoint** e importação de PDF.
13. **Workspaces de equipe**, pastas da organização e coedição.
14. **Experiências adicionais** (Accuracy, Confidence, Lecture, Professional, Large) conforme o plano **(detalhe por plano: não confirmado)**.
15. **Padrões curriculares**, playlists e hospedagem como convidado **(detalhe por plano: não confirmado)**.

---

## 13. Proposta de MVP para o Quizio

A ordem vai do núcleo que dá valor jogável ao que é acessório. Cada fatia é entregável e testável sozinha.

| # | Fatia | Conteúdo | Justificativa |
|---|---|---|---|
| 1 | **Autenticação e biblioteca básica** | Login (Better Auth já configurado); CRUD de kahoot com título, descrição, capa e visibilidade privado/não listado; abas Recentes e Rascunhos; lixeira com restaurar e excluir. | Sem dono e sem persistência não há o que jogar; reaproveita a base existente do monorepo. |
| 2 | **Editor com Quiz e Verdadeiro ou falso** | Lista de perguntas (adicionar, duplicar, reordenar, excluir); pergunta de até 120 e alternativas de até 75 caracteres; 2–6 alternativas; seleção simples e múltipla; tempo limite; pontos 0/1000/2000; imagem; validação (sem correta, sem título etc.); rascunho × publicado com snapshot de versão. | Os dois tipos cobrem a maior parte do uso e são os únicos gratuitos no Kahoot, bastando para validar o fluxo inteiro. |
| 3 | **Partida ao vivo, modo clássico** | Sessão com PIN, lobby com QR e link, entrada por apelido no dispositivo, máquina de estados completa (intro → respostas → resultados → top 5 → pódio), fórmula oficial de pontos com regra dos 0,5 s, sequência exibida, cores e formas, travar e remover jogadores. Exige canal em tempo real com servidor autoritativo do relógio (no Quizio: porta `RealtimePublisher` sobre o protocolo Pusher, ver ADR 0002). | É o coração do produto; tudo que vem depois reaproveita esse motor. |
| 4 | **Robustez da partida e opções de jogo** | Reconexão por token ("retomar como apelido"), entrada tardia, encerrar antes do fim, randomizar perguntas e respostas, mostrar perguntas no dispositivo, gerador e filtro de apelidos, autoplay, música do lobby. | Quedas de conexão e apelidos impróprios quebram a experiência real em sala; são baratas depois da fatia 3. |
| 5 | **Relatórios** | Persistência de `Answer`, resumo, abas participantes e perguntas, perguntas difíceis (< 35%), quem precisa de ajuda, exportação CSV/XLSX. | Os dados já são coletados na fatia 3; transformá-los em relatório é o principal valor para o anfitrião depois do jogo. |
| 6 | **Mais tipos de "Testar conhecimento"** | Resposta curta (normalização oficial), Puzzle (tudo ou nada), Controle deslizante (margens, 80% precisão e 20% velocidade). | Ampliam o domínio de `Question` e `Answer` sem mudar o motor; controle deslizante e múltipla escolha exercitam `PARTIALLY_CORRECT` e `ALMOST_CORRECT`. |
| 7 | **"Coletar opiniões" básicos** | Enquete, Escala, NPS, Nuvem de palavras, Pergunta aberta (sem pontos, com visualizações próprias em RESULTS). | Transformam o Quizio em ferramenta de engajamento além de quiz; a lógica é simples (sem correção). |
| 8 | **Slides e modo Palestra** | 6 layouts de slide; ritmo manual; placar oculto opcional; reações. | Permite aulas completas num único kahoot; depende do editor e do motor já prontos. |
| 9 | **Atribuir e Jogar solo** | Atribuição com prazo, cronômetro liga/desliga e retomada no mesmo dispositivo; solo com oponentes virtuais. | Reaproveita pontuação e relatórios num fluxo assíncrono, sem tempo real. |
| 10 | **Modo equipe** | Distribuição automática e rebalanceamento, escolha de time, Team Talk, pontuação por média. | Variação do motor ao vivo; vale a pena só com o clássico estável. |
| 11 | **Produtividade do criador** | Importar planilha (.xlsx no modelo oficial), banco de perguntas (buscar em outros kahoots), favoritos, pastas. | Acelera a criação quando já existe volume de conteúdo. |
| 12 | **Extras** | Pin answer e Drop pin; Brainstorm (com agrupamento); Flashcards e Aprender; compartilhamento com usuários e coedição; Discover público; geração por IA; modos Accuracy e Confidence; jogar novamente com fantasmas. | Diferenciais de alto custo (IA, colaboração, interação por imagem) com retorno menor para um uso pessoal. |

---

## 14. Fontes

### Central de ajuda oficial (support.kahoot.com)

- How points work — https://support.kahoot.com/hc/en-us/articles/115002303908-How-points-work
- Kahoot! question types — https://support.kahoot.com/hc/en-us/articles/115002308428-Kahoot-question-types
- Live game settings — https://support.kahoot.com/hc/en-us/articles/115016055107-Live-game-settings
- How to host a live kahoot — https://support.kahoot.com/hc/en-us/articles/360039422694-How-to-host-a-live-kahoot
- Tips for hosting a live game — https://support.kahoot.com/hc/en-us/articles/360039900153-Tips-for-hosting-a-live-game
- How to enable "See questions on participant's screen" — https://support.kahoot.com/hc/en-us/articles/115003197928
- How to randomize questions for Kahoot! games — https://support.kahoot.com/hc/en-us/articles/27877912748051-How-to-randomize-questions-for-Kahoot-games
- How to make a kahoot — https://support.kahoot.com/hc/en-us/articles/115002884788-How-to-make-a-kahoot
- How to change kahoot settings — https://support.kahoot.com/hc/en-us/articles/360056766613-How-to-change-kahoot-settings
- How to make a kahoot public, private, or other — https://support.kahoot.com/hc/en-us/articles/115002930528
- How to import questions from a spreadsheet to your kahoot — https://support.kahoot.com/hc/en-us/articles/115002812547-How-to-import-questions-from-a-spreadsheet-to-your-kahoot
- How to use Kahoot! question bank — https://support.kahoot.com/hc/en-us/articles/16130620877971
- How to generate Kahoot! questions with AI — https://support.kahoot.com/hc/en-us/articles/40988856361747
- How to use Kahoot! AI tools — https://support.kahoot.com/hc/en-us/articles/17152945038355-How-to-use-Kahoot-AI-tools
- How to let Kahoot! participants choose more than one answer — https://support.kahoot.com/hc/en-us/articles/360055064374-How-to-let-Kahoot-participants-choose-more-than-one-answer
- How to add images as answers to kahoots — https://support.kahoot.com/hc/en-us/articles/360055063614
- Kahoot! questions: How to use pin answer question — https://support.kahoot.com/hc/en-us/articles/27330153231635-Kahoot-questions-How-to-use-pin-answer-question
- Kahoot! questions: How to use scale and NPS scale — https://support.kahoot.com/hc/en-us/articles/26882614481427-Kahoot-questions-How-to-use-scale-and-NPS-scale
- Kahoot! questions: How to use open-ended questions — https://support.kahoot.com/hc/en-us/articles/26630693428883-Kahoot-questions-How-to-use-open-ended-questions
- Kahoot! questions: How to use word cloud — https://support.kahoot.com/hc/en-us/articles/26507460634003-Kahoot-questions-How-to-use-word-cloud
- Kahoot! questions: How to brainstorm with Kahoot! — https://support.kahoot.com/hc/en-us/articles/26303497051027-Kahoot-questions-How-to-brainstorm-with-Kahoot
- How to use Kahoot! slides — https://support.kahoot.com/hc/en-us/articles/29644015543315-How-to-use-Kahoot-slides
- Team experience: How to play kahoot in groups — https://support.kahoot.com/hc/en-us/articles/4408679135891-Team-experience-How-to-play-kahoot-in-groups
- Accuracy experience: How to host a kahoot — https://support.kahoot.com/hc/en-us/articles/39818967108627-Accuracy-experience-How-to-host-a-kahoot
- Confidence experience: How to host a kahoot — https://support.kahoot.com/hc/en-us/articles/32200674639261-Confidence-experience-How-to-host-a-kahoot
- Lecture hosting experience — https://support.kahoot.com/hc/en-us/articles/34605900479123-Lecture-hosting-experience-the-essential-toolkit-for-education
- How to assign a kahoot in web platform — https://support.kahoot.com/hc/en-us/articles/360039411334-How-to-assign-a-kahoot-in-web-platform
- Kahoot solo: How to play by yourself on the web platform — https://support.kahoot.com/hc/en-us/articles/115003173007
- How to learn and practice with Kahoot! self-study modes — https://support.kahoot.com/hc/en-us/articles/31566898896029-How-to-learn-and-practice-with-Kahoot-self-study-modes
- How to find Kahoot! PIN — https://support.kahoot.com/hc/en-us/articles/360000109048-How-to-find-Kahoot-PIN
- Kahoot! join: How to join a Kahoot! game — https://support.kahoot.com/hc/en-us/articles/360039890713-Kahoot-join-How-to-join-a-Kahoot-game
- How to handle inappropriate nicknames — https://support.kahoot.com/hc/en-us/articles/115002201267-How-to-handle-inappropriate-nicknames
- How many participants can play a kahoot? — https://support.kahoot.com/hc/en-us/articles/115003072287-How-many-participants-can-play-a-kahoot
- Kahoot! quiz reports — https://support.kahoot.com/hc/en-us/articles/360035063054-Kahoot-quiz-reports
- How to download and use spreadsheet reports — https://support.kahoot.com/hc/en-us/articles/360035547493-How-to-download-and-use-spreadsheet-reports
- Guide to Kahoot! reports API — https://support.kahoot.com/hc/en-us/articles/11735948502931-Guide-to-Kahoot-reports-API
- How to archive, delete, and restore reports — https://support.kahoot.com/hc/en-us/articles/1500004783782-How-to-archive-delete-and-restore-reports
- What is Library Trash and how to delete or restore Kahoot! content — https://support.kahoot.com/hc/en-us/articles/360054269454
- How to use Kahoot! folders — https://support.kahoot.com/hc/en-us/articles/360010810514-How-to-use-Kahoot-folders
- How to share a kahoot — https://support.kahoot.com/hc/en-us/articles/115001615507-How-to-share-a-kahoot
- Discover ready-made kahoots — https://support.kahoot.com/hc/en-us/articles/115002817607
- Kahoot! groups: Intro — https://support.kahoot.com/hc/en-us/articles/360055143154-Kahoot-groups-Intro
- What is the difference between a Group and a Workspace? — https://support.kahoot.com/hc/en-us/articles/360050812594
- How to use workspaces — https://support.kahoot.com/hc/en-us/articles/360053998413
- Does Kahoot! meet accessibility standards? — https://support.kahoot.com/hc/en-us/articles/115004537447-Does-Kahoot-meet-accessibility-standards
- New Kahoot! features and updates — https://support.kahoot.com/hc/en-us/articles/32601683697053-New-Kahoot-features-and-updates
- Comunidade: Disable Answer Streak Bonus (inclui a resposta oficial de 31/07/2020) — https://support.kahoot.com/hc/en-us/community/posts/360033686653-Disable-Answer-Streak-Bonus
- Comunidade: Extending the time to read the question — https://support.kahoot.com/hc/en-us/community/posts/42266794597523
- Comunidade: Time Increments — https://support.kahoot.com/hc/en-us/community/posts/24065894690835-Time-Increments
- Comunidade: Reveal correct answer after each question on all devices — https://support.kahoot.com/hc/en-us/community/posts/34484931017629
- Comunidade: Randomize colours for correct answer on single devices — https://support.kahoot.com/hc/en-us/community/posts/22085595873939

### Blog oficial (kahoot.com/blog)

- Spreadsheet import — https://kahoot.com/blog/2018/08/23/import-kahoot-from-spreadsheet/
- Google Forms + spreadsheet importer — https://kahoot.com/blog/2018/11/13/google-forms-kahoot-spreadsheet-importer/
- Nickname generator — https://kahoot.com/blog/2017/11/09/generate-funny-nicknames-players-live-kahoots/
- Tips to keep nicknames appropriate — https://kahoot.com/blog/2019/03/08/tips-keep-kahoot-nicknames-appropriate/
- Multi-select answers (business) — https://kahoot.com/blog/2020/04/23/remove-guesswork-training-questions-with-multi-select-kahoot/
- How to use puzzle questions — https://kahoot.com/blog/2019/11/20/how-to-use-puzzle-in-classroom/
- Extending time limits beyond 120 secs — https://kahoot.com/blog/2017/02/24/extending-time-limits-beyond-120-secs/
- How to create a kahoot (teachers) — https://kahoot.com/blog/2021/01/28/how-to-create-kahoot-tips-teachers/
- New slide layouts — https://kahoot.com/blog/2021/03/10/new-kahoot-slide-layouts/
- Reports in Kahoot! for business — https://kahoot.com/blog/2020/05/12/insights-reports-kahoot-for-business/

### Terceiros (usados só onde indicado como "(terceiros)")

- Inside Kahoot! (Medium), Dynamic Question Times (via resultado de busca; acesso direto bloqueado) — https://medium.com/inside-kahoot/kahoot-dynamic-question-times-1ef1facead4e
- Emergent Seas: valores antigos do answer streak bonus — https://emergentseas.blogspot.com/2020/06/kahoots-answer-streak-mechanic-is.html
- MathyCathy's Blog: Answer Streak Bonus (2016) — https://www.mathycathy.com/blog/2016/10/kahoot-answer-streak-bonus-good-news-for-math-class/
- Using Educational Technology: lista antiga de Game Options — https://usingeducationaltechnology.com/back-to-school-planning-kahoot-update/
- Kahoot! Wiki (Fandom): Quiz, com o mapeamento cor e forma (via resultado de busca) — https://kahoot.fandom.com/wiki/Quiz
- Kahoot! Wiki (Fandom): Puzzle, tudo ou nada (via resultado de busca) — https://kahoot.fandom.com/wiki/Puzzle
- Robots.net: limite de 15 caracteres no apelido — https://robots.net/tech/how-many-characters-in-kahoot-name/
- GitHub kahoot-hack issue #86: PIN de 7 dígitos — https://github.com/unixpickle/kahoot-hack/issues/86
