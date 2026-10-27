---
id: "035"
title: Grupos 2/5 — Configurações do grupo
status: done # draft | approved | planned | in-progress | done
contexts: [groups]
created: 2026-10-26
---

# 035 — Grupos 2/5 — Configurações do grupo

## Contexto e problema

A spec 034 entregou os grupos com regras fixas: só o administrador convida, todo membro vê a lista de membros, e o nome é o que foi digitado ao criar. A engrenagem ⚙ do cabeçalho ficou "Em breve". No Kahoot, ela abre **"Configurações do grupo"**, onde o administrador muda o nome, escreve uma descrição e decide o que os membros podem fazer. O usuário mandou as capturas dessa tela em 2026-10-26 (capturas 12 a 14 da spec 034):

- o título **"Configurações do grupo"** com o botão de voltar;
- **"Personalizar grupo"**: **"Nome e descrição"**, "Fale um pouco sobre o seu grupo." e **Editar**;
- **"Pessoas"**: **"Os membros podem convidar outras pessoas"** ("Permitir que os membros convidem novas pessoas para participar.") e **"Os membros podem ver quem está no grupo"** ("A lista de membros ficará visível para todos no grupo."), as duas ligadas;
- **"Conteúdo compartilhado"**: **"Os membros podem compartilhar conteúdo"** ("Permite que os membros compartilhem conteúdos e pastas com o grupo. Caso a opção seja desativada, somente os administradores poderão compartilhar conteúdo."), ligada;
- **"Atividades atribuídas"**: **"Os membros podem criar atividades"** ("Permite que os membros atribuam conteúdos ao grupo. Quando essa opção é desativada, só os administradores podem fazer as atribuições."), desligada;
- **"Saiba mais"**, com o cartão "Quer melhorar seu grupo?" e um link para os artigos de ajuda do Kahoot.

Esta é a etapa 2 das 5 do módulo de Grupos (roadmap 034 a 038). As duas chaves de "Pessoas" mudam telas que já existem; as de conteúdo e atividades preparam as specs 037 e 038.

## Objetivo

O administrador abre ⚙ e muda o nome e a descrição do grupo e o que os membros podem fazer. Com "convidar" ligada, qualquer membro copia o link e chama outras pessoas; com "ver quem está no grupo" desligada, os membros deixam de ver a lista de membros. As outras duas chaves ficam guardadas para quando o compartilhamento e as atribuições chegarem.

## Personas

- **Administrador (`GroupRole` `admin`)**: o único que abre as configurações e muda o grupo.
- **Membro (`GroupRole` `member`)**: o que pode fazer depende das chaves.

## Histórias de usuário

- **HU-01**: Como administrador, quero mudar o nome e escrever uma descrição, para que os membros saibam do que o grupo trata.
- **HU-02**: Como administrador, quero deixar os membros convidarem outras pessoas, para o grupo crescer sem depender só de mim.
- **HU-03**: Como administrador, quero esconder a lista de membros, para proteger quem está no grupo.
- **HU-04**: Como administrador, quero decidir já se os membros vão poder compartilhar conteúdo e criar atividades, para o grupo nascer com as regras que eu quero.
- **HU-05**: Como membro, quero copiar o link de convite quando o administrador permitir, para chamar colegas.

## Regras de negócio

### A tela de configurações

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | A ⚙ do cabeçalho do grupo deixa de ser "Em breve" e leva o administrador à tela **"Configurações do grupo" (`GroupSettings`)**, com o botão de voltar para a página do grupo. Membros continuam sem a ⚙. | captura 12 da spec 034 · spec 034, RN-13 |
| RN-02 | Só o **administrador** abre as configurações. Um membro que chega ao endereço dela vê "Só o administrador do grupo pode mudar as configurações." e o link de volta para o grupo; quem não é membro vê "Grupo não encontrado", como em toda tela do grupo. | spec 034, RN-05 · decisão do produto (2026-10-26) |
| RN-03 | A tela tem, nesta ordem, as seções **"Personalizar grupo"** (Nome e descrição), **"Pessoas"** (convidar e ver membros), **"Conteúdo compartilhado"** (compartilhar) e **"Atividades atribuídas"** (criar atividades), com os títulos, os ícones e os textos de explicação das capturas. | capturas 12 a 14 da spec 034 |

