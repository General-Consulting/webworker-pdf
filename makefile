
pdf:
	@echo "Building pdf from worker-poc.ts"
	deno run --import-map=import_map.json --allow-run --allow-net --allow-read=/ --allow-write=. main.ts
