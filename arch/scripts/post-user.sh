
## ENVIRONMENT VARIABLES

export REPO="git@github.com:ivomac"
export URL="https://ivomac.github.io/arch"

export DOTDIR="$HOME/Projects/00-dotfiles"
export XDG_DATA_HOME="$HOME/.local/share"
export XDG_CONFIG_HOME="$HOME/.config"
export GNUPGHOME="$XDG_CONFIG_HOME/gnupg"
export PASSWORD_STORE_DIR="$XDG_CONFIG_HOME/password-store"

export BIN="$HOME/.local/bin"

export RESTOW="$HOME/.local/bin/restow"

mkdir -p "$BIN"
touch "$RESTOW"

## FUNCTIONS

function dotstow {
	mkdir -p "$2"
	stow --no-folding --target="$2" --dir="${3:-$DOTDIR}" "$1"
	echo "Stowed $1 to $2"
	echo "stow --restow --no-folding --target=\"$2\" --dir=\"${3:-$DOTDIR}\" \"$1\"" >> "$RESTOW"
}

function dotclone {
	echo "Cloning $1 repo"
	target=$(echo "$1" | sed 's/^dot-//')
	git clone --recurse-submodules "$REPO/$1.git" "$target"
	if [[ -n "$2" ]]; then
		dotstow "$target" "$2"
	fi
}

## SSH SETUP

if [ -d "$HOME/.ssh" ]; then
	echo "Found .ssh directory"
else
	echo "No .ssh directory found, exiting"
	exit 1
fi

echo "Setting up ssh permissions"

chmod 700 ~/.ssh
chmod 644 ~/.ssh/authorized_keys  ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/id_ed25519 ~/.ssh/config

## RESET

echo "Deleting config folders"

rm -rf "$XDG_DATA_HOME"
rm -rf "$XDG_CONFIG_HOME"
rm -rf "$DOTDIR"

mkdir -p "$DOTDIR"

## CLONE REPOS

dotclone dot-git "$XDG_CONFIG_HOME/git"

dotclone dot-zsh "$XDG_CONFIG_HOME/zsh"

dotclone dot-tui "$XDG_CONFIG_HOME"

dotclone dot-gui "$XDG_CONFIG_HOME"

dotclone dot-kde "$XDG_CONFIG_HOME"

dotclone dot-python "$XDG_CONFIG_HOME"

dotclone dot-nvim "$XDG_CONFIG_HOME/nvim"

dotclone dot-systemd "$XDG_CONFIG_HOME/systemd/user"

dotclone dot-msmtp "$XDG_CONFIG_HOME/msmtp"

dotclone bin "$BIN"
dotclone bin-secrets "$BIN"

dotclone dot-desktop "$XDG_DATA_HOME/applications"

## GIT CONFIG

cd "$DOTDIR/git"
git init

## ZSH CONFIG

sudo chsh -s /usr/bin/zsh "$USER"

mkdir -p "$XDG_CONFIG_HOME/zsh/cache"
mkdir -p "$XDG_CONFIG_HOME/zsh/env"

## ENV CONFIG

echo "Setting up env config"

git clone "$REPO/dot-env.git" "$DOTDIR/env"
git clone "$REPO/dot-env-secrets.git" "$DOTDIR/env-secrets"

# public env
dotstow env "$XDG_CONFIG_HOME/zsh/env"
dotstow env "$XDG_CONFIG_HOME/plasma-workspace/env"

# general secret env
dotstow ALL "$XDG_CONFIG_HOME/zsh/env" "$DOTDIR/env-secrets"
dotstow ALL "$XDG_CONFIG_HOME/plasma-workspace/env" "$DOTDIR/env-secrets"

# host-specific secret env
dotstow $(hostname) "$XDG_CONFIG_HOME/zsh/env" "$DOTDIR/env-secrets"
dotstow $(hostname) "$XDG_CONFIG_HOME/plasma-workspace/env" "$DOTDIR/env-secrets"

## PASSWORD STORE

echo "Setting up password store"

git clone "$REPO/pass.git" "$PASSWORD_STORE_DIR"

## USER SERVICES

echo "Setting up user services"

systemctl --user enable foot-server.service
systemctl --user enable git-maintenance@weekly.timer
systemctl --user enable psd.service
systemctl --user enable ssh-agent.service
systemctl --user enable syncthing.service

