SQittle - SQL Engine in JavaScript
==================================

SQittle is a tiny SQL engine with no practical purpose. It executes a real
subset of the SQL standard. The database is stored in memory only. The project
includes a command-style user interface that runs in a web browser. The
UI resembles a console interface that you would find with MySQL, PostgreSQL
or SQLite.

A demo is available at http://www.moxleystratton.com/files/sqittle.html.

Being impractical has its advantages. The code in sqittle.js relies solely on
core JavaScript, so it is completely portable. It also uses no input or output.

The console.html file provides the user interface.

SQittle follows all JSLint guidelines.

What is Supported
=================
 * CREATE TABLE
 * DUMP TABLE (dump to SQL)
 * SHOW TABLES
 * INSERT
 * UPDATE
 * DELETE
 * SELECT

What Isn't Supported
====================
 * Data Persistence
 * Joins
 * SELECT Optimizations
 * Arithmetic
 * Parenthesis-enclosed expressions
 * Functions
 * ORDER BY
 * LIMIT
 * LIKE
 * DROP
 * ALTER
 * INSERT ... SELECT
 * INSERT without column list
 * Indexes
 * Defined column widths
 * Primary keys
 * Sequences or auto-increment
 * Many, many more features that are not supported
