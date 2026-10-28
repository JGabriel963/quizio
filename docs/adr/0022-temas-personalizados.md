# ADR 0022 — Temas personalizados: tabela própria, chave estrangeira no quiz e aparência copiada na partida

- **Status:** aceito (2026-10-28)
- **Contexto da decisão:** [spec 043](../../specs/features/043-temas-personalizados/spec.md) (RN-18, RN-19, RN-24, RN-28) · [plano](../../specs/features/043-temas-personalizados/plan.md)

## Contexto

A spec 043 deixa o criador montar temas próprios, com nome, fundo (padrão ou imagem), cor de contraste e logotipo. Esses temas são reaproveitados em vários quizzes, editados e excluídos.

Editar um tema muda os quizzes que o usam, mas não as partidas e atribuições já criadas. Excluir um tema volta os quizzes para o tema Padrão.

A [ADR 0021](0021-temas-catalogo-proprio.md) previa guardar o tema personalizado no mesmo `quiz.theme_id`, com outro formato de ID.

## Decisão

- **Um contexto novo, `themes`**, com o agregado `CustomTheme` na tabela `custom_theme`. O tema não é parte do quiz: um tema serve a vários quizzes do mesmo criador.
- **O quiz aponta para o tema por `quiz.custom_theme_id`**, uma chave estrangeira com `ON DELETE SET NULL`. Quando ela está preenchida, `theme_id` vale `standard`. Assim, excluir o tema devolve o quiz ao Padrão sem nenhum código, e nenhum quiz guarda o ID de um tema que não existe. Isso revê a consequência da ADR 0021 sobre "outro formato de ID".
- **A partida copia a aparência**, e não o ID: `game.custom_theme` é um `jsonb` com o padrão, as cores, a chave da imagem e o seu tom, e a chave do logotipo (`ThemeLook`, no shared kernel). Editar ou excluir o tema não alcança a partida, como trocar o tema do quiz já não alcançava.
- **Os arquivos ficam em `themes/{ownerId}/`.** Um arquivo que sai do tema só é apagado se nenhuma partida o copiou. A consulta é feita sobre `game.custom_theme`.
- **O contraste vai para o shared kernel**, porque o servidor recusa uma cor com a qual nenhum texto chega a 4,5:1. O tom de uma imagem de fundo é medido no navegador, já que o servidor não processa imagens.

## Alternativas consideradas

- **`theme_id = "custom:{id}"` no mesmo campo**: excluir o tema exigiria atualizar os quizzes em código, e um ID solto continuaria possível.
- **A partida guarda o ID do tema**: editar ou excluir o tema mudaria partidas abertas, o que contraria a RN-24.
- **Copiar os arquivos para cada partida**: cada partida duplicaria imagens de até 10 MB, sem ganho, já que basta não apagar o que está em uso.
- **Tema dentro do contexto `quiz`**: o tema não pertence a um quiz, e o `quiz` cresceria com envios e arquivos que não são seus.

## Consequências

- Um arquivo de tema copiado por uma partida que depois é apagada pode ficar órfão. Ele fica para a varredura da [ADR 0003](0003-storage-r2.md).
- Excluir a conta apaga `themes/{userId}/`. Uma atribuição aberta de outra pessoa, criada com o quiz compartilhado de quem saiu, perde a imagem e mostra só a cor.
- As visões de jogo ganham `customTheme` ao lado de `themeId`, e as telas da spec 042 recebem um "tema mostrado" (o ID e, se houver, a aparência).
