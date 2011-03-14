/**
 * SQittle - SQL Engine in JavaScript
 * Copyright 2011 Moxley Stratton
 * MIT License - See LICENSE
 * About - See README.md
 */

/*jslint evil: true, maxerr: 50, indent: 4 */

function SQLTokenizer() {
    var buf = '', pos = 0, linePositions = [], delimiters = ',();', lastCh = null;

    function eof() {
        return pos >= buf.length;
    }
    function ch() {
        if (eof()) {
            return '';
        }
        return buf.substr(pos, 1);
    }
    function next() {
        var c;
        if (eof()) {
            return '';
        }
        pos += 1;
        c = ch();
        if (lastCh === "\n") {
            linePositions.push(pos);
        }
        lastCh = c;
        return c;
    }
    function getLinePosition() {
        if (linePositions.length <= 0) {
            return 0;
        }
        else {
            return linePositions[linePositions.length - 1];
        }
    }
    function getLineNumber() {
        return linePositions.length + 1;
        
    }
    function getLine() {
        var i, s = '', c;
        for (i = getLinePosition(); i < buf.length; i += 1) {
            c = buf[i];
            if (c === "\n" || c === "\r") {
                break;
            }
            s += c;
        }
        return s;
    }
    function ParseError(msg) {
        var col;
        col = pos - getLinePosition() + 1;
        return {
            message: msg + " at line " + getLineNumber() + ", col " + col + ": " + getLine()
        };
    }
    function isAlpha(c) {
        return (c >= 'A' && c <= 'Z') || (c >= 'a' && c <= 'z');
    }
    function isDigit(c) {
        return c >= '0' && c <= '9';
    }
    function isAlphaNum(c) {
        return isAlpha(c) || isDigit(c);
    }
    function isDelimiter(c) {
        return delimiters.indexOf(c) >= 0;
    }
    function isOperator(c) {
        return c === '=' || c === '>' || c === '<';
    }
    function isIden(c) {
        return isAlphaNum(c) || c === '_' || c === '*';
    }
    function skipSpace() {
        var s = '', c;
        while (!eof()) {
            c = ch();
            if (c > ' ') {
                break;
            }
            s += c;
            next();
        }
        
        return s;
    }
    function getDelimiterToken() {
        var c, s = '';
        if (eof()) {
            throw new ParseError("Expected delimiter, but got EOF");
        }
        c = ch();
        if (!isDelimiter(c)) {
            throw new ParseError("Expected delimiter, but got: '" + c + "'");
        }
        next();
        return {
            type: 'delim',
            value: c
        };
    }
    function getOperatorToken() {
        var s = '', c;
        if (eof()) {
            throw new ParseError("Expected operator, but got EOF");
        }
        c = ch();
        if (!isOperator(c)) {
            throw new ParseError("Expected operator, but got: '" + c + "'");
        }
        while (!eof()) {
            s += c;
            c = next();
            if (!isOperator(c)) {
                break;
            }
        }
        return {
            type: 'operator',
            value: s
        };
    }
    function getNumberToken() {
        var s = '', c, type = 'int', n;
        if (eof()) {
            return '';
        }
        c = ch();
        if (!isDigit(c)) {
            throw new ParseError("Unexpected character for number: '" + c + "'");
        }
        while (!eof()) {
            s += c;
            c = next();
            if (type === 'int' && c === '.') {
                type = 'float';
            }
            else if (!isDigit(c)) {
                break;
            }
        }

        n = type === 'float' ? parseFloat(s, 10) : parseInt(s, 10);

        if (isNaN(n)) {
            throw new ParseError("Error parsing number");
        }
        return {
            type: 'literal',
            sub: type,
            value: n
        };
    }
    function getIdenToken() {
        var s = '', c;
        if (eof()) {
            return '';
        }
        c = ch();
        if (!isIden(c)) {
            throw new ParseError("Unexpected character for identifier: '" + c + "'");
        }
        while (!eof()) {
            s += c;
            c = next();
            if (!(isAlphaNum(c) || c === '_' || c === '.')) {
                break;
            }
        }

        return {
            type: 'iden',
            value: s
        };
    }
    function getStringToken() {
        var s = '', c;
        c = ch();
        if (eof()) {
            return '';
        }
        c = ch();
        if (c !== "'") {
            throw new ParseError("Error parsing string. No opening quote character.");
        }
        next();
        while (!eof()) {
            c = ch();
            if (c === "'") {
                c = next();
                if (c !== "'") {
                    break;
                }
            }
            s += c;
            next();
        }
        return {
            type: 'literal',
            sub: 'string',
            value: s
        };
    }
    function getToken() {
        var c;
        skipSpace();
        if (eof()) {
            return {
                type: 'eof'
            };
        }

        c = ch();
        if (isDigit(c)) {
            return getNumberToken();
        }
        else if (isIden(c)) {
            return getIdenToken();
        }
        else if (c === "'") {
            return getStringToken();
        }
        else if (isDelimiter(c)) {
            return getDelimiterToken();
        }
        else if (isOperator(c)) {
            return getOperatorToken();
        }
        else {
            next();
            return {
                type: 'unknown',
                value: c
            };
        }
    }
    return {
        next: getToken,
        ParseError: ParseError,
        getLinePosition: getLinePosition,
        getLine: getLine,
        getLineNumber: getLineNumber,
        setBuffer: function (s) {
            buf = s;
            pos = 0;
        },
        getPosition: function () {
            return pos;
        },
        getBuffer: function () {
            return buf;
        }
    };
}

