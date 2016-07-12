# README: Incremental search for vscode

This extension provides an incremental search mode, where you interactively provide a search term that advances each cursor and optionally expands the selection.

Upon entering incremental search mode (e.g. `ctrl+i` or `ctrl+u`), the text you type will construct a regular expression (or optionally a literal string) to use as a search term. All existing cursors will advance to select the next match. Pressing backspace will delete the last character of the regular expression. Editing the search term will retry the search from the previous point. Pressing search again will advance the search to the next match. Editing the buffer, manually changing the selection, or changing the editor focus will exit incremental searm mode.

### Status bar
While in incremental search mode, the status bar will display the current search term and button-indicators to toggle regular expression matching and case sensitivity. If the regular expression is ill-formed, then it will appear red. If there is not match, then the search term will appear yellow.

### Forward search
- Default binding: `ctrl+i`
- Command: `extension.incrementalSearch.forward`

Enters incremental search mode and subsequently advances each cursor to the next match, selecting it.

### Backwards search
- Default binding: `ctrl+u`
- Command: `extension.incrementalSearch.backward`

Enters incremental search mode and subsequently advances each cursor to the next match and selecting it, in the reverse direction.

### Expand selection by the next forward match
- Default binding: `ctrl+alt+i` (when in incremental search mode)
- Command: `extension.incrementalSearch.expand`

Instead of moving the selections to the next match, this adds the next matches to the existing selection.

### Expand selection by the next backwards match
- Default binding: `ctrl+alt+u` (when in incremental search mode)
- Command: `extension.incrementalSearch.backwardExpand`

Expands the selections with a backwards search.

### Toggle regular expressions vs literal strings
- Default binding: `alt+r` (when in incremental search mode)
- Command: `extension.incrementalSearch.toggleRegExp`

The search term is interpreted as a regular expression when enabled, or as plain text otherwise.

### Toggle case sensitivity
- Default binding: `alt+c` (when in incremental search mode)
- Command: `extension.incrementalSearch.toggleCaseSensitivity`

Toggles whether the match should be case sensitive.