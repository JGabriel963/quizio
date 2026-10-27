---
id: "034"
title: Grupos 1/5 — Criar o grupo e convidar membros
status: done # draft | approved | planned | in-progress | done
contexts: [groups]
created: 2026-10-26
---

# 034 — Grupos 1/5 — Criar o grupo e convidar membros

## Contexto e problema

O item **Grupos** está na navegação principal desde a spec 002, marcado "Em breve", e a atribuição (spec 029) mostra "Atribuir a grupos" também "Em breve". Hoje o criador não tem como reunir as pessoas com quem joga sempre (uma turma, uma equipe, uma célula da igreja): cada atividade é mandada de novo, por link ou PIN, para quem estiver na conversa.

No Kahoot, o **grupo (`Group`)** é o ponto de encontro dessas pessoas (kahoot-reference §11.3): um administrador cria o grupo, convida os membros por um link, e o grupo passa a reunir publicações, quizzes compartilhados e atividades atribuídas a todos. O usuário mandou as capturas do módulo em 2026-10-26:

1. **Grupos** vazio: a coluna "Grupos que gerencio" e "Grupos em que participo", a pesquisa, a troca entre cartões e lista, **"Criar grupo"** e o estado vazio com **Colaborar**, **Atribuir** e **Competir** e o texto "Os grupos são o ponto de encontro e comunicação da sua equipe…";
2. o diálogo **"Criar grupo"** com o campo **Nome** ("Adicionar nome do grupo", contador de 20) e **Cancelar** / **Criar grupo**;
3. a **página do grupo** do administrador: o nome, os membros, ⚙ e ⋮; as abas **Atividade**, **Compartilhado** e **Atribuições**; **"Adicionar membros"**; a caixa **"Publicar algo"** com Criar publicação, Compart. e Atribuir; o cartão **"Configurar seu grupo"** (Convidar membros, Atribuir, Criar publicação, "Pular configuração"); e "Ainda não há nenhuma atividade neste grupo…" com **Criar publicação**; na coluna, **"Grupos recentes"** e **"Criar grupo +"**;
4. o diálogo **"Convidar usuários"**: "Compartilhar link de convite", o link, **Copiar**, **"Redefinir link"** com uma ajuda (?) e **Fechar**;
5. a tela de quem abre o link já com sessão: **"O convite para entrar no grupo aguarda sua resposta"**, "Aceite o convite e faça parte do grupo agora.", **Cancelar** / **Aceitar convite**;
6. a página do grupo vista pelo **membro**: sem ⚙, sem "Configurar seu grupo" e sem "Atribuir";
7. a do administrador depois da entrada: "Convidar membros" marcado como feito;
8. o menu ⋮ **"Opções do grupo"**: Informações do grupo, Ver membros, Sair do grupo, Excluir grupo;
9. a tela **"Membros do grupo"**: voltar, pesquisa, "2 de 2 membros do grupo", "Adicionar membros", a tabela **Nome** / **Status** com a marca **"Administrador"**, "Ativo", ⓘ e ⋮;
10. o menu de um membro: **Informações do membro**, **Ver perfil**, **Remover**;
11. o diálogo **"Informações do membro"**: nome de usuário, e-mail, função e status;
12. a tela **"Configurações do grupo"** (⚙): Nome e descrição; "Os membros podem convidar outras pessoas", "Os membros podem ver quem está no grupo", "Os membros podem compartilhar conteúdo" (ligadas) e "Os membros podem criar atividades" (desligada);
13. o perfil público de um membro (Kahoots, Jogos, Participantes, Seguidores, Seguir).

### O módulo inteiro, em etapas

Por decisão do usuário (2026-10-26), Grupos é entregue em partes, começando pelo convite. A análise das capturas dá este mapa (registrado também no roadmap):

