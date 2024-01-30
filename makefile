
pdf:
	@echo "Watching worker-poc.ts"
	deno run --allow-read=/ --allow-write=.  --allow-run=xdg-open worker-poc.ts
