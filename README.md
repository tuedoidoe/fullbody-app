# FullBody — versão inicial funcional

Aplicativo pessoal de musculação em formato PWA, em português, com armazenamento local no navegador.

## O que já está incluído

- Os 7 exercícios definidos pelo usuário, distribuídos nos blocos A, B e C.
- Rotina inicial chamada **Treino Inicial em Blocos**.
- Fluxo sequencial: cada exercício é executado série a série; o exercício seguinte e o próximo bloco ficam pendentes até as séries anteriores serem concluídas.
- Treino manual com seleção de exercícios.
- Criação, seleção e exclusão de rotinas personalizadas reutilizáveis.
- Cronômetro da sessão, pausa/retomada, descanso por exercício e registro de repetições e cargas por série.
- Salvamento automático do andamento no armazenamento local do navegador.
- Finalização com resumo e histórico detalhado.
- Cadastro, edição e exclusão de exercícios.
- Perfil pessoal e histórico de peso corporal.
- Painel de evolução com indicadores e gráficos simples a partir dos dados registrados.
- Tema claro/escuro.
- Exportação e importação de backup JSON.
- Layout responsivo para celular e modo instalável PWA em hospedagem HTTPS.

## Como testar no computador

1. Extraia o arquivo ZIP.
2. Abra a pasta `FullBody` no VS Code.
3. Instale/ative a extensão **Live Server** ou use um servidor web local.
4. Abra `index.html` pelo Live Server. Para testar instalação PWA e funcionamento offline, acesse por `localhost`/HTTPS; abrir o HTML diretamente por `file://` não ativa o service worker.

Alternativa com Python, a partir desta pasta:

```bash
python -m http.server 8000
```

Depois, no computador, abra `http://localhost:8000`. Para testar PWA no celular, hospede os arquivos em um endereço HTTPS (por exemplo, GitHub Pages ou Netlify).

## Como colocar no celular

1. Publique os arquivos da pasta em um serviço de hospedagem estática com HTTPS.
2. Abra a URL no Chrome (Android) ou Safari (iPhone).
3. Android/Chrome: menu ⋮ → **Instalar aplicativo** ou **Adicionar à tela inicial**.
4. iPhone/Safari: Compartilhar → **Adicionar à Tela de Início**.
5. Abra o ícone FullBody. Após a primeira carga, os arquivos do app podem funcionar offline se o cache já tiver sido instalado.

## Armazenamento e backup

Os dados ficam no `localStorage` do navegador do dispositivo. Não há sincronização com servidor nem login. Limpar os dados do navegador, desinstalar em algumas configurações ou perder o dispositivo pode apagar registros. Use **Configurações → Exportar backup JSON** com frequência e guarde o arquivo fora do aparelho. Para recuperar, use **Importar backup JSON**.

## Escopo desta primeira versão

Esta é uma primeira versão funcional em formato PWA, não um aplicativo nativo publicado em lojas. Foram verificados o carregamento da interface, a presença dos 7 exercícios iniciais, o início da sessão, a marcação de séries, a passagem sequencial entre blocos, a finalização/salvamento no histórico e a criação de uma rotina personalizada.

Ainda podem ser acrescentados, em próximas versões, medidas corporais além de peso/altura, edição detalhada de treinos já salvos, comparações avançadas exercício a exercício, recordes pessoais, ilustrações demonstrativas e sincronização entre dispositivos. O armazenamento é local a cada navegador/dispositivo; faça backup regular e não use o app como a única cópia dos seus dados importantes.
