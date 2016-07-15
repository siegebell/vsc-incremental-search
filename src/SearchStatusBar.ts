// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';

export class SearchStatusBar implements vscode.Disposable {
	private title: vscode.StatusBarItem;
	private matchCase: vscode.StatusBarItem;
	private useRegExp: vscode.StatusBarItem;

	constructor (toggleCaseSensitive : string, toggleRegularExpressions : string) { 
		this.title = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,10);
		this.matchCase = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,9);
		this.useRegExp = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left,8);	

		this.title.text = 'incremental search: ';
		this.matchCase.text = 'Aa';
		this.useRegExp.text = '.*';
		this.matchCase.command = toggleCaseSensitive;
		this.useRegExp.command = toggleRegularExpressions;
		this.matchCase.tooltip = 'Toggle case sensitivity.'
		this.useRegExp.tooltip = 'Toggle the use of regular expressions for search.'
	}

	public dispose() {
		this.title.dispose();
		this.matchCase.dispose();
		this.useRegExp.dispose();	
	}

	public show() {
		this.title.text = 'incremental search: ';
		this.title.show();
		this.matchCase.show();
		this.useRegExp.show();
	}

	public hide() {
		this.title.hide();
		this.matchCase.hide();
		this.useRegExp.hide();
	}

	public indicateSyntaxError() {
		this.title.color = 'red';		
	}

	public indicateNoMatch() {
		this.title.color = 'yellow';		
	}

	public update(searchTerm: string, caseSensitive: boolean, useRegExp: boolean, options = {backward: false}) {
		this.title.text = 'incremental search: ' + searchTerm;
		this.title.color = 'white';
		this.matchCase.color = caseSensitive ? 'white' : 'red';
		this.useRegExp.color = useRegExp ? 'white' : 'red';
	}
}
