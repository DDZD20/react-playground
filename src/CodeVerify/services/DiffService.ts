import * as monaco from "monaco-editor";
import { diffLines } from "diff";
import {
  DiffBlock,
  DiffContext,
  DiffActionCallbacks,
  DiffActionResult,
} from "./type";

/**
 * 代码差异处理服务
 * 提供计算差异、应用装饰器、处理接受/拒绝操作等功能
 */
class DiffService {
  private widgetsRef: HTMLDivElement[] = [];
  private cleanupCallbacks: (() => void)[] = [];
  private decorationsCollection: monaco.editor.IEditorDecorationsCollection | null =
    null;
  //   private decorationIds: string[] = [];

  /**
   * 生成唯一ID
   */
  private generateId(): string {
    return Math.random().toString(36).substring(2, 9);
  }

  /**
   * 计算两段代码之间的差异
   * @param originalCode 原始代码
   * @param modifiedCode 修改后的代码
   * @returns 差异块数组
   */
  public calculateDiff(
    originalCode: string,
    modifiedCode: string
  ): DiffBlock[] {
    const diffResult = diffLines(originalCode, modifiedCode);
    const blocks: DiffBlock[] = [];

    // 为每个 diff 部分添加 count 属性，表示这个 diff 有多少行
    diffResult.forEach((part: any) => {
      const lines = part.value.split("\n");
      // 计算实际行数，如果最后以换行符结束，则减去最后一个空行
      const linesCount = part.value.endsWith("\n")
        ? lines.length - 1
        : lines.length;
      
      // 添加 count 属性
      part.count = linesCount;
    });

    // 创建一个映射，记录每一行的类型，用于检测同一行的多重操作
    const lineMap: Record<
      number,
      { type: "added" | "removed" | "unchanged"; content: string }
    > = {};

    // 第一遍：收集所有行的操作信息
    let currentLine = 1;
    diffResult.forEach((part: any) => {
      const lines = part.value.split("\n");
      const linesCount = part.count; // 使用已计算的 count 属性

      let type: "added" | "removed" | "unchanged";
      if (part.added) {
        type = "added";
      } else if (part.removed) {
        type = "removed";
      } else {
        type = "unchanged";
      }

      // 记录每一行的操作类型
      if (linesCount > 0) {
        for (let i = 0; i <linesCount; i++) {
          // 移除的行不增加行号，可能与添加的行冲突
          const line = type === "removed" ? currentLine : currentLine + i;

          // 检查是否已有该行的记录
          if (lineMap[line]) {
            // 如果已经有记录且类型不同，我们不再创建"modified"类型
            // 而是保留原有记录，因为我们将分别创建removed和added块
            if (
              lineMap[line].type !== type &&
              (type === "added" || type === "removed")
            ) {
              // 不做任何修改，保留原有记录
              // 这样会导致在同一行位置有两个不同的块（一个removed和一个added）
            }
          } else {
            lineMap[line] = { type, content: lines[i] };
          }
        }
      }

      // 只有非移除的部分会影响行号计数
      if (type !== "removed") {
        currentLine += linesCount;
      }
    });

    // 第二遍：根据行映射创建差异块
    let blockStart = -1;
    let blockType: "added" | "removed" | "unchanged" | null = null;
    let blockContent = "";

    // 处理所有行，合并相邻的相同类型行
    for (let i = 1; i <= Object.keys(lineMap).length; i++) {
      if (!lineMap[i]) continue;

      const { type, content } = lineMap[i];

      // 如果当前块为空或与前一个块类型相同，则继续当前块
      if (blockType === null || blockType === type) {
        if (blockStart === -1) blockStart = i;
        blockType = type;
        blockContent += content + "\n";
      } else {
        // 否则完成当前块并开始新块
        if (blockStart !== -1 && blockType) {
          blocks.push({
            id: this.generateId(),
            startLine: blockStart,
            endLine: i - 1,
            content: blockContent,
            type: blockType,
            decorationIds: [],
          });
        }

        // 开始新块
        blockStart = i;
        blockType = type;
        blockContent = content + "\n";
      }
    }

    return blocks;
  }

