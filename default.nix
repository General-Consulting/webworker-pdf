{ pkgs ? import <nixpkgs> { } }:
let
  nodejs = pkgs.deno;
  nvim = pkgs.neovim;
  make = pkgs.gnumake;
in
pkgs.mkShell {
  name = "webworker-pdf";
  packages = [nvim nodejs make pkgs.xdg-utils];
  shellHook = ''
    set -a
    source .env

    export PATH=~/.npm/bin:${nodejs}/bin:$PATH
  '';
  buildInputs = [];
}
