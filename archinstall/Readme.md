# Arch Linux installation

run archinstall:

```sh
archinstall \
    --config https://ivomac.github.io/archinstall/wayland/config.json \
    --creds https://ivomac.github.io/archinstall/creds.json
```

## Post-installation

### ARC3

#### Root config

/etc/mkinitcpio.conf:
```sh
MODULES=(i915)
HOOKS=(base systemd fsck udev autodetect
    modconf block filesystems keyboard consolefont)
```

/etc/sudoers:
```sh
Defaults rootpw
root ALL=(ALL:ALL) ALL
ivo ALL=(root) ALL
```

/etc/zsh/zshenv:
```sh
export ZDOTDIR=$HOME/.config/zsh
```

/etc/systemd/system.conf:
```sh
[Manager]
DefaultTimeoutStartSec=1s
DefaultTimeoutStopSec=4s
DefaultTimeoutAbortSec=3s
```

/etc/systemd/user.conf:
```sh
[Manager]
DefaultTimeoutStartSec=1s
DefaultTimeoutStopSec=4s
DefaultTimeoutAbortSec=3s
```

/boot/loader/entries/arch.conf:
```sh
title Arch Linux
linux /vmlinuz-linux
initrd /intel-ucode.img
initrd /initramfs-linux.img
options root="PARTUUID=---" rw
    fbcon=font:TER16x32 video=1920x1080@60
    acpi_enforce_resources=lax nowatchdog nmi_watchdog=0
    modprobe.blacklist=iTCO_wdt,iTCO_vendor_support,spi_nor
    sysrq_always_enabled=1 quiet loglevel=3 udev.log_level=3
    rd.udev.log_level=3 systemd.show_status=auto
    i915.enable_fbc=1 zswap.enabled=1
```

#### Additional packages

base:
```sh
transmission-cli
texlive
```

AUR:
```sh
tofi-git
nnn-nerd
advcpmv
zsh-theme-powerlevel10k-git
```

#### Running services


user:
```sh
ssh-agent.service
syncthing.service
tailscaled.service
```

root:
```sh
transmission.service
udisks2.service
systemd-oomd.service
```

### ARC5

#### Root config

/etc/mkinitcpio.conf:
```sh
MODULES=(nvidia nvidia_modeset nvidia_uvm nvidia_drm)
HOOKS=(base udev autodetect microcode
    keyboard keymap modconf block filesystems fsck)
```

/etc/sudoers:
```sh
```

/etc/zsh/zshenv:
```sh
export ZDOTDIR=$HOME/.config/zsh
```

/etc/systemd/system.conf:
```sh
[Manager]
DefaultTimeoutStartSec=1s
DefaultTimeoutStopSec=4s
DefaultTimeoutAbortSec=3s
```

/etc/systemd/user.conf:
```sh
[Manager]
DefaultTimeoutStartSec=1s
DefaultTimeoutStopSec=4s
DefaultTimeoutAbortSec=3s
```

/boot/loader/entries/*.conf
```sh
title Arch Linux
linux /vmlinuz-linux
initrd /intel-ucode.img
initrd /initramfs-linux.img
options root=PARTUUID=--- zswap.enabled=0 rw
    rootfstype=ext4 nvidia_drm.modeset=1 nvidia_drm.fbdev=1
    nvidia.NVreg_PreserveVideoMemoryAllocations=1
```

#### Additional packages

base:
```sh
texlive
```

AUR:
```sh
tofi-git
nnn-nerd
advcpmv
zsh-theme-powerlevel10k-git
```

#### Running services


user:
```sh
ssh-agent.service
```

root:
```sh
```

