MAKEFLAGS = --no-print-directory --always-make --silent
MAKE = make $(MAKEFLAGS)

DATA_INPUT_DIR = ~/Downloads
DATA_OUTPUT_DIR = src/data

repl:
	@echo "Starting repl..."
	node repl.js

dev:
	@echo "Spinning up dev..."
	yarn start

deploy:
	@echo "Verify build still works..."
	npm run build
	@echo "Deploying to master..."
	git push origin master
	@echo "Deploying to github pages..."
	yarn deploy

compress:
	@echo "Compressing images..."
	node compress.js

validate-data:
	@echo "Validating data..."
	ls -t $(DATA_INPUT_DIR)/bitesnap* | head -1 | xargs -I {} cp {} $(DATA_OUTPUT_DIR)/temp_sample.json
	node validate.js
	mv $(DATA_OUTPUT_DIR)/temp_sample.json $(DATA_OUTPUT_DIR)/sample.json

new-data:
	# Used for easily updating data
	@echo "Updating and deploying new entries..."
	$(MAKE) validate-data
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

edit-notes:
	# Used for easily editing notes and deploying
	vim src/data/notes.md
	$(MAKE) generate-notes
	$(MAKE) preview-notes
	git add .
	git commit -m "Edit notes"
	$(MAKE) deploy

new-note:
	# Used for easily adding notes and deploying
	node notes.js prepend
	vim +3 src/data/notes.md
	$(MAKE) generate-notes
	$(MAKE) preview-notes
	git add .
	git commit -m "Add new note"
	$(MAKE) deploy