| Etapa | O que entra |
| --- | --- |
| **034 — esta spec** | Criar o grupo; as listas "que gerencio" e "em que participo" com pesquisa; a página do grupo com as três abas (conteúdo "Em breve"); "Configurar seu grupo"; convite por link, redefinir o link e aceitar o convite; "Membros do grupo" com informações e remover; informações do grupo; sair do grupo; excluir o grupo |
| 035 — Configurações | Tela "Configurações do grupo": nome e descrição e as quatro chaves de permissão (convidar, ver membros, compartilhar conteúdo, criar atividades), cada uma passando a valer nas telas já entregues |
| 036 — Atividade | "Publicar algo" e "Criar publicação": o mural do grupo, com as publicações dos membros |
| 037 — Compartilhado | Compartilhar quizzes (e depois pastas) com o grupo, para os membros jogarem ou duplicarem (kahoot-reference §11.2) |
| 038 — Atribuições | "Atribuir" no grupo e "Atribuir a grupos" na atribuição (spec 029, RN-24): a atividade aparece para os membros, com o ranking do grupo (kahoot-reference §11.3) |

O **perfil público** do usuário (captura 13: quizzes, jogos, participantes, seguidores, "Seguir") depende da descoberta pública e fica para Extras (roadmap 022); aqui "Ver perfil" é "Em breve".

## Objetivo

O criador cria um grupo, copia o link de convite e o manda para quem quiser; quem abre o link com uma conta aceita o convite e passa a ver o grupo em "Grupos em que participo". O administrador vê quem está no grupo, remove quem não deveria estar, troca o link quando ele vaza e exclui o grupo; o membro pode sair quando quiser.

## Personas

- **Administrador (`GroupRole` `admin`)** — o usuário que criou o grupo. É o único administrador: convida, remove e exclui.
- **Membro (`GroupRole` `member`)** — usuário com conta que entrou pelo link. Vê o grupo e os outros membros, e pode sair.
- **Convidado** — quem recebeu o link. Precisa de uma conta do Quizio para aceitar.

## Histórias de usuário

- **HU-01** — Como criador, quero criar um grupo com um nome, para reunir as pessoas com quem jogo sempre.
- **HU-02** — Como administrador, quero copiar um link de convite, para chamar pessoas para o grupo por qualquer canal.
- **HU-03** — Como administrador, quero redefinir o link, para que um link que vazou deixe de funcionar.
- **HU-04** — Como convidado, quero abrir o link e aceitar o convite, para entrar no grupo.
- **HU-05** — Como usuário, quero ver os grupos que gerencio e os grupos em que participo, e pesquisar entre eles, para chegar rápido a cada um.
- **HU-06** — Como administrador, quero ver quem está no grupo e remover um membro, para manter o grupo só com quem deve estar.
- **HU-07** — Como membro, quero sair de um grupo, para deixar de vê-lo.
- **HU-08** — Como administrador, quero excluir o grupo, para encerrá-lo de vez.

## Regras de negócio

### Grupo e papéis

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Um **grupo (`Group`)** tem um **nome**, um **administrador**, **membros** e um **link de convite**. Quem o cria é o seu **administrador** e é também contado como membro (aparece na lista de membros e no total). | kahoot-reference §11.3 · capturas 3 e 9 |
| RN-02 | Há **dois papéis (`GroupRole`)**: **Administrador** (`admin`) e **Membro** (`member`). Cada grupo tem **exatamente um administrador**, o criador; não há como promover membros nem transferir a administração nesta etapa. | decisão do usuário (2026-10-26) |
| RN-03 | O **nome** do grupo é obrigatório e tem de **1 a 20 caracteres** (contados com `characterCount`), sem espaços nas pontas; o nome é mostrado como foi digitado. Dois grupos podem ter o mesmo nome. | captura 2 (contador de 20) · decisão do produto (2026-10-26) |
| RN-04 | **Sem limite** de grupos por usuário nem de membros por grupo. | constituição, artigo VI |
| RN-05 | Um grupo é visível **só para os seus membros** (o administrador incluído). Para qualquer outro usuário, o grupo e a sua tela de membros são **indistinguíveis de um grupo que não existe**. | decisão do produto (2026-10-26) |

