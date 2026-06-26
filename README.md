# Bolão Copa 2026 V14

Versão com jogos isolados, histórico dos jogos finalizados e cálculo automático dos ganhadores por placar exato.

## O que mudou

- As apostas do jogo finalizado ficam guardadas no histórico.
- O jogo novo começa com área limpa.
- As apostas antigas não entram no jogo aberto.
- Ranking removido.
- Mostra quem acertou o placar exato.
- Calcula quanto cada ganhador recebe em partes iguais.
- Exportação e validação continuam apenas para o jogo atual.

## Como publicar

Substitua no GitHub:

- index.html
- style.css
- app.js
- config.js
- README.md

Depois abra o site e pressione Ctrl + F5.

## Banco

Não precisa executar SQL novo se você já executou os ajustes das versões anteriores que adicionaram:

- official_home_score
- official_away_score

A V14 não apaga dados.
