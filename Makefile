MAKEFLAGS = --no-print-directory --always-make --silent
MAKE = make $(MAKEFLAGS)

.PHONY: repl

repl:
	@echo "Starting repl..."
	node repl.js
