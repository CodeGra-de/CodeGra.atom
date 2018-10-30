# CodeGrade.atom

The Atom plugin to communicate with [CodeGra.de](https://codegra.de/)'s
filesystem: [CodeGra.fs](https://github.com/CodeGra-de/CodeGra.de).

## Dependencies

CodeGra.fs must be installed and both `cgfs` and the helper program
`cgapi-consumer` must be in the user's `$PATH`.

## Usage

Mount your CodeGrade account to a directory and open Atom in one of
the filesystem's subdirectories:

```sh
$ cgfs ~/CodeGrade
Mounting...
Mounted
$ atom ~/CodeGrade/<course>/<assignment>/<submission>
```

The following commands are now available in Atom when editing a file in a
CodeGrade filesystem:

| Command | `--fixed`<a href="#footnote-1-b"><sup id="footnote-1-a">1</sup></a> | Description |
|---|---|---|
| codegrade:edit-line-comment | ✓ | Edit the comment(s) on the line(s) with a cursor on them. |
| codegrade:delete-line-comment | ✓ | Delete the comment(s) on the line(s) with a cursor on them. |
| codegrade:open-rubric-editor | ✗ | Edit the rubric of the assignment of the current file. |
| codegrade:open-rubric-selector | ✗ | Open the rubric selector file to fill in the rubric for the current submission. |
| codegrade:edit-geedback | ✗ | Edit the current submission's global feedback. |
| codegrade:edit-grade | ✗ | Edit the current submission's grade. |
| codegrade:select-rubric-item | ✗ | Select the rubric item that the cursor is on, deselecting any other item in the same group. |
| codegrade:goto-prev-rubric-header | ✗ | Go to the previous header in a rubric file. |
| codegrade:goto-next-rubric-header | ✗ | Go to the next header in a rubric file. |
| codegrade:goto-prev-rubric-item | ✗ | Go to the previous item in a rubric file. |
| codegrade:goto-next-rubric-item | ✗ | Go to the next item in a rubric file. |

<a href="#footnote-1-a"><sup id="footnote-1-b">1</sup></a>: Require the filesystem to be mounted with the `--fixed` flag to use this feature.

## License

CodeGrade.atom is released under [LICENSE](AGPL-v3.0).
