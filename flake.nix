{
  description = "A flake for generating pdfs";
  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs/nixpkgs-unstable";


    flake-utils.url = "github:numtide/flake-utils";
    devshell.url = "github:numtide/devshell";
    mission-control.url = "github:General-Consulting/mission-control";
    flake-root.url = "github:srid/flake-root";
    nix-deno.url = "github:nekowinston/nix-deno";

    flake-parts = {
      url = "github:hercules-ci/flake-parts";
      inputs.nixpkgs-lib.follows = "nixpkgs";
    };

    treefmt-nix = {
      url = "github:numtide/treefmt-nix";
      inputs.nixpkgs.follows = "nixpkgs";
    };

  };

  outputs = { self, nixpkgs, flake-utils, nix-deno, flake-parts, devshell, ... } @ inputs:
    flake-parts.lib.mkFlake { inherit inputs; } {

      systems = nixpkgs.lib.systems.flakeExposed;
      imports = [
        inputs.devshell.flakeModule
        inputs.flake-root.flakeModule
      ];

      perSystem = { pkgs, system, self', inputs', lib, ... }:
        let
          ide = with pkgs; (vscode-with-extensions.override {
            vscodeExtensions = with vscode-extensions; [
              jnoortheen.nix-ide
              vscodevim.vim
            ] ++ pkgs.vscode-utils.extensionsFromVscodeMarketplace [

              {
                name = "vscode-deno";
                publisher = "denoland";
                version = "3.38.0";
                sha256 = "sha256-wmcMkX1gmFhE6JukvOI3fez05dP7ZFAZz1OxmV8uu4k=";
              }

              {
                name = "autoclosetabs";
                publisher = "Zwyx";
                version = "1.1.2";
                sha256 = "sha256-yZUAyBnGYFZQ7VXYsTfzF2rl6rAQ+DeZVC2FNMzw/uc=";
              }
              {
                name = "deepdark-material";
                publisher = "Nimda";
                version = "3.3.1";
                sha256 = "sha256-gc7B3h+r4UXO0WSVsscOa5nY4RRxG5XX3zrC1E1WJ3k=";
              }
              {
                name = "copilot";
                publisher = "Github";
                version = "1.165.0";
                sha256 = "sha256-8HvWb5zaoUdZ+BsAnW2TM20LqGwZshxgeJDEYKZOFgg=";
              }
              {
                name = "back-n-forth";
                publisher = "nick-rudenko";
                version = "3.1.1";
                sha256 = "sha256-yircrP2CjlTWd0thVYoOip/KPve24Ivr9f6HbJN0Haw=";
              }
              {
                name = "smart-tabs";
                publisher = "Valsorym";
                version = "1.3.2";
                sha256 = "sha256-RRL9DHQnZT64wIBvKC+f+6ga4kRptH98zpljfHc+Cu4=";
              }
            ];
          });
        in
        {

          _module.args.pkgs = import nixpkgs {
            inherit system;
            config.allowUnfree = true;
            overlays = with inputs; [
              inputs.nix-deno.overlays.default
            ];
          };
          packages = {
            default = pkgs.denoPlatform.mkDenoDerivation {
              name = "pdfGen";
              version = "0.1.2";
              src = ./.;
            };
            ide = ide;
          };

          devshells.default = {
            name = "General consulting web worker";
            packages = with pkgs; [
              deno
              ide
            ];

            commands = [
              {
                name = "hack";
                help = "run VScode configured for this project";
                command = "${ide}/bin/code $PRJ_ROOT";
              }

            ];
          };
        };
    };
}