### Lista de grupos

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-06 | O item **Grupos** da navegação principal deixa de ser "Em breve" e leva à tela de grupos; fica destacado em todas as telas de grupo. | spec 002, RN-05, RN-06 |
| RN-07 | A tela de grupos tem duas seções, numa coluna própria ao lado da lista (em telas estreitas, abas): **"Grupos que gerencio"** (os grupos de que o usuário é administrador) e **"Grupos em que participo"** (aqueles de que é membro). A seção aberta fica no endereço. Abrir "Grupos" leva a "Grupos que gerencio". | capturas 1 e 3 · decisão do produto (2026-10-26) |
| RN-08 | Cada seção mostra os grupos em **cartões**, com o nome e o total de membros, dos **mais recentes para os mais antigos** (pela criação em "que gerencio", pela entrada em "em que participo"). Uma **pesquisa** filtra a seção aberta pelo nome, sem diferenciar maiúsculas, minúsculas e acentos. | captura 1 · decisão do produto (2026-10-26) |
| RN-09 | Sem grupos na seção, a tela mostra o **estado vazio** do Kahoot: as ilustrações **Colaborar**, **Atribuir** e **Competir**, o texto "Os grupos são o ponto de encontro e comunicação da sua equipe para compartilhar conteúdos, aprender e se divertir juntos. Crie seu primeiro grupo agora mesmo!" e **"Criar grupo"**. Em "Grupos em que participo" vazio, o texto é "Você ainda não participa de nenhum grupo. Peça o link de convite a quem administra o grupo." e não há botão. Uma pesquisa sem resultados diz "Nenhum grupo encontrado.". | captura 1 · decisão do produto (2026-10-26) |
| RN-10 | A coluna de seções mostra também **"Grupos recentes"**: os **5 grupos** que o usuário abriu por último, do mais recente, com o grupo aberto destacado; e **"Criar grupo +"**. Sem nenhum grupo aberto ainda, "Grupos recentes" não aparece. Um grupo de que o usuário saiu, foi removido ou que foi excluído some da lista. | capturas 3, 9 e 12 · decisão do produto (2026-10-26) |

### Criar o grupo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-11 | **"Criar grupo"** (no topo da tela de grupos, no estado vazio e em "Criar grupo +") abre o diálogo **"Criar grupo"** com o campo **Nome** ("Adicionar nome do grupo") e o contador de caracteres restantes, e os botões **Cancelar** e **Criar grupo**. "Criar grupo" fica indisponível enquanto o nome está vazio (só espaços contam como vazio); o campo não aceita mais de 20 caracteres. | captura 2 |
| RN-12 | Criar o grupo leva o criador à **página do grupo**, com a aba Atividade aberta. | captura 3 |

### Página do grupo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-13 | O cabeçalho da página tem o **nome** do grupo, os **ícones dos membros** (até 3, sobrepostos, com "+N" quando há mais; acionar abre "Membros do grupo"), **⚙ "Configurações do grupo"** (só para o administrador, "Em breve" até a spec 035) e **⋮ "Opções do grupo"**. | capturas 3, 6, 8 e 12 · spec 002, RN-05 |
| RN-14 | As abas são **Atividade**, **Compartilhado** e **Atribuições**, nesta ordem; a aba aberta fica no endereço. Nesta etapa o conteúdo de Compartilhado e de Atribuições é **"Em breve"** (specs 037 e 038). | capturas 3 e 6 · decisão do usuário (2026-10-26) |
| RN-15 | Na aba Atividade, a caixa **"Publicar algo"** aparece com **Criar publicação** e **Compart.** para todos e **Atribuir** só para o administrador, todos **"Em breve"** (specs 036 a 038); abaixo, "Ainda não há nenhuma atividade neste grupo. Faça uma publicação para começar." com **Criar publicação**, também "Em breve". | capturas 3 e 6 · decisão do usuário (2026-10-26) |
| RN-16 | O botão **"Adicionar membros"** aparece **só para o administrador** e abre o diálogo de convite (RN-21). | capturas 3, 6 e 9 · decisão do usuário (2026-10-26) |
| RN-17 | O administrador vê o cartão **"Configurar seu grupo"** na aba Atividade, com três passos: **Convidar membros** (abre o diálogo de convite), **Atribuir** e **Criar publicação** ("Em breve"). "Convidar membros" aparece **feito** (com a marca de concluído, em verde) quando o grupo tem ao menos um membro além do administrador. **"Pular configuração"** esconde o cartão para sempre naquele grupo; o cartão também some sozinho quando os três passos estão feitos. Membros não veem o cartão. | capturas 3, 6 e 7 |
| RN-18 | O menu **⋮ "Opções do grupo"** tem **Informações do grupo** e **Ver membros** para todos, **Sair do grupo** só para membros e **Excluir grupo** só para o administrador. | captura 8 · RN-02 |
| RN-19 | **"Informações do grupo"** abre um diálogo com o nome, o administrador, o total de membros e a data de criação, e **Fechar**. | captura 8 · decisão do produto (2026-10-26) |
| RN-20 | Abrir a página de um grupo o coloca no topo dos **Grupos recentes** do usuário (RN-10). | captura 3 |

