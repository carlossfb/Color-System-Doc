figma.showUI(__html__, { width: 360, height: 500 });

class Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;

  constructor(r: number, g: number, b: number) {
    this.r = r;
    this.g = g;
    this.b = b;
  }

  toHex(): string {
    const toHex = (c: number) => {
      const hex = Math.round(c * 255).toString(16);
      return hex.length === 1 ? "0" + hex : hex;
    };

    return `#${toHex(this.r)}${toHex(this.g)}${toHex(this.b)}`;
  }
}

class ColorToken {
  readonly id: string;
  readonly name: string;
  readonly description?: string;
  readonly color: string;

  private constructor(
    id: string,
    name: string,
    description: string | undefined,
    color: string,
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.color = color;
  }

  static async fromVariable(
    variable: Variable,
    modeId: string,
  ): Promise<ColorToken | null> {
    // 🔥 garante que só trabalha com variável de cor
    if (variable.resolvedType !== "COLOR") return null;

    const rgb = await this.resolve(variable, modeId);
    if (!rgb) return null;

    const color = new Color(rgb.r, rgb.g, rgb.b);

    return new ColorToken(
      variable.id,
      variable.name,
      variable.description,
      color.toHex(),
    );
  }

  private static async resolve(
    variable: Variable,
    modeId: string,
    visited = new Set<string>(),
  ): Promise<{ r: number; g: number; b: number } | null> {
    if (!variable.valuesByMode) return null;

    if (visited.has(variable.id)) return null;
    visited.add(variable.id);

    let value = variable.valuesByMode[modeId];

    if (!value) return null;

    // 🔥 COR REAL
    if (variable.resolvedType === "COLOR" && this.isRGB(value)) {
      return value;
    }

    // 🔥 VARIABLE_REFERENCE ou VARIABLE_ALIAS
    if (this.isAlias(value)) {
      const refVariable = await figma.variables.getVariableByIdAsync(value.id);

      if (!refVariable) return null;

      // ✅ Se o mesmo mode existir na referenciada
      if (refVariable.valuesByMode[modeId]) {
        return this.resolve(refVariable, modeId, visited);
      }

      // ✅ Senão, pega o mode real existente nela
      const refModeIds = Object.keys(refVariable.valuesByMode);

      if (refModeIds.length === 0) return null;

      const realModeId = refModeIds[0];

      return this.resolve(refVariable, realModeId, visited);
    }

    return null;
  }

  // -----------------------------
  // Type Guards privados
  // -----------------------------

  private static isRGB(value: VariableValue): value is RGB {
    return (
      typeof value === "object" &&
      value !== null &&
      "r" in value &&
      "g" in value &&
      "b" in value
    );
  }

  private static isAlias(value: VariableValue): value is VariableAlias {
    return (
      typeof value === "object" &&
      value !== null &&
      "type" in value &&
      value.type === "VARIABLE_ALIAS"
    );
  }
}

class FrameBuilder {
  private node: FrameNode;

  private constructor(name?: string) {
    this.node = figma.createFrame();

    if (name) {
      this.node.name = name;
    }
  }

  static create(name?: string): FrameBuilder {
    return new FrameBuilder(name);
  }

  name(value: string): this {
    this.node.name = value;
    return this;
  }

  size(width: number, height: number): this {
    this.node.resize(width, height);
    return this;
  }

  layout(mode: "NONE" | "HORIZONTAL" | "VERTICAL"): this {
    this.node.layoutMode = mode;
    return this;
  }

  padding(value: number): this {
    this.node.paddingLeft = value;
    this.node.paddingRight = value;
    this.node.paddingTop = value;
    this.node.paddingBottom = value;
    return this;
  }

  spacing(value: number): this {
    this.node.itemSpacing = value;
    return this;
  }

  align(value: "MIN" | "CENTER" | "MAX" | "STRETCH"): this {
    this.node.layoutAlign = value;
    return this;
  }

  primarySizing(mode: "AUTO" | "FIXED"): this {
    this.node.primaryAxisSizingMode = mode;
    return this;
  }

  counterSizing(mode: "AUTO" | "FIXED"): this {
    this.node.counterAxisSizingMode = mode;
    return this;
  }

  appendTo(parent: BaseNode & ChildrenMixin): this {
    parent.appendChild(this.node);
    return this;
  }

