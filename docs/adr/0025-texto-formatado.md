# ADR 0025 — Texto formatado: marcas por trecho ao lado do texto, editor Tiptap e fonte de símbolos

- **Status:** aceito (2026-10-30)
- **Contexto da decisão:** [spec 047](../../specs/features/047-formatacao-do-enunciado/spec.md) (RN-03, RN-04, RN-08, RN-09, RN-16, RN-22, RN-28 a RN-30) · [plano](../../specs/features/047-formatacao-do-enunciado/plan.md)

## Contexto

O enunciado ganha negrito, itálico, subscrito e sobrescrito por trecho, e a spec seguinte leva a mesma barra às respostas. Hoje o enunciado é uma string (`question.text`), lida como texto puro em muitos lugares que continuam precisando de texto puro: o limite de 160 caracteres, a pesquisa dos relatórios, os nomes para leitores de tela e o assistente de criação. O quiz valida a formatação, a partida a copia e os relatórios a mostram, e um contexto não importa o outro. O deploy aplica as migrations antes de o código novo entrar no ar, então o código já publicado convive por um tempo com o banco novo. Os símbolos do diálogo (grego, operadores matemáticos, moedas raras) em boa parte não existem na Montserrat, e cada celular tem fontes de sistema diferentes.

## Decisão

- **O texto puro continua sendo o `text`; a formatação fica ao lado dele.** `TextFormatting` é, por marca (`bold`, `italic`, `subscript`, `superscript`), uma lista de trechos `[início, fim)` em posições do texto (unidades UTF-16, as da string do JavaScript). A forma é normalizada: trechos ordenados, sem se tocar dentro da mesma marca, nas fronteiras dos caracteres percebidos, e subscrito e sobrescrito nunca no mesmo trecho.
- **O valor e as funções puras ficam no shared kernel** (`core/shared/domain/text-formatting.ts`), como a normalização das respostas digitadas e a escala do controle deslizante: normalizar, ler com tolerância o que veio do banco, cortar os espaços das pontas deslocando os trechos, comparar e dividir o texto em segmentos para desenhar. Quem recusa uma formatação inválida ao gravar é o contexto `quiz`.
- **No banco, uma coluna `jsonb` ao lado do texto na pergunta viva** (`question.text_formatting`, `not null default '{}'`). A versão jogável (`quiz_version.questions`) e a cópia da partida (`game_question.question`) já guardam a pergunta inteira em `jsonb` e levam o campo no próprio JSON, lido com tolerância: o que foi gravado antes fica sem formatação. A mudança só acrescenta: o código anterior continua lendo e gravando o `text` e mostra o enunciado sem formatação.
- **As telas desenham a formatação com elementos (`strong`, `em`, `sub`, `sup`), nunca com HTML vindo de fora.** Não há o que sanitizar.
- **O editor é o Tiptap 3** (ProseMirror, sem interface própria, estilizado com Tailwind), com um esquema que só conhece um parágrafo, texto e as quatro marcas. O que o esquema não conhece some ao colar, e o Tiptap já reconhece negrito, itálico, subscrito e sobrescrito no HTML do Word e do Google Docs. O documento do editor é traduzido para texto e formatação por funções puras do app, e o servidor recebe sempre o par.
- **Os agentes de IA usam marcação inline** (`<b>`, `<i>`, `<sub>`, `<sup>`), traduzida no pacote `mcp` para o mesmo par: posições em UTF-16 são fáceis de errar para um modelo de linguagem, e as quatro tags são as que ele já conhece.
- **Uma fonte de símbolos própria, recortada, no design system.** Os caracteres do diálogo que a Montserrat não tem vêm de um recorte das fontes Noto (licença OFL 1.1), gerado por um script e versionado em `packages/ui/src/fonts`, declarado com `unicode-range` logo depois da Montserrat: o navegador só baixa o arquivo quando um desses caracteres aparece. A lista dos caracteres cobertos é gerada junto, e um teste exige que todo símbolo do diálogo esteja nela. O itálico da Montserrat passa a ser carregado, para o `<em>` não sair inclinado artificialmente. A pedido do usuário, a fonte do app passou da Montserrat variável para a estática, como a do Kahoot (a variável, sem hinting, desenhava mais fino no Windows).

## Alternativas consideradas

- **HTML dentro do `text`** (`Quanto é 2<sup>2</sup>?`): uma coluna só, mas toda leitura de texto puro teria de tirar as tags, o limite contaria as tags, o código já publicado mostraria as tags cruas durante o deploy, e desenhar exigiria sanitizar.
- **Trechos com o texto dentro, no lugar do `text`** (`[{ text: "Quanto é 2" }, { text: "2", superscript: true }]`): natural para desenhar, mas trocaria o tipo do `text` em todos os contextos e no banco de uma vez, e o código anterior deixaria de entender os enunciados novos.
- **Posições em caracteres percebidos**: casariam com o limite, mas o editor e o JavaScript trabalham em UTF-16, e cada leitura teria de converter. As fronteiras dos caracteres percebidos entram como regra de normalização.
- **Lexical**: também guarda o formato por trecho e teria servido. O Tiptap deixa o esquema decidir o que entra ao colar, traz as regras de leitura do HTML de documentos para as quatro marcas e documenta o uso com renderização no servidor (`immediatelyRender: false`).
- **Um `contenteditable` feito à mão**: acentos com tecla morta, desfazer, colar e o cursor são o que um editor de texto resolve; refazer isso não compensa.
- **Confiar nas fontes do sistema para os símbolos**: o grego e muitos operadores apareceriam em fontes diferentes em cada aparelho, e símbolos de moeda recentes viram um quadrado em celulares antigos, sem um teste que pegue isso.

## Consequências

- A formatação das respostas (próxima spec) reaproveita o valor, as funções do shared kernel, o editor e a marcação dos agentes.
- Toda tela que mostra o enunciado passa a receber o par `text` + `textFormatting` e a desenhá-lo com o componente comum; uma tela esquecida mostra o texto puro, sem quebrar.
- O assistente de criação e a pesquisa continuam lendo só o texto.
- Acrescentar um símbolo ao diálogo pede rodar o script da fonte de novo, ou o teste de cobertura falha.
- O editor do enunciado depende do ProseMirror, que no jsdom não digita nem seleciona como um navegador: a lógica fica em funções puras testadas em unidade, e digitar, selecionar e colar são cobertos no E2E.
