{
  description = "A flake for the webworker-pdf project";

  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/90f456026d284c22b3e3497be980b2e47d0b28ac";
    flake-utils.url = "github:numtide/flake-utils";
    deno2nix.url = "github:webmaster128/deno2nix";  # Add deno2nix as an input
  };

  outputs = { self, nixpkgs, flake-utils, deno2nix, ... }:
    let
      systems = flake-utils.lib.defaultSystems;
    in
    flake-utils.lib.eachSystem systems (system:
      let
        pkgs = import nixpkgs {
          inherit system;
        };

        # Use deno2nix to build your Deno application
        denoApp = deno2nix.lib.buildDenoPackage {
          pname = "webworker-pdf";
          version = "1.0.0";  # Replace with your app's version
          src = ./.;
          denoLock = ./deno.lock;  # Path to your deno.lock file
          # Add any additional build inputs or environment variables if needed
        };
      in
      {
        packages = {
          webworker-pdf = denoApp;
        };
        defaultPackage = packages.webworker-pdf;  # Set the default package
        devShell = pkgs.mkShell {
          buildInputs = with pkgs; [ deno neovim gnumake xdg-utils ];
        };
      }
    );
}

