---
id: "001"
title: Autenticação e biblioteca básica
status: planned # draft | approved | planned | in-progress | done
contexts: [quiz, library, media]
created: 2026-09-13
---

# 001 — Autenticação e biblioteca básica

## Contexto e problema

Hoje o Quizio só tem o cadastro e o login gerados pelo scaffold, em inglês, que levam a um painel vazio. Não existe lugar para o criador guardar e organizar seus quizzes, e nenhum fluxo seguinte do roadmap funciona sem isso: o editor (002) precisa de um quiz com dono, e a partida ao vivo (003) precisa de um quiz para organizar.

No Kahoot, essa porta de entrada é a **Biblioteca (`Library`)**: a área onde o criador vê os kahoots recentes e os rascunhos, cria novos, duplica e exclui, com uma lixeira para recuperar o que foi apagado (kahoot-reference §11.1).

## Objetivo

Um criador consegue criar conta (e-mail e senha ou Google), entrar, e manter uma biblioteca pessoal de quizzes: criar um quiz com seus dados básicos, pesquisar, duplicar, excluir para a lixeira, restaurar e excluir definitivamente.

## Personas

- **Criador (`Creator`)** — pessoa com conta que cria e organiza quizzes. É o **dono (`Owner`)** de cada quiz que cria (kahoot-reference §1).
- **Visitante** — pessoa sem sessão ativa que chega às telas de entrada ou tenta abrir uma página da área do criador.
- **Dono da instância** — quem hospeda o Quizio e decide se novos cadastros estão abertos. Não usa nenhuma tela nova nesta feature.

Jogadores não aparecem nesta feature: eles nunca precisam de conta (kahoot-reference §1, §9).

## Histórias de usuário

- **HU-01** — Como visitante, quero criar uma conta com e-mail e senha, para ter uma biblioteca própria.
- **HU-02** — Como visitante, quero entrar com minha conta Google, para não precisar de outra senha.
- **HU-03** — Como criador, quero continuar conectado ao reabrir o navegador e poder sair quando quiser, para usar o Quizio com praticidade e segurança.
- **HU-04** — Como dono da instância, quero poder fechar novos cadastros, para evitar que desconhecidos consumam os recursos do meu Quizio.
- **HU-05** — Como criador, quero criar um quiz com título, descrição, capa e visibilidade, para começar a montar meu conteúdo.
- **HU-06** — Como criador, quero ver meus quizzes recentes e meus rascunhos e pesquisar por título, para encontrar rapidamente o que procuro.
- **HU-07** — Como criador, quero duplicar um quiz, para reaproveitar um conteúdo sem mexer no original.
- **HU-08** — Como criador, quero que o que eu excluir vá para uma lixeira, para poder recuperar exclusões por engano.

## Regras de negócio

### Conta e acesso

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-01 | Criar, editar e organizar quizzes exige uma conta. Jogar não exige (fora desta feature). | kahoot-reference §1 |
| RN-02 | O cadastro por e-mail pede **nome** (2 a 50 caracteres), **e-mail** válido e ainda não cadastrado, e **senha** (8 a 128 caracteres). Espaços nas pontas do nome e do e-mail são ignorados, e o e-mail não diferencia maiúsculas de minúsculas. | decisão do produto (2026-09-13) |
| RN-03 | É possível entrar com **Google**. No primeiro acesso, a conta é criada com o nome e o e-mail da conta Google. | decisão do produto (2026-09-13) |
| RN-04 | Se já existe uma conta com o mesmo e-mail de uma conta Google, entrar com Google acessa **essa mesma conta**. | decisão do produto (2026-09-13) |
| RN-05 | O dono da instância pode **desativar novos cadastros (`SignUpEnabled`)**. Com cadastros desativados, nenhuma conta nova é criada, nem por e-mail nem por Google, mas contas existentes continuam entrando normalmente pelos dois meios. Por padrão, os cadastros ficam abertos. | decisão do produto (2026-09-13) |
| RN-06 | Um login com credenciais inválidas recebe sempre a mesma mensagem genérica, sem indicar se o e-mail existe ou se a senha está errada. | decisão do produto (segurança) |
| RN-07 | Depois de várias tentativas de login malsucedidas seguidas, novas tentativas do mesmo cliente ficam bloqueadas por um período, com uma mensagem pedindo para tentar mais tarde. | decisão do produto (segurança) |
| RN-08 | A sessão continua ativa ao fechar e reabrir o navegador, até o criador sair ou a sessão expirar. | decisão do produto |
| RN-09 | As páginas da área do criador exigem sessão. Um visitante que abre uma delas é levado à tela de entrada e, depois de entrar, volta à página que tentou abrir. | decisão do produto |

