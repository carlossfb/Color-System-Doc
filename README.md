# Color System Doc

Plugin do Figma para gerar documentação visual de sistemas de cores com análise de contraste WCAG 2.1.

## 📋 Sobre

Este plugin automatiza a criação de documentação de design systems, transformando suas variáveis de cor do Figma em uma tabela organizada com informações de acessibilidade.

**Inspirado no shadcn/ui**, o plugin foi projetado especificamente para trabalhar com collections estruturadas em pares **background/foreground**, facilitando a documentação de sistemas de cores que seguem essa convenção de nomenclatura.

## ✨ Funcionalidades

- **Organização por Namespace**: Agrupa tokens por contexto (ex: `theme/background`, `semantic/error`)
- **Pareamento Automático**: Identifica pares background/foreground automaticamente
- **Cálculo de Contraste WCAG 2.1**: Mostra ratio e níveis de conformidade (AAA/AA)
- **Preview Visual**: Visualização de como as cores ficam juntas
- **Suporte a Aliases**: Resolve referências entre variáveis
- **Multi-modo**: Suporta diferentes modos de uma collection

## 🎯 Como Usar

1. Abra o plugin no Figma
2. Selecione a **Collection** de variáveis de cor
3. Escolha o **Mode** desejado
4. Clique em **Generate**
5. O plugin criará uma página com a documentação completa

## 📊 Estrutura da Tabela

| Coluna | Descrição |
|--------|----------|
| **Context** | Namespace do token (ex: `theme`, `semantic`) |
| **Token Name** | Nome base do token (ex: `background`, `primary`) |
| **Use** | Descrição do token (se disponível) |
| **Background** | Amostra da cor de fundo |
| **Foreground** | Amostra da cor de texto |
| **Ratio** | Contraste WCAG (Normal / Grande) |
| **Preview** | Visualização do par de cores |

## 🎨 Convenção de Nomenclatura

> **💡 Inspiração**: Este plugin foi desenvolvido tendo como referência a estrutura de cores do [shadcn/ui](https://ui.shadcn.com/), que utiliza o padrão background/foreground para garantir acessibilidade.

O plugin identifica pares de cores baseado em padrões de nomenclatura:

### Foreground Tokens
- `foreground` → pareia com `background`
- `foreground 2` → pareia com `background 2`
- `primary foreground` → pareia com `primary`

### Exemplos
```
theme/background ←→ theme/foreground
theme/primary ←→ theme/primary foreground
semantic/error ←→ semantic/error foreground
```

## ♿ Níveis de Contraste WCAG 2.1

### Texto Normal (< 18pt ou < 14pt bold)
- **AAA**: ≥ 7:1 (melhor acessibilidade)
- **AA**: ≥ 4.5:1 (conformidade padrão)
- **FAIL**: < 4.5:1

### Texto Grande (≥ 18pt ou ≥ 14pt bold)
- **AAA**: ≥ 4.5:1
- **AA**: ≥ 3:1
- **FAIL**: < 3:1

## 🏗️ Arquitetura

### Classes Principais

- **Color**: Representa uma cor RGB com métodos de conversão e cálculo de contraste
- **ColorToken**: Encapsula uma variável de cor com metadados e lógica de pareamento
- **ColorTokenCollection**: Gerencia coleção de tokens com agrupamento por namespace
- **FrameBuilder / TextBuilder**: Builders para criação fluente de elementos do Figma

### Funções de Renderização

- `createColorSystemTable()`: Orquestra a criação da tabela
- `createTableHeader()`: Gera cabeçalho da tabela
- `createTableRow()`: Cria linha com informações do par de cores
- `createPreviewCell()`: Renderiza célula de preview
- `calculateContrast()`: Calcula ratio e níveis WCAG

## 🔧 Tecnologias

- TypeScript
- Figma Plugin API
- WCAG 2.1 Contrast Algorithm

---

## 📦 Setup e Desenvolvimento

### Default instructions [FIGMA PLUGIN]

Below are the steps to get your plugin running. You can also find instructions at:

https://www.figma.com/plugin-docs/plugin-quickstart-guide/

This plugin template uses Typescript and NPM, two standard tools in creating JavaScript applications.

First, download Node.js which comes with NPM. This will allow you to install TypeScript and other
libraries. You can find the download link here:

https://nodejs.org/en/download/

Next, install TypeScript using the command:

npm install -g typescript

Finally, in the directory of your plugin, get the latest type definitions for the plugin API by running:

npm install --save-dev @figma/plugin-typings

If you are familiar with JavaScript, TypeScript will look very familiar. In fact, valid JavaScript code
is already valid Typescript code.

TypeScript adds type annotations to variables. This allows code editors such as Visual Studio Code
to provide information about the Figma API while you are writing code, as well as help catch bugs
you previously didn't notice.

For more information, visit https://www.typescriptlang.org/

Using TypeScript requires a compiler to convert TypeScript (code.ts) into JavaScript (code.js)
for the browser to run.

We recommend writing TypeScript code using Visual Studio code:

1. Download Visual Studio Code if you haven't already: https://code.visualstudio.com/.
2. Open this directory in Visual Studio Code.
3. Compile TypeScript to JavaScript: Run the "Terminal > Run Build Task..." menu item,
   then select "npm: watch". You will have to do this again every time
   you reopen Visual Studio Code.

That's it! Visual Studio Code will regenerate the JavaScript file every time you save.