### Convite por link

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-21 | O diálogo **"Convidar usuários"** mostra "Compartilhar link de convite", o **link** (truncado quando não cabe) com **Copiar**, **"Redefinir link"** com a ajuda (?) "Gera um novo link. O link atual deixa de funcionar." e **Fechar**. Copiar põe o link na área de transferência e avisa "Link copiado". | captura 4 |
| RN-22 | Só o **administrador** vê e copia o link e o redefine. | kahoot-reference §11.3 ("Só o admin cria o link de convite") · decisão do usuário (2026-10-26) |
| RN-23 | Cada grupo tem **um link de convite válido por vez**, criado com o grupo. O link contém um código secreto, impossível de adivinhar, e **não expira**; vale para **quantas pessoas** o abrirem. | captura 4 · decisão do produto (2026-10-26) |
| RN-24 | **"Redefinir link"** pede confirmação ("Redefinir o link de convite?", "O link atual deixará de funcionar. Quem já entrou continua no grupo.", **Cancelar** / **Redefinir**) e troca o código: o link anterior deixa de funcionar na hora e o diálogo passa a mostrar o novo. | captura 4 · decisão do usuário (2026-10-26) |
| RN-25 | Quem abre um link válido **com sessão** e **não é membro** vê a tela **"O convite para entrar no grupo aguarda sua resposta"**, com a ilustração, o **nome do grupo**, "Aceite o convite e faça parte do grupo agora." e **Cancelar** / **Aceitar convite**. **Aceitar convite** o torna membro e leva à página do grupo; **Cancelar** leva à página inicial, sem entrar. | captura 5 · decisão do produto (2026-10-26) |
| RN-26 | Quem abre um link válido **sem sessão** vai para a tela de entrar (com a opção de criar conta, quando o cadastro está aberto) e, ao entrar, volta à tela do convite (RN-25). O convite **não abre o cadastro** de uma instância com o cadastro fechado. | spec 001 (redirecionamento depois de entrar, cadastro desligável) · decisão do produto (2026-10-26) |
| RN-27 | Quem **já é membro** (ou o administrador) e abre o link vai direto à página do grupo. | decisão do produto (2026-10-26) |
| RN-28 | Um link **redefinido**, de um grupo **excluído** ou que nunca existiu mostra **"Este convite não é mais válido"**, "Peça um novo link a quem administra o grupo." e **Ir para o início**. A tela é a mesma nos três casos. | decisão do produto (2026-10-26) |
| RN-29 | Aceitar duas vezes (dois cliques, duas abas) deixa a pessoa membro **uma vez só**. Aceitar com um link que acabou de ser redefinido falha com a tela de RN-28. | decisão do produto (2026-10-26) |
| RN-30 | Um membro **removido** ou que **saiu** pode voltar pelo link, enquanto ele for válido: remover não é bloquear. Para impedir a volta, o administrador redefine o link. | decisão do produto (2026-10-26) |

