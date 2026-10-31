---
id: "050"
title: Landing pública e documentos legais
status: done # draft | approved | planned | in-progress | done
contexts: [identity]
created: 2026-10-30
---

# 050 — Landing pública e documentos legais

## Contexto e problema

A página `/` de quem não está logado (spec 002, RN-01) mostrava só o logotipo, uma frase e dois botões: não dizia o que o Quizio faz nem levava quem tem um PIN ao jogo. O Quizio também não tinha Termos de Uso nem Política de Privacidade, embora trate dados de criadores e de jogadores, muitos deles estudantes.

## Objetivo

Quem chega a `/` sem conta entende o que o Quizio faz e encontra os três caminhos: entrar, criar conta e jogar com um PIN. Todo mundo que começa a usar o Quizio tem à mão os Termos de Uso e a Política de Privacidade, escritos para a LGPD e o Marco Civil da Internet.

## Personas

- **Visitante**: chega a `/` sem conta.
- **Criador**: cria a conta pelo formulário ou pelo Google.
- **Jogador / participante**: entra num jogo ou numa atividade só com um apelido.

## Histórias de usuário

- **HU-01** — Como visitante, quero entender o que o Quizio faz antes de criar uma conta.
- **HU-02** — Como jogador, quero chegar à tela do PIN a partir de `/`.
- **HU-03** — Como qualquer pessoa, quero saber quais dados meus o Quizio guarda, para que e como pedir a exclusão.

## Regras de negócio

- **RN-01** — `/` sem sessão mostra a apresentação (o que é, como funciona, recursos) com "Entrar", "Criar conta" e "Jogar com PIN", que leva a `/join`. Fonte: decisão do produto (2026-10-30).
- **RN-02** — `/terms` (Termos de Uso) e `/privacy` (Política de Privacidade) são públicos e ligados no rodapé da landing e entre si. Fonte: decisão do produto (2026-10-30); LGPD art. 9º.
- **RN-03** — A política identifica o controlador e o canal de contato (num único lugar do código), os dados tratados de quem cria conta, de quem joga e de quem visita, as finalidades e as bases legais, os operadores, a transferência internacional, os prazos de guarda, os direitos do art. 18, as regras para crianças e adolescentes (art. 14), os cookies e a segurança. Fonte: LGPD arts. 9º, 14, 18, 33 e 41.
- **RN-04** — Quem cria a conta (pelo formulário, ou pelo Google nas telas de criar conta e de entrar) e quem entra num jogo ou numa atividade com um apelido vê "Ao …, você concorda com os Termos de Uso e a Política de Privacidade", com os dois links abrindo em outra aba. Não há caixa de marcar. Fonte: decisão do produto (2026-10-30).
- **RN-05** — O que os documentos prometem sobre guarda e exclusão segue o que o código faz (PDF do assistente em até 24 h, notificações lidas em 90 dias, exclusão da conta em cascata); mudar um pede mudar o outro e a data de atualização.

## Critérios de aceite

- **CA-01** — Dado um visitante em `/`, então ele vê o título da apresentação, "Entrar", "Criar conta grátis" e "Jogar com PIN", e "Jogar com PIN" leva a `/join`. (E2E `home.spec.ts`)
- **CA-02** — Dado qualquer pessoa, quando abre `/terms` ou `/privacy`, então vê o documento com a data da última atualização e o índice das seções.
- **CA-03** — Dado o formulário de criar conta, a tela de entrar com o Google ligado, ou a tela do apelido do jogo ao vivo ou da atividade, então há links para `/terms` e `/privacy`. (testes de componente)

## Experiência (telas e estados)

- Landing: topo fixo com o logotipo e as ações; abertura roxa com as formas das respostas ao fundo e uma prévia de jogo; "Como funciona" em três passos; seis recursos; faixa "Recebeu um PIN?"; rodapé com os documentos.
- Documentos: cabeçalho público, título, data, "Nesta página" com as seções numeradas e o outro documento no fim.

## Divergências intencionais do Kahoot

- Nenhuma relevante: a landing é própria do Quizio.

## Fora de escopo

- Registrar a versão aceita por cada pessoa e pedir um novo aceite quando os documentos mudarem.
- Revisão jurídica dos textos.

## Perguntas em aberto

- Nenhuma.

## Changelog

- 2026-10-30 — spec registrada depois da implementação, a partir da revisão do PR: a landing e os documentos foram feitos a pedido do usuário; controlador e contato por escolha do usuário; aceite por frase com links, sem caixa de marcar.
