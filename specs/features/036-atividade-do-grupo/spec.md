---
id: "036"
title: Grupos 3/5 — Atividade
status: done # draft | approved | planned | in-progress | done
contexts: [groups, media, game]
created: 2026-10-26
---

# 036 — Grupos 3/5 — Atividade

## Contexto e problema

A spec 038 criou o **mural (`GroupFeed`)** da aba Atividade, mas só com publicações de atribuição: quem não pode atribuir não tem como falar com o grupo, e "Publicar algo", "Criar publicação" (na caixa, no cartão "Configurar seu grupo" e no estado vazio) continuam "Em breve". Hoje um grupo não serve para avisar a turma da prova, mandar a foto do quadro ou o PDF da apostila.

O usuário mandou as capturas do fluxo no Kahoot em 2026-10-26:

1. a página do grupo vista pelo **administrador**: a caixa **"Publicar algo"** com **Criar publicação**, **Compart.** e **Atribuir**, o cartão "Configurar seu grupo" e uma publicação de atribuição;
2. **"Criar publicação"**: o campo **"Digite seu texto"** com o contador **500**, a faixa **"Adicionar à minha publicação"** com dois ícones, **Cancelar** e **Publicar** (indisponível);
3. a dica do primeiro ícone: **"Compartilhar kahoot/curso"**;
4. a dica do segundo: **"Atribuir kahoot/curso"**;
5. **"Selecionar kahoot"**, igual ao da spec 038, com **Fechar**;
6. **"Configurações da atividade atribuída"** aberto a partir da publicação: os mesmos campos da spec 038, mas com **Cancelar** e **"Adicionar à publicação"**;
7. "Criar publicação" de volta, com o **cartão do kahoot** e o **X** no lugar da faixa, e Publicar indisponível com o texto vazio;
8. o mural com **"{nome} compartilhou uma mensagem"**, a data, o ⋮, o texto, **"0 curtidas"** e **Curtir**;
9. o ⋮ dessa publicação, para quem a fez: **"Excluir publicação"**, em vermelho;
10. a mesma página vista por um **membro**: sem ⚙, a caixa só com **Criar publicação** e **Compart.**, e a publicação do administrador sem ⋮;
11. "Criar publicação" do membro: a faixa só com o ícone de compartilhar.

Observações do usuário: "Publicar algo" e os botões "Criar publicação" fazem todos a mesma coisa, abrir o diálogo; na faixa, compartilhar e atribuir abrem "Selecionar kahoot", e o que muda é o passo seguinte (compartilhar volta direto à publicação; atribuir passa antes pelas configurações); o membro não atribui, só compartilha. O usuário quer ir além do Kahoot e anexar **imagem**, **PDF** e **links**, para o grupo ser um ambiente mais completo.

Esta é a etapa 3 das 5 de Grupos, entregue depois da 038. O **compartilhar kahoot** fica "Em breve" até a spec 037, que cria a aba Compartilhado.

## Objetivo

Todo membro do grupo escreve uma publicação no mural, com texto, uma imagem ou um PDF, e os endereços que escrever viram links. Quem pode atribuir também anexa uma atividade à publicação. O grupo passa a ser o lugar onde se avisa, se manda material e se atribui.

## Personas

- **Administrador (`GroupRole` `admin`)**: publica, anexa e atribui; exclui qualquer publicação do grupo.
- **Membro (`GroupRole` `member`)**: publica e anexa imagem ou PDF; atribui só com "Os membros podem criar atividades" ligada (spec 035); exclui as próprias publicações.

## Histórias de usuário

- **HU-01**: Como membro, quero escrever um aviso para o grupo, para falar com todos de uma vez.
- **HU-02**: Como membro, quero anexar uma imagem ou um PDF à publicação, para mandar material sem sair do Quizio.
- **HU-03**: Como membro, quero que os endereços que escrevo virem links, para indicar um site ou um vídeo.
- **HU-04**: Como quem pode atribuir, quero atribuir um quiz de dentro da publicação, para explicar a atividade no mesmo lugar.
- **HU-05**: Como autor ou administrador, quero excluir uma publicação, para corrigir um engano.

## Regras de negócio

