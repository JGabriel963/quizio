# ADR 0013 — Arte dos avatares: Fluent Emoji Flat no repositório

- **Status:** aceito (2026-10-15)
- **Contexto da decisão:** [spec 028](../../specs/features/028-personagens-dos-jogadores/spec.md) (RN-02, RN-03) · [plano](../../specs/features/028-personagens-dos-jogadores/plan.md)

## Contexto

Os jogadores ganham um avatar (personagem + acessório). Os desenhos do Kahoot são protegidos, e o usuário decidiu usar um conjunto de ilustrações com licença livre. O conjunto precisa de pelo menos 24 rostos de bichos ou criaturas no mesmo estilo e de pelo menos 24 chapéus, óculos e enfeites que fiquem bons sobre todos eles. Também precisa funcionar sem rede de terceiros na hora do jogo e não pode depender da fonte de emoji do aparelho.

## Decisão

- **[Fluent Emoji](https://github.com/microsoft/fluentui-emoji), estilo Flat (SVG), licença MIT.** Os arquivos escolhidos são copiados para `apps/web/public/avatars/` (`characters/`, `accessories/`), com a `LICENSE` e um `SOURCES.md` que liga cada ID ao emoji de origem. A cabeça neutra da grade de acessórios é desenhada pelo Quizio.
- **O core guarda só IDs.** `game/domain/avatar.ts` tem as listas de IDs válidos; arte e nomes em português ficam no catálogo da web, e um teste confere que as duas listas são iguais.
- **São arquivos estáticos do app**, não mídia do usuário: não passam pelo `ObjectStorage` ([ADR 0003](0003-storage-r2.md)).
- **Um ID nunca muda de desenho.** Trocar a arte de um item é criar um ID novo e tirar o antigo do catálogo. A leitura de linhas antigas tolera IDs que saíram.

## Alternativas consideradas

- **Twemoji** (CC BY 4.0): estilo parecido, mas a licença exige atribuição visível.
- **DiceBear**: os estilos com acessórios combináveis não são de bichos, e a licença varia por estilo.
- **Emojis do sistema**: nenhum arquivo, mas a aparência muda de aparelho para aparelho, e o acessório não se encaixa de forma previsível.
- **Desenho próprio**: controle total, mas é trabalho de arte fora do alcance desta feature.

## Consequências

- O avatar é só um rosto, sem o corpo inteiro do Kahoot (divergência registrada na spec).
- O encaixe dos acessórios é feito por posição (`slot`) e conferido a olho numa seção do `/design-system`. Um par que fique ruim sai do catálogo.
- Atualizar o conjunto é copiar arquivos de novo. Nenhuma dependência npm entra.
