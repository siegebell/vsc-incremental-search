# Incremental search for multiple cursors

This vscode extension provides an incremental search mode that works with multiple cursors, where you interactively provide a search term that advances each cursor and optionally expands your selections.

Upon entering incremental search mode (e.g. `ctrl+i` or `ctrl+u`), the text you type will construct a regular expression (or optionally a plain text string) to use as a search term. All existing cursors will advance to select the next match. Editing the search term will retry the search from the previous point. Initiating incremental search again will advance the search to the next match(es).

## Example Uses

1. You have multiple cursors and want each one to select the next string: enter incremental search mode and type `".*?"`.
2. You want to advance all cursors to just after the next comma: enter incremental search mode, type `,`, and then press `enter` followed by `right`.
3. You want to select the contents of the first two strings on a set of lines: enter incremental search mode, type `^.*?"(.*?)".*?"(.*?)"`, and then press `ctrl+alt+i` to add subsequent matches to the selection.

## Regular Expressions

You may type [Javascript regular expressions](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/RegExp) to control the search. If you use capturing groups, then each captured group will become a selection instead of the whole matching term. (To toggle regular expression vs plain text search, press `alt+r` while in incremental search mode.)

## Input Modes

### Input-box (default)
```json
"incrementalSearch.inputMode": "input-box"
```
Entering incremental search mode will display an input box at the top of vscode where you can edit the search term.

### Inline
```json
"incrementalSearch.inputMode": "inline"
```
This mode attempts to create a seamless experience for entering a search term. (Somewhat like incremental search in Visual Studio). Entering incremental search mode will not create a popup window for editing text, but the text you type edit the search term instead of the edit buffer. Pressing backspace will delete the last character of the search term. Editing the document buffer, typing `enter`, typing `escape`, or manually changing the selection will exit incremental search mode.

**Note:** This mode is experimental. You will likely notice lag while doing normal editing if this option has been enabled. If this happens, you will need to change back to `"input-box"` and restart vscode to resolve the lag issues.


## Commands

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

### Toggle regular expressions vs plain-text search terms
- Default binding: `alt+r` (when in incremental search mode)
- Command: `extension.incrementalSearch.toggleRegExp`

The search term is interpreted as a regular expression when enabled, or as plain text otherwise.

### Toggle case sensitivity
- Default binding: `alt+c` (when in incremental search mode)
- Command: `extension.incrementalSearch.toggleCaseSensitivity`

Toggles whether the match should be case sensitive.

## Configuration
### Input mode
Key: `incrementalSearch.inputMode`, values: `input-box` or `inline`.

Whether to read the search term from an input box or by capturing text typed into the editor.

### Match styling
Key: `incrementalSearch.matchStyle`, values: subset of CSS properties.

Styling to apply to the most recent matches. If regular-expression capturing groups are used, then each full match term will be styled rather than each captured group. You may specify different styles for dark and light themes.

### When to style matches
Key: `incrementalSearch.styleMatches`, values: `never`, `always`, or `multigroups`. 

When to apply styling to matches. `multigroups`: only apply styling when regular-expression capturing groups are used.

### Selection styling
Key: `incrementalSearch.selectionStyle`, values: subset of CSS properties.

Styling to apply to all accumulated selections, including the currently matched terms. This is particularly useful for `input-box` mode because it loses editor focus and thus the selections become near-invisible. You may specify different styles for dark and light themes.