### Abrir "Criar publicação"

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | **Todo membro** do grupo, o administrador incluído, pode **criar uma publicação (`GroupPost`)**. Nenhuma chave das Configurações do grupo limita publicações de texto, imagem ou PDF; "Os membros podem compartilhar conteúdo" vale para o compartilhar kahoot (spec 037) e "Os membros podem criar atividades" para o atribuir (RN-12). Quem não é membro não publica. | capturas 1, 10 e 11 · spec 035 |
| RN-02 | Abrem o mesmo diálogo **"Criar publicação"**: o campo **"Publicar algo"**, o botão **Criar publicação** da caixa, o passo **"Criar publicação"** do cartão "Configurar seu grupo" e o **Criar publicação** do mural vazio. Todos deixam de ser "Em breve". | observação do usuário (2026-10-26) · spec 034, RN-15, RN-17 |
| RN-03 | A caixa "Publicar algo" mostra **Criar publicação** e **Compart.** a todos (Compart. "Em breve" até a spec 037) e **Atribuir** a quem pode atribuir (spec 038, RN-01). O Atribuir da caixa continua com o fluxo da spec 038. | capturas 1 e 10 · spec 038, RN-02 |

### O diálogo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-04 | **"Criar publicação"** tem o campo **"Digite seu texto"** com o **contador** de caracteres restantes (de 500), a faixa **"Adicionar à minha publicação"**, **Cancelar** e **Publicar**. Na faixa, nesta ordem: **Imagem**, **PDF**, **Compartilhar kahoot** ("Em breve") e **Atribuir kahoot** (só para quem pode atribuir), cada um com a dica do nome. | capturas 2 a 4 e 11 · decisão do usuário (2026-10-26) para Imagem e PDF |
| RN-05 | O texto tem de **0 a 500 caracteres** (contados com `characterCount`), sem os espaços das pontas, e guarda as quebras de linha; o campo não aceita mais que 500. | captura 2 · spec 038, RN-12 |
| RN-06 | **Publicar** fica disponível quando há **texto ou um anexo** (texto só de espaços conta como vazio) e nenhum envio de arquivo está em andamento. Publicar põe a publicação **no topo do mural** e fecha o diálogo; fica ocupado enquanto publica, e uma recusa deixa o diálogo aberto com o que foi escrito. | decisão do usuário (2026-10-26) · capturas 2 e 7 |
| RN-07 | Uma publicação tem **no máximo um anexo**: uma imagem, um PDF ou uma atividade atribuída. Com um anexo, a faixa dá lugar à **prévia do anexo com o X**; o X tira o anexo e traz a faixa de volta, mantendo o texto. | captura 7 · decisão do usuário (2026-10-26) |
| RN-08 | **Cancelar** fecha o diálogo sem publicar nada: nenhuma atividade é criada e um arquivo já enviado é descartado. | spec 038, RN-11 |

### Imagem

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-09 | **Imagem** escolhe um arquivo **JPG, PNG, GIF ou WebP de até 10 MB**, os mesmos das imagens das perguntas. O envio começa na hora, com o andamento na prévia; a prévia mostra a imagem com o X. Outro tipo é recusado com "Use uma imagem JPG, PNG, GIF ou WebP."; um arquivo maior, com "A imagem passa de 10 MB."; uma falha no envio, com "Não foi possível enviar a imagem." e a faixa de volta. | decisão do usuário (2026-10-26) · spec 007 |
| RN-10 | No mural, a imagem aparece **abaixo do texto**, na largura da publicação, sem cortar e com altura limitada; acioná-la abre a imagem **ampliada** sobre a página, com Fechar (e Esc). | decisão do produto (2026-10-26) |

### PDF

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-11 | **PDF** escolhe um arquivo **PDF de até 20 MB**, o mesmo limite do assistente de criação. A prévia mostra o ícone de PDF, o **nome do arquivo** e o **tamanho** ("2,4 MB"), com o X. Outro tipo é recusado com "Use um arquivo PDF."; um maior, com "O arquivo passa de 20 MB."; uma falha no envio, com "Não foi possível enviar o arquivo.". No mural, o mesmo cartão (ícone, nome e tamanho) **abre o PDF numa aba nova**, onde o navegador o mostra e deixa baixar. | decisão do usuário (2026-10-26) · spec 027 |