  /**
   * 应用装饰器到编辑器
   * @param context 差异处理上下文
   * @param blocks 差异块数组
   * @returns 更新后的差异块数组
   */
  public applyDecorations(
    context: DiffContext,
    blocks: DiffBlock[]
  ): DiffBlock[] {
    const { editor, monaco } = context;
    if (!editor || !monaco) return blocks;

    // 清除现有装饰器
    const model = editor.getModel();
    if (!model) return blocks;

    // 清除之前的装饰集合
    if (this.decorationsCollection) {
      this.decorationsCollection.clear();
    } else {
      this.decorationsCollection = editor.createDecorationsCollection();
    }

    const decorations: monaco.editor.IModelDeltaDecoration[] = [];
    const blockDecorationMap = new Map<string, string[]>();

    // 为每个差异块创建装饰器
    blocks.forEach((block) => {
      if (block.type === "unchanged") return;

      const range = new monaco.Range(block.startLine, 1, block.endLine, 1);

      // 创建唯一ID以便跟踪
      const decorationId = this.generateId();
      blockDecorationMap.set(block.id, [decorationId]);

      // 根据类型设置不同的装饰器样式
      if (block.type === "added") {
        decorations.push({
          range,
          options: {
            isWholeLine: true,
            className: "diff-added-line",
            glyphMarginClassName: "diff-added-glyph",
            zIndex: 1,
          },
        });
      } else if (block.type === "removed") {
        decorations.push({
          range,
          options: {
            isWholeLine: true,
            className: "diff-removed-line",
            glyphMarginClassName: "diff-removed-glyph",
            zIndex: 1,
          },
        });
      }
      // 移除 modified 类型的处理，因为我们不再使用这种类型
    });

    // 使用装饰集合设置装饰器
    this.decorationsCollection.set(decorations);

    // 将装饰器ID关联到差异块
    return blocks.map((block) => {
      if (block.type !== "unchanged" && blockDecorationMap.has(block.id)) {
        return {
          ...block,
          decorationIds: blockDecorationMap.get(block.id) || [],
        };
      }
      return block;
    });
  }

  /**
   * 创建差异操作控件
   * @param context 差异处理上下文
   * @param blocks 差异块数组
   * @param callbacks 回调函数集合
   */
  public createDiffActionWidgets(
    context: DiffContext,
    blocks: DiffBlock[],
    callbacks: {
      onAccept: (
        editor: monaco.editor.IStandaloneCodeEditor,
        block: DiffBlock
      ) => void;
      onReject: (
        editor: monaco.editor.IStandaloneCodeEditor,
        block: DiffBlock
      ) => void;
    }
  ): HTMLDivElement[] {
    const { editor } = context;

    // 移除现有控件
    this.widgetsRef.forEach((widget) => {
      if (widget.parentElement) {
        widget.parentElement.removeChild(widget);
      }
    });
    this.widgetsRef = [];

    const editorDomNode = editor.getDomNode();
    if (!editorDomNode || !editorDomNode.parentElement) return [];

    // 获取合并后的块组
    const decorationBlocks = this.mergeBlocks(blocks);

    // 为每组块创建一个控件，而不是为每个块创建控件
    decorationBlocks.forEach((blockGroup) => {
      // 跳过只包含unchanged类型的组
      if (blockGroup.every(block => block.type === "unchanged")) return;

      // 获取组中第一个块的位置信息作为控件位置
      const firstBlock = blockGroup[0];
      const startPosition = editor.getScrolledVisiblePosition({
        lineNumber: firstBlock.startLine,
        column: 1,
      });
      if (!startPosition) return;

      // 创建控件容器
      const widget = document.createElement("div");
      widget.className = "diff-action-widget";
      widget.style.position = "absolute";
      widget.style.top = `${startPosition.top - 20}px`;
      
      // 使用组中第一个块的ID作为控件ID
      widget.dataset.blockId = firstBlock.id;
      // 存储该组所有块的ID，用于后续处理
      widget.dataset.blockGroupIds = JSON.stringify(blockGroup.map(block => block.id));

      // 创建Accept按钮
      const acceptBtn = document.createElement("button");
      acceptBtn.innerText = "接受";
      acceptBtn.className = "diff-action-accept";
      acceptBtn.onclick = () => {
        // 处理整个组的接受操作
        blockGroup.forEach(block => {
          callbacks.onAccept(editor, block);
        });
      };
      widget.appendChild(acceptBtn);

      // 创建Reject按钮
      const rejectBtn = document.createElement("button");
      rejectBtn.innerText = "拒绝";
      rejectBtn.className = "diff-action-reject";
      rejectBtn.onclick = () => {
        // 处理整个组的拒绝操作
        blockGroup.forEach(block => {
          callbacks.onReject(editor, block);
        });
      };
      widget.appendChild(rejectBtn);

      // 添加到DOM
      if (editorDomNode.parentElement) {
        editorDomNode.parentElement.appendChild(widget);
        this.widgetsRef.push(widget);
      }
    });

    return this.widgetsRef;
  }

