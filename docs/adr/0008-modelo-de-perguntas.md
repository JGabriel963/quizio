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

## Consequências

- **Um tipo novo não pede tabela nova**, só um formato novo de `content` e seu parser no core. Nenhum join extra.
- **O autosave escreve uma linha por vez**, e a ordem das perguntas é uma coluna simples. Reordenar reescreve as posições de no máximo 200 linhas, numa transação.
- **Contar perguntas é um `count(*)` indexado**, sem ler JSON.
- **O banco não impede um `content` malformado.** A proteção é o core ser a única porta de escrita e o adapter parsear na leitura: um JSON inválido vira erro, não dado corrompido silencioso.
- **Consultas analíticas sobre alternativas** (por exemplo, "todas as alternativas corretas do sistema") ficam mais difíceis. Elas não são necessárias: relatórios leem o snapshot da versão.
- **Editar um quiz depois de jogado não afeta partidas nem relatórios antigos**, que continuam no snapshot.

## Alternativas consideradas

- **Só tabelas** (`question` + `choice` + uma tabela por tipo): integridade forte no banco, mas cada tipo novo vira migração e mais joins, e a maioria dos tipos futuros não tem "alternativas".
- **O quiz inteiro num único `jsonb`**: simples de ler e de versionar, mas cada tecla salva o documento todo, duas abas se sobrescrevem por inteiro e contar perguntas exige ler o JSON.
- **Partidas lendo as linhas vivas de `question`**: dispensa o snapshot, mas uma edição durante ou depois da partida corromperia o placar e os relatórios.
