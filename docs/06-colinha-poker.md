# 06 — Colinha de poker

> Status: implementada (referência visual) · Última atualização: 2026-11-20

Tela estática, sem cálculo automático: as cartas são físicas e o jogador compara visualmente. Os dados ficam em `packages/shared` (`CARD_RANKS` e `POKER_HANDS`) para que front e back usem a mesma lista.

## O que aparece na sala

A colinha é um `<details>` ("Colinha de poker") dentro da sala. Ao abrir, mostra:

1. **Ordem das cartas — da mais fraca para a mais forte**, no topo: 2, 3, 4, 5, 6, 7, 8, 9, 10, J, Q, K, A. O Ás é o mais alto e fica no fim da fila, exceto na sequência A-2-3-4-5, onde vale 1.
2. **Mãos — da mais forte para a mais fraca**: cada mão com cinco cartas de exemplo desenhadas na tela (valor + naipe, vermelho/preto) e um texto "Como ganhar com …".

## Interação

- Cada mão tem uma primeira linha com o **número (1 a 10)**, o **nome da mão** e a **setinha**.
- Clicar na **setinha** abre e fecha as cinco cartas daquela mão e **também mostra a explicação** "Como ganhar com …".
- Clicar no **nome da mão** ou em **qualquer carta** também mostra a explicação.
- As cartas aparecem por padrão e a seta gira para indicar o estado. Nenhuma explicação fica aberta quando a colinha é aberta; só uma por vez.
- A explicação traz o critério real de vitória e o motivo da força da mão. Exemplo: para "Um par", o texto diz que é preciso o **par de maior valor** (um par de áses é o melhor) e, em empate, os melhores kickers; para "Royal flush", que é a mão mais forte que existe.

## Mãos e exemplos

| # | Mão | Exemplo | Como ganhar |
| --- | --- | --- | --- |
| 10 | Royal flush | A-K-Q-J-10 ♠ | Maior mão possível; só empata com outro royal flush |
| 9 | Straight flush | 9-8-7-6-5 ♥ | Sequência de um naipe; desempate pela maior carta |
| 8 | Quadra | K-K-K-K + 7 | Maior quadra; kicker só decide em empate |
| 7 | Full house | 10-10-10 + 4-4 | Compara a trinca, depois o par |
| 6 | Flush | A-J-8-5-2 ♦ | Compara a maior carta, depois a segunda, etc. |
| 5 | Straight | Q-J-10-9-8 | Vence quem tiver a maior carta da sequência |
| 4 | Trinca | 7-7-7 + K-4 | Compara a trinca, depois os kickers |
| 3 | Dois pares | A-A + 6-6 + 9 | Compara o maior par, depois o segundo, depois a quinta carta |
| 2 | Um par | A-A + K-9-5 | Par de maior valor; em empate, os melhores kickers |
| 1 | Carta alta | A-K-9-6-2 | Maior carta; em empate, compara a segunda, etc. |

## Regras de exibição

- Mostrar mãos da mais forte para a mais fraca e cartas da mais fraca para a mais forte.
- Onde houver empate de categoria, o desempate é feito na mesa, pelas cartas físicas — o sistema não intervene nem calcula vencedor.
- As cartas desenhadas são **apenas ilustrações da mão**, não cartas distribuídas pela sala. Nenhuma carta é enviada ao servidor.
