MAKEFLAGS = --no-print-directory --always-make --silent
MAKE = make $(MAKEFLAGS)

.PHONY: repl deploy

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

update-data:
	# Used for easily updating data
	@echo "Updating and deploying new entries..."
	ls -t $(DATA_INPUT_DIR)/bitesnap* | head -1 | xargs -I {} cp {} $(DATA_OUTPUT_DIR)/sample.json
	git add .
	git commit -m "Update data"
	$(MAKE) deploy
