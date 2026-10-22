# ADR 0008 — Perguntas em colunas + conteúdo por tipo em JSONB, versão jogável como snapshot

- **Status:** aceito
- **Data:** 2026-09-25

## Contexto

O editor (specs 003 a 007) começa com dois tipos de pergunta: Quiz e Verdadeiro ou falso. O roadmap já prevê pelo menos mais onze tipos: Resposta curta, Puzzle, Controle deslizante, Enquete, Escala, NPS, Nuvem de palavras, Pergunta aberta, Brainstorm, Largar marcador e Slides (kahoot-reference §4). O que é comum a todos é pouco: posição, tipo, enunciado, tempo, pontos e mídia. O resto muda completamente de um tipo para outro:

- Quiz: alternativas com flag de correta e modo de seleção.
- Controle deslizante: mínimo, máximo, valor e margem.
- Puzzle: itens em ordem.
- Resposta curta: respostas aceitas.

Além disso:

- O editor salva automaticamente, campo a campo (spec 003), e precisa de escritas pequenas.
- A biblioteca precisa contar perguntas sem carregar o conteúdo.
- Uma partida não pode mudar se o quiz for editado depois (kahoot-reference §3.6; constituição, artigo V).

## Decisão

1. **Uma linha por pergunta** na tabela `question`, ligada ao quiz. As **colunas** guardam o que é comum a todo tipo e é consultado, ordenado ou contado: `quiz_id`, `position`, `type`, `text` e, a partir das specs 004 e 007, `time_limit_seconds`, `points` e `image_key`.
2. **O conteúdo específico de cada tipo fica numa coluna `content jsonb`**. Exemplos: as alternativas de um Quiz, a resposta de um V/F, o intervalo de um controle deslizante. O banco não conhece a forma desse JSON. Quem valida é o **core**, com um parser puro por tipo, e o `Question` do domínio é uma união discriminada por `type`. O adapter só traduz `jsonb` ↔ objeto e delega a validação ao parser do core.
3. **Itens internos com id estável.** Cada alternativa tem `id` dentro do JSON, para que respostas de jogadores e relatórios apontem para ela mesmo que o texto ou a ordem mudem.
4. **O rascunho é mutável e a versão jogável é um snapshot imutável.** O botão Salvar (spec 006) valida o quiz inteiro e grava o quiz com suas perguntas como um documento `jsonb` numa tabela `quiz_version`. Partidas e relatórios apontam para a versão, nunca para as linhas vivas de `question`.
   - **Atualização (2026-10-01, spec 006):** a versão guarda **só a lista de perguntas**. Título, descrição, capa e visibilidade não entram no snapshot: valem na hora (spec 006, RN-06), e a spec 008 decide o que a partida copia desses dados ao começar. A tabela é `quiz_version (quiz_id, number, questions jsonb, created_at)`, uma linha por versão; o quiz guarda o número da versão vigente e a marca derivada `has_unpublished_changes`.

## Consequências

- **Um tipo novo não pede tabela nova**, só um formato novo de `content` e seu parser no core. Nenhum join extra.
- **O autosave escreve uma linha por vez**, e a ordem das perguntas é uma coluna simples. Reordenar reescreve as posições de no máximo 200 linhas, numa transação.
- **Contar perguntas é um `count(*)` indexado**, sem ler JSON.
- **O banco não impede um `content` malformado.** A proteção é o core ser a única porta de escrita e o adapter parsear na leitura: um JSON inválido vira erro, não dado corrompido silencioso.
- **Consultas analíticas sobre alternativas** (por exemplo, "todas as alternativas corretas do sistema") ficam mais difíceis. Elas não são necessárias: relatórios leem o snapshot da versão.
- **Editar um quiz depois de jogado não afeta partidas nem relatórios antigos**, que continuam no snapshot.

## Atualização — imagem da pergunta (spec 007, 2026-10-01)

A imagem é comum a todos os tipos, então **não entra no `content`**: é a coluna `question.image` (`jsonb`, nula), com a chave do arquivo, a posição (`media` ou `background`), o recorte e o texto alternativo, lida pelo core com `parseStoredImage`. O snapshot da versão guarda a pergunta inteira e, com ela, a imagem.

O recorte é guardado como parâmetros (forma, zoom e posição em frações do percurso livre), não como um arquivo derivado: independe das dimensões da imagem, é desenhado com CSS e pode ser refeito a partir do original.

Os arquivos pertencem ao quiz: um arquivo só é apagado quando nenhuma pergunta viva e nenhuma versão guardada o usa (`releaseUnusedImages`), e todos são apagados na exclusão definitiva. Duplicar uma pergunta compartilha a chave dentro do quiz; duplicar um quiz copia os arquivos para chaves novas.

## Atualização — Resposta curta (spec 031, 2026-10-21)

