// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {IncrementalSearch, SearchDirection, SearchOptions} from './IncrementalSearch';
import {SearchStatusBar} from './SearchStatusBar';
import * as inlineInput from './InlineInput';

const INCREMENTAL_SEARCH_CONTEXT = 'incrementalSearch';

let status : SearchStatusBar;
let searches = new Map<vscode.TextEditor,IncrementalSearch>();

let matchDecoratation : vscode.TextEditorDecorationType = null;
let selectionDecoratation : vscode.TextEditorDecorationType = null;

type DecorateMatchCondition = 'never' | 'always' | 'multigroups';
type InputMode = 'input-box' | 'inline';

interface Configuration {
  inputMode: InputMode,
  matchStyle: vscode.DecorationRenderOptions,
  // when to show the style
  styleMatches: DecorateMatchCondition, 
  selectionStyle: vscode.DecorationRenderOptions,
}

let configuration : Configuration = {
  inputMode: 'input-box',
  matchStyle: {
    dark: {
      border: '1pt white dashed',
    },
    light: {
      border: '1pt black solid',
    },
  },
  styleMatches: 'always',
  selectionStyle: {
    backgroundColor: 'rgba(0,0,255,0.5)',
    borderRadius: '50%',
    border: '1pt rgba(0,0,100,0.8) solid',
  },
};

var decorateSelection = false;
// var registeredTypeCommand = false;
var context: vscode.ExtensionContext = null;

function registerTextEditorCommand(commandId:string, run:(editor:vscode.TextEditor,edit:vscode.TextEditorEdit,...args:any[])=>void): void {
  context.subscriptions.push(vscode.commands.registerTextEditorCommand(commandId, run));
}

function registerCommand(commandId:string, run:(...args:any[])=>void): void {
  context.subscriptions.push(vscode.commands.registerCommand(commandId, run));
}

export function activate(activationContext: vscode.ExtensionContext) {
  context = activationContext;

  vscode.commands.executeCommand('setContext', 'incrementalSearch', false);

  // if(selectionDecoratation)
  //   selectionDecoratation.dispose();
  // selectionDecoratation = vscode.window.createTextEditorDecorationType({
  //   backgroundColor: 'rgba(0,0,255,0.5)',
  //   borderRadius: '50%',
  //   border: '1pt rgba(0,0,100,0.8) solid',
  // });
  // matchDecoratation = vscode.window.createTextEditorDecorationType(configuration.matchStyle);
  // context.subscriptions.push(matchDecoratation);

  status = new SearchStatusBar('extension.incrementalSearch.toggleCaseSensitivity', 'extension.incrementalSearch.toggleRegExp');
  context.subscriptions.push(status);
  loadConfiguration();

  vscode.workspace.onDidChangeConfiguration(loadConfiguration);

  registerTextEditorCommand('extension.incrementalSearch.forward', (editor) => {
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
    const search = searches.get(editor);
    if(search)
      updateSearch(search, {useRegExp: !search.useRegExp});
    
    context.globalState.update("useRegExp", search.useRegExp);
  });
  registerTextEditorCommand('extension.incrementalSearch.toggleCaseSensitivity', (editor: vscode.TextEditor) => {
    const search = searches.get(editor);
    if(search)
      updateSearch(search, {caseSensitive: !search.caseSensitive});

    context.globalState.update("caseSensitive", search.caseSensitive);
  });

  // registerTextEditorCommand('extension.incrementalSearch.stop', (editor) => {
  //   cancelSearch(editor);
  // });
  vscode.window.onDidChangeTextEditorSelection(onSelectionsChanged);
  vscode.window.onDidChangeActiveTextEditor(async () => {
    const search = searches.get(vscode.window.activeTextEditor);
    if(search) {
      status.show();
      await vscode.commands.executeCommand('setContext', 'incrementalSearch', true);
      updateSearch(search,{});
    } else {
      status.hide();
      await vscode.commands.executeCommand('setContext', 'incrementalSearch', false);
    }
  });
  // vscode.workspace.onDidChangeTextDocument((event: vscode.TextDocumentChangeEvent) =>  {
  //   if(configuration.inputMode=='inline')
  //     vscode.window.visibleTextEditors.forEach((editor) => {
  //       if(editor.document == event.document)
  //         stopSearch(vscode.window.activeTextEditor, "text document changed") });
  //     })
  // vscode.workspace.onDidCloseTextDocument((document: vscode.TextDocument) =>  {
  //   if(configuration.inputMode=='inline')
  //     vscode.window.visibleTextEditors.forEach((editor) => {
  //       if(editor.document == document)
  //         stopSearch(vscode.window.activeTextEditor, "text document closed") });
  //     })

  // registerTextEditorCommand('extension.incrementalSearch.backspace', (editor: vscode.TextEditor) => {
  //   const search = searches.get(editor);
  //   if(search) {
  //     updateSearch(search, {searchTerm: search.searchTerm.substr(0,search.searchTerm.length-1)});
  //   }
  // });
}