### Nome e descrição

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-04 | **Editar** abre o diálogo **"Nome e descrição"** com o **Nome** (as regras da spec 034, RN-03: 1 a 20 caracteres, sem espaços nas pontas, com o contador) e a **Descrição (`Group.description`)**, opcional, de **até 500 caracteres** (contados como o nome), com o contador; **Cancelar** e **Salvar**. Salvar fica indisponível com o nome vazio. | captura 12 da spec 034 · spec 034, RN-03 · decisão do produto (2026-10-26) |
| RN-05 | A descrição guarda as quebras de linha e perde só os espaços das pontas; uma descrição só de espaços fica vazia. | decisão do produto (2026-10-26) |
| RN-06 | O nome novo aparece em todo lugar onde o grupo é nomeado (cabeçalho, listas, "Grupos recentes", tela do convite, confirmações). A descrição aparece em **"Informações do grupo"**, abaixo do nome, e não aparece quando está vazia. | spec 034, RN-19 · decisão do produto (2026-10-26) |

### As chaves dos membros

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-07 | O grupo tem **quatro permissões dos membros (`GroupPermissions`)**, cada uma uma chave: **convidar outras pessoas** (`membersCanInvite`), **ver quem está no grupo** (`membersCanSeeMembers`), **compartilhar conteúdo** (`membersCanShare`) e **criar atividades** (`membersCanAssign`). Elas valem só para os membros: o administrador pode tudo, sempre. | capturas 12 e 13 da spec 034 |
| RN-08 | Um grupo novo nasce com as chaves do Kahoot: **convidar, ver membros e compartilhar ligadas; criar atividades desligada**. Os grupos que já existem recebem os mesmos valores. | captura 12 da spec 034 · decisão do usuário (2026-10-26) |
| RN-09 | Acionar uma chave **grava na hora**, sem botão Salvar, e só aquela chave: duas chaves mudadas ao mesmo tempo (em duas abas, por exemplo) ficam as duas. Se a gravação falhar, a chave volta para onde estava e aparece "Não foi possível salvar a configuração.". | captura 12 da spec 034 · decisão do produto (2026-10-26) |
| RN-10 | As chaves valem **no próximo pedido de cada membro**: quem está com a página aberta vê a mudança ao recarregar ou voltar à tela. O servidor confere a chave em todo pedido, então uma tela antiga nunca faz o que a chave proíbe. | spec 034 (sem tempo real) · decisão do produto (2026-10-26) |

### Convidar

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-11 | Com **convidar** ligada, o membro vê **"Adicionar membros"** na página do grupo e em "Membros do grupo" (quando pode vê-la), e o diálogo **"Convidar usuários"** com o link e **Copiar**, **sem "Redefinir link"**, que continua só do administrador. O cartão "Configurar seu grupo" continua só do administrador. | spec 034, RN-16, RN-21, RN-22 · decisão do usuário (2026-10-26) |
| RN-12 | Com **convidar** desligada, o membro não vê "Adicionar membros", e o servidor não dá o link a ele. Desligar **não troca o link**: quem já o tem continua entrando por ele, e o administrador o redefine se quiser impedir isso. A tela do convite não muda: aceita quem chegar com um link válido. | spec 034, RN-23, RN-24, RN-30 · decisão do produto (2026-10-26) |

### Ver quem está no grupo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-13 | Com **ver membros** desligada, o membro **não vê** os ícones dos membros no cabeçalho, nem "Ver membros" no menu ⋮, nem a tela "Membros do grupo". Quem chega ao endereço dela vê "O administrador ocultou a lista de membros." e o link de volta para o grupo. O servidor não manda a lista para ele. | captura 12 da spec 034 · decisão do usuário (2026-10-26) |
| RN-14 | Mesmo com a lista oculta, **"Informações do grupo"** continua mostrando ao membro o nome, a descrição, o **administrador**, o **total de membros** e a data de criação. | spec 034, RN-19 · decisão do usuário (2026-10-26) |
| RN-15 | Com **ver membros** desligada e **convidar** ligada, o membro continua com "Adicionar membros" na página do grupo; só a tela de membros fica fechada. | decisão do produto (2026-10-26) |

