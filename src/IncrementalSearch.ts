// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import * as vscode from 'vscode';
import {SearchExpr} from './SearchExpr';

const INCREMENTAL_SEARCH_CONTEXT = 'incrementalSearch';


export enum SearchDirection {
	forward,
	backward,
}

export interface SearchOptions {
  direction?: SearchDirection,
  caseSensitive?: boolean,
  useRegExp?: boolean,
	expand?: boolean,
	searchTerm?: string,
}

export const INITIAL_OPTIONS : SearchOptions = {
	searchTerm: '',
	direction: SearchDirection.forward,
  caseSensitive: true,
	useRegExp: true,
	expand: false,
}

export const DEFAULT_OPTIONS : SearchOptions = {
	searchTerm: undefined,              // use prior value
	direction: SearchDirection.forward, //
  caseSensitive: undefined,           // use prior value
	useRegExp: undefined,               // use prior value
	expand: false,                      //
}

function getOrDefault<T>(x: T, d: T) {
	return x===undefined ? d : x;
}


export class IncrementalSearch {
	private currentSelections : vscode.Selection[];
	private initialSelections : vscode.Selection[];

	constructor(
		private editor: vscode.TextEditor,
		private options : SearchOptions = INITIAL_OPTIONS
	) {
		this.applyOptions(options, INITIAL_OPTIONS);
		this.initialSelections = editor.selections;
		this.currentSelections = editor.selections;
	}

  /** Applies new options to the current options. If a propert is undefined, then we keep the prior value */
	public applyOptions(options: SearchOptions, defaults = this.options) {
		for(const key in INITIAL_OPTIONS)
			this.options[key] = getOrDefault(options[key], defaults[key]);
	}

	public cancelSelections() {
		this.editor.selections = this.initialSelections;
	}

	public get searchTerm() { return this.options.searchTerm; }
  public get useRegExp() { return this.options.useRegExp; }
  public get caseSensitive() { return this.options.caseSensitive; }
  public get direction() { return this.options.direction; }
  public get expandSelections() { return this.options.expand; }

	public advance(options: SearchOptions = DEFAULT_OPTIONS) {
		this.applyOptions(options);
		let nextSelections = [];
		if(this.options.direction == SearchDirection.backward)
			for(const sel of this.currentSelections) {
				nextSelections.push(new vscode.Selection(sel.start,sel.start));
  		}
		else // forward search
			for(const sel of this.currentSelections) {
				nextSelections.push(new vscode.Selection(sel.start.translate(0,1),sel.start.translate(0,1)));
			}
		this.initialSelections = nextSelections;
		this.update(options);
	}

	public getCurrentSelections() : vscode.Selection[] {
		return this.currentSelections;
	}

	public update(options: SearchOptions = DEFAULT_OPTIONS) {
		this.applyOptions(options);

		const text = this.editor.document.getText();
		const search = new SearchExpr(this.searchTerm,true,this.useRegExp,this.caseSensitive);
		let nextSelections = [];
		if(options.expand)
			nextSelections = this.currentSelections;

		for(const sel of this.initialSelections) {
			const start = this.editor.document.offsetAt(sel.active);
			search.lastIndex = start;
			const match = search.exec(text,this.direction == SearchDirection.backward);
			if(match !== null) {
				const newAnchor = this.editor.document.positionAt(match.index);
				const newActive = this.editor.document.positionAt(match.index+match[0].length);
				nextSelections.push(new vscode.Selection(newAnchor, newActive));
			}
		}
		if(nextSelections.length > 0)
			this.setEditorSelections(nextSelections);
		else
			this.setEditorSelections(this.initialSelections);
	}

	private setEditorSelections(selections: vscode.Selection[]) {
		this.currentSelections = normalizeSelections(selections);
		if(selections.length == 0)
			return;
		this.editor.selections = selections;	
	}
}



function normalizeSelections(selections: vscode.Selection[]) : vscode.Selection[] {
  return selections
		.sort((x,y) => x.start.isBefore(y.start) ? -1 : x.start.isAfter(y.start) ? 1 : x.end.isBefore(y.start) ? -1 : x.end.isAfter(y.end) ? 1 : 0)
		.filter((sel,idx,sels) => idx == 0 ? true : !sel.isEqual(sels[idx-1]));
}

