{ pkgs ? import <nixpkgs> { } }:
let
  nodejs = pkgs.deno;
  nvim = pkgs.neovim;
  make = pkgs.gnumake;
in
pkgs.mkShell {
  name = "uff";
  packages = [nvim nodejs];
  shellHook = ''
    set -a
    source .env

    export PATH=~/.npm/bin:${nodejs}/bin:$PATH
  '';
  buildInputs = [];
}
