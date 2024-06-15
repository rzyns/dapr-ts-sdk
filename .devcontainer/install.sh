#!/usr/bin/env bash
set -eo pipefail

# install bun
# curl -fsSL https://bun.sh/install | bash

# install dapr
# wget -q https://raw.githubusercontent.com/dapr/cli/master/install/install.sh -O - | /bin/bash

# install eza
wget -O - -c https://github.com/eza-community/eza/releases/download/v0.18.17/eza_x86_64-unknown-linux-gnu.tar.gz | tar xzv
sudo chmod +x eza
sudo chown root:root eza
sudo mv eza /usr/local/bin/eza
