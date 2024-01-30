
pdf:
	@echo "Running Rust build..."
	deno run --allow-read=/ --allow-write=.  --allow-run=xdg-open worker-poc.ts
