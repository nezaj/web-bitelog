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
	yarn build
	@echo "Deploying to master..."
	git push origin master
	@echo "Deploying to production..."
	yarn deploy

dd:
	# Alias for deploy-data
	$(MAKE) deploy-data

deploy-data:
	# Easy commit and deploy all data
	$(MAKE) new-food
	$(MAKE) new-health
	$(MAKE) new-note
	git add .
	git commit -m "Add new data"
	$(MAKE) deploy

deploy-food:
	$(MAKE) new-food
	git add .
	git commit -m "Add new food data"
	$(MAKE) deploy

deploy-health:
	$(MAKE) new-health
	git add .
	git commit -m "Add new health data"
	$(MAKE) deploy

deploy-note:
	$(MAKE) new-note
	git add .
	git commit -m "Add new note"
	$(MAKE) deploy

new-food:
	@echo "Updating and deploying new food entries..."
	$(MAKE) validate-food
	$(MAKE) compress

new-health:
	@echo "Updating and deploying new health entries..."
	ls -t $(DATA_INPUT_DIR)/HEOutput* | head -1 | xargs -I {} cp {} $(DATA_OUTPUT_DIR)/temp_health.json
	node health.js
	rm $(DATA_OUTPUT_DIR)/temp_health.json

new-note:
	node notes.js prepend
	vim +3 src/data/notes.md
	$(MAKE) generate-notes
	$(MAKE) preview-notes

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