### Membros do grupo

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-31 | **"Ver membros"** (e os ícones do cabeçalho) abre a tela **"Membros do grupo"**, com **voltar** (para a página do grupo), uma **pesquisa** pelo nome, o texto **"{mostrados} de {total} membros do grupo"** e, só para o administrador, **"Adicionar membros"**. Todos os membros veem a tela nesta etapa (a chave "Os membros podem ver quem está no grupo" chega com a spec 035). | capturas 9 e 12 |
| RN-32 | A tabela tem as colunas **Nome** e **Status**. Cada linha mostra o ícone do usuário, o **nome** da conta e, para o administrador, a marca **"Administrador"**; o status é **"Ativo"**. O administrador vem primeiro; os demais, por nome. | captura 9 |
| RN-33 | Cada linha tem **ⓘ** (Informações do membro) e **⋮** com **Informações do membro**, **Ver perfil** ("Em breve") e, só para o administrador e nunca na própria linha, **Remover**. | captura 10 · RN-02 |
| RN-34 | **"Informações do membro"** mostra o ícone, **Nome**, **E-mail**, **Função** ("Administrador" ou "Membro") e **Status** ("Ativo"), e **Fechar**. O **e-mail só aparece para o administrador**; um membro vê as informações sem a linha do e-mail. | captura 11 · decisão do produto (2026-10-26) |
| RN-35 | **Remover** pede confirmação ("Remover {nome} do grupo?", "{nome} deixa de ver o grupo. Para impedir que volte pelo link, redefina o link de convite.", **Cancelar** / **Remover**). O removido deixa de ser membro na hora: o grupo some das listas dele e a página do grupo passa a ser, para ele, a de um grupo que não existe. | captura 10 · RN-30 |

### Sair e excluir

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-36 | **"Sair do grupo"** (só membros) pede confirmação ("Sair de {nome do grupo}?", "Você deixa de ver o grupo. Para voltar, vai precisar do link de convite.", **Cancelar** / **Sair**) e leva a "Grupos em que participo". O administrador **não pode sair**: só excluir o grupo. | captura 8 · decisão do usuário (2026-10-26) |
| RN-37 | **"Excluir grupo"** (só o administrador) pede confirmação ("Excluir {nome do grupo}?", "O grupo é excluído para todos os membros e o link de convite deixa de funcionar. Esta ação não pode ser desfeita.", **Cancelar** / **Excluir**) e leva a "Grupos que gerencio". A exclusão é **definitiva** (não há lixeira de grupos) e alcança todos os membros na hora. | captura 8 · decisão do produto (2026-10-26) |

## Critérios de aceite

### Lista e criação

#### CA-01 — Grupos sai de "Em breve"

- **Dado** um criador com sessão
- **Quando** ele aciona Grupos na navegação principal
- **Então** chega a "Grupos que gerencio", com o item Grupos destacado e sem a marca "Em breve"

#### CA-02 — Estado vazio

- **Dado** um criador que não administra nem participa de nenhum grupo
- **Quando** ele abre "Grupos que gerencio"
- **Então** vê Colaborar, Atribuir e Competir, o texto "Os grupos são o ponto de encontro…" e "Criar grupo"
- **E** em "Grupos em que participo" vê "Você ainda não participa de nenhum grupo…" sem botão
- **E** a coluna não mostra "Grupos recentes"

#### CA-03 — Criar um grupo

- **Dado** o diálogo "Criar grupo" aberto
- **Quando** o criador digita "Turma 7A" e aciona Criar grupo
- **Então** chega à página de "Turma 7A" na aba Atividade, como administrador
- **E** "Turma 7A" aparece em "Grupos que gerencio" com 1 membro e no topo de "Grupos recentes"

#### CA-04 — Limites do nome

- **Dado** o diálogo "Criar grupo" aberto
- **Quando** o nome está vazio ou só tem espaços
- **Então** "Criar grupo" fica indisponível
- **E** o campo não passa de 20 caracteres, com o contador indo de 20 a 0
- **E** um nome de 1 e um de 20 caracteres (emoji contando como 1) são aceitos, sem os espaços das pontas
- **E** o servidor recusa um nome vazio ou com 21 caracteres, mesmo que chegue sem passar pelo diálogo

#### CA-05 — Seções e pesquisa

