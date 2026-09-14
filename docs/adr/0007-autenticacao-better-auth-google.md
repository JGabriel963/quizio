# ADR 0007 — Autenticação com Better Auth: e-mail e senha, Google e limite de tentativas persistido

- **Status:** aceito
- **Data:** 2026-09-13
- **Relacionado:** [spec 001](../../specs/features/001-autenticacao-e-biblioteca-basica/spec.md), [plano 001](../../specs/features/001-autenticacao-e-biblioteca-basica/plan.md)

## Contexto

A spec 001 exige:
- cadastro e login por e-mail e senha e por Google;
- vínculo da conta Google a uma conta existente com o mesmo e-mail;
- cadastro desligável pelo dono da instância;
- bloqueio temporário após tentativas de login repetidas.

O projeto já usa Better Auth com o adapter Drizzle, e o deploy é serverless (Vercel): não há memória compartilhada entre requisições.

## Decisão

- **Continuar com Better Auth**, que já oferece provedores sociais, vínculo de contas, bloqueio de cadastro por provedor e limite de tentativas. Nenhum provedor externo de identidade é adicionado.
- **Google via `socialProviders.google`**, habilitado só quando `GOOGLE_CLIENT_ID`/`GOOGLE_CLIENT_SECRET` existem.
- **Vínculo implícito** com `account.accountLinking.requireLocalEmailVerified: false`, sem `trustedProviders`: o Google ainda precisa informar `email_verified`. *Correção feita durante a implementação (2026-09-14):* por padrão, o Better Auth 1.7.1 recusa vincular a uma conta local cujo e-mail não foi verificado (`OAUTH_LINK_ERROR`). É justamente a proteção contra tomada de conta pré-criada, e sem desligá-la a RN-04 não funciona para contas criadas por senha. Desligar essa proteção é o risco aceito abaixo.
- **Cadastro desligável** por `AUTH_SIGN_UP_ENABLED`, aplicado a `emailAndPassword.disableSignUp`, `socialProviders.google.disableSignUp` e a um `databaseHooks.user.create.before` que recusa qualquer criação de usuário. O hook é necessário porque o `disableSignUp` do Google não é aplicado ao login por ID token (verificado em teste).
- **Limite de tentativas no banco** (`rateLimit.storage = "database"`, tabela `rateLimit`), ligado também em desenvolvimento para que o comportamento seja testável. A memória foi descartada porque não funciona em funções serverless.
- **Configuração como fábrica** `createAuth({ db, ... })`: a instância de produção é montada a partir do env; os testes montam instâncias com PGlite e verificação de token do Google simulada.
- **Regras de nome e senha** definidas no core (`identity/domain/sign-up-rules.ts`) e aplicadas por hook do Better Auth e pelo formulário web.

## Consequências

- Os fluxos de conta ganham testes automatizados contra Postgres real (PGlite), inclusive vínculo e bloqueio de cadastro no Google. Só o redirecionamento OAuth real fica como verificação manual.
- Uma tabela a mais (`rateLimit`), gerada pelo CLI do Better Auth.
- **Risco aceito (2026-09-13):** sem verificação de e-mail no cadastro por senha, o vínculo implícito permite "tomada de conta pré-criada". Alguém cria uma conta com o e-mail de outra pessoa e continua com acesso depois que a dona real entra com Google. O risco foi aceito temporariamente, dado o uso pessoal da instância. A mitigação prevista é a **verificação de e-mail** no cadastro por senha, registrada no roadmap para antes de abrir a instância ao público.
- Trocar de solução de identidade continua isolado em `packages/auth` e nas rotas de login; o core só conhece `ownerId`.

## Alternativas consideradas

- **Auth.js / Lucia / Clerk** — trocar a biblioteca não traz ganho para os requisitos atuais. Clerk ainda prenderia a identidade a um fornecedor com limites de plano.
- **`trustedProviders: ["google"]`** — vincula mesmo sem e-mail verificado pelo provedor; é desnecessário, porque o Google já verifica.
- **Limite de tentativas em memória ou Redis** — a memória não funciona em serverless; o Redis adicionaria um serviço só para isso.