  /**
   * 设置鼠标悬停事件监听
   * @param context 差异处理上下文
   * @param blocks 差异块数组
   */
  public setupHoverListeners(context: DiffContext, blocks: DiffBlock[]): void {
    const { editor, monaco } = context;
    if (!monaco || !editor) return;

    // 添加鼠标移动事件监听
    const mouseMoveDisposable = editor.onMouseMove((e) => {
      // 获取当前鼠标位置所在行
      const lineNumber = e.target.position?.lineNumber;
      if (!lineNumber) return;

      // 更新控件位置和显示状态
      blocks.forEach((block) => {
        if (block.type === "unchanged") return;

        const widget = this.widgetsRef.find(
          (w) => w.dataset.blockId === block.id
        );
        if (!widget) return;

        if (lineNumber >= block.startLine && lineNumber <= block.endLine) {
          // 鼠标在差异块上，显示控件
          widget.classList.add("visible");
          const startPosition = editor.getScrolledVisiblePosition({
            lineNumber: block.startLine,
            column: 1,
          });
          if (startPosition) {
            widget.style.top = `${startPosition.top - 20}px`;
          }
        } else {
          // 鼠标不在差异块上，隐藏控件
          widget.classList.remove("visible");
        }
      });
    });

    // 添加到清理函数中
    this.cleanupCallbacks.push(() => {
      mouseMoveDisposable.dispose();
    });
  }

  /**
   * 更新控件位置
   * @param editor 编辑器实例
   * @param blocks 差异块数组
   */
  public updateWidgetPositions(
    editor: monaco.editor.IStandaloneCodeEditor,
    blocks: DiffBlock[]
  ): void {
    this.widgetsRef.forEach((widget) => {
      const blockId = widget.dataset.blockId;
      const block = blocks.find((b) => b.id === blockId);
      if (!block) return;

      const startPosition = editor.getScrolledVisiblePosition({
        lineNumber: block.startLine,
        column: 1,
      });
      if (!startPosition) return;

      widget.style.top = `${startPosition.top - 20}px`;
    });
  }

  /**
   * 处理接受差异块
   * @param context 差异处理上下文
   * @param block 差异块
   * @returns 处理结果
   */
  public handleAccept(
    context: DiffContext,
    block: DiffBlock,
    blocks: DiffBlock[]
  ): DiffActionResult {
    const { editor, monaco } = context;
    const model = editor.getModel();
    if (!model || !monaco) {
      return { newBlocks: blocks, removedBlockId: block.id };
    }

    // 查找当前块所在的组
    const decorationBlocks = this.mergeBlocks(blocks);
    const blockGroup = decorationBlocks.find(group => 
      group.some(b => b.id === block.id)
    ) || [];
    
    // 获取组内所有块的ID
    const blockIds = blockGroup.map(b => b.id);
    
    // 从差异列表中移除整个组的块
    const newBlocks = blocks.filter((b) => !blockIds.includes(b.id));

    // 清除所有装饰器
    if (this.decorationsCollection) {
      this.decorationsCollection.clear();

      // 重新应用其他块的装饰器（不在当前组内的块）
      const remainingDecorations: monaco.editor.IModelDeltaDecoration[] = [];

      newBlocks.forEach((b) => {
        if (b.type === "unchanged") return;

        const range = new monaco.Range(b.startLine, 1, b.endLine, 1);

        if (b.type === "added") {
          remainingDecorations.push({
            range,
            options: {
              isWholeLine: true,
              className: "diff-added-line",
              glyphMarginClassName: "diff-added-glyph",
              zIndex: 1,
            },
          });
        } else if (b.type === "removed") {
          remainingDecorations.push({
            range,
            options: {
              isWholeLine: true,
              className: "diff-removed-line",
              glyphMarginClassName: "diff-removed-glyph",
              zIndex: 1,
            },
          });
        }
      });

      if (remainingDecorations.length > 0) {
        this.decorationsCollection.set(remainingDecorations);
      }
    }

    // 根据差异类型执行不同的操作
    if (block.type === "removed") {
      // 接受删除 - 需要从编辑器中删除这段代码
      const range = new monaco.Range(block.startLine, 1, block.endLine + 1, 1);
      model.pushEditOperations([], [{ range, text: "" }], () => null);

      // 更新其他块的行号
      const linesToRemove = block.endLine - block.startLine + 1;
      const updatedBlocks = newBlocks.map((b) => {
        if (b.startLine > block.endLine) {
          return {
            ...b,
            startLine: b.startLine - linesToRemove,
            endLine: b.endLine - linesToRemove,
          };
        }
        return b;
      });

      return {
        newBlocks: updatedBlocks,
        removedBlockId: block.id,
        affectedLineRange: {
          startLine: block.startLine,
          endLine: block.endLine,
          linesToRemove,
        },
      };
    } else if (block.type === "added") {
      // 接受添加 - 将整个组内的块标记为已接受
      // 不需要应用临时样式，直接返回更新后的块列表
      
      return {
        newBlocks,
        removedBlockId: block.id,
      };
    }

    return { newBlocks, removedBlockId: block.id };
  }