O primeiro tipo novo confirmou a decisão: `typeAnswer` é um valor a mais do enum `question_type` e um formato a mais do `content` (`{ acceptedAnswers: (string | null)[] }`, de 1 a 4), sem tabela nem coluna na `question`. Duas coisas foram acrescentadas:

- **Tempo por tipo.** Cada tipo diz os tempos que aceita (`timeLimitsFor`, `defaultTimeLimitFor`, `fitTimeLimit` em `question.ts`): a Resposta curta vai de 20 s a 4 min e começa com 30 s. A leitura tolerante de linhas e versões cai no padrão **do tipo**; "Aplicar a todas" e a troca de tipo sobem para o menor tempo do tipo. Os próximos tipos só acrescentam um caso.
- **Normalização no shared kernel.** Comparar respostas digitadas (sem maiúsculas, acentos, espaços extras, a pontuação da lista do Kahoot e os emojis ao lado de texto) é a mesma regra para o editor (pergunta incompleta), para a partida (correção) e para o relatório (agrupamento). Como os contextos não importam funções uns dos outros, `normalizeTypedAnswer` e `groupTypedAnswers` ficam em `core/shared/domain/typed-answer.ts`.

Na partida, a pergunta copiada leva as respostas aceitas (`GameQuestion.acceptedAnswers`, `[]` para os outros tipos e para as cópias gravadas antes) e a resposta grava o texto digitado (`game_answer.text`).

## Atualização — Controle deslizante (spec 032, 2026-10-21)

O segundo tipo seguiu o mesmo caminho: `slider` é um valor a mais de `question_type`, e o `content` guarda `{ min, max, answer, unit, answerMargin }`. Mínimo e máximo podem estar vazios enquanto o criador digita.

- **A escala fica no shared kernel e é calculada em centésimos inteiros.** A etapa, as posições, a margem e a correção (`core/shared/domain/slider-scale.ts`) servem ao editor, à partida e ao relatório. Os números têm no máximo 2 casas e 10 caracteres, então toda a conta é feita em centésimos, que ficam abaixo de 10¹². Assim, "a resposta é uma posição" e "está dentro da margem" são comparações exatas, sem erro de ponto flutuante.
- **As posições contam a partir da resposta.** A resposta é sempre uma posição, e o celular recebe só a parte pública da escala: as pontas, a etapa, a posição inicial e a unidade (`PublicSliderScale`), nunca a resposta nem a margem.
- **A resposta do jogador é um número.** Ela fica em `game_answer.value` (`numeric(14,2)`, nula para os outros tipos). A escala viaja na cópia da pergunta (`GameQuestion.slider`, `null` nas cópias gravadas antes).
- **Um valor novo de correção:** `almostCorrect` (dentro da margem) entra em `answer_correctness` e conta como acerto na sequência e nos relatórios. Os pontos são 80% pela precisão e 20% pela velocidade (`calculateSliderScore`).

## Atualização — Puzzle (spec 033, 2026-10-22)

O terceiro tipo também coube no modelo: `puzzle` é um valor a mais de `question_type`, e o `content` guarda `{ items: (string | null)[] }`, sempre com 4 posições, de cima para baixo. **A ordem das posições é a ordem certa**, e as posições não têm id: a cor e a forma são da posição, e mover uma resposta leva o texto para outro lugar (`puzzleItemMoved`).

- **Na partida, a ordem certa vai na cópia da pergunta.** `toGameQuestion` transforma cada posição preenchida numa alternativa (id da posição, todas `correct`) e guarda os ids na ordem certa em `GameQuestion.correctOrder` (`[]` para os outros tipos e para as cópias gravadas antes). Nenhum dos dois chega ao celular antes da revelação.
- **A correção compara os textos**, posição por posição (`isRightOrder`), e não os ids: respostas repetidas valem em qualquer das posições delas, como diz o artigo do Kahoot.
- **O sorteio nunca sai numa ordem certa.** O Puzzle é sempre embaralhado, com ou sem "Ordem aleatória de respostas". Se o sorteio sair certo, a ordem gira uma casa (`wrongOrderOf`), o que é determinístico e sempre dá uma ordem errada quando os textos não são todos iguais.

## Alternativas consideradas

- **Só tabelas** (`question` + `choice` + uma tabela por tipo): integridade forte no banco, mas cada tipo novo vira migração e mais joins, e a maioria dos tipos futuros não tem "alternativas".
- **O quiz inteiro num único `jsonb`**: simples de ler e de versionar, mas cada tecla salva o documento todo, duas abas se sobrescrevem por inteiro e contar perguntas exige ler o JSON.
- **Partidas lendo as linhas vivas de `question`**: dispensa o snapshot, mas uma edição durante ou depois da partida corromperia o placar e os relatórios.
