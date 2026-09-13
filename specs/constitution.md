# Constituição do Quizio

Princípios inegociáveis. Specs, planos e código que os violem devem ser corrigidos — ou o princípio deve ser alterado explicitamente aqui, com um ADR.

## I. Spec antes de código

Toda funcionalidade nasce de uma spec aprovada em `specs/features/`. Correções de bug pequenas podem dispensar spec, mas não dispensam teste.

## II. O domínio é puro

`packages/core` não importa infraestrutura (banco, SDKs, framework web, env, `zod`). Regras de negócio vivem no core; routers, componentes e adapters apenas traduzem. Detalhes em [docs/architecture.md](../docs/architecture.md).

## III. Teste primeiro

Nenhum comportamento entra sem um teste que falhou antes. Portas são isoladas com fakes em memória. Cada critério de aceite tem ao menos um teste automatizado. Detalhes em [docs/testing.md](../docs/testing.md).

## IV. Provedores são substituíveis

Storage, real-time, e-mail, IA e qualquer serviço externo ficam atrás de portas. Só a composition root conhece implementações concretas. Hospedagem atual (Vercel) não pode vazar para o domínio.

## V. O servidor é a autoridade do jogo

Pontuação, tempo de resposta, ordem das perguntas e transições da partida são decididos e medidos no servidor. Clientes enviam intenções via API; nunca publicam eventos nem informam o próprio tempo.

## VI. Sem paywall, sem limites artificiais

Tudo o que o Kahoot restringe por plano está disponível. Limites existem apenas por razões técnicas, são configuráveis e documentados na spec.

## VII. O Kahoot é a referência funcional

[`specs/product/kahoot-reference.md`](product/kahoot-reference.md) define o comportamento esperado. Divergências são permitidas quando intencionais e registradas na seção "Divergências intencionais do Kahoot" da spec.

## VIII. Jogadores primeiro no celular

Telas de jogador são mobile-first, entram sem conta e funcionam com conexão instável (reconexão sem perder a pontuação). Cor nunca é o único indicador: alternativas sempre têm forma.

## IX. Idiomas

Docs, specs, ADRs e textos da interface em PT-BR. Código, nomes de entidades, testes, commits e mensagens de erro técnicas em inglês. O glossário mantém a correspondência.

## X. Pronto é pronto

Uma tarefa só termina com `pnpm check`, `pnpm test` e typecheck verdes; `pnpm test:int` quando um adapter mudou; E2E quando um fluxo crítico mudou; spec, glossário e docs atualizados.
