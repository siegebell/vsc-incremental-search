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
	private matchedRanges: vscode.Range[]= [];
	// when we do an incremental search and want to keep the previous selections,
	// no are no longer active and are placed in this list
	private aggregatedSelections : vscode.Selection[] = [];

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
		let nextPositions : vscode.Position[] = [];
		this.initialSelections = this.matchedRanges.map((r) => new vscode.Selection(r.start,r.end));
		if(this.options.direction == SearchDirection.backward)
			for(const sel of this.matchedRanges) {
				nextPositions.push(sel.start);
  		}
		else // forward search
			for(const sel of this.matchedRanges) {
				nextPositions.push(sel.start.translate(0,1));
			}
		// if(nextSelections.length > 0)
    //   this.initialSelections = nextSelections;
		if(nextPositions.length > 0)
			return this.update(options, nextPositions);
		else
			return this.update(options);
	}

	public getSelections() : vscode.Selection[] {
		return normalizeSelections(this.aggregatedSelections.concat(this.currentSelections));
	}

	public getMatchedRanges() {
		return this.matchedRanges;
	}

	public getEditor() {
		return this.editor;
	}

	public update(options: SearchOptions = DEFAULT_OPTIONS, startingPositions?: vscode.Position[]) : {matchedRanges: vscode.Range[], matchedGroups: boolean} {
		try {
			if(!startingPositions)
				startingPositions = this.initialSelections.map((sel) => sel.active);

			this.applyOptions(options);

			const text = this.editor.document.getText();
			const search = new SearchExpr(this.searchTerm,true,this.useRegExp,this.caseSensitive);
			var matchingGroups = false;
			let nextSelections = [];
			this.matchedRanges = [];

			if(options.expand)
				this.aggregatedSelections = normalizeSelections(this.aggregatedSelections.concat(this.currentSelections));
			else
				this.aggregatedSelections = [];

			for(const pos of startingPositions) {
				const start = this.editor.document.offsetAt(pos);
				search.lastIndex = start;
				const match = search.exec(text,this.direction == SearchDirection.backward);
				if(match !== null && match.length > 0) {
					const newAnchor = this.editor.document.positionAt(match.index);
					const newActive = this.editor.document.positionAt(match.index+match[0].length);
					this.matchedRanges.push(new vscode.Range(newAnchor, newActive));

					if(match.length == 1) {
						nextSelections.push(new vscode.Selection(newAnchor, newActive));
					} else {
						// The regexp contains subgroups
						matchingGroups = true;
						// Turn each subgroup into a new selection
						let offset = 0;
						match
							.forEach((m,idx) => {
								if(idx == 0 || m===undefined)
									return; // skip the first element
								offset = match[0].indexOf(m,offset);
								const newAnchor = this.editor.document.positionAt(match.index+offset);
								offset+= m.length;
								const newActive = this.editor.document.positionAt(match.index+offset);
								nextSelections.push(new vscode.Selection(newAnchor, newActive));
							});
					}
				}
			}
			if(nextSelections.length > 0)
				this.setEditorSelections(nextSelections);
			else {
				this.matchedRanges = this.initialSelections;
				this.setEditorSelections(this.initialSelections);
			}
			this.matchedRanges = normalizeRanges(this.matchedRanges);
			return {matchedRanges: this.matchedRanges, matchedGroups: matchingGroups}
		} catch(e) {
			this.setEditorSelections(this.initialSelections);
			throw e;
		}
	}

	private setEditorSelections(selections: vscode.Selection[]) {
		this.currentSelections = normalizeSelections(selections);
		if(this.aggregatedSelections.length + selections.length == 0)
			return;
		this.editor.selections = normalizeSelections(this.aggregatedSelections.concat(selections));
	}

}

const normalizeRanges = (selections: vscode.Range[]) => normalizeRangesGeneric(selections, vscode.Range);

const normalizeSelections = (selections: vscode.Selection[]) => normalizeRangesGeneric(selections, vscode.Selection);
  // const sorted = selections
	// 	.slice(0,selections.length)
	//   .sort((x,y) => x.start.isBefore(y.start) ? -1 : x.start.isAfter(y.start) ? 1 : x.end.isBefore(y.start) ? -1 : x.end.isAfter(y.end) ? 1 : 0);
	// const results = [sorted.shift()];
	// let currentIdx = 0;
	// for(let idx = 0; idx < sorted.length; ++idx) {
	// 	if(sorted[idx].start.isBeforeOrEqual(results[currentIdx].end))
	// 		results[currentIdx] = new vscode.Selection(results[currentIdx].start,sorted[idx].end)
	// 	else {
	// 		results.push(sorted[idx]);
	// 		++currentIdx;
	// 	}
	// }
	// return results;

function normalizeRangesGeneric<T extends vscode.Range>(selections: T[], TT: { new(anchor: vscode.Position, active: vscode.Position) : T}) : T[] {
  const sorted = selections
		.slice(0,selections.length)
	  .sort((x,y) => x.start.isBefore(y.start) ? -1 : x.start.isAfter(y.start) ? 1 : x.end.isBefore(y.start) ? -1 : x.end.isAfter(y.end) ? 1 : 0);
	const results = [sorted.shift()];
	let currentIdx = 0;
	for(let idx = 0; idx < sorted.length; ++idx) {
		if(sorted[idx].start.isBeforeOrEqual(results[currentIdx].end))
			results[currentIdx] = new TT(results[currentIdx].start,sorted[idx].end)
		else {
			results.push(sorted[idx]);
			++currentIdx;
		}
	}
	return results;
}


// ^[^"\n]*?"([^"\n]*)"[^"\n]*"([^"\n]*)"