function SQLStatementParser() {
    var tokenizer, token, parser;
    
    parser = this;
    tokenizer = new SQLTokenizer();
    
    function ParseError(msg) {
        var col;
        col = tokenizer.getPosition() - tokenizer.getLinePosition() + 1;
        if (token && token.value !== undefined) {
            col -= token.value.length;
        }
        return {
            message: msg + " at line " + tokenizer.getLineNumber() + ", col " + col + ": " + tokenizer.getLine()
        };
    }
    
    function tok(expectType, expectValue) {
        if (!token) {
            token = tokenizer.next();
        }
        if (expectType) {
            if (token.type !== expectType || (expectValue !== undefined && token.value !== expectValue)) {
                if (token.value !== undefined) {
                    throw new ParseError("Unexpected token: '" + token.value + "'");
                }
                else {
                    throw new ParseError("Unexpected token type: " + token.type);
                }
            }
        }
        return token;
    }
    
    function next(expectType, expectValue) {
        token = tokenizer.next();
        if (expectType !== undefined) {
            tok(expectType, expectValue);
        }
        return token;
    }
    
    function skipEndOfStatement() {
        if (token.type === 'delim' && token.value === ';') {
            next();
        }
    }

    function parseCreateTable() {
        var table, cols = [], col, type;
        table = next('iden').value;
        next('delim', '(');
        while (token.type !== 'eof') {
            col = next('iden').value;
            type = next('iden').value;
            cols.push({
                name: col,
                type: type
            });
            next('delim');
            if (token.value === ')') {
                break;
            }
            if (token.value !== ',') {
                throw new ParseError("Unexpected delimiter: " + token.value);
            }
        }
        next();
        skipEndOfStatement();
        return {
            command: 'CREATE',
            what: 'TABLE',
            name: table,
            cols: cols
        };
    }

    function parseCreate() {
        next();
        if (token.type !== 'iden') {
            throw new ParseError("Expected identifier after CREATE, got: " + token.type);
        }
        if (token.value.toUpperCase() === 'TABLE') {
            return parseCreateTable();
        }
        else {
            throw new ParseError("Unknown entity type for CREATE: " + token.value);
        }
    }
    
    function parseDumpTable() {
        var tableName, line;
        
        line = tokenizer.getLineNumber();
        tableName = next('iden').value;
        next();
        skipEndOfStatement();
        
        return {
            command: 'DUMP',
            what: 'TABLE',
            line: line,
            table: tableName
        };
    }

    function parseDump() {
        next();
        if (token.type !== 'iden') {
            throw new ParseError("Expected identifier after DUMP, got: " + token.type);
        }
        if (token.value.toUpperCase() === 'TABLE') {
            return parseDumpTable();
        }
        else {
            throw new ParseError("Unknown entity type for DUMP: " + token.value);
        }
    }

    function parseInsert() {
        var table, cols = [], values = [], colvals = [], i;
        if (next('iden').value.toUpperCase() !== 'INTO') {
            throw new ParseError("Expected 'INTO', got: '" + token.value);
        }
        table = next('iden').value;
        next('delim', '(');
        while (token.type !== 'eof') {
            cols.push(next('iden').value);
            next('delim');
            if (token.value === ')') {
                break;
            }
            if (token.value !== ',') {
                throw new ParseError("Unexpected delimiter: " + token.value);
            }
        }
        if (next('iden').value.toUpperCase() !== 'VALUES') {
            throw new ParseError("Expected 'VALUES', got: '" + token.value);
        }
        next('delim', '(');
        while (token.type !== 'eof') {
            values.push(next('literal').value);
            next('delim');
            if (token.value === ')') {
                break;
            }
            if (token.value !== ',') {
                throw new ParseError("Unexpected delimiter: " + token.value);
            }
        }
        next();
        skipEndOfStatement();
        for (i = 0; i < cols.length; i += 1) {
            colvals.push({name: cols[i], value: values[i]});
        }
        return {
            command: 'INSERT',
            table: table,
            colvals: colvals
        };
    }

    function parseAND() {
        var col, ands = ['AND'], compare;
        while (tok().type !== 'eof') {
            compare = {
                left: tok('iden'),
                op: next('operator'),
                right: next()
            };
            ands.push(compare);
        
            next();
        
            // AND
            if (!(token.type === 'iden' && token.value.toUpperCase() === 'AND')) {
                break;
            }
            
            next();
        }
        return ands;
    }

    function parseOR() {
        var ors = ['OR'];
        while (tok().type !== 'eof') {
            ors.push(parseAND());
        
            // OR
            if (!(token.type === 'iden' && token.value.toUpperCase() === 'OR')) {
                break;
            }
            
            next();
        }
        return ors;
    }

    function parseWhere() {
        var ors = parseOR();
        return ors;
    }

    function parseSelect() {
        var tables = [], cols = [], constraints = [];

        while (token.type !== 'eof') {
            token = next();
            if (token.type === 'iden' || token.type === 'literal') {
                cols.push(token);
            }
            else {
                throw new ParseError("Expected identifier or literal in SELECT column list. Got: '" + token.value + "'");
            }
            next();
            if (token.type !== 'delim') {
                break;
            }
            else if (token.value !== ',') {
                throw new ParseError("Expected column or comma. Got: '" + token.value + "'");
            }
        }
        if (tok('iden').value.toUpperCase() !== 'FROM') {
            throw new ParseError("Expected keyword 'FROM'. Got: '" + token.value + "'");
        }
        while (token.type !== 'eof') {
            tables.push(next('iden').value);
            next();
            if (token.type !== 'delim' || token.value === ';') {
                break;
            }
            else if (token.value !== ',') {
                throw new ParseError("Expected table name or comma. Got: '" + token.value + "'");
            }
        }

        if (token.type !== 'eof' && !(token.type === 'delim' && token.value === ';')) {
            if (tok('iden').value.toUpperCase() !== 'WHERE') {
                throw new ParseError("Expected keyword 'WHERE'. Got: '" + token.value + "'");
            }
            next();
            constraints = parseWhere();
        }
    
        if (!(token.type === 'eof' || token.type === 'delim' && token.value === ';')) {
            throw new ParseError("Unexpected end to SELECT: '" + token.value + "'");
        }
        
        skipEndOfStatement();

        return {
            command: 'SELECT',
            tables: tables,
            cols: cols,
            constraints: constraints
        };
    }
    
    function parseDelete() {
        var table, constraints = [];
        
        next('iden');
        if (token.value.toUpperCase() !== 'FROM') {
            throw new ParseError("Expected keyword 'FROM', got: " + token.value);
        }
        table = next('iden').value;
        
        next();
        if (token.type === 'iden' && token.value.toUpperCase() === 'WHERE') {
            next();
            constraints = parseWhere();
        }
        
        skipEndOfStatement();
        
        return {
            command: 'DELETE',
            table: table,
            constraints: constraints
        };
    }

    function parseUpdate() {
        var table, constraints = [], colvals = [], iden, col, value;
        
        table = next('iden').value;
        
        next('iden');
        if (token.value.toUpperCase() !== 'SET') {
            throw new ParseError("Expected keyword 'SET', got: " + token.value);
        }

        next();
        while (token.type !== 'eof') {
            tok('iden');
            if (token.value.toUpperCase() === 'WHERE') {
                break;
            }
            col = token.value;
            next('operator', '=');
            value = next('literal').value;
            colvals.push([col, value]);
            next();
            if (token.type === 'delimiter' && token.value === ',') {
                next();
            }
        }
        
        if (token.type === 'iden' && token.value.toUpperCase() === 'WHERE') {
            next();
            constraints = parseWhere();
        }
        
        skipEndOfStatement();
        
        return {
            command: 'UPDATE',
            table: table,
            colvals: colvals,
            constraints: constraints
        };
    }
    
    function parseAbout() {
        next();
        skipEndOfStatement();
        return {
            command: 'ABOUT'
        };
    }

    function parseHelp() {
        next();
        skipEndOfStatement();
        return {
            command: 'HELP'
        };
    }
    
    function parse() {
        var command, fName, func;
        
        if (tok().type === 'eof') {
            return null;
        }
        
        command = tok('iden').value.toUpperCase();
        
        fName = 'parse' +
            command.substr(0, 1) + 
            command.substr(1).toLowerCase();
        try {
            func = eval(fName);
        }
        catch (e) {
            throw new ParseError("Unknown SQL command, '" + command + "'");
        }
        
        return func();
    }
    
    return {
        parseAND: function (buf) {
            parser.setBuffer(buf);
            return parseAND();
        },
        parseOR: function (buf) {
            parser.setBuffer(buf);
            return parseOR();
        },
        setBuffer: function (buf) {
            tokenizer.setBuffer(buf);
            token = undefined;
        },
        parse: function (buf) {
            if (buf) {
                parser.setBuffer(buf);
            }
            return parse();
        }
    };
}

