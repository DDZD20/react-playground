import * as monaco from "monaco-editor";
import { CodingAction } from "./type";

/**
 * 代码分析服务 - 负责收集和分析编码行为（所有事件原始采集，不做合并）
 */
class CodeAnalysisService {
  private codingActions: CodingAction[] = []; // 原始行为片段
  private waitTimer: number | null = null;
  private waitStartTime: number | null = null; // 记录等待开始的时间
  private editor: monaco.editor.IStandaloneCodeEditor | null = null;
  private monacoInstance: typeof monaco | null = null;
  private WAIT_THRESHOLD = 3000; // 3秒无操作判定为 wait
  private disposables: monaco.IDisposable[] = [];
  private lastModelValue: string = ''; // 缓存变更前的文本
  private lastKeyWasCompletion: boolean = false; // 标记上一次按键是否为补全触发

  public initialize(
    editor: monaco.editor.IStandaloneCodeEditor,
    monacoInstance: typeof monaco
  ): () => void {
    this.editor = editor;
    this.monacoInstance = monacoInstance;
    this.lastModelValue = editor.getValue(); // 初始化缓存
    this.codingActions = [];
    this.waitStartTime = null;
    this.dispose();
    this.registerEventListeners();
    this.resetWaitTimer();
    return () => this.dispose();
  }

  private registerEventListeners(): void {
    if (!this.editor || !this.monacoInstance) return;
    // @ts-ignore
    const typeDisposable = this.editor.onDidType((text: string) => {
      this.recordWaitIfNeeded();
      const now = Date.now();
      this.codingActions.push({
        type: 'type',
        content: text,
        timestamp: now,
        duration: 0,
      });
      this.resetWaitTimer();
    });
    this.disposables.push(typeDisposable);
    // paste
    if (this.editor.onDidPaste) {
      const pasteDisposable = this.editor.onDidPaste((e: any) => {
        this.recordWaitIfNeeded();
        const now = Date.now();
        this.codingActions.push({
          type: 'paste',
          content: e?.range ? this.editor?.getModel()?.getValueInRange(e.range) || '' : '',
          timestamp: now,
          duration: 0,
        });
        this.resetWaitTimer();
      });
      this.disposables.push(pasteDisposable);
    }
    // copy
    // @ts-ignore
    if (this.editor.onDidCopy) {
      // @ts-ignore
      const copyDisposable = this.editor.onDidCopy((e: any) => {
        this.recordWaitIfNeeded();
        const now = Date.now();
        this.codingActions.push({
          type: 'copy',
          content: e?.range ? this.editor?.getModel()?.getValueInRange(e.range) || '' : '',
          timestamp: now,
          duration: 0,
        });
        this.resetWaitTimer();
      });
      this.disposables.push(copyDisposable);
    }

    // 监听 Enter/Tab，标记可能的补全
    const completionKeyDownDisposable = this.editor.onKeyDown((e) => {
      // Enter: KeyCode 3, Tab: KeyCode 2
      if (e.keyCode === this.monacoInstance?.KeyCode.Enter || e.keyCode === this.monacoInstance?.KeyCode.Tab) {
        this.lastKeyWasCompletion = true;
      } else {
        this.lastKeyWasCompletion = false;
      }
    });
    this.disposables.push(completionKeyDownDisposable);

    // 内容变化（insert/delete）
    const contentChangeDisposable = this.editor.onDidChangeModelContent((e) => {
      const oldValue = this.lastModelValue; // 变更前内容
      this.recordWaitIfNeeded();
      const now = Date.now();
      for (const change of e.changes) {
        if (change.text && change.text.length > 1) {
          // 插入（已归并到 type/paste，不单独记录）
          // 检测补全：change.text 长度大于 1 且刚刚按下 Enter/Tab
          if (change.text.length > 1 && this.lastKeyWasCompletion) {
            this.codingActions.push({
              type: 'completion',
              content: change.text,
              timestamp: now,
              duration: 0,
            });
            this.lastKeyWasCompletion = false; // 重置标志位
          }
        } else if (!change.text && change.rangeLength) {
          // 删除
          const deletedContent = this.getValueInRangeFromString(oldValue, change.range);
          this.codingActions.push({
            type: 'delete',
            content: deletedContent,
            timestamp: now,
            duration: 0,
          });
        }
      }
      // 变更后，更新 lastModelValue
      this.lastModelValue = this.editor?.getValue() || '';
      this.resetWaitTimer();
    });
    this.disposables.push(contentChangeDisposable);
    // select（优化拖动选择，原始采集也不合并）
    // const selectionChangeDisposable = this.editor.onDidChangeCursorSelection((e) => {
    //   const selectedText = this.editor?.getModel()?.getValueInRange(e.selection) || '';
    //   if (selectedText && e.selection.startLineNumber !== e.selection.endLineNumber || 
    //       (e.selection.startColumn !== e.selection.endColumn && selectedText.length > 0)) {
    //     this.recordWaitIfNeeded();
    //     const now = Date.now();
    //     this.codingActions.push({
    //       type: 'select',
    //       content: selectedText,
    //       timestamp: now,
    //       duration: 0,
    //       extra: { selection: e.selection },
    //     });
    //   }
    //   this.resetWaitTimer();
    // });
    // this.disposables.push(selectionChangeDisposable);

    // undo/redo
    const keyDownDisposable = this.editor.onKeyDown((e) => {
      if ((e.ctrlKey || e.metaKey) && (e.keyCode === this.monacoInstance?.KeyCode.KeyZ || e.keyCode === this.monacoInstance?.KeyCode.KeyY)) {
        this.recordWaitIfNeeded();
        const now = Date.now();
        this.codingActions.push({
          type: e.keyCode === this.monacoInstance?.KeyCode.KeyZ ? 'undo' : 'redo',
          content: '',
          timestamp: now,
          duration: 0,
        });
        this.resetWaitTimer();
      }
    });
    this.disposables.push(keyDownDisposable);
  }