### Atribuir kahoot

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-12 | **Atribuir kahoot** aparece só para quem pode atribuir no grupo (spec 038, RN-01). Abre **"Selecionar kahoot"** (spec 038, RN-04 a RN-06); escolher um quiz abre **"Configurações da atividade atribuída"** com o prazo e as opções da spec 038 (RN-07 a RN-09), mas com **Cancelar** e **"Adicionar à publicação"** no lugar de "Adicionar mensagem", "Atribuir agora" e Fechar. | capturas 4 a 6 · observação do usuário (2026-10-26) |
| RN-13 | **"Adicionar à publicação"** volta a "Criar publicação" com o **cartão do quiz** (capa com "N perguntas", título, dono) e o X, mantendo o texto. **Fechar** em "Selecionar kahoot" e **Cancelar** nas configurações voltam a "Criar publicação" sem anexo, mantendo o texto. Nada é criado até Publicar. | capturas 6 e 7 · decisão do produto (2026-10-26) |
| RN-14 | **Publicar** com uma atividade cria a atribuição com o prazo e as opções escolhidos e a publicação com o texto, que pode ser vazio, exatamente como a spec 038 (RN-03, RN-13 a RN-16): "atribuiu um kahoot", Iniciar, a aba Atribuições. Um prazo que passou enquanto o diálogo estava aberto é recusado (spec 029, RN-17) com o diálogo aberto e a mensagem "O prazo já passou. Remova a atividade e atribua de novo.". | captura 7 · spec 038 |
| RN-15 | A mesma regra de "texto ou anexo" (RN-06) passa a valer no "Criar publicação" aberto por "Adicionar mensagem" (spec 038, RN-11): com o quiz anexado, Publicar fica disponível mesmo com o texto vazio. | decisão do usuário (2026-10-26) |

### Links

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-16 | No mural, os **endereços** que começam com **http://**, **https://** ou **www.** viram **links**, que abrem **numa aba nova**; a pontuação que fecha a frase não entra no link. Fora isso, o texto aparece **como foi escrito**: sem formatação, sem HTML, com as quebras de linha. Não há prévia do site. | decisão do usuário (2026-10-26) |

### A publicação no mural

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-17 | O cabeçalho diz o que foi publicado: **"{nome} compartilhou uma mensagem"** (só texto), **"{nome} compartilhou uma imagem"**, **"{nome} compartilhou um arquivo"** (PDF, e a atribuição que perdeu o anexo, spec 038, RN-16) e **"{nome} atribuiu um kahoot"**. Depois, a data ("26 de outubro às 17:50"), o ⋮ (RN-19), o texto e o anexo, **"N curtidas"** e **Curtir** (spec 038, RN-17 a RN-19, para todo tipo de publicação). | capturas 8 e 9 · decisão do produto (2026-10-26) |
| RN-18 | O mural mistura todos os tipos, **dos mais novos para os mais antigos**. Mostra as **20 mais recentes** e, quando há mais, **"Mostrar mais publicações"**, que traz as 20 seguintes. | spec 038, RN-13 · decisão do produto (2026-10-26) |
| RN-19 | O **⋮** aparece para **quem publicou e para o administrador**. Numa publicação sem atividade, tem só **"Excluir publicação"**, em vermelho, com a lixeira (numa atribuição, continua o da spec 038, RN-20). Os demais não veem o ⋮. | capturas 9 e 10 · spec 038, RN-20 |
| RN-20 | "Excluir publicação" pede confirmação: **"Excluir a publicação?"**, "Ela some do mural para todos." (com um anexo, "Ela some do mural para todos, com o arquivo."), **Cancelar** / **Excluir**. Excluir tira a publicação e as curtidas; a imagem ou o PDF são **apagados**. O servidor recusa o pedido de quem não publicou nem administra o grupo. Numa atribuição, continua a mensagem da spec 038 (RN-21). | captura 9 · spec 038, RN-21 |

### Arquivos e saídas

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-21 | A imagem e o PDF **pertencem à publicação** e só aparecem para os membros, na página do grupo. São apagados com a publicação e com o grupo (spec 034). Um arquivo enviado e não publicado (Cancelar, X, aba fechada) é descartado em até **24 horas**. | decisão do produto (2026-10-26) · spec 027 (envios descartados) |
| RN-22 | Quem sai do grupo ou é removido **deixa as publicações**, com os anexos e o nome; o administrador continua podendo excluí-las (spec 038, RN-31). | spec 038, RN-31 |
| RN-23 | No cartão "Configurar seu grupo", "Criar publicação" aparece **feito** quando o mural tem ao menos uma publicação, de qualquer tipo (spec 038, RN-29). | spec 038, RN-29 |

## Critérios de aceite

### Abrir e escrever

#### CA-01 — Todos abrem "Criar publicação"

- **Dado** Ana (administradora) e Bruno (membro) na aba Atividade
- **Quando** acionam "Publicar algo", Criar publicação da caixa, o passo "Criar publicação" de "Configurar seu grupo" (Ana) ou o Criar publicação do mural vazio
- **Então** cada um abre "Criar publicação", sem "Em breve"
- **E** a caixa de Bruno mostra Criar publicação e Compart. ("Em breve"), sem Atribuir

#### CA-02 — A faixa conforme quem publica

