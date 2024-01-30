# Web worker pdf
## Requirements

- nix package manager


## Setup

```sh
nix-shell default.nix
```

## Build

See [the makefile](./makefile) for more information
```sh
# run inside nix-shell   
make pdf
```

## Develop

See [deno.json](./deno.json) for more information

```sh 
deno task dev
```
