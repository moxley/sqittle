SQittle - SQL Engine in JavaScript
==================================

This is a tiny SQL engine that has no practical purpose. It executes a real
subset of the SQL standard. The database is stored in memory only. It has a
user front-end that runs in a web browser. The front-end resembles a console
interface that you would find with MySQL, PostgreSQL or SQLite.

Being impractical has its advantages. The code in sqittle.js relies solely on
core JavaScript, so it is completely portable. It also uses no input or output.

SQittle follows all JSLint guidelines except for two, small instances of
eval().

What is Supported
=================
 * CREATE TABLE
 * DUMP TABLE
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
