MAKEFLAGS = --no-print-directory --always-make --silent
MAKE = make $(MAKEFLAGS)

.PHONY: repl deploy

repl:
	@echo "Starting repl..."
	node repl.js

deploy:
	@echo "Deploying to master..."
	git push origin master
	@echo "Deploying to github pages..."
	yarn deploy

update:
	@echo "Updating and deploying new entries..."
	ls -t ~/Downloads/bitesnap* | head -1 | xargs -I {} cp {} src/data/sample.json
	git add .
	git commit -m "Updated data"
	$(MAKE) deploy
