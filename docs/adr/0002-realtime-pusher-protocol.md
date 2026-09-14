# ADR 0002 — Real-time pelo protocolo Pusher (Pusher cloud ou Soketi)

- **Status:** aceito
- **Data:** 2026-09-13

## Contexto

A partida ao vivo precisa enviar eventos do servidor para a tela do host e para dezenas (ou centenas) de celulares: jogador entrou, pergunta aberta, contagem de respostas, resultado, placar. O deploy é na Vercel, que não mantém WebSockets nem processos persistentes. Um objetivo explícito do projeto é **não ter o limite de 40 participantes** do Kahoot gratuito.

Restrições observadas:

- Pusher Channels (cloud) no plano Sandbox limita a ~100 conexões simultâneas e ~200 mil mensagens/dia — suficiente para testes, apertado para partidas grandes.
- Soketi é um servidor open source compatível com o protocolo Pusher; a última imagem publicada é de 2024–2025 (`quay.io/soketi/soketi:1.6-16-debian`). Sockudo é uma alternativa ativa com o mesmo protocolo.

## Decisão

- Usar o **protocolo Pusher**: SDK `pusher` no servidor e `pusher-js` no cliente.
- **Local e testes de integração**: Soketi no `docker-compose.yml` — sem conta, sem limites.
- **Produção**: começar com Pusher cloud; migrar para Soketi/Sockudo self-hosted quando os limites apertarem, trocando apenas variáveis de ambiente (`PUSHER_HOST`, `PUSHER_PORT`…).
- O código de negócio depende só das portas `RealtimePublisher` (servidor, em `@quizio/core`) e `RealtimeSubscriber` (cliente, em `@quizio/realtime`). Componentes usam `useRealtimeEvent`.
- **Servidor autoritativo e stateless**: clientes nunca publicam eventos; toda ação passa por tRPC, é validada, persistida e só então publicada. Tempo de resposta é medido no servidor. Não há timers em memória (ver `docs/architecture.md`).
- O adapter respeita o limite de 10 eventos por `triggerBatch` do Pusher e preserva a ordem.

## Consequências

- Nenhuma conta necessária para desenvolver; integração testada contra Soketi real (`pnpm test:int`).
- Cada resposta de jogador é uma requisição HTTP + escrita no banco. Adequado para centenas de jogadores por partida; para milhares, reavaliar (fila de escrita ou salas autoritativas).
- Payload por evento do Pusher é limitado (~10 KB): eventos carregam IDs e dados mínimos, não o quiz inteiro.
- Autorização de canais privados/presence (necessária para dados individuais do jogador) ainda será especificada na feature da partida ao vivo — jogadores são anônimos (apelido), então não usarão a sessão do Better Auth.

## Alternativas consideradas

- **Pusher cloud puro** — exige conta até para dev e esbarra nos limites do free tier.
- **Ably** — free tier maior, mas sem opção de self-host; continua possível como adapter futuro.
- **Cloudflare Durable Objects / PartyServer** — melhor encaixe técnico (salas autoritativas com timers), mas exige deploy na Cloudflare e reescrever partes do runtime. Reavaliar se o deploy migrar.
- **WebSocket próprio** — impossível na Vercel.
