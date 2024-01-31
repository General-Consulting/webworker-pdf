{
  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.nix-deno.url = "github:nekowinston/nix-deno";

  outputs = { self, nixpkgs, flake-utils, ... } @ inputs:
    flake-utils.lib.eachDefaultSystem (system: let
      buildPhase = ''
        mkdir -p $out
        deno task build
        '';
      pkgs = import nixpkgs {
        inherit system;
        overlays = [ inputs.nix-deno.overlays.default ];
      };
    in {

      packages.executable = pkgs.denoPlatform.mkDenoDerivation {
        name = "example-executable";
        version = "0.1.2";

        src = ./.;
        buildInputs = [ pkgs.xdg-utils ];

        inherit buildPhase;

        installPhase = ''
          mkdir -p $out
          cp *.pdf $out
          echo PDFS generated and copied to $out
        '';
      };

      defaultPackage = self.packages.${system}.executable;
    });
}
