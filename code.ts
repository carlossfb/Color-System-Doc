figma.showUI(__html__, { width: 360, height: 500 });

// --- Interfaces para Typescript ---
interface ColorMode {
  type: "COLOR" | "VARIABLE_REFERENCE";
  modeId: string;
  color?: { r: number; g: number; b: number };
  variableId?: string;
}

// 🔹 Converte RGB para HEX sem usar padStart
function rgbToHex(r: number, g: number, b: number) {
  const toHex = (c: number) => {
    const hex = Math.round(c * 255).toString(16);
    return hex.length === 1 ? "0" + hex : hex;
  };
  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

async function resolveColor(
  variable: any,
  modeId: string,
): Promise<string | null> {
  if (!variable.valuesByMode) return null;

  const value = variable.valuesByMode[modeId];
  console.log("resolve color: ", variable);
  //console.log(modeId);
  //console.log(value);
  if (!value) return null;

  // 🔥 COR REAL (jeito certo da API)
  if (
    variable.resolvedType === "COLOR" &&
    typeof value.r === "number" &&
    typeof value.g === "number" &&
    typeof value.b === "number"
  ) {
    return rgbToHex(value.r, value.g, value.b);
  }

  if (
    (value.type === "VARIABLE_REFERENCE" || value.type === "VARIABLE_ALIAS") &&
    value.id
  ) {
    const refVariable = await figma.variables.getVariableByIdAsync(value.id);
    //console.log("Variable reference found:", refVariable);

    if (!refVariable) return null;

    // 🔥 Se o mesmo modeId existir na variável referenciada, usa ele
    if (refVariable.valuesByMode[modeId]) {
      //console.log("Using same modeId in reference:", modeId);
      return resolveColor(refVariable, modeId);
    }

    // 🔥 Caso contrário, precisamos descobrir qual modeId existe nela
    const refModeIds = Object.keys(refVariable.valuesByMode);

    if (refModeIds.length === 0) return null;

    const realModeId = refModeIds[0]; // aqui você está pegando o modeId real existente
    //console.log("Using reference variable modeId:", realModeId);

    return resolveColor(refVariable, realModeId);
  }

  return null;
}

// tt

// 🔹 Envia para o UI todas as collections de variáveis de cor locais
async function sendCollections() {
  const collections = await figma.variables.getLocalVariableCollectionsAsync();

  const cleanCollections = collections.map((c) => ({
    id: c.id,
    name: c.name || "",
    modes: c.modes || [],
  }));

  figma.ui.postMessage({
    type: "collections",
    collections: cleanCollections,
  });
}

// 🔹 Gera o frame com o Color System da collection selecionada
async function generateDoc(collectionId: string, modeId: string) {
  //console.log( `Gerando doc para collectionId: ${collectionId}, modeId: ${modeId}`);
  // 🔹 Container principal
  const mainContainer = figma.createFrame();
  mainContainer.name = "Color System";
  mainContainer.resize(1024, 1080);
  mainContainer.layoutMode = "VERTICAL";
  mainContainer.paddingLeft = 10;
  mainContainer.paddingRight = 10;
  mainContainer.paddingTop = 10;
  mainContainer.paddingBottom = 10;
  mainContainer.itemSpacing = 10;
  figma.currentPage.appendChild(mainContainer);

  // 🔹 Header
  const header = figma.createFrame();
  header.name = "Header";
  header.layoutMode = "VERTICAL";
  header.layoutAlign = "STRETCH";
  header.paddingLeft = 64;
  header.paddingRight = 64;
  header.paddingTop = 64;
  header.paddingBottom = 64;
  header.itemSpacing = 22;
  mainContainer.appendChild(header);

  const headerContent = figma.createFrame();
  headerContent.name = "Header Content";
  headerContent.layoutMode = "VERTICAL";
  headerContent.layoutAlign = "STRETCH";
  headerContent.paddingLeft = 0;
  headerContent.paddingRight = 0;
  headerContent.paddingTop = 0;
  headerContent.paddingBottom = 0;
  headerContent.itemSpacing = 22;
  header.appendChild(headerContent);
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  const headerContentText = figma.createText();
  headerContentText.fontName = { family: "Inter", style: "Semi Bold" };
  headerContentText.characters = "Colors";
  headerContentText.fontSize = 48;
  headerContent.appendChild(headerContentText);

  // 🔹 Content
  const content = figma.createFrame();
  content.name = "content";
  content.layoutAlign = "STRETCH";
  content.counterAxisSizingMode = "AUTO";
  content.primaryAxisSizingMode = "FIXED";
  content.layoutMode = "HORIZONTAL";
  content.paddingLeft = 64;
  content.paddingRight = 64;
  content.paddingTop = 64;
  content.paddingBottom = 64;
  content.itemSpacing = 22;
  mainContainer.appendChild(content);

  const contentDescription = figma.createFrame();
  contentDescription.resize(412, 80);
  contentDescription.name = "Content Description";
  contentDescription.layoutMode = "VERTICAL";
  contentDescription.paddingLeft = 10;
  contentDescription.paddingRight = 10;
  contentDescription.paddingTop = 10;
  contentDescription.paddingBottom = 10;
  contentDescription.itemSpacing = 8;
  content.appendChild(contentDescription);

  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });
  const contentDescriptionText = figma.createText();
  contentDescriptionText.fontName = { family: "Inter", style: "Semi Bold" };
  contentDescriptionText.characters = "Token";
  contentDescriptionText.fontSize = 24;
  contentDescription.appendChild(contentDescriptionText);

  const contentSubDescription = figma.createFrame();
  contentSubDescription.name = "Content Sub Description";
  contentSubDescription.layoutMode = "HORIZONTAL";
  contentSubDescription.counterAxisSizingMode = "AUTO";
  contentSubDescription.primaryAxisSizingMode = "AUTO";
  contentSubDescription.paddingLeft = 0;
  contentSubDescription.paddingRight = 0;
  contentSubDescription.paddingTop = 0;
  contentSubDescription.paddingBottom = 0;
  contentSubDescription.itemSpacing = 16;
  contentDescription.appendChild(contentSubDescription);

  const contentSubDescriptionLabel = figma.createText();
  contentSubDescriptionLabel.fontName = { family: "Inter", style: "Semi Bold" };
  contentSubDescriptionLabel.characters = "In Use";
  contentSubDescriptionLabel.fontSize = 16;
  contentSubDescription.appendChild(contentSubDescriptionLabel);

  const contentSubDescriptionText = figma.createText();
  contentSubDescriptionText.fontName = { family: "Inter", style: "Regular" };
  contentSubDescriptionText.characters =
    "You can safety delete colors not in use";
  contentSubDescriptionText.fontSize = 14;
  contentSubDescription.appendChild(contentSubDescriptionText);

  const colorDescription = figma.createFrame();
  colorDescription.resize(412, 80);
  colorDescription.name = "Color Description";
  colorDescription.layoutAlign = "STRETCH";
  colorDescription.layoutMode = "VERTICAL";
  colorDescription.paddingLeft = 10;
  colorDescription.paddingRight = 10;
  colorDescription.paddingTop = 10;
  colorDescription.paddingBottom = 10;
  colorDescription.itemSpacing = 8;
  content.appendChild(colorDescription);

  // --- Teste rápido dentro do generateDoc ---
  const allVariables = await figma.variables.getLocalVariablesAsync();
  const variablesInCollection = allVariables.filter(
    (v: any) => v.variableCollectionId === collectionId,
  );

  //console.log(variablesInCollection);
  //console.log("🔹 Testando cores da collection selecionada:");
  for (const v of variablesInCollection) {
    console.log(await resolveColor(v, modeId));
  }

  figma.notify("Documento gerado com sucesso!");
}

// 🔹 Comunicação com UI
figma.ui.onmessage = async (msg) => {
  if (msg.type === "ui-ready") {
    await sendCollections();
  }

  if (msg.type === "generate-doc") {
    await generateDoc(msg.collectionId, msg.modeId);
  }

  if (msg.type === "cancel") {
    figma.closePlugin();
  }
};
