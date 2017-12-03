# CodeGra.atom

The Atom plugin to communicate with [CodeGra.de](https://codegra.de/)'s
filesystem: [CodeGra.fs](https://github.com/CodeGra-de/CodeGra.de).

## Dependencies

CodeGra.fs must be installed and both `cgfs` and the helper program
`cgapi-consumer` must be in the user's `$PATH`.

## Usage

Mount your CodeGra.de account to a directory and open Atom in one of
the filesystem's subdirectories:

```sh
$ cgfs ~/CodeGra.de
Mounting...
Mounted
$ atom ~/CodeGra.de/<course>/<assignment>/<submission>
```

The following commands are now available in Atom when editing a file in a
CodeGra.de filesystem:

| Command | `--fixed`<a href="#footnote-1-b"><sup id="footnote-1-a">1</sup></a> | Description |
|---|---|---|
| codegra-atom:edit-line-comment | ✓ | Edit the comment(s) on the line(s) with a cursor on them. |
| codegra-atom:delete-line-comment | ✓ | Delete the comment(s) on the line(s) with a cursor on them. |
| codegra-atom:open-rubric-editor | ✗ | Edit the rubric of the assignment of the current file. |
| codegra-atom:open-rubric-selector | ✗ | Open the rubric selector file to fill in the rubric for the current submission. |
| codegra-atom:edit-geedback | ✗ | Edit the current submission's global feedback. |
| codegra-atom:edit-grade | ✗ | Edit the current submission's grade. |
| codegra-atom:select-rubric-item | ✗ | Select the rubric item that the cursor is on, deselecting any other item in the same group. |

<a href="#footnote-1-a"><sup id="footnote-1-b">1</sup></a>: Require the filesystem to be mounted with the `--fixed` flag to use this feature.

## License

CodeGra.atom is released under [LICENSE](AGPL-v3.0).
