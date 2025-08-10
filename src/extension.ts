import * as vscode from 'vscode';
import * as mysql from 'mysql2/promise'; // for async/await MySQL
import Table from 'cli-table3';
import dotenv from 'dotenv';

const outputChannel = vscode.window.createOutputChannel('MySQL-Runner');

async function openMySQLTerminalWithPrompts() {
	// Prompt user for host
	const host = await vscode.window.showInputBox({
		prompt: 'Enter MySQL host',
		placeHolder: 'localhost',
		value: 'localhost',
	});
	if (!host) {
		vscode.window.showErrorMessage('MySQL host is required');
		return;
	}

	// Prompt user for username
	const user = await vscode.window.showInputBox({
		prompt: 'Enter MySQL username',
		placeHolder: 'root',
		value: 'root',
	});
	if (!user) {
		vscode.window.showErrorMessage('MySQL username is required');
		return;
	}

	// prompt user
	const database = await vscode.window.showInputBox({
		prompt: 'Enter MySQL database name',
		placeHolder: 'mydatabase',
	});
	if (!database) {
		vscode.window.showErrorMessage('MySQL database name is required');
		return;
	}

	const terminal = vscode.window.createTerminal('MySQL Terminal');
	terminal.show(true);

	//type password manually
	terminal.sendText(`mysql -h ${host} -u ${user} -p ${database}`);

	vscode.window.showInformationMessage('Enter your password securely in the terminal.');
}

export function activate(context: vscode.ExtensionContext) {

	let disposableOpenTerminalPrompt = vscode.commands.registerCommand('mysqlRunner.openTerminalWithPrompt', openMySQLTerminalWithPrompts);


	context.subscriptions.push(disposableOpenTerminalPrompt);
}

export function deactivate() {}