- **Dado** que Ana administra "Turma 7A" e "Coral" e é membro de "Célula Sul"
- **Quando** ela abre as duas seções
- **Então** "Grupos que gerencio" mostra "Coral" e "Turma 7A", do mais novo ao mais antigo, e "Grupos em que participo" mostra só "Célula Sul"
- **E** pesquisar "coral" (ou "CORÁL") em "que gerencio" deixa só "Coral"; pesquisar "xyz" mostra "Nenhum grupo encontrado."

#### CA-06 — Grupos recentes

- **Dado** que Ana abriu, nesta ordem, 6 grupos diferentes
- **Quando** ela olha a coluna de seções
- **Então** "Grupos recentes" mostra os 5 últimos, do mais recente, com o grupo aberto destacado
- **E** reabrir um grupo antigo da lista o leva ao topo
- **E** um grupo excluído, ou de que ela saiu ou foi removida, some da lista

### Página do grupo

#### CA-07 — O que o administrador vê

- **Dado** o administrador na página do seu grupo
- **Então** vê o nome, os ícones dos membros, ⚙ ("Em breve"), ⋮, as abas Atividade, Compartilhado e Atribuições, "Adicionar membros", "Publicar algo" com Criar publicação, Compart. e Atribuir ("Em breve") e o cartão "Configurar seu grupo"
- **E** ⋮ mostra Informações do grupo, Ver membros e Excluir grupo, sem Sair do grupo

#### CA-08 — O que o membro vê

- **Dado** um membro na página do grupo
- **Então** não vê ⚙, "Adicionar membros", "Configurar seu grupo" nem Atribuir
- **E** ⋮ mostra Informações do grupo, Ver membros e Sair do grupo, sem Excluir grupo

#### CA-09 — Abas

- **Dado** a página do grupo
- **Quando** o usuário abre Compartilhado ou Atribuições
- **Então** vê o conteúdo marcado "Em breve", e a aba aberta fica no endereço (recarregar mantém a aba)

#### CA-10 — Configurar seu grupo

- **Dado** o administrador de um grupo só com ele
- **Quando** alguém aceita o convite e o administrador volta à página
- **Então** "Convidar membros" aparece feito, com a marca verde
- **E** acionar "Pular configuração" esconde o cartão, que não volta ao recarregar nem em outro navegador

#### CA-11 — Informações do grupo

- **Dado** um grupo de 3 membros criado por Ana em 26/10/2026
- **Quando** um membro aciona ⋮ → Informações do grupo
- **Então** vê o nome, "Ana" como administradora, 3 membros e a data de criação

#### CA-12 — Grupo de outros

- **Dado** que Bruno não é membro de "Turma 7A"
- **Quando** ele abre o endereço da página do grupo ou da tela de membros
- **Então** vê a mesma tela de um grupo que não existe, sem o nome do grupo

### Convite

#### CA-13 — Copiar o link

- **Dado** o administrador na página do grupo
- **Quando** aciona "Adicionar membros" e depois Copiar
- **Então** o diálogo "Convidar usuários" mostra o link, que vai para a área de transferência com o aviso "Link copiado"

#### CA-14 — Aceitar o convite

- **Dado** que Bruno tem sessão e não é membro de "Turma 7A"
- **Quando** ele abre o link de convite
- **Então** vê "O convite para entrar no grupo aguarda sua resposta" com o nome "Turma 7A"
- **E** ao acionar Aceitar convite, chega à página do grupo como membro, e o grupo aparece em "Grupos em que participo"
- **E** a lista de membros passa a ter 2 membros

#### CA-15 — Cancelar o convite

- **Dado** a tela do convite
- **Quando** Bruno aciona Cancelar
- **Então** chega à página inicial e não é membro do grupo

#### CA-16 — Convite sem sessão

- **Dado** que Carla não tem sessão
- **Quando** ela abre o link de convite, entra (ou cria a conta, com o cadastro aberto)
- **Então** chega à tela do convite do grupo, e não direto ao grupo
- **E** com o cadastro fechado, a tela de entrar não oferece criar conta

#### CA-17 — Quem já é membro

- **Dado** que Bruno já é membro (ou é o administrador)
- **Quando** ele abre o link de convite
- **Então** vai direto à página do grupo, sem a tela do convite

#### CA-18 — Redefinir o link

