# Flake install
Add this repo to your ```flake.nix```. The package is built using the unstable channel. You can overwrite this by setting ```inputs.nixpkgs.follows = "nixpkgs"``` (if your default is 26.05).

**The binary is executed as ```seeddeck```.**

```nix
inputs = {
  ...
  seeddeck.url = "github:<your-name>/seeddeck";
  ...
}
```

You can install the package in either home.nix or your configuration.nix depending on your preference.

**User**
```nix
# home.nix
{ pkgs, inputs, ... }: 

{
  home.packages = with pkgs; [
    ...
    inputs.seeddeck.packages.${pkgs.system}.default
    ...
  ];
}
```

**System**
```nix
# configuration.nix
{ pkgs, inputs, ... }: 

{
  environment.systemPackages = with pkgs; [
    ...
    inputs.seeddeck.packages.${pkgs.system}.default
    ...
  ];
}
```
