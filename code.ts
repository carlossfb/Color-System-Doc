figma.showUI(__html__, { width: 360, height: 500 });

class Color {
  readonly r: number;
  readonly g: number;
  readonly b: number;
  readonly hex: string;

  constructor(r: number, g: number, b: number) {
    this.r = Color.clamp(r);
    this.g = Color.clamp(g);
    this.b = Color.clamp(b);
    this.hex = this.toHex();
  }

  // Garante valores entre 0 e 1
  private static clamp(value: number): number {
    if (value < 0) return 0;
    if (value > 1) return 1;
    return value;
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
  readonly color: Color;

  private constructor(
    id: string,
    name: string,
    description: string | undefined,
    color: Color,
  ) {
    this.id = id;
    this.name = name;
    this.description = description;
    this.color = color;
  }

  // -----------------------------
  // 🔹 Helpers de normalização
  // -----------------------------

  private normalize(value: string): string {
    return value.trim().toLowerCase().replace(/\s+/g, " ");
  }

  private getRawTokenName(): string {
    const parts = this.name.split("/");
    return parts.length > 1 ? parts[1] : parts[0];
  }

  private getNormalizedTokenName(): string {
    return this.normalize(this.getRawTokenName());
  }

  // -----------------------------
  // 🔹 Regras de pareamento
  // -----------------------------

  isForeground(): boolean {
    const token = this.getNormalizedTokenName();

    // foreground raiz
    if (token === "foreground") return true;

    // foreground 2, foreground 3...
    if (token.startsWith("foreground ")) return true;

    // primary foreground
    if (token.endsWith(" foreground")) return true;

    return false;
  }

  getBaseName(): string {
    const token = this.getNormalizedTokenName();

    // foreground raiz → background
    if (token === "foreground") return "background";

    // foreground 2 → background 2
    if (token.startsWith("foreground ")) {
      return token.replace(/^foreground/, "background");
    }

    // primary foreground → primary
    if (token.endsWith(" foreground")) {
      return token.replace(/ foreground$/, "");
    }

    return token;
  }

  getNamespace(): string {
    if (!this.name.includes("/")) return "global";

    return this.normalize(this.name.split("/")[0]);
  }

  static async fromVariable(
    variable: Variable,
    modeId: string,
  ): Promise<ColorToken | null> {
    if (variable.resolvedType !== "COLOR") return null;

    const rgb = await this.resolve(variable, modeId);
    if (!rgb) return null;

    const color = new Color(rgb.r, rgb.g, rgb.b);

    return new ColorToken(
      variable.id,
      variable.name,
      variable.description,
      color,
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

    if (variable.resolvedType === "COLOR" && this.isRGB(value)) {
      return value;
    }

    if (this.isAlias(value)) {
      const refVariable = await figma.variables.getVariableByIdAsync(value.id);

      if (!refVariable) return null;

      if (refVariable.valuesByMode[modeId]) {
        return this.resolve(refVariable, modeId, visited);
      }

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
    this.node.fills = [];

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

  fillHex(hex: string): this {
    const clean = hex.replace("#", "");
    const r = parseInt(clean.substring(0, 2), 16) / 255;
    const g = parseInt(clean.substring(2, 4), 16) / 255;
    const b = parseInt(clean.substring(4, 6), 16) / 255;

    this.node.fills = [
      {
        type: "SOLID",
        color: { r, g, b },
      },
    ];
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

type ColorPair = { background?: ColorToken; foreground?: ColorToken };

class NamespaceCollection {
  constructor(private readonly groups: Map<string, ColorToken[]>) {}

  /**
   * Retorna diretamente Map externo (namespace) -> Record interno (pares baseName -> {background, foreground})
   * O Record interno substitui o Map interno, permitindo imprimir e serializar facilmente.
   */
  groupByPair(): Map<string, Record<string, ColorPair>> {
    const result = new Map<string, Record<string, ColorPair>>();

    for (const [namespace, tokens] of this.groups.entries()) {
      const pairs: Record<string, ColorPair> = {};

      for (const token of tokens) {
        const baseName = token.getBaseName();

        if (!pairs[baseName]) pairs[baseName] = {};

        if (token.isForeground()) {
          pairs[baseName].foreground = token;
        } else {
          pairs[baseName].background = token;
        }
      }

      result.set(namespace, pairs);
    }

    return result;
  }
}

class ColorTokenCollection {
  private readonly tokens: ColorToken[] = [];

  add(token: ColorToken): void {
    this.tokens.push(token);
  }

  getAll(): ColorToken[] {
    return [...this.tokens];
  }

  /**
   * Agrupa tokens por namespace e retorna uma NamespaceCollection
   * para permitir encadeamento: .groupByNamespace().groupByPair()
   */
  groupByNamespace(): NamespaceCollection {
    const groups = new Map<string, ColorToken[]>();

    for (const token of this.tokens) {
      const ns = token.getNamespace();
      if (!groups.has(ns)) groups.set(ns, []);
      groups.get(ns)!.push(token);
    }

    return new NamespaceCollection(groups);
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

async function createColorSystemTable(
  grouped: Map<string, Record<string, ColorPair>>,
) {
  const columnWidths = {
    context: 120,
    tokenName: 120,
    use: 240,
    background: 120,
    foreground: 120,
    square: 64,
    ratio: 64,
    preview: 64,
  };

  const rowHeight = 64;
  const spacing = 24;

  // FRAME PRINCIPAL
  const tableFrame = FrameBuilder.create("Color System Table")
    .primarySizing("AUTO")
    .counterSizing("AUTO")
    .layout("VERTICAL")
    .spacing(spacing)
    .padding(16)
    .build();

  // ---------------- HEADER ----------------
  const headerFrame = FrameBuilder.create("Header")
    .layout("HORIZONTAL")
    .primarySizing("AUTO")
    .counterSizing("AUTO")
    .spacing(spacing)
    .appendTo(tableFrame)
    .build();

  const headers = [
    "Context",
    "Token Name",
    "Use",
    "Background",
    "Foreground",
    "Ratio",
    "Preview",
  ];

  const headerKeys = Object.keys(columnWidths);

  for (let i = 0; i < headerKeys.length; i++) {
    TextBuilder.create(headers[i])
      .font("Inter", "Semi Bold")
      .fontSize(12)
      .resize(
        columnWidths[headerKeys[i] as keyof typeof columnWidths],
        rowHeight,
      )
      .appendTo(headerFrame);
  }

  // Helper para criar quadrado de cor
  function createColorSquare(
    color?: Color,
    width = columnWidths.square,
    height = columnWidths.square,
  ): RectangleNode {
    const rect = figma.createRectangle();
    rect.resize(width, height);

    if (color) {
      rect.fills = [
        {
          type: "SOLID",
          color: { r: color.r, g: color.g, b: color.b },
        },
      ];
    } else {
      rect.fills = [];
    }

    return rect;
  }

  // ---------------- ROWS ----------------
  for (const [namespace, pairs] of grouped.entries()) {
    for (const fullName in pairs) {
      const pair = pairs[fullName];

      const rowFrame = FrameBuilder.create("Row")
        .primarySizing("AUTO")
        .counterSizing("AUTO")
        .layout("HORIZONTAL")
        .spacing(spacing)
        .appendTo(tableFrame)
        .build();

      // Context
      TextBuilder.create(namespace)
        .font("Inter", "Regular")
        .fontSize(12)
        .alignVertical("CENTER")
        .resize(columnWidths.context, rowHeight)
        .appendTo(rowFrame);

      // Token Name
      TextBuilder.create(fullName)
        .font("Inter", "Semi Bold")
        .fontSize(12)
        .alignVertical("CENTER")
        .resize(columnWidths.tokenName, rowHeight)
        .appendTo(rowFrame);

      // Use (placeholder)
      TextBuilder.create(pairs[fullName].background?.description || "")
        .font("Inter", "Regular")
        .fontSize(12)
        .alignVertical("CENTER")
        .resize(columnWidths.use, rowHeight)
        .appendTo(rowFrame);

      const backgroundFrame = FrameBuilder.create("background")
        .layout("VERTICAL")
        .size(columnWidths.background, rowHeight)
        .spacing(spacing)
        .appendTo(rowFrame)
        .build();

      // Background
      backgroundFrame.appendChild(
        createColorSquare(
          pair.background ? pair.background.color : undefined,
          columnWidths.square,
          rowHeight,
        ),
      );
      const foregroundFrame = FrameBuilder.create("foreground")
        .layout("VERTICAL")
        .size(columnWidths.foreground, rowHeight)
        .spacing(spacing)
        .appendTo(rowFrame)
        .build();

      // Foreground
      foregroundFrame.appendChild(
        createColorSquare(
          pair.foreground ? pair.foreground.color : undefined,
          columnWidths.square,
          rowHeight,
        ),
      );

      // Ratio (placeholder por enquanto)
      TextBuilder.create("AAA")
        .font("Inter", "Regular")
        .fontSize(12)
        .alignVertical("CENTER")
        .resize(columnWidths.ratio, rowHeight)
        .appendTo(rowFrame);

      // Preview
      const previewFrame = FrameBuilder.create()
        .size(columnWidths.preview, rowHeight)
        .layout("NONE") // permite sobreposição
        .appendTo(rowFrame)
        .build();

      const previewRect = createColorSquare(
        pair.background ? pair.background.color : undefined,
        columnWidths.square,
        rowHeight,
      );

      previewFrame.appendChild(previewRect);

      const previewText = TextBuilder.create("AA")
        .font("Inter", "Semi Bold")
        .fontSize(12)
        .resize(columnWidths.preview, rowHeight)
        .appendTo(previewFrame)
        .alignHorizontal("CENTER")
        .alignVertical("CENTER")
        .build();

      // Aplica foreground no texto do preview se existir
      if (pair.foreground) {
        previewText.fills = [
          {
            type: "SOLID",
            color: {
              r: pair.foreground.color.r,
              g: pair.foreground.color.g,
              b: pair.foreground.color.b,
            },
          },
        ];
      }
    }
  }

  return tableFrame;
}

async function generateDoc(collectionId: string, modeId: string) {
  await figma.loadFontAsync({ family: "Inter", style: "Semi Bold" });
  await figma.loadFontAsync({ family: "Inter", style: "Regular" });

  const mainContainer = FrameBuilder.create("Color System")
    .primarySizing("AUTO")
    .counterSizing("AUTO")
    .layout("VERTICAL")
    .padding(10)
    .spacing(10)
    .fillHex("#DDDCDC")
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

  const colorDecription = FrameBuilder.create("Color Description")
    .layout("VERTICAL")
    .primarySizing("AUTO")
    .counterSizing("AUTO")
    .padding(10)
    .spacing(8)
    .appendTo(content)
    .build();

  const allVariables = await figma.variables.getLocalVariablesAsync();

  const variablesInCollection = allVariables.filter(
    (v: Variable) => v.variableCollectionId === collectionId,
  );

  const collection = new ColorTokenCollection();

  for (const variable of variablesInCollection) {
    const token = await ColorToken.fromVariable(variable, modeId);
    if (token) collection.add(token);
  }

  const grouped = collection.groupByNamespace().groupByPair();

  const colorFrame = await createColorSystemTable(grouped);
  colorDecription.appendChild(colorFrame);

  console.log(Array.from(grouped.entries()));

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
