
function regexpReverseExec(re: RegExp, text: string, start?: number) {
  if(start === undefined)
	  start = re.lastIndex;
	else if(start < 0)
	  start = 0;
  // Make sure we do a global search
  re = re.global
		? re
		: new RegExp(re.source, 'g' + re.flags); 

	re.lastIndex = 0;
	let lastMatch : RegExpExecArray = null;
	let match : RegExpExecArray;
	let idx = re.lastIndex;
	while((match = re.exec(text)) != null && match.index < start && match[0] !== '') {
		// if(match.length > 1 && match.index+match[1].length >= start)
		//   break;
		lastMatch = match;
		re.lastIndex = match.index+1; // do not jump further than one character from the match
	}
	if(match!=null && match.length==0 && match[0] == '')
		return null;
	else
		return lastMatch;
}


export class SearchExpr {
	private re: RegExp;
	private lastIdx : number;
	constructor(private searchTerm: string, private multiline: boolean, private useRegExp: boolean, private caseSensitive: boolean) {
		if(useRegExp)
		  this.re = new RegExp(searchTerm,'g' + (caseSensitive ? '' : 'i' ) + (multiline ? 'm' : '' ))
		this.lastIndex = 0;
	}

	public set lastIndex(value:number) {
		if(this.useRegExp)
			this.re.lastIndex = value;
		else
			this.lastIdx = value;
	}

	public get lastIndex() : number {
		if(this.useRegExp)
			return this.re.lastIndex;
		else
			return this.lastIdx;
	}

	public exec(text: string, reverse = false) : {index: number} & Array<string> {
		if(this.useRegExp) {
			if(reverse)
				return regexpReverseExec(this.re,text);
			else
				return this.re.exec(text);
		} else {
			let idx;
			if(reverse)
				idx = text.lastIndexOf(this.searchTerm.substring(0,this.lastIndex+this.searchTerm.length-1), this.lastIdx);
			else
				idx = text.indexOf(this.searchTerm,this.lastIdx);

			if(idx < 0)
				return null;

			let result = <{index: number} & Array<string>>{};
			result[0] = this.searchTerm;
			result.index = idx;
			return result;
		}
	}
}
