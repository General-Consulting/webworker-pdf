{ pkgs ? import <nixpkgs> { } }:
let
  nixpkgsVersion = {
    url = "https://github.com/NixOS/nixpkgs/archive/90f456026d284c22b3e3497be980b2e47d0b28ac.tar.gz";
    sha256 = "164lsq7xjjvpga6l6lfi9wfsnshgfxnpa8lvb2imscdwgmajakrc"; 
  };

  # Import the pinned nixpkgs
  pkgs = import (builtins.fetchTarball nixpkgsVersion) { }; 
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