### Quiz e biblioteca

| ID | Regra | Fonte |
| --- | --- | --- |
| RN-10 | Cada quiz tem exatamente um dono. Um criador só vê, altera, duplica e exclui os **próprios** quizzes. Para qualquer outra pessoa, o quiz se comporta como inexistente. | kahoot-reference §11 · decisão do produto |
| RN-11 | Todo quiz criado nesta feature é um **rascunho (`Draft`)** com zero perguntas. Perguntas e publicação da versão jogável ficam para a feature 002. | kahoot-reference §3.6 |
| RN-12 | O **título** é opcional no rascunho e tem no máximo **95 caracteres**. Espaços nas pontas são ignorados, e um título vazio ou só com espaços conta como ausente. Sem título, o quiz é exibido como "Quiz sem título". | kahoot-reference §3.1, §3.6 |
| RN-13 | A **descrição** é opcional e tem no máximo **500 caracteres**. | kahoot-reference §3.1 |
| RN-14 | A **visibilidade (`Visibility`)** é **Privado** (padrão) ou **Não listado**. Nesta feature ela é só registrada e exibida: nenhum quiz fica visível para outras pessoas, em nenhum dos dois casos. O efeito aparece nas features de partida e compartilhamento; "Público" chega com a descoberta pública (012). | kahoot-reference §3.1 · decisão do produto |
| RN-15 | A **capa (`CoverImage`)** é opcional e aceita **JPEG, PNG, GIF ou WebP de até 10 MB**. Pode ser trocada ou removida. Sem capa, o quiz mostra uma imagem padrão. | decisão do produto — política de mídia (ADR 0003) |
| RN-16 | A seção **Recentes** mostra todos os quizzes do criador que estão fora da lixeira, do mais recentemente modificado para o menos recente. | kahoot-reference §11.1 |
| RN-17 | A seção **Rascunhos** mostra os quizzes em rascunho que estão fora da lixeira, na mesma ordem. | kahoot-reference §11.1 |
| RN-18 | A **última modificação** de um quiz é atualizada quando ele é criado ou quando seus dados são alterados. Visualizar, mover para a lixeira ou restaurar não a altera. | decisão do produto |
| RN-19 | A **pesquisa** filtra a seção aberta pelos quizzes cujo título contém o texto digitado. Ela ignora maiúsculas/minúsculas e acentos. Um quiz sem título é encontrado pela busca "Quiz sem título". | decisão do produto (2026-09-13) |
| RN-20 | **Duplicar** cria um novo rascunho do mesmo dono, com descrição, capa e visibilidade copiadas e o título "‹título original› (cópia)". Quando necessário, o título original é encurtado para que o resultado respeite os 95 caracteres. Um original sem título gera a cópia "Quiz sem título (cópia)". A cópia é independente: alterar ou excluir uma não afeta a outra. | decisão do produto (2026-09-13) |
| RN-21 | **Excluir** um quiz o move para a **Lixeira (`Trash`)**, inclusive quando é um rascunho. | decisão do produto (2026-09-13) — diverge de kahoot-reference §11.1 |
| RN-22 | Um quiz na lixeira não aparece em Recentes nem em Rascunhos e não pode ser editado nem duplicado. As únicas ações possíveis são **restaurar** e **excluir definitivamente**. | kahoot-reference §11.1 · decisão do produto |
| RN-23 | A lixeira **não expira automaticamente**. **Restaurar** devolve o quiz à biblioteca com todos os dados intactos. | kahoot-reference §11.1 |
| RN-24 | A **exclusão definitiva** só é feita a partir da lixeira, exige confirmação explícita e é irreversível: o quiz e a capa dele deixam de existir. | kahoot-reference §11.1 · decisão do produto |
| RN-25 | Todos os textos das telas desta feature são em português do Brasil. | constituição, artigo IX |

## Critérios de aceite

### Conta e acesso

#### CA-01 — Cadastro por e-mail com sucesso

- **Dado** um visitante, com os cadastros abertos
- **Quando** ele se cadastra com nome "Ana", o e-mail "ana@exemplo.com" e uma senha de 8 caracteres
- **Então** a conta é criada, ele fica conectado e chega à biblioteca vazia