  /**
   * 处理拒绝差异块
   * @param context 差异处理上下文
   * @param block 差异块
   * @returns 处理结果
   */
  public handleReject(
    context: DiffContext,
    block: DiffBlock,
    blocks: DiffBlock[]
  ): DiffActionResult {
    const { editor, monaco } = context;
    const model = editor.getModel();
    if (!model || !monaco) {
      return { newBlocks: blocks, removedBlockId: block.id };
    }

    // 查找当前块所在的组
    const decorationBlocks = this.mergeBlocks(blocks);
    const blockGroup = decorationBlocks.find(group => 
      group.some(b => b.id === block.id)
    ) || [];
    
    // 获取组内所有块的ID
    const blockIds = blockGroup.map(b => b.id);
    
    // 从差异列表中移除整个组的块
    const newBlocks = blocks.filter((b) => !blockIds.includes(b.id));

    // 清除所有装饰器
    if (this.decorationsCollection) {
      this.decorationsCollection.clear();

      // 重新应用其他块的装饰器（不在当前组内的块）
      const remainingDecorations: monaco.editor.IModelDeltaDecoration[] = [];

      newBlocks.forEach((b) => {
        if (b.type === "unchanged") return;

        const range = new monaco.Range(b.startLine, 1, b.endLine, 1);

        if (b.type === "added") {
          remainingDecorations.push({
            range,
            options: {
              isWholeLine: true,
              className: "diff-added-line",
              glyphMarginClassName: "diff-added-glyph",
              zIndex: 1,
            },
          });
        } else if (b.type === "removed") {
          remainingDecorations.push({
            range,
            options: {
              isWholeLine: true,
              className: "diff-removed-line",
              glyphMarginClassName: "diff-removed-glyph",
              zIndex: 1,
            },
          });
        }
      });

      if (remainingDecorations.length > 0) {
        this.decorationsCollection.set(remainingDecorations);
      }
    }

    // 根据差异类型执行不同的操作
    if (block.type === "added") {
      // 拒绝添加 - 需要从编辑器中删除这段代码
      const range = new monaco.Range(block.startLine, 1, block.endLine + 1, 1);
      model.pushEditOperations([], [{ range, text: "" }], () => null);

      // 更新其他块的行号
      const linesToRemove = block.endLine - block.startLine + 1;
      const updatedBlocks = newBlocks.map((b) => {
        if (b.startLine > block.endLine) {
          return {
            ...b,
            startLine: b.startLine - linesToRemove,
            endLine: b.endLine - linesToRemove,
          };
        }
        return b;
      });

      return {
        newBlocks: updatedBlocks,
        removedBlockId: block.id,
        affectedLineRange: {
          startLine: block.startLine,
          endLine: block.endLine,
          linesToRemove,
        },
      };
    } else if (block.type === "removed") {
      // 拒绝删除 - 将整个组内的块标记为已拒绝
      // 不需要应用临时样式，直接返回更新后的块列表
      
      return {
        newBlocks,
        removedBlockId: block.id,
      };
    }

    return { newBlocks, removedBlockId: block.id };
  }

