
pdf:
	@echo "Building pdf from worker-poc.ts"
	deno run --allow-net --allow-read=/ --allow-write=.  --allow-run=xdg-open worker-poc.ts