- **Dado** o diálogo "Convidar usuários" com o link A
- **Quando** o administrador aciona "Redefinir link" e confirma
- **Então** o diálogo mostra um link B diferente
- **E** quem abre o link A vê "Este convite não é mais válido"
- **E** quem já era membro continua no grupo, e o link B funciona
- **E** cancelar a confirmação mantém o link A

#### CA-19 — Convite inválido

- **Dado** um link redefinido, de um grupo excluído ou com um código inventado
- **Quando** alguém com sessão o abre
- **Então** vê "Este convite não é mais válido" e "Ir para o início", igual nos três casos

#### CA-20 — Aceitar duas vezes

- **Dado** a tela do convite aberta em duas abas
- **Quando** Bruno aceita nas duas
- **Então** ele é membro uma vez só e o total de membros sobe 1

#### CA-21 — Só o administrador convida

- **Dado** um membro
- **Quando** ele pede o link de convite ou a redefinição sem passar pela tela
- **Então** o servidor recusa e o link não muda

### Membros

#### CA-22 — Lista de membros

- **Dado** "Turma 7A" com Ana (administradora), Carla e Bruno
- **Quando** qualquer um deles abre "Membros do grupo"
- **Então** vê "3 de 3 membros do grupo" e as linhas Ana ("Administrador"), Bruno e Carla, nesta ordem, todos "Ativo"
- **E** pesquisar "bru" deixa só Bruno e mostra "1 de 3 membros do grupo"
- **E** voltar leva à página do grupo

#### CA-23 — Informações do membro

- **Dado** a lista de membros
- **Quando** a administradora abre ⓘ de Bruno
- **Então** vê o nome, o e-mail, "Membro" e "Ativo"
- **E** quando Carla (membro) abre ⓘ de Bruno, vê tudo menos o e-mail, e o servidor não o envia para ela

#### CA-24 — Menu do membro

- **Dado** a lista de membros
- **Quando** a administradora abre ⋮ na linha de Bruno
- **Então** vê Informações do membro, Ver perfil ("Em breve") e Remover
- **E** na própria linha não há Remover, e um membro não vê Remover em nenhuma linha

#### CA-25 — Remover

- **Dado** a administradora no ⋮ de Bruno
- **Quando** aciona Remover e confirma
- **Então** Bruno sai da lista ("2 de 2 membros do grupo")
- **E** para Bruno o grupo some de "Grupos em que participo" e dos recentes, e a página do grupo é a de um grupo que não existe
- **E** Bruno pode voltar pelo mesmo link enquanto ele não for redefinido
- **E** o servidor recusa remover o administrador e recusa pedidos de remoção de um membro

### Sair e excluir

#### CA-26 — Sair do grupo

- **Dado** Bruno, membro de "Turma 7A"
- **Quando** aciona ⋮ → Sair do grupo e confirma
- **Então** chega a "Grupos em que participo", sem "Turma 7A", e a lista de membros do grupo não o tem mais
- **E** o servidor recusa a saída do administrador

#### CA-27 — Excluir o grupo

- **Dado** a administradora de "Turma 7A", com Bruno como membro
- **Quando** aciona ⋮ → Excluir grupo e confirma
- **Então** chega a "Grupos que gerencio", sem "Turma 7A"
- **E** para Bruno o grupo some das listas e a página é a de um grupo que não existe
- **E** o link de convite mostra "Este convite não é mais válido"
- **E** o servidor recusa o pedido de exclusão vindo de um membro

## Experiência (telas e estados)