  build(): FrameNode {
    return this.node;
  }
}

class TextBuilder {
  private node: TextNode;

  private constructor(text?: string) {
    this.node = figma.createText();

    if (text) {
      this.node.characters = text;
    }
  }

  static create(text?: string): TextBuilder {
    return new TextBuilder(text);
  }

  name(value: string): this {
    this.node.name = value;
    return this;
  }

  characters(value: string): this {
    this.node.characters = value;
    return this;
  }

  font(family: string, style: string): this {
    this.node.fontName = { family, style };
    return this;
  }

  fontSize(size: number): this {
    this.node.fontSize = size;
    return this;
  }

  lineHeight(value: number): this {
    this.node.lineHeight = { value, unit: "PIXELS" };
    return this;
  }

  letterSpacing(value: number): this {
    this.node.letterSpacing = { value, unit: "PIXELS" };
    return this;
  }

  alignHorizontal(value: "LEFT" | "CENTER" | "RIGHT" | "JUSTIFIED"): this {
    this.node.textAlignHorizontal = value;
    return this;
  }

  alignVertical(value: "TOP" | "CENTER" | "BOTTOM"): this {
    this.node.textAlignVertical = value;
    return this;
  }

  resize(width: number, height: number): this {
    this.node.resize(width, height);
    return this;
  }

  appendTo(parent: BaseNode & ChildrenMixin): this {
    parent.appendChild(this.node);
    return this;
  }

  build(): TextNode {
    return this.node;
  }
}

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

async function generateDoc(collectionId: string, modeId: string) {
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  const mainContainer = FrameBuilder.create("Color System")
    .size(1024, 1080)
    .layout("VERTICAL")
    .padding(10)
    .spacing(10)
    .appendTo(figma.currentPage)
    .build();

  const header = FrameBuilder.create("Header")
    .layout("VERTICAL")
    .align("STRETCH")
    .padding(64)
    .spacing(22)
    .appendTo(mainContainer)
    .build();

  const headerContent = FrameBuilder.create("Header Content")
    .layout("VERTICAL")
    .align("STRETCH")
    .spacing(22)
    .appendTo(header)
    .build();

  TextBuilder.create("Colors")
    .font("Inter", "Semi Bold")
    .fontSize(48)
    .appendTo(headerContent)
    .build();

  const content = FrameBuilder.create("content")
    .layout("HORIZONTAL")
    .align("STRETCH")
    .padding(64)
    .spacing(22)
    .primarySizing("FIXED")
    .counterSizing("AUTO")
    .appendTo(mainContainer)
    .build();

  const contentDescription = FrameBuilder.create("Content Description")
    .size(412, 80)
    .layout("VERTICAL")
    .padding(10)
    .spacing(8)
    .appendTo(content)
    .build();

  TextBuilder.create("Token")
    .font("Inter", "Semi Bold")
    .fontSize(24)
    .appendTo(contentDescription)
    .build();

  const contentSubDescription = FrameBuilder.create("Content Sub Description")
    .layout("HORIZONTAL")
    .primarySizing("AUTO")
    .counterSizing("AUTO")
    .spacing(16)
    .appendTo(contentDescription)
    .build();

  TextBuilder.create("In Use")
    .font("Inter", "Semi Bold")
    .fontSize(16)
    .appendTo(contentSubDescription)
    .build();

  TextBuilder.create("You can safety delete colors not in use")
    .font("Inter", "Regular")
    .fontSize(14)
    .appendTo(contentSubDescription)
    .build();

  FrameBuilder.create("Color Description")
    .size(412, 80)
    .layout("VERTICAL")
    .align("STRETCH")
    .padding(10)
    .spacing(8)
    .appendTo(content)
    .build();

  const allVariables = await figma.variables.getLocalVariablesAsync();

  const variablesInCollection = allVariables.filter(
    (v: Variable) => v.variableCollectionId === collectionId,
  );

  const tokens: ColorToken[] = [];

  console.log("Variáveis encontradas na collection: ", variablesInCollection);

  for (const variable of variablesInCollection) {
    const token = await ColorToken.fromVariable(variable, modeId);

    if (token) {
      tokens.push(token);
    }
  }

  console.log("Tokens resolvidos: ", tokens);

  figma.notify("Documento gerado com sucesso!");
}

// Comunicação com UI
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