### Compartilhar conteúdo e criar atividades

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-16 | **Compartilhar conteúdo** e **criar atividades** aparecem e gravam como as outras chaves, mas **ainda não mudam nada nas telas**: "Compart." e "Atribuir" continuam "Em breve" para todos. Elas passam a valer com as specs 037 (Compartilhado) e 038 (Atribuições), que vão usar o valor guardado. | decisão do usuário (2026-10-26) |

## Critérios de aceite

### A tela

#### CA-01 — Abrir as configurações

- **Dado** o administrador na página do grupo
- **Quando** aciona a ⚙
- **Então** chega a "Configurações do grupo", com Personalizar grupo, Pessoas, Conteúdo compartilhado e Atividades atribuídas, nesta ordem, e o botão de voltar leva à página do grupo
- **E** a ⚙ não está mais marcada "Em breve"

#### CA-02 — Só o administrador

- **Dado** um membro do grupo
- **Quando** abre o endereço das configurações
- **Então** vê "Só o administrador do grupo pode mudar as configurações." e o link de volta para o grupo
- **E** quem não é membro vê "Grupo não encontrado"
- **E** o servidor recusa qualquer mudança de nome, descrição ou chave pedida por um membro

#### CA-03 — Valores padrão

- **Dado** um grupo recém-criado, e um grupo criado antes desta spec
- **Quando** o administrador abre as configurações de cada um
- **Então** os dois têm convidar, ver membros e compartilhar ligadas, e criar atividades desligada

### Nome e descrição

#### CA-04 — Editar o nome e a descrição

- **Dado** o diálogo "Nome e descrição" de "Turma 7A"
- **Quando** o administrador muda o nome para "Turma 7B", escreve "Revisão para a prova\nde quinta" e salva
- **Então** o cabeçalho, as listas e "Grupos recentes" mostram "Turma 7B"
- **E** "Informações do grupo" mostra a descrição com a quebra de linha, para o administrador e para os membros

#### CA-05 — Limites

- **Dado** o diálogo "Nome e descrição"
- **Quando** o nome está vazio
- **Então** Salvar fica indisponível
- **E** o nome não passa de 20 caracteres e a descrição de 500, com os contadores indo a 0
- **E** uma descrição de 500 caracteres (emoji contando como 1) é aceita
- **E** o servidor recusa um nome vazio ou de 21 caracteres e uma descrição de 501, mesmo que cheguem sem passar pelo diálogo

#### CA-06 — Descrição vazia

- **Dado** um grupo com descrição
- **Quando** o administrador apaga a descrição (ou deixa só espaços) e salva
- **Então** "Informações do grupo" não mostra mais a linha da descrição

#### CA-07 — Cancelar

- **Dado** o diálogo com o nome e a descrição alterados
- **Quando** o administrador aciona Cancelar
- **Então** nada muda, e reabrir o diálogo mostra os valores salvos

### Chaves

#### CA-08 — Uma chave grava sozinha

- **Dado** as configurações abertas em duas abas
- **Quando** o administrador desliga "convidar" numa e liga "criar atividades" na outra
- **Então** ao recarregar, convidar está desligada e criar atividades ligada

#### CA-09 — Falha ao gravar

- **Dado** as configurações abertas e o servidor fora do ar
- **Quando** o administrador aciona uma chave
- **Então** a chave volta para onde estava e aparece "Não foi possível salvar a configuração."

### Convidar

#### CA-10 — Membro convida

- **Dado** um grupo com convidar ligada e Bruno como membro
- **Quando** Bruno abre a página do grupo e aciona "Adicionar membros"
- **Então** vê "Convidar usuários" com o link e Copiar, sem "Redefinir link"
- **E** Carla, que abre esse link, entra no grupo
- **E** o servidor recusa o pedido de Bruno para redefinir o link

#### CA-11 — Convidar desligada

- **Dado** um grupo com convidar desligada
- **Quando** Bruno (membro) abre a página do grupo e "Membros do grupo"
- **Então** não vê "Adicionar membros" em nenhuma das duas
- **E** o servidor recusa dar o link a ele
- **E** o link que já circulava continua levando à tela do convite

### Ver membros

#### CA-12 — Lista oculta

- **Dado** um grupo de 3 membros com ver membros desligada
- **Quando** Bruno (membro) abre a página do grupo
- **Então** não vê os ícones dos membros no cabeçalho nem "Ver membros" no ⋮
- **E** ao abrir o endereço de "Membros do grupo", vê "O administrador ocultou a lista de membros."
- **E** o servidor recusa mandar a lista a ele
- **E** "Informações do grupo" mostra a ele o administrador e "3 membros"