#### CA-02 — E-mail já cadastrado

- **Dado** que já existe uma conta com "ana@exemplo.com"
- **Quando** um visitante tenta se cadastrar com "Ana@Exemplo.com "
- **Então** o cadastro é recusado com uma mensagem informando que o e-mail já está em uso, e nenhuma conta nova é criada

#### CA-03 — Validação dos campos de cadastro

- **Dado** o formulário de cadastro
- **Quando** o visitante envia um nome com 1 ou com 51 caracteres, um e-mail inválido, ou uma senha com 7 ou com 129 caracteres
- **Então** cada campo inválido mostra sua mensagem e nenhuma conta é criada
- **E** um nome com 2 ou com 50 caracteres e uma senha com 8 ou com 128 caracteres são aceitos

#### CA-04 — Login por e-mail com sucesso

- **Dado** um criador com conta cadastrada por e-mail
- **Quando** ele entra com e-mail e senha corretos
- **Então** fica conectado e chega à biblioteca

#### CA-05 — Credenciais inválidas não revelam o motivo

- **Dado** um criador cadastrado com "ana@exemplo.com"
- **Quando** alguém tenta entrar com esse e-mail e uma senha errada, ou com um e-mail que não existe
- **Então** as duas tentativas recebem exatamente a mesma mensagem genérica de e-mail ou senha incorretos

#### CA-06 — Bloqueio após tentativas repetidas

- **Dado** um cliente que errou o login várias vezes seguidas
- **Quando** ele tenta entrar de novo, mesmo com a senha correta, antes de passar o período de bloqueio
- **Então** a tentativa é recusada com uma mensagem pedindo para tentar mais tarde
- **E** depois do período de bloqueio, o login com a senha correta funciona

#### CA-07 — Primeiro acesso com Google

- **Dado** um visitante sem conta, com os cadastros abertos
- **Quando** ele entra com Google e autoriza o acesso
- **Então** uma conta é criada com o nome e o e-mail da conta Google e ele chega à biblioteca

#### CA-08 — Google com e-mail já cadastrado

- **Dado** um criador cadastrado por e-mail e senha com "ana@exemplo.com", com quizzes na biblioteca
- **Quando** ele entra com uma conta Google cujo e-mail é "ana@exemplo.com"
- **Então** acessa a mesma conta e vê os mesmos quizzes

#### CA-09 — Cadastros desativados

- **Dado** que o dono da instância desativou novos cadastros
- **Quando** um visitante abre a tela de cadastro
- **Então** vê que novos cadastros estão fechados
- **E** uma tentativa de cadastro por e-mail é recusada sem criar conta
- **E** entrar com uma conta Google cujo e-mail não tem conta é recusado sem criar conta
- **E** um criador já cadastrado continua entrando por e-mail e senha e por Google

#### CA-10 — Sair

- **Dado** um criador conectado
- **Quando** ele sai
- **Então** volta à página inicial sem sessão, e abrir a biblioteca pede para entrar

#### CA-11 — Sessão persiste

- **Dado** um criador conectado
- **Quando** ele fecha e reabre o navegador e abre a biblioteca
- **Então** continua conectado

#### CA-12 — Retorno à página solicitada

- **Dado** um visitante sem sessão
- **Quando** ele abre o endereço dos detalhes de um quiz próprio, entra na conta e conclui o login
- **Então** é levado de volta aos detalhes desse quiz

### Quiz e biblioteca

#### CA-13 — Biblioteca vazia

- **Dado** um criador sem quizzes
- **Quando** ele abre a biblioteca
- **Então** vê uma mensagem de que ainda não há quizzes e uma ação para criar o primeiro

#### CA-14 — Criar quiz

- **Dado** um criador conectado
- **Quando** ele cria um quiz com título "Bom de Bíblia (Junho)" e descrição "Atos 1 a 7", sem alterar a visibilidade
- **Então** o quiz aparece no topo de Recentes e de Rascunhos, com 0 perguntas, visibilidade Privado e última modificação "agora"

#### CA-15 — Quiz sem título

- **Dado** um criador conectado
- **Quando** ele cria um quiz com o título vazio ou só com espaços
- **Então** o quiz é criado e aparece como "Quiz sem título"

#### CA-16 — Limites de título e descrição

