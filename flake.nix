{
  description = "A flake for the webworker-pdf project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/90f456026d284c22b3e3497be980b2e47d0b28ac";
    flake-utils.url = "github:numtide/flake-utils";
    devshell.url = "github:numtide/devshell";
    deno2nix.url = "github:SnO2WMaN/deno2nix";  # Add deno2nix as an input
  };

  outputs = { self, nixpkgs, flake-utils, deno2nix, ... } @ inputs :
    let
      systems = flake-utils.lib.defaultSystems;
    in
    flake-utils.lib.eachSystem systems (system:
      let
      inherit (pkgs) deno2nix;
      pkgs = import nixpkgs {
        inherit system;
        overlays = with inputs; [
          devshell.overlay
          deno2nix.overlays.default
        ];
      };
      in
      {
        packages.executable = deno2nix.mkExecutable {
          pname = "webworker-pdf";
          version = "1.0.0";
          src = ./.;
          denoLock = ./deno.lock;
          entrypoint = "./main.ts";  # specify your entrypoint file
          config = "./deno.json";       # specify your config file
          allow = {
            net = true;
            read = true;
            run = "xdg-open";
          };
        };

        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [ deno neovim gnumake xdg-utils ];
        };
      }
    );
}

