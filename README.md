# Tabuada Divertida — pratique a tabuada brincando (HTML + JavaScript)

Um jogo de tabuada para crianças de 6 a 11 anos, feito para treinar sem pressão: cada acerto rende pontos e estrelas, e cada erro vira aprendizado na hora, com a resposta certa na tela. As contas que a criança erra voltam com mais frequência, até ela pegar o jeito.

**Acesse online:** https://micdog22.github.io/tabuada-divertida/

## Recursos
- Escolha das tabuadas de 1 a 10 (ou até 12) e das operações: multiplicação e divisão exata (na tabuada do 7, 56 ÷ 7 = 8).
- **Treino**: 10 contas sem relógio; errou, a resposta certa aparece na hora.
- **Desafio**: 60 segundos para acertar o máximo possível, com recorde por perfil.
- **Tabuada completa**: a tabuada inteira para estudar, com a opção de esconder os resultados e revelar um por um.
- Teclado numérico grande na tela, pensado para tablet e celular; o teclado do computador também funciona (números, Backspace e Enter).
- Pontos, sequência de acertos, estrelas e mensagens de incentivo. Sons suaves feitos com Web Audio (dá para desligar) e confete que respeita a opção de reduzir movimento do sistema.
- Repetição inteligente: cada conta tem um peso; errar aumenta o peso e acertar diminui aos poucos, então as contas difíceis aparecem mais vezes. Nunca a mesma conta duas vezes seguidas.
- Vários perfis (um para cada criança), cada um com seu progresso.
- Área dos responsáveis: porcentagem de acertos por tabuada e as contas mais difíceis de cada perfil.
- Tudo fica salvo só no navegador (`localStorage`): sem cadastro, sem servidor.

## Como usar
1. Escolha (ou crie) o perfil da criança.
2. Marque as tabuadas e as operações.
3. Escolha **Treino**, **Desafio** ou **Tabuada completa**.
4. Responda pelo teclado da tela ou do computador e confirme com **OK** (ou Enter).

## Como funciona a repetição
Toda conta começa com peso 1. Um erro soma 3 ao peso (até no máximo 8) e um acerto tira 1 (até voltar a 1). O sorteio é proporcional ao peso: uma conta com peso 4 aparece, em média, quatro vezes mais que uma conta com peso 1. A conta anterior nunca é sorteada de novo logo em seguida.

## Como rodar localmente
```bash
python3 -m http.server 8000
```
Na pasta do projeto, rode o comando acima e abra http://localhost:8000 (os módulos ES não carregam via `file://`).

## Testes
```bash
npm test
```
(ou `node --test`). Os testes cobrem a geração das contas (tabuadas e operações escolhidas, divisão sempre exata), o sorteio sem repetição imediata, os pesos depois de erros e acertos, pontos e sequências, estrelas, a leitura e gravação dos perfis e as estatísticas da área dos responsáveis.

## Contribuindo
Issues e pull requests são bem-vindos, principalmente sugestões de professores e famílias.

## Licença
MIT — veja [LICENSE](LICENSE).
