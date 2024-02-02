{
  inputs.nixpkgs.url = "github:nixos/nixpkgs/nixos-unstable";
  inputs.flake-utils.url = "github:numtide/flake-utils";
  inputs.nix-deno.url = "github:nekowinston/nix-deno";

  outputs = { self, nixpkgs, flake-utils, nix-deno, ... } @ inputs:
    flake-utils.lib.eachDefaultSystem (system: let
      installScript = nix-deno.overlays.default.mkDenoDerivation.installPhase;
      pkgs = import nixpkgs {
        inherit system;
        overlays = [ inputs.nix-deno.overlays.default ];
      };
    in {

      packages.pdfGen = pkgs.denoPlatform.mkDenoDerivation {
        name = "pdfGen";
        version = "0.1.2";

        src = ./.;
        buildInputs = [ pkgs.xdg-utils ];

          
        buildPhase = ''
          mkdir -p $out
          deno task build
          '';

        installPhase = [''
          cp ./*.pdf $out
        ''];
      };

      defaultPackage = self.packages.${system}.pdfGen;
    });
}
