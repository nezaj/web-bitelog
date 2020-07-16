#!/usr/bin/env node
/*
 * Script for managing notes for entries
 *
 * Usage: node note.js
 */
const fs = require("fs");
const path = require("path");
const yargs = require("yargs");

const { extractLocaleDate } = require("./src/utils.js");
const { NOTES_DELIMITER } = require("./src/constants.js");
const { notesData } = require("./src/data/notesData.js");

const RAW_NOTES_PATH = path.resolve(__dirname, "src", "data", "notes.md");
const JS_NOTES_PATH = path.resolve(__dirname, "src", "data", "notesData.js");

const DATE_NOTE_DELIMITER = "\n\n";

const TODAY = extractLocaleDate(new Date());
const DATE_PREFIX = "### ";
const DATE_SUFFIX = "\n\n\n\n";
const PREPEND_TEXT = `${DATE_PREFIX}${TODAY}${DATE_SUFFIX}`;

// Helpers
// ----------------------------------------------------------------------------
// Transform notes markdown file -> to json string
// ```
// ### 7/16/2020
//
// Moop
//
// ### 7/17/2020
//
// Hello world!
// ```
// Becomes
// { '7/16/2020': 'Moop', '7/17/2020': 'Hello world!' }
const markdownToJSON = () => {
  const notesText = fs.readFileSync(RAW_NOTES_PATH, "utf8");
  const notesObj = notesText
    .split(DATE_PREFIX)
    .slice(1) // Remove empty first element
    .reduce((xs, x) => {
      const parsed = x.trim().split(DATE_NOTE_DELIMITER);
      const date = parsed[0];
      // To handle cases where I have double newlines in my notes
      const note = parsed.slice(1).join(DATE_NOTE_DELIMITER);
      // Skip empty notes
      if (!note) {
        return xs;
      }
      if (xs[date]) {
        xs[date] += `${NOTES_DELIMITER}${note}`; // Add two new lines between notes
      } else {
        xs[date] = note;
      }
      return xs;
    }, {});
  return JSON.stringify(notesObj);
};

// Commands
// ----------------------------------------------------------------------------
const prepend = () => {
  const head = new Buffer.from(PREPEND_TEXT, "utf8");
  const tail = fs.readFileSync(RAW_NOTES_PATH);
  const fd = fs.openSync(RAW_NOTES_PATH, "w+");
  fs.writeSync(fd, head, 0, head.length, 0);
  fs.writeSync(fd, tail, 0, tail.length, head.length);
  fs.close(fd, (err) => {
    if (err) throw err;
  });
};

// Parse notes file -> js module
const generate = () => {
  const jsonString = markdownToJSON();

  const content = `// AUTOGENERATED FILE (from notes.js)
// DO NOT MANUALLY UPDATE THIS FILE UNLESS YOU KNOW WHAT YOU'RE DOING
// ---------------------------------------------------------------------------
module.exports = { notesData: ${jsonString} };
`;

  fs.writeFileSync(JS_NOTES_PATH, content);
  console.log(`Generated ${JS_NOTES_PATH}`);
};

// Preview markdown file and js module
const head = () => {
  // Preview first 10 lines of markdown file
  console.log("\nPreviewing notes markdown...");
  console.log("----------------------------");
  const preview = fs
    .readFileSync(RAW_NOTES_PATH, "utf8")
    .split("\n", 10)
    .join("\n");
  console.log(preview);

  // Preview js
  console.log("\nPreviewing notes js module...");
  console.log("----------------------------");
  console.log(notesData);
};

// Main
// ----------------------------------------------------------------------------
const argv = yargs
  .command("prepend", "Prepends current date to notes file")
  .command("generate", "Generates new json notes object")
  .command("head", "Previews notes markdown file and js module")
  .demand(1, "Please provide a valid option")
  .help()
  .alias("help", "h").argv;

if (argv._.includes("prepend")) {
  prepend();
} else if (argv._.includes("generate")) {
  generate();
} else if (argv._.includes("head")) {
  head();
}