#### CA-13 — O administrador vê sempre

- **Dado** um grupo com ver membros desligada
- **Quando** o administrador abre a página do grupo e "Membros do grupo"
- **Então** vê os ícones, "Ver membros" e a lista inteira, como antes

#### CA-14 — Convidar sem ver membros

- **Dado** um grupo com ver membros desligada e convidar ligada
- **Quando** Bruno (membro) abre a página do grupo
- **Então** vê "Adicionar membros" e copia o link, sem ter acesso à lista de membros

### Chaves futuras

#### CA-15 — Compartilhar e atividades guardadas

- **Dado** as configurações de um grupo
- **Quando** o administrador desliga "compartilhar" e liga "criar atividades"
- **Então** os valores ficam salvos (aparecem assim ao recarregar)
- **E** "Compart." e "Atribuir" continuam "Em breve" na página do grupo, para o administrador e para os membros

## Experiência (telas e estados)

- **Configurações do grupo**: na área de grupos, com a coluna de grupos ao lado. Título com o botão de voltar; um cartão branco com as quatro seções separadas por linhas; cada chave com o ícone à esquerda, o título em negrito, a explicação abaixo e o interruptor à direita, como nas capturas. Estados: carregando (esqueleto), erro ao carregar (Tentar novamente), membro (a mensagem de RN-02), não encontrado.
- **Nome e descrição** (diálogo): Nome com contador; Descrição em caixa de várias linhas com contador; Cancelar e Salvar (ocupado enquanto salva; o erro do servidor aparece ao lado do campo).
- **Informações do grupo**: ganha a linha "Descrição" quando há uma.
- **Página do grupo e Membros do grupo**: "Adicionar membros", os ícones do cabeçalho e "Ver membros" aparecem para o membro conforme as chaves; "Membros do grupo" ganha o estado "O administrador ocultou a lista de membros.".
- Em telas estreitas, as chaves ficam abaixo do texto, alinhadas à direita.

## Divergências intencionais do Kahoot

- **O membro que convida não redefine o link** (RN-11): o Kahoot não diz o que o membro vê no diálogo; redefinir derruba o link de todos, então fica com quem responde pelo grupo.
- **Sem "Saiba mais"**: o cartão leva aos artigos de ajuda do Kahoot, que não existem aqui.
- **A descrição tem limite de 500 caracteres** (RN-04): o limite do Kahoot não foi verificado.
- **As chaves de compartilhar e de atividades não têm efeito ainda** (RN-16): as telas que elas controlam chegam nas specs 037 e 038.

## Fora de escopo

- O efeito de **compartilhar conteúdo** (spec 037) e de **criar atividades** (spec 038).
- **Promover** membros a administrador e **transferir** a administração.
- **Foto ou ícone** do grupo.
- Avisar os membros, em tempo real ou por notificação, que uma chave mudou.
- O cartão "Saiba mais".

## Perguntas em aberto

- [ ] Qual é o limite de caracteres da descrição no Kahoot? Decidido 500 (RN-04) até alguém verificar.
- [ ] O Kahoot mostra a descrição na página do grupo, além das informações? Decidido só em "Informações do grupo" (RN-06).

## Changelog

- 2026-10-26: spec criada a partir das capturas de "Configurações do grupo" enviadas com a spec 034. Decisões do usuário: as chaves seguem o padrão do Kahoot, também nos grupos que já existem; o membro que convida só vê e copia o link; com a lista oculta, o membro ainda vê o total e o administrador; compartilhar e criar atividades entram já, guardadas, sem efeito até as specs 037 e 038.
- 2026-10-26: spec aprovada pelo usuário; plano e tarefas aprovados.
- 2026-10-26: spec entregue (status `done`). Todos os 15 CAs têm teste automatizado verde (core, PGlite, API, componentes e E2E desktop/celular). Escolhas feitas na implementação, dentro das regras: a chave volta para onde estava e o aviso aparece na própria tela de configurações (a tela guarda o valor mostrado, sem depender do cache); a ⚙ é um link para `/groups/{id}/settings`; os interruptores usam o verde do design system. O E2E da spec 034 deixou de esperar que o membro não visse "Adicionar membros", já que convidar fica ligada por padrão.