- **Dado** o formulário de dados do quiz
- **Quando** o criador informa um título de 96 caracteres ou uma descrição de 501 caracteres
- **Então** o salvamento é recusado com uma mensagem indicando o limite, e nada é alterado
- **E** um título de 95 caracteres e uma descrição de 500 caracteres são aceitos

#### CA-17 — Capa do quiz

- **Dado** um quiz do criador
- **Quando** ele envia uma imagem PNG de 2 MB como capa
- **Então** a capa aparece na biblioteca e nos detalhes do quiz
- **E** um arquivo SVG, um PDF ou uma imagem de 10,1 MB são recusados com uma mensagem, mantendo a capa anterior
- **E** ao remover a capa, o quiz volta a mostrar a imagem padrão

#### CA-18 — Editar dados do quiz

- **Dado** que o criador tem os quizzes "A" (modificado ontem) e "B" (modificado hoje)
- **Quando** ele altera a descrição e a visibilidade de "A" para Não listado
- **Então** as alterações ficam salvas e "A" passa para o topo de Recentes

#### CA-19 — Isolamento entre criadores

- **Dado** que a criadora Ana tem o quiz "Segredo"
- **Quando** o criador Beto abre a biblioteca, pesquisa "Segredo" e abre o endereço dos detalhes desse quiz
- **Então** Beto não encontra o quiz em nenhuma seção, e o endereço mostra "quiz não encontrado"
- **E** qualquer tentativa de Beto de alterar, duplicar, excluir ou restaurar esse quiz falha sem mudar nada

#### CA-20 — Pesquisa por título

- **Dado** que a seção Recentes tem "Bom de Bíblia (Junho)", "BÍBLIA KIDS" e "Geografia"
- **Quando** o criador pesquisa "biblia"
- **Então** vê apenas "Bom de Bíblia (Junho)" e "BÍBLIA KIDS"
- **E** uma pesquisa por "história" mostra uma mensagem de nenhum resultado
- **E** limpar a pesquisa volta a mostrar a lista completa

#### CA-21 — Duplicar quiz

- **Dado** o quiz "Bom de Bíblia (Junho)", com capa, descrição e visibilidade Não listado
- **Quando** o criador o duplica
- **Então** surge no topo de Recentes e de Rascunhos o rascunho "Bom de Bíblia (Junho) (cópia)", com a mesma capa, descrição e visibilidade
- **E** o original continua igual, inclusive na última modificação
- **E** remover a capa da cópia não remove a capa do original

#### CA-22 — Duplicar respeita o limite do título

- **Dado** um quiz com título de 95 caracteres
- **Quando** o criador o duplica
- **Então** a cópia tem título de no máximo 95 caracteres, terminando em " (cópia)"

#### CA-23 — Excluir move para a lixeira

- **Dado** um rascunho na biblioteca
- **Quando** o criador o exclui
- **Então** o quiz sai de Recentes e de Rascunhos e aparece na Lixeira
- **E** a confirmação oferece desfazer, e desfazer devolve o quiz à biblioteca

#### CA-24 — Quiz na lixeira fica somente leitura

- **Dado** um quiz na lixeira
- **Quando** o criador abre esse quiz
- **Então** vê que ele está na lixeira, sem opção de editar nem de duplicar, com as ações restaurar e excluir definitivamente

#### CA-25 — Restaurar

- **Dado** um quiz na lixeira
- **Quando** o criador o restaura
- **Então** o quiz volta a Recentes e a Rascunhos com título, descrição, capa, visibilidade e última modificação iguais aos de antes da exclusão

#### CA-26 — Excluir definitivamente

- **Dado** um quiz com capa na lixeira
- **Quando** o criador escolhe excluir definitivamente e cancela a confirmação
- **Então** o quiz continua na lixeira
- **E quando** ele confirma
- **Então** o quiz não aparece em nenhuma seção, seu endereço mostra "quiz não encontrado" e a imagem de capa deixa de estar acessível

#### CA-27 — Lixeira vazia

- **Dado** um criador sem quizzes na lixeira
- **Quando** ele abre a Lixeira
- **Então** vê uma mensagem de que a lixeira está vazia

#### CA-28 — Detalhes do quiz

- **Dado** um quiz fora da lixeira
- **Quando** o criador abre esse quiz a partir da biblioteca
- **Então** vê capa, título, descrição, visibilidade, número de perguntas (0) e última modificação
- **E** vê as ações editar dados, duplicar e excluir

## Experiência (telas e estados)