- **Dado** "Criar publicação" aberto
- **Então** Ana vê na faixa Imagem, PDF, Compartilhar kahoot ("Em breve") e Atribuir kahoot, cada um com a dica
- **E** Bruno, com "criar atividades" desligada, vê Imagem, PDF e Compartilhar kahoot, sem Atribuir kahoot
- **E** com a chave ligada, Bruno também vê Atribuir kahoot

#### CA-03 — Publicar uma mensagem

- **Dado** "Criar publicação" aberto, com Publicar indisponível e o contador em 500
- **Quando** Bruno escreve "Prova na sexta" em duas linhas e aciona Publicar
- **Então** o diálogo fecha e o topo do mural mostra "Bruno compartilhou uma mensagem", a data, o texto com a quebra de linha, "0 curtidas" e Curtir
- **E** Ana vê a publicação ao abrir o grupo, e "Criar publicação" aparece feito em "Configurar seu grupo"

#### CA-04 — Limites do texto

- **Dado** "Criar publicação" aberto
- **Então** o campo não aceita mais que 500 caracteres e o contador chega a 0
- **E** só espaços deixam Publicar indisponível
- **E** o servidor recusa uma publicação sem texto e sem anexo, ou com 501 caracteres, e a de quem não é membro

#### CA-05 — Cancelar

- **Dado** "Criar publicação" com texto e uma imagem enviada
- **Quando** Bruno aciona Cancelar
- **Então** o diálogo fecha, nada aparece no mural, e a imagem é descartada

### Anexos

#### CA-06 — Imagem

- **Dado** "Criar publicação" aberto
- **Quando** Bruno escolhe uma foto PNG de 2 MB
- **Então** a faixa dá lugar à prévia com o andamento e, depois, a foto com o X, e Publicar fica disponível mesmo sem texto
- **E** ao publicar, o mural mostra "Bruno compartilhou uma imagem" com a foto; acioná-la a abre ampliada, e Fechar ou Esc fecha
- **E** um arquivo .txt é recusado com "Use uma imagem JPG, PNG, GIF ou WebP.", e uma imagem de 11 MB com "A imagem passa de 10 MB."

#### CA-07 — PDF

- **Dado** "Criar publicação" aberto
- **Quando** Ana escolhe "apostila.pdf" de 2,4 MB e publica com o texto "Leiam até o cap. 3"
- **Então** o mural mostra "Ana compartilhou um arquivo", o texto e o cartão com o ícone de PDF, "apostila.pdf" e "2,4 MB"
- **E** acionar o cartão abre o PDF numa aba nova
- **E** uma imagem escolhida em PDF é recusada com "Use um arquivo PDF.", e um PDF de 21 MB com "O arquivo passa de 20 MB."

#### CA-08 — Um anexo só

- **Dado** uma imagem anexada
- **Então** a faixa não aparece, e não há como anexar um PDF ou uma atividade junto
- **E** o X tira a imagem, devolve a faixa e mantém o texto

### Atribuir kahoot

#### CA-09 — Atribuir pela publicação

- **Dado** Ana com "Criar publicação" aberto e "Revisem até sexta" escrito
- **Quando** aciona Atribuir kahoot, escolhe "Capitais" e aciona "Adicionar à publicação" nas configurações
- **Então** volta a "Criar publicação" com o texto e o cartão de "Capitais" com X, e nenhuma atribuição foi criada ainda
- **E** ao publicar, o mural mostra "Ana atribuiu um kahoot" com o texto e Iniciar, e a aba Atribuições mostra "Capitais"

#### CA-10 — Voltar sem atividade

- **Dado** Ana em "Selecionar kahoot" ou nas configurações, vinda da publicação
- **Quando** aciona Fechar ou Cancelar
- **Então** volta a "Criar publicação" sem anexo, com o texto
- **E** o X do cartão do quiz tira a atividade sem criar nada

#### CA-11 — Atividade sem texto

- **Dado** o cartão de "Capitais" anexado e o texto vazio, aberto pela publicação ou por "Adicionar mensagem" (spec 038)
- **Então** Publicar está disponível, e publicar cria a atribuição com a publicação sem mensagem

### Mural

#### CA-12 — Links

- **Dado** uma publicação "Veja https://exemplo.com/aula, e também www.exemplo.org."
- **Então** os dois endereços aparecem como links que abrem numa aba nova, sem a vírgula nem o ponto final
- **E** "<b>oi</b>" escrito no texto aparece como foi escrito, sem negrito

#### CA-13 — Ordem e "Mostrar mais publicações"

- **Dado** um grupo com 25 publicações de tipos variados
- **Quando** Bruno abre a aba Atividade
- **Então** vê as 20 mais novas, da mais nova para a mais antiga, e "Mostrar mais publicações"
- **E** acioná-lo traz as 5 restantes, e o botão some

