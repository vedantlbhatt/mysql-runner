import * as vscode from 'vscode';
import * as mysql from 'mysql2/promise';
import fetch from 'node-fetch';

let connectionConfig: {
	host: string;
	user: string;
	password: string;
	database: string;
}

async function promptConnectionInfo() {
	const host = await vscode.window.showInputBox({
		prompt: 'Enter MySQL host',
		placeHolder: 'localhost',
		value: 'localhost',
	});
	if (!host) {
		vscode.window.showErrorMessage('MySQL host is required');
		return false;
	}

	const user = await vscode.window.showInputBox({
		prompt: 'Enter MySQL username',
		placeHolder: 'root',
		value: 'root',
	});
	if (!user) {
		vscode.window.showErrorMessage('MySQL username is required');
		return false;
	}

	const password = await vscode.window.showInputBox({
		prompt: 'Enter MySQL password',
		password: true,
	});

	if (password === undefined) {
		vscode.window.showErrorMessage('MySQL password is required');
		return false;
	}

	const database = await vscode.window.showInputBox({
		prompt: 'Enter MySQL database name',
		placeHolder: 'mydatabase',
	});
	if (!database) {
		vscode.window.showErrorMessage('MySQL database name is required');
		return false;
	}

	connectionConfig = { host, user, password, database };
	vscode.window.showInformationMessage('MySQL connection info saved.');
	return true;
}

// this is used to provide some context to the LLM by giving it the names of the tables in the db
async function getSchemaDescription(conn: mysql.Connection) {
	const [tables]: any = await conn.query(
		`SELECT TABLE_NAME 
		 FROM INFORMATION_SCHEMA.TABLES 
		 WHERE TABLE_SCHEMA = ?`, [connectionConfig.database]
	);

	let schemaDesc = '';

	// this is used to provide additional context by providing the names of the column
	// this helps the model use the correct attribute names to use in queries, resulting in less error
	for (const table of tables) {
		const tableName = table.TABLE_NAME;
		const [columns]: any = await conn.query(
			`SELECT COLUMN_NAME 
			 FROM INFORMATION_SCHEMA.COLUMNS 
			 WHERE TABLE_SCHEMA = ? AND TABLE_NAME = ?`,
			[connectionConfig.database, tableName]
		);
		const columnNames = columns.map((c: any) => c.COLUMN_NAME).join(', ');

		schemaDesc += `Table "${tableName}" columns: ${columnNames}\n`;
	}

	return schemaDesc;
}

async function promptAndRunNLQuery() {
	if (!connectionConfig) {
		const ok = await promptConnectionInfo();
		if (!ok) return;
		else {
			vscode.window.showErrorMessage("Error with database configuration");
		}
	}

	const nlQuery = await vscode.window.showInputBox({
		prompt: 'Enter natural language query to convert to SQL and execute',
		placeHolder: 'List the user with the longest name',
	});
	if (!nlQuery) return; // if blank or something invalid (null) :(

	let schemaInfo = '';
	try {
		const conn = await mysql.createConnection(connectionConfig);
		schemaInfo = await getSchemaDescription(conn); // loads context here amundo!
		await conn.end();
	} catch (err: any) {
		vscode.window.showErrorMessage(`Error fetching schema info: ${err.message}`);
	}

	// this calls the Ollama Flask API with context schema and uses a pre-built natural language query
	let sqlQuery = '';
	try {
		const prompt = `${schemaInfo}\nConvert this natural language query to SQL only (no explanations, 
		no elaborations, just write the query and submit. your answer should only be composed of sql syntax):\n${nlQuery}\nSQL:`;

		const response = await fetch('http://localhost:5000/nl2sql', {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ query: prompt }),
		});
		if (!response.ok) {
			vscode.window.showErrorMessage(`Ollama API error: ${response.statusText}`);
			return;
		}

		const data = await response.json();
		sqlQuery = data.sql;
		if (!sqlQuery) {
			vscode.window.showErrorMessage('Ollama API returned an empty SQL query :(');
			return;
		}

	} catch (err: any) {
		vscode.window.showErrorMessage(`Failed to convert NL to SQL: ${err.message}`);
		return;
	}

	// connect to MySQL and actually running SQL query (not just collecting the metadata/context)
	const output = vscode.window.createOutputChannel('MySQL Query Results');
	output.clear();
	output.show(true);
	output.appendLine(`Running SQL:\n${sqlQuery}\n`);

	try {
		const conn = await mysql.createConnection(connectionConfig);
		const [rows] = await conn.execute(sqlQuery);
		await conn.end();

		if (Array.isArray(rows) && rows.length === 0) {
			output.appendLine('No results found.');
		} else if (Array.isArray(rows)) {
			rows.forEach((row: any, i: number) => {
				output.appendLine(`${i + 1}. ${JSON.stringify(row)}`);
			});
		} else {
			// this is for the case where we do not do select statements: insert/delete
			output.appendLine(JSON.stringify(rows));
		}
	} catch (err: any) {
		vscode.window.showErrorMessage(`SQL Execution error: ${err.message}`);
		output.appendLine(`Error executing SQL:\n${err.message}`);
	}
}


export function activate(context: vscode.ExtensionContext) {
	context.subscriptions.push(
		vscode.commands.registerCommand('mysqlRunner.openConnectionPrompt', promptConnectionInfo)
	);

	context.subscriptions.push(
		vscode.commands.registerCommand('mysqlRunner.nl2sqlQuery', promptAndRunNLQuery)
	);
}

export function deactivate() {}