- **Entrar / Criar conta**: tela única com a opção de alternar entre entrar e criar conta. Tem o botão "Continuar com Google" nos dois modos. Com os cadastros fechados, o modo "criar conta" mostra só o aviso de cadastros fechados. Erros aparecem junto ao campo (validação) ou como mensagem geral (credenciais, bloqueio, e-mail em uso).
- **Cabeçalho**: sem sessão, mostra o link "Entrar". Com sessão, mostra o nome do criador e um menu com o e-mail e a opção "Sair".
- **Biblioteca**: navegação com as seções **Recentes**, **Rascunhos** e **Lixeira**, campo de pesquisa e botão **Criar**. Cada quiz aparece com capa (ou imagem padrão), título, número de perguntas, visibilidade, última modificação em tempo relativo ("há 2 meses") e um menu de ações:
  - Recentes e Rascunhos: abrir, editar dados, duplicar, excluir.
  - Lixeira: restaurar, excluir definitivamente.
- **Dados do quiz** (ao criar e ao editar): título com contador de caracteres, descrição com contador, capa (enviar, trocar, remover, com pré-visualização) e visibilidade (Privado / Não listado). Ações salvar e cancelar.
- **Detalhes do quiz**: capa, título, descrição, visibilidade, "0 perguntas", última modificação e as ações do quiz. Um quiz na lixeira exibe um aviso e só as ações da lixeira.
- **Estados**:
  - Carregando: marcadores de lugar no formato da lista.
  - Vazio: CA-13, CA-27 e pesquisa sem resultados.
  - Erro de carregamento: mensagem com a opção de tentar novamente.
  - Quiz não encontrado: mensagem e link de volta à biblioteca.
  - Envio de capa: indicador de progresso; em caso de falha, a capa anterior é mantida.

## Divergências intencionais do Kahoot

- **Rascunhos vão para a lixeira** (RN-21). No Kahoot, excluir um rascunho apaga para sempre. No Quizio, tudo passa pela lixeira para evitar perda por engano, principalmente enquanto todos os quizzes ainda são rascunhos.
- **Regras da capa** (RN-15). O Kahoot aceita PNG, JPEG ou GIF de até 5 MB e 3264×3264 px. O Quizio segue a política de mídia do projeto: acrescenta WebP, vai até 10 MB e não limita dimensões.
- **Visibilidade reduzida** (RN-14). Só Privado e Não listado nesta etapa. "Público" depende da descoberta pública (feature 012), e "Organização" não se aplica a um uso pessoal.
- **Controle de cadastro** (RN-05). O Kahoot não tem esse conceito; ele existe porque o Quizio é uma instância própria, sem planos pagos.

## Fora de escopo

- Recuperação de senha e verificação de e-mail (dependem de envio de e-mails).
- Edição de perfil, troca de senha, exclusão de conta e outros provedores de login além do Google.
- Tela de administração para abrir ou fechar cadastros: nesta feature, isso é configuração da instância.
- Perguntas, editor e publicação da versão jogável (feature 002).
- Favoritos, pastas, "Compartilhados comigo" (feature 011), visibilidade pública e descoberta (feature 012).
- Idioma, tema e música do lobby do quiz.
- Alternar entre grade e lista, e escolher a ordenação da biblioteca.
- Esvaziar a lixeira inteira de uma vez, ou restaurar e excluir vários quizzes ao mesmo tempo.

## Perguntas em aberto

- [x] **Vincular Google a uma conta existente (RN-04 / CA-08)** — decidido em 2026-09-13: quando o e-mail coincide, entrar com Google acessa a mesma conta.
- [x] **Senha esquecida enquanto não há envio de e-mails** — decidido em 2026-09-13: esta feature não oferece recuperação de senha. Quem tiver uma conta Google com o mesmo e-mail pode entrar por ela (RN-04).
- [ ] **"Recentes" depois das partidas** — no Kahoot, Recentes considera kahoots *usados ou editados*. Nesta feature só existe edição. Na feature 003, decidir se organizar uma partida também traz o quiz para o topo.

## Changelog

- 2026-09-13 — spec criada. Decisões do produto registradas: cadastro aberto e desligável pelo dono da instância; login por e-mail e senha e por Google; exclusões sempre passam pela lixeira; a biblioteca inclui pesquisa por título e duplicação.
- 2026-09-13 — spec aprovada. Confirmado que o Google acessa a conta existente de mesmo e-mail (RN-04) e que a recuperação de senha fica fora desta feature.
