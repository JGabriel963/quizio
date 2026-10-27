# ADR 0021 — Temas: catálogo próprio, IDs no shared kernel e cópia na partida

- **Status:** aceito (2026-10-27)
- **Contexto da decisão:** [spec 042](../../specs/features/042-temas-prontos/spec.md) (RN-01 a RN-05, RN-10, RN-19) · [plano](../../specs/features/042-temas-prontos/plan.md)

## Contexto

O criador escolhe um tema para o quiz, e o tema aparece no editor, nas partidas ao vivo e nas atribuições. As ilustrações do Kahoot são protegidas. O tema precisa ser lido pelo contexto `quiz` (que valida a escolha) e pelo `game` (que desenha a partida), e um contexto não importa o outro. Uma partida não pode mudar de tema enquanto acontece. A spec 043 vai acrescentar temas criados pelo usuário.

## Decisão

- **Arte própria, estática no app.** Os temas prontos são SVGs geométricos desenhados pelo Quizio em `apps/web/public/themes/`. São arquivos do app e não mídia do usuário, então não passam pelo `ObjectStorage` ([ADR 0003](0003-storage-r2.md)).
- **O core guarda só IDs, no shared kernel.** `shared/domain/theme.ts` tem `THEME_IDS` e `DEFAULT_THEME_ID`. Nome, grupo, cores e arte ficam no catálogo da web, e um teste confere que as duas listas são iguais, como nos avatares ([ADR 0013](0013-arte-dos-avatares.md)).
- **Um ID nunca muda de desenho.** Trocar a arte é criar outro ID. Uma linha com um ID que saiu do catálogo é lida como o padrão.
- **A partida copia o tema na criação** (`game.theme_id`), como já copia o título e a versão. Trocar o tema do quiz depois não alcança partidas nem atribuições abertas.
- **O contraste é calculado, não declarado.** A cor do texto sobre o fundo sai da razão de contraste do WCAG sobre as cores do tema, e as telas recebem o resultado em variáveis CSS. Um teste exige 4,5:1 em todo o catálogo.

## Alternativas consideradas

- **Enum no Postgres**: cada tema novo pediria uma migration, e um tema retirado quebraria a leitura de linhas antigas.
- **IDs no contexto `quiz` e uma cópia no `game`**: duas listas para manter iguais à mão, ou o `game` importando o `quiz`.
- **Ler o tema do quiz a cada consulta da partida**: o tema mudaria no meio da partida, e uma partida de um quiz excluído perderia o tema.
- **Ilustrações de bancos gratuitos**: estilos diferentes entre si e licenças que variam por imagem. Fica para quando houver temas ilustrados.
- **Tirar o `.dark` dos temas claros**: mudaria as superfícies de dezenas de componentes do jogo. Só o texto que fica direto sobre o fundo muda de cor.

## Consequências

- Acrescentar um tema pronto é desenhar um SVG e acrescentar o ID nas duas listas. Não precisa de migration.
- A spec 043 pode guardar temas personalizados numa tabela própria e referenciá-los pelo mesmo campo, com outro formato de ID. O cálculo de contraste já vale para cores escolhidas pelo usuário.
- A tela de abertura da partida aparece antes de a partida existir e usa o tema que a página tiver à mão, ou o padrão.
