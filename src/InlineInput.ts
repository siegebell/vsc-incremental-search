// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

const INLINE_INPUT_CONTEXT = 'incrementalSearchInlineInput';

const subscriptions : vscode.Disposable[] = [];

export function disposeInlineInput() {
  subscriptions.forEach((d) => d.dispose());
}

function registerTextEditorCommand(commandId:string, run:(editor:vscode.TextEditor,edit:vscode.TextEditorEdit,...args:any[])=>void): void {
  subscriptions.push(vscode.commands.registerTextEditorCommand(commandId, run));
}

function registerCommand(commandId:string, run:(...args:any[])=>void): void {
  subscriptions.push(vscode.commands.registerCommand(commandId, run));
}

class Input {
  text: string;
  validateInput: (text: string) => string;
  resolve: (text: string) => void;
  reject: (reason: any) => void;
  constructor(options: {
    text: string,
    validateInput: (text: string) => string,
    resolve: (text: string) => void,
    reject: (reason: any) => void,  
  }) {
    this.text = options.text;
    this.validateInput = options.validateInput;
    this.resolve = options.resolve;
    this.reject = options.reject;
  }
}
var registeredTypeCommand = false;

registerTextEditorCommand('extension.incrementalSearch.backspace', onBackspace);
registerTextEditorCommand('extension.incrementalSearch.stop', onEscape);
registerTextEditorCommand('extension.incrementalSearch.complete', onComplete);

const editorInputs = new Map<vscode.TextEditor,Input>();

vscode.window.onDidChangeActiveTextEditor((editor: vscode.TextEditor) => {
  const hasEditor = editorInputs.has(editor);
  vscode.commands.executeCommand('setContext', INLINE_INPUT_CONTEXT, hasEditor);  
})



export async function showInlineInput(editor: vscode.TextEditor, value: string, validateInput: (text: string) => string) : Promise<string> {
  if(editorInputs.has(editor))
    throw "TextEditor already has an inline input."

  await vscode.commands.executeCommand('setContext', INLINE_INPUT_CONTEXT, true);

  const result = new Promise<string>((resolve, reject) => {
    const input = new Input({text: value, validateInput: validateInput, resolve: resolve, reject: reject});
    editorInputs.set(editor,input);
  });

  if(!registeredTypeCommand) {
    registeredTypeCommand = true;
    registerCommand('type', onType);
  }

  return result;
}

function onEscape(editor: vscode.TextEditor) {
  cancel(editor, 'user initiated escape')
}

function onComplete(editor: vscode.TextEditor) {
  complete(editor);
}

function onBackspace(editor: vscode.TextEditor) {
  const input = editorInputs.get(editor);
  if(input) {
    input.text = input.text.substr(0,input.text.length-1);
    input.validateInput(input.text);
  }
}

function onType(event: {text:string}) {
  const input = editorInputs.get(vscode.window.activeTextEditor);
  if(input) {
    input.text+= event.text;
    input.validateInput(input.text);
  }
  else
    vscode.commands.executeCommand('default:type', event);
}

export function cancel(editor: vscode.TextEditor, reason = '') {
  const input = editorInputs.get(editor);
  if(input) {
    editorInputs.delete(editor);
    input.resolve(undefined);
  }
  if(editorInputs.size == 0)
    vscode.commands.executeCommand('setContext', INLINE_INPUT_CONTEXT, false);  
}

export function complete(editor: vscode.TextEditor) {
  const input = editorInputs.get(editor);
  if(input) {
    editorInputs.delete(editor);
    input.resolve(input.text);
  }
  if(editorInputs.size == 0)
    vscode.commands.executeCommand('setContext', INLINE_INPUT_CONTEXT, false);  
}

