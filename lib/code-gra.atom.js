'use babel';

import child_process from 'child_process';
import fs from 'fs';
import os from 'os';
import path from 'path';
import tmp from 'tmp';

import { CompositeDisposable } from 'atom';

let subscriptions = null;
let codeGradeEditors = null;
let fixedModeEditors = null;
let unfixedModeEditors = null;
let linter = null;

export function activate(state) {
	subscriptions = new CompositeDisposable();
	codeGradeEditors = new WeakSet();
	fixedModeEditors = new WeakSet();
	unfixedModeEditors = new WeakSet();

	subscriptions.add(
		atom.commands.add('atom-text-editor', {
			'codegra-atom:edit-line-comment': () => editComments(),
			'codegra-atom:delete-line-comment': () => deleteComments(),
		}),
		atom.workspace.observeTextEditors(initTextEditor),
	);
}

export function deactivate() {
	subscriptions.dispose();
	subscriptions = null;
	codeGradeEditors = null;
	fixedModeEditors = null;
	unfixedModeEditors = null;
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

// Mark text editors with files in a CodeGra.fs directory
// and retrieve their comments
function initTextEditor(editor) {
	const cmdOut = child_process.spawnSync('cgapi-consumer', ['is-file', editor.getPath()]);
	if (cmdOut.status != 0) return;

	codeGradeEditors.add(editor);

	const filePath = editor.getPath();
	initFileComments(filePath);
	editor.onDidDestroy(() => linter.setMessages(filePath, []));
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

// Check if the file of the given editor is in a CodeGra.de filesystem
// and if that filesystem is mounted in fixed (read-only) mode.
function isFixedModeEditor(editor) {
	if (!codeGradeEditors.has(editor) || unfixedModeEditors.has(editor)) {
		return false;
	} else if (fixedModeEditors.has(editor)) {
		return true;
	}

	let isFixed = false;

	const filePath = editor.getPath().split(path.sep);
	const isAbs = filePath[0] === '';
	for (let i = isAbs ? 1 : 0; i < filePath.length - 1; i++) {
		try {
			const cgModePath = (isAbs ? '/' : '') + path.join(...filePath.slice(0, i), '.cg-mode');
			fs.accessSync(cgModePath);
			isFixed = fs.readFileSync(cgModePath, 'utf8').trim() == 'FIXED';
			break;
		} catch (e) {}
	}

	if (isFixed) {
		fixedModeEditors.add(editor);
	} else {
		unfixedModeEditors.add(editor);
	}
	return isFixed;
}

function getFixedModeEditor() {
	const editor = atom.workspace.getActiveTextEditor();
	if (editor == null) return null;

	if (!isFixedModeEditor(editor)) {
		atom.notifications.addError(
			'The current file is not in a CodeGra.de filesystem or the filesystem is not mounted with the `--fixed` command-line flag.',
		);
		return null;
	}

	return editor;
}

function editComments() {
	const editor = getFixedModeEditor();
	if (editor == null) return;

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

function deleteComments() {
	const editor = getFixedModeEditor();
	if (editor == null) return;

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
