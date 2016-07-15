// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {IncrementalSearch, SearchDirection, SearchOptions} from './IncrementalSearch';
import {SearchStatusBar} from './SearchStatusBar';

const INCREMENTAL_SEARCH_CONTEXT = 'incrementalSearch';

let status : SearchStatusBar;
let search : IncrementalSearch = null;

// this method is called when your extension is activated
// your extension is activated the very first time the command is executed
export function activate(context: vscode.ExtensionContext) {
  function registerTextEditorCommand(commandId:string, run:(editor:vscode.TextEditor,edit:vscode.TextEditorEdit,...args:any[])=>void): void {
    context.subscriptions.push(vscode.commands.registerTextEditorCommand(commandId, run));
  }
  function registerCommand(commandId:string, run:(...args:any[])=>void): void {
    context.subscriptions.push(vscode.commands.registerCommand(commandId, run));
  }
  vscode.commands.executeCommand('setContext', 'incrementalSearch', false);

  status = new SearchStatusBar('extension.incrementalSearch.toggleCaseSensitivity', 'extension.incrementalSearch.toggleRegExp');
  context.subscriptions.push(status);

  registerTextEditorCommand('extension.incrementalSearch.forward', (editor: vscode.TextEditor) => {
    advanceSearch(editor, {direction: SearchDirection.forward});
   });

  registerTextEditorCommand('extension.incrementalSearch.backward', (editor: vscode.TextEditor) => {
		advanceSearch(editor, {direction: SearchDirection.backward});
  });

  registerTextEditorCommand('extension.incrementalSearch.expand', (editor: vscode.TextEditor) => {
		advanceSearch(editor, {expand: true, direction: SearchDirection.forward});
  });

  registerTextEditorCommand('extension.incrementalSearch.backwardExpand', (editor: vscode.TextEditor) => {
    advanceSearch(editor, {expand: true, direction: SearchDirection.backward});
  });

  registerTextEditorCommand('extension.incrementalSearch.toggleRegExp', (editor: vscode.TextEditor) => {
    updateSearch({useRegExp: !search.useRegExp});
  });
  registerTextEditorCommand('extension.incrementalSearch.toggleCaseSensitivity', (editor: vscode.TextEditor) => {
    updateSearch({caseSensitive: !search.caseSensitive});
  });

  registerTextEditorCommand('extension.incrementalSearch.stop', (editor) => {
    if(search)
      search.cancelSelections();
    stopSearch();
  });
  vscode.window.onDidChangeActiveTextEditor(() => stopSearch());
  vscode.window.onDidChangeTextEditorSelection(onSelectionsChanged);
  vscode.workspace.onDidChangeTextDocument(() => stopSearch);
  vscode.workspace.onDidCloseTextDocument(() => stopSearch);

  registerCommand('extension.incrementalSearch.backspace', () => {
    if(search) {
      updateSearch({searchTerm: search.searchTerm.substr(0,search.searchTerm.length-1)});
    }
  });

  registerCommand('type', (event: {text:string}) => {
    if(search)
      updateSearch({searchTerm: search.searchTerm + event.text});
    else
      vscode.commands.executeCommand('default:type', event);
  });

}



async function stopSearch(forwardCommand = '', ...args: any[]) {
  await vscode.commands.executeCommand('setContext', 'incrementalSearch', false);
  search = null;
  status.hide();
  if(forwardCommand)
    vscode.commands.executeCommand(forwardCommand, args);
}

function beginSearch(editor: vscode.TextEditor, options : SearchOptions) {
  if(search)
    return;

  search = new IncrementalSearch(editor, options);
  status.update(search.searchTerm, search.caseSensitive, search.useRegExp, {backward: search.direction==SearchDirection.backward});
  status.show();
  vscode.commands.executeCommand('setContext', 'incrementalSearch', true);
  // vscode.window.showInputBox({
  //   value: search.searchTerm,
  //   prompt: "incremental search",
  //   placeHolder: "enter a search term",
  //   validateInput: (text: string) => {
  //     const result = updateSearch({searchTerm: text});
  //     return result.error;
  //   }
  // });
}

function advanceSearch(editor: vscode.TextEditor, options: SearchOptions) {
  if(!search)
    beginSearch(editor, options);
  else
    search.advance(options);  
}


function updateSearch(options : SearchOptions) : {error?: string} {
  if(!search)
    return;

  try {
    search.update(options);
    status.update(search.searchTerm, search.caseSensitive, search.useRegExp);
  } catch(e) {
    status.update(search.searchTerm, search.caseSensitive, search.useRegExp);
    if(e instanceof SyntaxError) {
      status.indicateSyntaxError();
      return {error: e.message};
    }
    else
      console.error(e);
    return {error: 'Unkown error'}
  }
}



/** Stops search if anyone else tries to modify the editor selections */
function onSelectionsChanged(event:vscode.TextEditorSelectionChangeEvent) {
  if(!search)
    return;

  // If the selection has changed and no longer agree's with what the search ex
  const currentSelections = search.getCurrentSelections();
  if(event.selections.length != currentSelections.length)
    stopSearch();
  for(let idx =0; idx < currentSelections.length; ++idx) {
    if(!currentSelections[idx].isEqual(event.selections[idx])) {
      stopSearch();
      return;
    }
  }
}


// this method is called when your extension is deactivated
export function deactivate() {
}