  /**
   * 初始化差异编辑模式
   * @param context 差异处理上下文
   * @param originalCode 原始代码
   * @param pendingCode 待处理代码
   * @param callbacks 回调函数集合
   * @returns 清理函数
   */
  public initializeDiffMode(
    context: DiffContext,
    originalCode: string,
    pendingCode: string,
    callbacks: DiffActionCallbacks
  ): () => void {
    const { editor, monaco } = context;
    if (!editor || !monaco) return () => {};

    // 先清除所有现有装饰器
    if (this.decorationsCollection) {
      this.decorationsCollection.clear();
    } else {
      this.decorationsCollection = editor.createDecorationsCollection();
    }

    // 计算差异并应用到编辑器
    const blocks = this.calculateDiff(originalCode, pendingCode);
    // const decorationBlocks = this.mergeBlocks(blocks);
    const updatedBlocks = this.applyDecorations(context, blocks);
    
    // 使用一个引用来跟踪最新的块状态
    let currentBlocks = updatedBlocks;

    if (updatedBlocks) {
      callbacks.onDiffBlocksChanged(updatedBlocks);

      const widgets = this.createDiffActionWidgets(context, updatedBlocks, {
        onAccept: (editor, block) => {
          const result = this.handleAccept(context, block, currentBlocks);
          // 更新当前块状态
          currentBlocks = result.newBlocks;
          callbacks.onDiffBlocksChanged(result.newBlocks);

          // 移除对应的控件
          const widget = this.widgetsRef.find(
            (w) => w.dataset.blockId === block.id
          );
          if (widget && widget.parentElement) {
            widget.parentElement.removeChild(widget);
            this.widgetsRef = this.widgetsRef.filter(
              (w) => w.dataset.blockId !== block.id
            );
            callbacks.onWidgetsUpdated(this.widgetsRef);
          }

          // 通知UI刷新
          editor.layout();
        },
        onReject: (editor, block) => {
          const result = this.handleReject(context, block, currentBlocks);
          // 更新当前块状态
          currentBlocks = result.newBlocks;
          callbacks.onDiffBlocksChanged(result.newBlocks);

          // 移除对应的控件
          const widget = this.widgetsRef.find(
            (w) => w.dataset.blockId === block.id
          );
          if (widget && widget.parentElement) {
            widget.parentElement.removeChild(widget);
            this.widgetsRef = this.widgetsRef.filter(
              (w) => w.dataset.blockId !== block.id
            );
            callbacks.onWidgetsUpdated(this.widgetsRef);
          }

          // 通知UI刷新
          editor.layout();
        },
      });

      callbacks.onWidgetsUpdated(widgets);
      this.setupHoverListeners(context, updatedBlocks);
    }

    // 监听滚动事件以更新控件位置
    const scrollDisposable = editor.onDidScrollChange(() => {
      // 使用最新的块状态
      this.updateWidgetPositions(editor, currentBlocks);
    });

    // 监听编辑器内容变化
    const contentDisposable = editor.onDidChangeModelContent(() => {
      // 使用最新的块状态
      this.updateWidgetPositions(editor, currentBlocks);
    });

    // 存储清理函数
    this.cleanupCallbacks.push(
      () => scrollDisposable.dispose(),
      () => contentDisposable.dispose()
    );

    // 监听窗口大小变化
    const resizeHandler = () => {
      setTimeout(() => {
        // 使用最新的块状态
        this.updateWidgetPositions(editor, currentBlocks);
      }, 100);
    };
    window.addEventListener("resize", resizeHandler);
    this.cleanupCallbacks.push(() =>
      window.removeEventListener("resize", resizeHandler)
    );

    // 返回清理函数
    return () => {
      // 执行所有注册的清理回调
      this.cleanupCallbacks.forEach((cb) => cb());
      this.cleanupCallbacks = [];

      // 移除所有控件
      this.widgetsRef.forEach((widget) => {
        if (widget.parentElement) {
          widget.parentElement.removeChild(widget);
        }
      });
      this.widgetsRef = [];

      // 清除所有装饰器
      if (this.decorationsCollection) {
        this.decorationsCollection.clear();
        this.decorationsCollection = null;
      }
    };
  }

  private mergeBlocks(blocks: DiffBlock[]) {
    if (!blocks || blocks.length === 0) {
      return [];
    }

    let filterBlocks = blocks.filter( block => block.type !== 'unchanged');
    const decorateBlocks: DiffBlock[][] = [];
    let currentGroup: DiffBlock[] = [];
    
    for (let i = 0; i < filterBlocks.length; i++) {
      const block = filterBlocks[i];
      
      // 如果当前组为空，直接添加当前块
      if (currentGroup.length === 0) {
        currentGroup.push(block);
      } else {
        // 获取当前组最后一个块
        const lastBlock = currentGroup[currentGroup.length - 1];
        
        // 检查当前块是否与上一个块连续
        if (block.startLine <= lastBlock.endLine + 1) {
          // 连续的块，添加到当前组
          currentGroup.push(block);
        } else {
          // 不连续，保存当前组并开始新组
          decorateBlocks.push([...currentGroup]);
          currentGroup = [block];
        }
      }
    }
    
    // 添加最后一组（如果有）
    if (currentGroup.length > 0) {
      decorateBlocks.push(currentGroup);
    }
    
    return decorateBlocks;
  }

  /**
   * 检查是否所有差异都已处理
   * @param blocks 差异块数组
   * @returns 是否所有差异都已处理
   */
  public allDiffsProcessed(blocks: DiffBlock[]): boolean {
    return blocks.every((block) => block.type === "unchanged");
  }
}

// 创建单例并导出
const diffService = new DiffService();
export default diffService;