function loadConfiguration() {
  configuration = Object.assign(configuration, vscode.workspace.getConfiguration("incrementalSearch"));

  if(selectionDecoratation)
    selectionDecoratation.dispose();
  selectionDecoratation = null;
  selectionDecoratation = vscode.window.createTextEditorDecorationType(configuration.selectionStyle);

  if(matchDecoratation != null)
    matchDecoratation.dispose();
  matchDecoratation = null;
  matchDecoratation = vscode.window.createTextEditorDecorationType(configuration.matchStyle);

  if(configuration.inputMode == 'input-box')
    decorateSelection = true;

  // Do not register the 'type' command unless we have to
  // (potential performance issues)
  // if(configuration.inputMode == 'inline' && registeredTypeCommand==false) {
  //   registeredTypeCommand = true;
  //   registerCommand('type', (event: {text:string}) => {
  //     const search = searches.get(vscode.window.activeTextEditor);
  //     if(search && configuration.inputMode == 'inline')
  //       updateSearch(search,{searchTerm: search.searchTerm + event.text});
  //     else
  //       vscode.commands.executeCommand('default:type', event);
  //   });
  // }
}

function cancelSearch(editor: vscode.TextEditor) {
  let search = searches.get(editor)
  if(search)
    search.cancelSelections();
  stopSearch(editor, "stop command");
}

async function stopSearch(editor: vscode.TextEditor, reason: string, forwardCommand = '', ...args: any[]) {
  inlineInput.complete(editor);

  const search = searches.get(editor);  
  try {
    await vscode.commands.executeCommand('setContext', 'incrementalSearch', false);
  } catch(e) {}

  if(search) {
    console.log("search stopped: " + reason);
    clearMatchDecorations(search);
    searches.delete(editor);
  }

  status.hide();

  try {
    if(forwardCommand)
      await vscode.commands.executeCommand(forwardCommand, args);
  } catch(e) {

  }
}

let previousSearchTerm = '';
async function doSearch(editor: vscode.TextEditor, options : SearchOptions) {
  if(searches.has(editor))
    return;

  const search = new IncrementalSearch(editor, options);
  searches.set(editor,search);
  status.update(search.searchTerm, search.caseSensitive, search.useRegExp, {backward: search.direction==SearchDirection.backward});
  status.show();
  await vscode.commands.executeCommand('setContext', 'incrementalSearch', true);

  if(configuration.inputMode == 'input-box') {
    try {
      updateSearch(search,{searchTerm: previousSearchTerm});
      const searchTerm = await vscode.window.showInputBox({
        // value: search.searchTerm,
        prompt: "incremental search",
        placeHolder: "enter a search term",
        validateInput: (text: string) => {
          const result = updateSearch(search,{searchTerm: text});
          return result.error;
        }
      });

      if(searchTerm) {
        previousSearchTerm = searchTerm;
        stopSearch(editor,'complete');
      } else {
        if(search)
          search.cancelSelections();
        stopSearch(editor,'cancelled by user');
      }
    } catch(e) {
      console.error(e);
    }
  } else if(configuration.inputMode == 'inline') {
    try {
      updateSearch(search,{searchTerm: ''});
      const searchTerm = await inlineInput.showInlineInput(editor,'',
        (text: string) => {
          const result = updateSearch(search,{searchTerm: text});
          return result.error;
        }
      );

      if(searchTerm !== undefined) {
        previousSearchTerm = searchTerm;
        stopSearch(editor,'complete');
      } else {
        if(search)
          search.cancelSelections();
        stopSearch(editor,'cancelled input');
      }
    } catch(e) {
      console.error(e);
    }
  }
}

