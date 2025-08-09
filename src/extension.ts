import * as vscode from 'vscode';
import * as mysql from 'mysql2/promise'; //for async/wait functionality
import Table from 'cli-table3'

const outputChannel = vscode.window.createOutputChannel('MySQL-Runner');

async function runQuery() {
	const connection = await mysql.createConnection({ //input db information to access it
		host: '127.0.0.1',
		user: 'devuser',
		password: 'userpass123',
		database: 'trackmydb'
	});

	const [rows, fields]: [any[], any[]] = await connection.execute('select * from users;'); //stores output of query in rows,fields tuple

	console.log(rows);
	
	return rows

	await connection.end();
}

export function activate(context: vscode.ExtensionContext) {
	

	console.log('Congratulations, your extension "mysql-runner" is now active!');

	let disposable = vscode.commands.registerCommand('mysqlRunner.showHello', async () => { //registers the command to run the following async func
	let cols: string[] = [];


		try {
			//await -> waits for query to return
			const data = await runQuery();
			if (data.length != 0) {
				cols = Object.keys(data[0]); // Object.keys gets the values from the data, and [0] ensures only the first value (column name)
			}

			vscode.window.showInformationMessage('Query ran successfully, check console!'); //woohoo

			const table = new Table({ 
				head: cols // head is used for col names
			});

			data.forEach(row => { //traverses each item in returned query
				table.push(cols.map(col => row[col])); // this makes a new array, each item has the values associated with the column names stored in col
			});
			
			outputChannel.clear();
			outputChannel.appendLine('Query Results:');
			outputChannel.appendLine(table.toString())
			outputChannel.show(true);

		  } catch (error: unknown) {
			if (error instanceof Error) {
				vscode.window.showErrorMessage('Error running query:' + error.message);
			  } else {
				vscode.window.showErrorMessage('Error running query: unknown');
			  }
		  }
	});

	context.subscriptions.push(disposable);
	// note: 'disposable' is what is returned from registerCommand, we dispose these when extension is unloaded
}

//is called when your extension is deactivated
//i believe this includes dumping all disposables that have been accumalated through calls to registerCommand
export function deactivate() {}
