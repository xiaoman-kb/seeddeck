{
  lib,
  buildNpmPackage,
  # dependencies
  fetchurl,
  nodejs_22,
  wl-clipboard,
  xclip,
}:

buildNpmPackage (finalAttrs: {
  pname = "seeddeck";
  version = "1.1.1-unstable";
  __structedAttrs = true;
  strictDeps = true;

  src = ../.;

  nodejs = nodejs_22;
  npmDepsHash = "sha256-7CCecywWleUE7wobdzwWb4Rff0LmrlHcON1iPeiiFnw=";
  npmFlags = [ "--ignore-scripts" ]; # ignore scripts for ip-set broken pre-install

  # node-datachannel binary tarball
  nodeDatachannelPrebuilt = fetchurl {
    url = "https://github.com/murat-dogan/node-datachannel/releases/download/v0.32.3/node-datachannel-v0.32.3-napi-v8-linux-x64.tar.gz";
    sha256 = "4092afc9cd594a3326eb1bd823da452b227b742ea8222689b2cea6f7344cf67a";
  };

  # replicate postbuild from package.json
  postBuild = ''
    cp scripts/cli-entry.cjs dist/cli.cjs
    chmod +x dist/cli.cjs
  '';

  # extract node-datachannel tarball
  postInstall = ''
    tar -xzf ${finalAttrs.nodeDatachannelPrebuilt} \
      -C $out/lib/node_modules/seeddeck/node_modules/node-datachannel
      # add wl-copy and xclip to nix readeable path
      wrapProgram $out/bin/seeddeck \
        --prefix PATH : ${
          lib.makeBinPath [
            wl-clipboard
            xclip
          ]
        }
  '';

  meta = {
    description = "Desktop and terminal torrent search/download client.";
    homepage = "https://github.com/<your-name>/seeddeck";
    license = lib.licenses.mit;
    maintainers = [ ];
    mainProgram = "seeddeck";
    platforms = lib.platforms.linux;
  };
})
