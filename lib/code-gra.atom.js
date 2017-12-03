'use babel';

import child_process from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import tmp from 'tmp';

import { CommandRegistry, CompositeDisposable } from 'atom';

let subscriptions = null;
let linter = null;

export function activate(state) {
	subscriptions = new CompositeDisposable();

	subscriptions.add(
		atom.workspace.observeTextEditors(initTextEditor),
	);
}

export function deactivate() {
	subscriptions.dispose();
	subscriptions = null;
	linter = null;
}

export function serialize() {
	return {};
}

export function consumeLinter(registerLinter) {
        linter = registerLinter({
		name: 'CodeGra.de',
	});
	subscriptions.add(linter);
}

// Searches from the root directory of the filesystem up to `toPath`
// to find the first directory containing a file named `fileName`.
function findDirWithFile(toPath, fileName) {
	const absPath = path.resolve(toPath);
	const parts = absPath.split(path.sep);

	function testDir(i) {
		return new Promise((resolve, reject) => {
			const dir = '/' + parts.slice(0, i).join(path.sep);
			fs.access(path.join(dir, fileName), (err) => {
				err ? reject(err) : resolve(dir);
			});
		}).catch((err) => {
			if (i < parts.length - 1) {
				return testDir(i + 1);
			} else {
				throw err;
			}
		});
	}

	return testDir(0);
}

// Mark text editors with files in a CodeGra.fs directory
// and retrieve their comments
function initTextEditor(editor) {
	const filePath = editor.getPath();
        if (filePath == null) {
		return;
	}

	findDirWithFile(filePath, '.cg-mode').then((cgfsRoot) => {
		const editorView = atom.views.getView(editor);
		const editorSubs = new CompositeDisposable();

		editorSubs.add(atom.commands.add(editorView, {
			'codegra-atom:open-rubric-editor': () =>
				openRubricEditor(editor),
			'codegra-atom:open-rubric-selecter': () =>
				openRubricSelecter(editor),
			'codegra-atom:edit-feedback': () =>
				openFeedbackFile(editor),
			'codegra-atom:edit-grade': () =>
				openGradeFile(editor),
		}));

		const cmdOut = child_process.spawnSync('cgapi-consumer', ['is-file', filePath]);
		if (cmdOut.status == 0) {
			initFileComments(filePath);
			editor.onDidDestroy(() => linter.setMessages(filePath, []));

			// Editors in fixed mode can edit/delete line comments
			const modeFile = path.join(cgfsRoot, '.cg-mode');
			fs.readFile(modeFile, 'utf8', (err, data) => {
				if (err || data.trim() != 'FIXED') {
					return;
				}

				editorSubs.add(atom.commands.add(editorView, {
					'codegra-atom:edit-line-comment': () =>
						editComments(editor),
					'codegra-atom:delete-line-comment': () =>
						deleteComments(editor),
				}));
			});
		}

		if (editor.getTitle() == '.cg-rubric.md') {
			editorSubs.add(atom.commands.add(editorView, {
				'codegra-atom:select-rubric-item': () =>
					selectRubricItem(editor),
			}));
		}

		editor.onDidDestroy(() => {
			editorSubs.dispose();
		});
	}, () => {});
}

function initFileComments(filePath) {
	let json = '';

	const proc = child_process.spawn('cgapi-consumer', ['get-comment', filePath]);
	proc.stdout.on('data', (data) => json += data);

	proc.on('close', () => {
		const comments = JSON.parse(json).map(({ line, col, content }) =>
			makeComment(filePath, line - 1, content));
		addFileComments(filePath, comments);
	});
}

function makeComment(filePath, line, content) {
	return {
		severity: 'info',
		location: {
			file: filePath,
			position: [[line, 0], [line, 1000]],
		},
		excerpt: content,
	};
}

function getFileComments(filePath) {
	return linter.getMessages().filter((msg) =>
		msg.location.file === filePath);
}

function addFileComments(filePath, newComments) {
	let comments = [];
	getFileComments(filePath).forEach((comment) =>
		comments[comment.location.position.start.row] = comment);
	newComments.forEach((comment) =>
		comments[comment.location.position[0][0]] = comment);
	// Condense sparse array
	comments = comments.filter((x) => true);
	linter.setMessages(filePath, comments);
}

function deleteFileComments(filePath, lineNrs) {
	let comments = [];
	getFileComments(filePath).forEach((comment) =>
		comments[comment.location.position.start.row] = comment);
	lineNrs.forEach((line) => delete comments[line]);
	// Condense sparse array
	comments = comments.filter((x) => true);
	linter.setMessages(filePath, comments);
}

