MAKEFLAGS = --no-print-directory --always-make --silent
MAKE = make $(MAKEFLAGS)

DATA_INPUT_DIR = ~/Downloads
DATA_OUTPUT_DIR = src/data

repl:
	@echo "Starting repl..."
	node repl.js

deploy:
	@echo "Deploying to master..."
	git push origin master
	@echo "Deploying to github pages..."
	yarn deploy

compress:
	@echo "Compressing images..."
	node compress.js

new-data:
	# Used for easily updating data
	@echo "Updating and deploying new entries..."
	ls -t $(DATA_INPUT_DIR)/bitesnap* | head -1 | xargs -I {} cp {} $(DATA_OUTPUT_DIR)/sample.json
	$(MAKE) compress
	git add .
	git commit -m "Update data"
	$(MAKE) deploy

open-notes:
	@echo "Opening raw notes markdown..."
	vim src/data/notes.md

generate-notes:
	@echo "Generating new notes module..."
	node notes.js generate

preview-notes:
	node notes.js head

new-note:
	# Used for easily adding notes to entries
	node notes.js prepend
	vim +3 src/data/notes.md
	$(MAKE) generate-notes
	$(MAKE) preview-notes
	git add .
	git commit -m "Add new note"
	$(MAKE) deploy