#### CA-14 — Curtir uma mensagem

- **Dado** a publicação de texto de Bruno
- **Quando** Ana aciona Curtir
- **Então** vê "1 curtida" e "Curtida", como nas atribuições (spec 038, CA-10)

#### CA-15 — Excluir publicação

- **Dado** a publicação de Bruno com "apostila.pdf"
- **Então** Bruno e Ana veem o ⋮ com "Excluir publicação" (sem "Ver relatório"); Carla (membro) não vê o ⋮
- **E** ao confirmar "Excluir a publicação?", ela some do mural para todos e o PDF deixa de abrir
- **E** o servidor recusa a exclusão pedida por Carla

#### CA-16 — Saídas e exclusão do grupo

- **Dado** que Bruno publicou uma imagem e saiu do grupo
- **Então** a publicação continua, com o nome e a imagem, e Ana pode excluí-la
- **E** excluir o grupo apaga as publicações e os arquivos

## Experiência (telas e estados)

- **Caixa "Publicar algo"**: o ícone de quem está na página, o campo (que funciona como botão) e a linha de botões abaixo (Criar publicação, Compart., Atribuir).
- **Criar publicação** (diálogo): o campo de várias linhas com o contador no canto; a faixa "Adicionar à minha publicação" com os ícones à direita (no celular, a faixa quebra em duas linhas se precisar); ou a prévia do anexo com X: a imagem (com o andamento enquanto envia), o cartão do PDF, ou o cartão do quiz. Cancelar e Publicar centralizados embaixo; Publicar ocupado enquanto publica. Erros de arquivo aparecem abaixo da faixa.
- **Publicação no mural**: cabeçalho (ícone, nome, o que foi publicado, data, ⋮), texto com links, o anexo (imagem na largura do cartão; cartão do PDF; cartão da atividade ou o quadro tracejado), "N curtidas" e Curtir separados por uma linha. "Mostrar mais publicações" no fim; carregando, esqueletos; erro, Tentar novamente.
- **Imagem ampliada**: a imagem sobre o fundo escurecido, inteira na tela, com Fechar.

## Divergências intencionais do Kahoot

- **Imagem, PDF e links** (RN-09 a RN-11, RN-16): o Kahoot só anexa kahoots e cursos. Pedido do usuário, para um grupo mais completo.
- **Texto ou anexo basta** (RN-06, RN-15): no Kahoot, Publicar fica indisponível com o texto vazio mesmo com um anexo (captura 7). Aqui uma foto ou uma atividade podem ir sozinhas.
- **"Compartilhar kahoot" e "Atribuir kahoot", sem "/curso"**: o Quizio não tem cursos.
- **"compartilhou uma imagem"** (RN-17): não há imagem no Kahoot; o cabeçalho segue o padrão dos outros.
- **Fechar e Cancelar voltam à publicação** (RN-13) e **"Mostrar mais publicações"** (RN-18): o que o Kahoot faz não foi visto.

## Fora de escopo

- **Compartilhar kahoot** na publicação e o **Compart.** da caixa: spec 037.
- **Editar** uma publicação depois de publicada.
- **Comentários**, outras reações e quem curtiu.
- **Prévia de links** (título e imagem do site), **vários anexos** por publicação, **vídeo** e outros tipos de arquivo.
- **Notificações** de novas publicações e menções a membros.
- Fixar uma publicação no topo.

## Perguntas em aberto

- [x] Os arquivos do grupo podem ser abertos por quem recebe o endereço do arquivo, fora do Quizio? Respondida pelo [ADR 0017](../../../docs/adr/0017-arquivos-do-grupo.md): o endereço é público e impossível de adivinhar, como o das imagens das perguntas, e deixa de funcionar quando a publicação ou o grupo são excluídos.

## Changelog

- 2026-10-26: spec criada com as capturas do fluxo de publicar no grupo enviadas pelo usuário. Decisões do usuário: "Compartilhar kahoot" fica "Em breve" até a 037; um anexo por publicação (imagem até 10 MB, PDF até 20 MB ou uma atividade); endereços no texto viram links, sem prévia; texto ou anexo basta para publicar, também no "Adicionar mensagem" da 038.
- 2026-10-26: spec aprovada pelo usuário.
- 2026-10-26: spec entregue (status `done`). Escolhas feitas na implementação, dentro das regras: o arquivo é enviado assim que escolhido, com a barra de andamento, e um envio que termina depois do X ou do Cancelar é descartado; o cartão do PDF diz "PDF · 2,4 MB"; o `Progress` foi escrito à mão no estilo do projeto, sem o CLI do shadcn.
