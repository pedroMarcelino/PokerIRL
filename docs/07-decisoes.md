# 07 — Decisões

> Registro cronológico. Inclua data, decisão e motivo.

| Data | Decisão | Motivo / alternativa descartada |
| --- | --- | --- |
| 2026-11-20 | Cartas 100% físicas, fora do sistema | O grupo joga na mesa real; mostrar cartas no app criaria uma segunda fonte de verdade. |
| 2026-11-20 | "Manager" renomeado para **dealer** | Termo de poker e reflete que ele também joga. |
| 2026-11-20 | Dealer é jogador e aparece com 👑 | Ele cria, configura, aposta e pode ganhar; o Marcador visual evita ambiguidade na tela. |
| 2026-11-20 | Valor inicial único para todos, inclusive entrada tardia | Regra pedida: ninguém entra com valor diferente; sem rebuy personalizado na fase 1. |
| 2026-11-20 | Fichas fixas: 5, 10, 15, 25 e 50 | Referência às fichas físicas; evita valores arbitrários e frações. |
| 2026-11-20 | Jogador aposta pelo próprio celular | Cada um tem o aparelho; o dealer não precisa digitar pelas outras pessoas. |
| 2026-11-20 | Dealer escolhe o vencedor e o pote vai para ele | O sistema não vê as cartas; o dealer é a autoridade da mesa. Alternativa descartada: cálculo automático. |
| 2026-11-20 | Nome obrigatório na entrada, único por sala | Necessário para identificar apostas e o destinatário do pote. |
| 2026-11-20 | "Valor da rodada" = maior aposta acumulada por jogador | Dá ao jogador a referência de quanto precisa igualar sem expor cartas. |
| 2026-11-20 | MongoDB (Atlas) como banco | Conta já existente; documento da sala serve bem ao modelo. |
| 2026-11-20 | Repositório em memória para dev/testes | Permite rodar e testar sem credenciais; troca por Mongo só na fábrica de repositório. |
| 2026-11-20 | npm workspaces em vez de pnpm | pnpm não está instalado no ambiente; npm já vem com o Node. |
| 2026-11-20 | WebSocket com `ws` em vez de Socket.IO | Só precisamos de broadcast de estado; menos dependências. |
| 2026-11-20 | Mutex por sala no serviço | Protege saldo/pot contra apostas simultâneas sem exigir transação no Mongo nesta fase. |
| 2026-11-20 | Implementação lenta, com revisão em cada etapa | Pedido explícito; backend primeiro, frontend depois. |
| 2026-11-20 | Frontend mobile-first, tema verde-feltro com dourado | Aprovado pelo usuário; fichas e pote em destaque, sem cartas na tela. |
| 2026-11-20 | Aposta em duas etapas (escolher ficha → confirmar) | Aprovado inicialmente; depois substituído pela acumulação abaixo. |
| 2026-11-20 | Fichas clicáveis que somam + input numérico editável | Ajustado a pedido do usuário: clicar em 50 três vezes aposta 150; também é possível digitar um inteiro. A confirmação continua explícita. |
| 2026-11-20 | API aceita qualquer inteiro positivo na aposta | Necessário para aceitar somas de fichas e valores digitados; as fichas continuam como atalhos no front. |
| 2026-11-20 | Ordem das cartas na colinha: mais fraca → mais forte | Ajustado a pedido do usuário. |
| 2026-11-20 | Setinha abre/fecha as cartas e mostra a descrição da mão | Ajustado a pedido do usuário; a primeira linha traz número (1–10), nome da mão e seta. |
| 2026-11-20 | Dois modos de sala: `turn` (com vez) e `free` (sem sequência) | Pedido do usuário. No modo `turn`, ninguém aposta menos que o valor da rodada; no `free`, cada um aposta o que quiser. Padrão continua `free` para não mudar salas já criadas. |
| 2026-11-20 | Mínimo do modo `turn` usa o **acumulado** da rodada, não o valor do último clique | É o *call* do poker: quem já tem 50 e enfrenta 150 precisa completar 100, não apostar 150 de uma vez. |
| 2026-11-20 | Ordem de jogo editável apenas pelo dealer | Pedido do usuário para "arrastar para cima e para baixo a ordem de quem vai jogar". Estado salvo em `turnOrder`, transmitido por WebSocket; setas ▲/▼ complementam o arraste no celular, onde HTML5 drag não funciona. |
| 2026-11-20 | Ordem é guia visual, sem bloqueio de aposta fora da vez | Nenhuma regra de bloqueio foi pedida; o dealer é a autoridade da mesa, como no resto do sistema. Pode ser adicionado depois se o usuário quiser travar a vez. |
| 2026-11-20 | Valores iniciais sugeridos: 500 / 1000 / 2000 + livre | Aprovado pelo usuário; todo mundo começa igual. |
| 2026-11-20 | QR apenas gerado na sala; sem leitor de câmera | Código de 6 dígitos e link copiável resolvem a entrada; evita permissão de câmera. |
| 2026-11-20 | Nome do produto e do repo: PokerIRL (antes Cassino Denso) | Pedido do usuário; grafia corrigida de "porkerIRL" para **PokerIRL** em código, pacotes, Docker, docs, tela e GitHub. O banco em `.env` mantém o nome antigo para não perder dados. |
| 2026-11-20 | react-router-dom 7 no lugar da 6 | Versão 6 tem alertas de segurança no `npm audit`; API de rotas usada é compatível. |
| 2026-11-20 | Dockerfile separado para API e web + `compose.yaml` na raiz | Pedido do usuário: subir tudo com um comando. |
| 2026-11-20 | `.env` injetado via `env_file`, nunca copiado para a imagem | Evita vazar `MONGODB_URI` com senha no build. |
| 2026-11-20 | Front servido por nginx com fallback para `index.html` | Rotas do react-router como `/r/123456` precisam funcionar ao abrir o link do QR. |
| 2026-11-20 | Browser chama `/api` e `/api/ws` no próprio domínio | Antes eram `localhost:3000`; com Vercel services e com o proxy do nginx passou a não haver hostname de API gravado no bundle. |
| 2026-11-20 | `tsx` movido para `dependencies` do servidor | A imagem roda TypeScript direto; `npm ci --omit=dev` precisa do `tsx` disponível. |
| 2026-11-20 | Healthcheck usa `127.0.0.1` em vez de `localhost` | `localhost` resolvia para IPv6 dentro do container e o Fastify escuta em IPv4. |
| 2026-11-20 | Vercel services `server` (Fastify) e `web` (Vite) | Confirmado pelo usuário; rewrites públicos `/api/(.*)` → `server` e `/(.*)` → `web`. Entrypoint `apps/server/src/vercel.ts` com rotas sob `/api`. |
| 2026-11-20 | Nenhum binding entre serviços | O navegador chama a API pelo rewrite público; não existe chamada serviço→serviço e o bundle Vite é estático (bindings só existem em funções, em runtime). |
| 2026-11-20 | MongoDB compartilhado na Vercel, sem pub/sub ainda | `DB_DRIVER=mongodb` é obrigatório no deploy; aceito o risco de o broadcast do WebSocket ser local à instância. Pub/sub externo fica para quando houver jogadores em instâncias diferentes. |
| 2026-11-20 | `.env` na raiz é a fonte principal de configuração | Pedido do usuário: abrir o arquivo no Visual e copiar/colar os valores para jogar e para a Vercel. `apps/server/.env` fica só como legado; `.env.example` é o template versionado. Prioridade: ambiente > `.env` raiz > `.env` do servidor. |
| 2026-11-20 | `app.ready()` no entrypoint da Vercel | O Fastify monta os hooks de cada rota no `preReady`; sem `ready()` toda requisição quebrava em `preParsingHookRunner` (`Cannot read properties of undefined (reading 'length')`). `ready()` não abre porta. Teste de regressão adicionado. |
| 2026-11-20 | Padrão de `MONGODB_DB` corrigido para `cassino-denso` | Sem a variável na Vercel, o default antigo (`cassino_denso`, com underscore) criava um banco novo e parecia "não conectar". O banco com as salas reais é `cassino-denso`. |