function advanceSearch(editor: vscode.TextEditor, options: SearchOptions) {
  const search = searches.get(editor);
  if(!search) {
    const useRegExp = context.globalState.get<boolean>("useRegExp");
    const caseSensitive = context.globalState.get<boolean>("caseSensitive");
    if(useRegExp!==undefined)
      options.useRegExp = useRegExp;
    if(caseSensitive!==undefined)
      options.caseSensitive = caseSensitive;
    doSearch(editor, options);
  } else {
    const results = search.advance(options);
    status.update(search.searchTerm, search.caseSensitive, search.useRegExp);
    updateMatchDecorations(search,results);
  }  
}

/** If subgroups are matched, then display a decoration over the entire
 * matching range to help the user identify how the regexp is working
 * */
function updateMatchDecorations(search: IncrementalSearch, results : {matchedRanges: vscode.Range[], matchedGroups: boolean}) {
  if(selectionDecoratation && decorateSelection)
    search.getEditor().setDecorations(selectionDecoratation, search.getEditor().selections.map((sel) => new vscode.Range(sel.start,sel.end)));
  else if(selectionDecoratation)
    search.getEditor().setDecorations(selectionDecoratation, []);

  if(configuration.styleMatches=='always' || (results.matchedGroups && configuration.styleMatches=='multigroups'))
    search.getEditor().setDecorations(matchDecoratation, results.matchedRanges);
  else
    search.getEditor().setDecorations(matchDecoratation, []);
}

function clearMatchDecorations(search: IncrementalSearch) {
  if(selectionDecoratation && decorateSelection)
    search.getEditor().setDecorations(selectionDecoratation, []);

  search.getEditor().setDecorations(matchDecoratation, []);
}

function updateSearch(search: IncrementalSearch, options : SearchOptions) : {error?: string} {
 if(!search)
   return {};

  try {
    const results = search.update(options);
    status.update(search.searchTerm, search.caseSensitive, search.useRegExp);
    updateMatchDecorations(search, results);
    return {};
  } catch(e) {
    clearMatchDecorations(search);
    status.update(search.searchTerm, search.caseSensitive, search.useRegExp);
    if(e instanceof SyntaxError) {
      status.indicateSyntaxError();
      return {error: e.message};
    }
    else
      console.error(e);
    return {error: 'Unknown error'}
  }
}



/** Stops search if anyone else tries to modify the editor selections
 * this is only used by the inline text input
 */
function onSelectionsChanged(event:vscode.TextEditorSelectionChangeEvent) {
  if(configuration.inputMode!='inline')
    return;
  const search = searches.get(event.textEditor);
  if(!search)
    return;

  // If the selection has changed and no longer agree's with what the search ex
  const selections = search.getSelections();
  if(event.selections.length != selections.length)
    stopSearch(event.textEditor,"interference on selection");
  for(let idx = 0; idx < selections.length; ++idx) {
    if(!selections[idx].isEqual(event.selections[idx])) {
      stopSearch(event.textEditor,"interference on selection");
      return;
    }
  }
}


// this method is called when your extension is deactivated
export function deactivate() {
}