function editComments(editor) {
	const filePath = editor.getPath();
	const lineNrs = editor.getCursorBufferPositions().map((pos) => pos.row);
	const comments = getFileComments(filePath).filter((msg) =>
		lineNrs.indexOf(msg.location.position.start.row) > -1);
	const commentText = comments.length ? comments[0].excerpt : '';

	if (new Set(comments).size > 1) {
		atom.notifications.addWarning(
			'The comments of the selected lines are different. Proceeding to write comments will overwrite all comments.',
		);
	}

        tmp.file((err, path, fd, cleanupTmpFile) => {
		atom.workspace.open(path, {
			split: 'down',
		}).then((commentEditor) => {
			commentEditor.setText(commentText);
			commentEditor.onDidSave(() => {
				saveComments(filePath, lineNrs, commentEditor.getText());
			});
			commentEditor.onDidDestroy(cleanupTmpFile);
		});
	});
}

function saveComments(filePath, lineNrs, commentText) {
	const added = [];
	const errors = [];

	Promise.all(lineNrs.map((line) =>
		saveComment(filePath, line, commentText).then((comment) => {
			added.push(comment);
		}, (err) => {
			errors.push(err);
		}),
	)).then(() => {
		if (added.length > 0) {
			addFileComments(filePath, added);
		}
		if (errors.length > 0) {
			atom.notifications.addError(
				'CodeGra.atom: ERROR: ' + errors.join('\n'),
			);
		}
	});
}

function saveComment(filePath, line, commentText) {
	return new Promise((resolve, reject) => {
		const proc = child_process.spawn('cgapi-consumer', [
			'set-comment',
			filePath,
			line + 1,
			commentText,
		]);

		let err = '';
		proc.stderr.on('data', (data) => err += data);

		proc.on('close', (code) => {
			if (code === 0) {
				resolve(makeComment(filePath, line, commentText));
			} else {
				reject(err);
			}
		});
	});
}

function deleteComments(editor) {
	const filePath = editor.getPath();
	const lineNrs = editor.getCursorBufferPositions().map((pos) => pos.row);

	const deleted = [];
	const errors = [];

	Promise.all(lineNrs.map((line) =>
		deleteComment(filePath, line).then((line) => {
			deleted.push(line);
		}, (err) => {
			errors.push(err);
		}),
	)).then(() => {
		if (deleted.length > 0) {
			deleteFileComments(filePath, deleted);
		}
		if (errors.length > 0) {
			atom.notifications.addError(
				'CodeGra.atom: ERROR: ' + errors.join('\n'),
			);
		}
	});
}

function deleteComment(filePath, line) {
	return new Promise((resolve, reject) => {
		const proc = child_process.spawn('cgapi-consumer', [
			'delete-comment',
			filePath,
			line + 1,
		]);

		let err = '';
		proc.stderr.on('data', (data) => err += data);

		proc.on('close', (code) => {
			if (code === 0) {
				resolve(line);
			} else {
				reject(err);
			}
		});
	});
}

function openRubricEditor(editor) {
	findDirWithFile(editor.getPath(), '.cg-assignment-id').then((assigDir) => {
		const rubricFile = path.join(assigDir, '.cg-edit-rubric.md');
		atom.workspace.open(rubricFile, { split: 'down' });
	}, (err) => {
		atom.notifications.addError(err.message);
	});
}

function openRubricSelecter(editor) {
	findDirWithFile(editor.getPath(), '.cg-submission-id').then((subDir) => {
		const rubricFile = path.join(subDir, '.cg-rubric.md');
		atom.workspace.open(rubricFile, { split: 'down' });
	}, (err) => {
		atom.notifications.addError(err.message);
	});
}

function selectRubricItem(editor) {
	const curPos = editor.getCursorBufferPosition();
	const line = editor.lineTextForBufferRow(curPos.row);

	if (line.match(/^- \[x\]/)) {
		// Already on selected item.
		return;
	}

	if (!line.match(/^- \[ \]/)) {
		atom.notifications.addWarning(
			'This is not a valid rubric item!',
		);
		return;
	}

	editor.transact(-1, () => {
		const par = editor.getCurrentParagraphBufferRange();
		for (let row = par.start.row; row <= par.end.row; row++) {
			const text = row == curPos.row ? '- [x]' : '- [ ]';
			editor.setTextInBufferRange([[row, 0], [row, 5]], text);
		}
	});
}

function openFeedbackFile(editor) {
	findDirWithFile(editor.getPath(), '.cg-submission-id').then((subDir) => {
		const feedbackFile = path.join(subDir, '.cg-rubric.md');
		atom.workspace.open(feedbackFile, { split: 'down' });
	}, (err) => {
		atom.notifications.addError(err.message);
	});
}

function openGradeFile(editor) {
	findDirWithFile(editor.getPath(), '.cg-submission-id').then((subDir) => {
		const gradeFile = path.join(subDir, '.cg-rubric.md');
		atom.workspace.open(gradeFile, { split: 'down' });
	}, (err) => {
		atom.notifications.addError(err.message);
	});
}
