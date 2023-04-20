export URL="https://ivomac.github.io/arch"
export RAW_URL="https://raw.githubusercontent.com/ivomac/ivomac.github.io/refs/heads/master/arch"


case $1 in
	nvme)
		curl -s ${RAW_URL}/scripts/nvme.py | python
		;;
	base)
		archinstall --config ${RAW_URL}/config/default.json
		;;
	pac)
		echo "Installing packages"
		curl -s ${RAW_URL}/txt/paclist.txt | pacman -Syu --noconfirm --needed -
		;;
	post-root)
		curl -s ${RAW_URL}/scripts/post-root.sh | bash
		;;
	post-user)
		curl -s ${RAW_URL}/scripts/post-user.sh | bash
		;;
	yay)
		echo "Installing yay"
		$HOME/.local/bin/yay-install
		;;
	aur)
		echo "Installing AUR packages"
		curl -s ${RAW_URL}/txt/yaylist.txt | yay -S --noconfirm --needed -
		;;
	post-reboot)
		echo "Setting up base dark theme"
		$HOME/.local/bin/theme-switch gruvbox_dark
		echo "Adding gpg key"
		curl -s ${RAW_URL}/scripts/gpg.sh | bash
		echo "Setting bar clock"
		curl -s ${RAW_URL}/scripts/set-clock.sh | bash
		echo "Setting up jupyter server"
		curl -s ${RAW_URL}/scripts/jupyter.sh | bash
		;;
	manual)
		curl -s ${RAW_URL}/txt/manual.txt
		;;
	*)
		echo "Invalid argument"
		;;
esac

