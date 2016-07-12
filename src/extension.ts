// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {SearchExpr} from './SearchExpr';

let processingSearch : boolean = false;
let backwardSearch = false;
let searchTerm = '';
let initialSelections : vscode.Selection[];
let status : {title: vscode.StatusBarItem, matchCase: vscode.StatusBarItem, useRegExp: vscode.StatusBarItem};
let caseSensitive = true;
let useRegExp = true;
let multiline = true;
// Used to distinguish between our selections and the user directly changing the selection
let intendedSelections : vscode.Selection[] = [];

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

	status = {
		title: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,10),
		matchCase: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,9),
		useRegExp: vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,8),
	}
	context.subscriptions.push(status.title, status.matchCase, status.useRegExp);

	registerTextEditorCommand('extension.incrementalSearch.forward', (editor: vscode.TextEditor) => {
		if(!processingSearch) {
			beginSearch(editor);
		} else {
			// Advance the search
			advanceSearch();
		}
	});

	registerTextEditorCommand('extension.incrementalSearch.backward', (editor: vscode.TextEditor) => {
		if(!processingSearch) {
			beginSearch(editor,{backward:true});
		} else {
			// Advance the search
			advanceSearch({backward: true});
		}
	});

	registerTextEditorCommand('extension.incrementalSearch.expand', (editor: vscode.TextEditor) => {
		if(processingSearch) {
			advanceSearch({expand: true});
		}
	});

	registerTextEditorCommand('extension.incrementalSearch.backwardExpand', (editor: vscode.TextEditor) => {
		if(processingSearch) {
			advanceSearch({backward: true, expand: true});
		}
	});

	registerTextEditorCommand('extension.incrementalSearch.toggleRegExp', (editor: vscode.TextEditor) => {
		useRegExp = !useRegExp;
		updateSearch();
	});
	registerTextEditorCommand('extension.incrementalSearch.toggleCaseSensitivity', (editor: vscode.TextEditor) => {
		caseSensitive = !caseSensitive;
		updateSearch();
	});

	registerTextEditorCommand('extension.incrementalSearch.stop', (editor) => {
		setEditorSelections(editor,initialSelections);
		stopSearch();
	});
	vscode.window.onDidChangeActiveTextEditor(() => stopSearch());
	vscode.window.onDidChangeTextEditorSelection(onSelectionsChanged);
	vscode.workspace.onDidChangeTextDocument(() => stopSearch);
	vscode.workspace.onDidCloseTextDocument(() => stopSearch);

	registerCommand('extension.incrementalSearch.backspace', () => {
		if(processingSearch) {
			searchTerm = searchTerm.substr(0,searchTerm.length-1);
			updateSearch();
		}
	});

	registerCommand('type', (event: {text:string}) => {
		if(processingSearch) {
      searchTerm+= event.text;
			updateSearch();
		}
		else
			vscode.commands.executeCommand('default:type', event);
	});



}


function showStatus() {
	status.title.text = 'incremental search: ';
	status.matchCase.text = 'Aa';
	status.useRegExp.text = '.*';
	status.matchCase.command = 'extension.incrementalSearch.toggleCaseSensitive';
	status.useRegExp.command = 'extension.incrementalSearch.toggleRegExp';
	status.matchCase.tooltip = 'Toggle case sensitivity.'
	status.useRegExp.tooltip = 'Toggle the use of regular expressions for search.'
	status.title.show();
	status.matchCase.show();
	status.useRegExp.show();
}

function hideStatus() {
	status.title.hide();
	status.matchCase.hide();
	status.useRegExp.hide();
}

function updateStatus(options = {backward: false}) {
	status.title.text = 'incremental search: ' + searchTerm;
	status.title.color = 'white';
	status.matchCase.color = caseSensitive ? 'white' : 'red';
	status.useRegExp.color = useRegExp ? 'white' : 'red';
}

async function stopSearch(forwardCommand = '', ...args: any[]) {
	await vscode.commands.executeCommand('setContext', 'incrementalSearch', false);
	processingSearch = false;
	hideStatus();
	if(processingSearch) {
		console.log('stopping incremental search.');
	}
	if(forwardCommand)
		vscode.commands.executeCommand(forwardCommand, args);
}

function beginSearch(editor: vscode.TextEditor, options = {backward: false}) {
	processingSearch = true;
	backwardSearch = options.backward;
	searchTerm = '';
	initialSelections = editor.selections;
	updateStatus(options);
	showStatus();
	vscode.commands.executeCommand('setContext', 'incrementalSearch', true);
}

function advanceSearch(options: {backward?:boolean, expand?:boolean} = {backward:false}) {
	backwardSearch = options.backward;
	const editor = vscode.window.activeTextEditor;
	let nextSelections = [];
	for(const sel of editor.selections) {
		// nextSelections.push(new vscode.Selection(sel.active,sel.active));
		if(options.backward)
		  nextSelections.push(new vscode.Selection(sel.start,sel.start));
		else
		  nextSelections.push(new vscode.Selection(sel.start.translate(0,1),sel.start.translate(0,1)));
	}
	initialSelections = nextSelections;
	updateSearch(options);
}

function updateSearch(options : {expand?:boolean} = {expand:false}) {
	if(!processingSearch)
	  return;
	try {
		updateStatus();
		const editor = vscode.window.activeTextEditor;
		const text = editor.document.getText();
		const search = new SearchExpr(searchTerm,multiline,useRegExp,caseSensitive);
		let nextSelections = [];
		if(options.expand)
			nextSelections = editor.selections;

		for(const sel of initialSelections) {
			const start = editor.document.offsetAt(sel.active);
			search.lastIndex = start;
			const match = search.exec(text,backwardSearch);
			if(match !== null) {
				const newAnchor = editor.document.positionAt(match.index);
				const newActive = editor.document.positionAt(match.index+match[0].length);
				// if(backwardSearch)
				// 	nextSelections.push(new vscode.Selection(newActive,newAnchor));
				// else
					nextSelections.push(new vscode.Selection(newAnchor, newActive));
			}
			// else
			// 	nextSelections.push(sel);
		}
		if(nextSelections.length > 0)
		  setEditorSelections(editor, nextSelections);
		else {
			status.title.color = 'yellow';
			setEditorSelections(editor, initialSelections);
		}
	} catch(e) {
		if(e instanceof SyntaxError) {
			status.title.color = 'red';
		}
		else
			console.error(e);
	}
}

function normalizeSelections(selections: vscode.Selection[]) : vscode.Selection[] {
  return selections
		.sort((x,y) => x.start.isBefore(y.start) ? -1 : x.start.isAfter(y.start) ? 1 : x.end.isBefore(y.start) ? -1 : x.end.isAfter(y.end) ? 1 : 0)
		.filter((sel,idx,sels) => idx == 0 ? true : !sel.isEqual(sels[idx-1]));
}

function setEditorSelections(editor:vscode.TextEditor, selections: vscode.Selection[]) {
	if(selections.length == 0)
		return;
	intendedSelections = normalizeSelections(selections);
	editor.selections = selections;	
}


/** Stops search if anyone else tries to modify the editor selections */
function onSelectionsChanged(event:vscode.TextEditorSelectionChangeEvent) {
  if(event.selections.length != intendedSelections.length)
		stopSearch();
	for(let idx =0; idx < intendedSelections.length; ++idx) {
		if(!intendedSelections[idx].isEqual(event.selections[idx])) {
			stopSearch();
			return;
		}

	}
}


// this method is called when your extension is deactivated
export function deactivate() {
}