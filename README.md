# README: Incremental search for vscode

This extension provides an incremental search mode, where you interactively provide a search term that advances each cursor and optionally expands the selection.

Upon entering incremental search mode (e.g. `ctrl+i` or `ctrl+u`), the text you type will construct a regular expression (or optionally a literal string) to use as a search term. All existing cursors will advance to select the next match. Pressing backspace will delete the last character of the regular expression. Editing the search term will retry the search from the previous point. Pressing search again will advance the search to the next match. Editing the buffer, manually changing the selection, or changing the editor focus will exit incremental searm mode.

### Forward search
- Default binding: `ctrl+i`
- Command: `extension.incrementalSearch.forward`

### Backwards search
- Default binding: `ctrl+u`
- Command: `extension.incrementalSearch.backward`

### Expand selection by the next forward match
- Default binding: `ctrl+alt+i` (when in incremental search mode)
- Command: `extension.incrementalSearch.expand`

### Expand selection by the next backwards match
- Default binding: `ctrl+alt+u` (when in incremental search mode)
- Command: `extension.incrementalSearch.backwardExpand`

### Toggle regular expressions vs literal strings
- Default binding: `alt+r` (when in incremental search mode)
- Command: `extension.incrementalSearch.toggleRegExp`

### Toggle case sensitivity
- Default binding: `alt+c` (when in incremental search mode)
- Command: `extension.incrementalSearch.toggleCaseSensitivity`