- **Grupos** (tela do criador, com a barra lateral): à esquerda, a coluna com "Grupos que gerencio", "Grupos em que participo", e abaixo de uma linha, "Grupos recentes" e "Criar grupo +". À direita, a pesquisa, "Criar grupo" e os cartões (nome e "N membros"). Estados: carregando (cartões esqueleto), vazio (RN-09), pesquisa sem resultado, erro (aviso padrão do app). Em telas estreitas, a coluna vira abas acima da lista, e "Grupos recentes" fica fora.
- **Criar grupo** (diálogo): Nome com o contador, Cancelar, Criar grupo (indisponível sem nome; ocupado enquanto cria).
- **Página do grupo**: cabeçalho (nome, ícones dos membros, ⚙, ⋮), abas e "Adicionar membros" na mesma linha; na Atividade, "Publicar algo", "Configurar seu grupo" (admin) e o estado vazio. Ícones dos usuários: o círculo com a pessoa, numa cor tirada do usuário.
- **Convidar usuários** (diálogo): link em campo somente leitura com Copiar, Redefinir link com a ajuda, Fechar; e a confirmação de redefinir.
- **Convite** (tela própria, fora da barra lateral, como na captura 5): o cartão com o título, a ilustração, o nome do grupo, o texto e os botões. Variações: aguardando resposta, aceitando (botão ocupado), inválido (RN-28).
- **Membros do grupo**: voltar, pesquisa, contagem, "Adicionar membros" (admin), tabela; em telas estreitas a coluna Status some e o status vai para baixo do nome.
- **Diálogos** de Informações do grupo, Informações do membro e das confirmações de Remover, Sair e Excluir.

## Divergências intencionais do Kahoot

- **O nome do grupo na tela do convite** (RN-25): o Kahoot não diz de que grupo é o convite; aqui o convidado vê o nome antes de aceitar, para não entrar no grupo errado.
- **O e-mail só para o administrador** (RN-34): na captura 11 é o administrador quem vê; sem saber o que o Kahoot mostra ao membro, o Quizio protege o e-mail de quem entrou num grupo por um link que pode ter circulado.
- **O administrador não sai do grupo** (RN-36): o menu do Kahoot mostra "Sair do grupo" também para o administrador; como aqui há um administrador só e ele não pode ser trocado, o grupo ficaria sem dono. Ele exclui o grupo.
- **Sem idade mínima**: o Kahoot proíbe grupos para menores de 16 anos (kahoot-reference §11.3); o Quizio não pede a idade no cadastro.
- **Sem limite de membros ou de grupos** (RN-04): constituição, artigo VI.

## Fora de escopo

- **Configurações do grupo** (⚙): nome e descrição, as quatro chaves de permissão, convite pelos membros — spec 035.
- **Publicações** ("Publicar algo", Criar publicação, o mural da Atividade) — spec 036.
- **Compartilhado** (quizzes e pastas do grupo, Compart.) — spec 037.
- **Atribuições no grupo** ("Atribuir", "Atribuir a grupos" na spec 029, ranking do grupo) — spec 038.
- **Renomear o grupo** fora das configurações, **promover** membros a administrador e **transferir** a administração.
- **Convidar por e-mail** ou pelo nome do usuário (só o link), e convites pendentes (o status é sempre "Ativo").
- **Perfil público** do usuário e "Seguir" ("Ver perfil" fica "Em breve") — Extras.
- **Troca entre cartões e lista** na tela de grupos (só cartões).
- **Notificações** de entrada, remoção ou exclusão (o sino da barra superior).
- **Ícone ou foto do grupo** e foto do usuário.

## Perguntas em aberto

- [ ] O Kahoot mostra o e-mail dos membros para os outros membros? — decidido "só para o administrador" (RN-34) até alguém verificar.
- [ ] Os grupos excluídos levam junto as atribuições feitas ao grupo? — decidir na spec 038, quando elas existirem.

## Changelog

- 2026-10-26 — spec criada.
- 2026-10-26 — spec aprovada pelo usuário; plano e tarefas aprovados com o ADR 0015.
- 2026-10-26 — spec entregue (status `done`). Todos os 27 CAs têm teste automatizado verde (core, PGlite, API, componentes e E2E desktop/celular). Escolhas feitas na implementação, dentro das regras: o link de convite é `/invite/{código}`, dentro da área com sessão e fora da barra lateral; o nome do grupo aparece em maiúsculas no cabeçalho e no convite, como nas capturas; ⚙ e "Ver perfil" ficam visíveis e não acionáveis, anunciados "em breve"; quem foi removido e abre a página vê "Grupo não encontrado".
- 2026-10-27 — as notificações que esta spec deixava para o sino chegaram com a spec 040.
