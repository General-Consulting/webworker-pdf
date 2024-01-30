{
  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.deno2nix.url = "github:SnO2WMaN/deno2nix";

  outputs = {
    self,
    nixpkgs,
    flake-utils,
    deno2nix,
  }:
    flake-utils.lib.eachDefaultSystem (system: let
      pkgs = import nixpkgs {
        inherit system;
        overlays = [deno2nix.overlays.default];
      };
    in {
      packages.executable = pkgs.deno2nix.mkExecutable {
        pname = "simple-executable";
        version = "0.1.0";

        src = ./.;
        bin = "simple";

        entrypoint = "./worker-poc.ts";
        lockfile = "./deno.lock";
        config = "./deno.json";

        allow = {
          all = true;
        };
      };
    });
}