function SQittle() {
    var tables = [], rowMatches;

    function ExecuteError(msg, command) {
        var message;
        
        if (command && command.line !== undefined) {
            message = msg + " at line " + command.line;
        }
        else {
            message = msg;
        }
        
        return {
            message: message
        };
    }
    
    function getTable(name) {
        var i;
        for (i = 0; i < tables.length; i += 1) {
            if (tables[i].name === name) {
                return tables[i];
            }
        }
        return null;
    }

    function executeCreateTable(stmt) {
        var tableDef;
        
        if (getTable(stmt.name)) {
            throw new ExecuteError("Cannot create table '" + stmt.name + "': Table already exists.", stmt);
        }
        tableDef = {
            name: stmt.name,
            cols: stmt.cols,
            rows: []
        };
        tables.push(tableDef);
        return {
            output: 'Created table "' + tableDef.name + '"' + "\n",
            table: tableDef
        };
    }

    function executeCreate(stmt) {
        if (stmt.what === 'TABLE') {
            return executeCreateTable(stmt);
        }
        else {
            throw new ExecuteError("Don't know how to create '" + stmt.what + "'", stmt);
        }
    }

    function formatValue(value, type) {
        if (value === null) {
            return 'NULL';
        }
        else if (type === 'varchar') {
            value = "" + value;
            return "'" + value.replace("'", "\\'") + "'";
        }
        else if (type === 'float') {
            return parseFloat(value);
        }
        else if (type === 'int') {
            return parseInt(value, 10);
        }
    }
    
    function dumpRow(table, rowId) {
        var buf, i, row, cols = [], values = [], col;
        row = table.rows[rowId];
        buf = "INSERT INTO " + table.name + " (";
        for (i = 0; i < table.cols.length; i += 1) {
            col = table.cols[i];
            cols.push(col.name);
            values.push(formatValue(row[col.name], col.type));
        }
        buf += cols.join(', ') + ") VALUES (" + values.join(', ') + ");\n";
        return buf;
    }
    
    function dumpTableRows(table) {
        var i, buf = '';
        for (i = 0; i < table.rows.length; i += 1) {
            buf += dumpRow(table, i);
        }
        return buf;
    }
    
    function dumpCreateTable(table) {
        var i, buf, col;
        buf = 'CREATE TABLE ' + table.name + " (\n";
        for (i = 0; i < table.cols.length; i += 1) {
            col = table.cols[i];
            buf += '    ' + col.name + ' ' + col.type;
            if (i < table.cols.length - 1) {
                buf += ',';
            }
            buf += "\n";
        }
        buf += ");\n";
        return buf;
    }
    
    function dumpTable(table) {
        var buf = '';
        buf += dumpCreateTable(table);
        buf += dumpTableRows(table);
        return buf;
    }
    
    function dump() {
        var i, buf = '';
        for (i = 0; i < tables.length; i += 1) {
            buf += dumpTable(tables[i]);
        }
        return buf;
    }
    
    function executeDumpTable(stmt) {
        var table;
        table = getTable(stmt.table);
        if (!table) {
            throw new ExecuteError("Table '" + stmt.table + "' not found", stmt);
        }
        return {
            output: dumpTable(table)
        };
    }

    function executeDump(stmt) {
        if (stmt.what === 'TABLE') {
            return executeDumpTable(stmt);
        }
        else {
            throw new ExecuteError("Don't know how to dump '" + stmt.what + "'", stmt);
        }
    }
    
    function logicalANDMatches(table, row, constraints) {
        var colName, op, value, i, pass = true;
        for (i = 1; i < constraints.length; i += 1) {
            colName = constraints[i].left.value;
            op = constraints[i].op.value;
            value = constraints[i].right.value;
            if (row[colName] !== value) {
                pass = false;
                break;
            }
        }
        return pass;
    }

    rowMatches = function () {};
    
    function logicalORMatches(table, row, constraints) {
        var colName, op, value, i, pass = false;
        for (i = 1; i < constraints.length; i += 1) {
            if (constraints[i][0] !== undefined) {
                if (rowMatches(table, row, constraints[i])) {
                    pass = true;
                    break;
                }
            }
            /*
             * Hmmm, is there always going to be ANDs as the operands?
             */
        }
        return pass;
    }

    rowMatches = function (table, row, constraints) {
        if (constraints.length < 2) {
            return true;
        }
    
        if (constraints[0] === 'AND') {
            return logicalANDMatches(table, row, constraints);
        }
        else {
            return logicalORMatches(table, row, constraints);
        }
    };

    function executeInsert(stmt) {
        var table, row = {}, i, colName, count = 0;
        table = getTable(stmt.table);
        if (!table) {
            throw new ExecuteError("Error in INSERT: Unknown table '" + stmt.table + "'", stmt);
        }
        for (i = 0; i < table.cols.length; i += 1) {
            colName = table.cols[i].name;
            row[colName] = null;
        }
        for (i = 0; i < stmt.colvals.length; i += 1) {
            colName = stmt.colvals[i].name;
            if (row[colName] === undefined) {
                throw new ExecuteError("Unknown column name '" + colName + "'", stmt);
            }
            row[colName] = stmt.colvals[i].value;
        }
        table.rows.push(row);
        count += 1;
        
        return {
            count: 1,
            output: count + ' ' + ((count === 1) ? 'row' : 'rows') + " inserted\n"
        };
    }

    function executeDelete(stmt) {
        var table, rows, newRows, count = 0, i;
    
        table = getTable(stmt.table);
        if (!table) {
            throw new ExecuteError("Error in DELETE: Unknown table '" + stmt.table + "'", stmt);
        }
    
        rows = table.rows;
        newRows = [];
        for (i = 0; i < rows.length; i += 1) {
            if (rowMatches(table, rows[i], stmt.constraints)) {
                count += 1;
            }
            else {
                newRows.push(rows[i]);
            }
        }
        table.rows = newRows;
    
        return {
            count: count,
            headers: ["Rows Deleted"],
            rows: [
                [count]
            ]
        };
    }

    function executeUpdate(stmt) {
        var table, count = 0, rows, r, i, j;
    
        table = getTable(stmt.table);
        if (!table) {
            throw new ExecuteError("Error in DELETE: Unknown table '" + stmt.table + "'", stmt);
        }
    
        rows = table.rows;
        for (i = 0; i < rows.length; i += 1) {
            r = rows[i];
            if (rowMatches(table, r, stmt.constraints)) {
                for (j = 0; j < stmt.colvals.length; j += 1) {
                    r[stmt.colvals[j][0]] = stmt.colvals[j][1];
                }
                count += 1;
            }
        }
    
        return {
            count: count,
            output: count + ' ' + (count === 1 ? 'row' : 'rows') + " affected\n"
        };
    }

    function formatRows(headers, rows) {
        var header, output = '', i, line, j, k, len = 0, maxLens = [], s, drawLine;
        
        for (i = 0; i < headers.length; i += 1) {
            maxLens.push(headers[i].length);
        }
        for (i = 0; i < rows.length; i += 1) {
            for (j = 0; j < rows[i].length; j += 1) {
                s = "" + rows[i][j];
                if (s.length > maxLens[j]) {
                    maxLens[j] = s.length;
                }
            }
        }
        
        drawLine = function () {
            output += '+';
            for (i = 0; i < maxLens.length; i += 1) {
                for (j = 0; j < maxLens[i] + 2; j += 1) {
                    output += '-';
                }
                if (i > 0) {
                    output += '-';
                }
            }
            output += "+\n";
        };
        
        drawLine();
        output += '|';
        for (i = 0; i < headers.length; i += 1) {
            output += ' ' + headers[i];
            for (j = 0; j < maxLens[i] - headers[i].length; j += 1) {
                output += ' ';
            }
            output += ' |';
        }
        output += "\n";
        drawLine();
        
        for (i = 0; i < rows.length; i += 1) {
            output += '|';
            for (j = 0; j < rows[i].length; j += 1) {
                s = "" + rows[i][j];
                output += ' ' + s;
                for (k = 0; k < maxLens[j] - s.length; k += 1) {
                    output += ' ';
                }
                output += ' |';
            }
            output += "\n";
        }
        drawLine();
        
        return output;
    }

    function executeSelect(stmt) {
        var tableName, table, i, j, row, rows, returnRows, colName, op, value, headers = [];
    
        i = 0;
        tableName = stmt.tables[i];
        table = getTable(tableName);
        if (!table) {
            throw new ExecuteError("Table not found '" + tableName + "'", stmt);
        }
        rows = table.rows;
        returnRows = [];
        for (i = 0; i < rows.length; i += 1) {
            if (rowMatches(table, rows[i], stmt.constraints)) {
                row = [];
                for (j = 0; j < table.cols.length; j += 1) {
                    row.push(rows[i][table.cols[j].name]);
                }
                returnRows.push(row);
            }
        }
        
        for (i = 0; i < table.cols.length; i += 1) {
            headers.push(table.cols[i].name);
        }
    
        return {
            headers: headers,
            rows: returnRows
        };
    }
    
    function executeAbout() {
        return {
            output: "\n" +
                "                                   SQittle\n" +
                "                           SQL Engine in JavaScript\n" +
                "                               Moxley Stratton\n" +
                "                                 MIT License\n" +
                "                      https://github.com/moxley/sqittle\n"
        }
    }
    
    function executeHelp() {
        return {
            output: "= Commands =\n" +
                "HELP\n" +
                "ABOUT\n" +
                "CREATE TABLE [table] ([coldefs])\n" +
                "INSERT INTO [table] ([cols]) VALUES ([values])\n" +
                "UPDATE [table] SET [assignments] WHERE [conditions]\n" +
                "SELECT [cols] FROM [table] WHERE [conditions]\n" +
                "DUMP TABLE [table]\n"
        };
    }

    function execute(stmt) {
        var fName, func;
        
        fName = 'execute' +
            stmt.command.substr(0, 1).toUpperCase() + 
            stmt.command.substr(1).toLowerCase();
        
        try {
            func = eval(fName);
        }
        catch (e) {
            throw new ExecuteError("Unknown command: '" + stmt.command + "'");
        }
        
        return func(stmt);
    }

    function executeSQL(sql, formatted) {
        var stmt, parser, res = {}, output = [];
        if (formatted === undefined) {
            formatted = false;
        }
        parser = new SQLStatementParser();
        parser.setBuffer(sql);
        while (true) {
            stmt = parser.parse();
            if (!stmt) {
                break;
            }
            res = execute(stmt);
            if (formatted) {
                if (res.rows) {
                    if (res.rows.length === 0) {
                        output.push("Empty set\n");
                    }
                    else {
                        output.push(
                            formatRows(res.headers, res.rows) +
                            res.rows.length + ' ' + ((res.rows.length === 1) ? 'row' : 'rows') + " in set\n"
                        );
                    }
                }
                else {
                    output.push(res.output);
                }
            }
        }
        res.output = output.join('');
        return res;
    }

    return {
        execute: function (sql, formatted) {
            return executeSQL(sql, formatted);
        },
        dump: function () {
            return dump();
        }
    };
}
