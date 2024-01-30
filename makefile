
pdf:
	@echo "Building pdf from worker-poc.ts"
	deno run --allow-run --allow-net --allow-read=/ --allow-write=. worker-poc.ts
