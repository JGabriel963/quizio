# ADR 0011 — Deploy com Nitro: Vercel agora, VPS depois

- **Status:** aceito (2026-10-06)
- **Contexto da decisão:** pendência "Deploy na Vercel" do [roadmap](../../specs/roadmap.md)

## Contexto

O primeiro deploy do Quizio é na Vercel, e a intenção é mudar para uma VPS mais adiante. O TanStack Start não gera sozinho a saída de nenhum provedor: precisa de uma camada de build para o destino. A aplicação já foi desenhada sem estado em memória e sem WebSocket próprio ([ADR 0002](0002-realtime-pusher-protocol.md), [ADR 0009](0009-partida-ao-vivo.md)), então roda igual em funções serverless ou num processo Node de longa duração.

## Decisão

- **Nitro (`nitro/vite`) é a camada de deploy.** O mesmo `vite build` gera funções da Vercel quando roda lá e um servidor Node (`.output/server/index.mjs`) em qualquer outro lugar. Trocar de destino não muda código, só o ambiente de build (`NITRO_PRESET` força um destino).
- **Nenhum SDK ou API específico da Vercel entra no código.** O que varia entre os destinos é configuração, lida em `packages/env`.
- **O cabeçalho do IP do cliente é configuração (`CLIENT_IP_HEADER`).** Os limites de tentativas (login no Better Auth, PIN errado na partida) são por IP, e qual cabeçalho é confiável depende do proxy na frente do app: a Vercel sobrescreve `x-forwarded-for`; numa VPS vale o que o proxy escolhido escreve.
- **O schema de produção passa a ser aplicado por migrations versionadas** (`db:generate` + `db:migrate`), aplicadas pelo próprio deploy: na Vercel, o comando de build roda as migrations antes de compilar, só em deploys de produção. O `db:push` fica restrito ao desenvolvimento local.

## Consequências

- O `nitro` 3 ainda é beta; a versão fica fixada pelo lockfile e deve ser atualizada com um build de conferência nos dois destinos.
- Previews não migram, então um PR não altera o banco de produção. Em troca, um preview com mudança de schema só funciona se apontar para um banco próprio já migrado.
- A migration é aplicada antes de o código novo entrar no ar, e uma falha interrompe o deploy. Mudanças de schema devem ser compatíveis com a versão anterior do código (expandir num deploy, contrair no seguinte).
- O comando de build é específico da Vercel (`apps/web/vercel.json`); na VPS, o script de deploy roda o mesmo `db:migrate:deploy`.
- O passo a passo fica em [docs/deploy.md](../deploy.md).