  private recordWaitIfNeeded(): void {
    if (this.waitStartTime) {
      const now = Date.now();
      const waitDuration = now - this.waitStartTime;
      if (waitDuration >= this.WAIT_THRESHOLD) {
        this.codingActions.push({
          type: 'wait',
          content: '',
          timestamp: this.waitStartTime,
          duration: waitDuration,
        });
      }
      this.waitStartTime = null;
    }
  }

  private resetWaitTimer(): void {
    if (this.waitTimer) {
      window.clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
    this.waitTimer = window.setTimeout(() => {
      this.waitStartTime = Date.now();
    }, this.WAIT_THRESHOLD);
  }

  public getCodingActions(): CodingAction[] {
    this.recordWaitIfNeeded();
    return [...this.codingActions];
  }

  public dispose(): void {
    this.disposables.forEach(disposable => disposable.dispose());
    this.disposables = [];
    if (this.waitTimer) {
      window.clearTimeout(this.waitTimer);
      this.waitTimer = null;
    }
    this.recordWaitIfNeeded();
  }

  public setWaitThreshold(threshold: number): void {
    this.WAIT_THRESHOLD = threshold;
  }
  public clearCodingActions(): void {
    this.codingActions = [];
    this.waitStartTime = null;
  }

  // 根据 range 从字符串中提取内容
  private getValueInRangeFromString(value: string, range: monaco.IRange): string {
    const lines = value.split('\n');
    if (range.startLineNumber === range.endLineNumber) {
      // 单行删除
      const line = lines[range.startLineNumber - 1];
      return line.substring(range.startColumn - 1, range.endColumn - 1);
    } else {
      // 多行删除
      const startLine = lines[range.startLineNumber - 1].substring(range.startColumn - 1);
      const endLine = lines[range.endLineNumber - 1].substring(0, range.endColumn - 1);
      const middleLines = lines.slice(range.startLineNumber, range.endLineNumber - 1);
      return [startLine, ...middleLines, endLine].join('\n');
    }
  }
}

/**
 * 合并 CodingAction 数组，生成更简洁的行为流
 * 规则：连续 type 合并，连续 delete 合并，连续 wait 合并，连续 select 合并，其他类型不合并
 */
export function mergeActions(actions: CodingAction[]): CodingAction[] {
  if (!actions.length) return [];
  const merged: CodingAction[] = [];
  let last: CodingAction | null = null;
  for (const curr of actions) {
    if (!last) {
      last = { ...curr };
      continue;
    }
    // 合并 type
    if (last.type === 'type' && curr.type === 'type') {
      last.content += curr.content;
      last.duration += curr.duration;
      continue;
    }
    // 新增：type + completion 合并为 type，content 取 completion
    if (last.type === 'type' && curr.type === 'completion') {
      last.type = 'type';
      last.content = curr.content;
      last.duration += curr.duration;
      continue;
    }
    // 合并 delete
    if (last.type === 'delete' && curr.type === 'delete') {
      // 优化：content 按实际删除顺序拼接（后删的在前）
      last.content = curr.content + last.content;
      last.duration += curr.duration;
      continue;
    }
    // 合并 wait
    if (last.type === 'wait' && curr.type === 'wait') {
      last.duration += curr.duration;
      continue;
    }
    // 合并 select
    if (last.type === 'select' && curr.type === 'select') {
      last.content = curr.content; // 取最后一次内容
      last.duration += curr.duration;
      last.extra = curr.extra;
      continue;
    }
    // 不可合并，推入 merged
    merged.push(last);
    last = { ...curr };
  }
  if (last) merged.push(last);
  return merged;
}

// 导出单例实例
const codeAnalysisService = new CodeAnalysisService();
export default codeAnalysisService;
