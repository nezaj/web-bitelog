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

compress:
	@echo "Compressing images..."
	node compress.js

validate-food:
	@echo "Validating food data..."
	ls -t $(DATA_INPUT_DIR)/bitesnap* | head -1 | xargs -I {} cp {} $(DATA_OUTPUT_DIR)/temp_food.json
	node validate.js
	mv $(DATA_OUTPUT_DIR)/temp_food.json $(DATA_OUTPUT_DIR)/food.json

deploy:
	@echo "Verify build still works..."
	npm run build
	@echo "Deploying to master..."
	git push origin master
	@echo "Deploying to github pages..."
	yarn deploy

deploy-all:
	# Easy commit and deploy all data
	$(MAKE) new-food
	$(MAKE) new-health
	$(MAKE) new-note
	$(MAKE) deploy

deploy-food:
	$(MAKE) new-food
	$(MAKE) deploy

deploy-health:
	$(MAKE) new-health
	$(MAKE) deploy

deploy-note:
	$(MAKE) new-note
	$(MAKE) deploy

new-food:
	# Easy commit new food data
	@echo "Updating and deploying new food entries..."
	$(MAKE) validate-food
	$(MAKE) compress
	git add .
	git commit -m "Update food data"

new-health:
	# Easy commit new health data
	@echo "Updating and deploying new health entries..."

	# Import and filter data
	ls -t $(DATA_INPUT_DIR)/HEOutput* | head -1 | xargs -I {} cp {} $(DATA_OUTPUT_DIR)/temp_health.json
	node health.js

	# Clean-up after ourselves
	rm $(DATA_OUTPUT_DIR)/temp_health.json

	# Commit and deploy
	git add .
	git commit -m "Update health data"

new-note:
	# Easy commit new note data
	node notes.js prepend
	vim +3 src/data/notes.md
	$(MAKE) generate-notes
	$(MAKE) preview-notes
	git add .
	git commit -m "Add new note"

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
